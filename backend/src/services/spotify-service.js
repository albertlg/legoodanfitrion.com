import SpotifyWebApi from "spotify-web-api-node";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SCOPES = [
  "playlist-modify-public",
  "playlist-modify-private",
  "playlist-read-private"
];

let spotifyClient = null;
let supabaseAdminClient = null;

function toSafeString(value) {
  return String(value || "").trim();
}

function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
    error.code = "SPOTIFY_CONFIG_ERROR";
    throw error;
  }

  supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseAdminClient;
}

function getSpotifyClient() {
  if (spotifyClient) {
    return spotifyClient;
  }

  const clientId = toSafeString(process.env.SPOTIFY_CLIENT_ID);
  const clientSecret = toSafeString(process.env.SPOTIFY_CLIENT_SECRET);
  const redirectUri = toSafeString(process.env.SPOTIFY_REDIRECT_URI);

  if (!clientId || !clientSecret || !redirectUri) {
    const error = new Error(
      "Faltan variables de Spotify. Revisa SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET y SPOTIFY_REDIRECT_URI."
    );
    error.code = "SPOTIFY_CONFIG_ERROR";
    throw error;
  }

  spotifyClient = new SpotifyWebApi({
    clientId,
    clientSecret,
    redirectUri
  });

  return spotifyClient;
}

function normalizeEventId(eventId) {
  return toSafeString(eventId);
}

function normalizeSpotifyError(rawError, fallbackCode = "SPOTIFY_API_ERROR") {
  const normalized = rawError instanceof Error ? rawError : new Error(toSafeString(rawError) || "Spotify error");
  normalized.code = toSafeString(normalized.code) || fallbackCode;
  return normalized;
}

function spotifyCall(executor, fallbackCode = "SPOTIFY_API_ERROR") {
  return new Promise((resolve, reject) => {
    try {
      executor((error, data) => {
        if (error) {
          reject(normalizeSpotifyError(error, fallbackCode));
          return;
        }
        resolve(data);
      });
    } catch (error) {
      reject(normalizeSpotifyError(error, fallbackCode));
    }
  });
}

