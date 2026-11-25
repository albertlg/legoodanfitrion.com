// Carga diferida del cliente de Supabase (~45 KB comprimidos).
//
// Las páginas públicas (landing, blog, casos de uso, legales) no lo necesitan
// salvo que el visitante tenga sesión o envíe un formulario, así que no va en
// su JavaScript inicial: se descarga con loadSupabase() cuando hace falta.
// La app (/app, /login, /rsvp...) lo carga al entrar.

export const hasSupabaseEnv = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

let clientPromise = null;

// Devuelve el cliente (o null si faltan las variables de entorno).
export function loadSupabase() {
  if (!hasSupabaseEnv) {
    return Promise.resolve(null);
  }
  if (!clientPromise) {
    clientPromise = import("./supabaseClient")
      .then((module) => module.supabase)
      .catch((error) => {
        clientPromise = null;
        throw error;
      });
  }
  return clientPromise;
}

// ¿Puede haber sesión que restaurar? supabase-js guarda la sesión en
// localStorage con la clave "sb-<proyecto>-auth-token"; los enlaces de
// confirmación, recuperación y OAuth traen los tokens en la URL.
export function mayHaveSupabaseSession() {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith("sb-") && key.includes("-auth-token")) {
        return true;
      }
    }
  } catch {
    // Sin acceso a storage: no hay sesión guardada que restaurar.
  }
  const { hash, search } = window.location;
  return /(access_token|refresh_token|error_description)=/.test(hash) || /[?&](code|token_hash|error_description)=/.test(search);
}
