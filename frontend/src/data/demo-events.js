// Datos sintéticos para la vista previa interactiva de la landing.
// Forma idéntica a la que consume un evento real en el dashboard, pero
// sin PII, sin tokens y sin campos privados. Single source of truth
// para InteractiveDemo.jsx.

export const b2cEvent = {
    id: "demo-b2c",
    mode: "b2c",
    title: "Cumpleaños 40 de Albert en la Toscana",
    hostName: "Albert L.",
    startAt: "2026-07-12T19:30:00+02:00",
    location: {
        name: "Villa San Marco",
        city: "Montepulciano, Toscana"
    },
    accentChip: {
        labelKey: "landing_two_worlds_b2c_title",
        className: "bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/40"
    },
    stats: {
        invited: 25,
        confirmed: 18,
        pending: 6,
        allergies: 3
    },
    dietaryFlags: ["Gluten", "Lactosa", "Vegetariano"],
    guests: [
        { id: 1, name: "Marta Cano", status: "confirmed", allergy: "Gluten", plusOne: true },
        { id: 2, name: "Jorge Vila", status: "confirmed", allergy: null, plusOne: false },
        { id: 3, name: "Irene Font", status: "pending", allergy: "Lactosa", plusOne: false },
        { id: 4, name: "Pep Serra", status: "confirmed", allergy: null, plusOne: true },
        { id: 5, name: "Anna Ribas", status: "declined", allergy: null, plusOne: false }
    ],
    budget: null,
    vibe: "Cena íntima · Brindis al atardecer · Menú en 4 tiempos"
};

export const b2bEvent = {
    id: "demo-b2b",
    mode: "b2b",
    title: "Kick-off Q3 Ventas — Madrid",
    hostName: "Elena R. · People Ops",
    startAt: "2026-09-18T09:00:00+02:00",
    location: {
        name: "The Place Madrid",
        city: "Paseo de la Castellana"
    },
    accentChip: {
        labelKey: "landing_two_worlds_b2b_title",
        className: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40"
    },
    stats: {
        invited: 150,
        confirmed: 128,
        pending: 12,
        allergies: 14
    },
    dietaryFlags: ["Vegano", "Halal", "Sin gluten"],
    guests: [
        { id: 1, name: "Carlos Méndez", status: "confirmed", allergy: null, plusOne: false, department: "Ventas LATAM" },
        { id: 2, name: "Priya Sharma", status: "pending", allergy: "Vegano", plusOne: false, department: "Ventas UK" },
        { id: 3, name: "Tomás Pérez", status: "confirmed", allergy: null, plusOne: false, department: "Marketing" },
        { id: 4, name: "Julia Koch", status: "pending", allergy: null, plusOne: false, department: "Partner Success" },
        { id: 5, name: "Wei Chen", status: "confirmed", allergy: "Sin gluten", plusOne: false, department: "RevOps" }
    ],
    budget: {
        total: 18500,
        spent: 11320,
        currency: "EUR"
    },
    vibe: "Kick-off + cena networking · Dress code business casual"
};

export const demoEventsByMode = {
    b2c: b2cEvent,
    b2b: b2bEvent
};
