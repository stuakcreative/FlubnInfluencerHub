import React, { useMemo } from "react";
import { motion } from "motion/react";
import {
  Users, UserCheck, Building2, Handshake, DollarSign, TrendingUp,
  CreditCard, FileText, ArrowRight, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { Link } from "react-router";
import { toast } from "sonner";
import { exportToCSV } from "../../utils/export-csv";
import { PRICING_PLANS } from "../../data/mock-data";
import { useStatistics } from "../../context/StatisticsContext";
import { useCollaboration } from "../../context/CollaborationContext";
import { useAdminUsers } from "../../context/AdminUsersContext";
import { useAuth } from "../../context/AuthContext";
import { DraggableWidget, LayoutCustomizerBar } from "../../components/DraggableWidget";
import { useDashboardLayout } from "../../hooks/useDashboardLayout";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// ── Widget definitions ───────────────────────────────────────────────────────

const DEFAULT_ADMIN_WIDGETS = [
  "live-stats",
  "stats-grid",
  "charts-row",
  "revenue-trend",
  "recent-activity",
] as const;

const ADMIN_WIDGET_LABELS: Record<string, string> = {
  "live-stats": "Live Platform Stats",
  "stats-grid": "Overview Cards",
  "charts-row": "Growth & Plans",
  "revenue-trend": "Revenue Trend",
  "recent-activity": "Recent Activity",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { stats: platformStats } = useStatistics();
  const { requests: liveRequests } = useCollaboration();
  const { users: adminUsers } = useAdminUsers();
  const { user } = useAuth();

  // Drag-and-drop layout
  const { widgetOrder, isEditing, setIsEditing, isSaving, reorderWidgets, resetLayout, saveAndExit } =
    useDashboardLayout("admin", DEFAULT_ADMIN_WIDGETS, user?.id);

  // ── Live stats cards ──
  const stats = useMemo(() => {
    const activeSubscriptions = adminUsers.filter(
      (u) => u.plan && ["Basic", "Pro", "Enterprise"].includes(u.plan)
    ).length;
    const monthlyRevenue = adminUsers.reduce((sum, u) => {
      if (!u.plan) return sum;
      const plan = PRICING_PLANS.find((p) => p.name === u.plan);
      return sum + (plan?.price || 0);
    }, 0);
    const totalUsers = platformStats.totalInfluencers + platformStats.totalBrands;
    return [
      { label: "Total Users", value: totalUsers.toString(), change: `${totalUsers} registered`, icon: Users, color: "#2F6BFF", bg: "#EBF2FF" },
      { label: "Influencers", value: platformStats.totalInfluencers.toString(), change: `${platformStats.verifiedInfluencers} verified`, icon: UserCheck, color: "#8b5cf6", bg: "#faf5ff" },
      { label: "Brands", value: platformStats.totalBrands.toString(), change: `${platformStats.totalBrands} active`, icon: Building2, color: "#3b82f6", bg: "#eff6ff" },
      { label: "Active Collaborations", value: platformStats.activeCollaborations.toString(), change: `${platformStats.totalCollaborations} total`, icon: Handshake, color: "#10b981", bg: "#ecfdf5" },
      { label: "Monthly Revenue", value: `₹${(monthlyRevenue / 100000).toFixed(1)}L`, change: `${activeSubscriptions} paid plans`, icon: DollarSign, color: "#f59e0b", bg: "#fffbeb" },
      { label: "Active Subscriptions", value: activeSubscriptions.toString(), change: "active", icon: CreditCard, color: "#ec4899", bg: "#fdf2f8" },
    ];
  }, [platformStats, adminUsers]);

  // ── Plan distribution ──
  const planDistribution = useMemo(() => {
    const proCount = adminUsers.filter((u) => u.plan === "Pro").length;
    const basicCount = adminUsers.filter((u) => u.plan === "Basic").length;
    const enterpriseCount = adminUsers.filter((u) => u.plan === "Enterprise").length;
    const freeCount = adminUsers.filter((u) => !u.plan || u.plan === "Free").length;
    return [
      { id: "plan-pro", name: "Pro", value: proCount || 0, color: "#2F6BFF" },
      { id: "plan-basic", name: "Basic", value: basicCount || 0, color: "#3b82f6" },
      { id: "plan-enterprise", name: "Enterprise", value: enterpriseCount || 0, color: "#8b5cf6" },
      { id: "plan-free", name: "Free", value: freeCount || 0, color: "#94a3b8" },
    ].filter((d) => d.value > 0);
  }, [adminUsers]);

  // ── Growth data ──
  const growthData = useMemo(() => {
    const now = new Date();
    const months: { id: string; month: string; users: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString("en", { month: "short" });
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const usersUpToMonth = adminUsers.filter((u) => {
        const joinTs = new Date(u.joinDate).getTime();
        return !isNaN(joinTs) && joinTs <= monthEnd.getTime();
      }).length;
      const revenueUpToMonth = adminUsers.reduce((sum, u) => {
        const joinTs = new Date(u.joinDate).getTime();
        if (!isNaN(joinTs) && joinTs <= monthEnd.getTime() && u.plan) {
          const plan = PRICING_PLANS.find((p) => p.name === u.plan);
          return sum + (plan?.price || 0);
        }
        return sum;
      }, 0);
      months.push({
        id: `${d.getFullYear()}-${d.getMonth()}`,
        month: monthLabel,
        users: usersUpToMonth,
        revenue: revenueUpToMonth
      });
    }
    return months;
  }, [adminUsers]);

  // ── Recent activity ──
  type ActivityIcon = typeof Users;
  interface ActivityEvent {
    action: string;
    user: string;
    timestamp: number;
    icon: ActivityIcon;
    color: string;
  }

  const recentActivity = useMemo(() => {
    const events: ActivityEvent[] = [];
    const now = Date.now();
    const timeAgo = (ts: number): string => {
      const diffMs = now - ts;
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    };

    adminUsers.forEach((u) => {
      const ts = new Date(u.joinDate).getTime();
      if (!isNaN(ts)) {
        if (u.role === "influencer") {
          events.push({ action: "New influencer registered", user: u.name, timestamp: ts, icon: UserCheck, color: "#8b5cf6" });
        } else if (u.role === "brand") {
          events.push({ action: u.plan ? `Brand subscribed to ${u.plan}` : "New brand registered", user: u.name, timestamp: ts, icon: u.plan ? CreditCard : Building2, color: u.plan ? "#ec4899" : "#3b82f6" });
        }
      }
    });

    liveRequests.forEach((r) => {
      const sentTs = new Date(r.sentAt || r.sentDate || "").getTime();
      if (!isNaN(sentTs)) {
        events.push({ action: "New collaboration request", user: `${r.brandName} → ${r.influencerName}`, timestamp: sentTs, icon: Handshake, color: "#2F6BFF" });
      }
      if (r.status === "accepted" && r.respondedAt) {
        const ts = new Date(r.respondedAt).getTime();
        if (!isNaN(ts)) {
          events.push({ action: "Collaboration accepted", user: `${r.brandName} x ${r.influencerName}`, timestamp: ts, icon: TrendingUp, color: "#10b981" });
        }
      }
      if (r.status === "rejected" && r.respondedAt) {
        const ts = new Date(r.respondedAt).getTime();
        if (!isNaN(ts)) {
          events.push({ action: "Collaboration declined", user: `${r.influencerName} → ${r.brandName}`, timestamp: ts, icon: FileText, color: "#ef4444" });
        }
      }
    });

    events.sort((a, b) => b.timestamp - a.timestamp);
    return events.slice(0, 6).map((e) => ({ ...e, time: timeAgo(e.timestamp) }));
  }, [adminUsers, liveRequests]);

  const handleExport = () => {
    const headers = ["Metric", "Value", "Change"];
    const rows = stats.map((s) => [s.label, s.value, s.change]);
    exportToCSV("admin_dashboard_overview", headers, rows);
    toast.success("Dashboard overview exported");
  };

  // ── Widget renderers ─────────────────────────────────────────────────────

  function renderWidget(widgetId: string): React.ReactNode {
    switch (widgetId) {

      case "live-stats":
        return (
          <div className="bg-gradient-to-br from-[#0F3D91] via-[#2F6BFF] to-[#6BA9FF] rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg">Live Platform Statistics</h2>
                <p className="text-white/70 text-sm mt-1">Real-time data displayed across the website</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs">Real-time</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-white/80 text-xs uppercase tracking-wide mb-1">Total Creators</p>
                <p className="text-2xl">{platformStats.influencersDisplay}</p>
                <p className="text-white/60 text-xs mt-1">{platformStats.totalInfluencers} influencers</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-white/80 text-xs uppercase tracking-wide mb-1">Verified Creators</p>
                <p className="text-2xl">{platformStats.verifiedInfluencersDisplay}</p>
                <p className="text-white/60 text-xs mt-1">{platformStats.verifiedInfluencers} verified</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-white/80 text-xs uppercase tracking-wide mb-1">Active Brands</p>
                <p className="text-2xl">{platformStats.brandsDisplay}</p>
                <p className="text-white/60 text-xs mt-1">{platformStats.totalBrands} brands</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-white/80 text-xs uppercase tracking-wide mb-1">Collaborations</p>
                <p className="text-2xl">{platformStats.collaborationsDisplay}</p>
                <p className="text-white/60 text-xs mt-1">{platformStats.activeCollaborations} active</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <p className="text-xs text-white/70">
                These numbers are automatically calculated and displayed on the Landing page, About page, Discover page, and Footer. They update in real-time as users sign up.
              </p>
            </div>
          </div>
        );

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
                    <span className={`text-xs ${stat.change.startsWith("+") ? "text-[#10b981]" : stat.change.startsWith("-") ? "text-[#ef4444]" : "text-[#64748b]"}`}>
                      {stat.change}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                    <stat.icon size={20} style={{ color: stat.color }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        );

      case "charts-row":
        return (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* User Growth */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 lg:col-span-2">
              <h3 className="text-[#1a1a2e] mb-4">Platform Growth</h3>
              <ResponsiveContainer width="100%" height={280} key="growth-chart-container">
                <BarChart data={growthData} barCategoryGap="20%" key="growth-bar-chart">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="users" fill="#2F6BFF" radius={[4, 4, 0, 0]} name="Users" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Plan Distribution */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
              <h3 className="text-[#1a1a2e] mb-4">Subscription Plans</h3>
              <ResponsiveContainer width="100%" height={180} key="plan-chart-container">
                <PieChart key="plan-pie-chart">
                  <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" nameKey="name">
                    {planDistribution.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                {planDistribution.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[#64748b]">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "revenue-trend":
        return (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#1a1a2e]">Revenue Trend</h3>
              <Link to="/admin/payments" className="text-xs text-[#2F6BFF] hover:underline flex items-center gap-1">
                View Payments <ArrowRight size={12} />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={200} key="revenue-chart-container">
              <AreaChart data={growthData} key="revenue-area-chart">
                <defs>
                  <linearGradient id="adminRevenueGradient-unique" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#adminRevenueGradient-unique)" fillOpacity={1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case "recent-activity":
        return (
          <div className="bg-white rounded-xl border border-[#e2e8f0]">
            <div className="p-5 border-b border-[#e2e8f0]">
              <div className="flex items-center justify-between">
                <h3 className="text-[#1a1a2e]">Recent Activity</h3>
                <span className="text-xs text-[#94a3b8] bg-[#f8f9fc] px-2 py-1 rounded-full">Live</span>
              </div>
            </div>
            <div className="divide-y divide-[#e2e8f0]">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, i) => (
                  <div key={`activity-${activity.user}-${activity.timestamp}-${i}`} className="p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${activity.color}15` }}>
                      <activity.icon size={16} style={{ color: activity.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1a1a2e]">{activity.action}</p>
                      <p className="text-xs text-[#94a3b8] truncate">{activity.user}</p>
                    </div>
                    <span className="text-xs text-[#94a3b8] whitespace-nowrap">{activity.time}</span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-[#94a3b8]">No activity yet</p>
                </div>
              )}
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
        {/* Header + Customize + Export */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl text-[#1a1a2e]">Admin Dashboard</h1>
            <p className="text-[#64748b] text-sm mt-1">Platform overview and key metrics.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <LayoutCustomizerBar
              isEditing={isEditing}
              isSaving={isSaving}
              onEdit={() => setIsEditing(true)}
              onSave={saveAndExit}
              onReset={resetLayout}
            />
            {!isEditing && (
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-white border border-[#e2e8f0] text-[#1a1a2e] rounded-xl flex items-center gap-2 hover:bg-[#f8f9fc] transition-colors text-sm"
              >
                <Download size={15} />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Draggable widget sections */}
        {widgetOrder.map((widgetId, index) => (
          <DraggableWidget
            key={widgetId}
            id={widgetId}
            index={index}
            label={ADMIN_WIDGET_LABELS[widgetId] || widgetId}
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