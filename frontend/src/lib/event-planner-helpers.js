// src/lib/event-planner-helpers.js
import { normalizeLookupValue, uniqueValues, interpolateText, formatLongDate, formatTimeLabel } from "./formatters";
import { toCatalogCode, toCatalogLabel } from "./guest-catalogs";
import { EVENT_DRESS_CODE_OPTIONS, EVENT_PLAYLIST_OPTIONS } from "./constants";

export const EVENT_TYPE_TO_PLANNER_PRESET = {
    bbq: "bbq", calcotada: "bbq", brunch: "brunch", esmorzar_de_forquilla: "brunch", family_lunch: "brunch",
    book_club: "bookclub", movie_night: "movie", romantic_date: "romantic", celebration: "celebration", party: "celebration",
    after_school_reunion: "celebration", cocktail: "celebration", tasting_session: "celebration", networking: "social",
    afterwork: "social", merienda_cena: "social", outdoor_meetup: "social", jam_session: "social", picnic: "social", dinner: "social"
};

export const EVENT_TYPE_TO_DEFAULT_HOUR = {
    bbq: 14, calcotada: 14, brunch: 12, esmorzar_de_forquilla: 11, family_lunch: 13, book_club: 19, movie_night: 21,
    romantic_date: 21, celebration: 20, party: 21, after_school_reunion: 19, cocktail: 20, tasting_session: 20,
    networking: 19, afterwork: 19, merienda_cena: 19, outdoor_meetup: 17, jam_session: 20, picnic: 13, dinner: 21
};

export function statusText(t, status) {
    return t(`status_${String(status || "").toLowerCase()}`);
}

export function statusClass(status) {
    return `status-${String(status || "").toLowerCase()}`;
}

export function getConversionSource(conversion) {
    if (!conversion) return "";
    const normalizedSource = String(conversion.conversion_source || "").trim().toLowerCase();
    if (normalizedSource === "google" || normalizedSource === "email" || normalizedSource === "phone") return normalizedSource;
    return conversion.matched_by === "phone" ? "phone" : "email";
}

export function getConversionSourceLabel(t, source) {
    if (source === "google") return t("host_conversion_source_google");
    if (source === "phone") return t("host_conversion_source_phone");
    return t("host_conversion_source_email");
}

