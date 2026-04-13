import { PRICING_PLANS, PricingPlan, TESTIMONIALS_DATA, TestimonialData, INFLUENCERS } from "../data/mock-data";
import * as api from "./api";

// Influencer type based on the data structure
export type Influencer = {
  id: string;
  name: string;
  photo: string;
  bio: string;
  category: string;
  location: string;
  followers: number;
  ratePerPost: number;
  gender: string;
  platforms: string[];
  platformFollowers?: Record<string, number>;
  instagram?: string;
  youtube?: string;
  email: string;
  phone: string;
  status: "active" | "suspended";
  isFeatured?: boolean;
  isTrending?: boolean;
  isVerified?: boolean;
  badges?: string[];
  createdAt?: string; // ISO timestamp — account creation time
  currency?: string;  // ISO 4217 code, e.g. "INR", "USD" — set by influencer
  username?: string;  // Unique slug for public profile URL (e.g. "priya-sharma" → flubn.com/@priya-sharma)
  socialLinks?: { platformId: string; url: string }[];
  portfolio?: any[];
  contentSpecialties?: string[];
};

const STORAGE_KEYS = {
  PRICING_PLANS: "flubn_pricing_plans",
  TESTIMONIALS: "flubn_testimonials",
  INFLUENCERS: "flubn_influencers",
  DELETED_INFLUENCERS: "flubn_deleted_influencer_ids",
};

/** Safe localStorage.setItem that silently handles QuotaExceededError */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e?.name === "QuotaExceededError" || e?.code === 22) {
      console.warn(`[FLUBN] localStorage quota exceeded for key "${key}". Clearing stale keys…`);
      // Remove non-essential keys to free space, then retry
      const protectedKeys = Object.values(STORAGE_KEYS);
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("flubn_") && !protectedKeys.includes(k)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
      try {
        localStorage.setItem(key, value);
      } catch {
        console.warn(`[FLUBN] Still over quota after cleanup for "${key}". Skipping localStorage write.`);
      }
    } else {
      throw e;
    }
  }
}

