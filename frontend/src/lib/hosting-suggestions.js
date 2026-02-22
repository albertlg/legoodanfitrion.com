import { toCatalogCode, toCatalogLabel } from "./guest-catalogs";

function normalizeText(value) {
  return String(value || "").trim();
}

function toNormalizedKey(value) {
  return normalizeText(value).toLowerCase();
}

function toList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function uniqueList(values) {
  return Array.from(new Set(values.map((item) => normalizeText(item)).filter(Boolean)));
}

function topValues(values, limit = 6) {
  const counters = new Map();
  for (const value of values) {
    const normalized = toNormalizedKey(value);
    if (!normalized) {
      continue;
    }
    const prev = counters.get(normalized);
    if (prev) {
      prev.count += 1;
    } else {
      counters.set(normalized, { label: normalizeText(value), count: 1 });
    }
  }

  return Array.from(counters.values())
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label);
    })
    .slice(0, limit)
    .map((item) => item.label);
}

function inferAvoidListFromAllergens(allergens) {
  const dictionary = {
    milk: ["milk", "dairy", "cream", "cheese"],
    eggs: ["egg", "mayonnaise"],
    peanuts: ["peanut"],
    tree_nuts: ["nuts", "almond", "hazelnut", "walnut"],
    shellfish: ["shrimp", "prawn", "shellfish"],
    fish: ["fish"],
    soy: ["soy"],
    wheat: ["wheat"],
    sesame: ["sesame"],
    gluten: ["gluten", "wheat"],
    lactose: ["lactose", "dairy"],
    caffeine: ["coffee", "energy drink"],
    sulfites: ["sulfites"],
    animal_hair: ["pet hair", "animal dander"]
  };

  const inferred = [];
  for (const allergen of allergens) {
    const key = toCatalogCode("allergy", allergen) || toCatalogCode("intolerance", allergen) || toNormalizedKey(allergen);
    inferred.push(normalizeText(allergen));
    if (dictionary[key]) {
      inferred.push(...dictionary[key]);
    }
  }

  return uniqueList(inferred);
}

function toPetAllergyLabel(value, language) {
  const raw = normalizeText(value);
  if (!raw) {
    return "";
  }
  const petLabel = toCatalogLabel("pet", raw, language);
  if (petLabel !== raw) {
    return petLabel;
  }
  return toCatalogLabel("allergy", raw, language);
}

