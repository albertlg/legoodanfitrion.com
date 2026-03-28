import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_CREDENTIALS_PATH = path.join(__dirname, "../../config/google-credentials.json");
const DEFAULT_LOOKBACK_DAYS = 30;

function normalizeDateInput(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function resolveDateRange(startDate, endDate) {
  const safeEnd = normalizeDateInput(endDate) || toIsoDate(new Date());
  const safeStart = normalizeDateInput(startDate);
  if (safeStart) {
    return { startDate: safeStart, endDate: safeEnd };
  }
  const start = new Date();
  start.setDate(start.getDate() - DEFAULT_LOOKBACK_DAYS);
  return { startDate: toIsoDate(start), endDate: safeEnd };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function withTimeout(promise, timeoutMs) {
  const timeout = Number(timeoutMs);
  const safeTimeout = Number.isFinite(timeout) && timeout > 0 ? timeout : 15000;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const timeoutError = new Error(`Search Console timeout (${safeTimeout}ms)`);
        timeoutError.code = "GSC_TIMEOUT";
        reject(timeoutError);
      }, safeTimeout);
    })
  ]);
}

function getCredentialsPath() {
  const fromEnv = String(process.env.GOOGLE_CREDENTIALS_PATH || "").trim();
  const resolved = fromEnv
    ? path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(process.cwd(), fromEnv)
    : DEFAULT_CREDENTIALS_PATH;

  if (!fs.existsSync(resolved)) {
    const error = new Error(`Google credentials file not found: ${resolved}`);
    error.code = "GSC_CONFIG_ERROR";
    throw error;
  }

  return resolved;
}

function getSiteUrl() {
  const siteUrl = String(process.env.GSC_SITE_URL || "").trim();
  if (!siteUrl) {
    const error = new Error("GSC_SITE_URL is not configured");
    error.code = "GSC_CONFIG_ERROR";
    throw error;
  }
  return siteUrl;
}

function mapQueryRows(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return safeRows.map((row) => ({
    query: String(row?.keys?.[0] || "").trim() || "(not set)",
    clicks: toNumber(row?.clicks),
    impressions: toNumber(row?.impressions),
    ctr: toNumber(row?.ctr),
    position: toNumber(row?.position)
  }));
}

function mapPageRows(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return safeRows.map((row) => ({
    page: String(row?.keys?.[0] || "").trim() || "(not set)",
    clicks: toNumber(row?.clicks),
    impressions: toNumber(row?.impressions),
    ctr: toNumber(row?.ctr),
    position: toNumber(row?.position)
  }));
}

export async function getTopQueries(startDate, endDate) {
  const siteUrl = getSiteUrl();
  const keyFile = getCredentialsPath();
  const range = resolveDateRange(startDate, endDate);

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"]
  });

  const searchConsole = google.searchconsole({ version: "v1", auth });
  const rowLimit = Math.max(1, Math.min(100, Number(process.env.GSC_TOP_QUERY_LIMIT || 20)));
  const timeoutMs = Number(process.env.GSC_TIMEOUT_MS || 15000);
  const requestBodyBase = {
    startDate: range.startDate,
    endDate: range.endDate,
    rowLimit
  };
  const [queryResponse, pageResponse] = await Promise.all([
    withTimeout(
      searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          ...requestBodyBase,
          dimensions: ["query"]
        }
      }),
      timeoutMs
    ),
    withTimeout(
      searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          ...requestBodyBase,
          dimensions: ["page"]
        }
      }),
      timeoutMs
    )
  ]);

  return {
    period: range,
    siteUrl,
    queries: mapQueryRows(queryResponse?.data?.rows),
    pages: mapPageRows(pageResponse?.data?.rows),
    generatedAt: new Date().toISOString()
  };
}
