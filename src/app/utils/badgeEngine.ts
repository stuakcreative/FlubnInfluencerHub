/**
 * badgeEngine.ts
 * ---------------
 * Computes which of the 6 auto-awarded trust badges an influencer
 * has earned. Every condition here maps 1-to-1 with the criteria
 * chips shown on the admin TrustBadges card — no proxy fields.
 *
 * Data sources used:
 *   RATINGS             – overallRating, contentQuality, timeliness,
 *                         professionalism, brandId, status
 *   COLLABORATION_REQUESTS – influencerId, status ("accepted")
 *   Influencer fields   – followers, isTrending, isFeatured,
 *                         status, platforms
 *
 * tb1 ("Verified Creator") is MANUAL — admin-only, never auto-assigned.
 */

import { RATINGS, COLLABORATION_REQUESTS } from "../data/mock-data";
import type { Influencer } from "./dataManager";

export const AUTO_BADGE_IDS  = ["tb2", "tb3", "tb4", "tb5", "tb6", "tb7"] as const;
export const MANUAL_BADGE_IDS = ["tb1"] as const;

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

/** Returns the set of auto-earned badge IDs for a given influencer. */
export function computeAutoBadges(influencer: Influencer): string[] {
  const earned: string[] = [];

  // Approved reviews for this influencer
  const myRatings = RATINGS.filter(
    (r) => r.influencerId === influencer.id && r.status === "approved"
  );

  const avgOverall      = avg(myRatings.map((r) => r.overallRating));
  const avgContentQual  = avg(myRatings.map((r) => r.contentQuality));
  const avgTimeliness   = avg(myRatings.map((r) => r.timeliness));
  const avgProfession   = avg(myRatings.map((r) => r.professionalism));
  const uniqueBrands    = new Set(myRatings.map((r) => r.brandId)).size;

  // Accepted collaborations for this influencer
  const acceptedCollabs = COLLABORATION_REQUESTS.filter(
    (c) => c.influencerId === influencer.id && c.status === "accepted"
  );

  // ── tb2  Top Rated ────────────────────────────────────────────────────────
  // Avg brand rating ≥ 4.5 · At least 1 approved review
  // Content quality score ≥ 4.0 · Professionalism score ≥ 4.0
  if (
    myRatings.length >= 1 &&
    avgOverall     >= 4.5 &&
    avgContentQual >= 4.0 &&
    avgProfession  >= 4.0
  ) {
    earned.push("tb2");
  }

  // ── tb3  Fast Responder ───────────────────────────────────────────────────
  // Timeliness score ≥ 4.5 across brand reviews · At least 1 approved review
  // Trending on platform (proxy: recognised as highly active)
  if (
    myRatings.length >= 1 &&
    avgTimeliness  >= 4.5 &&
    influencer.isTrending === true
  ) {
    earned.push("tb3");
  }

  // ── tb4  Professional ─────────────────────────────────────────────────────
  // Verified account · At least 1 accepted collaboration
  // Professionalism score ≥ 4.0 in brand reviews (or no reviews yet)
  if (
    influencer.status === "verified" &&
    acceptedCollabs.length >= 1 &&
    (myRatings.length === 0 || avgProfession >= 4.0)
  ) {
    earned.push("tb4");
  }

  // ── tb5  Rising Star ──────────────────────────────────────────────────────
  // Minimum 5,000 total followers · Trending on platform
  // Active on 2+ platforms
  if (
    influencer.followers          >= 5_000 &&
    influencer.isTrending         === true &&
    (influencer.platforms?.length ?? 0) >= 2
  ) {
    earned.push("tb5");
  }

  // ── tb6  Quality Content ──────────────────────────────────────────────────
  // Featured by admin on platform
  // Content quality score ≥ 4.0 in reviews (or no reviews yet)
  if (
    influencer.isFeatured === true &&
    (myRatings.length === 0 || avgContentQual >= 4.0)
  ) {
    earned.push("tb6");
  }

  // ── tb7  Brand Favorite ───────────────────────────────────────────────────
  // Reviewed by 2+ different brands · Average brand rating ≥ 4.7
  if (uniqueBrands >= 2 && avgOverall >= 4.7) {
    earned.push("tb7");
  }

  return earned;
}

/** Merges manual badge IDs (tb1) with auto-computed ones, de-duped.
 *  tb1 ("Verified Creator") is now driven by the isVerified flag set by admin. */
export function mergeInfluencerBadges(influencer: Influencer): string[] {
  // tb1 is granted when admin has verified the influencer
  const manual: string[] = influencer.isVerified ? ["tb1"] : [];
  const auto = computeAutoBadges(influencer);
  return Array.from(new Set([...manual, ...auto]));
}