// Initialize data from localStorage or use defaults
export const initializeData = () => {
  // NOTE: The old "flubn_full_data_wipe_v*" cleanup block has been removed.
  // It was wiping real user data every time the preview environment reset.
  // Real persistence now relies on Supabase KV (edge function) as source of truth.

  // Initialize pricing plans
  if (!localStorage.getItem(STORAGE_KEYS.PRICING_PLANS)) {
    safeSetItem(STORAGE_KEYS.PRICING_PLANS, JSON.stringify(PRICING_PLANS));
  } else {
    // Migrate: ensure all stored plans have ALL fields from the latest schema
    try {
      const stored: PricingPlan[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRICING_PLANS)!);
      let migrated = false;
      stored.forEach((plan) => {
        const defaultMatch = PRICING_PLANS.find((m) => m.id === plan.id || m.name.toUpperCase() === plan.name.toUpperCase());

        if (plan.dailyMessageLimit === undefined) {
          plan.dailyMessageLimit = defaultMatch?.dailyMessageLimit ?? 0;
          migrated = true;
        }
        if (plan.yearlyPrice === undefined && defaultMatch?.yearlyPrice !== undefined) {
          plan.yearlyPrice = defaultMatch.yearlyPrice;
          migrated = true;
        }
        if (plan.collaborationLimit === undefined && defaultMatch?.collaborationLimit !== undefined) {
          plan.collaborationLimit = defaultMatch.collaborationLimit;
          migrated = true;
        }
        if (plan.featured === undefined) {
          plan.featured = defaultMatch?.featured ?? false;
          migrated = true;
        }
        if (plan.popular === undefined) {
          plan.popular = defaultMatch?.popular ?? false;
          migrated = true;
        }
        if (!plan.features || plan.features.length === 0) {
          if (defaultMatch?.features && defaultMatch.features.length > 0) {
            plan.features = defaultMatch.features;
            migrated = true;
          }
        }
      });
      if (migrated) {
        safeSetItem(STORAGE_KEYS.PRICING_PLANS, JSON.stringify(stored));
      }
    } catch {
      safeSetItem(STORAGE_KEYS.PRICING_PLANS, JSON.stringify(PRICING_PLANS));
    }
  }
  
  // Initialize testimonials
  if (!localStorage.getItem(STORAGE_KEYS.TESTIMONIALS)) {
    safeSetItem(STORAGE_KEYS.TESTIMONIALS, JSON.stringify(TESTIMONIALS_DATA));
  } else {
    // Migrate: ensure all stored testimonials have required fields
    try {
      const stored: TestimonialData[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TESTIMONIALS)!);
      let migrated = false;
      stored.forEach((t) => {
        if (t.featured === undefined) {
          t.featured = false;
          migrated = true;
        }
        if (t.status === undefined) {
          t.status = "active";
          migrated = true;
        }
      });
      if (migrated) {
        safeSetItem(STORAGE_KEYS.TESTIMONIALS, JSON.stringify(stored));
      }
    } catch {
      safeSetItem(STORAGE_KEYS.TESTIMONIALS, JSON.stringify(TESTIMONIALS_DATA));
    }
  }
  
  // Initialize influencers
  if (!localStorage.getItem(STORAGE_KEYS.INFLUENCERS)) {
    safeSetItem(STORAGE_KEYS.INFLUENCERS, JSON.stringify(INFLUENCERS));
  } else {
    // Migrate: ensure all stored influencers have all required fields
    try {
      const stored: Influencer[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.INFLUENCERS)!);
      let migrated = false;
      stored.forEach((inf) => {
        // Migrate old "pending"/"verified" status to new "active"/"suspended" model
        if ((inf.status as any) === "pending" || (inf.status as any) === "verified") {
          inf.status = "active";
          migrated = true;
        }
        if (inf.isFeatured === undefined) {
          inf.isFeatured = false;
          migrated = true;
        }
        if (inf.isTrending === undefined) {
          inf.isTrending = false;
          migrated = true;
        }
        if (inf.isVerified === undefined) {
          inf.isVerified = false;
          migrated = true;
        }
        if (!inf.platforms || inf.platforms.length === 0) {
          inf.platforms = [];
          migrated = true;
        }
        if (inf.badges === undefined) {
          inf.badges = [];
          migrated = true;
        }
        if (inf.createdAt === undefined) {
          inf.createdAt = new Date().toISOString();
          migrated = true;
        }
        if (inf.currency === undefined) {
          inf.currency = "INR";
          migrated = true;
        }
        if (inf.username === undefined) {
          // Auto-generate from name: "Priya Sharma" -> "priya-sharma"
          if (inf.name) {
            const baseName = (inf.name || "")
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "");
            if (baseName && baseName.length >= 3) {
              let candidate = baseName;
              let counter = 1;
              while (candidate && stored.some(i => i !== inf && i.username === candidate)) {
                candidate = `${baseName}-${counter}`;
                counter++;
              }
              inf.username = candidate || undefined;
            }
          }
          migrated = true;
        }
      });

      if (migrated) {
        safeSetItem(STORAGE_KEYS.INFLUENCERS, JSON.stringify(stored));
      }
    } catch {
      // If parsing fails, re-initialize from defaults
      safeSetItem(STORAGE_KEYS.INFLUENCERS, JSON.stringify(INFLUENCERS));
    }
  }
};

// Pricing Plans Management
export const getPricingPlans = (): PricingPlan[] => {
  initializeData();
  const data = localStorage.getItem(STORAGE_KEYS.PRICING_PLANS);
  return data ? JSON.parse(data) : PRICING_PLANS;
};

export const savePricingPlans = (plans: PricingPlan[]): void => {
  safeSetItem(STORAGE_KEYS.PRICING_PLANS, JSON.stringify(plans));
  // Sync to backend
  api.saveSettings("pricing_plans", plans).catch((err) => {
    if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && !err.message?.includes("Load failed")) {
      console.error("Pricing plans sync error:", err.message);
    }
  });
  // Dispatch custom event to notify components in same tab
  window.dispatchEvent(new CustomEvent("pricingPlansUpdated", { detail: plans }));
  window.dispatchEvent(new StorageEvent("storage", {
    key: STORAGE_KEYS.PRICING_PLANS,
    newValue: JSON.stringify(plans),
    url: window.location.href,
    storageArea: localStorage
  }));
};

