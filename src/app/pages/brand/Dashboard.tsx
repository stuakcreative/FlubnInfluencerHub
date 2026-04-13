import { ResponsiveContainer, Tooltip, XAxis, LineChart, Line } from "recharts";
import { motion } from "motion/react";
import { useMemo, useState, useEffect } from "react";
import {
  Send, Clock, CheckCircle, XCircle, Percent, Handshake, ArrowRight,
  TrendingUp, Zap, CreditCard, Heart, CalendarDays, IndianRupee,
  ChartBar,
} from "lucide-react";
import { Link } from "react-router";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useCollaboration } from "../../context/CollaborationContext";
import { useAuth } from "../../context/AuthContext";
import { getPricingPlans } from "../../utils/dataManager";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import {
  canSendCollabRequest, remainingCollabRequests, getMonthlyCollabCount, incrementCollabCount,
  canCreateCampaign, remainingCampaignSlots, getActiveCampaignCount,
  getPlanLimits, formatLimit,
} from "../../utils/planLimits";
import { getTemplateCount, getTemplateLimit, remainingTemplateSlots } from "../../utils/campaignTemplates";
import { getAnalyticsLevel } from "../../utils/planLimits";
import { DraggableWidget, LayoutCustomizerBar } from "../../components/DraggableWidget";
import { useDashboardLayout } from "../../hooks/useDashboardLayout";

// ── Widget definitions ───────────────────────────────────────────────────────

const DEFAULT_BRAND_WIDGETS = [
  "stats-grid",
  "weekly-chart",
  "quick-stats",
  "plan-usage",
  "recent-requests",
  "cta-cards",
] as const;

const BRAND_WIDGET_LABELS: Record<string, string> = {
  "stats-grid": "Campaign Stats",
  "weekly-chart": "Activity & Spend",
  "quick-stats": "Quick Overview",
  "plan-usage": "Plan Usage",
  "recent-requests": "Recent Requests",
  "cta-cards": "Quick Actions",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const parseTimelineEnd = (timeline: string): Date | null => {
  try {
    const parts = timeline.split(" - ");
    if (parts.length !== 2) return null;
    const endPart = parts[1].trim();
    return new Date(endPart);
  } catch {
    return null;
  }
};

const parseSentDate = (dateStr?: string, altStr?: string): Date | null => {
  const raw = dateStr || altStr;
  if (!raw) return null;
  try { return new Date(raw); } catch { return null; }
};

const getDayLabel = (dayIndex: number): string =>
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayIndex];

// ── Component ────────────────────────────────────────────────────────────────

