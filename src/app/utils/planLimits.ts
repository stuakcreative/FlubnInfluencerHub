/**
 * Plan Limits Utility
 * Enforces subscription-based limits for campaigns, collaboration requests, and analytics.
 *
 * Plan Limits (defaults — admin can override via AdminPricing):
 *  Free       → Unlimited searches, 1 campaign, 5 collabs/month, no analytics
 *  Basic      → Unlimited searches, 10 campaigns, 20 collabs/month, basic analytics
 *  Pro        → Unlimited searches, unlimited campaigns, 50 collabs/month, advanced analytics
 *  Enterprise → Unlimited searches, unlimited campaigns, 200 collabs/month, custom analytics
 *
 *  Campaign Templates:  Free=0, Basic=3, Pro=unlimited, Enterprise=unlimited
 *  Bulk Actions:        Free/Basic=no, Pro/Enterprise=yes
 *  Suggested Influencers: Free/Basic=no, Pro/Enterprise=yes
 *
 * Limits are read LIVE from `flubn_pricing_plans` localStorage so admin overrides apply instantly.
 */

import type { PlanName } from "./brandSubscription";

// ── Types ────────────────────────────────────────────────────────────────────

export type AnalyticsLevel = "none" | "basic" | "advanced" | "custom";

export interface PlanLimits {
  searchesPerDay: number;       // -1 = unlimited
  activeCampaigns: number;      // -1 = unlimited
  collabRequestsPerMonth: number; // -1 = unlimited
  analyticsLevel: AnalyticsLevel;
  campaignTemplates: number;    // -1 = unlimited, 0 = locked
  bulkActions: boolean;
  suggestedInfluencers: boolean;
}

// ── Fallback config ──────────────────────────────────────────────────────────

const FALLBACK_LIMITS: Record<PlanName, PlanLimits> = {
  Free:       { searchesPerDay: -1,  activeCampaigns: 1,  collabRequestsPerMonth: 5,   analyticsLevel: "none",     campaignTemplates: 0,  bulkActions: false, suggestedInfluencers: false },
  Basic:      { searchesPerDay: -1, activeCampaigns: 10, collabRequestsPerMonth: 20,  analyticsLevel: "basic",    campaignTemplates: 3,  bulkActions: false, suggestedInfluencers: false },
  Pro:        { searchesPerDay: -1, activeCampaigns: -1, collabRequestsPerMonth: 50,  analyticsLevel: "advanced", campaignTemplates: -1, bulkActions: true,  suggestedInfluencers: true },
  Enterprise: { searchesPerDay: -1, activeCampaigns: -1, collabRequestsPerMonth: 200, analyticsLevel: "custom",   campaignTemplates: -1, bulkActions: true,  suggestedInfluencers: true },
};

const ANALYTICS_MAP: Record<string, AnalyticsLevel> = {
  free: "none", basic: "basic", pro: "advanced", enterprise: "custom",
};

// ── Read dynamic limits from admin-configured pricing plans ──────────────────

interface DynamicPlanOverrides {
  collaborationLimit?: number;
  searchesPerDay?: number;
  activeCampaigns?: number;
  campaignTemplates?: number;
  bulkActions?: boolean;
  suggestedInfluencers?: boolean;
}

function getDynamicOverrides(planName: PlanName): DynamicPlanOverrides {
  try {
    const raw = localStorage.getItem("flubn_pricing_plans");
    if (raw) {
      const plans = JSON.parse(raw) as Array<{ name: string; collaborationLimit?: number; searchesPerDay?: number; activeCampaigns?: number; campaignTemplates?: number; bulkActions?: boolean; suggestedInfluencers?: boolean }>;
      const match = plans.find((p) => p.name.toUpperCase() === planName.toUpperCase());
      if (match) {
        return {
          collaborationLimit: match.collaborationLimit,
          searchesPerDay: match.searchesPerDay,
          activeCampaigns: match.activeCampaigns,
          campaignTemplates: match.campaignTemplates,
          bulkActions: match.bulkActions,
          suggestedInfluencers: match.suggestedInfluencers,
        };
      }
    }
  } catch { /* ignore */ }
  return {};
}

// ── Resolve active plan name ─────────────────────────────────────────────────

function resolveActivePlanName(): PlanName {
  try {
    const explicit = localStorage.getItem("flubn_brand_active_plan") as PlanName | null;
    if (explicit && FALLBACK_LIMITS[explicit]) return explicit;
    const raw = localStorage.getItem("flubn_billing_history");
    if (raw) {
      const history = JSON.parse(raw) as { description: string }[];
      if (history.length > 0) {
        const upper = history[0].description.toUpperCase();
        if (upper.includes("ENTERPRISE")) return "Enterprise";
        if (upper.includes("PRO")) return "Pro";
        if (upper.includes("BASIC")) return "Basic";
      }
    }
  } catch { /* ignore */ }
  return "Basic"; // Demo default
}

