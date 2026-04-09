import express from "express";
import {
  addTrackToPlaylist,
  buildFrontendEventUrl,
  createEventPlaylist,
  debugSpotifyIdentity,
  getSpotifyAuthorizationUrl,
  getValidAccessTokenForEvent,
  searchTracks
} from "../services/spotify-service.js";

const router = express.Router();

function handleSpotifyAuthRedirect(req, res) {
  try {
    const eventId = String(req.query.eventId || "").trim();
    if (!eventId) {
      return res.status(400).json({
        error: "eventId es obligatorio."
      });
    }
    const authUrl = getSpotifyAuthorizationUrl(eventId);
    return res.redirect(authUrl);
  } catch (error) {
    const code = String(error?.code || "");
    const statusCode = code === "SPOTIFY_BAD_REQUEST" ? 400 : code === "SPOTIFY_CONFIG_ERROR" ? 503 : 500;
    return res.status(statusCode).json({
      error: error?.message || "No se pudo iniciar OAuth con Spotify.",
      code: code || "SPOTIFY_AUTH_INIT_ERROR"
    });
  }
}

router.get("/auth", handleSpotifyAuthRedirect);
router.get("/login", handleSpotifyAuthRedirect);

router.get("/callback", async (req, res) => {
  const code = String(req.query.code || "").trim();
  const eventId = String(req.query.state || "").trim();
  const spotifyError = String(req.query.error || "").trim();

  if (!eventId) {
    return res.status(400).json({
      error: "state/eventId es obligatorio en el callback de Spotify."
    });
  }

  if (spotifyError) {
    return res.redirect(
      buildFrontendEventUrl(eventId, {
        spotify: "error",
        reason: spotifyError
      }, req)
    );
  }

  if (!code) {
    return res.redirect(
      buildFrontendEventUrl(eventId, {
        spotify: "error",
        reason: "missing_code"
      }, req)
    );
  }

  try {
    const playlist = await createEventPlaylist(code, eventId);
    return res.redirect(
      buildFrontendEventUrl(eventId, {
        spotify: "connected",
        playlistId: playlist.playlistId
      }, req)
    );
  } catch (error) {
    console.error(
      "Error detallado de Spotify:",
      error?.body || error?.message || error
    );
    return res.redirect(
      buildFrontendEventUrl(eventId, {
        spotify: "error",
        reason: "auth_failed"
      }, req)
    );
  }
});

router.get("/test-refresh", async (req, res) => {
  const eventId = String(req.query.eventId || "").trim();
  if (!eventId) {
    return res.status(400).json({
      success: false,
      error: "eventId es obligatorio."
    });
  }

  try {
    const newToken = await getValidAccessTokenForEvent(eventId);
    return res.json({
      success: true,
      new_token: `${String(newToken || "").slice(0, 10)}...`,
      message: "¡Token renovado con éxito!"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || "No se pudo renovar el token de Spotify.",
      code: String(error?.code || "SPOTIFY_REFRESH_TEST_ERROR"),
      details: error?.details || null
    });
  }
});

router.get("/debug/:eventId", async (req, res) => {
  const eventId = String(req.params.eventId || "").trim();
  if (!eventId) {
    return res.status(400).json({
      success: false,
      error: "eventId es obligatorio."
    });
  }

  try {
    const payload = await debugSpotifyIdentity(eventId);
    return res.json({
      success: true,
      ...payload
    });
  } catch (error) {
    console.error(
      "Error real de Spotify (debug-identity):",
      error?.details || error?.body || error?.message || error
    );
    return res.status(500).json({
      success: false,
      error: error?.message || "No se pudo depurar la identidad de Spotify.",
      code: String(error?.code || "SPOTIFY_DEBUG_IDENTITY_ROUTE_ERROR"),
      details: error?.details || null
    });
  }
});

router.get("/search", async (req, res) => {
  const eventId = String(req.query.eventId || "").trim();
  const query = String(req.query.q || "").trim();

  if (!eventId || !query) {
    return res.status(400).json({
      success: false,
      error: "eventId y q son obligatorios."
    });
  }

  try {
    const tracks = await searchTracks(eventId, query);
    return res.json({
      success: true,
      tracks
    });
  } catch (error) {
    console.error(
      "Error real de Spotify (search):",
      error?.details || error?.body || error?.message || error
    );
    return res.status(500).json({
      success: false,
      error: error?.message || "No se pudo buscar canciones en Spotify.",
      code: String(error?.code || "SPOTIFY_SEARCH_ROUTE_ERROR")
    });
  }
});

router.post("/add-track", async (req, res) => {
  const eventId = String(req.body?.eventId || "").trim();
  const trackUri = String(req.body?.trackUri || "").trim();

  if (!eventId || !trackUri) {
    return res.status(400).json({
      success: false,
      error: "eventId y trackUri son obligatorios."
    });
  }

  try {
    const result = await addTrackToPlaylist(eventId, trackUri);
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error(
      "Error real de Spotify (add-track):",
      error?.details || error?.body || error?.message || error
    );
    return res.status(500).json({
      success: false,
      error: error?.message || "No se pudo añadir la canción a la playlist.",
      code: String(error?.code || "SPOTIFY_ADD_TRACK_ROUTE_ERROR")
    });
  }
});

export { router as spotifyRoute };
