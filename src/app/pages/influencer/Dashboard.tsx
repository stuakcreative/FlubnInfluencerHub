import React, { useMemo, useRef, useEffect, useId, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import {
  BadgeCheck, Star, Zap, Award, TrendingUp, TrendingDown, Sparkles, Heart,
  MessageSquare, Clock, CheckCircle, XCircle, Percent, DollarSign,
  User, ArrowRight, Activity, Lock, BarChart3, Globe, Link as LinkIcon,
  Eye, Users, MousePointerClick, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAuth } from "../../context/AuthContext";
import { useCollaboration } from "../../context/CollaborationContext";
import { TRUST_BADGES } from "../../data/mock-data";
import { mergeInfluencerBadges } from "../../utils/badgeEngine";
import { getInfluencers } from "../../utils/dataManager";
import { DraggableWidget, LayoutCustomizerBar } from "../../components/DraggableWidget";
import { useDashboardLayout } from "../../hooks/useDashboardLayout";
import { getProfileViewStats, type ProfileViewStats } from "../../utils/profileViews";

// ── Widget definitions ───────────────────────────────────────────────────────

const DEFAULT_INFLUENCER_WIDGETS = [
  "stats-grid",
  "earnings-profile",
  "profile-views",
  "trust-badges",
  "recent-requests",
  "weekly-activity",
  "boost-tip",
] as const;

const INFLUENCER_WIDGET_LABELS: Record<string, string> = {
  "stats-grid": "Request Stats",
  "earnings-profile": "Earnings & Profile",
  "profile-views": "Profile Views",
  "trust-badges": "Trust Badges",
  "recent-requests": "Recent Requests",
  "weekly-activity": "Weekly Activity",
  "boost-tip": "Boost Tip",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const badgeIconMap: Record<string, any> = {
  BadgeCheck, Star, Zap, Award, TrendingUp, Sparkles, Heart,
};

function fmtNum(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

const sourceLabels: Record<string, string> = {
  direct: "Direct",
  shared_link: "Shared Link",
  discover: "Discover Page",
  search: "Search",
  social: "Social Media",
};

const sourceColors: Record<string, string> = {
  direct: "#2F6BFF",
  shared_link: "#8b5cf6",
  discover: "#10b981",
  search: "#f59e0b",
  social: "#ec4899",
};

const sourceIcons: Record<string, typeof Globe> = {
  direct: Globe,
  shared_link: LinkIcon,
  discover: Eye,
  search: MousePointerClick,
  social: Users,
};

const parseSentDate = (dateStr?: string, altStr?: string): Date | null => {
  const raw = dateStr || altStr;
  if (!raw) return null;
  try { return new Date(raw); } catch { return null; }
};

const monthName = (monthIndex: number): string =>
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIndex];

// ── Component ────────────────────────────────────────────────────────────────

export default function InfluencerDashboard() {
  const { requests: allRequests } = useCollaboration();
  const { user } = useAuth();

  const requests = useMemo(() => {
    if (!user?.id) return [];
    return allRequests.filter((r) => r.influencerId === user.id);
  }, [allRequests, user?.id]);

  const _uid = useId();
  const uid = _uid.replace(/:/g, "");
  const earningsGradId = `earningsGrad_${uid}`;

  const now = new Date();

  // Drag-and-drop layout
  const { widgetOrder, isEditing, setIsEditing, isSaving, reorderWidgets, resetLayout, saveAndExit } =
    useDashboardLayout("influencer", DEFAULT_INFLUENCER_WIDGETS, user?.id);

  // ── Stats from live data ──
  const stats = useMemo(() => {
    const totalRequests = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const accepted = requests.filter((r) => r.status === "accepted").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const acceptanceRate = totalRequests > 0 ? Math.round((accepted / totalRequests) * 100) : 0;
    const totalCampaignValue = requests.reduce((sum, r) => sum + r.budget, 0);
    return {
      cards: [
        { label: "Total Requests", value: totalRequests.toString(), icon: MessageSquare, color: "#2F6BFF", bg: "#EBF2FF" },
        { label: "Pending", value: pending.toString(), icon: Clock, color: "#f59e0b", bg: "#fffbeb" },
        { label: "Accepted", value: accepted.toString(), icon: CheckCircle, color: "#10b981", bg: "#ecfdf5" },
        { label: "Rejected", value: rejected.toString(), icon: XCircle, color: "#ef4444", bg: "#fef2f2" },
        { label: "Acceptance Rate", value: `${acceptanceRate}%`, icon: Percent, color: "#8b5cf6", bg: "#faf5ff" },
        {
          label: "Est. Campaign Value",
          value: `₹${totalCampaignValue >= 100000 ? (totalCampaignValue / 100000).toFixed(1) + "L" : totalCampaignValue.toLocaleString("en-IN")}`,
          icon: DollarSign, color: "#f59e0b", bg: "#fffbeb",
        },
      ],
      accepted,
      totalCampaignValue,
    };
  }, [requests]);

  // ── Earnings chart: monthly earnings from accepted requests ──
  const { earningsData, totalEarnings, earningsTrend } = useMemo(() => {
    const accepted = requests.filter((r) => r.status === "accepted");
    const total = accepted.reduce((sum, r) => sum + r.budget, 0);
    const monthBuckets: Record<string, number> = {};
    const labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthBuckets[key] = 0;
      labels.push(monthName(d.getMonth()));
    }
    accepted.forEach((req) => {
      const sentDate = parseSentDate(req.sentDate, req.sentAt);
      if (sentDate) {
        const key = `${sentDate.getFullYear()}-${sentDate.getMonth()}`;
        if (monthBuckets[key] !== undefined) monthBuckets[key] += req.budget;
      }
    });
    const keys = Object.keys(monthBuckets);
    const data = keys.map((key, i) => ({ month: labels[i], earnings: monthBuckets[key], monthKey: key }));
    const lastMonth = data.length >= 1 ? data[data.length - 1].earnings : 0;
    const prevMonth = data.length >= 2 ? data[data.length - 2].earnings : 0;
    const trend = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : lastMonth > 0 ? 100 : 0;
    return { earningsData: data, totalEarnings: total, earningsTrend: trend };
  }, [requests]);

  // ── Influencer record (for profile completion & badges) ──
  const influencerData = useMemo(() => {
    const all = getInfluencers();
    let found = all.find((inf) => inf.email === user?.email);
    if (!found) found = all.find((inf) => inf.id === user?.id);
    if (!found) found = all.find((inf) => inf.name === user?.name);
    return found ?? null;
  }, [user]);

  // ── Profile Views state ──
  const [viewStats, setViewStats] = useState<ProfileViewStats | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "sources" | "referrers">("overview");
  const [showAllReferrers, setShowAllReferrers] = useState(false);

  useEffect(() => {
    if (!influencerData?.id) return;
    localStorage.removeItem("flubn_profile_views_seed_v");
    localStorage.removeItem("flubn_profile_views");
    setViewStats(getProfileViewStats(influencerData.id));
    const handler = () => setViewStats(getProfileViewStats(influencerData.id));
    window.addEventListener("profileViewRecorded", handler);
    return () => window.removeEventListener("profileViewRecorded", handler);
  }, [influencerData?.id]);

  const sparklineData = viewStats?.viewsByDay.slice(-14) || [];
  const sparkMax = Math.max(...sparklineData.map((x) => x.views), 1);

  // ── Profile completion ──
  const profileChecks = useMemo(() => {
    const checks = [
      { label: "Profile photo", done: !!(user?.profilePicture || influencerData?.photo) },
      { label: "Bio & category", done: !!((user?.bio && user?.category) || (influencerData?.bio && influencerData?.category)) },
      {
        label: "Social media links",
        done: !!(user?.socialLinks?.some((s) => s.url?.trim()) || (influencerData?.socialLinks && influencerData.socialLinks.some((s) => s.url?.trim()))),
      },
      {
        label: "Portfolio samples",
        done: !!((user?.portfolio && user.portfolio.length > 0) || (influencerData?.portfolio && influencerData.portfolio.length > 0)),
      },
      { label: "Collabs starting rate", done: !!(user?.ratePerPost || influencerData?.ratePerPost) },
    ];
    const completed = checks.filter((c) => c.done).length;
    const percent = Math.round((completed / checks.length) * 100);
    return { checks, percent };
  }, [user, influencerData]);

  // ── Recent requests (sorted by sentDate, latest first) ──
  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => {
        const dateA = parseSentDate(a.sentDate, a.sentAt)?.getTime() || 0;
        const dateB = parseSentDate(b.sentDate, b.sentAt)?.getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 4);
  }, [requests]);

  // ── Weekly activity: real request counts per day over last 7 days ──
  const weeklyActivity = useMemo(() => {
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    const counts: { label: string; count: number; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const dayCount = requests.filter((r) => {
        const sentDate = parseSentDate(r.sentDate, r.sentAt);
        return sentDate && sentDate >= dayStart && sentDate < dayEnd;
      }).length;
      counts.push({ label: days[d.getDay()], count: dayCount, date: `${d.getDate()}/${d.getMonth() + 1}` });
    }
    const totalActivity = counts.reduce((s, c) => s + c.count, 0);
    return { counts, totalActivity };
  }, [requests]);

  // ── Trust badges ──
  const activeBadges = influencerData?.status === "active"
    ? mergeInfluencerBadges(influencerData)
        .map((badgeId) => TRUST_BADGES.find((b) => b.id === badgeId && b.status === "active"))
        .filter(Boolean) as typeof TRUST_BADGES
    : [];

  // Badge earn notifications
  const notifiedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const storageKey = `flubn_notified_badges_${user?.id ?? "guest"}`;
    const stored = localStorage.getItem(storageKey);
    const alreadyNotified: string[] = stored ? JSON.parse(stored) : [];
    const notifiedSet = new Set(alreadyNotified);
    const newlyEarned = activeBadges.filter((b) => !notifiedSet.has(b.id));
    if (newlyEarned.length > 0 && notifiedRef.current.size === 0) {
      const timer = setTimeout(() => {
        newlyEarned.forEach((badge, idx) => {
          setTimeout(() => {
            toast.success(`🏅 Badge unlocked: ${badge.name}`, {
              description: badge.description ?? "Keep it up — more badges await!",
              duration: 5000,
            });
          }, idx * 700);
          notifiedSet.add(badge.id);
        });
        localStorage.setItem(storageKey, JSON.stringify([...notifiedSet]));
      }, 800);
      newlyEarned.forEach((b) => notifiedRef.current.add(b.id));
      return () => clearTimeout(timer);
    }
  }, [activeBadges.map((b) => b.id).join(","), user?.id]);

  const activeIds = new Set(activeBadges.map((b) => b.id));
  const allBadges = TRUST_BADGES.filter((b) => b.status === "active");

  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const displayName = user?.name || "Creator";

  const formatCurrency = (amount: number): string => {
    if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toLocaleString("en-IN");
  };

  const maxActivity = Math.max(...weeklyActivity.counts.map((c) => c.count), 1);

  // ── Widget renderers ─────────────────────────────────────────────────────

  function renderWidget(widgetId: string): React.ReactNode {
    switch (widgetId) {

      case "stats-grid":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.cards.map((stat, i) => (
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

      case "earnings-profile":
        return (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Earnings Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-[#e2e8f0] p-6"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[#1a1a2e] flex items-center gap-2">
                  <DollarSign size={16} className="text-[#2F6BFF]" />
                  Earnings Overview
                </h3>
                <Link to="/influencer/analytics" className="text-xs text-[#2F6BFF] hover:underline">View Analytics</Link>
              </div>
              <div className="flex items-end gap-3 mb-4">
                <p className="text-3xl text-[#1a1a2e]">{"₹"}{formatCurrency(totalEarnings)}</p>
                {earningsTrend !== 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full mb-1 ${earningsTrend > 0 ? "text-[#10b981] bg-[#ecfdf5]" : "text-[#ef4444] bg-[#fef2f2]"}`}>
                    {earningsTrend > 0 ? "+" : ""}{earningsTrend}% vs last month
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={earningsData}>
                  <defs key="defs">
                    <linearGradient id={earningsGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2F6BFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis key="xaxis" dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    key="tooltip"
                    formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Earnings"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Area key="area-earnings" type="monotone" dataKey="earnings" stroke="#2F6BFF" strokeWidth={2} fill={`url(#${earningsGradId})`} />
                </AreaChart>
              </ResponsiveContainer>
              {totalEarnings === 0 && (
                <p className="text-center text-[11px] text-[#94a3b8] mt-2">Accept collaboration requests to start earning.</p>
              )}
            </motion.div>

            {/* Profile Completion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl border border-[#e2e8f0] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#1a1a2e] flex items-center gap-2">
                  <User size={18} className="text-[#2F6BFF]" />
                  Profile Completion
                </h3>
                <span className={`text-sm ${profileChecks.percent === 100 ? "text-[#10b981]" : "text-[#2F6BFF]"}`}>
                  {profileChecks.percent}%
                </span>
              </div>
              <div className="w-full bg-[#e2e8f0] rounded-full h-2.5 mb-4">
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${profileChecks.percent}%`,
                    background: profileChecks.percent === 100
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : "linear-gradient(90deg, #0F3D91, #2F6BFF)",
                  }}
                />
              </div>
              <div className="space-y-2">
                {profileChecks.checks.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={14} className={item.done ? "text-[#10b981]" : "text-[#e2e8f0]"} />
                    <span className={item.done ? "text-[#64748b]" : "text-[#94a3b8]"}>{item.label}</span>
                  </div>
                ))}
              </div>
              {profileChecks.percent < 100 ? (
                <Link to="/influencer/profile" className="inline-flex items-center gap-1 text-[#2F6BFF] text-sm mt-4 hover:gap-2 transition-all">
                  Complete Profile <ArrowRight size={14} />
                </Link>
              ) : (
                <p className="text-xs text-[#10b981] mt-4 flex items-center gap-1">
                  <CheckCircle size={12} /> Your profile is complete!
                </p>
              )}
            </motion.div>
          </div>
        );

      case "profile-views":
        return viewStats ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm"
          >
            {/* Header with gradient accent */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6]/5 via-[#2F6BFF]/5 to-[#06b6d4]/5" />
              <div className="relative flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
                  >
                    <BarChart3 size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[#1a1a2e]">Profile Views</p>
                    <p className="text-[11px] text-[#94a3b8]">How people are finding you</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs ${
                      viewStats.trend >= 0
                        ? "bg-[#ecfdf5] text-[#10b981]"
                        : "bg-[#fef2f2] text-[#ef4444]"
                    }`}
                  >
                    {viewStats.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {viewStats.trend >= 0 ? "+" : ""}{viewStats.trend}%
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Key metrics row */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  className="relative overflow-hidden rounded-xl p-4 text-center"
                  style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #e8efff 100%)" }}
                >
                  <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-[#2F6BFF]/5 -translate-y-3 translate-x-3" />
                  <Eye size={16} className="text-[#2F6BFF] mx-auto mb-1.5" />
                  <p className="text-2xl text-[#1a1a2e] tabular-nums">{fmtNum(viewStats.totalViews)}</p>
                  <p className="text-[10px] text-[#64748b] mt-0.5">Total Views</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative overflow-hidden rounded-xl p-4 text-center"
                  style={{ background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)" }}
                >
                  <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-[#8b5cf6]/5 -translate-y-3 translate-x-3" />
                  <Users size={16} className="text-[#8b5cf6] mx-auto mb-1.5" />
                  <p className="text-2xl text-[#1a1a2e] tabular-nums">{fmtNum(viewStats.uniqueVisitors)}</p>
                  <p className="text-[10px] text-[#64748b] mt-0.5">Unique Visitors</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                  className="relative overflow-hidden rounded-xl p-4 text-center"
                  style={{ background: viewStats.trend >= 0
                    ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
                    : "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)" }}
                >
                  <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-[#10b981]/5 -translate-y-3 translate-x-3" />
                  {viewStats.trend >= 0
                    ? <TrendingUp size={16} className="text-[#10b981] mx-auto mb-1.5" />
                    : <TrendingDown size={16} className="text-[#ef4444] mx-auto mb-1.5" />
                  }
                  <p className={`text-2xl tabular-nums ${viewStats.trend >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                    {viewStats.trend >= 0 ? "+" : ""}{viewStats.trend}%
                  </p>
                  <p className="text-[10px] text-[#64748b] mt-0.5">30-Day Trend</p>
                </motion.div>
              </div>

              {/* Tab navigation */}
              <div className="flex gap-1 mb-5 bg-[#f8f9fc] rounded-xl p-1">
                {(["overview", "sources", "referrers"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs transition-all ${
                      activeTab === tab
                        ? "bg-white text-[#1a1a2e] shadow-sm"
                        : "text-[#94a3b8] hover:text-[#64748b]"
                    }`}
                  >
                    {tab === "overview" ? "Overview" : tab === "sources" ? "Sources" : "Referrers"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-[#64748b]">Last 14 days</p>
                        <p className="text-[10px] text-[#94a3b8]">
                          Avg {Math.round(sparklineData.reduce((s, d) => s + d.views, 0) / Math.max(sparklineData.length, 1))}/day
                        </p>
                      </div>
                      <div className="flex items-end gap-[4px] h-16">
                        {sparklineData.map((d, i) => {
                          const h = Math.max((d.views / sparkMax) * 100, 6);
                          const isToday = i === sparklineData.length - 1;
                          return (
                            <motion.div
                              key={d.date}
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{ delay: 0.05 * i, type: "spring", stiffness: 200, damping: 20 }}
                              className={`flex-1 rounded-md cursor-pointer transition-colors group relative ${
                                isToday ? "bg-[#2F6BFF]" : "bg-[#2F6BFF]/20 hover:bg-[#2F6BFF]/40"
                              }`}
                              title={`${d.date}: ${d.views} views`}
                            >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1a1a2e] text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                {d.views}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] text-[#b0b8c9]">{sparklineData[0]?.date.slice(5)}</span>
                        <span className="text-[9px] text-[#b0b8c9]">Today</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "sources" && viewStats.viewsBySource.length > 0 && (
                  <motion.div
                    key="sources"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {viewStats.viewsBySource.map((s, i) => {
                      const pct = viewStats.totalViews > 0 ? Math.round((s.count / viewStats.totalViews) * 100) : 0;
                      const color = sourceColors[s.source] || "#94a3b8";
                      const SourceIcon = sourceIcons[s.source] || Globe;
                      return (
                        <motion.div
                          key={s.source}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * i }}
                          className="flex items-center gap-3"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${color}15` }}
                          >
                            <SourceIcon size={14} style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-[#475569]">{sourceLabels[s.source] || s.source}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#1a1a2e] tabular-nums">{s.count}</span>
                                <span className="text-[10px] text-[#94a3b8] tabular-nums w-8 text-right">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: 0.1 + 0.05 * i, duration: 0.5 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}

                {activeTab === "referrers" && (
                  <motion.div
                    key="referrers"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {viewStats.topReferrers && viewStats.topReferrers.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-[#64748b]">Top referrers</p>
                          <p className="text-[10px] text-[#94a3b8]">Views</p>
                        </div>
                        <div className="space-y-1">
                          {viewStats.topReferrers.slice(0, showAllReferrers ? 8 : 5).map((ref, idx) => {
                            const maxCount = viewStats.topReferrers[0]?.count || 1;
                            const barPct = Math.round((ref.count / maxCount) * 100);
                            return (
                              <motion.div
                                key={ref.domain}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.04 * idx }}
                                className="group relative rounded-lg overflow-hidden"
                              >
                                <div
                                  className="absolute inset-0 rounded-lg transition-colors"
                                  style={{
                                    width: `${barPct}%`,
                                    background: idx === 0
                                      ? "linear-gradient(90deg, rgba(47,107,255,0.08), rgba(47,107,255,0.04))"
                                      : "rgba(47,107,255,0.04)",
                                  }}
                                />
                                <div className="relative flex items-center gap-2.5 px-3 py-2.5">
                                  <span className="text-[10px] text-[#b0b8c9] w-4 shrink-0 text-right tabular-nums">
                                    {idx + 1}
                                  </span>
                                  <img
                                    src={ref.favicon}
                                    alt=""
                                    className="w-4 h-4 rounded-sm shrink-0"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                  <span className="text-[12px] text-[#475569] truncate flex-1">{ref.domain}</span>
                                  <span className="text-[12px] text-[#1a1a2e] tabular-nums shrink-0">{ref.count}</span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                        {viewStats.topReferrers.length > 5 && (
                          <button
                            onClick={() => setShowAllReferrers(!showAllReferrers)}
                            className="mt-3 text-[11px] text-[#2F6BFF] hover:underline flex items-center gap-1 mx-auto"
                          >
                            {showAllReferrers ? (
                              <><ChevronUp size={11} /> Show less</>
                            ) : (
                              <><ChevronDown size={11} /> +{viewStats.topReferrers.length - 5} more</>
                            )}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <ExternalLink size={20} className="text-[#d1d5db] mx-auto mb-2" />
                        <p className="text-xs text-[#94a3b8]">No referrer data yet</p>
                        <p className="text-[10px] text-[#b0b8c9] mt-1">Share your profile to start tracking referrers</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 text-center">
            <BarChart3 size={28} className="text-[#d1d5db] mx-auto mb-2" />
            <p className="text-sm text-[#94a3b8]">No profile view data yet</p>
            <p className="text-[11px] text-[#b0b8c9] mt-1">Share your profile link to start tracking views.</p>
          </div>
        );

      case "trust-badges":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
                  <BadgeCheck size={18} className="text-[#2F6BFF]" />
                </div>
                <div>
                  <p className="text-[#1a1a2e]">Trust Badges</p>
                  <p className="text-[10px] text-[#94a3b8]">Verified achievements</p>
                </div>
              </div>
              {activeBadges.length > 0 && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}>
                  <span className="text-white text-[11px]">{activeBadges.length}</span>
                </div>
              )}
            </div>
            <div className="px-6 py-5">
              {activeBadges.length === 0 && (
                <p className="text-[11px] text-[#94a3b8] mb-4 text-center">
                  {influencerData?.status === "active"
                    ? "Keep growing your profile to unlock badges."
                    : "Get verified to start earning trust badges."}
                </p>
              )}
              <div className="flex flex-wrap justify-evenly gap-y-6">
                {allBadges.map((badge, i) => {
                  const isEarned = activeIds.has(badge.id);
                  const BadgeIcon = badgeIconMap[badge.icon];
                  return (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.75 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.06 + i * 0.05, type: "spring", stiffness: 220, damping: 20 }}
                      className="flex flex-col items-center gap-[9px] text-center"
                      title={isEarned ? badge.name : `Locked — ${badge.name}`}
                    >
                      {isEarned ? (
                        <motion.div whileHover={{ scale: 1.06, y: -2 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="flex flex-col items-center gap-[9px] cursor-pointer">
                          <div className="relative">
                            <motion.div
                              className="w-[54px] h-[54px] rounded-full flex items-center justify-center"
                              whileHover={{ boxShadow: `0 0 0 5px ${badge.color}14, 0 6px 16px ${badge.color}30` }}
                              transition={{ type: "spring", stiffness: 260, damping: 22 }}
                              style={{ background: `radial-gradient(circle at 38% 35%, ${badge.color}55, ${badge.color}18)`, border: `2px solid ${badge.color}58`, boxShadow: `0 0 0 5px ${badge.color}0e, 0 6px 18px ${badge.color}32` }}
                            >
                              {BadgeIcon && <BadgeIcon size={22} style={{ color: badge.color }} />}
                            </motion.div>
                            <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-[1.5px] shadow-sm">
                              <BadgeCheck size={14} style={{ color: badge.color, display: "block" }} />
                            </div>
                          </div>
                          <p className="text-[10px] text-[#475569] leading-tight text-center max-w-[64px]">{badge.name}</p>
                        </motion.div>
                      ) : (
                        <div className="flex flex-col items-center gap-[9px] opacity-35 cursor-not-allowed select-none">
                          <div className="relative">
                            <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center" style={{ background: "radial-gradient(circle at 38% 35%, #cbd5e155, #cbd5e118)", border: "2px dashed #cbd5e1" }}>
                              {BadgeIcon && <BadgeIcon size={22} className="text-[#94a3b8]" />}
                            </div>
                            <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-[1.5px] shadow-sm">
                              <Lock size={12} className="text-[#94a3b8] block" />
                            </div>
                          </div>
                          <p className="text-[10px] text-[#94a3b8] leading-tight text-center max-w-[64px]">{badge.name}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );

      case "recent-requests":
        return (
          <div className="bg-white rounded-xl border border-[#e2e8f0]">
            <div className="flex items-center justify-between p-5 border-b border-[#e2e8f0]">
              <h2 className="text-lg text-[#1a1a2e]">Recent Requests</h2>
              <Link to="/influencer/requests" className="text-sm text-[#2F6BFF] flex items-center gap-1 hover:gap-2 transition-all">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            {recentRequests.length > 0 ? (
              <div className="divide-y divide-[#e2e8f0]">
                {recentRequests.map((req) => (
                  <div key={req.id} className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm shrink-0" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}>
                      {req.brandLogo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1a1a2e] truncate">{req.campaignName}</p>
                      <p className="text-sm text-[#64748b]">{req.brandName}</p>
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
                <MessageSquare size={28} className="mx-auto text-[#d1d5db] mb-3" />
                <p className="text-sm text-[#94a3b8]">No collaboration requests yet</p>
                <p className="text-xs text-[#b0b8c9] mt-1">Brands will reach out once you complete your profile.</p>
              </div>
            )}
          </div>
        );

      case "weekly-activity":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-[#e2e8f0] p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center">
                  <Activity size={18} className="text-[#3b82f6]" />
                </div>
                <div>
                  <h3 className="text-[#1a1a2e]">Weekly Activity</h3>
                  <p className="text-xs text-[#94a3b8]">Requests received in last 7 days</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl text-[#1a1a2e]">{weeklyActivity.totalActivity}</p>
                <span className="text-[11px] text-[#94a3b8]">requests</span>
              </div>
            </div>
            <div className="flex items-end gap-2" style={{ height: 96 }}>
              {weeklyActivity.counts.map((d, i) => (
                <div key={`bar-${d.date}`} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className="text-[10px] text-[#2F6BFF] font-medium">{d.count}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((d.count / maxActivity) * 68, 6)}px` }}
                    transition={{ delay: 0.3 + i * 0.06, type: "spring", stiffness: 180, damping: 20 }}
                    className="w-full"
                    style={{ background: d.count > 0 ? "linear-gradient(to top, #0F3D91, #2F6BFF)" : "#e2e8f0", borderRadius: "4px 4px 3px 3px" }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              {weeklyActivity.counts.map((d) => (
                <div key={`label-${d.date}`} className="flex-1 text-center">
                  <span className="text-[10px] text-[#94a3b8]">{d.label}</span>
                </div>
              ))}
            </div>
            {weeklyActivity.totalActivity === 0 && (
              <p className="text-center text-[11px] text-[#94a3b8] mt-3">No requests received this week yet.</p>
            )}
          </motion.div>
        );

      case "boost-tip":
        return (
          <div className="rounded-xl p-6 text-white" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
            <div className="flex items-start gap-4">
              <Sparkles size={24} className="shrink-0 mt-1" />
              <div className="flex flex-col gap-3">
                <h3 className="text-white">Boost your visibility</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {profileChecks.percent < 100
                    ? `Your profile is ${profileChecks.percent}% complete. Complete it to receive up to 3x more collaboration requests from brands.`
                    : "Your profile is complete! Keep your bio, social links, and rates up to date to maintain maximum visibility."}
                </p>
                <Link to="/influencer/profile" className="inline-flex items-center gap-1 text-white text-sm hover:gap-2 transition-all">
                  {profileChecks.percent < 100 ? "Complete Profile" : "Update Profile"} <ArrowRight size={14} />
                </Link>
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
            <p className="text-[#64748b] text-sm mt-1">Here&apos;s your creator overview.</p>
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
            label={INFLUENCER_WIDGET_LABELS[widgetId] || widgetId}
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