/**
 * Influencer Recommendations (Score-Based — No AI)
 *
 * Scoring signals:
 *   1. Industry ↔ Category match        (+40 pts)
 *   2. Location overlap                  (+15 pts)
 *   3. Budget fit (rate within range)    (+20 pts)
 *   4. Past successful collabs           (+10 pts per accepted)
 *   5. Verified status                   (+10 pts)
 *   6. Trending / Featured boost         (+5 pts each)
 *
 * Plan gating:
 *   Free / Basic → locked (returns [])
 *   Pro / Enterprise → returns top N
 */

import type { Influencer } from "./dataManager";
import { getPlanLimits } from "./planLimits";

// ── Industry → Category mapping ─────────────────────────────────────────────

const INDUSTRY_CATEGORY_MAP: Record<string, string[]> = {
  "Fashion & Apparel": ["Fashion", "Beauty", "Lifestyle"],
  "Beauty & Cosmetics": ["Beauty", "Fashion", "Lifestyle"],
  "Technology": ["Technology", "Gaming"],
  "Food & Beverage": ["Food", "Lifestyle"],
  "Health & Fitness": ["Fitness", "Lifestyle", "Food"],
  "Travel & Hospitality": ["Travel", "Lifestyle", "Photography"],
  "Entertainment": ["Entertainment", "Gaming", "Comedy"],
  "Education": ["Education", "Technology"],
  "Finance": ["Finance", "Technology", "Education"],
  "E-Commerce": ["Fashion", "Beauty", "Technology", "Lifestyle"],
  "Real Estate": ["Lifestyle", "Finance"],
  "Automotive": ["Technology", "Lifestyle"],
  "Gaming": ["Gaming", "Technology", "Entertainment"],
  "SaaS": ["Technology", "Education"],
  "Media & Publishing": ["Entertainment", "Education", "Lifestyle"],
};

// ── Scoring ──────────────────────────────────────────────────────────────────

export interface ScoredInfluencer {
  influencer: Influencer;
  score: number;
  matchReasons: string[];
}

interface BrandProfile {
  industry?: string;
  location?: string;
  /** Average budget the brand uses (from past collabs or settings) */
  avgBudget?: number;
  /** IDs of influencers the brand has previously collaborated with */
  previousCollabInfluencerIds?: string[];
}

function scoreSingle(inf: Influencer, brand: BrandProfile): ScoredInfluencer {
  let score = 0;
  const reasons: string[] = [];

  // 1. Industry ↔ Category match (+40)
  if (brand.industry) {
    const matchCategories =
      INDUSTRY_CATEGORY_MAP[brand.industry] ||
      // Fallback: direct name match
      [brand.industry];
    if (matchCategories.some((c) => c.toLowerCase() === inf.category.toLowerCase())) {
      score += 40;
      reasons.push(`Matches your ${brand.industry} industry`);
    }
  }

  // 2. Location overlap (+15)
  if (brand.location && inf.location) {
    const brandCity = brand.location.split(",")[0].trim().toLowerCase();
    const infCity = inf.location.split(",")[0].trim().toLowerCase();
    if (brandCity === infCity) {
      score += 15;
      reasons.push("Same city as your brand");
    } else if (
      brand.location.toLowerCase().includes("india") &&
      inf.location.toLowerCase().includes("india")
    ) {
      score += 5;
      reasons.push("Based in India");
    }
  }

  // 3. Budget fit (+20) — rate within ±40% of brand's avg budget
  if (brand.avgBudget && brand.avgBudget > 0) {
    const lower = brand.avgBudget * 0.6;
    const upper = brand.avgBudget * 1.4;
    if (inf.ratePerPost >= lower && inf.ratePerPost <= upper) {
      score += 20;
      reasons.push("Rate fits your budget range");
    } else if (inf.ratePerPost < lower) {
      score += 8;
      reasons.push("Under your typical budget");
    }
  }

  // 4. Past successful collabs (+10 each, cap at 30)
  if (brand.previousCollabInfluencerIds?.includes(inf.id)) {
    score += 10;
    reasons.push("Previously collaborated");
  }

  // 5. Verified status (+10)
  if (inf.status === "verified") {
    score += 10;
    reasons.push("Verified creator");
  }

  // 6. Trending / Featured (+5 each)
  if (inf.isTrending) {
    score += 5;
    reasons.push("Trending creator");
  }
  if (inf.isFeatured) {
    score += 5;
    reasons.push("Featured on FLUBN");
  }

  // 7. High engagement / large following bonus (+5 for 100K+)
  if (inf.followers >= 100000) {
    score += 5;
    reasons.push(`${Math.round(inf.followers / 1000)}K+ followers`);
  }

  return { influencer: inf, score, matchReasons: reasons };
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Check if the current plan has access to suggestions. */
export function hasSuggestionsAccess(): boolean {
  return getPlanLimits().suggestedInfluencers;
}

/**
 * Get scored & sorted recommendations.
 * Returns empty array if plan doesn't have access.
 */
export function getRecommendations(
  influencers: Influencer[],
  brand: BrandProfile,
  topN: number = 6
): ScoredInfluencer[] {
  if (!hasSuggestionsAccess()) return [];

  const scored = influencers
    .map((inf) => scoreSingle(inf, brand))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topN);
}

/**
 * Build a brand profile from localStorage/user context for scoring.
 */
export function buildBrandProfile(): BrandProfile {
  try {
    const user = JSON.parse(localStorage.getItem("flubn_user") || "{}");
    const requests = JSON.parse(localStorage.getItem("flubn_collaboration_requests") || "[]");

    // Average budget from past collabs
    const brandRequests = requests.filter(
      (r: any) => r.brandId === user.id && r.status === "accepted"
    );
    const avgBudget =
      brandRequests.length > 0
        ? brandRequests.reduce((sum: number, r: any) => sum + (r.budget || 0), 0) / brandRequests.length
        : 0;

    // Previous collab influencer IDs
    const prevIds = [...new Set(brandRequests.map((r: any) => r.influencerId).filter(Boolean))] as string[];

    return {
      industry: user.industry,
      location: user.location,
      avgBudget,
      previousCollabInfluencerIds: prevIds,
    };
  } catch {
    return {};
  }
}