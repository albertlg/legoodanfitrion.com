import { createClient } from "@supabase/supabase-js";

const GOOGLE_PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_PLACES_MEDIA_BASE_URL = "https://places.googleapis.com/v1";
const GOOGLE_PLACES_FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.photos";

let supabaseAdminClient = null;

function toSafeString(value) {
  return String(value || "").trim();
}

function toNullableText(value) {
  const normalized = toSafeString(value);
  return normalized || null;
}

function toNullableNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
    error.code = "VENUE_CONFIG_ERROR";
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

function getGooglePlacesApiKey() {
  const apiKey = toSafeString(process.env.GOOGLE_PLACES_API_KEY);
  if (!apiKey) {
    const error = new Error("GOOGLE_PLACES_API_KEY no está configurada.");
    error.code = "VENUE_CONFIG_ERROR";
    throw error;
  }
  return apiKey;
}

function mapGooglePriceLevel(value) {
  if (value == null) {
    return null;
  }

  if (Number.isFinite(Number(value))) {
    const parsed = Number(value);
    if (parsed >= 0 && parsed <= 4) {
      return parsed;
    }
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  const priceLevelMap = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4
  };
  return Number.isFinite(priceLevelMap[normalized]) ? priceLevelMap[normalized] : null;
}

function buildGooglePhotoUrl(photoName, apiKey) {
  const normalizedPhotoName = toSafeString(photoName).replace(/^\/+/, "");
  if (!normalizedPhotoName || !apiKey) {
    return null;
  }
  return `${GOOGLE_PLACES_MEDIA_BASE_URL}/${normalizedPhotoName}/media?maxHeightPx=400&maxWidthPx=400&key=${encodeURIComponent(apiKey)}`;
}

async function assertEventEditorAccess(eventId, requesterUserId) {
  const supabase = getSupabaseAdminClient();
  const normalizedEventId = toSafeString(eventId);
  const normalizedRequesterId = toSafeString(requesterUserId);

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("id, host_user_id")
    .eq("id", normalizedEventId)
    .maybeSingle();

  if (eventError) {
    const error = new Error(`No se pudo comprobar el evento: ${eventError.message}`);
    error.code = "VENUE_DB_ERROR";
    error.details = eventError;
    throw error;
  }

  if (!eventData?.id) {
    const error = new Error("Evento no encontrado.");
    error.code = "VENUE_EVENT_NOT_FOUND";
    throw error;
  }

  const isOwner = toSafeString(eventData.host_user_id) === normalizedRequesterId;
  if (isOwner) {
    return {
      eventId: normalizedEventId,
      ownerUserId: toSafeString(eventData.host_user_id),
      isEditor: true
    };
  }

  const { count, error: cohostError } = await supabase
    .from("event_cohosts")
    .select("id", { count: "exact", head: true })
    .eq("event_id", normalizedEventId)
    .eq("host_id", normalizedRequesterId);

  if (cohostError) {
    const error = new Error(`No se pudo validar acceso de co-anfitrión: ${cohostError.message}`);
    error.code = "VENUE_DB_ERROR";
    error.details = cohostError;
    throw error;
  }

  if (!count) {
    const error = new Error("No tienes permisos para gestionar lugares de este evento.");
    error.code = "VENUE_FORBIDDEN";
    throw error;
  }

  return {
    eventId: normalizedEventId,
    ownerUserId: toSafeString(eventData.host_user_id),
    isEditor: true
  };
}

