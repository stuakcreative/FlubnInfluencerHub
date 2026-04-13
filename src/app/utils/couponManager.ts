/**
 * Coupon Manager for FLUBN
 * Handles coupon CRUD, validation, and application logic.
 * Uses localStorage as instant cache + backend sync via api.ts.
 */
import * as api from "./api";

// ── Types ──

export interface Coupon {
  id: string;
  code: string; // Uppercase alphanumeric, e.g. "WELCOME20"
  description: string;
  discountType: "percentage" | "flat"; // "percentage" = % off, "flat" = ₹ off
  discountValue: number; // e.g. 20 for 20% or 500 for ₹500
  applicablePlans: string[]; // ["Basic", "Pro", "Enterprise"] or ["All"]
  applicableBillingCycles: ("monthly" | "yearly")[]; // which cycles this applies to
  minOrderAmount: number; // Minimum plan price required (0 = no minimum)
  maxDiscount: number; // Cap for percentage discounts (0 = no cap)
  usageLimit: number; // Total uses allowed (0 = unlimited)
  usedCount: number; // How many times used
  perUserLimit: number; // Uses per brand (0 = unlimited)
  usedByUsers: string[]; // Array of user IDs who used it
  validFrom: string; // ISO date string
  validUntil: string; // ISO date string
  isActive: boolean;
  createdAt: string;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  discount?: number; // Actual discount amount in ₹
  finalAmount?: number; // Amount after discount
  coupon?: Coupon;
}

const STORAGE_KEY = "flubn_coupons";

// ── Default demo coupons ──

const DEFAULT_COUPONS: Coupon[] = [];

// ── CRUD Operations ──

export function getCoupons(): Coupon[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  // Initialize with defaults
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COUPONS));
  return [...DEFAULT_COUPONS];
}

export function saveCoupons(coupons: Coupon[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
  window.dispatchEvent(new CustomEvent("couponsUpdated", { detail: coupons }));
  // Sync to backend
  api.saveData("coupons", coupons).catch(() => {});
}

export function addCoupon(coupon: Omit<Coupon, "id" | "createdAt" | "usedCount" | "usedByUsers">): Coupon {
  const coupons = getCoupons();
  // Check code uniqueness
  if (coupons.some((c) => c.code.toUpperCase() === coupon.code.toUpperCase())) {
    throw new Error(`Coupon code "${coupon.code}" already exists`);
  }
  const newCoupon: Coupon = {
    ...coupon,
    id: `cpn_${Date.now()}`,
    code: coupon.code.toUpperCase().trim(),
    createdAt: new Date().toISOString(),
    usedCount: 0,
    usedByUsers: [],
  };
  coupons.push(newCoupon);
  saveCoupons(coupons);
  return newCoupon;
}

export function updateCoupon(id: string, updates: Partial<Coupon>): Coupon | null {
  const coupons = getCoupons();
  const index = coupons.findIndex((c) => c.id === id);
  if (index === -1) return null;

  // If code is being updated, check uniqueness
  if (updates.code) {
    const codeExists = coupons.some(
      (c) => c.id !== id && c.code.toUpperCase() === updates.code!.toUpperCase()
    );
    if (codeExists) throw new Error(`Coupon code "${updates.code}" already exists`);
    updates.code = updates.code.toUpperCase().trim();
  }

  coupons[index] = { ...coupons[index], ...updates };
  saveCoupons(coupons);
  return coupons[index];
}

export function deleteCoupon(id: string): boolean {
  const coupons = getCoupons();
  const filtered = coupons.filter((c) => c.id !== id);
  if (filtered.length === coupons.length) return false;
  saveCoupons(filtered);
  return true;
}

export function toggleCoupon(id: string): Coupon | null {
  const coupons = getCoupons();
  const coupon = coupons.find((c) => c.id === id);
  if (!coupon) return null;
  coupon.isActive = !coupon.isActive;
  saveCoupons(coupons);
  return coupon;
}

// ── Validation Engine ──

export function validateCoupon(
  code: string,
  planName: string,
  billingCycle: "monthly" | "yearly",
  amount: number,
  userId?: string
): CouponValidationResult {
  const coupons = getCoupons();
  const coupon = coupons.find((c) => c.code.toUpperCase() === code.toUpperCase().trim());

  if (!coupon) {
    return { valid: false, error: "Invalid coupon code" };
  }

  if (!coupon.isActive) {
    return { valid: false, error: "This coupon is no longer active" };
  }

  // Check date validity
  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validUntil = new Date(coupon.validUntil);

  if (now < validFrom) {
    return { valid: false, error: "This coupon is not yet valid" };
  }

  if (now > validUntil) {
    return { valid: false, error: "This coupon has expired" };
  }

  // Check usage limit
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, error: "This coupon has reached its usage limit" };
  }

  // Check per-user limit
  if (userId && coupon.perUserLimit > 0) {
    const userUsageCount = coupon.usedByUsers.filter((uid) => uid === userId).length;
    if (userUsageCount >= coupon.perUserLimit) {
      return { valid: false, error: "You've already used this coupon" };
    }
  }

  // Check applicable plans
  if (!coupon.applicablePlans.includes("All") && !coupon.applicablePlans.includes(planName)) {
    return {
      valid: false,
      error: `This coupon is not valid for the ${planName} plan`,
    };
  }

  // Check applicable billing cycle
  if (!coupon.applicableBillingCycles.includes(billingCycle)) {
    return {
      valid: false,
      error: `This coupon is only valid for ${coupon.applicableBillingCycles.join(" & ")} billing`,
    };
  }

  // Check minimum order amount
  if (coupon.minOrderAmount > 0 && amount < coupon.minOrderAmount) {
    return {
      valid: false,
      error: `Minimum order of ₹${coupon.minOrderAmount.toLocaleString()} required`,
    };
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = Math.round((amount * coupon.discountValue) / 100);
    // Apply max discount cap
    if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    // Flat discount
    discount = coupon.discountValue;
  }

  // Discount can't exceed amount
  if (discount > amount) {
    discount = amount;
  }

  const finalAmount = amount - discount;

  return {
    valid: true,
    discount,
    finalAmount,
    coupon,
  };
}

// ── Record coupon usage after successful payment ──

export function recordCouponUsage(couponId: string, userId: string): void {
  const coupons = getCoupons();
  const coupon = coupons.find((c) => c.id === couponId);
  if (!coupon) return;
  coupon.usedCount += 1;
  coupon.usedByUsers.push(userId);
  saveCoupons(coupons);
}

// ── Stats helpers ──

export function getCouponStats() {
  const coupons = getCoupons();
  const now = new Date();
  const active = coupons.filter((c) => c.isActive && new Date(c.validUntil) > now);
  const expired = coupons.filter((c) => !c.isActive || new Date(c.validUntil) <= now);
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.usedCount, 0);
  return {
    total: coupons.length,
    active: active.length,
    expired: expired.length,
    totalRedemptions,
  };
}