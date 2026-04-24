// Catálogo ligero de los módulos de evento con solo labelKey/hintKey.
// Vive aparte del `event-module-registry.js` (que arrastra las 10 cards
// reales con supabase/auth/etc.). Esto permite que la landing pública
// enumere los módulos sin cargar ese peso al bundle.
// Orden: coincide con el orden que el usuario ve en la modal "Personalizar
// evento" (screenshot de referencia).

export const EVENT_MODULES_CATALOG = [
    { key: "spotify", labelKey: "event_modules_toggle_spotify_label", hintKey: "event_modules_toggle_spotify_hint" },
    { key: "finance", labelKey: "event_modules_toggle_finance_label", hintKey: "event_modules_toggle_finance_hint" },
    { key: "gallery", labelKey: "event_modules_toggle_gallery_label", hintKey: "event_modules_toggle_gallery_hint" },
    { key: "icebreaker", labelKey: "event_modules_toggle_icebreaker_label", hintKey: "event_modules_toggle_icebreaker_hint" },
    { key: "date_poll", labelKey: "event_modules_toggle_date_poll_label", hintKey: "event_modules_toggle_date_poll_hint" },
    { key: "venues", labelKey: "event_modules_toggle_venues_label", hintKey: "event_modules_toggle_venues_hint" },
    { key: "meals", labelKey: "event_modules_toggle_meals_label", hintKey: "event_modules_toggle_meals_hint" },
    { key: "megaphone", labelKey: "event_modules_toggle_megaphone_label", hintKey: "event_modules_toggle_megaphone_hint" },
    { key: "spaces", labelKey: "event_modules_toggle_spaces_label", hintKey: "event_modules_toggle_spaces_hint" },
    { key: "shared_tasks", labelKey: "event_modules_toggle_shared_tasks_label", hintKey: "event_modules_toggle_shared_tasks_hint" }
];
