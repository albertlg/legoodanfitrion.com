import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InlineMessage } from "../components/inline-message";
import { MultiSelectField } from "../components/forms/multi-select-field";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { GeoPointsMapPanel } from "../components/maps/geo-points-map-panel";
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
  formatShortDate, formatLongDate, formatTimeLabel, formatRelativeDate,
  getNextBirthdaySummary, getBirthdayEventDateTime, interpolateText, normalizeLookupValue,
  getInitials, uniqueValues, toList, splitListInput, listToInput
} from "../lib/formatters";

import {
  normalizeEmailKey, normalizePhoneKey, getMergedFieldValue, formatMergeReviewValue,
  buildGuestNameKey, buildGuestFullNameKey, buildGuestMatchingKeys,
  buildGuestDuplicateMatchScore, mergeUniqueListValues, tagImportedContacts,
  deriveGuestNameFromContact, deriveRelationshipCodeFromContact, splitFullName, normalizeDeviceContact,
  readImageFileAsDataUrl, isDataImageUrl, uploadGuestAvatarToStorage,
  getGuestAvatarUrl, getGuestPhotoValue, translateCatalogInputList,
  toPetAllergyLabels, INTOLERANCE_LOOKUP_SET, MEDICAL_CONDITION_LOOKUP_SET,
  DIETARY_MEDICAL_LOOKUP_SET, normalizeSensitiveRecord,
  hasGuestHealthAlerts, buildHostInvitePayload, inferGlobalSharePreset,
  formatGlobalShareEventType, getGlobalShareVisibleScopes
} from "../lib/guest-helpers";

import {
  EVENT_TYPE_TO_PLANNER_PRESET, EVENT_TYPE_TO_DEFAULT_HOUR, statusText, statusClass,
  getConversionSource, getConversionSourceLabel, getMapEmbedUrl, normalizeEventDressCode,
  normalizeEventPlaylistMode, normalizeEventSettings,
  getSuggestedEventSettingsFromInsights, buildHostingPlaybookActions,
  buildEventPlannerContext, buildEventMealPlan, applyPlannerOverrides, buildEventPlannerPromptBundle,
  buildEventHostPlaybook
} from "../lib/event-planner-helpers";

