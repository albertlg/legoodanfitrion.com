// src/lib/constants.js

export const GUEST_AVATAR_STORAGE_BUCKET = String(import.meta.env.VITE_SUPABASE_GUEST_AVATAR_BUCKET || "guest-avatars").trim() || "guest-avatars";
export const GUEST_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const VIEW_CONFIG = [
    { key: "overview", icon: "sparkle", labelKey: "nav_overview" },
    { key: "events", icon: "calendar", labelKey: "nav_events" },
    { key: "guests", icon: "user", labelKey: "nav_guests" },
    { key: "invitations", icon: "mail", labelKey: "nav_invitations" }
];

export const EVENTS_PAGE_SIZE_DEFAULT = 5;
export const GUESTS_PAGE_SIZE_DEFAULT = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 20];
export const IMPORT_PREVIEW_PAGE_SIZE_DEFAULT = 20;
export const IMPORT_PREVIEW_PAGE_SIZE_OPTIONS = [10, 20, 50];
export const IMPORT_CONTACTS_SORT_OPTIONS = ["priority", "score_desc", "score_asc", "name_asc", "name_desc"];
export const IMPORT_WIZARD_STEP_TOTAL = 4;
export const INVITATIONS_PAGE_SIZE_DEFAULT = 8;
export const INVITATION_BULK_SEGMENTS = ["all", "high_potential", "health_sensitive", "no_invites", "converted_hosts"];

export const GUEST_PROFILE_VIEW_TABS = ["general", "food", "lifestyle", "conversation", "health", "history"];
export const GUEST_ADVANCED_EDIT_TABS = ["identity", "food", "lifestyle", "conversation", "health"];
export const EVENT_PLANNER_VIEW_TABS = ["overview", "menu", "shopping", "ambience", "timings", "communication", "risks"];
export const EVENT_PLANNER_SHOPPING_FILTERS = ["all", "pending", "done"];

export const GUEST_ADVANCED_PRIORITY_SECTION_MAP = {
    diet: "food", menu: "food", drink: "food",
    health: "health",
    music: "lifestyle", moment: "lifestyle",
    talk: "conversation",
    birthday: "identity"
};

export const GUEST_ADVANCED_ERROR_FIELDS_BY_TAB = {
    identity: ["firstName", "lastName", "email", "workEmail", "phone", "contact", "relationship", "city", "country", "address", "postalCode", "stateRegion", "companyName", "twitter", "instagram", "linkedIn"],
    health: ["sensitiveConsent"]
};

export const DASHBOARD_PREFS_KEY_PREFIX = "legood-dashboard-prefs";
export const EVENT_SETTINGS_STORAGE_KEY_PREFIX = "legood-event-settings";
export const GUEST_GEO_CACHE_KEY_PREFIX = "legood-guest-geocode";

export const EVENT_DRESS_CODE_OPTIONS = ["none", "casual", "elegant", "formal", "themed"];
export const EVENT_PLAYLIST_OPTIONS = ["host_only", "collaborative", "spotify_collaborative"];

export const CITY_OPTIONS_BY_LANGUAGE = {
    es: ["Barcelona", "Madrid", "Valencia", "Sevilla", "Bilbao", "Lisboa", "París"],
    ca: ["Barcelona", "Madrid", "Valencia", "Sevilla", "Bilbao", "Lisboa", "París"],
    en: ["Barcelona", "Madrid", "Valencia", "Seville", "Bilbao", "Lisbon", "Paris"],
    fr: ["Barcelone", "Madrid", "Valence", "Seville", "Bilbao", "Lisbonne", "Paris"],
    it: ["Barcellona", "Madrid", "Valencia", "Siviglia", "Bilbao", "Lisbona", "Parigi"]
};

export const COUNTRY_OPTIONS_BY_LANGUAGE = {
    es: ["España", "Andorra", "Francia", "Portugal", "Italia", "Reino Unido"],
    ca: ["Espanya", "Andorra", "França", "Portugal", "Itàlia", "Regne Unit"],
    en: ["Spain", "Andorra", "France", "Portugal", "Italy", "United Kingdom"],
    fr: ["Espagne", "Andorre", "France", "Portugal", "Italie", "Royaume-Uni"],
    it: ["Spagna", "Andorra", "Francia", "Portogallo", "Italia", "Regno Unito"]
};