async function exchangeSpotifyAuthCodeForToken(authCode) {
  const clientId = toSafeString(process.env.SPOTIFY_CLIENT_ID);
  const clientSecret = toSafeString(process.env.SPOTIFY_CLIENT_SECRET);
  const redirectUri = toSafeString(process.env.SPOTIFY_REDIRECT_URI);
  const normalizedCode = toSafeString(authCode);

  if (!clientId || !clientSecret || !redirectUri || !normalizedCode) {
    const error = new Error("Faltan datos para intercambiar el código OAuth de Spotify.");
    error.code = "SPOTIFY_CONFIG_ERROR";
    throw error;
  }

  const basicToken = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const bodyParams = new URLSearchParams({
    grant_type: "authorization_code",
    code: normalizedCode,
    redirect_uri: redirectUri
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicToken}`
    },
    body: bodyParams
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    console.error("ERROR REAL DE SPOTIFY:", payload || {
      status: response.status,
      statusText: response.statusText
    });
    const message =
      toSafeString(payload?.error_description) ||
      toSafeString(payload?.error) ||
      `Spotify token exchange failed (${response.status})`;
    const error = new Error(message);
    error.code = "SPOTIFY_AUTH_ERROR";
    error.body = payload;
    throw error;
  }

  return payload || {};
}

async function saveEventSpotifyPlaylist({ eventId, playlistId, playlistUrl, refreshToken = "" }) {
  const supabase = getSupabaseAdminClient();
  const payload = {
    event_id: eventId,
    spotify_playlist_id: playlistId,
    spotify_playlist_url: playlistUrl,
    spotify_refresh_token: toSafeString(refreshToken) || null
  };
  const { error } = await supabase
    .from("event_spotify_playlists")
    .upsert(payload, { onConflict: "event_id" });

  if (error) {
    const wrapped = new Error(`No se pudo guardar la playlist en Supabase: ${error.message}`);
    wrapped.code = "SPOTIFY_DB_ERROR";
    throw wrapped;
  }
}

export function getSpotifyAuthorizationUrl(eventId) {
  const normalizedEventId = normalizeEventId(eventId);
  if (!normalizedEventId) {
    const error = new Error("eventId es obligatorio para iniciar OAuth de Spotify.");
    error.code = "SPOTIFY_BAD_REQUEST";
    throw error;
  }

  const spotify = getSpotifyClient();
  return spotify.createAuthorizeURL(DEFAULT_SCOPES, normalizedEventId, true);
}

export async function createEventPlaylist(authCode, eventId) {
  const normalizedEventId = normalizeEventId(eventId);
  const normalizedCode = toSafeString(authCode);
  if (!normalizedCode || !normalizedEventId) {
    const error = new Error("code y eventId son obligatorios para crear la playlist.");
    error.code = "SPOTIFY_BAD_REQUEST";
    throw error;
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from("events")
      .select("title")
      .eq("id", normalizedEventId)
      .single();
    if (eventError) {
      const error = new Error(`No se pudo validar el evento: ${eventError.message}`);
      error.code = "SPOTIFY_DB_ERROR";
      error.details = eventError;
      throw error;
    }

    const clientId = toSafeString(process.env.SPOTIFY_CLIENT_ID);
    const clientSecret = toSafeString(process.env.SPOTIFY_CLIENT_SECRET);
    const redirectUri = toSafeString(process.env.SPOTIFY_REDIRECT_URI);
    if (!clientId || !clientSecret || !redirectUri) {
      const error = new Error(
        "Faltan variables de Spotify. Revisa SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET y SPOTIFY_REDIRECT_URI."
      );
      error.code = "SPOTIFY_CONFIG_ERROR";
      throw error;
    }

    // 1) Intercambio del auth code por access token (fetch nativo).
    const tokenAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code: normalizedCode,
      redirect_uri: redirectUri
    });
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${tokenAuth}`
      },
      body: tokenBody
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      const error = new Error("Spotify token exchange failed");
      error.code = "SPOTIFY_AUTH_ERROR";
      error.details = tokenData;
      throw error;
    }

    const accessToken = toSafeString(tokenData?.access_token);
    const refreshToken = toSafeString(tokenData?.refresh_token);
    if (!accessToken) {
      const error = new Error("Spotify no devolvió access_token.");
      error.code = "SPOTIFY_AUTH_ERROR";
      error.details = tokenData;
      throw error;
    }

    console.log("\n=== 🔍 DIAGNÓSTICO SPOTIFY ===");
    console.log("1. Scopes concedidos por Spotify:", tokenData?.scope);
    console.log("2. URL destino:", "https://api.spotify.com/v1/me/playlists");
    console.log("==============================\n");

    // 2) Crear playlist (fallback si collaborative no está permitido).
    const playlistName = eventData?.title ? `LGA: ${eventData.title}` : "LGA: Evento";

    const createPlaylist = async (payload) => {
      const response = await fetch("https://api.spotify.com/v1/me/playlists", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      return { response, data };
    };

    let playlistRequest = await createPlaylist({
      name: playlistName,
      public: false,
      collaborative: true
    });

    if (!playlistRequest.response.ok) {
      console.warn(
        "[spotify] create collaborative playlist failed, retrying standard playlist:",
        playlistRequest.data
      );
      playlistRequest = await createPlaylist({
        name: playlistName,
        public: false
      });
    }

    if (!playlistRequest.response.ok) {
      const error = new Error("Spotify playlist creation failed");
      error.code = "SPOTIFY_CREATE_ERROR";
      error.details = playlistRequest.data;
      throw error;
    }

    const playlistId = toSafeString(playlistRequest.data?.id);
    const playlistUrl = toSafeString(playlistRequest.data?.external_urls?.spotify);
    if (!playlistId || !playlistUrl) {
      const error = new Error("Spotify no devolvió id/url de playlist.");
      error.code = "SPOTIFY_CREATE_ERROR";
      error.details = playlistRequest.data;
      throw error;
    }

    // 4) Persistir en Supabase.
    await saveEventSpotifyPlaylist({
      eventId: normalizedEventId,
      playlistId,
      playlistUrl,
      refreshToken
    });

    return {
      eventId: normalizedEventId,
      playlistId,
      playlistUrl
    };
  } catch (error) {
    console.error("💥 ERROR REAL DE SPOTIFY:", error);
    throw error;
  }
}