function buildHostingSuggestions({
  eventId,
  events,
  guests,
  invitations,
  guestPreferencesById,
  guestSensitiveById,
  language
}) {
  const selectedEvent = events.find((item) => item.id === eventId) || null;
  const invitedIds = selectedEvent
    ? uniqueList(
        invitations
          .filter((invitation) => invitation.event_id === selectedEvent.id)
          .map((invitation) => invitation.guest_id)
      )
    : [];

  const sourceGuests = invitedIds.length
    ? guests.filter((guest) => invitedIds.includes(guest.id))
    : guests;

  const scope = invitedIds.length ? "event" : "all";

  const foodLikes = [];
  const drinkLikes = [];
  const drinkDislikes = [];
  const explicitFoodDislikes = [];
  const colors = [];
  const genres = [];
  const icebreakers = [];
  const tabooTopics = [];
  const dayMoments = [];
  const experienceTypes = [];
  const relationshipMix = [];
  const relationshipCodes = [];
  const experienceTypeCodes = [];
  const allergiesAndIntolerances = [];
  const petAllergies = [];
  let punctualOnTime = 0;
  let punctualFlexible = 0;

  for (const guest of sourceGuests) {
    const prefs = guestPreferencesById[guest.id] || {};
    const sensitive = guestSensitiveById[guest.id] || {};

    foodLikes.push(...toList(prefs.food_likes));
    foodLikes.push(...toList(prefs.cuisine_types).map((item) => toCatalogLabel("cuisine_type", item, language)));
    drinkLikes.push(...toList(prefs.drink_likes).map((item) => toCatalogLabel("drink", item, language)));
    drinkDislikes.push(...toList(prefs.drink_dislikes).map((item) => toCatalogLabel("drink", item, language)));
    explicitFoodDislikes.push(...toList(prefs.food_dislikes));
    colors.push(...toList(prefs.favorite_color).map((item) => toCatalogLabel("color", item, language)));
    genres.push(...toList(prefs.music_genres).map((item) => toCatalogLabel("music_genre", item, language)));
    dayMoments.push(...toList(prefs.preferred_day_moments).map((item) => toCatalogLabel("day_moment", item, language)));
    experienceTypes.push(...toList(prefs.experience_types).map((item) => toCatalogLabel("experience_type", item, language)));
    experienceTypeCodes.push(...toList(prefs.experience_types).map((item) => toCatalogCode("experience_type", item) || ""));
    relationshipMix.push(...toList(guest.relationship).map((item) => toCatalogLabel("relationship", item, language)));
    relationshipCodes.push(...toList(guest.relationship).map((item) => toCatalogCode("relationship", item) || ""));
    relationshipMix.push(
      ...toList(prefs.preferred_guest_relationships).map((item) => toCatalogLabel("relationship", item, language))
    );
    relationshipCodes.push(
      ...toList(prefs.preferred_guest_relationships).map((item) => toCatalogCode("relationship", item) || "")
    );

    const punctualityValue = toCatalogCode("punctuality", prefs.punctuality);
    if (punctualityValue === "yes") {
      punctualOnTime += 1;
    } else if (punctualityValue) {
      punctualFlexible += 1;
    }

    icebreakers.push(...toList(prefs.last_talk_topic));
    icebreakers.push(...toList(prefs.books));
    icebreakers.push(...toList(prefs.movies));
    icebreakers.push(...toList(prefs.series));
    icebreakers.push(...toList(prefs.sports).map((item) => toCatalogLabel("sport", item, language)));

    tabooTopics.push(...toList(prefs.taboo_topics));

    allergiesAndIntolerances.push(...toList(sensitive.allergies).map((item) => toCatalogLabel("allergy", item, language)));
    allergiesAndIntolerances.push(
      ...toList(sensitive.intolerances).map((item) => toCatalogLabel("intolerance", item, language))
    );
    petAllergies.push(...toList(sensitive.pet_allergies).map((item) => toPetAllergyLabel(item, language)));
  }

  const avoidItems = uniqueList([
    ...explicitFoodDislikes,
    ...drinkDislikes,
    ...petAllergies,
    ...inferAvoidListFromAllergens(allergiesAndIntolerances)
  ]);

  const foodSuggestions = topValues(foodLikes).filter((item) => {
    const key = toNormalizedKey(item);
    return !avoidItems.some((avoid) => key.includes(toNormalizedKey(avoid)));
  });

  const drinkSuggestions = topValues(drinkLikes).filter((item) => {
    const key = toNormalizedKey(item);
    return !avoidItems.some((avoid) => key.includes(toNormalizedKey(avoid)));
  });

  const timingRecommendation =
    punctualFlexible > punctualOnTime
      ? "start_with_buffer"
      : "start_on_time";

  return {
    scope,
    selectedEventTitle: selectedEvent?.title || "",
    consideredGuestsCount: sourceGuests.length,
    relationshipMix: topValues(relationshipMix),
    relationshipCodes: topValues(relationshipCodes),
    experienceTypes: topValues(experienceTypes),
    experienceTypeCodes: topValues(experienceTypeCodes),
    dayMoments: topValues(dayMoments),
    foodSuggestions,
    drinkSuggestions,
    avoidItems: topValues(avoidItems),
    decorColors: topValues(colors),
    musicGenres: topValues(genres),
    icebreakers: topValues(icebreakers, 8),
    tabooTopics: topValues(tabooTopics, 6),
    timingRecommendation,
    hasData: sourceGuests.length > 0
  };
}

export { buildHostingSuggestions };