export async function searchVenues(query) {
  const normalizedQuery = toSafeString(query);
  if (!normalizedQuery) {
    const error = new Error("q/query es obligatorio.");
    error.code = "VENUE_BAD_REQUEST";
    throw error;
  }

  const apiKey = getGooglePlacesApiKey();
  const response = await fetch(GOOGLE_PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK
    },
    body: JSON.stringify({
      textQuery: normalizedQuery,
      languageCode: "es",
      maxResultCount: 8
    })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      toSafeString(payload?.error?.message) || `Google Places search failed (${response.status})`
    );
    error.code = "VENUE_PLACES_ERROR";
    error.details = payload;
    throw error;
  }

  const places = Array.isArray(payload?.places) ? payload.places : [];
  return places
    .map((placeItem) => {
      const placeId = toSafeString(placeItem?.id);
      const name = toSafeString(placeItem?.displayName?.text || placeItem?.displayName);
      const address = toSafeString(placeItem?.formattedAddress);
      const rating = toNullableNumber(placeItem?.rating);
      const priceLevel = mapGooglePriceLevel(placeItem?.priceLevel);
      const firstPhotoName = toSafeString(placeItem?.photos?.[0]?.name);
      const photoUrl = buildGooglePhotoUrl(firstPhotoName, apiKey);
      return {
        id: placeId,
        name,
        address: address || null,
        rating,
        priceLevel,
        photoUrl
      };
    })
    .filter((item) => item.id && item.name);
}

