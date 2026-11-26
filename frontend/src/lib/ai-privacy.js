// Seudonimiza los nombres de los invitados antes de enviar datos a la IA.
//
// La IA usa el plan gratuito de Gemini, en el que Google puede aprovechar lo
// que se le envía. Los datos de salud (alergias, intolerancias, afecciones) no
// deben ir unidos a un nombre: antes de cada petición se cambia cada nombre por
// un marcador como [[G1]] y, al recibir la respuesta, se vuelve a poner.

const PLACEHOLDER_PATTERN = /\[\[G\d+\]\]/g;
const MIN_NAME_LENGTH = 3;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapStrings(value, transform) {
  if (typeof value === "string") {
    return transform(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => mapStrings(item, transform));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapStrings(item, transform)]));
  }
  return value;
}

// names: nombres completos de los invitados ("Ana García"). También se
// enmascaran por separado el nombre y los apellidos, porque las notas libres
// suelen mencionar solo el nombre de pila. Se distingue mayúsculas para no
// tocar palabras comunes ("Mar" sí, "mar" no).
export function createGuestNameMasker(names = []) {
  const candidates = new Set();
  for (const rawName of names) {
    const fullName = String(rawName || "").trim().replace(/\s+/g, " ");
    if (fullName.length < MIN_NAME_LENGTH) {
      continue;
    }
    candidates.add(fullName);
    for (const part of fullName.split(" ")) {
      if (part.length >= MIN_NAME_LENGTH) {
        candidates.add(part);
      }
    }
  }

  // Los más largos primero, para que "Ana García" gane a "Ana".
  const sortedNames = [...candidates].toSorted((a, b) => b.length - a.length);
  const placeholderByName = new Map();
  const nameByPlaceholder = new Map();
  sortedNames.forEach((name, index) => {
    const placeholder = `[[G${index + 1}]]`;
    placeholderByName.set(name, placeholder);
    nameByPlaceholder.set(placeholder, name);
  });

  const namePattern = sortedNames.length > 0
    ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${sortedNames.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`, "gu")
    : null;

  return {
    mask(value) {
      if (!namePattern) {
        return value;
      }
      return mapStrings(value, (text) => text.replace(namePattern, (match) => placeholderByName.get(match) ?? match));
    },
    unmask(value) {
      if (nameByPlaceholder.size === 0) {
        return value;
      }
      return mapStrings(value, (text) => text.replace(PLACEHOLDER_PATTERN, (match) => nameByPlaceholder.get(match) ?? match));
    }
  };
}

const GUEST_IDENTITY_FIELDS = ["guestId", "guestName", "name", "email", "phone"];

// Quita de las respuestas RSVP los campos que identifican al invitado.
// La IA solo necesita las señales (dieta, notas, intereses, logística).
export function withoutGuestIdentity(signals = []) {
  return (Array.isArray(signals) ? signals : []).map((signal) => {
    if (!signal || typeof signal !== "object") {
      return signal;
    }
    const safeSignal = { ...signal };
    for (const field of GUEST_IDENTITY_FIELDS) {
      delete safeSignal[field];
    }
    return safeSignal;
  });
}