export function getMapEmbedUrl(lat, lng) {
    if (typeof lat !== "number" || typeof lng !== "number") return "";
    return `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
}

export function normalizeEventDressCode(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return EVENT_DRESS_CODE_OPTIONS.includes(normalized) ? normalized : "none";
}

export function normalizeEventPlaylistMode(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return EVENT_PLAYLIST_OPTIONS.includes(normalized) ? normalized : "host_only";
}

export function normalizeEventSettings(input = {}) {
    return {
        description: String(input?.description || "").trim(),
        allow_plus_one: Boolean(input?.allow_plus_one ?? input?.allowPlusOne),
        auto_reminders: Boolean(input?.auto_reminders ?? input?.autoReminders),
        dress_code: normalizeEventDressCode(input?.dress_code ?? input?.dressCode),
        playlist_mode: normalizeEventPlaylistMode(input?.playlist_mode ?? input?.playlistMode)
    };
}

export function hasEventSettingsColumns(row) {
    if (!row || typeof row !== "object") return false;
    return ["description", "allow_plus_one", "auto_reminders", "dress_code", "playlist_mode"].some((key) => Object.prototype.hasOwnProperty.call(row, key));
}

export function getSuggestedEventSettingsFromInsights(eventInsights) {
    const relationshipCodes = Array.isArray(eventInsights?.relationshipCodes) ? eventInsights.relationshipCodes : [];
    const experienceTypeCodes = Array.isArray(eventInsights?.experienceTypeCodes) ? eventInsights.experienceTypeCodes : [];
    const consideredGuestsCount = Number(eventInsights?.consideredGuestsCount || 0);
    const musicCount = Array.isArray(eventInsights?.musicGenres) ? eventInsights.musicGenres.length : 0;

    const dressCode = experienceTypeCodes.some((code) => ["celebration", "party", "romantic_date"].includes(code)) ? "elegant" : experienceTypeCodes.some((code) => ["bbq", "movie_night", "book_club"].includes(code)) ? "casual" : "none";
    const allowPlusOne = consideredGuestsCount >= 8 || relationshipCodes.some((code) => ["friends", "family", "romantic"].includes(String(code || "").toLowerCase()));
    const autoReminders = consideredGuestsCount >= 6 || eventInsights?.timingRecommendation === "start_with_buffer";
    const playlistMode = musicCount >= 3 ? "spotify_collaborative" : musicCount >= 1 ? "collaborative" : "host_only";

    return { allowPlusOne, autoReminders, dressCode, playlistMode };
}

export function buildHostingPlaybookActions(eventInsights, t, options = {}) {
    if (!eventInsights?.hasData) return [];
    const eventContext = options?.eventContext || {};
    const eventDetail = options?.eventDetail || {};
    const attendance = options?.statusCounts || {};
    const pendingCount = Number(attendance.pending || 0);
    const allowPlusOne = Boolean(eventContext.allowPlusOne ?? eventDetail.allow_plus_one);
    const autoReminders = Boolean(eventContext.autoReminders ?? eventDetail.auto_reminders);
    const dressCodeKey = normalizeEventDressCode(eventContext.dressCode ?? eventDetail.dress_code);
    const playlistModeKey = normalizeEventPlaylistMode(eventContext.playlistMode ?? eventDetail.playlist_mode);
    const locationLabel = String(eventDetail.location_name || eventDetail.location_address || "").trim();
    const actions = [];

    if (Array.isArray(eventInsights.avoidItems) && eventInsights.avoidItems.length > 0) actions.push(interpolateText(t("smart_hosting_action_health"), { items: eventInsights.avoidItems.slice(0, 5).join(", ") }));
    if (Array.isArray(eventInsights.foodSuggestions) && eventInsights.foodSuggestions.length > 0) actions.push(interpolateText(t("smart_hosting_action_menu"), { items: eventInsights.foodSuggestions.slice(0, 4).join(", ") }));
    if (Array.isArray(eventInsights.drinkSuggestions) && eventInsights.drinkSuggestions.length > 0) actions.push(interpolateText(t("smart_hosting_action_drinks"), { items: eventInsights.drinkSuggestions.slice(0, 4).join(", ") }));
    if (Array.isArray(eventInsights.musicGenres) && eventInsights.musicGenres.length > 0) actions.push(interpolateText(t("smart_hosting_action_music"), { items: eventInsights.musicGenres.slice(0, 3).join(", ") }));
    if (Array.isArray(eventInsights.decorColors) && eventInsights.decorColors.length > 0) actions.push(interpolateText(t("smart_hosting_action_decor"), { items: eventInsights.decorColors.slice(0, 3).join(", ") }));
    if (Array.isArray(eventInsights.icebreakers) && eventInsights.icebreakers.length > 0) actions.push(interpolateText(t("smart_hosting_action_icebreaker"), { items: eventInsights.icebreakers.slice(0, 3).join(", ") }));
    if (Array.isArray(eventInsights.tabooTopics) && eventInsights.tabooTopics.length > 0) actions.push(interpolateText(t("smart_hosting_action_taboo"), { items: eventInsights.tabooTopics.slice(0, 3).join(", ") }));
    actions.push(eventInsights.timingRecommendation === "start_with_buffer" ? t("smart_hosting_action_timing_buffer") : t("smart_hosting_action_timing_on_time"));

    if (pendingCount > 0) actions.push(`${t("event_setting_auto_reminders")}: ${autoReminders ? t("status_yes") : t("status_no")}.`);
    if (allowPlusOne) actions.push(`${t("event_setting_allow_plus_one")}: ${t("status_yes")}.`);
    actions.push(`${t("event_setting_dress_code")}: ${t(`event_dress_code_${dressCodeKey}`)}.`);
    actions.push(`${t("event_setting_playlist_mode")}: ${t(`event_playlist_mode_${playlistModeKey}`)}.`);
    if (locationLabel) actions.push(`${t("field_place")}: ${locationLabel}.`);
    return actions.slice(0, 6);
}

export function rotateValues(values, shift = 0) {
    const source = Array.isArray(values) ? values.filter(Boolean) : [];
    if (source.length === 0) return [];
    const normalizedShift = ((Math.trunc(shift) % source.length) + source.length) % source.length;
    if (normalizedShift === 0) return source;
    return [...source.slice(normalizedShift), ...source.slice(0, normalizedShift)];
}

export function isAlcoholicDrink(value) {
    const normalized = normalizeLookupValue(value);
    return ["wine", "vino", "beer", "cerveza", "whisky", "whiskey", "gin", "vodka", "rum", "cocktail", "cava"].some((term) => normalized.includes(term));
}

export function rankItemsWithKeywords(items, keywords = [], contextText = "") {
    let options = {};
    if (contextText && typeof contextText === "object") { options = contextText; contextText = ""; }
    const normalizedKeywords = uniqueValues(keywords).map((item) => normalizeLookupValue(item)).filter(Boolean);
    const normalizedContext = normalizeLookupValue(contextText);
    const normalizedAvoidKeywords = uniqueValues(options?.avoidKeywords || []).map((item) => normalizeLookupValue(item)).filter(Boolean);
    const preferNonAlcohol = Boolean(options?.preferNonAlcohol);

    return [...items].sort((a, b) => {
        const scoreItem = (normalizedItem) => {
            let score = 0;
            for (const keyword of normalizedKeywords) if (normalizedItem.includes(keyword)) score += 3;
            if (normalizedContext && normalizedItem && normalizedContext.includes(normalizedItem)) score += 2;
            for (const avoidKeyword of normalizedAvoidKeywords) if (avoidKeyword && normalizedItem.includes(avoidKeyword)) score -= 4;
            if (preferNonAlcohol && isAlcoholicDrink(normalizedItem)) score -= 3;
            return score;
        };
        return scoreItem(normalizeLookupValue(b)) - scoreItem(normalizeLookupValue(a));
    });
}

export function buildPlannerHealthProfile(eventInsights = {}) {
    const healthSignals = uniqueValues([...(Array.isArray(eventInsights?.avoidItems) ? eventInsights.avoidItems : []), ...(Array.isArray(eventInsights?.medicalConditions) ? eventInsights.medicalConditions : []), ...(Array.isArray(eventInsights?.dietaryMedicalRestrictions) ? eventInsights.dietaryMedicalRestrictions : [])]);
    const normalizedSignals = normalizeLookupValue(healthSignals.join(" "));
    const avoidKeywords = new Set();
    const addKeywords = (items) => { for (const item of items) { const normalized = normalizeLookupValue(item); if (normalized) avoidKeywords.add(normalized); } };
    addKeywords(healthSignals);
    if (/(lact|dairy|leche|milk|queso|cheese|cream|nata)/.test(normalizedSignals)) addKeywords(["lactose", "dairy", "milk", "cheese", "cream", "nata"]);
    if (/(gluten|celiac|celiaco|celiac)/.test(normalizedSignals)) addKeywords(["gluten", "bread", "pasta", "flour", "harina"]);
    if (/(diabet|insulin|sugar|azucar|glycemic|glucem)/.test(normalizedSignals)) addKeywords(["sugar", "sweet", "cake", "dessert", "caramel", "chocolate", "syrup"]);
    if (/(hipertens|hypertens|sodium|salt|sal|renal|kidney|cardiac|corazon|heart)/.test(normalizedSignals)) addKeywords(["salt", "salty", "cured", "smoked", "sausage", "chips", "fried"]);

    return { avoidKeywords: Array.from(avoidKeywords), preferNonAlcohol: /(diabet|insulin|hypertens|renal|kidney|liver|hepatic|medic|pregnan|embaraz)/.test(normalizedSignals) };
}

export function parseEventDurationHours(sourceText, preset, momentKey) {
    const normalized = normalizeLookupValue(sourceText);
    const explicitHours = normalized.match(/\b(\d{1,2})\s*(h|hr|hrs|hora|horas)\b/);
    if (explicitHours) {
        const parsed = Number(explicitHours[1]);
        if (Number.isFinite(parsed)) return Math.max(2, Math.min(12, Math.round(parsed)));
    }
    let fallback = preset === "brunch" ? 3 : preset === "bbq" ? 5 : preset === "movie" ? 4 : preset === "bookclub" ? 3 : preset === "romantic" ? 4 : preset === "celebration" ? 5 : 4;
    if (momentKey === "night" && (preset === "celebration" || preset === "movie")) fallback += 1;
    return Math.max(2, Math.min(10, fallback));
}

export function buildEventPlannerContext(eventItem, language, t) {
    const source = eventItem || {};
    const title = String(source.title || "").trim();
    const description = String(source.description || "").trim();
    const locationName = String(source.location_name || "").trim();
    const locationAddress = String(source.location_address || "").trim();
    const allowPlusOne = Boolean(source.allow_plus_one ?? source.allowPlusOne);
    const autoReminders = Boolean(source.auto_reminders ?? source.autoReminders);
    const dressCode = normalizeEventDressCode(source.dress_code ?? source.dressCode);
    const playlistMode = normalizeEventPlaylistMode(source.playlist_mode ?? source.playlistMode);
    const eventTypeCode = toCatalogCode("experience_type", source.event_type) || normalizeLookupValue(source.event_type);
    const searchText = normalizeLookupValue(`${title} ${description} ${locationName} ${locationAddress}`);
    const parsedStart = source.start_at ? new Date(source.start_at) : null;
    const defaultHourFromType = EVENT_TYPE_TO_DEFAULT_HOUR[eventTypeCode] ?? 19;
    const hour = parsedStart && !Number.isNaN(parsedStart.getTime()) ? parsedStart.getHours() : defaultHourFromType;
    const momentKey = hour < 12 ? "morning" : hour < 18 ? "afternoon" : hour < 22 ? "evening" : "night";
    const toneKey = ["formal", "elegant"].includes(normalizeLookupValue(source.dress_code)) ? "formal" : "casual";

    let preset = EVENT_TYPE_TO_PLANNER_PRESET[eventTypeCode] || "social";
    if (!EVENT_TYPE_TO_PLANNER_PRESET[eventTypeCode]) {
        if (["bbq", "barbecue", "barbacoa"].some((v) => eventTypeCode.includes(v)) || ["calçot", "calcot", "barbac", "brasa", "parrill", "asado"].some((v) => searchText.includes(v))) preset = "bbq";
        else if (["brunch", "desayuno", "esmorzar", "breakfast"].some((v) => searchText.includes(v)) || eventTypeCode.includes("brunch") || (momentKey === "morning" && !eventTypeCode.includes("movie"))) preset = "brunch";
        else if (["romantic", "pareja", "valentin", "anniversary", "aniversari", "aniversario", "date"].some((v) => searchText.includes(v)) || eventTypeCode.includes("romantic")) preset = "romantic";
        else if (["party", "celebration", "cumple", "festa", "fiesta", "birthday"].some((v) => searchText.includes(v)) || eventTypeCode.includes("celebration") || eventTypeCode.includes("party")) preset = "celebration";
        else if (["movie", "cinema", "cine", "serie", "film"].some((v) => searchText.includes(v)) || eventTypeCode.includes("movie")) preset = "movie";
        else if (["book club", "club de lectura", "lectura", "llibre", "book"].some((v) => searchText.includes(v))) preset = "bookclub";
    }

    let budgetKey = "medium";
    if (["low cost", "budget", "cheap", "econom", "barat", "barato", "caser", "potluck"].some((v) => searchText.includes(v))) budgetKey = "low";
    else if (toneKey === "formal" || ["premium", "gourmet", "lux", "lujo", "elegan", "vip", "alta gama"].some((v) => searchText.includes(v))) budgetKey = "high";

    const durationHours = parseEventDurationHours(`${title} ${description} ${locationName} ${locationAddress} ${source.event_type || ""}`, preset, momentKey);
    const eventTypeLabel = toCatalogLabel("experience_type", source.event_type, language) || title || t(`event_planner_style_${preset}`);

    return { preset, momentKey, toneKey, budgetKey, durationHours, allowPlusOne, autoReminders, dressCode, playlistMode, hour, searchText, summary: `${eventTypeLabel} · ${t(`event_planner_moment_${momentKey}`)} · ${t(`event_planner_tone_${toneKey}`)} · ${t(`event_planner_budget_${budgetKey}`)} · ${interpolateText(t("event_planner_duration_hours"), { count: durationHours })}` };
}

export function buildEventMealPlan(eventInsights, eventContext, t, variantSeed = 0) {
    const context = eventContext || { preset: "social", momentKey: "evening", toneKey: "casual", budgetKey: "medium", durationHours: 4, searchText: "", summary: "" };
    const guestCount = Math.max(1, Number(eventInsights?.consideredGuestsCount || 0));
    const durationHours = Math.max(2, Math.min(12, Number(context.durationHours || 4)));
    const budgetKey = ["low", "medium", "high"].includes(context.budgetKey) ? context.budgetKey : "medium";
    const plannerHealthProfile = buildPlannerHealthProfile(eventInsights);
    const isHostedAtVenue = /restaurant|restaur|hotel|bar|thefork|local|sala/.test(String(context.searchText || ""));
    const foodBase = uniqueValues(Array.isArray(eventInsights?.foodSuggestions) ? eventInsights.foodSuggestions : []);
    const drinkBase = uniqueValues(Array.isArray(eventInsights?.drinkSuggestions) ? eventInsights.drinkSuggestions : []);
    const avoidBase = uniqueValues(Array.isArray(eventInsights?.avoidItems) ? eventInsights.avoidItems : []);
    const rotationSeed = Math.max(0, Number(variantSeed || 0));

    const contextKeywords = { bbq: ["bbq", "barbac", "brasa", "grill", "smoked", "asado", "parrill"], brunch: ["brunch", "toast", "huev", "egg", "croissant", "pancake", "avocado"], romantic: ["romantic", "trufa", "truffle", "candle", "gourmet", "chocolate"], celebration: ["celebr", "party", "fest", "cake", "sharing", "tapas"], movie: ["movie", "snack", "nacho", "pizza", "popcorn", "dip"], bookclub: ["book", "tea", "quiche", "salad", "light", "tart"], social: ["sharing", "seasonal", "mix", "table"] };
    const toneKeywords = context.toneKey === "formal" ? ["gourmet", "wine", "pairing", "seasonal", "chef"] : ["sharing", "casual", "tapas", "comfort"];
    const momentKeywords = context.momentKey === "morning" ? ["breakfast", "coffee", "toast", "fruit"] : context.momentKey === "afternoon" ? ["light", "fresh", "salad", "tea"] : context.momentKey === "night" ? ["dinner", "warm", "cocktail", "pairing"] : ["sunset", "snack", "mix"];
    const presetKeywords = uniqueValues([...(contextKeywords[context.preset] || contextKeywords.social), ...toneKeywords, ...momentKeywords]);

    const rankedFood = rankItemsWithKeywords(foodBase, presetKeywords, context.searchText, { avoidKeywords: plannerHealthProfile.avoidKeywords });
    const rankedDrink = rankItemsWithKeywords(drinkBase, presetKeywords, context.searchText, { avoidKeywords: plannerHealthProfile.avoidKeywords, preferNonAlcohol: plannerHealthProfile.preferNonAlcohol }).sort((a, b) => {
        if (plannerHealthProfile.preferNonAlcohol) return Number(isAlcoholicDrink(a)) - Number(isAlcoholicDrink(b));
        if (context.momentKey === "morning" || context.momentKey === "afternoon") return Number(isAlcoholicDrink(a)) - Number(isAlcoholicDrink(b));
        if (context.momentKey === "night") return Number(isAlcoholicDrink(b)) - Number(isAlcoholicDrink(a));
        return 0;
    });

    const contextualizePrimary = (item) => {
        const base = String(item || "").trim();
        if (!base || context.preset === "social") return base;
        return interpolateText(t("event_planner_context_item_template"), { style: t(`event_planner_style_${context.preset}`), item: base });
    };

    const pickSectionItems = ({ primaryItem, pool, fallback, count, seedOffset = 0 }) => {
        const rotatedPool = rotateValues(pool, rotationSeed + seedOffset);
        return uniqueValues([primaryItem, ...rotatedPool, ...fallback]).slice(0, count).filter(Boolean);
    };

    const fallbackFood = [t("event_menu_fallback_food_1"), t("event_menu_fallback_food_2")];
    const fallbackDessert = [t("event_planner_fallback_dessert_1"), t("event_planner_fallback_dessert_2")];
    const fallbackDrink = [t("event_menu_fallback_drink_1"), t("event_menu_fallback_drink_2")];
    const menuItems = rankedFood.length > 0 ? rankedFood : fallbackFood;
    const drinkItems = rankedDrink.length > 0 ? rankedDrink : fallbackDrink;

    const isLongEvent = durationHours >= 5;
    const isLargeGroup = guestCount >= 16;
    const starterCount = Math.min(4, (context.preset === "celebration" || context.preset === "bbq" ? 3 : 2) + (isLongEvent || isLargeGroup ? 1 : 0));
    const mainCount = Math.min(4, (context.preset === "bbq" ? 3 : 2) + (isLargeGroup ? 1 : 0));
    const dessertCount = Math.min(4, (context.preset === "romantic" || context.preset === "celebration" ? 3 : 2) + (isLongEvent ? 1 : 0));
    const drinkCount = Math.min(4, (context.preset === "celebration" || context.preset === "bbq" ? 3 : 2) + (isLongEvent ? 1 : 0) + (context.momentKey === "night" ? 1 : 0));

    const durationFactor = durationHours >= 6 ? 1.26 : durationHours >= 5 ? 1.16 : durationHours <= 3 ? 0.9 : 1;
    const guestLoadFactor = guestCount >= 30 ? 1.18 : guestCount >= 16 ? 1.08 : guestCount <= 6 ? 0.92 : 1;
    const locationFactor = isHostedAtVenue ? 0.82 : 1;
    const quantityFactor = durationFactor * guestLoadFactor * locationFactor;

    const menuSections = [
        { id: "starters", title: t("event_planner_section_starters"), items: pickSectionItems({ primaryItem: contextualizePrimary(menuItems[0] || t("event_menu_fallback_food_1")), pool: menuItems, fallback: [t("event_planner_fallback_starter_2"), ...fallbackFood], count: starterCount, seedOffset: 0 }) },
        { id: "main", title: t("event_planner_section_main"), items: pickSectionItems({ primaryItem: contextualizePrimary(menuItems[1] || menuItems[0] || t("event_menu_fallback_food_2")), pool: menuItems, fallback: [t("event_planner_fallback_main_2"), ...fallbackFood], count: mainCount, seedOffset: 2 }) },
        { id: "desserts", title: t("event_planner_section_desserts"), items: pickSectionItems({ primaryItem: contextualizePrimary(menuItems[2] || t("event_planner_fallback_dessert_1")), pool: menuItems, fallback: fallbackDessert, count: dessertCount, seedOffset: 4 }) },
        { id: "drinks", title: t("event_planner_section_drinks"), items: pickSectionItems({ primaryItem: contextualizePrimary(drinkItems[0] || t("event_menu_fallback_drink_1")), pool: drinkItems, fallback: fallbackDrink, count: drinkCount, seedOffset: 1 }) }
    ];

    const hasLactoseRestriction = avoidBase.some((item) => { const normalized = normalizeLookupValue(item); return normalized.includes("lact") || normalized.includes("dairy") || normalized.includes("lactic"); });

    const shoppingGroups = [
        { id: "vegetables", title: t("event_planner_group_vegetables"), items: [{ id: `vegetables-seasonal-${rotationSeed}`, name: t("event_planner_item_seasonal_vegetables"), quantity: `${Math.max(2, Math.ceil(guestCount * 0.3 * quantityFactor))} kg` }, { id: `vegetables-leaves-${rotationSeed}`, name: t("event_planner_item_leafy_mix"), quantity: `${Math.max(2, Math.ceil(guestCount * 0.2 * quantityFactor))} uds` }] },
        { id: "protein", title: t("event_planner_group_protein"), items: [{ id: `protein-main-${rotationSeed}`, name: menuSections[1].items[0] || t("event_planner_fallback_main_2"), quantity: `${Math.max(2, Math.ceil(guestCount * (context.preset === "bbq" ? 0.44 : 0.35) * quantityFactor))} ${t("event_planner_quantity_portions")}` }, { id: `protein-secondary-${rotationSeed}`, name: menuSections[1].items[1] || menuSections[0].items[0] || t("event_menu_fallback_food_2"), quantity: `${Math.max(2, Math.ceil(guestCount * (context.preset === "bbq" ? 0.3 : 0.25) * quantityFactor))} ${t("event_planner_quantity_portions")}` }] },
        { id: "dairy", title: t("event_planner_group_dairy"), items: [{ id: `dairy-dessert-${rotationSeed}`, name: menuSections[2].items[0] || t("event_planner_fallback_dessert_1"), quantity: `${Math.max(2, Math.ceil(guestCount * 0.22 * quantityFactor))} ${t("event_planner_quantity_portions")}`, warning: hasLactoseRestriction ? t("event_planner_warning_lactose") : "" }] },
        { id: "drinks", title: t("event_planner_group_drinks"), items: rotateValues(drinkItems, rotationSeed).slice(0, 3).map((item, index) => ({ id: `drinks-${index + 1}-${rotationSeed}`, name: item, quantity: `${Math.max(2, Math.ceil(guestCount * (context.momentKey === "night" ? 0.8 : 0.62) * quantityFactor))} ${t("event_planner_quantity_units")}` })) }
    ];

    const recipeCards = menuSections.map((sectionItem, index) => ({ id: `${sectionItem.id}-${index + 1}`, title: sectionItem.title, subtitle: sectionItem.items[0] || t("smart_hosting_no_data"), note: interpolateText(t("event_menu_recipe_card_note"), { portions: Math.max(4, Math.ceil(guestCount * 0.9)) }) }));

    const shoppingChecklist = shoppingGroups.flatMap((groupItem) => groupItem.items.map((item) => interpolateText(t("event_planner_shopping_line"), { group: groupItem.title, item: item.name, quantity: item.quantity })));
    if (avoidBase.length > 0) shoppingChecklist.push(interpolateText(t("event_menu_shopping_avoid_item"), { items: avoidBase.slice(0, 6).join(", ") }));
    shoppingChecklist.push(eventInsights?.timingRecommendation === "start_with_buffer" ? t("event_menu_shopping_timing_buffer") : t("event_menu_shopping_timing_on_time"));

    const contextCostFactor = context.preset === "romantic" ? 11.6 : context.preset === "celebration" ? 10.1 : context.preset === "bbq" ? 9.2 : context.preset === "brunch" ? 7.2 : 8.4;
    const budgetFactor = budgetKey === "low" ? 0.86 : budgetKey === "high" ? 1.22 : 1;
    const toneFactor = context.toneKey === "formal" ? 1.08 : 1;
    const durationCostFactor = durationHours >= 6 ? 1.22 : durationHours >= 5 ? 1.14 : durationHours <= 3 ? 0.9 : 1;
    const estimatedCost = Math.max(28, Math.round(guestCount * contextCostFactor * budgetFactor * toneFactor * durationCostFactor * (isHostedAtVenue ? 0.9 : 1) + avoidBase.length * 1.8));

    const contextSummary = interpolateText(t("event_planner_context_summary_template"), { style: t(`event_planner_style_${context.preset}`), moment: t(`event_planner_moment_${context.momentKey}`), tone: t(`event_planner_tone_${context.toneKey}`), budget: t(`event_planner_budget_${budgetKey}`), duration: interpolateText(t("event_planner_duration_hours"), { count: durationHours }), guests: interpolateText(t("event_planner_guests_count"), { count: guestCount }) });

    return { menuSections, shoppingGroups, estimatedCost, restrictions: avoidBase.slice(0, 8), contextSummary, recipeCards, shoppingChecklist };
}

export function applyPlannerOverrides(baseContext, baseInsights, overrides = {}) {
    const parseListValue = (value) => uniqueValues(String(value || "").split(/[\n,;]+/).map((item) => String(item || "").trim()).filter(Boolean));
    const parseBooleanValue = (value) => {
        if (typeof value === "boolean") return value;
        const normalized = String(value || "").trim().toLowerCase();
        if (["true", "1", "yes", "si"].includes(normalized)) return true;
        if (["false", "0", "no"].includes(normalized)) return false;
        return null;
    };
    const context = { ...(baseContext || {}), ...(overrides.preset ? { preset: String(overrides.preset).trim() } : {}), ...(overrides.momentKey ? { momentKey: String(overrides.momentKey).trim() } : {}), ...(overrides.toneKey ? { toneKey: String(overrides.toneKey).trim() } : {}), ...(overrides.budgetKey ? { budgetKey: String(overrides.budgetKey).trim() } : {}) };
    if (overrides.durationHours != null && String(overrides.durationHours).trim() !== "") {
        const parsedDuration = Number(overrides.durationHours);
        if (Number.isFinite(parsedDuration)) context.durationHours = Math.max(2, Math.min(12, Math.round(parsedDuration)));
    }
    if (Object.prototype.hasOwnProperty.call(overrides, "allowPlusOne")) { const parsed = parseBooleanValue(overrides.allowPlusOne); if (parsed != null) context.allowPlusOne = parsed; }
    if (Object.prototype.hasOwnProperty.call(overrides, "autoReminders")) { const parsed = parseBooleanValue(overrides.autoReminders); if (parsed != null) context.autoReminders = parsed; }
    if (Object.prototype.hasOwnProperty.call(overrides, "dressCode")) context.dressCode = normalizeEventDressCode(overrides.dressCode);
    if (Object.prototype.hasOwnProperty.call(overrides, "playlistMode")) context.playlistMode = normalizeEventPlaylistMode(overrides.playlistMode);

    const listKeys = ["foodSuggestions", "drinkSuggestions", "avoidItems", "medicalConditions", "dietaryMedicalRestrictions", "musicGenres", "decorColors", "icebreakers", "tabooTopics"];
    const insights = { ...(baseInsights || {}) };
    for (const key of listKeys) { if (Object.prototype.hasOwnProperty.call(overrides, key)) insights[key] = parseListValue(overrides[key]); }
    insights.medicalConditions = uniqueValues(insights.medicalConditions || []);
    insights.dietaryMedicalRestrictions = uniqueValues(insights.dietaryMedicalRestrictions || []);
    insights.avoidItems = uniqueValues([...(insights.avoidItems || []), ...insights.medicalConditions, ...insights.dietaryMedicalRestrictions]);
    if (Object.prototype.hasOwnProperty.call(overrides, "additionalInstructions")) insights.additionalInstructions = String(overrides.additionalInstructions || "").trim();

    return { context, insights };
}

export function buildEventPlannerPromptBundle({ eventDetail, eventContext, eventInsights, statusCounts, criticalRestrictions, healthAlerts, t }) {
    const eventItem = eventDetail || {};
    const attendance = statusCounts || { yes: 0, no: 0, maybe: 0, pending: 0 };
    const totalInvitations = Math.max(0, Number(attendance.yes || 0) + Number(attendance.no || 0) + Number(attendance.maybe || 0) + Number(attendance.pending || 0));
    const normalizedContext = eventContext || {};
    const effectiveAllowPlusOne = typeof normalizedContext.allowPlusOne === "boolean" ? normalizedContext.allowPlusOne : Boolean(eventItem.allow_plus_one);
    const effectiveAutoReminders = typeof normalizedContext.autoReminders === "boolean" ? normalizedContext.autoReminders : Boolean(eventItem.auto_reminders);
    const effectiveDressCode = normalizeEventDressCode(normalizedContext.dressCode ?? eventItem.dress_code);
    const effectivePlaylistMode = normalizeEventPlaylistMode(normalizedContext.playlistMode ?? eventItem.playlist_mode);

    const payload = {
        event: { id: String(eventItem.id || ""), title: String(eventItem.title || ""), status: String(eventItem.status || ""), eventType: String(eventItem.event_type || ""), description: String(eventItem.description || ""), startAtIso: String(eventItem.start_at || ""), locationName: String(eventItem.location_name || ""), locationAddress: String(eventItem.location_address || ""), settings: { allowPlusOne: effectiveAllowPlusOne, autoReminders: effectiveAutoReminders, dressCode: effectiveDressCode, playlistMode: effectivePlaylistMode, dressCodeLabel: t(`event_dress_code_${effectiveDressCode}`), playlistModeLabel: t(`event_playlist_mode_${effectivePlaylistMode}`) } },
        context: { stylePreset: String(normalizedContext.preset || "social"), moment: String(normalizedContext.momentKey || "evening"), tone: String(normalizedContext.toneKey || "casual"), budget: String(normalizedContext.budgetKey || "medium"), durationHours: Number(normalizedContext.durationHours || 4) },
        attendance: { totalInvitations, confirmed: Number(attendance.yes || 0), pending: Number(attendance.pending || 0), maybe: Number(attendance.maybe || 0), declined: Number(attendance.no || 0), acceptanceRate: totalInvitations > 0 ? Math.round((Number(attendance.yes || 0) / totalInvitations) * 100) : 0 },
        preferenceSignals: { guestCountAnalyzed: Number(eventInsights?.consideredGuestsCount || 0), relationships: uniqueValues(eventInsights?.relationshipMix || []).slice(0, 6), preferredExperiences: uniqueValues(eventInsights?.experienceTypes || []).slice(0, 6), preferredMoments: uniqueValues(eventInsights?.dayMoments || []).slice(0, 4), foodSuggestions: uniqueValues(eventInsights?.foodSuggestions || []).slice(0, 10), drinkSuggestions: uniqueValues(eventInsights?.drinkSuggestions || []).slice(0, 10), musicGenres: uniqueValues(eventInsights?.musicGenres || []).slice(0, 8), decorColors: uniqueValues(eventInsights?.decorColors || []).slice(0, 8), icebreakers: uniqueValues(eventInsights?.icebreakers || []).slice(0, 10), tabooTopics: uniqueValues(eventInsights?.tabooTopics || []).slice(0, 8), avoidItems: uniqueValues(eventInsights?.avoidItems || []).slice(0, 12), medicalConditions: uniqueValues(eventInsights?.medicalConditions || []).slice(0, 8), dietaryMedicalRestrictions: uniqueValues(eventInsights?.dietaryMedicalRestrictions || []).slice(0, 8) },
        health: { criticalRestrictions: uniqueValues(criticalRestrictions || []).slice(0, 10), alerts: (healthAlerts || []).slice(0, 8).map((item) => ({ guestName: String(item?.guestName || ""), avoid: uniqueValues(item?.avoid || []).slice(0, 6) })) },
        hostInstructions: String(eventInsights?.additionalInstructions || "").trim()
    };

    const prompt = JSON.stringify(payload, null, 2);
    return { payload, prompt };
}

export function buildEventHostPlaybook({ eventDetail, eventContext, eventInsights, statusCounts, criticalRestrictions, healthAlerts, variantSeed = 0, language, t }) {
    const eventItem = eventDetail || {};
    const context = eventContext || {};
    const attendance = statusCounts || { yes: 0, no: 0, maybe: 0, pending: 0 };
    const title = String(eventItem.title || t("field_event"));
    const confirmed = Number(attendance.yes || 0);
    const pending = Number(attendance.pending || 0);
    const maybe = Number(attendance.maybe || 0);
    const total = Math.max(0, confirmed + pending + maybe + Number(attendance.no || 0));
    const acceptanceRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    const pendingRate = total > 0 ? pending / total : 0;
    const startLabel = formatLongDate(eventItem.start_at, language, t("no_date"));
    const startTime = formatTimeLabel(eventItem.start_at, language, t("no_date"));
    const allowPlusOne = typeof context.allowPlusOne === "boolean" ? context.allowPlusOne : Boolean(eventItem.allow_plus_one);
    const autoReminders = typeof context.autoReminders === "boolean" ? context.autoReminders : Boolean(eventItem.auto_reminders);
    const dressCodeKey = normalizeEventDressCode(context.dressCode ?? eventItem.dress_code);
    const playlistModeKey = normalizeEventPlaylistMode(context.playlistMode ?? eventItem.playlist_mode);
    const dressCodeLabel = t(`event_dress_code_${dressCodeKey}`);
    const playlistModeLabel = t(`event_playlist_mode_${playlistModeKey}`);
    const plusOneEstimated = allowPlusOne ? Math.max(0, Math.round((confirmed + maybe) * 0.35)) : 0;
    const expectedGuestsWithPlusOne = confirmed + maybe + plusOneEstimated;

    const drinkHighlights = rotateValues(uniqueValues(eventInsights?.drinkSuggestions || []), variantSeed).slice(0, 4);
    const menuHighlights = rotateValues(uniqueValues(eventInsights?.foodSuggestions || []), variantSeed + 1).slice(0, 4);
    const musicHighlights = rotateValues(uniqueValues(eventInsights?.musicGenres || []), variantSeed + 2).slice(0, 4);
    const decorHighlights = rotateValues(uniqueValues(eventInsights?.decorColors || []), variantSeed + 3).slice(0, 4);
    const icebreakers = rotateValues(uniqueValues(eventInsights?.icebreakers || []), variantSeed + 4).slice(0, 5);
    const tabooTopics = rotateValues(uniqueValues(eventInsights?.tabooTopics || []), variantSeed + 5).slice(0, 4);
    const actionableItems = rotateValues(buildHostingPlaybookActions(eventInsights, t, { eventContext: context, eventDetail: eventItem, statusCounts: attendance }), variantSeed).slice(0, 6);

    const timeline = [
        { id: "phase-prep", title: t("event_planner_host_timeline_pre_title"), detail: interpolateText(t("event_planner_host_timeline_pre_detail"), { pending, date: startLabel }) + ` ${t("event_setting_auto_reminders")}: ${autoReminders ? t("status_yes") : t("status_no")}.` },
        { id: "phase-final", title: t("event_planner_host_timeline_final_title"), detail: interpolateText(t("event_planner_host_timeline_final_detail"), { menu: menuHighlights.slice(0, 2).join(", ") || t("smart_hosting_no_data") }) + (allowPlusOne ? ` ${interpolateText(t("event_planner_host_risk_capacity_detail"), { expected: expectedGuestsWithPlusOne })}` : "") },
        { id: "phase-live", title: t("event_planner_host_timeline_live_title"), detail: interpolateText(t("event_planner_host_timeline_live_detail"), { time: startTime, style: t(`event_planner_style_${context.preset || "social"}`) }) + ` ${t("event_setting_dress_code")}: ${dressCodeLabel}.` },
        { id: "phase-followup", title: t("event_planner_host_timeline_followup_title"), detail: t("event_planner_host_timeline_followup_detail") }
    ];

    const ambience = uniqueValues([
        musicHighlights.length ? interpolateText(t("event_planner_host_ambience_music"), { items: musicHighlights.join(", ") }) : "",
        decorHighlights.length ? interpolateText(t("event_planner_host_ambience_decor"), { items: decorHighlights.join(", ") }) : "",
        drinkHighlights.length ? interpolateText(t("event_planner_host_ambience_drinks"), { items: drinkHighlights.slice(0, 3).join(", ") }) : "",
        interpolateText(t("event_planner_host_ambience_tone"), { value: t(`event_planner_tone_${context.toneKey || "casual"}`) }),
        `${t("event_setting_playlist_mode")}: ${playlistModeLabel}.`,
        `${t("event_setting_allow_plus_one")}: ${allowPlusOne ? t("status_yes") : t("status_no")}.`
    ]).filter(Boolean);

    const conversation = uniqueValues([
        icebreakers.length ? interpolateText(t("event_planner_host_conversation_openers"), { items: icebreakers.slice(0, 3).join(", ") }) : "",
        tabooTopics.length ? interpolateText(t("event_planner_host_conversation_taboo"), { items: tabooTopics.join(", ") }) : "",
        interpolateText(t("event_planner_host_conversation_relationships"), { items: uniqueValues(eventInsights?.relationshipMix || []).slice(0, 3).join(", ") || t("smart_hosting_no_data") })
    ]).filter(Boolean);

    const messages = [
        { id: "pending", title: t("event_planner_host_message_pending_title"), text: interpolateText(t("event_planner_host_message_pending_template"), { event: title, date: startLabel, time: startTime }) + (allowPlusOne ? ` ${t("rsvp_plus_one_question")}` : "") },
        { id: "confirmed", title: t("event_planner_host_message_confirmed_title"), text: interpolateText(t("event_planner_host_message_confirmed_template"), { event: title }) + ` ${t("event_setting_dress_code")}: ${dressCodeLabel}. ${t("event_setting_playlist_mode")}: ${playlistModeLabel}.` },
        { id: "followup", title: t("event_planner_host_message_followup_title"), text: interpolateText(t("event_planner_host_message_followup_template"), { event: title }) }
    ];

    const riskHealthItems = uniqueValues([...(Array.isArray(criticalRestrictions) ? criticalRestrictions : []), ...(Array.isArray(healthAlerts) ? healthAlerts.flatMap((item) => item?.avoid || []) : []), ...(Array.isArray(eventInsights?.medicalConditions) ? eventInsights.medicalConditions : []), ...(Array.isArray(eventInsights?.dietaryMedicalRestrictions) ? eventInsights.dietaryMedicalRestrictions : [])]).slice(0, 8);
    const risks = [];

    if (riskHealthItems.length > 0) risks.push({ id: "risk-health", level: "status-no", label: t("event_planner_host_risk_health_title"), detail: interpolateText(t("event_planner_host_risk_health_detail"), { items: riskHealthItems.slice(0, 5).join(", ") }) });
    if (pendingRate >= 0.35 || (pending > 0 && !autoReminders)) risks.push({ id: "risk-rsvp", level: pending > 0 && !autoReminders ? "status-no" : "status-pending", label: t("event_planner_host_risk_rsvp_title"), detail: interpolateText(t("event_planner_host_risk_rsvp_detail"), { pending, total }) + (pending > 0 && !autoReminders ? ` ${t("event_setting_auto_reminders")}: ${t("status_no")}.` : "") });
    if (allowPlusOne && plusOneEstimated >= 2) risks.push({ id: "risk-capacity", level: "status-maybe", label: t("event_planner_host_risk_capacity_title"), detail: interpolateText(t("event_planner_host_risk_capacity_detail"), { expected: expectedGuestsWithPlusOne }) });
    if (playlistModeKey === "host_only" && musicHighlights.length >= 3) risks.push({ id: "risk-playlist", level: "status-pending", label: t("event_planner_host_risk_playlist_title"), detail: interpolateText(t("event_planner_host_risk_playlist_detail"), { count: musicHighlights.length }) });
    if (eventInsights?.timingRecommendation === "start_with_buffer") risks.push({ id: "risk-timing", level: "status-maybe", label: t("event_planner_host_risk_timing_title"), detail: t("event_planner_host_risk_timing_detail") });
    if (healthAlerts.length === 0 && pendingRate < 0.2) risks.push({ id: "risk-none", level: "status-yes", label: t("event_planner_host_risk_none_title"), detail: t("event_planner_host_risk_none_detail") });

    return { acceptanceRate, actionableItems, timeline, ambience, conversation, messages, risks };
}