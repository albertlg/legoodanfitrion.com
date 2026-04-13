import { Resend } from "resend";

const DEFAULT_SIGNUP_BASE_URL = "https://legoodanfitrion.com/signup";
const DEFAULT_FROM_EMAIL = "LeGoodAnfitrion <onboarding@resend.dev>";
const DEFAULT_TICKET_DETAILS_URL = "https://legoodanfitrion.com";
const SUPPORTED_TICKET_LOCALES = new Set(["es", "ca", "en", "fr", "it"]);

const RSVP_TICKET_COPY = {
  es: {
    intlLocale: "es-ES",
    subject: (eventName) => `🎫 Tu entrada para ${eventName}`,
    ticketKicker: "LeGoodAnfitrion - Ticket digital",
    confirmedTitle: "¡Confirmado!",
    intro: (guestName) => `Hola ${guestName}, tu asistencia ya está confirmada. Aquí tienes tu entrada digital:`,
    dateLabel: "Fecha y hora",
    locationLabel: "Ubicación",
    locationPendingName: "Por confirmar",
    locationPendingAddress: "Dirección pendiente",
    addToCalendar: "Añadir a Google Calendar",
    viewEventDetails: "Ver detalles del evento",
    textGreeting: (guestName) => `Hola ${guestName},`,
    textConfirmed: (eventName) => `Tu asistencia a "${eventName}" está confirmada.`,
    textDate: "Fecha",
    textLocation: "Ubicación"
  },
  ca: {
    intlLocale: "ca-ES",
    subject: (eventName) => `🎫 La teva entrada per a ${eventName}`,
    ticketKicker: "LeGoodAnfitrion - Entrada digital",
    confirmedTitle: "Confirmat!",
    intro: (guestName) => `Hola ${guestName}, la teva assistència ja està confirmada. Aquí tens la teva entrada digital:`,
    dateLabel: "Data i hora",
    locationLabel: "Lloc",
    locationPendingName: "Per confirmar",
    locationPendingAddress: "Adreça pendent",
    addToCalendar: "Afegeix a Google Calendar",
    viewEventDetails: "Veure detalls de l'esdeveniment",
    textGreeting: (guestName) => `Hola ${guestName},`,
    textConfirmed: (eventName) => `La teva assistència a "${eventName}" està confirmada.`,
    textDate: "Data",
    textLocation: "Lloc"
  },
  en: {
    intlLocale: "en-US",
    subject: (eventName) => `🎫 Your ticket for ${eventName}`,
    ticketKicker: "LeGoodAnfitrion - Digital ticket",
    confirmedTitle: "Confirmed!",
    intro: (guestName) => `Hi ${guestName}, your attendance is confirmed. Here is your digital ticket:`,
    dateLabel: "Date and time",
    locationLabel: "Location",
    locationPendingName: "To be confirmed",
    locationPendingAddress: "Address pending",
    addToCalendar: "Add to Google Calendar",
    viewEventDetails: "View event details",
    textGreeting: (guestName) => `Hi ${guestName},`,
    textConfirmed: (eventName) => `Your attendance to "${eventName}" is confirmed.`,
    textDate: "Date",
    textLocation: "Location"
  },
  fr: {
    intlLocale: "fr-FR",
    subject: (eventName) => `🎫 Votre billet pour ${eventName}`,
    ticketKicker: "LeGoodAnfitrion - Billet numérique",
    confirmedTitle: "Confirmé !",
    intro: (guestName) => `Bonjour ${guestName}, votre présence est confirmée. Voici votre billet numérique :`,
    dateLabel: "Date et heure",
    locationLabel: "Lieu",
    locationPendingName: "À confirmer",
    locationPendingAddress: "Adresse en attente",
    addToCalendar: "Ajouter à Google Calendar",
    viewEventDetails: "Voir les détails de l'événement",
    textGreeting: (guestName) => `Bonjour ${guestName},`,
    textConfirmed: (eventName) => `Votre présence à "${eventName}" est confirmée.`,
    textDate: "Date",
    textLocation: "Lieu"
  },
  it: {
    intlLocale: "it-IT",
    subject: (eventName) => `🎫 Il tuo biglietto per ${eventName}`,
    ticketKicker: "LeGoodAnfitrion - Biglietto digitale",
    confirmedTitle: "Confermato!",
    intro: (guestName) => `Ciao ${guestName}, la tua presenza è confermata. Ecco il tuo biglietto digitale:`,
    dateLabel: "Data e ora",
    locationLabel: "Luogo",
    locationPendingName: "Da confermare",
    locationPendingAddress: "Indirizzo in attesa",
    addToCalendar: "Aggiungi a Google Calendar",
    viewEventDetails: "Vedi dettagli evento",
    textGreeting: (guestName) => `Ciao ${guestName},`,
    textConfirmed: (eventName) => `La tua presenza a "${eventName}" è confermata.`,
    textDate: "Data",
    textLocation: "Luogo"
  }
};