export async function saveShortlistVenue(eventId, hostUserId, venueData) {
  const normalizedEventId = toSafeString(eventId);
  const normalizedHostUserId = toSafeString(hostUserId);
  if (!normalizedEventId || !normalizedHostUserId) {
    const error = new Error("eventId y hostUserId son obligatorios.");
    error.code = "VENUE_BAD_REQUEST";
    throw error;
  }

  const access = await assertEventEditorAccess(normalizedEventId, normalizedHostUserId);
  const normalizedVenueData = venueData && typeof venueData === "object" ? venueData : {};

  const name = toSafeString(normalizedVenueData.name);
  const googlePlaceId = toSafeString(normalizedVenueData.id || normalizedVenueData.placeId || normalizedVenueData.google_place_id);
  if (!name || !googlePlaceId) {
    const error = new Error("venueData.name y venueData.id/placeId son obligatorios.");
    error.code = "VENUE_BAD_REQUEST";
    throw error;
  }

  const payload = {
    event_id: access.eventId,
    host_user_id: access.ownerUserId,
    name,
    address: toNullableText(normalizedVenueData.address),
    google_place_id: googlePlaceId,
    google_rating: toNullableNumber(normalizedVenueData.rating),
    google_price_level: mapGooglePriceLevel(normalizedVenueData.priceLevel),
    google_photo_url: toNullableText(normalizedVenueData.photoUrl),
    is_final_selection: Boolean(normalizedVenueData.isFinalSelection)
  };

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("event_venues")
    .upsert(payload, { onConflict: "event_id,google_place_id" })
    .select("id, event_id, host_user_id, name, address, google_place_id, google_rating, google_price_level, google_photo_url, is_final_selection, created_at, updated_at")
    .maybeSingle();

  if (error) {
    const wrapped = new Error(`No se pudo guardar el lugar: ${error.message}`);
    wrapped.code = "VENUE_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return data || null;
}

function buildVenueVoteCountMap(voteRows) {
  return (Array.isArray(voteRows) ? voteRows : []).reduce((accumulator, voteItem) => {
    const venueId = toSafeString(voteItem?.event_venue_id);
    if (!venueId) {
      return accumulator;
    }
    accumulator[venueId] = (accumulator[venueId] || 0) + 1;
    return accumulator;
  }, {});
}

export async function getShortlistedVenues(eventId, requesterUserId) {
  const normalizedEventId = toSafeString(eventId);
  const normalizedRequesterId = toSafeString(requesterUserId);
  if (!normalizedEventId || !normalizedRequesterId) {
    const error = new Error("eventId y requesterUserId son obligatorios.");
    error.code = "VENUE_BAD_REQUEST";
    throw error;
  }

  const access = await assertEventEditorAccess(normalizedEventId, normalizedRequesterId);
  const supabase = getSupabaseAdminClient();

  const [{ data: venueRows, error: venueError }, { data: voteRows, error: voteError }] =
    await Promise.all([
      supabase
        .from("event_venues")
        .select(
          "id, event_id, host_user_id, name, address, google_place_id, google_rating, google_price_level, google_photo_url, is_final_selection, created_at, updated_at"
        )
        .eq("event_id", access.eventId)
        .order("is_final_selection", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("event_venue_votes")
        .select("event_venue_id")
        .eq("event_id", access.eventId)
    ]);

  if (venueError) {
    const wrapped = new Error(`No se pudo cargar el shortlist de lugares: ${venueError.message}`);
    wrapped.code = "VENUE_DB_ERROR";
    wrapped.details = venueError;
    throw wrapped;
  }

  if (voteError) {
    const wrapped = new Error(`No se pudieron cargar los votos de lugares: ${voteError.message}`);
    wrapped.code = "VENUE_DB_ERROR";
    wrapped.details = voteError;
    throw wrapped;
  }

  const voteCountByVenueId = buildVenueVoteCountMap(voteRows);
  return (Array.isArray(venueRows) ? venueRows : []).map((venueItem) => ({
    ...venueItem,
    vote_count: Number(voteCountByVenueId[toSafeString(venueItem?.id)] || 0)
  }));
}

export async function selectFinalVenue(eventId, venueId, requesterUserId) {
  const normalizedEventId = toSafeString(eventId);
  const normalizedVenueId = toSafeString(venueId);
  const normalizedRequesterId = toSafeString(requesterUserId);
  if (!normalizedEventId || !normalizedVenueId || !normalizedRequesterId) {
    const error = new Error("eventId, venueId y requesterUserId son obligatorios.");
    error.code = "VENUE_BAD_REQUEST";
    throw error;
  }

  const access = await assertEventEditorAccess(normalizedEventId, normalizedRequesterId);
  const supabase = getSupabaseAdminClient();

  const { data: targetVenue, error: targetError } = await supabase
    .from("event_venues")
    .select("id, event_id, host_user_id, name, address, google_place_id, google_rating, google_price_level, google_photo_url, is_final_selection, created_at, updated_at")
    .eq("id", normalizedVenueId)
    .eq("event_id", access.eventId)
    .eq("host_user_id", access.ownerUserId)
    .maybeSingle();

  if (targetError) {
    const wrapped = new Error(`No se pudo validar el lugar seleccionado: ${targetError.message}`);
    wrapped.code = "VENUE_DB_ERROR";
    wrapped.details = targetError;
    throw wrapped;
  }

  if (!targetVenue?.id) {
    const error = new Error("Lugar no encontrado para este evento.");
    error.code = "VENUE_EVENT_NOT_FOUND";
    throw error;
  }

  const resetResult = await supabase
    .from("event_venues")
    .update({ is_final_selection: false })
    .eq("event_id", access.eventId)
    .eq("host_user_id", access.ownerUserId);

  if (resetResult.error) {
    const wrapped = new Error(`No se pudo reiniciar la selección final: ${resetResult.error.message}`);
    wrapped.code = "VENUE_DB_ERROR";
    wrapped.details = resetResult.error;
    throw wrapped;
  }

  const { data, error } = await supabase
    .from("event_venues")
    .update({ is_final_selection: true })
    .eq("id", normalizedVenueId)
    .eq("event_id", access.eventId)
    .eq("host_user_id", access.ownerUserId)
    .select(
      "id, event_id, host_user_id, name, address, google_place_id, google_rating, google_price_level, google_photo_url, is_final_selection, created_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    const wrapped = new Error(`No se pudo marcar el lugar definitivo: ${error.message}`);
    wrapped.code = "VENUE_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return data || targetVenue;
}

export async function resolveInvitationByToken(token) {
  const normalizedToken = toSafeString(token);
  if (!normalizedToken) {
    const error = new Error("token es obligatorio.");
    error.code = "VENUE_BAD_REQUEST";
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("id, event_id, host_user_id, status, events!inner(status, start_at, end_at)")
    .eq("public_token", normalizedToken)
    .maybeSingle();

  if (error) {
    const wrapped = new Error(`No se pudo validar la invitación: ${error.message}`);
    wrapped.code = "VENUE_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  if (!data?.id) {
    const wrapped = new Error("Token de invitación no válido.");
    wrapped.code = "VENUE_INVITATION_NOT_FOUND";
    throw wrapped;
  }

  const eventStatus = toSafeString(data?.events?.status).toLowerCase();
  if (eventStatus === "cancelled") {
    const wrapped = new Error("La votación está cerrada para eventos cancelados.");
    wrapped.code = "VENUE_VOTING_CLOSED";
    throw wrapped;
  }

  const endAtRaw = toSafeString(data?.events?.end_at);
  const startAtRaw = toSafeString(data?.events?.start_at);
  const effectiveDateRaw = endAtRaw || startAtRaw;
  if (effectiveDateRaw) {
    const effectiveDate = new Date(effectiveDateRaw);
    if (Number.isFinite(effectiveDate.getTime()) && effectiveDate.getTime() < Date.now()) {
      const wrapped = new Error("La votación está cerrada porque el evento ya finalizó.");
      wrapped.code = "VENUE_VOTING_CLOSED";
      throw wrapped;
    }
  }

  return {
    invitationId: toSafeString(data.id),
    eventId: toSafeString(data.event_id),
    hostUserId: toSafeString(data.host_user_id)
  };
}

export async function voteForVenue(venueId, invitationId) {
  const normalizedVenueId = toSafeString(venueId);
  const normalizedInvitationId = toSafeString(invitationId);
  if (!normalizedVenueId || !normalizedInvitationId) {
    const error = new Error("venueId e invitationId son obligatorios.");
    error.code = "VENUE_BAD_REQUEST";
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("event_venue_votes")
    .upsert(
      {
        event_venue_id: normalizedVenueId,
        invitation_id: normalizedInvitationId
      },
      { onConflict: "event_venue_id,invitation_id" }
    )
    .select("id, event_venue_id, invitation_id, event_id, host_user_id, created_at, updated_at")
    .maybeSingle();

  if (error) {
    const wrapped = new Error(`No se pudo registrar el voto del lugar: ${error.message}`);
    wrapped.code = "VENUE_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return data || null;
}

export async function getPublicVenueVotingData(token) {
  const invitation = await resolveInvitationByToken(token);
  const supabase = getSupabaseAdminClient();

  const [{ data: venueRows, error: venueError }, { data: voteRows, error: voteError }, { data: ownVoteRows, error: ownVoteError }] =
    await Promise.all([
      supabase
        .from("event_venues")
        .select(
          "id, event_id, host_user_id, name, address, google_place_id, google_rating, google_price_level, google_photo_url, is_final_selection, created_at, updated_at"
        )
        .eq("event_id", invitation.eventId)
        .order("is_final_selection", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("event_venue_votes")
        .select("event_venue_id")
        .eq("event_id", invitation.eventId),
      supabase
        .from("event_venue_votes")
        .select("event_venue_id")
        .eq("event_id", invitation.eventId)
        .eq("invitation_id", invitation.invitationId)
    ]);

  if (venueError || voteError || ownVoteError) {
    const wrapped = new Error(
      `No se pudo cargar la votación pública de lugares: ${
        venueError?.message || voteError?.message || ownVoteError?.message || "unknown_error"
      }`
    );
    wrapped.code = "VENUE_DB_ERROR";
    wrapped.details = venueError || voteError || ownVoteError;
    throw wrapped;
  }

  const voteCountByVenueId = buildVenueVoteCountMap(voteRows);
  const userVotedVenueIds = Array.from(
    new Set(
      (Array.isArray(ownVoteRows) ? ownVoteRows : [])
        .map((voteItem) => toSafeString(voteItem?.event_venue_id))
        .filter(Boolean)
    )
  );

  const venues = (Array.isArray(venueRows) ? venueRows : []).map((venueItem) => ({
    ...venueItem,
    vote_count: Number(voteCountByVenueId[toSafeString(venueItem?.id)] || 0)
  }));
  const finalVenue = venues.find((venueItem) => Boolean(venueItem?.is_final_selection)) || null;

  return {
    invitationId: invitation.invitationId,
    eventId: invitation.eventId,
    venues,
    finalVenue,
    userVotedVenueIds
  };
}