/** Get the full limits config for the current brand's plan. */
export function getPlanLimits(): PlanLimits & { planName: PlanName } {
  const name = resolveActivePlanName();
  const fallback = FALLBACK_LIMITS[name];

  // Override limits from admin config if available
  const overrides = getDynamicOverrides(name);

  return {
    planName: name,
    searchesPerDay: overrides.searchesPerDay !== undefined ? overrides.searchesPerDay : fallback.searchesPerDay,
    activeCampaigns: overrides.activeCampaigns !== undefined ? overrides.activeCampaigns : fallback.activeCampaigns,
    collabRequestsPerMonth: overrides.collaborationLimit !== undefined ? overrides.collaborationLimit : fallback.collabRequestsPerMonth,
    analyticsLevel: fallback.analyticsLevel,
    campaignTemplates: overrides.campaignTemplates !== undefined ? overrides.campaignTemplates : fallback.campaignTemplates,
    bulkActions: overrides.bulkActions !== undefined ? overrides.bulkActions : fallback.bulkActions,
    suggestedInfluencers: overrides.suggestedInfluencers !== undefined ? overrides.suggestedInfluencers : fallback.suggestedInfluencers,
  };
}

// ── Search tracking ──────────────────────────────────────────────────────────
// Search is unlimited for all plans. These stubs are kept for backward compatibility.

/** @deprecated Searches are now unlimited for all plans. Always returns 0. */
export function getDailySearchCount(): number { return 0; }

/** @deprecated Searches are now unlimited for all plans. Always returns true. */
export function trackSearch(): boolean { return true; }

/** @deprecated Searches are now unlimited for all plans. Always returns true. */
export function canSearch(): boolean { return true; }

/** @deprecated Searches are now unlimited for all plans. Always returns -1 (unlimited). */
export function remainingSearches(): number { return -1; }

// ── Collaboration request tracking ───────────────────────────────────────────

function collabMonthKey(): string {
  const now = new Date();
  return `flubn_collab_count_${now.getFullYear()}-${now.getMonth()}`;
}

/** Number of collab requests sent this month. */
export function getMonthlyCollabCount(): number {
  try {
    return parseInt(localStorage.getItem(collabMonthKey()) || "0", 10);
  } catch { return 0; }
}

/** Increment this month's collab request count. */
export function incrementCollabCount(): void {
  try {
    const key = collabMonthKey();
    const count = parseInt(localStorage.getItem(key) || "0", 10);
    localStorage.setItem(key, (count + 1).toString());
  } catch { /* ignore */ }
}

/** Can the brand send another collab request? */
export function canSendCollabRequest(): boolean {
  const limits = getPlanLimits();
  if (limits.collabRequestsPerMonth === -1) return true;
  return getMonthlyCollabCount() < limits.collabRequestsPerMonth;
}

/** Remaining collab requests this month (-1 = unlimited). */
export function remainingCollabRequests(): number {
  const limits = getPlanLimits();
  if (limits.collabRequestsPerMonth === -1) return -1;
  return Math.max(0, limits.collabRequestsPerMonth - getMonthlyCollabCount());
}

// ── Active campaign tracking ─────────────────────────────────────────────────

/** Get the count of active (non-completed) campaigns. Reads from collaboration requests. */
export function getActiveCampaignCount(): number {
  try {
    const raw = localStorage.getItem("flubn_collaboration_requests");
    if (!raw) return 0;
    const requests = JSON.parse(raw) as Array<{ status: string; brandId?: string }>;
    const userId = JSON.parse(localStorage.getItem("flubn_user") || "{}").id;
    if (!userId) return 0;
    // Active = pending or accepted (not rejected/completed/cancelled)
    return requests.filter(
      (r) => r.brandId === userId && (r.status === "pending" || r.status === "accepted")
    ).length;
  } catch { return 0; }
}

/** Can the brand create another campaign/request? */
export function canCreateCampaign(): boolean {
  const limits = getPlanLimits();
  if (limits.activeCampaigns === -1) return true;
  return getActiveCampaignCount() < limits.activeCampaigns;
}

/** Remaining campaign slots (-1 = unlimited). */
export function remainingCampaignSlots(): number {
  const limits = getPlanLimits();
  if (limits.activeCampaigns === -1) return -1;
  return Math.max(0, limits.activeCampaigns - getActiveCampaignCount());
}

// ── Analytics access ─────────────────────────────────────────────────────────

/** Check if the current plan has analytics access. */
export function hasAnalyticsAccess(): boolean {
  const limits = getPlanLimits();
  return limits.analyticsLevel !== "none";
}

/** Get the analytics level for the current plan. */
export function getAnalyticsLevel(): AnalyticsLevel {
  return getPlanLimits().analyticsLevel;
}

// ── Format helpers ───────────────────────────────────────────────────────────

export function formatLimit(value: number): string {
  if (value === -1) return "Unlimited";
  return value.toString();
}

export function formatRemaining(value: number): string {
  if (value === -1) return "Unlimited";
  return `${value} remaining`;
}