export async function getValidAccessTokenForEvent(eventId) {
  const normalizedEventId = normalizeEventId(eventId);
  if (!normalizedEventId) {
    const error = new Error("eventId es obligatorio para renovar token de Spotify.");
    error.code = "SPOTIFY_BAD_REQUEST";
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("event_spotify_playlists")
    .select("spotify_refresh_token")
    .eq("event_id", normalizedEventId)
    .maybeSingle();

  if (error) {
    const wrapped = new Error(`No se pudo leer refresh token en Supabase: ${error.message}`);
    wrapped.code = "SPOTIFY_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  const refreshToken = toSafeString(data?.spotify_refresh_token);
  if (!refreshToken) {
    const wrapped = new Error("Conexión de Spotify no configurada para este evento.");
    wrapped.code = "SPOTIFY_REFRESH_TOKEN_MISSING";
    throw wrapped;
  }

  const clientId = toSafeString(process.env.SPOTIFY_CLIENT_ID);
  const clientSecret = toSafeString(process.env.SPOTIFY_CLIENT_SECRET);
  if (!clientId || !clientSecret) {
    const wrapped = new Error("Faltan credenciales Spotify para renovar token.");
    wrapped.code = "SPOTIFY_CONFIG_ERROR";
    throw wrapped;
  }

  const basicToken = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const bodyParams = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicToken}`
    },
    body: bodyParams
  });

  const tokenData = await response.json();
  if (!response.ok) {
    const wrapped = new Error("Spotify refresh token exchange failed");
    wrapped.code = "SPOTIFY_AUTH_ERROR";
    wrapped.details = tokenData;
    throw wrapped;
  }

  const newAccessToken = toSafeString(tokenData?.access_token);
  if (!newAccessToken) {
    const wrapped = new Error("Spotify no devolvió access_token al renovar.");
    wrapped.code = "SPOTIFY_AUTH_ERROR";
    wrapped.details = tokenData;
    throw wrapped;
  }

  const rotatedRefreshToken = toSafeString(tokenData?.refresh_token);
  if (rotatedRefreshToken && rotatedRefreshToken !== refreshToken) {
    const { error: updateError } = await supabase
      .from("event_spotify_playlists")
      .update({ spotify_refresh_token: rotatedRefreshToken })
      .eq("event_id", normalizedEventId);
    if (updateError) {
      console.warn("[spotify] no se pudo persistir refresh token rotado:", updateError);
    }
  }

  return newAccessToken;
}

export async function searchTracks(eventId, query) {
  const normalizedEventId = normalizeEventId(eventId);
  const normalizedQuery = toSafeString(query);
  if (!normalizedEventId || !normalizedQuery) {
    const error = new Error("eventId y query son obligatorios para buscar canciones.");
    error.code = "SPOTIFY_BAD_REQUEST";
    throw error;
  }

  const accessToken = await getValidAccessTokenForEvent(normalizedEventId);
  const endpoint = `https://api.spotify.com/v1/search?q=${encodeURIComponent(normalizedQuery)}&type=track&limit=5`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error("Spotify search request failed");
    error.code = "SPOTIFY_SEARCH_ERROR";
    error.details = payload;
    throw error;
  }

  const tracks = Array.isArray(payload?.tracks?.items) ? payload.tracks.items : [];
  return tracks.map((trackItem) => {
    const artists = Array.isArray(trackItem?.artists)
      ? trackItem.artists.map((artistItem) => toSafeString(artistItem?.name)).filter(Boolean)
      : [];
    const images = Array.isArray(trackItem?.album?.images) ? trackItem.album.images : [];
    const cover = toSafeString(images?.[0]?.url || images?.[1]?.url || "");
    return {
      id: toSafeString(trackItem?.id),
      name: toSafeString(trackItem?.name),
      artist: artists.join(", "),
      cover,
      uri: toSafeString(trackItem?.uri)
    };
  });
}