export const addPricingPlan = (plan: PricingPlan): void => {
  const plans = getPricingPlans();
  plans.push(plan);
  savePricingPlans(plans);
};

export const updatePricingPlan = (id: string, updates: Partial<PricingPlan>): void => {
  const plans = getPricingPlans();
  const index = plans.findIndex((p) => p.id === id);
  if (index !== -1) {
    plans[index] = {
      ...plans[index],
      ...updates,
      updatedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    savePricingPlans(plans);
  }
};

export const deletePricingPlan = (id: string): void => {
  const plans = getPricingPlans();
  const filtered = plans.filter((p) => p.id !== id);
  savePricingPlans(filtered);
};

// Testimonials Management
export const getTestimonials = (): TestimonialData[] => {
  initializeData();
  const data = localStorage.getItem(STORAGE_KEYS.TESTIMONIALS);
  const testimonials: TestimonialData[] = data ? JSON.parse(data) : TESTIMONIALS_DATA;
  const seen = new Set<string>();
  return testimonials.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
};

export const saveTestimonials = (testimonials: TestimonialData[]): void => {
  safeSetItem(STORAGE_KEYS.TESTIMONIALS, JSON.stringify(testimonials));
  // Sync to backend
  api.saveSettings("testimonials", testimonials).catch((err) => {
    if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && !err.message?.includes("Load failed")) {
      console.error("Testimonials sync error:", err.message);
    }
  });
  // Dispatch custom event to notify components in same tab
  window.dispatchEvent(new CustomEvent("testimonialsUpdated", { detail: testimonials }));
  window.dispatchEvent(new StorageEvent("storage", {
    key: STORAGE_KEYS.TESTIMONIALS,
    newValue: JSON.stringify(testimonials),
    url: window.location.href,
    storageArea: localStorage
  }));
};

export const addTestimonial = (testimonial: TestimonialData): void => {
  const testimonials = getTestimonials();
  // Prevent duplicate IDs
  if (testimonials.some((t) => t.id === testimonial.id)) return;
  testimonials.push(testimonial);
  saveTestimonials(testimonials);
};

export const updateTestimonial = (id: string, updates: Partial<TestimonialData>): void => {
  const testimonials = getTestimonials();
  const index = testimonials.findIndex((t) => t.id === id);
  if (index !== -1) {
    testimonials[index] = { ...testimonials[index], ...updates };
    saveTestimonials(testimonials);
  }
};

export const deleteTestimonial = (id: string): void => {
  const testimonials = getTestimonials();
  const filtered = testimonials.filter((t) => t.id !== id);
  saveTestimonials(filtered);
};

// Get active and featured testimonials for display (like TESTIMONIALS export)
export const getActiveTestimonials = () => {
  return getTestimonials()
    .filter((t) => t.status === "active" && t.featured && (!t.submissionStatus || t.submissionStatus === "approved"))
    .map((t) => ({
      id: t.id,
      name: t.name,
      role: t.company ? `${t.role}, ${t.company}` : t.role,
      quote: t.quote,
      avatar: t.avatar,
      profileImage: t.profileImage || "",
      rating: t.rating || 5,
      type: t.type || "brand",
    }));
};

// Get all active testimonials (approved, regardless of featured) for the public testimonials page
export const getAllApprovedTestimonials = () => {
  return getTestimonials()
    .filter((t) => t.status === "active" && (!t.submissionStatus || t.submissionStatus === "approved"))
    .map((t) => ({
      id: t.id,
      name: t.name,
      role: t.company ? `${t.role}, ${t.company}` : t.role,
      company: t.company || "",
      quote: t.quote,
      avatar: t.avatar,
      profileImage: t.profileImage || "",
      rating: t.rating || 5,
      type: t.type || "brand",
      featured: t.featured,
      createdDate: t.createdDate,
    }));
};

// Get testimonials submitted by a specific user
export const getTestimonialsByUser = (userId: string) => {
  return getTestimonials().filter((t) => t.submittedBy === userId);
};

// Get pending testimonial submissions for admin review
export const getPendingTestimonials = () => {
  return getTestimonials().filter((t) => t.submissionStatus === "pending");
};

