import express from "express";
import {
  buildFrontendEventUrl,
  createEventPlaylist,
  getSpotifyAuthorizationUrl
} from "../services/spotify-service.js";

const router = express.Router();

router.get("/auth", (req, res) => {
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
});

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
      })
    );
  }

  if (!code) {
    return res.redirect(
      buildFrontendEventUrl(eventId, {
        spotify: "error",
        reason: "missing_code"
      })
    );
  }

  try {
    const playlist = await createEventPlaylist(code, eventId);
    return res.redirect(
      buildFrontendEventUrl(eventId, {
        spotify: "connected",
        playlistId: playlist.playlistId
      })
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
      })
    );
  }
});

export { router as spotifyRoute };
