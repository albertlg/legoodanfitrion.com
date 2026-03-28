import { createClient } from "@supabase/supabase-js";

let supabaseAdminClient = null;

function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
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
  const authorization = String(req.headers.authorization || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return authorization.slice(7).trim();
}

export async function requireAdmin(req, res, next) {
  let supabase = null;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({
      error: "Admin auth backend is not configured correctly.",
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
      error: "Invalid admin session."
    });
  }

  const userId = userData.user.id;
  const { count, error: adminError } = await supabase
    .from("app_admins")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (adminError) {
    return res.status(500).json({
      error: "Failed to validate admin role."
    });
  }

  if (!count) {
    return res.status(403).json({
      error: "Forbidden. Admin role required."
    });
  }

  req.adminUser = {
    id: userId,
    email: String(userData.user.email || "")
  };

  return next();
}

