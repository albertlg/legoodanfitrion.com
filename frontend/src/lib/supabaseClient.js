// Cliente de Supabase. Solo lo importan directamente las pantallas de la app;
// App.jsx y las páginas públicas lo cargan bajo demanda con
// loadSupabase() (lib/supabase-loader.js) para no descargarlo sin necesidad.
import { createClient } from "@supabase/supabase-js";
import { hasSupabaseEnv } from "./supabase-loader";

const supabase = hasSupabaseEnv
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

export { hasSupabaseEnv, supabase };
