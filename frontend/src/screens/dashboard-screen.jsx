import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { FieldMeta } from "../components/field-meta";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";
import {
  getCatalogLabels,
  toCatalogCode,
  toCatalogCodes,
  toCatalogLabel,
  toCatalogLabels
} from "../lib/guest-catalogs";
import { buildAppUrl } from "../lib/app-url";
import { buildHostingSuggestions } from "../lib/hosting-suggestions";
import { parseContactsFromCsv, parseContactsFromText, parseContactsFromVcf } from "../lib/contact-import";
import { importContactsFromGoogle, isGoogleContactsConfigured } from "../lib/google-contacts";
import { isGoogleMapsConfigured, loadGoogleMapsPlaces } from "../lib/google-maps";
import { supabase } from "../lib/supabaseClient";
import { validateEventForm, validateGuestForm, validateInvitationForm } from "../lib/validation";

function toNullable(value) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toIsoDateTime(localDateTime) {
  if (!localDateTime) {
    return null;
  }
  const date = new Date(localDateTime);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toLocalDateTimeInput(dateText) {
  if (!dateText) {
    return "";
  }
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const timezoneOffsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffsetMinutes * 60000);
  return localDate.toISOString().slice(0, 16);
}

function getSuggestedEventDateTime(defaultHour = 19) {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(defaultHour, 0, 0, 0);
  return toLocalDateTimeInput(date.toISOString());
}

function formatDate(dateText, language, fallbackText) {
  if (!dateText) {
    return fallbackText;
  }
  try {
    return new Date(dateText).toLocaleString(language);
  } catch {
    return new Date(dateText).toLocaleString();
  }
}

function formatShortDate(dateText, language, fallbackText) {
  if (!dateText) {
    return fallbackText;
  }
  try {
    return new Date(dateText).toLocaleDateString(language, { day: "2-digit", month: "2-digit" });
  } catch {
    return new Date(dateText).toLocaleDateString();
  }
}

function formatRelativeDate(dateText, language, fallbackText) {
  if (!dateText) {
    return fallbackText;
  }
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return fallbackText;
  }
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 1) {
    return fallbackText;
  }
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}

function normalizeIsoDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? "" : raw;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

function getNextBirthdaySummary(dateText, language) {
  const normalized = normalizeIsoDate(dateText);
  if (!normalized) {
    return null;
  }
  const [year, month, day] = normalized.split("-").map((item) => Number(item));
  if (!year || !month || !day) {
    return null;
  }
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

function getBirthdayEventDateTime(dateText, defaultHour = 20) {
  const normalized = normalizeIsoDate(dateText);
  if (!normalized) {
    return "";
  }
  const [year, month, day] = normalized.split("-").map((item) => Number(item));
  if (!year || !month || !day) {
    return "";
  }
  const now = new Date();
  let nextBirthday = new Date(now.getFullYear(), month - 1, day, defaultHour, 0, 0, 0);
  if (nextBirthday.getTime() < now.getTime()) {
    nextBirthday = new Date(now.getFullYear() + 1, month - 1, day, defaultHour, 0, 0, 0);
  }
  return toLocalDateTimeInput(nextBirthday.toISOString());
}

function interpolateText(template, values = {}) {
  let output = String(template || "");
  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{${key}}`, String(value ?? ""));
  }
  return output;
}

function statusText(t, status) {
  return t(`status_${String(status || "").toLowerCase()}`);
}

function statusClass(status) {
  return `status-${String(status || "").toLowerCase()}`;
}

function getConversionSource(conversion) {
  if (!conversion) {
    return "";
  }
  const normalizedSource = String(conversion.conversion_source || "")
    .trim()
    .toLowerCase();
  if (normalizedSource === "google" || normalizedSource === "email" || normalizedSource === "phone") {
    return normalizedSource;
  }
  return conversion.matched_by === "phone" ? "phone" : "email";
}

function getConversionSourceLabel(t, source) {
  if (source === "google") {
    return t("host_conversion_source_google");
  }
  if (source === "phone") {
    return t("host_conversion_source_phone");
  }
  return t("host_conversion_source_email");
}

function getConversionMatchLabel(t, conversion) {
  const source = getConversionSource(conversion);
  if (source === "google") {
    return t("host_converted_match_google");
  }
  return conversion?.matched_by === "phone" ? t("host_converted_match_phone") : t("host_converted_match_email");
}

function getMapEmbedUrl(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return "";
  }
  return `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
}

const VIEW_CONFIG = [
  { key: "overview", icon: "sparkle", labelKey: "nav_overview" },
  { key: "events", icon: "calendar", labelKey: "nav_events" },
  { key: "guests", icon: "user", labelKey: "nav_guests" },
  { key: "invitations", icon: "mail", labelKey: "nav_invitations" }
];
const EVENTS_PAGE_SIZE = 5;
const GUESTS_PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 20];
const IMPORT_PREVIEW_PAGE_SIZE_DEFAULT = 20;
const IMPORT_PREVIEW_PAGE_SIZE_OPTIONS = [10, 20, 50];
const INVITATIONS_PAGE_SIZE = 8;
const DASHBOARD_PREFS_KEY_PREFIX = "legood-dashboard-prefs";
const EVENT_SETTINGS_STORAGE_KEY_PREFIX = "legood-event-settings";
const GUEST_GEO_CACHE_KEY_PREFIX = "legood-guest-geocode";
const EVENT_DRESS_CODE_OPTIONS = ["none", "casual", "elegant", "formal", "themed"];
const EVENT_PLAYLIST_OPTIONS = ["host_only", "collaborative", "spotify_collaborative"];
const CITY_OPTIONS_BY_LANGUAGE = {
  es: ["Barcelona", "Madrid", "Valencia", "Sevilla", "Bilbao", "Lisboa", "París"],
  ca: ["Barcelona", "Madrid", "Valencia", "Sevilla", "Bilbao", "Lisboa", "París"],
  en: ["Barcelona", "Madrid", "Valencia", "Seville", "Bilbao", "Lisbon", "Paris"],
  fr: ["Barcelone", "Madrid", "Valence", "Seville", "Bilbao", "Lisbonne", "Paris"],
  it: ["Barcellona", "Madrid", "Valencia", "Siviglia", "Bilbao", "Lisbona", "Parigi"]
};
const COUNTRY_OPTIONS_BY_LANGUAGE = {
  es: ["España", "Andorra", "Francia", "Portugal", "Italia", "Reino Unido"],
  ca: ["Espanya", "Andorra", "França", "Portugal", "Itàlia", "Regne Unit"],
  en: ["Spain", "Andorra", "France", "Portugal", "Italy", "United Kingdom"],
  fr: ["Espagne", "Andorre", "France", "Portugal", "Italie", "Royaume-Uni"],
  it: ["Spagna", "Andorra", "Francia", "Portogallo", "Italia", "Regno Unito"]
};
const WORKSPACE_ITEMS = {
  events: [
    { key: "hub", icon: "sparkle", labelKey: "workspace_folders" },
    { key: "create", icon: "calendar", labelKey: "create_event_title", descriptionKey: "help_event_form" },
    { key: "latest", icon: "calendar", labelKey: "latest_events_title", descriptionKey: "workspace_events_latest_desc" },
    { key: "detail", icon: "eye", labelKey: "event_detail_title", descriptionKey: "workspace_events_detail_desc" },
    { key: "insights", icon: "sparkle", labelKey: "smart_hosting_title", descriptionKey: "smart_hosting_hint" }
  ],
  guests: [
    { key: "hub", icon: "sparkle", labelKey: "workspace_folders" },
    { key: "create", icon: "user", labelKey: "create_guest_title", descriptionKey: "help_guest_form" },
    { key: "latest", icon: "user", labelKey: "latest_guests_title", descriptionKey: "workspace_guests_latest_desc" },
    { key: "detail", icon: "eye", labelKey: "guest_detail_title", descriptionKey: "workspace_guests_detail_desc" }
  ],
  invitations: [
    { key: "hub", icon: "sparkle", labelKey: "workspace_folders" },
    { key: "create", icon: "mail", labelKey: "create_invitation_title", descriptionKey: "help_invitation_form" },
    { key: "latest", icon: "mail", labelKey: "latest_invitations_title", descriptionKey: "workspace_invitations_latest_desc" }
  ]
};

const EVENT_TEMPLATE_DEFINITIONS = [
  { key: "bbq", titleKey: "event_template_title_bbq", typeCode: "bbq", defaultHour: 14 },
  { key: "anniversary", titleKey: "event_template_title_anniversary", typeCode: "celebration", defaultHour: 20 },
  { key: "book_club", titleKey: "event_template_title_book_club", typeCode: "book_club", defaultHour: 19 },
  { key: "date_night", titleKey: "event_template_title_date_night", typeCode: "romantic_date", defaultHour: 21 }
];
function getWorkspaceItemsByView(viewKey, includeHub = true) {
  const workspaceItems = WORKSPACE_ITEMS[viewKey] || [];
  return includeHub ? workspaceItems : workspaceItems.filter((item) => item.key !== "hub");
}

const GUEST_ADVANCED_INITIAL_STATE = {
  address: "",
  postalCode: "",
  stateRegion: "",
  company: "",
  birthday: "",
  twitter: "",
  instagram: "",
  linkedIn: "",
  lastMeetAt: "",
  experienceTypes: "",
  preferredGuestRelationships: "",
  preferredDayMoments: "",
  periodicity: "",
  cuisineTypes: "",
  dietType: "",
  tastingPreferences: "",
  foodLikes: "",
  foodDislikes: "",
  drinkLikes: "",
  drinkDislikes: "",
  allergies: "",
  intolerances: "",
  petAllergies: "",
  pets: "",
  musicGenres: "",
  favoriteColor: "",
  books: "",
  movies: "",
  series: "",
  sports: "",
  teamFan: "",
  punctuality: "",
  lastTalkTopic: "",
  tabooTopics: "",
  sensitiveConsent: false
};

function normalizeEventDressCode(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return EVENT_DRESS_CODE_OPTIONS.includes(normalized) ? normalized : "none";
}

function normalizeEventPlaylistMode(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return EVENT_PLAYLIST_OPTIONS.includes(normalized) ? normalized : "host_only";
}

function normalizeEventSettings(input = {}) {
  return {
    description: String(input?.description || "").trim(),
    allow_plus_one: Boolean(input?.allow_plus_one ?? input?.allowPlusOne),
    auto_reminders: Boolean(input?.auto_reminders ?? input?.autoReminders),
    dress_code: normalizeEventDressCode(input?.dress_code ?? input?.dressCode),
    playlist_mode: normalizeEventPlaylistMode(input?.playlist_mode ?? input?.playlistMode)
  };
}

function hasEventSettingsColumns(row) {
  if (!row || typeof row !== "object") {
    return false;
  }
  return ["description", "allow_plus_one", "auto_reminders", "dress_code", "playlist_mode"].some((key) =>
    Object.prototype.hasOwnProperty.call(row, key)
  );
}

function readEventSettingsCache(userId) {
  if (typeof window === "undefined" || !userId) {
    return {};
  }
  const key = `${EVENT_SETTINGS_STORAGE_KEY_PREFIX}:${userId}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeEventSettingsCache(userId, nextCache) {
  if (typeof window === "undefined" || !userId) {
    return;
  }
  const key = `${EVENT_SETTINGS_STORAGE_KEY_PREFIX}:${userId}`;
  try {
    window.localStorage.setItem(key, JSON.stringify(nextCache || {}));
  } catch {
    // Ignore localStorage write errors (private mode/quota).
  }
}

function readGuestGeoCache(userId) {
  if (typeof window === "undefined" || !userId) {
    return {};
  }
  const key = `${GUEST_GEO_CACHE_KEY_PREFIX}:${userId}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeGuestGeoCache(userId, nextCache) {
  if (typeof window === "undefined" || !userId) {
    return;
  }
  const key = `${GUEST_GEO_CACHE_KEY_PREFIX}:${userId}`;
  try {
    window.localStorage.setItem(key, JSON.stringify(nextCache || {}));
  } catch {
    // Ignore localStorage write errors.
  }
}

function normalizeLookupValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeEmailKey(value) {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") ? email : "";
}

function normalizePhoneKey(value) {
  const phone = String(value || "")
    .replace(/[^\d+]/g, "")
    .trim();
  if (!phone) {
    return "";
  }
  const normalized = phone.startsWith("+") ? `+${phone.slice(1).replace(/\D/g, "")}` : phone.replace(/\D/g, "");
  return normalized.length >= 7 ? normalized : "";
}

function isBlankValue(value) {
  if (value == null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  return false;
}

function getMergedFieldValue(existingValue, incomingValue) {
  if (!isBlankValue(existingValue) || isBlankValue(incomingValue)) {
    return undefined;
  }
  return String(incomingValue).trim();
}

function buildGuestFingerprint({ firstName, lastName, email, phone }) {
  const emailKey = normalizeEmailKey(email);
  const phoneKey = normalizePhoneKey(phone);
  if (emailKey || phoneKey) {
    return `${emailKey}|${phoneKey}`;
  }
  const firstKey = normalizeLookupValue(firstName);
  const lastKey = normalizeLookupValue(lastName);
  if (firstKey || lastKey) {
    return `name:${firstKey}|${lastKey}`;
  }
  return "";
}

function deriveGuestNameFromContact(contact) {
  const normalizedFirstName = String(contact?.firstName || "").trim();
  if (normalizedFirstName) {
    return normalizedFirstName;
  }
  const emailKey = normalizeEmailKey(contact?.email || "");
  if (emailKey) {
    return emailKey.split("@")[0];
  }
  const phoneKey = normalizePhoneKey(contact?.phone || "");
  if (phoneKey) {
    return phoneKey.slice(-6);
  }
  return "";
}

function toContactGroupsList(contact) {
  if (Array.isArray(contact?.groups)) {
    return uniqueValues(contact.groups);
  }
  const raw = String(contact?.groups || "").trim();
  if (!raw) {
    return [];
  }
  return uniqueValues(
    raw
      .split(/[|,]/g)
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  );
}

function deriveRelationshipCodeFromContact(contact) {
  const direct = toCatalogCode("relationship", contact?.relationship || "");
  if (direct) {
    return direct;
  }
  const groups = toContactGroupsList(contact);
  for (const groupItem of groups) {
    const groupCode = toCatalogCode("relationship", groupItem);
    if (groupCode) {
      return groupCode;
    }
  }
  return "";
}

function splitFullName(rawName) {
  const normalized = String(rawName || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }
  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function normalizeDeviceContact(rawContact) {
  const fullName = Array.isArray(rawContact?.name) ? rawContact.name[0] || "" : rawContact?.name || "";
  const { firstName, lastName } = splitFullName(fullName);
  const addressRaw = Array.isArray(rawContact?.address) ? rawContact.address[0] || null : rawContact?.address || null;
  const addressObject = typeof addressRaw === "object" && addressRaw !== null ? addressRaw : null;
  const addressFromObject = addressObject
    ? [addressObject.addressLine, addressObject.streetAddress].flat().filter(Boolean).join(", ")
    : "";
  const fallbackAddress = typeof addressRaw === "string" ? addressRaw : "";
  return {
    firstName,
    lastName,
    email: Array.isArray(rawContact?.email) ? rawContact.email[0] || "" : rawContact?.email || "",
    phone: Array.isArray(rawContact?.tel) ? rawContact.tel[0] || "" : rawContact?.tel || "",
    relationship: "",
    city: String(addressObject?.city || addressObject?.locality || "").trim(),
    country: String(addressObject?.country || addressObject?.countryName || "").trim(),
    address: String(addressFromObject || fallbackAddress || "").trim(),
    company: "",
    postalCode: String(addressObject?.postalCode || "").trim(),
    stateRegion: String(addressObject?.region || addressObject?.state || "").trim(),
    groups: []
  };
}

function getInitials(value, fallback = "LG") {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return fallback;
  }
  return parts
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() || "")
    .join("");
}

function uniqueValues(values) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function toList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitListInput(value) {
  return uniqueValues(String(value || "").split(","));
}

function listToInput(value) {
  return toNullable(Array.isArray(value) ? value.join(", ") : String(value || "")) || "";
}

function translateCatalogInputList(field, rawList, language) {
  return listToInput(toCatalogLabels(field, splitListInput(rawList), language));
}

function toPetAllergyLabel(value, language) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const petLabel = toCatalogLabel("pet", raw, language);
  if (petLabel !== raw) {
    return petLabel;
  }
  return toCatalogLabel("allergy", raw, language);
}

function toPetAllergyLabels(values, language) {
  return uniqueValues((Array.isArray(values) ? values : [values]).map((value) => toPetAllergyLabel(value, language)));
}

function isCompatibilityError(error, fragments = []) {
  const message = String(error?.message || "").toLowerCase();
  if (error?.code === "42703" || error?.code === "42p01") {
    return true;
  }
  return fragments.some((fragment) => message.includes(String(fragment).toLowerCase()));
}

function isMissingRelationError(error, relationName) {
  const message = String(error?.message || "").toLowerCase();
  const relation = String(relationName || "").toLowerCase();
  return error?.code === "42p01" || (relation ? message.includes(relation) : false);
}

function isMissingDbFeatureError(error, fragments = []) {
  const message = String(error?.message || "").toLowerCase();
  if (error?.code === "42p01" || error?.code === "42703" || error?.code === "42883") {
    return true;
  }
  return fragments.some((fragment) => message.includes(String(fragment || "").toLowerCase()));
}

function toSelectedPlaceFromLocationPair(pair, formattedAddress) {
  if (!pair) {
    return null;
  }
  const lat = typeof pair.lat === "number" ? pair.lat : null;
  const lng = typeof pair.lng === "number" ? pair.lng : null;
  const placeId = pair.placeId || null;
  const normalizedAddress = String(formattedAddress || pair.address || "").trim();
  if (!placeId && lat === null && lng === null && !normalizedAddress) {
    return null;
  }
  return {
    placeId,
    formattedAddress: normalizedAddress,
    lat,
    lng
  };
}

function mergeOptionsWithSelected(options, value) {
  return uniqueValues([...(options || []), ...splitListInput(value)]);
}

function MultiSelectField({ id, label, value, options, onChange, helpText, t }) {
  const selectedValues = splitListInput(value);
  const mergedOptions = mergeOptionsWithSelected(options, value);
  const titleId = `${id}-title`;
  const [customOption, setCustomOption] = useState("");

  const toggleValue = (optionValue) => {
    const nextValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((item) => item !== optionValue)
      : [...selectedValues, optionValue];
    onChange(listToInput(nextValues));
  };
  const handleAddCustomOption = () => {
    const normalizedInput = String(customOption || "").trim();
    if (!normalizedInput) {
      return;
    }
    const existingOption = mergedOptions.find(
      (optionItem) => normalizeLookupValue(optionItem) === normalizeLookupValue(normalizedInput)
    );
    const nextOption = existingOption || normalizedInput;
    if (!selectedValues.includes(nextOption)) {
      onChange(listToInput([...selectedValues, nextOption]));
    }
    setCustomOption("");
  };

  return (
    <div className="multi-select-field">
      <p id={titleId} className="label-title">
        {label}
      </p>
      <div className="multi-chip-group" role="group" aria-labelledby={titleId}>
        {mergedOptions.map((optionValue) => (
          <button
            key={optionValue}
            type="button"
            className={`multi-chip ${selectedValues.includes(optionValue) ? "active" : ""}`}
            aria-pressed={selectedValues.includes(optionValue)}
            onClick={() => toggleValue(optionValue)}
          >
            {optionValue}
          </button>
        ))}
      </div>
      <div className="multi-chip-add">
        <input
          type="text"
          value={customOption}
          onChange={(event) => setCustomOption(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAddCustomOption();
            }
          }}
          placeholder={t("multi_select_add_placeholder")}
          aria-label={t("multi_select_add_placeholder")}
        />
        <button className="btn btn-ghost btn-sm" type="button" onClick={handleAddCustomOption}>
          {t("multi_select_add_button")}
        </button>
      </div>
      <FieldMeta helpText={helpText} />
    </div>
  );
}

function GeoPointsMapPanel({ mapsStatus, mapsError, points, title, hint, emptyText, t, onOpenDetail, openActionText }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    if (mapsStatus !== "ready" || !mapContainerRef.current || !Array.isArray(points) || points.length === 0) {
      return;
    }
    if (!window.google?.maps) {
      return;
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: points[0].lat, lng: points[0].lng },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((pointItem) => {
      const marker = new window.google.maps.Marker({
        map: mapInstanceRef.current,
        position: { lat: pointItem.lat, lng: pointItem.lng },
        title: pointItem.label
      });
      marker.addListener("click", () => {
        if (infoWindowRef.current) {
          const contentNode = document.createElement("div");
          const titleNode = document.createElement("strong");
          titleNode.textContent = pointItem.label;
          contentNode.appendChild(titleNode);
          if (pointItem.meta) {
            const metaNode = document.createElement("p");
            metaNode.textContent = pointItem.meta;
            metaNode.style.margin = "0.2rem 0 0";
            contentNode.appendChild(metaNode);
          }
          infoWindowRef.current.setContent(contentNode);
          infoWindowRef.current.open({
            anchor: marker,
            map: mapInstanceRef.current
          });
        }
        onOpenDetail?.(pointItem.id);
      });
      markersRef.current.push(marker);
      bounds.extend(marker.getPosition());
    });

    if (points.length === 1) {
      mapInstanceRef.current.setCenter({ lat: points[0].lat, lng: points[0].lng });
      mapInstanceRef.current.setZoom(14);
    } else {
      mapInstanceRef.current.fitBounds(bounds, 58);
    }
  }, [mapsStatus, points, onOpenDetail]);

  return (
    <article className="panel geo-map-panel">
      <h3 className="section-title">
        <Icon name="location" className="icon" />
        {title}
      </h3>
      <p className="field-help">{hint}</p>
      {mapsStatus === "loading" ? <p className="hint">{t("address_google_loading")}</p> : null}
      {mapsStatus === "unconfigured" ? <p className="hint">{t("address_google_unconfigured")}</p> : null}
      {mapsStatus === "error" ? <p className="hint">{`${t("address_google_error")} ${mapsError || ""}`}</p> : null}
      {mapsStatus === "ready" && points.length === 0 ? <p className="hint">{emptyText}</p> : null}
      {mapsStatus === "ready" && points.length > 0 ? (
        <>
          <div ref={mapContainerRef} className="geo-map-canvas" role="img" aria-label={title} />
          <ul className="geo-map-list">
            {points.slice(0, 8).map((pointItem) => (
              <li key={pointItem.id}>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => onOpenDetail?.(pointItem.id)}>
                  <Icon name="eye" className="icon icon-sm" />
                  {openActionText} · {pointItem.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </article>
  );
}

function DashboardScreen({
  t,
  language,
  setLanguage,
  themeMode,
  setThemeMode,
  session,
  onSignOut,
  onPreferencesSynced
}) {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid", []);
  const [activeView, setActiveView] = useState("overview");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mobileExpandedView, setMobileExpandedView] = useState("overview");
  const [mobileMenuDepth, setMobileMenuDepth] = useState("root");
  const [eventsWorkspace, setEventsWorkspace] = useState("latest");
  const [guestsWorkspace, setGuestsWorkspace] = useState("latest");
  const [invitationsWorkspace, setInvitationsWorkspace] = useState("latest");
  const [selectedEventDetailId, setSelectedEventDetailId] = useState("");
  const [selectedGuestDetailId, setSelectedGuestDetailId] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventStatus, setEventStatus] = useState("draft");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventLocationName, setEventLocationName] = useState("");
  const [eventLocationAddress, setEventLocationAddress] = useState("");
  const [eventAllowPlusOne, setEventAllowPlusOne] = useState(false);
  const [eventAutoReminders, setEventAutoReminders] = useState(false);
  const [eventDressCode, setEventDressCode] = useState("none");
  const [eventPlaylistMode, setEventPlaylistMode] = useState("host_only");
  const [mapsStatus, setMapsStatus] = useState(isGoogleMapsConfigured() ? "loading" : "unconfigured");
  const [mapsError, setMapsError] = useState("");
  const [addressPredictions, setAddressPredictions] = useState([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [guestAddressPredictions, setGuestAddressPredictions] = useState([]);
  const [isGuestAddressLoading, setIsGuestAddressLoading] = useState(false);
  const [selectedGuestAddressPlace, setSelectedGuestAddressPlace] = useState(null);
  const [eventMessage, setEventMessage] = useState("");
  const [eventErrors, setEventErrors] = useState({});
  const [editingEventId, setEditingEventId] = useState("");
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const autocompleteServiceRef = useRef(null);
  const geocoderRef = useRef(null);
  const guestGeocodePendingRef = useRef(new Set());
  const contactImportDetailsRef = useRef(null);
  const contactImportFileInputRef = useRef(null);
  const notificationMenuRef = useRef(null);

  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestRelationship, setGuestRelationship] = useState("");
  const [guestCity, setGuestCity] = useState("");
  const [guestCountry, setGuestCountry] = useState("");
  const [guestAdvanced, setGuestAdvanced] = useState(GUEST_ADVANCED_INITIAL_STATE);
  const [guestMessage, setGuestMessage] = useState("");
  const [guestErrors, setGuestErrors] = useState({});
  const [editingGuestId, setEditingGuestId] = useState("");
  const [isSavingGuest, setIsSavingGuest] = useState(false);
  const [importContactsDraft, setImportContactsDraft] = useState("");
  const [importContactsPreview, setImportContactsPreview] = useState([]);
  const [importContactsSearch, setImportContactsSearch] = useState("");
  const [importContactsGroupFilter, setImportContactsGroupFilter] = useState("all");
  const [importDuplicateMode, setImportDuplicateMode] = useState("skip");
  const [selectedImportContactIds, setSelectedImportContactIds] = useState([]);
  const [importContactsPage, setImportContactsPage] = useState(1);
  const [importContactsPageSize, setImportContactsPageSize] = useState(IMPORT_PREVIEW_PAGE_SIZE_DEFAULT);
  const [importContactsMessage, setImportContactsMessage] = useState("");
  const [isImportingContacts, setIsImportingContacts] = useState(false);
  const [isImportingGoogleContacts, setIsImportingGoogleContacts] = useState(false);
  const [hostProfileName, setHostProfileName] = useState("");
  const [hostProfilePhone, setHostProfilePhone] = useState("");
  const [hostProfileCity, setHostProfileCity] = useState("");
  const [hostProfileCountry, setHostProfileCountry] = useState("");
  const [hostProfileRelationship, setHostProfileRelationship] = useState("");
  const [hostProfileMessage, setHostProfileMessage] = useState("");
  const [isSavingHostProfile, setIsSavingHostProfile] = useState(false);
  const [hostProfileCreatedAt, setHostProfileCreatedAt] = useState("");
  const [globalProfileId, setGlobalProfileId] = useState("");
  const [globalProfileMessage, setGlobalProfileMessage] = useState("");
  const [isGlobalProfileFeatureReady, setIsGlobalProfileFeatureReady] = useState(true);
  const [isClaimingGlobalProfile, setIsClaimingGlobalProfile] = useState(false);
  const [isLinkingGlobalGuest, setIsLinkingGlobalGuest] = useState(false);
  const [isLinkingAllGlobalGuests, setIsLinkingAllGlobalGuests] = useState(false);
  const [globalShareTargets, setGlobalShareTargets] = useState([]);
  const [globalShareDraftByHostId, setGlobalShareDraftByHostId] = useState({});
  const [savingGlobalShareHostId, setSavingGlobalShareHostId] = useState("");
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [, setEventSettingsCacheById] = useState({});

  const [dashboardError, setDashboardError] = useState("");
  const [events, setEvents] = useState([]);
  const [guests, setGuests] = useState([]);
  const [guestPreferencesById, setGuestPreferencesById] = useState({});
  const [guestSensitiveById, setGuestSensitiveById] = useState({});
  const [guestHostConversionById, setGuestHostConversionById] = useState({});
  const [invitations, setInvitations] = useState([]);
  const [isDeletingEventId, setIsDeletingEventId] = useState("");
  const [isDeletingGuestId, setIsDeletingGuestId] = useState("");
  const [isDeletingInvitationId, setIsDeletingInvitationId] = useState("");

  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [invitationErrors, setInvitationErrors] = useState({});
  const [isCreatingInvitation, setIsCreatingInvitation] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [lastInvitationUrl, setLastInvitationUrl] = useState("");
  const [lastInvitationShareText, setLastInvitationShareText] = useState("");
  const [lastInvitationShareSubject, setLastInvitationShareSubject] = useState("");
  const [bulkInvitationGuestIds, setBulkInvitationGuestIds] = useState([]);
  const [bulkInvitationSearch, setBulkInvitationSearch] = useState("");
  const [isCreatingBulkInvitations, setIsCreatingBulkInvitations] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");
  const [eventSort, setEventSort] = useState("created_desc");
  const [eventPage, setEventPage] = useState(1);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestContactFilter, setGuestContactFilter] = useState("all");
  const [guestSort, setGuestSort] = useState("created_desc");
  const [guestPage, setGuestPage] = useState(1);
  const [invitationSearch, setInvitationSearch] = useState("");
  const [invitationStatusFilter, setInvitationStatusFilter] = useState("all");
  const [invitationSort, setInvitationSort] = useState("created_desc");
  const [invitationPage, setInvitationPage] = useState(1);
  const [showInvitationBulkActions, setShowInvitationBulkActions] = useState(false);
  const [guestPageSize, setGuestPageSize] = useState(GUESTS_PAGE_SIZE_DEFAULT);
  const [eventsMapFocusId, setEventsMapFocusId] = useState("");
  const [guestsMapFocusId, setGuestsMapFocusId] = useState("");
  const [guestGeocodeById, setGuestGeocodeById] = useState({});
  const [selectedLatestInvitationIds, setSelectedLatestInvitationIds] = useState([]);
  const [isDeletingInvitationBulk, setIsDeletingInvitationBulk] = useState(false);
  const [insightsEventId, setInsightsEventId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [prefsReady, setPrefsReady] = useState(false);

  const pendingInvites = invitations.filter((item) => item.status === "pending").length;
  const respondedInvites = invitations.filter((item) => item.status !== "pending").length;
  const respondedInvitesRate = invitations.length > 0 ? Math.round((respondedInvites / invitations.length) * 100) : 0;
  const isEditingEvent = Boolean(editingEventId);
  const isEditingGuest = Boolean(editingGuestId);
  const isDeleteConfirmLoading =
    deleteTarget?.type === "event"
      ? isDeletingEventId === deleteTarget.item?.id
      : deleteTarget?.type === "guest"
      ? isDeletingGuestId === deleteTarget.item?.id
      : deleteTarget?.type === "invitation"
      ? isDeletingInvitationId === deleteTarget.item?.id
      : deleteTarget?.type === "invitation_bulk"
      ? isDeletingInvitationBulk
      : false;
  const getWorkspaceForView = useCallback(
    (viewKey) =>
      viewKey === "events"
        ? eventsWorkspace
        : viewKey === "guests"
        ? guestsWorkspace
        : viewKey === "invitations"
        ? invitationsWorkspace
        : "latest",
    [eventsWorkspace, guestsWorkspace, invitationsWorkspace]
  );
  const mobileMenuItems = useMemo(
    () =>
      VIEW_CONFIG.map((item) => ({
        ...item,
        workspaceItems: []
      })),
    []
  );
  const mobilePanelItem =
    mobileMenuItems.find((item) => item.key === mobileExpandedView) ||
    mobileMenuItems.find((item) => item.key === activeView) ||
    null;
  const mobilePanelWorkspaceItems = mobilePanelItem?.workspaceItems || [];
  const mobilePanelWorkspace = mobilePanelItem ? getWorkspaceForView(mobilePanelItem.key) : "hub";
  const mobilePanelWorkspaceItem =
    mobilePanelWorkspaceItems.find((workspaceItem) => workspaceItem.key === mobilePanelWorkspace) ||
    mobilePanelWorkspaceItems[0] ||
    null;
  const eventsWorkspaceItem = WORKSPACE_ITEMS.events.find((item) => item.key === eventsWorkspace) || WORKSPACE_ITEMS.events[0];
  const guestsWorkspaceItem = WORKSPACE_ITEMS.guests.find((item) => item.key === guestsWorkspace) || WORKSPACE_ITEMS.guests[0];
  const invitationsWorkspaceItem =
    WORKSPACE_ITEMS.invitations.find((item) => item.key === invitationsWorkspace) || WORKSPACE_ITEMS.invitations[0];

  const guestNamesById = useMemo(
    () =>
      Object.fromEntries(
        guests.map((guest) => [guest.id, `${guest.first_name || ""} ${guest.last_name || ""}`.trim()])
      ),
    [guests]
  );

  const eventNamesById = useMemo(
    () => Object.fromEntries(events.map((event) => [event.id, event.title])),
    [events]
  );
  const guestsById = useMemo(() => Object.fromEntries(guests.map((guestItem) => [guestItem.id, guestItem])), [guests]);
  const eventsById = useMemo(() => Object.fromEntries(events.map((eventItem) => [eventItem.id, eventItem])), [events]);
  const invitationsById = useMemo(
    () => Object.fromEntries(invitations.map((invitationItem) => [invitationItem.id, invitationItem])),
    [invitations]
  );
  const eventInvitationSummaryByEventId = useMemo(() => {
    const summary = {};
    for (const invitationItem of invitations) {
      const eventId = invitationItem?.event_id;
      if (!eventId) {
        continue;
      }
      if (!summary[eventId]) {
        summary[eventId] = {
          total: 0,
          pending: 0,
          yes: 0,
          no: 0,
          maybe: 0,
          responded: 0,
          respondedRate: 0
        };
      }
      const normalizedStatus = String(invitationItem.status || "pending").toLowerCase();
      summary[eventId].total += 1;
      if (normalizedStatus === "yes" || normalizedStatus === "no" || normalizedStatus === "maybe") {
        summary[eventId][normalizedStatus] += 1;
      } else {
        summary[eventId].pending += 1;
      }
    }
    for (const eventId of Object.keys(summary)) {
      const item = summary[eventId];
      item.responded = Math.max(0, item.total - item.pending);
      item.respondedRate = item.total ? Math.round((item.responded / item.total) * 100) : 0;
    }
    return summary;
  }, [invitations]);
  const guestEventCountByGuestId = useMemo(() => {
    const counts = {};
    for (const invitationItem of invitations) {
      const guestId = invitationItem?.guest_id;
      if (!guestId) {
        continue;
      }
      counts[guestId] = (counts[guestId] || 0) + 1;
    }
    return counts;
  }, [invitations]);
  const existingGuestByFingerprint = useMemo(() => {
    const map = {};
    for (const guestItem of guests) {
      const fingerprint = buildGuestFingerprint({
        firstName: guestItem.first_name,
        lastName: guestItem.last_name,
        email: guestItem.email,
        phone: guestItem.phone
      });
      if (!fingerprint || map[fingerprint]) {
        continue;
      }
      map[fingerprint] = guestItem;
    }
    return map;
  }, [guests]);
  const existingGuestFingerprints = useMemo(
    () => new Set(Object.keys(existingGuestByFingerprint)),
    [existingGuestByFingerprint]
  );
  const importContactsAnalysis = useMemo(() => {
    const seenInPreview = new Set();
    return importContactsPreview.map((contactItem, index) => {
      const firstName = String(contactItem?.firstName || "").trim();
      const lastName = String(contactItem?.lastName || "").trim();
      const email = String(contactItem?.email || "").trim();
      const phone = String(contactItem?.phone || "").trim();
      const birthday = normalizeIsoDate(contactItem?.birthday);
      const groups = toContactGroupsList(contactItem);
      const fingerprint = buildGuestFingerprint({ firstName, lastName, email, phone });
      const duplicateInPreview = Boolean(fingerprint && seenInPreview.has(fingerprint));
      if (fingerprint) {
        seenInPreview.add(fingerprint);
      }
      const existingGuest = fingerprint ? existingGuestByFingerprint[fingerprint] || null : null;
      const duplicateExisting = Boolean(existingGuest);
      const willMerge = duplicateExisting && importDuplicateMode === "merge";
      const canImport = Boolean((firstName || email || phone) && !duplicateInPreview && (!duplicateExisting || willMerge));
      const previewId = fingerprint ? `fp:${fingerprint}` : `idx:${index}`;
      return {
        previewId,
        fingerprint,
        existingGuestId: existingGuest?.id || "",
        firstName,
        lastName,
        email,
        phone,
        birthday,
        groups,
        relationship: String(contactItem?.relationship || "").trim(),
        city: String(contactItem?.city || "").trim(),
        country: String(contactItem?.country || "").trim(),
        address: String(contactItem?.address || "").trim(),
        postalCode: String(contactItem?.postalCode || "").trim(),
        stateRegion: String(contactItem?.stateRegion || "").trim(),
        company: String(contactItem?.company || "").trim(),
        duplicateInPreview,
        duplicateExisting,
        willMerge,
        canImport
      };
    });
  }, [existingGuestByFingerprint, importContactsPreview, importDuplicateMode]);
  const importContactsGroupOptions = useMemo(
    () =>
      uniqueValues(
        importContactsAnalysis.flatMap((item) => (Array.isArray(item.groups) ? item.groups : []))
      ),
    [importContactsAnalysis]
  );
  const importContactsFiltered = useMemo(() => {
    const term = String(importContactsSearch || "").trim().toLowerCase();
    const groupFilter = String(importContactsGroupFilter || "all");
    return importContactsAnalysis.filter((item) => {
      const matchesGroup = groupFilter === "all" || (Array.isArray(item.groups) && item.groups.includes(groupFilter));
      if (!matchesGroup) {
        return false;
      }
      if (!term) {
        return true;
      }
      const groupsText = Array.isArray(item.groups) ? item.groups.join(" ") : "";
      const haystack = `${item.firstName} ${item.lastName} ${item.email} ${item.phone} ${item.city} ${item.country} ${groupsText}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [importContactsAnalysis, importContactsGroupFilter, importContactsSearch]);
  const importContactsFilteredReady = useMemo(
    () => importContactsFiltered.filter((item) => item.canImport),
    [importContactsFiltered]
  );
  const importContactsReady = useMemo(() => importContactsAnalysis.filter((item) => item.canImport), [importContactsAnalysis]);
  const importContactsSelectedReady = useMemo(
    () => importContactsReady.filter((item) => selectedImportContactIds.includes(item.previewId)),
    [importContactsReady, selectedImportContactIds]
  );
  const importContactsStatusSummary = useMemo(
    () =>
      importContactsAnalysis.reduce(
        (acc, item) => {
          if (item.canImport) {
            acc.ready += 1;
          }
          if (item.duplicateExisting) {
            acc.duplicateExisting += 1;
          }
          if (item.duplicateInPreview) {
            acc.duplicateInPreview += 1;
          }
          return acc;
        },
        { ready: 0, duplicateExisting: 0, duplicateInPreview: 0 }
      ),
    [importContactsAnalysis]
  );
  const importContactsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(importContactsFiltered.length / importContactsPageSize)),
    [importContactsFiltered.length, importContactsPageSize]
  );
  const pagedImportContacts = useMemo(() => {
    const safePage = Math.min(importContactsPage, importContactsTotalPages);
    const start = (safePage - 1) * importContactsPageSize;
    return importContactsFiltered.slice(start, start + importContactsPageSize);
  }, [importContactsFiltered, importContactsPage, importContactsPageSize, importContactsTotalPages]);
  useEffect(() => {
    const defaultIds = importContactsReady.map((item) => item.previewId);
    setSelectedImportContactIds(defaultIds);
  }, [importContactsReady]);
  useEffect(() => {
    setImportContactsPage(1);
  }, [importContactsSearch, importContactsGroupFilter, importDuplicateMode, importContactsPageSize, importContactsPreview.length]);
  useEffect(() => {
    if (importContactsPage > importContactsTotalPages) {
      setImportContactsPage(importContactsTotalPages);
    }
  }, [importContactsPage, importContactsTotalPages]);
  const hostPotentialGuestsCount = useMemo(
    () => guests.filter((guestItem) => guestItem.email || guestItem.phone).length,
    [guests]
  );
  const selfGuestCandidate = useMemo(() => {
    const emailKey = normalizeEmailKey(session?.user?.email || "");
    const phoneKey = normalizePhoneKey(hostProfilePhone);
    return (
      guests.find((guestItem) => {
        const guestEmailKey = normalizeEmailKey(guestItem.email || "");
        const guestPhoneKey = normalizePhoneKey(guestItem.phone || "");
        return Boolean((emailKey && guestEmailKey === emailKey) || (phoneKey && guestPhoneKey === phoneKey));
      }) || null
    );
  }, [guests, session?.user?.email, hostProfilePhone]);
  const selfGuestPreference = useMemo(
    () => (selfGuestCandidate ? guestPreferencesById[selfGuestCandidate.id] || {} : {}),
    [selfGuestCandidate, guestPreferencesById]
  );
  const selfGuestSensitive = useMemo(
    () => (selfGuestCandidate ? guestSensitiveById[selfGuestCandidate.id] || {} : {}),
    [selfGuestCandidate, guestSensitiveById]
  );
  const hostGuestProfileSignals = useMemo(() => {
    if (!selfGuestCandidate) {
      return [];
    }
    const preferenceItem = selfGuestPreference || {};
    const sensitiveItem = selfGuestSensitive || {};
    return [
      { key: "contact", label: t("hint_contact_required"), done: Boolean(selfGuestCandidate.email || selfGuestCandidate.phone) },
      { key: "location", label: t("field_address"), done: Boolean(selfGuestCandidate.address || selfGuestCandidate.city || selfGuestCandidate.country) },
      { key: "diet", label: t("field_diet_type"), done: Boolean(preferenceItem.diet_type) },
      {
        key: "health",
        label: t("field_allergies"),
        done: Boolean(
          toList(sensitiveItem.allergies).length ||
            toList(sensitiveItem.intolerances).length ||
            toList(sensitiveItem.pet_allergies).length
        )
      },
      {
        key: "food",
        label: t("field_food"),
        done: Boolean(
          toList(preferenceItem.food_likes).length ||
            toList(preferenceItem.food_dislikes).length ||
            toList(preferenceItem.drink_likes).length ||
            toList(preferenceItem.drink_dislikes).length
        )
      },
      {
        key: "ambience",
        label: t("field_music_genre"),
        done: Boolean(toList(preferenceItem.music_genres).length || preferenceItem.favorite_color)
      },
      {
        key: "hobbies",
        label: t("field_sport"),
        done: Boolean(toList(preferenceItem.sports).length || toList(preferenceItem.books).length)
      },
      { key: "conversation", label: t("field_last_talk_topic"), done: Boolean(preferenceItem.last_talk_topic) }
    ];
  }, [selfGuestCandidate, selfGuestPreference, selfGuestSensitive, t]);
  const hostGuestProfileCompletedCount = hostGuestProfileSignals.filter((item) => item.done).length;
  const hostGuestProfileTotalCount = Math.max(1, hostGuestProfileSignals.length);
  const hostGuestProfilePercent = selfGuestCandidate
    ? Math.round((hostGuestProfileCompletedCount / hostGuestProfileTotalCount) * 100)
    : 0;
  const convertedHostGuestsCount = useMemo(
    () =>
      guests.filter((guestItem) => (guestItem.email || guestItem.phone) && Boolean(guestHostConversionById[guestItem.id])).length,
    [guests, guestHostConversionById]
  );
  const convertedHostGuests30dCount = useMemo(() => {
    const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return guests.filter((guestItem) => {
      if (!guestItem.email && !guestItem.phone) {
        return false;
      }
      const convertedAt = guestHostConversionById[guestItem.id]?.converted_at;
      if (!convertedAt) {
        return false;
      }
      const convertedAtMs = new Date(convertedAt).getTime();
      return Number.isFinite(convertedAtMs) && convertedAtMs >= threshold;
    }).length;
  }, [guests, guestHostConversionById]);
  const invitedPotentialHostsCount = useMemo(() => {
    const potentialHostGuestIds = new Set(
      guests.filter((guestItem) => guestItem.email || guestItem.phone).map((guestItem) => guestItem.id)
    );
    return new Set(
      invitations
        .map((invitationItem) => invitationItem.guest_id)
        .filter((guestId) => potentialHostGuestIds.has(guestId))
    ).size;
  }, [guests, invitations]);
  const convertedHostRate = useMemo(() => {
    if (!hostPotentialGuestsCount) {
      return 0;
    }
    return Math.round((convertedHostGuestsCount / hostPotentialGuestsCount) * 100);
  }, [convertedHostGuestsCount, hostPotentialGuestsCount]);
  const conversionBySource = useMemo(() => {
    const totals = { email: 0, phone: 0, google: 0 };
    for (const guestItem of guests) {
      if (!guestItem.email && !guestItem.phone) {
        continue;
      }
      const conversion = guestHostConversionById[guestItem.id];
      if (!conversion) {
        continue;
      }
      const source = getConversionSource(conversion);
      if (source === "google" || source === "phone" || source === "email") {
        totals[source] += 1;
      }
    }
    return totals;
  }, [guests, guestHostConversionById]);
  const conversionWindowCounts = useMemo(() => {
    const now = Date.now();
    const limits = {
      d7: now - 7 * 24 * 60 * 60 * 1000,
      d30: now - 30 * 24 * 60 * 60 * 1000,
      d90: now - 90 * 24 * 60 * 60 * 1000
    };
    const totals = { d7: 0, d30: 0, d90: 0 };
    for (const conversion of Object.values(guestHostConversionById)) {
      const convertedAtMs = new Date(conversion?.converted_at || 0).getTime();
      if (!Number.isFinite(convertedAtMs) || convertedAtMs <= 0) {
        continue;
      }
      if (convertedAtMs >= limits.d7) {
        totals.d7 += 1;
      }
      if (convertedAtMs >= limits.d30) {
        totals.d30 += 1;
      }
      if (convertedAtMs >= limits.d90) {
        totals.d90 += 1;
      }
    }
    return totals;
  }, [guestHostConversionById]);
  const conversionTrend14d = useMemo(() => {
    const days = 14;
    const buckets = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let index = days - 1; index >= 0; index -= 1) {
      const day = new Date(today.getTime() - index * dayMs);
      const key = day.toISOString().slice(0, 10);
      buckets.push({
        key,
        label: formatShortDate(day.getTime(), language, key),
        count: 0
      });
    }
    const bucketByKey = Object.fromEntries(buckets.map((bucket) => [bucket.key, bucket]));
    for (const conversion of Object.values(guestHostConversionById)) {
      const convertedAt = conversion?.converted_at;
      if (!convertedAt) {
        continue;
      }
      const convertedDate = new Date(convertedAt);
      if (Number.isNaN(convertedDate.getTime())) {
        continue;
      }
      const key = convertedDate.toISOString().slice(0, 10);
      if (bucketByKey[key]) {
        bucketByKey[key].count += 1;
      }
    }
    return buckets;
  }, [guestHostConversionById, language]);
  const conversionTrendMax = useMemo(
    () => Math.max(1, ...conversionTrend14d.map((bucket) => bucket.count)),
    [conversionTrend14d]
  );
  const pendingHostGuestsCount = Math.max(0, hostPotentialGuestsCount - convertedHostGuestsCount);
  const supportsContactPickerApi = typeof navigator !== "undefined" && Boolean(navigator.contacts?.select);
  const canUseGoogleContacts = typeof window !== "undefined" && isGoogleContactsConfigured();
  const canUseDeviceContacts =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(window.isSecureContext) &&
    supportsContactPickerApi;
  const contactPickerUnsupportedReason = !canUseDeviceContacts
    ? typeof window !== "undefined" && !window.isSecureContext
      ? t("contact_import_device_requires_https")
      : t("contact_import_device_not_supported")
    : "";
  const invitedGuestIdsByEvent = useMemo(() => {
    const byEvent = new Map();
    for (const invitationItem of invitations) {
      if (!invitationItem?.event_id || !invitationItem?.guest_id) {
        continue;
      }
      if (!byEvent.has(invitationItem.event_id)) {
        byEvent.set(invitationItem.event_id, new Set());
      }
      byEvent.get(invitationItem.event_id).add(invitationItem.guest_id);
    }
    return byEvent;
  }, [invitations]);
  const invitedGuestIdsForSelectedEvent = useMemo(
    () => invitedGuestIdsByEvent.get(selectedEventId) || new Set(),
    [invitedGuestIdsByEvent, selectedEventId]
  );
  const availableGuestsForSelectedEvent = useMemo(
    () => guests.filter((guestItem) => !invitedGuestIdsForSelectedEvent.has(guestItem.id)),
    [guests, invitedGuestIdsForSelectedEvent]
  );
  const bulkFilteredGuests = useMemo(() => {
    const term = bulkInvitationSearch.trim().toLowerCase();
    if (!term) {
      return availableGuestsForSelectedEvent;
    }
    return availableGuestsForSelectedEvent.filter((guestItem) => {
      const fullName = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim();
      const haystack = `${fullName} ${guestItem.email || ""} ${guestItem.phone || ""} ${guestItem.city || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [availableGuestsForSelectedEvent, bulkInvitationSearch]);
  const allGuestsAlreadyInvitedForSelectedEvent =
    guests.length > 0 && availableGuestsForSelectedEvent.length === 0;
  const latestEventPreview = useMemo(
    () =>
      events.slice(0, 2).map((eventItem) => ({
        main: eventItem.title || "-",
        meta: formatDate(eventItem.start_at, language, t("no_date"))
      })),
    [events, language, t]
  );
  const latestGuestPreview = useMemo(
    () =>
      guests.slice(0, 2).map((guestItem) => {
        const name = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || "-";
        const relationshipLabel = toCatalogLabel("relationship", guestItem.relationship, language);
        const location = [guestItem.city, guestItem.country].filter(Boolean).join(", ");
        return {
          main: name,
          meta: [relationshipLabel, location].filter(Boolean).join(" - ") || (guestItem.email || guestItem.phone || "-")
        };
      }),
    [guests, language]
  );
  const pendingInvitationPreview = useMemo(
    () =>
      invitations
        .filter((invitationItem) => invitationItem.status === "pending")
        .slice(0, 2)
        .map((invitationItem) => ({
          main: guestNamesById[invitationItem.guest_id] || t("field_guest"),
          meta: eventNamesById[invitationItem.event_id] || t("field_event")
        })),
    [invitations, guestNamesById, eventNamesById, t]
  );
  const answeredInvitationPreview = useMemo(
    () =>
      invitations
        .filter((invitationItem) => invitationItem.status !== "pending")
        .sort((a, b) => {
          const aDate = new Date(a.responded_at || a.created_at || 0).getTime() || 0;
          const bDate = new Date(b.responded_at || b.created_at || 0).getTime() || 0;
          return bDate - aDate;
        })
        .slice(0, 2)
        .map((invitationItem) => ({
          main: `${guestNamesById[invitationItem.guest_id] || t("field_guest")} - ${statusText(t, invitationItem.status)}`,
          meta: `${eventNamesById[invitationItem.event_id] || t("field_event")} - ${formatDate(
            invitationItem.responded_at,
            language,
            t("no_date")
          )}`
        })),
    [invitations, guestNamesById, eventNamesById, language, t]
  );
  const nextScheduledEvent = useMemo(() => {
    const nowMs = Date.now();
    return events
      .filter((eventItem) => {
        if (!eventItem?.start_at) {
          return false;
        }
        const eventMs = new Date(eventItem.start_at).getTime();
        return Number.isFinite(eventMs) && eventMs >= nowMs;
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0] || null;
  }, [events]);
  const upcomingEventsPreview = useMemo(() => {
    const nowMs = Date.now();
    return events
      .filter((eventItem) => {
        const startMs = new Date(eventItem?.start_at || 0).getTime();
        return Number.isFinite(startMs) && startMs >= nowMs;
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 4)
      .map((eventItem) => {
        const invitationSummary = eventInvitationSummaryByEventId[eventItem.id] || null;
        return {
          id: eventItem.id,
          title: eventItem.title || t("field_event"),
          date: formatDate(eventItem.start_at, language, t("no_date")),
          status: eventItem.status || "draft",
          guests: invitationSummary?.total || 0
        };
      });
  }, [events, eventInvitationSummaryByEventId, language, t]);
  const hostRatingScore = useMemo(() => {
    const responseWeight = respondedInvitesRate / 100;
    const completionWeight = Math.min(1, events.filter((eventItem) => eventItem.status === "completed").length / 8);
    const consistencyWeight = Math.min(1, Math.max(0, convertedHostRate) / 100);
    const score = 3.6 + responseWeight * 0.8 + completionWeight * 0.4 + consistencyWeight * 0.2;
    return Math.max(3.6, Math.min(5, Number(score.toFixed(1))));
  }, [convertedHostRate, events, respondedInvitesRate]);
  const hostMemberSinceLabel = useMemo(() => {
    if (!hostProfileCreatedAt) {
      return t("host_rating_since_unknown");
    }
    const date = new Date(hostProfileCreatedAt);
    if (Number.isNaN(date.getTime())) {
      return t("host_rating_since_unknown");
    }
    return date.toLocaleDateString(language, { month: "short", year: "numeric" });
  }, [hostProfileCreatedAt, language, t]);
  const recentActivityItems = useMemo(() => {
    const eventActivities = events.map((eventItem) => {
      const updatedAt = eventItem.updated_at || eventItem.created_at || null;
      const createdAt = eventItem.created_at || null;
      const updatedMs = new Date(updatedAt || 0).getTime();
      const createdMs = new Date(createdAt || 0).getTime();
      const isUpdate = updatedMs > createdMs + 60_000;
      return {
        id: `event-${eventItem.id}`,
        at: updatedAt,
        icon: "calendar",
        status: eventItem.status || "pending",
        title: isUpdate ? t("activity_event_updated") : t("activity_event_created"),
        meta: eventItem.title || t("field_event")
      };
    });
    const invitationActivities = invitations.map((invitationItem) => {
      const eventName = eventNamesById[invitationItem.event_id] || t("field_event");
      const guestName = guestNamesById[invitationItem.guest_id] || t("field_guest");
      if (invitationItem.responded_at) {
        const responseKey =
          invitationItem.status === "yes"
            ? "activity_rsvp_yes"
            : invitationItem.status === "no"
            ? "activity_rsvp_no"
            : invitationItem.status === "maybe"
            ? "activity_rsvp_maybe"
            : "activity_rsvp_pending";
        return {
          id: `inv-response-${invitationItem.id}`,
          at: invitationItem.responded_at,
          icon: "check",
          status: invitationItem.status || "pending",
          title: t(responseKey),
          meta: `${guestName} · ${eventName}`
        };
      }
      return {
        id: `inv-sent-${invitationItem.id}`,
        at: invitationItem.created_at,
        icon: "mail",
        status: "pending",
        title: t("activity_invitation_sent"),
        meta: `${guestName} · ${eventName}`
      };
    });
    return [...invitationActivities, ...eventActivities]
      .filter((item) => item.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8)
      .map((item) => ({
        ...item,
        timeLabel: formatRelativeDate(item.at, language, t("activity_now"))
      }));
  }, [eventNamesById, events, guestNamesById, invitations, language, t]);
  const unreadNotificationCount = useMemo(() => {
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    return recentActivityItems.filter((item) => new Date(item.at).getTime() >= last24h).length;
  }, [recentActivityItems]);
  const eventTypeBaseOptions = useMemo(() => getCatalogLabels("experience_type", language), [language]);
  const relationshipBaseOptions = useMemo(() => getCatalogLabels("relationship", language), [language]);
  const cityBaseOptions = useMemo(
    () => CITY_OPTIONS_BY_LANGUAGE[language] || CITY_OPTIONS_BY_LANGUAGE.es,
    [language]
  );
  const countryBaseOptions = useMemo(
    () => COUNTRY_OPTIONS_BY_LANGUAGE[language] || COUNTRY_OPTIONS_BY_LANGUAGE.es,
    [language]
  );
  const dietTypeBaseOptions = useMemo(() => getCatalogLabels("diet_type", language), [language]);
  const dayMomentBaseOptions = useMemo(() => getCatalogLabels("day_moment", language), [language]);
  const periodicityBaseOptions = useMemo(() => getCatalogLabels("periodicity", language), [language]);
  const punctualityBaseOptions = useMemo(() => getCatalogLabels("punctuality", language), [language]);
  const tastingPreferenceBaseOptions = useMemo(() => getCatalogLabels("tasting_preference", language), [language]);
  const drinkBaseOptions = useMemo(() => getCatalogLabels("drink", language), [language]);
  const musicGenreBaseOptions = useMemo(() => getCatalogLabels("music_genre", language), [language]);
  const colorBaseOptions = useMemo(() => getCatalogLabels("color", language), [language]);
  const sportBaseOptions = useMemo(() => getCatalogLabels("sport", language), [language]);
  const petBaseOptions = useMemo(() => getCatalogLabels("pet", language), [language]);
  const allergyBaseOptions = useMemo(() => getCatalogLabels("allergy", language), [language]);
  const intoleranceBaseOptions = useMemo(() => getCatalogLabels("intolerance", language), [language]);
  const cuisineTypeBaseOptions = useMemo(() => getCatalogLabels("cuisine_type", language), [language]);
  const eventTypeOptions = useMemo(
    () =>
      uniqueValues([
        ...eventTypeBaseOptions,
        ...events.map((eventItem) => toCatalogLabel("experience_type", eventItem.event_type, language))
      ]),
    [eventTypeBaseOptions, events, language]
  );
  const eventTemplates = useMemo(
    () =>
      EVENT_TEMPLATE_DEFINITIONS.map((templateItem) => ({
        ...templateItem,
        eventTypeLabel: toCatalogLabel("experience_type", templateItem.typeCode, language)
      })),
    [language]
  );
  const activeEventTemplateKey = useMemo(() => {
    const normalizedEventTypeCode = toCatalogCode("experience_type", eventType);
    const matchedTemplate = eventTemplates.find((templateItem) => templateItem.typeCode === normalizedEventTypeCode) || null;
    return matchedTemplate?.key || "";
  }, [eventTemplates, eventType]);
  const relationshipOptions = useMemo(
    () =>
      uniqueValues([
        ...relationshipBaseOptions,
        ...guests.map((guestItem) => toCatalogLabel("relationship", guestItem.relationship, language))
      ]),
    [relationshipBaseOptions, guests, language]
  );
  const cityOptions = useMemo(
    () => uniqueValues([...cityBaseOptions, ...guests.map((guestItem) => guestItem.city)]),
    [cityBaseOptions, guests]
  );
  const countryOptions = useMemo(
    () => uniqueValues([...countryBaseOptions, ...guests.map((guestItem) => guestItem.country)]),
    [countryBaseOptions, guests]
  );
  const dietTypeOptions = useMemo(
    () =>
      uniqueValues([
        ...dietTypeBaseOptions,
        ...Object.values(guestPreferencesById).map((preferenceItem) => preferenceItem?.diet_type)
      ]),
    [dietTypeBaseOptions, guestPreferencesById]
  );
  const dayMomentOptions = useMemo(
    () =>
      uniqueValues([
        ...dayMomentBaseOptions,
        ...Object.values(guestPreferencesById).flatMap((preferenceItem) =>
          Array.isArray(preferenceItem?.preferred_day_moments) ? preferenceItem.preferred_day_moments : []
        )
      ]),
    [dayMomentBaseOptions, guestPreferencesById]
  );
  const periodicityOptions = useMemo(
    () =>
      uniqueValues([
        ...periodicityBaseOptions,
        ...Object.values(guestPreferencesById).map((preferenceItem) => preferenceItem?.periodicity)
      ]),
    [periodicityBaseOptions, guestPreferencesById]
  );
  const punctualityOptions = useMemo(
    () =>
      uniqueValues([
        ...punctualityBaseOptions,
        ...Object.values(guestPreferencesById).map((preferenceItem) =>
          toCatalogLabel("punctuality", preferenceItem?.punctuality, language)
        )
      ]),
    [punctualityBaseOptions, guestPreferencesById, language]
  );
  const tastingPreferenceOptions = useMemo(
    () =>
      uniqueValues([
        ...tastingPreferenceBaseOptions,
        ...Object.values(guestPreferencesById).flatMap((preferenceItem) =>
          toCatalogLabels("tasting_preference", preferenceItem?.tasting_preferences || [], language)
        )
      ]),
    [tastingPreferenceBaseOptions, guestPreferencesById, language]
  );
  const drinkOptions = useMemo(
    () =>
      uniqueValues([
        ...drinkBaseOptions,
        ...Object.values(guestPreferencesById).flatMap((preferenceItem) =>
          toCatalogLabels("drink", [...(preferenceItem?.drink_likes || []), ...(preferenceItem?.drink_dislikes || [])], language)
        )
      ]),
    [drinkBaseOptions, guestPreferencesById, language]
  );
  const musicGenreOptions = useMemo(
    () =>
      uniqueValues([
        ...musicGenreBaseOptions,
        ...Object.values(guestPreferencesById).flatMap((preferenceItem) =>
          toCatalogLabels("music_genre", preferenceItem?.music_genres || [], language)
        )
      ]),
    [musicGenreBaseOptions, guestPreferencesById, language]
  );
  const colorOptions = useMemo(
    () =>
      uniqueValues([
        ...colorBaseOptions,
        ...Object.values(guestPreferencesById).map((preferenceItem) =>
          toCatalogLabel("color", preferenceItem?.favorite_color, language)
        )
      ]),
    [colorBaseOptions, guestPreferencesById, language]
  );
  const sportOptions = useMemo(
    () =>
      uniqueValues([
        ...sportBaseOptions,
        ...Object.values(guestPreferencesById).flatMap((preferenceItem) =>
          toCatalogLabels("sport", preferenceItem?.sports || [], language)
        )
      ]),
    [sportBaseOptions, guestPreferencesById, language]
  );
  const petOptions = useMemo(
    () =>
      uniqueValues([
        ...petBaseOptions,
        ...Object.values(guestPreferencesById).flatMap((preferenceItem) =>
          toCatalogLabels("pet", preferenceItem?.pets || [], language)
        )
      ]),
    [petBaseOptions, guestPreferencesById, language]
  );
  const allergyOptions = useMemo(
    () =>
      uniqueValues([
        ...allergyBaseOptions,
        ...Object.values(guestSensitiveById).flatMap((sensitiveItem) => toCatalogLabels("allergy", sensitiveItem?.allergies || [], language))
      ]),
    [allergyBaseOptions, guestSensitiveById, language]
  );
  const petAllergyOptions = useMemo(
    () =>
      uniqueValues([
        ...petBaseOptions,
        ...Object.values(guestSensitiveById).flatMap((sensitiveItem) =>
          toPetAllergyLabels(sensitiveItem?.pet_allergies || [], language)
        )
      ]),
    [petBaseOptions, guestSensitiveById, language]
  );
  const intoleranceOptions = useMemo(
    () =>
      uniqueValues([
        ...intoleranceBaseOptions,
        ...Object.values(guestSensitiveById).flatMap((sensitiveItem) =>
          toCatalogLabels("intolerance", sensitiveItem?.intolerances || [], language)
        )
      ]),
    [intoleranceBaseOptions, guestSensitiveById, language]
  );
  const cuisineTypeOptions = useMemo(
    () =>
      uniqueValues([
        ...cuisineTypeBaseOptions,
        ...Object.values(guestPreferencesById).flatMap((preferenceItem) =>
          toCatalogLabels("cuisine_type", preferenceItem?.cuisine_types || [], language)
        )
      ]),
    [cuisineTypeBaseOptions, guestPreferencesById, language]
  );
  const guestAdvancedProfileSignals = useMemo(() => {
    const signals = [
      {
        key: "identity",
        label: t("guest_advanced_section_identity"),
        done: Boolean(guestFirstName.trim() && (guestEmail.trim() || guestPhone.trim()))
      },
      {
        key: "food",
        label: t("guest_advanced_section_food"),
        done: Boolean(
          guestAdvanced.dietType ||
            splitListInput(guestAdvanced.foodLikes).length ||
            splitListInput(guestAdvanced.drinkLikes).length
        )
      },
      {
        key: "health",
        label: t("guest_advanced_section_health"),
        done: Boolean(
          splitListInput(guestAdvanced.allergies).length ||
            splitListInput(guestAdvanced.intolerances).length ||
            splitListInput(guestAdvanced.petAllergies).length
        )
      },
      {
        key: "lifestyle",
        label: t("guest_advanced_section_lifestyle"),
        done: Boolean(
          splitListInput(guestAdvanced.musicGenres).length ||
            splitListInput(guestAdvanced.sports).length ||
            splitListInput(guestAdvanced.preferredDayMoments).length
        )
      },
      {
        key: "conversation",
        label: t("guest_advanced_section_conversation"),
        done: Boolean(guestAdvanced.lastTalkTopic.trim() || splitListInput(guestAdvanced.tabooTopics).length)
      }
    ];
    return signals;
  }, [guestAdvanced, guestEmail, guestFirstName, guestPhone, t]);
  const guestAdvancedProfileCompleted = guestAdvancedProfileSignals.filter((item) => item.done).length;
  const guestAdvancedProfilePercent = Math.round((guestAdvancedProfileCompleted / Math.max(1, guestAdvancedProfileSignals.length)) * 100);
  const guestNextBirthday = useMemo(
    () => getNextBirthdaySummary(guestAdvanced.birthday, language),
    [guestAdvanced.birthday, language]
  );
  const knownLocationPairs = useMemo(() => {
    const uniqueByKey = new Set();
    const list = [];
    const pushPair = ({ name, address, placeId = null, lat = null, lng = null }) => {
      const normalizedName = String(name || "").trim();
      const normalizedAddress = String(address || "").trim();
      if (!normalizedName && !normalizedAddress) {
        return;
      }
      const key = `${normalizeLookupValue(normalizedName)}|${normalizeLookupValue(normalizedAddress)}`;
      if (uniqueByKey.has(key)) {
        return;
      }
      uniqueByKey.add(key);
      list.push({
        name: normalizedName,
        address: normalizedAddress,
        placeId: placeId || null,
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null
      });
    };

    for (const eventItem of events) {
      pushPair({
        name: eventItem.location_name,
        address: eventItem.location_address,
        placeId: eventItem.location_place_id,
        lat: eventItem.location_lat,
        lng: eventItem.location_lng
      });
    }

    for (const guestItem of guests) {
      const guestAddress = String(guestItem.address || "").trim();
      if (!guestAddress) {
        continue;
      }
      const guestFullName = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim();
      pushPair({
        name: guestItem.company || guestFullName || guestAddress,
        address: guestAddress
      });
    }
    return list;
  }, [events, guests]);
  const locationNameOptions = useMemo(
    () => uniqueValues(knownLocationPairs.map((item) => item.name)),
    [knownLocationPairs]
  );
  const locationAddressOptions = useMemo(
    () => uniqueValues(knownLocationPairs.map((item) => item.address)),
    [knownLocationPairs]
  );
  const findUniqueLocationByName = useCallback(
    (rawName) => {
      const normalizedName = normalizeLookupValue(rawName);
      if (!normalizedName) {
        return null;
      }
      const candidates = knownLocationPairs.filter(
        (item) => normalizeLookupValue(item.name) === normalizedName && item.address
      );
      const addresses = uniqueValues(candidates.map((item) => item.address));
      if (addresses.length !== 1) {
        return null;
      }
      const normalizedAddress = normalizeLookupValue(addresses[0]);
      return (
        candidates.find((item) => normalizeLookupValue(item.address) === normalizedAddress) || null
      );
    },
    [knownLocationPairs]
  );
  const findUniqueLocationByAddress = useCallback(
    (rawAddress) => {
      const normalizedAddress = normalizeLookupValue(rawAddress);
      if (!normalizedAddress) {
        return null;
      }
      const candidates = knownLocationPairs.filter(
        (item) => normalizeLookupValue(item.address) === normalizedAddress && item.name
      );
      const names = uniqueValues(candidates.map((item) => item.name));
      if (names.length !== 1) {
        return null;
      }
      const normalizedName = normalizeLookupValue(names[0]);
      return candidates.find((item) => normalizeLookupValue(item.name) === normalizedName) || null;
    },
    [knownLocationPairs]
  );
  const prefsStorageKey = useMemo(
    () => (session?.user?.id ? `${DASHBOARD_PREFS_KEY_PREFIX}:${session.user.id}` : ""),
    [session?.user?.id]
  );
  const eventSettingsStorageKey = useMemo(
    () => (session?.user?.id ? `${EVENT_SETTINGS_STORAGE_KEY_PREFIX}:${session.user.id}` : ""),
    [session?.user?.id]
  );
  const eventInsights = useMemo(
    () =>
      buildHostingSuggestions({
        eventId: insightsEventId,
        events,
        guests,
        invitations,
        guestPreferencesById,
        guestSensitiveById,
        language
      }),
    [insightsEventId, events, guests, invitations, guestPreferencesById, guestSensitiveById, language]
  );
  const invitationCountForEditingEvent = useMemo(() => {
    if (!editingEventId) {
      return 0;
    }
    return invitations.filter((invitationItem) => invitationItem.event_id === editingEventId).length;
  }, [editingEventId, invitations]);
  const guestGeocodeStorageKey = useMemo(
    () => (session?.user?.id ? `${GUEST_GEO_CACHE_KEY_PREFIX}:${session.user.id}` : ""),
    [session?.user?.id]
  );
  const eventMapPoints = useMemo(
    () =>
      events
        .filter((eventItem) => typeof eventItem.location_lat === "number" && typeof eventItem.location_lng === "number")
        .map((eventItem) => ({
          id: eventItem.id,
          lat: eventItem.location_lat,
          lng: eventItem.location_lng,
          label: eventItem.title || t("field_event"),
          meta: eventItem.location_name || eventItem.location_address || ""
        })),
    [events, t]
  );
  const guestMapPoints = useMemo(
    () =>
      guests
        .map((guestItem) => {
          const geocode = guestGeocodeById[guestItem.id];
          if (!geocode || typeof geocode.lat !== "number" || typeof geocode.lng !== "number") {
            return null;
          }
          const guestName = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest");
          return {
            id: guestItem.id,
            lat: geocode.lat,
            lng: geocode.lng,
            label: guestName,
            meta: geocode.address || guestItem.address || [guestItem.city, guestItem.country].filter(Boolean).join(", ")
          };
        })
        .filter(Boolean),
    [guests, guestGeocodeById, t]
  );
  const orderedEventMapPoints = useMemo(() => {
    if (!eventsMapFocusId) {
      return eventMapPoints;
    }
    const focusIndex = eventMapPoints.findIndex((item) => item.id === eventsMapFocusId);
    if (focusIndex <= 0) {
      return eventMapPoints;
    }
    return [eventMapPoints[focusIndex], ...eventMapPoints.slice(0, focusIndex), ...eventMapPoints.slice(focusIndex + 1)];
  }, [eventMapPoints, eventsMapFocusId]);
  const orderedGuestMapPoints = useMemo(() => {
    if (!guestsMapFocusId) {
      return guestMapPoints;
    }
    const focusIndex = guestMapPoints.findIndex((item) => item.id === guestsMapFocusId);
    if (focusIndex <= 0) {
      return guestMapPoints;
    }
    return [guestMapPoints[focusIndex], ...guestMapPoints.slice(0, focusIndex), ...guestMapPoints.slice(focusIndex + 1)];
  }, [guestMapPoints, guestsMapFocusId]);

  const upsertEventSettingsCache = useCallback(
    (eventId, settingsInput) => {
      if (!eventId || !session?.user?.id) {
        return;
      }
      const normalizedSettings = normalizeEventSettings(settingsInput);
      setEventSettingsCacheById((prev) => {
        const next = {
          ...(prev || {}),
          [eventId]: normalizedSettings
        };
        writeEventSettingsCache(session.user.id, next);
        return next;
      });
    },
    [session?.user?.id]
  );

  const removeEventSettingsCache = useCallback(
    (eventId) => {
      if (!eventId || !session?.user?.id) {
        return;
      }
      setEventSettingsCacheById((prev) => {
        const next = { ...(prev || {}) };
        delete next[eventId];
        writeEventSettingsCache(session.user.id, next);
        return next;
      });
    },
    [session?.user?.id]
  );
  const eventPhaseProgress = useMemo(() => {
    const normalizedTitle = String(eventTitle || "").trim();
    const normalizedType = String(eventType || "").trim();
    const normalizedPlace = String(eventLocationName || "").trim();
    const normalizedAddress = String(selectedPlace?.formattedAddress || eventLocationAddress || "").trim();
    const publishReady = eventStatus === "published" || eventStatus === "completed";
    const checklist = [
      { phase: "planning", done: Boolean(normalizedTitle) },
      { phase: "planning", done: Boolean(normalizedType) },
      { phase: "planning", done: Boolean(eventStatus) },
      { phase: "logistics", done: Boolean(eventStartAt) },
      { phase: "logistics", done: Boolean(normalizedPlace) },
      {
        phase: "logistics",
        done:
          mapsStatus === "ready" && normalizedAddress
            ? Boolean(
                selectedPlace?.placeId ||
                  (typeof selectedPlace?.lat === "number" && typeof selectedPlace?.lng === "number")
              )
            : Boolean(normalizedAddress)
      },
      { phase: "publish", done: publishReady },
      {
        phase: "publish",
        done: editingEventId ? invitationCountForEditingEvent > 0 : Boolean(normalizedTitle && eventStartAt)
      }
    ];
    const completed = checklist.filter((item) => item.done).length;
    const total = checklist.length;
    const byPhase = ["planning", "logistics", "publish"].map((phaseKey) => {
      const phaseItems = checklist.filter((item) => item.phase === phaseKey);
      return {
        key: phaseKey,
        done: phaseItems.filter((item) => item.done).length,
        total: phaseItems.length
      };
    });
    return {
      total,
      completed,
      percent: total ? Math.round((completed / total) * 100) : 0,
      byPhase
    };
  }, [
    eventTitle,
    eventType,
    eventStatus,
    eventStartAt,
    eventLocationName,
    eventLocationAddress,
    selectedPlace,
    mapsStatus,
    editingEventId,
    invitationCountForEditingEvent
  ]);
  const invitationRecommendations = useMemo(() => {
    if (!selectedGuestId) {
      return null;
    }
    const guestItem = guests.find((guest) => guest.id === selectedGuestId) || null;
    const preferenceItem = guestPreferencesById[selectedGuestId] || {};
    const sensitiveItem = guestSensitiveById[selectedGuestId] || {};
    const selectedEvent = events.find((eventItem) => eventItem.id === selectedEventId) || null;
    const allergies = toCatalogLabels("allergy", sensitiveItem?.allergies || [], language).slice(0, 5);
    const intolerances = toCatalogLabels("intolerance", sensitiveItem?.intolerances || [], language).slice(0, 5);
    const petAllergies = toPetAllergyLabels(sensitiveItem?.pet_allergies || [], language).slice(0, 4);
    const foodDislikes = toList(preferenceItem?.food_dislikes || []).slice(0, 5);
    const drinkDislikes = toCatalogLabels("drink", preferenceItem?.drink_dislikes || [], language).slice(0, 4);
    const preferredCuisine = toCatalogLabels("cuisine_type", preferenceItem?.cuisine_types || [], language).slice(0, 4);
    const preferredMoments = toCatalogLabels("day_moment", preferenceItem?.preferred_day_moments || [], language).slice(0, 3);
    const preferredExperiences = toCatalogCodes("experience_type", preferenceItem?.experience_types || []);
    const selectedEventTypeCode = toCatalogCode("experience_type", selectedEvent?.event_type || "");
    const warnings = [];
    const suggestions = [];

    if (allergies.length > 0 || intolerances.length > 0) {
      warnings.push(`${t("invitation_recommendation_health")}: ${[...allergies, ...intolerances].join(", ")}`);
    }
    if (petAllergies.length > 0) {
      warnings.push(`${t("field_pet_allergies")}: ${petAllergies.join(", ")}`);
    }
    if (foodDislikes.length > 0) {
      warnings.push(`${t("field_food_dislikes")}: ${foodDislikes.join(", ")}`);
    }
    if (drinkDislikes.length > 0) {
      warnings.push(`${t("field_drink_dislikes")}: ${drinkDislikes.join(", ")}`);
    }

    const dietTypeLabel = toCatalogLabel("diet_type", preferenceItem?.diet_type, language);
    if (dietTypeLabel) {
      suggestions.push(`${t("field_diet_type")}: ${dietTypeLabel}`);
    }
    if (preferredCuisine.length > 0) {
      suggestions.push(`${t("field_cuisine_type")}: ${preferredCuisine.join(", ")}`);
    }
    if (preferredMoments.length > 0) {
      suggestions.push(`${t("field_day_moment")}: ${preferredMoments.join(", ")}`);
    }
    if (preferenceItem?.last_talk_topic) {
      suggestions.push(`${t("field_last_talk_topic")}: ${preferenceItem.last_talk_topic}`);
    }
    if (
      selectedEventTypeCode &&
      preferredExperiences.length > 0 &&
      !preferredExperiences.includes(selectedEventTypeCode)
    ) {
      suggestions.push(t("invitation_recommendation_experience_mismatch"));
    }

    return {
      guestLabel: guestItem ? `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() : "",
      eventLabel: selectedEvent?.title || "",
      warnings,
      suggestions
    };
  }, [selectedGuestId, selectedEventId, guests, events, guestPreferencesById, guestSensitiveById, language, t]);
  const buildInvitationSharePayload = useCallback(
    (invitationItem) => {
      if (!invitationItem?.public_token) {
        return null;
      }
      const eventItem = eventsById[invitationItem.event_id] || null;
      const guestItem = guestsById[invitationItem.guest_id] || null;
      const eventName = eventItem?.title || t("field_event");
      const guestName = guestItem
        ? `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest")
        : guestNamesById[invitationItem.guest_id] || t("field_guest");
      const eventDate = formatDate(eventItem?.start_at, language, t("no_date"));
      const eventLocation = eventItem?.location_name || eventItem?.location_address || "-";
      const url = buildAppUrl(`/?token=${invitationItem.public_token}`);
      const shareSubject = interpolateText(t("invitation_share_subject"), {
        event: eventName
      });
      const shareText = interpolateText(t("invitation_share_template"), {
        guest: guestName,
        event: eventName,
        date: eventDate,
        location: eventLocation,
        url
      });
      return {
        url,
        shareSubject,
        shareText,
        whatsappUrl: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
        emailUrl: `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareText)}`
      };
    },
    [eventsById, guestsById, guestNamesById, language, t]
  );
  const lastInvitationWhatsappUrl = useMemo(() => {
    if (!lastInvitationShareText) {
      return "";
    }
    return `https://wa.me/?text=${encodeURIComponent(lastInvitationShareText)}`;
  }, [lastInvitationShareText]);
  const lastInvitationEmailUrl = useMemo(() => {
    if (!lastInvitationShareText) {
      return "";
    }
    const subject = lastInvitationShareSubject || t("invitation_share_subject_fallback");
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lastInvitationShareText)}`;
  }, [lastInvitationShareSubject, lastInvitationShareText, t]);
  const selectedEventDetail = useMemo(() => {
    if (!selectedEventDetailId) {
      return events[0] || null;
    }
    return eventsById[selectedEventDetailId] || events[0] || null;
  }, [events, eventsById, selectedEventDetailId]);
  const selectedEventDetailInvitations = useMemo(() => {
    if (!selectedEventDetail?.id) {
      return [];
    }
    return invitations
      .filter((invitationItem) => invitationItem.event_id === selectedEventDetail.id)
      .sort((a, b) => {
        const aTime = new Date(a.responded_at || a.created_at || 0).getTime() || 0;
        const bTime = new Date(b.responded_at || b.created_at || 0).getTime() || 0;
        return bTime - aTime;
      });
  }, [invitations, selectedEventDetail?.id]);
  const selectedEventDetailStatusCounts = useMemo(() => {
    const totals = { pending: 0, yes: 0, no: 0, maybe: 0 };
    for (const invitationItem of selectedEventDetailInvitations) {
      const status = String(invitationItem.status || "pending").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(totals, status)) {
        totals[status] += 1;
      } else {
        totals.pending += 1;
      }
    }
    return totals;
  }, [selectedEventDetailInvitations]);
  const selectedEventDetailGuests = useMemo(
    () =>
      selectedEventDetailInvitations.map((invitationItem) => {
        const guestItem = guestsById[invitationItem.guest_id] || null;
        return {
          invitation: invitationItem,
          guest: guestItem,
          name:
            guestItem
              ? `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest")
              : guestNamesById[invitationItem.guest_id] || t("field_guest"),
          contact: guestItem?.email || guestItem?.phone || "-"
        };
      }),
    [selectedEventDetailInvitations, guestsById, guestNamesById, t]
  );
  const selectedEventRsvpTimeline = useMemo(
    () =>
      selectedEventDetailGuests
        .map((row) => {
          const eventDate = row.invitation.responded_at || row.invitation.created_at || null;
          return {
            id: row.invitation.id,
            name: row.name,
            status: row.invitation.status || "pending",
            date: eventDate,
            isResponse: Boolean(row.invitation.responded_at)
          };
        })
        .filter((item) => item.date)
        .sort((a, b) => {
          const aTime = new Date(a.date).getTime() || 0;
          const bTime = new Date(b.date).getTime() || 0;
          return bTime - aTime;
        })
        .slice(0, 8),
    [selectedEventDetailGuests]
  );
  const selectedEventHealthAlerts = useMemo(() => {
    return selectedEventDetailGuests
      .map((row) => {
        const sensitiveItem = guestSensitiveById[row.guest?.id || row.invitation.guest_id] || {};
        const allergies = toCatalogLabels("allergy", sensitiveItem.allergies || [], language);
        const intolerances = toCatalogLabels("intolerance", sensitiveItem.intolerances || [], language);
        const petAllergies = toPetAllergyLabels(sensitiveItem.pet_allergies || [], language);
        const avoid = uniqueValues([...allergies, ...intolerances, ...petAllergies]).slice(0, 6);
        if (avoid.length === 0) {
          return null;
        }
        return {
          guestName: row.name,
          avoid
        };
      })
      .filter(Boolean);
  }, [selectedEventDetailGuests, guestSensitiveById, language]);
  const selectedEventSettings = useMemo(
    () => normalizeEventSettings(selectedEventDetail || {}),
    [selectedEventDetail]
  );
  const selectedEventChecklist = useMemo(() => {
    const hasDate = Boolean(selectedEventDetail?.start_at);
    const hasLocation = Boolean(selectedEventDetail?.location_name || selectedEventDetail?.location_address);
    const hasInvitations = selectedEventDetailInvitations.length > 0;
    const isPublished = ["published", "completed"].includes(String(selectedEventDetail?.status || ""));
    const pendingResponses = selectedEventDetailStatusCounts.pending > 0;
    const hasHealthAlerts = selectedEventHealthAlerts.length > 0;
    const hasAdvancedConfig = Boolean(
      selectedEventSettings.allow_plus_one ||
        selectedEventSettings.auto_reminders ||
        selectedEventSettings.dress_code !== "none" ||
        selectedEventSettings.playlist_mode !== "host_only"
    );
    return [
      { key: "date", done: hasDate, label: t("event_check_date") },
      { key: "location", done: hasLocation, label: t("event_check_location") },
      { key: "invitations", done: hasInvitations, label: t("event_check_invitations") },
      { key: "publish", done: isPublished, label: t("event_check_publish") },
      { key: "rsvp", done: !pendingResponses, label: t("event_check_rsvp_pending") },
      { key: "health", done: !hasHealthAlerts, label: t("event_check_health_alerts") },
      { key: "settings", done: hasAdvancedConfig, label: t("event_check_advanced_settings") }
    ];
  }, [
    selectedEventDetail,
    selectedEventDetailInvitations.length,
    selectedEventDetailStatusCounts.pending,
    selectedEventHealthAlerts.length,
    selectedEventSettings.allow_plus_one,
    selectedEventSettings.auto_reminders,
    selectedEventSettings.dress_code,
    selectedEventSettings.playlist_mode,
    t
  ]);
  const selectedGuestDetail = useMemo(() => {
    if (!selectedGuestDetailId) {
      return guests[0] || null;
    }
    return guestsById[selectedGuestDetailId] || guests[0] || null;
  }, [guests, guestsById, selectedGuestDetailId]);
  const selectedGuestDetailPreference = useMemo(
    () => (selectedGuestDetail ? guestPreferencesById[selectedGuestDetail.id] || {} : {}),
    [guestPreferencesById, selectedGuestDetail]
  );
  const selectedGuestDetailSensitive = useMemo(
    () => (selectedGuestDetail ? guestSensitiveById[selectedGuestDetail.id] || {} : {}),
    [guestSensitiveById, selectedGuestDetail]
  );
  const selectedGuestDetailConversion = selectedGuestDetail ? guestHostConversionById[selectedGuestDetail.id] || null : null;
  const selectedGuestDetailInvitations = useMemo(() => {
    if (!selectedGuestDetail?.id) {
      return [];
    }
    return invitations
      .filter((invitationItem) => invitationItem.guest_id === selectedGuestDetail.id)
      .sort((a, b) => {
        const aTime = new Date(a.responded_at || a.created_at || 0).getTime() || 0;
        const bTime = new Date(b.responded_at || b.created_at || 0).getTime() || 0;
        return bTime - aTime;
      });
  }, [invitations, selectedGuestDetail?.id]);
  const selectedGuestDetailGroups = useMemo(() => {
    if (!selectedGuestDetail) {
      return [];
    }
    const preferenceItem = selectedGuestDetailPreference || {};
    const sensitiveItem = selectedGuestDetailSensitive || {};
    const groups = [
      {
        title: t("guest_detail_group_tastes"),
        values: [
          ...toCatalogLabels("drink", preferenceItem.drink_likes || [], language),
          ...toCatalogLabels("tasting_preference", preferenceItem.tasting_preferences || [], language)
        ]
      },
      {
        title: t("guest_detail_group_food"),
        values: [
          ...toList(preferenceItem.food_likes || []),
          ...toCatalogLabels("cuisine_type", preferenceItem.cuisine_types || [], language)
        ]
      },
      {
        title: t("guest_detail_group_avoid"),
        values: [
          ...toCatalogLabels("allergy", sensitiveItem.allergies || [], language),
          ...toCatalogLabels("intolerance", sensitiveItem.intolerances || [], language),
          ...toPetAllergyLabels(sensitiveItem.pet_allergies || [], language),
          ...toList(preferenceItem.food_dislikes || []),
          ...toCatalogLabels("drink", preferenceItem.drink_dislikes || [], language)
        ]
      },
      {
        title: t("guest_detail_group_ambience"),
        values: [
          ...toCatalogLabels("music_genre", preferenceItem.music_genres || [], language),
          ...toCatalogLabels("color", [preferenceItem.favorite_color], language),
          ...toCatalogLabels("sport", preferenceItem.sports || [], language)
        ]
      }
    ];
    return groups.map((group) => ({ ...group, values: uniqueValues(group.values || []) })).filter((group) => group.values.length > 0);
  }, [language, selectedGuestDetail, selectedGuestDetailPreference, selectedGuestDetailSensitive, t]);
  const selectedGuestHostingRecommendations = useMemo(() => {
    if (!selectedGuestDetail) {
      return { menu: [], drinks: [], ambience: [], avoid: [], icebreakers: [] };
    }
    const preferenceItem = selectedGuestDetailPreference || {};
    const sensitiveItem = selectedGuestDetailSensitive || {};
    const menu = uniqueValues([
      ...toCatalogLabels("cuisine_type", preferenceItem.cuisine_types || [], language),
      ...toList(preferenceItem.food_likes || []),
      ...toCatalogLabels("diet_type", [preferenceItem.diet_type], language)
    ]).slice(0, 6);
    const drinks = uniqueValues([
      ...toCatalogLabels("drink", preferenceItem.drink_likes || [], language),
      ...toCatalogLabels("tasting_preference", preferenceItem.tasting_preferences || [], language)
    ]).slice(0, 6);
    const ambience = uniqueValues([
      ...toCatalogLabels("music_genre", preferenceItem.music_genres || [], language),
      ...toCatalogLabels("color", [preferenceItem.favorite_color], language),
      ...toCatalogLabels("day_moment", preferenceItem.preferred_day_moments || [], language)
    ]).slice(0, 6);
    const avoid = uniqueValues([
      ...toCatalogLabels("allergy", sensitiveItem.allergies || [], language),
      ...toCatalogLabels("intolerance", sensitiveItem.intolerances || [], language),
      ...toPetAllergyLabels(sensitiveItem.pet_allergies || [], language),
      ...toList(preferenceItem.food_dislikes || []),
      ...toCatalogLabels("drink", preferenceItem.drink_dislikes || [], language),
      ...toList(preferenceItem.taboo_topics || [])
    ]).slice(0, 8);
    const icebreakers = uniqueValues([
      ...toList(preferenceItem.books || []).slice(0, 2),
      ...toList(preferenceItem.movies || []).slice(0, 2),
      ...toList(preferenceItem.series || []).slice(0, 2),
      ...toCatalogLabels("sport", preferenceItem.sports || [], language).slice(0, 2),
      ...toList(preferenceItem.last_talk_topic || [])
    ]).slice(0, 6);
    return { menu, drinks, ambience, avoid, icebreakers };
  }, [language, selectedGuestDetail, selectedGuestDetailPreference, selectedGuestDetailSensitive]);

  const filteredEvents = useMemo(() => {
    const term = eventSearch.trim().toLowerCase();
    const list = events.filter((eventItem) => {
      if (eventStatusFilter !== "all" && eventItem.status !== eventStatusFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = [
        eventItem.title,
        eventItem.event_type,
        toCatalogLabel("experience_type", eventItem.event_type, language),
        eventItem.location_name,
        eventItem.location_address
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    list.sort((a, b) => {
      const aCreated = new Date(a.created_at || 0).getTime() || 0;
      const bCreated = new Date(b.created_at || 0).getTime() || 0;
      const aStart = new Date(a.start_at || 0).getTime() || 0;
      const bStart = new Date(b.start_at || 0).getTime() || 0;
      if (eventSort === "created_asc") {
        return aCreated - bCreated;
      }
      if (eventSort === "start_asc") {
        return aStart - bStart;
      }
      if (eventSort === "start_desc") {
        return bStart - aStart;
      }
      if (eventSort === "title_asc") {
        return String(a.title || "").localeCompare(String(b.title || ""), language);
      }
      return bCreated - aCreated;
    });
    return list;
  }, [events, eventSearch, eventStatusFilter, eventSort, language]);

  const filteredGuests = useMemo(() => {
    const term = guestSearch.trim().toLowerCase();
    const list = guests.filter((guestItem) => {
      if (guestContactFilter === "email" && !guestItem.email) {
        return false;
      }
      if (guestContactFilter === "phone" && !guestItem.phone) {
        return false;
      }
      if (guestContactFilter === "contact" && !guestItem.email && !guestItem.phone) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = [
        guestItem.first_name,
        guestItem.last_name,
        guestItem.email,
        guestItem.phone,
        guestItem.company,
        guestItem.address,
        guestItem.relationship,
        toCatalogLabel("relationship", guestItem.relationship, language),
        guestItem.city,
        guestItem.country
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    list.sort((a, b) => {
      const aCreated = new Date(a.created_at || 0).getTime() || 0;
      const bCreated = new Date(b.created_at || 0).getTime() || 0;
      const aName = `${a.first_name || ""} ${a.last_name || ""}`.trim();
      const bName = `${b.first_name || ""} ${b.last_name || ""}`.trim();
      if (guestSort === "created_asc") {
        return aCreated - bCreated;
      }
      if (guestSort === "name_asc") {
        return aName.localeCompare(bName, language);
      }
      if (guestSort === "name_desc") {
        return bName.localeCompare(aName, language);
      }
      return bCreated - aCreated;
    });
    return list;
  }, [guests, guestSearch, guestContactFilter, guestSort, language]);

  const filteredInvitations = useMemo(() => {
    const term = invitationSearch.trim().toLowerCase();
    const list = invitations.filter((invitation) => {
      if (invitationStatusFilter !== "all" && invitation.status !== invitationStatusFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      const eventName = eventNamesById[invitation.event_id] || invitation.event_id || "";
      const guestName = guestNamesById[invitation.guest_id] || invitation.guest_id || "";
      const haystack = `${eventName} ${guestName} ${invitation.status || ""}`.toLowerCase();
      return haystack.includes(term);
    });

    list.sort((a, b) => {
      const aCreated = new Date(a.created_at || 0).getTime() || 0;
      const bCreated = new Date(b.created_at || 0).getTime() || 0;
      const aResponded = a.responded_at ? new Date(a.responded_at).getTime() || 0 : -1;
      const bResponded = b.responded_at ? new Date(b.responded_at).getTime() || 0 : -1;
      if (invitationSort === "created_asc") {
        return aCreated - bCreated;
      }
      if (invitationSort === "responded_desc") {
        return bResponded - aResponded;
      }
      if (invitationSort === "responded_asc") {
        return aResponded - bResponded;
      }
      return bCreated - aCreated;
    });

    return list;
  }, [invitations, invitationSearch, invitationStatusFilter, invitationSort, eventNamesById, guestNamesById]);

  const eventTotalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PAGE_SIZE));
  const guestTotalPages = Math.max(1, Math.ceil(filteredGuests.length / guestPageSize));
  const invitationTotalPages = Math.max(1, Math.ceil(filteredInvitations.length / INVITATIONS_PAGE_SIZE));

  const pagedEvents = useMemo(() => {
    const start = (eventPage - 1) * EVENTS_PAGE_SIZE;
    return filteredEvents.slice(start, start + EVENTS_PAGE_SIZE);
  }, [filteredEvents, eventPage]);

  const pagedGuests = useMemo(() => {
    const start = (guestPage - 1) * guestPageSize;
    return filteredGuests.slice(start, start + guestPageSize);
  }, [filteredGuests, guestPage, guestPageSize]);

  const pagedInvitations = useMemo(() => {
    const start = (invitationPage - 1) * INVITATIONS_PAGE_SIZE;
    return filteredInvitations.slice(start, start + INVITATIONS_PAGE_SIZE);
  }, [filteredInvitations, invitationPage]);
  const selectedLatestInvitations = useMemo(
    () => selectedLatestInvitationIds.map((invitationId) => invitationsById[invitationId]).filter(Boolean),
    [selectedLatestInvitationIds, invitationsById]
  );

  const mapShareTargetToDraft = useCallback((targetItem) => {
    const status = String(targetItem?.share_status || "inactive").toLowerCase();
    return {
      status: status === "active" || status === "revoked" || status === "expired" ? status : "inactive",
      allow_identity: Boolean(targetItem?.allow_identity),
      allow_food: Boolean(targetItem?.allow_food),
      allow_lifestyle: Boolean(targetItem?.allow_lifestyle),
      allow_conversation: Boolean(targetItem?.allow_conversation),
      allow_health: Boolean(targetItem?.allow_health)
    };
  }, []);

  const loadGlobalProfileData = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      return;
    }

    const defaultFeatureReady = true;
    let nextFeatureReady = defaultFeatureReady;
    let nextGlobalProfileId = "";
    let nextShareTargets = [];
    let nextShareDraftByHostId = {};

    const { data: globalProfileRow, error: globalProfileError } = await supabase
      .from("global_guest_profiles")
      .select("id")
      .eq("owner_user_id", session.user.id)
      .maybeSingle();

    if (globalProfileError) {
      if (isMissingDbFeatureError(globalProfileError, ["global_guest_profiles"])) {
        nextFeatureReady = false;
      } else {
        setGlobalProfileMessage(`${t("global_profile_load_error")} ${globalProfileError.message}`);
        return;
      }
    } else {
      nextGlobalProfileId = String(globalProfileRow?.id || "");
    }

    if (nextFeatureReady && nextGlobalProfileId) {
      const shareTargetsResult = await supabase.rpc("get_my_global_profile_share_targets");
      if (shareTargetsResult.error) {
        if (isMissingDbFeatureError(shareTargetsResult.error, ["get_my_global_profile_share_targets"])) {
          nextFeatureReady = false;
        } else {
          setGlobalProfileMessage(`${t("global_profile_load_error")} ${shareTargetsResult.error.message}`);
          return;
        }
      } else {
        nextShareTargets = Array.isArray(shareTargetsResult.data) ? shareTargetsResult.data : [];
        nextShareDraftByHostId = Object.fromEntries(
          nextShareTargets.map((item) => [item.host_user_id, mapShareTargetToDraft(item)])
        );
      }
    }

    setIsGlobalProfileFeatureReady(nextFeatureReady);
    setGlobalProfileId(nextGlobalProfileId);
    setGlobalShareTargets(nextShareTargets);
    setGlobalShareDraftByHostId(nextShareDraftByHostId);
  }, [mapShareTargetToDraft, session?.user?.id, t]);

  const loadDashboardData = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      return;
    }
    setDashboardError("");
    onPreferencesSynced?.();

    const guestsPromise = supabase
      .from("guests")
      .select(
        "id, first_name, last_name, email, phone, relationship, city, country, address, postal_code, state_region, company, birthday, twitter, instagram, linkedin, last_meet_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    const hostProfilePromise = supabase
      .from("profiles")
      .select("full_name, phone, created_at")
      .eq("id", session.user.id)
      .maybeSingle();

    const invitationsPromise = supabase
      .from("invitations")
      .select("id, event_id, guest_id, status, public_token, created_at, responded_at, updated_at")
      .eq("host_user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    let { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select(
        "id, title, status, event_type, description, allow_plus_one, auto_reminders, dress_code, playlist_mode, start_at, created_at, updated_at, location_name, location_address, location_place_id, location_lat, location_lng"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (
      eventsError &&
      isCompatibilityError(eventsError, [
        "location_place_id",
        "location_lat",
        "location_lng",
        "description",
        "allow_plus_one",
        "auto_reminders",
        "dress_code",
        "playlist_mode"
      ])
    ) {
      const fallback = await supabase
        .from("events")
        .select("id, title, status, event_type, start_at, created_at, updated_at, location_name, location_address")
        .order("created_at", { ascending: false })
        .limit(50);
      eventsData = fallback.data || [];
      eventsError = fallback.error;
    }

    let [
      { data: guestsData, error: guestsError },
      { data: invitationsData, error: invitationsError },
      { data: hostProfileData, error: hostProfileError }
    ] = await Promise.all([guestsPromise, invitationsPromise, hostProfilePromise]);

    if (
      guestsError &&
      isCompatibilityError(guestsError, [
        "postal_code",
        "state_region",
        "address",
        "company",
        "twitter",
        "instagram",
        "linkedin",
        "last_meet_at"
      ])
    ) {
      const fallbackGuests = await supabase
        .from("guests")
        .select("id, first_name, last_name, email, phone, relationship, city, country, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      guestsData = fallbackGuests.data || [];
      guestsError = fallbackGuests.error;
    }

    if (eventsError || guestsError || invitationsError || hostProfileError) {
      setDashboardError(
        eventsError?.message || guestsError?.message || invitationsError?.message || hostProfileError?.message || t("error_load_data")
      );
      return;
    }

    const guestIds = (guestsData || []).map((guest) => guest.id);
    let guestHostConversionRows = [];
    if (guestIds.length > 0) {
      const guestConversionsResult = await supabase.rpc("get_host_guest_conversions");
      if (
        guestConversionsResult.error &&
        !isCompatibilityError(guestConversionsResult.error, ["get_host_guest_conversions"])
      ) {
        setDashboardError(guestConversionsResult.error.message || t("error_load_data"));
        return;
      }
      guestHostConversionRows = guestConversionsResult.data || [];
    }
    let guestPreferencesRows = [];
    let guestSensitiveRows = [];

    if (guestIds.length > 0) {
      let preferencesResult = await supabase
        .from("guest_preferences")
        .select(
          "guest_id, diet_type, tasting_preferences, food_likes, food_dislikes, drink_likes, drink_dislikes, music_genres, favorite_color, books, movies, series, sports, team_fan, punctuality, last_talk_topic, taboo_topics, experience_types, preferred_guest_relationships, preferred_day_moments, periodicity, cuisine_types, pets"
        )
        .in("guest_id", guestIds);

      if (
        preferencesResult.error &&
        isCompatibilityError(preferencesResult.error, [
          "experience_types",
          "preferred_guest_relationships",
          "preferred_day_moments",
          "periodicity",
          "cuisine_types",
          "pets"
        ])
      ) {
        preferencesResult = await supabase
          .from("guest_preferences")
          .select(
            "guest_id, diet_type, tasting_preferences, food_likes, food_dislikes, drink_likes, drink_dislikes, music_genres, favorite_color, books, movies, series, sports, team_fan, punctuality, last_talk_topic, taboo_topics"
          )
          .in("guest_id", guestIds);
      }

      if (preferencesResult.error && !isMissingRelationError(preferencesResult.error, "guest_preferences")) {
        setDashboardError(preferencesResult.error.message || t("error_load_data"));
        return;
      }

      guestPreferencesRows = preferencesResult.data || [];

      const sensitiveResult = await supabase
        .from("guest_sensitive_preferences")
        .select("guest_id, allergies, intolerances, pet_allergies, consent_granted, consent_version, consent_granted_at")
        .in("guest_id", guestIds);

      if (sensitiveResult.error && !isMissingRelationError(sensitiveResult.error, "guest_sensitive_preferences")) {
        setDashboardError(sensitiveResult.error.message || t("error_load_data"));
        return;
      }

      guestSensitiveRows = sensitiveResult.data || [];
    }

    const cachedEventSettingsById = readEventSettingsCache(session.user.id);
    const normalizedEventsData = (eventsData || []).map((eventItem) => {
      const settingsFromRow = normalizeEventSettings(eventItem);
      const settingsFromCache = normalizeEventSettings(cachedEventSettingsById[eventItem.id] || {});
      const rowHasAnyValue = Boolean(
        settingsFromRow.description ||
          settingsFromRow.allow_plus_one ||
          settingsFromRow.auto_reminders ||
          settingsFromRow.dress_code !== "none" ||
          settingsFromRow.playlist_mode !== "host_only"
      );
      const cacheHasAnyValue = Boolean(
        settingsFromCache.description ||
          settingsFromCache.allow_plus_one ||
          settingsFromCache.auto_reminders ||
          settingsFromCache.dress_code !== "none" ||
          settingsFromCache.playlist_mode !== "host_only"
      );
      const shouldUseCache = !hasEventSettingsColumns(eventItem) || (!rowHasAnyValue && cacheHasAnyValue);
      const effectiveSettings = shouldUseCache ? settingsFromCache : settingsFromRow;
      return {
        ...eventItem,
        description: effectiveSettings.description,
        allow_plus_one: effectiveSettings.allow_plus_one,
        auto_reminders: effectiveSettings.auto_reminders,
        dress_code: effectiveSettings.dress_code,
        playlist_mode: effectiveSettings.playlist_mode
      };
    });

    setEvents(normalizedEventsData);
    setEventSettingsCacheById(cachedEventSettingsById);
    setGuests(guestsData || []);
    setInvitations(invitationsData || []);
    setGuestPreferencesById(
      Object.fromEntries((guestPreferencesRows || []).map((preferenceItem) => [preferenceItem.guest_id, preferenceItem]))
    );
    setGuestSensitiveById(
      Object.fromEntries((guestSensitiveRows || []).map((sensitiveItem) => [sensitiveItem.guest_id, sensitiveItem]))
    );
    setGuestHostConversionById(
      Object.fromEntries((guestHostConversionRows || []).map((conversionItem) => [conversionItem.guest_id, conversionItem]))
    );
    const selfEmailKey = normalizeEmailKey(session.user.email || "");
    const selfPhoneKey = normalizePhoneKey(hostProfileData?.phone || "");
    const selfGuest =
      (guestsData || []).find((guestItem) => {
        const guestEmailKey = normalizeEmailKey(guestItem.email || "");
        const guestPhoneKey = normalizePhoneKey(guestItem.phone || "");
        return Boolean((selfEmailKey && guestEmailKey === selfEmailKey) || (selfPhoneKey && guestPhoneKey === selfPhoneKey));
      }) || null;
    setHostProfileName(
      String(hostProfileData?.full_name || "")
        .trim()
        .replace(/\s+/g, " ") || (session.user.email || "").split("@")[0] || ""
    );
    setHostProfilePhone(String(hostProfileData?.phone || "").trim());
    setHostProfileCity(String(selfGuest?.city || "").trim());
    setHostProfileCountry(String(selfGuest?.country || "").trim());
    setHostProfileRelationship(toCatalogLabel("relationship", selfGuest?.relationship, language));
    setHostProfileCreatedAt(String(hostProfileData?.created_at || "").trim());
    await loadGlobalProfileData();
  }, [session?.user?.id, session?.user?.email, language, t, onPreferencesSynced, loadGlobalProfileData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
      return;
    }
    if (selectedEventId && !events.find((event) => event.id === selectedEventId)) {
      setSelectedEventId(events[0]?.id || "");
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!selectedEventDetailId && events.length > 0) {
      setSelectedEventDetailId(events[0].id);
      return;
    }
    if (selectedEventDetailId && !events.find((eventItem) => eventItem.id === selectedEventDetailId)) {
      setSelectedEventDetailId(events[0]?.id || "");
    }
  }, [events, selectedEventDetailId]);

  useEffect(() => {
    if (editingEventId) {
      setInsightsEventId(editingEventId);
      return;
    }
    if (!insightsEventId && events.length > 0) {
      setInsightsEventId(events[0].id);
      return;
    }
    if (insightsEventId && !events.find((event) => event.id === insightsEventId)) {
      setInsightsEventId(events[0]?.id || "");
    }
  }, [events, insightsEventId, editingEventId]);

  useEffect(() => {
    if (guests.length === 0) {
      if (selectedGuestId) {
        setSelectedGuestId("");
      }
      return;
    }
    const selectedStillExists = guests.some((guestItem) => guestItem.id === selectedGuestId);
    const selectedStillAvailable =
      selectedStillExists && !invitedGuestIdsForSelectedEvent.has(selectedGuestId);
    if (selectedStillAvailable) {
      return;
    }
    const firstAvailableGuestId = availableGuestsForSelectedEvent[0]?.id || "";
    if (selectedGuestId !== firstAvailableGuestId) {
      setSelectedGuestId(firstAvailableGuestId);
    }
  }, [guests, selectedGuestId, invitedGuestIdsForSelectedEvent, availableGuestsForSelectedEvent]);

  useEffect(() => {
    if (bulkInvitationGuestIds.length === 0) {
      return;
    }
    const availableIds = new Set(availableGuestsForSelectedEvent.map((guestItem) => guestItem.id));
    const filteredIds = bulkInvitationGuestIds.filter((guestId) => availableIds.has(guestId));
    if (filteredIds.length !== bulkInvitationGuestIds.length) {
      setBulkInvitationGuestIds(filteredIds);
    }
  }, [bulkInvitationGuestIds, availableGuestsForSelectedEvent]);

  useEffect(() => {
    if (selectedLatestInvitationIds.length === 0) {
      return;
    }
    const currentIds = new Set(invitations.map((invitationItem) => invitationItem.id));
    const filteredIds = selectedLatestInvitationIds.filter((invitationId) => currentIds.has(invitationId));
    if (filteredIds.length !== selectedLatestInvitationIds.length) {
      setSelectedLatestInvitationIds(filteredIds);
    }
  }, [selectedLatestInvitationIds, invitations]);

  useEffect(() => {
    if (!selectedGuestDetailId && guests.length > 0) {
      setSelectedGuestDetailId(guests[0].id);
      return;
    }
    if (selectedGuestDetailId && !guests.find((guestItem) => guestItem.id === selectedGuestDetailId)) {
      setSelectedGuestDetailId(guests[0]?.id || "");
    }
  }, [guests, selectedGuestDetailId]);

  useEffect(() => {
    if (activeView !== "profile") {
      return;
    }
    if (guestFirstName || guestLastName || guestEmail || guestPhone || guestCity || guestCountry || guestRelationship) {
      return;
    }
    syncHostGuestProfileForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  useEffect(() => {
    if (!editingEventId) {
      return;
    }
    if (!events.find((event) => event.id === editingEventId)) {
      setEditingEventId("");
    }
  }, [events, editingEventId]);

  useEffect(() => {
    setEventType((prev) => (prev ? toCatalogLabel("experience_type", prev, language) : prev));
    setGuestRelationship((prev) => (prev ? toCatalogLabel("relationship", prev, language) : prev));
    setHostProfileRelationship((prev) => (prev ? toCatalogLabel("relationship", prev, language) : prev));
    setGuestAdvanced((prev) => ({
      ...prev,
      experienceTypes: translateCatalogInputList("experience_type", prev.experienceTypes, language),
      preferredGuestRelationships: translateCatalogInputList(
        "relationship",
        prev.preferredGuestRelationships,
        language
      ),
      preferredDayMoments: translateCatalogInputList("day_moment", prev.preferredDayMoments, language),
      periodicity: toCatalogLabel("periodicity", prev.periodicity, language),
      cuisineTypes: translateCatalogInputList("cuisine_type", prev.cuisineTypes, language),
      dietType: toCatalogLabel("diet_type", prev.dietType, language),
      tastingPreferences: translateCatalogInputList("tasting_preference", prev.tastingPreferences, language),
      drinkLikes: translateCatalogInputList("drink", prev.drinkLikes, language),
      drinkDislikes: translateCatalogInputList("drink", prev.drinkDislikes, language),
      allergies: translateCatalogInputList("allergy", prev.allergies, language),
      intolerances: translateCatalogInputList("intolerance", prev.intolerances, language),
      petAllergies: listToInput(toPetAllergyLabels(splitListInput(prev.petAllergies), language)),
      pets: translateCatalogInputList("pet", prev.pets, language),
      musicGenres: translateCatalogInputList("music_genre", prev.musicGenres, language),
      favoriteColor: toCatalogLabel("color", prev.favoriteColor, language),
      sports: translateCatalogInputList("sport", prev.sports, language),
      punctuality: toCatalogLabel("punctuality", prev.punctuality, language)
    }));
  }, [language]);

  useEffect(() => {
    setEventPage(1);
  }, [eventSearch, eventStatusFilter, eventSort]);

  useEffect(() => {
    setGuestPage(1);
  }, [guestSearch, guestContactFilter, guestSort, guestPageSize]);

  useEffect(() => {
    setInvitationPage(1);
  }, [invitationSearch, invitationStatusFilter, invitationSort]);

  useEffect(() => {
    if (!eventSettingsStorageKey || !session?.user?.id) {
      setEventSettingsCacheById({});
      return;
    }
    setEventSettingsCacheById(readEventSettingsCache(session.user.id));
  }, [eventSettingsStorageKey, session?.user?.id]);

  useEffect(() => {
    if (!guestGeocodeStorageKey || !session?.user?.id) {
      setGuestGeocodeById({});
      return;
    }
    setGuestGeocodeById(readGuestGeoCache(session.user.id));
  }, [guestGeocodeStorageKey, session?.user?.id]);

  useEffect(() => {
    if (mapsStatus !== "ready" || !session?.user?.id || !geocoderRef.current || guests.length === 0) {
      return;
    }
    const missingGuests = guests
      .filter((guestItem) => {
        const normalizedAddress = String(guestItem.address || "").trim();
        return normalizedAddress && !guestGeocodeById[guestItem.id] && !guestGeocodePendingRef.current.has(guestItem.id);
      })
      .slice(0, 3);
    if (missingGuests.length === 0) {
      return;
    }
    missingGuests.forEach((guestItem) => {
      const normalizedAddress = String(guestItem.address || "").trim();
      guestGeocodePendingRef.current.add(guestItem.id);
      geocoderRef.current.geocode({ address: normalizedAddress }, (results, status) => {
        guestGeocodePendingRef.current.delete(guestItem.id);
        const resolved = status === "OK" && results?.[0] ? results[0] : null;
        const lat = resolved?.geometry?.location?.lat?.() ?? null;
        const lng = resolved?.geometry?.location?.lng?.() ?? null;
        const formattedAddress = resolved?.formatted_address || normalizedAddress;
        setGuestGeocodeById((prev) => {
          const next = {
            ...(prev || {}),
            [guestItem.id]: {
              lat: typeof lat === "number" ? lat : null,
              lng: typeof lng === "number" ? lng : null,
              address: formattedAddress
            }
          };
          writeGuestGeoCache(session.user.id, next);
          return next;
        });
      });
    });
  }, [mapsStatus, session?.user?.id, guests, guestGeocodeById]);

  useEffect(() => {
    if (eventPage > eventTotalPages) {
      setEventPage(eventTotalPages);
    }
  }, [eventPage, eventTotalPages]);

  useEffect(() => {
    if (guestPage > guestTotalPages) {
      setGuestPage(guestTotalPages);
    }
  }, [guestPage, guestTotalPages]);

  useEffect(() => {
    if (invitationPage > invitationTotalPages) {
      setInvitationPage(invitationTotalPages);
    }
  }, [invitationPage, invitationTotalPages]);

  useEffect(() => {
    if (!prefsStorageKey) {
      setPrefsReady(false);
      return;
    }
    try {
      const raw = window.localStorage.getItem(prefsStorageKey);
      if (!raw) {
        setPrefsReady(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (typeof parsed?.eventSearch === "string") {
        setEventSearch(parsed.eventSearch);
      }
      if (typeof parsed?.eventStatusFilter === "string") {
        setEventStatusFilter(parsed.eventStatusFilter);
      }
      if (typeof parsed?.eventSort === "string") {
        setEventSort(parsed.eventSort);
      }
      if (typeof parsed?.guestSearch === "string") {
        setGuestSearch(parsed.guestSearch);
      }
      if (typeof parsed?.guestContactFilter === "string") {
        setGuestContactFilter(parsed.guestContactFilter);
      }
      if (typeof parsed?.guestSort === "string") {
        setGuestSort(parsed.guestSort);
      }
      if (PAGE_SIZE_OPTIONS.includes(Number(parsed?.guestPageSize))) {
        setGuestPageSize(Number(parsed.guestPageSize));
      }
      if (typeof parsed?.invitationSearch === "string") {
        setInvitationSearch(parsed.invitationSearch);
      }
      if (typeof parsed?.invitationStatusFilter === "string") {
        setInvitationStatusFilter(parsed.invitationStatusFilter);
      }
      if (typeof parsed?.invitationSort === "string") {
        setInvitationSort(parsed.invitationSort);
      }
      const validViews = [...VIEW_CONFIG.map((item) => item.key), "profile"];
      if (typeof parsed?.activeView === "string" && validViews.includes(parsed.activeView)) {
        setActiveView(parsed.activeView);
      }
      const validEventsWorkspace = getWorkspaceItemsByView("events", true).map((item) => item.key);
      if (typeof parsed?.eventsWorkspace === "string" && validEventsWorkspace.includes(parsed.eventsWorkspace)) {
        setEventsWorkspace(parsed.eventsWorkspace === "hub" ? "latest" : parsed.eventsWorkspace);
      }
      const validGuestsWorkspace = getWorkspaceItemsByView("guests", true).map((item) => item.key);
      if (typeof parsed?.guestsWorkspace === "string" && validGuestsWorkspace.includes(parsed.guestsWorkspace)) {
        setGuestsWorkspace(parsed.guestsWorkspace === "hub" ? "latest" : parsed.guestsWorkspace);
      }
      const validInvitationsWorkspace = getWorkspaceItemsByView("invitations", true).map((item) => item.key);
      if (
        typeof parsed?.invitationsWorkspace === "string" &&
        validInvitationsWorkspace.includes(parsed.invitationsWorkspace)
      ) {
        setInvitationsWorkspace(parsed.invitationsWorkspace === "hub" ? "latest" : parsed.invitationsWorkspace);
      }
      if (typeof parsed?.mobileExpandedView === "string" && validViews.includes(parsed.mobileExpandedView)) {
        setMobileExpandedView(parsed.mobileExpandedView);
      }
      if (typeof parsed?.showInvitationBulkActions === "boolean") {
        setShowInvitationBulkActions(parsed.showInvitationBulkActions);
      }
    } catch {
      // Ignore malformed local settings and continue with defaults.
    }
    setPrefsReady(true);
  }, [prefsStorageKey]);

  useEffect(() => {
    if (!prefsReady || !prefsStorageKey) {
      return;
    }
    const payload = {
      eventSearch,
      eventStatusFilter,
      eventSort,
      guestSearch,
      guestContactFilter,
      guestSort,
      guestPageSize,
      invitationSearch,
      invitationStatusFilter,
      invitationSort,
      activeView,
      eventsWorkspace,
      guestsWorkspace,
      invitationsWorkspace,
      mobileExpandedView,
      showInvitationBulkActions
    };
    window.localStorage.setItem(prefsStorageKey, JSON.stringify(payload));
  }, [
    eventSearch,
    eventStatusFilter,
    eventSort,
    guestSearch,
    guestContactFilter,
    guestSort,
    guestPageSize,
    invitationSearch,
    invitationStatusFilter,
    invitationSort,
    activeView,
    eventsWorkspace,
    guestsWorkspace,
    invitationsWorkspace,
    mobileExpandedView,
    showInvitationBulkActions,
    prefsReady,
    prefsStorageKey
  ]);

  useEffect(() => {
    if (!deleteTarget) {
      return;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setDeleteTarget(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget]);

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      return;
    }
    let cancelled = false;
    loadGoogleMapsPlaces()
      .then((googleInstance) => {
        if (cancelled) {
          return;
        }
        autocompleteServiceRef.current = new googleInstance.maps.places.AutocompleteService();
        geocoderRef.current = new googleInstance.maps.Geocoder();
        setMapsStatus("ready");
        setMapsError("");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setMapsStatus("error");
        setMapsError(error.message || "Google Maps unavailable.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mapsStatus !== "ready") {
      return;
    }
    const query = eventLocationAddress.trim();
    if (query.length < 4) {
      setAddressPredictions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setIsAddressLoading(true);
      autocompleteServiceRef.current?.getPlacePredictions(
        {
          input: query,
          types: ["address"]
        },
        (predictions) => {
          setIsAddressLoading(false);
          setAddressPredictions(predictions || []);
        }
      );
    }, 250);

    return () => window.clearTimeout(timer);
  }, [eventLocationAddress, mapsStatus]);

  useEffect(() => {
    if (mapsStatus !== "ready") {
      return;
    }
    const query = guestAdvanced.address.trim();
    if (query.length < 4) {
      setGuestAddressPredictions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setIsGuestAddressLoading(true);
      autocompleteServiceRef.current?.getPlacePredictions(
        {
          input: query,
          types: ["address"]
        },
        (predictions) => {
          setIsGuestAddressLoading(false);
          setGuestAddressPredictions(predictions || []);
        }
      );
    }, 250);

    return () => window.clearTimeout(timer);
  }, [guestAdvanced.address, mapsStatus]);

  const handleSelectAddressPrediction = (prediction) => {
    if (!prediction) {
      return;
    }
    const predictedAddress = prediction.description || "";
    const matchedByAddress = findUniqueLocationByAddress(predictedAddress);
    setEventLocationAddress(predictedAddress);
    if (matchedByAddress?.name) {
      setEventLocationName(matchedByAddress.name);
    }
    setAddressPredictions([]);
    setEventErrors((prev) => ({ ...prev, locationAddress: undefined }));
    setEventMessage("");

    const geocoder = geocoderRef.current;
    if (!geocoder) {
      setSelectedPlace({
        placeId: prediction.place_id,
        formattedAddress: predictedAddress,
        lat: null,
        lng: null
      });
      return;
    }

    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const result = results[0];
        const formattedAddress = result.formatted_address || predictedAddress;
        const knownPair = findUniqueLocationByAddress(formattedAddress);
        const lat = result.geometry?.location?.lat?.() ?? null;
        const lng = result.geometry?.location?.lng?.() ?? null;
        if (knownPair?.name) {
          setEventLocationName(knownPair.name);
        }
        setEventLocationAddress(formattedAddress);
        setSelectedPlace({
          placeId: prediction.place_id,
          formattedAddress,
          lat,
          lng
        });
      } else {
        setSelectedPlace({
          placeId: prediction.place_id,
          formattedAddress: predictedAddress,
          lat: null,
          lng: null
        });
      }
    });
  };

  const handleSelectGuestAddressPrediction = (prediction) => {
    if (!prediction) {
      return;
    }
    const predictedAddress = prediction.description || "";
    setGuestAdvancedField("address", predictedAddress);
    setGuestAddressPredictions([]);
    setGuestErrors((prev) => ({ ...prev, address: undefined }));
    setGuestMessage("");

    const geocoder = geocoderRef.current;
    if (!geocoder) {
      setSelectedGuestAddressPlace({
        placeId: prediction.place_id,
        formattedAddress: predictedAddress,
        lat: null,
        lng: null
      });
      return;
    }

    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const result = results[0];
        const formattedAddress = result.formatted_address || predictedAddress;
        const lat = result.geometry?.location?.lat?.() ?? null;
        const lng = result.geometry?.location?.lng?.() ?? null;
        setGuestAdvancedField("address", formattedAddress);
        setSelectedGuestAddressPlace({
          placeId: prediction.place_id,
          formattedAddress,
          lat,
          lng
        });
      } else {
        setSelectedGuestAddressPlace({
          placeId: prediction.place_id,
          formattedAddress: predictedAddress,
          lat: null,
          lng: null
        });
      }
    });
  };

  const setGuestAdvancedField = (field, value) => {
    setGuestAdvanced((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAdvancedMultiSelectChange = (field, nextValue) => {
    setGuestAdvancedField(field, nextValue);
  };

  const getGuestAdvancedState = (guestItem) => {
    const preferenceItem = guestPreferencesById[guestItem?.id] || {};
    const sensitiveItem = guestSensitiveById[guestItem?.id] || {};
    const hasSensitiveValues =
      toList(sensitiveItem.allergies).length > 0 ||
      toList(sensitiveItem.intolerances).length > 0 ||
      toList(sensitiveItem.pet_allergies).length > 0;

    return {
      address: guestItem?.address || "",
      postalCode: guestItem?.postal_code || "",
      stateRegion: guestItem?.state_region || "",
      company: guestItem?.company || "",
      birthday: guestItem?.birthday || "",
      twitter: guestItem?.twitter || "",
      instagram: guestItem?.instagram || "",
      linkedIn: guestItem?.linkedin || "",
      lastMeetAt: guestItem?.last_meet_at || "",
      experienceTypes: listToInput(toCatalogLabels("experience_type", preferenceItem.experience_types || [], language)),
      preferredGuestRelationships: listToInput(
        toCatalogLabels("relationship", preferenceItem.preferred_guest_relationships || [], language)
      ),
      preferredDayMoments: listToInput(toCatalogLabels("day_moment", preferenceItem.preferred_day_moments || [], language)),
      periodicity: toCatalogLabel("periodicity", preferenceItem.periodicity, language),
      cuisineTypes: listToInput(toCatalogLabels("cuisine_type", preferenceItem.cuisine_types || [], language)),
      dietType: toCatalogLabel("diet_type", preferenceItem.diet_type, language),
      tastingPreferences: listToInput(
        toCatalogLabels("tasting_preference", preferenceItem.tasting_preferences || [], language)
      ),
      foodLikes: listToInput(preferenceItem.food_likes),
      foodDislikes: listToInput(preferenceItem.food_dislikes),
      drinkLikes: listToInput(toCatalogLabels("drink", preferenceItem.drink_likes || [], language)),
      drinkDislikes: listToInput(toCatalogLabels("drink", preferenceItem.drink_dislikes || [], language)),
      allergies: listToInput(toCatalogLabels("allergy", sensitiveItem.allergies || [], language)),
      intolerances: listToInput(toCatalogLabels("intolerance", sensitiveItem.intolerances || [], language)),
      petAllergies: listToInput(toPetAllergyLabels(sensitiveItem.pet_allergies || [], language)),
      pets: listToInput(toCatalogLabels("pet", preferenceItem.pets || [], language)),
      musicGenres: listToInput(toCatalogLabels("music_genre", preferenceItem.music_genres || [], language)),
      favoriteColor: toCatalogLabel("color", preferenceItem.favorite_color, language),
      books: listToInput(preferenceItem.books),
      movies: listToInput(preferenceItem.movies),
      series: listToInput(preferenceItem.series),
      sports: listToInput(toCatalogLabels("sport", preferenceItem.sports || [], language)),
      teamFan: preferenceItem.team_fan || "",
      punctuality: toCatalogLabel("punctuality", preferenceItem.punctuality, language),
      lastTalkTopic: preferenceItem.last_talk_topic || "",
      tabooTopics: listToInput(preferenceItem.taboo_topics),
      sensitiveConsent: Boolean(sensitiveItem.consent_granted || hasSensitiveValues)
    };
  };

  const setWorkspaceByView = (viewKey, workspaceKey) => {
    if (viewKey === "events") {
      setEventsWorkspace(workspaceKey);
      return;
    }
    if (viewKey === "guests") {
      setGuestsWorkspace(workspaceKey);
      return;
    }
    if (viewKey === "invitations") {
      setInvitationsWorkspace(workspaceKey);
    }
  };

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
    setMobileMenuDepth("root");
  };

  const toggleMobileMenu = () => {
    setIsMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setMobileExpandedView(activeView);
        setMobileMenuDepth("root");
      }
      return next;
    });
  };

  const openWorkspace = (viewKey, workspaceKey) => {
    if (viewKey === "events" && workspaceKey === "create") {
      handleCancelEditEvent();
    }
    if (viewKey === "guests" && workspaceKey === "create") {
      handleCancelEditGuest();
    }
    setActiveView(viewKey);
    setWorkspaceByView(viewKey, workspaceKey);
    setMobileExpandedView(viewKey);
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const syncHostGuestProfileForm = () => {
    const fallbackName = (session?.user?.email || "").split("@")[0] || t("field_guest");
    const normalizedFullName =
      String(hostProfileName || "")
        .trim()
        .replace(/\s+/g, " ") || fallbackName;
    const { firstName, lastName } = splitFullName(normalizedFullName);
    const linkedGuest = selfGuestCandidate;

    if (linkedGuest) {
      setEditingGuestId(linkedGuest.id);
      setGuestFirstName(linkedGuest.first_name || firstName || fallbackName);
      setGuestLastName(linkedGuest.last_name || lastName || "");
      setGuestEmail(linkedGuest.email || session?.user?.email || "");
      setGuestPhone(linkedGuest.phone || hostProfilePhone || "");
      setGuestRelationship(toCatalogLabel("relationship", linkedGuest.relationship, language));
      setGuestCity(linkedGuest.city || hostProfileCity || "");
      setGuestCountry(linkedGuest.country || hostProfileCountry || "");
      setGuestAdvanced(getGuestAdvancedState(linkedGuest));
      setSelectedGuestAddressPlace(
        linkedGuest.address
          ? {
              placeId: null,
              formattedAddress: linkedGuest.address,
              lat: null,
              lng: null
            }
          : null
      );
    } else {
      setEditingGuestId("");
      setGuestFirstName(firstName || fallbackName);
      setGuestLastName(lastName || "");
      setGuestEmail(session?.user?.email || "");
      setGuestPhone(hostProfilePhone || "");
      setGuestRelationship(hostProfileRelationship || "");
      setGuestCity(hostProfileCity || "");
      setGuestCountry(hostProfileCountry || "");
      setGuestAdvanced(GUEST_ADVANCED_INITIAL_STATE);
      setSelectedGuestAddressPlace(null);
    }
    setGuestAddressPredictions([]);
    setGuestErrors({});
    setGuestMessage("");
  };

  const openHostProfile = () => {
    syncHostGuestProfileForm();
    setActiveView("profile");
    setMobileExpandedView("overview");
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const openEventDetail = (eventId) => {
    const fallbackEventId = eventId || events[0]?.id || "";
    if (!fallbackEventId) {
      return;
    }
    setEventsMapFocusId(fallbackEventId);
    setSelectedEventDetailId(fallbackEventId);
    setActiveView("events");
    setEventsWorkspace("detail");
    setMobileExpandedView("events");
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const openGuestDetail = (guestId) => {
    const fallbackGuestId = guestId || guests[0]?.id || "";
    if (!fallbackGuestId) {
      return;
    }
    setGuestsMapFocusId(fallbackGuestId);
    setSelectedGuestDetailId(fallbackGuestId);
    setActiveView("guests");
    setGuestsWorkspace("detail");
    setMobileExpandedView("guests");
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const openInvitationCreate = ({ eventId = "", guestId = "", messageKey = "" } = {}) => {
    let nextEventId = eventId || selectedEventId || events[0]?.id || "";
    let nextGuestId = guestId || selectedGuestId || "";

    if (nextEventId && nextGuestId && invitedGuestIdsByEvent.get(nextEventId)?.has(nextGuestId)) {
      const firstAlternativeGuest = guests.find((guestItem) => !invitedGuestIdsByEvent.get(nextEventId)?.has(guestItem.id));
      if (firstAlternativeGuest) {
        nextGuestId = firstAlternativeGuest.id;
      } else {
        const firstAlternativeEvent = events.find(
          (eventItem) => !invitedGuestIdsByEvent.get(eventItem.id)?.has(nextGuestId)
        );
        if (firstAlternativeEvent) {
          nextEventId = firstAlternativeEvent.id;
        }
      }
    }

    if (!nextGuestId && nextEventId) {
      const firstAvailableGuest = guests.find((guestItem) => !invitedGuestIdsByEvent.get(nextEventId)?.has(guestItem.id));
      nextGuestId = firstAvailableGuest?.id || "";
    }
    if (!nextEventId && nextGuestId) {
      const firstAvailableEvent = events.find((eventItem) => !invitedGuestIdsByEvent.get(eventItem.id)?.has(nextGuestId));
      nextEventId = firstAvailableEvent?.id || events[0]?.id || "";
    }

    if (nextEventId) {
      setSelectedEventId(nextEventId);
    }
    if (nextGuestId) {
      setSelectedGuestId(nextGuestId);
    }
    setActiveView("invitations");
    setInvitationsWorkspace("create");
    setInvitationErrors({});
    setLastInvitationUrl("");
    setLastInvitationShareText("");
    setLastInvitationShareSubject("");
    setSelectedLatestInvitationIds([]);
    setBulkInvitationGuestIds([]);
    setBulkInvitationSearch("");
    if (messageKey) {
      setInvitationMessage(t(messageKey));
    }
    setMobileExpandedView("invitations");
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const changeView = (nextView) => {
    setActiveView(nextView);
    setMobileExpandedView(nextView);
    if (nextView === "events" || nextView === "guests" || nextView === "invitations") {
      setWorkspaceByView(nextView, "latest");
    }
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const handleOpenMobileSectionPanel = (viewKey, hasChildren) => {
    if (!hasChildren) {
      changeView(viewKey);
      return;
    }
    setActiveView(viewKey);
    setMobileExpandedView(viewKey);
    setMobileMenuDepth("sub");
  };

  useEffect(() => {
    if (isMenuOpen) {
      setMobileExpandedView(activeView);
      setMobileMenuDepth("root");
    }
  }, [isMenuOpen, activeView]);

  useEffect(() => {
    if (!isNotificationMenuOpen) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (!notificationMenuRef.current?.contains(event.target)) {
        setIsNotificationMenuOpen(false);
      }
    };
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsNotificationMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isNotificationMenuOpen]);

  const handleApplyEventTemplate = (templateKey) => {
    const templateItem = eventTemplates.find((item) => item.key === templateKey);
    if (!templateItem) {
      return;
    }
    setEventType(templateItem.eventTypeLabel || toCatalogLabel("experience_type", templateItem.typeCode, language));
    setEventStatus("draft");
    setEventErrors((prev) => ({ ...prev, eventType: undefined, title: undefined }));
    setEventMessage(`${t("event_template_applied")} ${t(templateItem.titleKey)}`);
    if (!String(eventTitle || "").trim() || !isEditingEvent) {
      setEventTitle(t(templateItem.titleKey));
    }
    if (!eventStartAt) {
      setEventStartAt(getSuggestedEventDateTime(templateItem.defaultHour));
    }
    setEventAutoReminders(true);
    setEventAllowPlusOne(templateItem.key !== "date_night");
    if (templateItem.key === "anniversary" || templateItem.key === "date_night") {
      setEventDressCode("elegant");
    } else if (templateItem.key === "bbq") {
      setEventDressCode("casual");
    } else {
      setEventDressCode("none");
    }
    setEventPlaylistMode(templateItem.key === "book_club" ? "collaborative" : "host_only");
  };

  const resolveCreatedGuestId = useCallback(
    async ({ firstName, lastName, email, phone, address }) => {
      if (!supabase || !session?.user?.id) {
        return "";
      }
      const normalizedFirstName = normalizeLookupValue(firstName);
      if (!normalizedFirstName) {
        return "";
      }
      const { data, error } = await supabase
        .from("guests")
        .select("id, first_name, last_name, email, phone, address, created_at")
        .eq("host_user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error || !Array.isArray(data)) {
        return "";
      }
      const normalizedLastName = normalizeLookupValue(lastName);
      const normalizedEmail = normalizeLookupValue(email);
      const normalizedPhone = normalizeLookupValue(phone);
      const normalizedAddress = normalizeLookupValue(address);
      const matched = data.find((guestItem) => {
        if (normalizeLookupValue(guestItem.first_name) !== normalizedFirstName) {
          return false;
        }
        if (normalizedLastName && normalizeLookupValue(guestItem.last_name) !== normalizedLastName) {
          return false;
        }
        const hasContactMatch =
          (normalizedEmail && normalizeLookupValue(guestItem.email) === normalizedEmail) ||
          (normalizedPhone && normalizeLookupValue(guestItem.phone) === normalizedPhone);
        const hasAddressMatch =
          normalizedAddress && normalizeLookupValue(guestItem.address) === normalizedAddress;
        return hasContactMatch || hasAddressMatch;
      });
      return matched?.id || "";
    },
    [session?.user?.id]
  );

  const handleStartEditEvent = (eventItem) => {
    if (!eventItem) {
      return;
    }
    const eventSettings = normalizeEventSettings(eventItem);
    setActiveView("events");
    setSelectedEventDetailId(eventItem.id);
    setEventsWorkspace("create");
    setEditingEventId(eventItem.id);
    setEventTitle(eventItem.title || "");
    setEventType(toCatalogLabel("experience_type", eventItem.event_type, language));
    setEventStatus(String(eventItem.status || "draft"));
    setEventDescription(eventSettings.description);
    setEventStartAt(toLocalDateTimeInput(eventItem.start_at));
    setEventLocationName(eventItem.location_name || "");
    setEventLocationAddress(eventItem.location_address || "");
    setEventAllowPlusOne(eventSettings.allow_plus_one);
    setEventAutoReminders(eventSettings.auto_reminders);
    setEventDressCode(eventSettings.dress_code);
    setEventPlaylistMode(eventSettings.playlist_mode);
    setSelectedPlace(
      eventItem.location_address || eventItem.location_place_id || eventItem.location_lat != null || eventItem.location_lng != null
        ? {
            placeId: eventItem.location_place_id || null,
            formattedAddress: eventItem.location_address || "",
            lat: typeof eventItem.location_lat === "number" ? eventItem.location_lat : null,
            lng: typeof eventItem.location_lng === "number" ? eventItem.location_lng : null
          }
        : null
    );
    setAddressPredictions([]);
    setEventErrors({});
    setEventMessage("");
  };

  const handleCancelEditEvent = () => {
    setEditingEventId("");
    setEventTitle("");
    setEventType("");
    setEventStatus("draft");
    setEventDescription("");
    setEventStartAt("");
    setEventLocationName("");
    setEventLocationAddress("");
    setEventAllowPlusOne(false);
    setEventAutoReminders(false);
    setEventDressCode("none");
    setEventPlaylistMode("host_only");
    setAddressPredictions([]);
    setSelectedPlace(null);
    setEventErrors({});
    setEventMessage("");
  };

  const handleSaveEvent = async (event) => {
    event.preventDefault();
    if (!supabase || !session?.user?.id) {
      return;
    }
    setEventMessage("");

    const validation = validateEventForm({
      title: eventTitle,
      eventType,
      description: eventDescription,
      dressCode: eventDressCode,
      playlistMode: eventPlaylistMode,
      locationName: eventLocationName,
      locationAddress: eventLocationAddress
    });

    if (!validation.success) {
      setEventErrors(validation.errors);
      const firstError = validation.errors[Object.keys(validation.errors)[0]];
      setEventMessage(t(firstError || "error_create_event"));
      return;
    }

    const hasAddressValidationForEdit =
      isEditingEvent &&
      selectedPlace &&
      selectedPlace.formattedAddress &&
      selectedPlace.formattedAddress === eventLocationAddress.trim();
    if (mapsStatus === "ready" && eventLocationAddress.trim() && !selectedPlace?.placeId && !hasAddressValidationForEdit) {
      setEventErrors((prev) => ({ ...prev, locationAddress: "address_select_suggestion_required" }));
      setEventMessage(t("address_select_suggestion_required"));
      return;
    }

    setEventErrors({});
    setIsSavingEvent(true);
    const normalizedSettings = normalizeEventSettings({
      description: eventDescription,
      allow_plus_one: eventAllowPlusOne,
      auto_reminders: eventAutoReminders,
      dress_code: eventDressCode,
      playlist_mode: eventPlaylistMode
    });
    const normalizedAddress = selectedPlace?.formattedAddress || eventLocationAddress;
    const basePayload = {
      title: eventTitle.trim(),
      event_type: toNullable(toCatalogCode("experience_type", eventType)),
      status: String(eventStatus || "draft"),
      description: toNullable(normalizedSettings.description),
      allow_plus_one: normalizedSettings.allow_plus_one,
      auto_reminders: normalizedSettings.auto_reminders,
      dress_code: normalizedSettings.dress_code,
      playlist_mode: normalizedSettings.playlist_mode,
      content_language: language,
      start_at: toIsoDateTime(eventStartAt),
      timezone,
      location_name: toNullable(eventLocationName),
      location_address: toNullable(normalizedAddress),
      location_place_id: selectedPlace?.placeId || null,
      location_lat: selectedPlace?.lat ?? null,
      location_lng: selectedPlace?.lng ?? null
    };
    const fallbackPayload = {
      title: eventTitle.trim(),
      event_type: toNullable(toCatalogCode("experience_type", eventType)),
      status: String(eventStatus || "draft"),
      start_at: toIsoDateTime(eventStartAt),
      timezone,
      location_name: toNullable(eventLocationName),
      location_address: toNullable(normalizedAddress)
    };

    let error = null;
    let savedEventId = isEditingEvent ? editingEventId : "";
    if (isEditingEvent) {
      const updateResult = await supabase
        .from("events")
        .update(basePayload)
        .eq("id", editingEventId)
        .eq("host_user_id", session.user.id);
      error = updateResult.error;
    } else {
      const insertResult = await supabase
        .from("events")
        .insert({
          ...basePayload,
          host_user_id: session.user.id
        })
        .select("id")
        .single();
      error = insertResult.error;
      savedEventId = insertResult.data?.id || "";
    }

    if (
      error &&
      (error.code === "42703" ||
        error.message?.toLowerCase().includes("description") ||
        error.message?.toLowerCase().includes("allow_plus_one") ||
        error.message?.toLowerCase().includes("auto_reminders") ||
        error.message?.toLowerCase().includes("dress_code") ||
        error.message?.toLowerCase().includes("playlist_mode") ||
        error.message?.toLowerCase().includes("content_language") ||
        error.message?.toLowerCase().includes("location_place_id") ||
        error.message?.toLowerCase().includes("location_lat") ||
        error.message?.toLowerCase().includes("location_lng"))
    ) {
      const fallbackResult = isEditingEvent
        ? await supabase.from("events").update(fallbackPayload).eq("id", editingEventId).eq("host_user_id", session.user.id)
        : await supabase
            .from("events")
            .insert({
              ...fallbackPayload,
              host_user_id: session.user.id
            })
            .select("id")
            .single();
      error = fallbackResult.error;
      if (!isEditingEvent) {
        savedEventId = fallbackResult.data?.id || savedEventId;
      }
    }
    setIsSavingEvent(false);

    if (error) {
      setEventMessage(`${isEditingEvent ? t("error_update_event") : t("error_create_event")} ${error.message}`);
      return;
    }

    if (savedEventId) {
      upsertEventSettingsCache(savedEventId, normalizedSettings);
    }

    if (isEditingEvent) {
      setEventMessage(t("event_updated_continue_edit"));
      await loadDashboardData();
      return;
    }

    setEditingEventId("");
    setEventTitle("");
    setEventType("");
    setEventStatus("draft");
    setEventDescription("");
    setEventStartAt("");
    setEventLocationName("");
    setEventLocationAddress("");
    setEventAllowPlusOne(false);
    setEventAutoReminders(false);
    setEventDressCode("none");
    setEventPlaylistMode("host_only");
    setAddressPredictions([]);
    setSelectedPlace(null);
    setEventMessage(t("event_created"));
    await loadDashboardData();
  };

  const previewImportedContacts = (sourceText, sourceType = "text") => {
    const rawText = String(sourceText || "");
    let parsedContacts = [];
    if (sourceType === "vcf") {
      parsedContacts = parseContactsFromVcf(rawText);
    } else {
      parsedContacts = parseContactsFromCsv(rawText);
      if (parsedContacts.length === 0) {
        parsedContacts = parseContactsFromText(rawText);
      }
    }
    setImportContactsPreview(parsedContacts);
    setImportDuplicateMode("skip");
    if (parsedContacts.length === 0) {
      setImportContactsMessage(t("contact_import_no_matches"));
      return;
    }
    setImportContactsMessage(`${t("contact_import_preview_ready")} ${parsedContacts.length}.`);
    setImportContactsSearch("");
    setImportContactsGroupFilter("all");
    setImportContactsPage(1);
  };

  const handlePreviewContactsFromDraft = () => {
    previewImportedContacts(importContactsDraft, "text");
  };

  const handleImportContactsFile = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }
    const fileText = await selectedFile.text();
    const lowerName = String(selectedFile.name || "").toLowerCase();
    const sourceType = lowerName.endsWith(".vcf") || lowerName.endsWith(".vcard") ? "vcf" : "text";
    previewImportedContacts(fileText, sourceType);
    event.target.value = "";
  };

  const handleImportGoogleContacts = async () => {
    if (!canUseGoogleContacts) {
      setImportContactsMessage(t("contact_import_google_unconfigured"));
      return;
    }
    setIsImportingGoogleContacts(true);
    setImportContactsMessage("");
    try {
      const googleContacts = await importContactsFromGoogle();
      setImportContactsPreview(googleContacts);
      setImportDuplicateMode("skip");
      setImportContactsDraft("");
      setImportContactsSearch("");
      setImportContactsGroupFilter("all");
      setImportContactsPage(1);
      if (googleContacts.length > 0) {
        setImportContactsMessage(`${t("contact_import_google_loaded")} ${googleContacts.length}.`);
      } else {
        setImportContactsMessage(t("contact_import_google_empty"));
      }
      if (contactImportDetailsRef.current) {
        contactImportDetailsRef.current.open = true;
      }
    } catch (error) {
      setImportContactsMessage(`${t("contact_import_google_error")} ${String(error?.message || "")}`);
    } finally {
      setIsImportingGoogleContacts(false);
    }
  };

  const openFileImportFallback = () => {
    if (contactImportDetailsRef.current) {
      contactImportDetailsRef.current.open = true;
    }
    contactImportFileInputRef.current?.click();
  };

  const handlePickDeviceContacts = async () => {
    if (!canUseDeviceContacts) {
      setImportContactsMessage(contactPickerUnsupportedReason || t("contact_import_device_not_supported"));
      openFileImportFallback();
      return;
    }
    try {
      const selectedContacts = await navigator.contacts.select(["name", "email", "tel", "address"], { multiple: true });
      const parsedContacts = (selectedContacts || [])
        .map((item) => normalizeDeviceContact(item))
        .filter((contact) => contact.firstName || contact.lastName || contact.email || contact.phone);
      setImportContactsPreview(parsedContacts);
      setImportDuplicateMode("skip");
      setImportContactsSearch("");
      setImportContactsGroupFilter("all");
      setImportContactsPage(1);
      setImportContactsMessage(`${t("contact_import_device_loaded")} ${parsedContacts.length}.`);
    } catch (error) {
      if (error?.name === "AbortError") {
        setImportContactsMessage(t("contact_import_device_empty"));
        return;
      }
      if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
        setImportContactsMessage(t("contact_import_device_permission_denied"));
        return;
      }
      setImportContactsMessage(`${t("contact_import_device_error")} ${String(error?.message || "")}`);
    }
  };

  const handleFillGuestFromDeviceContact = async () => {
    if (!canUseDeviceContacts) {
      setGuestMessage(contactPickerUnsupportedReason || t("contact_import_device_not_supported"));
      openFileImportFallback();
      return;
    }
    try {
      const selectedContacts = await navigator.contacts.select(["name", "email", "tel", "address"], { multiple: false });
      const selectedContact = Array.isArray(selectedContacts) ? selectedContacts[0] : null;
      if (!selectedContact) {
        setGuestMessage(t("contact_import_device_empty"));
        return;
      }
      const contact = normalizeDeviceContact(selectedContact);
      setGuestFirstName(contact.firstName || guestFirstName);
      setGuestLastName(contact.lastName || guestLastName);
      setGuestEmail(contact.email || guestEmail);
      setGuestPhone(contact.phone || guestPhone);
      setGuestCity(contact.city || guestCity);
      setGuestCountry(contact.country || guestCountry);
      setGuestAdvanced((prev) => ({
        ...prev,
        address: contact.address || prev.address,
        postalCode: contact.postalCode || prev.postalCode,
        stateRegion: contact.stateRegion || prev.stateRegion,
        birthday: contact.birthday || prev.birthday
      }));
      setSelectedGuestAddressPlace(null);
      setGuestErrors((prev) => ({
        ...prev,
        firstName: undefined,
        email: undefined,
        phone: undefined,
        contact: undefined,
        city: undefined,
        country: undefined,
        address: undefined
      }));
      setGuestMessage(t("contact_import_single_loaded"));
    } catch (error) {
      if (error?.name === "AbortError") {
        setGuestMessage(t("contact_import_device_empty"));
        return;
      }
      if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
        setGuestMessage(t("contact_import_device_permission_denied"));
        return;
      }
      setGuestMessage(`${t("contact_import_device_error")} ${String(error?.message || "")}`);
    }
  };

  const handleCreateBirthdayEventFromGuest = () => {
    const nextDateTime = getBirthdayEventDateTime(guestAdvanced.birthday, 20);
    if (!nextDateTime) {
      setGuestMessage(t("birthday_event_missing"));
      return;
    }
    const guestLabel = `${guestFirstName || ""} ${guestLastName || ""}`.trim() || t("field_guest");
    setActiveView("events");
    setEventsWorkspace("create");
    setEditingEventId("");
    setEventTitle(interpolateText(t("birthday_event_title"), { guest: guestLabel }));
    setEventType(toCatalogLabel("experience_type", "celebration", language));
    setEventStatus("draft");
    setEventDescription(interpolateText(t("birthday_event_description"), { guest: guestLabel }));
    setEventStartAt(nextDateTime);
    setEventLocationName("");
    setEventLocationAddress(guestAdvanced.address || "");
    setAddressPredictions([]);
    setSelectedPlace(null);
    setEventMessage(t("birthday_event_prefilled"));
  };

  const handleClearImportContacts = () => {
    setImportContactsDraft("");
    setImportContactsPreview([]);
    setImportContactsSearch("");
    setImportContactsGroupFilter("all");
    setImportDuplicateMode("skip");
    setSelectedImportContactIds([]);
    setImportContactsPage(1);
    setImportContactsPageSize(IMPORT_PREVIEW_PAGE_SIZE_DEFAULT);
    setImportContactsMessage("");
  };

  const handleSelectAllReadyImportContacts = () => {
    setSelectedImportContactIds(importContactsReady.map((item) => item.previewId));
  };

  const handleClearReadyImportContactsSelection = () => {
    setSelectedImportContactIds([]);
  };

  const handleSelectFilteredReadyImportContacts = () => {
    setSelectedImportContactIds(importContactsFilteredReady.map((item) => item.previewId));
  };

  const handleSelectCurrentImportPageReady = () => {
    setSelectedImportContactIds(pagedImportContacts.filter((item) => item.canImport).map((item) => item.previewId));
  };

  const handleSelectOnlyNewImportContacts = () => {
    setSelectedImportContactIds(
      importContactsFiltered
        .filter((item) => item.canImport && !item.duplicateExisting && !item.duplicateInPreview)
        .map((item) => item.previewId)
    );
  };

  const toggleImportContactSelection = (previewId) => {
    setSelectedImportContactIds((prev) =>
      prev.includes(previewId) ? prev.filter((item) => item !== previewId) : [...prev, previewId]
    );
  };

  const handleImportContacts = async () => {
    if (!supabase || !session?.user?.id) {
      return;
    }
    if (importContactsSelectedReady.length === 0) {
      setImportContactsMessage(
        importContactsReady.length === 0 ? t("contact_import_no_ready") : t("contact_import_no_selected")
      );
      return;
    }
    setIsImportingContacts(true);
    setImportContactsMessage("");

    const duplicateMode = importDuplicateMode === "merge" ? "merge" : "skip";
    const insertedFingerprints = new Set();
    let importedCount = 0;
    let mergedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const contactItem of importContactsSelectedReady) {
      const fallbackFirstName = deriveGuestNameFromContact(contactItem) || t("field_guest");
      const relationshipCode = deriveRelationshipCodeFromContact(contactItem);
      const fingerprint = buildGuestFingerprint({
        firstName: fallbackFirstName,
        lastName: contactItem.lastName,
        email: contactItem.email,
        phone: contactItem.phone
      });
      const existingGuest = fingerprint ? existingGuestByFingerprint[fingerprint] || null : null;
      const hasExisting = Boolean(existingGuest || (fingerprint && existingGuestFingerprints.has(fingerprint)));

      if (hasExisting && duplicateMode !== "merge") {
        skippedCount += 1;
        continue;
      }

      if (hasExisting && duplicateMode === "merge") {
        if (!existingGuest?.id) {
          skippedCount += 1;
          continue;
        }

        const mergePayload = {};
        const assignMergeField = (field, existingValue, incomingValue) => {
          const mergedValue = getMergedFieldValue(existingValue, incomingValue);
          if (typeof mergedValue === "undefined") {
            return;
          }
          mergePayload[field] = toNullable(mergedValue);
        };

        assignMergeField("first_name", existingGuest.first_name, fallbackFirstName);
        assignMergeField("last_name", existingGuest.last_name, contactItem.lastName);
        assignMergeField("email", existingGuest.email, contactItem.email);
        assignMergeField("phone", existingGuest.phone, contactItem.phone);
        assignMergeField("relationship", existingGuest.relationship, relationshipCode);
        assignMergeField("city", existingGuest.city, contactItem.city);
        assignMergeField("country", existingGuest.country, contactItem.country);
        assignMergeField("address", existingGuest.address, contactItem.address);
        assignMergeField("company", existingGuest.company, contactItem.company);
        assignMergeField("postal_code", existingGuest.postal_code, contactItem.postalCode);
        assignMergeField("state_region", existingGuest.state_region, contactItem.stateRegion);
        assignMergeField("birthday", existingGuest.birthday, contactItem.birthday);

        if (Object.keys(mergePayload).length === 0) {
          skippedCount += 1;
          continue;
        }

        let { error } = await supabase
          .from("guests")
          .update(mergePayload)
          .eq("id", existingGuest.id)
          .eq("host_user_id", session.user.id);

        if (error && isCompatibilityError(error, ["postal_code", "state_region", "birthday"])) {
          const fallbackMergePayload = { ...mergePayload };
          delete fallbackMergePayload.postal_code;
          delete fallbackMergePayload.state_region;
          delete fallbackMergePayload.birthday;

          if (Object.keys(fallbackMergePayload).length === 0) {
            mergedCount += 1;
            continue;
          }

          ({ error } = await supabase
            .from("guests")
            .update(fallbackMergePayload)
            .eq("id", existingGuest.id)
            .eq("host_user_id", session.user.id));
        }

        if (error) {
          failedCount += 1;
        } else {
          mergedCount += 1;
        }
        continue;
      }

      const payloadBase = {
        host_user_id: session.user.id,
        content_language: language,
        first_name: fallbackFirstName,
        last_name: toNullable(contactItem.lastName),
        email: toNullable(contactItem.email),
        phone: toNullable(contactItem.phone),
        relationship: toNullable(relationshipCode),
        city: toNullable(contactItem.city),
        country: toNullable(contactItem.country),
        address: toNullable(contactItem.address),
        company: toNullable(contactItem.company),
        postal_code: toNullable(contactItem.postalCode),
        state_region: toNullable(contactItem.stateRegion),
        birthday: toNullable(contactItem.birthday)
      };
      const payloadFallback = {
        host_user_id: session.user.id,
        first_name: fallbackFirstName,
        last_name: toNullable(contactItem.lastName),
        email: toNullable(contactItem.email),
        phone: toNullable(contactItem.phone),
        relationship: toNullable(relationshipCode),
        city: toNullable(contactItem.city),
        country: toNullable(contactItem.country),
        address: toNullable(contactItem.address),
        company: toNullable(contactItem.company)
      };

      if (fingerprint && insertedFingerprints.has(fingerprint)) {
        skippedCount += 1;
        continue;
      }

      let { error } = await supabase.from("guests").insert(payloadBase);
      if (error && isCompatibilityError(error, ["content_language", "postal_code", "state_region", "birthday"])) {
        ({ error } = await supabase.from("guests").insert(payloadFallback));
      }

      if (error) {
        failedCount += 1;
        continue;
      }
      if (fingerprint) {
        insertedFingerprints.add(fingerprint);
      }
      importedCount += 1;
    }

    setIsImportingContacts(false);
    setSelectedImportContactIds([]);
    setImportContactsMessage(
      `${t("contact_import_done")} ${importedCount}. ${t("contact_import_merged")} ${mergedCount}. ${t("contact_import_skipped")} ${skippedCount}. ${
        failedCount > 0 ? `${t("contact_import_failed")} ${failedCount}.` : ""
      }`.trim()
    );
    if (importedCount > 0 || mergedCount > 0) {
      await loadDashboardData();
    }
  };

  const handleCopyHostSignupLink = async (guestItem) => {
    const guestLabel = `${guestItem?.first_name || ""} ${guestItem?.last_name || ""}`.trim() || t("field_guest");
    const signupUrl = buildAppUrl("/login");
    try {
      await navigator.clipboard.writeText(signupUrl);
      setGuestMessage(`${t("host_invite_link_copied")} ${guestLabel}`);
    } catch {
      setGuestMessage(t("copy_fail"));
    }
  };

  const handleSaveHostProfile = async (event) => {
    event.preventDefault();
    if (!supabase || !session?.user?.id) {
      return;
    }
    setHostProfileMessage("");
    setIsSavingHostProfile(true);

    const fallbackName = (session.user.email || "").split("@")[0] || t("field_guest");
    const normalizedFullName =
      String(hostProfileName || "")
        .trim()
        .replace(/\s+/g, " ") || fallbackName;
    const profilePayload = {
      id: session.user.id,
      full_name: normalizedFullName,
      phone: toNullable(hostProfilePhone)
    };
    const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
    if (profileError) {
      setIsSavingHostProfile(false);
      setHostProfileMessage(`${t("host_profile_save_error")} ${profileError.message}`);
      return;
    }

    const { firstName, lastName } = splitFullName(normalizedFullName);
    const guestPayload = {
      host_user_id: session.user.id,
      content_language: language,
      first_name: firstName || fallbackName,
      last_name: toNullable(lastName),
      email: toNullable(session.user.email || ""),
      phone: toNullable(hostProfilePhone),
      relationship: toNullable(toCatalogCode("relationship", hostProfileRelationship)),
      city: toNullable(hostProfileCity),
      country: toNullable(hostProfileCountry)
    };
    const fallbackGuestPayload = {
      host_user_id: session.user.id,
      first_name: firstName || fallbackName,
      last_name: toNullable(lastName),
      email: toNullable(session.user.email || ""),
      phone: toNullable(hostProfilePhone),
      relationship: toNullable(toCatalogCode("relationship", hostProfileRelationship)),
      city: toNullable(hostProfileCity),
      country: toNullable(hostProfileCountry)
    };

    const existingGuest = selfGuestCandidate;
    let guestResult = existingGuest?.id
      ? await supabase
          .from("guests")
          .update(guestPayload)
          .eq("id", existingGuest.id)
          .eq("host_user_id", session.user.id)
      : await supabase.from("guests").insert(guestPayload);

    if (
      guestResult.error &&
      isCompatibilityError(guestResult.error, ["content_language"])
    ) {
      guestResult = existingGuest?.id
        ? await supabase
            .from("guests")
            .update(fallbackGuestPayload)
            .eq("id", existingGuest.id)
            .eq("host_user_id", session.user.id)
        : await supabase.from("guests").insert(fallbackGuestPayload);
    }

    setIsSavingHostProfile(false);
    if (guestResult.error) {
      setHostProfileMessage(`${t("host_profile_saved_guest_sync_warning")} ${guestResult.error.message}`);
      await loadDashboardData();
      return;
    }
    setHostProfileMessage(t("host_profile_saved"));
    await loadDashboardData();
  };

  const handleClaimGlobalProfile = async () => {
    if (!supabase || !session?.user?.id) {
      return;
    }
    setGlobalProfileMessage("");
    setIsClaimingGlobalProfile(true);
    const result = await supabase.rpc("get_or_create_my_global_guest_profile");
    setIsClaimingGlobalProfile(false);

    if (result.error) {
      if (isMissingDbFeatureError(result.error, ["get_or_create_my_global_guest_profile"])) {
        setIsGlobalProfileFeatureReady(false);
        setGlobalProfileMessage(t("global_profile_feature_pending"));
      } else {
        setGlobalProfileMessage(`${t("global_profile_claim_error")} ${result.error.message}`);
      }
      return;
    }

    const normalizedId = String(result.data || "").trim();
    setGlobalProfileId(normalizedId);
    setGlobalProfileMessage(t("global_profile_claimed"));
    await loadGlobalProfileData();
  };

  const handleLinkProfileGuestToGlobal = async (guestId) => {
    if (!supabase || !session?.user?.id || !guestId) {
      return;
    }
    setGlobalProfileMessage("");
    setIsLinkingGlobalGuest(true);
    const result = await supabase.rpc("link_my_guest_to_matched_global_profile", { p_guest_id: guestId });
    setIsLinkingGlobalGuest(false);

    if (result.error) {
      if (isMissingDbFeatureError(result.error, ["link_my_guest_to_matched_global_profile"])) {
        setIsGlobalProfileFeatureReady(false);
        setGlobalProfileMessage(t("global_profile_feature_pending"));
      } else {
        setGlobalProfileMessage(`${t("global_profile_link_error")} ${result.error.message}`);
      }
      return;
    }

    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (row?.linked) {
      setGlobalProfileId(String(row.global_profile_id || globalProfileId || "").trim());
      setGlobalProfileMessage(t("global_profile_link_success"));
      await loadGlobalProfileData();
      return;
    }

    const reason = String(row?.reason || "").trim();
    if (reason === "no_registered_owner") {
      setGlobalProfileMessage(t("global_profile_link_no_owner"));
      return;
    }
    if (reason === "guest_without_contact") {
      setGlobalProfileMessage(t("global_profile_link_missing_contact"));
      return;
    }
    setGlobalProfileMessage(t("global_profile_link_not_linked"));
  };

  const handleLinkAllGuestsToGlobalProfiles = async () => {
    if (!supabase || !session?.user?.id) {
      return;
    }
    setGlobalProfileMessage("");
    setIsLinkingAllGlobalGuests(true);
    const result = await supabase.rpc("link_all_my_guests_to_global_profiles");
    setIsLinkingAllGlobalGuests(false);

    if (result.error) {
      if (isMissingDbFeatureError(result.error, ["link_all_my_guests_to_global_profiles"])) {
        setIsGlobalProfileFeatureReady(false);
        setGlobalProfileMessage(t("global_profile_feature_pending"));
      } else {
        setGlobalProfileMessage(`${t("global_profile_link_error")} ${result.error.message}`);
      }
      return;
    }

    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    setGlobalProfileMessage(
      interpolateText(t("global_profile_link_all_summary"), {
        checked: Number(row?.checked_count || 0),
        linked: Number(row?.linked_count || 0),
        skipped: Number(row?.skipped_count || 0)
      })
    );
    await loadGlobalProfileData();
  };

  const handleChangeGlobalShareDraft = (hostUserId, field, value) => {
    if (!hostUserId || !field) {
      return;
    }
    setGlobalShareDraftByHostId((prev) => ({
      ...prev,
      [hostUserId]: {
        status: prev?.[hostUserId]?.status || "inactive",
        allow_identity: Boolean(prev?.[hostUserId]?.allow_identity),
        allow_food: Boolean(prev?.[hostUserId]?.allow_food),
        allow_lifestyle: Boolean(prev?.[hostUserId]?.allow_lifestyle),
        allow_conversation: Boolean(prev?.[hostUserId]?.allow_conversation),
        allow_health: Boolean(prev?.[hostUserId]?.allow_health),
        [field]: value
      }
    }));
  };

  const handleSaveGlobalShare = async (hostUserId) => {
    if (!supabase || !session?.user?.id || !hostUserId) {
      return;
    }
    if (hostUserId === session.user.id) {
      setGlobalProfileMessage(t("global_profile_share_self_error"));
      return;
    }
    const draft = globalShareDraftByHostId[hostUserId];
    if (!draft) {
      return;
    }
    setGlobalProfileMessage("");
    setSavingGlobalShareHostId(hostUserId);
    const status = String(draft.status || "inactive");
    const normalizedStatus = status === "active" || status === "revoked" ? status : "revoked";
    const result = await supabase.rpc("set_my_global_profile_share", {
      p_grantee_user_id: hostUserId,
      p_status: normalizedStatus,
      p_allow_identity: Boolean(draft.allow_identity),
      p_allow_food: Boolean(draft.allow_food),
      p_allow_lifestyle: Boolean(draft.allow_lifestyle),
      p_allow_conversation: Boolean(draft.allow_conversation),
      p_allow_health: Boolean(draft.allow_health),
      p_expires_at: null
    });
    setSavingGlobalShareHostId("");

    if (result.error) {
      if (isMissingDbFeatureError(result.error, ["set_my_global_profile_share"])) {
        setIsGlobalProfileFeatureReady(false);
        setGlobalProfileMessage(t("global_profile_feature_pending"));
      } else if (String(result.error.message || "").toLowerCase().includes("health_consent_required_before_sharing")) {
        setGlobalProfileMessage(t("global_profile_health_consent_required"));
      } else {
        setGlobalProfileMessage(`${t("global_profile_share_save_error")} ${result.error.message}`);
      }
      return;
    }

    setGlobalProfileMessage(t("global_profile_share_saved"));
    await loadGlobalProfileData();
  };

  const handleStartEditGuest = (guestItem) => {
    if (!guestItem) {
      return;
    }
    setActiveView("guests");
    setSelectedGuestDetailId(guestItem.id);
    setGuestsWorkspace("create");
    setEditingGuestId(guestItem.id);
    setGuestFirstName(guestItem.first_name || "");
    setGuestLastName(guestItem.last_name || "");
    setGuestEmail(guestItem.email || "");
    setGuestPhone(guestItem.phone || "");
    setGuestRelationship(toCatalogLabel("relationship", guestItem.relationship, language));
    setGuestCity(guestItem.city || "");
    setGuestCountry(guestItem.country || "");
    setGuestAdvanced(getGuestAdvancedState(guestItem));
    setSelectedGuestAddressPlace(
      guestItem.address
        ? {
            placeId: null,
            formattedAddress: guestItem.address,
            lat: null,
            lng: null
          }
        : null
    );
    setGuestAddressPredictions([]);
    setGuestErrors({});
    setGuestMessage("");
  };

  const handleCancelEditGuest = () => {
    setEditingGuestId("");
    setGuestFirstName("");
    setGuestLastName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestRelationship("");
    setGuestCity("");
    setGuestCountry("");
    setGuestAdvanced(GUEST_ADVANCED_INITIAL_STATE);
    setSelectedGuestAddressPlace(null);
    setGuestAddressPredictions([]);
    setGuestErrors({});
    setGuestMessage("");
  };

  const handleSaveGuest = async (event) => {
    event.preventDefault();
    if (!supabase || !session?.user?.id) {
      return;
    }
    setGuestMessage("");

    const validation = validateGuestForm({
      firstName: guestFirstName,
      lastName: guestLastName,
      email: guestEmail,
      phone: guestPhone,
      relationship: guestRelationship,
      city: guestCity,
      country: guestCountry,
      address: guestAdvanced.address,
      postalCode: guestAdvanced.postalCode,
      stateRegion: guestAdvanced.stateRegion,
      company: guestAdvanced.company,
      twitter: guestAdvanced.twitter,
      instagram: guestAdvanced.instagram,
      linkedIn: guestAdvanced.linkedIn
    });

    if (!validation.success) {
      setGuestErrors(validation.errors);
      const firstError = validation.errors[Object.keys(validation.errors)[0]];
      setGuestMessage(t(firstError || "error_create_guest"));
      return;
    }

    const allergiesList = toCatalogCodes("allergy", splitListInput(guestAdvanced.allergies));
    const intolerancesList = toCatalogCodes("intolerance", splitListInput(guestAdvanced.intolerances));
    const petAllergiesList = uniqueValues(
      splitListInput(guestAdvanced.petAllergies).map((value) => {
        const raw = String(value || "").trim();
        if (!raw) {
          return "";
        }
        const petCode = toCatalogCode("pet", raw);
        const isKnownPetValue =
          toCatalogLabel("pet", raw, language) !== raw || toCatalogLabel("pet", petCode, language) !== petCode;
        if (isKnownPetValue) {
          return petCode;
        }
        return toCatalogCode("allergy", raw);
      })
    );
    const hasSensitiveData = allergiesList.length > 0 || intolerancesList.length > 0 || petAllergiesList.length > 0;
    if (hasSensitiveData && !guestAdvanced.sensitiveConsent) {
      setGuestErrors((prev) => ({ ...prev, sensitiveConsent: "guest_sensitive_consent_required" }));
      setGuestMessage(t("guest_sensitive_consent_required"));
      return;
    }

    setGuestErrors({});
    setIsSavingGuest(true);

    const basePayload = {
      first_name: guestFirstName.trim(),
      content_language: language,
      last_name: toNullable(guestLastName),
      email: toNullable(guestEmail),
      phone: toNullable(guestPhone),
      relationship: toNullable(toCatalogCode("relationship", guestRelationship)),
      city: toNullable(guestCity),
      country: toNullable(guestCountry),
      address: toNullable(selectedGuestAddressPlace?.formattedAddress || guestAdvanced.address),
      postal_code: toNullable(guestAdvanced.postalCode),
      state_region: toNullable(guestAdvanced.stateRegion),
      company: toNullable(guestAdvanced.company),
      birthday: toNullable(guestAdvanced.birthday),
      twitter: toNullable(guestAdvanced.twitter),
      instagram: toNullable(guestAdvanced.instagram),
      linkedin: toNullable(guestAdvanced.linkedIn),
      last_meet_at: toNullable(guestAdvanced.lastMeetAt)
    };
    const fallbackPayload = {
      first_name: guestFirstName.trim(),
      last_name: toNullable(guestLastName),
      email: toNullable(guestEmail),
      phone: toNullable(guestPhone),
      relationship: toNullable(toCatalogCode("relationship", guestRelationship)),
      city: toNullable(guestCity),
      country: toNullable(guestCountry),
      address: toNullable(selectedGuestAddressPlace?.formattedAddress || guestAdvanced.address)
    };

    let error = null;
    let savedGuestId = isEditingGuest ? editingGuestId : "";
    if (isEditingGuest) {
      const updateResult = await supabase
        .from("guests")
        .update(basePayload)
        .eq("id", editingGuestId)
        .eq("host_user_id", session.user.id);
      error = updateResult.error;
    } else {
      const insertResult = await supabase.from("guests").insert({
        ...basePayload,
        host_user_id: session.user.id
      }).select("id").single();
      error = insertResult.error;
      savedGuestId = insertResult.data?.id || "";
    }

    if (
      error &&
      isCompatibilityError(error, [
        "content_language",
        "postal_code",
        "state_region",
        "address",
        "company",
        "birthday",
        "twitter",
        "instagram",
        "linkedin",
        "last_meet_at"
      ])
    ) {
      const fallbackResult = isEditingGuest
        ? await supabase.from("guests").update(fallbackPayload).eq("id", editingGuestId).eq("host_user_id", session.user.id)
        : await supabase.from("guests").insert({
            ...fallbackPayload,
            host_user_id: session.user.id
          }).select("id").single();
      error = fallbackResult.error;
      if (!isEditingGuest) {
        savedGuestId = fallbackResult.data?.id || "";
      }
    }

    if (!isEditingGuest && !savedGuestId) {
      savedGuestId = await resolveCreatedGuestId({
        firstName: guestFirstName.trim(),
        lastName: guestLastName.trim(),
        email: guestEmail.trim(),
        phone: guestPhone.trim(),
        address: selectedGuestAddressPlace?.formattedAddress || guestAdvanced.address
      });
    }

    if (error) {
      setIsSavingGuest(false);
      setGuestMessage(`${isEditingGuest ? t("error_update_guest") : t("error_create_guest")} ${error.message}`);
      return;
    }

    const preferencePayload = {
      guest_id: savedGuestId,
      diet_type: toNullable(toCatalogCode("diet_type", guestAdvanced.dietType)),
      tasting_preferences: toCatalogCodes("tasting_preference", splitListInput(guestAdvanced.tastingPreferences)),
      food_likes: splitListInput(guestAdvanced.foodLikes),
      food_dislikes: splitListInput(guestAdvanced.foodDislikes),
      drink_likes: toCatalogCodes("drink", splitListInput(guestAdvanced.drinkLikes)),
      drink_dislikes: toCatalogCodes("drink", splitListInput(guestAdvanced.drinkDislikes)),
      music_genres: toCatalogCodes("music_genre", splitListInput(guestAdvanced.musicGenres)),
      favorite_color: toNullable(toCatalogCode("color", guestAdvanced.favoriteColor)),
      books: splitListInput(guestAdvanced.books),
      movies: splitListInput(guestAdvanced.movies),
      series: splitListInput(guestAdvanced.series),
      sports: toCatalogCodes("sport", splitListInput(guestAdvanced.sports)),
      team_fan: toNullable(guestAdvanced.teamFan),
      punctuality: toNullable(toCatalogCode("punctuality", guestAdvanced.punctuality)),
      last_talk_topic: toNullable(guestAdvanced.lastTalkTopic),
      taboo_topics: splitListInput(guestAdvanced.tabooTopics),
      experience_types: toCatalogCodes("experience_type", splitListInput(guestAdvanced.experienceTypes)),
      preferred_guest_relationships: toCatalogCodes(
        "relationship",
        splitListInput(guestAdvanced.preferredGuestRelationships)
      ),
      preferred_day_moments: toCatalogCodes("day_moment", splitListInput(guestAdvanced.preferredDayMoments)),
      periodicity: toNullable(toCatalogCode("periodicity", guestAdvanced.periodicity)),
      cuisine_types: toCatalogCodes("cuisine_type", splitListInput(guestAdvanced.cuisineTypes)),
      pets: toCatalogCodes("pet", splitListInput(guestAdvanced.pets))
    };
    const preferencePayloadFallback = {
      guest_id: savedGuestId,
      diet_type: toNullable(toCatalogCode("diet_type", guestAdvanced.dietType)),
      tasting_preferences: toCatalogCodes("tasting_preference", splitListInput(guestAdvanced.tastingPreferences)),
      food_likes: splitListInput(guestAdvanced.foodLikes),
      food_dislikes: splitListInput(guestAdvanced.foodDislikes),
      drink_likes: toCatalogCodes("drink", splitListInput(guestAdvanced.drinkLikes)),
      drink_dislikes: toCatalogCodes("drink", splitListInput(guestAdvanced.drinkDislikes)),
      music_genres: toCatalogCodes("music_genre", splitListInput(guestAdvanced.musicGenres)),
      favorite_color: toNullable(toCatalogCode("color", guestAdvanced.favoriteColor)),
      books: splitListInput(guestAdvanced.books),
      movies: splitListInput(guestAdvanced.movies),
      series: splitListInput(guestAdvanced.series),
      sports: toCatalogCodes("sport", splitListInput(guestAdvanced.sports)),
      team_fan: toNullable(guestAdvanced.teamFan),
      punctuality: toNullable(toCatalogCode("punctuality", guestAdvanced.punctuality)),
      last_talk_topic: toNullable(guestAdvanced.lastTalkTopic),
      taboo_topics: splitListInput(guestAdvanced.tabooTopics)
    };

    const nowIso = new Date().toISOString();
    const sensitivePayload = {
      guest_id: savedGuestId,
      allergies: allergiesList,
      intolerances: intolerancesList,
      pet_allergies: petAllergiesList,
      consent_granted: hasSensitiveData ? Boolean(guestAdvanced.sensitiveConsent) : false,
      consent_version: hasSensitiveData ? "guest-sensitive-v1-2026-02" : null,
      consent_granted_at: hasSensitiveData ? nowIso : null
    };

    let relatedDataError = null;
    if (savedGuestId) {
      let preferencesResult = await supabase
        .from("guest_preferences")
        .upsert(preferencePayload, { onConflict: "guest_id" });

      if (
        preferencesResult.error &&
        isCompatibilityError(preferencesResult.error, [
          "experience_types",
          "preferred_guest_relationships",
          "preferred_day_moments",
          "periodicity",
          "cuisine_types",
          "pets"
        ])
      ) {
        preferencesResult = await supabase
          .from("guest_preferences")
          .upsert(preferencePayloadFallback, { onConflict: "guest_id" });
      }

      if (preferencesResult.error && !isMissingRelationError(preferencesResult.error, "guest_preferences")) {
        relatedDataError = preferencesResult.error;
      }

      const sensitiveResult = await supabase
        .from("guest_sensitive_preferences")
        .upsert(sensitivePayload, { onConflict: "guest_id" });

      if (!relatedDataError && sensitiveResult.error && !isMissingRelationError(sensitiveResult.error, "guest_sensitive_preferences")) {
        relatedDataError = sensitiveResult.error;
      }
    }
    setIsSavingGuest(false);

    if (relatedDataError) {
      setGuestMessage(`${t("guest_saved_partial_warning")} ${relatedDataError.message}`);
      await loadDashboardData();
      if (!savedGuestId) {
        savedGuestId = await resolveCreatedGuestId({
          firstName: guestFirstName.trim(),
          lastName: guestLastName.trim(),
          email: guestEmail.trim(),
          phone: guestPhone.trim(),
          address: selectedGuestAddressPlace?.formattedAddress || guestAdvanced.address
        });
      }
      if (!isEditingGuest && savedGuestId) {
        setEditingGuestId(savedGuestId);
      }
      return;
    }

    const resolvedGuestAddress = String(selectedGuestAddressPlace?.formattedAddress || guestAdvanced.address || "").trim();
    if (savedGuestId) {
      const hasResolvedCoordinates =
        typeof selectedGuestAddressPlace?.lat === "number" && typeof selectedGuestAddressPlace?.lng === "number";
      if (resolvedGuestAddress && hasResolvedCoordinates) {
        const nextGeocodeValue = {
          lat: selectedGuestAddressPlace.lat,
          lng: selectedGuestAddressPlace.lng,
          address: resolvedGuestAddress
        };
        setGuestGeocodeById((prev) => {
          const next = {
            ...(prev || {}),
            [savedGuestId]: nextGeocodeValue
          };
          writeGuestGeoCache(session.user.id, next);
          return next;
        });
      } else {
        setGuestGeocodeById((prev) => {
          const next = { ...(prev || {}) };
          delete next[savedGuestId];
          writeGuestGeoCache(session.user.id, next);
          return next;
        });
      }
    }
    if (savedGuestId) {
      setGuestsMapFocusId(savedGuestId);
    }

    if (isEditingGuest) {
      setGuestMessage(t("guest_updated"));
      await loadDashboardData();
      return;
    }

    await loadDashboardData();
    if (!savedGuestId) {
      savedGuestId = await resolveCreatedGuestId({
        firstName: guestFirstName.trim(),
        lastName: guestLastName.trim(),
        email: guestEmail.trim(),
        phone: guestPhone.trim(),
        address: selectedGuestAddressPlace?.formattedAddress || guestAdvanced.address
      });
    }
    if (savedGuestId) {
      setEditingGuestId(savedGuestId);
      setGuestMessage(t("guest_created_continue_edit"));
    } else {
      setGuestMessage(t("guest_created_missing_id_warning"));
    }
  };

  const handleRequestDeleteEvent = (eventItem) => {
    if (!eventItem?.id) {
      return;
    }
    setDeleteTarget({
      type: "event",
      item: eventItem
    });
  };

  const handleRequestDeleteGuest = (guestItem) => {
    if (!guestItem?.id) {
      return;
    }
    setDeleteTarget({
      type: "guest",
      item: guestItem
    });
  };

  const handleDeleteEvent = async (eventItem) => {
    if (!supabase || !session?.user?.id || !eventItem?.id) {
      return;
    }

    setIsDeletingEventId(eventItem.id);
    setEventMessage("");
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventItem.id)
      .eq("host_user_id", session.user.id);
    setIsDeletingEventId("");

    if (error) {
      setEventMessage(`${t("error_delete_event")} ${error.message}`);
      return;
    }

    if (editingEventId === eventItem.id) {
      handleCancelEditEvent();
    }
    removeEventSettingsCache(eventItem.id);
    setEventMessage(t("event_deleted"));
    await loadDashboardData();
  };

  const handleDeleteGuest = async (guestItem) => {
    if (!supabase || !session?.user?.id || !guestItem?.id) {
      return;
    }
    setIsDeletingGuestId(guestItem.id);
    setGuestMessage("");
    const { error } = await supabase
      .from("guests")
      .delete()
      .eq("id", guestItem.id)
      .eq("host_user_id", session.user.id);
    setIsDeletingGuestId("");

    if (error) {
      setGuestMessage(`${t("error_delete_guest")} ${error.message}`);
      return;
    }

    if (editingGuestId === guestItem.id) {
      handleCancelEditGuest();
    }
    setGuestMessage(t("guest_deleted"));
    await loadDashboardData();
  };

  const handleRequestDeleteInvitation = (invitationItem, itemLabel = "") => {
    if (!invitationItem?.id) {
      return;
    }
    setDeleteTarget({
      type: "invitation",
      item: invitationItem,
      itemLabel
    });
  };

  const handleDeleteInvitation = async (invitationItem) => {
    if (!supabase || !session?.user?.id || !invitationItem?.id) {
      return;
    }
    setIsDeletingInvitationId(invitationItem.id);
    setInvitationMessage("");
    const { error } = await supabase
      .from("invitations")
      .delete()
      .eq("id", invitationItem.id)
      .eq("host_user_id", session.user.id);
    setIsDeletingInvitationId("");

    if (error) {
      setInvitationMessage(`${t("error_delete_invitation")} ${error.message}`);
      return;
    }

    setInvitationMessage(t("invitation_deleted"));
    await loadDashboardData();
  };

  const handleRequestDeleteInvitationBulk = () => {
    const invitationIds = uniqueValues(selectedLatestInvitationIds);
    if (invitationIds.length === 0) {
      setInvitationMessage(t("invitation_list_bulk_empty"));
      return;
    }
    setDeleteTarget({
      type: "invitation_bulk",
      ids: invitationIds,
      itemLabel: interpolateText(t("invitation_list_bulk_delete_target"), { count: invitationIds.length })
    });
  };

  const handleDeleteInvitationBulk = async (invitationIds) => {
    if (!supabase || !session?.user?.id || !Array.isArray(invitationIds) || invitationIds.length === 0) {
      return;
    }
    setIsDeletingInvitationBulk(true);
    setInvitationMessage("");
    const { error } = await supabase
      .from("invitations")
      .delete()
      .in("id", invitationIds)
      .eq("host_user_id", session.user.id);
    setIsDeletingInvitationBulk(false);

    if (error) {
      setInvitationMessage(`${t("error_delete_invitation")} ${error.message}`);
      return;
    }

    setSelectedLatestInvitationIds((prev) => prev.filter((invitationId) => !invitationIds.includes(invitationId)));
    setInvitationMessage(interpolateText(t("invitation_list_bulk_delete_ok"), { count: invitationIds.length }));
    await loadDashboardData();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    if (deleteTarget.type === "event") {
      await handleDeleteEvent(deleteTarget.item);
    } else if (deleteTarget.type === "guest") {
      await handleDeleteGuest(deleteTarget.item);
    } else if (deleteTarget.type === "invitation") {
      await handleDeleteInvitation(deleteTarget.item);
    } else if (deleteTarget.type === "invitation_bulk") {
      await handleDeleteInvitationBulk(deleteTarget.ids || []);
    }
    setDeleteTarget(null);
  };

  const handleCreateInvitation = async (event) => {
    event.preventDefault();
    if (!supabase || !session?.user?.id) {
      return;
    }
    setInvitationMessage("");
    setLastInvitationUrl("");
    setLastInvitationShareText("");
    setLastInvitationShareSubject("");

    const validation = validateInvitationForm({ eventId: selectedEventId, guestId: selectedGuestId });
    if (!validation.success) {
      setInvitationErrors(validation.errors);
      const firstError = validation.errors[Object.keys(validation.errors)[0]];
      setInvitationMessage(t(firstError || "invitation_select_required"));
      return;
    }
    if (invitedGuestIdsForSelectedEvent.has(selectedGuestId)) {
      setInvitationErrors((prev) => ({ ...prev, guestId: "invitation_guest_already_invited_selected" }));
      setInvitationMessage(t("invitation_guest_already_invited_selected"));
      return;
    }

    setInvitationErrors({});
    setIsCreatingInvitation(true);
    const selectedGuestName = guestNamesById[selectedGuestId] || null;
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        host_user_id: session.user.id,
        event_id: selectedEventId,
        guest_id: selectedGuestId,
        invite_channel: "link",
        guest_display_name: selectedGuestName
      })
      .select("id, event_id, guest_id, status, public_token, created_at")
      .single();

    setIsCreatingInvitation(false);

    if (error) {
      if (error.code === "23505" || error.message?.includes("invitations_unique_event_guest")) {
        setInvitationMessage(t("invitation_duplicate"));
      } else {
        setInvitationMessage(`${t("error_create_invitation")} ${error.message}`);
      }
      return;
    }

    const sharePayload = buildInvitationSharePayload(data);
    setInvitationMessage(t("invitation_created"));
    setLastInvitationUrl(sharePayload?.url || "");
    setLastInvitationShareSubject(sharePayload?.shareSubject || "");
    setLastInvitationShareText(sharePayload?.shareText || "");
    await loadDashboardData();
  };

  const toggleBulkInvitationGuest = (guestId) => {
    if (!guestId) {
      return;
    }
    setBulkInvitationGuestIds((prev) =>
      prev.includes(guestId) ? prev.filter((id) => id !== guestId) : [...prev, guestId]
    );
  };

  const handleSelectVisibleBulkGuests = () => {
    const visibleIds = bulkFilteredGuests.map((guestItem) => guestItem.id);
    if (visibleIds.length === 0) {
      return;
    }
    setBulkInvitationGuestIds((prev) => uniqueValues([...prev, ...visibleIds]));
  };

  const handleClearBulkGuests = () => {
    setBulkInvitationGuestIds([]);
  };

  const handleCreateBulkInvitations = async () => {
    if (!supabase || !session?.user?.id) {
      return;
    }
    if (!selectedEventId) {
      setInvitationErrors((prev) => ({ ...prev, eventId: "invitation_select_required" }));
      setInvitationMessage(t("invitation_select_required"));
      return;
    }
    const guestIds = uniqueValues(bulkInvitationGuestIds);
    if (guestIds.length === 0) {
      setInvitationMessage(t("invitation_bulk_require_selection"));
      return;
    }

    setInvitationMessage("");
    setLastInvitationUrl("");
    setLastInvitationShareText("");
    setLastInvitationShareSubject("");
    setIsCreatingBulkInvitations(true);

    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let firstCreatedInvitation = null;
    const alreadyInvitedForEvent = invitedGuestIdsByEvent.get(selectedEventId) || new Set();

    for (const guestId of guestIds) {
      if (alreadyInvitedForEvent.has(guestId)) {
        skippedCount += 1;
        continue;
      }
      const selectedGuestName = guestNamesById[guestId] || null;
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          host_user_id: session.user.id,
          event_id: selectedEventId,
          guest_id: guestId,
          invite_channel: "link",
          guest_display_name: selectedGuestName
        })
        .select("id, event_id, guest_id, status, public_token, created_at")
        .single();
      if (error) {
        if (error.code === "23505" || error.message?.includes("invitations_unique_event_guest")) {
          skippedCount += 1;
        } else {
          failedCount += 1;
        }
        continue;
      }
      createdCount += 1;
      if (!firstCreatedInvitation) {
        firstCreatedInvitation = data;
      }
    }

    setIsCreatingBulkInvitations(false);
    setBulkInvitationGuestIds([]);
    setBulkInvitationSearch("");
    await loadDashboardData();

    if (firstCreatedInvitation) {
      const sharePayload = buildInvitationSharePayload(firstCreatedInvitation);
      setLastInvitationUrl(sharePayload?.url || "");
      setLastInvitationShareSubject(sharePayload?.shareSubject || "");
      setLastInvitationShareText(sharePayload?.shareText || "");
    }

    setInvitationMessage(
      interpolateText(t("invitation_bulk_result"), {
        created: createdCount,
        skipped: skippedCount,
        failed: failedCount
      })
    );
  };

  const toggleLatestInvitationSelection = (invitationId) => {
    if (!invitationId) {
      return;
    }
    setSelectedLatestInvitationIds((prev) =>
      prev.includes(invitationId) ? prev.filter((itemId) => itemId !== invitationId) : [...prev, invitationId]
    );
  };

  const handleSelectVisibleLatestInvitations = () => {
    const visibleIds = filteredInvitations.map((invitationItem) => invitationItem.id);
    if (visibleIds.length === 0) {
      return;
    }
    setSelectedLatestInvitationIds((prev) => uniqueValues([...prev, ...visibleIds]));
  };

  const handleClearLatestInvitationSelection = () => {
    setSelectedLatestInvitationIds([]);
  };

  const handleCopySelectedInvitationLinks = async () => {
    if (selectedLatestInvitations.length === 0) {
      setInvitationMessage(t("invitation_list_bulk_empty"));
      return;
    }
    const links = selectedLatestInvitations
      .map((invitationItem) => buildInvitationSharePayload(invitationItem)?.url)
      .filter(Boolean);
    if (links.length === 0) {
      setInvitationMessage(t("invitation_share_unavailable"));
      return;
    }
    try {
      await navigator.clipboard.writeText(links.join("\n"));
      setInvitationMessage(interpolateText(t("invitation_list_bulk_links_ok"), { count: links.length }));
    } catch {
      setInvitationMessage(t("copy_fail"));
    }
  };

  const handleCopySelectedInvitationMessages = async () => {
    if (selectedLatestInvitations.length === 0) {
      setInvitationMessage(t("invitation_list_bulk_empty"));
      return;
    }
    const messages = selectedLatestInvitations
      .map((invitationItem) => {
        const sharePayload = buildInvitationSharePayload(invitationItem);
        if (!sharePayload?.shareText) {
          return "";
        }
        const eventName = eventNamesById[invitationItem.event_id] || t("field_event");
        const guestName = guestNamesById[invitationItem.guest_id] || t("field_guest");
        return `${eventName} - ${guestName}\n${sharePayload.shareText}`;
      })
      .filter(Boolean);
    if (messages.length === 0) {
      setInvitationMessage(t("invitation_share_unavailable"));
      return;
    }
    try {
      await navigator.clipboard.writeText(messages.join("\n\n---\n\n"));
      setInvitationMessage(interpolateText(t("invitation_list_bulk_messages_ok"), { count: messages.length }));
    } catch {
      setInvitationMessage(t("copy_fail"));
    }
  };

  const handleCopyInvitationLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setInvitationMessage(t("copy_ok"));
    } catch {
      setInvitationMessage(t("copy_fail"));
    }
  };

  const handleCopyInvitationMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message);
      setInvitationMessage(t("invitation_message_copy_ok"));
    } catch {
      setInvitationMessage(t("copy_fail"));
    }
  };

  const handlePrepareInvitationShare = (invitationItem) => {
    const sharePayload = buildInvitationSharePayload(invitationItem);
    if (!sharePayload) {
      setInvitationMessage(t("invitation_share_unavailable"));
      return null;
    }
    setLastInvitationUrl(sharePayload.url);
    setLastInvitationShareSubject(sharePayload.shareSubject);
    setLastInvitationShareText(sharePayload.shareText);
    setInvitationMessage(t("invitation_share_ready"));
    return sharePayload;
  };

  const hostDisplayName = String(hostProfileName || "")
    .trim()
    .replace(/\s+/g, " ") || String(session?.user?.email || "").split("@")[0] || t("host_default_name");
  const hostFirstName = hostDisplayName.split(" ")[0] || t("host_default_name");
  const hostInitials = getInitials(hostDisplayName);
  const profileLinkedGuestId = selfGuestCandidate?.id || editingGuestId || "";
  const isProfileGuestLinked = Boolean(profileLinkedGuestId);
  const isGlobalProfileClaimed = Boolean(globalProfileId);
  const globalShareSelfTargetCount = globalShareTargets.filter(
    (item) => item?.host_user_id && item.host_user_id === session?.user?.id
  ).length;
  const globalShareTargetsVisible = globalShareTargets.filter((item) => item?.host_user_id && item.host_user_id !== session?.user?.id);
  const globalShareActiveCount = globalShareTargetsVisible.filter(
    (item) => String(item.share_status || "").toLowerCase() === "active"
  ).length;
  const activeViewItem = VIEW_CONFIG.find((item) => item.key === activeView) || VIEW_CONFIG[0];
  const sectionHeader = useMemo(() => {
    if (activeView === "overview") {
      return {
        eyebrow: t("nav_overview"),
        title: interpolateText(t("dashboard_welcome"), { name: hostFirstName }),
        subtitle: t("dashboard_welcome_subtitle")
      };
    }
    if (activeView === "profile") {
      return {
        eyebrow: t("active_session"),
        title: t("host_profile_title"),
        subtitle: t("host_profile_hint")
      };
    }
    if (activeView === "events") {
      if (eventsWorkspace === "create") {
        return {
          eyebrow: t("nav_events"),
          title: t("create_event_title"),
          subtitle: t("help_event_form")
        };
      }
      if (eventsWorkspace === "detail") {
        return {
          eyebrow: t("nav_events"),
          title: t("event_detail_title"),
          subtitle: t("event_detail_hint")
        };
      }
      if (eventsWorkspace === "insights") {
        return {
          eyebrow: t("nav_events"),
          title: t("smart_hosting_title"),
          subtitle: t("smart_hosting_hint")
        };
      }
      return {
        eyebrow: t("nav_events"),
        title: t("nav_events"),
        subtitle: t("header_events_subtitle")
      };
    }
    if (activeView === "guests") {
      if (guestsWorkspace === "create") {
        return {
          eyebrow: t("nav_guests"),
          title: t("create_guest_title"),
          subtitle: t("help_guest_form")
        };
      }
      if (guestsWorkspace === "detail") {
        return {
          eyebrow: t("nav_guests"),
          title: t("guest_detail_title"),
          subtitle: t("guest_detail_hint")
        };
      }
      return {
        eyebrow: t("nav_guests"),
        title: t("nav_guests"),
        subtitle: t("header_guests_subtitle")
      };
    }
    if (activeView === "invitations") {
      if (invitationsWorkspace === "create") {
        return {
          eyebrow: t("nav_invitations"),
          title: t("create_invitation_title"),
          subtitle: t("help_invitation_form")
        };
      }
      return {
        eyebrow: t("nav_invitations"),
        title: t("nav_invitations"),
        subtitle: t("header_invitations_subtitle")
      };
    }
    return {
      eyebrow: t(activeViewItem.labelKey),
      title: t(activeViewItem.labelKey),
      subtitle: t("dashboard_welcome_subtitle")
    };
  }, [activeView, activeViewItem.labelKey, eventsWorkspace, guestsWorkspace, hostFirstName, invitationsWorkspace, t]);
  const contextualCreateAction =
    activeView === "overview" || activeView === "events"
      ? {
          icon: "calendar",
          label: t("quick_create_event"),
          onClick: () => openWorkspace("events", "create")
        }
      : activeView === "guests"
      ? {
          icon: "user",
          label: t("quick_create_guest"),
          onClick: () => openWorkspace("guests", "create")
        }
      : activeView === "invitations"
      ? {
          icon: "mail",
          label: t("quick_create_invitation"),
          onClick: () => openWorkspace("invitations", "create")
        }
      : null;
  const contextualSecondaryAction =
    activeView === "invitations" && invitationsWorkspace === "latest"
      ? {
          icon: "check",
          label: showInvitationBulkActions ? t("invitation_list_bulk_hide") : t("invitation_list_bulk_show"),
          onClick: () => setShowInvitationBulkActions((prev) => !prev)
        }
      : null;

  return (
    <main className="page dashboard-page">
      <section className="card app-card dashboard-shell">
        <header className="app-header dashboard-header">
          <div className="dashboard-header-main">
            <div className="brand-header brand-header-compact dashboard-mobile-brand">
              <BrandMark text={t("app_name")} fallback={t("logo_fallback")} />
              <p className="eyebrow">{t("app_name")}</p>
            </div>
            <div className="dashboard-context">
              <p className="eyebrow">{sectionHeader.eyebrow}</p>
              <h1 className="dashboard-context-title">{sectionHeader.title}</h1>
              <p className="hero-text dashboard-context-subtitle">{sectionHeader.subtitle}</p>
            </div>
          </div>
          <div className="header-actions dashboard-header-actions">
            <button
              className="hamburger-btn mobile-only"
              type="button"
              aria-label={t("open_menu")}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              onClick={toggleMobileMenu}
            >
              <span />
              <span />
              <span />
            </button>
            {contextualCreateAction ? (
              <div className="dashboard-quick-actions">
                {contextualSecondaryAction ? (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={contextualSecondaryAction.onClick}>
                    <Icon name={contextualSecondaryAction.icon} className="icon icon-sm" />
                    {contextualSecondaryAction.label}
                  </button>
                ) : null}
                <button className="btn btn-sm" type="button" onClick={contextualCreateAction.onClick}>
                  <Icon name={contextualCreateAction.icon} className="icon icon-sm" />
                  {contextualCreateAction.label}
                </button>
              </div>
            ) : null}
            <div className="dashboard-notification-menu" ref={notificationMenuRef}>
              <button
                className={`icon-notification-btn ${isNotificationMenuOpen ? "active" : ""}`}
                type="button"
                aria-label={interpolateText(t("notifications_button_label"), { count: unreadNotificationCount })}
                aria-haspopup="menu"
                aria-expanded={isNotificationMenuOpen}
                onClick={() => setIsNotificationMenuOpen((prev) => !prev)}
              >
                <Icon name="bell" className="icon icon-sm" />
                {unreadNotificationCount > 0 ? (
                  <span className="notification-count-badge" aria-hidden="true">
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </span>
                ) : null}
              </button>
              {isNotificationMenuOpen ? (
                <div className="dashboard-notification-dropdown" role="menu" aria-label={t("notifications_title")}>
                  <div className="dashboard-notification-head">
                    <p className="item-title">{t("notifications_title")}</p>
                    <span className="status-pill status-pending">
                      {interpolateText(t("notifications_unread"), { count: unreadNotificationCount })}
                    </span>
                  </div>
                  {recentActivityItems.length === 0 ? (
                    <p className="hint">{t("notifications_empty")}</p>
                  ) : (
                    <ul className="dashboard-notification-list">
                      {recentActivityItems.slice(0, 6).map((activityItem) => (
                        <li key={`head-${activityItem.id}`} className="dashboard-notification-item">
                          <span className={`status-pill ${statusClass(activityItem.status)}`}>
                            <Icon name={activityItem.icon} className="icon icon-xs" />
                          </span>
                          <div>
                            <p className="item-title">{activityItem.title}</p>
                            <p className="item-meta">
                              {activityItem.meta} · {activityItem.timeLabel}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="button-row">
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => openWorkspace("invitations", "latest")}>
                      {t("notifications_open_invitations")}
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => openWorkspace("events", "latest")}>
                      {t("notifications_open_events")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <nav className="dashboard-nav desktop-only" aria-label={t("nav_sections")}>
          <div className="dashboard-nav-top">
            <div className="dashboard-nav-brand" aria-hidden="true">
              <BrandMark text={t("app_name")} fallback={t("logo_fallback")} />
              <span className="dashboard-nav-brand-copy">
                <span className="dashboard-nav-brand-name">{t("app_name")}</span>
                <span className="dashboard-nav-brand-role">{t("panel_title")}</span>
              </span>
            </div>
            <p className="dashboard-nav-title">{t("nav_sections")}</p>
          </div>
          <div className="dashboard-nav-links">
            {VIEW_CONFIG.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`nav-btn ${activeView === item.key ? "active" : ""}`}
                onClick={() => changeView(item.key)}
              >
                <Icon name={item.icon} className="icon" />
                {t(item.labelKey)}
              </button>
            ))}
          </div>
          <div className="dashboard-nav-footer">
            <Controls
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              language={language}
              setLanguage={setLanguage}
              t={t}
            />
            <div className="session-box session-box-sidebar">
              <span className="session-avatar" aria-hidden="true">
                {hostInitials}
              </span>
              <div className="session-meta">
                <p className="session-label">{t("active_session")}</p>
                <button
                  type="button"
                  className="session-value session-link"
                  onClick={openHostProfile}
                  title={t("session_open_profile")}
                >
                  {hostDisplayName}
                </button>
                <p className="session-email">{session?.user?.email || "-"}</p>
              </div>
              <button className="btn btn-ghost btn-sm" type="button" onClick={onSignOut}>
                {t("sign_out")}
              </button>
            </div>
          </div>
        </nav>

        <div className={`mobile-menu-overlay ${isMenuOpen ? "open" : ""}`} onClick={closeMobileMenu} />
        <aside id="mobile-menu" className={`mobile-menu ${isMenuOpen ? "open" : ""}`} aria-hidden={!isMenuOpen}>
          <div className="mobile-menu-header">
            <p className="item-title">{t("nav_sections")}</p>
            <button className="btn btn-ghost" type="button" onClick={closeMobileMenu}>
              {t("close_menu")}
            </button>
          </div>
          <nav className="mobile-nav-panels" aria-label={t("nav_sections")}>
            <div className={`mobile-nav-track ${mobileMenuDepth === "sub" ? "show-sub" : ""}`}>
              <section className="mobile-panel mobile-panel-root" aria-hidden={mobileMenuDepth === "sub"}>
                <div className="mobile-nav-list">
                  {mobileMenuItems.map((item) => {
                    const hasChildren = item.workspaceItems.length > 0;
                    const isActiveSection = activeView === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={`nav-btn mobile-panel-trigger ${isActiveSection ? "active" : ""}`}
                        onClick={() => handleOpenMobileSectionPanel(item.key, hasChildren)}
                      >
                        <span className="mobile-nav-group-label">
                          <Icon name={item.icon} className="icon" />
                          {t(item.labelKey)}
                        </span>
                        {hasChildren ? <Icon name="chevron_down" className="icon icon-xs mobile-panel-next" /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mobile-panel mobile-panel-sub" aria-hidden={mobileMenuDepth !== "sub"}>
                <div className="mobile-subnav mobile-subnav-panel">
                  <div className="mobile-subnav-header">
                    <button
                      className="btn btn-ghost btn-sm workspace-back-btn"
                      type="button"
                      onClick={() => setMobileMenuDepth("root")}
                    >
                      <Icon name="arrow_left" className="icon icon-sm" />
                      {t("mobile_back_sections")}
                    </button>
                    {mobilePanelWorkspace !== "hub" ? (
                      <button
                        className="btn btn-ghost btn-sm workspace-back-btn"
                        type="button"
                        onClick={() => openWorkspace(mobilePanelItem?.key || activeView, "hub")}
                      >
                        <Icon name="folder" className="icon icon-sm" />
                        {t("workspace_back_to_folders")}
                      </button>
                    ) : null}
                  </div>
                  <p className="mobile-subnav-breadcrumb">
                    <Icon name="folder" className="icon icon-sm" />
                    {t("workspace_path_prefix")}: {t(mobilePanelItem?.labelKey || "nav_sections")} /{" "}
                    {t(mobilePanelWorkspaceItem?.labelKey || "workspace_folders")}
                  </p>
                  <div className="mobile-subnav-list">
                    {mobilePanelWorkspaceItems.map((workspaceItem) => (
                      <button
                        key={workspaceItem.key}
                        type="button"
                        className={`nav-btn nav-btn-sm ${
                          activeView === mobilePanelItem?.key && mobilePanelWorkspace === workspaceItem.key ? "active" : ""
                        }`}
                        onClick={() => openWorkspace(mobilePanelItem?.key || activeView, workspaceItem.key)}
                      >
                        <Icon name={workspaceItem.icon} className="icon icon-sm" />
                        {t(workspaceItem.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </nav>
          <div className="mobile-menu-footer">
            {contextualCreateAction ? (
              <div className="mobile-menu-create-actions">
                <button className="btn btn-sm" type="button" onClick={contextualCreateAction.onClick}>
                  <Icon name={contextualCreateAction.icon} className="icon icon-sm" />
                  {contextualCreateAction.label}
                </button>
              </div>
            ) : null}
            <Controls
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              language={language}
              setLanguage={setLanguage}
              t={t}
            />
            <div className="session-box session-box-mobile">
              <span className="session-avatar" aria-hidden="true">
                {hostInitials}
              </span>
              <div className="session-meta">
                <p className="session-label">{t("active_session")}</p>
                <button
                  type="button"
                  className="session-value session-link"
                  onClick={openHostProfile}
                  title={t("session_open_profile")}
                >
                  {hostDisplayName}
                </button>
                <p className="session-email">{session?.user?.email || "-"}</p>
              </div>
              <button className="btn btn-ghost btn-sm" type="button" onClick={onSignOut}>
                {t("sign_out")}
              </button>
            </div>
          </div>
        </aside>

        <InlineMessage type="error" text={dashboardError} />

        {activeView === "overview" ? (
          <section className="overview-grid view-transition">
            <div className="overview-top-grid">
              <article className="panel overview-hero-card">
                <div className="overview-hero-head">
                  <div>
                    <p className="hint">{t("overview_hero_title")}</p>
                    <p className="kpi-value">{events.length + guests.length + invitations.length}</p>
                    <p className="field-help">{t("overview_hero_subtitle")}</p>
                  </div>
                  <div className="overview-hero-pills">
                    <span className="status-pill status-pending">
                      {t("kpi_pending_rsvp")}: {pendingInvites}
                    </span>
                    <span className="status-pill status-yes">
                      {t("kpi_answered_rsvp")}: {respondedInvitesRate}%
                    </span>
                    <span className="status-pill status-host-converted">
                      {t("kpi_converted_hosts")}: {convertedHostGuestsCount}
                    </span>
                  </div>
                </div>
                <div className="overview-hero-footer">
                  <p className="item-meta">
                    {nextScheduledEvent
                      ? `${t("overview_next_event_label")} ${nextScheduledEvent.title || "-"} - ${formatDate(
                          nextScheduledEvent.start_at,
                          language,
                          t("no_date")
                        )}`
                      : t("overview_next_event_empty")}
                  </p>
                  <div className="button-row">
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => openWorkspace("events", "create")}>
                      {t("create_event_title")}
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => openWorkspace("invitations", "create")}>
                      {t("create_invitation_title")}
                    </button>
                  </div>
                </div>
              </article>
              <article className="panel host-rating-panel">
                <h2 className="section-title">
                  <Icon name="star" className="icon" />
                  {t("host_rating_title")}
                </h2>
                <p className="field-help">{t("host_rating_hint")}</p>
                <p className="host-rating-score">
                  {hostRatingScore}
                  <span>/5</span>
                </p>
                <p className="item-meta">{t("host_rating_score_label")}</p>
                <div className="detail-badge-row">
                  <span className="status-pill status-completed">
                    {t("host_rating_metric_completed")}: {events.filter((eventItem) => eventItem.status === "completed").length}
                  </span>
                  <span className="status-pill status-yes">
                    {t("host_rating_metric_response")}: {respondedInvitesRate}%
                  </span>
                  <span className="status-pill status-host-converted">
                    {t("host_rating_metric_growth")}: {convertedHostRate}%
                  </span>
                </div>
                <p className="hint">
                  {t("host_rating_since_label")} {hostMemberSinceLabel}
                </p>
              </article>
            </div>
            <div className="overview-kpi-grid">
              <article
                className="panel kpi-card is-interactive"
                tabIndex={0}
                role="button"
                onClick={() => openWorkspace("events", "latest")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openWorkspace("events", "latest");
                  }
                }}
              >
                <div className="kpi-card-head">
                  <p className="hint">{t("kpi_events")}</p>
                  <span className="kpi-card-icon" aria-hidden="true">
                    <Icon name="calendar" className="icon" />
                  </span>
                </div>
                <p className="kpi-value">{events.length}</p>
                <div className="kpi-preview">
                  <p className="hint">{t("kpi_latest_events")}</p>
                  {latestEventPreview.length > 0 ? (
                    <ul className="kpi-preview-list">
                      {latestEventPreview.map((item) => (
                        <li key={`${item.main}-${item.meta}`} className="kpi-preview-item">
                          <p className="kpi-preview-main">{item.main}</p>
                          <p className="kpi-preview-meta">{item.meta}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="kpi-preview-meta">{t("kpi_preview_empty")}</p>
                  )}
                </div>
              </article>
              <article
                className="panel kpi-card is-interactive"
                tabIndex={0}
                role="button"
                onClick={() => openWorkspace("guests", "latest")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openWorkspace("guests", "latest");
                  }
                }}
              >
                <div className="kpi-card-head">
                  <p className="hint">{t("kpi_guests")}</p>
                  <span className="kpi-card-icon" aria-hidden="true">
                    <Icon name="user" className="icon" />
                  </span>
                </div>
                <p className="kpi-value">{guests.length}</p>
                <div className="kpi-preview">
                  <p className="hint">{t("kpi_latest_guests")}</p>
                  {latestGuestPreview.length > 0 ? (
                    <ul className="kpi-preview-list">
                      {latestGuestPreview.map((item) => (
                        <li key={`${item.main}-${item.meta}`} className="kpi-preview-item">
                          <p className="kpi-preview-main">{item.main}</p>
                          <p className="kpi-preview-meta">{item.meta}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="kpi-preview-meta">{t("kpi_preview_empty")}</p>
                  )}
                </div>
              </article>
              <article
                className="panel kpi-card is-interactive"
                tabIndex={0}
                role="button"
                onClick={() => openWorkspace("invitations", "latest")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openWorkspace("invitations", "latest");
                  }
                }}
              >
                <div className="kpi-card-head">
                  <p className="hint">{t("latest_invitations_title")}</p>
                  <span className="kpi-card-icon" aria-hidden="true">
                    <Icon name="mail" className="icon" />
                  </span>
                </div>
                <p className="kpi-value">{invitations.length}</p>
                <div className="kpi-preview">
                  <p className="hint">{t("kpi_latest_pending")}</p>
                  {pendingInvitationPreview.length > 0 ? (
                    <ul className="kpi-preview-list">
                      {pendingInvitationPreview.map((item) => (
                        <li key={`${item.main}-${item.meta}`} className="kpi-preview-item">
                          <p className="kpi-preview-main">{item.main}</p>
                          <p className="kpi-preview-meta">{item.meta}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="kpi-preview-meta">{t("kpi_preview_empty")}</p>
                  )}
                </div>
              </article>
              <article
                className="panel kpi-card is-interactive"
                tabIndex={0}
                role="button"
                onClick={() => openWorkspace("invitations", "latest")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openWorkspace("invitations", "latest");
                  }
                }}
              >
                <div className="kpi-card-head">
                  <p className="hint">{t("kpi_answered_rsvp")}</p>
                  <span className="kpi-card-icon" aria-hidden="true">
                    <Icon name="check" className="icon" />
                  </span>
                </div>
                <p className="kpi-value">{respondedInvitesRate}%</p>
                <div className="kpi-preview">
                  <p className="hint">{t("kpi_latest_answered")}</p>
                  {answeredInvitationPreview.length > 0 ? (
                    <ul className="kpi-preview-list">
                      {answeredInvitationPreview.map((item) => (
                        <li key={`${item.main}-${item.meta}`} className="kpi-preview-item">
                          <p className="kpi-preview-main">{item.main}</p>
                          <p className="kpi-preview-meta">{item.meta}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="kpi-preview-meta">{t("kpi_preview_empty")}</p>
                  )}
                </div>
              </article>
            </div>
            <div className="overview-pair-grid">
              <article className="panel overview-upcoming-panel">
                <div className="overview-upcoming-head">
                  <div>
                    <h2 className="section-title">
                      <Icon name="calendar" className="icon" />
                      {t("overview_upcoming_title")}
                    </h2>
                    <p className="field-help">{t("overview_upcoming_hint")}</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => openWorkspace("events", "latest")}>
                    {t("overview_upcoming_open")}
                  </button>
                </div>
                {upcomingEventsPreview.length === 0 ? (
                  <p className="hint">{t("overview_upcoming_empty")}</p>
                ) : (
                  <ul className="overview-upcoming-list">
                    {upcomingEventsPreview.map((eventItem) => (
                      <li key={`upcoming-${eventItem.id}`} className="overview-upcoming-item">
                        <div className="overview-upcoming-main">
                          <p className="item-title">{eventItem.title}</p>
                          <p className="item-meta">
                            {eventItem.date} · {interpolateText(t("overview_upcoming_guests"), { count: eventItem.guests })}
                          </p>
                        </div>
                        <div className="overview-upcoming-meta">
                          <span className={`status-pill ${statusClass(eventItem.status)}`}>{statusText(t, eventItem.status)}</span>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => openEventDetail(eventItem.id)}>
                            {t("view_detail")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article className="panel recent-activity-panel">
                <h2 className="section-title">
                  <Icon name="bell" className="icon" />
                  {t("recent_activity_title")}
                </h2>
                <p className="field-help">{t("recent_activity_hint")}</p>
                {recentActivityItems.length === 0 ? (
                  <p className="hint">{t("recent_activity_empty")}</p>
                ) : (
                  <ul className="recent-activity-list">
                    {recentActivityItems.slice(0, 6).map((activityItem) => (
                      <li key={activityItem.id} className="recent-activity-item">
                        <span className={`status-pill ${statusClass(activityItem.status)}`}>
                          <Icon name={activityItem.icon} className="icon icon-xs" />
                        </span>
                        <div>
                          <p className="item-title">{activityItem.title}</p>
                          <p className="item-meta">{activityItem.meta}</p>
                          <p className="hint">{activityItem.timeLabel}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
            <article className="panel growth-panel">
              <h2 className="section-title">
                <Icon name="trend" className="icon" />
                {t("growth_analytics_title")}
              </h2>
              <p className="field-help">{t("growth_analytics_hint")}</p>
              <div className="growth-funnel-grid">
                <article className="growth-metric-card">
                  <p className="hint">{t("growth_funnel_potential")}</p>
                  <p className="kpi-value">{hostPotentialGuestsCount}</p>
                </article>
                <article className="growth-metric-card">
                  <p className="hint">{t("growth_funnel_invited")}</p>
                  <p className="kpi-value">{invitedPotentialHostsCount}</p>
                </article>
                <article className="growth-metric-card">
                  <p className="hint">{t("growth_funnel_converted")}</p>
                  <p className="kpi-value">{convertedHostGuestsCount}</p>
                </article>
                <article className="growth-metric-card">
                  <p className="hint">{t("growth_funnel_rate")}</p>
                  <p className="kpi-value">{convertedHostRate}%</p>
                </article>
              </div>
              <div className="growth-window-row">
                <span className="status-pill status-host-conversion-source-default">
                  {t("growth_window_7d")} {conversionWindowCounts.d7}
                </span>
                <span className="status-pill status-host-conversion-source-default">
                  {t("growth_window_30d")} {conversionWindowCounts.d30}
                </span>
                <span className="status-pill status-host-conversion-source-default">
                  {t("growth_window_90d")} {conversionWindowCounts.d90}
                </span>
              </div>
              <div className="growth-source-row">
                <span className="status-pill status-host-conversion-source-default">
                  {t("host_conversion_source_email")}: {conversionBySource.email}
                </span>
                <span className="status-pill status-host-conversion-source-default">
                  {t("host_conversion_source_phone")}: {conversionBySource.phone}
                </span>
                <span className="status-pill status-host-conversion-source-google">
                  {t("host_conversion_source_google")}: {conversionBySource.google}
                </span>
              </div>
              <div className="growth-trend-chart" role="img" aria-label={t("growth_trend_14d_label")}>
                {conversionTrend14d.map((bucket) => {
                  const heightPercent = Math.max(8, Math.round((bucket.count / conversionTrendMax) * 100));
                  return (
                    <div key={bucket.key} className="growth-trend-column">
                      <span className="growth-trend-value">{bucket.count}</span>
                      <span className="growth-trend-bar" style={{ height: `${heightPercent}%` }} />
                      <span className="growth-trend-label">{bucket.label}</span>
                    </div>
                  );
                })}
              </div>
            </article>
            <article className="panel overview-footnote-panel">
              <h2 className="section-title">
                <Icon name="sparkle" className="icon" />
                {t("hint_accessibility")}
              </h2>
              <p className="field-help">{t("overview_help")}</p>
              <p className="field-help">{t("content_translation_note")}</p>
            </article>
          </section>
        ) : null}

        {activeView === "profile" ? (
          <section className="workspace-shell profile-shell view-transition">
            <header className="workspace-header">
              <h2 className="section-title">
                <Icon name="user" className="icon" />
                {t("host_profile_title")}
              </h2>
              <div className="workspace-meta">
                <p className="workspace-breadcrumb">
                  <Icon name="folder" className="icon icon-sm" />
                  {t("workspace_path_prefix")}: {t("active_session")} / {t("host_profile_title")}
                </p>
              </div>
            </header>

            <article className="panel profile-summary-card">
              <div className="profile-summary-header">
                <div>
                  <h3 className="section-title">
                    <Icon name="sparkle" className="icon" />
                    {t("host_profile_completeness_title")}
                  </h3>
                  <p className="field-help">{t("host_profile_completeness_hint")}</p>
                </div>
                <span className={`status-pill ${isProfileGuestLinked ? "status-yes" : "status-pending"}`}>
                  {isProfileGuestLinked ? t("host_profile_completeness_linked") : t("host_profile_completeness_unlinked")}
                </span>
              </div>
              {isProfileGuestLinked ? (
                <>
                  <div
                    className={`list-progress-track ${
                      hostGuestProfilePercent >= 70
                        ? "progress-high"
                        : hostGuestProfilePercent >= 35
                        ? "progress-medium"
                        : "progress-low"
                    }`}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={hostGuestProfilePercent}
                  >
                    <span style={{ width: `${hostGuestProfilePercent}%` }} />
                  </div>
                  <p className="item-meta">
                    {interpolateText(t("host_profile_completeness_progress"), {
                      done: hostGuestProfileCompletedCount,
                      total: hostGuestProfileTotalCount,
                      percent: hostGuestProfilePercent
                    })}
                  </p>
                  <div className="profile-summary-signals">
                    {hostGuestProfileSignals.map((signalItem) => (
                      <span key={signalItem.key} className={`status-pill ${signalItem.done ? "status-yes" : "status-draft"}`}>
                        {signalItem.label}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="hint">{t("host_profile_completeness_unlinked_hint")}</p>
              )}
              <div className="button-row">
                {isProfileGuestLinked ? (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => openGuestDetail(profileLinkedGuestId)}>
                    {t("host_profile_open_advanced_action")}
                  </button>
                ) : null}
                <button className="btn btn-ghost btn-sm" type="button" onClick={syncHostGuestProfileForm}>
                  {t("host_profile_guest_sync")}
                </button>
              </div>
            </article>

            <article className="panel profile-summary-card">
              <div className="profile-summary-header">
                <div>
                  <h3 className="section-title">
                    <Icon name="shield" className="icon" />
                    {t("global_profile_title")}
                  </h3>
                  <p className="field-help">{t("global_profile_hint")}</p>
                </div>
                <span className={`status-pill ${isGlobalProfileClaimed ? "status-yes" : "status-pending"}`}>
                  {isGlobalProfileClaimed ? t("global_profile_status_claimed") : t("global_profile_status_not_claimed")}
                </span>
              </div>
              {!isGlobalProfileFeatureReady ? (
                <p className="hint">{t("global_profile_feature_pending")}</p>
              ) : (
                <>
                  <p className="hint">
                    {isGlobalProfileClaimed
                      ? interpolateText(t("global_profile_id_hint"), { id: globalProfileId })
                      : t("global_profile_claim_hint")}
                  </p>
                  <div className="button-row">
                    <button className="btn btn-ghost btn-sm" type="button" onClick={handleClaimGlobalProfile} disabled={isClaimingGlobalProfile}>
                      {isClaimingGlobalProfile ? t("global_profile_claiming") : t("global_profile_claim_action")}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => handleLinkProfileGuestToGlobal(profileLinkedGuestId)}
                      disabled={isLinkingGlobalGuest || !isProfileGuestLinked}
                    >
                      {isLinkingGlobalGuest ? t("global_profile_linking") : t("global_profile_link_self_action")}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={handleLinkAllGuestsToGlobalProfiles}
                      disabled={isLinkingAllGlobalGuests}
                    >
                      {isLinkingAllGlobalGuests ? t("global_profile_linking_all") : t("global_profile_link_all_action")}
                    </button>
                  </div>
                  <div className="profile-summary-signals">
                    <span className="status-pill status-host-conversion-source-default">
                      {t("global_profile_share_targets_count")} {globalShareTargetsVisible.length}
                    </span>
                    <span className="status-pill status-host-conversion-source-default">
                      {t("global_profile_share_active_count")} {globalShareActiveCount}
                    </span>
                  </div>
                  {globalShareSelfTargetCount > 0 ? (
                    <p className="hint">{t("global_profile_share_self_hidden_hint")}</p>
                  ) : null}
                  {globalShareTargetsVisible.length > 0 ? (
                    <div className="global-share-grid">
                      {globalShareTargetsVisible.map((targetItem) => {
                        const hostId = targetItem.host_user_id;
                        const shareDraft = globalShareDraftByHostId[hostId] || {
                          status: "inactive",
                          allow_identity: false,
                          allow_food: false,
                          allow_lifestyle: false,
                          allow_conversation: false,
                          allow_health: false
                        };
                        return (
                          <article key={hostId} className="recommendation-card global-share-card">
                            <p className="item-title">{targetItem.host_name || t("host_default_name")}</p>
                            <p className="item-meta">{targetItem.host_email || hostId}</p>
                            <p className="hint">
                              {t("global_profile_link_count_hint")} {targetItem.link_count || 0}
                            </p>
                            <label>
                              <span className="label-title">{t("status")}</span>
                              <select
                                value={shareDraft.status || "inactive"}
                                onChange={(event) => handleChangeGlobalShareDraft(hostId, "status", event.target.value)}
                              >
                                <option value="active">{t("status_active")}</option>
                                <option value="revoked">{t("status_revoked")}</option>
                              </select>
                            </label>
                            <div className="global-share-permissions">
                              <label className="event-setting-toggle">
                                <input
                                  type="checkbox"
                                  checked={Boolean(shareDraft.allow_identity)}
                                  onChange={(event) =>
                                    handleChangeGlobalShareDraft(hostId, "allow_identity", event.target.checked)
                                  }
                                />
                                {t("global_profile_scope_identity")}
                              </label>
                              <label className="event-setting-toggle">
                                <input
                                  type="checkbox"
                                  checked={Boolean(shareDraft.allow_food)}
                                  onChange={(event) => handleChangeGlobalShareDraft(hostId, "allow_food", event.target.checked)}
                                />
                                {t("global_profile_scope_food")}
                              </label>
                              <label className="event-setting-toggle">
                                <input
                                  type="checkbox"
                                  checked={Boolean(shareDraft.allow_lifestyle)}
                                  onChange={(event) =>
                                    handleChangeGlobalShareDraft(hostId, "allow_lifestyle", event.target.checked)
                                  }
                                />
                                {t("global_profile_scope_lifestyle")}
                              </label>
                              <label className="event-setting-toggle">
                                <input
                                  type="checkbox"
                                  checked={Boolean(shareDraft.allow_conversation)}
                                  onChange={(event) =>
                                    handleChangeGlobalShareDraft(hostId, "allow_conversation", event.target.checked)
                                  }
                                />
                                {t("global_profile_scope_conversation")}
                              </label>
                              <label className="event-setting-toggle">
                                <input
                                  type="checkbox"
                                  checked={Boolean(shareDraft.allow_health)}
                                  onChange={(event) =>
                                    handleChangeGlobalShareDraft(hostId, "allow_health", event.target.checked)
                                  }
                                />
                                {t("global_profile_scope_health")}
                              </label>
                            </div>
                            <div className="button-row">
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                onClick={() => handleSaveGlobalShare(hostId)}
                                disabled={savingGlobalShareHostId === hostId}
                              >
                                {savingGlobalShareHostId === hostId
                                  ? t("global_profile_share_saving")
                                  : t("global_profile_share_save_action")}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="hint">{t("global_profile_share_targets_empty")}</p>
                  )}
                </>
              )}
              <InlineMessage text={globalProfileMessage} />
            </article>

            <div className="profile-grid">
              <form className="panel form-grid host-profile-panel" onSubmit={handleSaveHostProfile} noValidate>
                <h3 className="section-title">
                  <Icon name="user" className="icon" />
                  {t("host_profile_title")}
                </h3>
                <p className="field-help">{t("host_profile_hint")}</p>

                <label>
                  <span className="label-title">{t("field_full_name")}</span>
                  <input
                    type="text"
                    value={hostProfileName}
                    onChange={(event) => setHostProfileName(event.target.value)}
                    placeholder={t("placeholder_full_name")}
                  />
                </label>
                <label>
                  <span className="label-title">
                    <Icon name="mail" className="icon icon-sm" />
                    {t("email")}
                  </span>
                  <input type="email" value={session?.user?.email || ""} readOnly />
                  <FieldMeta helpText={t("host_profile_email_readonly")} />
                </label>
                <label>
                  <span className="label-title">
                    <Icon name="phone" className="icon icon-sm" />
                    {t("field_phone")}
                  </span>
                  <input
                    type="tel"
                    value={hostProfilePhone}
                    onChange={(event) => setHostProfilePhone(event.target.value)}
                    placeholder={t("placeholder_phone")}
                  />
                </label>
                <label>
                  <span className="label-title">{t("field_city")}</span>
                  <input
                    type="text"
                    value={hostProfileCity}
                    onChange={(event) => setHostProfileCity(event.target.value)}
                    placeholder={t("placeholder_city")}
                    list="host-city-options"
                  />
                </label>
                <label>
                  <span className="label-title">{t("field_country")}</span>
                  <input
                    type="text"
                    value={hostProfileCountry}
                    onChange={(event) => setHostProfileCountry(event.target.value)}
                    placeholder={t("placeholder_country")}
                    list="host-country-options"
                  />
                </label>
                <label>
                  <span className="label-title">{t("field_relationship")}</span>
                  <select value={hostProfileRelationship} onChange={(event) => setHostProfileRelationship(event.target.value)}>
                    <option value="">{t("select_option_prompt")}</option>
                    {relationshipOptions.map((optionValue) => (
                      <option key={optionValue} value={optionValue}>
                        {optionValue}
                      </option>
                    ))}
                  </select>
                </label>

                <datalist id="host-city-options">
                  {cityOptions.map((optionValue) => (
                    <option key={optionValue} value={optionValue} />
                  ))}
                </datalist>
                <datalist id="host-country-options">
                  {countryOptions.map((optionValue) => (
                    <option key={optionValue} value={optionValue} />
                  ))}
                </datalist>

                <div className="button-row">
                  <button className="btn" type="submit" disabled={isSavingHostProfile}>
                    {isSavingHostProfile ? t("host_profile_saving") : t("host_profile_save")}
                  </button>
                </div>
                <FieldMeta helpText={t("host_profile_sync_hint")} />
                <InlineMessage text={hostProfileMessage} />
              </form>

              <form className="panel form-grid host-profile-panel" onSubmit={handleSaveGuest} noValidate>
                <div className="profile-linkage-row">
                  <h3 className="section-title">
                    <Icon name="user" className="icon" />
                    {t("host_profile_guest_title")}
                  </h3>
                  <span className={`status-pill ${isProfileGuestLinked ? "status-yes" : "status-pending"}`}>
                    {isProfileGuestLinked ? t("host_profile_guest_linked") : t("host_profile_guest_unlinked")}
                  </span>
                </div>
                <p className="field-help">{t("host_profile_guest_hint")}</p>

                <label>
                  <span className="label-title">{t("field_first_name")} *</span>
                  <input
                    type="text"
                    value={guestFirstName}
                    onChange={(event) => setGuestFirstName(event.target.value)}
                    placeholder={t("placeholder_first_name")}
                    aria-invalid={Boolean(guestErrors.firstName)}
                  />
                  <FieldMeta errorText={guestErrors.firstName ? t(guestErrors.firstName) : ""} />
                </label>
                <label>
                  <span className="label-title">{t("field_last_name")}</span>
                  <input
                    type="text"
                    value={guestLastName}
                    onChange={(event) => setGuestLastName(event.target.value)}
                    placeholder={t("placeholder_last_name")}
                    aria-invalid={Boolean(guestErrors.lastName)}
                  />
                  <FieldMeta errorText={guestErrors.lastName ? t(guestErrors.lastName) : ""} />
                </label>
                <label>
                  <span className="label-title">
                    <Icon name="mail" className="icon icon-sm" />
                    {t("email")}
                  </span>
                  <input type="email" value={guestEmail || session?.user?.email || ""} readOnly />
                  <FieldMeta helpText={t("host_profile_guest_email_hint")} />
                </label>
                <label>
                  <span className="label-title">
                    <Icon name="phone" className="icon icon-sm" />
                    {t("field_phone")}
                  </span>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(event) => setGuestPhone(event.target.value)}
                    placeholder={t("placeholder_phone")}
                    aria-invalid={Boolean(guestErrors.phone)}
                  />
                  <FieldMeta errorText={guestErrors.phone ? t(guestErrors.phone) : ""} />
                </label>
                <label>
                  <span className="label-title">{t("field_relationship")}</span>
                  <input
                    type="text"
                    value={guestRelationship}
                    onChange={(event) => setGuestRelationship(event.target.value)}
                    placeholder={t("placeholder_relationship")}
                    list="profile-guest-relationship-options"
                    aria-invalid={Boolean(guestErrors.relationship)}
                  />
                  <FieldMeta errorText={guestErrors.relationship ? t(guestErrors.relationship) : ""} />
                </label>
                <label>
                  <span className="label-title">{t("field_city")}</span>
                  <input
                    type="text"
                    value={guestCity}
                    onChange={(event) => setGuestCity(event.target.value)}
                    placeholder={t("placeholder_city")}
                    list="profile-guest-city-options"
                    aria-invalid={Boolean(guestErrors.city)}
                  />
                  <FieldMeta errorText={guestErrors.city ? t(guestErrors.city) : ""} />
                </label>
                <label>
                  <span className="label-title">{t("field_country")}</span>
                  <input
                    type="text"
                    value={guestCountry}
                    onChange={(event) => setGuestCountry(event.target.value)}
                    placeholder={t("placeholder_country")}
                    list="profile-guest-country-options"
                    aria-invalid={Boolean(guestErrors.country)}
                  />
                  <FieldMeta errorText={guestErrors.country ? t(guestErrors.country) : ""} />
                </label>
                <label>
                  <span className="label-title">
                    <Icon name="location" className="icon icon-sm" />
                    {t("field_address")}
                  </span>
                  <input
                    type="text"
                    value={guestAdvanced.address}
                    onChange={(event) => {
                      setGuestAdvancedField("address", event.target.value);
                      if (
                        selectedGuestAddressPlace &&
                        normalizeLookupValue(event.target.value) !==
                          normalizeLookupValue(selectedGuestAddressPlace.formattedAddress)
                      ) {
                        setSelectedGuestAddressPlace(null);
                      }
                    }}
                    placeholder={t("placeholder_address")}
                    aria-invalid={Boolean(guestErrors.address)}
                    autoComplete="off"
                  />
                  <FieldMeta
                    helpText={
                      mapsStatus === "ready"
                        ? t("address_google_hint")
                        : mapsStatus === "loading"
                        ? t("address_google_loading")
                        : mapsStatus === "error"
                        ? `${t("address_google_error")} ${mapsError}`
                        : t("address_google_unconfigured")
                    }
                    errorText={guestErrors.address ? t(guestErrors.address) : ""}
                  />
                  {mapsStatus === "ready" && guestAdvanced.address.trim().length >= 4 ? (
                    <ul className="prediction-list" role="listbox" aria-label={t("address_suggestions")}>
                      {isGuestAddressLoading ? <li className="prediction-item hint">{t("address_searching")}</li> : null}
                      {!isGuestAddressLoading && guestAddressPredictions.length === 0 ? (
                        <li className="prediction-item hint">{t("address_no_matches")}</li>
                      ) : null}
                      {guestAddressPredictions.map((prediction) => (
                        <li key={prediction.place_id}>
                          <button
                            type="button"
                            className="prediction-item"
                            onClick={() => handleSelectGuestAddressPrediction(prediction)}
                          >
                            <Icon name="location" className="icon icon-sm" />
                            {prediction.description}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {selectedGuestAddressPlace?.placeId ? <p className="field-success">{t("address_validated")}</p> : null}
                </label>

                <datalist id="profile-guest-relationship-options">
                  {relationshipOptions.map((optionValue) => (
                    <option key={optionValue} value={optionValue} />
                  ))}
                </datalist>
                <datalist id="profile-guest-city-options">
                  {cityOptions.map((optionValue) => (
                    <option key={optionValue} value={optionValue} />
                  ))}
                </datalist>
                <datalist id="profile-guest-country-options">
                  {countryOptions.map((optionValue) => (
                    <option key={optionValue} value={optionValue} />
                  ))}
                </datalist>

                <div className="button-row">
                  <button className="btn" type="submit" disabled={isSavingGuest}>
                    {isSavingGuest
                      ? isEditingGuest
                        ? t("updating_guest")
                        : t("saving_guest")
                      : isEditingGuest
                      ? t("update_guest")
                      : t("save_guest")}
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={syncHostGuestProfileForm}>
                    {t("host_profile_guest_sync")}
                  </button>
                  {isProfileGuestLinked ? (
                    <button className="btn btn-ghost" type="button" onClick={() => openGuestDetail(profileLinkedGuestId)}>
                      {t("view_guest_detail_action")}
                    </button>
                  ) : null}
                </div>
                <FieldMeta helpText={t("host_profile_guest_save_hint")} />
                <InlineMessage text={guestMessage} />
              </form>
            </div>
          </section>
        ) : null}

        {activeView === "events" ? (
          <section className="workspace-shell view-transition">
            <header className="workspace-header">
              <h2 className="section-title">
                <Icon name="calendar" className="icon" />
                {t("nav_events")}
              </h2>
              <div className="workspace-tabs" role="tablist" aria-label={t("workspace_subsections")}>
                {WORKSPACE_ITEMS.events.filter((item) => item.key !== "create").map((workspaceItem) => (
                  <button
                    key={workspaceItem.key}
                    type="button"
                    role="tab"
                    aria-selected={eventsWorkspace === workspaceItem.key}
                    className={`workspace-tab ${eventsWorkspace === workspaceItem.key ? "active" : ""}`}
                    onClick={() => setEventsWorkspace(workspaceItem.key)}
                  >
                    <Icon name={workspaceItem.icon} className="icon icon-sm" />
                    {t(workspaceItem.labelKey)}
                  </button>
                ))}
              </div>
              <div className="workspace-meta">
                <p className="workspace-breadcrumb">
                  <Icon name="folder" className="icon icon-sm" />
                  {t("workspace_path_prefix")}: {t("nav_events")} / {t(eventsWorkspaceItem.labelKey)}
                </p>
                {eventsWorkspace !== "hub" ? (
                  <button className="btn btn-ghost btn-sm workspace-back-btn" type="button" onClick={() => setEventsWorkspace("hub")}>
                    <Icon name="arrow_left" className="icon icon-sm" />
                    {t("workspace_back_to_folders")}
                  </button>
                ) : null}
              </div>
            </header>

            {eventsWorkspace === "hub" ? (
              <div className="workspace-card-grid">
                {WORKSPACE_ITEMS.events.filter((item) => item.key !== "hub" && item.key !== "create").map((workspaceItem) => (
                  <article key={workspaceItem.key} className="workspace-card">
                    <div className="workspace-card-icon">
                      <Icon name={workspaceItem.icon} className="icon" />
                    </div>
                    <div className="workspace-card-content">
                      <h3>{t(workspaceItem.labelKey)}</h3>
                      <p>{t(workspaceItem.descriptionKey)}</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEventsWorkspace(workspaceItem.key)}>
                      {t("workspace_open")}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div key={`events-${eventsWorkspace}`} className="dashboard-grid single-section workspace-content">
            {eventsWorkspace === "create" ? (
            <form className="panel form-grid event-builder-form" onSubmit={handleSaveEvent} noValidate>
              <div className="event-builder-shell">
                <div className="event-builder-main">
                  <header className="event-builder-heading">
                    <h2 className="section-title">
                      <Icon name="calendar" className="icon" />
                      {isEditingEvent ? t("edit_event_title") : t("create_event_title")}
                    </h2>
                    <p className="field-help">{t("help_event_form")}</p>
                  </header>

                  <section className="event-template-strip" aria-label={t("event_templates_title")}>
                    <p className="label-title">
                      <Icon name="sparkle" className="icon icon-sm" />
                      {t("event_templates_title")}
                    </p>
                    <p className="field-help">{t("event_templates_hint")}</p>
                    <div className="event-template-buttons">
                      {eventTemplates.map((templateItem) => (
                        <button
                          key={templateItem.key}
                          type="button"
                          className={`btn btn-ghost btn-sm ${activeEventTemplateKey === templateItem.key ? "active" : ""}`}
                          aria-pressed={activeEventTemplateKey === templateItem.key}
                          onClick={() => handleApplyEventTemplate(templateItem.key)}
                        >
                          {t(templateItem.titleKey)}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="event-phase-section">
                    <h3>{t("event_phase_planning")}</h3>

                    <label>
                      <span className="label-title">{t("field_title")} *</span>
                      <input
                        type="text"
                        value={eventTitle}
                        onChange={(event) => setEventTitle(event.target.value)}
                        placeholder={t("placeholder_event_title")}
                        aria-invalid={Boolean(eventErrors.title)}
                      />
                      <FieldMeta errorText={eventErrors.title ? t(eventErrors.title) : ""} />
                    </label>

                    <label>
                      <span className="label-title">{t("field_event_description")}</span>
                      <textarea
                        rows={4}
                        value={eventDescription}
                        onChange={(event) => setEventDescription(event.target.value)}
                        placeholder={t("placeholder_event_description")}
                        aria-invalid={Boolean(eventErrors.description)}
                      />
                      <FieldMeta
                        helpText={t("event_description_help")}
                        errorText={eventErrors.description ? t(eventErrors.description) : ""}
                      />
                    </label>

                    <label>
                      <span className="label-title">{t("field_event_type")}</span>
                      <select
                        value={eventType}
                        onChange={(event) => setEventType(event.target.value)}
                        aria-invalid={Boolean(eventErrors.eventType)}
                      >
                        <option value="">{t("select_option_prompt")}</option>
                        {eventTypeOptions.map((optionValue) => (
                          <option key={optionValue} value={optionValue}>
                            {optionValue}
                          </option>
                        ))}
                      </select>
                      <FieldMeta errorText={eventErrors.eventType ? t(eventErrors.eventType) : ""} />
                    </label>

                    <label>
                      <span className="label-title">{t("field_event_status")}</span>
                      <select value={eventStatus} onChange={(event) => setEventStatus(event.target.value)}>
                        <option value="draft">{t("status_draft")}</option>
                        <option value="published">{t("status_published")}</option>
                        <option value="completed">{t("status_completed")}</option>
                        <option value="cancelled">{t("status_cancelled")}</option>
                      </select>
                      <FieldMeta helpText={t("event_status_help")} />
                    </label>
                  </section>

                  <section className="event-phase-section">
                    <h3>{t("event_phase_logistics")}</h3>

                    <label>
                      <span className="label-title">
                        <Icon name="calendar" className="icon icon-sm" />
                        {t("field_datetime")}
                      </span>
                      <input type="datetime-local" value={eventStartAt} onChange={(event) => setEventStartAt(event.target.value)} />
                    </label>

                    <label>
                      <span className="label-title">
                        <Icon name="location" className="icon icon-sm" />
                        {t("field_place")}
                      </span>
                      <input
                        type="text"
                        value={eventLocationName}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setEventLocationName(nextValue);
                          setEventErrors((prev) => ({ ...prev, locationName: undefined }));
                          setEventMessage("");
                          const match = findUniqueLocationByName(nextValue);
                          if (!match?.address) {
                            return;
                          }
                          setEventLocationAddress(match.address);
                          setAddressPredictions([]);
                          const placeFromKnownLocation = toSelectedPlaceFromLocationPair(match, match.address);
                          if (placeFromKnownLocation) {
                            setSelectedPlace(placeFromKnownLocation);
                          }
                        }}
                        placeholder={t("placeholder_place")}
                        list="event-place-options"
                        aria-invalid={Boolean(eventErrors.locationName)}
                      />
                      <FieldMeta errorText={eventErrors.locationName ? t(eventErrors.locationName) : ""} />
                    </label>

                    <label>
                      <span className="label-title">
                        <Icon name="location" className="icon icon-sm" />
                        {t("field_address")}
                      </span>
                      <input
                        type="text"
                        value={eventLocationAddress}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setEventLocationAddress(nextValue);
                          setEventErrors((prev) => ({ ...prev, locationAddress: undefined }));
                          setEventMessage("");
                          const matchedByAddress = findUniqueLocationByAddress(nextValue);
                          if (matchedByAddress?.name) {
                            setEventLocationName(matchedByAddress.name);
                          }
                          if (
                            selectedPlace &&
                            normalizeLookupValue(nextValue) !== normalizeLookupValue(selectedPlace.formattedAddress)
                          ) {
                            setSelectedPlace(null);
                          }
                          const placeFromKnownLocation = toSelectedPlaceFromLocationPair(matchedByAddress, nextValue);
                          if (placeFromKnownLocation) {
                            setSelectedPlace(placeFromKnownLocation);
                          }
                        }}
                        placeholder={t("placeholder_address")}
                        aria-invalid={Boolean(eventErrors.locationAddress)}
                        autoComplete="off"
                        list="event-address-options"
                      />
                      <FieldMeta
                        helpText={
                          mapsStatus === "ready"
                            ? t("address_google_hint")
                            : mapsStatus === "loading"
                            ? t("address_google_loading")
                            : mapsStatus === "error"
                            ? `${t("address_google_error")} ${mapsError}`
                            : t("address_google_unconfigured")
                        }
                        errorText={eventErrors.locationAddress ? t(eventErrors.locationAddress) : ""}
                      />
                      {mapsStatus === "ready" && eventLocationAddress.trim().length >= 4 ? (
                        <ul className="prediction-list" role="listbox" aria-label={t("address_suggestions")}>
                          {isAddressLoading ? <li className="prediction-item hint">{t("address_searching")}</li> : null}
                          {!isAddressLoading && addressPredictions.length === 0 ? (
                            <li className="prediction-item hint">{t("address_no_matches")}</li>
                          ) : null}
                          {addressPredictions.map((prediction) => (
                            <li key={prediction.place_id}>
                              <button
                                type="button"
                                className="prediction-item"
                                onClick={() => handleSelectAddressPrediction(prediction)}
                              >
                                <Icon name="location" className="icon icon-sm" />
                                {prediction.description}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {selectedPlace?.placeId ? (
                        <p className="field-success">{t("address_validated")}</p>
                      ) : null}
                    </label>

                    {typeof selectedPlace?.lat === "number" && typeof selectedPlace?.lng === "number" ? (
                      <div className="map-preview" aria-label={t("map_preview_title")}>
                        <iframe
                          title={t("map_preview_title")}
                          src={getMapEmbedUrl(selectedPlace.lat, selectedPlace.lng)}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    ) : null}
                  </section>

                  <p className="hint">
                    {t("timezone_detected")}: {timezone}
                  </p>
                </div>

                <aside className="event-builder-aside">
                  <section className="event-builder-actions">
                    <div className="button-row event-builder-button-row">
                      <button className="btn" type="submit" disabled={isSavingEvent}>
                        {isSavingEvent
                          ? isEditingEvent
                            ? t("updating_event")
                            : t("saving_event")
                          : isEditingEvent
                          ? t("update_event")
                          : t("save_event")}
                      </button>
                      {isEditingEvent ? (
                        <button className="btn btn-ghost" type="button" onClick={handleCancelEditEvent}>
                          {t("cancel_edit")}
                        </button>
                      ) : null}
                    </div>
                  </section>

                  <section className="event-progress-strip" aria-label={t("event_progress_title")}>
                    <div className="event-progress-header">
                      <p className="label-title">{t("event_progress_title")}</p>
                      <strong>{eventPhaseProgress.percent}%</strong>
                    </div>
                    <div
                      className="event-progress-track"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={eventPhaseProgress.percent}
                    >
                      <span style={{ width: `${eventPhaseProgress.percent}%` }} />
                    </div>
                    <div className="event-phase-pills">
                      {eventPhaseProgress.byPhase.map((phaseItem) => (
                        <span key={phaseItem.key} className={`event-phase-pill ${phaseItem.done === phaseItem.total ? "done" : ""}`}>
                          {t(`event_phase_${phaseItem.key}`)} {phaseItem.done}/{phaseItem.total}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="event-phase-section event-phase-section-publish">
                    <h3>{t("event_phase_publish")}</h3>
                    <p className="field-help">{t("event_phase_publish_hint")}</p>
                    {editingEventId ? (
                      <p className="hint">
                        {t("event_phase_publish_invites")} {invitationCountForEditingEvent}
                      </p>
                    ) : (
                      <p className="hint">{t("event_phase_publish_after_save")}</p>
                    )}
                  </section>

                  <section className="event-phase-section">
                    <h3>{t("event_settings_title")}</h3>
                    <p className="field-help">{t("event_settings_hint")}</p>
                    <label className="event-setting-toggle">
                      <input
                        type="checkbox"
                        checked={eventAllowPlusOne}
                        onChange={(event) => setEventAllowPlusOne(event.target.checked)}
                      />
                      <span>{t("event_setting_allow_plus_one")}</span>
                    </label>
                    <label className="event-setting-toggle">
                      <input
                        type="checkbox"
                        checked={eventAutoReminders}
                        onChange={(event) => setEventAutoReminders(event.target.checked)}
                      />
                      <span>{t("event_setting_auto_reminders")}</span>
                    </label>
                    <label>
                      <span className="label-title">{t("event_setting_dress_code")}</span>
                      <select value={eventDressCode} onChange={(event) => setEventDressCode(event.target.value)}>
                        <option value="none">{t("event_dress_code_none")}</option>
                        <option value="casual">{t("event_dress_code_casual")}</option>
                        <option value="elegant">{t("event_dress_code_elegant")}</option>
                        <option value="formal">{t("event_dress_code_formal")}</option>
                        <option value="themed">{t("event_dress_code_themed")}</option>
                      </select>
                      <FieldMeta errorText={eventErrors.dressCode ? t(eventErrors.dressCode) : ""} />
                    </label>
                    <label>
                      <span className="label-title">{t("event_setting_playlist_mode")}</span>
                      <select value={eventPlaylistMode} onChange={(event) => setEventPlaylistMode(event.target.value)}>
                        <option value="host_only">{t("event_playlist_mode_host_only")}</option>
                        <option value="collaborative">{t("event_playlist_mode_collaborative")}</option>
                        <option value="spotify_collaborative">{t("event_playlist_mode_spotify_collaborative")}</option>
                      </select>
                      <FieldMeta errorText={eventErrors.playlistMode ? t(eventErrors.playlistMode) : ""} />
                    </label>
                  </section>

                  <section className="event-phase-summary">
                    <p className="label-title">{t("event_progress_title")}</p>
                    <ul className="event-phase-summary-list">
                      {eventPhaseProgress.byPhase.map((phaseItem) => {
                        const isDone = phaseItem.done === phaseItem.total;
                        return (
                          <li key={`summary-${phaseItem.key}`} className={`event-phase-summary-item ${isDone ? "done" : ""}`}>
                            <span className="event-phase-summary-dot" aria-hidden="true" />
                            <span>{t(`event_phase_${phaseItem.key}`)}</span>
                            <strong>
                              {phaseItem.done}/{phaseItem.total}
                            </strong>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                </aside>
              </div>

              <datalist id="event-type-options">
                {eventTypeOptions.map((optionValue) => (
                  <option key={optionValue} value={optionValue} />
                ))}
              </datalist>
              <datalist id="event-place-options">
                {locationNameOptions.map((optionValue) => (
                  <option key={optionValue} value={optionValue} />
                ))}
              </datalist>
              <datalist id="event-address-options">
                {locationAddressOptions.map((optionValue) => (
                  <option key={optionValue} value={optionValue} />
                ))}
              </datalist>
              <InlineMessage text={eventMessage} />
            </form>
            ) : null}

            {eventsWorkspace === "latest" ? (
            <section className="panel panel-list panel-events-latest">
              <h2 className="section-title">
                <Icon name="calendar" className="icon" />
                {t("latest_events_title")}
              </h2>
              <div className="list-tools">
                <label>
                  <span className="label-title">{t("search")}</span>
                  <input
                    type="search"
                    value={eventSearch}
                    onChange={(event) => setEventSearch(event.target.value)}
                    placeholder={t("search_events_placeholder")}
                  />
                </label>
                <label>
                  <span className="label-title">{t("sort_by")}</span>
                  <select value={eventSort} onChange={(event) => setEventSort(event.target.value)}>
                    <option value="created_desc">{t("sort_created_desc")}</option>
                    <option value="created_asc">{t("sort_created_asc")}</option>
                    <option value="start_asc">{t("sort_date_asc")}</option>
                    <option value="start_desc">{t("sort_date_desc")}</option>
                    <option value="title_asc">{t("sort_title_asc")}</option>
                  </select>
                </label>
              </div>
              <div className="list-filter-tabs" role="group" aria-label={t("filter_status")}>
                {[
                  { key: "all", label: t("all_status") },
                  { key: "published", label: t("status_published") },
                  { key: "draft", label: t("status_draft") },
                  { key: "completed", label: t("status_completed") },
                  { key: "cancelled", label: t("status_cancelled") }
                ].map((statusOption) => (
                  <button
                    key={statusOption.key}
                    className={`list-filter-tab ${eventStatusFilter === statusOption.key ? "active" : ""}`}
                    type="button"
                    aria-pressed={eventStatusFilter === statusOption.key}
                    onClick={() => setEventStatusFilter(statusOption.key)}
                  >
                    {statusOption.label}
                  </button>
                ))}
              </div>
              <p className="hint">
                {t("results_count")}: {filteredEvents.length}
              </p>
              {filteredEvents.length === 0 ? (
                <p>{t("no_events")}</p>
              ) : (
                <>
                <div className="list-table-shell">
                  <div className="list-table-head list-table-head-events" aria-hidden="true">
                    <span>{t("field_event")}</span>
                    <span>{t("date")}</span>
                    <span>{t("field_guest")}</span>
                    <span>{t("status")}</span>
                    <span>RSVP</span>
                    <span>{t("actions_label")}</span>
                  </div>
                  <ul className="list list-table list-table-events">
                    {pagedEvents.map((eventItem) => {
                      const invitationSummary = eventInvitationSummaryByEventId[eventItem.id] || {
                        total: 0,
                        pending: 0,
                        yes: 0,
                        no: 0,
                        maybe: 0,
                        responded: 0,
                        respondedRate: 0
                      };
                      return (
                      <li key={eventItem.id} className="list-table-row list-row-event">
                        <div className="cell-main">
                          <p className="item-title">{eventItem.title}</p>
                          <p className="item-meta">{eventItem.event_type ? toCatalogLabel("experience_type", eventItem.event_type, language) : "—"}</p>
                          <p className="item-meta">{eventItem.location_name || eventItem.location_address || "—"}</p>
                        </div>
                        <p className="item-meta cell-event-date cell-meta">
                          {formatDate(eventItem.start_at, language, t("no_date"))}
                        </p>
                        <div className="cell-event-guests cell-extra">
                          <p className="item-title">{invitationSummary.total}</p>
                          <p className="item-meta">
                            {t("status_pending")}: {invitationSummary.pending}
                          </p>
                        </div>
                        <div className="cell-event-status cell-meta">
                          <span className={`status-pill ${statusClass(eventItem.status)}`}>{statusText(t, eventItem.status)}</span>
                        </div>
                        <div className="cell-event-rsvp cell-extra">
                          <div
                            className={`list-progress-track ${
                              invitationSummary.respondedRate >= 70
                                ? "progress-high"
                                : invitationSummary.respondedRate >= 35
                                ? "progress-medium"
                                : "progress-low"
                            }`}
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={invitationSummary.respondedRate}
                          >
                            <span style={{ width: `${invitationSummary.respondedRate}%` }} />
                          </div>
                          <p className="item-meta">
                            {invitationSummary.respondedRate}% · {invitationSummary.yes}/{invitationSummary.total}
                          </p>
                        </div>
                        <div className="item-actions cell-actions list-actions-compact list-actions-iconic">
                          <button
                            className="btn btn-ghost btn-sm btn-icon-only"
                            type="button"
                            onClick={() => openEventDetail(eventItem.id)}
                            aria-label={t("view_detail")}
                            title={t("view_detail")}
                          >
                            <Icon name="eye" className="icon icon-sm" />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon-only"
                            type="button"
                            onClick={() => handleStartEditEvent(eventItem)}
                            aria-label={t("edit_event")}
                            title={t("edit_event")}
                          >
                            <Icon name="edit" className="icon icon-sm" />
                          </button>
                          {eventItem.location_lat != null && eventItem.location_lng != null ? (
                            <a
                              className="btn btn-ghost btn-sm btn-icon-only"
                              href={`https://www.google.com/maps?q=${eventItem.location_lat},${eventItem.location_lng}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={t("map_open_external")}
                              title={t("map_open_external")}
                            >
                              <Icon name="location" className="icon icon-sm" />
                            </a>
                          ) : null}
                          <button
                            className="btn btn-danger btn-sm btn-icon-only"
                            type="button"
                            onClick={() => handleRequestDeleteEvent(eventItem)}
                            disabled={isDeletingEventId === eventItem.id}
                            aria-label={isDeletingEventId === eventItem.id ? t("deleting") : t("delete_event")}
                            title={isDeletingEventId === eventItem.id ? t("deleting") : t("delete_event")}
                          >
                            <Icon name="x" className="icon icon-sm" />
                          </button>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                </div>
                </>
              )}
              {filteredEvents.length > 0 ? (
                <div className="pagination-row">
                  <p className="hint">
                    {t("pagination_page")} {eventPage}/{eventTotalPages}
                  </p>
                  <div className="button-row">
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => setEventPage((prev) => Math.max(1, prev - 1))}
                      disabled={eventPage <= 1}
                    >
                      {t("pagination_prev")}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => setEventPage((prev) => Math.min(eventTotalPages, prev + 1))}
                      disabled={eventPage >= eventTotalPages}
                    >
                      {t("pagination_next")}
                    </button>
                  </div>
                </div>
              ) : null}
              <GeoPointsMapPanel
                mapsStatus={mapsStatus}
                mapsError={mapsError}
                points={orderedEventMapPoints}
                title={t("events_map_title")}
                hint={t("events_map_hint")}
                emptyText={t("events_map_empty")}
                openActionText={t("events_map_open_detail")}
                onOpenDetail={(eventId) => openEventDetail(eventId)}
                t={t}
              />
            </section>
            ) : null}

            {eventsWorkspace === "detail" ? (
            <section className="panel panel-wide detail-panel">
              <div className="detail-head">
                <div>
                  <h2 className="section-title">
                    <Icon name="eye" className="icon" />
                    {t("event_detail_title")}
                  </h2>
                  <p className="field-help">{t("event_detail_hint")}</p>
                </div>
                {selectedEventDetail ? (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleStartEditEvent(selectedEventDetail)}>
                    <Icon name="edit" className="icon icon-sm" />
                    {t("event_detail_edit_action")}
                  </button>
                ) : null}
              </div>
              {events.length > 0 ? (
                <label>
                  <span className="label-title">{t("event_detail_select_label")}</span>
                  <select value={selectedEventDetail?.id || ""} onChange={(event) => setSelectedEventDetailId(event.target.value)}>
                    {events.map((eventItem) => (
                      <option key={eventItem.id} value={eventItem.id}>
                        {eventItem.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {selectedEventDetail ? (
                <div className="button-row">
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() =>
                      openInvitationCreate({
                        eventId: selectedEventDetail.id,
                        messageKey: "invitation_prefill_event"
                      })
                    }
                  >
                    {t("event_detail_create_invitation_action")}
                  </button>
                </div>
              ) : null}
              <InlineMessage text={invitationMessage} />
              {!selectedEventDetail ? (
                <p className="hint">{t("event_detail_empty")}</p>
              ) : (
                <div className="detail-layout">
                  <article className="detail-card">
                    <p className="item-title">{selectedEventDetail.title}</p>
                    <p className="item-meta">
                      {t("status")}:{" "}
                      <span className={`status-pill ${statusClass(selectedEventDetail.status)}`}>
                        {statusText(t, selectedEventDetail.status)}
                      </span>
                    </p>
                    {selectedEventDetail.event_type ? (
                      <p className="item-meta">
                        {t("field_event_type")}:{" "}
                        {toCatalogLabel("experience_type", selectedEventDetail.event_type, language)}
                      </p>
                    ) : null}
                    <p className="item-meta">
                      {t("date")}: {formatDate(selectedEventDetail.start_at, language, t("no_date"))}
                    </p>
                    {selectedEventDetail.location_name ? (
                      <p className="item-meta">
                        {t("field_place")}: {selectedEventDetail.location_name}
                      </p>
                    ) : null}
                    {selectedEventDetail.location_address ? (
                      <p className="item-meta">
                        {t("field_address")}: {selectedEventDetail.location_address}
                      </p>
                    ) : null}
                    {selectedEventDetail.description ? (
                      <p className="item-meta">
                        {t("field_event_description")}: {selectedEventDetail.description}
                      </p>
                    ) : null}
                    <div className="detail-badge-row">
                      <span className={`status-pill ${selectedEventDetail.allow_plus_one ? "status-yes" : "status-draft"}`}>
                        {t("event_setting_allow_plus_one")}:{" "}
                        {selectedEventDetail.allow_plus_one ? t("status_yes") : t("status_no")}
                      </span>
                      <span className={`status-pill ${selectedEventDetail.auto_reminders ? "status-yes" : "status-draft"}`}>
                        {t("event_setting_auto_reminders")}:{" "}
                        {selectedEventDetail.auto_reminders ? t("status_yes") : t("status_no")}
                      </span>
                      <span className="status-pill status-maybe">
                        {t("event_setting_dress_code")}:{" "}
                        {t(`event_dress_code_${normalizeEventDressCode(selectedEventDetail.dress_code)}`)}
                      </span>
                      <span className="status-pill status-host-conversion-source-default">
                        {t("event_setting_playlist_mode")}:{" "}
                        {t(`event_playlist_mode_${normalizeEventPlaylistMode(selectedEventDetail.playlist_mode)}`)}
                      </span>
                    </div>
                    <div className="button-row">
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() =>
                          openInvitationCreate({
                            eventId: selectedEventDetail.id,
                            messageKey: "invitation_prefill_event"
                          })
                        }
                      >
                        {t("event_detail_create_invitation_action")}
                      </button>
                      {selectedEventDetail.location_lat != null && selectedEventDetail.location_lng != null ? (
                        <a
                          className="btn btn-ghost btn-sm"
                          href={`https://www.google.com/maps?q=${selectedEventDetail.location_lat},${selectedEventDetail.location_lng}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("map_open_external")}
                        </a>
                      ) : null}
                    </div>
                  </article>
                  <article className="detail-card">
                    <p className="item-title">{t("event_detail_rsvp_summary")}</p>
                    <div className="detail-badge-row">
                      <span className="status-pill status-pending">
                        {t("status_pending")}: {selectedEventDetailStatusCounts.pending}
                      </span>
                      <span className="status-pill status-yes">
                        {t("status_yes")}: {selectedEventDetailStatusCounts.yes}
                      </span>
                      <span className="status-pill status-no">
                        {t("status_no")}: {selectedEventDetailStatusCounts.no}
                      </span>
                      <span className="status-pill status-maybe">
                        {t("status_maybe")}: {selectedEventDetailStatusCounts.maybe}
                      </span>
                    </div>
                    <p className="hint">
                      {t("event_detail_total_invites")} {selectedEventDetailInvitations.length}
                    </p>
                    {selectedEventDetailInvitations.length === 0 ? (
                      <p className="hint">{t("event_detail_no_invites")}</p>
                    ) : null}
                  </article>
                  <article className="detail-card">
                    <p className="item-title">{t("event_detail_checklist_title")}</p>
                    <ul className="checklist-list">
                      {selectedEventChecklist.map((item) => (
                        <li key={item.key} className="checklist-item">
                          <span className={`status-pill ${item.done ? "status-yes" : "status-pending"}`}>
                            {item.done ? t("status_yes") : t("status_pending")}
                          </span>
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                    {selectedEventHealthAlerts.length > 0 ? (
                      <div className="recommendation-card warning">
                        <p className="item-title">{t("event_detail_alerts_title")}</p>
                        <ul className="list recommendation-list">
                          {selectedEventHealthAlerts.map((alertItem) => (
                            <li key={`${alertItem.guestName}-${alertItem.avoid.join("|")}`}>
                              <strong>{alertItem.guestName}:</strong> {alertItem.avoid.join(", ")}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="hint">{t("event_detail_alerts_empty")}</p>
                    )}
                  </article>
                  {typeof selectedEventDetail.location_lat === "number" && typeof selectedEventDetail.location_lng === "number" ? (
                    <article className="detail-card detail-card-map">
                      <p className="item-title">{t("map_preview_title")}</p>
                      <div className="map-preview" aria-label={t("map_preview_title")}>
                        <iframe
                          title={t("map_preview_title")}
                          src={getMapEmbedUrl(selectedEventDetail.location_lat, selectedEventDetail.location_lng)}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    </article>
                  ) : null}
                  <article className="detail-card detail-card-wide">
                    <p className="item-title">{t("event_detail_guest_list_title")}</p>
                    {selectedEventDetailGuests.length === 0 ? (
                      <p className="hint">{t("event_detail_no_invites")}</p>
                    ) : (
                      <ul className="list detail-list">
                        {selectedEventDetailGuests.map((row) => {
                          const sharePayload = buildInvitationSharePayload(row.invitation);
                          const itemLabel = `${selectedEventDetail.title || t("field_event")} - ${row.name || t("field_guest")}`;
                          return (
                            <li key={row.invitation.id}>
                              <p className="item-title">{row.name}</p>
                              <p className="item-meta">{row.contact}</p>
                              <p className="item-meta">
                                {t("status")}:{" "}
                                <span className={`status-pill ${statusClass(row.invitation.status)}`}>
                                  {statusText(t, row.invitation.status)}
                                </span>{" "}
                                - {t("responded")}: {formatDate(row.invitation.responded_at, language, t("no_response"))}
                              </p>
                              <div className="item-actions">
                                <button
                                  className="btn btn-ghost btn-sm"
                                  type="button"
                                  onClick={() => openGuestDetail(row.guest?.id || row.invitation.guest_id)}
                                >
                                  {t("view_guest_detail_action")}
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  type="button"
                                  onClick={() => {
                                    const prepared = handlePrepareInvitationShare(row.invitation);
                                    if (prepared?.whatsappUrl) {
                                      window.open(prepared.whatsappUrl, "_blank", "noopener,noreferrer");
                                    }
                                  }}
                                >
                                  {t("invitation_send_message_action")}
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  type="button"
                                  onClick={() => {
                                    const prepared = handlePrepareInvitationShare(row.invitation) || sharePayload;
                                    if (prepared?.shareText) {
                                      handleCopyInvitationMessage(prepared.shareText);
                                    }
                                  }}
                                >
                                  {t("invitation_copy_message")}
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  type="button"
                                  onClick={() => handleRequestDeleteInvitation(row.invitation, itemLabel)}
                                >
                                  {t("delete_invitation")}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </article>
                  <article className="detail-card detail-card-wide">
                    <p className="item-title">{t("event_detail_rsvp_timeline_title")}</p>
                    {selectedEventRsvpTimeline.length === 0 ? (
                      <p className="hint">{t("event_detail_rsvp_timeline_empty")}</p>
                    ) : (
                      <ul className="timeline-list">
                        {selectedEventRsvpTimeline.map((item) => (
                          <li key={item.id} className="timeline-item">
                            <span className={`timeline-dot ${statusClass(item.status)}`} />
                            <div className="timeline-content">
                              <p className="item-title">
                                {item.name} - <span className={`status-pill ${statusClass(item.status)}`}>{statusText(t, item.status)}</span>
                              </p>
                              <p className="item-meta">
                                {item.isResponse ? t("event_detail_timeline_response") : t("event_detail_timeline_sent")} -{" "}
                                {formatDate(item.date, language, t("no_date"))}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </div>
              )}
            </section>
            ) : null}

            {eventsWorkspace === "insights" ? (
            <section className="panel panel-wide">
              <h2 className="section-title">
                <Icon name="sparkle" className="icon" />
                {t("smart_hosting_title")}
              </h2>
              <p className="field-help">{t("smart_hosting_hint")}</p>
              {events.length > 0 ? (
                <label>
                  <span className="label-title">{t("smart_hosting_event_select")}</span>
                  <select value={insightsEventId} onChange={(event) => setInsightsEventId(event.target.value)}>
                    {events.map((eventItem) => (
                      <option key={eventItem.id} value={eventItem.id}>
                        {eventItem.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <p className="hint">
                {t("smart_hosting_scope_label")}:{" "}
                {eventInsights.scope === "event" ? t("smart_hosting_scope_event") : t("smart_hosting_scope_all")} -{" "}
                {t("smart_hosting_considered_guests")}: {eventInsights.consideredGuestsCount}
              </p>
              {eventInsights.hasData ? (
                <div className="insights-grid">
                  <article className="insight-card">
                    <p className="item-title">{t("smart_hosting_food")}</p>
                    <p className="item-meta">
                      {eventInsights.foodSuggestions.length > 0
                        ? eventInsights.foodSuggestions.join(", ")
                        : t("smart_hosting_no_data")}
                    </p>
                  </article>
                  <article className="insight-card">
                    <p className="item-title">{t("smart_hosting_drink")}</p>
                    <p className="item-meta">
                      {eventInsights.drinkSuggestions.length > 0
                        ? eventInsights.drinkSuggestions.join(", ")
                        : t("smart_hosting_no_data")}
                    </p>
                  </article>
                  <article className="insight-card">
                    <p className="item-title">{t("smart_hosting_avoid")}</p>
                    <p className="item-meta">
                      {eventInsights.avoidItems.length > 0 ? eventInsights.avoidItems.join(", ") : t("smart_hosting_no_data")}
                    </p>
                  </article>
                  <article className="insight-card">
                    <p className="item-title">{t("smart_hosting_decor")}</p>
                    <p className="item-meta">
                      {eventInsights.decorColors.length > 0
                        ? eventInsights.decorColors.join(", ")
                        : t("smart_hosting_no_data")}
                    </p>
                  </article>
                  <article className="insight-card">
                    <p className="item-title">{t("smart_hosting_music")}</p>
                    <p className="item-meta">
                      {eventInsights.musicGenres.length > 0
                        ? eventInsights.musicGenres.join(", ")
                        : t("smart_hosting_no_data")}
                    </p>
                  </article>
                  <article className="insight-card">
                    <p className="item-title">{t("smart_hosting_icebreakers")}</p>
                    <p className="item-meta">
                      {eventInsights.icebreakers.length > 0
                        ? eventInsights.icebreakers.join(", ")
                        : t("smart_hosting_no_data")}
                    </p>
                  </article>
                  <article className="insight-card">
                    <p className="item-title">{t("smart_hosting_taboo")}</p>
                    <p className="item-meta">
                      {eventInsights.tabooTopics.length > 0
                        ? eventInsights.tabooTopics.join(", ")
                        : t("smart_hosting_no_data")}
                    </p>
                  </article>
                  <article className="insight-card">
                    <p className="item-title">{t("smart_hosting_timing")}</p>
                    <p className="item-meta">
                      {eventInsights.timingRecommendation === "start_with_buffer"
                        ? t("smart_hosting_timing_buffer")
                        : t("smart_hosting_timing_on_time")}
                    </p>
                  </article>
                </div>
              ) : (
                <p className="hint">{t("smart_hosting_empty")}</p>
              )}
            </section>
          ) : null}
        </div>
      )}
    </section>
  ) : null}

        {activeView === "guests" ? (
          <section className="workspace-shell view-transition">
            <header className="workspace-header">
              <h2 className="section-title">
                <Icon name="user" className="icon" />
                {t("nav_guests")}
              </h2>
              <div className="workspace-tabs" role="tablist" aria-label={t("workspace_subsections")}>
                {WORKSPACE_ITEMS.guests.filter((item) => item.key !== "create").map((workspaceItem) => (
                  <button
                    key={workspaceItem.key}
                    type="button"
                    role="tab"
                    aria-selected={guestsWorkspace === workspaceItem.key}
                    className={`workspace-tab ${guestsWorkspace === workspaceItem.key ? "active" : ""}`}
                    onClick={() => setGuestsWorkspace(workspaceItem.key)}
                  >
                    <Icon name={workspaceItem.icon} className="icon icon-sm" />
                    {t(workspaceItem.labelKey)}
                  </button>
                ))}
              </div>
              <div className="workspace-meta">
                <p className="workspace-breadcrumb">
                  <Icon name="folder" className="icon icon-sm" />
                  {t("workspace_path_prefix")}: {t("nav_guests")} / {t(guestsWorkspaceItem.labelKey)}
                </p>
                {guestsWorkspace !== "hub" ? (
                  <button className="btn btn-ghost btn-sm workspace-back-btn" type="button" onClick={() => setGuestsWorkspace("hub")}>
                    <Icon name="arrow_left" className="icon icon-sm" />
                    {t("workspace_back_to_folders")}
                  </button>
                ) : null}
              </div>
            </header>

            {guestsWorkspace === "hub" ? (
              <div className="workspace-card-grid">
                {WORKSPACE_ITEMS.guests.filter((item) => item.key !== "hub" && item.key !== "create").map((workspaceItem) => (
                  <article key={workspaceItem.key} className="workspace-card">
                    <div className="workspace-card-icon">
                      <Icon name={workspaceItem.icon} className="icon" />
                    </div>
                    <div className="workspace-card-content">
                      <h3>{t(workspaceItem.labelKey)}</h3>
                      <p>{t(workspaceItem.descriptionKey)}</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setGuestsWorkspace(workspaceItem.key)}>
                      {t("workspace_open")}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div key={`guests-${guestsWorkspace}`} className="dashboard-grid single-section workspace-content">
            {guestsWorkspace === "create" ? (
            <form className="panel form-grid" onSubmit={handleSaveGuest} noValidate>
              <h2 className="section-title">
                <Icon name="user" className="icon" />
                {isEditingGuest ? t("edit_guest_title") : t("create_guest_title")}
              </h2>
              <p className="field-help">{t("help_guest_form")}</p>
              <p className="hint">{t("guest_host_potential_hint")}</p>

              <section className="recommendation-card">
                <p className="label-title">
                  <Icon name="phone" className="icon icon-sm" />
                  {t("contact_import_mobile_quick_title")}
                </p>
                <p className="field-help">
                  {canUseDeviceContacts ? t("contact_import_mobile_quick_hint") : t("contact_import_mobile_quick_fallback")}
                </p>
                {!canUseDeviceContacts ? (
                  <p className="hint">{contactPickerUnsupportedReason}</p>
                ) : null}
                <div className="button-row">
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={handleFillGuestFromDeviceContact}
                  >
                    {t("contact_import_mobile_quick_button")}
                  </button>
                  {!canUseDeviceContacts ? (
                    <button className="btn btn-sm" type="button" onClick={openFileImportFallback}>
                      {t("contact_import_open_file_button")}
                    </button>
                  ) : null}
                </div>
              </section>

              <details ref={contactImportDetailsRef} className="advanced-form contact-import-box">
                <summary>{t("contact_import_title")}</summary>
                <p className="field-help">{t("contact_import_hint")}</p>
                <p className="field-help">{t("contact_import_google_hint")}</p>
                <div className="button-row">
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={handlePickDeviceContacts}
                  >
                    {t("contact_import_device_button")}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={handleImportGoogleContacts}
                    disabled={isImportingGoogleContacts || !canUseGoogleContacts}
                  >
                    {isImportingGoogleContacts ? t("contact_import_google_loading") : t("contact_import_google_button")}
                  </button>
                </div>
                <p className="hint">
                  {canUseDeviceContacts ? t("contact_import_device_supported") : t("contact_import_device_not_supported")}
                </p>
                {!canUseDeviceContacts ? <p className="hint">{contactPickerUnsupportedReason}</p> : null}
                {!canUseGoogleContacts ? <p className="hint">{t("contact_import_google_unconfigured")}</p> : null}
                <label>
                  <span className="label-title">{t("contact_import_file_label")}</span>
                  <input
                    ref={contactImportFileInputRef}
                    type="file"
                    accept=".csv,.vcf,.vcard,text/csv,text/vcard"
                    onChange={handleImportContactsFile}
                  />
                  <FieldMeta helpText={t("contact_import_file_help")} />
                </label>
                <label>
                  <span className="label-title">{t("contact_import_paste_label")}</span>
                  <textarea
                    rows={4}
                    value={importContactsDraft}
                    onChange={(event) => setImportContactsDraft(event.target.value)}
                    placeholder={t("contact_import_paste_placeholder")}
                  />
                </label>
                <div className="button-row">
                  <button className="btn btn-ghost btn-sm" type="button" onClick={handlePreviewContactsFromDraft}>
                    {t("contact_import_preview_button")}
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={handleClearImportContacts}>
                    {t("contact_import_clear_button")}
                  </button>
                </div>
                {importContactsAnalysis.length > 0 ? (
                  <div className="import-status-grid">
                    <p className="hint">
                      {t("contact_import_preview_total")} {importContactsAnalysis.length}. {t("contact_import_preview_ready")}{" "}
                      {importContactsReady.length}. {t("contact_import_selected_ready")} {importContactsSelectedReady.length}.
                    </p>
                    <div className="import-status-pills" aria-label={t("contact_import_status_summary")}>
                      <span className="status-pill status-event-published">
                        {t("contact_import_status_ready")} {importContactsStatusSummary.ready}
                      </span>
                      <span className="status-pill status-invitation-pending">
                        {t("contact_import_status_duplicate_existing")} {importContactsStatusSummary.duplicateExisting}
                      </span>
                      <span className="status-pill status-event-draft">
                        {t("contact_import_status_duplicate_file")} {importContactsStatusSummary.duplicateInPreview}
                      </span>
                    </div>
                  </div>
                ) : null}
                {importContactsAnalysis.length > 0 ? (
                  <div className="list-tools">
                    <label>
                      <span className="label-title">{t("contact_import_duplicate_mode_label")}</span>
                      <select
                        value={importDuplicateMode}
                        onChange={(event) => setImportDuplicateMode(event.target.value === "merge" ? "merge" : "skip")}
                      >
                        <option value="skip">{t("contact_import_duplicate_mode_skip")}</option>
                        <option value="merge">{t("contact_import_duplicate_mode_merge")}</option>
                      </select>
                      <FieldMeta helpText={t("contact_import_duplicate_mode_hint")} />
                    </label>
                    <label>
                      <span className="label-title">{t("search")}</span>
                      <input
                        type="search"
                        value={importContactsSearch}
                        onChange={(event) => setImportContactsSearch(event.target.value)}
                        placeholder={t("contact_import_filter_placeholder")}
                      />
                    </label>
                    <label>
                      <span className="label-title">{t("contact_import_group_filter")}</span>
                      <select
                        value={importContactsGroupFilter}
                        onChange={(event) => setImportContactsGroupFilter(event.target.value)}
                      >
                        <option value="all">{t("all_contacts")}</option>
                        {importContactsGroupOptions.map((groupLabel) => (
                          <option key={groupLabel} value={groupLabel}>
                            {groupLabel}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="label-title">{t("pagination_items_per_page")}</span>
                      <select
                        value={importContactsPageSize}
                        onChange={(event) => setImportContactsPageSize(Number(event.target.value) || IMPORT_PREVIEW_PAGE_SIZE_DEFAULT)}
                      >
                        {IMPORT_PREVIEW_PAGE_SIZE_OPTIONS.map((optionValue) => (
                          <option key={optionValue} value={optionValue}>
                            {optionValue}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
                {importContactsAnalysis.length > 0 ? (
                  <div className="button-row">
                    <button className="btn btn-ghost btn-sm" type="button" onClick={handleSelectAllReadyImportContacts}>
                      {t("contact_import_select_all_ready")}
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={handleSelectFilteredReadyImportContacts}>
                      {t("contact_import_select_filtered_ready")}
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={handleSelectCurrentImportPageReady}>
                      {t("contact_import_select_page_ready")}
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={handleSelectOnlyNewImportContacts}>
                      {t("contact_import_select_new_only")}
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={handleClearReadyImportContactsSelection}>
                      {t("contact_import_clear_selection")}
                    </button>
                  </div>
                ) : null}
                {importContactsAnalysis.length > 0 ? (
                  <ul className="list import-preview-list">
                    {pagedImportContacts.map((contactItem) => (
                      <li key={contactItem.previewId}>
                        <label className="bulk-guest-option import-contact-option">
                          <input
                            type="checkbox"
                            checked={selectedImportContactIds.includes(contactItem.previewId)}
                            disabled={!contactItem.canImport}
                            onChange={() => toggleImportContactSelection(contactItem.previewId)}
                          />
                          <span>
                            <strong>
                              {contactItem.firstName || t("field_guest")} {contactItem.lastName || ""}
                            </strong>
                            <small>{contactItem.email || contactItem.phone || "-"}</small>
                            <small>{[contactItem.city, contactItem.country].filter(Boolean).join(", ") || "-"}</small>
                            {contactItem.birthday ? <small>{`${t("field_birthday")}: ${contactItem.birthday}`}</small> : null}
                            {contactItem.groups?.length ? (
                              <small>{`${t("contact_import_group_filter")}: ${contactItem.groups.join(", ")}`}</small>
                            ) : null}
                            <small>
                              {contactItem.duplicateExisting
                                ? contactItem.willMerge
                                  ? t("contact_import_status_duplicate_merge")
                                  : t("contact_import_status_duplicate_existing")
                                : contactItem.duplicateInPreview
                                ? t("contact_import_status_duplicate_file")
                                : t("contact_import_status_ready")}
                            </small>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {importContactsFiltered.length > 0 ? (
                  <div className="pagination-row import-preview-pagination">
                    <p className="hint">
                      {t("pagination_page")} {Math.min(importContactsPage, importContactsTotalPages)}/{importContactsTotalPages}
                    </p>
                    <div className="button-row">
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => setImportContactsPage((prev) => Math.max(1, prev - 1))}
                        disabled={importContactsPage <= 1}
                      >
                        {t("pagination_prev")}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => setImportContactsPage((prev) => Math.min(importContactsTotalPages, prev + 1))}
                        disabled={importContactsPage >= importContactsTotalPages}
                      >
                        {t("pagination_next")}
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="button-row">
                  <button
                    className="btn"
                    type="button"
                    onClick={handleImportContacts}
                    disabled={isImportingContacts || importContactsSelectedReady.length === 0}
                  >
                    {isImportingContacts ? t("contact_import_importing") : t("contact_import_import_button")}
                  </button>
                </div>
                <InlineMessage text={importContactsMessage} />
              </details>

              <label>
                <span className="label-title">{t("field_first_name")} *</span>
                <input
                  type="text"
                  value={guestFirstName}
                  onChange={(event) => setGuestFirstName(event.target.value)}
                  placeholder={t("placeholder_first_name")}
                  aria-invalid={Boolean(guestErrors.firstName)}
                />
                <FieldMeta errorText={guestErrors.firstName ? t(guestErrors.firstName) : ""} />
              </label>

              <label>
                <span className="label-title">{t("field_last_name")}</span>
                <input
                  type="text"
                  value={guestLastName}
                  onChange={(event) => setGuestLastName(event.target.value)}
                  placeholder={t("placeholder_last_name")}
                  aria-invalid={Boolean(guestErrors.lastName)}
                />
                <FieldMeta errorText={guestErrors.lastName ? t(guestErrors.lastName) : ""} />
              </label>

              <label>
                <span className="label-title">
                  <Icon name="mail" className="icon icon-sm" />
                  {t("email")}
                </span>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  placeholder={t("placeholder_email")}
                  aria-invalid={Boolean(guestErrors.email)}
                />
                <FieldMeta errorText={guestErrors.email ? t(guestErrors.email) : ""} />
              </label>

              <label>
                <span className="label-title">
                  <Icon name="phone" className="icon icon-sm" />
                  {t("field_phone")}
                </span>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                  placeholder={t("placeholder_phone")}
                  aria-invalid={Boolean(guestErrors.phone)}
                />
                <FieldMeta
                  helpText={t("hint_contact_required")}
                  errorText={guestErrors.phone ? t(guestErrors.phone) : guestErrors.contact ? t(guestErrors.contact) : ""}
                />
              </label>

              <label>
                <span className="label-title">{t("field_relationship")}</span>
                <select
                  value={guestRelationship}
                  onChange={(event) => setGuestRelationship(event.target.value)}
                  aria-invalid={Boolean(guestErrors.relationship)}
                >
                  <option value="">{t("select_option_prompt")}</option>
                  {relationshipOptions.map((optionValue) => (
                    <option key={optionValue} value={optionValue}>
                      {optionValue}
                    </option>
                  ))}
                </select>
                <FieldMeta errorText={guestErrors.relationship ? t(guestErrors.relationship) : ""} />
              </label>

              <label>
                <span className="label-title">{t("field_city")}</span>
                <input
                  type="text"
                  value={guestCity}
                  onChange={(event) => setGuestCity(event.target.value)}
                  placeholder={t("placeholder_city")}
                  list="guest-city-options"
                  aria-invalid={Boolean(guestErrors.city)}
                />
                <FieldMeta errorText={guestErrors.city ? t(guestErrors.city) : ""} />
              </label>

              <label>
                <span className="label-title">{t("field_country")}</span>
                <input
                  type="text"
                  value={guestCountry}
                  onChange={(event) => setGuestCountry(event.target.value)}
                  placeholder={t("placeholder_country")}
                  list="guest-country-options"
                  aria-invalid={Boolean(guestErrors.country)}
                />
                <FieldMeta errorText={guestErrors.country ? t(guestErrors.country) : ""} />
              </label>

              <section className="profile-capture-card">
                <p className="item-title">
                  <Icon name="sparkle" className="icon icon-sm" />
                  {t("guest_profile_capture_title")}
                </p>
                <p className="field-help">{t("guest_profile_capture_hint")}</p>
                <p className="item-meta">
                  {interpolateText(t("guest_profile_capture_progress"), {
                    done: guestAdvancedProfileCompleted,
                    total: guestAdvancedProfileSignals.length,
                    percent: guestAdvancedProfilePercent
                  })}
                </p>
                <div className="progress-bar" aria-hidden="true">
                  <span style={{ width: `${guestAdvancedProfilePercent}%` }} />
                </div>
                {guestNextBirthday ? (
                  <p className="item-meta">
                    {t("birthday_next_label")}: {guestNextBirthday.dateLabel} ({interpolateText(t("birthday_next_days"), { days: guestNextBirthday.diffDays })})
                  </p>
                ) : (
                  <p className="item-meta">{t("birthday_unknown")}</p>
                )}
                <div className="button-row">
                  <button className="btn btn-ghost btn-sm" type="button" onClick={handleCreateBirthdayEventFromGuest}>
                    <Icon name="calendar" className="icon icon-sm" />
                    {t("birthday_event_create")}
                  </button>
                </div>
                {guestAdvancedProfileSignals.some((item) => !item.done) ? (
                  <div className="multi-chip-group">
                    {guestAdvancedProfileSignals
                      .filter((item) => !item.done)
                      .map((item) => (
                        <span key={item.key} className="multi-chip readonly">
                          {item.label}
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="field-success">{t("guest_profile_capture_all_set")}</p>
                )}
              </section>

              <details className="advanced-form">
                <summary>{t("guest_advanced_title")}</summary>
                <p className="field-help">{t("guest_advanced_hint")}</p>
                <div className="advanced-grid">
                  <p className="advanced-grid-heading">
                    <Icon name="user" className="icon icon-sm" />
                    {t("guest_advanced_section_identity")}
                  </p>
                  <label>
                    <span className="label-title">{t("field_company")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.company}
                      onChange={(event) => setGuestAdvancedField("company", event.target.value)}
                      placeholder={t("placeholder_company")}
                      aria-invalid={Boolean(guestErrors.company)}
                    />
                    <FieldMeta errorText={guestErrors.company ? t(guestErrors.company) : ""} />
                  </label>
                  <label>
                    <span className="label-title">{t("field_address")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.address}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setGuestAdvancedField("address", nextValue);
                        setGuestErrors((prev) => ({ ...prev, address: undefined }));
                        setGuestMessage("");
                        if (
                          selectedGuestAddressPlace &&
                          normalizeLookupValue(nextValue) !== normalizeLookupValue(selectedGuestAddressPlace.formattedAddress)
                        ) {
                          setSelectedGuestAddressPlace(null);
                        }
                      }}
                      placeholder={t("placeholder_address")}
                      aria-invalid={Boolean(guestErrors.address)}
                      autoComplete="off"
                    />
                    <FieldMeta
                      helpText={
                        mapsStatus === "ready"
                          ? t("address_google_hint")
                          : mapsStatus === "loading"
                          ? t("address_google_loading")
                          : mapsStatus === "error"
                          ? `${t("address_google_error")} ${mapsError}`
                          : t("address_google_unconfigured")
                      }
                      errorText={guestErrors.address ? t(guestErrors.address) : ""}
                    />
                    {mapsStatus === "ready" && guestAdvanced.address.trim().length >= 4 ? (
                      <ul className="prediction-list" role="listbox" aria-label={t("address_suggestions")}>
                        {isGuestAddressLoading ? <li className="prediction-item hint">{t("address_searching")}</li> : null}
                        {!isGuestAddressLoading && guestAddressPredictions.length === 0 ? (
                          <li className="prediction-item hint">{t("address_no_matches")}</li>
                        ) : null}
                        {guestAddressPredictions.map((prediction) => (
                          <li key={prediction.place_id}>
                            <button
                              type="button"
                              className="prediction-item"
                              onClick={() => handleSelectGuestAddressPrediction(prediction)}
                            >
                              <Icon name="location" className="icon icon-sm" />
                              {prediction.description}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {selectedGuestAddressPlace?.placeId ? (
                      <p className="field-success">{t("address_validated")}</p>
                    ) : null}
                  </label>
                  <label>
                    <span className="label-title">{t("field_postal_code")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.postalCode}
                      onChange={(event) => setGuestAdvancedField("postalCode", event.target.value)}
                      placeholder={t("placeholder_postal_code")}
                      aria-invalid={Boolean(guestErrors.postalCode)}
                    />
                    <FieldMeta errorText={guestErrors.postalCode ? t(guestErrors.postalCode) : ""} />
                  </label>
                  <label>
                    <span className="label-title">{t("field_state_region")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.stateRegion}
                      onChange={(event) => setGuestAdvancedField("stateRegion", event.target.value)}
                      placeholder={t("placeholder_state_region")}
                      aria-invalid={Boolean(guestErrors.stateRegion)}
                    />
                    <FieldMeta errorText={guestErrors.stateRegion ? t(guestErrors.stateRegion) : ""} />
                  </label>
                  <label>
                    <span className="label-title">{t("field_birthday")}</span>
                    <input
                      type="date"
                      value={guestAdvanced.birthday}
                      onChange={(event) => setGuestAdvancedField("birthday", event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="label-title">{t("field_last_meet")}</span>
                    <input
                      type="date"
                      value={guestAdvanced.lastMeetAt}
                      onChange={(event) => setGuestAdvancedField("lastMeetAt", event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="label-title">X / Twitter</span>
                    <input
                      type="text"
                      value={guestAdvanced.twitter}
                      onChange={(event) => setGuestAdvancedField("twitter", event.target.value)}
                      placeholder="@usuario"
                      aria-invalid={Boolean(guestErrors.twitter)}
                    />
                    <FieldMeta errorText={guestErrors.twitter ? t(guestErrors.twitter) : ""} />
                  </label>
                  <label>
                    <span className="label-title">Instagram</span>
                    <input
                      type="text"
                      value={guestAdvanced.instagram}
                      onChange={(event) => setGuestAdvancedField("instagram", event.target.value)}
                      placeholder="@usuario"
                      aria-invalid={Boolean(guestErrors.instagram)}
                    />
                    <FieldMeta errorText={guestErrors.instagram ? t(guestErrors.instagram) : ""} />
                  </label>
                  <label>
                    <span className="label-title">LinkedIn</span>
                    <input
                      type="text"
                      value={guestAdvanced.linkedIn}
                      onChange={(event) => setGuestAdvancedField("linkedIn", event.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      aria-invalid={Boolean(guestErrors.linkedIn)}
                    />
                    <FieldMeta errorText={guestErrors.linkedIn ? t(guestErrors.linkedIn) : ""} />
                  </label>
                  <p className="advanced-grid-heading">
                    <Icon name="sparkle" className="icon icon-sm" />
                    {t("guest_advanced_section_food")}
                  </p>
                  <MultiSelectField
                    id="guest-experience-types"
                    label={t("field_experience_type")}
                    value={guestAdvanced.experienceTypes}
                    options={eventTypeOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("experienceTypes", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <MultiSelectField
                    id="guest-preferred-relationships"
                    label={t("field_relationship")}
                    value={guestAdvanced.preferredGuestRelationships}
                    options={relationshipOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("preferredGuestRelationships", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <label>
                    <span className="label-title">{t("field_diet_type")}</span>
                    <select
                      value={guestAdvanced.dietType}
                      onChange={(event) => setGuestAdvancedField("dietType", event.target.value)}
                    >
                      <option value="">{t("select_option_prompt")}</option>
                      {dietTypeOptions.map((optionValue) => (
                        <option key={optionValue} value={optionValue}>
                          {optionValue}
                        </option>
                      ))}
                    </select>
                  </label>
                  <MultiSelectField
                    id="guest-tasting-preferences"
                    label={t("field_tasting_preferences")}
                    value={guestAdvanced.tastingPreferences}
                    options={tastingPreferenceOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("tastingPreferences", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <label>
                    <span className="label-title">{t("field_food_likes")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.foodLikes}
                      onChange={(event) => setGuestAdvancedField("foodLikes", event.target.value)}
                      placeholder={t("placeholder_list_comma")}
                    />
                  </label>
                  <label>
                    <span className="label-title">{t("field_food_dislikes")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.foodDislikes}
                      onChange={(event) => setGuestAdvancedField("foodDislikes", event.target.value)}
                      placeholder={t("placeholder_list_comma")}
                    />
                  </label>
                  <MultiSelectField
                    id="guest-drink-likes"
                    label={t("field_drink_likes")}
                    value={guestAdvanced.drinkLikes}
                    options={drinkOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("drinkLikes", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <MultiSelectField
                    id="guest-drink-dislikes"
                    label={t("field_drink_dislikes")}
                    value={guestAdvanced.drinkDislikes}
                    options={drinkOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("drinkDislikes", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <p className="advanced-grid-heading">
                    <Icon name="star" className="icon icon-sm" />
                    {t("guest_advanced_section_lifestyle")}
                  </p>
                  <MultiSelectField
                    id="guest-music-genres"
                    label={t("field_music_genres")}
                    value={guestAdvanced.musicGenres}
                    options={musicGenreOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("musicGenres", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <label>
                    <span className="label-title">{t("field_favorite_color")}</span>
                    <select
                      value={guestAdvanced.favoriteColor}
                      onChange={(event) => setGuestAdvancedField("favoriteColor", event.target.value)}
                    >
                      <option value="">{t("select_option_prompt")}</option>
                      {colorOptions.map((optionValue) => (
                        <option key={optionValue} value={optionValue}>
                          {optionValue}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="label-title">{t("field_books")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.books}
                      onChange={(event) => setGuestAdvancedField("books", event.target.value)}
                      placeholder={t("placeholder_list_comma")}
                    />
                  </label>
                  <label>
                    <span className="label-title">{t("field_movies")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.movies}
                      onChange={(event) => setGuestAdvancedField("movies", event.target.value)}
                      placeholder={t("placeholder_list_comma")}
                    />
                  </label>
                  <label>
                    <span className="label-title">{t("field_series")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.series}
                      onChange={(event) => setGuestAdvancedField("series", event.target.value)}
                      placeholder={t("placeholder_list_comma")}
                    />
                  </label>
                  <MultiSelectField
                    id="guest-sports"
                    label={t("field_sport")}
                    value={guestAdvanced.sports}
                    options={sportOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("sports", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <label>
                    <span className="label-title">{t("field_team_fan")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.teamFan}
                      onChange={(event) => setGuestAdvancedField("teamFan", event.target.value)}
                      placeholder={t("placeholder_team")}
                    />
                  </label>
                  <MultiSelectField
                    id="guest-day-moments"
                    label={t("field_day_moment")}
                    value={guestAdvanced.preferredDayMoments}
                    options={dayMomentOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("preferredDayMoments", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <label>
                    <span className="label-title">{t("field_periodicity")}</span>
                    <select
                      value={guestAdvanced.periodicity}
                      onChange={(event) => setGuestAdvancedField("periodicity", event.target.value)}
                    >
                      <option value="">{t("select_option_prompt")}</option>
                      {periodicityOptions.map((optionValue) => (
                        <option key={optionValue} value={optionValue}>
                          {optionValue}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="label-title">{t("field_punctuality")}</span>
                    <select
                      value={guestAdvanced.punctuality}
                      onChange={(event) => setGuestAdvancedField("punctuality", event.target.value)}
                    >
                      <option value="">{t("select_option_prompt")}</option>
                      {punctualityOptions.map((optionValue) => (
                        <option key={optionValue} value={optionValue}>
                          {optionValue}
                        </option>
                      ))}
                    </select>
                  </label>
                  <MultiSelectField
                    id="guest-cuisine-types"
                    label={t("field_cuisine_type")}
                    value={guestAdvanced.cuisineTypes}
                    options={cuisineTypeOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("cuisineTypes", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <MultiSelectField
                    id="guest-pets"
                    label={t("field_pets")}
                    value={guestAdvanced.pets}
                    options={petOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("pets", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <p className="advanced-grid-heading">
                    <Icon name="message" className="icon icon-sm" />
                    {t("guest_advanced_section_conversation")}
                  </p>
                  <label>
                    <span className="label-title">{t("field_last_talk_topic")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.lastTalkTopic}
                      onChange={(event) => setGuestAdvancedField("lastTalkTopic", event.target.value)}
                      placeholder={t("placeholder_talk_topic")}
                    />
                  </label>
                  <label>
                    <span className="label-title">{t("field_taboo_topics")}</span>
                    <input
                      type="text"
                      value={guestAdvanced.tabooTopics}
                      onChange={(event) => setGuestAdvancedField("tabooTopics", event.target.value)}
                      placeholder={t("placeholder_list_comma")}
                    />
                  </label>
                  <p className="advanced-grid-heading">
                    <Icon name="shield" className="icon icon-sm" />
                    {t("guest_advanced_section_health")}
                  </p>
                  <MultiSelectField
                    id="guest-allergies"
                    label={t("field_allergies")}
                    value={guestAdvanced.allergies}
                    options={allergyOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("allergies", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <MultiSelectField
                    id="guest-intolerances"
                    label={t("field_intolerances")}
                    value={guestAdvanced.intolerances}
                    options={intoleranceOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("intolerances", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                  <MultiSelectField
                    id="guest-pet-allergies"
                    label={t("field_pet_allergies")}
                    value={guestAdvanced.petAllergies}
                    options={petAllergyOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("petAllergies", nextValue)}
                    helpText={t("multi_select_hint")}
                  t={t}
                  />
                </div>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={Boolean(guestAdvanced.sensitiveConsent)}
                    onChange={(event) => setGuestAdvancedField("sensitiveConsent", event.target.checked)}
                  />
                  <span>{t("field_sensitive_consent")}</span>
                </label>
                <FieldMeta
                  helpText={t("guest_sensitive_consent_hint")}
                  errorText={guestErrors.sensitiveConsent ? t(guestErrors.sensitiveConsent) : ""}
                />
              </details>

              <datalist id="guest-city-options">
                {cityOptions.map((optionValue) => (
                  <option key={optionValue} value={optionValue} />
                ))}
              </datalist>
              <datalist id="guest-country-options">
                {countryOptions.map((optionValue) => (
                  <option key={optionValue} value={optionValue} />
                ))}
              </datalist>

              <div className="button-row">
                <button className="btn" type="submit" disabled={isSavingGuest}>
                  {isSavingGuest ? (isEditingGuest ? t("updating_guest") : t("saving_guest")) : isEditingGuest ? t("update_guest") : t("save_guest")}
                </button>
                {isEditingGuest ? (
                  <button className="btn btn-ghost" type="button" onClick={handleCancelEditGuest}>
                    {t("cancel_edit")}
                  </button>
                ) : null}
              </div>
              <InlineMessage text={guestMessage} />
            </form>
            ) : null}

            {guestsWorkspace === "latest" ? (
            <section className="panel panel-list panel-guests-latest">
              <h2 className="section-title">
                <Icon name="user" className="icon" />
                {t("latest_guests_title")}
              </h2>
              <div className="list-tools">
                <label>
                  <span className="label-title">{t("search")}</span>
                  <input
                    type="search"
                    value={guestSearch}
                    onChange={(event) => setGuestSearch(event.target.value)}
                    placeholder={t("search_guests_placeholder")}
                  />
                </label>
                <label>
                  <span className="label-title">{t("sort_by")}</span>
                  <select value={guestSort} onChange={(event) => setGuestSort(event.target.value)}>
                    <option value="created_desc">{t("sort_created_desc")}</option>
                    <option value="created_asc">{t("sort_created_asc")}</option>
                    <option value="name_asc">{t("sort_name_asc")}</option>
                    <option value="name_desc">{t("sort_name_desc")}</option>
                  </select>
                </label>
                <label>
                  <span className="label-title">{t("pagination_items_per_page")}</span>
                  <select value={guestPageSize} onChange={(event) => setGuestPageSize(Number(event.target.value) || GUESTS_PAGE_SIZE_DEFAULT)}>
                    {PAGE_SIZE_OPTIONS.map((optionValue) => (
                      <option key={optionValue} value={optionValue}>
                        {optionValue}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="list-filter-tabs" role="group" aria-label={t("filter_contact")}>
                {[
                  { key: "all", label: t("all_contacts") },
                  { key: "contact", label: t("contact_any") },
                  { key: "email", label: t("contact_email_only") },
                  { key: "phone", label: t("contact_phone_only") }
                ].map((contactOption) => (
                  <button
                    key={contactOption.key}
                    className={`list-filter-tab ${guestContactFilter === contactOption.key ? "active" : ""}`}
                    type="button"
                    aria-pressed={guestContactFilter === contactOption.key}
                    onClick={() => setGuestContactFilter(contactOption.key)}
                  >
                    {contactOption.label}
                  </button>
                ))}
              </div>
              <p className="hint">
                {t("results_count")}: {filteredGuests.length}
              </p>
              <p className="hint">
                {t("host_potential_count_label")} {hostPotentialGuestsCount}
              </p>
              <p className="hint">
                {t("host_converted_count_label")} {convertedHostGuestsCount} - {t("host_pending_conversion_label")} {pendingHostGuestsCount}
              </p>
              <p className="hint">
                {t("kpi_converted_hosts_30d")} {convertedHostGuests30dCount}
              </p>
              <InlineMessage text={guestMessage} />
              {filteredGuests.length === 0 ? (
                <p>{t("no_guests")}</p>
              ) : (
                <>
                <div className="list-table-shell">
                  <div className="list-table-head list-table-head-guests" aria-hidden="true">
                    <span>{t("field_guest")}</span>
                    <span>{t("email")}</span>
                    <span>{t("field_phone")}</span>
                    <span>{t("field_allergies")} / {t("table_host_status")}</span>
                    <span>{t("field_event")}</span>
                    <span>{t("actions_label")}</span>
                  </div>
                  <ul className="list list-table list-table-guests">
                    {pagedGuests.map((guestItem) => {
                      const conversion = guestHostConversionById[guestItem.id] || null;
                      const conversionSource = getConversionSource(conversion);
                      const conversionSourceLabel = getConversionSourceLabel(t, conversionSource);
                      const guestFullName = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest");
                      const guestEventsCount = guestEventCountByGuestId[guestItem.id] || 0;
                      const sensitiveData = guestSensitiveById[guestItem.id] || {};
                      const allergyPreview = toCatalogLabels("allergy", sensitiveData.allergies || [], language).slice(0, 2);
                      const intolerancePreview = toCatalogLabels("intolerance", sensitiveData.intolerances || [], language).slice(0, 2);
                      const healthPreview = uniqueValues([...allergyPreview, ...intolerancePreview]).slice(0, 3);
                      return (
                      <li key={guestItem.id} className="list-table-row list-row-guest">
                        <div className="cell-main list-title-with-avatar">
                          <span className="list-avatar">{getInitials(guestFullName, "IN")}</span>
                          <div>
                            <p className="item-title">{guestFullName}</p>
                            {guestItem.relationship ? (
                              <p className="item-meta">
                                {toCatalogLabel("relationship", guestItem.relationship, language)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <p className="item-meta cell-guest-email cell-meta">{guestItem.email || "-"}</p>
                        <p className="item-meta cell-guest-phone cell-extra">{guestItem.phone || "-"}</p>
                        <div className="cell-guest-health cell-meta list-badge-stack">
                          {guestItem.email || guestItem.phone ? (
                            <span className="status-pill status-host-candidate">{t("host_potential_badge")}</span>
                          ) : null}
                          {conversion ? (
                            <span className="status-pill status-host-converted">{t("host_converted_badge")}</span>
                          ) : null}
                          {conversion ? (
                            <span
                              className={`status-pill ${
                                conversionSource === "google"
                                  ? "status-host-conversion-source-google"
                                  : "status-host-conversion-source-default"
                              }`}
                            >
                              {conversionSourceLabel}
                            </span>
                          ) : null}
                          {healthPreview.length > 0 ? (
                            <p className="item-meta">
                              {healthPreview.map((item) => (
                                <span key={`${guestItem.id}-${item}`} className="status-pill status-pending">
                                  {item}
                                </span>
                              ))}
                            </p>
                          ) : (
                            <p className="item-meta">—</p>
                          )}
                          {conversion ? (
                            <p className="item-meta">
                              {getConversionMatchLabel(t, conversion)} · {conversion.converted_at ? formatDate(conversion.converted_at, language, t("no_date")) : t("no_date")}
                            </p>
                          ) : (
                            <p className="item-meta">{t("host_pending_conversion_label")}</p>
                          )}
                          {guestItem.email || guestItem.phone ? (
                            <button
                              className="text-link-btn guest-host-convert-btn"
                              type="button"
                              onClick={() => handleCopyHostSignupLink(guestItem)}
                              disabled={Boolean(conversion)}
                            >
                              <Icon name={conversion ? "check" : "link"} className="icon icon-sm" />
                              {conversion ? t("host_already_registered_action") : t("host_invite_action")}
                            </button>
                          ) : null}
                        </div>
                        <div className="cell-guest-events cell-extra">
                          <p className="item-title">{guestEventsCount}</p>
                        </div>
                        <div className="item-actions cell-actions list-actions-compact list-actions-iconic">
                          <button
                            className="btn btn-ghost btn-sm btn-icon-only"
                            type="button"
                            onClick={() => openGuestDetail(guestItem.id)}
                            aria-label={t("view_detail")}
                            title={t("view_detail")}
                          >
                            <Icon name="eye" className="icon icon-sm" />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon-only"
                            type="button"
                            onClick={() => handleStartEditGuest(guestItem)}
                            aria-label={t("edit_guest")}
                            title={t("edit_guest")}
                          >
                            <Icon name="edit" className="icon icon-sm" />
                          </button>
                          <button
                            className="btn btn-danger btn-sm btn-icon-only"
                            type="button"
                            onClick={() => handleRequestDeleteGuest(guestItem)}
                            disabled={isDeletingGuestId === guestItem.id}
                            aria-label={isDeletingGuestId === guestItem.id ? t("deleting") : t("delete_guest")}
                            title={isDeletingGuestId === guestItem.id ? t("deleting") : t("delete_guest")}
                          >
                            <Icon name="x" className="icon icon-sm" />
                          </button>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                </div>
                </>
              )}
              {filteredGuests.length > 0 ? (
                <div className="pagination-row">
                  <p className="hint">
                    {t("pagination_page")} {guestPage}/{guestTotalPages}
                  </p>
                  <div className="button-row">
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => setGuestPage((prev) => Math.max(1, prev - 1))}
                      disabled={guestPage <= 1}
                    >
                      {t("pagination_prev")}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => setGuestPage((prev) => Math.min(guestTotalPages, prev + 1))}
                      disabled={guestPage >= guestTotalPages}
                    >
                      {t("pagination_next")}
                    </button>
                  </div>
                </div>
              ) : null}
              <GeoPointsMapPanel
                mapsStatus={mapsStatus}
                mapsError={mapsError}
                points={orderedGuestMapPoints}
                title={t("guests_map_title")}
                hint={t("guests_map_hint")}
                emptyText={t("guests_map_empty")}
                openActionText={t("guests_map_open_detail")}
                onOpenDetail={(guestId) => openGuestDetail(guestId)}
                t={t}
              />
            </section>
            ) : null}

            {guestsWorkspace === "detail" ? (
            <section className="panel panel-wide detail-panel">
              <div className="detail-head">
                <div>
                  <h2 className="section-title">
                    <Icon name="eye" className="icon" />
                    {t("guest_detail_title")}
                  </h2>
                  <p className="field-help">{t("guest_detail_hint")}</p>
                </div>
                {selectedGuestDetail ? (
                  <div className="button-row">
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => handleLinkProfileGuestToGlobal(selectedGuestDetail.id)}
                      disabled={isLinkingGlobalGuest}
                    >
                      <Icon name="shield" className="icon icon-sm" />
                      {isLinkingGlobalGuest ? t("global_profile_linking") : t("global_profile_link_guest_action")}
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleStartEditGuest(selectedGuestDetail)}>
                      <Icon name="edit" className="icon icon-sm" />
                      {t("guest_detail_edit_action")}
                    </button>
                  </div>
                ) : null}
              </div>
              {guests.length > 0 ? (
                <label>
                  <span className="label-title">{t("guest_detail_select_label")}</span>
                  <select value={selectedGuestDetail?.id || ""} onChange={(event) => setSelectedGuestDetailId(event.target.value)}>
                    {guests.map((guestItem) => (
                      <option key={guestItem.id} value={guestItem.id}>
                        {`${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest")}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {selectedGuestDetail ? (
                <div className="button-row">
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => handleLinkProfileGuestToGlobal(selectedGuestDetail.id)}
                    disabled={isLinkingGlobalGuest}
                  >
                    <Icon name="shield" className="icon icon-sm" />
                    {isLinkingGlobalGuest ? t("global_profile_linking") : t("global_profile_link_guest_action")}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() =>
                      openInvitationCreate({
                        guestId: selectedGuestDetail.id,
                        messageKey: "invitation_prefill_guest"
                      })
                    }
                  >
                    {t("guest_detail_create_invitation_action")}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => handleCopyHostSignupLink(selectedGuestDetail)}
                    disabled={Boolean(selectedGuestDetailConversion)}
                  >
                    <Icon name={selectedGuestDetailConversion ? "check" : "link"} className="icon icon-sm" />
                    {selectedGuestDetailConversion ? t("host_already_registered_action") : t("host_invite_action")}
                  </button>
                </div>
              ) : null}
              {!selectedGuestDetail ? (
                <p className="hint">{t("guest_detail_empty")}</p>
              ) : (
                <div className="detail-layout">
                  <article className="detail-card">
                    <p className="item-title">
                      {`${selectedGuestDetail.first_name || ""} ${selectedGuestDetail.last_name || ""}`.trim() || t("field_guest")}
                    </p>
                    <p className="item-meta">{selectedGuestDetail.email || selectedGuestDetail.phone || "-"}</p>
                    {selectedGuestDetail.relationship ? (
                      <p className="item-meta">
                        {t("field_relationship")}:{" "}
                        {toCatalogLabel("relationship", selectedGuestDetail.relationship, language)}
                      </p>
                    ) : null}
                    {(selectedGuestDetail.city || selectedGuestDetail.country) ? (
                      <p className="item-meta">
                        {[selectedGuestDetail.city, selectedGuestDetail.country].filter(Boolean).join(", ")}
                      </p>
                    ) : null}
                    {selectedGuestDetailConversion ? (
                      <p className="item-meta">
                        <span className="status-pill status-host-converted">{t("host_converted_badge")}</span>{" "}
                        <span
                          className={`status-pill ${
                            getConversionSource(selectedGuestDetailConversion) === "google"
                              ? "status-host-conversion-source-google"
                              : "status-host-conversion-source-default"
                          }`}
                        >
                          {getConversionSourceLabel(t, getConversionSource(selectedGuestDetailConversion))}
                        </span>
                      </p>
                    ) : null}
                    {selectedGuestDetailConversion?.converted_at ? (
                      <p className="item-meta">
                        {t("host_conversion_date_label")}{" "}
                        {formatDate(selectedGuestDetailConversion.converted_at, language, t("no_date"))}
                      </p>
                    ) : null}
                    <div className="button-row">
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => handleLinkProfileGuestToGlobal(selectedGuestDetail.id)}
                        disabled={isLinkingGlobalGuest}
                      >
                        <Icon name="shield" className="icon icon-sm" />
                        {isLinkingGlobalGuest ? t("global_profile_linking") : t("global_profile_link_guest_action")}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() =>
                          openInvitationCreate({
                            guestId: selectedGuestDetail.id,
                            messageKey: "invitation_prefill_guest"
                          })
                        }
                      >
                        {t("guest_detail_create_invitation_action")}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => handleCopyHostSignupLink(selectedGuestDetail)}
                        disabled={Boolean(selectedGuestDetailConversion)}
                      >
                        <Icon name={selectedGuestDetailConversion ? "check" : "link"} className="icon icon-sm" />
                        {selectedGuestDetailConversion ? t("host_already_registered_action") : t("host_invite_action")}
                      </button>
                    </div>
                  </article>
                  <article className="detail-card detail-card-wide">
                    <p className="item-title">{t("guest_detail_profile_summary")}</p>
                    {selectedGuestDetailGroups.length === 0 ? (
                      <p className="hint">{t("guest_detail_no_profile_data")}</p>
                    ) : (
                      <div className="detail-chip-groups">
                        {selectedGuestDetailGroups.map((group) => (
                          <div key={group.title} className="detail-chip-group">
                            <p className="item-meta">{group.title}</p>
                            <div className="multi-chip-group">
                              {group.values.map((value) => (
                                <span key={`${group.title}-${value}`} className="multi-chip readonly">
                                  {value}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                  <article className="detail-card detail-card-wide">
                    <p className="item-title">{t("guest_detail_recommendations_title")}</p>
                    <p className="field-help">{t("guest_detail_recommendations_hint")}</p>
                    <div className="detail-recommendations-grid">
                      <article className="recommendation-card">
                        <p className="item-title">{t("smart_hosting_food")}</p>
                        <p className="item-meta">
                          {selectedGuestHostingRecommendations.menu.length > 0
                            ? selectedGuestHostingRecommendations.menu.join(", ")
                            : t("smart_hosting_no_data")}
                        </p>
                      </article>
                      <article className="recommendation-card">
                        <p className="item-title">{t("smart_hosting_drink")}</p>
                        <p className="item-meta">
                          {selectedGuestHostingRecommendations.drinks.length > 0
                            ? selectedGuestHostingRecommendations.drinks.join(", ")
                            : t("smart_hosting_no_data")}
                        </p>
                      </article>
                      <article className="recommendation-card">
                        <p className="item-title">{t("smart_hosting_avoid")}</p>
                        <p className="item-meta">
                          {selectedGuestHostingRecommendations.avoid.length > 0
                            ? selectedGuestHostingRecommendations.avoid.join(", ")
                            : t("smart_hosting_no_data")}
                        </p>
                      </article>
                      <article className="recommendation-card">
                        <p className="item-title">{t("smart_hosting_decor")}</p>
                        <p className="item-meta">
                          {selectedGuestHostingRecommendations.ambience.length > 0
                            ? selectedGuestHostingRecommendations.ambience.join(", ")
                            : t("smart_hosting_no_data")}
                        </p>
                      </article>
                      <article className="recommendation-card">
                        <p className="item-title">{t("smart_hosting_icebreakers")}</p>
                        <p className="item-meta">
                          {selectedGuestHostingRecommendations.icebreakers.length > 0
                            ? selectedGuestHostingRecommendations.icebreakers.join(", ")
                            : t("smart_hosting_no_data")}
                        </p>
                      </article>
                    </div>
                  </article>
                  <article className="detail-card detail-card-wide">
                    <p className="item-title">{t("guest_detail_invitations_title")}</p>
                    {selectedGuestDetailInvitations.length === 0 ? (
                      <p className="hint">{t("guest_detail_no_invitations")}</p>
                    ) : (
                      <ul className="list detail-list">
                        {selectedGuestDetailInvitations.map((invitationItem) => {
                          const eventItem = eventsById[invitationItem.event_id];
                          return (
                            <li key={invitationItem.id}>
                              <p className="item-title">{eventItem?.title || eventNamesById[invitationItem.event_id] || t("field_event")}</p>
                              <p className="item-meta">
                                {t("status")}:{" "}
                                <span className={`status-pill ${statusClass(invitationItem.status)}`}>
                                  {statusText(t, invitationItem.status)}
                                </span>{" "}
                                - {t("responded")}: {formatDate(invitationItem.responded_at, language, t("no_response"))}
                              </p>
                              <div className="item-actions">
                                <button
                                  className="btn btn-ghost btn-sm"
                                  type="button"
                                  onClick={() => openEventDetail(invitationItem.event_id)}
                                >
                                  {t("view_event_detail_action")}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </article>
                </div>
              )}
            </section>
            ) : null}
          </div>
        )}
      </section>
        ) : null}

        {activeView === "invitations" ? (
          <section className="workspace-shell view-transition">
            <header className="workspace-header">
              <h2 className="section-title">
                <Icon name="mail" className="icon" />
                {t("nav_invitations")}
              </h2>
              <div className="workspace-tabs" role="tablist" aria-label={t("workspace_subsections")}>
                {WORKSPACE_ITEMS.invitations.filter((item) => item.key !== "create").map((workspaceItem) => (
                  <button
                    key={workspaceItem.key}
                    type="button"
                    role="tab"
                    aria-selected={invitationsWorkspace === workspaceItem.key}
                    className={`workspace-tab ${invitationsWorkspace === workspaceItem.key ? "active" : ""}`}
                    onClick={() => setInvitationsWorkspace(workspaceItem.key)}
                  >
                    <Icon name={workspaceItem.icon} className="icon icon-sm" />
                    {t(workspaceItem.labelKey)}
                  </button>
                ))}
              </div>
              <div className="workspace-meta">
                <p className="workspace-breadcrumb">
                  <Icon name="folder" className="icon icon-sm" />
                  {t("workspace_path_prefix")}: {t("nav_invitations")} / {t(invitationsWorkspaceItem.labelKey)}
                </p>
                {invitationsWorkspace !== "hub" ? (
                  <button
                    className="btn btn-ghost btn-sm workspace-back-btn"
                    type="button"
                    onClick={() => setInvitationsWorkspace("hub")}
                  >
                    <Icon name="arrow_left" className="icon icon-sm" />
                    {t("workspace_back_to_folders")}
                  </button>
                ) : null}
              </div>
            </header>

            {invitationsWorkspace === "hub" ? (
              <div className="workspace-card-grid">
                {WORKSPACE_ITEMS.invitations.filter((item) => item.key !== "hub" && item.key !== "create").map((workspaceItem) => (
                  <article key={workspaceItem.key} className="workspace-card">
                    <div className="workspace-card-icon">
                      <Icon name={workspaceItem.icon} className="icon" />
                    </div>
                    <div className="workspace-card-content">
                      <h3>{t(workspaceItem.labelKey)}</h3>
                      <p>{t(workspaceItem.descriptionKey)}</p>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => setInvitationsWorkspace(workspaceItem.key)}
                    >
                      {t("workspace_open")}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div key={`invitations-${invitationsWorkspace}`} className="dashboard-grid single-section workspace-content">
            {invitationsWorkspace === "create" ? (
            <form className="panel form-grid" onSubmit={handleCreateInvitation} noValidate>
              <h2 className="section-title">
                <Icon name="mail" className="icon" />
                {t("create_invitation_title")}
              </h2>
              <p className="field-help">{t("help_invitation_form")}</p>

              <label>
                <span className="label-title">{t("field_event")}</span>
                <select
                  value={selectedEventId}
                  onChange={(event) => setSelectedEventId(event.target.value)}
                  disabled={!events.length}
                  aria-invalid={Boolean(invitationErrors.eventId)}
                >
                  {!events.length ? <option value="">{t("select_event_first")}</option> : null}
                  {events.map((eventItem) => (
                    <option key={eventItem.id} value={eventItem.id}>
                      {eventItem.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="label-title">{t("field_guest")}</span>
                <select
                  value={selectedGuestId}
                  onChange={(event) => setSelectedGuestId(event.target.value)}
                  disabled={!guests.length || allGuestsAlreadyInvitedForSelectedEvent}
                  aria-invalid={Boolean(invitationErrors.guestId)}
                >
                  {!guests.length ? <option value="">{t("select_guest_first")}</option> : null}
                  {allGuestsAlreadyInvitedForSelectedEvent ? (
                    <option value="">{t("invitation_all_guests_already_invited")}</option>
                  ) : null}
                  {guests.map((guestItem) => (
                    <option
                      key={guestItem.id}
                      value={guestItem.id}
                      disabled={invitedGuestIdsForSelectedEvent.has(guestItem.id)}
                    >
                      {guestItem.first_name} {guestItem.last_name || ""}
                      {invitedGuestIdsForSelectedEvent.has(guestItem.id)
                        ? ` (${t("invitation_guest_already_invited_tag")})`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <section className="recommendation-card invitation-bulk-card">
                <p className="label-title">
                  <Icon name="check" className="icon icon-sm" />
                  {t("invitation_bulk_title")}
                </p>
                <p className="field-help">{t("invitation_bulk_hint")}</p>
                <label>
                  <span className="label-title">{t("search")}</span>
                  <input
                    type="search"
                    value={bulkInvitationSearch}
                    onChange={(event) => setBulkInvitationSearch(event.target.value)}
                    placeholder={t("invitation_bulk_search_placeholder")}
                    disabled={!events.length || allGuestsAlreadyInvitedForSelectedEvent}
                  />
                </label>
                <div className="button-row">
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={handleSelectVisibleBulkGuests}
                    disabled={bulkFilteredGuests.length === 0 || allGuestsAlreadyInvitedForSelectedEvent}
                  >
                    {t("invitation_bulk_select_visible")}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={handleClearBulkGuests}
                    disabled={bulkInvitationGuestIds.length === 0}
                  >
                    {t("invitation_bulk_clear_selection")}
                  </button>
                </div>
                <p className="hint">
                  {t("invitation_bulk_selected_count")} {bulkInvitationGuestIds.length} - {t("results_count")} {bulkFilteredGuests.length}
                </p>
                {!events.length || allGuestsAlreadyInvitedForSelectedEvent ? (
                  <p className="hint">{t("invitation_all_guests_already_invited")}</p>
                ) : (
                  <div className="bulk-guest-grid" role="group" aria-label={t("invitation_bulk_title")}>
                    {bulkFilteredGuests.slice(0, 20).map((guestItem) => {
                      const guestLabel = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest");
                      return (
                        <label key={guestItem.id} className="bulk-guest-option">
                          <input
                            type="checkbox"
                            checked={bulkInvitationGuestIds.includes(guestItem.id)}
                            onChange={() => toggleBulkInvitationGuest(guestItem.id)}
                          />
                          <span>
                            <strong>{guestLabel}</strong>
                            <span className="item-meta">{guestItem.email || guestItem.phone || "-"}</span>
                          </span>
                        </label>
                      );
                    })}
                    {bulkFilteredGuests.length > 20 ? (
                      <p className="hint">
                        {t("contact_import_preview_more")} {bulkFilteredGuests.length - 20}
                      </p>
                    ) : null}
                  </div>
                )}
              </section>

              <FieldMeta
                helpText={
                  allGuestsAlreadyInvitedForSelectedEvent
                    ? t("invitation_all_guests_already_invited")
                    : `${t("hint_invitation_public")} ${t("invitation_guest_tag_hint")}`
                }
                errorText={
                  invitationErrors.eventId ? t(invitationErrors.eventId) : invitationErrors.guestId ? t(invitationErrors.guestId) : ""
                }
              />

              {selectedGuestId ? (
                <section
                  className={`recommendation-card ${
                    invitationRecommendations?.warnings?.length ? "warning" : ""
                  }`}
                >
                  <p className="label-title">
                    <Icon name="sparkle" className="icon icon-sm" />
                    {t("invitation_recommendation_title")}
                  </p>
                  <p className="field-help">
                    {t("invitation_recommendation_hint")}{" "}
                    {invitationRecommendations?.guestLabel
                      ? `${invitationRecommendations.guestLabel}${invitationRecommendations?.eventLabel ? ` - ${invitationRecommendations.eventLabel}` : ""}`
                      : ""}
                  </p>
                  {invitationRecommendations?.warnings?.length ? (
                    <div>
                      <p className="hint">{t("invitation_recommendation_warnings")}</p>
                      <ul className="list recommendation-list">
                        {invitationRecommendations.warnings.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {invitationRecommendations?.suggestions?.length ? (
                    <div>
                      <p className="hint">{t("invitation_recommendation_suggestions")}</p>
                      <ul className="list recommendation-list">
                        {invitationRecommendations.suggestions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {!invitationRecommendations?.warnings?.length && !invitationRecommendations?.suggestions?.length ? (
                    <p className="hint">{t("invitation_recommendation_empty")}</p>
                  ) : null}
                </section>
              ) : null}

              <div className="button-row">
                <button
                  className="btn"
                  type="submit"
                  disabled={isCreatingInvitation || !events.length || !guests.length || allGuestsAlreadyInvitedForSelectedEvent}
                >
                  {isCreatingInvitation ? t("generating_invitation") : t("generate_rsvp")}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={handleCreateBulkInvitations}
                  disabled={isCreatingBulkInvitations || !events.length || bulkInvitationGuestIds.length === 0}
                >
                  {isCreatingBulkInvitations ? t("invitation_bulk_creating") : t("invitation_bulk_create_button")}
                </button>
              </div>
              <InlineMessage text={invitationMessage} />

              {lastInvitationUrl ? (
                <div className="link-box">
                  <p className="hint">{t("invitation_link_label")}</p>
                  <input value={lastInvitationUrl} readOnly />
                  <div className="button-row">
                    <button className="btn btn-ghost" type="button" onClick={() => handleCopyInvitationLink(lastInvitationUrl)}>
                      {t("copy_link")}
                    </button>
                    <a className="btn btn-ghost" href={lastInvitationUrl} target="_blank" rel="noreferrer">
                      {t("open_rsvp")}
                    </a>
                  </div>
                  {lastInvitationShareText ? (
                    <>
                      <p className="hint">{t("invitation_share_message_label")}</p>
                      <textarea value={lastInvitationShareText} readOnly rows={6} />
                      <div className="button-row">
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => handleCopyInvitationMessage(lastInvitationShareText)}
                        >
                          {t("invitation_copy_message")}
                        </button>
                        {lastInvitationWhatsappUrl ? (
                          <a className="btn btn-ghost" href={lastInvitationWhatsappUrl} target="_blank" rel="noreferrer">
                            {t("invitation_open_whatsapp")}
                          </a>
                        ) : null}
                        {lastInvitationEmailUrl ? (
                          <a className="btn btn-ghost" href={lastInvitationEmailUrl}>
                            {t("invitation_open_email")}
                          </a>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </form>
            ) : null}

            {invitationsWorkspace === "latest" ? (
            <section className="panel panel-list panel-invitations-latest">
              <h2 className="section-title">
                <Icon name="mail" className="icon" />
                {t("latest_invitations_title")}
              </h2>
              <p className="field-help">{t("hint_accessibility")}</p>
              <div className="list-tools">
                <label>
                  <span className="label-title">{t("search")}</span>
                  <input
                    type="search"
                    value={invitationSearch}
                    onChange={(event) => setInvitationSearch(event.target.value)}
                    placeholder={t("search_invitations_placeholder")}
                  />
                </label>
                <label>
                  <span className="label-title">{t("sort_by")}</span>
                  <select value={invitationSort} onChange={(event) => setInvitationSort(event.target.value)}>
                    <option value="created_desc">{t("sort_created_desc")}</option>
                    <option value="created_asc">{t("sort_created_asc")}</option>
                    <option value="responded_desc">{t("sort_responded_desc")}</option>
                    <option value="responded_asc">{t("sort_responded_asc")}</option>
                  </select>
                </label>
              </div>
              <div className="list-filter-tabs" role="group" aria-label={t("filter_status")}>
                {[
                  { key: "all", label: t("all_status") },
                  { key: "pending", label: t("status_pending") },
                  { key: "yes", label: t("status_yes") },
                  { key: "maybe", label: t("status_maybe") },
                  { key: "no", label: t("status_no") }
                ].map((statusOption) => (
                  <button
                    key={statusOption.key}
                    className={`list-filter-tab ${invitationStatusFilter === statusOption.key ? "active" : ""}`}
                    type="button"
                    aria-pressed={invitationStatusFilter === statusOption.key}
                    onClick={() => setInvitationStatusFilter(statusOption.key)}
                  >
                    {statusOption.label}
                  </button>
                ))}
              </div>
              <p className="hint">
                {t("results_count")}: {filteredInvitations.length}
              </p>
              {showInvitationBulkActions && selectedLatestInvitationIds.length > 0 ? (
                <p className="hint">
                  <span className="status-pill status-pending">
                    {t("invitation_list_bulk_selected_count")} {selectedLatestInvitationIds.length}
                  </span>
                </p>
              ) : null}
              {showInvitationBulkActions ? (
                <section className="recommendation-card invitation-bulk-card">
                  <p className="label-title">
                    <Icon name="check" className="icon icon-sm" />
                    {t("invitation_list_bulk_title")}
                  </p>
                  <p className="field-help">{t("invitation_list_bulk_hint")}</p>
                  <div className="button-row">
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={handleSelectVisibleLatestInvitations}
                      disabled={pagedInvitations.length === 0}
                    >
                      {t("invitation_list_bulk_select_visible")}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={handleClearLatestInvitationSelection}
                      disabled={selectedLatestInvitationIds.length === 0}
                    >
                      {t("invitation_list_bulk_clear")}
                    </button>
                  </div>
                  <p className="hint">
                    {t("invitation_list_bulk_selected_count")} {selectedLatestInvitationIds.length}
                  </p>
                  <div className="button-row">
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={handleCopySelectedInvitationLinks}
                      disabled={selectedLatestInvitationIds.length === 0}
                    >
                      {t("invitation_list_bulk_copy_links")}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={handleCopySelectedInvitationMessages}
                      disabled={selectedLatestInvitationIds.length === 0}
                    >
                      {t("invitation_list_bulk_copy_messages")}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      type="button"
                      onClick={handleRequestDeleteInvitationBulk}
                      disabled={selectedLatestInvitationIds.length === 0}
                    >
                      {t("invitation_list_bulk_delete")}
                    </button>
                  </div>
                </section>
              ) : null}
              <InlineMessage text={invitationMessage} />
              {filteredInvitations.length === 0 ? (
                <p>{t("no_invitations")}</p>
              ) : (
                <>
                <div className="list-table-shell">
                  <div
                    className={`list-table-head ${
                      showInvitationBulkActions ? "list-table-head-invitations" : "list-table-head-invitations-compact"
                    }`}
                    aria-hidden="true"
                  >
                    {showInvitationBulkActions ? <span>{t("invitation_list_bulk_select_item")}</span> : null}
                    <span>{t("field_guest")}</span>
                    <span>{t("field_event")}</span>
                    <span>RSVP</span>
                    <span>{t("created")}</span>
                    <span>{t("actions_label")}</span>
                  </div>
                  <ul
                    className={`list list-table ${
                      showInvitationBulkActions ? "list-table-invitations" : "list-table-invitations list-table-invitations-compact"
                    }`}
                  >
                  {pagedInvitations.map((invitation) => {
                    const eventName = eventNamesById[invitation.event_id] || invitation.event_id;
                    const guestName = guestNamesById[invitation.guest_id] || invitation.guest_id;
                    const guestItem = guestsById[invitation.guest_id] || null;
                    const eventItem = eventsById[invitation.event_id] || null;
                    const sharePayload = buildInvitationSharePayload(invitation);
                    const url = sharePayload?.url || buildAppUrl(`/?token=${invitation.public_token}`);
                    const itemLabel = `${eventName || t("field_event")} - ${guestName || t("field_guest")}`;
                    return (
                      <li key={invitation.id} className="list-table-row list-row-invitation">
                        {showInvitationBulkActions ? (
                          <label className="bulk-guest-option invitation-select-option cell-select">
                            <input
                              type="checkbox"
                              checked={selectedLatestInvitationIds.includes(invitation.id)}
                              onChange={() => toggleLatestInvitationSelection(invitation.id)}
                            />
                            <span>
                              <strong>{t("invitation_list_bulk_select_item")}</strong>
                              <span className="item-meta">{itemLabel}</span>
                            </span>
                          </label>
                        ) : null}
                        <div className="cell-main list-title-with-avatar">
                          <span className="list-avatar list-avatar-sm">{getInitials(guestName, "IN")}</span>
                          <div>
                            <p className="item-title">{guestName}</p>
                            <p className="item-meta">{guestItem?.email || guestItem?.phone || "-"}</p>
                          </div>
                        </div>
                        <div className="cell-invitation-event cell-meta">
                          <p className="item-title">{eventName}</p>
                          <p className="item-meta">
                            {eventItem?.start_at ? formatDate(eventItem.start_at, language, t("no_date")) : t("no_date")}
                          </p>
                        </div>
                        <p className="item-meta cell-invitation-status cell-extra">
                          <span className={`status-pill ${statusClass(invitation.status)}`}>{statusText(t, invitation.status)}</span>
                        </p>
                        <p className="item-meta cell-invitation-created cell-extra">
                          {formatDate(invitation.created_at, language, t("no_date"))}
                        </p>
                        <div className="cell-extra invitation-row-links">
                          <button className="btn btn-ghost btn-sm btn-icon-only" type="button" onClick={() => openEventDetail(invitation.event_id)} aria-label={t("view_event_detail_action")} title={t("view_event_detail_action")}>
                            <Icon name="calendar" className="icon icon-sm" />
                          </button>
                          <button className="btn btn-ghost btn-sm btn-icon-only" type="button" onClick={() => openGuestDetail(invitation.guest_id)} aria-label={t("view_guest_detail_action")} title={t("view_guest_detail_action")}>
                            <Icon name="user" className="icon icon-sm" />
                          </button>
                        </div>
                        <div className="button-row cell-actions invitation-actions">
                          <button
                            className="btn btn-ghost btn-sm btn-icon-only"
                            type="button"
                            onClick={() => {
                              const prepared = handlePrepareInvitationShare(invitation);
                              if (prepared?.whatsappUrl) {
                                window.open(prepared.whatsappUrl, "_blank", "noopener,noreferrer");
                              }
                            }}
                            aria-label={t("invitation_open_whatsapp")}
                            title={t("invitation_open_whatsapp")}
                          >
                            <Icon name="message" className="icon icon-sm" />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon-only"
                            type="button"
                            onClick={() => {
                              const prepared = handlePrepareInvitationShare(invitation);
                              if (prepared?.mailtoUrl) {
                                window.open(prepared.mailtoUrl, "_blank", "noopener,noreferrer");
                              }
                            }}
                            aria-label={t("invitation_open_email")}
                            title={t("invitation_open_email")}
                          >
                            <Icon name="mail" className="icon icon-sm" />
                          </button>
                          <button className="btn btn-ghost btn-sm btn-icon-only" type="button" onClick={() => handleCopyInvitationLink(url)} aria-label={t("copy_link")} title={t("copy_link")}>
                            <Icon name="link" className="icon icon-sm" />
                          </button>
                          <a className="btn btn-ghost btn-sm btn-icon-only" href={url} target="_blank" rel="noreferrer" aria-label={t("open_rsvp")} title={t("open_rsvp")}>
                            <Icon name="eye" className="icon icon-sm" />
                          </a>
                          <button
                            className="btn btn-danger btn-sm btn-icon-only"
                            type="button"
                            aria-label={t("delete_invitation")}
                            title={t("delete_invitation")}
                            onClick={() => handleRequestDeleteInvitation(invitation, itemLabel)}
                          >
                            <Icon name="x" className="icon icon-sm" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  </ul>
                </div>
                </>
              )}
              {filteredInvitations.length > 0 ? (
                <div className="pagination-row">
                  <p className="hint">
                    {t("pagination_page")} {invitationPage}/{invitationTotalPages}
                  </p>
                  <div className="button-row">
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => setInvitationPage((prev) => Math.max(1, prev - 1))}
                      disabled={invitationPage <= 1}
                    >
                      {t("pagination_prev")}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => setInvitationPage((prev) => Math.min(invitationTotalPages, prev + 1))}
                      disabled={invitationPage >= invitationTotalPages}
                    >
                      {t("pagination_next")}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
            ) : null}
          </div>
        )}
      </section>
        ) : null}

        {deleteTarget ? (
          <div className="confirm-overlay" onClick={() => setDeleteTarget(null)}>
            <section
              className="confirm-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-delete-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id="confirm-delete-title" className="item-title">
                {deleteTarget.type === "event"
                  ? t("delete_event_title")
                  : deleteTarget.type === "guest"
                  ? t("delete_guest_title")
                  : deleteTarget.type === "invitation_bulk"
                  ? t("delete_invitations_title")
                  : t("delete_invitation_title")}
              </h3>
              <p className="item-meta">
                {deleteTarget.type === "event"
                  ? t("delete_event_confirm")
                  : deleteTarget.type === "guest"
                  ? t("delete_guest_confirm")
                  : deleteTarget.type === "invitation_bulk"
                  ? t("delete_invitations_confirm")
                  : t("delete_invitation_confirm")}
              </p>
              <p className="hint">
                {t("selected_item")}:{" "}
                {deleteTarget.type === "event"
                  ? deleteTarget.item?.title || "-"
                  : deleteTarget.type === "guest"
                  ? `${deleteTarget.item?.first_name || ""} ${deleteTarget.item?.last_name || ""}`.trim() || "-"
                  : deleteTarget.type === "invitation_bulk"
                  ? `${deleteTarget.itemLabel || "0"}`
                  : deleteTarget.itemLabel || "-"}
              </p>
              <div className="button-row">
                <button className="btn btn-ghost" type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleteConfirmLoading}>
                  {t("cancel_action")}
                </button>
                <button className="btn btn-danger" type="button" onClick={handleConfirmDelete} disabled={isDeleteConfirmLoading}>
                  {isDeleteConfirmLoading ? t("deleting") : t("confirm_delete")}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export { DashboardScreen };
