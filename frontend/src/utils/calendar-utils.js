const DEFAULT_EVENT_DURATION_HOURS = 3;

function toValidDate(value) {
  if (!value) {
    return null;
  }
  const candidate = value instanceof Date ? value : new Date(value);
  if (!(candidate instanceof Date) || Number.isNaN(candidate.getTime())) {
    return null;
  }
  return candidate;
}

function addHours(dateValue, hours) {
  const baseDate = toValidDate(dateValue);
  if (!baseDate) {
    return null;
  }
  const safeHours = Number(hours);
  const durationHours = Number.isFinite(safeHours) && safeHours > 0 ? safeHours : DEFAULT_EVENT_DURATION_HOURS;
  return new Date(baseDate.getTime() + durationHours * 60 * 60 * 1000);
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function resolveLocationText(eventItem) {
  if (!eventItem || typeof eventItem !== "object") {
    return "";
  }

  const rawLocation = eventItem.location;
  if (rawLocation && typeof rawLocation === "object") {
    const locationFromObject = [
      rawLocation.address,
      rawLocation.formatted_address,
      rawLocation.display_name,
      rawLocation.label,
      rawLocation.name,
      rawLocation.description
    ]
      .map(normalizeText)
      .find(Boolean);
    if (locationFromObject) {
      return locationFromObject;
    }
  }

  return [
    eventItem.location_address,
    eventItem.location_name,
    eventItem.location_label,
    eventItem.place_name
  ]
    .map(normalizeText)
    .find(Boolean) || "";
}

function resolveDateRange(eventItem, options = {}) {
  const startDate = toValidDate(eventItem?.start_at || eventItem?.startAt || eventItem?.start);
  if (!startDate) {
    return null;
  }

  const explicitEndDate = toValidDate(eventItem?.end_at || eventItem?.endAt || eventItem?.end);
  const fallbackDurationHours = options.fallbackDurationHours || DEFAULT_EVENT_DURATION_HOURS;
  const fallbackEndDate = addHours(startDate, fallbackDurationHours);

  let endDate = explicitEndDate;
  if (!endDate || endDate <= startDate) {
    endDate = fallbackEndDate;
  }

  if (!endDate) {
    return null;
  }

  return { startDate, endDate };
}

function toUtcCalendarStamp(dateValue) {
  const date = toValidDate(dateValue);
  if (!date) {
    return "";
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function slugifyFileName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCalendarPayload(eventItem, options = {}) {
  if (!eventItem || typeof eventItem !== "object") {
    return null;
  }

  const dateRange = resolveDateRange(eventItem, options);
  if (!dateRange) {
    return null;
  }

  const title = normalizeText(eventItem.title) || "LeGoodAnfitrión";
  const location = resolveLocationText(eventItem);
  const descriptionParts = [normalizeText(eventItem.description || eventItem.notes)];
  const sourceUrl = normalizeText(options.sourceUrl || options.rsvpUrl);
  if (sourceUrl) {
    descriptionParts.push(`RSVP: ${sourceUrl}`);
  }

  return {
    title,
    location,
    description: descriptionParts.filter(Boolean).join("\n\n"),
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    uid: `${normalizeText(eventItem.id) || Date.now()}@legoodanfitrion.com`
  };
}

export function createGoogleCalendarUrl(eventItem, options = {}) {
  const payload = buildCalendarPayload(eventItem, options);
  if (!payload) {
    return "";
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: payload.title,
    dates: `${toUtcCalendarStamp(payload.startDate)}/${toUtcCalendarStamp(payload.endDate)}`,
    details: payload.description,
    location: payload.location
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function createYahooCalendarUrl(eventItem, options = {}) {
  const payload = buildCalendarPayload(eventItem, options);
  if (!payload) {
    return "";
  }

  const params = new URLSearchParams({
    v: "60",
    title: payload.title,
    st: toUtcCalendarStamp(payload.startDate),
    et: toUtcCalendarStamp(payload.endDate),
    desc: payload.description,
    in_loc: payload.location
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

export function buildEventIcsContent(eventItem, options = {}) {
  const payload = buildCalendarPayload(eventItem, options);
  if (!payload) {
    return "";
  }

  const dtStamp = toUtcCalendarStamp(new Date());
  const dtStart = toUtcCalendarStamp(payload.startDate);
  const dtEnd = toUtcCalendarStamp(payload.endDate);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LeGoodAnfitrión//Calendar Export//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(payload.uid)}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(payload.title)}`,
    payload.description ? `DESCRIPTION:${escapeIcsText(payload.description)}` : "",
    payload.location ? `LOCATION:${escapeIcsText(payload.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR"
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadEventAsIcs(eventItem, options = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const icsContent = buildEventIcsContent(eventItem, options);
  if (!icsContent) {
    return false;
  }

  const payload = buildCalendarPayload(eventItem, options);
  const fileName = `${slugifyFileName(payload?.title || "evento") || "evento"}-legoodanfitrion.ics`;
  const fileBlob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const fileUrl = window.URL.createObjectURL(fileBlob);
  const linkElement = document.createElement("a");
  linkElement.href = fileUrl;
  linkElement.download = fileName;
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
  window.URL.revokeObjectURL(fileUrl);
  return true;
}