// Approve a testimonial submission
export const approveTestimonial = (id: string): void => {
  const testimonials = getTestimonials();
  const index = testimonials.findIndex((t) => t.id === id);
  if (index !== -1) {
    testimonials[index].submissionStatus = "approved";
    testimonials[index].status = "active";
    saveTestimonials(testimonials);
  }
};

// Reject a testimonial submission
export const rejectTestimonial = (id: string, reason?: string): void => {
  const testimonials = getTestimonials();
  const index = testimonials.findIndex((t) => t.id === id);
  if (index !== -1) {
    testimonials[index].submissionStatus = "rejected";
    testimonials[index].rejectionReason = reason || "Rejected by admin";
    saveTestimonials(testimonials);
  }
};

// Get active pricing plans
export const getActivePricingPlans = () => {
  return getPricingPlans().filter((p) => p.status === "active");
};

// Influencers Management
export const getInfluencers = (): Influencer[] => {
  initializeData();
  const data = localStorage.getItem(STORAGE_KEYS.INFLUENCERS);
  return data ? JSON.parse(data) : INFLUENCERS;
};

export const saveInfluencers = (influencers: Influencer[]): void => {
  safeSetItem(STORAGE_KEYS.INFLUENCERS, JSON.stringify(influencers));
  // Sync to backend
  api.saveData("influencers_full", influencers).catch((err) => {
    if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && !err.message?.includes("Load failed")) {
      console.error("Influencers sync error:", err.message);
    }
  });
  // Dispatch custom event to notify components in same tab
  window.dispatchEvent(new CustomEvent("influencersUpdated", { detail: influencers }));
  window.dispatchEvent(new StorageEvent("storage", {
    key: STORAGE_KEYS.INFLUENCERS,
    newValue: JSON.stringify(influencers),
    url: window.location.href,
    storageArea: localStorage
  }));
};

export const addInfluencer = (influencer: Influencer): void => {
  const influencers = getInfluencers();
  // Normalize email to lowercase before storing
  if (influencer.email) influencer.email = influencer.email.toLowerCase();
  // Prevent duplicate by ID or email (case-insensitive)
  if (influencers.some((i) => i.id === influencer.id || (influencer.email && i.email?.toLowerCase() === influencer.email.toLowerCase()))) return;
  // Auto-generate username from name if not provided
  if (!influencer.username && influencer.name) {
    const baseName = influencer.name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (baseName && baseName.length >= 3) {
      let candidate = baseName;
      let counter = 1;
      while (influencers.some(i => i.username === candidate)) {
        candidate = `${baseName}-${counter}`;
        counter++;
      }
      influencer.username = candidate;
    }
  }
  influencers.push(influencer);
  saveInfluencers(influencers);
};

export const updateInfluencer = (id: string, updates: Partial<Influencer>): void => {
  const influencers = getInfluencers();
  const index = influencers.findIndex((i) => i.id === id);
  if (index !== -1) {
    influencers[index] = { ...influencers[index], ...updates };
    saveInfluencers(influencers);
  }
};

export const deleteInfluencer = (id: string, email?: string): void => {
  const influencers = getInfluencers();
  // Match by ID first, then also by email as fallback for cross-store ID mismatches
  const filtered = influencers.filter((i) => {
    if (i.id === id) return false;
    if (email && i.email && i.email.toLowerCase() === email.toLowerCase()) return false;
    return true;
  });

  // Collect all matched IDs for the deleted-IDs tracking list
  const removedIds = influencers.filter((i) => !filtered.some((f) => f.id === i.id)).map((i) => i.id);

  saveInfluencers(filtered);

  // Track deleted IDs so mock data doesn't re-add them on next initializeData()
  try {
    const deletedIds: string[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_INFLUENCERS) || "[]");
    let changed = false;
    for (const rid of [id, ...removedIds]) {
      if (!deletedIds.includes(rid)) {
        deletedIds.push(rid);
        changed = true;
      }
    }
    if (changed) {
      safeSetItem(STORAGE_KEYS.DELETED_INFLUENCERS, JSON.stringify(deletedIds));
    }
  } catch {
    safeSetItem(STORAGE_KEYS.DELETED_INFLUENCERS, JSON.stringify([id, ...removedIds]));
  }
};

