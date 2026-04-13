/**
 * Brand Subscription Utility
 * Manages subscription-based chat access and daily message limits.
 *
 * Plan Tiers (defaults — admin can override via AdminPricing):
 *  Free       → No chat access (0 msg/day)
 *  Basic      → 30 messages / day
 *  Pro        → 100 messages / day
 *  Enterprise → Unlimited (-1)
 *
 * The actual per-plan limit is read LIVE from `flubn_pricing_plans` so
 * any change the admin makes in Pricing & Plans takes effect immediately.
 */
import * as api from "./api";

export type PlanName = "Free" | "Basic" | "Pro" | "Enterprise";

export interface BrandPlan {
  name: PlanName;
  isPaid: boolean;
  /** -1 = unlimited, 0 = no access */
  dailyMessageLimit: number;
  /** Short human-readable label for UI */
  limitLabel: string;
}

// ── Static fallback config (used when no pricing data found in storage) ──────
const FALLBACK_CONFIG: Record<PlanName, Omit<BrandPlan, "name">> = {
  Free:       { isPaid: false, dailyMessageLimit: 0,   limitLabel: "No chat access"     },
  Basic:      { isPaid: true,  dailyMessageLimit: 30,  limitLabel: "30 messages / day"  },
  Pro:        { isPaid: true,  dailyMessageLimit: 100, limitLabel: "100 messages / day" },
  Enterprise: { isPaid: true,  dailyMessageLimit: -1,  limitLabel: "Unlimited messages" },
};

/** Format a message limit number into a human-readable label. */
export function formatLimitLabel(limit: number): string {
  if (limit === -1) return "Unlimited messages";
  if (limit === 0)  return "No chat access";
  return `${limit} messages / day`;
}

/**
 * Look up the admin-configured dailyMessageLimit for a given plan name
 * from the `flubn_pricing_plans` localStorage key.
 * Returns null if not found (caller should fall back to FALLBACK_CONFIG).
 */
function getDynamicMessageLimit(planName: PlanName): number | null {
  try {
    const raw = localStorage.getItem("flubn_pricing_plans");
    if (raw) {
      const plans = JSON.parse(raw) as Array<{ name: string; dailyMessageLimit?: number }>;
      const match = plans.find(
        (p) => p.name.toUpperCase() === planName.toUpperCase()
      );
      if (match && match.dailyMessageLimit !== undefined) {
        return match.dailyMessageLimit;
      }
    }
  } catch { /* ignore */ }
  return null;
}

/** Resolve a human-readable plan name from a billing description. */
function parsePlanName(description: string): PlanName {
  const upper = description.toUpperCase();
  if (upper.includes("ENTERPRISE")) return "Enterprise";
  if (upper.includes("PRO"))        return "Pro";
  if (upper.includes("BASIC"))      return "Basic";
  return "Basic"; // Any other paid description → Basic
}

/**
 * Resolve the active plan name from localStorage.
 * Priority:
 *  1. `flubn_brand_active_plan` key (explicit plan name)
 *  2. Latest entry in `flubn_billing_history`
 *  3. Default → Free
 */
function resolveActivePlanName(): PlanName {
  try {
    const explicit = localStorage.getItem("flubn_brand_active_plan") as PlanName | null;
    if (explicit && FALLBACK_CONFIG[explicit]) return explicit;

    const raw = localStorage.getItem("flubn_billing_history");
    if (raw) {
      const history = JSON.parse(raw) as { description: string }[];
      if (history.length > 0) return parsePlanName(history[0].description);
    }
  } catch { /* ignore */ }
  // New brands always start on the Free plan; they must purchase to upgrade
  return "Free";
}

/**
 * Returns the active plan for the current brand.
 * dailyMessageLimit is pulled LIVE from admin-configured pricing plans,
 * falling back to built-in defaults if not configured.
 */
