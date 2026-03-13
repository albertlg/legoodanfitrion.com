import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HostProfileView } from "./dashboard/components/host-profile-view";
import { AvatarCircle } from "../components/avatar-circle";
import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { FieldMeta } from "../components/field-meta";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { DashboardOverview } from "../components/dashboard/DashboardOverview";
import { EventDetailView } from "./dashboard/components/event-detail-view";
import { EventsListView } from "./dashboard/components/events-list-view";
import { EventBuilderView } from './dashboard/components/event-builder-view';
import { GuestDetailView } from './dashboard/components/guest-detail-view';
import { GuestsListView } from "./dashboard/components/guests-list-view";
import { GuestBuilderView } from './dashboard/components/guest-builder-view';

import { InvitationsListView } from "./dashboard/components/invitations-list-view";
import { InvitationBuilderView } from './dashboard/components/invitation-builder-view';
import {
  CATALOGS,
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
import {
  buildHostPlanSections,
  createHostPlanSnapshot,
  getHostPlanStateFromSnapshot,
  normalizeHostPlanTab
} from "../lib/host-plan";
import { supabase } from "../lib/supabaseClient";
import { validateEventForm, validateGuestForm, validateInvitationForm } from "../lib/validation";

// --- NUEVOS IMPORTS DE HELPERS (LA MAGIA DEL ORDEN) ---
import {
  GUEST_AVATAR_STORAGE_BUCKET, GUEST_AVATAR_MAX_BYTES, VIEW_CONFIG, EVENTS_PAGE_SIZE_DEFAULT,
  GUESTS_PAGE_SIZE_DEFAULT, PAGE_SIZE_OPTIONS, IMPORT_PREVIEW_PAGE_SIZE_DEFAULT,
  IMPORT_PREVIEW_PAGE_SIZE_OPTIONS, IMPORT_CONTACTS_SORT_OPTIONS, IMPORT_WIZARD_STEP_TOTAL,
  INVITATIONS_PAGE_SIZE_DEFAULT, INVITATION_BULK_SEGMENTS, GUEST_PROFILE_VIEW_TABS,
  GUEST_ADVANCED_EDIT_TABS, EVENT_PLANNER_VIEW_TABS, EVENT_PLANNER_SHOPPING_FILTERS,
  GUEST_ADVANCED_PRIORITY_SECTION_MAP, GUEST_ADVANCED_ERROR_FIELDS_BY_TAB, DASHBOARD_PREFS_KEY_PREFIX,
  EVENT_SETTINGS_STORAGE_KEY_PREFIX, GUEST_GEO_CACHE_KEY_PREFIX, EVENT_DRESS_CODE_OPTIONS,
  EVENT_PLAYLIST_OPTIONS, CITY_OPTIONS_BY_LANGUAGE, COUNTRY_OPTIONS_BY_LANGUAGE, WORKSPACE_ITEMS,
  EVENT_TEMPLATE_DEFINITIONS, GUEST_ADVANCED_INITIAL_STATE
} from "../lib/constants";

import {
  toNullable, toIsoDateTime, toLocalDateTimeInput, getSuggestedEventDateTime, formatDate,
  formatShortDate, formatLongDate, formatTimeLabel, formatRelativeDate, normalizeIsoDate,
  getNextBirthdaySummary, getBirthdayEventDateTime, interpolateText, normalizeLookupValue,
  getInitials, uniqueValues, toList, splitListInput, listToInput, isBlankValue
} from "../lib/formatters";

import {
  normalizeEmailKey, normalizePhoneKey, getMergedFieldValue, formatMergeReviewValue,
  buildGuestFingerprint, buildGuestNameKey, buildGuestFullNameKey, buildGuestMatchingKeys,
  getImportDuplicateReasonCodes, getImportDuplicateMergeConfidence,
  buildGuestDuplicateMatchScore, mergeUniqueListValues, normalizeImportSource, tagImportedContacts,
  deriveGuestNameFromContact, toContactGroupsList, calculateImportContactCaptureScore,
  getImportPotentialLevel, deriveRelationshipCodeFromContact, splitFullName, normalizeDeviceContact,
  readImageFileAsDataUrl, isDataImageUrl, uploadGuestAvatarToStorage,
  getGuestAvatarUrl, getGuestPhotoValue, translateCatalogInputList,
  toPetAllergyLabels, INTOLERANCE_LOOKUP_SET, MEDICAL_CONDITION_LOOKUP_SET,
  DIETARY_MEDICAL_LOOKUP_SET, normalizeSensitiveRecord,
  hasGuestHealthAlerts, buildHostInvitePayload, inferGlobalSharePreset, applyGlobalSharePreset,
  formatGlobalShareEventType, getGlobalShareVisibleScopes
} from "../lib/guest-helpers";

import {
  EVENT_TYPE_TO_PLANNER_PRESET, EVENT_TYPE_TO_DEFAULT_HOUR, statusText, statusClass,
  getConversionSource, getConversionSourceLabel, getMapEmbedUrl, normalizeEventDressCode,
  normalizeEventPlaylistMode, normalizeEventSettings, hasEventSettingsColumns,
  getSuggestedEventSettingsFromInsights, buildHostingPlaybookActions,
  buildEventPlannerContext, buildEventMealPlan, applyPlannerOverrides, buildEventPlannerPromptBundle,
  buildEventHostPlaybook
} from "../lib/event-planner-helpers";

import {
  isCompatibilityError, isMissingRelationError, isMissingDbFeatureError, readEventSettingsCache,
  writeEventSettingsCache, readGuestGeoCache, writeGuestGeoCache, mergeOptionsWithSelected
} from "../lib/system-helpers";
import {
  normalizeDashboardRouteState,
  buildDashboardPathFromState,
  isSpecificEventDetailPath,
  isSpecificGuestDetailPath,
  isSpecificGuestAdvancedEditPath,
  shouldPreserveSpecificPath
} from "../router-utils";
import { useDashboardNavigationState } from "../hooks/useDashboardNavigationState";
import { useEventPlannerState } from "../hooks/useEventPlannerState";
import { useImportWizardState } from "../hooks/useImportWizardState";

const EventPlannerContextModal = lazy(() =>
  import("./dashboard/components/event-planner-context-modal").then((module) => ({
    default: module.EventPlannerContextModal
  }))
);

function getWorkspaceItemsByView(viewKey, includeHub = true) {
  const workspaceItems = WORKSPACE_ITEMS[viewKey] || [];
  return includeHub ? workspaceItems : workspaceItems.filter((item) => item.key !== "hub");
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
    <div className="flex flex-col gap-2.5 w-full">
      {/* Título del campo (Alineado con el nuevo diseño del formulario) */}
      <p id={titleId} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">
        {label}
      </p>

      {/* CHIPS */}
      <div className="flex flex-wrap gap-2 md:gap-2.5" role="group" aria-labelledby={titleId}>
        {mergedOptions.map((optionValue) => {
          const isSelected = selectedValues.includes(optionValue);
          return (
            <button
              key={optionValue}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 md:px-4 md:py-2 rounded-full text-[13px] md:text-sm font-semibold transition-all duration-200 border outline-none focus:ring-2 focus:ring-blue-500/50 select-none ${isSelected
                ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300 shadow-sm"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              aria-pressed={isSelected}
              onClick={() => toggleValue(optionValue)}
            >
              {/* Checkmark animado para los seleccionados */}
              {isSelected && <Icon name="check" className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              <span>{optionValue}</span>
            </button>
          );
        })}
      </div>

      {/* INPUT AÑADIR OPCIÓN CUSTOM (Estilo moderno con botón incrustado) */}
      <div className="relative mt-1">
        <input
          type="text"
          className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl pl-4 pr-24 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm"
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
        <button
          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-bold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          onClick={handleAddCustomOption}
          disabled={!customOption.trim()}
        >
          {t("multi_select_add_button")}
        </button>
      </div>

      {/* Mantenemos tu FieldMeta original intacto */}
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
    // Aseguramos que existan las librerías necesarias
    if (!window.google?.maps || !window.google?.maps?.marker) {
      return;
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: points[0].lat, lng: points[0].lng },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapId: "DEMO_MAP_ID" // 🚀 REQUISITO OBLIGATORIO PARA LOS NUEVOS MARKERS
      });
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    // Limpiamos los markers anteriores (La nueva API usa map = null en vez de setMap(null))
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    points.forEach((pointItem) => {
      // 🚀 FIX AVISO CONSOLA: Usamos AdvancedMarkerElement
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: { lat: pointItem.lat, lng: pointItem.lng },
        title: pointItem.label
      });

      marker.addListener("gmp-click", () => {
        if (infoWindowRef.current) {
          const contentNode = document.createElement("div");
          // Estilos en línea básicos para el tooltip nativo de Google Maps
          contentNode.style.padding = "4px 8px 4px 0";
          contentNode.style.fontFamily = "inherit";

          const titleNode = document.createElement("strong");
          titleNode.textContent = pointItem.label;
          titleNode.style.color = "#111827";
          titleNode.style.fontSize = "14px";
          contentNode.appendChild(titleNode);

          if (pointItem.meta) {
            const metaNode = document.createElement("p");
            metaNode.textContent = pointItem.meta;
            metaNode.style.margin = "4px 0 0";
            metaNode.style.color = "#6B7280";
            metaNode.style.fontSize = "12px";
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
      // 🚀 FIX: En la nueva API, se lee la propiedad directa .position
      bounds.extend(marker.position);
    });

    if (points.length === 1) {
      mapInstanceRef.current.setCenter({ lat: points[0].lat, lng: points[0].lng });
      mapInstanceRef.current.setZoom(14);
    } else {
      mapInstanceRef.current.fitBounds(bounds, 58);
    }
  }, [mapsStatus, points, onOpenDetail]);

  return (
    <article className="bg-white/50 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/10 p-5 sm:p-6 flex flex-col gap-4 shadow-sm transition-all">
      <div className="flex flex-col">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon name="location" className="w-5 h-5 text-blue-500" />
          {title}
        </h3>
        {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
      </div>

      {mapsStatus === "loading" && <p className="text-xs text-gray-500 italic animate-pulse">{t("address_google_loading")}</p>}
      {mapsStatus === "unconfigured" && <p className="text-xs text-yellow-600 dark:text-yellow-500 italic">{t("address_google_unconfigured")}</p>}
      {mapsStatus === "error" && <p className="text-xs text-red-500 italic">{`${t("address_google_error")} ${mapsError || ""}`}</p>}

      {mapsStatus === "ready" && points.length === 0 && (
        <div className="py-8 text-center bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{emptyText}</p>
        </div>
      )}

      {mapsStatus === "ready" && points.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          {/* Contenedor del Mapa con el nuevo formato Edge-to-Edge redondeado */}
          <div
            ref={mapContainerRef}
            className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden shadow-inner border border-black/10 dark:border-white/10"
            role="img"
            aria-label={title}
          />

          {/* Listado de Ubicaciones debajo del mapa */}
          <ul className="flex flex-col gap-2">
            {points.slice(0, 8).map((pointItem) => (
              <li key={pointItem.id}>
                <button
                  className="w-full text-left px-4 py-3 bg-white/60 hover:bg-white dark:bg-black/20 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-all flex items-center gap-2.5 shadow-sm group outline-none focus:ring-2 focus:ring-blue-500/50"
                  type="button"
                  onClick={() => onOpenDetail?.(pointItem.id)}
                >
                  <Icon name="eye" className="w-4 h-4 text-blue-500/70 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  <span className="truncate flex-1">{openActionText} · <span className="text-gray-900 dark:text-white">{pointItem.label}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
  onPreferencesSynced,
  appRoute,
  appPath,
  onNavigateApp
}) {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid", []);
  const initialRouteState = useMemo(() => normalizeDashboardRouteState(appRoute), [appRoute]);
  const routeImportWizardSource = useMemo(
    () => normalizeDashboardRouteState(appRoute).importWizardSource || "",
    [appRoute]
  );
  const {
    activeView,
    setActiveView,
    isMenuOpen,
    setIsMenuOpen,
    eventsWorkspace,
    setEventsWorkspace,
    guestsWorkspace,
    setGuestsWorkspace,
    invitationsWorkspace,
    setInvitationsWorkspace,
    selectedEventDetailId,
    setSelectedEventDetailId,
    selectedGuestDetailId,
    setSelectedGuestDetailId,
    eventDetailPlannerTab,
    setEventDetailPlannerTab,
    eventPlannerShoppingFilter,
    setEventPlannerShoppingFilter,
    guestProfileViewTab,
    setGuestProfileViewTab,
    openGuestAdvancedOnCreate,
    setOpenGuestAdvancedOnCreate,
    guestAdvancedEditTab,
    setGuestAdvancedEditTab,
    isCompactViewport,
    setIsCompactViewport
  } = useDashboardNavigationState(initialRouteState);

  const {
    eventPlannerRegenerationByEventId,
    setEventPlannerRegenerationByEventId,
    eventPlannerRegenerationByEventIdByTab,
    setEventPlannerRegenerationByEventIdByTab,
    eventPlannerContextOverridesByEventId,
    setEventPlannerContextOverridesByEventId,
    eventPlannerSnapshotsByEventId,
    setEventPlannerSnapshotsByEventId,
    eventPlannerSnapshotHistoryByEventId,
    setEventPlannerSnapshotHistoryByEventId,
    eventPlannerGenerationByEventId,
    setEventPlannerGenerationByEventId,
    isEventPlannerContextOpen,
    setIsEventPlannerContextOpen,
    eventPlannerContextFocusField,
    setEventPlannerContextFocusField,
    showEventPlannerTechnicalPrompt,
    setShowEventPlannerTechnicalPrompt,
    eventPlannerContextDraft,
    setEventPlannerContextDraft,
    eventDetailShoppingCheckedByEventId,
    setEventDetailShoppingCheckedByEventId
  } = useEventPlannerState();

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

  const geocoderRef = useRef(null);
  const guestGeocodePendingRef = useRef(new Set());
  const guestAdvancedDetailsRef = useRef(null);
  const guestAdvancedToolbarRef = useRef(null);
  const guestAdvancedSectionRefs = useRef({});
  const eventPlannerSectionRef = useRef(null);
  const contactImportDetailsRef = useRef(null);
  const contactImportFileInputRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const userNavigationIntentRef = useRef(false);
  const importWizardAutoloadHandledRef = useRef(false);

  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestPhotoUrl, setGuestPhotoUrl] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestRelationship, setGuestRelationship] = useState("");
  const [guestCity, setGuestCity] = useState("");
  const [guestCountry, setGuestCountry] = useState("");
  const [guestAdvanced, setGuestAdvanced] = useState(GUEST_ADVANCED_INITIAL_STATE);
  const [guestMessage, setGuestMessage] = useState("");
  const [guestErrors, setGuestErrors] = useState({});
  const [editingGuestId, setEditingGuestId] = useState(
    initialRouteState.activeView === "guests" && initialRouteState.guestsWorkspace === "create"
      ? String(initialRouteState.selectedGuestDetailId || "").trim()
      : ""
  );
  const [isSavingGuest, setIsSavingGuest] = useState(false);
  const [guestLastSavedAt, setGuestLastSavedAt] = useState("");
  const {
    importContactsDraft,
    setImportContactsDraft,
    importContactsPreview,
    setImportContactsPreview,
    isImportWizardOpen,
    setIsImportWizardOpen,
    importWizardStep,
    setImportWizardStep,
    importWizardSource,
    setImportWizardSource,
    importWizardUploadedFileName,
    setImportWizardUploadedFileName,
    importWizardShareEmail,
    setImportWizardShareEmail,
    importWizardShareMessage,
    setImportWizardShareMessage,
    importWizardQrDataUrl,
    setImportWizardQrDataUrl,
    importWizardResult,
    setImportWizardResult,
    importContactsSearch,
    setImportContactsSearch,
    importContactsGroupFilter,
    setImportContactsGroupFilter,
    importContactsPotentialFilter,
    setImportContactsPotentialFilter,
    importContactsSourceFilter,
    setImportContactsSourceFilter,
    importContactsSort,
    setImportContactsSort,
    importDuplicateMode,
    setImportDuplicateMode,
    selectedImportContactIds,
    setSelectedImportContactIds,
    approvedLowConfidenceMergeIds,
    setApprovedLowConfidenceMergeIds,
    pendingImportMergeApprovalPreviewId,
    setPendingImportMergeApprovalPreviewId,
    importMergeReviewShowOnlyWillFill,
    setImportMergeReviewShowOnlyWillFill,
    pendingImportMergeSelectedFieldKeys,
    setPendingImportMergeSelectedFieldKeys,
    approvedLowConfidenceMergeFieldsByPreviewId,
    setApprovedLowConfidenceMergeFieldsByPreviewId,
    importContactsPage,
    setImportContactsPage,
    importContactsPageSize,
    setImportContactsPageSize,
    importContactsMessage,
    setImportContactsMessage,
    isImportingContacts,
    setIsImportingContacts,
    isImportingGoogleContacts,
    setIsImportingGoogleContacts
  } = useImportWizardState({
    initialImportWizardSource: routeImportWizardSource || "csv",
    importPreviewPageSizeDefault: IMPORT_PREVIEW_PAGE_SIZE_DEFAULT
  });
  const isMobileImportExperience = isCompactViewport;
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
  const [previewGlobalShareHostId, setPreviewGlobalShareHostId] = useState("");
  const [isPausingGlobalShares, setIsPausingGlobalShares] = useState(false);
  const [isRevokingGlobalShares, setIsRevokingGlobalShares] = useState(false);
  const [globalShareHistory, setGlobalShareHistory] = useState([]);
  const [isLoadingGlobalShareHistory, setIsLoadingGlobalShareHistory] = useState(false);
  const [pendingGlobalShareSave, setPendingGlobalShareSave] = useState(null);
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [integrationStatusMessage, setIntegrationStatusMessage] = useState("");
  const [isLoadingIntegrationStatus, setIsLoadingIntegrationStatus] = useState(false);
  const [isIntegrationPanelOpen, setIsIntegrationPanelOpen] = useState(false);
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
  const [bulkInvitationSegment, setBulkInvitationSegment] = useState("all");
  const [isCreatingBulkInvitations, setIsCreatingBulkInvitations] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");
  const [eventSort, setEventSort] = useState("created_desc");
  const [eventPage, setEventPage] = useState(1);
  const [eventPageSize, setEventPageSize] = useState(EVENTS_PAGE_SIZE_DEFAULT);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestContactFilter, setGuestContactFilter] = useState("all");
  const [guestSort, setGuestSort] = useState("created_desc");
  const [guestPage, setGuestPage] = useState(1);
  const [invitationSearch, setInvitationSearch] = useState("");
  const [invitationEventFilter, setInvitationEventFilter] = useState("all");
  const [invitationStatusFilter, setInvitationStatusFilter] = useState("all");
  const [invitationSort, setInvitationSort] = useState("created_desc");
  const [invitationPage, setInvitationPage] = useState(1);
  const [invitationPageSize, setInvitationPageSize] = useState(INVITATIONS_PAGE_SIZE_DEFAULT);
  const [guestPageSize, setGuestPageSize] = useState(GUESTS_PAGE_SIZE_DEFAULT);
  const [eventsMapFocusId, setEventsMapFocusId] = useState("");
  const [guestsMapFocusId, setGuestsMapFocusId] = useState("");
  const [guestGeocodeById, setGuestGeocodeById] = useState({});
  const [insightsEventId, setInsightsEventId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [guestMergeSourceId, setGuestMergeSourceId] = useState("");
  const [guestMergeTargetId, setGuestMergeTargetId] = useState("");
  const [guestMergeSearch, setGuestMergeSearch] = useState("");
  const [isMergingGuest, setIsMergingGuest] = useState(false);
  const [, setPrefsReady] = useState(false);

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
          : false;

  const guestProfileTabs = useMemo(
    () => [
      { key: "general", label: t("guest_profile_tab_general") },
      { key: "food", label: t("guest_profile_tab_food") },
      { key: "lifestyle", label: t("guest_profile_tab_lifestyle") },
      { key: "conversation", label: t("guest_profile_tab_conversation") },
      { key: "health", label: t("guest_profile_tab_health") },
      { key: "history", label: t("guest_profile_tab_history") }
    ],
    [t]
  );
  const guestAdvancedEditTabs = useMemo(
    () => [
      { key: "identity", label: t("guest_advanced_section_identity") },
      { key: "food", label: t("guest_advanced_section_food") },
      { key: "lifestyle", label: t("guest_advanced_section_lifestyle") },
      { key: "conversation", label: t("guest_advanced_section_conversation") },
      { key: "health", label: t("guest_advanced_section_health") }
    ],
    [t]
  );

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
  const existingGuestByEmail = useMemo(() => {
    const map = {};
    for (const guestItem of guests) {
      const emailKey = normalizeEmailKey(guestItem.email || "");
      if (emailKey && !map[emailKey]) {
        map[emailKey] = guestItem;
      }
    }
    return map;
  }, [guests]);
  const existingGuestByPhone = useMemo(() => {
    const map = {};
    for (const guestItem of guests) {
      const phoneKey = normalizePhoneKey(guestItem.phone || "");
      if (phoneKey && !map[phoneKey]) {
        map[phoneKey] = guestItem;
      }
    }
    return map;
  }, [guests]);
  const existingGuestByName = useMemo(() => {
    const map = {};
    for (const guestItem of guests) {
      const nameKey = buildGuestNameKey(guestItem.first_name, guestItem.last_name);
      if (nameKey && !map[nameKey]) {
        map[nameKey] = guestItem;
      }
    }
    return map;
  }, [guests]);
  const existingGuestByFullName = useMemo(() => {
    const map = {};
    for (const guestItem of guests) {
      const fullNameKey = buildGuestFullNameKey(guestItem.first_name, guestItem.last_name);
      if (fullNameKey && !map[fullNameKey]) {
        map[fullNameKey] = guestItem;
      }
    }
    return map;
  }, [guests]);
  const ownerEmailKey = normalizeEmailKey(session?.user?.email || "");
  const ownerPhoneKey = normalizePhoneKey(hostProfilePhone || "");
  const ownerNameKeys = useMemo(() => {
    const fallbackName = ownerEmailKey ? ownerEmailKey.split("@")[0] : "";
    const { firstName, lastName } = splitFullName(hostProfileName || fallbackName);
    return {
      exact: buildGuestNameKey(firstName, lastName),
      full: buildGuestFullNameKey(firstName, lastName)
    };
  }, [hostProfileName, ownerEmailKey]);
  const ownerGuestCandidate = useMemo(() => {
    if (ownerEmailKey && existingGuestByEmail[ownerEmailKey]) {
      return existingGuestByEmail[ownerEmailKey];
    }
    if (ownerPhoneKey && existingGuestByPhone[ownerPhoneKey]) {
      return existingGuestByPhone[ownerPhoneKey];
    }
    return null;
  }, [existingGuestByEmail, existingGuestByPhone, ownerEmailKey, ownerPhoneKey]);
  const findExistingGuestForContact = useCallback(
    ({ firstName, lastName, email, phone }) => {
      const emailKey = normalizeEmailKey(email);
      const phoneKey = normalizePhoneKey(phone);
      const nameKey = buildGuestNameKey(firstName, lastName);
      const fullNameKey = buildGuestFullNameKey(firstName, lastName);

      if (ownerGuestCandidate) {
        const isOwnerByEmail = Boolean(emailKey && ownerEmailKey && emailKey === ownerEmailKey);
        const isOwnerByPhone = Boolean(phoneKey && ownerPhoneKey && phoneKey === ownerPhoneKey);
        const isOwnerByName = Boolean(
          (nameKey && ownerNameKeys.exact && nameKey === ownerNameKeys.exact) ||
          (fullNameKey && ownerNameKeys.full && fullNameKey === ownerNameKeys.full)
        );
        if (isOwnerByEmail || isOwnerByPhone || isOwnerByName) {
          return ownerGuestCandidate;
        }
      }

      if (emailKey && existingGuestByEmail[emailKey]) {
        return existingGuestByEmail[emailKey];
      }
      if (phoneKey && existingGuestByPhone[phoneKey]) {
        return existingGuestByPhone[phoneKey];
      }
      if (nameKey && existingGuestByName[nameKey]) {
        return existingGuestByName[nameKey];
      }
      if (fullNameKey && existingGuestByFullName[fullNameKey]) {
        return existingGuestByFullName[fullNameKey];
      }
      return null;
    },
    [
      existingGuestByEmail,
      existingGuestByFullName,
      existingGuestByName,
      existingGuestByPhone,
      ownerEmailKey,
      ownerGuestCandidate,
      ownerNameKeys,
      ownerPhoneKey
    ]
  );
  const eventsById = useMemo(() => Object.fromEntries(events.map((eventItem) => [eventItem.id, eventItem])), [events]);
  const guestMergeSource = useMemo(
    () => (guestMergeSourceId ? guestsById[guestMergeSourceId] || null : null),
    [guestMergeSourceId, guestsById]
  );
  const guestMergeCandidates = useMemo(() => {
    if (!guestMergeSource) {
      return [];
    }
    const searchTerm = String(guestMergeSearch || "").trim().toLowerCase();
    const withScore = guests
      .filter((guestItem) => guestItem.id !== guestMergeSource.id)
      .map((guestItem) => ({
        ...guestItem,
        mergeScore: buildGuestDuplicateMatchScore(guestMergeSource, guestItem)
      }));

    const filtered = withScore.filter((guestItem) => {
      if (searchTerm) {
        const name = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim().toLowerCase();
        const email = String(guestItem.email || "").toLowerCase();
        const phone = String(guestItem.phone || "").toLowerCase();
        return name.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm);
      }
      return guestItem.mergeScore > 0;
    });

    if (filtered.length > 0) {
      return filtered.sort((a, b) => b.mergeScore - a.mergeScore || String(a.first_name || "").localeCompare(String(b.first_name || "")));
    }
    if (searchTerm) {
      return [];
    }
    return withScore
      .sort((a, b) => b.mergeScore - a.mergeScore || String(a.first_name || "").localeCompare(String(b.first_name || "")))
      .slice(0, 8);
  }, [guestMergeSearch, guestMergeSource, guests]);
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
  const importContactsAnalysis = useMemo(() => {
    const seenInPreview = new Set();
    return importContactsPreview.map((contactItem, index) => {
      const firstName = String(contactItem?.firstName || "").trim();
      const lastName = String(contactItem?.lastName || "").trim();
      const email = String(contactItem?.email || "").trim();
      const phone = String(contactItem?.phone || "").trim();
      const birthday = normalizeIsoDate(contactItem?.birthday);
      const photoUrl = String(contactItem?.photoUrl || "").trim();
      const groups = toContactGroupsList(contactItem);
      const importSource = normalizeImportSource(contactItem?.importSource);
      const fingerprint = buildGuestFingerprint({ firstName, lastName, email, phone });
      const matchingKeys = buildGuestMatchingKeys({ firstName, lastName, email, phone });
      const duplicateInPreview = matchingKeys.some((matchingKey) => seenInPreview.has(matchingKey));
      matchingKeys.forEach((matchingKey) => seenInPreview.add(matchingKey));
      const existingGuest = findExistingGuestForContact({ firstName, lastName, email, phone });
      const duplicateExisting = Boolean(existingGuest);
      const willMerge = duplicateExisting && importDuplicateMode === "merge";
      const duplicateReasonCodes = getImportDuplicateReasonCodes({
        firstName,
        lastName,
        email,
        phone,
        existingGuest,
        ownerGuestId: ownerGuestCandidate?.id || ""
      });
      const duplicateMergeConfidence = getImportDuplicateMergeConfidence(duplicateReasonCodes);
      const duplicateReasonLabel = duplicateReasonCodes
        .map((reasonCode) => t(`contact_import_match_reason_${reasonCode}`))
        .filter(Boolean)
        .join(" · ");
      const previewId = fingerprint ? `fp:${fingerprint}` : `idx:${index}`;
      const requiresMergeApproval = Boolean(
        duplicateExisting &&
        willMerge &&
        duplicateMergeConfidence === "low" &&
        !approvedLowConfidenceMergeIds.includes(previewId)
      );
      const existingGuestName =
        duplicateExisting && existingGuest
          ? `${existingGuest.first_name || ""} ${existingGuest.last_name || ""}`.trim() || t("field_guest")
          : "";
      const canImport = Boolean(
        (firstName || email || phone) &&
        !duplicateInPreview &&
        (!duplicateExisting || (willMerge && !requiresMergeApproval))
      );
      const hasDualChannel = Boolean(normalizeEmailKey(email) && normalizePhoneKey(phone));
      const captureScore = calculateImportContactCaptureScore({
        firstName,
        lastName,
        email,
        phone,
        city: String(contactItem?.city || "").trim(),
        country: String(contactItem?.country || "").trim(),
        address: String(contactItem?.address || "").trim(),
        company: String(contactItem?.company || "").trim(),
        birthday,
        photoUrl,
        groups
      });
      const potentialLevel = getImportPotentialLevel(captureScore);
      return {
        previewId,
        fingerprint,
        matchingKeys,
        existingGuestId: existingGuest?.id || "",
        existingGuestName,
        firstName,
        lastName,
        email,
        phone,
        birthday,
        photoUrl,
        groups,
        importSource,
        relationship: String(contactItem?.relationship || "").trim(),
        city: String(contactItem?.city || "").trim(),
        country: String(contactItem?.country || "").trim(),
        address: String(contactItem?.address || "").trim(),
        postalCode: String(contactItem?.postalCode || "").trim(),
        stateRegion: String(contactItem?.stateRegion || "").trim(),
        company: String(contactItem?.company || "").trim(),
        captureScore,
        potentialLevel,
        hasDualChannel,
        duplicateInPreview,
        duplicateExisting,
        duplicateReasonCodes,
        duplicateReasonLabel,
        duplicateMergeConfidence,
        requiresMergeApproval,
        willMerge,
        canImport
      };
    });
  }, [
    approvedLowConfidenceMergeIds,
    findExistingGuestForContact,
    importContactsPreview,
    importDuplicateMode,
    ownerGuestCandidate?.id,
    t
  ]);
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
    const potentialFilter = String(importContactsPotentialFilter || "all");
    const sourceFilter = String(importContactsSourceFilter || "all");
    const sortBy = String(importContactsSort || "priority");
    const potentialWeight = { high: 3, medium: 2, low: 1 };
    const collator = new Intl.Collator(language, { sensitivity: "base", numeric: true });
    const compareByPriority = (a, b) => {
      if (a.canImport !== b.canImport) {
        return a.canImport ? -1 : 1;
      }
      if ((potentialWeight[b.potentialLevel] || 0) !== (potentialWeight[a.potentialLevel] || 0)) {
        return (potentialWeight[b.potentialLevel] || 0) - (potentialWeight[a.potentialLevel] || 0);
      }
      if (b.captureScore !== a.captureScore) {
        return b.captureScore - a.captureScore;
      }
      if (a.duplicateExisting !== b.duplicateExisting) {
        return a.duplicateExisting ? 1 : -1;
      }
      const nameA = `${a.firstName} ${a.lastName}`.trim();
      const nameB = `${b.firstName} ${b.lastName}`.trim();
      return collator.compare(nameA, nameB);
    };

    return importContactsAnalysis
      .filter((item) => {
        const matchesGroup = groupFilter === "all" || (Array.isArray(item.groups) && item.groups.includes(groupFilter));
        const matchesPotential = potentialFilter === "all" || item.potentialLevel === potentialFilter;
        const matchesSource = sourceFilter === "all" || item.importSource === sourceFilter;
        if (!matchesGroup || !matchesPotential || !matchesSource) {
          return false;
        }
        if (!term) {
          return true;
        }
        const groupsText = Array.isArray(item.groups) ? item.groups.join(" ") : "";
        const haystack = `${item.firstName} ${item.lastName} ${item.email} ${item.phone} ${item.city} ${item.country} ${groupsText}`.toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.trim();
        const nameB = `${b.firstName} ${b.lastName}`.trim();
        if (sortBy === "score_desc") {
          if (b.captureScore !== a.captureScore) {
            return b.captureScore - a.captureScore;
          }
          return collator.compare(nameA, nameB);
        }
        if (sortBy === "score_asc") {
          if (a.captureScore !== b.captureScore) {
            return a.captureScore - b.captureScore;
          }
          return collator.compare(nameA, nameB);
        }
        if (sortBy === "name_desc") {
          return collator.compare(nameB, nameA);
        }
        if (sortBy === "name_asc") {
          return collator.compare(nameA, nameB);
        }
        return compareByPriority(a, b);
      });
  }, [
    importContactsAnalysis,
    importContactsGroupFilter,
    importContactsPotentialFilter,
    importContactsSourceFilter,
    importContactsSort,
    importContactsSearch,
    language
  ]);
  const importContactsFilteredReady = useMemo(
    () => importContactsFiltered.filter((item) => item.canImport),
    [importContactsFiltered]
  );
  const importContactsSuggested = useMemo(
    () =>
      importContactsFiltered.filter(
        (item) =>
          item.canImport &&
          !item.duplicateInPreview &&
          (item.potentialLevel === "high" || (item.potentialLevel === "medium" && item.hasDualChannel))
      ),
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
            if (item.potentialLevel === "high") {
              acc.highPotential += 1;
            } else if (item.potentialLevel === "medium") {
              acc.mediumPotential += 1;
            } else {
              acc.lowPotential += 1;
            }
          }
          if (item.duplicateExisting) {
            acc.duplicateExisting += 1;
          }
          if (item.duplicateInPreview) {
            acc.duplicateInPreview += 1;
          }
          return acc;
        },
        { ready: 0, highPotential: 0, mediumPotential: 0, lowPotential: 0, duplicateExisting: 0, duplicateInPreview: 0 }
      ),
    [importContactsAnalysis]
  );
  const importContactsDuplicateCount = useMemo(
    () => importContactsAnalysis.filter((item) => item.duplicateExisting || item.duplicateInPreview).length,
    [importContactsAnalysis]
  );
  const importWizardMobileLink = useMemo(() => buildAppUrl("/app/guests?import=mobile&wizard=1"), []);
  useEffect(() => {
    let isDisposed = false;
    const generateQrDataUrl = async () => {
      try {
        const qrcodeModule = await import("qrcode");
        const qrDataUrl = await qrcodeModule.toDataURL(importWizardMobileLink, {
          width: 180,
          margin: 1,
          color: {
            dark: "#1a2332",
            light: "#ffffff"
          }
        });
        if (!isDisposed) {
          setImportWizardQrDataUrl(qrDataUrl);
        }
      } catch {
        if (!isDisposed) {
          setImportWizardQrDataUrl("");
        }
      }
    };
    generateQrDataUrl();
    return () => {
      isDisposed = true;
    };
  }, [importWizardMobileLink, setImportWizardQrDataUrl]);
  const importWizardStepLabel = useMemo(
    () =>
      interpolateText(t("import_wizard_step_indicator"), {
        step: importWizardStep,
        total: IMPORT_WIZARD_STEP_TOTAL
      }),
    [importWizardStep, t]
  );
  const importWizardStepTitle = useMemo(() => {
    if (importWizardStep === 1) {
      return t("import_wizard_step_1_title");
    }
    if (importWizardStep === 2) {
      if (importWizardSource === "gmail") {
        return t("import_wizard_step_2_gmail_title");
      }
      if (importWizardSource === "mobile") {
        return t("import_wizard_step_2_mobile_title");
      }
      return t("import_wizard_step_2_csv_title");
    }
    if (importWizardStep === 3) {
      return t("import_wizard_step_3_title");
    }
    return importWizardResult.partial ? t("import_wizard_step_4_error_title") : t("import_wizard_step_4_success_title");
  }, [importWizardResult.partial, importWizardSource, importWizardStep, t]);
  const importWizardStepHint = useMemo(() => {
    if (importWizardStep === 1) {
      return t("import_wizard_step_1_hint");
    }
    if (importWizardStep === 2) {
      if (importWizardSource === "gmail") {
        return t("import_wizard_step_2_gmail_hint");
      }
      if (importWizardSource === "mobile") {
        return t("import_wizard_step_2_mobile_hint");
      }
      return t("import_wizard_step_2_csv_hint");
    }
    if (importWizardStep === 3) {
      return t("import_wizard_step_3_hint");
    }
    return importWizardResult.partial ? t("import_wizard_step_4_error_hint") : t("import_wizard_step_4_success_hint");
  }, [importWizardResult.partial, importWizardSource, importWizardStep, t]);
  const importWizardContinueLabel = useMemo(() => {
    if (importWizardStep === 3) {
      return isImportingContacts
        ? t("contact_import_importing")
        : interpolateText(t("import_wizard_import_selected"), { count: importContactsSelectedReady.length });
    }
    if (importWizardStep === 4) {
      return t("import_wizard_finish");
    }
    return t("pagination_next");
  }, [importContactsSelectedReady.length, importWizardStep, isImportingContacts, t]);
  const importWizardCanContinue = useMemo(() => {
    if (importWizardStep === 1) {
      return Boolean(importWizardSource);
    }
    if (importWizardStep === 2) {
      return importContactsAnalysis.length > 0;
    }
    if (importWizardStep === 3) {
      return !isImportingContacts && importContactsSelectedReady.length > 0;
    }
    return true;
  }, [importWizardSource, importWizardStep, importContactsAnalysis.length, importContactsSelectedReady.length, isImportingContacts]);
  const importContactsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(importContactsFiltered.length / importContactsPageSize)),
    [importContactsFiltered.length, importContactsPageSize]
  );
  const pagedImportContacts = useMemo(() => {
    const safePage = Math.min(importContactsPage, importContactsTotalPages);
    const start = (safePage - 1) * importContactsPageSize;
    return importContactsFiltered.slice(start, start + importContactsPageSize);
  }, [importContactsFiltered, importContactsPage, importContactsPageSize, importContactsTotalPages]);
  const pendingImportMergeApprovalItem = useMemo(
    () => importContactsAnalysis.find((item) => item.previewId === pendingImportMergeApprovalPreviewId) || null,
    [importContactsAnalysis, pendingImportMergeApprovalPreviewId]
  );
  const pendingImportMergeApprovalTargetGuest = useMemo(() => {
    if (!pendingImportMergeApprovalItem?.existingGuestId) {
      return null;
    }
    return guestsById[pendingImportMergeApprovalItem.existingGuestId] || null;
  }, [guestsById, pendingImportMergeApprovalItem]);
  const pendingImportMergeComparisonRows = useMemo(() => {
    if (!pendingImportMergeApprovalItem || !pendingImportMergeApprovalTargetGuest) {
      return [];
    }
    const sourceName = [pendingImportMergeApprovalItem.firstName, pendingImportMergeApprovalItem.lastName]
      .filter(Boolean)
      .join(" ");
    const targetName = [pendingImportMergeApprovalTargetGuest.first_name, pendingImportMergeApprovalTargetGuest.last_name]
      .filter(Boolean)
      .join(" ");
    const rows = [
      { fieldKey: "full_name", label: t("field_full_name"), source: sourceName, target: targetName },
      { fieldKey: "email", label: t("email"), source: pendingImportMergeApprovalItem.email, target: pendingImportMergeApprovalTargetGuest.email },
      { fieldKey: "phone", label: t("field_phone"), source: pendingImportMergeApprovalItem.phone, target: pendingImportMergeApprovalTargetGuest.phone },
      { fieldKey: "city", label: t("field_city"), source: pendingImportMergeApprovalItem.city, target: pendingImportMergeApprovalTargetGuest.city },
      { fieldKey: "country", label: t("field_country"), source: pendingImportMergeApprovalItem.country, target: pendingImportMergeApprovalTargetGuest.country },
      { fieldKey: "address", label: t("field_address"), source: pendingImportMergeApprovalItem.address, target: pendingImportMergeApprovalTargetGuest.address },
      { fieldKey: "company", label: t("field_company"), source: pendingImportMergeApprovalItem.company, target: pendingImportMergeApprovalTargetGuest.company },
      { fieldKey: "birthday", label: t("field_birthday"), source: pendingImportMergeApprovalItem.birthday, target: pendingImportMergeApprovalTargetGuest.birthday },
      {
        fieldKey: "avatar_url",
        label: t("field_guest_photo"),
        source: pendingImportMergeApprovalItem.photoUrl ? t("status_yes") : t("status_no"),
        target: pendingImportMergeApprovalTargetGuest.avatar_url ? t("status_yes") : t("status_no")
      }
    ];
    const rankedRows = rows.map((rowItem) => {
      const sourceBlank = isBlankValue(rowItem.source);
      const targetBlank = isBlankValue(rowItem.target);
      let mergeResultKey = "keep_target";
      if (!sourceBlank && targetBlank) {
        mergeResultKey = "will_fill";
      } else if (sourceBlank && targetBlank) {
        mergeResultKey = "empty";
      }
      return {
        ...rowItem,
        mergeResultKey,
        willFill: mergeResultKey === "will_fill"
      };
    });
    const resultOrder = { will_fill: 0, keep_target: 1, empty: 2 };
    return rankedRows.sort((a, b) => (resultOrder[a.mergeResultKey] ?? 99) - (resultOrder[b.mergeResultKey] ?? 99));
  }, [pendingImportMergeApprovalItem, pendingImportMergeApprovalTargetGuest, t]);
  const pendingImportMergeWillFillCount = useMemo(
    () => pendingImportMergeComparisonRows.filter((rowItem) => rowItem.willFill).length,
    [pendingImportMergeComparisonRows]
  );
  const pendingImportMergeVisibleRows = useMemo(() => {
    if (!importMergeReviewShowOnlyWillFill) {
      return pendingImportMergeComparisonRows;
    }
    return pendingImportMergeComparisonRows.filter((rowItem) => rowItem.willFill);
  }, [importMergeReviewShowOnlyWillFill, pendingImportMergeComparisonRows]);
  const pendingImportMergeVisibleCount = pendingImportMergeVisibleRows.length;
  const pendingImportMergeTotalCount = pendingImportMergeComparisonRows.length;
  const pendingImportMergeDefaultSelectedFieldKeys = useMemo(
    () => pendingImportMergeComparisonRows.filter((rowItem) => rowItem.willFill).map((rowItem) => rowItem.fieldKey),
    [pendingImportMergeComparisonRows]
  );
  const pendingImportMergeSelectedFieldKeysSet = useMemo(
    () => new Set(pendingImportMergeSelectedFieldKeys),
    [pendingImportMergeSelectedFieldKeys]
  );
  const pendingImportMergeSelectableCount = pendingImportMergeDefaultSelectedFieldKeys.length;
  useEffect(() => {
    const defaultIds = importContactsReady.map((item) => item.previewId);
    setSelectedImportContactIds(defaultIds);
  }, [importContactsReady, setSelectedImportContactIds]);
  useEffect(() => {
    setApprovedLowConfidenceMergeIds((prev) => {
      const validIds = new Set(importContactsAnalysis.map((item) => item.previewId));
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [importContactsAnalysis, setApprovedLowConfidenceMergeIds]);
  useEffect(() => {
    setApprovedLowConfidenceMergeFieldsByPreviewId((prev) => {
      const validIds = new Set(importContactsAnalysis.map((item) => item.previewId));
      const entries = Object.entries(prev).filter(([previewId]) => validIds.has(previewId));
      if (entries.length === Object.keys(prev).length) {
        return prev;
      }
      return Object.fromEntries(entries);
    });
  }, [importContactsAnalysis, setApprovedLowConfidenceMergeFieldsByPreviewId]);
  useEffect(() => {
    if (!pendingImportMergeApprovalItem || !pendingImportMergeApprovalItem.requiresMergeApproval) {
      setPendingImportMergeApprovalPreviewId("");
    }
  }, [pendingImportMergeApprovalItem, setPendingImportMergeApprovalPreviewId]);
  useEffect(() => {
    if (!pendingImportMergeApprovalItem) {
      setPendingImportMergeSelectedFieldKeys([]);
      return;
    }
    const saved = approvedLowConfidenceMergeFieldsByPreviewId[pendingImportMergeApprovalItem.previewId];
    if (Array.isArray(saved) && saved.length > 0) {
      setPendingImportMergeSelectedFieldKeys(saved);
      return;
    }
    setPendingImportMergeSelectedFieldKeys(pendingImportMergeDefaultSelectedFieldKeys);
  }, [
    approvedLowConfidenceMergeFieldsByPreviewId,
    pendingImportMergeApprovalItem,
    pendingImportMergeDefaultSelectedFieldKeys,
    setPendingImportMergeSelectedFieldKeys
  ]);
  useEffect(() => {
    if (activeView !== "guests" || guestsWorkspace !== "latest") {
      setPendingImportMergeApprovalPreviewId("");
      setPendingImportMergeSelectedFieldKeys([]);
    }
  }, [activeView, guestsWorkspace, setPendingImportMergeApprovalPreviewId, setPendingImportMergeSelectedFieldKeys]);
  useEffect(() => {
    setImportContactsPage(1);
  }, [
    importContactsSearch,
    importContactsGroupFilter,
    importContactsPotentialFilter,
    importContactsSourceFilter,
    importContactsSort,
    importDuplicateMode,
    importContactsPageSize,
    importContactsPreview.length,
    setImportContactsPage
  ]);
  useEffect(() => {
    if (importContactsPage > importContactsTotalPages) {
      setImportContactsPage(importContactsTotalPages);
    }
  }, [importContactsPage, importContactsTotalPages, setImportContactsPage]);
  useEffect(() => {
    if (!isImportWizardOpen) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsImportWizardOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImportWizardOpen, setIsImportWizardOpen]);
  useEffect(() => {
    if (typeof document === "undefined" || !isImportWizardOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isImportWizardOpen]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const onChange = (event) => setIsCompactViewport(Boolean(event.matches));
    setIsCompactViewport(Boolean(mediaQuery.matches));
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, [setIsCompactViewport]);
  useEffect(() => {
    if (activeView !== "guests" || guestsWorkspace !== "latest") {
      setIsImportWizardOpen(false);
    }
  }, [activeView, guestsWorkspace, setIsImportWizardOpen]);
  useEffect(() => {
    if (activeView !== "guests" || guestsWorkspace !== "latest" || isImportWizardOpen) {
      return;
    }
    if (!routeImportWizardSource) {
      importWizardAutoloadHandledRef.current = false;
      return;
    }
    if (importWizardAutoloadHandledRef.current) {
      return;
    }

    importWizardAutoloadHandledRef.current = true;
    setImportContactsDraft("");
    setImportContactsPreview([]);
    setImportWizardUploadedFileName("");
    setImportContactsSearch("");
    setImportContactsGroupFilter("all");
    setImportContactsPotentialFilter("all");
    setImportContactsSourceFilter("all");
    setImportContactsSort("priority");
    setImportDuplicateMode("skip");
    setSelectedImportContactIds([]);
    setApprovedLowConfidenceMergeIds([]);
    setApprovedLowConfidenceMergeFieldsByPreviewId({});
    setPendingImportMergeApprovalPreviewId("");
    setPendingImportMergeSelectedFieldKeys([]);
    setImportMergeReviewShowOnlyWillFill(true);
    setImportContactsPage(1);
    setImportContactsPageSize(IMPORT_PREVIEW_PAGE_SIZE_DEFAULT);
    setImportContactsMessage("");
    setImportWizardShareEmail("");
    setImportWizardShareMessage("");
    setImportWizardResult({
      imported: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      selected: 0,
      partial: false
    });
    setImportWizardSource(routeImportWizardSource);
    setImportWizardStep(2);
    setIsImportWizardOpen(true);

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search || "");
      searchParams.delete("import");
      searchParams.delete("wizard");
      const nextSearch = searchParams.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash || ""}`;
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [
    activeView,
    guestsWorkspace,
    isImportWizardOpen,
    routeImportWizardSource,
    setImportContactsDraft,
    setImportContactsPreview,
    setImportWizardUploadedFileName,
    setImportContactsSearch,
    setImportContactsGroupFilter,
    setImportContactsPotentialFilter,
    setImportContactsSourceFilter,
    setImportContactsSort,
    setImportDuplicateMode,
    setSelectedImportContactIds,
    setApprovedLowConfidenceMergeIds,
    setApprovedLowConfidenceMergeFieldsByPreviewId,
    setPendingImportMergeApprovalPreviewId,
    setPendingImportMergeSelectedFieldKeys,
    setImportMergeReviewShowOnlyWillFill,
    setImportContactsPage,
    setImportContactsPageSize,
    setImportContactsMessage,
    setImportWizardShareEmail,
    setImportWizardShareMessage,
    setImportWizardResult,
    setImportWizardSource,
    setImportWizardStep,
    setIsImportWizardOpen
  ]);
  const hostPotentialGuestsCount = useMemo(
    () => guests.filter((guestItem) => guestItem.email || guestItem.phone).length,
    [guests]
  );
  const selfGuestCandidate = useMemo(() => ownerGuestCandidate || null, [ownerGuestCandidate]);
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
          toList(sensitiveItem.pet_allergies).length ||
          toList(sensitiveItem.medical_conditions).length ||
          toList(sensitiveItem.dietary_medical_restrictions).length
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
  const canUseNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const canUseGoogleContacts = typeof window !== "undefined" && isGoogleContactsConfigured();
  const isIOSDevice = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }
    const ua = String(navigator.userAgent || "");
    const platform = String(navigator.platform || "");
    const touchPoints = Number(navigator.maxTouchPoints || 0);
    return /iPhone|iPod|iPad/i.test(ua) || (platform === "MacIntel" && touchPoints > 1);
  }, []);
  const canUseDeviceContacts =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(window.isSecureContext) &&
    supportsContactPickerApi;
  const recommendedImportWizardSource = useMemo(() => {
    if (!isMobileImportExperience) {
      return "csv";
    }
    if (canUseDeviceContacts) {
      return "mobile";
    }
    if (isIOSDevice && canUseGoogleContacts) {
      return "gmail";
    }
    if (canUseGoogleContacts) {
      return "gmail";
    }
    return "mobile";
  }, [canUseDeviceContacts, canUseGoogleContacts, isIOSDevice, isMobileImportExperience]);
  const importWizardShouldStartAtConfigStep = useMemo(
    () => isMobileImportExperience && ["mobile", "gmail"].includes(recommendedImportWizardSource),
    [isMobileImportExperience, recommendedImportWizardSource]
  );
  const contactPickerUnsupportedReason = !canUseDeviceContacts
    ? typeof window !== "undefined" && !window.isSecureContext
      ? t("contact_import_device_requires_https")
      : t("contact_import_device_not_supported")
    : "";
  const importWizardSourceOptions = useMemo(() => {
    const sourceItems = [
      { key: "csv", icon: "folder", title: t("import_wizard_source_csv_title"), hint: t("import_wizard_source_csv_hint") },
      { key: "gmail", icon: "mail", title: t("import_wizard_source_gmail_title"), hint: t("import_wizard_source_gmail_hint") },
      { key: "mobile", icon: "phone", title: t("import_wizard_source_mobile_title"), hint: t("import_wizard_source_mobile_hint") }
    ];
    const visibleSources = isMobileImportExperience ? sourceItems.filter((item) => item.key !== "csv") : sourceItems;
    const prioritizedSources = [...visibleSources].sort((left, right) => {
      if (left.key === recommendedImportWizardSource) {
        return -1;
      }
      if (right.key === recommendedImportWizardSource) {
        return 1;
      }
      return 0;
    });
    return prioritizedSources.map((item) => ({
      ...item,
      isRecommended: item.key === recommendedImportWizardSource
    }));
  }, [isMobileImportExperience, recommendedImportWizardSource, t]);
  useEffect(() => {
    if (!isImportWizardOpen || importWizardStep !== 1) {
      return;
    }
    const availableSources = new Set(importWizardSourceOptions.map((item) => item.key));
    if (!availableSources.has(importWizardSource)) {
      setImportWizardSource(recommendedImportWizardSource);
      return;
    }
    if (isMobileImportExperience && importWizardSource === "csv") {
      setImportWizardSource(recommendedImportWizardSource);
    }
  }, [
    importWizardSource,
    importWizardStep,
    importWizardSourceOptions,
    isImportWizardOpen,
    isMobileImportExperience,
    recommendedImportWizardSource,
    setImportWizardSource
  ]);
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
  const bulkSegmentCounts = useMemo(() => {
    const totals = {
      all: availableGuestsForSelectedEvent.length,
      high_potential: 0,
      health_sensitive: 0,
      no_invites: 0,
      converted_hosts: 0
    };
    for (const guestItem of availableGuestsForSelectedEvent) {
      const hasContact = Boolean(guestItem.email || guestItem.phone);
      const hasConversion = Boolean(guestHostConversionById[guestItem.id]);
      const hasHealthAlerts = hasGuestHealthAlerts(guestSensitiveById[guestItem.id] || {});
      const invitationCount = Number(guestEventCountByGuestId[guestItem.id] || 0);
      if (hasContact && !hasConversion) {
        totals.high_potential += 1;
      }
      if (hasHealthAlerts) {
        totals.health_sensitive += 1;
      }
      if (!invitationCount) {
        totals.no_invites += 1;
      }
      if (hasConversion) {
        totals.converted_hosts += 1;
      }
    }
    return totals;
  }, [availableGuestsForSelectedEvent, guestEventCountByGuestId, guestHostConversionById, guestSensitiveById]);
  const bulkFilteredGuests = useMemo(() => {
    const term = bulkInvitationSearch.trim().toLowerCase();
    return availableGuestsForSelectedEvent.filter((guestItem) => {
      const hasContact = Boolean(guestItem.email || guestItem.phone);
      const hasConversion = Boolean(guestHostConversionById[guestItem.id]);
      const hasHealthAlerts = hasGuestHealthAlerts(guestSensitiveById[guestItem.id] || {});
      const invitationCount = Number(guestEventCountByGuestId[guestItem.id] || 0);

      if (bulkInvitationSegment === "high_potential" && (!hasContact || hasConversion)) {
        return false;
      }
      if (bulkInvitationSegment === "health_sensitive" && !hasHealthAlerts) {
        return false;
      }
      if (bulkInvitationSegment === "no_invites" && invitationCount > 0) {
        return false;
      }
      if (bulkInvitationSegment === "converted_hosts" && !hasConversion) {
        return false;
      }

      if (!term) {
        return true;
      }
      const fullName = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim();
      const haystack = `${fullName} ${guestItem.email || ""} ${guestItem.phone || ""} ${guestItem.city || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [
    availableGuestsForSelectedEvent,
    bulkInvitationSearch,
    bulkInvitationSegment,
    guestEventCountByGuestId,
    guestHostConversionById,
    guestSensitiveById
  ]);
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
  const medicalConditionBaseOptions = useMemo(() => getCatalogLabels("medical_condition", language), [language]);
  const dietaryMedicalRestrictionBaseOptions = useMemo(
    () => getCatalogLabels("dietary_medical_restriction", language),
    [language]
  );
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
  const medicalConditionOptions = useMemo(
    () =>
      uniqueValues([
        ...medicalConditionBaseOptions,
        ...Object.values(guestSensitiveById).flatMap((sensitiveItem) =>
          toCatalogLabels("medical_condition", sensitiveItem?.medical_conditions || [], language)
        )
      ]),
    [medicalConditionBaseOptions, guestSensitiveById, language]
  );
  const dietaryMedicalRestrictionOptions = useMemo(
    () =>
      uniqueValues([
        ...dietaryMedicalRestrictionBaseOptions,
        ...Object.values(guestSensitiveById).flatMap((sensitiveItem) =>
          toCatalogLabels(
            "dietary_medical_restriction",
            sensitiveItem?.dietary_medical_restrictions || [],
            language
          )
        )
      ]),
    [dietaryMedicalRestrictionBaseOptions, guestSensitiveById, language]
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
          splitListInput(guestAdvanced.petAllergies).length ||
          splitListInput(guestAdvanced.medicalConditions).length ||
          splitListInput(guestAdvanced.dietaryMedicalRestrictions).length
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
  const guestPrioritySignals = useMemo(
    () => [
      { key: "diet", label: t("field_diet_type"), done: Boolean(guestAdvanced.dietType) },
      {
        key: "health",
        label: t("field_allergies"),
        done: Boolean(
          splitListInput(guestAdvanced.allergies).length ||
          splitListInput(guestAdvanced.intolerances).length ||
          splitListInput(guestAdvanced.petAllergies).length ||
          splitListInput(guestAdvanced.medicalConditions).length ||
          splitListInput(guestAdvanced.dietaryMedicalRestrictions).length
        )
      },
      { key: "menu", label: t("field_food_likes"), done: Boolean(splitListInput(guestAdvanced.foodLikes).length) },
      { key: "drink", label: t("field_drink_likes"), done: Boolean(splitListInput(guestAdvanced.drinkLikes).length) },
      { key: "music", label: t("field_music_genres"), done: Boolean(splitListInput(guestAdvanced.musicGenres).length) },
      { key: "talk", label: t("field_last_talk_topic"), done: Boolean(guestAdvanced.lastTalkTopic.trim()) },
      { key: "birthday", label: t("field_birthday"), done: Boolean(guestAdvanced.birthday.trim()) },
      {
        key: "moment",
        label: t("field_day_moment"),
        done: Boolean(splitListInput(guestAdvanced.preferredDayMoments).length)
      }
    ],
    [guestAdvanced, t]
  );
  const guestPriorityCompleted = guestPrioritySignals.filter((item) => item.done).length;
  const guestPriorityTotal = Math.max(1, guestPrioritySignals.length);
  const guestPriorityPercent = Math.round((guestPriorityCompleted / guestPriorityTotal) * 100);
  const guestPriorityMissing = guestPrioritySignals.filter((item) => !item.done);
  const guestAdvancedSignalsBySection = useMemo(
    () => Object.fromEntries(guestAdvancedProfileSignals.map((item) => [item.key, item])),
    [guestAdvancedProfileSignals]
  );
  const guestAdvancedCurrentTabIndex = GUEST_ADVANCED_EDIT_TABS.indexOf(guestAdvancedEditTab);
  const guestAdvancedCurrentStep = guestAdvancedCurrentTabIndex >= 0 ? guestAdvancedCurrentTabIndex + 1 : 1;
  const guestAdvancedPrevTab =
    guestAdvancedCurrentTabIndex > 0 ? GUEST_ADVANCED_EDIT_TABS[guestAdvancedCurrentTabIndex - 1] : "";
  const guestAdvancedNextTab =
    guestAdvancedCurrentTabIndex >= 0 && guestAdvancedCurrentTabIndex < GUEST_ADVANCED_EDIT_TABS.length - 1
      ? GUEST_ADVANCED_EDIT_TABS[guestAdvancedCurrentTabIndex + 1]
      : "";
  const guestAdvancedCurrentTabLabel =
    guestAdvancedEditTabs.find((tabItem) => tabItem.key === guestAdvancedEditTab)?.label ||
    guestAdvancedEditTabs[0]?.label ||
    "";
  const guestAdvancedFirstPendingTab = useMemo(
    () => GUEST_ADVANCED_EDIT_TABS.find((tabKey) => !guestAdvancedSignalsBySection[tabKey]?.done) || "",
    [guestAdvancedSignalsBySection]
  );
  const guestAdvancedFirstPendingLabel = guestAdvancedFirstPendingTab
    ? guestAdvancedSignalsBySection[guestAdvancedFirstPendingTab]?.label || ""
    : "";
  const guestAdvancedNextPendingTab = useMemo(() => {
    if (!guestAdvancedSignalsBySection || GUEST_ADVANCED_EDIT_TABS.length === 0) {
      return "";
    }
    const currentIndex = Math.max(0, guestAdvancedCurrentTabIndex);
    const orderedTabs = [
      ...GUEST_ADVANCED_EDIT_TABS.slice(currentIndex + 1),
      ...GUEST_ADVANCED_EDIT_TABS.slice(0, currentIndex + 1)
    ];
    return (
      orderedTabs.find(
        (tabKey) => tabKey !== guestAdvancedEditTab && !guestAdvancedSignalsBySection[tabKey]?.done
      ) || ""
    );
  }, [guestAdvancedCurrentTabIndex, guestAdvancedEditTab, guestAdvancedSignalsBySection]);
  const guestAdvancedNextPendingLabel = guestAdvancedNextPendingTab
    ? guestAdvancedSignalsBySection[guestAdvancedNextPendingTab]?.label || ""
    : "";
  const guestAdvancedCurrentChecklist = useMemo(() => {
    if (guestAdvancedEditTab === "identity") {
      return [
        {
          key: "identity_contact",
          label: t("hint_contact_required"),
          done: Boolean(guestFirstName.trim() && (guestEmail.trim() || guestPhone.trim()))
        },
        {
          key: "identity_location",
          label: t("field_address"),
          done: Boolean(guestAdvanced.address.trim() || guestCity.trim() || guestCountry.trim())
        },
        {
          key: "identity_social",
          label: t("field_instagram"),
          done: Boolean(guestAdvanced.instagram.trim() || guestAdvanced.linkedIn.trim() || guestAdvanced.twitter.trim())
        }
      ];
    }
    if (guestAdvancedEditTab === "food") {
      return [
        { key: "food_diet", label: t("field_diet_type"), done: Boolean(guestAdvanced.dietType.trim()) },
        { key: "food_likes", label: t("field_food_likes"), done: Boolean(splitListInput(guestAdvanced.foodLikes).length) },
        { key: "food_drinks", label: t("field_drink_likes"), done: Boolean(splitListInput(guestAdvanced.drinkLikes).length) }
      ];
    }
    if (guestAdvancedEditTab === "lifestyle") {
      return [
        {
          key: "lifestyle_music",
          label: t("field_music_genres"),
          done: Boolean(splitListInput(guestAdvanced.musicGenres).length)
        },
        { key: "lifestyle_sports", label: t("field_sport"), done: Boolean(splitListInput(guestAdvanced.sports).length) },
        {
          key: "lifestyle_day_moment",
          label: t("field_day_moment"),
          done: Boolean(splitListInput(guestAdvanced.preferredDayMoments).length)
        }
      ];
    }
    if (guestAdvancedEditTab === "conversation") {
      return [
        {
          key: "conversation_last_topic",
          label: t("field_last_talk_topic"),
          done: Boolean(guestAdvanced.lastTalkTopic.trim())
        },
        {
          key: "conversation_taboo",
          label: t("field_taboo_topics"),
          done: Boolean(splitListInput(guestAdvanced.tabooTopics).length)
        },
        {
          key: "conversation_relationship",
          label: t("field_relationship"),
          done: Boolean(guestRelationship.trim() || splitListInput(guestAdvanced.preferredGuestRelationships).length)
        }
      ];
    }
    return [
      {
        key: "health_allergies",
        label: t("field_allergies"),
        done: Boolean(splitListInput(guestAdvanced.allergies).length)
      },
      {
        key: "health_intolerances",
        label: t("field_intolerances"),
        done: Boolean(splitListInput(guestAdvanced.intolerances).length)
      },
      {
        key: "health_conditions",
        label: t("field_medical_conditions"),
        done: Boolean(splitListInput(guestAdvanced.medicalConditions).length)
      },
      {
        key: "health_dietary_restrictions",
        label: t("field_dietary_medical_restrictions"),
        done: Boolean(splitListInput(guestAdvanced.dietaryMedicalRestrictions).length)
      },
      {
        key: "health_sensitive_consent",
        label: t("field_sensitive_consent"),
        done: !(
          splitListInput(guestAdvanced.allergies).length ||
          splitListInput(guestAdvanced.intolerances).length ||
          splitListInput(guestAdvanced.petAllergies).length ||
          splitListInput(guestAdvanced.medicalConditions).length ||
          splitListInput(guestAdvanced.dietaryMedicalRestrictions).length
        )
          ? true
          : Boolean(guestAdvanced.sensitiveConsent)
      }
    ];
  }, [guestAdvanced, guestAdvancedEditTab, guestCity, guestCountry, guestEmail, guestFirstName, guestPhone, guestRelationship, t]);
  const guestAdvancedCurrentChecklistDone = guestAdvancedCurrentChecklist.filter((item) => item.done).length;
  const guestAdvancedCurrentChecklistTotal = Math.max(1, guestAdvancedCurrentChecklist.length);
  const guestNextBirthday = useMemo(
    () => getNextBirthdaySummary(guestAdvanced.birthday, language),
    [guestAdvanced.birthday, language]
  );
  const guestLastSavedLabel = useMemo(() => {
    if (!guestLastSavedAt) {
      return t("guest_last_saved_never");
    }
    return formatDate(guestLastSavedAt, language, guestLastSavedAt);
  }, [guestLastSavedAt, language, t]);
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
  const eventBuilderInsights = useMemo(
    () =>
      buildHostingSuggestions({
        eventId: editingEventId || "",
        events,
        guests,
        invitations,
        guestPreferencesById,
        guestSensitiveById,
        language
      }),
    [editingEventId, events, guests, invitations, guestPreferencesById, guestSensitiveById, language]
  );
  const insightsPlaybookActions = useMemo(() => buildHostingPlaybookActions(eventInsights, t), [eventInsights, t]);
  const eventBuilderPlaybookActions = useMemo(
    () => buildHostingPlaybookActions(eventBuilderInsights, t),
    [eventBuilderInsights, t]
  );
  const eventBuilderSuggestedSettings = useMemo(
    () => getSuggestedEventSettingsFromInsights(eventBuilderInsights),
    [eventBuilderInsights]
  );
  const eventBuilderContext = useMemo(
    () =>
      buildEventPlannerContext(
        {
          title: eventTitle,
          description: eventDescription,
          event_type: toCatalogCode("experience_type", eventType) || eventType,
          start_at: toIsoDateTime(eventStartAt),
          location_name: eventLocationName,
          location_address: eventLocationAddress,
          allow_plus_one: eventAllowPlusOne,
          auto_reminders: eventAutoReminders,
          dress_code: eventDressCode,
          playlist_mode: eventPlaylistMode
        },
        language,
        t
      ),
    [
      eventTitle,
      eventDescription,
      eventType,
      eventStartAt,
      eventLocationName,
      eventLocationAddress,
      eventAllowPlusOne,
      eventAutoReminders,
      eventDressCode,
      eventPlaylistMode,
      language,
      t
    ]
  );
  const eventBuilderMealPlan = useMemo(
    () => buildEventMealPlan(eventBuilderInsights, eventBuilderContext, t, 0),
    [eventBuilderInsights, eventBuilderContext, t]
  );
  const eventBuilderShoppingChecklistText = useMemo(() => {
    if (!eventBuilderMealPlan.shoppingChecklist.length) {
      return "";
    }
    return [t("event_menu_shopping_title"), ...eventBuilderMealPlan.shoppingChecklist.map((item) => `- ${item}`)].join("\n");
  }, [eventBuilderMealPlan.shoppingChecklist, t]);
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
      const url = buildAppUrl(`/rsvp/${encodeURIComponent(invitationItem.public_token)}`);
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
  const selectedEventDetailPrimaryShare = useMemo(() => {
    for (const invitationItem of selectedEventDetailInvitations) {
      const payload = buildInvitationSharePayload(invitationItem);
      if (payload?.url) {
        return payload;
      }
    }
    return null;
  }, [selectedEventDetailInvitations, buildInvitationSharePayload]);
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
  const selectedEventHealthSignalGuestRows = useMemo(
    () =>
      selectedEventDetailGuests.filter((row) => {
        const status = String(row.invitation?.status || "pending").trim().toLowerCase();
        return status !== "no";
      }),
    [selectedEventDetailGuests]
  );
  const selectedEventHealthAlerts = useMemo(() => {
    return selectedEventHealthSignalGuestRows
      .map((row) => {
        const invitationStatus = String(row.invitation?.status || "pending").trim().toLowerCase();
        const sensitiveItem = guestSensitiveById[row.guest?.id || row.invitation.guest_id] || {};
        const allergies = toCatalogLabels("allergy", sensitiveItem.allergies || [], language);
        const intolerances = toCatalogLabels("intolerance", sensitiveItem.intolerances || [], language);
        const petAllergies = toPetAllergyLabels(sensitiveItem.pet_allergies || [], language);
        const medicalConditions = toCatalogLabels("medical_condition", sensitiveItem.medical_conditions || [], language);
        const dietaryMedicalRestrictions = toCatalogLabels(
          "dietary_medical_restriction",
          sensitiveItem.dietary_medical_restrictions || [],
          language
        );
        const avoid = uniqueValues([
          ...allergies,
          ...intolerances,
          ...petAllergies,
          ...medicalConditions,
          ...dietaryMedicalRestrictions
        ]).slice(0, 6);
        if (avoid.length === 0) {
          return null;
        }
        return {
          guestName: row.name,
          invitationStatus,
          avoid
        };
      })
      .filter(Boolean);
  }, [selectedEventHealthSignalGuestRows, guestSensitiveById, language]);
  const selectedEventHealthAlertsConfirmedCount = useMemo(
    () => selectedEventHealthAlerts.filter((item) => item?.invitationStatus === "yes").length,
    [selectedEventHealthAlerts]
  );
  const selectedEventHealthAlertsPendingCount = useMemo(
    () => selectedEventHealthAlerts.filter((item) => item?.invitationStatus !== "yes").length,
    [selectedEventHealthAlerts]
  );
  const selectedEventSettings = useMemo(
    () => normalizeEventSettings(selectedEventDetail || {}),
    [selectedEventDetail]
  );
  const selectedEventPlannerContext = useMemo(
    () =>
      buildEventPlannerContext(
        {
          ...(selectedEventDetail || {}),
          allow_plus_one: selectedEventSettings.allow_plus_one,
          auto_reminders: selectedEventSettings.auto_reminders,
          dress_code: selectedEventSettings.dress_code,
          playlist_mode: selectedEventSettings.playlist_mode
        },
        language,
        t
      ),
    [
      selectedEventDetail,
      selectedEventSettings.allow_plus_one,
      selectedEventSettings.auto_reminders,
      selectedEventSettings.dress_code,
      selectedEventSettings.playlist_mode,
      language,
      t
    ]
  );
  const selectedEventInsights = useMemo(
    () =>
      buildHostingSuggestions({
        eventId: selectedEventDetail?.id || "",
        events,
        guests,
        invitations,
        guestPreferencesById,
        guestSensitiveById,
        language
      }),
    [selectedEventDetail?.id, events, guests, invitations, guestPreferencesById, guestSensitiveById, language]
  );
  const selectedEventPlannerOverrides = useMemo(() => {
    if (!selectedEventDetail?.id) {
      return {};
    }
    return eventPlannerContextOverridesByEventId[selectedEventDetail.id] || {};
  }, [eventPlannerContextOverridesByEventId, selectedEventDetail?.id]);
  const selectedEventPlannerEffectiveSignals = useMemo(
    () => applyPlannerOverrides(selectedEventPlannerContext, selectedEventInsights, selectedEventPlannerOverrides),
    [selectedEventPlannerContext, selectedEventInsights, selectedEventPlannerOverrides]
  );
  const selectedEventPlannerContextEffective = selectedEventPlannerEffectiveSignals.context;
  const selectedEventInsightsEffective = selectedEventPlannerEffectiveSignals.insights;
  const selectedEventPlannerVariantSeed = useMemo(() => {
    if (!selectedEventDetail?.id) {
      return 0;
    }
    return Math.max(0, Number(eventPlannerRegenerationByEventId[selectedEventDetail.id] || 0));
  }, [eventPlannerRegenerationByEventId, selectedEventDetail?.id]);
  const selectedEventPlannerTabSeed = useMemo(() => {
    if (!selectedEventDetail?.id) {
      return {};
    }
    return eventPlannerRegenerationByEventIdByTab[selectedEventDetail.id] || {};
  }, [eventPlannerRegenerationByEventIdByTab, selectedEventDetail?.id]);
  const selectedEventMealPlanSeed = useMemo(
    () =>
      selectedEventPlannerVariantSeed +
      Math.max(
        Number(selectedEventPlannerTabSeed.menu || 0),
        Number(selectedEventPlannerTabSeed.shopping || 0)
      ),
    [selectedEventPlannerVariantSeed, selectedEventPlannerTabSeed]
  );
  const selectedEventHostPlanSeed = useMemo(
    () =>
      selectedEventPlannerVariantSeed +
      Number(selectedEventPlannerTabSeed.ambience || 0) +
      Number(selectedEventPlannerTabSeed.timings || 0) +
      Number(selectedEventPlannerTabSeed.communication || 0) +
      Number(selectedEventPlannerTabSeed.risks || 0),
    [selectedEventPlannerVariantSeed, selectedEventPlannerTabSeed]
  );
  const selectedEventMealPlan = useMemo(
    () => buildEventMealPlan(selectedEventInsightsEffective, selectedEventPlannerContextEffective, t, selectedEventMealPlanSeed),
    [selectedEventInsightsEffective, selectedEventPlannerContextEffective, selectedEventMealPlanSeed, t]
  );
  const selectedEventConfirmedGuestRows = useMemo(
    () => selectedEventDetailGuests.filter((row) => String(row.invitation?.status || "").toLowerCase() === "yes"),
    [selectedEventDetailGuests]
  );
  const selectedEventDietTypesCount = useMemo(() => {
    const uniqueDietCodes = new Set();
    for (const row of selectedEventConfirmedGuestRows) {
      const preference = guestPreferencesById[row.guest?.id || row.invitation?.guest_id] || {};
      const dietCode = String(preference?.diet_type || "").trim();
      if (dietCode) {
        uniqueDietCodes.add(dietCode);
      }
    }
    return uniqueDietCodes.size;
  }, [selectedEventConfirmedGuestRows, guestPreferencesById]);
  const selectedEventAllergiesCount = useMemo(() => {
    const collected = new Set();
    for (const row of selectedEventHealthSignalGuestRows) {
      const sensitiveItem = guestSensitiveById[row.guest?.id || row.invitation?.guest_id] || {};
      for (const item of toCatalogLabels("allergy", sensitiveItem.allergies || [], language)) {
        collected.add(item);
      }
    }
    return collected.size;
  }, [selectedEventHealthSignalGuestRows, guestSensitiveById, language]);
  const selectedEventIntolerancesCount = useMemo(() => {
    const collected = new Set();
    for (const row of selectedEventHealthSignalGuestRows) {
      const sensitiveItem = guestSensitiveById[row.guest?.id || row.invitation?.guest_id] || {};
      for (const item of toCatalogLabels("intolerance", sensitiveItem.intolerances || [], language)) {
        collected.add(item);
      }
    }
    return collected.size;
  }, [selectedEventHealthSignalGuestRows, guestSensitiveById, language]);
  const selectedEventDietTypeValues = useMemo(() => {
    const collected = new Set();
    for (const row of selectedEventConfirmedGuestRows) {
      const preference = guestPreferencesById[row.guest?.id || row.invitation?.guest_id] || {};
      const label = toCatalogLabel("diet_type", preference?.diet_type, language);
      if (label) {
        collected.add(label);
      }
    }
    return Array.from(collected);
  }, [selectedEventConfirmedGuestRows, guestPreferencesById, language]);
  const selectedEventSensitiveIntolerances = useMemo(() => {
    const collected = new Set();
    for (const row of selectedEventHealthSignalGuestRows) {
      const sensitiveItem = guestSensitiveById[row.guest?.id || row.invitation?.guest_id] || {};
      for (const item of toCatalogLabels("intolerance", sensitiveItem.intolerances || [], language)) {
        if (item) {
          collected.add(item);
        }
      }
    }
    return Array.from(collected);
  }, [selectedEventHealthSignalGuestRows, guestSensitiveById, language]);
  const selectedEventSensitiveMedicalConditions = useMemo(() => {
    const collected = new Set();
    for (const row of selectedEventHealthSignalGuestRows) {
      const sensitiveItem = guestSensitiveById[row.guest?.id || row.invitation?.guest_id] || {};
      for (const item of toCatalogLabels("medical_condition", sensitiveItem.medical_conditions || [], language)) {
        if (item) {
          collected.add(item);
        }
      }
    }
    return Array.from(collected);
  }, [selectedEventHealthSignalGuestRows, guestSensitiveById, language]);
  const selectedEventDietaryMedicalRestrictions = useMemo(() => {
    const collected = new Set();
    for (const row of selectedEventHealthSignalGuestRows) {
      const sensitiveItem = guestSensitiveById[row.guest?.id || row.invitation?.guest_id] || {};
      for (const item of toCatalogLabels(
        "dietary_medical_restriction",
        sensitiveItem.dietary_medical_restrictions || [],
        language
      )) {
        if (item) {
          collected.add(item);
        }
      }
    }
    return Array.from(collected);
  }, [selectedEventHealthSignalGuestRows, guestSensitiveById, language]);
  const selectedEventMedicalConditionsCount = selectedEventSensitiveMedicalConditions.length;
  const selectedEventDietaryMedicalRestrictionsCount = selectedEventDietaryMedicalRestrictions.length;
  const selectedEventRestrictionsCount = useMemo(() => {
    const collected = new Set();
    for (const row of selectedEventHealthSignalGuestRows) {
      const sensitiveItem = guestSensitiveById[row.guest?.id || row.invitation?.guest_id] || {};
      for (const item of toCatalogLabels("allergy", sensitiveItem.allergies || [], language)) {
        collected.add(item);
      }
      for (const item of toCatalogLabels("intolerance", sensitiveItem.intolerances || [], language)) {
        collected.add(item);
      }
      for (const item of toCatalogLabels("medical_condition", sensitiveItem.medical_conditions || [], language)) {
        collected.add(item);
      }
      for (const item of toCatalogLabels(
        "dietary_medical_restriction",
        sensitiveItem.dietary_medical_restrictions || [],
        language
      )) {
        collected.add(item);
      }
    }
    return collected.size;
  }, [selectedEventHealthSignalGuestRows, guestSensitiveById, language]);
  const selectedEventCriticalRestrictions = useMemo(
    () =>
      uniqueValues([
        ...(selectedEventMealPlan.restrictions || []),
        ...selectedEventSensitiveIntolerances,
        ...selectedEventSensitiveMedicalConditions,
        ...selectedEventDietaryMedicalRestrictions
      ]).slice(0, 8),
    [
      selectedEventMealPlan.restrictions,
      selectedEventSensitiveIntolerances,
      selectedEventSensitiveMedicalConditions,
      selectedEventDietaryMedicalRestrictions
    ]
  );
  const selectedEventHealthRestrictionHighlights = useMemo(
    () =>
      uniqueValues([
        ...selectedEventHealthAlerts.flatMap((item) => item.avoid || []),
        ...selectedEventCriticalRestrictions,
        ...toCatalogLabels("medical_condition", selectedEventSensitiveMedicalConditions, language),
        ...toCatalogLabels("dietary_medical_restriction", selectedEventDietaryMedicalRestrictions, language)
      ]).slice(0, 8),
    [
      selectedEventHealthAlerts,
      selectedEventCriticalRestrictions,
      selectedEventSensitiveMedicalConditions,
      selectedEventDietaryMedicalRestrictions,
      language
    ]
  );
  const selectedEventShoppingItems = useMemo(
    () => (selectedEventMealPlan.shoppingGroups || []).flatMap((groupItem) => groupItem.items || []),
    [selectedEventMealPlan.shoppingGroups]
  );
  const selectedEventShoppingTotalIngredients = selectedEventShoppingItems.length;
  const selectedEventEstimatedCostRange = useMemo(() => {
    const estimate = Number(selectedEventMealPlan.estimatedCost || 0);
    const min = Math.max(0, Math.round(estimate * 0.82));
    const max = Math.max(min, Math.round(estimate * 1.18));
    return { min, max };
  }, [selectedEventMealPlan.estimatedCost]);
  const selectedEventShoppingCheckedSet = useMemo(() => {
    if (!selectedEventDetail?.id) {
      return new Set();
    }
    return new Set(eventDetailShoppingCheckedByEventId[selectedEventDetail.id] || []);
  }, [eventDetailShoppingCheckedByEventId, selectedEventDetail?.id]);
  const selectedEventShoppingProgress = useMemo(() => {
    const total = Math.max(0, Number(selectedEventShoppingItems.length || 0));
    const checked = Math.max(0, Number(selectedEventShoppingCheckedSet.size || 0));
    if (total === 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round((checked / total) * 100)));
  }, [selectedEventShoppingItems.length, selectedEventShoppingCheckedSet.size]);
  const selectedEventShoppingCounts = useMemo(() => {
    const total = selectedEventShoppingItems.length;
    const done = selectedEventShoppingItems.filter((item) => selectedEventShoppingCheckedSet.has(item.id)).length;
    return {
      total,
      done,
      pending: Math.max(0, total - done)
    };
  }, [selectedEventShoppingItems, selectedEventShoppingCheckedSet]);
  const selectedEventShoppingGroupsFiltered = useMemo(() => {
    const safeFilter = EVENT_PLANNER_SHOPPING_FILTERS.includes(eventPlannerShoppingFilter)
      ? eventPlannerShoppingFilter
      : "all";
    return (selectedEventMealPlan.shoppingGroups || [])
      .map((groupItem) => {
        const items = (groupItem.items || []).filter((shoppingItem) => {
          if (safeFilter === "done") {
            return selectedEventShoppingCheckedSet.has(shoppingItem.id);
          }
          if (safeFilter === "pending") {
            return !selectedEventShoppingCheckedSet.has(shoppingItem.id);
          }
          return true;
        });
        return { ...groupItem, items };
      })
      .filter((groupItem) => groupItem.items.length > 0);
  }, [selectedEventMealPlan.shoppingGroups, selectedEventShoppingCheckedSet, eventPlannerShoppingFilter]);
  const selectedEventShoppingChecklistText = useMemo(() => {
    if (!selectedEventMealPlan.shoppingChecklist?.length) {
      return "";
    }
    return [t("event_planner_tab_shopping"), ...selectedEventMealPlan.shoppingChecklist.map((item) => `- ${item}`)].join("\n");
  }, [selectedEventMealPlan.shoppingChecklist, t]);
  const selectedEventPlannerPromptBundle = useMemo(
    () =>
      buildEventPlannerPromptBundle({
        eventDetail: selectedEventDetail,
        eventContext: selectedEventPlannerContextEffective,
        eventInsights: selectedEventInsightsEffective,
        statusCounts: selectedEventDetailStatusCounts,
        criticalRestrictions: selectedEventCriticalRestrictions,
        healthAlerts: selectedEventHealthAlerts,
        t
      }),
    [
      selectedEventDetail,
      selectedEventPlannerContextEffective,
      selectedEventInsightsEffective,
      selectedEventDetailStatusCounts,
      selectedEventCriticalRestrictions,
      selectedEventHealthAlerts,
      t
    ]
  );
  const selectedEventHostPlaybook = useMemo(
    () =>
      buildEventHostPlaybook({
        eventDetail: selectedEventDetail,
        eventContext: selectedEventPlannerContextEffective,
        eventInsights: selectedEventInsightsEffective,
        statusCounts: selectedEventDetailStatusCounts,
        criticalRestrictions: selectedEventCriticalRestrictions,
        healthAlerts: selectedEventHealthAlerts,
        variantSeed: selectedEventHostPlanSeed,
        language,
        t
      }),
    [
      selectedEventDetail,
      selectedEventPlannerContextEffective,
      selectedEventInsightsEffective,
      selectedEventDetailStatusCounts,
      selectedEventCriticalRestrictions,
      selectedEventHealthAlerts,
      selectedEventHostPlanSeed,
      language,
      t
    ]
  );
  const selectedEventHostMessagesText = useMemo(() => {
    if (!selectedEventHostPlaybook?.messages?.length) {
      return "";
    }
    return [
      t("event_planner_host_messages_title"),
      ...selectedEventHostPlaybook.messages.map((item) => `${item.title}\n${item.text}`)
    ].join("\n\n");
  }, [selectedEventHostPlaybook, t]);
  const selectedEventPlannerSnapshotState = useMemo(() => {
    if (!selectedEventDetail?.id) {
      return null;
    }
    return eventPlannerSnapshotsByEventId[selectedEventDetail.id] || null;
  }, [eventPlannerSnapshotsByEventId, selectedEventDetail?.id]);
  const selectedEventPlannerSnapshotHistory = useMemo(() => {
    if (!selectedEventDetail?.id) {
      return [];
    }
    return eventPlannerSnapshotHistoryByEventId[selectedEventDetail.id] || [];
  }, [eventPlannerSnapshotHistoryByEventId, selectedEventDetail?.id]);
  const selectedEventPlannerLastGeneratedByScope = useMemo(() => {
    const byScope = {};
    for (const row of selectedEventPlannerSnapshotHistory) {
      const scopeKey = String(row?.scope || row?.snapshotState?.modelMeta?.scope || "all")
        .trim()
        .toLowerCase();
      if (!scopeKey || byScope[scopeKey]) {
        continue;
      }
      byScope[scopeKey] = {
        version: Number(row?.version || row?.snapshotState?.version || 0) || 0,
        generatedAt: String(row?.generatedAt || row?.snapshotState?.generatedAt || "")
      };
    }
    if (!byScope.all && selectedEventPlannerSnapshotState?.generatedAt) {
      byScope.all = {
        version: Number(selectedEventPlannerSnapshotState.version || 0) || 0,
        generatedAt: String(selectedEventPlannerSnapshotState.generatedAt || "")
      };
    }
    return byScope;
  }, [selectedEventPlannerSnapshotHistory, selectedEventPlannerSnapshotState]);
  const selectedEventPlannerGenerationState = useMemo(() => {
    if (!selectedEventDetail?.id) {
      return null;
    }
    return eventPlannerGenerationByEventId[selectedEventDetail.id] || null;
  }, [eventPlannerGenerationByEventId, selectedEventDetail?.id]);
  const selectedEventPlannerSavedLabel = useMemo(() => {
    if (!selectedEventPlannerSnapshotState?.version) {
      return "";
    }
    return interpolateText(t("event_planner_saved_version"), {
      version: selectedEventPlannerSnapshotState.version,
      date: formatDate(selectedEventPlannerSnapshotState.generatedAt, language, t("no_date"))
    });
  }, [selectedEventPlannerSnapshotState, language, t]);
  const selectedEventPlannerSnapshotVersion = useMemo(
    () => Number(selectedEventPlannerSnapshotState?.version || 0),
    [selectedEventPlannerSnapshotState?.version]
  );
  const eventPlannerContextDraftSignals = useMemo(
    () => applyPlannerOverrides(selectedEventPlannerContext, selectedEventInsights, eventPlannerContextDraft),
    [selectedEventPlannerContext, selectedEventInsights, eventPlannerContextDraft]
  );
  const eventPlannerContextDraftPromptBundle = useMemo(
    () =>
      buildEventPlannerPromptBundle({
        eventDetail: selectedEventDetail,
        eventContext: eventPlannerContextDraftSignals.context,
        eventInsights: eventPlannerContextDraftSignals.insights,
        statusCounts: selectedEventDetailStatusCounts,
        criticalRestrictions: selectedEventCriticalRestrictions,
        healthAlerts: selectedEventHealthAlerts,
        t
      }),
    [
      selectedEventDetail,
      eventPlannerContextDraftSignals,
      selectedEventDetailStatusCounts,
      selectedEventCriticalRestrictions,
      selectedEventHealthAlerts,
      t
    ]
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
  const selectedGuestDetailStatusCounts = useMemo(() => {
    const totals = { pending: 0, yes: 0, no: 0, maybe: 0 };
    for (const invitationItem of selectedGuestDetailInvitations) {
      const status = String(invitationItem.status || "pending").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(totals, status)) {
        totals[status] += 1;
      } else {
        totals.pending += 1;
      }
    }
    return totals;
  }, [selectedGuestDetailInvitations]);
  const selectedGuestDetailRespondedRate = useMemo(() => {
    if (selectedGuestDetailInvitations.length === 0) {
      return 0;
    }
    const responded = selectedGuestDetailInvitations.filter((item) => String(item.status || "pending") !== "pending").length;
    return Math.round((responded / selectedGuestDetailInvitations.length) * 100);
  }, [selectedGuestDetailInvitations]);
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
          ...toCatalogLabels("medical_condition", sensitiveItem.medical_conditions || [], language),
          ...toCatalogLabels(
            "dietary_medical_restriction",
            sensitiveItem.dietary_medical_restrictions || [],
            language
          ),
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
  const selectedGuestDetailTags = useMemo(
    () => uniqueValues(selectedGuestDetailGroups.flatMap((group) => group.values || [])).slice(0, 8),
    [selectedGuestDetailGroups]
  );
  const selectedGuestDetailNotes = useMemo(() => {
    if (!selectedGuestDetail) {
      return [];
    }
    const preferenceItem = selectedGuestDetailPreference || {};
    const sensitiveItem = selectedGuestDetailSensitive || {};
    const notes = [];
    if (preferenceItem.last_talk_topic) {
      notes.push(`${t("field_last_talk_topic")}: ${preferenceItem.last_talk_topic}`);
    }
    const tabooTopics = toList(preferenceItem.taboo_topics || []);
    if (tabooTopics.length > 0) {
      notes.push(`${t("field_taboo_topics")}: ${tabooTopics.slice(0, 3).join(", ")}`);
    }
    const alerts = uniqueValues([
      ...toCatalogLabels("allergy", sensitiveItem.allergies || [], language),
      ...toCatalogLabels("intolerance", sensitiveItem.intolerances || [], language),
      ...toCatalogLabels("medical_condition", sensitiveItem.medical_conditions || [], language),
      ...toCatalogLabels("dietary_medical_restriction", sensitiveItem.dietary_medical_restrictions || [], language)
    ]);
    if (alerts.length > 0) {
      notes.push(`${t("event_detail_alerts_title")}: ${alerts.slice(0, 3).join(", ")}`);
    }
    return notes.slice(0, 4);
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
      ...toCatalogLabels("medical_condition", sensitiveItem.medical_conditions || [], language),
      ...toCatalogLabels(
        "dietary_medical_restriction",
        sensitiveItem.dietary_medical_restrictions || [],
        language
      ),
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
  const selectedGuestTabRecommendations = useMemo(() => {
    const tabooTopics = uniqueValues(toList(selectedGuestDetailPreference?.taboo_topics || [])).slice(0, 6);
    const lastTalkTopics = selectedGuestDetailPreference?.last_talk_topic
      ? [selectedGuestDetailPreference.last_talk_topic]
      : [];
    const highlightedTopics = uniqueValues([...selectedGuestHostingRecommendations.icebreakers, ...lastTalkTopics]).slice(0, 6);
    const healthAlerts = uniqueValues([
      ...toCatalogLabels("allergy", selectedGuestDetailSensitive?.allergies || [], language),
      ...toCatalogLabels("intolerance", selectedGuestDetailSensitive?.intolerances || [], language),
      ...toPetAllergyLabels(selectedGuestDetailSensitive?.pet_allergies || [], language),
      ...toCatalogLabels("medical_condition", selectedGuestDetailSensitive?.medical_conditions || [], language),
      ...toCatalogLabels(
        "dietary_medical_restriction",
        selectedGuestDetailSensitive?.dietary_medical_restrictions || [],
        language
      )
    ]).slice(0, 8);
    return {
      food: {
        title: t("guest_detail_recommendations_food_title"),
        hint: t("guest_detail_recommendations_food_hint"),
        cards: [
          { key: "menu", title: t("smart_hosting_food"), values: selectedGuestHostingRecommendations.menu },
          { key: "drinks", title: t("smart_hosting_drink"), values: selectedGuestHostingRecommendations.drinks },
          { key: "avoid", title: t("smart_hosting_avoid"), values: selectedGuestHostingRecommendations.avoid }
        ]
      },
      lifestyle: {
        title: t("guest_detail_recommendations_lifestyle_title"),
        hint: t("guest_detail_recommendations_lifestyle_hint"),
        cards: [
          // 🚀 FIX: Usamos el color favorito para decoración. 
          // (Si tu variable se llama distinto, cambia 'selectedGuestDetail.favorite_color' por la correcta)
          {
            key: "decor",
            title: t("smart_hosting_decor"),
            // Usamos tu función de catálogos pasándole "color" o "favorite_color"
            values: selectedGuestDetailPreference?.favorite_color
              ? [toCatalogLabel("color", selectedGuestDetailPreference.favorite_color, language)]
              : []
          },
          {
            key: "music",
            title: t("smart_hosting_music"),
            values: selectedGuestHostingRecommendations.ambience.slice(0, 5)
          },
          {
            key: "timing",
            title: t("smart_hosting_timing"),
            values: [t("smart_hosting_timing_on_time")]
          }
        ]
      },
      conversation: {
        title: t("guest_detail_recommendations_conversation_title"),
        hint: t("guest_detail_recommendations_conversation_hint"),
        cards: [
          { key: "icebreakers", title: t("smart_hosting_icebreakers"), values: highlightedTopics },
          { key: "taboo", title: t("smart_hosting_taboo"), values: tabooTopics },
          {
            key: "relationship",
            title: t("field_relationship"),
            values: selectedGuestDetail?.relationship
              ? [toCatalogLabel("relationship", selectedGuestDetail.relationship, language)]
              : []
          }
        ]
      },
      health: {
        title: t("guest_detail_recommendations_health_title"),
        hint: t("guest_detail_recommendations_health_hint"),
        cards: [
          { key: "alerts", title: t("event_detail_alerts_title"), values: healthAlerts },
          { key: "avoid", title: t("smart_hosting_avoid"), values: selectedGuestHostingRecommendations.avoid },
          { key: "menu", title: t("smart_hosting_food"), values: selectedGuestHostingRecommendations.menu.slice(0, 4) }
        ]
      }
    };
  }, [
    language,
    selectedGuestDetail,
    selectedGuestDetailPreference,
    selectedGuestDetailSensitive,
    selectedGuestHostingRecommendations,
    t
  ]);
  const selectedGuestActiveTabRecommendations =
    selectedGuestTabRecommendations[guestProfileViewTab] || null;
  const selectedGuestAllergyLabels = useMemo(
    () => toCatalogLabels("allergy", selectedGuestDetailSensitive?.allergies || [], language),
    [selectedGuestDetailSensitive, language]
  );
  const selectedGuestIntoleranceLabels = useMemo(
    () => toCatalogLabels("intolerance", selectedGuestDetailSensitive?.intolerances || [], language),
    [selectedGuestDetailSensitive, language]
  );
  const selectedGuestPetAllergyLabels = useMemo(
    () => toPetAllergyLabels(selectedGuestDetailSensitive?.pet_allergies || [], language),
    [selectedGuestDetailSensitive, language]
  );
  const selectedGuestMedicalConditionLabels = useMemo(
    () => toCatalogLabels("medical_condition", selectedGuestDetailSensitive?.medical_conditions || [], language),
    [selectedGuestDetailSensitive, language]
  );
  const selectedGuestDietaryMedicalRestrictionLabels = useMemo(
    () =>
      toCatalogLabels(
        "dietary_medical_restriction",
        selectedGuestDetailSensitive?.dietary_medical_restrictions || [],
        language
      ),
    [selectedGuestDetailSensitive, language]
  );
  const selectedGuestFoodGroups = useMemo(
    () =>
      selectedGuestDetailGroups.filter((group) =>
        [t("guest_detail_group_tastes"), t("guest_detail_group_food"), t("guest_detail_group_avoid")].includes(group.title)
      ),
    [selectedGuestDetailGroups, t]
  );
  const selectedGuestLifestyleGroups = useMemo(
    () =>
      selectedGuestDetailGroups.filter((group) => [t("guest_detail_group_ambience")].includes(group.title)),
    [selectedGuestDetailGroups, t]
  );

  const searchedEvents = useMemo(() => {
    const term = eventSearch.trim().toLowerCase();
    return events.filter((eventItem) => {
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
  }, [events, eventSearch, language]);
  const eventStatusCounts = useMemo(() => {
    const counts = {
      all: searchedEvents.length,
      published: 0,
      draft: 0,
      completed: 0,
      cancelled: 0
    };
    for (const eventItem of searchedEvents) {
      const statusKey = String(eventItem.status || "").trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(counts, statusKey)) {
        counts[statusKey] += 1;
      }
    }
    return counts;
  }, [searchedEvents]);

  const filteredEvents = useMemo(() => {
    const list = searchedEvents.filter((eventItem) => {
      if (eventStatusFilter !== "all" && eventItem.status !== eventStatusFilter) {
        return false;
      }
      return true;
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
  }, [searchedEvents, eventStatusFilter, eventSort, language]);

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

  const invitationEventOptions = useMemo(() => {
    const list = events.map((eventItem) => ({
      id: eventItem.id,
      title: eventItem.title || t("field_event"),
      date: eventItem.start_at ? new Date(eventItem.start_at).getTime() || 0 : 0
    }));
    list.sort((a, b) => b.date - a.date || a.title.localeCompare(b.title, language));
    return list;
  }, [events, language, t]);

  const filteredInvitations = useMemo(() => {
    const term = invitationSearch.trim().toLowerCase();
    const list = invitations.filter((invitation) => {
      if (invitationEventFilter !== "all" && invitation.event_id !== invitationEventFilter) {
        return false;
      }
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
  }, [
    invitations,
    invitationSearch,
    invitationEventFilter,
    invitationStatusFilter,
    invitationSort,
    eventNamesById,
    guestNamesById
  ]);

  const eventTotalPages = Math.max(1, Math.ceil(filteredEvents.length / eventPageSize));
  const guestTotalPages = Math.max(1, Math.ceil(filteredGuests.length / guestPageSize));
  const invitationTotalPages = Math.max(1, Math.ceil(filteredInvitations.length / invitationPageSize));

  const pagedEvents = useMemo(() => {
    const start = (eventPage - 1) * eventPageSize;
    return filteredEvents.slice(start, start + eventPageSize);
  }, [filteredEvents, eventPage, eventPageSize]);

  const pagedGuests = useMemo(() => {
    const start = (guestPage - 1) * guestPageSize;
    return filteredGuests.slice(start, start + guestPageSize);
  }, [filteredGuests, guestPage, guestPageSize]);

  const pagedInvitations = useMemo(() => {
    const start = (invitationPage - 1) * invitationPageSize;
    return filteredInvitations.slice(start, start + invitationPageSize);
  }, [filteredInvitations, invitationPage, invitationPageSize]);

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
  const isIntegrationDebugEnabled = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const params = new URLSearchParams(window.location.search || "");
    return params.get("debug") === "1" || params.get("diagnostics") === "1";
  }, []);

  const loadGlobalProfileData = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      return null;
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
        return null;
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
          return null;
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
    setPreviewGlobalShareHostId((prev) =>
      prev && nextShareTargets.some((item) => item.host_user_id === prev) ? prev : ""
    );
    return { profileId: nextGlobalProfileId, shareTargets: nextShareTargets, featureReady: nextFeatureReady };
  }, [mapShareTargetToDraft, session?.user?.id, t]);

  const loadIntegrationStatusData = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      return;
    }
    setIsLoadingIntegrationStatus(true);
    setIntegrationStatusMessage("");
    const result = await supabase.rpc("get_shared_profile_feature_status");
    setIsLoadingIntegrationStatus(false);

    if (result.error) {
      if (isMissingDbFeatureError(result.error, ["get_shared_profile_feature_status"])) {
        setIntegrationStatus(null);
        setIntegrationStatusMessage(t("integration_status_feature_pending"));
      } else {
        setIntegrationStatusMessage(`${t("integration_status_load_error")} ${result.error.message}`);
      }
      return;
    }

    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row) {
      setIntegrationStatus(null);
      setIntegrationStatusMessage(t("integration_status_empty"));
      return;
    }
    setIntegrationStatus(row);
  }, [session?.user?.id, t]);

  const loadGlobalShareHistoryData = useCallback(
    async (profileIdOverride) => {
      if (!supabase || !session?.user?.id) {
        return;
      }
      const targetProfileId = String(profileIdOverride || globalProfileId || "").trim();
      if (!targetProfileId) {
        setGlobalShareHistory([]);
        return;
      }
      setIsLoadingGlobalShareHistory(true);
      const result = await supabase
        .from("global_guest_profile_consent_events")
        .select("id, event_type, created_at, payload")
        .eq("global_profile_id", targetProfileId)
        .in("event_type", ["share_granted", "share_revoked"])
        .order("created_at", { ascending: false })
        .limit(12);
      setIsLoadingGlobalShareHistory(false);
      if (result.error) {
        if (isMissingDbFeatureError(result.error, ["global_guest_profile_consent_events"])) {
          setGlobalShareHistory([]);
          return;
        }
        setGlobalProfileMessage(`${t("global_profile_history_load_error")} ${result.error.message}`);
        return;
      }
      setGlobalShareHistory(Array.isArray(result.data) ? result.data : []);
    },
    [globalProfileId, session?.user?.id, t]
  );

  const refreshSharedProfileData = useCallback(async () => {
    const sharedData = await loadGlobalProfileData();
    const nextProfileId = String(sharedData?.profileId || "").trim();
    const tasks = [loadGlobalShareHistoryData(nextProfileId)];
    if (isIntegrationDebugEnabled) {
      tasks.push(loadIntegrationStatusData());
    } else {
      setIntegrationStatus(null);
      setIntegrationStatusMessage("");
      setIsIntegrationPanelOpen(false);
    }
    await Promise.all(tasks);
  }, [isIntegrationDebugEnabled, loadGlobalProfileData, loadIntegrationStatusData, loadGlobalShareHistoryData]);

  const loadDashboardData = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      return;
    }
    setDashboardError("");
    onPreferencesSynced?.();

    const routeEventDetailId =
      appRoute?.view === "events" && ["detail", "plan"].includes(String(appRoute?.workspace || "").trim())
        ? String(appRoute?.eventId || "").trim()
        : "";
    const routeGuestDetailId =
      appRoute?.view === "guests" && ["detail", "create"].includes(String(appRoute?.workspace || "").trim())
        ? String(appRoute?.guestId || "").trim()
        : "";

    const guestsPromise = supabase
      .from("guests")
      .select(
        "id, first_name, last_name, email, phone, relationship, city, country, address, postal_code, state_region, company, birthday, twitter, instagram, linkedin, last_meet_at, avatar_url, created_at"
      )
      .eq("host_user_id", session.user.id)
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
      .eq("host_user_id", session.user.id)
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
        .eq("host_user_id", session.user.id)
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
        "last_meet_at",
        "avatar_url"
      ])
    ) {
      const fallbackGuests = await supabase
        .from("guests")
        .select("id, first_name, last_name, email, phone, relationship, city, country, created_at")
        .eq("host_user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      guestsData = fallbackGuests.data || [];
      guestsError = fallbackGuests.error;
    }

    if (!eventsError && routeEventDetailId && !(eventsData || []).some((eventItem) => eventItem.id === routeEventDetailId)) {
      let routeEventResult = await supabase
        .from("events")
        .select(
          "id, title, status, event_type, description, allow_plus_one, auto_reminders, dress_code, playlist_mode, start_at, created_at, updated_at, location_name, location_address, location_place_id, location_lat, location_lng"
        )
        .eq("host_user_id", session.user.id)
        .eq("id", routeEventDetailId)
        .maybeSingle();

      if (
        routeEventResult.error &&
        isCompatibilityError(routeEventResult.error, [
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
        routeEventResult = await supabase
          .from("events")
          .select("id, title, status, event_type, start_at, created_at, updated_at, location_name, location_address")
          .eq("host_user_id", session.user.id)
          .eq("id", routeEventDetailId)
          .maybeSingle();
      }

      if (routeEventResult.error) {
        eventsError = routeEventResult.error;
      } else if (routeEventResult.data) {
        eventsData = [routeEventResult.data, ...(eventsData || [])];
      }
    }

    if (!guestsError && routeGuestDetailId && !(guestsData || []).some((guestItem) => guestItem.id === routeGuestDetailId)) {
      let routeGuestResult = await supabase
        .from("guests")
        .select(
          "id, first_name, last_name, email, phone, relationship, city, country, address, postal_code, state_region, company, birthday, twitter, instagram, linkedin, last_meet_at, avatar_url, created_at"
        )
        .eq("host_user_id", session.user.id)
        .eq("id", routeGuestDetailId)
        .maybeSingle();

      if (
        routeGuestResult.error &&
        isCompatibilityError(routeGuestResult.error, [
          "postal_code",
          "state_region",
          "address",
          "company",
          "twitter",
          "instagram",
          "linkedin",
          "last_meet_at",
          "avatar_url"
        ])
      ) {
        routeGuestResult = await supabase
          .from("guests")
          .select("id, first_name, last_name, email, phone, relationship, city, country, created_at")
          .eq("host_user_id", session.user.id)
          .eq("id", routeGuestDetailId)
          .maybeSingle();
      }

      if (routeGuestResult.error) {
        guestsError = routeGuestResult.error;
      } else if (routeGuestResult.data) {
        guestsData = [routeGuestResult.data, ...(guestsData || [])];
      }
    }

    let eventPlannerRows = [];
    let eventPlannerError = null;
    const eventIdsForPlans = uniqueValues((eventsData || []).map((eventItem) => eventItem.id));
    if (eventIdsForPlans.length > 0) {
      const plannerResult = await supabase
        .from("event_host_plans")
        .select("event_id, version, generated_at, source, model_meta, plan_context, plan_snapshot")
        .eq("host_user_id", session.user.id)
        .in("event_id", eventIdsForPlans)
        .order("generated_at", { ascending: false });

      if (plannerResult.error) {
        if (!isMissingRelationError(plannerResult.error, "event_host_plans")) {
          eventPlannerError = plannerResult.error;
        }
      } else {
        eventPlannerRows = Array.isArray(plannerResult.data) ? plannerResult.data : [];
      }
    }

    if (eventsError || guestsError || invitationsError || hostProfileError || eventPlannerError) {
      setDashboardError(
        eventsError?.message ||
        guestsError?.message ||
        invitationsError?.message ||
        hostProfileError?.message ||
        eventPlannerError?.message ||
        t("error_load_data")
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

      let sensitiveResult = await supabase
        .from("guest_sensitive_preferences")
        .select(
          "guest_id, allergies, intolerances, pet_allergies, medical_conditions, dietary_medical_restrictions, consent_granted, consent_version, consent_granted_at"
        )
        .in("guest_id", guestIds);

      if (
        sensitiveResult.error &&
        isCompatibilityError(sensitiveResult.error, ["medical_conditions", "dietary_medical_restrictions"])
      ) {
        sensitiveResult = await supabase
          .from("guest_sensitive_preferences")
          .select("guest_id, allergies, intolerances, pet_allergies, consent_granted, consent_version, consent_granted_at")
          .in("guest_id", guestIds);
      }

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
    const latestPlannerByEventId = {};
    const plannerHistoryByEventId = {};
    for (const row of eventPlannerRows) {
      const eventId = String(row?.event_id || "").trim();
      if (!eventId) {
        continue;
      }
      const snapshotState = getHostPlanStateFromSnapshot(row?.plan_snapshot);
      if (!snapshotState) {
        continue;
      }
      if (!latestPlannerByEventId[eventId]) {
        latestPlannerByEventId[eventId] = snapshotState;
      }
      const currentHistory = plannerHistoryByEventId[eventId] || [];
      const hasSameVersion = currentHistory.some((item) => Number(item.version) === Number(snapshotState.version));
      if (!hasSameVersion) {
        currentHistory.push({
          version: Number(snapshotState.version || 0),
          generatedAt: String(snapshotState.generatedAt || ""),
          scope: String(snapshotState?.modelMeta?.scope || "all"),
          snapshotState
        });
      }
      plannerHistoryByEventId[eventId] = currentHistory;
    }
    for (const eventId of Object.keys(plannerHistoryByEventId)) {
      plannerHistoryByEventId[eventId].sort((a, b) => {
        const versionDiff = Number(b.version || 0) - Number(a.version || 0);
        if (versionDiff !== 0) {
          return versionDiff;
        }
        return String(b.generatedAt || "").localeCompare(String(a.generatedAt || ""));
      });
    }
    setEventPlannerSnapshotsByEventId(latestPlannerByEventId);
    setEventPlannerSnapshotHistoryByEventId(plannerHistoryByEventId);
    const nextPlannerSeedByEventId = {};
    const nextPlannerSeedByEventIdByTab = {};
    const nextPlannerContextOverridesByEventId = {};
    for (const [eventId, snapshotState] of Object.entries(latestPlannerByEventId)) {
      nextPlannerSeedByEventId[eventId] = Math.max(0, Number(snapshotState.seedAll || 0));
      nextPlannerSeedByEventIdByTab[eventId] = snapshotState.seedByTab || {};
      nextPlannerContextOverridesByEventId[eventId] =
        snapshotState.contextOverrides && typeof snapshotState.contextOverrides === "object"
          ? snapshotState.contextOverrides
          : {};
    }
    setEventPlannerRegenerationByEventId(nextPlannerSeedByEventId);
    setEventPlannerRegenerationByEventIdByTab(nextPlannerSeedByEventIdByTab);
    setEventPlannerContextOverridesByEventId(nextPlannerContextOverridesByEventId);
    setGuestPreferencesById(
      Object.fromEntries((guestPreferencesRows || []).map((preferenceItem) => [preferenceItem.guest_id, preferenceItem]))
    );
    setGuestSensitiveById(
      Object.fromEntries(
        (guestSensitiveRows || []).map((sensitiveItem) => [sensitiveItem.guest_id, normalizeSensitiveRecord(sensitiveItem)])
      )
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
    await refreshSharedProfileData();
  }, [
    session?.user?.id,
    session?.user?.email,
    language,
    t,
    onPreferencesSynced,
    refreshSharedProfileData,
    appRoute,
    setEventPlannerRegenerationByEventId,
    setEventPlannerRegenerationByEventIdByTab,
    setEventPlannerContextOverridesByEventId,
    setEventPlannerSnapshotsByEventId,
    setEventPlannerSnapshotHistoryByEventId
  ]);

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
    if (events.length === 0) {
      return;
    }
    if (!selectedEventDetailId && events.length > 0) {
      setSelectedEventDetailId(events[0].id);
      return;
    }
    if (selectedEventDetailId && !events.find((eventItem) => eventItem.id === selectedEventDetailId)) {
      setSelectedEventDetailId(events[0]?.id || "");
    }
  }, [events, selectedEventDetailId, setSelectedEventDetailId]);
  useEffect(() => {
    const isEventRoute = appRoute?.view === "events" && ["detail", "plan"].includes(String(appRoute?.workspace || "").trim());
    const routeEventId = isEventRoute ? String(appRoute?.eventId || "").trim() : "";
    const routePlannerTab =
      appRoute?.workspace === "plan" &&
        EVENT_PLANNER_VIEW_TABS.includes(String(appRoute?.eventPlannerTab || "").trim().toLowerCase())
        ? String(appRoute?.eventPlannerTab || "").trim().toLowerCase()
        : "menu";
    if (selectedEventDetail?.id && routeEventId && selectedEventDetail.id === routeEventId && appRoute?.workspace === "plan") {
      setEventDetailPlannerTab(routePlannerTab);
      return;
    }
    setEventDetailPlannerTab("menu");
  }, [
    selectedEventDetail?.id,
    appRoute?.eventId,
    appRoute?.eventPlannerTab,
    appRoute?.view,
    appRoute?.workspace,
    setEventDetailPlannerTab
  ]);
  useEffect(() => {
    setEventPlannerShoppingFilter("all");
  }, [selectedEventDetail?.id, setEventPlannerShoppingFilter]);
  useEffect(() => {
    setIsEventPlannerContextOpen(false);
    setEventPlannerContextFocusField("");
    setShowEventPlannerTechnicalPrompt(false);
  }, [
    selectedEventDetail?.id,
    setEventPlannerContextFocusField,
    setIsEventPlannerContextOpen,
    setShowEventPlannerTechnicalPrompt
  ]);

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
    if (guests.length === 0) {
      return;
    }
    const shouldMaintainGuestSelection =
      (activeView === "guests" && guestsWorkspace === "detail") ||
      (activeView === "guests" && guestsWorkspace === "create" && Boolean(editingGuestId));
    if (!shouldMaintainGuestSelection) {
      return;
    }
    if (!selectedGuestDetailId && guests.length > 0) {
      setSelectedGuestDetailId(guests[0].id);
      return;
    }
    if (selectedGuestDetailId && !guests.find((guestItem) => guestItem.id === selectedGuestDetailId)) {
      setSelectedGuestDetailId(guests[0]?.id || "");
    }
  }, [activeView, guestsWorkspace, editingGuestId, guests, selectedGuestDetailId, setSelectedGuestDetailId]);

  useEffect(() => {
    if (activeView !== "profile") {
      return;
    }
    if (guestFirstName || guestLastName || guestPhotoUrl || guestEmail || guestPhone || guestCity || guestCountry || guestRelationship) {
      return;
    }
    syncHostGuestProfileForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);
  useEffect(() => {
    if (!guestMergeSource) {
      setGuestMergeTargetId("");
      return;
    }
    if (!guestMergeCandidates.find((guestItem) => guestItem.id === guestMergeTargetId)) {
      setGuestMergeTargetId(guestMergeCandidates[0]?.id || "");
    }
  }, [guestMergeCandidates, guestMergeSource, guestMergeTargetId]);

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
      medicalConditions: translateCatalogInputList("medical_condition", prev.medicalConditions, language),
      dietaryMedicalRestrictions: translateCatalogInputList(
        "dietary_medical_restriction",
        prev.dietaryMedicalRestrictions,
        language
      ),
      pets: translateCatalogInputList("pet", prev.pets, language),
      musicGenres: translateCatalogInputList("music_genre", prev.musicGenres, language),
      favoriteColor: toCatalogLabel("color", prev.favoriteColor, language),
      sports: translateCatalogInputList("sport", prev.sports, language),
      punctuality: toCatalogLabel("punctuality", prev.punctuality, language)
    }));
  }, [language]);

  useEffect(() => {
    setEventPage(1);
  }, [eventSearch, eventStatusFilter, eventSort, eventPageSize]);

  useEffect(() => {
    setGuestPage(1);
  }, [guestSearch, guestContactFilter, guestSort, guestPageSize]);

  useEffect(() => {
    setInvitationPage(1);
  }, [invitationSearch, invitationEventFilter, invitationStatusFilter, invitationSort, invitationPageSize]);

  useEffect(() => {
    const nextRoute = normalizeDashboardRouteState(appRoute);
    setActiveView((prev) => (prev === nextRoute.activeView ? prev : nextRoute.activeView));
    if (nextRoute.activeView === "events") {
      setEventsWorkspace((prev) => (prev === nextRoute.eventsWorkspace ? prev : nextRoute.eventsWorkspace));
      setEventDetailPlannerTab((prev) => (prev === nextRoute.eventPlannerTab ? prev : nextRoute.eventPlannerTab));
      if (nextRoute.selectedEventDetailId) {
        setSelectedEventDetailId((prev) => (prev === nextRoute.selectedEventDetailId ? prev : nextRoute.selectedEventDetailId));
      }
    }
    if (nextRoute.activeView === "guests") {
      setGuestsWorkspace((prev) => (prev === nextRoute.guestsWorkspace ? prev : nextRoute.guestsWorkspace));
      if (nextRoute.selectedGuestDetailId) {
        setSelectedGuestDetailId((prev) => (prev === nextRoute.selectedGuestDetailId ? prev : nextRoute.selectedGuestDetailId));
      }
      if (nextRoute.guestsWorkspace === "create") {
        const nextEditingGuestId = String(nextRoute.selectedGuestDetailId || "").trim();
        setEditingGuestId((prev) => (prev === nextEditingGuestId ? prev : nextEditingGuestId));
        if (!nextEditingGuestId) {
          setSelectedGuestDetailId((prev) => (prev ? "" : prev));
        }
      }
      setGuestProfileViewTab((prev) =>
        prev === (nextRoute.guestProfileViewTab || "general") ? prev : nextRoute.guestProfileViewTab || "general"
      );
      setGuestAdvancedEditTab((prev) =>
        prev === (nextRoute.guestAdvancedEditTab || "identity") ? prev : nextRoute.guestAdvancedEditTab || "identity"
      );
      if (nextRoute.guestsWorkspace === "create") {
        setOpenGuestAdvancedOnCreate(true);
      }
    }
    if (nextRoute.activeView === "invitations") {
      setInvitationsWorkspace((prev) =>
        prev === nextRoute.invitationsWorkspace ? prev : nextRoute.invitationsWorkspace
      );
    }
  }, [
    appRoute,
    setActiveView,
    setEventsWorkspace,
    setEventDetailPlannerTab,
    setSelectedEventDetailId,
    setGuestsWorkspace,
    setSelectedGuestDetailId,
    setGuestProfileViewTab,
    setGuestAdvancedEditTab,
    setOpenGuestAdvancedOnCreate,
    setInvitationsWorkspace
  ]);

  const dashboardPath = useMemo(
    () =>
      buildDashboardPathFromState({
        activeView,
        eventsWorkspace,
        guestsWorkspace,
        invitationsWorkspace,
        selectedEventDetailId,
        eventDetailPlannerTab,
        selectedGuestDetailId,
        guestProfileViewTab,
        guestAdvancedEditTab,
        editingGuestId,
        routeEventDetailId:
          appRoute?.view === "events" && ["detail", "plan"].includes(String(appRoute?.workspace || "").trim())
            ? String(appRoute?.eventId || "").trim()
            : "",
        routeEventPlannerTab:
          appRoute?.view === "events" && appRoute?.workspace === "plan"
            ? String(appRoute?.eventPlannerTab || "").trim().toLowerCase()
            : "",
        routeGuestDetailId:
          appRoute?.view === "guests" && ["detail", "create"].includes(String(appRoute?.workspace || "").trim())
            ? String(appRoute?.guestId || "").trim()
            : ""
      }),
    [
      activeView,
      eventsWorkspace,
      guestsWorkspace,
      invitationsWorkspace,
      selectedEventDetailId,
      eventDetailPlannerTab,
      selectedGuestDetailId,
      guestProfileViewTab,
      guestAdvancedEditTab,
      editingGuestId,
      appRoute
    ]
  );

  const getGuestAdvancedState = useCallback((guestItem) => {
    const preferenceItem = guestPreferencesById[guestItem?.id] || {};
    const sensitiveItem = guestSensitiveById[guestItem?.id] || {};
    const hasSensitiveValues =
      toList(sensitiveItem.allergies).length > 0 ||
      toList(sensitiveItem.intolerances).length > 0 ||
      toList(sensitiveItem.pet_allergies).length > 0 ||
      toList(sensitiveItem.medical_conditions).length > 0 ||
      toList(sensitiveItem.dietary_medical_restrictions).length > 0;

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
      medicalConditions: listToInput(
        toCatalogLabels("medical_condition", sensitiveItem.medical_conditions || [], language)
      ),
      dietaryMedicalRestrictions: listToInput(
        toCatalogLabels(
          "dietary_medical_restriction",
          sensitiveItem.dietary_medical_restrictions || [],
          language
        )
      ),
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
  }, [guestPreferencesById, guestSensitiveById, language]);

  useEffect(() => {
    if (typeof onNavigateApp !== "function") {
      return;
    }
    const currentPath = String(appPath || "").trim();
    const nextPath = String(dashboardPath || "").trim();
    if (nextPath === currentPath) {
      userNavigationIntentRef.current = false;
      return;
    }
    const isCurrentSpecificPath =
      isSpecificEventDetailPath(currentPath) ||
      isSpecificGuestDetailPath(currentPath) ||
      isSpecificGuestAdvancedEditPath(currentPath);
    if (!userNavigationIntentRef.current && (isCurrentSpecificPath || shouldPreserveSpecificPath(currentPath, nextPath))) {
      return;
    }
    onNavigateApp(nextPath);
    userNavigationIntentRef.current = false;
  }, [dashboardPath, onNavigateApp, appPath]);

  useEffect(() => {
    if (!openGuestAdvancedOnCreate || activeView !== "guests" || guestsWorkspace !== "create") {
      return;
    }
    if (guestAdvancedDetailsRef.current) {
      guestAdvancedDetailsRef.current.open = true;
      guestAdvancedDetailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      setOpenGuestAdvancedOnCreate(false);
      return;
    }
    const timer = window.setTimeout(() => {
      if (!guestAdvancedDetailsRef.current) {
        return;
      }
      guestAdvancedDetailsRef.current.open = true;
      guestAdvancedDetailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      setOpenGuestAdvancedOnCreate(false);
    }, 40);
    return () => window.clearTimeout(timer);
  }, [openGuestAdvancedOnCreate, activeView, guestsWorkspace, setOpenGuestAdvancedOnCreate]);

  useEffect(() => {
    if (activeView !== "guests" || guestsWorkspace !== "create") {
      return;
    }
    if (!selectedGuestDetailId || editingGuestId === selectedGuestDetailId || guests.length === 0) {
      return;
    }
    const guestItem = guests.find((item) => item.id === selectedGuestDetailId);
    if (!guestItem) {
      return;
    }
    setEditingGuestId(guestItem.id);
    setGuestFirstName(guestItem.first_name || "");
    setGuestLastName(guestItem.last_name || "");
    setGuestEmail(guestItem.email || "");
    setGuestPhone(guestItem.phone || "");
    setGuestRelationship(toCatalogLabel("relationship", guestItem.relationship, language));
    setGuestCity(guestItem.city || "");
    setGuestCountry(guestItem.country || "");
    setGuestPhotoUrl(getGuestPhotoValue(guestItem));
    setGuestAdvanced(getGuestAdvancedState(guestItem));
    setGuestLastSavedAt(guestItem.updated_at || guestItem.created_at || "");
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
    const nextTab = GUEST_ADVANCED_EDIT_TABS.includes(guestAdvancedEditTab) ? guestAdvancedEditTab : "identity";
    setGuestAdvancedEditTab(nextTab);
    setOpenGuestAdvancedOnCreate(true);
  }, [
    activeView,
    guestsWorkspace,
    selectedGuestDetailId,
    editingGuestId,
    guests,
    guestAdvancedEditTab,
    language,
    getGuestAdvancedState,
    setOpenGuestAdvancedOnCreate,
    setGuestAdvancedEditTab
  ]);

  useEffect(() => {
    if (!GUEST_PROFILE_VIEW_TABS.includes(guestProfileViewTab)) {
      setGuestProfileViewTab("general");
    }
  }, [guestProfileViewTab, setGuestProfileViewTab]);

  useEffect(() => {
    if (!GUEST_ADVANCED_EDIT_TABS.includes(guestAdvancedEditTab)) {
      setGuestAdvancedEditTab("identity");
    }
  }, [guestAdvancedEditTab, setGuestAdvancedEditTab]);

  useEffect(() => {
    if (activeView === "guests" && guestsWorkspace === "create" && !editingGuestId) {
      setGuestLastSavedAt("");
    }
  }, [activeView, guestsWorkspace, editingGuestId]);

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
    if (invitationEventFilter === "all") {
      return;
    }
    const exists = events.some((eventItem) => eventItem.id === invitationEventFilter);
    if (!exists) {
      setInvitationEventFilter("all");
    }
  }, [events, invitationEventFilter]);

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
      if (PAGE_SIZE_OPTIONS.includes(Number(parsed?.eventPageSize))) {
        setEventPageSize(Number(parsed.eventPageSize));
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
      if (typeof parsed?.invitationEventFilter === "string") {
        setInvitationEventFilter(parsed.invitationEventFilter);
      }
      if (typeof parsed?.invitationStatusFilter === "string") {
        setInvitationStatusFilter(parsed.invitationStatusFilter);
      }
      if (typeof parsed?.invitationSort === "string") {
        setInvitationSort(parsed.invitationSort);
      }
      if (PAGE_SIZE_OPTIONS.includes(Number(parsed?.invitationPageSize))) {
        setInvitationPageSize(Number(parsed.invitationPageSize));
      }
      const isRootAppPath = String(appPath || "/app").trim() === "/app";
      const validViews = [...VIEW_CONFIG.map((item) => item.key), "profile"];
      if (isRootAppPath) {
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
      }
      if (typeof parsed?.bulkInvitationSegment === "string" && INVITATION_BULK_SEGMENTS.includes(parsed.bulkInvitationSegment)) {
        setBulkInvitationSegment(parsed.bulkInvitationSegment);
      }
    } catch {
      // Ignore malformed local settings and continue with defaults.
    }
    setPrefsReady(true);
  }, [prefsStorageKey, appPath, setActiveView, setEventsWorkspace, setGuestsWorkspace, setInvitationsWorkspace]);

  // 1. INICIALIZACIÓN (Ya no necesitamos instanciar AutocompleteService)
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
        // 🚀 FIX: Eliminamos autocompleteServiceRef.current. Geocoder se queda.
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

  // 2. BUSCADOR DE DIRECCIONES PARA EVENTOS
  useEffect(() => {
    if (mapsStatus !== "ready") {
      return;
    }
    const query = eventLocationAddress.trim();
    if (query.length < 4) {
      setAddressPredictions([]);
      return;
    }

    let isActive = true;
    const timer = window.setTimeout(async () => {
      setIsAddressLoading(true);
      try {
        // 🚀 LÍNEA DE SEGURIDAD: Si Google aún no ha cargado esta nueva API, salimos sin romper la app
        if (!window.google?.maps?.places?.AutocompleteSuggestion) {
          console.warn("La nueva API de Places aún no está lista.");
          return;
        }
        // 🚀 FIX: Usamos la nueva API estática basada en Promesas
        const response = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query
        });

        if (!isActive) return;

        // 🚀 Adaptamos la respuesta al formato antiguo para NO romper tu UI
        const mappedPredictions = (response.suggestions || [])
          .filter((s) => s.placePrediction)
          .map((s) => ({
            description: s.placePrediction.text.text,
            place_id: s.placePrediction.placeId
          }));

        setAddressPredictions(mappedPredictions);
      } catch (error) {
        console.warn("Error fetching autocomplete suggestions:", error);
        if (isActive) setAddressPredictions([]);
      } finally {
        if (isActive) setIsAddressLoading(false);
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [eventLocationAddress, mapsStatus]);

  // 3. BUSCADOR DE DIRECCIONES PARA INVITADOS
  useEffect(() => {
    if (mapsStatus !== "ready") {
      return;
    }
    const query = guestAdvanced.address.trim();
    if (query.length < 4) {
      setGuestAddressPredictions([]);
      return;
    }

    let isActive = true;
    const timer = window.setTimeout(async () => {
      setIsGuestAddressLoading(true);
      try {
        // 🚀 LÍNEA DE SEGURIDAD: Si Google aún no ha cargado esta nueva API, salimos sin romper la app
        if (!window.google?.maps?.places?.AutocompleteSuggestion) {
          console.warn("La nueva API de Places aún no está lista.");
          return;
        }
        // 🚀 FIX: Usamos la nueva API estática basada en Promesas
        const response = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query
        });

        if (!isActive) return;

        // 🚀 Adaptamos la respuesta al formato antiguo para NO romper tu UI
        const mappedPredictions = (response.suggestions || [])
          .filter((s) => s.placePrediction)
          .map((s) => ({
            description: s.placePrediction.text.text,
            place_id: s.placePrediction.placeId
          }));

        setGuestAddressPredictions(mappedPredictions);
      } catch (error) {
        console.warn("Error fetching autocomplete suggestions:", error);
        if (isActive) setGuestAddressPredictions([]);
      } finally {
        if (isActive) setIsGuestAddressLoading(false);
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
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
  };

  const toggleMobileMenu = () => {
    setIsMenuOpen((prev) => {
      const next = !prev;
      return next;
    });
  };

  const markUserNavigationIntent = () => {
    userNavigationIntentRef.current = true;
  };

  const openWorkspace = (viewKey, workspaceKey) => {
    markUserNavigationIntent();
    if (viewKey === "events" && workspaceKey === "create") {
      handleCancelEditEvent();
    }
    if (viewKey === "guests" && workspaceKey === "create") {
      handleCancelEditGuest();
    }
    setActiveView(viewKey);
    setWorkspaceByView(viewKey, workspaceKey);
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const openInvitationBulkWorkspace = () => {
    markUserNavigationIntent();
    openWorkspace("invitations", "create");
    window.setTimeout(() => {
      const bulkPanel = document.getElementById("invitation-bulk-panel");
      if (bulkPanel) {
        bulkPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
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
      setGuestPhotoUrl(getGuestPhotoValue(linkedGuest));
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
      setGuestPhotoUrl("");
      setGuestAdvanced(GUEST_ADVANCED_INITIAL_STATE);
      setSelectedGuestAddressPlace(null);
    }
    setGuestAddressPredictions([]);
    setGuestErrors({});
    setGuestMessage("");
  };

  const openHostProfile = () => {
    markUserNavigationIntent();
    syncHostGuestProfileForm();
    setActiveView("profile");
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const openEventDetail = (eventId) => {
    markUserNavigationIntent();
    const fallbackEventId = eventId || events[0]?.id || "";
    if (!fallbackEventId) {
      return;
    }
    setEventsMapFocusId(fallbackEventId);
    setSelectedEventDetailId(fallbackEventId);
    setEventDetailPlannerTab("menu");
    setActiveView("events");
    setEventsWorkspace("detail");
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const openEventPlanById = (eventId, targetTab = "ambience") => {
    markUserNavigationIntent();
    const fallbackEventId = eventId || events[0]?.id || "";
    if (!fallbackEventId) {
      return;
    }
    const normalizedTab = EVENT_PLANNER_VIEW_TABS.includes(String(targetTab || "").trim().toLowerCase())
      ? String(targetTab || "").trim().toLowerCase()
      : "menu";
    setEventsMapFocusId(fallbackEventId);
    setSelectedEventDetailId(fallbackEventId);
    setEventDetailPlannerTab(normalizedTab);
    setActiveView("events");
    setEventsWorkspace("plan");
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const openGuestDetail = (guestId) => {
    markUserNavigationIntent();
    const fallbackGuestId = guestId || guests[0]?.id || "";
    if (!fallbackGuestId) {
      return;
    }
    setGuestsMapFocusId(fallbackGuestId);
    setSelectedGuestDetailId(fallbackGuestId);
    setGuestProfileViewTab("general");
    setActiveView("guests");
    setGuestsWorkspace("detail");
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const openInvitationCreate = ({ eventId = "", guestId = "", messageKey = "" } = {}) => {
    markUserNavigationIntent();
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
    setBulkInvitationGuestIds([]);
    setBulkInvitationSearch("");
    if (messageKey) {
      setInvitationMessage(t(messageKey));
    }
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const changeView = (nextView) => {
    markUserNavigationIntent();
    setActiveView(nextView);
    if (nextView === "events" || nextView === "guests" || nextView === "invitations") {
      setWorkspaceByView(nextView, "latest");
    }
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };


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
    setEventAllowPlusOne(Boolean(templateItem.allowPlusOne));
    setEventDressCode(templateItem.dressCode || "none");
    setEventPlaylistMode(templateItem.playlistMode || "host_only");
  };

  const handleApplySuggestedEventSettings = () => {
    let changedCount = 0;
    if (eventBuilderSuggestedSettings.allowPlusOne && !eventAllowPlusOne) {
      setEventAllowPlusOne(true);
      changedCount += 1;
    }
    if (eventBuilderSuggestedSettings.autoReminders && !eventAutoReminders) {
      setEventAutoReminders(true);
      changedCount += 1;
    }
    if (eventDressCode === "none" && eventBuilderSuggestedSettings.dressCode !== "none") {
      setEventDressCode(eventBuilderSuggestedSettings.dressCode);
      changedCount += 1;
    }
    if (eventPlaylistMode === "host_only" && eventBuilderSuggestedSettings.playlistMode !== "host_only") {
      setEventPlaylistMode(eventBuilderSuggestedSettings.playlistMode);
      changedCount += 1;
    }
    if (changedCount === 0) {
      setEventMessage(t("smart_hosting_settings_no_change"));
      return;
    }
    setEventMessage(interpolateText(t("smart_hosting_settings_applied"), { count: changedCount }));
  };

  const handleCopyEventBuilderShoppingChecklist = async () => {
    if (!eventBuilderShoppingChecklistText) {
      setEventMessage(t("event_menu_shopping_empty"));
      return;
    }
    try {
      await navigator.clipboard.writeText(eventBuilderShoppingChecklistText);
      setEventMessage(t("event_menu_shopping_copied"));
    } catch {
      setEventMessage(t("copy_fail"));
    }
  };
  const handleToggleEventPlannerShoppingItem = (itemId) => {
    if (!selectedEventDetail?.id || !itemId) {
      return;
    }
    setEventDetailShoppingCheckedByEventId((prev) => {
      const eventId = selectedEventDetail.id;
      const current = new Set(prev[eventId] || []);
      if (current.has(itemId)) {
        current.delete(itemId);
      } else {
        current.add(itemId);
      }
      return {
        ...prev,
        [eventId]: Array.from(current)
      };
    });
  };
  const handleMarkAllEventPlannerShoppingItems = () => {
    if (!selectedEventDetail?.id) {
      return;
    }
    setEventDetailShoppingCheckedByEventId((prev) => ({
      ...prev,
      [selectedEventDetail.id]: selectedEventShoppingItems.map((item) => item.id)
    }));
  };
  const handleClearEventPlannerShoppingCheckedItems = () => {
    if (!selectedEventDetail?.id) {
      return;
    }
    setEventDetailShoppingCheckedByEventId((prev) => ({
      ...prev,
      [selectedEventDetail.id]: []
    }));
  };
  const getPlannerTabLabel = useCallback(
    (tabKey) => t(`event_planner_tab_${tabKey}`),
    [t]
  );
  const persistEventPlannerSnapshot = useCallback(
    async ({ eventId, scope = "all", nextSeedAll = 0, nextSeedByTab = {}, nextContextOverrides = {} }) => {
      if (!supabase || !session?.user?.id || !selectedEventDetail?.id || selectedEventDetail.id !== eventId) {
        return;
      }

      const effectiveSignals = applyPlannerOverrides(
        selectedEventPlannerContext,
        selectedEventInsights,
        nextContextOverrides
      );
      const effectiveContext = effectiveSignals.context || {};
      const effectiveInsights = effectiveSignals.insights || {};

      const nextMenuSeed =
        Math.max(0, Number(nextSeedAll || 0)) +
        Math.max(Number(nextSeedByTab.menu || 0), Number(nextSeedByTab.shopping || 0));
      const nextHostSeed =
        Math.max(0, Number(nextSeedAll || 0)) +
        Number(nextSeedByTab.ambience || 0) +
        Number(nextSeedByTab.timings || 0) +
        Number(nextSeedByTab.communication || 0) +
        Number(nextSeedByTab.risks || 0);

      const nextMealPlan = buildEventMealPlan(effectiveInsights, effectiveContext, t, nextMenuSeed);
      const nextCriticalRestrictions = uniqueValues(nextMealPlan.restrictions || []).slice(0, 8);
      const nextHostPlaybook = buildEventHostPlaybook({
        eventDetail: selectedEventDetail,
        eventContext: effectiveContext,
        eventInsights: effectiveInsights,
        statusCounts: selectedEventDetailStatusCounts,
        criticalRestrictions: nextCriticalRestrictions,
        healthAlerts: selectedEventHealthAlerts,
        variantSeed: nextHostSeed,
        language,
        t
      });
      const sections = buildHostPlanSections({
        mealPlan: nextMealPlan,
        hostPlaybook: nextHostPlaybook
      });

      const snapshotContext = {
        eventId,
        preset: effectiveContext.preset || "social",
        momentKey: effectiveContext.momentKey || "evening",
        toneKey: effectiveContext.toneKey || "casual",
        budgetKey: effectiveContext.budgetKey || "medium",
        durationHours: Number(effectiveContext.durationHours || 4),
        allowPlusOne: Boolean(effectiveContext.allowPlusOne),
        autoReminders: Boolean(effectiveContext.autoReminders),
        dressCode: normalizeEventDressCode(effectiveContext.dressCode),
        playlistMode: normalizeEventPlaylistMode(effectiveContext.playlistMode),
        hostPreferences: {
          cuisine: uniqueValues(effectiveInsights.foodSuggestions || [])[0] || "",
          avoid: uniqueValues(effectiveInsights.avoidItems || []).slice(0, 8),
          priorities: [effectiveInsights.timingRecommendation || "start_on_time"]
        },
        guestSignals: {
          confirmed: Number(selectedEventDetailStatusCounts.yes || 0),
          allergies: uniqueValues(nextCriticalRestrictions.filter((item) => item)).slice(0, 8),
          intolerances: uniqueValues(toCatalogLabels("intolerance", selectedEventSensitiveIntolerances, language)).slice(0, 8),
          medicalConditions: uniqueValues(
            toCatalogLabels("medical_condition", selectedEventSensitiveMedicalConditions, language)
          ).slice(0, 8),
          dietaryMedicalRestrictions: uniqueValues(
            toCatalogLabels("dietary_medical_restriction", selectedEventDietaryMedicalRestrictions, language)
          ).slice(0, 8),
          diets: uniqueValues(toCatalogLabels("diet_type", selectedEventDietTypeValues, language)).slice(0, 8)
        },
        extraInstructions: String(effectiveInsights.additionalInstructions || "").trim()
      };

      const latestVersion = Number(eventPlannerSnapshotsByEventId[eventId]?.version || 0);
      const snapshot = createHostPlanSnapshot({
        eventId,
        version: latestVersion + 1,
        generatedAt: new Date().toISOString(),
        context: snapshotContext,
        contextOverrides: nextContextOverrides,
        seedAll: nextSeedAll,
        seedByTab: nextSeedByTab,
        sections,
        alerts: {
          critical: nextCriticalRestrictions,
          warning: (selectedEventHealthAlerts || []).map((item) =>
            `${item.guestName || t("field_guest")}: ${(item.avoid || []).join(", ")}`
          )
        },
        source: "local_heuristic",
        modelMeta: {
          scope: String(scope || "all"),
          engine: "local-host-plan-v2"
        }
      });

      const persistResult = await supabase.rpc("upsert_event_host_plan", {
        p_event_id: eventId,
        p_plan_json: snapshot,
        p_context_json: snapshot.context,
        p_scope: String(scope || "all"),
        p_model_meta: snapshot.model_meta
      });

      if (persistResult.error) {
        if (!isMissingDbFeatureError(persistResult.error, ["event_host_plans", "upsert_event_host_plan"])) {
          setInvitationMessage(`${t("error_save_data")} ${persistResult.error.message}`);
        }
        return;
      }

      const persistedRow = Array.isArray(persistResult.data) ? persistResult.data[0] : persistResult.data;
      const persistedState = getHostPlanStateFromSnapshot({
        ...snapshot,
        version: Number(persistedRow?.version || snapshot.version),
        generated_at: String(persistedRow?.generated_at || snapshot.generated_at)
      });
      if (!persistedState) {
        return;
      }
      setEventPlannerSnapshotsByEventId((prev) => ({
        ...prev,
        [eventId]: persistedState
      }));
      setEventPlannerSnapshotHistoryByEventId((prev) => {
        const currentHistory = Array.isArray(prev[eventId]) ? prev[eventId] : [];
        const nextEntry = {
          version: Number(persistedState.version || 0),
          generatedAt: String(persistedState.generatedAt || ""),
          scope: String(persistedState?.modelMeta?.scope || scope || "all"),
          snapshotState: persistedState
        };
        const deduped = currentHistory.filter((item) => Number(item.version) !== Number(nextEntry.version));
        const sorted = [nextEntry, ...deduped].sort((a, b) => {
          const versionDiff = Number(b.version || 0) - Number(a.version || 0);
          if (versionDiff !== 0) {
            return versionDiff;
          }
          return String(b.generatedAt || "").localeCompare(String(a.generatedAt || ""));
        });
        return {
          ...prev,
          [eventId]: sorted
        };
      });
    },
    [
      language,
      selectedEventDetail,
      selectedEventDetailStatusCounts,
      selectedEventDietTypeValues,
      selectedEventHealthAlerts,
      selectedEventPlannerContext,
      selectedEventSensitiveIntolerances,
      selectedEventSensitiveMedicalConditions,
      selectedEventDietaryMedicalRestrictions,
      selectedEventInsights,
      session?.user?.id,
      t,
      eventPlannerSnapshotsByEventId,
      setEventPlannerSnapshotsByEventId,
      setEventPlannerSnapshotHistoryByEventId
    ]
  );
  const handleRegenerateEventPlanner = async (scope = "all", options = {}) => {
    if (!selectedEventDetail?.id) {
      return;
    }
    const eventId = selectedEventDetail.id;
    const currentGenerationState = eventPlannerGenerationByEventId[eventId];
    if (currentGenerationState?.isGenerating) {
      return;
    }
    const normalizedScope = String(scope || "all").trim().toLowerCase();
    const safeScope = normalizedScope === "all" ? "all" : normalizeHostPlanTab(normalizedScope);
    const isAll = safeScope === "all";
    const nextContextOverrides =
      options && typeof options.contextOverrides === "object"
        ? options.contextOverrides
        : eventPlannerContextOverridesByEventId[eventId] || {};

    setEventPlannerGenerationByEventId((prev) => ({
      ...prev,
      [eventId]: {
        isGenerating: true,
        scope: safeScope
      }
    }));
    try {
      if (isAll) {
        const nextRound = Math.max(1, selectedEventPlannerVariantSeed + 1);
        const nextByTab = eventPlannerRegenerationByEventIdByTab[eventId] || {};
        setEventPlannerRegenerationByEventId((prev) => ({
          ...prev,
          [eventId]: nextRound
        }));
        setEventDetailShoppingCheckedByEventId((prev) => ({
          ...prev,
          [eventId]: []
        }));
        setEventPlannerShoppingFilter("all");
        setInvitationMessage(
          `${interpolateText(t("event_planner_regenerated_message"), { count: nextRound })} ${interpolateText(
            t("event_planner_context_applied"),
            { value: selectedEventPlannerContextEffective.summary || selectedEventPlannerContext.summary }
          )}`
        );
        await persistEventPlannerSnapshot({
          eventId,
          scope: "all",
          nextSeedAll: nextRound,
          nextSeedByTab: nextByTab,
          nextContextOverrides
        });
        return;
      }

      const safeTab = EVENT_PLANNER_VIEW_TABS.includes(safeScope) ? safeScope : "menu";
      const currentByTab = eventPlannerRegenerationByEventIdByTab[eventId] || {};
      const nextTabRound = Math.max(1, Number(currentByTab[safeTab] || 0) + 1);
      setEventPlannerRegenerationByEventIdByTab((prev) => ({
        ...prev,
        [eventId]: {
          ...(prev[eventId] || {}),
          [safeTab]: nextTabRound
        }
      }));
      if (safeTab === "menu" || safeTab === "shopping") {
        setEventDetailShoppingCheckedByEventId((prev) => ({
          ...prev,
          [eventId]: []
        }));
        setEventPlannerShoppingFilter("all");
      }
      setInvitationMessage(
        interpolateText(t("event_planner_regenerated_tab_message"), {
          tab: getPlannerTabLabel(safeTab),
          count: nextTabRound
        })
      );
      await persistEventPlannerSnapshot({
        eventId,
        scope: safeTab,
        nextSeedAll: selectedEventPlannerVariantSeed,
        nextSeedByTab: {
          ...currentByTab,
          [safeTab]: nextTabRound
        },
        nextContextOverrides
      });
    } finally {
      setEventPlannerGenerationByEventId((prev) => ({
        ...prev,
        [eventId]: {
          isGenerating: false,
          scope: safeScope
        }
      }));
    }
  };
  const handleRestoreEventPlannerSnapshot = useCallback(
    (snapshotVersion) => {
      if (!selectedEventDetail?.id) {
        return;
      }
      const parsedVersion = Number(snapshotVersion || 0);
      if (!Number.isFinite(parsedVersion) || parsedVersion <= 0) {
        return;
      }
      const eventId = selectedEventDetail.id;
      const historyRows = eventPlannerSnapshotHistoryByEventId[eventId] || [];
      const targetRow = historyRows.find((item) => Number(item.version) === parsedVersion);
      const targetSnapshotState = targetRow?.snapshotState;
      if (!targetSnapshotState) {
        return;
      }

      setEventPlannerSnapshotsByEventId((prev) => ({
        ...prev,
        [eventId]: targetSnapshotState
      }));
      setEventPlannerRegenerationByEventId((prev) => ({
        ...prev,
        [eventId]: Math.max(0, Number(targetSnapshotState.seedAll || 0))
      }));
      setEventPlannerRegenerationByEventIdByTab((prev) => ({
        ...prev,
        [eventId]: targetSnapshotState.seedByTab || {}
      }));
      setEventPlannerContextOverridesByEventId((prev) => ({
        ...prev,
        [eventId]:
          targetSnapshotState.contextOverrides && typeof targetSnapshotState.contextOverrides === "object"
            ? targetSnapshotState.contextOverrides
            : {}
      }));
      setEventDetailShoppingCheckedByEventId((prev) => ({
        ...prev,
        [eventId]: []
      }));
      setEventPlannerShoppingFilter("all");
      setInvitationMessage(
        interpolateText(t("event_planner_version_restored"), {
          version: Number(targetSnapshotState.version || parsedVersion)
        })
      );
    },
    [
      eventPlannerSnapshotHistoryByEventId,
      selectedEventDetail?.id,
      t,
      setEventPlannerSnapshotsByEventId,
      setEventPlannerRegenerationByEventId,
      setEventPlannerRegenerationByEventIdByTab,
      setEventPlannerContextOverridesByEventId,
      setEventDetailShoppingCheckedByEventId,
      setEventPlannerShoppingFilter
    ]
  );
  const handleOpenEventPlannerContext = (focusField = "") => {
    if (!selectedEventDetail?.id) {
      return;
    }
    const eventId = selectedEventDetail.id;
    const existingOverride = eventPlannerContextOverridesByEventId[eventId] || {};
    const baseSignals = applyPlannerOverrides(selectedEventPlannerContext, selectedEventInsights, existingOverride);
    setEventPlannerContextDraft({
      preset: baseSignals.context.preset || "social",
      momentKey: baseSignals.context.momentKey || "evening",
      toneKey: baseSignals.context.toneKey || "casual",
      budgetKey: baseSignals.context.budgetKey || "medium",
      durationHours: String(baseSignals.context.durationHours || 4),
      allowPlusOne: Boolean(baseSignals.context.allowPlusOne),
      autoReminders: Boolean(baseSignals.context.autoReminders),
      dressCode: normalizeEventDressCode(baseSignals.context.dressCode),
      playlistMode: normalizeEventPlaylistMode(baseSignals.context.playlistMode),
      foodSuggestions: uniqueValues(baseSignals.insights.foodSuggestions || []).join(", "),
      drinkSuggestions: uniqueValues(baseSignals.insights.drinkSuggestions || []).join(", "),
      avoidItems: uniqueValues(baseSignals.insights.avoidItems || []).join(", "),
      medicalConditions: uniqueValues(baseSignals.insights.medicalConditions || []).join(", "),
      dietaryMedicalRestrictions: uniqueValues(baseSignals.insights.dietaryMedicalRestrictions || []).join(", "),
      musicGenres: uniqueValues(baseSignals.insights.musicGenres || []).join(", "),
      decorColors: uniqueValues(baseSignals.insights.decorColors || []).join(", "),
      icebreakers: uniqueValues(baseSignals.insights.icebreakers || []).join(", "),
      tabooTopics: uniqueValues(baseSignals.insights.tabooTopics || []).join(", "),
      additionalInstructions: String(baseSignals.insights.additionalInstructions || "")
    });
    const normalizedFocusField = typeof focusField === "string" ? focusField.trim() : "";
    setEventPlannerContextFocusField(normalizedFocusField);
    setShowEventPlannerTechnicalPrompt(false);
    setIsEventPlannerContextOpen(true);
  };
  const handleGenerateFullEventPlanFromContext = async () => {
    if (!selectedEventDetail?.id) {
      return;
    }
    const eventId = selectedEventDetail.id;
    const nextContextOverrides = {
      ...eventPlannerContextDraft
    };
    setEventPlannerContextOverridesByEventId((prev) => ({
      ...prev,
      [eventId]: nextContextOverrides
    }));
    setIsEventPlannerContextOpen(false);
    setEventPlannerContextFocusField("");
    await handleRegenerateEventPlanner("all", { contextOverrides: nextContextOverrides });
  };
  const handleExportEventPlannerShoppingList = () => {
    const exportLines = [
      t("event_planner_title"),
      `${selectedEventDetail?.title || t("field_event")}`,
      ""
    ];
    for (const groupItem of selectedEventMealPlan.shoppingGroups || []) {
      exportLines.push(groupItem.title);
      for (const shoppingItem of groupItem.items || []) {
        exportLines.push(`- ${shoppingItem.name} (${shoppingItem.quantity})`);
      }
      exportLines.push("");
    }
    const payload = exportLines.join("\n").trim();
    if (!payload) {
      setInvitationMessage(t("event_menu_shopping_empty"));
      return;
    }
    const filenameBase = String(selectedEventDetail?.title || "event")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenameBase || "event"}-shopping-list.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setInvitationMessage(t("event_planner_export_done"));
  };
  const handleCopySelectedEventShoppingChecklist = async () => {
    if (!selectedEventShoppingChecklistText) {
      setInvitationMessage(t("event_menu_shopping_empty"));
      return;
    }
    try {
      await navigator.clipboard.writeText(selectedEventShoppingChecklistText);
      setInvitationMessage(t("event_menu_shopping_copied"));
    } catch {
      setInvitationMessage(t("copy_fail"));
    }
  };
  const handleCopyEventPlannerPrompt = async () => {
    const promptText = String(
      (isEventPlannerContextOpen ? eventPlannerContextDraftPromptBundle?.prompt : selectedEventPlannerPromptBundle?.prompt) || ""
    ).trim();
    if (!promptText) {
      setInvitationMessage(t("event_planner_prompt_empty"));
      return;
    }
    try {
      await navigator.clipboard.writeText(promptText);
      setInvitationMessage(t("event_planner_prompt_copied"));
    } catch {
      setInvitationMessage(t("copy_fail"));
    }
  };
  const handleCopyEventPlannerMessages = async () => {
    const payload = String(selectedEventHostMessagesText || "").trim();
    if (!payload) {
      setInvitationMessage(t("event_planner_prompt_empty"));
      return;
    }
    try {
      await navigator.clipboard.writeText(payload);
      setInvitationMessage(t("event_planner_messages_copied"));
    } catch {
      setInvitationMessage(t("copy_fail"));
    }
  };
  const handleEventPlannerTabChange = (nextTab) => {
    const normalizedTab = EVENT_PLANNER_VIEW_TABS.includes(String(nextTab || "").trim().toLowerCase())
      ? String(nextTab || "").trim().toLowerCase()
      : "menu";
    markUserNavigationIntent();
    setEventDetailPlannerTab(normalizedTab);
  };
  const handleOpenEventPlan = (targetTab = "ambience") => {
    openEventPlanById(selectedEventDetail?.id || "", targetTab);
  };
  const handleBackToEventDetail = () => {
    if (!selectedEventDetail?.id) {
      return;
    }
    markUserNavigationIntent();
    setSelectedEventDetailId(selectedEventDetail.id);
    setActiveView("events");
    setEventsWorkspace("detail");
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
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
    markUserNavigationIntent();
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

  const applyImportedContactsPreview = ({
    contacts,
    source,
    loadedMessagePrefix,
    emptyMessage,
    fromWizard = false,
    keepDraft = false
  }) => {
    const parsedContacts = Array.isArray(contacts) ? contacts : [];
    setImportContactsPreview(tagImportedContacts(parsedContacts, source));
    setImportDuplicateMode("skip");
    setApprovedLowConfidenceMergeIds([]);
    setApprovedLowConfidenceMergeFieldsByPreviewId({});
    setPendingImportMergeApprovalPreviewId("");
    setPendingImportMergeSelectedFieldKeys([]);
    setImportMergeReviewShowOnlyWillFill(true);
    if (!keepDraft) {
      setImportContactsDraft("");
    }
    setImportContactsSearch("");
    setImportContactsGroupFilter("all");
    setImportContactsPotentialFilter("all");
    setImportContactsSourceFilter("all");
    setImportContactsSort("priority");
    setImportContactsPage(1);

    if (parsedContacts.length === 0) {
      setImportContactsMessage(emptyMessage);
      return false;
    }

    setImportContactsMessage(`${loadedMessagePrefix} ${parsedContacts.length}.`);
    if (fromWizard) {
      setImportWizardStep(3);
    }
    return true;
  };

  const previewImportedContacts = (sourceText, sourceType = "paste") => {
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
    applyImportedContactsPreview({
      contacts: parsedContacts,
      source: sourceType === "paste" ? "paste" : "file",
      loadedMessagePrefix: t("contact_import_preview_ready"),
      emptyMessage: t("contact_import_no_matches"),
      keepDraft: sourceType === "paste"
    });
  };

  const handlePreviewContactsFromDraft = () => {
    previewImportedContacts(importContactsDraft, "paste");
  };

  const handleImportContactsSelectedFile = async (selectedFile) => {
    if (!selectedFile) {
      return;
    }
    const fileText = await selectedFile.text();
    const lowerName = String(selectedFile.name || "").toLowerCase();
    const sourceType = lowerName.endsWith(".vcf") || lowerName.endsWith(".vcard") ? "vcf" : "text";
    setImportWizardUploadedFileName(selectedFile.name || "");
    previewImportedContacts(fileText, sourceType);
  };

  const handleImportContactsFile = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }
    await handleImportContactsSelectedFile(selectedFile);
    event.target.value = "";
  };

  const handleImportGoogleContacts = async ({ fromWizard = false } = {}) => {
    if (!canUseGoogleContacts) {
      setImportContactsMessage(t("contact_import_google_unconfigured"));
      return;
    }
    setIsImportingGoogleContacts(true);
    setImportContactsMessage("");
    try {
      const googleContacts = await importContactsFromGoogle();
      applyImportedContactsPreview({
        contacts: googleContacts,
        source: "google",
        loadedMessagePrefix: t("contact_import_google_loaded"),
        emptyMessage: t("contact_import_google_empty"),
        fromWizard
      });
      if (!fromWizard && contactImportDetailsRef.current) {
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

  const handlePickDeviceContacts = async ({ fromWizard = false } = {}) => {
    if (!canUseDeviceContacts) {
      setImportContactsMessage(contactPickerUnsupportedReason || t("contact_import_device_not_supported"));
      if (!fromWizard) {
        openFileImportFallback();
      }
      return;
    }
    try {
      const selectedContacts = await navigator.contacts.select(["name", "email", "tel", "address", "icon"], { multiple: true });
      const parsedContacts = (selectedContacts || [])
        .map((item) => normalizeDeviceContact(item))
        .filter((contact) => contact.firstName || contact.lastName || contact.email || contact.phone);
      applyImportedContactsPreview({
        contacts: parsedContacts,
        source: "device",
        loadedMessagePrefix: t("contact_import_device_loaded"),
        emptyMessage: t("contact_import_device_empty"),
        fromWizard
      });
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
      const selectedContacts = await navigator.contacts.select(["name", "email", "tel", "address", "icon"], { multiple: false });
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
      setGuestPhotoUrl(contact.photoUrl || guestPhotoUrl);
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

  const handleGuestPhotoUrlChange = (value) => {
    setGuestPhotoUrl(String(value || "").trim());
  };

  const handleGuestPhotoFileChange = async (event) => {
    const selectedFile = event?.target?.files?.[0];
    if (!selectedFile) {
      return;
    }
    try {
      const dataUrl = await readImageFileAsDataUrl(selectedFile);
      if (dataUrl) {
        setGuestPhotoUrl(dataUrl);
      }
      setGuestMessage(t("guest_photo_loaded"));
    } catch {
      setGuestMessage(t("guest_photo_load_error"));
    } finally {
      if (event?.target) {
        event.target.value = "";
      }
    }
  };

  const handleRemoveGuestPhoto = () => {
    setGuestPhotoUrl("");
  };

  const handleCreateBirthdayEventFromGuest = () => {
    markUserNavigationIntent();
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

  const handleOpenGuestAdvancedPriority = () => {
    if (guestAdvancedDetailsRef.current) {
      guestAdvancedDetailsRef.current.open = true;
      guestAdvancedDetailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setGuestAdvancedEditTab("identity");
  };

  const scrollGuestAdvancedSectionIntoView = useCallback((sectionNode) => {
    if (!sectionNode) {
      return;
    }
    const toolbarNode = guestAdvancedToolbarRef.current;
    const toolbarHeight = toolbarNode ? toolbarNode.getBoundingClientRect().height : 0;
    const toolbarTopOffset = toolbarNode
      ? Number.parseFloat(window.getComputedStyle(toolbarNode).top || "0") || 0
      : 0;
    const safeSpacing = 12;
    const sectionTop = window.scrollY + sectionNode.getBoundingClientRect().top;
    const targetTop = Math.max(0, sectionTop - toolbarHeight - toolbarTopOffset - safeSpacing);
    window.scrollTo({ top: targetTop, behavior: "smooth" });
  }, []);

  const getGuestAdvancedSectionFromPriorityKey = useCallback((priorityKey) => {
    const normalizedKey = String(priorityKey || "").trim();
    return GUEST_ADVANCED_PRIORITY_SECTION_MAP[normalizedKey] || "identity";
  }, []);

  const scrollToGuestAdvancedSection = (tabKey) => {
    const normalizedTab = String(tabKey || "").trim();
    if (!GUEST_ADVANCED_EDIT_TABS.includes(normalizedTab)) {
      return;
    }
    setGuestAdvancedEditTab(normalizedTab);
    if (guestAdvancedDetailsRef.current) {
      guestAdvancedDetailsRef.current.open = true;
    }
    window.setTimeout(() => {
      const sectionNode = guestAdvancedSectionRefs.current[normalizedTab];
      if (sectionNode) {
        scrollGuestAdvancedSectionIntoView(sectionNode);
        const firstField = sectionNode.parentElement?.querySelector(
          "input:not([type='hidden']), select, textarea"
        );
        if (firstField && typeof firstField.focus === "function") {
          firstField.focus({ preventScroll: true });
        }
      } else if (guestAdvancedDetailsRef.current) {
        guestAdvancedDetailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 40);
  };

  const validateGuestAdvancedStep = useCallback(
    (tabKey) => {
      const normalizedTab = String(tabKey || "").trim();
      const tabErrorFields = GUEST_ADVANCED_ERROR_FIELDS_BY_TAB[normalizedTab] || [];
      const mergeTabErrors = (nextTabErrors = {}) => {
        setGuestErrors((prev) => {
          const next = { ...(prev || {}) };
          tabErrorFields.forEach((fieldKey) => {
            delete next[fieldKey];
          });
          return { ...next, ...nextTabErrors };
        });
      };

      if (normalizedTab === "identity") {
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
        const identityErrors = {};
        if (!validation.success) {
          for (const [fieldKey, fieldError] of Object.entries(validation.errors || {})) {
            if (tabErrorFields.includes(fieldKey)) {
              identityErrors[fieldKey] = fieldError;
            }
          }
        }
        mergeTabErrors(identityErrors);
        if (Object.keys(identityErrors).length > 0) {
          const firstError = identityErrors[Object.keys(identityErrors)[0]];
          setGuestMessage(t(firstError || "error_create_guest"));
          window.setTimeout(() => {
            const firstInvalid = document.querySelector(".guest-create-form [aria-invalid='true']");
            if (firstInvalid && typeof firstInvalid.focus === "function") {
              firstInvalid.focus({ preventScroll: true });
            }
          }, 0);
          return false;
        }
        return true;
      }

      if (normalizedTab === "health") {
        const allergiesList = toCatalogCodes("allergy", splitListInput(guestAdvanced.allergies));
        const intolerancesList = toCatalogCodes("intolerance", splitListInput(guestAdvanced.intolerances));
        const medicalConditionsList = toCatalogCodes(
          "medical_condition",
          splitListInput(guestAdvanced.medicalConditions)
        );
        const dietaryMedicalRestrictionsList = toCatalogCodes(
          "dietary_medical_restriction",
          splitListInput(guestAdvanced.dietaryMedicalRestrictions)
        );
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
        const hasSensitiveData =
          allergiesList.length > 0 ||
          intolerancesList.length > 0 ||
          petAllergiesList.length > 0 ||
          medicalConditionsList.length > 0 ||
          dietaryMedicalRestrictionsList.length > 0;
        if (hasSensitiveData && !guestAdvanced.sensitiveConsent) {
          mergeTabErrors({ sensitiveConsent: "guest_sensitive_consent_required" });
          setGuestMessage(t("guest_sensitive_consent_required"));
          return false;
        }
        mergeTabErrors();
        return true;
      }

      mergeTabErrors();
      return true;
    },
    [
      guestFirstName,
      guestLastName,
      guestEmail,
      guestPhone,
      guestRelationship,
      guestCity,
      guestCountry,
      guestAdvanced,
      language,
      t
    ]
  );

  const handleGoToPreviousGuestAdvancedSection = () => {
    if (!guestAdvancedPrevTab) {
      return;
    }
    scrollToGuestAdvancedSection(guestAdvancedPrevTab);
  };

  const handleGoToNextGuestAdvancedSection = async () => {
    if (!guestAdvancedNextTab) {
      return;
    }
    if (!validateGuestAdvancedStep(guestAdvancedEditTab)) {
      return;
    }
    const saveResult = await persistGuest({ refreshAfterSave: false, successMessageMode: "step" });
    if (!saveResult?.ok) {
      return;
    }
    scrollToGuestAdvancedSection(guestAdvancedNextTab);
  };

  const handleSaveGuestDraft = async () => {
    if (isSavingGuest) {
      return;
    }
    if (!validateGuestAdvancedStep(guestAdvancedEditTab)) {
      return;
    }
    await persistGuest({ refreshAfterSave: false, successMessageMode: "draft" });
  };

  const handleSaveAndGoNextPendingGuestAdvancedSection = async () => {
    if (isSavingGuest || !guestAdvancedNextPendingTab) {
      return;
    }
    if (!validateGuestAdvancedStep(guestAdvancedEditTab)) {
      return;
    }
    const saveResult = await persistGuest({ refreshAfterSave: false, successMessageMode: "draft" });
    if (!saveResult?.ok) {
      return;
    }
    scrollToGuestAdvancedSection(guestAdvancedNextPendingTab);
  };

  const handleGoToFirstPendingGuestAdvancedSection = () => {
    if (!guestAdvancedFirstPendingTab) {
      return;
    }
    scrollToGuestAdvancedSection(guestAdvancedFirstPendingTab);
  };

  const handleClearImportContacts = () => {
    setImportContactsDraft("");
    setImportContactsPreview([]);
    setImportWizardUploadedFileName("");
    setImportContactsSearch("");
    setImportContactsGroupFilter("all");
    setImportContactsPotentialFilter("all");
    setImportContactsSourceFilter("all");
    setImportContactsSort("priority");
    setImportDuplicateMode("skip");
    setSelectedImportContactIds([]);
    setApprovedLowConfidenceMergeIds([]);
    setApprovedLowConfidenceMergeFieldsByPreviewId({});
    setPendingImportMergeApprovalPreviewId("");
    setImportMergeReviewShowOnlyWillFill(true);
    setPendingImportMergeSelectedFieldKeys([]);
    setImportContactsPage(1);
    setImportContactsPageSize(IMPORT_PREVIEW_PAGE_SIZE_DEFAULT);
    setImportContactsMessage("");
  };

  const handleOpenImportWizard = () => {
    handleClearImportContacts();
    setImportWizardStep(importWizardShouldStartAtConfigStep ? 2 : 1);
    setImportWizardSource(recommendedImportWizardSource);
    setImportWizardShareEmail("");
    setImportWizardShareMessage("");
    setImportWizardResult({
      imported: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      selected: 0,
      partial: false
    });
    setIsImportWizardOpen(true);
  };

  const handleCloseImportWizard = () => {
    setIsImportWizardOpen(false);
    setImportWizardShareMessage("");
  };

  const handleImportWizardBack = () => {
    if (importWizardStep <= 1) {
      handleCloseImportWizard();
      return;
    }
    if (importWizardStep === 4) {
      handleCloseImportWizard();
      return;
    }
    setImportWizardStep((prev) => Math.max(1, prev - 1));
  };

  const handleImportWizardContinue = async () => {
    if (importWizardStep === 1) {
      setImportContactsMessage("");
      setImportWizardStep(2);
      return;
    }
    if (importWizardStep === 2) {
      if (importContactsAnalysis.length === 0) {
        setImportContactsMessage(t("contact_import_no_matches"));
        return;
      }
      setImportWizardStep(3);
      return;
    }
    if (importWizardStep === 3) {
      await handleImportContacts({ fromWizard: true });
      return;
    }
    handleCloseImportWizard();
  };

  const handleImportWizardDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const selectedFile = event.dataTransfer?.files?.[0];
    if (!selectedFile) {
      return;
    }
    await handleImportContactsSelectedFile(selectedFile);
  };

  const handleImportWizardEmailLink = () => {
    const nextEmail = String(importWizardShareEmail || "").trim();
    const subject = encodeURIComponent(t("import_wizard_mobile_email_subject"));
    const body = encodeURIComponent(
      `${t("import_wizard_mobile_email_body")}\n${importWizardMobileLink}`
    );
    const mailToEmail = nextEmail ? nextEmail : "";
    window.open(`mailto:${mailToEmail}?subject=${subject}&body=${body}`, "_blank", "noopener,noreferrer");
    setImportWizardShareMessage(t("import_wizard_mobile_email_sent"));
  };

  const handleShareImportWizardLink = async () => {
    if (canUseNativeShare) {
      try {
        await navigator.share({
          title: t("import_wizard_mobile_share_title"),
          text: t("import_wizard_mobile_share_text"),
          url: importWizardMobileLink
        });
        setImportWizardShareMessage(t("import_wizard_mobile_share_sent"));
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(importWizardMobileLink);
      setImportWizardShareMessage(t("copy_ok"));
    } catch {
      setImportWizardShareMessage(t("copy_fail"));
    }
  };

  const handleSelectAllReadyImportContacts = () => {
    setSelectedImportContactIds(importContactsReady.map((item) => item.previewId));
  };

  const handleSelectSuggestedImportContacts = () => {
    setSelectedImportContactIds(importContactsSuggested.map((item) => item.previewId));
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

  const handleSelectHighPotentialImportContacts = () => {
    setSelectedImportContactIds(
      importContactsFiltered
        .filter((item) => item.canImport && item.potentialLevel === "high")
        .map((item) => item.previewId)
    );
  };

  const handleSelectDualChannelImportContacts = () => {
    setSelectedImportContactIds(
      importContactsFiltered
        .filter((item) => item.canImport && item.hasDualChannel)
        .map((item) => item.previewId)
    );
  };

  const getSmartImportMergeSelection = (items) => {
    const duplicateCandidates = items.filter((item) => item.duplicateExisting && !item.duplicateInPreview);
    const safeCandidates = duplicateCandidates.filter((item) => item.canImport);
    return {
      duplicateCandidates,
      selectedCandidates: safeCandidates
    };
  };

  const handleImportDuplicateModeChange = (nextModeInput) => {
    const nextMode = nextModeInput === "merge" ? "merge" : "skip";
    setImportDuplicateMode(nextMode);
    if (nextMode !== "merge") {
      setApprovedLowConfidenceMergeIds([]);
      setApprovedLowConfidenceMergeFieldsByPreviewId({});
      setPendingImportMergeApprovalPreviewId("");
      setImportMergeReviewShowOnlyWillFill(true);
      setPendingImportMergeSelectedFieldKeys([]);
      return;
    }
    const { duplicateCandidates, selectedCandidates } = getSmartImportMergeSelection(importContactsFiltered);
    if (duplicateCandidates.length === 0 || selectedImportContactIds.length > 0) {
      return;
    }
    setSelectedImportContactIds(selectedCandidates.map((item) => item.previewId));
    setImportContactsMessage(
      interpolateText(t("contact_import_merge_smart_selected"), {
        selected: selectedCandidates.length,
        total: duplicateCandidates.length
      })
    );
  };

  const handleTogglePendingImportMergeFieldKey = (fieldKey) => {
    if (!fieldKey) {
      return;
    }
    setPendingImportMergeSelectedFieldKeys((prev) =>
      prev.includes(fieldKey) ? prev.filter((item) => item !== fieldKey) : [...prev, fieldKey]
    );
  };

  const getDefaultApprovedFieldKeysForImportItem = useCallback(
    (contactItem) => {
      if (!contactItem?.existingGuestId) {
        return [];
      }
      const targetGuest = guestsById[contactItem.existingGuestId];
      if (!targetGuest) {
        return [];
      }
      const sourceFullName = [contactItem.firstName, contactItem.lastName].filter(Boolean).join(" ");
      const targetFullName = [targetGuest.first_name, targetGuest.last_name].filter(Boolean).join(" ");
      const fieldChecks = [
        { key: "full_name", source: sourceFullName, target: targetFullName },
        { key: "email", source: contactItem.email, target: targetGuest.email },
        { key: "phone", source: contactItem.phone, target: targetGuest.phone },
        { key: "city", source: contactItem.city, target: targetGuest.city },
        { key: "country", source: contactItem.country, target: targetGuest.country },
        { key: "address", source: contactItem.address, target: targetGuest.address },
        { key: "company", source: contactItem.company, target: targetGuest.company },
        { key: "birthday", source: contactItem.birthday, target: targetGuest.birthday },
        { key: "avatar_url", source: contactItem.photoUrl, target: targetGuest.avatar_url }
      ];
      return fieldChecks.filter((item) => !isBlankValue(item.source) && isBlankValue(item.target)).map((item) => item.key);
    },
    [guestsById]
  );

  const handleApproveLowConfidenceMergeContact = (previewId, selectedFieldKeys = pendingImportMergeSelectedFieldKeys) => {
    if (!previewId) {
      return;
    }
    setImportDuplicateMode("merge");
    setApprovedLowConfidenceMergeIds((prev) => (prev.includes(previewId) ? prev : [...prev, previewId]));
    if (Array.isArray(selectedFieldKeys) && selectedFieldKeys.length > 0) {
      setApprovedLowConfidenceMergeFieldsByPreviewId((prev) => ({
        ...prev,
        [previewId]: uniqueValues(selectedFieldKeys)
      }));
    }
    setImportMergeReviewShowOnlyWillFill(true);
    setPendingImportMergeApprovalPreviewId("");
    setPendingImportMergeSelectedFieldKeys([]);
  };

  const handleOpenLowConfidenceMergeReview = (previewId) => {
    if (!previewId) {
      return;
    }
    const targetItem = importContactsAnalysis.find((item) => item.previewId === previewId);
    if (!targetItem?.requiresMergeApproval) {
      handleApproveLowConfidenceMergeContact(previewId);
      return;
    }
    setImportMergeReviewShowOnlyWillFill(true);
    setPendingImportMergeApprovalPreviewId(previewId);
  };

  const handleCloseLowConfidenceMergeReview = () => {
    setImportMergeReviewShowOnlyWillFill(true);
    setPendingImportMergeApprovalPreviewId("");
    setPendingImportMergeSelectedFieldKeys([]);
  };

  const handleConfirmLowConfidenceMergeReview = () => {
    if (!pendingImportMergeApprovalItem?.previewId) {
      return;
    }
    if (pendingImportMergeSelectableCount > 0 && pendingImportMergeSelectedFieldKeys.length === 0) {
      setImportContactsMessage(t("contact_import_merge_review_select_at_least_one"));
      return;
    }
    handleApproveLowConfidenceMergeContact(
      pendingImportMergeApprovalItem.previewId,
      pendingImportMergeSelectedFieldKeys
    );
  };

  const handleApproveAllLowConfidenceMergeContacts = () => {
    setImportDuplicateMode("merge");
    const pendingItems = importContactsFiltered.filter(
      (item) => item.duplicateExisting && item.duplicateMergeConfidence === "low" && !item.duplicateInPreview
    );
    const pendingIds = pendingItems.map((item) => item.previewId);
    if (pendingIds.length === 0) {
      return;
    }
    setApprovedLowConfidenceMergeIds((prev) => uniqueValues([...prev, ...pendingIds]));
    setApprovedLowConfidenceMergeFieldsByPreviewId((prev) => {
      const next = { ...prev };
      for (const pendingItem of pendingItems) {
        const fieldKeys = getDefaultApprovedFieldKeysForImportItem(pendingItem);
        if (fieldKeys.length > 0) {
          next[pendingItem.previewId] = uniqueValues(fieldKeys);
        }
      }
      return next;
    });
    setImportContactsMessage(
      interpolateText(t("contact_import_merge_low_approved"), {
        count: pendingIds.length
      })
    );
  };

  const handleSelectDuplicateMergeImportContacts = () => {
    setImportDuplicateMode("merge");
    const { duplicateCandidates, selectedCandidates } = getSmartImportMergeSelection(importContactsFiltered);
    setSelectedImportContactIds(selectedCandidates.map((item) => item.previewId));
    setImportContactsMessage(
      interpolateText(t("contact_import_merge_smart_selected"), {
        selected: selectedCandidates.length,
        total: duplicateCandidates.length
      })
    );
  };

  const toggleImportContactSelection = (previewId) => {
    setSelectedImportContactIds((prev) =>
      prev.includes(previewId) ? prev.filter((item) => item !== previewId) : [...prev, previewId]
    );
  };

  const handleImportContacts = async ({ fromWizard = false } = {}) => {
    if (!supabase || !session?.user?.id) {
      return null;
    }
    if (importContactsSelectedReady.length === 0) {
      setImportContactsMessage(
        importContactsReady.length === 0 ? t("contact_import_no_ready") : t("contact_import_no_selected")
      );
      return null;
    }
    setIsImportingContacts(true);
    setImportContactsMessage("");

    const duplicateMode = importDuplicateMode === "merge" ? "merge" : "skip";
    const insertedMatchingKeys = new Set();
    let importedCount = 0;
    let mergedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const selectedCount = importContactsSelectedReady.length;

    for (const contactItem of importContactsSelectedReady) {
      const fallbackFirstName = deriveGuestNameFromContact(contactItem) || t("field_guest");
      const relationshipCode = deriveRelationshipCodeFromContact(contactItem);
      const matchingKeys = buildGuestMatchingKeys({
        firstName: fallbackFirstName,
        lastName: contactItem.lastName,
        email: contactItem.email,
        phone: contactItem.phone
      });
      const existingGuest = findExistingGuestForContact({
        firstName: fallbackFirstName,
        lastName: contactItem.lastName,
        email: contactItem.email,
        phone: contactItem.phone
      });
      const hasExisting = Boolean(existingGuest);

      if (hasExisting && duplicateMode !== "merge") {
        skippedCount += 1;
        continue;
      }

      if (hasExisting && duplicateMode === "merge") {
        if (!existingGuest?.id) {
          skippedCount += 1;
          continue;
        }

        const approvedFieldKeys = approvedLowConfidenceMergeFieldsByPreviewId[contactItem.previewId];
        const approvedFieldSet =
          Array.isArray(approvedFieldKeys) && approvedFieldKeys.length > 0 ? new Set(approvedFieldKeys) : null;
        const isMergeFieldAllowed = (field) => {
          if (!approvedFieldSet) {
            return true;
          }
          if (field === "first_name" || field === "last_name") {
            return approvedFieldSet.has("full_name") || approvedFieldSet.has(field);
          }
          return approvedFieldSet.has(field);
        };

        const mergePayload = {};
        const assignMergeField = (field, existingValue, incomingValue) => {
          if (!isMergeFieldAllowed(field)) {
            return;
          }
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
        assignMergeField("avatar_url", existingGuest.avatar_url, contactItem.photoUrl);

        if (Object.keys(mergePayload).length === 0) {
          skippedCount += 1;
          continue;
        }

        let { error } = await supabase
          .from("guests")
          .update(mergePayload)
          .eq("id", existingGuest.id)
          .eq("host_user_id", session.user.id);

        if (error && isCompatibilityError(error, ["postal_code", "state_region", "birthday", "avatar_url"])) {
          const fallbackMergePayload = { ...mergePayload };
          delete fallbackMergePayload.postal_code;
          delete fallbackMergePayload.state_region;
          delete fallbackMergePayload.birthday;
          delete fallbackMergePayload.avatar_url;

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
        birthday: toNullable(contactItem.birthday),
        avatar_url: toNullable(contactItem.photoUrl)
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

      if (matchingKeys.some((matchingKey) => insertedMatchingKeys.has(matchingKey))) {
        skippedCount += 1;
        continue;
      }

      let { error } = await supabase.from("guests").insert(payloadBase);
      if (error && isCompatibilityError(error, ["content_language", "postal_code", "state_region", "birthday", "avatar_url"])) {
        ({ error } = await supabase.from("guests").insert(payloadFallback));
      }

      if (error) {
        failedCount += 1;
        continue;
      }
      matchingKeys.forEach((matchingKey) => insertedMatchingKeys.add(matchingKey));
      importedCount += 1;
    }

    setIsImportingContacts(false);
    setSelectedImportContactIds([]);
    setApprovedLowConfidenceMergeFieldsByPreviewId({});
    setPendingImportMergeSelectedFieldKeys([]);
    setPendingImportMergeApprovalPreviewId("");
    setImportContactsMessage(
      `${t("contact_import_done")} ${importedCount}. ${t("contact_import_merged")} ${mergedCount}. ${t("contact_import_skipped")} ${skippedCount}. ${failedCount > 0 ? `${t("contact_import_failed")} ${failedCount}.` : ""
        }`.trim()
    );
    const summary = {
      imported: importedCount,
      updated: mergedCount,
      failed: failedCount,
      skipped: skippedCount,
      selected: selectedCount,
      partial: failedCount > 0
    };
    setImportWizardResult(summary);
    if (fromWizard) {
      setImportWizardStep(4);
    }
    if (importedCount > 0 || mergedCount > 0) {
      await loadDashboardData();
    }
    return summary;
  };

  const handleShareHostSignupLink = async (guestItem, channel = "copy") => {
    if (!guestItem) {
      return;
    }
    const payload = buildHostInvitePayload(guestItem, t);
    if (channel === "whatsapp") {
      window.open(payload.whatsappUrl, "_blank", "noopener,noreferrer");
      setGuestMessage(
        interpolateText(t("host_invite_channel_opened"), {
          guest: payload.guestLabel,
          channel: t("host_invite_channel_whatsapp")
        })
      );
      return;
    }
    if (channel === "email") {
      window.open(payload.emailUrl, "_blank", "noopener,noreferrer");
      setGuestMessage(
        interpolateText(t("host_invite_channel_opened"), {
          guest: payload.guestLabel,
          channel: t("host_invite_channel_email")
        })
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(payload.signupUrl);
      setGuestMessage(`${t("host_invite_link_copied")} ${payload.guestLabel}`);
    } catch {
      setGuestMessage(t("copy_fail"));
    }
  };

  const handleCopyHostSignupLink = async (guestItem) => {
    await handleShareHostSignupLink(guestItem, "copy");
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
    await refreshSharedProfileData();
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
      await refreshSharedProfileData();
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
    await refreshSharedProfileData();
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

  const handleApplyGlobalSharePreset = (hostUserId, preset) => {
    if (!hostUserId) {
      return;
    }
    setGlobalShareDraftByHostId((prev) => {
      const baseDraft = prev?.[hostUserId] || {
        status: "inactive",
        allow_identity: false,
        allow_food: false,
        allow_lifestyle: false,
        allow_conversation: false,
        allow_health: false
      };
      return {
        ...prev,
        [hostUserId]: applyGlobalSharePreset(baseDraft, preset)
      };
    });
  };

  const handleSaveGlobalShare = async (hostUserId, draftOverride = null) => {
    if (!supabase || !session?.user?.id || !hostUserId) {
      return;
    }
    if (hostUserId === session.user.id) {
      setGlobalProfileMessage(t("global_profile_share_self_error"));
      return;
    }
    const draft = draftOverride || globalShareDraftByHostId[hostUserId];
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
    await refreshSharedProfileData();
  };

  const handleRequestSaveGlobalShare = (hostUserId) => {
    if (!hostUserId) {
      return;
    }
    const targetItem = globalShareTargetsVisible.find((item) => item.host_user_id === hostUserId);
    const draft = globalShareDraftByHostId[hostUserId] || (targetItem ? mapShareTargetToDraft(targetItem) : null);
    if (!targetItem || !draft) {
      return;
    }
    setPendingGlobalShareSave({
      hostUserId,
      hostName: targetItem.host_name || t("host_default_name"),
      hostEmail: targetItem.host_email || hostUserId,
      draft
    });
  };

  const handleConfirmSaveGlobalShare = async () => {
    if (!pendingGlobalShareSave?.hostUserId || !pendingGlobalShareSave?.draft) {
      setPendingGlobalShareSave(null);
      return;
    }
    await handleSaveGlobalShare(pendingGlobalShareSave.hostUserId, pendingGlobalShareSave.draft);
    setPendingGlobalShareSave(null);
  };

  const handleApplyGlobalShareAction = async (mode) => {
    if (!supabase || !session?.user?.id) {
      return;
    }
    const targets = globalShareTargetsVisible.filter((item) => item?.host_user_id);
    if (targets.length === 0) {
      setGlobalProfileMessage(t("global_profile_share_targets_empty"));
      return;
    }

    if (mode === "pause") {
      setIsPausingGlobalShares(true);
    } else {
      setIsRevokingGlobalShares(true);
    }
    setGlobalProfileMessage("");

    let savedCount = 0;
    let failedCount = 0;
    for (const targetItem of targets) {
      const hostId = targetItem.host_user_id;
      const currentDraft = globalShareDraftByHostId[hostId] || mapShareTargetToDraft(targetItem);
      const nextDraft =
        mode === "pause"
          ? { ...currentDraft, status: "revoked" }
          : {
            ...currentDraft,
            status: "revoked",
            allow_identity: false,
            allow_food: false,
            allow_lifestyle: false,
            allow_conversation: false,
            allow_health: false
          };

      const result = await supabase.rpc("set_my_global_profile_share", {
        p_grantee_user_id: hostId,
        p_status: "revoked",
        p_allow_identity: Boolean(nextDraft.allow_identity),
        p_allow_food: Boolean(nextDraft.allow_food),
        p_allow_lifestyle: Boolean(nextDraft.allow_lifestyle),
        p_allow_conversation: Boolean(nextDraft.allow_conversation),
        p_allow_health: Boolean(nextDraft.allow_health),
        p_expires_at: null
      });
      if (result.error) {
        failedCount += 1;
      } else {
        savedCount += 1;
      }
    }

    if (mode === "pause") {
      setIsPausingGlobalShares(false);
      setGlobalProfileMessage(
        interpolateText(t("global_profile_share_pause_summary"), { saved: savedCount, failed: failedCount })
      );
    } else {
      setIsRevokingGlobalShares(false);
      setGlobalProfileMessage(
        interpolateText(t("global_profile_share_revoke_all_summary"), { saved: savedCount, failed: failedCount })
      );
    }
    await refreshSharedProfileData();
  };

  const handleStartEditGuest = (guestItem, { openAdvanced = false, preferredAdvancedTab = "identity" } = {}) => {
    markUserNavigationIntent();
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
    setGuestPhotoUrl(getGuestPhotoValue(guestItem));
    setGuestAdvanced(getGuestAdvancedState(guestItem));
    setGuestLastSavedAt(guestItem.updated_at || guestItem.created_at || "");
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
    const nextTab = GUEST_ADVANCED_EDIT_TABS.includes(preferredAdvancedTab) ? preferredAdvancedTab : "identity";
    setGuestAdvancedEditTab(nextTab);
    setOpenGuestAdvancedOnCreate(Boolean(openAdvanced));
  };

  const handleCancelEditGuest = () => {
    setEditingGuestId("");
    setSelectedGuestDetailId("");
    setGuestFirstName("");
    setGuestLastName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestRelationship("");
    setGuestCity("");
    setGuestCountry("");
    setGuestPhotoUrl("");
    setGuestAdvanced(GUEST_ADVANCED_INITIAL_STATE);
    setGuestLastSavedAt("");
    setSelectedGuestAddressPlace(null);
    setGuestAddressPredictions([]);
    setGuestErrors({});
    setGuestMessage("");
    setGuestAdvancedEditTab("identity");
    setOpenGuestAdvancedOnCreate(false);
  };

  const openGuestAdvancedEditor = (guestId) => {
    markUserNavigationIntent();
    const fallbackGuestId = String(guestId || "").trim();
    if (!fallbackGuestId) {
      return;
    }
    const guestItem = guests.find((item) => item.id === fallbackGuestId);
    if (!guestItem) {
      openGuestDetail(fallbackGuestId);
      return;
    }
    handleStartEditGuest(guestItem, { openAdvanced: true });
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const persistGuest = useCallback(async ({ refreshAfterSave = true, successMessageMode = "form" } = {}) => {
    if (!supabase || !session?.user?.id) {
      return { ok: false, savedGuestId: "" };
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
      return { ok: false, savedGuestId: "" };
    }

    const allergiesList = toCatalogCodes("allergy", splitListInput(guestAdvanced.allergies));
    const intolerancesList = toCatalogCodes("intolerance", splitListInput(guestAdvanced.intolerances));
    const medicalConditionsList = toCatalogCodes("medical_condition", splitListInput(guestAdvanced.medicalConditions));
    const dietaryMedicalRestrictionsList = toCatalogCodes(
      "dietary_medical_restriction",
      splitListInput(guestAdvanced.dietaryMedicalRestrictions)
    );
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
    const hasSensitiveData =
      allergiesList.length > 0 ||
      intolerancesList.length > 0 ||
      petAllergiesList.length > 0 ||
      medicalConditionsList.length > 0 ||
      dietaryMedicalRestrictionsList.length > 0;
    if (hasSensitiveData && !guestAdvanced.sensitiveConsent) {
      setGuestErrors((prev) => ({ ...prev, sensitiveConsent: "guest_sensitive_consent_required" }));
      setGuestMessage(t("guest_sensitive_consent_required"));
      return { ok: false, savedGuestId: "" };
    }

    setGuestErrors({});
    setIsSavingGuest(true);

    const normalizedGuestPhotoInput = String(guestPhotoUrl || "").trim();
    const shouldUploadGuestAvatar = isDataImageUrl(normalizedGuestPhotoInput);
    const existingGuestAvatarUrl = isEditingGuest
      ? getGuestPhotoValue(guests.find((item) => item.id === editingGuestId))
      : "";
    let avatarUploadWarning = "";
    let avatarValueForDb = toNullable(normalizedGuestPhotoInput);

    if (shouldUploadGuestAvatar) {
      avatarValueForDb = isEditingGuest ? toNullable(existingGuestAvatarUrl) : null;
      if (isEditingGuest && editingGuestId) {
        const uploadResult = await uploadGuestAvatarToStorage({
          dataUrl: normalizedGuestPhotoInput,
          userId: session.user.id,
          guestId: editingGuestId
        });
        if (uploadResult.url) {
          avatarValueForDb = uploadResult.url;
          setGuestPhotoUrl(uploadResult.url);
        } else if (uploadResult.error) {
          avatarUploadWarning = String(uploadResult.error.message || "");
        }
      }
    }

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
      last_meet_at: toNullable(guestAdvanced.lastMeetAt),
      avatar_url: avatarValueForDb
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
        "last_meet_at",
        "avatar_url"
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
      return { ok: false, savedGuestId: "" };
    }

    if (!isEditingGuest && shouldUploadGuestAvatar && savedGuestId) {
      const uploadResult = await uploadGuestAvatarToStorage({
        dataUrl: normalizedGuestPhotoInput,
        userId: session.user.id,
        guestId: savedGuestId
      });
      if (uploadResult.url) {
        const updateAvatarResult = await supabase
          .from("guests")
          .update({ avatar_url: uploadResult.url })
          .eq("id", savedGuestId)
          .eq("host_user_id", session.user.id);
        if (updateAvatarResult.error) {
          avatarUploadWarning = String(updateAvatarResult.error.message || "");
        } else {
          setGuestPhotoUrl(uploadResult.url);
        }
      } else if (uploadResult.error) {
        avatarUploadWarning = String(uploadResult.error.message || "");
      }
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
      medical_conditions: medicalConditionsList,
      dietary_medical_restrictions: dietaryMedicalRestrictionsList,
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

      let sensitiveResult = await supabase
        .from("guest_sensitive_preferences")
        .upsert(sensitivePayload, { onConflict: "guest_id" });

      if (
        sensitiveResult.error &&
        isCompatibilityError(sensitiveResult.error, ["medical_conditions", "dietary_medical_restrictions"])
      ) {
        const fallbackSensitivePayload = { ...sensitivePayload };
        fallbackSensitivePayload.intolerances = uniqueValues([
          ...toList(fallbackSensitivePayload.intolerances),
          ...medicalConditionsList,
          ...dietaryMedicalRestrictionsList
        ]);
        delete fallbackSensitivePayload.medical_conditions;
        delete fallbackSensitivePayload.dietary_medical_restrictions;
        sensitiveResult = await supabase
          .from("guest_sensitive_preferences")
          .upsert(fallbackSensitivePayload, { onConflict: "guest_id" });
      }

      if (!relatedDataError && sensitiveResult.error && !isMissingRelationError(sensitiveResult.error, "guest_sensitive_preferences")) {
        relatedDataError = sensitiveResult.error;
      }
    }
    setIsSavingGuest(false);

    if (relatedDataError) {
      setGuestLastSavedAt(new Date().toISOString());
      const avatarWarningText = avatarUploadWarning ? ` · ${t("guest_photo_storage_warning")} (${avatarUploadWarning})` : "";
      setGuestMessage(`${t("guest_saved_partial_warning")} ${relatedDataError.message}${avatarWarningText}`);
      if (refreshAfterSave) {
        await loadDashboardData();
      }
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
      return { ok: false, savedGuestId };
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

    if (savedGuestId) {
      const preferenceState = {
        guest_id: savedGuestId,
        ...preferencePayload
      };
      const sensitiveState = normalizeSensitiveRecord({
        guest_id: savedGuestId,
        ...sensitivePayload
      });
      setGuestPreferencesById((prev) => ({
        ...prev,
        [savedGuestId]: preferenceState
      }));
      setGuestSensitiveById((prev) => ({
        ...prev,
        [savedGuestId]: sensitiveState
      }));
    }

    if (isEditingGuest) {
      setGuestLastSavedAt(new Date().toISOString());
      if (avatarUploadWarning) {
        setGuestMessage(`${t("guest_saved_partial_warning")} ${t("guest_photo_storage_warning")} (${avatarUploadWarning})`);
      } else if (successMessageMode === "form") {
        setGuestMessage(t("guest_updated"));
      } else if (successMessageMode === "step") {
        setGuestMessage(t("guest_step_saved"));
      } else if (successMessageMode === "draft") {
        setGuestMessage(t("guest_draft_saved"));
      }
      if (refreshAfterSave) {
        await loadDashboardData();
      }
      return { ok: true, savedGuestId };
    }

    if (refreshAfterSave) {
      await loadDashboardData();
    }
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
      setSelectedGuestDetailId(savedGuestId);
      setGuestLastSavedAt(new Date().toISOString());
      if (avatarUploadWarning) {
        setGuestMessage(`${t("guest_saved_partial_warning")} ${t("guest_photo_storage_warning")} (${avatarUploadWarning})`);
      } else if (successMessageMode === "form") {
        setGuestMessage(t("guest_created_continue_edit"));
      } else if (successMessageMode === "step") {
        setGuestMessage(t("guest_step_saved"));
      } else if (successMessageMode === "draft") {
        setGuestMessage(t("guest_draft_saved"));
      }
    } else {
      setGuestMessage(successMessageMode === "form" ? t("guest_created_missing_id_warning") : t("error_create_guest"));
      return { ok: false, savedGuestId: "" };
    }
    return { ok: true, savedGuestId };
  }, [
    editingGuestId,
    guestAdvanced,
    guestCity,
    guestCountry,
    guestEmail,
    guestFirstName,
    guestLastName,
    guestPhotoUrl,
    guestPhone,
    guestRelationship,
    guests,
    isEditingGuest,
    language,
    loadDashboardData,
    resolveCreatedGuestId,
    setSelectedGuestDetailId,
    selectedGuestAddressPlace,
    session?.user?.id,
    t
  ]);

  const handleSaveGuest = async (event) => {
    event.preventDefault();
    await persistGuest({ refreshAfterSave: true, successMessageMode: "form" });
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

  const handleOpenMergeGuest = (guestItem) => {
    if (!guestItem?.id) {
      return;
    }
    setGuestMergeSourceId(guestItem.id);
    setGuestMergeSearch("");
    setGuestMergeTargetId("");
  };

  const handleCloseMergeGuest = () => {
    if (isMergingGuest) {
      return;
    }
    setGuestMergeSourceId("");
    setGuestMergeTargetId("");
    setGuestMergeSearch("");
  };

  const handleConfirmMergeGuest = async () => {
    if (!supabase || !session?.user?.id || !guestMergeSourceId || !guestMergeTargetId) {
      return;
    }
    if (guestMergeSourceId === guestMergeTargetId) {
      setGuestMessage(t("merge_guest_error_same"));
      return;
    }

    const sourceGuest = guestsById[guestMergeSourceId];
    const targetGuest = guestsById[guestMergeTargetId];
    if (!sourceGuest || !targetGuest) {
      setGuestMessage(t("merge_guest_error_missing"));
      return;
    }

    setIsMergingGuest(true);
    setGuestMessage("");

    try {
      const mergeGuestPayload = {};
      const fillGuestField = (field, targetValue, sourceValue) => {
        const mergedValue = getMergedFieldValue(targetValue, sourceValue);
        if (typeof mergedValue !== "undefined") {
          mergeGuestPayload[field] = toNullable(mergedValue);
        }
      };

      fillGuestField("first_name", targetGuest.first_name, sourceGuest.first_name);
      fillGuestField("last_name", targetGuest.last_name, sourceGuest.last_name);
      fillGuestField("email", targetGuest.email, sourceGuest.email);
      fillGuestField("phone", targetGuest.phone, sourceGuest.phone);
      fillGuestField("relationship", targetGuest.relationship, sourceGuest.relationship);
      fillGuestField("city", targetGuest.city, sourceGuest.city);
      fillGuestField("country", targetGuest.country, sourceGuest.country);
      fillGuestField("address", targetGuest.address, sourceGuest.address);
      fillGuestField("postal_code", targetGuest.postal_code, sourceGuest.postal_code);
      fillGuestField("state_region", targetGuest.state_region, sourceGuest.state_region);
      fillGuestField("company", targetGuest.company, sourceGuest.company);
      fillGuestField("birthday", targetGuest.birthday, sourceGuest.birthday);
      fillGuestField("twitter", targetGuest.twitter, sourceGuest.twitter);
      fillGuestField("instagram", targetGuest.instagram, sourceGuest.instagram);
      fillGuestField("linkedin", targetGuest.linkedin, sourceGuest.linkedin);
      fillGuestField("avatar_url", targetGuest.avatar_url, sourceGuest.avatar_url);

      const sourceLastMeet = String(sourceGuest.last_meet_at || "").trim();
      const targetLastMeet = String(targetGuest.last_meet_at || "").trim();
      const sourceLastMeetAt = sourceLastMeet ? new Date(sourceLastMeet).getTime() : 0;
      const targetLastMeetAt = targetLastMeet ? new Date(targetLastMeet).getTime() : 0;
      if (sourceLastMeetAt && (!targetLastMeetAt || sourceLastMeetAt > targetLastMeetAt)) {
        mergeGuestPayload.last_meet_at = sourceLastMeet;
      }

      if (Object.keys(mergeGuestPayload).length > 0) {
        let { error: mergeGuestError } = await supabase
          .from("guests")
          .update(mergeGuestPayload)
          .eq("id", targetGuest.id)
          .eq("host_user_id", session.user.id);

        if (
          mergeGuestError &&
          isCompatibilityError(mergeGuestError, [
            "postal_code",
            "state_region",
            "birthday",
            "twitter",
            "instagram",
            "linkedin",
            "last_meet_at",
            "avatar_url"
          ])
        ) {
          const fallbackGuestPayload = { ...mergeGuestPayload };
          delete fallbackGuestPayload.postal_code;
          delete fallbackGuestPayload.state_region;
          delete fallbackGuestPayload.birthday;
          delete fallbackGuestPayload.twitter;
          delete fallbackGuestPayload.instagram;
          delete fallbackGuestPayload.linkedin;
          delete fallbackGuestPayload.last_meet_at;
          delete fallbackGuestPayload.avatar_url;
          if (Object.keys(fallbackGuestPayload).length > 0) {
            ({ error: mergeGuestError } = await supabase
              .from("guests")
              .update(fallbackGuestPayload)
              .eq("id", targetGuest.id)
              .eq("host_user_id", session.user.id));
          } else {
            mergeGuestError = null;
          }
        }

        if (mergeGuestError) {
          throw mergeGuestError;
        }
      }

      const sourcePreference = guestPreferencesById[sourceGuest.id] || null;
      const targetPreference = guestPreferencesById[targetGuest.id] || null;
      if (sourcePreference || targetPreference) {
        const mergedPreference = {
          guest_id: targetGuest.id,
          diet_type: toNullable(targetPreference?.diet_type || sourcePreference?.diet_type || ""),
          tasting_preferences: mergeUniqueListValues(toList(targetPreference?.tasting_preferences), toList(sourcePreference?.tasting_preferences)),
          food_likes: mergeUniqueListValues(toList(targetPreference?.food_likes), toList(sourcePreference?.food_likes)),
          food_dislikes: mergeUniqueListValues(toList(targetPreference?.food_dislikes), toList(sourcePreference?.food_dislikes)),
          drink_likes: mergeUniqueListValues(toList(targetPreference?.drink_likes), toList(sourcePreference?.drink_likes)),
          drink_dislikes: mergeUniqueListValues(toList(targetPreference?.drink_dislikes), toList(sourcePreference?.drink_dislikes)),
          music_genres: mergeUniqueListValues(toList(targetPreference?.music_genres), toList(sourcePreference?.music_genres)),
          favorite_color: toNullable(targetPreference?.favorite_color || sourcePreference?.favorite_color || ""),
          books: mergeUniqueListValues(toList(targetPreference?.books), toList(sourcePreference?.books)),
          movies: mergeUniqueListValues(toList(targetPreference?.movies), toList(sourcePreference?.movies)),
          series: mergeUniqueListValues(toList(targetPreference?.series), toList(sourcePreference?.series)),
          sports: mergeUniqueListValues(toList(targetPreference?.sports), toList(sourcePreference?.sports)),
          team_fan: toNullable(targetPreference?.team_fan || sourcePreference?.team_fan || ""),
          punctuality: toNullable(targetPreference?.punctuality || sourcePreference?.punctuality || ""),
          last_talk_topic: toNullable(targetPreference?.last_talk_topic || sourcePreference?.last_talk_topic || ""),
          taboo_topics: mergeUniqueListValues(toList(targetPreference?.taboo_topics), toList(sourcePreference?.taboo_topics)),
          experience_types: mergeUniqueListValues(toList(targetPreference?.experience_types), toList(sourcePreference?.experience_types)),
          preferred_guest_relationships: mergeUniqueListValues(
            toList(targetPreference?.preferred_guest_relationships),
            toList(sourcePreference?.preferred_guest_relationships)
          ),
          preferred_day_moments: mergeUniqueListValues(
            toList(targetPreference?.preferred_day_moments),
            toList(sourcePreference?.preferred_day_moments)
          ),
          periodicity: toNullable(targetPreference?.periodicity || sourcePreference?.periodicity || ""),
          cuisine_types: mergeUniqueListValues(toList(targetPreference?.cuisine_types), toList(sourcePreference?.cuisine_types)),
          pets: mergeUniqueListValues(toList(targetPreference?.pets), toList(sourcePreference?.pets))
        };

        let { error: preferencesError } = await supabase.from("guest_preferences").upsert(mergedPreference, {
          onConflict: "guest_id"
        });
        if (
          preferencesError &&
          isCompatibilityError(preferencesError, [
            "experience_types",
            "preferred_guest_relationships",
            "preferred_day_moments",
            "periodicity",
            "cuisine_types",
            "pets"
          ])
        ) {
          const fallbackPreference = { ...mergedPreference };
          delete fallbackPreference.experience_types;
          delete fallbackPreference.preferred_guest_relationships;
          delete fallbackPreference.preferred_day_moments;
          delete fallbackPreference.periodicity;
          delete fallbackPreference.cuisine_types;
          delete fallbackPreference.pets;
          ({ error: preferencesError } = await supabase.from("guest_preferences").upsert(fallbackPreference, {
            onConflict: "guest_id"
          }));
        }
        if (preferencesError && !isMissingRelationError(preferencesError, "guest_preferences")) {
          throw preferencesError;
        }
      }

      const sourceSensitive = guestSensitiveById[sourceGuest.id] || null;
      const targetSensitive = guestSensitiveById[targetGuest.id] || null;
      if (sourceSensitive || targetSensitive) {
        const allergies = mergeUniqueListValues(toList(targetSensitive?.allergies), toList(sourceSensitive?.allergies));
        const intolerances = mergeUniqueListValues(toList(targetSensitive?.intolerances), toList(sourceSensitive?.intolerances));
        const petAllergies = mergeUniqueListValues(toList(targetSensitive?.pet_allergies), toList(sourceSensitive?.pet_allergies));
        const medicalConditions = mergeUniqueListValues(
          toList(targetSensitive?.medical_conditions),
          toList(sourceSensitive?.medical_conditions)
        );
        const dietaryMedicalRestrictions = mergeUniqueListValues(
          toList(targetSensitive?.dietary_medical_restrictions),
          toList(sourceSensitive?.dietary_medical_restrictions)
        );
        const hasSensitiveValues =
          allergies.length > 0 ||
          intolerances.length > 0 ||
          petAllergies.length > 0 ||
          medicalConditions.length > 0 ||
          dietaryMedicalRestrictions.length > 0;
        const consentGranted = Boolean(targetSensitive?.consent_granted || sourceSensitive?.consent_granted || hasSensitiveValues);
        const mergedSensitive = {
          guest_id: targetGuest.id,
          allergies,
          intolerances,
          pet_allergies: petAllergies,
          medical_conditions: medicalConditions,
          dietary_medical_restrictions: dietaryMedicalRestrictions,
          consent_granted: consentGranted,
          consent_version: consentGranted
            ? targetSensitive?.consent_version || sourceSensitive?.consent_version || "v1"
            : null,
          consent_granted_at: consentGranted
            ? targetSensitive?.consent_granted_at || sourceSensitive?.consent_granted_at || new Date().toISOString()
            : null
        };
        let { error: sensitiveError } = await supabase.from("guest_sensitive_preferences").upsert(mergedSensitive, {
          onConflict: "guest_id"
        });
        if (sensitiveError && isCompatibilityError(sensitiveError, ["medical_conditions", "dietary_medical_restrictions"])) {
          const fallbackSensitive = { ...mergedSensitive };
          fallbackSensitive.intolerances = uniqueValues([
            ...toList(fallbackSensitive.intolerances),
            ...toList(fallbackSensitive.medical_conditions),
            ...toList(fallbackSensitive.dietary_medical_restrictions)
          ]);
          delete fallbackSensitive.medical_conditions;
          delete fallbackSensitive.dietary_medical_restrictions;
          ({ error: sensitiveError } = await supabase.from("guest_sensitive_preferences").upsert(fallbackSensitive, {
            onConflict: "guest_id"
          }));
        }
        if (sensitiveError && !isMissingRelationError(sensitiveError, "guest_sensitive_preferences")) {
          throw sensitiveError;
        }
      }

      const targetGuestName = `${targetGuest.first_name || ""} ${targetGuest.last_name || ""}`.trim() || null;
      const sourceInvitations = invitations.filter((item) => item.guest_id === sourceGuest.id);
      const targetInvitationsByEventId = Object.fromEntries(
        invitations.filter((item) => item.guest_id === targetGuest.id).map((item) => [item.event_id, item])
      );
      const statusRank = { pending: 0, maybe: 1, no: 1, yes: 2 };
      for (const invitationItem of sourceInvitations) {
        const targetInvitation = targetInvitationsByEventId[invitationItem.event_id] || null;
        if (targetInvitation) {
          const sourceRank = statusRank[String(invitationItem.status || "pending").toLowerCase()] ?? 0;
          const targetRank = statusRank[String(targetInvitation.status || "pending").toLowerCase()] ?? 0;
          const shouldImproveTarget = sourceRank > targetRank;
          if (shouldImproveTarget) {
            await supabase
              .from("invitations")
              .update({
                status: invitationItem.status,
                responded_at: invitationItem.responded_at,
                guest_display_name: targetGuestName || targetInvitation.guest_display_name
              })
              .eq("id", targetInvitation.id)
              .eq("host_user_id", session.user.id);
          }
          await supabase
            .from("invitations")
            .delete()
            .eq("id", invitationItem.id)
            .eq("host_user_id", session.user.id);
        } else {
          const { error: moveInvitationError } = await supabase
            .from("invitations")
            .update({ guest_id: targetGuest.id, guest_display_name: targetGuestName })
            .eq("id", invitationItem.id)
            .eq("host_user_id", session.user.id);
          if (moveInvitationError) {
            throw moveInvitationError;
          }
        }
      }

      const expenseSharesResult = await supabase
        .from("expense_shares")
        .select("id, expense_id, guest_id, share_amount, status, payment_link, paid_at")
        .eq("host_user_id", session.user.id)
        .in("guest_id", [sourceGuest.id, targetGuest.id]);
      if (!expenseSharesResult.error) {
        const sourceShares = (expenseSharesResult.data || []).filter((item) => item.guest_id === sourceGuest.id);
        const targetSharesByExpenseId = Object.fromEntries(
          (expenseSharesResult.data || [])
            .filter((item) => item.guest_id === targetGuest.id)
            .map((item) => [item.expense_id, item])
        );
        for (const sourceShare of sourceShares) {
          const targetShare = targetSharesByExpenseId[sourceShare.expense_id] || null;
          if (targetShare) {
            const sourceStatus = String(sourceShare.status || "pending").toLowerCase();
            const targetStatus = String(targetShare.status || "pending").toLowerCase();
            if (targetStatus !== "paid" && sourceStatus === "paid") {
              await supabase
                .from("expense_shares")
                .update({
                  status: sourceShare.status,
                  paid_at: sourceShare.paid_at || targetShare.paid_at,
                  payment_link: targetShare.payment_link || sourceShare.payment_link,
                  share_amount: Number(targetShare.share_amount || 0) >= Number(sourceShare.share_amount || 0)
                    ? targetShare.share_amount
                    : sourceShare.share_amount
                })
                .eq("id", targetShare.id)
                .eq("host_user_id", session.user.id);
            }
            await supabase.from("expense_shares").delete().eq("id", sourceShare.id).eq("host_user_id", session.user.id);
          } else {
            await supabase
              .from("expense_shares")
              .update({ guest_id: targetGuest.id })
              .eq("id", sourceShare.id)
              .eq("host_user_id", session.user.id);
          }
        }
      } else if (!isMissingRelationError(expenseSharesResult.error, "expense_shares")) {
        throw expenseSharesResult.error;
      }

      const consentsMoveResult = await supabase
        .from("consents")
        .update({ guest_id: targetGuest.id })
        .eq("guest_id", sourceGuest.id)
        .eq("host_user_id", session.user.id);
      if (consentsMoveResult.error && !isMissingRelationError(consentsMoveResult.error, "consents")) {
        throw consentsMoveResult.error;
      }

      const notesResult = await supabase
        .from("host_guest_private_notes")
        .select("guest_id, host_user_id, notes, seating_notes, decor_notes, playlist_notes, gift_notes")
        .in("guest_id", [sourceGuest.id, targetGuest.id])
        .eq("host_user_id", session.user.id);
      if (!notesResult.error) {
        const sourceNotes = (notesResult.data || []).find((item) => item.guest_id === sourceGuest.id) || null;
        const targetNotes = (notesResult.data || []).find((item) => item.guest_id === targetGuest.id) || null;
        if (sourceNotes && targetNotes) {
          await supabase
            .from("host_guest_private_notes")
            .update({
              notes: toNullable(targetNotes.notes || sourceNotes.notes),
              seating_notes: toNullable(targetNotes.seating_notes || sourceNotes.seating_notes),
              decor_notes: toNullable(targetNotes.decor_notes || sourceNotes.decor_notes),
              playlist_notes: toNullable(targetNotes.playlist_notes || sourceNotes.playlist_notes),
              gift_notes: toNullable(targetNotes.gift_notes || sourceNotes.gift_notes)
            })
            .eq("guest_id", targetGuest.id)
            .eq("host_user_id", session.user.id);
          await supabase.from("host_guest_private_notes").delete().eq("guest_id", sourceGuest.id).eq("host_user_id", session.user.id);
        } else if (sourceNotes && !targetNotes) {
          await supabase
            .from("host_guest_private_notes")
            .update({ guest_id: targetGuest.id })
            .eq("guest_id", sourceGuest.id)
            .eq("host_user_id", session.user.id);
        }
      } else if (!isMissingRelationError(notesResult.error, "host_guest_private_notes")) {
        throw notesResult.error;
      }

      const linksResult = await supabase
        .from("host_guest_profile_links")
        .select("guest_id")
        .in("guest_id", [sourceGuest.id, targetGuest.id]);
      if (!linksResult.error) {
        const hasSourceLink = Boolean((linksResult.data || []).find((item) => item.guest_id === sourceGuest.id));
        const hasTargetLink = Boolean((linksResult.data || []).find((item) => item.guest_id === targetGuest.id));
        if (hasSourceLink && hasTargetLink) {
          await supabase.from("host_guest_profile_links").delete().eq("guest_id", sourceGuest.id);
        } else if (hasSourceLink && !hasTargetLink) {
          await supabase.from("host_guest_profile_links").update({ guest_id: targetGuest.id }).eq("guest_id", sourceGuest.id);
        }
      } else if (!isMissingRelationError(linksResult.error, "host_guest_profile_links")) {
        throw linksResult.error;
      }

      const { error: deleteSourceGuestError } = await supabase
        .from("guests")
        .delete()
        .eq("id", sourceGuest.id)
        .eq("host_user_id", session.user.id);
      if (deleteSourceGuestError) {
        throw deleteSourceGuestError;
      }

      if (editingGuestId === sourceGuest.id) {
        setEditingGuestId(targetGuest.id);
      }
      if (selectedGuestDetailId === sourceGuest.id) {
        setSelectedGuestDetailId(targetGuest.id);
      }
      setGuestMessage(
        interpolateText(t("merge_guest_success"), {
          source: `${sourceGuest.first_name || ""} ${sourceGuest.last_name || ""}`.trim() || t("field_guest"),
          target: `${targetGuest.first_name || ""} ${targetGuest.last_name || ""}`.trim() || t("field_guest")
        })
      );
      setGuestMergeSourceId("");
      setGuestMergeTargetId("");
      setGuestMergeSearch("");
      await loadDashboardData();
    } catch (error) {
      setGuestMessage(`${t("merge_guest_error")} ${String(error?.message || "")}`);
    } finally {
      setIsMergingGuest(false);
    }
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
  const hostAvatarUrl = getGuestAvatarUrl(selfGuestCandidate, hostDisplayName);
  const guestPhotoInputValue = isDataImageUrl(guestPhotoUrl) ? "" : guestPhotoUrl;
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
  const globalShareTargetsByHostId = useMemo(
    () =>
      Object.fromEntries(
        globalShareTargetsVisible.map((targetItem) => [targetItem.host_user_id, targetItem])
      ),
    [globalShareTargetsVisible]
  );
  const globalShareHistoryItems = useMemo(
    () =>
      globalShareHistory.map((entry) => {
        const granteeUserId = String(entry?.payload?.grantee_user_id || "").trim();
        const targetItem = globalShareTargetsByHostId[granteeUserId];
        return {
          ...entry,
          granteeUserId,
          hostName: targetItem?.host_name || t("host_default_name"),
          hostEmail: targetItem?.host_email || granteeUserId || "—"
        };
      }),
    [globalShareHistory, globalShareTargetsByHostId, t]
  );
  const integrationChecks = useMemo(() => {
    if (!integrationStatus) {
      return [];
    }
    return [
      {
        key: "table_global_guest_profiles",
        label: t("integration_check_table_global_guest_profiles"),
        ok: Boolean(integrationStatus.has_table_global_guest_profiles)
      },
      {
        key: "table_host_guest_profile_links",
        label: t("integration_check_table_host_guest_profile_links"),
        ok: Boolean(integrationStatus.has_table_host_guest_profile_links)
      },
      {
        key: "table_global_guest_profile_shares",
        label: t("integration_check_table_global_guest_profile_shares"),
        ok: Boolean(integrationStatus.has_table_global_guest_profile_shares)
      },
      {
        key: "rpc_get_or_create",
        label: t("integration_check_rpc_get_or_create"),
        ok: Boolean(integrationStatus.has_fn_get_or_create_global_profile)
      },
      {
        key: "rpc_link_one",
        label: t("integration_check_rpc_link_guest"),
        ok: Boolean(integrationStatus.has_fn_link_guest)
      },
      {
        key: "rpc_link_all",
        label: t("integration_check_rpc_link_all"),
        ok: Boolean(integrationStatus.has_fn_link_all_guests)
      },
      {
        key: "rpc_share_targets",
        label: t("integration_check_rpc_share_targets"),
        ok: Boolean(integrationStatus.has_fn_share_targets)
      },
      {
        key: "rpc_set_share",
        label: t("integration_check_rpc_set_share"),
        ok: Boolean(integrationStatus.has_fn_set_share)
      },
      {
        key: "rpc_runtime_probe",
        label: t("integration_check_runtime_probe"),
        ok: Boolean(integrationStatus.share_targets_probe_ok)
      }
    ];
  }, [integrationStatus, t]);
  const integrationChecksOkCount = integrationChecks.filter((item) => item.ok).length;
  const integrationChecksTotal = integrationChecks.length;
  const integrationShareTargetCount = Number.isFinite(Number(integrationStatus?.share_target_count))
    ? Number(integrationStatus.share_target_count)
    : 0;
  const integrationSelfTargetCount = Number.isFinite(Number(integrationStatus?.self_target_count))
    ? Number(integrationStatus.self_target_count)
    : 0;
  const pendingGlobalShareScopes = useMemo(
    () => getGlobalShareVisibleScopes(pendingGlobalShareSave?.draft, t),
    [pendingGlobalShareSave, t]
  );
  const pendingGlobalSharePreset = pendingGlobalShareSave?.draft
    ? inferGlobalSharePreset(pendingGlobalShareSave.draft)
    : "private";
  const activeViewItem = VIEW_CONFIG.find((item) => item.key === activeView) || VIEW_CONFIG[0];
  const sectionHeader = useMemo(() => {
    const selectedGuestName =
      selectedGuestDetail
        ? `${selectedGuestDetail.first_name || ""} ${selectedGuestDetail.last_name || ""}`.trim() || t("guest_detail_title")
        : t("guest_detail_title");
    if (activeView === "overview") {
      return {
        eyebrow: "",
        title: interpolateText(t("dashboard_welcome"), { name: hostFirstName }),
        subtitle: t("dashboard_welcome_subtitle")
      };
    }
    if (activeView === "profile") {
      return {
        eyebrow: "",
        title: t("host_profile_title"),
        subtitle: t("host_profile_hint")
      };
    }
    if (activeView === "events") {
      if (eventsWorkspace === "create") {
        return {
          eyebrow: "",
          title: t("create_event_title"),
          subtitle: t("help_event_form")
        };
      }
      if (eventsWorkspace === "plan") {
        return {
          eyebrow: "",
          title: t("event_planner_title"),
          subtitle: t("event_planner_hint")
        };
      }
      if (eventsWorkspace === "detail") {
        return {
          eyebrow: "",
          title: selectedEventDetail?.title || t("event_detail_title"),
          subtitle: ""
        };
      }
      if (eventsWorkspace === "insights") {
        return {
          eyebrow: "",
          title: t("smart_hosting_title"),
          subtitle: t("smart_hosting_hint")
        };
      }
      return {
        eyebrow: "",
        title: t("nav_events"),
        subtitle: t("header_events_subtitle")
      };
    }
    if (activeView === "guests") {
      if (guestsWorkspace === "create") {
        return {
          eyebrow: "",
          title: t("create_guest_title"),
          subtitle: t("help_guest_form")
        };
      }
      if (guestsWorkspace === "detail") {
        return {
          eyebrow: "",
          title: selectedGuestName,
          subtitle: ""
        };
      }
      return {
        eyebrow: "",
        title: t("nav_guests"),
        subtitle: t("header_guests_subtitle")
      };
    }
    if (activeView === "invitations") {
      if (invitationsWorkspace === "create") {
        return {
          eyebrow: "",
          title: t("create_invitation_title"),
          subtitle: t("help_invitation_form")
        };
      }
      return {
        eyebrow: "",
        title: t("nav_invitations"),
        subtitle: t("header_invitations_subtitle")
      };
    }
    return {
      eyebrow: "",
      title: t(activeViewItem.labelKey),
      subtitle: t("dashboard_welcome_subtitle")
    };
  }, [
    activeView,
    activeViewItem.labelKey,
    eventsWorkspace,
    guestsWorkspace,
    hostFirstName,
    invitationsWorkspace,
    selectedEventDetail?.title,
    selectedGuestDetail,
    t
  ]);
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
        icon: "message",
        label: t("invitation_bulk_title"),
        onClick: openInvitationBulkWorkspace
      }
      : activeView === "guests" && guestsWorkspace === "latest"
        ? {
          icon: "link",
          label: t("contact_import_title"),
          onClick: handleOpenImportWizard
        }
        : null;
  const hideDashboardHeader =
    (activeView === "events" && ["detail", "plan"].includes(eventsWorkspace)) ||
    (activeView === "guests" && guestsWorkspace === "detail");

  return (
    <DashboardLayout
      hideHeader={hideDashboardHeader}
      t={t}
      themeMode={themeMode}
      setThemeMode={setThemeMode}
      language={language}
      setLanguage={setLanguage}
      session={session}
      onSignOut={onSignOut}
      hostDisplayName={hostDisplayName}
      hostInitials={hostInitials}
      hostAvatarUrl={hostAvatarUrl}
      unreadNotificationCount={unreadNotificationCount}
      isNotificationMenuOpen={isNotificationMenuOpen}
      setIsNotificationMenuOpen={setIsNotificationMenuOpen}
      recentActivityItems={recentActivityItems}
      activeView={activeView}
      changeView={changeView}
      VIEW_CONFIG={VIEW_CONFIG}
      isMenuOpen={isMenuOpen}
      toggleMobileMenu={toggleMobileMenu}
      closeMobileMenu={closeMobileMenu}
      contextualCreateAction={contextualCreateAction}
      contextualSecondaryAction={contextualSecondaryAction}
      openHostProfile={openHostProfile}
      notificationMenuRef={notificationMenuRef}
      statusClass={statusClass}
      sectionHeader={sectionHeader}
      interpolateText={interpolateText}
    >
      {/* Decorative blobs for glassmorphism layout background */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/5 rounded-full mix-blend-multiply filter blur-3xl opacity-70 pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-600/5 rounded-full mix-blend-multiply filter blur-3xl opacity-70 pointer-events-none -z-10"></div>

      {dashboardError ? <InlineMessage type="error" text={dashboardError} /> : null}

      {activeView === "overview" ? (
        <DashboardOverview
          t={t}
          openWorkspace={openWorkspace}
          events={events}
          latestEventPreview={latestEventPreview}
          guests={guests}
          latestGuestPreview={latestGuestPreview}
          invitations={invitations}
          pendingInvites={pendingInvites}
          pendingInvitationPreview={pendingInvitationPreview}
          respondedInvitesRate={respondedInvitesRate}
          respondedInvites={respondedInvites}
          answeredInvitationPreview={answeredInvitationPreview}
          upcomingEventsPreview={upcomingEventsPreview}
          openEventDetail={openEventDetail}
          interpolateText={interpolateText}
          statusClass={statusClass}
          statusText={statusText}
          hostDisplayName={hostDisplayName}
          hostInitials={hostInitials}
          hostAvatarUrl={hostAvatarUrl}
          convertedHostRate={convertedHostRate}
          hostMemberSinceLabel={hostMemberSinceLabel}
          hostRatingScore={hostRatingScore}
          recentActivityItems={recentActivityItems}
          hostPotentialGuestsCount={hostPotentialGuestsCount}
          invitedPotentialHostsCount={invitedPotentialHostsCount}
          convertedHostGuestsCount={convertedHostGuestsCount}
          conversionWindowCounts={conversionWindowCounts}
          conversionTrend14d={conversionTrend14d}
          conversionTrendMax={conversionTrendMax}
        />
      ) : null}

      {activeView === "profile" ? (
        <HostProfileView
          interpolateText={interpolateText}
          formatRelativeDate={formatRelativeDate}
          normalizeLookupValue={normalizeLookupValue}
          t={t}
          language={language}
          session={session}
          isProfileGuestLinked={isProfileGuestLinked}
          hostGuestProfilePercent={hostGuestProfilePercent}
          hostGuestProfileCompletedCount={hostGuestProfileCompletedCount}
          hostGuestProfileTotalCount={hostGuestProfileTotalCount}
          hostGuestProfileSignals={hostGuestProfileSignals}
          profileLinkedGuestId={profileLinkedGuestId}
          openGuestAdvancedEditor={openGuestAdvancedEditor}
          syncHostGuestProfileForm={syncHostGuestProfileForm}
          isGlobalProfileClaimed={isGlobalProfileClaimed}
          isGlobalProfileFeatureReady={isGlobalProfileFeatureReady}
          handleClaimGlobalProfile={handleClaimGlobalProfile}
          isClaimingGlobalProfile={isClaimingGlobalProfile}
          handleLinkProfileGuestToGlobal={handleLinkProfileGuestToGlobal}
          isLinkingGlobalGuest={isLinkingGlobalGuest}
          handleLinkAllGuestsToGlobalProfiles={handleLinkAllGuestsToGlobalProfiles}
          isLinkingAllGlobalGuests={isLinkingAllGlobalGuests}
          globalShareTargetsVisible={globalShareTargetsVisible}
          handleApplyGlobalShareAction={handleApplyGlobalShareAction}
          isPausingGlobalShares={isPausingGlobalShares}
          isRevokingGlobalShares={isRevokingGlobalShares}
          globalProfileId={globalProfileId}
          globalShareActiveCount={globalShareActiveCount}
          globalShareSelfTargetCount={globalShareSelfTargetCount}
          globalShareDraftByHostId={globalShareDraftByHostId}
          inferGlobalSharePreset={inferGlobalSharePreset}
          statusClass={statusClass}
          handleApplyGlobalSharePreset={handleApplyGlobalSharePreset}
          handleChangeGlobalShareDraft={handleChangeGlobalShareDraft}
          previewGlobalShareHostId={previewGlobalShareHostId}
          setPreviewGlobalShareHostId={setPreviewGlobalShareHostId}
          handleRequestSaveGlobalShare={handleRequestSaveGlobalShare}
          savingGlobalShareHostId={savingGlobalShareHostId}
          globalShareHistoryItems={globalShareHistoryItems}
          isLoadingGlobalShareHistory={isLoadingGlobalShareHistory}
          formatGlobalShareEventType={formatGlobalShareEventType}
          globalProfileMessage={globalProfileMessage}
          isIntegrationDebugEnabled={isIntegrationDebugEnabled}
          integrationChecksTotal={integrationChecksTotal}
          integrationChecksOkCount={integrationChecksOkCount}
          isIntegrationPanelOpen={isIntegrationPanelOpen}
          setIsIntegrationPanelOpen={setIsIntegrationPanelOpen}
          loadIntegrationStatusData={loadIntegrationStatusData}
          isLoadingIntegrationStatus={isLoadingIntegrationStatus}
          integrationStatus={integrationStatus}
          integrationShareTargetCount={integrationShareTargetCount}
          integrationSelfTargetCount={integrationSelfTargetCount}
          integrationChecks={integrationChecks}
          integrationStatusMessage={integrationStatusMessage}
          handleSaveHostProfile={handleSaveHostProfile}
          hostProfileName={hostProfileName}
          setHostProfileName={setHostProfileName}
          hostProfilePhone={hostProfilePhone}
          setHostProfilePhone={setHostProfilePhone}
          hostProfileCity={hostProfileCity}
          setHostProfileCity={setHostProfileCity}
          hostProfileCountry={hostProfileCountry}
          setHostProfileCountry={setHostProfileCountry}
          hostProfileRelationship={hostProfileRelationship}
          setHostProfileRelationship={setHostProfileRelationship}
          relationshipOptions={relationshipOptions}
          cityOptions={cityOptions}
          countryOptions={countryOptions}
          isSavingHostProfile={isSavingHostProfile}
          hostProfileMessage={hostProfileMessage}
          handleSaveGuest={handleSaveGuest}
          guestFirstName={guestFirstName}
          setGuestFirstName={setGuestFirstName}
          guestErrors={guestErrors}
          guestLastName={guestLastName}
          setGuestLastName={setGuestLastName}
          guestPhotoUrl={guestPhotoUrl}
          guestPhotoInputValue={guestPhotoInputValue}
          handleGuestPhotoUrlChange={handleGuestPhotoUrlChange}
          handleGuestPhotoFileChange={handleGuestPhotoFileChange}
          handleRemoveGuestPhoto={handleRemoveGuestPhoto}
          guestEmail={guestEmail}
          guestPhone={guestPhone}
          setGuestPhone={setGuestPhone}
          guestRelationship={guestRelationship}
          setGuestRelationship={setGuestRelationship}
          guestCity={guestCity}
          setGuestCity={setGuestCity}
          guestCountry={guestCountry}
          setGuestCountry={setGuestCountry}
          guestAdvanced={guestAdvanced}
          setGuestAdvancedField={setGuestAdvancedField}
          selectedGuestAddressPlace={selectedGuestAddressPlace}
          setSelectedGuestAddressPlace={setSelectedGuestAddressPlace}
          mapsStatus={mapsStatus}
          mapsError={mapsError}
          isGuestAddressLoading={isGuestAddressLoading}
          guestAddressPredictions={guestAddressPredictions}
          handleSelectGuestAddressPrediction={handleSelectGuestAddressPrediction}
          isSavingGuest={isSavingGuest}
          isEditingGuest={isEditingGuest}
          guestMessage={guestMessage}
          openGuestDetail={openGuestDetail}
          openWorkspace={openWorkspace}
        />
      ) : null}

      {activeView === "events" ? (
        <section className="workspace-shell view-transition">
          {eventsWorkspace === "hub" ? (
            <div className="workspace-card-grid">
              {WORKSPACE_ITEMS.events
                .filter((item) => !["hub", "create", "plan"].includes(item.key))
                .map((workspaceItem) => (
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
                      onClick={() => openWorkspace("events", workspaceItem.key)}
                    >
                      {t("workspace_open")}
                    </button>
                  </article>
                ))}
            </div>
          ) : (
            <div key={`events-${eventsWorkspace}`} className="dashboard-grid single-section workspace-content">
              {eventsWorkspace === "create" ? (
                <EventBuilderView
                  t={t}
                  language={language}
                  timezone={timezone}
                  handleSaveEvent={handleSaveEvent}
                  isSavingEvent={isSavingEvent}
                  isEditingEvent={isEditingEvent}
                  handleCancelEditEvent={handleCancelEditEvent}
                  eventTemplates={eventTemplates}
                  activeEventTemplateKey={activeEventTemplateKey}
                  handleApplyEventTemplate={handleApplyEventTemplate}
                  eventTitle={eventTitle}
                  setEventTitle={setEventTitle}
                  eventErrors={eventErrors}
                  eventDescription={eventDescription}
                  setEventDescription={setEventDescription}
                  eventType={eventType}
                  setEventType={setEventType}
                  eventTypeOptions={eventTypeOptions}
                  eventStatus={eventStatus}
                  setEventStatus={setEventStatus}
                  eventStartAt={eventStartAt}
                  setEventStartAt={setEventStartAt}
                  eventLocationName={eventLocationName}
                  setEventLocationName={setEventLocationName}
                  eventLocationAddress={eventLocationAddress}
                  setEventLocationAddress={setEventLocationAddress}
                  mapsStatus={mapsStatus}
                  mapsError={mapsError}
                  addressPredictions={addressPredictions}
                  isAddressLoading={isAddressLoading}
                  handleSelectAddressPrediction={handleSelectAddressPrediction}
                  selectedPlace={selectedPlace}
                  getMapEmbedUrl={getMapEmbedUrl}
                  eventPhaseProgress={eventPhaseProgress}
                  invitationCountForEditingEvent={invitationCountForEditingEvent}
                  editingEventId={editingEventId}
                  eventAllowPlusOne={eventAllowPlusOne}
                  setEventAllowPlusOne={setEventAllowPlusOne}
                  eventAutoReminders={eventAutoReminders}
                  setEventAutoReminders={setEventAutoReminders}
                  eventDressCode={eventDressCode}
                  setEventDressCode={setEventDressCode}
                  eventPlaylistMode={eventPlaylistMode}
                  setEventPlaylistMode={setEventPlaylistMode}
                  eventBuilderPlaybookActions={eventBuilderPlaybookActions}
                  handleApplySuggestedEventSettings={handleApplySuggestedEventSettings}
                  eventBuilderMealPlan={eventBuilderMealPlan}
                  handleCopyEventBuilderShoppingChecklist={handleCopyEventBuilderShoppingChecklist}
                  locationNameOptions={locationNameOptions}
                  locationAddressOptions={locationAddressOptions}
                  eventMessage={eventMessage}
                />
              ) : null}

              {eventsWorkspace === "latest" ? (
                <EventsListView
                  t={t}
                  eventSearch={eventSearch}
                  setEventSearch={setEventSearch}
                  eventSort={eventSort}
                  setEventSort={setEventSort}
                  eventPageSize={eventPageSize}
                  setEventPageSize={setEventPageSize}
                  eventsPageSizeDefault={EVENTS_PAGE_SIZE_DEFAULT}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  eventStatusFilter={eventStatusFilter}
                  setEventStatusFilter={setEventStatusFilter}
                  eventStatusCounts={eventStatusCounts}
                  filteredEvents={filteredEvents}
                  pagedEvents={pagedEvents}
                  eventInvitationSummaryByEventId={eventInvitationSummaryByEventId}
                  openEventDetail={openEventDetail}
                  openEventPlanById={openEventPlanById}
                  handleStartEditEvent={handleStartEditEvent}
                  handleRequestDeleteEvent={handleRequestDeleteEvent}
                  isDeletingEventId={isDeletingEventId}
                  toCatalogLabel={toCatalogLabel}
                  formatDate={formatDate}
                  language={language}
                  statusClass={statusClass}
                  statusText={statusText}
                  eventPage={eventPage}
                  eventTotalPages={eventTotalPages}
                  setEventPage={setEventPage}
                  mapsStatus={mapsStatus}
                  mapsError={mapsError}
                  orderedEventMapPoints={orderedEventMapPoints}
                  GeoPointsMapPanel={GeoPointsMapPanel}
                />
              ) : null}

              {eventsWorkspace === "detail" || eventsWorkspace === "plan" ? (
                <EventDetailView
                  eventsWorkspace={eventsWorkspace}
                  openWorkspace={openWorkspace}
                  handleBackToEventDetail={handleBackToEventDetail}
                  selectedEventDetail={selectedEventDetail}
                  t={t}
                  statusClass={statusClass}
                  statusText={statusText}
                  formatLongDate={formatLongDate}
                  language={language}
                  formatTimeLabel={formatTimeLabel}
                  handleOpenEventPlan={handleOpenEventPlan}
                  handleStartEditEvent={handleStartEditEvent}
                  selectedEventDetailPrimaryShare={selectedEventDetailPrimaryShare}
                  openInvitationCreate={openInvitationCreate}
                  selectedEventDetailInvitations={selectedEventDetailInvitations}
                  selectedEventDetailStatusCounts={selectedEventDetailStatusCounts}
                  invitationMessage={invitationMessage}
                  toCatalogLabel={toCatalogLabel}
                  formatDate={formatDate}
                  normalizeEventDressCode={normalizeEventDressCode}
                  normalizeEventPlaylistMode={normalizeEventPlaylistMode}
                  selectedEventChecklist={selectedEventChecklist}
                  selectedEventHealthAlerts={selectedEventHealthAlerts}
                  selectedEventHealthAlertsConfirmedCount={selectedEventHealthAlertsConfirmedCount}
                  selectedEventHealthAlertsPendingCount={selectedEventHealthAlertsPendingCount}
                  eventPlannerSectionRef={eventPlannerSectionRef}
                  interpolateText={interpolateText}
                  selectedEventMealPlan={selectedEventMealPlan}
                  selectedEventPlannerContextEffective={selectedEventPlannerContextEffective}
                  selectedEventPlannerSavedLabel={selectedEventPlannerSavedLabel}
                  selectedEventPlannerSnapshotVersion={selectedEventPlannerSnapshotVersion}
                  selectedEventPlannerSnapshotHistory={selectedEventPlannerSnapshotHistory}
                  selectedEventPlannerVariantSeed={selectedEventPlannerVariantSeed}
                  selectedEventPlannerTabSeed={selectedEventPlannerTabSeed}
                  selectedEventPlannerLastGeneratedByScope={selectedEventPlannerLastGeneratedByScope}
                  selectedEventPlannerGenerationState={selectedEventPlannerGenerationState}
                  handleOpenEventPlannerContext={handleOpenEventPlannerContext}
                  handleRegenerateEventPlanner={handleRegenerateEventPlanner}
                  handleRestoreEventPlannerSnapshot={handleRestoreEventPlannerSnapshot}
                  eventDetailPlannerTab={eventDetailPlannerTab}
                  handleExportEventPlannerShoppingList={handleExportEventPlannerShoppingList}
                  selectedEventDietTypesCount={selectedEventDietTypesCount}
                  selectedEventAllergiesCount={selectedEventAllergiesCount}
                  selectedEventMedicalConditionsCount={selectedEventMedicalConditionsCount}
                  selectedEventDietaryMedicalRestrictionsCount={selectedEventDietaryMedicalRestrictionsCount}
                  selectedEventCriticalRestrictions={selectedEventCriticalRestrictions}
                  selectedEventHealthRestrictionHighlights={selectedEventHealthRestrictionHighlights}
                  selectedEventRestrictionsCount={selectedEventRestrictionsCount}
                  selectedEventIntolerancesCount={selectedEventIntolerancesCount}
                  handleEventPlannerTabChange={handleEventPlannerTabChange}
                  selectedEventShoppingTotalIngredients={selectedEventShoppingTotalIngredients}
                  selectedEventEstimatedCostRange={selectedEventEstimatedCostRange}
                  selectedEventShoppingProgress={selectedEventShoppingProgress}
                  selectedEventShoppingItems={selectedEventShoppingItems}
                  selectedEventShoppingCheckedSet={selectedEventShoppingCheckedSet}
                  handleCopySelectedEventShoppingChecklist={handleCopySelectedEventShoppingChecklist}
                  handleMarkAllEventPlannerShoppingItems={handleMarkAllEventPlannerShoppingItems}
                  handleClearEventPlannerShoppingCheckedItems={handleClearEventPlannerShoppingCheckedItems}
                  eventPlannerShoppingFilter={eventPlannerShoppingFilter}
                  setEventPlannerShoppingFilter={setEventPlannerShoppingFilter}
                  selectedEventShoppingCounts={selectedEventShoppingCounts}
                  selectedEventShoppingGroupsFiltered={selectedEventShoppingGroupsFiltered}
                  handleToggleEventPlannerShoppingItem={handleToggleEventPlannerShoppingItem}
                  selectedEventHostPlaybook={selectedEventHostPlaybook}
                  handleCopyEventPlannerMessages={handleCopyEventPlannerMessages}
                  handleCopyEventPlannerPrompt={handleCopyEventPlannerPrompt}
                  getMapEmbedUrl={getMapEmbedUrl}
                  getGuestAvatarUrl={getGuestAvatarUrl}
                  selectedEventDetailGuests={selectedEventDetailGuests}
                  openGuestDetail={openGuestDetail}
                  handlePrepareInvitationShare={handlePrepareInvitationShare}
                  handleRequestDeleteInvitation={handleRequestDeleteInvitation}
                  selectedEventRsvpTimeline={selectedEventRsvpTimeline}
                />
              ) : null}

              {eventsWorkspace === "insights" ? (
                <section className="panel panel-wide">
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
                    <div className="stack-md">
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
                      <article className="recommendation-card">
                        <p className="item-title">{t("smart_hosting_playbook_title")}</p>
                        <p className="field-help">{t("smart_hosting_playbook_hint")}</p>
                        {insightsPlaybookActions.length > 0 ? (
                          <ul className="list recommendation-list">
                            {insightsPlaybookActions.map((item, index) => (
                              <li key={`${index}-${item}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="hint">{t("smart_hosting_empty")}</p>
                        )}
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
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => openWorkspace("guests", workspaceItem.key)}
                  >
                    {t("workspace_open")}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div key={`guests-${guestsWorkspace}`} className="dashboard-grid single-section workspace-content">
              {guestsWorkspace === "create" ? (
                <GuestBuilderView
                  t={t}
                  language={language}
                  canUseDeviceContacts={canUseDeviceContacts}
                  contactPickerUnsupportedReason={contactPickerUnsupportedReason}
                  handleFillGuestFromDeviceContact={handleFillGuestFromDeviceContact}
                  openFileImportFallback={openFileImportFallback}
                  contactImportDetailsRef={contactImportDetailsRef}
                  handlePickDeviceContacts={handlePickDeviceContacts}
                  handleImportGoogleContacts={handleImportGoogleContacts}
                  isImportingGoogleContacts={isImportingGoogleContacts}
                  canUseGoogleContacts={canUseGoogleContacts}
                  contactImportFileInputRef={contactImportFileInputRef}
                  handleImportContactsFile={handleImportContactsFile}
                  importContactsDraft={importContactsDraft}
                  setImportContactsDraft={setImportContactsDraft}
                  handlePreviewContactsFromDraft={handlePreviewContactsFromDraft}
                  handleClearImportContacts={handleClearImportContacts}
                  importContactsAnalysis={importContactsAnalysis}
                  importContactsReady={importContactsReady}
                  importContactsSelectedReady={importContactsSelectedReady}
                  importContactsStatusSummary={importContactsStatusSummary}
                  importDuplicateMode={importDuplicateMode}
                  handleImportDuplicateModeChange={handleImportDuplicateModeChange}
                  importContactsSearch={importContactsSearch}
                  setImportContactsSearch={setImportContactsSearch}
                  importContactsGroupFilter={importContactsGroupFilter}
                  setImportContactsGroupFilter={setImportContactsGroupFilter}
                  importContactsGroupOptions={importContactsGroupOptions}
                  importContactsPotentialFilter={importContactsPotentialFilter}
                  setImportContactsPotentialFilter={setImportContactsPotentialFilter}
                  importContactsSourceFilter={importContactsSourceFilter}
                  setImportContactsSourceFilter={setImportContactsSourceFilter}
                  importContactsSort={importContactsSort}
                  setImportContactsSort={setImportContactsSort}
                  IMPORT_CONTACTS_SORT_OPTIONS={IMPORT_CONTACTS_SORT_OPTIONS}
                  importContactsPageSize={importContactsPageSize}
                  setImportContactsPageSize={setImportContactsPageSize}
                  IMPORT_PREVIEW_PAGE_SIZE_DEFAULT={IMPORT_PREVIEW_PAGE_SIZE_DEFAULT}
                  IMPORT_PREVIEW_PAGE_SIZE_OPTIONS={IMPORT_PREVIEW_PAGE_SIZE_OPTIONS}
                  handleSelectSuggestedImportContacts={handleSelectSuggestedImportContacts}
                  handleSelectAllReadyImportContacts={handleSelectAllReadyImportContacts}
                  handleSelectHighPotentialImportContacts={handleSelectHighPotentialImportContacts}
                  handleSelectDualChannelImportContacts={handleSelectDualChannelImportContacts}
                  handleSelectDuplicateMergeImportContacts={handleSelectDuplicateMergeImportContacts}
                  handleApproveAllLowConfidenceMergeContacts={handleApproveAllLowConfidenceMergeContacts}
                  handleSelectFilteredReadyImportContacts={handleSelectFilteredReadyImportContacts}
                  handleSelectCurrentImportPageReady={handleSelectCurrentImportPageReady}
                  handleSelectOnlyNewImportContacts={handleSelectOnlyNewImportContacts}
                  handleClearReadyImportContactsSelection={handleClearReadyImportContactsSelection}
                  importContactsSuggested={importContactsSuggested}
                  interpolateText={interpolateText}
                  pagedImportContacts={pagedImportContacts}
                  selectedImportContactIds={selectedImportContactIds}
                  toggleImportContactSelection={toggleImportContactSelection}
                  handleOpenLowConfidenceMergeReview={handleOpenLowConfidenceMergeReview}
                  importContactsFiltered={importContactsFiltered}
                  importContactsPage={importContactsPage}
                  importContactsTotalPages={importContactsTotalPages}
                  setImportContactsPage={setImportContactsPage}
                  handleImportContacts={handleImportContacts}
                  isImportingContacts={isImportingContacts}
                  importContactsMessage={importContactsMessage}
                  handleSaveGuest={handleSaveGuest}
                  guestFirstName={guestFirstName}
                  setGuestFirstName={setGuestFirstName}
                  guestErrors={guestErrors}
                  guestLastName={guestLastName}
                  setGuestLastName={setGuestLastName}
                  guestPhotoUrl={guestPhotoUrl}
                  guestPhotoInputValue={guestPhotoInputValue}
                  handleGuestPhotoUrlChange={handleGuestPhotoUrlChange}
                  handleGuestPhotoFileChange={handleGuestPhotoFileChange}
                  handleRemoveGuestPhoto={handleRemoveGuestPhoto}
                  guestEmail={guestEmail}
                  setGuestEmail={setGuestEmail}
                  guestPhone={guestPhone}
                  setGuestPhone={setGuestPhone}
                  guestRelationship={guestRelationship}
                  setGuestRelationship={setGuestRelationship}
                  relationshipOptions={relationshipOptions}
                  guestCity={guestCity}
                  setGuestCity={setGuestCity}
                  guestCountry={guestCountry}
                  setGuestCountry={setGuestCountry}
                  guestAdvanced={guestAdvanced}
                  setGuestAdvancedField={setGuestAdvancedField}
                  guestAdvancedProfileCompleted={guestAdvancedProfileCompleted}
                  guestAdvancedProfileSignals={guestAdvancedProfileSignals}
                  guestAdvancedProfilePercent={guestAdvancedProfilePercent}
                  guestNextBirthday={guestNextBirthday}
                  handleCreateBirthdayEventFromGuest={handleCreateBirthdayEventFromGuest}
                  scrollToGuestAdvancedSection={scrollToGuestAdvancedSection}
                  guestPriorityCompleted={guestPriorityCompleted}
                  guestPriorityTotal={guestPriorityTotal}
                  guestPriorityPercent={guestPriorityPercent}
                  guestPriorityMissing={guestPriorityMissing}
                  getGuestAdvancedSectionFromPriorityKey={getGuestAdvancedSectionFromPriorityKey}
                  handleOpenGuestAdvancedPriority={handleOpenGuestAdvancedPriority}
                  guestAdvancedDetailsRef={guestAdvancedDetailsRef}
                  guestAdvancedToolbarRef={guestAdvancedToolbarRef}
                  guestAdvancedEditTabs={guestAdvancedEditTabs}
                  guestAdvancedSignalsBySection={guestAdvancedSignalsBySection}
                  guestAdvancedEditTab={guestAdvancedEditTab}
                  guestAdvancedCurrentStep={guestAdvancedCurrentStep}
                  guestAdvancedCurrentTabLabel={guestAdvancedCurrentTabLabel}
                  guestAdvancedCurrentChecklistDone={guestAdvancedCurrentChecklistDone}
                  guestAdvancedCurrentChecklistTotal={guestAdvancedCurrentChecklistTotal}
                  guestAdvancedCurrentChecklist={guestAdvancedCurrentChecklist}
                  isSavingGuest={isSavingGuest}
                  guestLastSavedLabel={guestLastSavedLabel}
                  handleGoToPreviousGuestAdvancedSection={handleGoToPreviousGuestAdvancedSection}
                  guestAdvancedPrevTab={guestAdvancedPrevTab}
                  handleSaveGuestDraft={handleSaveGuestDraft}
                  handleSaveAndGoNextPendingGuestAdvancedSection={handleSaveAndGoNextPendingGuestAdvancedSection}
                  guestAdvancedNextPendingTab={guestAdvancedNextPendingTab}
                  guestAdvancedNextPendingLabel={guestAdvancedNextPendingLabel}
                  handleGoToNextGuestAdvancedSection={handleGoToNextGuestAdvancedSection}
                  guestAdvancedNextTab={guestAdvancedNextTab}
                  handleGoToFirstPendingGuestAdvancedSection={handleGoToFirstPendingGuestAdvancedSection}
                  guestAdvancedFirstPendingTab={guestAdvancedFirstPendingTab}
                  guestAdvancedFirstPendingLabel={guestAdvancedFirstPendingLabel}
                  guestAdvancedSectionRefs={guestAdvancedSectionRefs}
                  setGuestErrors={setGuestErrors}
                  setGuestMessage={setGuestMessage}
                  selectedGuestAddressPlace={selectedGuestAddressPlace}
                  normalizeLookupValue={normalizeLookupValue}
                  setSelectedGuestAddressPlace={setSelectedGuestAddressPlace}
                  mapsStatus={mapsStatus}
                  mapsError={mapsError}
                  isGuestAddressLoading={isGuestAddressLoading}
                  guestAddressPredictions={guestAddressPredictions}
                  handleSelectGuestAddressPrediction={handleSelectGuestAddressPrediction}
                  eventTypeOptions={eventTypeOptions}
                  handleAdvancedMultiSelectChange={handleAdvancedMultiSelectChange}
                  dietTypeOptions={dietTypeOptions}
                  tastingPreferenceOptions={tastingPreferenceOptions}
                  drinkOptions={drinkOptions}
                  musicGenreOptions={musicGenreOptions}
                  colorOptions={colorOptions}
                  sportOptions={sportOptions}
                  dayMomentOptions={dayMomentOptions}
                  periodicityOptions={periodicityOptions}
                  punctualityOptions={punctualityOptions}
                  cuisineTypeOptions={cuisineTypeOptions}
                  petOptions={petOptions}
                  allergyOptions={allergyOptions}
                  intoleranceOptions={intoleranceOptions}
                  petAllergyOptions={petAllergyOptions}
                  medicalConditionOptions={medicalConditionOptions}
                  dietaryMedicalRestrictionOptions={dietaryMedicalRestrictionOptions}
                  cityOptions={cityOptions}
                  countryOptions={countryOptions}
                  isEditingGuest={isEditingGuest}
                  handleCancelEditGuest={handleCancelEditGuest}
                  guestMessage={guestMessage}
                  MultiSelectField={MultiSelectField}
                />
              ) : null}

              {guestsWorkspace === "latest" ? (
                <GuestsListView
                  t={t}
                  language={language}
                  guestSearch={guestSearch}
                  setGuestSearch={setGuestSearch}
                  guestSort={guestSort}
                  setGuestSort={setGuestSort}
                  guestPageSize={guestPageSize}
                  setGuestPageSize={setGuestPageSize}
                  PAGE_SIZE_OPTIONS={PAGE_SIZE_OPTIONS}
                  GUESTS_PAGE_SIZE_DEFAULT={GUESTS_PAGE_SIZE_DEFAULT}
                  guestContactFilter={guestContactFilter}
                  setGuestContactFilter={setGuestContactFilter}
                  filteredGuests={filteredGuests}
                  pagedGuests={pagedGuests}
                  hostPotentialGuestsCount={hostPotentialGuestsCount}
                  convertedHostGuestsCount={convertedHostGuestsCount}
                  pendingHostGuestsCount={pendingHostGuestsCount}
                  guestMessage={guestMessage}
                  guestHostConversionById={guestHostConversionById}
                  getConversionSource={getConversionSource}
                  getConversionSourceLabel={getConversionSourceLabel}
                  guestEventCountByGuestId={guestEventCountByGuestId}
                  guestSensitiveById={guestSensitiveById}
                  toCatalogLabels={toCatalogLabels}
                  uniqueValues={uniqueValues}
                  toCatalogLabel={toCatalogLabel}
                  getGuestAvatarUrl={getGuestAvatarUrl}
                  openGuestDetail={openGuestDetail}
                  handleStartEditGuest={handleStartEditGuest}
                  handleOpenMergeGuest={handleOpenMergeGuest}
                  handleCopyHostSignupLink={handleCopyHostSignupLink}
                  handleShareHostSignupLink={handleShareHostSignupLink}
                  handleRequestDeleteGuest={handleRequestDeleteGuest}
                  isDeletingGuestId={isDeletingGuestId}
                  guestPage={guestPage}
                  guestTotalPages={guestTotalPages}
                  setGuestPage={setGuestPage}
                  mapsStatus={mapsStatus}
                  mapsError={mapsError}
                  orderedGuestMapPoints={orderedGuestMapPoints}
                  GeoPointsMapPanel={GeoPointsMapPanel}
                />
              ) : null}

              {guestsWorkspace === "detail" ? (
                <GuestDetailView
                  t={t}
                  language={language}
                  openWorkspace={openWorkspace}
                  selectedGuestDetail={selectedGuestDetail}
                  getGuestAvatarUrl={getGuestAvatarUrl}
                  toCatalogLabel={toCatalogLabel}
                  handleStartEditGuest={handleStartEditGuest}
                  handleOpenMergeGuest={handleOpenMergeGuest}
                  handleRequestDeleteGuest={handleRequestDeleteGuest}
                  isDeletingGuestId={isDeletingGuestId}
                  selectedGuestDetailInvitations={selectedGuestDetailInvitations}
                  selectedGuestDetailStatusCounts={selectedGuestDetailStatusCounts}
                  selectedGuestDetailRespondedRate={selectedGuestDetailRespondedRate}
                  guestProfileTabs={guestProfileTabs}
                  guestProfileViewTab={guestProfileViewTab}
                  setGuestProfileViewTab={setGuestProfileViewTab}
                  selectedGuestDetailConversion={selectedGuestDetailConversion}
                  getConversionSource={getConversionSource}
                  getConversionSourceLabel={getConversionSourceLabel}
                  openInvitationCreate={openInvitationCreate}
                  handleCopyHostSignupLink={handleCopyHostSignupLink}
                  handleShareHostSignupLink={handleShareHostSignupLink}
                  handleLinkProfileGuestToGlobal={handleLinkProfileGuestToGlobal}
                  isLinkingGlobalGuest={isLinkingGlobalGuest}
                  selectedGuestDetailNotes={selectedGuestDetailNotes}
                  selectedGuestDetailTags={selectedGuestDetailTags}
                  selectedGuestFoodGroups={selectedGuestFoodGroups}
                  selectedGuestLifestyleGroups={selectedGuestLifestyleGroups}
                  selectedGuestActiveTabRecommendations={selectedGuestActiveTabRecommendations}
                  selectedGuestDetailPreference={selectedGuestDetailPreference}
                  selectedGuestAllergyLabels={selectedGuestAllergyLabels}
                  selectedGuestIntoleranceLabels={selectedGuestIntoleranceLabels}
                  selectedGuestPetAllergyLabels={selectedGuestPetAllergyLabels}
                  selectedGuestMedicalConditionLabels={selectedGuestMedicalConditionLabels}
                  selectedGuestDietaryMedicalRestrictionLabels={selectedGuestDietaryMedicalRestrictionLabels}
                  toList={toList}
                  formatDate={formatDate}
                  statusClass={statusClass}
                  statusText={statusText}
                  eventsById={eventsById}
                  eventNamesById={eventNamesById}
                  openEventDetail={openEventDetail}
                />
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {activeView === "invitations" ? (
        <section className="workspace-shell view-transition">
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
                    onClick={() => openWorkspace("invitations", workspaceItem.key)}
                  >
                    {t("workspace_open")}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div key={`invitations-${invitationsWorkspace}`} className="dashboard-grid single-section workspace-content">
              {invitationsWorkspace === "create" ? (
                <InvitationBuilderView
                  t={t}
                  handleCreateInvitation={handleCreateInvitation}
                  selectedEventId={selectedEventId}
                  setSelectedEventId={setSelectedEventId}
                  events={events}
                  invitationErrors={invitationErrors}
                  selectedGuestId={selectedGuestId}
                  setSelectedGuestId={setSelectedGuestId}
                  guests={guests}
                  allGuestsAlreadyInvitedForSelectedEvent={allGuestsAlreadyInvitedForSelectedEvent}
                  invitedGuestIdsForSelectedEvent={invitedGuestIdsForSelectedEvent}
                  bulkInvitationSearch={bulkInvitationSearch}
                  setBulkInvitationSearch={setBulkInvitationSearch}
                  INVITATION_BULK_SEGMENTS={INVITATION_BULK_SEGMENTS}
                  bulkInvitationSegment={bulkInvitationSegment}
                  setBulkInvitationSegment={setBulkInvitationSegment}
                  bulkSegmentCounts={bulkSegmentCounts}
                  handleSelectVisibleBulkGuests={handleSelectVisibleBulkGuests}
                  bulkFilteredGuests={bulkFilteredGuests}
                  handleClearBulkGuests={handleClearBulkGuests}
                  bulkInvitationGuestIds={bulkInvitationGuestIds}
                  toggleBulkInvitationGuest={toggleBulkInvitationGuest}
                  isCreatingInvitation={isCreatingInvitation}
                  handleCreateBulkInvitations={handleCreateBulkInvitations}
                  isCreatingBulkInvitations={isCreatingBulkInvitations}
                  invitationMessage={invitationMessage}
                  lastInvitationUrl={lastInvitationUrl}
                  handleCopyInvitationLink={handleCopyInvitationLink}
                  lastInvitationShareText={lastInvitationShareText}
                  handleCopyInvitationMessage={handleCopyInvitationMessage}
                  lastInvitationWhatsappUrl={lastInvitationWhatsappUrl}
                  lastInvitationEmailUrl={lastInvitationEmailUrl}
                />
              ) : null}

              {invitationsWorkspace === "latest" ? (
                <InvitationsListView
                  t={t}
                  language={language}
                  invitationSearch={invitationSearch}
                  setInvitationSearch={setInvitationSearch}
                  invitationSort={invitationSort}
                  setInvitationSort={setInvitationSort}
                  invitationPageSize={invitationPageSize}
                  setInvitationPageSize={setInvitationPageSize}
                  INVITATIONS_PAGE_SIZE_DEFAULT={INVITATIONS_PAGE_SIZE_DEFAULT}
                  PAGE_SIZE_OPTIONS={PAGE_SIZE_OPTIONS}
                  invitationEventFilter={invitationEventFilter}
                  setInvitationEventFilter={setInvitationEventFilter}
                  invitationEventOptions={invitationEventOptions}
                  invitationStatusFilter={invitationStatusFilter}
                  setInvitationStatusFilter={setInvitationStatusFilter}
                  filteredInvitations={filteredInvitations}
                  invitationMessage={invitationMessage}
                  openWorkspace={openWorkspace}
                  pagedInvitations={pagedInvitations}
                  eventNamesById={eventNamesById}
                  guestNamesById={guestNamesById}
                  guestsById={guestsById}
                  eventsById={eventsById}
                  buildInvitationSharePayload={buildInvitationSharePayload}
                  buildAppUrl={buildAppUrl}
                  getGuestAvatarUrl={getGuestAvatarUrl}
                  openGuestDetail={openGuestDetail}
                  openEventDetail={openEventDetail}
                  formatDate={formatDate}
                  statusClass={statusClass}
                  statusText={statusText}
                  handlePrepareInvitationShare={handlePrepareInvitationShare}
                  handleCopyInvitationLink={handleCopyInvitationLink}
                  handleRequestDeleteInvitation={handleRequestDeleteInvitation}
                  invitationPage={invitationPage}
                  invitationTotalPages={invitationTotalPages}
                  setInvitationPage={setInvitationPage}
                />
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {isImportWizardOpen ? createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-6 transition-opacity animate-in fade-in" onClick={handleCloseImportWizard}>
          <section
            className={`bg-white dark:bg-gray-900 sm:border border-black/10 dark:border-white/10 w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-8 sm:zoom-in-95 min-w-0 ${importWizardStep === 3 ? "sm:max-w-5xl" : "sm:max-w-2xl"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-wizard-title"
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER DEL MODAL */}
            <header className="flex items-start justify-between p-4 sm:p-6 md:p-8 border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
              <div className="flex flex-col gap-1 pr-4 mt-1 sm:mt-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">{importWizardStepLabel}</p>
                <h3 id="import-wizard-title" className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate">
                  {importWizardStepTitle}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">{importWizardStepHint}</p>
              </div>
              <button
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors shrink-0 outline-none focus:ring-2 focus:ring-blue-500/50 bg-black/5 dark:bg-white/5 sm:bg-transparent"
                type="button"
                onClick={handleCloseImportWizard}
                aria-label={t("close_modal")}
                title={t("close_modal")}
              >
                <Icon name="x" className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </header>

            {/* INDICADOR DE PASOS (WIZARD PROGRESS) */}
            <div className="flex items-center gap-2 px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-white dark:bg-gray-900 border-b border-black/5 dark:border-white/5 shrink-0 overflow-x-auto scrollbar-none" role="list" aria-label={importWizardStepLabel}>
              {Array.from({ length: IMPORT_WIZARD_STEP_TOTAL }).map((_, index) => {
                const stepNumber = index + 1;
                const isActive = importWizardStep === stepNumber;
                const isDone = importWizardStep > stepNumber;
                return (
                  <div key={`wizard-step-${stepNumber}`} className="flex items-center gap-2 shrink-0">
                    <span
                      role="listitem"
                      className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-sm ${isActive ? "bg-blue-600 text-white ring-4 ring-blue-500/20" : isDone ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 border border-gray-200 dark:border-gray-700"}`}
                    >
                      {isDone ? <Icon name="check" className="w-3 h-3 sm:w-4 sm:h-4" /> : stepNumber}
                    </span>
                    {stepNumber !== IMPORT_WIZARD_STEP_TOTAL && (
                      <div className={`w-4 sm:w-8 md:w-12 h-0.5 rounded-full ${isDone ? "bg-blue-200 dark:bg-blue-900/50" : "bg-gray-100 dark:bg-gray-800"}`}></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* BODY DEL MODAL */}
            <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar min-w-0 min-h-0">

              {/* PASO 1: SELECCIONAR FUENTE */}
              {importWizardStep === 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {importWizardSourceOptions.map((sourceItem) => (
                    <button
                      key={sourceItem.key}
                      type="button"
                      className={`flex flex-row sm:flex-col items-center sm:items-start text-left gap-4 p-4 sm:p-5 rounded-2xl border-2 transition-all outline-none group ${importWizardSource === sourceItem.key ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-md" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm"}`}
                      onClick={() => setImportWizardSource(sourceItem.key)}
                      aria-pressed={importWizardSource === sourceItem.key}
                    >
                      <div className={`p-3 rounded-xl shrink-0 ${importWizardSource === sourceItem.key ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400"} transition-colors`}>
                        <Icon name={sourceItem.icon} className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex flex-col gap-0.5 w-full">
                        <div className="flex items-center justify-between sm:justify-start gap-2">
                          <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">{sourceItem.title}</span>
                          {sourceItem.isRecommended ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0">
                              Rec.
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{sourceItem.hint}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* PASO 2: TABS MÓVILES */}
              {importWizardStep === 2 && isMobileImportExperience && importWizardSourceOptions.length > 1 ? (
                <div className="flex overflow-x-auto gap-2 pb-4 mb-4 border-b border-black/5 dark:border-white/10 scrollbar-none" role="tablist" aria-label={t("import_wizard_step_1_title")}>
                  {importWizardSourceOptions.map((sourceItem) => (
                    <button
                      key={`switch-${sourceItem.key}`}
                      type="button"
                      role="tab"
                      aria-selected={importWizardSource === sourceItem.key}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm border outline-none ${importWizardSource === sourceItem.key ? "bg-blue-600 text-white border-blue-700" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                      onClick={() => {
                        setImportContactsMessage("");
                        setImportWizardSource(sourceItem.key);
                      }}
                    >
                      <Icon name={sourceItem.icon} className="w-3.5 h-3.5" />
                      <span>{sourceItem.title}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* PASO 2: CSV / EXCEL */}
              {importWizardStep === 2 && importWizardSource === "csv" ? (
                <div className="flex flex-col gap-6">
                  {/* ESTADO 1: NO HAY ARCHIVO SUBIDO */}
                  {!importWizardUploadedFileName && !importContactsAnalysis.length ? (
                    <>
                      <label
                        className="flex flex-col items-center justify-center gap-3 p-8 sm:p-10 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl transition-colors cursor-pointer text-center group outline-none focus-within:ring-2 focus-within:ring-blue-500/50"
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleImportWizardDrop(event);
                        }}
                      >
                        <div className="p-4 bg-white dark:bg-gray-700 shadow-sm rounded-full text-gray-400 group-hover:text-blue-500 transition-colors">
                          <Icon name="folder" className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">{t("import_wizard_csv_drop_title")}</p>
                          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">{t("import_wizard_csv_drop_hint")}</p>
                        </div>
                        <span className="mt-2 px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:bg-gray-50 dark:group-hover:bg-gray-600 shadow-sm transition-colors">
                          {t("contact_import_open_file_button")}
                        </span>
                        <input
                          ref={contactImportFileInputRef}
                          type="file"
                          accept=".csv,.vcf,.vcard,text/csv,text/vcard"
                          onChange={handleImportContactsFile}
                          className="hidden"
                        />
                      </label>

                      <div className="flex items-center gap-4">
                        <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">O enganxa text</span>
                        <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                      </div>

                      <label className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("contact_import_paste_label")}</span>
                        <textarea
                          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none shadow-sm resize-y"
                          rows={3}
                          value={importContactsDraft}
                          onChange={(event) => setImportContactsDraft(event.target.value)}
                          placeholder={t("contact_import_paste_placeholder")}
                        />
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors" type="button" onClick={handlePreviewContactsFromDraft}>
                          {t("contact_import_preview_button")}
                        </button>
                        {importContactsDraft && (
                          <button className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl text-sm transition-colors" type="button" onClick={handleClearImportContacts}>
                            {t("contact_import_clear_button")}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    /* ESTADO 2: ARCHIVO SUBIDO CON ÉXITO (UX CLARA) */
                    <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-3xl gap-4 text-center animate-in fade-in zoom-in-95">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                        <Icon name="check" className="w-8 h-8 sm:w-10 sm:h-10" />
                      </div>
                      <div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 truncate max-w-full px-4">
                          {importWizardUploadedFileName || "Contactes processats"}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                          S'han trobat <strong>{importContactsAnalysis.length}</strong> contactes. Fes clic a <strong className="uppercase tracking-wider px-1">Següent</strong> per revisar-los a la taula.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearImportContacts}
                        className="mt-2 px-4 py-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        Cancel·lar i pujar un altre fitxer
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {/* PASO 2: GMAIL */}
              {importWizardStep === 2 && importWizardSource === "gmail" ? (
                <div className="flex flex-col items-center justify-center text-center gap-6 py-4 sm:py-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/10 rounded-full flex items-center justify-center text-blue-500 mb-2">
                    <Icon name="mail" className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <button
                    className="w-full sm:w-auto px-6 sm:px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-base sm:text-lg"
                    type="button"
                    onClick={() => handleImportGoogleContacts({ fromWizard: true })}
                    disabled={isImportingGoogleContacts || !canUseGoogleContacts}
                  >
                    <Icon name="sparkle" className="w-5 h-5" />
                    {isImportingGoogleContacts ? t("contact_import_google_loading") : t("contact_import_google_button")}
                  </button>
                  <div className="max-w-md flex flex-col gap-2">
                    <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">{t("import_wizard_gmail_privacy_note")}</p>
                    {!canUseGoogleContacts ? <p className="text-sm font-bold text-red-500">{t("contact_import_google_unconfigured")}</p> : null}
                  </div>
                  {importContactsAnalysis.length > 0 ? (
                    <p className="mt-2 sm:mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-xl text-sm font-bold border border-green-200 dark:border-green-800/30 animate-in fade-in">
                      <Icon name="check" className="w-4 h-4" /> {t("contact_import_preview_total")} {importContactsAnalysis.length} (Fes clic a Següent)
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* PASO 2: MÓVIL */}
              {importWizardStep === 2 && importWizardSource === "mobile" ? (
                <div className="flex flex-col gap-6">
                  {canUseDeviceContacts ? (
                    <article className="flex flex-col items-center text-center p-6 sm:p-8 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl gap-4">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Icon name="phone" className="w-7 h-7 sm:w-8 sm:h-8" />
                      </div>
                      <div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">{t("import_wizard_mobile_native_title")}</p>
                        <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">{t("import_wizard_mobile_native_hint")}</p>
                      </div>
                      <button
                        className="mt-2 w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                        type="button"
                        onClick={() => handlePickDeviceContacts({ fromWizard: true })}
                      >
                        <Icon name="sparkle" className="w-5 h-5" />
                        {t("contact_import_device_button")}
                      </button>
                    </article>
                  ) : (
                    <article className="flex flex-col items-center text-center p-6 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-3xl gap-3">
                      <Icon name="info" className="w-8 h-8 text-orange-500" />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white mb-1">
                          {isIOSDevice ? t("import_wizard_ios_recommendation_title") : t("import_wizard_mobile_fallback_title")}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {isIOSDevice ? t("import_wizard_ios_recommendation_hint") : t("import_wizard_mobile_fallback_hint")}
                        </p>
                        <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-2 bg-orange-100/50 dark:bg-orange-900/30 py-1 px-3 rounded-lg inline-block">{contactPickerUnsupportedReason}</p>
                      </div>
                      {isIOSDevice && canUseGoogleContacts ? (
                        <button className="mt-2 w-full sm:w-auto px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2" type="button" onClick={() => setImportWizardSource("gmail")}>
                          <Icon name="mail" className="w-4 h-4" />
                          {t("import_wizard_ios_use_google_action")}
                        </button>
                      ) : null}
                    </article>
                  )}

                  {!canUseDeviceContacts ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 mt-2">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white p-2 rounded-2xl shadow-md border border-gray-100 flex items-center justify-center relative overflow-hidden">
                          {importWizardQrDataUrl ? (
                            <img src={importWizardQrDataUrl} alt={t("import_wizard_mobile_qr_alt")} className="w-full h-full object-contain" />
                          ) : (
                            <div className="flex flex-col items-center text-gray-300">
                              <Icon name="phone" className="w-10 h-10 mb-2 opacity-50" />
                              <span className="text-[10px] text-center font-bold px-4">{t("import_wizard_mobile_qr_hint")}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium text-center max-w-[200px]">{t("import_wizard_mobile_qr_hint")}</p>
                      </div>

                      <div className="flex flex-col gap-3 w-full sm:w-auto">
                        <button
                          className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center sm:justify-start gap-2"
                          type="button"
                          onClick={handleShareImportWizardLink}
                        >
                          <Icon name="message" className="w-4 h-4" />
                          {t("import_wizard_mobile_share_action")}
                        </button>
                        <button
                          className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center sm:justify-start gap-2 disabled:opacity-50"
                          type="button"
                          onClick={() => handleImportGoogleContacts({ fromWizard: true })}
                          disabled={isImportingGoogleContacts || !canUseGoogleContacts}
                        >
                          <Icon name="mail" className="w-4 h-4" />
                          {isImportingGoogleContacts ? t("contact_import_google_loading") : t("contact_import_google_button")}
                        </button>

                        {!isMobileImportExperience ? (
                          <div className="mt-2 flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">O envia l'enllaç per correu</span>
                            <input
                              type="email"
                              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              value={importWizardShareEmail}
                              onChange={(event) => setImportWizardShareEmail(event.target.value)}
                              placeholder={t("placeholder_email")}
                            />
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors w-full mt-1" type="button" onClick={handleImportWizardEmailLink}>
                              {t("import_wizard_mobile_email_action")}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* PASO 3: REVISIÓN DE CONTACTOS Y TABLA */}
              {importWizardStep === 3 ? (
                <div className="flex flex-col gap-4 sm:gap-6 min-w-0">
                  {/* Tools Header */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <label className="flex-1 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("search")}</span>
                      <div className="relative">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="search"
                          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"
                          value={importContactsSearch}
                          onChange={(event) => setImportContactsSearch(event.target.value)}
                          placeholder={t("contact_import_filter_placeholder")}
                        />
                      </div>
                    </label>
                    <div className="flex flex-row gap-3 sm:gap-4">
                      <label className="flex flex-col gap-1.5 flex-1 sm:flex-none">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("pagination_items_per_page")}</span>
                        <select
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
                          value={importContactsPageSize}
                          onChange={(event) => setImportContactsPageSize(Number(event.target.value) || IMPORT_PREVIEW_PAGE_SIZE_DEFAULT)}
                        >
                          {IMPORT_PREVIEW_PAGE_SIZE_OPTIONS.map((optionValue) => (
                            <option key={optionValue} value={optionValue}>{optionValue}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 flex-1 sm:flex-none">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("contact_import_duplicate_mode_label")}</span>
                        <select
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
                          value={importDuplicateMode}
                          onChange={(event) => handleImportDuplicateModeChange(event.target.value)}
                        >
                          <option value="skip">{t("contact_import_duplicate_mode_skip")}</option>
                          <option value="merge">{t("contact_import_duplicate_mode_merge")}</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700 shadow-sm">
                      {t("contact_import_preview_total")} <span className="ml-1 text-black dark:text-white">{importContactsAnalysis.length}</span>
                    </span>
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-800/30 shadow-sm">
                      Seleccionats: <span className="ml-1 text-green-900 dark:text-green-200">{importContactsSelectedReady.length}</span>
                    </span>
                  </div>

                  {importContactsDuplicateCount > 0 ? (
                    <div className="flex items-start gap-3 p-3 sm:p-4 bg-orange-50 text-orange-800 dark:bg-orange-900/10 dark:text-orange-200 border border-orange-200 dark:border-orange-800/30 rounded-xl">
                      <Icon name="info" className="w-5 h-5 shrink-0 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm mb-0.5">{t("import_wizard_duplicates_title")}</p>
                        <p className="text-[11px] sm:text-xs opacity-90">
                          {interpolateText(t("import_wizard_duplicates_hint"), { count: importContactsDuplicateCount })}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Bulk Actions (Scroll horizontal en móvil si no caben) */}
                  <div className="flex overflow-x-auto gap-2 pt-1 pb-2 scrollbar-none">
                    <button className="whitespace-nowrap px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] sm:text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm transition-colors" type="button" onClick={handleSelectSuggestedImportContacts}>
                      {t("contact_import_select_suggested")}
                    </button>
                    <button className="whitespace-nowrap px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] sm:text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm transition-colors" type="button" onClick={handleSelectCurrentImportPageReady}>
                      {t("contact_import_select_page_ready")}
                    </button>
                    <button className="whitespace-nowrap px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] sm:text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm transition-colors" type="button" onClick={handleSelectAllReadyImportContacts}>
                      {t("contact_import_select_all_ready")}
                    </button>
                    <button className="whitespace-nowrap px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] sm:text-xs font-bold rounded-lg border border-red-100 dark:border-red-900/30 transition-colors sm:ml-auto" type="button" onClick={handleClearReadyImportContactsSelection}>
                      {t("contact_import_clear_selection")}
                    </button>
                  </div>

                  {/* 🚀 TABLA RESPONSIVE PREMIUM (Tarjetas en móvil, Columnas % en PC) */}
                  <div className="w-full mt-2">
                    <table className="w-full text-left border-collapse md:table-fixed">
                      {/* Cabecera: Oculta en móvil, visible en md */}
                      <thead className="hidden md:table-header-group bg-gray-50 dark:bg-gray-800/50 text-[10px] uppercase tracking-widest text-gray-500 font-bold border-y border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-4 py-3 w-[5%] text-center">
                            <Icon name="check" className="w-4 h-4 mx-auto opacity-50" />
                          </th>
                          <th className="px-4 py-3 w-[25%] truncate">{t("field_full_name")}</th>
                          <th className="px-4 py-3 w-[25%] truncate">{t("email")}</th>
                          <th className="px-4 py-3 w-[15%] truncate">{t("field_phone")}</th>
                          <th className="px-4 py-3 w-[15%] truncate">{t("field_city")}</th>
                          <th className="px-4 py-3 w-[15%] truncate">{t("status")}</th>
                        </tr>
                      </thead>

                      {/* Cuerpo: Flex Column (Tarjetas) en móvil, Table Rows en md */}
                      <tbody className="flex flex-col md:table-row-group gap-4 md:gap-0 text-sm">
                        {pagedImportContacts.map((contactItem) => {
                          const statusText = contactItem.duplicateExisting
                            ? contactItem.willMerge
                              ? t("contact_import_status_duplicate_merge")
                              : t("contact_import_status_duplicate_existing")
                            : contactItem.duplicateInPreview
                              ? t("contact_import_status_duplicate_file")
                              : contactItem.potentialLevel === "high"
                                ? t("contact_import_status_high_potential")
                                : contactItem.potentialLevel === "medium"
                                  ? t("contact_import_status_medium_potential")
                                  : t("contact_import_status_ready");

                          const statusColors = contactItem.duplicateExisting
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            : contactItem.duplicateInPreview
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : contactItem.potentialLevel === "high"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : contactItem.potentialLevel === "medium"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

                          return (
                            <tr key={contactItem.previewId} className="flex flex-col md:table-row bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 md:border-none md:border-b md:last:border-none rounded-2xl md:rounded-none shadow-sm md:shadow-none hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group overflow-hidden">

                              {/* CELDA 1: Checkbox (Solo PC, en móvil va con el nombre) */}
                              <td className="hidden md:table-cell px-4 py-3 text-center align-middle">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  checked={selectedImportContactIds.includes(contactItem.previewId)}
                                  disabled={!contactItem.canImport}
                                  onChange={() => toggleImportContactSelection(contactItem.previewId)}
                                />
                              </td>

                              {/* CELDA 2: Nombre (En móvil incluye el checkbox y fondo gris) */}
                              <td className="flex md:table-cell items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 md:bg-transparent border-b border-gray-200 dark:border-gray-700 md:border-none align-middle w-full md:w-auto">
                                {/* Mostrar Checkbox en móvil junto al nombre */}
                                <div className="md:hidden flex items-center shrink-0">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    checked={selectedImportContactIds.includes(contactItem.previewId)}
                                    disabled={!contactItem.canImport}
                                    onChange={() => toggleImportContactSelection(contactItem.previewId)}
                                  />
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white truncate block">
                                  {contactItem.firstName || t("field_guest")} {contactItem.lastName || ""}
                                </span>
                              </td>

                              {/* CELDA 3: Correo */}
                              <td className="flex md:table-cell justify-between items-center px-4 py-2.5 md:py-3 border-b border-gray-100 dark:border-gray-800 md:border-none align-middle w-full md:w-auto">
                                <span className="md:hidden text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0 mr-4">{t("email")}</span>
                                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px] md:max-w-full text-right md:text-left block">
                                  {contactItem.email || <span className="opacity-30">-</span>}
                                </span>
                              </td>

                              {/* CELDA 4: Teléfono */}
                              <td className="flex md:table-cell justify-between items-center px-4 py-2.5 md:py-3 border-b border-gray-100 dark:border-gray-800 md:border-none align-middle w-full md:w-auto">
                                <span className="md:hidden text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0 mr-4">{t("field_phone")}</span>
                                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px] md:max-w-full text-right md:text-left block">
                                  {contactItem.phone || <span className="opacity-30">-</span>}
                                </span>
                              </td>

                              {/* CELDA 5: Ciudad */}
                              <td className="flex md:table-cell justify-between items-center px-4 py-2.5 md:py-3 border-b border-gray-100 dark:border-gray-800 md:border-none align-middle w-full md:w-auto">
                                <span className="md:hidden text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0 mr-4">{t("field_city")}</span>
                                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px] md:max-w-full text-right md:text-left block">
                                  {[contactItem.city, contactItem.country].filter(Boolean).join(", ") || <span className="opacity-30">-</span>}
                                </span>
                              </td>

                              {/* CELDA 6: Estado */}
                              <td className="flex md:table-cell justify-between md:items-start items-center px-4 py-3 md:py-3 align-middle w-full md:w-auto">
                                <span className="md:hidden text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0 mr-4">{t("status")}</span>
                                <div className="flex flex-col gap-1 items-end md:items-start text-right md:text-left">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusColors} inline-block`}>
                                    {statusText}
                                  </span>
                                  {contactItem.duplicateExisting && contactItem.existingGuestName ? (
                                    <span className="text-[10px] text-gray-500 mt-0.5">
                                      {t("merge_guest_target_label")}: <strong className="text-gray-700 dark:text-gray-300">{contactItem.existingGuestName}</strong>
                                    </span>
                                  ) : null}
                                  {contactItem.requiresMergeApproval ? (
                                    <button
                                      className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:underline mt-0.5 whitespace-nowrap"
                                      type="button"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        handleOpenLowConfidenceMergeReview(contactItem.previewId);
                                      }}
                                    >
                                      {t("contact_import_merge_review_action")} →
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {importContactsFiltered.length > 0 ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-1 pb-2">
                      <p className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {t("pagination_page")} {Math.min(importContactsPage, importContactsTotalPages)} <span className="opacity-50">/ {importContactsTotalPages}</span>
                      </p>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                          type="button"
                          onClick={() => setImportContactsPage((prev) => Math.max(1, prev - 1))}
                          disabled={importContactsPage <= 1}
                        >
                          {t("pagination_prev")}
                        </button>
                        <button
                          className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                          type="button"
                          onClick={() => setImportContactsPage((prev) => Math.min(importContactsTotalPages, prev + 1))}
                          disabled={importContactsPage >= importContactsTotalPages}
                        >
                          {t("pagination_next")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* PASO 4: RESULTADO (ÉXITO) */}
              {importWizardStep === 4 ? (
                <div className="flex flex-col items-center justify-center text-center py-4 sm:py-8 gap-6 sm:gap-8">
                  <div className="relative">
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center relative z-10 ${importWizardResult.partial ? "bg-orange-100 text-orange-500 dark:bg-orange-900/30" : "bg-green-100 text-green-500 dark:bg-green-900/30"}`}>
                      <Icon name={importWizardResult.partial ? "alert_triangle" : "check"} className="w-10 h-10 sm:w-12 sm:h-12" />
                    </div>
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${importWizardResult.partial ? "bg-orange-500" : "bg-green-500"}`}></div>
                  </div>

                  <div className="w-full max-w-md bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                    <p className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 sm:mb-6">{t("import_wizard_result_progress_complete")}</p>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <article className="flex flex-col gap-1 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{importWizardResult.imported}</p>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Nous</p>
                      </article>
                      <article className="flex flex-col gap-1 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{importWizardResult.updated}</p>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Actualitzats</p>
                      </article>
                      <article className="flex flex-col gap-1 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className={`text-xl sm:text-2xl font-black ${importWizardResult.failed > 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}>{importWizardResult.failed}</p>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Errors</p>
                      </article>
                      <article className="flex flex-col gap-1 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{importWizardResult.skipped}</p>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Omesos</p>
                      </article>
                    </div>
                  </div>

                  {importWizardResult.partial ? (
                    <div className="flex flex-col gap-1 items-center max-w-md">
                      <p className="font-bold text-orange-600 dark:text-orange-400">{t("import_wizard_result_partial_title")}</p>
                      <p className="text-xs sm:text-sm text-gray-500 text-center">
                        {interpolateText(t("import_wizard_result_partial_hint"), { count: importWizardResult.failed })}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* ERROR MESSAGES IN FOOTER */}
            {(importWizardShareMessage || importContactsMessage) && (
              <div className="px-4 sm:px-6 md:px-8 pb-2 shrink-0">
                <InlineMessage text={importWizardShareMessage || importContactsMessage} />
              </div>
            )}

            {/* FOOTER WIZARD */}
            <footer className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 md:p-8 bg-gray-50/50 dark:bg-gray-800/50 border-t border-black/5 dark:border-white/10 shrink-0 mt-auto">
              <button
                className="w-full sm:w-auto px-6 py-3 sm:py-3.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-colors border border-gray-200 dark:border-gray-700 shadow-sm disabled:opacity-50"
                type="button"
                onClick={handleImportWizardBack}
                disabled={isImportingContacts}
              >
                {importWizardStep === 1 || importWizardStep === 4 ? t("cancel_action") : t("pagination_prev")}
              </button>

              <button
                className={`w-full sm:w-auto px-8 py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none flex items-center justify-center gap-2 relative overflow-hidden group ${importWizardCanContinue && importWizardStep === 2 ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900' : ''}`}
                type="button"
                onClick={handleImportWizardContinue}
                disabled={!importWizardCanContinue}
              >
                {importWizardCanContinue && importWizardStep === 2 && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {importWizardContinueLabel}
                  {importWizardStep !== 4 && <Icon name="arrow_right" className="w-4 h-4" />}
                </span>
              </button>
            </footer>
          </section>
        </div>,
        document.body
      ) : null}

      {isEventPlannerContextOpen ? (
        <Suspense fallback={null}>
          <EventPlannerContextModal
            isOpen={isEventPlannerContextOpen}
            onClose={() => {
              setIsEventPlannerContextOpen(false);
              setEventPlannerContextFocusField("");
            }}
            t={t}
            draft={eventPlannerContextDraft}
            setDraft={setEventPlannerContextDraft}
            focusField={eventPlannerContextFocusField}
            showTechnicalPrompt={showEventPlannerTechnicalPrompt}
            onToggleTechnicalPrompt={() => setShowEventPlannerTechnicalPrompt((prev) => !prev)}
            technicalPrompt={eventPlannerContextDraftPromptBundle.prompt}
            onGenerate={handleGenerateFullEventPlanFromContext}
            isGenerating={Boolean(selectedEventPlannerGenerationState?.isGenerating)}
          />
        </Suspense>
      ) : null}

      {guestMergeSource ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={handleCloseMergeGuest} aria-hidden="true"></div>

          <section
            className="relative z-10 w-full max-w-2xl bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-7 flex flex-col max-h-[90vh] animate-in fade-in-0 zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-guest-title"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between gap-4 pb-5 mb-5 border-b border-black/5 dark:border-white/5 shrink-0">
              <div className="flex flex-col gap-1">
                <h3 id="merge-guest-title" className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  {t("merge_guest_title")}
                </h3>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-relaxed">
                  {t("merge_guest_hint")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("merge_guest_source_label")}: <span className="font-bold text-gray-900 dark:text-white">{`${guestMergeSource.first_name || ""} ${guestMergeSource.last_name || ""}`.trim() || t("field_guest")}</span>
                </p>
              </div>
              <button onClick={handleCloseMergeGuest} className="p-1.5 -mr-1.5 -mt-6 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50" aria-label={t("cancel_action")}>
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto space-y-6 min-h-0 pr-1 scrollbar-thin">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pl-1">{t("search")}</span>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="search" className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type="search"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 text-sm focus:border-blue-500 focus:ring-blue-500/50 outline-none transition-all text-gray-900 dark:text-white"
                    value={guestMergeSearch}
                    onChange={(event) => setGuestMergeSearch(event.target.value)}
                    placeholder={t("merge_guest_search_placeholder")}
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pl-1">{t("merge_guest_target_label")}</span>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 text-sm focus:border-blue-500 focus:ring-blue-500/50 outline-none transition-all text-gray-900 dark:text-white disabled:opacity-50 appearance-none cursor-pointer"
                  value={guestMergeTargetId}
                  onChange={(event) => setGuestMergeTargetId(event.target.value)}
                  disabled={guestMergeCandidates.length === 0}
                >
                  {guestMergeCandidates.length === 0 ? (
                    <option value="">{t("merge_guest_no_candidates")}</option>
                  ) : null}
                  {guestMergeCandidates.map((guestItem) => (
                    <option key={guestItem.id} value={guestItem.id} className="text-gray-900 dark:bg-gray-800 dark:text-white">
                      {`${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest")}
                    </option>
                  ))}
                </select>
              </label>

              {guestMergeCandidates.length > 0 ? (
                <div className="border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5" role="list">
                  <ul className="divide-y divide-black/5 dark:divide-white/5">
                    {guestMergeCandidates.slice(0, 8).map((guestItem) => {
                      const guestName = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest");
                      const isActive = guestMergeTargetId === guestItem.id;
                      return (
                        <li key={`merge-candidate-${guestItem.id}`}>
                          <button
                            className={`w-full flex items-center gap-3 p-4 text-left transition-colors cursor-pointer group outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 ${isActive ? "bg-blue-50/50 dark:bg-blue-900/20" : "bg-white/70 hover:bg-white dark:bg-black/20 dark:hover:bg-white/5"}`}
                            type="button"
                            onClick={() => setGuestMergeTargetId(guestItem.id)}
                            aria-pressed={isActive}
                          >
                            <AvatarCircle size={36} label={guestName} fallback={guestName.charAt(0)} className={`shrink-0 transition-transform ${isActive ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900" : "group-hover:scale-105"}`} />
                            <div className="flex-1 min-w-0">
                              <span className={`block text-sm font-bold truncate ${isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>{guestName}</span>
                              <span className={`block text-xs truncate mt-0.5 ${isActive ? "text-blue-600/70 dark:text-blue-300/70" : "text-gray-500 dark:text-gray-400"}`}>
                                {[guestItem.email, guestItem.phone].filter(Boolean).join(" · ") || "—"}
                              </span>
                            </div>
                            <div className={`shrink-0 p-1.5 rounded-full border transition-colors ${isActive ? "border-blue-500 bg-blue-500 text-white" : "border-black/10 dark:border-white/10 group-hover:border-blue-500/50 text-transparent"}`}>
                              {isActive ? <Icon name="check" className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full" />}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Footer de Botones */}
            <div className="flex items-center justify-end gap-3.5 pt-5 mt-5 border-t border-black/5 dark:border-white/5 shrink-0">
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-black/20 hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all active:scale-95 disabled:opacity-50 outline-none focus:ring-2 focus:ring-blue-500/50"
                type="button"
                onClick={handleCloseMergeGuest}
                disabled={isMergingGuest}
              >
                {t("cancel_action")}
              </button>
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center min-w-[140px]"
                type="button"
                onClick={handleConfirmMergeGuest}
                disabled={isMergingGuest || !guestMergeTargetId}
              >
                {isMergingGuest ? (
                  <span className="flex items-center gap-2">
                    <Icon name="loader" className="w-4 h-4 animate-spin" />
                    {t("guest_merging")}
                  </span>
                ) : t("merge_guest_confirm")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingImportMergeApprovalItem ? (
        <div className="confirm-overlay" onClick={handleCloseLowConfidenceMergeReview}>
          <section
            className="confirm-dialog import-merge-review-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-merge-review-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="import-merge-review-title" className="item-title">
              {t("contact_import_merge_review_title")}
            </h3>
            <p className="item-meta">{t("contact_import_merge_review_hint")}</p>
            <div className="import-merge-review-head">
              <span className="status-pill status-event-draft">
                {t("contact_import_match_reason_label")}: {pendingImportMergeApprovalItem.duplicateReasonLabel || "—"}
              </span>
              <span className="status-pill status-maybe">
                {t("contact_import_merge_confidence_label")}:{" "}
                {t(`contact_import_merge_confidence_${pendingImportMergeApprovalItem.duplicateMergeConfidence || "low"}`)}
              </span>
            </div>
            <p className="item-meta">
              {interpolateText(t("contact_import_merge_review_summary"), { count: pendingImportMergeWillFillCount })}
            </p>
            <div className="import-merge-review-filters">
              <span className="label-title">{t("contact_import_merge_review_filter_label")}</span>
              <div className="list-filter-tabs list-filter-tabs-segmented" role="group" aria-label={t("contact_import_merge_review_filter_label")}>
                <button
                  className={`list-filter-tab ${importMergeReviewShowOnlyWillFill ? "active" : ""}`}
                  type="button"
                  onClick={() => setImportMergeReviewShowOnlyWillFill(true)}
                >
                  {t("contact_import_merge_review_filter_fill_only")}
                </button>
                <button
                  className={`list-filter-tab ${!importMergeReviewShowOnlyWillFill ? "active" : ""}`}
                  type="button"
                  onClick={() => setImportMergeReviewShowOnlyWillFill(false)}
                >
                  {t("contact_import_merge_review_filter_all")}
                </button>
              </div>
              <span className="item-meta import-merge-review-visible">
                {interpolateText(t("contact_import_merge_review_visible"), {
                  visible: pendingImportMergeVisibleCount,
                  total: pendingImportMergeTotalCount
                })}
              </span>
            </div>
            <div className="import-merge-review-table-wrap">
              <table className="import-merge-review-table">
                <thead>
                  <tr>
                    <th>{t("contact_import_merge_review_apply")}</th>
                    <th>{t("contact_import_merge_review_field")}</th>
                    <th>{t("contact_import_merge_review_source")}</th>
                    <th>{t("contact_import_merge_review_target")}</th>
                    <th>{t("contact_import_merge_review_result")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingImportMergeVisibleRows.map((rowItem) => (
                    <tr
                      key={`merge-review-${rowItem.label}`}
                      className={rowItem.willFill ? "import-merge-review-row is-will-fill" : "import-merge-review-row"}
                    >
                      <td className="import-merge-review-check">
                        <input
                          type="checkbox"
                          checked={pendingImportMergeSelectedFieldKeysSet.has(rowItem.fieldKey)}
                          disabled={!rowItem.willFill}
                          onChange={() => handleTogglePendingImportMergeFieldKey(rowItem.fieldKey)}
                        />
                      </td>
                      <th>{rowItem.label}</th>
                      <td>{formatMergeReviewValue(rowItem.source)}</td>
                      <td>{formatMergeReviewValue(rowItem.target)}</td>
                      <td>
                        <span className={`status-pill import-merge-review-result is-${rowItem.mergeResultKey}`}>
                          {t(`contact_import_merge_review_result_${rowItem.mergeResultKey}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pendingImportMergeVisibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="item-meta">
                        {t("contact_import_merge_review_no_rows")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="button-row">
              <button className="btn btn-ghost" type="button" onClick={handleCloseLowConfidenceMergeReview}>
                {t("cancel_action")}
              </button>
              <button
                className="btn"
                type="button"
                onClick={handleConfirmLowConfidenceMergeReview}
                disabled={pendingImportMergeSelectableCount > 0 && pendingImportMergeSelectedFieldKeys.length === 0}
              >
                {t("contact_import_merge_approve_contact")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingGlobalShareSave ? (
        <div className="confirm-overlay" onClick={() => setPendingGlobalShareSave(null)}>
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-share-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="confirm-share-title" className="item-title">
              {t("global_profile_share_confirm_title")}
            </h3>
            <p className="item-meta">{t("global_profile_share_confirm_hint")}</p>
            <p className="hint">
              {t("global_profile_share_confirm_target")}: {pendingGlobalShareSave.hostName}
            </p>
            <p className="hint">
              {t("global_profile_share_confirm_level")}:{" "}
              {pendingGlobalSharePreset === "basic"
                ? t("global_profile_share_preset_basic")
                : pendingGlobalSharePreset === "custom"
                  ? t("global_profile_share_preset_custom")
                  : t("global_profile_share_preset_private")}
            </p>
            <p className="hint">{t("global_profile_share_confirm_scopes")}</p>
            <div className="profile-summary-signals">
              {pendingGlobalShareScopes.length > 0 ? (
                pendingGlobalShareScopes.map((scopeLabel) => (
                  <span key={`pending-share-${scopeLabel}`} className="status-pill status-yes">
                    {scopeLabel}
                  </span>
                ))
              ) : (
                <span className="status-pill status-draft">{t("global_profile_share_confirm_scopes_none")}</span>
              )}
            </div>
            <div className="button-row">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setPendingGlobalShareSave(null)}
                disabled={savingGlobalShareHostId === pendingGlobalShareSave.hostUserId}
              >
                {t("cancel_action")}
              </button>
              <button
                className="btn"
                type="button"
                onClick={handleConfirmSaveGlobalShare}
                disabled={savingGlobalShareHostId === pendingGlobalShareSave.hostUserId}
              >
                {savingGlobalShareHostId === pendingGlobalShareSave.hostUserId
                  ? t("global_profile_share_confirm_saving")
                  : t("global_profile_share_confirm_apply")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay SIN onClick para evitar cierres accidentales en acción destructiva */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" aria-hidden="true"></div>

          <section
            className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-7 animate-in fade-in-0 zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Cabecera con Icono de Alerta */}
            <div className="flex items-start gap-4 pb-5 mb-5 border-b border-black/5 dark:border-white/5">
              <div className="shrink-0 p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl mt-1">
                <Icon name="trash" className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 id="confirm-delete-title" className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  {deleteTarget.type === "event"
                    ? t("delete_event_title")
                    : deleteTarget.type === "guest"
                      ? t("delete_guest_title")
                      : t("delete_invitation_title")}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                  {deleteTarget.type === "event"
                    ? t("delete_event_confirm")
                    : deleteTarget.type === "guest"
                      ? t("delete_guest_confirm")
                      : t("delete_invitation_confirm")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 bg-black/5 dark:bg-white/5 py-2 px-3 rounded-lg border border-black/5 dark:border-white/5">
                  <span className="uppercase tracking-wider font-bold mr-1">{t("selected_item")}:</span>{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {deleteTarget.type === "event"
                      ? deleteTarget.item?.title || "-"
                      : deleteTarget.type === "guest"
                        ? `${deleteTarget.item?.first_name || ""} ${deleteTarget.item?.last_name || ""}`.trim() || "-"
                        : deleteTarget.itemLabel || "-"}
                  </span>
                </p>
              </div>
            </div>

            {/* Footer de Botones */}
            <div className="flex items-center justify-end gap-3.5 pt-2">
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-black/20 hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all active:scale-95 disabled:opacity-50 outline-none focus:ring-2 focus:ring-gray-500/50"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleteConfirmLoading}
              >
                {t("cancel_action")}
              </button>
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 outline-none focus:ring-2 focus:ring-red-500/50 flex items-center justify-center min-w-[120px]"
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleteConfirmLoading}
              >
                {isDeleteConfirmLoading ? (
                  <span className="flex items-center gap-2">
                    <Icon name="loader" className="w-4 h-4 animate-spin" />
                    {t("deleting")}
                  </span>
                ) : t("confirm_delete")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export { DashboardScreen };
