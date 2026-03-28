import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

function toSafeString(value) {
  return String(value || "").trim();
}

function parseCliArgs(argv) {
  const args = { startDate: "", endDate: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if ((arg === "--start" || arg === "-s") && argv[index + 1]) {
      args.startDate = toSafeString(argv[index + 1]);
      index += 1;
      continue;
    }
    if ((arg === "--end" || arg === "-e") && argv[index + 1]) {
      args.endDate = toSafeString(argv[index + 1]);
      index += 1;
    }
  }
  return args;
}

async function resolveAdminToken() {
  const directToken =
    toSafeString(process.env.GA4_TEST_ADMIN_JWT) || toSafeString(process.env.ADMIN_JWT);
  if (directToken) {
    return directToken;
  }

  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const supabaseAnonKey = toSafeString(process.env.SUPABASE_ANON_KEY);
  const adminEmail = toSafeString(process.env.GA4_TEST_ADMIN_EMAIL);
  const adminPassword = toSafeString(process.env.GA4_TEST_ADMIN_PASSWORD);

  if (!supabaseUrl || !supabaseAnonKey || !adminEmail || !adminPassword) {
    throw new Error(
      "Faltan variables para obtener token admin. Define GA4_TEST_ADMIN_JWT o SUPABASE_URL + SUPABASE_ANON_KEY + GA4_TEST_ADMIN_EMAIL + GA4_TEST_ADMIN_PASSWORD."
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (error || !data?.session?.access_token) {
    throw new Error(`No se pudo obtener sesión admin: ${error?.message || "unknown error"}`);
  }

  return data.session.access_token;
}

async function run() {
  const backendUrl = toSafeString(process.env.BACKEND_URL) || "http://localhost:3000";
  const { startDate: startArg, endDate: endArg } = parseCliArgs(process.argv.slice(2));

  const startDate = startArg || toSafeString(process.env.GA4_TEST_START_DATE);
  const endDate = endArg || toSafeString(process.env.GA4_TEST_END_DATE);

  const query = new URLSearchParams();
  if (startDate) {
    query.set("startDate", startDate);
  }
  if (endDate) {
    query.set("endDate", endDate);
  }

  const endpoint = `${backendUrl.replace(/\/$/, "")}/api/admin/analytics/overview${
    query.toString() ? `?${query.toString()}` : ""
  }`;

  console.log(`[test-ga4] Endpoint: ${endpoint}`);
  const token = await resolveAdminToken();
  console.log(`[test-ga4] Token admin: OK (${token.slice(0, 16)}...)`);

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  const bodyText = await response.text();
  let body = null;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = bodyText;
  }

  console.log(`[test-ga4] HTTP ${response.status}`);
  console.log(JSON.stringify(body, null, 2));

  if (!response.ok) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("[test-ga4] Error:", error?.message || error);
  process.exit(1);
});

