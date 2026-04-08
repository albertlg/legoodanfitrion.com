import { createClient } from "@supabase/supabase-js";

let supabaseAdminClient = null;

function toSafeString(value) {
  return String(value || "").trim();
}

function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
    error.code = "SUPABASE_CONFIG_ERROR";
    throw error;
  }

  supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseAdminClient;
}

function getBearerToken(req) {
  const authorization = toSafeString(req.headers.authorization);
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return authorization.slice(7).trim();
}

export async function requireAuthenticatedUser(req, res, next) {
  let supabase = null;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({
      error: "Auth backend is not configured correctly.",
      code: error?.code || "SUPABASE_CONFIG_ERROR"
    });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: "Missing bearer token."
    });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.id) {
    return res.status(401).json({
      error: "Invalid session."
    });
  }

  req.authUser = {
    id: userData.user.id,
    email: toSafeString(userData.user.email)
  };

  return next();
}