export function getBrandPlan(): BrandPlan {
  const name = resolveActivePlanName();
  const fallback = FALLBACK_CONFIG[name];

  // Try dynamic limit from admin-configured plans
  const dynamicLimit = getDynamicMessageLimit(name);
  const limit = dynamicLimit !== null ? dynamicLimit : fallback.dailyMessageLimit;

  return {
    name,
    isPaid: fallback.isPaid,
    dailyMessageLimit: limit,
    limitLabel: formatLimitLabel(limit),
  };
}

/** Save the active plan name to localStorage (called from Subscription page). */
export function saveBrandActivePlan(planName: PlanName): void {
  try {
    localStorage.setItem("flubn_brand_active_plan", planName);
    // Notify same-tab listeners (storage event only fires cross-tab natively)
    window.dispatchEvent(
      new CustomEvent("flubn:plan-changed", { detail: { plan: planName } })
    );
  } catch { /* ignore */ }
  // Sync to backend
  try {
    const userId = JSON.parse(localStorage.getItem("flubn_user") || "{}").id;
    if (userId) {
      api.saveBrandPlan(userId, { name: planName, isPaid: planName !== "Free" }).catch(() => {});
      // ── Write into the shared per-brand plan registry so other roles
      //    (e.g. influencers) can look up any brand's plan tier by ID. ──
      writeBrandPlanRegistry(userId, planName);
    }
  } catch { /* ignore */ }
}

// ── Per-brand plan registry ───────────────────────────────────────────────────
// Keyed by brandId → PlanName.  Written whenever a brand saves their plan so
// influencers (and admins) can check any brand's tier without a network call.

const REGISTRY_KEY = "flubn_brand_plan_registry";

function readBrandPlanRegistry(): Record<string, PlanName> {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) return JSON.parse(raw) as Record<string, PlanName>;
  } catch { /* ignore */ }
  return {};
}

/** Called internally whenever a brand upgrades / downgrades their plan. */
export function writeBrandPlanRegistry(brandId: string, planName: PlanName): void {
  try {
    const registry = readBrandPlanRegistry();
    registry[brandId] = planName;
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  } catch { /* ignore */ }
}

/**
 * Look up the subscription plan for any brand by their user ID.
 * Returns "Free" if the brand hasn't saved a plan yet (safe default).
 */
export function getBrandPlanById(brandId: string): PlanName {
  const registry = readBrandPlanRegistry();
  return registry[brandId] ?? "Free";
}

/**
 * Returns true when the given brand is on the Free plan (i.e. no paid
 * subscription) — meaning chat access is unavailable for their campaigns.
 */
export function isBrandOnFreePlan(brandId: string): boolean {
  return getBrandPlanById(brandId) === "Free";
}

// ── Daily message usage ──────────────────────────────────────────────────────

function usageKey(userId: string): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `flubn_chat_usage_${userId}_${today}`;
}

/** Number of messages sent today by this user. */
export function getDailyMessageCount(userId: string): number {
  try {
    return parseInt(localStorage.getItem(usageKey(userId)) || "0", 10);
  } catch {
    return 0;
  }
}

/** Increment today's message count by 1. */
export function incrementDailyMessageCount(userId: string): void {
  try {
    const key = usageKey(userId);
    const count = parseInt(localStorage.getItem(key) || "0", 10);
    localStorage.setItem(key, (count + 1).toString());
  } catch { /* ignore */ }
  // Sync to backend
  api.incrementMessageUsage(userId).catch(() => {});
}

/** Returns true if the brand can still send a message right now. */
export function canSendMessage(userId: string, plan: BrandPlan): boolean {
  if (!plan.isPaid) return false;
  if (plan.dailyMessageLimit === -1) return true; // Unlimited
  return getDailyMessageCount(userId) < plan.dailyMessageLimit;
}

/** Remaining messages today (-1 = unlimited). */
export function remainingMessages(userId: string, plan: BrandPlan): number {
  if (!plan.isPaid) return 0;
  if (plan.dailyMessageLimit === -1) return -1;
  return Math.max(0, plan.dailyMessageLimit - getDailyMessageCount(userId));
}