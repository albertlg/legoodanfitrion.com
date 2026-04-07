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

async function getEventForPlaylist(eventId) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("id,title")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    const wrapped = new Error(`No se pudo validar el evento: ${error.message}`);
    wrapped.code = "SPOTIFY_DB_ERROR";
    throw wrapped;
  }

  if (!data?.id) {
    const wrapped = new Error("Evento no encontrado para crear la playlist.");
    wrapped.code = "SPOTIFY_EVENT_NOT_FOUND";
    throw wrapped;
  }

  return data;
}

async function saveEventSpotifyPlaylist({ eventId, playlistId, playlistUrl }) {
  const supabase = getSupabaseAdminClient();
  const payload = {
    event_id: eventId,
    spotify_playlist_id: playlistId,
    spotify_playlist_url: playlistUrl
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
    await getEventForPlaylist(normalizedEventId);

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
    const playlistName = `LGA: Evento ${normalizedEventId}`;

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
      playlistUrl
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

export function buildFrontendEventUrl(eventId, extraParams = {}) {
  const frontendBaseUrl = toSafeString(process.env.FRONTEND_URL) || "http://localhost:5173";
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
