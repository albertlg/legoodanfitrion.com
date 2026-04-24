// Datos sintéticos hiper-localizados para la vista previa interactiva de la landing.
// Cada escenario representa un tipo de evento (single_date, date_range, voting_poll,
// corporate) y expone título, ubicación y vibe por idioma — no traducción mecánica,
// sino adaptación cultural (ej. "Calçotada popular" en CA).
// Single source of truth para InteractiveDemo.jsx. Sin PII, sin tokens.

const B2C_CHIP = {
    labelKey: "landing_two_worlds_b2c_title",
    className: "bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/40"
};

const B2B_CHIP = {
    labelKey: "landing_two_worlds_b2b_title",
    className: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40"
};

const GUESTS_B2C = [
    { id: 1, name: "Marta Cano", status: "confirmed", allergy: "Gluten", plusOne: true },
    { id: 2, name: "Jorge Vila", status: "confirmed", allergy: null, plusOne: false },
    { id: 3, name: "Irene Font", status: "pending", allergy: "Lactosa", plusOne: false },
    { id: 4, name: "Pep Serra", status: "confirmed", allergy: null, plusOne: true },
    { id: 5, name: "Anna Ribas", status: "declined", allergy: null, plusOne: false }
];

const GUESTS_B2B = [
    { id: 1, name: "Carlos Méndez", status: "confirmed", department: "Ventas LATAM" },
    { id: 2, name: "Priya Sharma", status: "pending", department: "Ventas UK", allergy: "Vegano" },
    { id: 3, name: "Tomás Pérez", status: "confirmed", department: "Marketing" },
    { id: 4, name: "Julia Koch", status: "pending", department: "Partner Success" },
    { id: 5, name: "Wei Chen", status: "confirmed", department: "RevOps", allergy: "Sin gluten" }
];

export const singleDateEvent = {
    id: "demo-single-date",
    kind: "single_date",
    scenarioKey: "landing_demo_scenario_single_date",
    scenarioIcon: "utensils",
    stateKey: "landing_demo_state_confirming",
    accentChip: B2C_CHIP,
    titleByLang: {
        es: "Barbacoa de primavera con amigos",
        ca: "Calçotada popular",
        en: "Spring backyard BBQ with friends",
        fr: "Apéro dînatoire entre amis",
        it: "Grigliata di primavera con amici"
    },
    hostName: "Albert L.",
    startAt: "2026-05-23T14:00:00+02:00",
    location: {
        nameByLang: {
            es: "Casa de Albert · Jardín",
            ca: "Casa de l'Albert · Jardí",
            en: "Albert's backyard",
            fr: "Chez Albert · Jardin",
            it: "Casa di Albert · Giardino"
        },
        cityByLang: {
            es: "Sant Cugat del Vallès",
            ca: "Sant Cugat del Vallès",
            en: "Sant Cugat del Vallès",
            fr: "Sant Cugat del Vallès",
            it: "Sant Cugat del Vallès"
        }
    },
    stats: { invited: 12, confirmed: 8, pending: 3, allergies: 2 },
    dietaryFlags: ["Vegetariano", "Gluten"],
    guests: GUESTS_B2C,
    vibeByLang: {
        es: "Tarde de brasas · Sol y cerveza artesana",
        ca: "Tarda de brases · Sol i cervesa artesana",
        en: "Afternoon grill · Sunshine and craft beers",
        fr: "Après-midi grillade · Soleil et bières artisanales",
        it: "Pomeriggio alla griglia · Sole e birre artigianali"
    }
};

export const dateRangeEvent = {
    id: "demo-date-range",
    kind: "date_range",
    scenarioKey: "landing_demo_scenario_date_range",
    scenarioIcon: "sun",
    stateKey: "landing_demo_state_confirming",
    accentChip: B2C_CHIP,
    titleByLang: {
        es: "Escapada a la Cerdanya",
        ca: "Escapada al Pallars Sobirà",
        en: "Weekend retreat in the Cotswolds",
        fr: "Week-end en Provence",
        it: "Weekend in Toscana"
    },
    hostName: "Marta R.",
    startAt: "2026-06-19T17:00:00+02:00",
    endAt: "2026-06-22T12:00:00+02:00",
    location: {
        nameByLang: {
            es: "Casa rural Can Ramon",
            ca: "Casa de pagès Can Ramon",
            en: "Can Ramon farmhouse",
            fr: "Gîte Can Ramon",
            it: "Agriturismo Can Ramon"
        },
        cityByLang: {
            es: "Bellver de Cerdanya",
            ca: "Bellver de Cerdanya",
            en: "Bellver de Cerdanya · Pyrenees",
            fr: "Bellver de Cerdanya · Pyrénées",
            it: "Bellver de Cerdanya · Pirenei"
        }
    },
    stats: { invited: 14, confirmed: 9, pending: 4, allergies: 3 },
    dietaryFlags: ["Gluten", "Lactosa", "Vegetariano"],
    guests: GUESTS_B2C,
    vibeByLang: {
        es: "Tres noches de montaña · Senderismo y cenas largas",
        ca: "Tres nits de muntanya · Senderisme i sopars llargs",
        en: "Three mountain nights · Hikes and long dinners",
        fr: "Trois nuits à la montagne · Rando et longs dîners",
        it: "Tre notti in montagna · Trekking e cene lunghe"
    }
};

