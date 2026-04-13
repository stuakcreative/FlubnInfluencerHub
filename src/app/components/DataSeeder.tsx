/**
 * DataSeeder — runs once on first app load.
 *
 * IMPORTANT: Both flags are stamped BEFORE the API call and are NEVER removed
 * on failure. This means:
 *  - If the edge function isn't deployed yet, the call silently fails once and
 *    never retries — no console spam, no infinite loops.
 *  - When the edge function IS deployed, clear the flags from browser DevTools:
 *      localStorage.removeItem("flubn_seeded_v4")
 *      localStorage.removeItem("flubn_cleanup_v4")
 *    then hard-refresh to re-run the seed.
 */
import { useEffect } from "react";
import { PRICING_PLANS } from "../data/mock-data";
import { getAllVerifications } from "../utils/brandVerification";
import * as api from "../utils/api";

const SEED_FLAG    = "flubn_seeded_v4";
const CLEANUP_FLAG = "flubn_cleanup_v4";

export function DataSeeder() {
  useEffect(() => {
    runOnce();
  }, []);

  return null;
}

async function runOnce() {
  // ── Cleanup (once, silent) ────────────────────────────────────────────────
  if (!localStorage.getItem(CLEANUP_FLAG)) {
    localStorage.setItem(CLEANUP_FLAG, "1"); // stamp first — never retry
    try {
      await api.cleanupMockData();
      console.log("[FLUBN] Backend mock cleanup complete");
    } catch {
      // Edge function not deployed yet — silently skip
    }
  }

  // ── Seed config (once, silent) ────────────────────────────────────────────
  if (localStorage.getItem(SEED_FLAG)) return;
  localStorage.setItem(SEED_FLAG, "1"); // stamp first — never retry

  // Small delay so auth context can settle
  await new Promise((r) => setTimeout(r, 2000));

  try {
    const verifications = getAllVerifications();
    await api.seedData({
      influencers: [],
      collaborations: [],
      adminUsers: [],
      blogPosts: [],
      verifications,
      pricingPlans: PRICING_PLANS,
      testimonials: [],
      createAdminUser: {
        email: "admin@flubn.com",
        password: "admin123",
        name: "Admin",
      },
    });
    console.log("[FLUBN] Backend seeded");
  } catch {
    // Edge function not deployed yet — silently skip
    // Flag stays set so we don't retry on next load
  }
}
