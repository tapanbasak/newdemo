export type AppEnvironment = "DEV" | "UAT" | "PERF" | "PROD";

const APP_RULE_BASE_URLS: Record<AppEnvironment, string> = {
  DEV: "https://dev.app-rule.example.com",
  UAT: "https://uat.app-rule.example.com",
  PERF: "https://perf.app-rule.example.com",
  PROD: "https://prod.app-rule.example.com",
};

/**
 * Returns the App Rule API base URL for the given environment.
 * Falls back to DEV if the environment is missing or unknown.
 */
export function getAppRuleBaseUrl(env: string | null | undefined): string {
  const normalized = (env || "DEV").toUpperCase() as AppEnvironment;
  return APP_RULE_BASE_URLS[normalized] ?? APP_RULE_BASE_URLS.DEV;
}

type PsgTier = "NONPROD" | "PROD";

const PSG_BASE_URLS: Record<PsgTier, string> = {
  NONPROD: "https://nonprod.psg.example.com",
  PROD: "https://prod.psg.example.com",
};

/**
 * Returns the PSG API base URL based on domain type.
 * For this prototype, both \"nonprod\" and \"both\" map to the NONPROD endpoint.
 */
export function getPsgBaseUrl(domainType: "nonprod" | "prod" | "both"): string {
  if (domainType === "prod") {
    return PSG_BASE_URLS.PROD;
  }
  return PSG_BASE_URLS.NONPROD;
}


