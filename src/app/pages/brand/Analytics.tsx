import { Link } from "react-router";
import { Lock, ArrowRight, BarChart3, TrendingUp as TrendingUpIcon } from "lucide-react";
import { hasAnalyticsAccess, getAnalyticsLevel, getPlanLimits } from "../../utils/planLimits";
import { useMemo } from "react";
import { motion } from "motion/react";
import { useCollaboration } from "../../context/CollaborationContext";
import { useAuth } from "../../context/AuthContext";
import { Send, Clock, CheckCircle, XCircle, Percent, Handshake } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const parseSentDate = (dateStr?: string, altStr?: string): Date | null => {
  const raw = dateStr || altStr;
  if (!raw) return null;
  try {
    return new Date(raw);
  } catch {
    return null;
  }
};

// Colors for pie chart segments
const PIE_COLORS = ["#2F6BFF", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#ef4444", "#14b8a6"];

export default function BrandAnalytics() {
  const { requests: allRequests } = useCollaboration();
  const { user } = useAuth();
  // Only show this brand's own requests
  const requests = useMemo(() => {
    if (!user?.id) return [];
    return allRequests.filter((r) => r.brandId === user.id);
  }, [allRequests, user?.id]);
  const now = new Date();

  // ── Build month keys for last 6 months ──
  const monthKeys = useMemo(() => {
    const keys: { key: string; label: string; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: MONTH_NAMES[d.getMonth()],
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }
    return keys;
  }, []);

  // ── Core counts ──
  const counts = useMemo(() => {
    const total = requests.length;
    const accepted = requests.filter((r) => r.status === "accepted").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const totalSpend = requests.filter((r) => r.status === "accepted").reduce((s, r) => s + r.budget, 0);
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    return { total, accepted, rejected, pending, totalSpend, acceptanceRate };
  }, [requests]);

  // ── Month-over-month changes ──
  const changes = useMemo(() => {
    const curMonth = monthKeys[monthKeys.length - 1];
    const prevMonth = monthKeys[monthKeys.length - 2];

    const inMonth = (r: any, mk: typeof curMonth) => {
      const d = parseSentDate(r.sentAt, r.sentDate);
      return d && d.getFullYear() === mk.year && d.getMonth() === mk.month;
    };

    const curRequests = requests.filter((r) => inMonth(r, curMonth));
    const prevRequests = requests.filter((r) => inMonth(r, prevMonth));

    const calcChange = (curVal: number, prevVal: number): string => {
      if (prevVal === 0 && curVal === 0) return "0%";
      if (prevVal === 0) return `+${curVal > 0 ? 100 : 0}%`;
      const pct = Math.round(((curVal - prevVal) / prevVal) * 100);
      return `${pct >= 0 ? "+" : ""}${pct}%`;
    };

    const curTotal = curRequests.length;
    const prevTotal = prevRequests.length;
    const curAccepted = curRequests.filter((r) => r.status === "accepted").length;
    const prevAccepted = prevRequests.filter((r) => r.status === "accepted").length;
    const curRejected = curRequests.filter((r) => r.status === "rejected").length;
    const prevRejected = prevRequests.filter((r) => r.status === "rejected").length;
    const curRate = curTotal > 0 ? Math.round((curAccepted / curTotal) * 100) : 0;
    const prevRate = prevTotal > 0 ? Math.round((prevAccepted / prevTotal) * 100) : 0;

    return {
      total: calcChange(curTotal, prevTotal),
      accepted: calcChange(curAccepted, prevAccepted),
      rejected: calcChange(curRejected, prevRejected),
      pending: calcChange(
        curRequests.filter((r) => r.status === "pending").length,
        prevRequests.filter((r) => r.status === "pending").length
      ),
      rate: calcChange(curRate, prevRate),
      activeCollab: calcChange(curAccepted, prevAccepted),
    };
  }, [requests, monthKeys]);

  // ── Stats cards ──
  const stats = useMemo(() => [
    { label: "Total Invites Sent", value: counts.total.toString(), change: changes.total, icon: Send, color: "#2F6BFF", bg: "#EBF2FF" },
    { label: "Pending", value: counts.pending.toString(), change: changes.pending, icon: Clock, color: "#f59e0b", bg: "#fffbeb" },
    { label: "Accepted", value: counts.accepted.toString(), change: changes.accepted, icon: CheckCircle, color: "#10b981", bg: "#ecfdf5" },
    { label: "Rejected", value: counts.rejected.toString(), change: changes.rejected, icon: XCircle, color: "#ef4444", bg: "#fef2f2" },
    { label: "Acceptance Rate", value: `${counts.acceptanceRate}%`, change: changes.rate, icon: Percent, color: "#8b5cf6", bg: "#faf5ff" },
    { label: "Active Collaborations", value: counts.accepted.toString(), change: changes.activeCollab, icon: Handshake, color: "#3b82f6", bg: "#eff6ff" },
  ], [counts, changes]);

  // ── Monthly Invites vs Accepted bar chart ──
  const monthlyInvites = useMemo(() => {
    return monthKeys.map((mk, idx) => {
      const monthReqs = requests.filter((r) => {
        const d = parseSentDate(r.sentAt, r.sentDate);
        return d && d.getFullYear() === mk.year && d.getMonth() === mk.month;
      });
      return {
        id: `${mk.year}-${mk.month}-${idx}`,
        month: mk.label,
        sent: monthReqs.length,
        accepted: monthReqs.filter((r) => r.status === "accepted").length,
      };
    });
  }, [requests, monthKeys]);

  // ── Invites by Brand pie chart (group by brandName) ──
  const brandBreakdown = useMemo(() => {
    const groups: Record<string, number> = {};
    requests.forEach((r) => {
      groups[r.brandName] = (groups[r.brandName] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([name, value], i) => ({
        name,
        value,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [requests]);

  // ── Campaign Spend Trend (accepted request budgets by month) ──
  const spendData = useMemo(() => {
    return monthKeys.map((mk, idx) => {
      const spend = requests
        .filter((r) => {
          if (r.status !== "accepted") return false;
          const d = parseSentDate(r.sentAt, r.sentDate);
          return d && d.getFullYear() === mk.year && d.getMonth() === mk.month;
        })
        .reduce((s, r) => s + r.budget, 0);
      return { 
        id: `spend-${mk.year}-${mk.month}-${idx}`,
        month: mk.label, 
        spend 
      };
    });
  }, [requests, monthKeys]);

  const hasData = requests.length > 0;

  const analyticsLevel = getAnalyticsLevel();
  const planInfo = getPlanLimits();
  const noAccess = !hasAnalyticsAccess();
  const isBasicOnly = analyticsLevel === "basic";

  // Free plan — full lock screen
  if (noAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Analytics</h1>
          <p className="text-[#64748b] text-sm mt-1">Track your campaign performance and ROI.</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-[#e2e8f0] p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#f8f9fc] flex items-center justify-center mx-auto mb-5">
            <Lock size={28} className="text-[#94a3b8]" />
          </div>
          <h2 className="text-xl text-[#1a1a2e] mb-2">Analytics Locked</h2>
          <p className="text-[#64748b] text-sm max-w-md mx-auto mb-6">
            Upgrade to the <strong>Basic</strong> plan or higher to unlock campaign analytics, performance tracking, and spend insights.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
            {[
              { icon: BarChart3, label: "Basic Analytics", plan: "Basic" },
              { icon: TrendingUpIcon, label: "Advanced Charts", plan: "Pro" },
              { icon: Handshake, label: "Custom Reports", plan: "Enterprise" },
            ].map((item) => (
              <div key={item.label} className="p-3 bg-[#f8f9fc] rounded-xl border border-[#e2e8f0]">
                <item.icon size={20} className="text-[#2F6BFF] mx-auto mb-2" />
                <p className="text-xs text-[#1a1a2e] font-medium">{item.label}</p>
                <p className="text-[10px] text-[#94a3b8]">{item.plan}+</p>
              </div>
            ))}
          </div>
          <Link
            to="/brand/subscription"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors text-sm shadow-lg shadow-[#2F6BFF]/25"
          >
            Upgrade Plan <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Analytics</h1>
        <p className="text-[#64748b] text-sm mt-1">Track your campaign performance and ROI.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-[#e2e8f0] p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <span className={`text-xs ${stat.change.startsWith("+") ? "text-[#10b981]" : stat.change.startsWith("-") ? "text-[#ef4444]" : "text-[#64748b]"}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-xl text-[#1a1a2e]">{stat.value}</p>
            <p className="text-xs text-[#64748b] mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Invites vs Accepted */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h3 className="text-[#1a1a2e] mb-4">Monthly Invites vs Accepted</h3>
          {hasData ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyInvites}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                <Legend />
                <Bar dataKey="sent" fill="#2F6BFF" radius={[4, 4, 0, 0]} name="Sent" />
                <Bar dataKey="accepted" fill="#10b981" radius={[4, 4, 0, 0]} name="Accepted" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <p className="text-sm text-[#94a3b8]">No invite data yet</p>
            </div>
          )}
        </div>

        {/* Invites by Brand */}
        <div className={`bg-white rounded-xl border border-[#e2e8f0] p-6 ${isBasicOnly ? "relative" : ""}`}>
          {isBasicOnly && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-xl z-10 flex flex-col items-center justify-center">
              <Lock size={20} className="text-[#94a3b8] mb-2" />
              <p className="text-sm text-[#64748b] mb-1">Pro Feature</p>
              <Link to="/brand/subscription" className="text-xs text-[#2F6BFF] hover:underline flex items-center gap-1">
                Upgrade to Pro <ArrowRight size={12} />
              </Link>
            </div>
          )}
          <h3 className="text-[#1a1a2e] mb-4">Invites by Brand</h3>
          {brandBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={brandBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {brandBreakdown.map((entry, idx) => (
                      <Cell key={`pie-${idx}-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {brandBreakdown.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[#64748b]">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <p className="text-sm text-[#94a3b8]">No brand data yet</p>
            </div>
          )}
        </div>

        {/* Campaign Spend Trend */}
        <div className={`bg-white rounded-xl border border-[#e2e8f0] p-6 lg:col-span-2 ${isBasicOnly ? "relative" : ""}`}>
          {isBasicOnly && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-xl z-10 flex flex-col items-center justify-center">
              <Lock size={20} className="text-[#94a3b8] mb-2" />
              <p className="text-sm text-[#64748b] mb-1">Pro Feature</p>
              <Link to="/brand/subscription" className="text-xs text-[#2F6BFF] hover:underline flex items-center gap-1">
                Upgrade to Pro <ArrowRight size={12} />
              </Link>
            </div>
          )}
          <h3 className="text-[#1a1a2e] mb-4">Campaign Spend Trend</h3>
          {hasData ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={spendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `\u20b9${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value: number) => [`\u20b9${value.toLocaleString("en-IN")}`, "Spend"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <defs key="spend-gradient-defs">
                  <linearGradient id="brandSpendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2F6BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="spend" stroke="#2F6BFF" strokeWidth={2.5} fill="url(#brandSpendGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <p className="text-sm text-[#94a3b8]">Send invites and get acceptances to see spend trends</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}