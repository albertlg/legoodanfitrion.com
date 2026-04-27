import { DEMO_USER_ID } from "./constants";

const DEMO_EMAIL = "demo@legoodanfitrion.com";
const DEMO_PASSWORD = "LGA1234-FTW!";

export { DEMO_USER_ID };

export async function signInDemoUser(supabase) {
  if (!supabase) return { error: new Error("supabase not available") };
  const { data, error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD
  });
  return { data, error };
}

export function isDemoSession(session) {
  return session?.user?.id === DEMO_USER_ID;
}