import {
  isCompatibilityError, isMissingRelationError, isMissingDbFeatureError, readEventSettingsCache,
  writeEventSettingsCache, readGuestGeoCache, writeGuestGeoCache
} from "../lib/system-helpers";
import {
  normalizeDashboardRouteState
} from "../router-utils";
import { useDashboardNavigationState } from "../hooks/useDashboardNavigationState";
import { useDashboardDataController } from "../hooks/useDashboardDataController";
import { useEventPlannerState } from "../hooks/useEventPlannerState";
import { useGlobalProfileData } from "../hooks/useGlobalProfileData";
import { useHostProfileGlobalShareController } from "../hooks/useHostProfileGlobalShareController";
import { useImportWizardController } from "../hooks/useImportWizardController";
import { useImportWizardState } from "../hooks/useImportWizardState";
import { useDashboardHeaderState } from "../hooks/useDashboardHeaderState";
import { Helmet } from "react-helmet-async";
import { DashboardModals } from "./dashboard/components/dashboard-modals";
const DashboardOverview = lazy(() =>
  import("../components/dashboard/DashboardOverview").then((module) => ({
    default: module.DashboardOverview
  }))
);
const HostProfileView = lazy(() =>
  import("./dashboard/components/host-profile-view").then((module) => ({
    default: module.HostProfileView
  }))
);
const EventsWorkspaceContainer = lazy(() =>
  import("./dashboard/components/events-workspace-container").then((module) => ({
    default: module.EventsWorkspaceContainer
  }))
);
const GuestsWorkspaceContainer = lazy(() =>
  import("./dashboard/components/guests-workspace-container").then((module) => ({
    default: module.GuestsWorkspaceContainer
  }))
);
const InvitationsWorkspaceContainer = lazy(() =>
  import("./dashboard/components/invitations-workspace-container").then((module) => ({
    default: module.InvitationsWorkspaceContainer
  }))
);

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
  onNavigateApp
}) {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid", []);
  const initialRouteState = useMemo(() => normalizeDashboardRouteState(appRoute), [appRoute]);
  const routeImportWizardSource = initialRouteState.importWizardSource || "";
  const {
    isMenuOpen,
    setIsMenuOpen,
    selectedEventDetailId,
    setSelectedEventDetailId,
    selectedGuestDetailId,
    setSelectedGuestDetailId,
    eventPlannerShoppingFilter,
    setEventPlannerShoppingFilter,
    openGuestAdvancedOnCreate,
    setOpenGuestAdvancedOnCreate,
    isCompactViewport,
    setIsCompactViewport
  } = useDashboardNavigationState(initialRouteState);
  const routeActiveView = initialRouteState.activeView;
  const routeEventsWorkspace = initialRouteState.eventsWorkspace;
  const routeGuestsWorkspace = initialRouteState.guestsWorkspace;
  const routeInvitationsWorkspace = initialRouteState.invitationsWorkspace;
  const routeEventPlannerTab = initialRouteState.eventPlannerTab || "menu";
  const routeGuestProfileTab = initialRouteState.guestProfileViewTab || "general";
  const routeGuestAdvancedTab = initialRouteState.guestAdvancedEditTab || "identity";
  const routeSelectedEventDetailId = initialRouteState.selectedEventDetailId || "";
  const routeSelectedGuestDetailId = initialRouteState.selectedGuestDetailId || "";

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
  const guestEditorHydratedIdRef = useRef("");
  const eventPlannerSectionRef = useRef(null);
  const contactImportDetailsRef = useRef(null);
  const contactImportFileInputRef = useRef(null);
  const notificationMenuRef = useRef(null);
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
  const globalShareTargetsVisible = useMemo(
    () => globalShareTargets.filter((item) => item?.host_user_id && item.host_user_id !== session?.user?.id),
    [globalShareTargets, session?.user?.id]
  );
  const globalShareSelfTargetCount = useMemo(
    () =>
      globalShareTargets.filter((item) => item?.host_user_id && item.host_user_id === session?.user?.id).length,
    [globalShareTargets, session?.user?.id]
  );
  const globalShareActiveCount = useMemo(
    () => globalShareTargetsVisible.filter((item) => String(item.share_status || "").toLowerCase() === "active").length,
    [globalShareTargetsVisible]
  );
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
    if (routeActiveView !== "guests" || routeGuestsWorkspace !== "latest") {
      setIsImportWizardOpen(false);
    }
  }, [routeActiveView, routeGuestsWorkspace, setIsImportWizardOpen]);
  useEffect(() => {
    if (routeActiveView !== "guests" || routeGuestsWorkspace !== "latest" || isImportWizardOpen) {
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
    routeActiveView,
    routeGuestsWorkspace,
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
  const {
    importContactsAnalysis,
    importContactsGroupOptions,
    importContactsFiltered,
    importContactsSuggested,
    importContactsReady,
    importContactsSelectedReady,
    importContactsStatusSummary,
    importContactsDuplicateCount,
    importWizardStepLabel,
    importWizardStepTitle,
    importWizardStepHint,
    importWizardContinueLabel,
    importWizardCanContinue,
    importContactsTotalPages,
    pagedImportContacts,
    pendingImportMergeApprovalItem,
    pendingImportMergeWillFillCount,
    pendingImportMergeVisibleRows,
    pendingImportMergeVisibleCount,
    pendingImportMergeTotalCount,
    pendingImportMergeSelectedFieldKeysSet,
    pendingImportMergeSelectableCount,
    handleImportWizardBack,
    handleImportWizardContinue,
    handleImportWizardEmailLink,
    handleShareImportWizardLink,
    handleSelectAllReadyImportContacts,
    handleSelectSuggestedImportContacts,
    handleClearReadyImportContactsSelection,
    handleSelectFilteredReadyImportContacts,
    handleSelectCurrentImportPageReady,
    handleSelectOnlyNewImportContacts,
    handleSelectHighPotentialImportContacts,
    handleSelectDualChannelImportContacts,
    handleImportDuplicateModeChange,
    handleTogglePendingImportMergeFieldKey,
    handleOpenLowConfidenceMergeReview,
    handleCloseLowConfidenceMergeReview,
    handleConfirmLowConfidenceMergeReview,
    handleApproveAllLowConfidenceMergeContacts,
    handleSelectDuplicateMergeImportContacts,
    toggleImportContactSelection
  } = useImportWizardController({
    t,
    language,
    buildAppUrl,
    importContactsPreview,
    importDuplicateMode,
    ownerGuestCandidateId: ownerGuestCandidate?.id,
    approvedLowConfidenceMergeIds,
    setApprovedLowConfidenceMergeIds,
    findExistingGuestForContact,
    guestsById,
    selectedImportContactIds,
    setSelectedImportContactIds,
    importContactsSearch,
    importContactsGroupFilter,
    importContactsPotentialFilter,
    importContactsSourceFilter,
    importContactsSort,
    importContactsPage,
    setImportContactsPage,
    importContactsPageSize,
    pendingImportMergeApprovalPreviewId,
    setPendingImportMergeApprovalPreviewId,
    importMergeReviewShowOnlyWillFill,
    setImportMergeReviewShowOnlyWillFill,
    pendingImportMergeSelectedFieldKeys,
    setPendingImportMergeSelectedFieldKeys,
    approvedLowConfidenceMergeFieldsByPreviewId,
    setApprovedLowConfidenceMergeFieldsByPreviewId,
    isImportWizardOpen,
    setIsImportWizardOpen,
    importWizardStep,
    setImportWizardStep,
    importWizardSource,
    importWizardResult,
    isImportingContacts,
    setImportContactsMessage,
    setImportDuplicateMode,
    handleCloseImportWizard,
    handleImportContacts,
    canUseNativeShare,
    importWizardShareEmail,
    setImportWizardShareMessage,
    setImportWizardQrDataUrl,
    activeView: routeActiveView,
    guestsWorkspace: routeGuestsWorkspace
  });
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
  const guestAdvancedCurrentTabIndex = GUEST_ADVANCED_EDIT_TABS.indexOf(routeGuestAdvancedTab);
  const guestAdvancedCurrentStep = guestAdvancedCurrentTabIndex >= 0 ? guestAdvancedCurrentTabIndex + 1 : 1;
  const guestAdvancedPrevTab =
    guestAdvancedCurrentTabIndex > 0 ? GUEST_ADVANCED_EDIT_TABS[guestAdvancedCurrentTabIndex - 1] : "";
  const guestAdvancedNextTab =
    guestAdvancedCurrentTabIndex >= 0 && guestAdvancedCurrentTabIndex < GUEST_ADVANCED_EDIT_TABS.length - 1
      ? GUEST_ADVANCED_EDIT_TABS[guestAdvancedCurrentTabIndex + 1]
      : "";
  const guestAdvancedCurrentTabLabel =
    guestAdvancedEditTabs.find((tabItem) => tabItem.key === routeGuestAdvancedTab)?.label ||
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
        (tabKey) => tabKey !== routeGuestAdvancedTab && !guestAdvancedSignalsBySection[tabKey]?.done
      ) || ""
    );
  }, [guestAdvancedCurrentTabIndex, routeGuestAdvancedTab, guestAdvancedSignalsBySection]);
  const guestAdvancedNextPendingLabel = guestAdvancedNextPendingTab
    ? guestAdvancedSignalsBySection[guestAdvancedNextPendingTab]?.label || ""
    : "";
  const guestAdvancedCurrentChecklist = useMemo(() => {
    if (routeGuestAdvancedTab === "identity") {
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
    if (routeGuestAdvancedTab === "food") {
      return [
        { key: "food_diet", label: t("field_diet_type"), done: Boolean(guestAdvanced.dietType.trim()) },
        { key: "food_likes", label: t("field_food_likes"), done: Boolean(splitListInput(guestAdvanced.foodLikes).length) },
        { key: "food_drinks", label: t("field_drink_likes"), done: Boolean(splitListInput(guestAdvanced.drinkLikes).length) }
      ];
    }
    if (routeGuestAdvancedTab === "lifestyle") {
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
    if (routeGuestAdvancedTab === "conversation") {
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
  }, [guestAdvanced, routeGuestAdvancedTab, guestCity, guestCountry, guestEmail, guestFirstName, guestPhone, guestRelationship, t]);
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
    const preferredEventId = routeSelectedEventDetailId || selectedEventDetailId;
    if (!preferredEventId) {
      return events[0] || null;
    }
    return eventsById[preferredEventId] || events[0] || null;
  }, [events, eventsById, routeSelectedEventDetailId, selectedEventDetailId]);
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
    const preferredGuestId = routeSelectedGuestDetailId || selectedGuestDetailId;
    if (!preferredGuestId) {
      return guests[0] || null;
    }
    return guestsById[preferredGuestId] || guests[0] || null;
  }, [guests, guestsById, routeSelectedGuestDetailId, selectedGuestDetailId]);
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
    selectedGuestTabRecommendations[routeGuestProfileTab] || null;
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

  const {
    mapShareTargetToDraft,
    isIntegrationDebugEnabled,
    loadIntegrationStatusData,
    refreshSharedProfileData
  } = useGlobalProfileData({
    supabase,
    sessionUserId: session?.user?.id,
    t,
    globalProfileId,
    setGlobalProfileId,
    setGlobalShareTargets,
    setGlobalShareDraftByHostId,
    setPreviewGlobalShareHostId,
    setIsGlobalProfileFeatureReady,
    setGlobalProfileMessage,
    setIsLoadingIntegrationStatus,
    setIntegrationStatusMessage,
    setIntegrationStatus,
    setGlobalShareHistory,
    setIsLoadingGlobalShareHistory,
    setIsIntegrationPanelOpen
  });

  const { loadDashboardData, isLoading } = useDashboardDataController({
    supabase,
    sessionUserId: session?.user?.id,
    sessionUserEmail: session?.user?.email,
    language,
    t,
    appRoute,
    onPreferencesSynced,
    refreshSharedProfileData,
    setDashboardError,
    setEvents,
    setEventSettingsCacheById,
    setGuests,
    setInvitations,
    setEventPlannerSnapshotsByEventId,
    setEventPlannerSnapshotHistoryByEventId,
    setEventPlannerRegenerationByEventId,
    setEventPlannerRegenerationByEventIdByTab,
    setEventPlannerContextOverridesByEventId,
    setGuestPreferencesById,
    setGuestSensitiveById,
    setGuestHostConversionById,
    setHostProfileName,
    setHostProfilePhone,
    setHostProfileCity,
    setHostProfileCountry,
    setHostProfileRelationship,
    setHostProfileCreatedAt
  });

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
      (routeActiveView === "guests" && routeGuestsWorkspace === "detail") ||
      (routeActiveView === "guests" && routeGuestsWorkspace === "create" && Boolean(editingGuestId));
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
  }, [routeActiveView, routeGuestsWorkspace, editingGuestId, guests, selectedGuestDetailId, setSelectedGuestDetailId]);

  useEffect(() => {
    if (routeActiveView !== "profile") {
      return;
    }
    if (guestFirstName || guestLastName || guestPhotoUrl || guestEmail || guestPhone || guestCity || guestCountry || guestRelationship) {
      return;
    }
    syncHostGuestProfileForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeActiveView]);
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
    if (!openGuestAdvancedOnCreate || routeActiveView !== "guests" || routeGuestsWorkspace !== "create") {
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
  }, [openGuestAdvancedOnCreate, routeActiveView, routeGuestsWorkspace, setOpenGuestAdvancedOnCreate]);

  useEffect(() => {
    if (routeActiveView !== "guests" || routeGuestsWorkspace !== "create") {
      guestEditorHydratedIdRef.current = "";
      return;
    }
    if (!routeSelectedGuestDetailId) {
      guestEditorHydratedIdRef.current = "";
      return;
    }
    if (guests.length === 0) {
      return;
    }
    const guestItem = guests.find((item) => item.id === routeSelectedGuestDetailId);
    if (!guestItem) {
      return;
    }
    if (guestEditorHydratedIdRef.current === guestItem.id) {
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
    setOpenGuestAdvancedOnCreate(true);
    guestEditorHydratedIdRef.current = guestItem.id;
  }, [
    routeActiveView,
    routeGuestsWorkspace,
    routeSelectedGuestDetailId,
    guests,
    language,
    getGuestAdvancedState,
    setOpenGuestAdvancedOnCreate
  ]);

  useEffect(() => {
    if (routeActiveView === "guests" && routeGuestsWorkspace === "create" && !editingGuestId) {
      setGuestLastSavedAt("");
    }
  }, [routeActiveView, routeGuestsWorkspace, editingGuestId]);

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
      if (typeof parsed?.bulkInvitationSegment === "string" && INVITATION_BULK_SEGMENTS.includes(parsed.bulkInvitationSegment)) {
        setBulkInvitationSegment(parsed.bulkInvitationSegment);
      }
    } catch {
      // Ignore malformed local settings and continue with defaults.
    }
    setPrefsReady(true);
  }, [prefsStorageKey]);

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

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMenuOpen((prev) => {
      const next = !prev;
      return next;
    });
  };

  const navigateAppPath = useCallback(
    (nextPath, options = {}) => {
      if (typeof onNavigateApp !== "function" || !nextPath) {
        return;
      }
      onNavigateApp(nextPath, options);
    },
    [onNavigateApp]
  );

  const markUserNavigationIntent = () => {
    // URL-driven routing: la intención de navegación se ejecuta directamente en navigateAppPath.
  };

  const openWorkspace = (viewKey, workspaceKey) => {
    markUserNavigationIntent();
    if (viewKey === "events" && workspaceKey === "create") {
      handleCancelEditEvent();
    }
    if (viewKey === "guests" && workspaceKey === "create") {
      handleCancelEditGuest();
    }
    if (viewKey === "events") {
      if (workspaceKey === "create") {
        navigateAppPath("/app/events/new");
      } else if (workspaceKey === "insights") {
        navigateAppPath("/app/events/insights");
      } else {
        navigateAppPath("/app/events");
      }
    } else if (viewKey === "guests") {
      if (workspaceKey === "create") {
        navigateAppPath("/app/guests/new/advanced/identity");
      } else {
        navigateAppPath("/app/guests");
      }
    } else if (viewKey === "invitations") {
      if (workspaceKey === "create") {
        navigateAppPath("/app/invitations/new");
      } else {
        navigateAppPath("/app/invitations");
      }
    } else if (viewKey === "profile") {
      navigateAppPath("/profile");
    } else {
      navigateAppPath("/app");
    }
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
    navigateAppPath("/profile");
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const openEventDetail = (eventId) => {
    markUserNavigationIntent();
    const fallbackEventId = eventId || events[0]?.id || "";
    if (!fallbackEventId) {
      return;
    }
    navigateAppPath(`/app/events/${encodeURIComponent(fallbackEventId)}`);
    setEventsMapFocusId(fallbackEventId);
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
    navigateAppPath(`/app/events/${encodeURIComponent(fallbackEventId)}/plan/${encodeURIComponent(normalizedTab)}`);
    setEventsMapFocusId(fallbackEventId);
    setIsNotificationMenuOpen(false);
    closeMobileMenu();
  };

  const openGuestDetail = (guestId) => {
    markUserNavigationIntent();
    const fallbackGuestId = guestId || guests[0]?.id || "";
    if (!fallbackGuestId) {
      return;
    }
    navigateAppPath(`/app/guests/${encodeURIComponent(fallbackGuestId)}`);
    setGuestsMapFocusId(fallbackGuestId);
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
    navigateAppPath("/app/invitations/new");
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
    if (nextView === "events") {
      navigateAppPath("/app/events");
    } else if (nextView === "guests") {
      navigateAppPath("/app/guests");
    } else if (nextView === "invitations") {
      navigateAppPath("/app/invitations");
    } else if (nextView === "profile") {
      navigateAppPath("/profile");
    } else {
      navigateAppPath("/app");
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
    if (!selectedEventDetail?.id) {
      return;
    }
    navigateAppPath(`/app/events/${encodeURIComponent(selectedEventDetail.id)}/plan/${encodeURIComponent(normalizedTab)}`);
  };
  const handleGuestProfileTabChange = (nextTab) => {
    const normalizedTab = String(nextTab || "").trim().toLowerCase();
    if (!selectedGuestDetail?.id) {
      return;
    }
    if (!GUEST_PROFILE_VIEW_TABS.includes(normalizedTab) || normalizedTab === "general") {
      navigateAppPath(`/app/guests/${encodeURIComponent(selectedGuestDetail.id)}`);
      return;
    }
    navigateAppPath(`/app/guests/${encodeURIComponent(selectedGuestDetail.id)}/${encodeURIComponent(normalizedTab)}`);
  };
  const handleOpenEventPlan = (targetTab = "ambience") => {
    openEventPlanById(selectedEventDetail?.id || "", targetTab);
  };
  const handleBackToEventDetail = () => {
    if (!selectedEventDetail?.id) {
      return;
    }
    markUserNavigationIntent();
    navigateAppPath(`/app/events/${encodeURIComponent(selectedEventDetail.id)}`);
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
    navigateAppPath("/app/events/new");
    const eventSettings = normalizeEventSettings(eventItem);
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
    navigateAppPath("/app/events/new");
    const guestLabel = `${guestFirstName || ""} ${guestLastName || ""}`.trim() || t("field_guest");
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
    if (editingGuestId) {
      navigateAppPath(`/app/guests/${encodeURIComponent(editingGuestId)}/edit/advanced/identity`);
      return;
    }
    navigateAppPath("/app/guests/new/advanced/identity");
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
    if (editingGuestId) {
      navigateAppPath(`/app/guests/${encodeURIComponent(editingGuestId)}/edit/advanced/${encodeURIComponent(normalizedTab)}`);
    } else {
      navigateAppPath(`/app/guests/new/advanced/${encodeURIComponent(normalizedTab)}`);
    }
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
    if (!validateGuestAdvancedStep(routeGuestAdvancedTab)) {
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
    if (!validateGuestAdvancedStep(routeGuestAdvancedTab)) {
      return;
    }
    await persistGuest({ refreshAfterSave: false, successMessageMode: "draft" });
  };

  const handleSaveAndGoNextPendingGuestAdvancedSection = async () => {
    if (isSavingGuest || !guestAdvancedNextPendingTab) {
      return;
    }
    if (!validateGuestAdvancedStep(routeGuestAdvancedTab)) {
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

  function handleCloseImportWizard() {
    setIsImportWizardOpen(false);
    setImportWizardShareMessage("");
  }

  const handleImportWizardDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const selectedFile = event.dataTransfer?.files?.[0];
    if (!selectedFile) {
      return;
    }
    await handleImportContactsSelectedFile(selectedFile);
  };

  async function handleImportContacts({ fromWizard = false } = {}) {
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
  }

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

  const {
    handleSaveHostProfile,
    handleClaimGlobalProfile,
    handleLinkProfileGuestToGlobal,
    handleLinkAllGuestsToGlobalProfiles,
    handleChangeGlobalShareDraft,
    handleApplyGlobalSharePreset,
    handleRequestSaveGlobalShare,
    handleConfirmSaveGlobalShare,
    handleApplyGlobalShareAction
  } = useHostProfileGlobalShareController({
    supabase,
    t,
    language,
    sessionUserId: session?.user?.id,
    sessionUserEmail: session?.user?.email,
    hostProfileName,
    hostProfilePhone,
    hostProfileRelationship,
    hostProfileCity,
    hostProfileCountry,
    setHostProfileMessage,
    setIsSavingHostProfile,
    selfGuestCandidate,
    loadDashboardData,
    setGlobalProfileMessage,
    setIsClaimingGlobalProfile,
    setIsGlobalProfileFeatureReady,
    globalProfileId,
    setGlobalProfileId,
    refreshSharedProfileData,
    setIsLinkingGlobalGuest,
    setIsLinkingAllGlobalGuests,
    setGlobalShareDraftByHostId,
    globalShareDraftByHostId,
    setSavingGlobalShareHostId,
    globalShareTargetsVisible,
    mapShareTargetToDraft,
    setPendingGlobalShareSave,
    pendingGlobalShareSave,
    setIsPausingGlobalShares,
    setIsRevokingGlobalShares
  });

  const handleStartEditGuest = (guestItem, { openAdvanced = false, preferredAdvancedTab = "identity" } = {}) => {
    markUserNavigationIntent();
    if (!guestItem) {
      return;
    }
    const nextTab = GUEST_ADVANCED_EDIT_TABS.includes(preferredAdvancedTab) ? preferredAdvancedTab : "identity";
    navigateAppPath(`/app/guests/${encodeURIComponent(guestItem.id)}/edit/advanced/${encodeURIComponent(nextTab)}`);
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
    setOpenGuestAdvancedOnCreate(Boolean(openAdvanced));
  };

  const handleCancelEditGuest = () => {
    guestEditorHydratedIdRef.current = "";
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
    setOpenGuestAdvancedOnCreate(false);
    navigateAppPath("/app/guests/new/advanced/identity");
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
      navigateAppPath(
        `/app/guests/${encodeURIComponent(savedGuestId)}/edit/advanced/${encodeURIComponent(routeGuestAdvancedTab)}`
      );
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
    navigateAppPath,
    routeGuestAdvancedTab,
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
      if (routeSelectedGuestDetailId === sourceGuest.id) {
        navigateAppPath(`/app/guests/${encodeURIComponent(targetGuest.id)}`);
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
  const activeViewItem = VIEW_CONFIG.find((item) => item.key === routeActiveView) || VIEW_CONFIG[0];
  const { sectionHeader, contextualCreateAction, contextualSecondaryAction, hideDashboardHeader } =
    useDashboardHeaderState({
      activeView: routeActiveView,
      eventsWorkspace: routeEventsWorkspace,
      guestsWorkspace: routeGuestsWorkspace,
      invitationsWorkspace: routeInvitationsWorkspace,
      selectedEventTitle: selectedEventDetail?.title || "",
      selectedGuestDetail,
      hostFirstName,
      activeViewItemLabelKey: activeViewItem.labelKey,
      t,
      interpolateText,
      openWorkspace,
      openInvitationBulkWorkspace,
      handleOpenImportWizard
    });

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
      activeView={routeActiveView}
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
      {/* 🚀 FIX SEO: Inyección dinámica de metadatos según el idioma */}
      <Helmet htmlAttributes={{ lang: language }}>
        <title>{t("seo_title")}</title>
        <meta name="description" content={t("seo_desc")} />

        {/* Open Graph Dinámico */}
        <meta property="og:title" content={t("seo_title")} />
        <meta property="og:description" content={t("seo_desc")} />

        {/* Twitter Card Dinámico */}
        <meta name="twitter:title" content={t("seo_title")} />
        <meta name="twitter:description" content={t("seo_desc")} />
      </Helmet>
      {/* Decorative blobs for glassmorphism layout background */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/5 rounded-full mix-blend-multiply filter blur-3xl opacity-70 pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-600/5 rounded-full mix-blend-multiply filter blur-3xl opacity-70 pointer-events-none -z-10"></div>

      {dashboardError ? <InlineMessage type="error" text={dashboardError} /> : null}

      {routeActiveView === "overview" ? (
        <Suspense fallback={null}>
          <DashboardOverview
            t={t}
            isLoading={isLoading}
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
        </Suspense>
      ) : null}

      {routeActiveView === "profile" ? (
        <Suspense fallback={null}>
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
        </Suspense>
      ) : null}

      {routeActiveView === "events" ? (
        <Suspense fallback={null}>
          <EventsWorkspaceContainer
            {...{
              routeEventsWorkspace,
              routeEventPlannerTab,
              WORKSPACE_ITEMS,
              t,
              openWorkspace,
              language,
              timezone,
              handleSaveEvent,
              isSavingEvent,
              isEditingEvent,
              handleCancelEditEvent,
              eventTemplates,
              activeEventTemplateKey,
              handleApplyEventTemplate,
              eventTitle,
              setEventTitle,
              eventErrors,
              eventDescription,
              setEventDescription,
              eventType,
              setEventType,
              eventTypeOptions,
              eventStatus,
              setEventStatus,
              eventStartAt,
              setEventStartAt,
              eventLocationName,
              setEventLocationName,
              eventLocationAddress,
              setEventLocationAddress,
              mapsStatus,
              mapsError,
              addressPredictions,
              isAddressLoading,
              handleSelectAddressPrediction,
              selectedPlace,
              getMapEmbedUrl,
              eventPhaseProgress,
              invitationCountForEditingEvent,
              editingEventId,
              eventAllowPlusOne,
              setEventAllowPlusOne,
              eventAutoReminders,
              setEventAutoReminders,
              eventDressCode,
              setEventDressCode,
              eventPlaylistMode,
              setEventPlaylistMode,
              eventBuilderPlaybookActions,
              handleApplySuggestedEventSettings,
              eventBuilderMealPlan,
              handleCopyEventBuilderShoppingChecklist,
              locationNameOptions,
              locationAddressOptions,
              eventMessage,
              eventSearch,
              setEventSearch,
              eventSort,
              setEventSort,
              eventPageSize,
              setEventPageSize,
              EVENTS_PAGE_SIZE_DEFAULT,
              PAGE_SIZE_OPTIONS,
              eventStatusFilter,
              setEventStatusFilter,
              eventStatusCounts,
              filteredEvents,
              pagedEvents,
              eventInvitationSummaryByEventId,
              openEventDetail,
              openEventPlanById,
              handleStartEditEvent,
              handleRequestDeleteEvent,
              isDeletingEventId,
              toCatalogLabel,
              formatDate,
              statusClass,
              statusText,
              eventPage,
              eventTotalPages,
              setEventPage,
              orderedEventMapPoints,
              GeoPointsMapPanel,
              handleBackToEventDetail,
              selectedEventDetail,
              formatLongDate,
              formatTimeLabel,
              handleOpenEventPlan,
              selectedEventDetailPrimaryShare,
              openInvitationCreate,
              selectedEventDetailInvitations,
              selectedEventDetailStatusCounts,
              invitationMessage,
              normalizeEventDressCode,
              normalizeEventPlaylistMode,
              selectedEventChecklist,
              selectedEventHealthAlerts,
              selectedEventHealthAlertsConfirmedCount,
              selectedEventHealthAlertsPendingCount,
              eventPlannerSectionRef,
              interpolateText,
              selectedEventMealPlan,
              selectedEventPlannerContextEffective,
              selectedEventPlannerSavedLabel,
              selectedEventPlannerSnapshotVersion,
              selectedEventPlannerSnapshotHistory,
              selectedEventPlannerVariantSeed,
              selectedEventPlannerTabSeed,
              selectedEventPlannerLastGeneratedByScope,
              selectedEventPlannerGenerationState,
              handleOpenEventPlannerContext,
              handleRegenerateEventPlanner,
              handleRestoreEventPlannerSnapshot,
              handleExportEventPlannerShoppingList,
              selectedEventDietTypesCount,
              selectedEventAllergiesCount,
              selectedEventMedicalConditionsCount,
              selectedEventDietaryMedicalRestrictionsCount,
              selectedEventCriticalRestrictions,
              selectedEventHealthRestrictionHighlights,
              selectedEventRestrictionsCount,
              selectedEventIntolerancesCount,
              handleEventPlannerTabChange,
              selectedEventShoppingTotalIngredients,
              selectedEventEstimatedCostRange,
              selectedEventShoppingProgress,
              selectedEventShoppingItems,
              selectedEventShoppingCheckedSet,
              handleCopySelectedEventShoppingChecklist,
              handleMarkAllEventPlannerShoppingItems,
              handleClearEventPlannerShoppingCheckedItems,
              eventPlannerShoppingFilter,
              setEventPlannerShoppingFilter,
              selectedEventShoppingCounts,
              selectedEventShoppingGroupsFiltered,
              handleToggleEventPlannerShoppingItem,
              selectedEventHostPlaybook,
              handleCopyEventPlannerMessages,
              handleCopyEventPlannerPrompt,
              getGuestAvatarUrl,
              selectedEventDetailGuests,
              openGuestDetail,
              handlePrepareInvitationShare,
              handleRequestDeleteInvitation,
              selectedEventRsvpTimeline,
              events,
              insightsEventId,
              setInsightsEventId,
              eventInsights,
              insightsPlaybookActions
            }}
          />
        </Suspense>
      ) : null}

      {routeActiveView === "guests" ? (
        <Suspense fallback={null}>
          <GuestsWorkspaceContainer
            {...{
              routeGuestsWorkspace,
              routeGuestProfileTab,
              routeGuestAdvancedTab,
              WORKSPACE_ITEMS,
              t,
              openWorkspace,
              language,
              canUseDeviceContacts,
              contactPickerUnsupportedReason,
              handleFillGuestFromDeviceContact,
              openFileImportFallback,
              contactImportDetailsRef,
              handlePickDeviceContacts,
              handleImportGoogleContacts,
              isImportingGoogleContacts,
              canUseGoogleContacts,
              contactImportFileInputRef,
              handleImportContactsFile,
              importContactsDraft,
              setImportContactsDraft,
              handlePreviewContactsFromDraft,
              handleClearImportContacts,
              importContactsAnalysis,
              importContactsReady,
              importContactsSelectedReady,
              importContactsStatusSummary,
              importDuplicateMode,
              handleImportDuplicateModeChange,
              importContactsSearch,
              setImportContactsSearch,
              importContactsGroupFilter,
              setImportContactsGroupFilter,
              importContactsGroupOptions,
              importContactsPotentialFilter,
              setImportContactsPotentialFilter,
              importContactsSourceFilter,
              setImportContactsSourceFilter,
              importContactsSort,
              setImportContactsSort,
              IMPORT_CONTACTS_SORT_OPTIONS,
              importContactsPageSize,
              setImportContactsPageSize,
              IMPORT_PREVIEW_PAGE_SIZE_DEFAULT,
              IMPORT_PREVIEW_PAGE_SIZE_OPTIONS,
              handleSelectSuggestedImportContacts,
              handleSelectAllReadyImportContacts,
              handleSelectHighPotentialImportContacts,
              handleSelectDualChannelImportContacts,
              handleSelectDuplicateMergeImportContacts,
              handleApproveAllLowConfidenceMergeContacts,
              handleSelectFilteredReadyImportContacts,
              handleSelectCurrentImportPageReady,
              handleSelectOnlyNewImportContacts,
              handleClearReadyImportContactsSelection,
              importContactsSuggested,
              interpolateText,
              pagedImportContacts,
              selectedImportContactIds,
              toggleImportContactSelection,
              handleOpenLowConfidenceMergeReview,
              importContactsFiltered,
              importContactsPage,
              importContactsTotalPages,
              setImportContactsPage,
              handleImportContacts,
              isImportingContacts,
              importContactsMessage,
              handleSaveGuest,
              guestFirstName,
              setGuestFirstName,
              guestErrors,
              guestLastName,
              setGuestLastName,
              guestPhotoUrl,
              guestPhotoInputValue,
              handleGuestPhotoUrlChange,
              handleGuestPhotoFileChange,
              handleRemoveGuestPhoto,
              guestEmail,
              setGuestEmail,
              guestPhone,
              setGuestPhone,
              guestRelationship,
              setGuestRelationship,
              relationshipOptions,
              guestCity,
              setGuestCity,
              guestCountry,
              setGuestCountry,
              guestAdvanced,
              setGuestAdvancedField,
              guestAdvancedProfileCompleted,
              guestAdvancedProfileSignals,
              guestAdvancedProfilePercent,
              guestNextBirthday,
              handleCreateBirthdayEventFromGuest,
              scrollToGuestAdvancedSection,
              guestPriorityCompleted,
              guestPriorityTotal,
              guestPriorityPercent,
              guestPriorityMissing,
              getGuestAdvancedSectionFromPriorityKey,
              handleOpenGuestAdvancedPriority,
              guestAdvancedDetailsRef,
              guestAdvancedToolbarRef,
              guestAdvancedEditTabs,
              guestAdvancedSignalsBySection,
              guestAdvancedCurrentStep,
              guestAdvancedCurrentTabLabel,
              guestAdvancedCurrentChecklistDone,
              guestAdvancedCurrentChecklistTotal,
              guestAdvancedCurrentChecklist,
              isSavingGuest,
              guestLastSavedLabel,
              handleGoToPreviousGuestAdvancedSection,
              guestAdvancedPrevTab,
              handleSaveGuestDraft,
              handleSaveAndGoNextPendingGuestAdvancedSection,
              guestAdvancedNextPendingTab,
              guestAdvancedNextPendingLabel,
              handleGoToNextGuestAdvancedSection,
              guestAdvancedNextTab,
              handleGoToFirstPendingGuestAdvancedSection,
              guestAdvancedFirstPendingTab,
              guestAdvancedFirstPendingLabel,
              guestAdvancedSectionRefs,
              setGuestErrors,
              setGuestMessage,
              selectedGuestAddressPlace,
              normalizeLookupValue,
              setSelectedGuestAddressPlace,
              mapsStatus,
              mapsError,
              isGuestAddressLoading,
              guestAddressPredictions,
              handleSelectGuestAddressPrediction,
              eventTypeOptions,
              handleAdvancedMultiSelectChange,
              dietTypeOptions,
              tastingPreferenceOptions,
              drinkOptions,
              musicGenreOptions,
              colorOptions,
              sportOptions,
              dayMomentOptions,
              periodicityOptions,
              punctualityOptions,
              cuisineTypeOptions,
              petOptions,
              allergyOptions,
              intoleranceOptions,
              petAllergyOptions,
              medicalConditionOptions,
              dietaryMedicalRestrictionOptions,
              cityOptions,
              countryOptions,
              isEditingGuest,
              handleCancelEditGuest,
              guestMessage,
              MultiSelectField,
              guestSearch,
              setGuestSearch,
              guestSort,
              setGuestSort,
              guestPageSize,
              setGuestPageSize,
              PAGE_SIZE_OPTIONS,
              GUESTS_PAGE_SIZE_DEFAULT,
              guestContactFilter,
              setGuestContactFilter,
              filteredGuests,
              pagedGuests,
              hostPotentialGuestsCount,
              convertedHostGuestsCount,
              pendingHostGuestsCount,
              guestHostConversionById,
              getConversionSource,
              getConversionSourceLabel,
              guestEventCountByGuestId,
              guestSensitiveById,
              toCatalogLabels,
              uniqueValues,
              toCatalogLabel,
              getGuestAvatarUrl,
              openGuestDetail,
              handleStartEditGuest,
              handleOpenMergeGuest,
              handleCopyHostSignupLink,
              handleShareHostSignupLink,
              handleRequestDeleteGuest,
              isDeletingGuestId,
              guestPage,
              guestTotalPages,
              setGuestPage,
              orderedGuestMapPoints,
              GeoPointsMapPanel,
              selectedGuestDetail,
              selectedGuestDetailInvitations,
              selectedGuestDetailStatusCounts,
              selectedGuestDetailRespondedRate,
              guestProfileTabs,
              setGuestProfileViewTab: handleGuestProfileTabChange,
              selectedGuestDetailConversion,
              openInvitationCreate,
              handleLinkProfileGuestToGlobal,
              isLinkingGlobalGuest,
              selectedGuestDetailNotes,
              selectedGuestDetailTags,
              selectedGuestFoodGroups,
              selectedGuestLifestyleGroups,
              selectedGuestActiveTabRecommendations,
              selectedGuestDetailPreference,
              selectedGuestAllergyLabels,
              selectedGuestIntoleranceLabels,
              selectedGuestPetAllergyLabels,
              selectedGuestMedicalConditionLabels,
              selectedGuestDietaryMedicalRestrictionLabels,
              toList,
              formatDate,
              statusClass,
              statusText,
              eventsById,
              eventNamesById,
              openEventDetail
            }}
          />
        </Suspense>
      ) : null}

      {routeActiveView === "invitations" ? (
        <Suspense fallback={null}>
          <InvitationsWorkspaceContainer
            {...{
              routeInvitationsWorkspace,
              WORKSPACE_ITEMS,
              t,
              openWorkspace,
              handleCreateInvitation,
              selectedEventId,
              setSelectedEventId,
              events,
              invitationErrors,
              selectedGuestId,
              setSelectedGuestId,
              guests,
              allGuestsAlreadyInvitedForSelectedEvent,
              invitedGuestIdsForSelectedEvent,
              bulkInvitationSearch,
              setBulkInvitationSearch,
              INVITATION_BULK_SEGMENTS,
              bulkInvitationSegment,
              setBulkInvitationSegment,
              bulkSegmentCounts,
              handleSelectVisibleBulkGuests,
              bulkFilteredGuests,
              handleClearBulkGuests,
              bulkInvitationGuestIds,
              toggleBulkInvitationGuest,
              isCreatingInvitation,
              handleCreateBulkInvitations,
              isCreatingBulkInvitations,
              invitationMessage,
              lastInvitationUrl,
              handleCopyInvitationLink,
              lastInvitationShareText,
              handleCopyInvitationMessage,
              lastInvitationWhatsappUrl,
              lastInvitationEmailUrl,
              language,
              invitationSearch,
              setInvitationSearch,
              invitationSort,
              setInvitationSort,
              invitationPageSize,
              setInvitationPageSize,
              INVITATIONS_PAGE_SIZE_DEFAULT,
              PAGE_SIZE_OPTIONS,
              invitationEventFilter,
              setInvitationEventFilter,
              invitationEventOptions,
              invitationStatusFilter,
              setInvitationStatusFilter,
              filteredInvitations,
              pagedInvitations,
              eventNamesById,
              guestNamesById,
              guestsById,
              eventsById,
              buildInvitationSharePayload,
              buildAppUrl,
              getGuestAvatarUrl,
              openGuestDetail,
              openEventDetail,
              formatDate,
              statusClass,
              statusText,
              handlePrepareInvitationShare,
              handleRequestDeleteInvitation,
              invitationPage,
              invitationTotalPages,
              setInvitationPage
            }}
          />
        </Suspense>
      ) : null}

      <DashboardModals
        t={t}
        isImportWizardOpen={isImportWizardOpen}
        handleCloseImportWizard={handleCloseImportWizard}
        importWizardStep={importWizardStep}
        importWizardStepLabel={importWizardStepLabel}
        importWizardStepTitle={importWizardStepTitle}
        importWizardStepHint={importWizardStepHint}
        IMPORT_WIZARD_STEP_TOTAL={IMPORT_WIZARD_STEP_TOTAL}
        importWizardSourceOptions={importWizardSourceOptions}
        importWizardSource={importWizardSource}
        setImportWizardSource={setImportWizardSource}
        isMobileImportExperience={isMobileImportExperience}
        setImportContactsMessage={setImportContactsMessage}
        importWizardUploadedFileName={importWizardUploadedFileName}
        importContactsAnalysis={importContactsAnalysis}
        handleImportWizardDrop={handleImportWizardDrop}
        contactImportFileInputRef={contactImportFileInputRef}
        handleImportContactsFile={handleImportContactsFile}
        importContactsDraft={importContactsDraft}
        setImportContactsDraft={setImportContactsDraft}
        handlePreviewContactsFromDraft={handlePreviewContactsFromDraft}
        handleClearImportContacts={handleClearImportContacts}
        handleImportGoogleContacts={handleImportGoogleContacts}
        isImportingGoogleContacts={isImportingGoogleContacts}
        canUseGoogleContacts={canUseGoogleContacts}
        canUseDeviceContacts={canUseDeviceContacts}
        isIOSDevice={isIOSDevice}
        contactPickerUnsupportedReason={contactPickerUnsupportedReason}
        handlePickDeviceContacts={handlePickDeviceContacts}
        importWizardQrDataUrl={importWizardQrDataUrl}
        handleShareImportWizardLink={handleShareImportWizardLink}
        importWizardShareEmail={importWizardShareEmail}
        setImportWizardShareEmail={setImportWizardShareEmail}
        handleImportWizardEmailLink={handleImportWizardEmailLink}
        importContactsSearch={importContactsSearch}
        setImportContactsSearch={setImportContactsSearch}
        importContactsPageSize={importContactsPageSize}
        setImportContactsPageSize={setImportContactsPageSize}
        IMPORT_PREVIEW_PAGE_SIZE_DEFAULT={IMPORT_PREVIEW_PAGE_SIZE_DEFAULT}
        IMPORT_PREVIEW_PAGE_SIZE_OPTIONS={IMPORT_PREVIEW_PAGE_SIZE_OPTIONS}
        importDuplicateMode={importDuplicateMode}
        handleImportDuplicateModeChange={handleImportDuplicateModeChange}
        importContactsDuplicateCount={importContactsDuplicateCount}
        interpolateText={interpolateText}
        handleSelectSuggestedImportContacts={handleSelectSuggestedImportContacts}
        handleSelectCurrentImportPageReady={handleSelectCurrentImportPageReady}
        handleSelectAllReadyImportContacts={handleSelectAllReadyImportContacts}
        handleClearReadyImportContactsSelection={handleClearReadyImportContactsSelection}
        importContactsSelectedReady={importContactsSelectedReady}
        pagedImportContacts={pagedImportContacts}
        selectedImportContactIds={selectedImportContactIds}
        toggleImportContactSelection={toggleImportContactSelection}
        handleOpenLowConfidenceMergeReview={handleOpenLowConfidenceMergeReview}
        importContactsFiltered={importContactsFiltered}
        importContactsPage={importContactsPage}
        importContactsTotalPages={importContactsTotalPages}
        setImportContactsPage={setImportContactsPage}
        importWizardResult={importWizardResult}
        importWizardShareMessage={importWizardShareMessage}
        importContactsMessage={importContactsMessage}
        handleImportWizardBack={handleImportWizardBack}
        isImportingContacts={isImportingContacts}
        importWizardCanContinue={importWizardCanContinue}
        handleImportWizardContinue={handleImportWizardContinue}
        importWizardContinueLabel={importWizardContinueLabel}
        isEventPlannerContextOpen={isEventPlannerContextOpen}
        setIsEventPlannerContextOpen={setIsEventPlannerContextOpen}
        setEventPlannerContextFocusField={setEventPlannerContextFocusField}
        eventPlannerContextDraft={eventPlannerContextDraft}
        setEventPlannerContextDraft={setEventPlannerContextDraft}
        eventPlannerContextFocusField={eventPlannerContextFocusField}
        showTechnicalPrompt={showEventPlannerTechnicalPrompt}
        setShowTechnicalPrompt={setShowEventPlannerTechnicalPrompt}
        eventPlannerContextDraftPromptBundle={eventPlannerContextDraftPromptBundle}
        handleGenerateFullEventPlanFromContext={handleGenerateFullEventPlanFromContext}
        selectedEventPlannerGenerationState={selectedEventPlannerGenerationState}
        guestMergeSource={guestMergeSource}
        handleCloseMergeGuest={handleCloseMergeGuest}
        guestMergeSearch={guestMergeSearch}
        setGuestMergeSearch={setGuestMergeSearch}
        guestMergeTargetId={guestMergeTargetId}
        setGuestMergeTargetId={setGuestMergeTargetId}
        guestMergeCandidates={guestMergeCandidates}
        isMergingGuest={isMergingGuest}
        handleConfirmMergeGuest={handleConfirmMergeGuest}
        pendingImportMergeApprovalItem={pendingImportMergeApprovalItem}
        handleCloseLowConfidenceMergeReview={handleCloseLowConfidenceMergeReview}
        pendingImportMergeWillFillCount={pendingImportMergeWillFillCount}
        importMergeReviewShowOnlyWillFill={importMergeReviewShowOnlyWillFill}
        setImportMergeReviewShowOnlyWillFill={setImportMergeReviewShowOnlyWillFill}
        pendingImportMergeVisibleCount={pendingImportMergeVisibleCount}
        pendingImportMergeTotalCount={pendingImportMergeTotalCount}
        pendingImportMergeVisibleRows={pendingImportMergeVisibleRows}
        pendingImportMergeSelectedFieldKeysSet={pendingImportMergeSelectedFieldKeysSet}
        handleTogglePendingImportMergeFieldKey={handleTogglePendingImportMergeFieldKey}
        formatMergeReviewValue={formatMergeReviewValue}
        handleConfirmLowConfidenceMergeReview={handleConfirmLowConfidenceMergeReview}
        pendingImportMergeSelectableCount={pendingImportMergeSelectableCount}
        pendingImportMergeSelectedFieldKeys={pendingImportMergeSelectedFieldKeys}
        pendingGlobalShareSave={pendingGlobalShareSave}
        setPendingGlobalShareSave={setPendingGlobalShareSave}
        pendingGlobalSharePreset={pendingGlobalSharePreset}
        pendingGlobalShareScopes={pendingGlobalShareScopes}
        savingGlobalShareHostId={savingGlobalShareHostId}
        handleConfirmSaveGlobalShare={handleConfirmSaveGlobalShare}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        isDeleteConfirmLoading={isDeleteConfirmLoading}
        handleConfirmDelete={handleConfirmDelete}
      />
    </DashboardLayout>
  );
}

export { DashboardScreen };