export const WORKSPACE_ITEMS = {
    events: [
        { key: "hub", icon: "sparkle", labelKey: "workspace_folders" },
        { key: "create", icon: "calendar", labelKey: "create_event_title", descriptionKey: "help_event_form" },
        { key: "latest", icon: "calendar", labelKey: "latest_events_title", descriptionKey: "workspace_events_latest_desc" },
        { key: "detail", icon: "eye", labelKey: "event_detail_title", descriptionKey: "workspace_events_detail_desc" },
        { key: "plan", icon: "sparkle", labelKey: "event_planner_title", descriptionKey: "event_planner_hint" },
        { key: "insights", icon: "sparkle", labelKey: "smart_hosting_title", descriptionKey: "smart_hosting_hint" }
    ],
    guests: [
        { key: "hub", icon: "sparkle", labelKey: "workspace_folders" },
        { key: "create", icon: "user", labelKey: "create_guest_title", descriptionKey: "help_guest_form" },
        { key: "latest", icon: "user", labelKey: "latest_guests_title", descriptionKey: "workspace_guests_latest_desc" },
        { key: "groups", icon: "users", labelKey: "guest_groups_tab", descriptionKey: "workspace_guests_groups_desc" },
        { key: "detail", icon: "eye", labelKey: "guest_detail_title", descriptionKey: "workspace_guests_detail_desc" }
    ],
    invitations: [
        { key: "hub", icon: "sparkle", labelKey: "workspace_folders" },
        { key: "create", icon: "mail", labelKey: "create_invitation_title", descriptionKey: "help_invitation_form" },
        { key: "latest", icon: "mail", labelKey: "latest_invitations_title", descriptionKey: "workspace_invitations_latest_desc" }
    ]
};

export const EVENT_TEMPLATE_DEFINITIONS = [
    { key: "bbq", titleKey: "event_template_title_bbq", typeCode: "bbq", defaultHour: 14, dressCode: "casual", playlistMode: "host_only", allowPlusOne: true },
    { key: "calcotada", titleKey: "event_template_title_calcotada", typeCode: "calcotada", defaultHour: 14, dressCode: "casual", playlistMode: "host_only", allowPlusOne: true },
    { key: "esmorzar_forquilla", titleKey: "event_template_title_esmorzar_forquilla", typeCode: "esmorzar_de_forquilla", defaultHour: 11, dressCode: "casual", playlistMode: "host_only", allowPlusOne: true },
    { key: "brunch", titleKey: "event_template_title_brunch", typeCode: "brunch", defaultHour: 12, dressCode: "none", playlistMode: "collaborative", allowPlusOne: true },
    { key: "family_lunch", titleKey: "event_template_title_family_lunch", typeCode: "family_lunch", defaultHour: 14, dressCode: "none", playlistMode: "host_only", allowPlusOne: true },
    { key: "cocktail", titleKey: "event_template_title_cocktail", typeCode: "cocktail", defaultHour: 20, dressCode: "elegant", playlistMode: "host_only", allowPlusOne: true },
    { key: "outdoor_meetup", titleKey: "event_template_title_outdoor_meetup", typeCode: "outdoor_meetup", defaultHour: 17, dressCode: "casual", playlistMode: "collaborative", allowPlusOne: true },
    { key: "merienda_cena", titleKey: "event_template_title_merienda_cena", typeCode: "merienda_cena", defaultHour: 19, dressCode: "none", playlistMode: "collaborative", allowPlusOne: true },
    { key: "book_club", titleKey: "event_template_title_book_club", typeCode: "book_club", defaultHour: 19, dressCode: "none", playlistMode: "collaborative", allowPlusOne: true },
    { key: "after_school_reunion", titleKey: "event_template_title_after_school_reunion", typeCode: "after_school_reunion", defaultHour: 19, dressCode: "casual", playlistMode: "collaborative", allowPlusOne: true },
    { key: "party", titleKey: "event_template_title_party", typeCode: "party", defaultHour: 21, dressCode: "themed", playlistMode: "spotify_collaborative", allowPlusOne: true },
    { key: "networking", titleKey: "event_template_title_networking", typeCode: "networking", defaultHour: 19, dressCode: "elegant", playlistMode: "host_only", allowPlusOne: true },
    { key: "tasting_session", titleKey: "event_template_title_tasting_session", typeCode: "tasting_session", defaultHour: 20, dressCode: "elegant", playlistMode: "host_only", allowPlusOne: true },
    { key: "anniversary", titleKey: "event_template_title_anniversary", typeCode: "celebration", defaultHour: 20, dressCode: "elegant", playlistMode: "host_only", allowPlusOne: true },
    { key: "date_night", titleKey: "event_template_title_date_night", typeCode: "romantic_date", defaultHour: 21, dressCode: "elegant", playlistMode: "host_only", allowPlusOne: false }
];

export const GUEST_ADVANCED_INITIAL_STATE = {
    address: "", postalCode: "", stateRegion: "", birthday: "", twitter: "", instagram: "", linkedIn: "", lastMeetAt: "",
    experienceTypes: "", preferredGuestRelationships: "", preferredDayMoments: "", periodicity: "", cuisineTypes: "", dietType: "", tastingPreferences: "", foodLikes: "", foodDislikes: "", drinkLikes: "", drinkDislikes: "",
    allergies: "", intolerances: "", petAllergies: "", medicalConditions: "", dietaryMedicalRestrictions: "", pets: "",
    musicGenres: "", favoriteColor: "", books: "", movies: "", series: "", sports: "", teamFan: "", punctuality: "", lastTalkTopic: "", tabooTopics: "", sensitiveConsent: false
};