export async function addTrackToPlaylist(eventId, trackUri) {
  const normalizedEventId = normalizeEventId(eventId);
  const normalizedTrackUri = toSafeString(trackUri);
  if (!normalizedEventId || !normalizedTrackUri) {
    const error = new Error("eventId y trackUri son obligatorios para añadir canción.");
    error.code = "SPOTIFY_BAD_REQUEST";
    throw error;
  }

  const accessToken = await getValidAccessTokenForEvent(normalizedEventId);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("event_spotify_playlists")
    .select("spotify_playlist_id")
    .eq("event_id", normalizedEventId)
    .maybeSingle();

  if (error) {
    const wrapped = new Error(`No se pudo obtener playlist del evento: ${error.message}`);
    wrapped.code = "SPOTIFY_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  const playlistId = toSafeString(data?.spotify_playlist_id);
  if (!playlistId) {
    const wrapped = new Error("No hay playlist de Spotify conectada para este evento.");
    wrapped.code = "SPOTIFY_PLAYLIST_NOT_FOUND";
    throw wrapped;
  }

  const endpoint = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ uris: [normalizedTrackUri] })
  });

  const payload = await response.json();
  if (!response.ok) {
    const wrapped = new Error("Spotify add track request failed");
    wrapped.code = "SPOTIFY_ADD_TRACK_ERROR";
    wrapped.details = payload;
    throw wrapped;
  }

  return {
    success: true,
    snapshot_id: toSafeString(payload?.snapshot_id)
  };
}

function normalizePotentialUrl(value) {
  const safeValue = toSafeString(value);
  if (!safeValue) {
    return "";
  }
  try {
    return new URL(safeValue).toString();
  } catch {
    return "";
  }
}

function inferFrontendOriginFromRequest(req) {
  if (!req || typeof req !== "object") {
    return "";
  }

  const headerOrigin = normalizePotentialUrl(req.get?.("origin"));
  if (headerOrigin) {
    return headerOrigin;
  }

  const refererRaw = toSafeString(req.get?.("referer"));
  if (refererRaw) {
    try {
      const refererUrl = new URL(refererRaw);
      return `${refererUrl.protocol}//${refererUrl.host}`;
    } catch {
      // ignore invalid referer
    }
  }

  const host = toSafeString(req.get?.("x-forwarded-host")) || toSafeString(req.get?.("host"));
  const forwardedProto = toSafeString(req.get?.("x-forwarded-proto"));
  const protocol = forwardedProto || (req.secure ? "https" : "http");
  if (host) {
    return `${protocol}://${host}`;
  }

  return "";
}

export function buildFrontendEventUrl(eventId, extraParams = {}, req = null) {
  const configuredFrontendUrl = normalizePotentialUrl(process.env.FRONTEND_URL);
  const inferredFrontendUrl = inferFrontendOriginFromRequest(req);
  const frontendBaseUrl = configuredFrontendUrl || inferredFrontendUrl;
  if (!frontendBaseUrl) {
    const error = new Error(
      "No se pudo resolver FRONTEND_URL para redirigir tras Spotify. Configura FRONTEND_URL en producción."
    );
    error.code = "SPOTIFY_CONFIG_ERROR";
    throw error;
  }

  const safeEventId = encodeURIComponent(toSafeString(eventId));
  const url = new URL(`/app/events/${safeEventId}`, frontendBaseUrl);

  for (const [key, value] of Object.entries(extraParams || {})) {
    const safeValue = toSafeString(value);
    if (safeValue) {
      url.searchParams.set(key, safeValue);
    }
  }

  return url.toString();
}