export default function BrandDashboard() {
  const { requests: allRequests } = useCollaboration();
  const { user } = useAuth();

  const requests = useMemo(() => {
    if (!user?.id) return [];
    return allRequests.filter((r) => r.brandId === user.id);
  }, [allRequests, user?.id]);

  const [currentPlanName, setCurrentPlanName] = useState<string>("Free");
  const [currentPlanPrice, setCurrentPlanPrice] = useState<number>(0);
  const [savedCount, setSavedCount] = useState(0);

  // Drag-and-drop layout
  const { widgetOrder, isEditing, setIsEditing, isSaving, reorderWidgets, resetLayout, saveAndExit } =
    useDashboardLayout("brand", DEFAULT_BRAND_WIDGETS, user?.id);

  useEffect(() => {
    try {
      const plans = getPricingPlans();
      const billingHistory = JSON.parse(localStorage.getItem("flubn_billing_history") || "[]");
      if (billingHistory.length > 0) {
        const latestPlan = billingHistory[0];
        const description: string = latestPlan.description || "";
        const planName = description.split(" Plan")[0]?.trim();
        if (planName) {
          const matchedPlan = plans.find((p: any) => p.name.toLowerCase() === planName.toLowerCase());
          if (matchedPlan) {
            setCurrentPlanName(matchedPlan.name);
            setCurrentPlanPrice(matchedPlan.price);
          }
        }
      } else {
        setCurrentPlanName("Free");
        setCurrentPlanPrice(0);
      }
    } catch { /* ignore */ }

    try {
      const saved = JSON.parse(localStorage.getItem("brand-saved-influencers") || "[]");
      setSavedCount(saved.length);
    } catch { /* ignore */ }
  }, []);

  const now = new Date();

  // ── Live stats ──
  const stats = useMemo(() => {
    const totalInvites = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const accepted = requests.filter((r) => r.status === "accepted").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const acceptanceRate = totalInvites > 0 ? Math.round((accepted / totalInvites) * 100) : 0;
    return [
      { label: "Total Invites Sent", value: totalInvites.toString(), icon: Send, color: "#2F6BFF", bg: "#EBF2FF" },
      { label: "Pending", value: pending.toString(), icon: Clock, color: "#f59e0b", bg: "#fffbeb" },
      { label: "Accepted", value: accepted.toString(), icon: CheckCircle, color: "#10b981", bg: "#ecfdf5" },
      { label: "Rejected", value: rejected.toString(), icon: XCircle, color: "#ef4444", bg: "#fef2f2" },
      { label: "Acceptance Rate", value: `${acceptanceRate}%`, icon: Percent, color: "#8b5cf6", bg: "#faf5ff" },
      { label: "Active Collaborations", value: accepted.toString(), icon: Handshake, color: "#3b82f6", bg: "#eff6ff" },
    ];
  }, [requests]);

  // ── Weekly activity ──
  const weeklyActivity = useMemo(() => {
    const dayData: Record<string, { invites: number; accepted: number }> = {};
    const dayLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = getDayLabel(d.getDay());
      const key = d.toDateString();
      dayLabels.push(label);
      dayData[key] = { invites: 0, accepted: 0 };
    }
    requests.forEach((req) => {
      const sentDate = parseSentDate(req.sentDate, req.sentAt);
      if (sentDate) {
        const key = sentDate.toDateString();
        if (dayData[key]) {
          dayData[key].invites += 1;
          if (req.status === "accepted") dayData[key].accepted += 1;
        }
      }
    });
    const keys = Object.keys(dayData);
    return keys.map((key, i) => ({
      day: dayLabels[i],
      invites: dayData[key].invites,
      accepted: dayData[key].accepted,
    }));
  }, [requests]);

  // ── Spend overview ──
  const spendData = useMemo(() => {
    const acceptedRequests = requests.filter((r) => r.status === "accepted");
    const totalSpend = acceptedRequests.reduce((sum, r) => sum + r.budget, 0);
    const totalBudget = requests.reduce((sum, r) => sum + r.budget, 0);
    const activeCampaigns = acceptedRequests.filter((r) => {
      const endDate = parseTimelineEnd(r.timeline);
      return endDate ? endDate >= now : true;
    }).length;
    const completedCampaigns = acceptedRequests.filter((r) => {
      const endDate = parseTimelineEnd(r.timeline);
      return endDate ? endDate < now : false;
    }).length;
    const budgetUtil = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0;
    return { totalSpend, activeCampaigns, completedCampaigns, budgetUtil, totalRequests: requests.length };
  }, [requests]);

  // ── Recent requests ──
  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => {
        const dateA = parseSentDate(a.sentDate, a.sentAt)?.getTime() || 0;
        const dateB = parseSentDate(b.sentDate, b.sentAt)?.getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [requests]);

  // ── Billing spend ──
  const billingSpend = useMemo(() => {
    try {
      const history = JSON.parse(localStorage.getItem("flubn_billing_history") || "[]");
      return history
        .filter((h: any) => h.status === "paid")
        .reduce((sum: number, h: any) => sum + (h.amount || 0), 0);
    } catch { return 0; }
  }, []);

  const formatCurrency = (amount: number): string => {
    if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toLocaleString("en-IN");
  };

  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const displayName = user?.companyName || user?.name || "Brand";

  // ── Widget renderers ─────────────────────────────────────────────────────

  function renderWidget(widgetId: string): React.ReactNode {
    switch (widgetId) {

      case "stats-grid":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-[#64748b]">{stat.label}</p>
                    <p className="text-2xl text-[#1a1a2e] mt-1">{stat.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                    <stat.icon size={20} style={{ color: stat.color }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        );

      case "weekly-chart":
        return (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Weekly Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl border border-[#e2e8f0] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-[#2F6BFF]" />
                  <h3 className="text-[#1a1a2e]">This Week&apos;s Activity</h3>
                </div>
                <Link to="/brand/analytics" className="text-xs text-[#2F6BFF] hover:underline">View All</Link>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2F6BFF]" />
                  <span className="text-[11px] text-[#94a3b8]">Invites Sent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span className="text-[11px] text-[#94a3b8]">Accepted</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={weeklyActivity}>
                  <XAxis key="xaxis" dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip key="tooltip" contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                  <Line key="line-invites" isAnimationActive={false} type="monotone" dataKey="invites" stroke="#2F6BFF" strokeWidth={2} dot={false} name="Invites" />
                  <Line key="line-accepted" isAnimationActive={false} type="monotone" dataKey="accepted" stroke="#10b981" strokeWidth={2} dot={false} name="Accepted" />
                </LineChart>
              </ResponsiveContainer>
              {weeklyActivity.every((d) => d.invites === 0) && (
                <p className="text-center text-[11px] text-[#94a3b8] mt-2">No activity this week. Send collaboration requests to see data here.</p>
              )}
            </motion.div>

            {/* Campaign Spend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-[#e2e8f0] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <IndianRupee size={16} className="text-[#2F6BFF]" />
                  <h3 className="text-[#1a1a2e]">Campaign Spend</h3>
                </div>
                <Link to="/brand/analytics" className="text-xs text-[#2F6BFF] hover:underline">Details</Link>
              </div>
              <div className="flex items-end gap-4 mb-5">
                <div>
                  <p className="text-3xl text-[#1a1a2e]">{"₹"}{formatCurrency(spendData.totalSpend)}</p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">Total campaign budget (accepted)</p>
                </div>
                {spendData.totalRequests > 0 && (
                  <span className="text-xs text-[#2F6BFF] bg-[#EBF2FF] px-2 py-0.5 rounded-full mb-1">
                    {spendData.totalRequests} campaigns
                  </span>
                )}
              </div>
              <div className="space-y-3.5">
                {[
                  { label: "Active campaigns", value: spendData.activeCampaigns.toString(), pct: spendData.totalRequests > 0 ? Math.round((spendData.activeCampaigns / spendData.totalRequests) * 100) : 0, color: "#2F6BFF" },
                  { label: "Completed", value: spendData.completedCampaigns.toString(), pct: spendData.totalRequests > 0 ? Math.round((spendData.completedCampaigns / spendData.totalRequests) * 100) : 0, color: "#10b981" },
                  { label: "Budget utilization", value: `${spendData.budgetUtil}%`, pct: spendData.budgetUtil, color: "#8b5cf6" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[#64748b]">{item.label}</span>
                      <span className="text-[#1a1a2e]">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(item.pct, 100)}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        );

      case "quick-stats":
        return (
          <div className="grid sm:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748b]">Saved Influencers</p>
                  <p className="text-2xl text-[#1a1a2e] mt-1">{savedCount}</p>
                </div>
                <Link to="/brand/favorites" className="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center hover:bg-[#fecaca] transition-colors">
                  <Heart size={20} className="text-[#ef4444]" />
                </Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748b]">Current Plan</p>
                  <p className="text-2xl text-[#1a1a2e] mt-1">{currentPlanName}</p>
                  {currentPlanPrice > 0 && (
                    <p className="text-xs text-[#94a3b8] mt-0.5">{"₹"}{currentPlanPrice.toLocaleString("en-IN")}/mo</p>
                  )}
                </div>
                <Link to="/brand/subscription" className="w-10 h-10 rounded-xl bg-[#faf5ff] flex items-center justify-center hover:bg-[#f3e8ff] transition-colors">
                  <CreditCard size={20} className="text-[#8b5cf6]" />
                </Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748b]">Subscription Spend</p>
                  <p className="text-2xl text-[#1a1a2e] mt-1">{"₹"}{formatCurrency(billingSpend)}</p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">Total billed to date</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] flex items-center justify-center">
                  <ChartBar size={20} className="text-[#10b981]" />
                </div>
              </div>
            </motion.div>
          </div>
        );

      case "plan-usage": {
        const limits = getPlanLimits();
        const collabRemaining = remainingCollabRequests();
        const campaignRemaining = remainingCampaignSlots();

        const items = [
          {
            label: "Collab Requests",
            current: limits.collabRequestsPerMonth === -1 ? null : limits.collabRequestsPerMonth - (collabRemaining === -1 ? 0 : collabRemaining),
            max: limits.collabRequestsPerMonth,
            color: "#8b5cf6",
          },
          {
            label: "Active Campaigns",
            current: limits.activeCampaigns === -1 ? null : limits.activeCampaigns - (campaignRemaining === -1 ? 0 : campaignRemaining),
            max: limits.activeCampaigns,
            color: "#10b981",
          },
          ...(limits.campaignTemplates !== 0 && limits.campaignTemplates !== -1
            ? [{ label: "Campaign Templates", current: getTemplateCount(), max: limits.campaignTemplates, color: "#3b82f6" }]
            : []),
        ].filter((item) => item.max !== -1);

        if (items.length === 0) return <></>;

        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2F6BFF] to-[#6366f1] flex items-center justify-center">
                  <Zap size={15} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[#1a1a2e] text-sm font-semibold">Plan Usage</h3>
                  <span className="text-[10px] font-medium text-[#2F6BFF] bg-[#2F6BFF]/8 px-1.5 py-0.5 rounded-full">{limits.planName}</span>
                </div>
              </div>
              <Link to="/brand/subscription" className="text-xs font-medium text-[#2F6BFF] hover:text-[#1d4ed8] bg-[#2F6BFF]/5 hover:bg-[#2F6BFF]/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                Upgrade <ArrowRight size={12} />
              </Link>
            </div>
            <div className="px-5 pb-5">
              <div className="grid sm:grid-cols-3 gap-4">
                {items.map((item) => {
                  const pct = item.current !== null && item.max > 0 ? Math.min(Math.round((item.current / item.max) * 100), 100) : 0;
                  const isNearLimit = pct >= 80;
                  const isAtLimit = pct >= 100;
                  return (
                    <div key={item.label} className="bg-[#f8fafc] rounded-xl p-3.5 border border-[#f1f5f9] hover:border-[#e2e8f0] transition-colors sm:col-span-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[#64748b] text-xs font-medium">{item.label}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isAtLimit ? "bg-[#fef2f2] text-[#ef4444]" : isNearLimit ? "bg-[#fffbeb] text-[#f59e0b]" : "bg-white text-[#1a1a2e] border border-[#e2e8f0]"}`}>
                          {item.current ?? 0} / {formatLimit(item.max)}
                        </span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden border border-[#e2e8f0]/60">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{ background: isAtLimit ? "linear-gradient(90deg, #ef4444, #dc2626)" : isNearLimit ? "linear-gradient(90deg, #f59e0b, #d97706)" : `linear-gradient(90deg, ${item.color}, ${item.color}dd)` }}
                        />
                      </div>
                      <div className="mt-2 text-[10px] text-[#94a3b8] font-medium">
                        {isAtLimit ? "Limit reached" : isNearLimit ? `${100 - pct}% remaining` : `${pct}% used`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );
      }

      case "recent-requests":
        return (
          <div className="bg-white rounded-xl border border-[#e2e8f0]">
            <div className="flex items-center justify-between p-5 border-b border-[#e2e8f0]">
              <h2 className="text-lg text-[#1a1a2e]">Recent Collaboration Requests</h2>
              <Link to="/brand/requests" className="text-sm text-[#2F6BFF] flex items-center gap-1 hover:gap-2 transition-all">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            {recentRequests.length > 0 ? (
              <div className="divide-y divide-[#e2e8f0]">
                {recentRequests.map((req) => (
                  <div key={req.id} className="p-5 flex items-center gap-4">
                    {req.influencerPhoto ? (
                      <ImageWithFallback src={req.influencerPhoto} alt={req.influencerName || req.campaignName} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm text-white" style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}>
                        {(req.influencerName || req.brandName || "?")[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1a1a2e] truncate">{req.influencerName || req.brandName}</p>
                      <p className="text-sm text-[#64748b]">{req.campaignName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[#1a1a2e]">{"₹"}{req.budget.toLocaleString("en-IN")}</p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${req.status === "pending" ? "bg-[#fffbeb] text-[#f59e0b]" : req.status === "accepted" ? "bg-[#ecfdf5] text-[#10b981]" : "bg-[#fef2f2] text-[#ef4444]"}`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>
                    {req.sentDate && (
                      <span className="hidden md:block text-[11px] text-[#b0b8c9] shrink-0 w-24 text-right">{req.sentDate}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <Send size={28} className="mx-auto text-[#d1d5db] mb-3" />
                <p className="text-sm text-[#94a3b8]">No collaboration requests yet</p>
                <Link to="/brand/discover" className="inline-flex items-center gap-1 text-sm text-[#2F6BFF] mt-2 hover:underline">
                  Discover Influencers <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        );

      case "cta-cards":
        return (
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="rounded-xl p-6 text-white" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
              <div className="flex items-start gap-4">
                <TrendingUp size={24} className="shrink-0 mt-1" />
                <div>
                  <h3 className="text-white">Discover New Influencers</h3>
                  <p className="text-white/80 text-sm mt-1">Browse our verified influencer database and find the perfect match for your next campaign.</p>
                  <Link to="/brand/discover" className="inline-flex items-center gap-1 text-white text-sm mt-3 hover:gap-2 transition-all">
                    Start Discovering <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
            <div className="rounded-xl p-6 bg-white border border-[#e2e8f0] hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#faf5ff] flex items-center justify-center shrink-0">
                  <Zap size={20} className="text-[#8b5cf6]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1a1a2e]">Upgrade Your Plan</h3>
                  <p className="text-[#64748b] text-sm mt-1">
                    {currentPlanName === "Free"
                      ? "Start with a paid plan to unlock collaboration requests, analytics, and more."
                      : `You're on the ${currentPlanName} plan. Upgrade for more features and higher limits.`}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <Link to="/brand/subscription" className="inline-flex items-center gap-1.5 text-sm text-[#2F6BFF] hover:gap-2.5 transition-all">
                      <CreditCard size={14} />
                      View Plans & Pricing <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Greeting + Layout Customizer */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl text-[#1a1a2e]">
              {greeting}, {displayName}
            </h1>
            <p className="text-[#64748b] text-sm mt-1">
              Here&apos;s what&apos;s happening with your influencer campaigns.
            </p>
          </div>
          <LayoutCustomizerBar
            isEditing={isEditing}
            isSaving={isSaving}
            onEdit={() => setIsEditing(true)}
            onSave={saveAndExit}
            onReset={resetLayout}
          />
        </div>

        {/* Draggable widget sections */}
        {widgetOrder.map((widgetId, index) => (
          <DraggableWidget
            key={widgetId}
            id={widgetId}
            index={index}
            label={BRAND_WIDGET_LABELS[widgetId] || widgetId}
            onMove={reorderWidgets}
            isEditing={isEditing}
          >
            {renderWidget(widgetId)}
          </DraggableWidget>
        ))}
      </div>
    </DndProvider>
  );
}