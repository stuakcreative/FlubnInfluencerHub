/**
 * 🛠️ FLUBN Dev Tools — Plan Switcher & Usage Inspector
 * ⚠️ REMOVE BEFORE PRODUCTION
 *
 * Floating panel for quickly switching subscription plans,
 * viewing/resetting usage counters, and inspecting plan limits.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wrench,
  X,
  Crown,
  Zap,
  Rocket,
  Building2,
  Search,
  Users,
  Target,
  BarChart3,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Check,
  FileText,
  Layers,
  Lightbulb,
} from "lucide-react";
import {
  getPlanLimits,
  getMonthlyCollabCount,
  getActiveCampaignCount,
  formatLimit,
  remainingCollabRequests,
  remainingCampaignSlots,
} from "../utils/planLimits";
import { getTemplateCount, getTemplateLimit } from "../utils/campaignTemplates";
import { copyToClipboard } from "../utils/clipboard";
import type { PlanName } from "../utils/brandSubscription";

// ── Plan Config ──────────────────────────────────────────────────────────────

const PLANS: { name: PlanName; icon: typeof Crown; color: string; bg: string; border: string }[] = [
  { name: "Free", icon: Zap, color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30" },
  { name: "Basic", icon: Rocket, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  { name: "Pro", icon: Crown, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  { name: "Enterprise", icon: Building2, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
];

// ── Component ────────────────────────────────────────────────────────────────

export function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<PlanName>("Free");
  const [limits, setLimits] = useState(getPlanLimits());
  const [showUsage, setShowUsage] = useState(true);
  const [showLimits, setShowLimits] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  // Read current plan on mount & listen for changes
  const refreshState = useCallback(() => {
    const plan = (localStorage.getItem("flubn_brand_active_plan") as PlanName) || "Free";
    setActivePlan(plan);
    setLimits(getPlanLimits());
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 2000); // Auto-refresh every 2s
    window.addEventListener("flubn:plan-changed", refreshState);
    window.addEventListener("storage", refreshState);
    return () => {
      clearInterval(interval);
      window.removeEventListener("flubn:plan-changed", refreshState);
      window.removeEventListener("storage", refreshState);
    };
  }, [refreshState]);

  // Switch plan
  const switchPlan = (plan: PlanName) => {
    localStorage.setItem("flubn_brand_active_plan", plan);
    window.dispatchEvent(new CustomEvent("flubn:plan-changed", { detail: { plan } }));
    setActivePlan(plan);
    setLimits(getPlanLimits());
    setTick((t) => t + 1);
  };

  // Reset usage counters
  const resetCollabs = () => {
    const now = new Date();
    localStorage.removeItem(`flubn_collab_count_${now.getFullYear()}-${now.getMonth()}`);
    refreshState();
  };

  const resetAllUsage = () => {
    resetCollabs();
  };

  // Copy debug snapshot to clipboard
  const copySnapshot = () => {
    const snapshot = {
      activePlan,
      limits,
      usage: {
        collabsThisMonth: getMonthlyCollabCount(),
        activeCampaigns: getActiveCampaignCount(),
      },
      remaining: {
        collabs: remainingCollabRequests(),
        campaigns: remainingCampaignSlots(),
      },
      timestamp: new Date().toISOString(),
    };
    copyToClipboard(JSON.stringify(snapshot, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get relevant localStorage keys
  const getFlubnKeys = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("flubn_")) keys.push(key);
    }
    return keys.sort();
  };

  const currentPlanConfig = PLANS.find((p) => p.name === activePlan) || PLANS[0];

  return (
    <>
      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-16 left-4 z-[9999] w-80 max-h-[80vh] overflow-y-auto
              bg-gray-950/95 backdrop-blur-2xl rounded-2xl border border-gray-800/60 
              shadow-2xl shadow-black/40"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-950/95 backdrop-blur-2xl px-4 py-3 border-b border-gray-800/40 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Wrench size={12} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-wide">FLUBN DEV TOOLS</h3>
                    <p className="text-[10px] text-gray-500">Remove before production</p>
                  </div>
                </div>
                <button
                  onClick={copySnapshot}
                  className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 
                    transition-colors px-2 py-1 rounded-md hover:bg-gray-800/50"
                  title="Copy debug snapshot"
                >
                  {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                  {copied ? "Copied!" : "Snapshot"}
                </button>
              </div>
            </div>

            <div className="p-3 space-y-3">
              {/* ── Plan Switcher ──────────────────────────────────── */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">
                  Active Plan
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PLANS.map((plan) => {
                    const Icon = plan.icon;
                    const isActive = activePlan === plan.name;
                    return (
                      <motion.button
                        key={plan.name}
                        onClick={() => switchPlan(plan.name)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all duration-200
                          ${isActive
                            ? `${plan.bg} ${plan.border} ${plan.color} shadow-lg`
                            : "bg-gray-900/50 border-gray-800/40 text-gray-600 hover:text-gray-400 hover:border-gray-700/50"
                          }`}
                      >
                        <Icon size={16} />
                        <span className="text-[10px] font-bold">{plan.name}</span>
                        {isActive && (
                          <motion.div
                            layoutId="active-plan-dot"
                            className={`w-1.5 h-1.5 rounded-full ${plan.color.replace("text-", "bg-")}`}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* ── Usage Counters ────────────────────────────────── */}
              <div>
                <button
                  onClick={() => setShowUsage(!showUsage)}
                  className="flex items-center justify-between w-full text-[10px] font-semibold text-gray-500 
                    uppercase tracking-widest mb-2 hover:text-gray-400 transition-colors"
                >
                  <span>Usage Counters</span>
                  {showUsage ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
                <AnimatePresence>
                  {showUsage && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-1.5"
                    >
                      <UsageRow
                        icon={Users}
                        label="Collabs (Month)"
                        used={getMonthlyCollabCount()}
                        limit={limits.collabRequestsPerMonth}
                        remaining={remainingCollabRequests()}
                        onReset={resetCollabs}
                        color="green"
                        tick={tick}
                      />
                      <UsageRow
                        icon={Target}
                        label="Active Campaigns"
                        used={getActiveCampaignCount()}
                        limit={limits.activeCampaigns}
                        remaining={remainingCampaignSlots()}
                        color="purple"
                        tick={tick}
                      />
                      <UsageRow
                        icon={BarChart3}
                        label="Analytics Level"
                        value={limits.analyticsLevel}
                        color="amber"
                        tick={tick}
                      />

                      <UsageRow
                        icon={FileText}
                        label="Templates"
                        used={getTemplateCount()}
                        limit={limits.campaignTemplates}
                        color="blue"
                        tick={tick}
                      />
                      <UsageRow
                        icon={Layers}
                        label="Bulk Actions"
                        value={limits.bulkActions ? "Enabled" : "Locked"}
                        color="purple"
                        tick={tick}
                      />
                      <UsageRow
                        icon={Lightbulb}
                        label="Suggestions"
                        value={limits.suggestedInfluencers ? "Enabled" : "Locked"}
                        color="amber"
                        tick={tick}
                      />

                      <button
                        onClick={resetAllUsage}
                        className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold 
                          text-red-400/70 hover:text-red-400 py-1.5 rounded-lg border border-red-500/10 
                          hover:border-red-500/30 hover:bg-red-500/5 transition-all mt-1"
                      >
                        <RotateCcw size={10} />
                        Reset All Usage Counters
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Plan Limits Detail ────────────────────────────── */}
              <div>
                <button
                  onClick={() => setShowLimits(!showLimits)}
                  className="flex items-center justify-between w-full text-[10px] font-semibold text-gray-500 
                    uppercase tracking-widest mb-2 hover:text-gray-400 transition-colors"
                >
                  <span>Resolved Limits</span>
                  {showLimits ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
                <AnimatePresence>
                  {showLimits && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-gray-900/50 rounded-xl border border-gray-800/30 p-3 text-[11px] font-mono space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">planName</span>
                          <span className={currentPlanConfig.color}>{limits.planName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">activeCampaigns</span>
                          <span className="text-gray-300">{formatLimit(limits.activeCampaigns)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">collabsPerMonth</span>
                          <span className="text-gray-300">{formatLimit(limits.collabRequestsPerMonth)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">analyticsLevel</span>
                          <span className="text-gray-300">{limits.analyticsLevel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">templates</span>
                          <span className="text-gray-300">{formatLimit(limits.campaignTemplates)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">bulkActions</span>
                          <span className="text-gray-300">{limits.bulkActions ? "true" : "false"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">suggestions</span>
                          <span className="text-gray-300">{limits.suggestedInfluencers ? "true" : "false"}</span>
                        </div>
                        <div className="border-t border-gray-800/30 pt-1 mt-1">
                          <span className="text-[9px] text-gray-600">
                            Source: {localStorage.getItem("flubn_pricing_plans") ? "Admin Override" : "Fallback Defaults"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Storage Inspector ──────────────────────────────── */}
              <div>
                <button
                  onClick={() => setShowStorage(!showStorage)}
                  className="flex items-center justify-between w-full text-[10px] font-semibold text-gray-500 
                    uppercase tracking-widest mb-2 hover:text-gray-400 transition-colors"
                >
                  <span>LocalStorage Keys ({getFlubnKeys().length})</span>
                  {showStorage ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
                <AnimatePresence>
                  {showStorage && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-gray-900/50 rounded-xl border border-gray-800/30 p-2 max-h-40 overflow-y-auto space-y-0.5">
                        {getFlubnKeys().map((key) => {
                          const val = localStorage.getItem(key) || "";
                          const isJSON = val.startsWith("{") || val.startsWith("[");
                          const preview = val.length > 50 ? val.slice(0, 50) + "…" : val;
                          return (
                            <div
                              key={key}
                              className="flex items-start gap-2 text-[10px] py-1 px-1.5 rounded hover:bg-gray-800/30 group"
                            >
                              <span className="text-blue-400/80 font-medium shrink-0">
                                {key.replace("flubn_", "")}
                              </span>
                              <span className={`text-gray-600 truncate ${isJSON ? "italic" : ""}`} title={val}>
                                {isJSON ? `{…} ${val.length}b` : preview}
                              </span>
                            </div>
                          );
                        })}
                        {getFlubnKeys().length === 0 && (
                          <p className="text-[10px] text-gray-600 text-center py-2">No flubn_ keys found</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (confirm("⚠️ Clear ALL flubn_ localStorage keys? This will reset all app state.")) {
                            getFlubnKeys().forEach((k) => localStorage.removeItem(k));
                            refreshState();
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold 
                          text-red-400/70 hover:text-red-400 py-1.5 rounded-lg border border-red-500/10 
                          hover:border-red-500/30 hover:bg-red-500/5 transition-all mt-1.5"
                      >
                        <Trash2 size={10} />
                        Clear All FLUBN Data
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-800/30 bg-gray-950/50 rounded-b-2xl">
              <p className="text-[9px] text-gray-600 text-center">
                ⚠️ Dev-only — remove <code className="text-gray-500">{"<DevTools />"}</code> before shipping
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Usage Row Sub-Component ──────────────────────────────────────────────────

function UsageRow({
  icon: Icon,
  label,
  used,
  limit,
  remaining,
  value,
  onReset,
  color,
  tick,
}: {
  icon: typeof Search;
  label: string;
  used?: number;
  limit?: number;
  remaining?: number;
  value?: string;
  onReset?: () => void;
  color: "blue" | "green" | "purple" | "amber";
  tick: number;
}) {
  const colorMap = {
    blue: { bg: "bg-blue-500", text: "text-blue-400", dim: "text-blue-400/60", track: "bg-blue-500/20" },
    green: { bg: "bg-green-500", text: "text-green-400", dim: "text-green-400/60", track: "bg-green-500/20" },
    purple: { bg: "bg-purple-500", text: "text-purple-400", dim: "text-purple-400/60", track: "bg-purple-500/20" },
    amber: { bg: "bg-amber-500", text: "text-amber-400", dim: "text-amber-400/60", track: "bg-amber-500/20" },
  };
  const c = colorMap[color];

  // For value-only rows (like analytics level)
  if (value !== undefined) {
    return (
      <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg px-2.5 py-2 border border-gray-800/30">
        <Icon size={12} className={c.dim} />
        <span className="text-[10px] text-gray-400 flex-1">{label}</span>
        <span className={`text-[10px] font-bold ${c.text} capitalize`}>{value}</span>
      </div>
    );
  }

  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : limit! > 0 ? Math.min(100, ((used || 0) / limit!) * 100) : 0;
  const isNearLimit = !isUnlimited && pct >= 80;

  return (
    <div className="bg-gray-900/50 rounded-lg px-2.5 py-2 border border-gray-800/30">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className={c.dim} />
        <span className="text-[10px] text-gray-400 flex-1">{label}</span>
        <span className={`text-[10px] font-bold ${isNearLimit ? "text-red-400" : c.text}`}>
          {used ?? 0} / {formatLimit(limit ?? 0)}
        </span>
        {onReset && (
          <button
            onClick={onReset}
            className="text-gray-600 hover:text-gray-400 transition-colors"
            title={`Reset ${label}`}
          >
            <RotateCcw size={9} />
          </button>
        )}
      </div>
      {!isUnlimited && (
        <div className={`h-1 rounded-full ${c.track} overflow-hidden`}>
          <motion.div
            className={`h-full rounded-full ${isNearLimit ? "bg-red-500" : c.bg}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}
      {isUnlimited && (
        <div className="text-[9px] text-gray-600 italic">∞ Unlimited</div>
      )}
    </div>
  );
}