let resendClient = null;

function toSafeString(value) {
  return String(value || "").trim();
}

function normalizeTicketLocale(localeValue) {
  const normalized = toSafeString(localeValue).toLowerCase();
  if (!normalized) {
    return "es";
  }
  const baseLocale = normalized.split("-")[0];
  return SUPPORTED_TICKET_LOCALES.has(baseLocale) ? baseLocale : "es";
}

function getRsvpTicketCopy(localeValue) {
  const normalizedLocale = normalizeTicketLocale(localeValue);
  return RSVP_TICKET_COPY[normalizedLocale] || RSVP_TICKET_COPY.es;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getResendClient() {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = toSafeString(process.env.RESEND_API_KEY);
  if (!apiKey) {
    const error = new Error("RESEND_API_KEY no está configurada.");
    error.code = "EMAIL_CONFIG_ERROR";
    throw error;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

function buildSignupUrl(targetEmail) {
  const signupBase = toSafeString(process.env.SIGNUP_URL || DEFAULT_SIGNUP_BASE_URL);
  const url = new URL(signupBase);
  url.searchParams.set("email", toSafeString(targetEmail));
  url.searchParams.set("ref", "invite");
  return url.toString();
}

function buildCoHostInviteHtml({ signupUrl, hostName, eventName }) {
  const escapedHostName = escapeHtml(hostName);
  const escapedEventName = escapeHtml(eventName);
  const escapedSignupUrl = escapeHtml(signupUrl);

  return `
    <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 20px 28px;">
            <p style="margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6366f1;font-weight:700;">LeGoodAnfitrion</p>
            <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#111827;">T'han convidat a co-organitzar un esdeveniment</h1>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#374151;">
              <strong>${escapedHostName}</strong> vol que l'ajudis a organitzar <strong>${escapedEventName}</strong>.
            </p>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#374151;">
              Crea el teu compte gratuït a LeGoodAnfitrion per formar part de l'equip de l'esdeveniment.
            </p>
            <a href="${escapedSignupUrl}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 18px;border-radius:10px;">
              Crear compte gratuït
            </a>
            <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
              Si el botó no funciona, copia i enganxa aquest enllaç al navegador:<br />
              <a href="${escapedSignupUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;word-break:break-all;">${escapedSignupUrl}</a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function formatCalendarDateUtc(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function toValidDateOrNull(value) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function buildGoogleCalendarUrl(eventDetails) {
  const title = toSafeString(eventDetails?.eventName) || "LeGoodAnfitrion event";
  const description = toSafeString(eventDetails?.description) || "RSVP confirmed via LeGoodAnfitrion";
  const location = toSafeString(eventDetails?.locationAddress || eventDetails?.locationName);

  const startAtDate = toValidDateOrNull(eventDetails?.startAt);
  const fallbackStart = startAtDate || new Date();
  const endAtDate = toValidDateOrNull(eventDetails?.endAt) || new Date(fallbackStart.getTime() + 2 * 60 * 60 * 1000);

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("details", description);
  if (location) {
    url.searchParams.set("location", location);
  }
  url.searchParams.set("dates", `${formatCalendarDateUtc(fallbackStart)}/${formatCalendarDateUtc(endAtDate)}`);
  return url.toString();
}

function formatEventDateRange(eventDetails) {
  const locale = toSafeString(eventDetails?.locale) || "es-ES";
  const timezone = toSafeString(eventDetails?.timezone) || "Europe/Madrid";
  const startAtDate = toValidDateOrNull(eventDetails?.startAt);
  const endAtDate = toValidDateOrNull(eventDetails?.endAt);

  if (!startAtDate) {
    return "Fecha pendiente de confirmar";
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  if (!endAtDate) {
    return dateFormatter.format(startAtDate);
  }

  const endFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${dateFormatter.format(startAtDate)} - ${endFormatter.format(endAtDate)}`;
}

function buildRsvpTicketHtml({ guestName, eventDetails, calendarUrl, detailsUrl, copy }) {
  const escapedEventName = escapeHtml(eventDetails?.eventName || "Evento");
  const escapedDateLabel = escapeHtml(formatEventDateRange(eventDetails));
  const escapedLocationName = escapeHtml(toSafeString(eventDetails?.locationName) || copy.locationPendingName);
  const escapedLocationAddress = escapeHtml(toSafeString(eventDetails?.locationAddress) || copy.locationPendingAddress);
  const escapedCalendarUrl = escapeHtml(calendarUrl);
  const escapedDetailsUrl = escapeHtml(detailsUrl);
  const escapedTicketKicker = escapeHtml(copy.ticketKicker);
  const escapedConfirmedTitle = escapeHtml(copy.confirmedTitle);
  const escapedIntro = escapeHtml(copy.intro(guestName || "Invitado"));
  const escapedDateLabelTitle = escapeHtml(copy.dateLabel);
  const escapedLocationLabelTitle = escapeHtml(copy.locationLabel);
  const escapedCalendarCta = escapeHtml(copy.addToCalendar);
  const escapedDetailsCta = escapeHtml(copy.viewEventDetails);

  return `
    <div style="margin:0;padding:24px;background:#eef2ff;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:18px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(90deg,#2563eb,#7c3aed);padding:18px 24px;color:#ffffff;">
            <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;opacity:.92;">${escapedTicketKicker}</p>
            <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;">${escapedEventName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 8px;font-size:20px;line-height:1.3;font-weight:800;color:#0f172a;">
              ${escapedConfirmedTitle}
            </p>
            <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">
              ${escapedIntro}
            </p>
            <div style="border:1px dashed #93c5fd;border-radius:14px;padding:16px;background:#f8fafc;">
              <p style="margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700;">${escapedDateLabelTitle}</p>
              <p style="margin:0 0 14px;font-size:16px;color:#0f172a;font-weight:700;">${escapedDateLabel}</p>
              <p style="margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700;">${escapedLocationLabelTitle}</p>
              <p style="margin:0;font-size:15px;color:#0f172a;font-weight:700;">${escapedLocationName}</p>
              <p style="margin:6px 0 0;font-size:13px;color:#475569;">${escapedLocationAddress}</p>
            </div>
            <div style="margin-top:18px;display:flex;flex-wrap:wrap;gap:10px;">
              <a href="${escapedCalendarUrl}" target="_blank" rel="noopener noreferrer"
                 style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 16px;border-radius:10px;">
                ${escapedCalendarCta}
              </a>
              <a href="${escapedDetailsUrl}" target="_blank" rel="noopener noreferrer"
                 style="display:inline-block;background:#f1f5f9;color:#1e293b;font-weight:700;font-size:14px;text-decoration:none;padding:11px 16px;border-radius:10px;border:1px solid #cbd5e1;">
                ${escapedDetailsCta}
              </a>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export async function sendCoHostInvitation(targetEmail, hostName, eventName) {
  const normalizedEmail = toSafeString(targetEmail).toLowerCase();
  const normalizedHostName = toSafeString(hostName) || "Un anfitrión de LeGoodAnfitrion";
  const normalizedEventName = toSafeString(eventName) || "tu evento";

  if (!normalizedEmail) {
    const error = new Error("targetEmail es obligatorio.");
    error.code = "EMAIL_BAD_REQUEST";
    throw error;
  }

  const resend = getResendClient();
  const signupUrl = buildSignupUrl(normalizedEmail);
  const fromEmail = toSafeString(process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL);

  const response = await resend.emails.send({
    from: fromEmail,
    to: normalizedEmail,
    subject: `${normalizedHostName} te invita a co-organizar "${normalizedEventName}"`,
    html: buildCoHostInviteHtml({
      signupUrl,
      hostName: normalizedHostName,
      eventName: normalizedEventName
    }),
    text: `${normalizedHostName} te invita a co-organizar "${normalizedEventName}" en LeGoodAnfitrion. Crea tu cuenta gratuita aquí: ${signupUrl}`
  });

  if (response?.error) {
    const error = new Error(
      toSafeString(response.error.message) || "Resend no pudo enviar el email."
    );
    error.code = "EMAIL_SEND_ERROR";
    error.details = response.error;
    throw error;
  }

  return {
    messageId: toSafeString(response?.data?.id)
  };
}

export async function sendRsvpTicketEmail(guestEmail, guestName, eventDetails, locale = "es") {
  const normalizedEmail = toSafeString(guestEmail).toLowerCase();
  if (!normalizedEmail) {
    const error = new Error("guestEmail es obligatorio.");
    error.code = "EMAIL_BAD_REQUEST";
    throw error;
  }

  const normalizedEventDetails = eventDetails && typeof eventDetails === "object" ? eventDetails : {};
  const copy = getRsvpTicketCopy(locale || normalizedEventDetails?.locale);
  const eventName = toSafeString(normalizedEventDetails?.eventName) || "Tu evento";
  const detailsUrl = toSafeString(normalizedEventDetails?.detailsUrl) || DEFAULT_TICKET_DETAILS_URL;
  const normalizedEventDetailsWithLocale = {
    ...normalizedEventDetails,
    locale: copy.intlLocale
  };
  const calendarUrl = buildGoogleCalendarUrl({
    ...normalizedEventDetailsWithLocale,
    eventName
  });

  const resend = getResendClient();
  const fromEmail = toSafeString(process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL);
  const response = await resend.emails.send({
    from: fromEmail,
    to: normalizedEmail,
    subject: copy.subject(eventName),
    html: buildRsvpTicketHtml({
      guestName: toSafeString(guestName) || "Invitado",
      eventDetails: {
        ...normalizedEventDetailsWithLocale,
        eventName
      },
      calendarUrl,
      detailsUrl,
      copy
    }),
    text: [
      copy.textGreeting(toSafeString(guestName) || "Invitado"),
      copy.textConfirmed(eventName),
      `${copy.textDate}: ${formatEventDateRange(normalizedEventDetailsWithLocale)}`,
      `${copy.textLocation}: ${toSafeString(normalizedEventDetailsWithLocale?.locationName || normalizedEventDetailsWithLocale?.locationAddress) || copy.locationPendingName}`,
      `Google Calendar: ${calendarUrl}`
    ].join("\n")
  });

  if (response?.error) {
    const error = new Error(toSafeString(response.error.message) || "Resend no pudo enviar el ticket RSVP.");
    error.code = "EMAIL_SEND_ERROR";
    error.details = response.error;
    throw error;
  }

  return {
    messageId: toSafeString(response?.data?.id),
    calendarUrl
  };
}
