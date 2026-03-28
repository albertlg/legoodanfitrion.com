import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_CREDENTIALS_PATH = path.join(__dirname, "../../config/google-credentials.json");
const DEFAULT_LOOKBACK_DAYS = 30;
const METRIC_NAMES = ["activeUsers", "sessions", "screenPageViews"];

let gaClient = null;

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
        const timeoutError = new Error(`Google Analytics timeout (${safeTimeout}ms)`);
        timeoutError.code = "GA_TIMEOUT";
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
    error.code = "GA_CONFIG_ERROR";
    throw error;
  }

  return resolved;
}

function getGoogleAuthOptions() {
  const inlineCredentials = String(process.env.GOOGLE_CREDENTIALS_JSON || "").trim();
  if (inlineCredentials) {
    try {
      const parsed = JSON.parse(inlineCredentials);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("credentials payload must be a JSON object");
      }
      return { credentials: parsed };
    } catch (error) {
      const wrapped = new Error(
        `GOOGLE_CREDENTIALS_JSON is invalid: ${error?.message || "unknown parse error"}`
      );
      wrapped.code = "GA_CONFIG_ERROR";
      throw wrapped;
    }
  }

  const keyFilename = getCredentialsPath();
  return { keyFilename };
}

function getClient() {
  if (gaClient) {
    return gaClient;
  }
  const authOptions = getGoogleAuthOptions();
  gaClient = new BetaAnalyticsDataClient(authOptions);
  return gaClient;
}

function getTotals(report) {
  const metricValues = report?.totals?.[0]?.metricValues || [];
  return METRIC_NAMES.reduce((acc, metricName, index) => {
    acc[metricName] = toNumber(metricValues[index]?.value);
    return acc;
  }, {});
}

function getChannels(report) {
  const rows = Array.isArray(report?.rows) ? report.rows : [];
  return rows.map((row) => {
    const channel = String(row?.dimensionValues?.[0]?.value || "Unassigned").trim() || "Unassigned";
    const metrics = row?.metricValues || [];
    return {
      channel,
      activeUsers: toNumber(metrics[0]?.value),
      sessions: toNumber(metrics[1]?.value),
      screenPageViews: toNumber(metrics[2]?.value)
    };
  });
}

export async function getTrafficOverview(startDate, endDate) {
  const propertyId = String(process.env.GA_PROPERTY_ID || "").trim();
  if (!propertyId) {
    const error = new Error("GA_PROPERTY_ID is not configured");
    error.code = "GA_CONFIG_ERROR";
    throw error;
  }

  const range = resolveDateRange(startDate, endDate);
  const property = `properties/${propertyId}`;

  const client = getClient();
  const request = {
    property,
    dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: METRIC_NAMES.map((name) => ({ name })),
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    keepEmptyRows: false
  };

  const [report] = await withTimeout(
    client.runReport(request),
    Number(process.env.GA_TIMEOUT_MS || 15000)
  );

  return {
    period: range,
    totals: getTotals(report),
    channels: getChannels(report),
    generatedAt: new Date().toISOString()
  };
}
