import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, CreditCard, Zap, Crown, ArrowRight, ArrowDown, Shield,
  Sparkles, Clock, Receipt, Download, ChevronDown, ChevronUp,
  X, AlertCircle, Rocket, Star, Gift, TrendingUp, Users, MessageSquare, Send,
  IndianRupee, ShieldCheck, XCircle, Monitor, Lock, Ticket, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getPricingPlans } from "../../utils/dataManager";
import type { PricingPlan } from "../../data/mock-data";
import { useAuth } from "../../context/AuthContext";
import { saveBrandActivePlan, type PlanName } from "../../utils/brandSubscription";
import { getMonthlyCollabCount, getActiveCampaignCount, getPlanLimits } from "../../utils/planLimits";
import * as api from "../../utils/api";
import { validateCoupon, recordCouponUsage, type CouponValidationResult } from "../../utils/couponManager";
import jsPDF from "jspdf";

// ── Razorpay types ──
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayConfig {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  isEnabled: boolean;
  webhookSecret: string;
  demoMode?: boolean;
}

const getRazorpayConfig = (): RazorpayConfig | null => {
  try {
    const saved = localStorage.getItem("razorpay_config");
    if (saved) {
      const config = JSON.parse(saved) as RazorpayConfig;
      // Accept config if demo mode is on OR if real keys are configured
      if (config.isEnabled && (config.demoMode || (config.razorpayKeyId && config.razorpayKeyId.startsWith("rzp_")))) {
        return config;
      }
    }
  } catch { /* ignore */ }
  return null;
};

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

type BillingItem = {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "paid" | "failed" | "pending";
  invoice: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  method?: string;
};

