const LANGUAGE_FALLBACK = "es";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLookup(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const CATALOGS = {
  experience_type: [
    { code: "bbq", labels: { es: "Barbacoa", ca: "Barbacoa", en: "BBQ", fr: "Barbecue" } },
    { code: "celebration", labels: { es: "Celebración", ca: "Celebració", en: "Celebration", fr: "Celebration" } },
    { code: "party", labels: { es: "Fiesta", ca: "Festa", en: "Party", fr: "Fete" } },
    { code: "movie_night", labels: { es: "Noche de cine", ca: "Nit de cinema", en: "Movie night", fr: "Soiree cinema" } },
    { code: "book_club", labels: { es: "Club de lectura", ca: "Club de lectura", en: "Book club", fr: "Club de lecture" } },
    { code: "afterwork", labels: { es: "Afterwork", ca: "Afterwork", en: "Afterwork", fr: "Afterwork" } },
    { code: "dinner", labels: { es: "Cena", ca: "Sopar", en: "Dinner", fr: "Diner" } },
    { code: "romantic_date", labels: { es: "Cita romántica", ca: "Cita romàntica", en: "Romantic date", fr: "Rendez-vous romantique" } },
    { code: "jam_session", labels: { es: "Jam session", ca: "Jam session", en: "Jam session", fr: "Jam session" } },
    { code: "picnic", labels: { es: "Pícnic", ca: "Pícnic", en: "Picnic", fr: "Pique-nique" } }
  ],
  relationship: [
    { code: "family", labels: { es: "Familia", ca: "Familia", en: "Family", fr: "Famille" } },
    { code: "friends", labels: { es: "Amistad", ca: "Amistat", en: "Friends", fr: "Amis" }, aliases: ["friend"] },
    { code: "coworkers", labels: { es: "Trabajo", ca: "Feina", en: "Coworkers", fr: "Collegues" }, aliases: ["coworker"] },
    { code: "romantic", labels: { es: "Pareja", ca: "Parella", en: "Romantic", fr: "Couple" } },
    { code: "neighbors", labels: { es: "Vecindario", ca: "Veinat", en: "Neighbors", fr: "Voisinage" }, aliases: ["neighbor"] },
    { code: "classmates", labels: { es: "Exalumnado", ca: "Exalumnat", en: "Classmates", fr: "Anciens eleves" }, aliases: ["classmate"] },
    { code: "club", labels: { es: "Club", ca: "Club", en: "Club", fr: "Club" } }
  ],
  day_moment: [
    { code: "morning", labels: { es: "Mañana", ca: "Matí", en: "Morning", fr: "Matin" } },
    { code: "afternoon", labels: { es: "Tarde", ca: "Tarda", en: "Afternoon", fr: "Apres-midi" } },
    { code: "evening", labels: { es: "Noche", ca: "Vespre", en: "Evening", fr: "Soiree" } },
    { code: "night", labels: { es: "Noche tardía", ca: "Nit", en: "Night", fr: "Nuit" } },
    { code: "all_day", labels: { es: "Todo el día", ca: "Tot el dia", en: "All day", fr: "Toute la journee" } },
    { code: "weekend", labels: { es: "Fin de semana", ca: "Cap de setmana", en: "Weekend", fr: "Week-end" } }
  ],
  periodicity: [
    { code: "weekly", labels: { es: "Semanal", ca: "Setmanal", en: "Weekly", fr: "Hebdomadaire" } },
    { code: "biweekly", labels: { es: "Quincenal", ca: "Quinzenal", en: "Biweekly", fr: "Bimensuel" } },
    { code: "monthly", labels: { es: "Mensual", ca: "Mensual", en: "Monthly", fr: "Mensuel" } },
    { code: "quarterly", labels: { es: "Trimestral", ca: "Trimestral", en: "Quarterly", fr: "Trimestriel" } },
    { code: "one_off", labels: { es: "Puntual", ca: "Puntual", en: "One-off", fr: "Occasionnel" } }
  ],
  punctuality: [
    { code: "yes", labels: { es: "Sí", ca: "Sí", en: "Yes", fr: "Oui" }, aliases: ["si"] },
    { code: "no", labels: { es: "No", ca: "No", en: "No", fr: "Non" } },
    { code: "depends", labels: { es: "Depende", ca: "Depèn", en: "It depends", fr: "Cela depend" }, aliases: ["it depends"] },
    { code: "unknown", labels: { es: "No lo sé", ca: "No ho sé", en: "Unknown", fr: "Inconnu" } }
  ],
  diet_type: [
    { code: "omnivore", labels: { es: "Omnívora", ca: "Omnívora", en: "Omnivore", fr: "Omnivore" } },
    { code: "carnivore", labels: { es: "Carnívora", ca: "Carnívora", en: "Carnivore", fr: "Carnivore" } },
    { code: "vegetarian", labels: { es: "Vegetariana", ca: "Vegetariana", en: "Vegetarian", fr: "Vegetarienne" } },
    { code: "lacto_vegetarian", labels: { es: "Lacto-vegetariana", ca: "Lacto-vegetariana", en: "Lacto-vegetarian", fr: "Lacto-vegetarienne" } },
    { code: "lacto_ovo_vegetarian", labels: { es: "Lacto-ovo-vegetariana", ca: "Lacto-ovo-vegetariana", en: "Lacto-ovo-vegetarian", fr: "Lacto-ovo-vegetarienne" } },
    { code: "pescatarian", labels: { es: "Pescetariana", ca: "Pescetariana", en: "Pescatarian", fr: "Pescetarienne" } },
    { code: "flexitarian", labels: { es: "Flexitariana", ca: "Flexitariana", en: "Flexitarian", fr: "Flexitarienne" } },
    { code: "paleo", labels: { es: "Paleo", ca: "Paleo", en: "Paleo", fr: "Paleo" } },
    { code: "vegan", labels: { es: "Vegana", ca: "Vegana", en: "Vegan", fr: "Vegane" } },
    { code: "gluten_free", labels: { es: "Sin gluten", ca: "Sense gluten", en: "Gluten-free", fr: "Sans gluten" } },
    { code: "lactose_free", labels: { es: "Sin lactosa", ca: "Sense lactosa", en: "Lactose-free", fr: "Sans lactose" } }
  ],
  tasting_preference: [
    { code: "salty", labels: { es: "Salado", ca: "Salat", en: "Salty", fr: "Sale" } },
    { code: "sweet", labels: { es: "Dulce", ca: "Dolc", en: "Sweet", fr: "Sucre" } },
    { code: "sour", labels: { es: "Ácido", ca: "Acid", en: "Sour", fr: "Acide" } },
    { code: "bitter", labels: { es: "Amargo", ca: "Amarg", en: "Bitter", fr: "Amer" } },
    { code: "umami", labels: { es: "Umami", ca: "Umami", en: "Umami", fr: "Umami" } },
    { code: "spicy", labels: { es: "Picante", ca: "Picant", en: "Spicy", fr: "Epice" } }
  ],
  cuisine_type: [
    { code: "mediterranean", labels: { es: "Mediterránea", ca: "Mediterrània", en: "Mediterranean", fr: "Mediterraneenne" } },
    { code: "spanish", labels: { es: "Española", ca: "Espanyola", en: "Spanish", fr: "Espagnole" } },
    { code: "catalan", labels: { es: "Catalana", ca: "Catalana", en: "Catalan", fr: "Catalane" } },
    { code: "italian", labels: { es: "Italiana", ca: "Italiana", en: "Italian", fr: "Italienne" } },
    { code: "japanese", labels: { es: "Japonesa", ca: "Japonesa", en: "Japanese", fr: "Japonaise" } },
    { code: "mexican", labels: { es: "Mexicana", ca: "Mexicana", en: "Mexican", fr: "Mexicaine" } },
    { code: "indian", labels: { es: "India", ca: "India", en: "Indian", fr: "Indienne" } },
    { code: "middle_eastern", labels: { es: "Oriente Medio", ca: "Orient Mitjà", en: "Middle Eastern", fr: "Moyen-Orient" } },
    { code: "american", labels: { es: "Americana", ca: "Americana", en: "American", fr: "Americaine" } },
    { code: "french", labels: { es: "Francesa", ca: "Francesa", en: "French", fr: "Francaise" } },
    { code: "vegan", labels: { es: "Vegana", ca: "Vegana", en: "Vegan", fr: "Vegane" } }
  ],
  drink: [
    { code: "water", labels: { es: "Agua", ca: "Aigua", en: "Water", fr: "Eau" } },
    { code: "sparkling_water", labels: { es: "Agua con gas", ca: "Aigua amb gas", en: "Sparkling water", fr: "Eau petillante" } },
    { code: "beer", labels: { es: "Cerveza", ca: "Cervesa", en: "Beer", fr: "Biere" } },
    { code: "wine", labels: { es: "Vino", ca: "Vi", en: "Wine", fr: "Vin" } },
    { code: "red_wine", labels: { es: "Vino tinto", ca: "Vi negre", en: "Red wine", fr: "Vin rouge" } },
    { code: "white_wine", labels: { es: "Vino blanco", ca: "Vi blanc", en: "White wine", fr: "Vin blanc" } },
    { code: "rose_wine", labels: { es: "Vino rosado", ca: "Vi rosat", en: "Rose wine", fr: "Vin rose" } },
    { code: "sparkling_wine", labels: { es: "Vino espumoso", ca: "Vi escumos", en: "Sparkling wine", fr: "Vin effervescent" } },
    { code: "whisky", labels: { es: "Whisky", ca: "Whisky", en: "Whisky", fr: "Whisky" } },
    { code: "gin", labels: { es: "Ginebra", ca: "Ginebra", en: "Gin", fr: "Gin" } },
    { code: "rum", labels: { es: "Ron", ca: "Rom", en: "Rum", fr: "Rhum" } },
    { code: "vodka", labels: { es: "Vodka", ca: "Vodka", en: "Vodka", fr: "Vodka" } },
    { code: "vermouth", labels: { es: "Vermut", ca: "Vermut", en: "Vermouth", fr: "Vermouth" } },
    { code: "bourbon", labels: { es: "Bourbon", ca: "Bourbon", en: "Bourbon", fr: "Bourbon" } },
    { code: "cocktail", labels: { es: "Cóctel", ca: "Còctel", en: "Cocktail", fr: "Cocktail" } },
    { code: "soft_drink", labels: { es: "Refresco", ca: "Refresc", en: "Soft drink", fr: "Boisson gazeuse" } },
    { code: "coffee", labels: { es: "Café", ca: "Cafè", en: "Coffee", fr: "Cafe" } },
    { code: "tea", labels: { es: "Té", ca: "Te", en: "Tea", fr: "The" } }
  ],
  music_genre: [
    { code: "pop", labels: { es: "Pop", ca: "Pop", en: "Pop", fr: "Pop" } },
    { code: "rock", labels: { es: "Rock", ca: "Rock", en: "Rock", fr: "Rock" } },
    { code: "indie", labels: { es: "Indie", ca: "Indie", en: "Indie", fr: "Indie" } },
    { code: "jazz", labels: { es: "Jazz", ca: "Jazz", en: "Jazz", fr: "Jazz" } },
    { code: "blues", labels: { es: "Blues", ca: "Blues", en: "Blues", fr: "Blues" } },
    { code: "classical", labels: { es: "Clásica", ca: "Clàssica", en: "Classical", fr: "Classique" } },
    { code: "electronic", labels: { es: "Electrónica", ca: "Electrònica", en: "Electronic", fr: "Electronique" } },
    { code: "house", labels: { es: "House", ca: "House", en: "House", fr: "House" } },
    { code: "techno", labels: { es: "Techno", ca: "Techno", en: "Techno", fr: "Techno" } },
    { code: "reggaeton", labels: { es: "Reguetón", ca: "Reggaeton", en: "Reggaeton", fr: "Reggaeton" } },
    { code: "latin", labels: { es: "Latina", ca: "Llatina", en: "Latin", fr: "Latine" } },
    { code: "hip_hop", labels: { es: "Hip-hop", ca: "Hip-hop", en: "Hip-hop", fr: "Hip-hop" } },
    { code: "rnb", labels: { es: "R&B", ca: "R&B", en: "R&B", fr: "R&B" } },
    { code: "flamenco", labels: { es: "Flamenco", ca: "Flamenc", en: "Flamenco", fr: "Flamenco" } }
  ],
  sport: [
    { code: "football", labels: { es: "Fútbol", ca: "Futbol", en: "Football", fr: "Football" } },
    { code: "basketball", labels: { es: "Baloncesto", ca: "Bàsquet", en: "Basketball", fr: "Basketball" } },
    { code: "tennis", labels: { es: "Tenis", ca: "Tennis", en: "Tennis", fr: "Tennis" } },
    { code: "padel", labels: { es: "Pádel", ca: "Pàdel", en: "Padel", fr: "Padel" } },
    { code: "running", labels: { es: "Running", ca: "Running", en: "Running", fr: "Course" } },
    { code: "cycling", labels: { es: "Ciclismo", ca: "Ciclisme", en: "Cycling", fr: "Cyclisme" } },
    { code: "swimming", labels: { es: "Natación", ca: "Natació", en: "Swimming", fr: "Natation" } },
    { code: "gym", labels: { es: "Gimnasio", ca: "Gimnàs", en: "Gym", fr: "Salle" } },
    { code: "yoga", labels: { es: "Yoga", ca: "Ioga", en: "Yoga", fr: "Yoga" } },
    { code: "hiking", labels: { es: "Senderismo", ca: "Senderisme", en: "Hiking", fr: "Randonnee" } },
    { code: "climbing", labels: { es: "Escalada", ca: "Escalada", en: "Climbing", fr: "Escalade" } },
    { code: "surf", labels: { es: "Surf", ca: "Surf", en: "Surf", fr: "Surf" } }
  ],
  color: [
    { code: "blue", labels: { es: "Azul", ca: "Blau", en: "Blue", fr: "Bleu" } },
    { code: "black", labels: { es: "Negro", ca: "Negre", en: "Black", fr: "Noir" } },
    { code: "gray", labels: { es: "Gris", ca: "Gris", en: "Gray", fr: "Gris" } },
    { code: "pink", labels: { es: "Rosa", ca: "Rosa", en: "Pink", fr: "Rose" } },
    { code: "white", labels: { es: "Blanco", ca: "Blanc", en: "White", fr: "Blanc" } },
    { code: "green", labels: { es: "Verde", ca: "Verd", en: "Green", fr: "Vert" } },
    { code: "red", labels: { es: "Rojo", ca: "Vermell", en: "Red", fr: "Rouge" } },
    { code: "yellow", labels: { es: "Amarillo", ca: "Groc", en: "Yellow", fr: "Jaune" } },
    { code: "orange", labels: { es: "Naranja", ca: "Taronja", en: "Orange", fr: "Orange" } },
    { code: "turquoise", labels: { es: "Turquesa", ca: "Turquesa", en: "Turquoise", fr: "Turquoise" } },
    { code: "purple", labels: { es: "Morado", ca: "Lila", en: "Purple", fr: "Violet" } },
    { code: "brown", labels: { es: "Marrón", ca: "Marró", en: "Brown", fr: "Marron" } },
    { code: "beige", labels: { es: "Beige", ca: "Beix", en: "Beige", fr: "Beige" } },
    { code: "violet", labels: { es: "Violeta", ca: "Violeta", en: "Violet", fr: "Violet" } },
    { code: "lime", labels: { es: "Lima", ca: "Llima", en: "Lime", fr: "Citron vert" } }
  ],
  pet: [
    { code: "cat", labels: { es: "Gatos", ca: "Gats", en: "Cats", fr: "Chats" }, aliases: ["cat", "cats"] },
    { code: "dog", labels: { es: "Perros", ca: "Gossos", en: "Dogs", fr: "Chiens" }, aliases: ["dog", "dogs"] },
    { code: "bird", labels: { es: "Aves", ca: "Ocells", en: "Birds", fr: "Oiseaux" }, aliases: ["bird", "birds"] },
    { code: "small_mammal", labels: { es: "Pequeños mamíferos", ca: "Petits mamífers", en: "Small mammals", fr: "Petits mammiferes" } },
    { code: "aquarium", labels: { es: "Acuario", ca: "Aquari", en: "Aquarium", fr: "Aquarium" } },
    { code: "reptile", labels: { es: "Reptiles", ca: "Rèptils", en: "Reptiles", fr: "Reptiles" }, aliases: ["reptile", "reptiles"] }
  ],
  allergy: [
    { code: "milk", labels: { es: "Leche", ca: "Llet", en: "Cow's Milk", fr: "Lait" } },
    { code: "eggs", labels: { es: "Huevos", ca: "Ous", en: "Eggs", fr: "Oeufs" } },
    { code: "tree_nuts", labels: { es: "Frutos secos", ca: "Fruits secs", en: "Tree Nuts", fr: "Fruits a coque" } },
    { code: "peanuts", labels: { es: "Cacahuete", ca: "Cacauet", en: "Peanuts", fr: "Arachides" } },
    { code: "shellfish", labels: { es: "Marisco", ca: "Marisc", en: "Shellfish", fr: "Crustaces" } },
    { code: "wheat", labels: { es: "Trigo", ca: "Blat", en: "Wheat", fr: "Ble" } },
    { code: "soy", labels: { es: "Soja", ca: "Soja", en: "Soy", fr: "Soja" } },
    { code: "fish", labels: { es: "Pescado", ca: "Peix", en: "Fish", fr: "Poisson" } },
    { code: "sesame", labels: { es: "Sésamo", ca: "Sèsam", en: "Sesame", fr: "Sesame" } },
    { code: "celery", labels: { es: "Apio", ca: "Api", en: "Celery", fr: "Celeri" } },
    { code: "mustard", labels: { es: "Mostaza", ca: "Mostassa", en: "Mustard", fr: "Moutarde" } },
    { code: "garlic", labels: { es: "Ajo", ca: "All", en: "Garlic", fr: "Ail" } },
    { code: "latex", labels: { es: "Látex", ca: "Làtex", en: "Latex", fr: "Latex" } },
    { code: "mold", labels: { es: "Moho", ca: "Floridura", en: "Mold", fr: "Moisissure" } },
    { code: "dust_mites", labels: { es: "Ácaros del polvo", ca: "Àcars de la pols", en: "Dust mites", fr: "Acariens" } },
    { code: "animal_hair", labels: { es: "Pelo de animales", ca: "Pèl d'animals", en: "Animal skin or hair", fr: "Poils d'animaux" } },
    { code: "pollen", labels: { es: "Polen", ca: "Pol·len", en: "Pollen", fr: "Pollen" } },
    { code: "medicines", labels: { es: "Medicamentos", ca: "Medicaments", en: "Medicines", fr: "Medicaments" } },
    { code: "kiwi", labels: { es: "Kiwi", ca: "Kiwi", en: "Kiwi", fr: "Kiwi" } },
    { code: "peach", labels: { es: "Melocotón", ca: "Préssec", en: "Peach", fr: "Peche" } },
    { code: "banana", labels: { es: "Plátano", ca: "Plàtan", en: "Banana", fr: "Banane" } },
    { code: "avocado", labels: { es: "Aguacate", ca: "Alvocat", en: "Avocado", fr: "Avocat" } },
    { code: "insect_stings", labels: { es: "Picaduras de insectos", ca: "Picades d'insectes", en: "Insect bites and stings", fr: "Piqures d'insectes" } }
  ],
  intolerance: [
    { code: "lactose", labels: { es: "Lactosa", ca: "Lactosa", en: "Dairy (Lactose)", fr: "Lactose" } },
    { code: "gluten", labels: { es: "Gluten", ca: "Gluten", en: "Gluten", fr: "Gluten" } },
    { code: "caffeine", labels: { es: "Cafeína", ca: "Cafeïna", en: "Caffeine", fr: "Cafeine" } },
    { code: "salicylates", labels: { es: "Salicilatos", ca: "Salicilats", en: "Salicylates", fr: "Salicylates" } },
    { code: "amines", labels: { es: "Aminas", ca: "Amines", en: "Amines", fr: "Amines" } },
    { code: "fodmaps", labels: { es: "FODMAPs", ca: "FODMAPs", en: "FODMAPs", fr: "FODMAPs" } },
    { code: "sulfites", labels: { es: "Sulfitos", ca: "Sulfits", en: "Sulfites", fr: "Sulfites" } },
    { code: "fructose", labels: { es: "Fructosa", ca: "Fructosa", en: "Fructose", fr: "Fructose" } },
    { code: "aspartame", labels: { es: "Aspartamo", ca: "Aspartam", en: "Aspartame", fr: "Aspartame" } },
    { code: "eggs", labels: { es: "Huevos", ca: "Ous", en: "Eggs", fr: "Oeufs" } },
    { code: "msg", labels: { es: "Glutamato monosódico", ca: "Glutamat monosòdic", en: "MSG", fr: "Glutamate" } },
    { code: "food_coloring", labels: { es: "Colorantes alimentarios", ca: "Colorants alimentaris", en: "Food colorings", fr: "Colorants" } },
    { code: "yeast", labels: { es: "Levadura", ca: "Llevat", en: "Yeast", fr: "Levure" } },
    { code: "sugar_alcohols", labels: { es: "Alcoholes de azúcar", ca: "Alcohols de sucre", en: "Sugar alcohols", fr: "Polyols" } }
  ]
};

const CATALOG_INDEX = Object.fromEntries(
  Object.entries(CATALOGS).map(([field, options]) => {
    const index = new Map();
    for (const option of options) {
      index.set(normalizeLookup(option.code), option);
      for (const value of Object.values(option.labels || {})) {
        index.set(normalizeLookup(value), option);
      }
      for (const alias of option.aliases || []) {
        index.set(normalizeLookup(alias), option);
      }
    }
    return [field, index];
  })
);

function getCatalogOptions(field) {
  return CATALOGS[field] || [];
}

function findCatalogItem(field, value) {
  const normalized = normalizeLookup(value);
  if (!normalized) {
    return null;
  }
  return CATALOG_INDEX[field]?.get(normalized) || null;
}

function toCatalogCode(field, value) {
  const raw = normalizeText(value);
  if (!raw) {
    return "";
  }
  const found = findCatalogItem(field, raw);
  return found ? found.code : raw;
}

function toCatalogCodes(field, values) {
  const list = Array.isArray(values) ? values : [values];
  const normalized = list
    .map((value) => toCatalogCode(field, value))
    .map((value) => normalizeText(value))
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function toCatalogLabel(field, value, language = LANGUAGE_FALLBACK) {
  const raw = normalizeText(value);
  if (!raw) {
    return "";
  }
  const found = findCatalogItem(field, raw);
  if (!found) {
    return raw;
  }
  return (
    found.labels?.[language] ||
    found.labels?.[LANGUAGE_FALLBACK] ||
    Object.values(found.labels || {})[0] ||
    found.code
  );
}

function toCatalogLabels(field, values, language = LANGUAGE_FALLBACK) {
  const list = Array.isArray(values) ? values : [values];
  const translated = list
    .map((value) => toCatalogLabel(field, value, language))
    .map((value) => normalizeText(value))
    .filter(Boolean);
  return Array.from(new Set(translated));
}

function getCatalogLabels(field, language = LANGUAGE_FALLBACK) {
  return getCatalogOptions(field).map((option) =>
    option.labels?.[language] || option.labels?.[LANGUAGE_FALLBACK] || option.code
  );
}

export {
  CATALOGS,
  getCatalogLabels,
  toCatalogCode,
  toCatalogCodes,
  toCatalogLabel,
  toCatalogLabels
};
