// src/lib/formatters.js

export function toNullable(value) {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
}

export function toIsoDateTime(localDateTime) {
    if (!localDateTime) return null;
    const date = new Date(localDateTime);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toLocalDateTimeInput(dateText) {
    if (!dateText) return "";
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) return "";
    const timezoneOffsetMinutes = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - timezoneOffsetMinutes * 60000);
    return localDate.toISOString().slice(0, 16);
}

export function getSuggestedEventDateTime(defaultHour = 19) {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(defaultHour, 0, 0, 0);
    return toLocalDateTimeInput(date.toISOString());
}

export function formatDate(dateText, language, fallbackText) {
    if (!dateText) return fallbackText;
    try { return new Date(dateText).toLocaleString(language); }
    catch { return new Date(dateText).toLocaleString(); }
}

export function formatShortDate(dateText, language, fallbackText) {
    if (!dateText) return fallbackText;
    try { return new Date(dateText).toLocaleDateString(language, { day: "2-digit", month: "2-digit" }); }
    catch { return new Date(dateText).toLocaleDateString(); }
}

export function formatLongDate(dateText, language, fallbackText) {
    if (!dateText) return fallbackText;
    try { return new Date(dateText).toLocaleDateString(language, { day: "2-digit", month: "long", year: "numeric" }); }
    catch { return new Date(dateText).toLocaleDateString(); }
}

export function formatTimeLabel(dateText, language, fallbackText) {
    if (!dateText) return fallbackText;
    try { return new Date(dateText).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }); }
    catch { return new Date(dateText).toLocaleTimeString(); }
}

export function formatEventDateDisplay({
    startAt,
    endAt,
    language,
    t,
    interpolate = interpolateText,
    fallbackText
}) {
    const noDateLabel = fallbackText || (typeof t === "function" ? t("no_date") : "-");
    if (!startAt) {
        return {
            dateLabel: noDateLabel,
            timeLabel: "",
            fullLabel: noDateLabel
        };
    }

    const startDateObj = new Date(startAt);
    if (Number.isNaN(startDateObj.getTime())) {
        return {
            dateLabel: noDateLabel,
            timeLabel: "",
            fullLabel: noDateLabel
        };
    }

    const startDateLabel = formatLongDate(startAt, language, noDateLabel);
    const startTimeLabel = formatTimeLabel(startAt, language, "");

    const resolveTemplate = (key, fallback) => {
        const translated = typeof t === "function" ? t(key) : "";
        return translated && translated !== key ? translated : fallback;
    };

    const endDateObj = endAt ? new Date(endAt) : null;
    const hasValidEnd = Boolean(
        endDateObj &&
        Number.isFinite(endDateObj.getTime()) &&
        endDateObj.getTime() > startDateObj.getTime()
    );

    if (!hasValidEnd) {
        const fullLabel = startTimeLabel ? `${startDateLabel}, ${startTimeLabel}` : startDateLabel;
        return {
            dateLabel: startDateLabel,
            timeLabel: startTimeLabel,
            fullLabel
        };
    }

    const endDateLabel = formatLongDate(endAt, language, noDateLabel);
    const endTimeLabel = formatTimeLabel(endAt, language, "");
    const isSameDay = startDateObj.toDateString() === endDateObj.toDateString();

    if (isSameDay) {
        const timeLabel = interpolate(
            resolveTemplate("event_date_range_same_day_time_template", "de {startTime} a {endTime}"),
            { startTime: startTimeLabel, endTime: endTimeLabel }
        );
        const fullLabel = interpolate(
            resolveTemplate("event_date_range_same_day_template", "{date}, de {startTime} a {endTime}"),
            {
                date: startDateLabel,
                startTime: startTimeLabel,
                endTime: endTimeLabel
            }
        );
        return {
            dateLabel: startDateLabel,
            timeLabel,
            fullLabel
        };
    }

    const dateLabel = interpolate(
        resolveTemplate("event_date_range_days_template", "Del {startDate} al {endDate}"),
        { startDate: startDateLabel, endDate: endDateLabel }
    );
    const fullLabel = interpolate(
        resolveTemplate(
            "event_date_range_multi_day_full_template",
            "{startDate}, {startTime} — {endDate}, {endTime}"
        ),
        {
            startDate: startDateLabel,
            startTime: startTimeLabel,
            endDate: endDateLabel,
            endTime: endTimeLabel
        }
    );

    return {
        dateLabel: fullLabel || dateLabel,
        timeLabel: "",
        fullLabel: fullLabel || dateLabel
    };
}

export function formatRelativeDate(dateText, language, fallbackText) {
    if (!dateText) return fallbackText;
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) return fallbackText;
    const diffMs = date.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);
    if (Math.abs(diffMinutes) < 1) return fallbackText;
    const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
    if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
    const diffDays = Math.round(diffHours / 24);
    return rtf.format(diffDays, "day");
}

export function normalizeIsoDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const parsed = new Date(`${raw}T00:00:00`);
        return Number.isNaN(parsed.getTime()) ? "" : raw;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export function getNextBirthdaySummary(dateText, language) {
    const normalized = normalizeIsoDate(dateText);
    if (!normalized) return null;
    const [year, month, day] = normalized.split("-").map(Number);
    if (!year || !month || !day) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let nextBirthday = new Date(today.getFullYear(), month - 1, day);
    if (nextBirthday < today) {
        nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
    }
    const diffDays = Math.max(0, Math.round((nextBirthday.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)));
    return {
        dateLabel: nextBirthday.toLocaleDateString(language, { day: "2-digit", month: "long", year: "numeric" }),
        diffDays
    };
}

export function getBirthdayEventDateTime(dateText, defaultHour = 20) {
    const normalized = normalizeIsoDate(dateText);
    if (!normalized) return "";
    const [year, month, day] = normalized.split("-").map(Number);
    if (!year || !month || !day) return "";
    const now = new Date();
    let nextBirthday = new Date(now.getFullYear(), month - 1, day, defaultHour, 0, 0, 0);
    if (nextBirthday.getTime() < now.getTime()) {
        nextBirthday = new Date(now.getFullYear() + 1, month - 1, day, defaultHour, 0, 0, 0);
    }
    return toLocalDateTimeInput(nextBirthday.toISOString());
}

export function interpolateText(template, values = {}) {
    let output = String(template || "");
    for (const [key, value] of Object.entries(values)) {
        output = output.replaceAll(`{${key}}`, String(value ?? ""));
    }
    return output;
}

export function normalizeLookupValue(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

export function getInitials(value, fallback = "LG") {
    const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return fallback;
    return parts.slice(0, 2).map((item) => item[0]?.toUpperCase() || "").join("");
}

export function uniqueValues(values) {
    return Array.from(new Set(values.map((v) => String(v || "").trim()).filter(Boolean)));
}

export function toList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
    return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

export function splitListInput(value) {
    return uniqueValues(String(value || "").split(","));
}

export function listToInput(value) {
    return toNullable(Array.isArray(value) ? value.join(", ") : String(value || "")) || "";
}

export function isBlankValue(value) {
    if (value == null) return true;
    if (typeof value === "string") return value.trim() === "";
    return false;
}