export const votingPollEvent = {
    id: "demo-voting-poll",
    kind: "voting_poll",
    scenarioKey: "landing_demo_scenario_voting_poll",
    scenarioIcon: "check",
    stateKey: "landing_demo_state_voting",
    accentChip: B2C_CHIP,
    titleByLang: {
        es: "¿Qué noche cenamos? Cena de grupo",
        ca: "Quina nit sopem? Sopar del grup",
        en: "When should we meet? Book club night",
        fr: "Quel soir on se voit ? Apéro du groupe",
        it: "Quando ci vediamo? Cena del gruppo"
    },
    hostName: "Irene F.",
    location: {
        nameByLang: {
            es: "Por decidir",
            ca: "Per decidir",
            en: "To be decided",
            fr: "À définir",
            it: "Da definire"
        },
        cityByLang: {
            es: "Barcelona · Eixample",
            ca: "Barcelona · Eixample",
            en: "Barcelona · Eixample",
            fr: "Barcelone · Eixample",
            it: "Barcellona · Eixample"
        }
    },
    stats: { invited: 9, confirmed: 0, pending: 9, allergies: 0 },
    dietaryFlags: [],
    guests: GUESTS_B2C,
    pollOptions: [
        { id: "opt-1", startAt: "2026-05-30T20:30:00+02:00", votes: 6, leading: true },
        { id: "opt-2", startAt: "2026-05-31T20:30:00+02:00", votes: 4, leading: false },
        { id: "opt-3", startAt: "2026-06-06T20:30:00+02:00", votes: 3, leading: false }
    ],
    pollTotalVoters: 9,
    vibeByLang: {
        es: "Cerramos fecha y reservamos · Que nadie se pierda la cena",
        ca: "Tanquem data i reservem · Que ningú es perdi el sopar",
        en: "We lock the date and book the table",
        fr: "On fixe la date et on réserve la table",
        it: "Chiudiamo la data e prenotiamo il tavolo"
    }
};

export const corporateEvent = {
    id: "demo-corporate",
    kind: "corporate",
    scenarioKey: "landing_demo_scenario_corporate",
    scenarioIcon: "activity",
    stateKey: "landing_demo_state_confirming",
    accentChip: B2B_CHIP,
    titleByLang: {
        es: "Kick-off Q3 Ventas · Madrid",
        ca: "Presentació plans 2027 · All-hands",
        en: "Quarterly Kick-off · Sales",
        fr: "Offsite Q3 · Leadership Lisbonne",
        it: "Kick-off Q3 Vendite · Milano"
    },
    hostName: "Elena R. · People Ops",
    startAt: "2026-09-18T09:00:00+02:00",
    location: {
        nameByLang: {
            es: "The Place Madrid",
            ca: "The Place Madrid",
            en: "The Place Madrid",
            fr: "The Place Madrid",
            it: "The Place Madrid"
        },
        cityByLang: {
            es: "Paseo de la Castellana",
            ca: "Paseo de la Castellana",
            en: "Paseo de la Castellana · Madrid",
            fr: "Paseo de la Castellana · Madrid",
            it: "Paseo de la Castellana · Madrid"
        }
    },
    stats: { invited: 150, confirmed: 128, pending: 12, allergies: 14 },
    dietaryFlags: ["Vegano", "Halal", "Sin gluten"],
    guests: GUESTS_B2B,
    budget: { total: 18500, spent: 11320, currency: "EUR" },
    vibeByLang: {
        es: "Kick-off + cena networking · Dress code business casual",
        ca: "Kick-off + sopar networking · Dress code business casual",
        en: "Kick-off + networking dinner · Business casual",
        fr: "Kick-off + dîner networking · Business casual",
        it: "Kick-off + cena networking · Business casual"
    }
};

export const demoScenarios = [singleDateEvent, dateRangeEvent, votingPollEvent, corporateEvent];

export const demoScenariosByKind = {
    single_date: singleDateEvent,
    date_range: dateRangeEvent,
    voting_poll: votingPollEvent,
    corporate: corporateEvent
};

export function pickLocalized(map, language, fallback = "es") {
    if (!map || typeof map !== "object") return "";
    return map[language] || map[fallback] || Object.values(map)[0] || "";
}
