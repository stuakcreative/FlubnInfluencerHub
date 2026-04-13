import { useMemo } from "react";
import { motion } from "motion/react";
import { MessageSquare, CheckCircle, XCircle, DollarSign, Percent, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { useCollaboration } from "../../context/CollaborationContext";
import { useAuth } from "../../context/AuthContext";

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

export default function InfluencerAnalytics() {
  const { requests: allRequests } = useCollaboration();
  const { user } = useAuth();
  // Only show this influencer's own requests
  const requests = useMemo(() => {
    if (!user?.id) return [];
    return allRequests.filter((r) => r.influencerId === user.id);
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
    const totalValue = requests.reduce((s, r) => s + r.budget, 0);
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    return { total, accepted, rejected, pending, totalValue, acceptanceRate };
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
    const curValue = curRequests.reduce((s, r) => s + r.budget, 0);
    const prevValue = prevRequests.reduce((s, r) => s + r.budget, 0);
    const curRate = curTotal > 0 ? Math.round((curAccepted / curTotal) * 100) : 0;
    const prevRate = prevTotal > 0 ? Math.round((prevAccepted / prevTotal) * 100) : 0;

    return {
      total: calcChange(curTotal, prevTotal),
      accepted: calcChange(curAccepted, prevAccepted),
      rejected: calcChange(curRejected, prevRejected),
      value: calcChange(curValue, prevValue),
      rate: calcChange(curRate, prevRate),
    };
  }, [requests, monthKeys]);

  // ── Stats cards ──
  const stats = useMemo(() => {
    const formatValue = (v: number) =>
      v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${v.toLocaleString("en-IN")}`;

    return [
      { label: "Total Requests", value: counts.total.toString(), change: changes.total, icon: MessageSquare, color: "#2F6BFF", bg: "#EBF2FF" },
      { label: "Accepted", value: counts.accepted.toString(), change: changes.accepted, icon: CheckCircle, color: "#10b981", bg: "#ecfdf5" },
      { label: "Rejected", value: counts.rejected.toString(), change: changes.rejected, icon: XCircle, color: "#ef4444", bg: "#fef2f2" },
      { label: "Total Campaign Value", value: formatValue(counts.totalValue), change: changes.value, icon: DollarSign, color: "#f59e0b", bg: "#fffbeb" },
      { label: "Acceptance Rate", value: `${counts.acceptanceRate}%`, change: changes.rate, icon: Percent, color: "#8b5cf6", bg: "#faf5ff" },
    ];
  }, [counts, changes]);

  // ── Monthly Requests bar chart data ──
  const monthlyData = useMemo(() => {
    return monthKeys.map((mk) => {
      const count = requests.filter((r) => {
        const d = parseSentDate(r.sentAt, r.sentDate);
        return d && d.getFullYear() === mk.year && d.getMonth() === mk.month;
      }).length;
      return { month: mk.label, requests: count };
    });
  }, [requests, monthKeys]);

  // ── Pie chart data ──
  const pieData = useMemo(() => {
    const data = [
      { name: "Accepted", value: counts.accepted, color: "#10b981" },
      { name: "Pending", value: counts.pending, color: "#f59e0b" },
      { name: "Rejected", value: counts.rejected, color: "#ef4444" },
    ].filter((d) => d.value > 0);
    return data;
  }, [counts]);

  // ── Earnings Trend line chart data ──
  const earningsData = useMemo(() => {
    return monthKeys.map((mk) => {
      const earnings = requests
        .filter((r) => {
          if (r.status !== "accepted") return false;
          const d = parseSentDate(r.sentAt, r.sentDate);
          return d && d.getFullYear() === mk.year && d.getMonth() === mk.month;
        })
        .reduce((s, r) => s + r.budget, 0);
      return { month: mk.label, earnings };
    });
  }, [requests, monthKeys]);

  const hasData = requests.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Analytics</h1>
        <p className="text-[#64748b] text-sm mt-1">Track your collaboration performance and growth.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        {/* Monthly Requests */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h3 className="text-[#1a1a2e] mb-4">Monthly Requests</h3>
          {hasData ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                />
                <Bar dataKey="requests" fill="#2F6BFF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <p className="text-sm text-[#94a3b8]">No request data yet</p>
            </div>
          )}
        </div>

        {/* Request Status Pie */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h3 className="text-[#1a1a2e] mb-4">Request Status Breakdown</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[#64748b]">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <p className="text-sm text-[#94a3b8]">No status data yet</p>
            </div>
          )}
        </div>

        {/* Earnings Trend */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 lg:col-span-2">
          <h3 className="text-[#1a1a2e] mb-4">Earnings Trend</h3>
          {hasData ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `\u20b9${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value: number) => [`\u20b9${value.toLocaleString("en-IN")}`, "Earnings"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                />
                <Line type="monotone" dataKey="earnings" stroke="#2F6BFF" strokeWidth={2.5} dot={{ fill: "#2F6BFF", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <p className="text-sm text-[#94a3b8]">Accept collaboration requests to see earnings trends</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}