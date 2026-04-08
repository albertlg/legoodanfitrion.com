import express from "express";
import { requireAuthenticatedUser } from "../middleware/auth-middleware.js";
import {
  getPublicVenueVotingData,
  getShortlistedVenues,
  resolveInvitationByToken,
  saveShortlistVenue,
  searchVenues,
  selectFinalVenue,
  voteForVenue
} from "../services/venue-service.js";

const router = express.Router();

function sendVenueError(res, error, fallbackMessage) {
  const code = String(error?.code || "");

  if (code === "VENUE_BAD_REQUEST") {
    return res.status(400).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "VENUE_FORBIDDEN") {
    return res.status(403).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "VENUE_EVENT_NOT_FOUND" || code === "VENUE_INVITATION_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "VENUE_VOTING_CLOSED") {
    return res.status(409).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "VENUE_CONFIG_ERROR") {
    return res.status(503).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  return res.status(500).json({
    success: false,
    error: error?.message || fallbackMessage,
    code: code || "VENUE_ROUTE_ERROR"
  });
}

router.get("/search", requireAuthenticatedUser, async (req, res) => {
  const query = String(req.query.q || "").trim();

  try {
    const venues = await searchVenues(query);
    return res.json({
      success: true,
      venues
    });
  } catch (error) {
    console.error(
      "Venue search error:",
      error?.details || error?.message || error
    );
    return sendVenueError(res, error, "No se pudieron buscar lugares.");
  }
});

router.post("/shortlist", requireAuthenticatedUser, async (req, res) => {
  const eventId = String(req.body?.eventId || "").trim();
  const venue = req.body?.venue || null;

  try {
    const savedVenue = await saveShortlistVenue(eventId, req.authUser.id, venue);
    return res.json({
      success: true,
      venue: savedVenue
    });
  } catch (error) {
    console.error(
      "Venue shortlist error:",
      error?.details || error?.message || error
    );
    return sendVenueError(res, error, "No se pudo guardar el lugar preseleccionado.");
  }
});

router.get("/shortlist", requireAuthenticatedUser, async (req, res) => {
  const eventId = String(req.query.eventId || "").trim();

  try {
    const venues = await getShortlistedVenues(eventId, req.authUser.id);
    return res.json({
      success: true,
      venues
    });
  } catch (error) {
    console.error(
      "Venue shortlist read error:",
      error?.details || error?.message || error
    );
    return sendVenueError(res, error, "No se pudo cargar el shortlist de lugares.");
  }
});

router.post("/select-final", requireAuthenticatedUser, async (req, res) => {
  const eventId = String(req.body?.eventId || "").trim();
  const venueId = String(req.body?.venueId || "").trim();

  try {
    const venue = await selectFinalVenue(eventId, venueId, req.authUser.id);
    return res.json({
      success: true,
      venue
    });
  } catch (error) {
    console.error(
      "Venue final selection error:",
      error?.details || error?.message || error
    );
    return sendVenueError(res, error, "No se pudo marcar el lugar como definitivo.");
  }
});

router.get("/public", async (req, res) => {
  const token = String(req.query.token || "").trim();

  try {
    const data = await getPublicVenueVotingData(token);
    return res.json({
      success: true,
      ...data
    });
  } catch (error) {
    console.error(
      "Venue public read error:",
      error?.details || error?.message || error
    );
    return sendVenueError(res, error, "No se pudo cargar la votación pública de lugares.");
  }
});

router.post("/vote", async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const venueId = String(req.body?.venueId || "").trim();

  try {
    const invitation = await resolveInvitationByToken(token);
    const vote = await voteForVenue(venueId, invitation.invitationId);
    return res.json({
      success: true,
      vote
    });
  } catch (error) {
    console.error(
      "Venue vote error:",
      error?.details || error?.message || error
    );
    return sendVenueError(res, error, "No se pudo registrar el voto para este lugar.");
  }
});

export { router as venueRoute };
