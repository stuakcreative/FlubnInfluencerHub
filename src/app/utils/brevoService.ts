/**
 * Brevo (formerly Sendinblue) API Integration for FLUBN
 *
 * Calls the Brevo REST API directly from the browser.
 * API key is stored in localStorage (admin-only feature — never exposed to regular users).
 *
 * Brevo API docs: https://developers.brevo.com/reference
 */

const BREVO_API_BASE = "https://api.brevo.com/v3";
const STORAGE_KEY = "flubn_brevo_config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BrevoConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  enabled: boolean;
}

export interface BrevoAccountInfo {
  email: string;
  companyName: string;
  firstName: string;
  lastName: string;
  plan: Array<{
    type: string;
    credits: number;
    creditsType: string;
  }>;
}

export interface BrevoAggregatedStats {
  requests: number;
  delivered: number;
  hardBounces: number;
  softBounces: number;
  clicks: number;
  uniqueClicks: number;
  opens: number;
  uniqueOpens: number;
  unsubscriptions: number;
  complaints: number;
  blocked: number;
  invalid: number;
}

export interface BrevoDaily extends BrevoAggregatedStats {
  date: string;
}

export type BrevoEventType =
  | "requests"
  | "delivered"
  | "hardBounces"
  | "softBounces"
  | "clicks"
  | "opens"
  | "unsubscriptions"
  | "spam"
  | "invalid"
  | "deferred"
  | "blocked";

export interface BrevoEvent {
  email: string;
  date: string;
  subject?: string;
  messageId?: string;
  event: BrevoEventType;
  ip?: string;
  link?: string;
  from?: string;
  templateId?: number;
  tag?: string;
}

// ── Config management ─────────────────────────────────────────────────────────

export function getBrevoConfig(): BrevoConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveBrevoConfig(config: BrevoConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save Brevo config:", e);
  }
}

export function clearBrevoConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isBrevoEnabled(): boolean {
  const config = getBrevoConfig();
  return !!(config?.enabled && config?.apiKey?.trim());
}

// ── Core API fetcher ──────────────────────────────────────────────────────────

async function brevoFetch<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BREVO_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Brevo API error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

// ── Account ───────────────────────────────────────────────────────────────────

/**
 * Test API key and fetch account info.
 */
export async function testBrevoConnection(apiKey: string): Promise<{
  success: boolean;
  account?: BrevoAccountInfo;
  error?: string;
}> {
  try {
    const account = await brevoFetch<BrevoAccountInfo>("/account", apiKey);
    return { success: true, account };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Send email ────────────────────────────────────────────────────────────────

/**
 * Send a transactional email via Brevo SMTP API.
 */
export async function sendEmailViaBrevo(params: {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getBrevoConfig();
  if (!config?.apiKey || !config.enabled) {
    return { success: false, error: "Brevo not configured or disabled" };
  }
  if (!config.senderEmail) {
    return { success: false, error: "Sender email not configured" };
  }

  try {
    const data = await brevoFetch<{ messageId: string }>(
      "/smtp/email",
      config.apiKey,
      {
        method: "POST",
        body: JSON.stringify({
          sender: { email: config.senderEmail, name: config.senderName || "FLUBN" },
          to: [{ email: params.to, name: params.toName }],
          subject: params.subject,
          htmlContent: params.htmlContent,
        }),
      }
    );
    return { success: true, messageId: data.messageId };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Statistics ────────────────────────────────────────────────────────────────

/**
 * Get aggregated stats for a date range.
 * Dates are YYYY-MM-DD strings.
 */
export async function getBrevoAggregatedStats(
  startDate: string,
  endDate: string
): Promise<BrevoAggregatedStats | null> {
  const config = getBrevoConfig();
  if (!config?.apiKey) return null;
  try {
    return await brevoFetch<BrevoAggregatedStats>(
      `/smtp/statistics/aggregatedReport?startDate=${startDate}&endDate=${endDate}`,
      config.apiKey
    );
  } catch {
    return null;
  }
}

/**
 * Get day-by-day stats for the past N days.
 */
export async function getBrevoDaily(days = 7): Promise<BrevoDaily[]> {
  const config = getBrevoConfig();
  if (!config?.apiKey) return [];

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - (days - 1) * 86_400_000)
    .toISOString()
    .split("T")[0];

  try {
    const data = await brevoFetch<{ reports: BrevoDaily[] }>(
      `/smtp/statistics/reports?startDate=${startDate}&endDate=${endDate}&aggregation=day`,
      config.apiKey
    );
    return data.reports || [];
  } catch {
    return [];
  }
}

/**
 * Get recent email events (delivered, opens, clicks, bounces…).
 */
export async function getBrevoEvents(limit = 50): Promise<BrevoEvent[]> {
  const config = getBrevoConfig();
  if (!config?.apiKey) return [];
  try {
    const data = await brevoFetch<{ events: BrevoEvent[] }>(
      `/smtp/statistics/events?limit=${limit}&sort=desc`,
      config.apiKey
    );
    return data.events || [];
  } catch {
    return [];
  }
}

/**
 * Get total contacts count.
 */
export async function getBrevoContactsCount(): Promise<number> {
  const config = getBrevoConfig();
  if (!config?.apiKey) return 0;
  try {
    const data = await brevoFetch<{ count: number }>(
      "/contacts?limit=1",
      config.apiKey
    );
    return data.count || 0;
  } catch {
    return 0;
  }
}

// ── Delivery rate helper ──────────────────────────────────────────────────────

export function calcDeliveryRate(stats: BrevoAggregatedStats): string {
  if (!stats.requests) return "0%";
  return ((stats.delivered / stats.requests) * 100).toFixed(1) + "%";
}

export function calcOpenRate(stats: BrevoAggregatedStats): string {
  if (!stats.delivered) return "0%";
  return ((stats.uniqueOpens / stats.delivered) * 100).toFixed(1) + "%";
}

export function calcClickRate(stats: BrevoAggregatedStats): string {
  if (!stats.delivered) return "0%";
  return ((stats.uniqueClicks / stats.delivered) * 100).toFixed(1) + "%";
}