// Get featured influencers for the landing page
export const getFeaturedInfluencers = (): Influencer[] => {
  return getInfluencers().filter((i) => !!i.isFeatured);
};

// Toggle featured status for an influencer
export const toggleInfluencerFeatured = (id: string): boolean => {
  const influencers = getInfluencers();
  const index = influencers.findIndex((i) => i.id === id);
  if (index !== -1) {
    influencers[index].isFeatured = !influencers[index].isFeatured;
    saveInfluencers(influencers);
    return influencers[index].isFeatured;
  }
  return false;
};

// Toggle verified badge for an influencer (admin only)
export const toggleInfluencerVerified = (id: string): boolean => {
  const influencers = getInfluencers();
  const index = influencers.findIndex((i) => i.id === id);
  if (index !== -1) {
    influencers[index].isVerified = !influencers[index].isVerified;
    saveInfluencers(influencers);
    return influencers[index].isVerified!;
  }
  return false;
};

// ── Backend Hydration ─────────────────────────────────────────────────────────
// Called once on app startup. Fetches the real influencer list from the edge
// function KV store and merges it into localStorage, replacing mock-only data.
// Safe to call before login — the /influencers endpoint is publicly readable.
export async function hydrateInfluencersFromBackend(): Promise<void> {
  try {
    const backendInfluencers: Influencer[] | null = await api.getInfluencers();
    if (!backendInfluencers || !Array.isArray(backendInfluencers) || backendInfluencers.length === 0) {
      // Backend returned nothing — seed it from localStorage if we have real data
      const local = getInfluencers();
      // Only seed if local has real (non-mock) users (have an email that looks real)
      const realUsers = local.filter(inf => inf.email && !inf.email.includes("example.com") && !inf.email.includes("flubn.com"));
      if (realUsers.length > 0) {
        api.saveData("influencers_full", local).catch(() => {});
      }
      return;
    }

    // Get the list of deleted IDs so we don't re-add deleted entries
    let deletedIds: string[] = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_INFLUENCERS) || "[]");
    } catch { /* ignore */ }

    // Filter out deleted entries and mock/demo data from backend list
    const validBackend = backendInfluencers.filter(inf =>
      inf.id && inf.email && !deletedIds.includes(inf.id)
    );

    if (validBackend.length === 0) return;

    // Merge: backend is source of truth, preserve local-only admin mutations
    const local = getInfluencers();
    const merged = new Map<string, Influencer>();

    // Start with backend data
    validBackend.forEach(inf => merged.set(inf.id, inf));

    // Merge local entries that don't exist on backend yet (e.g. just signed up)
    local.forEach(inf => {
      if (!merged.has(inf.id) && inf.email && !deletedIds.includes(inf.id)) {
        merged.set(inf.id, inf);
      } else if (merged.has(inf.id)) {
        // Preserve admin-applied flags (featured, verified, trending, badges)
        const backendEntry = merged.get(inf.id)!;
        merged.set(inf.id, {
          ...backendEntry,
          isFeatured: inf.isFeatured ?? backendEntry.isFeatured,
          isVerified: inf.isVerified ?? backendEntry.isVerified,
          isTrending: inf.isTrending ?? backendEntry.isTrending,
          badges: inf.badges ?? backendEntry.badges,
          status: inf.status ?? backendEntry.status,
        });
      }
    });

    const final = Array.from(merged.values());
    safeSetItem(STORAGE_KEYS.INFLUENCERS, JSON.stringify(final));

    // Fire events so any mounted components re-render
    window.dispatchEvent(new CustomEvent("influencersUpdated", { detail: final }));
    window.dispatchEvent(new StorageEvent("storage", {
      key: STORAGE_KEYS.INFLUENCERS,
      newValue: JSON.stringify(final),
      url: window.location.href,
      storageArea: localStorage,
    }));

    console.log(`[FLUBN] Hydrated ${final.length} influencers from backend KV.`);
  } catch (err: any) {
    // Network error or edge function down — localStorage data remains unchanged
    console.warn("[FLUBN] Backend influencer hydration skipped:", err?.message || err);
  }
}