const generateReceipt = (item: BillingItem) => {
  const doc = new jsPDF({ unit: "mm", format: [105, 200] });
  const pageW = 105;
  const margin = 10;
  const centerX = pageW / 2;

  const txnId = `TXN${item.id.replace("bh", "").padStart(6, "0")}${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const paymentTime = "10:32 AM";

  // ── Top accent stripe ──
  doc.setFillColor(47, 107, 255);
  doc.rect(0, 0, pageW, 3, "F");

  // ── Brand name ──
  let y = 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 61, 145);
  doc.text("FLUBN", centerX, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Influencer Marketplace", centerX, y, { align: "center" });

  // ── Payment Receipt title ──
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 46);
  doc.text("Payment Receipt", centerX, y, { align: "center" });

  // ── Dashed divider ──
  y += 6;
  doc.setDrawColor(200, 210, 225);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  // ── Success checkmark circle ──
  y += 14;
  doc.setFillColor(236, 253, 245);
  doc.circle(centerX, y, 10, "F");
  doc.setFillColor(16, 185, 129);
  doc.circle(centerX, y, 6.5, "F");

  // Draw checkmark
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  doc.line(centerX - 3, y, centerX - 0.5, y + 2.5);
  doc.line(centerX - 0.5, y + 2.5, centerX + 3.5, y - 2);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text("Payment Successful", centerX, y, { align: "center" });

  // ── Amount ──
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(26, 26, 46);
  doc.text(`Rs. ${item.amount.toLocaleString("en-IN")}`, centerX, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(item.description, centerX, y, { align: "center" });

  // ── Dashed divider ──
  y += 8;
  doc.setDrawColor(200, 210, 225);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  // ── Details rows ──
  y += 8;
  const details = [
    { label: "Date", value: item.date },
    { label: "Time", value: paymentTime },
    { label: "Transaction ID", value: txnId },
    { label: "Payment Method", value: "VISA •••• 4242" },
    { label: "Status", value: "Paid" },
  ];

  details.forEach((row) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(row.label, margin + 4, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(26, 26, 46);
    doc.text(row.value, pageW - margin - 4, y, { align: "right" });

    y += 8;
  });

  // ── Dashed divider ──
  y += 2;
  doc.setDrawColor(200, 210, 225);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  // ── Footer ──
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(160, 174, 192);
  doc.text("FLUBN Technologies Pvt. Ltd.", centerX, y, { align: "center" });
  y += 4;
  doc.text("This is a computer-generated receipt.", centerX, y, { align: "center" });

  // ── Bottom accent stripe ──
  doc.setFillColor(47, 107, 255);
  doc.rect(0, 197, pageW, 3, "F");

  // ── Save ──
  doc.save(`Receipt-${item.invoice.replace("INV-", "")}.pdf`);
};

// Billing history — populated from real payment records at runtime
const BILLING_HISTORY: BillingItem[] = [];

// Feature comparison data
const COMPARISON_FEATURES = [
  { name: "Browse Influencers", free: true, basic: true, pro: true, enterprise: true },
  { name: "Search Filters", free: "Basic", basic: "Advanced", pro: "Advanced", enterprise: "Advanced + Custom" },
  { name: "Searches per Day", free: "Unlimited", basic: "Unlimited", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Campaign Templates", free: "0", basic: "3", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Collaboration Requests/mo", free: "5", basic: "20", pro: "50", enterprise: "200" },
  { name: "Analytics", free: false, basic: "Basic", pro: "Advanced", enterprise: "Custom" },
  { name: "Priority Support", free: false, basic: false, pro: true, enterprise: true },
  { name: "Custom Contracts", free: false, basic: false, pro: true, enterprise: true },
  { name: "Dedicated Account Manager", free: false, basic: false, pro: true, enterprise: true },
  { name: "API Access", free: false, basic: false, pro: false, enterprise: true },
  { name: "White-label Solutions", free: false, basic: false, pro: false, enterprise: true },
  { name: "Multi-user Accounts", free: false, basic: false, pro: false, enterprise: true },
];

export default function BrandSubscription() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string>(() => {
    // Read the brand's active plan from localStorage and map to a plan ID
    try {
      const activePlanName = localStorage.getItem("flubn_brand_active_plan");
      if (activePlanName) {
        const nameToId: Record<string, string> = {
          Free: "p1", Basic: "p2", Pro: "p3", Enterprise: "p4",
        };
        return nameToId[activePlanName] || "p1";
      }
    } catch { /* ignore */ }
    return "p1"; // Default to Free for new brands
  });
  const [allPlans, setAllPlans] = useState<PricingPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showComparison, setShowComparison] = useState(false);
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  const [upgradeModalPlan, setUpgradeModalPlan] = useState<PricingPlan | null>(null);
  const [processing, setProcessing] = useState(false);
  const [salesInquirySent, setSalesInquirySent] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [billingHistory, setBillingHistory] = useState<BillingItem[]>(() => {
    try {
      const saved = localStorage.getItem("flubn_billing_history");
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return BILLING_HISTORY;
  });
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "failed">("idle");
  const [demoCheckoutStep, setDemoCheckoutStep] = useState<"idle" | "form" | "processing" | "success">("idle");
  const [demoCardNumber, setDemoCardNumber] = useState("4242 4242 4242 4242");
  const [demoExpiry, setDemoExpiry] = useState("12/27");
  const [demoCvv, setDemoCvv] = useState("123");

  // ── Coupon state ──
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Load Razorpay script on mount
  useEffect(() => {
    loadRazorpayScript().then(setRazorpayReady);
  }, []);

  // Check if this brand already sent an inquiry
  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem("flubn_sales_inquiries") || "[]");
      const alreadySent = existing.some((inq: any) => inq.email === (user?.email || "demo@flubn.com") && inq.status !== "resolved");
      setSalesInquirySent(alreadySent);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    const plans = getPricingPlans();
    setAllPlans(plans);

    // On first mount, if no plan is stored yet, default new brands to Free
    const activePlanStored = localStorage.getItem("flubn_brand_active_plan");
    if (!activePlanStored) {
      saveBrandActivePlan("Free");
      setCurrentPlan("p1");
    } else {
      // Keep currentPlan in sync with stored plan name
      const nameToId: Record<string, string> = {
        Free: "p1", Basic: "p2", Pro: "p3", Enterprise: "p4",
      };
      const planId = nameToId[activePlanStored] || "p1";
      setCurrentPlan(planId);
    }

    const handlePricingUpdate = (event: any) => {
      const updatedPlans = event.detail || getPricingPlans();
      setAllPlans(updatedPlans);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "flubn_pricing_plans") {
        setAllPlans(getPricingPlans());
      }
    };

    window.addEventListener("pricingPlansUpdated", handlePricingUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("pricingPlansUpdated", handlePricingUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const activePlans = allPlans.filter((p) => p.status === "active" && p.name !== "Free");
  const currentPlanData = allPlans.find((p) => p.id === currentPlan);

  const getDisplayPrice = (plan: PricingPlan) => {
    if (billingCycle === "yearly" && plan.yearlyPrice) {
      return Math.round(plan.yearlyPrice / 12);
    }
    return plan.price;
  };

  const getYearlySavings = (plan: PricingPlan) => {
    if (plan.yearlyPrice) {
      return (plan.price * 12) - plan.yearlyPrice;
    }
    return 0;
  };

  const getPlanIcon = (name: string) => {
    switch (name) {
      case "Basic": return Rocket;
      case "Pro": return Zap;
      case "Enterprise": return Crown;
      default: return Star;
    }
  };

  // ── Coupon handlers ──
  const handleApplyCoupon = (plan: PricingPlan) => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    // Small delay for UX feedback
    setTimeout(() => {
      const chargeAmount = billingCycle === "yearly" && plan.yearlyPrice
        ? plan.yearlyPrice
        : plan.price;
      const result = validateCoupon(
        couponCode,
        plan.name,
        billingCycle,
        chargeAmount,
        user?.id || user?.email || "anonymous"
      );
      setCouponResult(result);
      setCouponLoading(false);
      if (result.valid) {
        toast.success(`Coupon applied! You save ₹${result.discount!.toLocaleString()}`);
      } else {
        toast.error(result.error || "Invalid coupon");
      }
    }, 600);
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponResult(null);
  };

  const resetCouponState = () => {
    setCouponCode("");
    setCouponResult(null);
    setCouponLoading(false);
  };

  // Get the effective charge amount (after coupon)
  const getEffectiveAmount = (plan: PricingPlan) => {
    const baseAmount = billingCycle === "yearly" && plan.yearlyPrice
      ? plan.yearlyPrice
      : plan.price;
    if (couponResult?.valid && couponResult.finalAmount !== undefined) {
      return couponResult.finalAmount;
    }
    return baseAmount;
  };

  const handleUpgrade = async (plan: PricingPlan) => {
    const razorpayConfig = getRazorpayConfig();

    if (!razorpayConfig) {
      toast.error("Payment gateway not configured", {
        description: "Please contact admin to enable Razorpay payments or enable Demo Mode.",
      });
      return;
    }

    const chargeAmount = getEffectiveAmount(plan);
    const couponSuffix = couponResult?.valid ? ` (Coupon: ${couponResult.coupon!.code})` : "";
    const description = `${plan.name} Plan - ${billingCycle === "yearly" ? "Yearly" : "Monthly"}${couponSuffix}`;

    // ── Demo Mode: open simulated checkout ──
    if (razorpayConfig.demoMode) {
      setDemoCheckoutStep("form");
      return;
    }

    // ── Real Razorpay checkout ──
    if (!razorpayReady) {
      toast.error("Payment gateway is loading. Please try again.");
      return;
    }

    setProcessing(true);
    setPaymentStatus("idle");

    const amountInPaise = chargeAmount * 100;
    const options = {
      key: razorpayConfig.razorpayKeyId,
      amount: amountInPaise,
      currency: "INR",
      name: "FLUBN",
      description,
      image: "",
      prefill: {
        name: user?.name || "Brand User",
        email: user?.email || "demo@flubn.com",
        contact: user?.phone || "",
      },
      theme: {
        color: "#2F6BFF",
        backdrop_color: "rgba(0,0,0,0.5)",
      },
      modal: {
        ondismiss: () => {
          setProcessing(false);
        },
      },
      handler: (response: any) => {
        completePayment(plan, chargeAmount, description, response.razorpay_payment_id, response.razorpay_order_id, "Razorpay");
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setProcessing(false);
        setPaymentStatus("failed");
        toast.error("Payment failed", {
          description: response.error?.description || "Something went wrong. Please try again.",
        });
      });
      rzp.open();
    } catch (err) {
      setProcessing(false);
      toast.error("Failed to open payment gateway. Please try again.");
    }
  };

  // ── Shared payment completion logic ──
  const completePayment = (plan: PricingPlan, chargeAmount: number, description: string, paymentId?: string, orderId?: string, method: string = "Razorpay") => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
    const invoiceNum = `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    const newTransaction: BillingItem = {
      id: `bh_${Date.now()}`,
      date: dateStr,
      description,
      amount: chargeAmount,
      status: "paid",
      invoice: invoiceNum,
      razorpayPaymentId: paymentId || `pay_demo_${Date.now().toString(36)}`,
      razorpayOrderId: orderId || "",
      method,
    };

    const updatedHistory = [newTransaction, ...billingHistory];
    setBillingHistory(updatedHistory);
    localStorage.setItem("flubn_billing_history", JSON.stringify(updatedHistory));
    // Sync billing to backend
    try {
      const userId = user?.id || "unknown";
      api.addBillingEntry(userId, newTransaction).catch(() => {});
    } catch { /* ignore */ }

    try {
      const payments = JSON.parse(localStorage.getItem("flubn_payments") || "[]");
      payments.unshift({
        ...newTransaction,
        brandName: user?.name || "Brand User",
        brandEmail: user?.email || "demo@flubn.com",
        planId: plan.id,
        planName: plan.name,
        billingCycle,
        paidAt: now.toISOString(),
      });
      localStorage.setItem("flubn_payments", JSON.stringify(payments));
      window.dispatchEvent(new CustomEvent("paymentReceived", { detail: payments }));
      // Sync payments to backend
      api.saveData("payments", payments).catch(() => {});
    } catch { /* ignore */ }

    setCurrentPlan(plan.id);
    setPaymentStatus("success");
    setProcessing(false);

    // Record coupon usage if one was applied
    if (couponResult?.valid && couponResult.coupon) {
      recordCouponUsage(couponResult.coupon.id, user?.id || user?.email || "anonymous");
    }

    // Persist the new active plan for chat subscription gating
    saveBrandActivePlan(plan.name as PlanName);

    const isUpgrade = plan.price > (currentPlanData?.price || 0);
    toast.success(
      isUpgrade ? `Upgraded to ${plan.name}!` : `Switched to ${plan.name}!`,
      {
        description: `Payment of ₹${chargeAmount.toLocaleString()} successful${method === "Demo" ? " (Demo Mode)" : " via Razorpay"}.`,
      }
    );

    setTimeout(() => {
      generateReceipt(newTransaction);
      setUpgradeModalPlan(null);
      setPaymentStatus("idle");
      setDemoCheckoutStep("idle");
      resetCouponState();
    }, 1500);
  };

  // ── Demo checkout simulation ──
  const handleDemoPayment = (plan: PricingPlan) => {
    setDemoCheckoutStep("processing");
    setProcessing(true);

    const chargeAmount = getEffectiveAmount(plan);
    const couponSuffix = couponResult?.valid ? ` (Coupon: ${couponResult.coupon!.code})` : "";
    const description = `${plan.name} Plan - ${billingCycle === "yearly" ? "Yearly" : "Monthly"}${couponSuffix}`;

    setTimeout(() => {
      setDemoCheckoutStep("success");
      completePayment(plan, chargeAmount, description, `pay_demo_${Date.now().toString(36)}`, `order_demo_${Date.now().toString(36)}`, "Demo");
    }, 2500);
  };

  const daysUntilRenewal = (() => {
    const lastPaid = billingHistory
      .filter((b) => b.status === "paid")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (!lastPaid) return 30;
    const nextBilling = new Date(new Date(lastPaid.date).getTime() + 30 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil((nextBilling.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  })();
  const renewalDate = (() => {
    const lastPaid = billingHistory
      .filter((b) => b.status === "paid")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (!lastPaid) return "—";
    const nextBilling = new Date(new Date(lastPaid.date).getTime() + 30 * 24 * 60 * 60 * 1000);
    return nextBilling.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Subscription & Pricing</h1>
        <p className="text-[#64748b] text-sm mt-1">
          Manage your plan, billing cycle, and payment details.
        </p>
      </div>

      {/* Current Plan Hero Card */}
      {currentPlanData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
        >
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
                    <Crown size={20} />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs uppercase tracking-wider">Current Plan</p>
                    <h2 className="text-xl text-white">{currentPlanData.name} Plan</h2>
                  </div>
                </div>
                <p className="text-white/70 text-sm max-w-md mt-2">
                  {currentPlanData.description}.{" "}
                  {currentPlanData.price === 0
                    ? "Upgrade to a paid plan to unlock messaging, campaigns, and more."
                    : `You have access to ${currentPlanData.collaborationLimit || "unlimited"} collaboration requests per month.`}
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-3">
                <div className="text-right">
                  {currentPlanData.price === 0 ? (
                    <p className="text-3xl text-white">Free</p>
                  ) : (
                    <>
                      <p className="text-3xl text-white">
                        ₹{currentPlanData.price.toLocaleString()}
                        <span className="text-lg text-white/50">/mo</span>
                      </p>
                      {currentPlanData.yearlyPrice && (
                        <p className="text-xs text-white/50 mt-0.5">
                          or ₹{Math.round(currentPlanData.yearlyPrice / 12).toLocaleString()}/mo billed yearly
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="text-xs text-white/90">Active</span>
                  </div>
                  {currentPlanData.price > 0 && renewalDate !== "—" && (
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                      <Clock size={12} className="text-white/60" />
                      <span className="text-xs text-white/80">{daysUntilRenewal} days until renewal</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Usage bar */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/50">Requests Used</span>
                    <span className={`text-xs ${getMonthlyCollabCount() > (currentPlanData.collaborationLimit || Infinity) ? 'text-[#fbbf24] font-medium' : 'text-white/80'}`}>
                      {getMonthlyCollabCount()}/{currentPlanData.collaborationLimit || "∞"}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getMonthlyCollabCount() > (currentPlanData.collaborationLimit || Infinity) ? 'bg-[#fbbf24]/80' : 'bg-white/80'}`}
                      style={{ width: `${Math.min((getMonthlyCollabCount() / (currentPlanData.collaborationLimit || 100)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/50">Next Billing</span>
                    <span className="text-xs text-white/80">{renewalDate}</span>
                  </div>
                  {renewalDate !== "—" ? (
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#10b981]/80 transition-all" style={{ width: `${((30 - daysUntilRenewal) / 30) * 100}%` }} />
                    </div>
                  ) : (
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-white/20" style={{ width: '0%' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Billing Cycle Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-5"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-[#1a1a2e]">Billing Cycle</h3>
            <p className="text-sm text-[#64748b] mt-0.5">
              Switch to yearly and save up to 20% on all plans.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-xl">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2.5 rounded-[10px] text-sm transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-[#1a1a2e] shadow-sm"
                  : "text-[#64748b] hover:text-[#1a1a2e]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2.5 rounded-[10px] text-sm transition-all flex items-center gap-2 ${
                billingCycle === "yearly"
                  ? "bg-white text-[#1a1a2e] shadow-sm"
                  : "text-[#64748b] hover:text-[#1a1a2e]"
              }`}
            >
              Yearly
              <span className="text-[10px] bg-[#ecfdf5] text-[#10b981] px-2 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {activePlans.map((plan, index) => {
          const isCurrentPlan = currentPlan === plan.id;
          const isPopular = plan.popular;
          const isUpgrade = plan.price > (currentPlanData?.price || 0);
          const isDowngrade = plan.price < (currentPlanData?.price || 0);
          const PlanIcon = getPlanIcon(plan.name);
          const displayPrice = getDisplayPrice(plan);
          const savings = getYearlySavings(plan);

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.06 }}
              className={`relative bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-lg ${
                isCurrentPlan
                  ? "border-[#2F6BFF] shadow-[0_0_0_3px_rgba(47,107,255,0.1)]"
                  : isPopular
                  ? "border-[#fbbf24]/50"
                  : "border-[#e2e8f0] hover:border-[#2F6BFF]/30"
              }`}
            >
              {/* Badges */}
              {isPopular && !isCurrentPlan && (
                <div className="absolute -top-3 left-6">
                  <span className="bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] text-[#1a1a2e] text-[11px] px-3.5 py-1 rounded-full shadow-sm">
                    ⭐ Most Popular
                  </span>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-6">
                  <span className="bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] text-white text-[11px] px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <Check size={11} /> Current Plan
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-start justify-between mb-4 mt-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      isCurrentPlan
                        ? "text-white"
                        : "text-[#2F6BFF]"
                    }`}
                    style={
                      isCurrentPlan
                        ? { background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }
                        : { backgroundColor: "#EBF2FF" }
                    }
                  >
                    <PlanIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-[#1a1a2e] text-lg">{plan.name}</h3>
                    <p className="text-[11px] text-[#94a3b8]">{plan.description}</p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5 pb-5 border-b border-[#e2e8f0]">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl text-[#1a1a2e]">
                    ₹{displayPrice.toLocaleString()}
                  </span>
                  <span className="text-[#94a3b8] text-sm">
                    /{billingCycle === "yearly" ? "mo" : "month"}
                  </span>
                </div>
                {billingCycle === "yearly" && plan.yearlyPrice && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-[#94a3b8]">
                      Billed ₹{plan.yearlyPrice.toLocaleString()} annually
                    </p>
                    <div className="inline-flex items-center gap-1 text-xs text-[#10b981] bg-[#ecfdf5] px-2.5 py-1 rounded-full">
                      <Gift size={11} />
                      Save ₹{savings.toLocaleString()}/year
                    </div>
                  </div>
                )}
                {plan.collaborationLimit && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#2F6BFF] bg-[#EBF2FF] px-2.5 py-1 rounded-lg">
                    <MessageSquare size={11} />
                    {plan.collaborationLimit} requests/mo
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[#64748b]">
                    <div className="w-4.5 h-4.5 rounded-full bg-[#ecfdf5] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} className="text-[#10b981]" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Action button */}
              {isCurrentPlan ? (
                <div className="w-full py-3 rounded-xl bg-[#f1f5f9] text-[#94a3b8] text-sm text-center flex items-center justify-center gap-2">
                  <Shield size={14} />
                  Your active plan
                </div>
              ) : (
                <button
                  onClick={() => setUpgradeModalPlan(plan)}
                  className={`w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${
                    isUpgrade
                      ? "text-white hover:opacity-90 shadow-lg"
                      : "border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8f9fc] hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF]"
                  }`}
                  style={
                    isUpgrade
                      ? { background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }
                      : undefined
                  }
                >
                  {isUpgrade ? (
                    <>
                      <Zap size={14} />
                      Upgrade to {plan.name}
                    </>
                  ) : (
                    <>
                      <ArrowDown size={14} />
                      Switch to {plan.name}
                    </>
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Feature Comparison Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden"
      >
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full flex items-center justify-between p-5 hover:bg-[#f8f9fc] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#faf5ff] flex items-center justify-center">
              <Sparkles size={18} className="text-[#8b5cf6]" />
            </div>
            <div className="text-left">
              <h3 className="text-[#1a1a2e]">Compare All Plans</h3>
              <p className="text-sm text-[#64748b]">See a detailed feature comparison across all plans</p>
            </div>
          </div>
          {showComparison ? (
            <ChevronUp size={20} className="text-[#94a3b8]" />
          ) : (
            <ChevronDown size={20} className="text-[#94a3b8]" />
          )}
        </button>

        <AnimatePresence>
          {showComparison && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="border-t border-[#e2e8f0] overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-[#f8f9fc]">
                      <th className="text-left py-3.5 px-5 text-sm text-[#64748b]">Feature</th>
                      <th className="text-center py-3.5 px-4 text-sm text-[#64748b]">Free</th>
                      <th className="text-center py-3.5 px-4 text-sm text-[#64748b]">Basic</th>
                      <th className="text-center py-3.5 px-4 text-sm text-[#2F6BFF]">
                        <div className="flex items-center justify-center gap-1">
                          Pro
                          <Star size={12} className="text-[#fbbf24]" />
                        </div>
                      </th>
                      <th className="text-center py-3.5 px-4 text-sm text-[#64748b]">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_FEATURES.map((feature, i) => (
                      <tr key={i} className="border-t border-[#e2e8f0]/60 hover:bg-[#fafbfd] transition-colors">
                        <td className="py-3 px-5 text-sm text-[#1a1a2e]">{feature.name}</td>
                        {(["free", "basic", "pro", "enterprise"] as const).map((tier) => {
                          const val = feature[tier];
                          return (
                            <td key={tier} className="py-3 px-4 text-center">
                              {val === true ? (
                                <div className="flex justify-center">
                                  <div className="w-5 h-5 rounded-full bg-[#ecfdf5] flex items-center justify-center">
                                    <Check size={12} className="text-[#10b981]" />
                                  </div>
                                </div>
                              ) : val === false ? (
                                <div className="flex justify-center">
                                  <div className="w-5 h-5 rounded-full bg-[#f1f5f9] flex items-center justify-center">
                                    <X size={12} className="text-[#d1d5db]" />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-[#64748b]">{val}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Payment Method + Billing History Row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Payment Method */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-[#e2e8f0] p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
              <CreditCard size={18} className="text-[#2F6BFF]" />
            </div>
            <div>
              <h2 className="text-[#1a1a2e]">Payment Method</h2>
              <p className="text-sm text-[#64748b]">Manage your payment details</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Primary Card */}
            <div className="w-full flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-[#f8f9fc] rounded-xl border border-[#e2e8f0]/50">
              <div className="w-12 h-8 sm:w-14 sm:h-9 bg-gradient-to-r from-[#1a1a2e] to-[#2F6BFF] rounded-lg flex items-center justify-center text-white text-xs tracking-wider shrink-0">
                VISA
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1a1a2e]">•••• •••• •••• 4242</p>
                <p className="text-xs text-[#94a3b8]">Expires 12/2027</p>
              </div>
              <div className="flex items-center gap-1 bg-[#ecfdf5] text-[#10b981] px-2 py-0.5 rounded-full text-[10px] shrink-0">
                <Check size={10} /> Primary
              </div>
            </div>

            {/* UPI */}
            <div className="w-full flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-[#f8f9fc] rounded-xl border border-[#e2e8f0]/50">
              <div className="w-12 h-8 sm:w-14 sm:h-9 bg-[#5f259f] rounded-lg flex items-center justify-center text-white text-[10px] shrink-0">
                UPI
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1a1a2e]">brand@okicici</p>
                <p className="text-xs text-[#94a3b8]">Backup payment method</p>
              </div>
              <button className="text-xs text-[#64748b] hover:text-[#2F6BFF] transition-colors shrink-0">
                Set Primary
              </button>
            </div>
          </div>

          <button
            onClick={() => toast.info("Payment method management coming soon!")}
            className="mt-4 flex items-center gap-2 text-sm text-[#2F6BFF] hover:underline"
          >
            <CreditCard size={14} />
            Add new payment method
          </button>
        </motion.div>

        {/* Billing History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-[#e2e8f0] p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] flex items-center justify-center">
                <Receipt size={18} className="text-[#10b981]" />
              </div>
              <div>
                <h2 className="text-[#1a1a2e]">Billing History</h2>
                <p className="text-sm text-[#64748b]">Recent transactions</p>
              </div>
            </div>
            <button
              onClick={() => setShowBillingHistory(!showBillingHistory)}
              className="text-xs text-[#2F6BFF] hover:underline"
            >
              {showBillingHistory ? "Show Less" : "View All"}
            </button>
          </div>

          <div className="space-y-2">
            {billingHistory.slice(0, showBillingHistory ? undefined : 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[#f8f9fc] transition-colors -mx-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center">
                    <Receipt size={14} className="text-[#64748b]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#1a1a2e]">{item.description}</p>
                    <p className="text-xs text-[#94a3b8]">{item.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#1a1a2e]">₹{item.amount.toLocaleString()}</span>
                  <button
                    onClick={() => {
                      generateReceipt(item);
                      toast.success(`Receipt downloaded!`);
                    }}
                    className="p-1.5 text-[#94a3b8] hover:text-[#2F6BFF] hover:bg-[#EBF2FF] rounded-lg transition-all"
                    title="Download Receipt"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total spent */}
          <div className="mt-4 pt-4 border-t border-[#e2e8f0] flex items-center justify-between">
            <span className="text-sm text-[#64748b]">Total spent (last 5 months)</span>
            <span className="text-[#1a1a2e]">
              ₹{billingHistory.reduce((sum, b) => sum + b.amount, 0).toLocaleString()}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Yearly Savings CTA */}
      {billingCycle === "monthly" && currentPlanData && currentPlanData.yearlyPrice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-r from-[#ecfdf5] to-[#f0fdf4] border border-[#10b981]/20 rounded-xl p-5"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#10b981]/10 flex items-center justify-center shrink-0">
                <TrendingUp size={20} className="text-[#10b981]" />
              </div>
              <div>
                <h3 className="text-[#1a1a2e] text-sm">Save ₹{getYearlySavings(currentPlanData).toLocaleString()} by switching to yearly billing!</h3>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Get the same {currentPlanData.name} plan features at ₹{Math.round(currentPlanData.yearlyPrice / 12).toLocaleString()}/mo instead of ₹{currentPlanData.price.toLocaleString()}/mo.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setBillingCycle("yearly");
                toast.success("Switched to yearly view!", { description: "Review the savings and click upgrade to switch." });
              }}
              className="px-5 py-2.5 bg-[#10b981] text-white rounded-xl text-sm hover:bg-[#059669] transition-colors flex items-center gap-2 shrink-0"
            >
              <Gift size={14} />
              Switch to Yearly
            </button>
          </div>
        </motion.div>
      )}

      {/* Help Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-5"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fffbeb] flex items-center justify-center">
              <Users size={18} className="text-[#f59e0b]" />
            </div>
            <div>
              <h3 className="text-[#1a1a2e] text-sm">Need a custom plan?</h3>
              <p className="text-xs text-[#64748b]">Contact our team for enterprise-level features and custom pricing tailored to your business.</p>
            </div>
          </div>
          {salesInquirySent ? (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-[#ecfdf5] text-[#10b981] rounded-xl text-sm shrink-0">
              <Check size={14} />
              Inquiry Sent
            </div>
          ) : (
            <button
              onClick={() => {
                const inquiry = {
                  id: `si_${Date.now()}`,
                  brandName: user?.name || "Brand Account",
                  companyName: user?.companyName || "N/A",
                  email: user?.email || "demo@flubn.com",
                  phone: user?.phone || "N/A",
                  industry: user?.industry || "N/A",
                  currentPlan: currentPlanData?.name || "Basic",
                  currentPlanPrice: currentPlanData?.price || 0,
                  message: "Interested in a custom enterprise plan with tailored features.",
                  status: "new" as const,
                  submittedAt: new Date().toISOString(),
                  profilePicture: user?.profilePicture || "",
                };
                try {
                  const existing = JSON.parse(localStorage.getItem("flubn_sales_inquiries") || "[]");
                  existing.unshift(inquiry);
                  localStorage.setItem("flubn_sales_inquiries", JSON.stringify(existing));
                  // Dispatch event for same-tab admin panel updates
                  window.dispatchEvent(new CustomEvent("salesInquiryUpdated", { detail: existing }));
                  setSalesInquirySent(true);
                  toast.success("Sales inquiry submitted!", {
                    description: "Our team will review your account and reach out within 24 hours.",
                  });
                } catch {
                  toast.error("Failed to submit inquiry. Please try again.");
                }
              }}
              className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] rounded-xl text-sm hover:bg-[#f8f9fc] hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF] transition-all flex items-center gap-2 shrink-0"
            >
              <Send size={14} />
              Contact Sales
            </button>
          )}
        </div>
      </motion.div>

      {/* Upgrade/Downgrade Confirmation Modal */}
      <AnimatePresence>
        {upgradeModalPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl w-full max-w-[480px] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div
                className="p-6 text-white relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                        {upgradeModalPlan.price > (currentPlanData?.price || 0) ? (
                          <Zap size={18} />
                        ) : (
                          <ArrowDown size={18} />
                        )}
                      </div>
                      <span className="text-lg text-white">
                        {upgradeModalPlan.price > (currentPlanData?.price || 0) ? "Upgrade" : "Switch"} Plan
                      </span>
                    </div>
                    {!processing && (
                      <button
                        onClick={() => { setUpgradeModalPlan(null); resetCouponState(); }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                  <p className="text-white/70 text-sm">
                    {upgradeModalPlan.price > (currentPlanData?.price || 0)
                      ? `Upgrading from ${currentPlanData?.name} to ${upgradeModalPlan.name}`
                      : `Switching from ${currentPlanData?.name} to ${upgradeModalPlan.name}`}
                  </p>
                </div>
              </div>

              {/* Modal body */}
              <div className="flex flex-col max-h-[70vh]">
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Price comparison */}
                  <div className="bg-[#f8f9fc] rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-center">
                        <div className="w-10 h-10 mx-auto mb-2.5 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center">
                          <ArrowDown size={16} className="text-[#94a3b8]" />
                        </div>
                        <p className="text-[11px] text-[#94a3b8] uppercase tracking-wide mb-1">Current</p>
                        <p className="text-xl text-[#94a3b8] line-through decoration-[#d1d5db]">
                          ₹{(currentPlanData?.price || 0).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-[#94a3b8] mt-0.5">{currentPlanData?.name}/mo</p>
                      </div>

                      <div className="flex flex-col items-center gap-1 px-4">
                        <div className="w-8 h-8 rounded-full bg-white border border-[#e2e8f0] flex items-center justify-center shadow-sm">
                          <ArrowRight size={14} className="text-[#2F6BFF]" />
                        </div>
                      </div>

                      <div className="flex-1 text-center">
                        <div className="w-10 h-10 mx-auto mb-2.5 rounded-xl flex items-center justify-center text-white"
                          style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
                        >
                          <Zap size={16} />
                        </div>
                        <p className="text-[11px] text-[#2F6BFF] uppercase tracking-wide mb-1">New Plan</p>
                        <p className="text-xl text-[#1a1a2e]">
                          ₹{getDisplayPrice(upgradeModalPlan).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-[#94a3b8] mt-0.5">
                          {upgradeModalPlan.name}/{billingCycle === "yearly" ? "mo (yearly)" : "mo"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Features + Collaboration in a compact layout */}
                  <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#e2e8f0]/60 bg-[#fafbfd]">
                      <p className="text-xs text-[#64748b]">What you&apos;ll get with <span className="text-[#1a1a2e]">{upgradeModalPlan.name}</span></p>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 gap-2.5">
                        {upgradeModalPlan.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#ecfdf5] to-[#d1fae5] border border-[#a7f3d0]/50 flex items-center justify-center shrink-0 mt-px shadow-sm">
                              <Check size={10} className="text-[#10b981]" strokeWidth={2.5} />
                            </div>
                            <span className="text-[13px] text-[#374151] leading-snug">{feature}</span>
                          </div>
                        ))}
                      </div>
                      {upgradeModalPlan.collaborationLimit && (
                        <div className="mt-4 pt-3.5 border-t border-[#e2e8f0]/80 flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#EBF2FF] to-[#c7dbff] border border-[#c7dbff]/60 flex items-center justify-center shrink-0 shadow-sm">
                            <MessageSquare size={9} className="text-[#2F6BFF]" />
                          </div>
                          <span className="text-[13px] text-[#2F6BFF]">
                            <span className="font-semibold">{upgradeModalPlan.collaborationLimit}</span> collaboration requests/mo
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coupon Code Input */}
                  <div className="rounded-2xl border border-[#e2e8f0] overflow-hidden bg-gradient-to-b from-white to-[#fafbfd]">
                    <div className="px-4 py-3 border-b border-[#e2e8f0]/60 bg-[#fafbfd] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#EBF2FF] flex items-center justify-center">
                          <Ticket size={12} className="text-[#2F6BFF]" />
                        </div>
                        <p className="text-xs font-medium text-[#374151]">Coupon Code</p>
                      </div>
                      {couponResult?.valid && (
                        <span className="text-[10px] font-medium bg-[#ecfdf5] text-[#10b981] px-2 py-0.5 rounded-full">Applied</span>
                      )}
                    </div>
                    <div className="p-4">
                      {couponResult?.valid ? (
                        <div className="relative rounded-xl overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-[#ecfdf5] to-[#d1fae5]/30" />
                          <div className="relative flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#10b981] flex items-center justify-center shadow-sm shadow-[#10b981]/20">
                                <Check size={16} className="text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-[#065f46] font-semibold font-mono tracking-wider">
                                  {couponResult.coupon!.code}
                                </p>
                                <p className="text-[11px] text-[#10b981] mt-0.5">
                                  Saving ₹{couponResult.discount!.toLocaleString()}
                                  {couponResult.coupon!.discountType === "percentage" && (
                                    <span className="text-[#6ee7b7] ml-1">({couponResult.coupon!.discountValue}% off)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <button onClick={handleRemoveCoupon} className="p-2 text-[#94a3b8] hover:text-[#ef4444] hover:bg-white/80 rounded-lg transition-all" title="Remove coupon">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (couponResult) setCouponResult(null); }}
                              placeholder="Enter code e.g. WELCOME20"
                              maxLength={20}
                              className="flex-1 px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
                              onKeyDown={(e) => { if (e.key === "Enter" && couponCode.trim()) handleApplyCoupon(upgradeModalPlan); }}
                            />
                            <button
                              onClick={() => handleApplyCoupon(upgradeModalPlan)}
                              disabled={!couponCode.trim() || couponLoading}
                              className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 hover:shadow-lg hover:shadow-[#2F6BFF]/15 active:scale-[0.97]"
                              style={{ background: couponCode.trim() ? "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" : "#cbd5e1" }}
                            >
                              {couponLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                              Apply
                            </button>
                          </div>
                          {couponResult && !couponResult.valid && (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-3 py-2 bg-[#fef2f2] rounded-lg border border-[#fecaca]/50">
                              <XCircle size={12} className="text-[#ef4444] shrink-0" />
                              <p className="text-[11px] text-[#991b1b]">{couponResult.error}</p>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {couponResult?.valid && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 pt-3 border-t border-[#10b981]/10 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#64748b]">Original price</span>
                            <span className="text-[#94a3b8] line-through decoration-[#d1d5db]">
                              ₹{(billingCycle === "yearly" && upgradeModalPlan.yearlyPrice ? upgradeModalPlan.yearlyPrice : upgradeModalPlan.price).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#10b981] flex items-center gap-1"><Ticket size={10} /> Coupon discount</span>
                            <span className="text-[#10b981] font-medium">- ₹{couponResult.discount!.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-[#e2e8f0]/50">
                            <span className="text-sm font-medium text-[#1a1a2e]">Total</span>
                            <span className="text-lg font-bold text-[#1a1a2e]">₹{couponResult.finalAmount!.toLocaleString()}</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Gateway status + Info combined */}
                  {(() => {
                    const rzpConfig = getRazorpayConfig();
                    const isConfigured = !!rzpConfig;
                    const isDemoMode = rzpConfig?.demoMode;
                    return (
                      <div className={`rounded-xl overflow-hidden border ${
                        isConfigured
                          ? isDemoMode
                            ? "border-[#f59e0b]/25"
                            : "border-[#10b981]/20"
                          : "border-[#ef4444]/20"
                      }`}>
                        <div className={`flex items-center gap-2.5 px-4 py-2.5 ${
                          isConfigured
                            ? isDemoMode
                              ? "bg-[#fffbeb]"
                              : "bg-[#ecfdf5]"
                            : "bg-[#fef2f2]"
                        }`}>
                          {isConfigured ? (
                            <>
                              {isDemoMode ? (
                                <Monitor size={14} className="text-[#f59e0b] shrink-0" />
                              ) : (
                                <ShieldCheck size={14} className="text-[#10b981] shrink-0" />
                              )}
                              <p className={`text-xs flex-1 ${isDemoMode ? "text-[#92400e]" : "text-[#065f46]"}`}>
                                {isDemoMode ? "Demo Mode — No real charges" : "Razorpay gateway active"}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  isDemoMode
                                    ? "bg-[#f59e0b]/15 text-[#b45309]"
                                    : "bg-[#10b981]/15 text-[#047857]"
                                }`}>
                                  {isDemoMode
                                    ? "Simulated"
                                    : rzpConfig!.razorpayKeyId.startsWith("rzp_test_") ? "Test" : "Live"
                                  }
                                </span>
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${isDemoMode ? "bg-[#f59e0b]" : "bg-[#10b981]"}`} />
                              </div>
                            </>
                          ) : (
                            <>
                              <XCircle size={14} className="text-[#ef4444] shrink-0" />
                              <p className="text-xs text-[#991b1b] flex-1">
                                Payment gateway not configured
                              </p>
                            </>
                          )}
                        </div>
                        <div className="px-4 py-2.5 bg-[#fafbfd] border-t border-[#e2e8f0]/40">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={12} className="text-[#94a3b8] mt-0.5 shrink-0" />
                            <p className="text-[11px] text-[#64748b]">
                              {!isConfigured
                                ? "Admin needs to configure Razorpay in Payment Gateway Settings."
                                : upgradeModalPlan.price > (currentPlanData?.price || 0)
                                  ? isDemoMode
                                    ? "This is a simulated payment. Your plan will update immediately."
                                    : "You'll be charged immediately. Your new plan starts right away."
                                  : "Current plan continues until billing cycle ends. New plan starts on next billing date."
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Demo Checkout Form */}
                  <AnimatePresence>
                    {demoCheckoutStep !== "idle" && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="rounded-2xl overflow-hidden bg-gradient-to-b from-[#fffdf5] to-white border border-[#f59e0b]/20 shadow-[0_2px_12px_rgba(245,158,11,0.08)]"
                      >
                        {/* Header */}
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
                              <CreditCard size={13} className="text-[#f59e0b]" />
                            </div>
                            <span className="text-[13px] text-[#92400e]">Payment Details</span>
                          </div>
                          <span className="text-[10px] bg-[#f59e0b]/10 text-[#b45309] px-2.5 py-1 rounded-full border border-[#f59e0b]/15">
                            Demo Mode
                          </span>
                        </div>

                        <div className="px-4 pb-4">
                          {demoCheckoutStep === "form" && (
                            <div className="space-y-3">
                              {/* Card visual preview */}
                              <div className="relative h-[100px] rounded-xl overflow-hidden p-4 text-white"
                                style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2F6BFF 100%)" }}
                              >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                                <div className="relative z-10 h-full flex flex-col justify-between">
                                  <div className="flex items-center justify-between">
                                    <div className="w-8 h-5 bg-[#fbbf24] rounded-[3px]" />
                                    <span className="text-[10px] text-white/50 tracking-widest">VISA</span>
                                  </div>
                                  <div>
                                    <p className="text-[13px] tracking-[3px] text-white/90">{demoCardNumber}</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[9px] text-white/40 uppercase">{user?.name || "Card Holder"}</span>
                                      <span className="text-[10px] text-white/50">{demoExpiry}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Input fields */}
                              <div>
                                <label className="text-[11px] text-[#64748b] mb-1 block">Card Number</label>
                                <input
                                  type="text"
                                  value={demoCardNumber}
                                  onChange={(e) => setDemoCardNumber(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/20 focus:border-[#f59e0b] transition-all"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <label className="text-[11px] text-[#64748b] mb-1 block">Expiry Date</label>
                                  <input
                                    type="text"
                                    value={demoExpiry}
                                    onChange={(e) => setDemoExpiry(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/20 focus:border-[#f59e0b] transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] text-[#64748b] mb-1 block">CVV</label>
                                  <div className="relative">
                                    <input
                                      type="password"
                                      value={demoCvv}
                                      onChange={(e) => setDemoCvv(e.target.value)}
                                      className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/20 focus:border-[#f59e0b] pr-8 transition-all"
                                    />
                                    <Lock size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#c4b5a0]" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <Lock size={9} className="text-[#c4b5a0]" />
                                <span className="text-[10px] text-[#94a3b8]">Simulated payment — no real transaction will occur</span>
                              </div>
                            </div>
                          )}

                          {demoCheckoutStep === "processing" && (
                            <div className="flex flex-col items-center justify-center py-10 gap-4">
                              <div className="relative">
                                <div className="w-14 h-14 rounded-full border-[3px] border-[#e2e8f0]" />
                                <div className="absolute inset-0 w-14 h-14 rounded-full border-[3px] border-transparent border-t-[#2F6BFF] animate-spin" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-[#1a1a2e]">Processing payment...</p>
                                <p className="text-xs text-[#94a3b8] mt-1">Verifying card details securely</p>
                              </div>
                            </div>
                          )}

                          {demoCheckoutStep === "success" && (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                className="w-16 h-16 rounded-full bg-[#ecfdf5] flex items-center justify-center"
                              >
                                <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center">
                                  <Check size={20} className="text-white" />
                                </div>
                              </motion.div>
                              <div className="text-center">
                                <p className="text-sm text-[#10b981]">Payment Successful!</p>
                                <p className="text-xs text-[#94a3b8] mt-1">Generating your receipt...</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Payment failed banner */}
                  {paymentStatus === "failed" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2.5 p-3 bg-[#fef2f2] rounded-xl border border-[#ef4444]/20"
                    >
                      <XCircle size={14} className="text-[#ef4444] shrink-0" />
                      <p className="text-xs text-[#991b1b]">
                        Payment failed. Please try again.
                      </p>
                    </motion.div>
                  )}

                  {/* Payment success banner (non-demo) */}
                  {paymentStatus === "success" && demoCheckoutStep === "idle" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2.5 p-3 bg-[#ecfdf5] rounded-xl border border-[#10b981]/20"
                    >
                      <ShieldCheck size={14} className="text-[#10b981] shrink-0" />
                      <p className="text-xs text-[#065f46]">
                        Payment successful! Downloading receipt...
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Sticky action bar */}
                <div className="p-5 pt-4 border-t border-[#e2e8f0] bg-white rounded-b-2xl flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (!processing) {
                        setUpgradeModalPlan(null);
                        setPaymentStatus("idle");
                        setDemoCheckoutStep("idle");
                        resetCouponState();
                      }
                    }}
                    disabled={processing}
                    className="flex-1 py-3 rounded-xl border border-[#e2e8f0] text-[#64748b] text-sm hover:bg-[#f8f9fc] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {demoCheckoutStep === "form" ? (
                    <button
                      onClick={() => handleDemoPayment(upgradeModalPlan)}
                      disabled={processing || paymentStatus === "success"}
                      className="flex-1 py-3 rounded-xl text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 hover:shadow-lg hover:shadow-[#f59e0b]/20"
                      style={{ background: "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fbbf24 100%)" }}
                    >
                      <IndianRupee size={14} />
                      Pay ₹{getEffectiveAmount(upgradeModalPlan).toLocaleString()} (Demo)
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(upgradeModalPlan)}
                      disabled={processing || paymentStatus === "success" || demoCheckoutStep !== "idle"}
                      className="flex-1 py-3.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-70 hover:shadow-lg hover:shadow-[#2F6BFF]/20 active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
                    >
                      {processing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing…
                        </>
                      ) : paymentStatus === "success" ? (
                        <>
                          <Check size={15} />
                          Payment Successful
                        </>
                      ) : (
                        <>
                          Pay ₹{getEffectiveAmount(upgradeModalPlan).toLocaleString()}
                          {getRazorpayConfig()?.demoMode && (
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full ml-0.5">Demo</span>
                          )}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}