import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Ticket, Plus, Edit2, Trash2, Search, Check, X, Copy, ToggleLeft, ToggleRight,
  Calendar, Percent, IndianRupee, Tag, Clock, Download,
  TrendingUp, CheckCircle, XCircle, Scissors, ArrowRight, Hash,
  Users, Repeat, Sparkles, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "../../utils/export-csv";
import {
  getCoupons, addCoupon, updateCoupon, deleteCoupon,
  toggleCoupon, getCouponStats, type Coupon,
} from "../../utils/couponManager";
import { Pagination } from "../../components/Pagination";

type FormMode = "create" | "edit";
type FilterTab = "all" | "active" | "expired" | "inactive";

const PLAN_OPTIONS = ["All", "Basic", "Pro", "Enterprise"];

const emptyForm = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "flat",
  discountValue: "",
  applicablePlans: ["All"] as string[],
  applicableBillingCycles: ["monthly", "yearly"] as ("monthly" | "yearly")[],
  minOrderAmount: "",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: "1",
  validFrom: new Date().toISOString().split("T")[0],
  validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  isActive: true,
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setCoupons(getCoupons());
    const handler = () => setCoupons(getCoupons());
    window.addEventListener("couponsUpdated", handler);
    return () => window.removeEventListener("couponsUpdated", handler);
  }, []);

  const stats = useMemo(() => getCouponStats(), [coupons]);
  const now = new Date();

  const filteredCoupons = useMemo(() => {
    let list = [...coupons];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      );
    }
    if (filterTab === "active") list = list.filter((c) => c.isActive && new Date(c.validUntil) > now);
    else if (filterTab === "expired") list = list.filter((c) => new Date(c.validUntil) <= now);
    else if (filterTab === "inactive") list = list.filter((c) => !c.isActive);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [coupons, searchQuery, filterTab]);

  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterTab]);
  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / ROWS_PER_PAGE));
  const pagedCoupons = filteredCoupons.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const openCreateForm = () => { setForm(emptyForm); setFormMode("create"); setEditingId(null); setShowForm(true); };

  const openEditForm = (coupon: Coupon) => {
    setForm({
      code: coupon.code, description: coupon.description, discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(), applicablePlans: [...coupon.applicablePlans],
      applicableBillingCycles: [...coupon.applicableBillingCycles],
      minOrderAmount: coupon.minOrderAmount ? coupon.minOrderAmount.toString() : "",
      maxDiscount: coupon.maxDiscount ? coupon.maxDiscount.toString() : "",
      usageLimit: coupon.usageLimit ? coupon.usageLimit.toString() : "",
      perUserLimit: coupon.perUserLimit ? coupon.perUserLimit.toString() : "1",
      validFrom: coupon.validFrom.split("T")[0], validUntil: coupon.validUntil.split("T")[0],
      isActive: coupon.isActive,
    });
    setFormMode("edit"); setEditingId(coupon.id); setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.code.trim()) return toast.error("Coupon code is required");
    if (!/^[A-Z0-9_-]+$/i.test(form.code.trim())) return toast.error("Code must be alphanumeric (A-Z, 0-9, _, -)");
    if (!form.discountValue || Number(form.discountValue) <= 0) return toast.error("Discount value must be greater than 0");
    if (form.discountType === "percentage" && Number(form.discountValue) > 100) return toast.error("Percentage can't exceed 100%");
    if (!form.validFrom || !form.validUntil) return toast.error("Please set validity dates");
    if (new Date(form.validUntil) <= new Date(form.validFrom)) return toast.error("End date must be after start date");
    if (form.applicablePlans.length === 0) return toast.error("Select at least one applicable plan");
    if (form.applicableBillingCycles.length === 0) return toast.error("Select at least one billing cycle");

    const payload = {
      code: form.code.toUpperCase().trim(), description: form.description.trim(),
      discountType: form.discountType, discountValue: Number(form.discountValue),
      applicablePlans: form.applicablePlans, applicableBillingCycles: form.applicableBillingCycles,
      minOrderAmount: Number(form.minOrderAmount) || 0, maxDiscount: Number(form.maxDiscount) || 0,
      usageLimit: Number(form.usageLimit) || 0, perUserLimit: Number(form.perUserLimit) || 0,
      validFrom: new Date(form.validFrom).toISOString(),
      validUntil: new Date(form.validUntil + "T23:59:59").toISOString(),
      isActive: form.isActive,
    };
    try {
      if (formMode === "create") { addCoupon(payload); toast.success(`Coupon "${payload.code}" created!`); }
      else if (editingId) { updateCoupon(editingId, payload); toast.success(`Coupon "${payload.code}" updated!`); }
      setCoupons(getCoupons()); setShowForm(false);
    } catch (err: any) { toast.error(err.message || "Failed to save coupon"); }
  };

  const handleDelete = (id: string) => { deleteCoupon(id); setCoupons(getCoupons()); setDeleteConfirmId(null); toast.success("Coupon deleted"); };
  const handleToggle = (id: string) => { const updated = toggleCoupon(id); setCoupons(getCoupons()); if (updated) toast.success(`Coupon ${updated.isActive ? "activated" : "deactivated"}`); };
  const copyCode = (code: string) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success(`Copied "${code}"`);
    } catch {
      toast.success(`Code: ${code}`);
    }
  };

  const handleExport = () => {
    const headers = ["Code", "Description", "Type", "Value", "Plans", "Cycles", "Usage Limit", "Times Used", "Valid From", "Valid Until", "Active"];
    const rows = coupons.map((c) => [c.code, c.description, c.discountType, c.discountValue.toString(), c.applicablePlans.join(", "), c.applicableBillingCycles.join(", "), c.usageLimit ? c.usageLimit.toString() : "Unlimited", c.usedCount.toString(), c.validFrom.split("T")[0], c.validUntil.split("T")[0], c.isActive ? "Yes" : "No"]);
    exportToCSV("flubn-coupons", headers, rows); toast.success("Coupons exported");
  };

  const togglePlan = (plan: string) => {
    setForm((prev) => {
      let plans = [...prev.applicablePlans];
      if (plan === "All") { plans = plans.includes("All") ? [] : ["All"]; }
      else { plans = plans.filter((p) => p !== "All"); plans = plans.includes(plan) ? plans.filter((p) => p !== plan) : [...plans, plan]; if (plans.length === 3 && ["Basic", "Pro", "Enterprise"].every((p) => plans.includes(p))) plans = ["All"]; }
      return { ...prev, applicablePlans: plans };
    });
  };
  const toggleCycle = (cycle: "monthly" | "yearly") => {
    setForm((prev) => ({ ...prev, applicableBillingCycles: prev.applicableBillingCycles.includes(cycle) ? prev.applicableBillingCycles.filter((c) => c !== cycle) : [...prev.applicableBillingCycles, cycle] }));
  };

  const getCouponStatus = (c: Coupon) => {
    if (!c.isActive) return { label: "Inactive", color: "#94a3b8", bg: "#f1f5f9", dot: "#cbd5e1" };
    if (new Date(c.validUntil) <= now) return { label: "Expired", color: "#ef4444", bg: "#fef2f2", dot: "#f87171" };
    if (new Date(c.validFrom) > now) return { label: "Scheduled", color: "#f59e0b", bg: "#fffbeb", dot: "#fbbf24" };
    if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) return { label: "Exhausted", color: "#f97316", bg: "#fff7ed", dot: "#fb923c" };
    return { label: "Active", color: "#10b981", bg: "#ecfdf5", dot: "#34d399" };
  };

  const FILTER_TABS: { id: FilterTab; label: string; count: number; icon: React.ElementType }[] = [
    { id: "all", label: "All", count: coupons.length, icon: Ticket },
    { id: "active", label: "Active", count: stats.active, icon: CheckCircle },
    { id: "expired", label: "Expired", count: stats.expired, icon: Clock },
    { id: "inactive", label: "Inactive", count: coupons.filter((c) => !c.isActive).length, icon: XCircle },
  ];

  const getDaysLeft = (validUntil: string) => {
    const diff = Math.ceil((new Date(validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "Expired";
    if (diff === 0) return "Last day";
    if (diff === 1) return "1 day left";
    return `${diff} days left`;
  };

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 text-white"
        style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 50%, #6BA9FF 100%)" }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 opacity-10">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
            <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
            <circle cx="100" cy="100" r="55" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
            <circle cx="100" cy="100" r="30" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10">
                <Ticket size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-white">Coupon Management</h1>
                <p className="text-white/60 text-xs mt-0.5">Create, manage & track discount coupons</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-white/90 text-sm hover:bg-white/20 transition-all">
              <Download size={14} />
              Export
            </button>
            <button onClick={openCreateForm} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0F3D91] text-sm font-medium hover:shadow-lg hover:shadow-black/10 transition-all">
              <Plus size={15} />
              Create Coupon
            </button>
          </div>
        </div>

        {/* Inline Stats */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Total", value: stats.total, icon: Ticket },
            { label: "Active", value: stats.active, icon: CheckCircle },
            { label: "Expired", value: stats.expired, icon: Clock },
            { label: "Redemptions", value: stats.totalRedemptions, icon: TrendingUp },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={13} className="text-white/50" />
                <span className="text-[11px] text-white/50 uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-2xl font-semibold text-white">{s.value}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Filters + Search Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-[#e2e8f0] p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-[13px] transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterTab === tab.id
                  ? "bg-white text-[#1a1a2e] shadow-sm font-medium"
                  : "text-[#64748b] hover:text-[#1a1a2e]"
              }`}
            >
              <tab.icon size={13} className={filterTab === tab.id ? "text-[#2F6BFF]" : "text-[#94a3b8]"} />
              {tab.label}
              <span className={`text-[10px] min-w-[18px] text-center px-1.5 py-0.5 rounded-full ${
                filterTab === tab.id ? "bg-[#2F6BFF] text-white" : "bg-[#e2e8f0] text-[#94a3b8]"
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search coupons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
          />
        </div>
      </motion.div>

      {/* ── Coupon Cards ── */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredCoupons.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl border border-dashed border-[#d1d5db] p-16 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-[#EBF2FF] to-[#f1f5f9] rounded-2xl flex items-center justify-center shadow-sm">
                <Ticket size={28} className="text-[#2F6BFF]/50" />
              </div>
              <p className="text-[#374151] font-medium mb-1">
                {searchQuery ? "No coupons found" : "No coupons yet"}
              </p>
              <p className="text-[#94a3b8] text-sm mb-5">
                {searchQuery ? "Try a different search term" : "Create your first coupon to offer discounts to brands"}
              </p>
              {!searchQuery && (
                <button onClick={openCreateForm} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm transition-all hover:shadow-lg hover:shadow-[#2F6BFF]/20" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
                  <Plus size={15} /> Create First Coupon
                </button>
              )}
            </motion.div>
          )}

          {pagedCoupons.map((coupon, index) => {
            const status = getCouponStatus(coupon);
            const usagePercent = coupon.usageLimit > 0 ? Math.min(Math.round((coupon.usedCount / coupon.usageLimit) * 100), 100) : 0;
            const isExpanded = expandedId === coupon.id;
            const daysText = getDaysLeft(coupon.validUntil);

            return (
              <motion.div
                key={coupon.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ delay: index * 0.03, duration: 0.3 }}
                className="group relative"
              >
                {/* Ticket-shaped card */}
                <div className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${
                  isExpanded ? "border-[#2F6BFF]/30 shadow-lg shadow-[#2F6BFF]/5" : "border-[#e2e8f0] hover:border-[#2F6BFF]/20 hover:shadow-md"
                }`}>
                  {/* Coloured accent top strip */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${status.color}, ${status.color}80)` }} />

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-5">

                      {/* Left: Coupon visual */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Discount badge */}
                        <div className="shrink-0">
                          <div
                            className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center relative"
                            style={{ background: `linear-gradient(135deg, ${status.color}15, ${status.color}08)`, border: `1.5px solid ${status.color}25` }}
                          >
                            <span className="text-lg font-bold leading-none" style={{ color: status.color }}>
                              {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider mt-0.5 font-medium" style={{ color: `${status.color}90` }}>
                              off
                            </span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                            {/* Code */}
                            <button
                              onClick={() => copyCode(coupon.code)}
                              className="group/code inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f9fc] hover:bg-[#EBF2FF] border border-[#e2e8f0] hover:border-[#2F6BFF]/30 rounded-lg transition-all"
                              title="Click to copy"
                            >
                              <Hash size={11} className="text-[#94a3b8] group-hover/code:text-[#2F6BFF]" />
                              <span className="font-mono text-sm font-semibold tracking-wider text-[#1a1a2e]">{coupon.code}</span>
                              <Copy size={11} className="text-[#c9cdd5] group-hover/code:text-[#2F6BFF] transition-colors" />
                            </button>
                            {/* Status pill */}
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: status.bg, color: status.color }}>
                              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: status.dot }} />
                              {status.label}
                            </span>
                          </div>

                          <p className="text-sm text-[#64748b] leading-relaxed mb-3 line-clamp-1">
                            {coupon.description || "No description added"}
                          </p>

                          {/* Info chips */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] bg-[#EBF2FF] text-[#2F6BFF] px-2 py-[3px] rounded-md">
                              <Tag size={10} />
                              {coupon.applicablePlans.includes("All") ? "All Plans" : coupon.applicablePlans.join(", ")}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] bg-[#f0fdf4] text-[#16a34a] px-2 py-[3px] rounded-md">
                              <Repeat size={10} />
                              {coupon.applicableBillingCycles.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(" & ")}
                            </span>
                            {coupon.discountType === "percentage" && coupon.maxDiscount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-[#fffbeb] text-[#b45309] px-2 py-[3px] rounded-md">
                                <Shield size={10} /> Max ₹{coupon.maxDiscount.toLocaleString()}
                              </span>
                            )}
                            {coupon.minOrderAmount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-[#fdf2f8] text-[#be185d] px-2 py-[3px] rounded-md">
                                Min ₹{coupon.minOrderAmount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Stats + Actions */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 sm:min-w-[160px]">
                        {/* Usage ring */}
                        <div className="flex items-center gap-3">
                          <div className="relative w-11 h-11">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                              {coupon.usageLimit > 0 && (
                                <circle
                                  cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round"
                                  stroke={usagePercent >= 90 ? "#ef4444" : usagePercent >= 60 ? "#f59e0b" : "#10b981"}
                                  strokeDasharray={`${usagePercent * 0.942} 94.2`}
                                  className="transition-all duration-500"
                                />
                              )}
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-[#374151]">
                              {coupon.usageLimit > 0 ? `${usagePercent}%` : "∞"}
                            </span>
                          </div>
                          <div className="text-right sm:text-left">
                            <p className="text-xs font-medium text-[#374151]">
                              {coupon.usedCount}{coupon.usageLimit > 0 ? ` / ${coupon.usageLimit}` : ""} used
                            </p>
                            <p className="text-[10px] text-[#94a3b8] mt-0.5 flex items-center gap-1">
                              <Calendar size={9} />
                              {daysText}
                            </p>
                          </div>
                        </div>

                        {/* Date range */}
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-[#94a3b8] bg-[#f8f9fc] px-2.5 py-1.5 rounded-lg">
                          <span>{new Date(coupon.validFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                          <ArrowRight size={8} />
                          <span>{new Date(coupon.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</span>
                        </div>

                        {/* Actions row */}
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleToggle(coupon.id)} className={`p-2 rounded-lg transition-all ${coupon.isActive ? "text-[#10b981] hover:bg-[#ecfdf5]" : "text-[#94a3b8] hover:bg-[#f1f5f9]"}`} title={coupon.isActive ? "Deactivate" : "Activate"}>
                            {coupon.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button onClick={() => openEditForm(coupon)} className="p-2 rounded-lg text-[#94a3b8] hover:text-[#2F6BFF] hover:bg-[#EBF2FF] transition-all" title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <AnimatePresence mode="wait">
                            {deleteConfirmId === coupon.id ? (
                              <motion.div
                                key="confirm"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-0.5"
                              >
                                <button onClick={() => handleDelete(coupon.id)} className="p-2 rounded-lg text-white bg-[#ef4444] hover:bg-[#dc2626] transition-all" title="Confirm">
                                  <Check size={13} />
                                </button>
                                <button onClick={() => setDeleteConfirmId(null)} className="p-2 rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9] transition-all" title="Cancel">
                                  <X size={13} />
                                </button>
                              </motion.div>
                            ) : (
                              <motion.button
                                key="delete"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={() => setDeleteConfirmId(coupon.id)}
                                className="p-2 rounded-lg text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredCoupons.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="coupons" tableFooter={false} />
      </div>

      {/* ── Create / Edit Modal ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="bg-white rounded-3xl w-full max-w-[580px] overflow-hidden shadow-2xl shadow-black/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative overflow-hidden p-6 pb-5" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 50%, #6BA9FF 100%)" }}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/8 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10">
                        {formMode === "create" ? <Sparkles size={18} /> : <Edit2 size={18} />}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          {formMode === "create" ? "New Coupon" : "Edit Coupon"}
                        </h2>
                        <p className="text-white/50 text-xs">
                          {formMode === "create" ? "Set up a new discount for brands" : `Editing ${form.code || "coupon"}`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">

                {/* Code + Preview */}
                <div>
                  <label className="text-xs font-medium text-[#374151] mb-2 block">Coupon Code <span className="text-red-400">*</span></label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
                      placeholder="e.g. SUMMER25"
                      maxLength={20}
                      className="flex-1 px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] font-mono tracking-[3px] placeholder:text-[#b0b8c9] placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
                    />
                    {form.code && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-4 py-3 rounded-xl border-2 border-dashed border-[#2F6BFF]/30 bg-[#EBF2FF]/50 flex items-center"
                      >
                        <span className="font-mono text-sm font-bold text-[#2F6BFF] tracking-wider">{form.code}</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Discount Type + Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#374151] mb-2 block">Discount Type <span className="text-red-400">*</span></label>
                    <div className="flex gap-1.5 p-1.5 bg-[#f1f5f9] rounded-xl">
                      {(["percentage", "flat"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setForm({ ...form, discountType: type })}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                            form.discountType === type ? "bg-white text-[#1a1a2e] shadow-sm" : "text-[#94a3b8] hover:text-[#64748b]"
                          }`}
                        >
                          {type === "percentage" ? <Percent size={13} /> : <IndianRupee size={13} />}
                          {type === "percentage" ? "Percent" : "Flat"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#374151] mb-2 block">
                      {form.discountType === "percentage" ? "Discount %" : "Discount ₹"} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                      placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 500"}
                      min={1} max={form.discountType === "percentage" ? 100 : undefined}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
                    />
                  </div>
                </div>

                {/* Caps row */}
                <div className="grid grid-cols-2 gap-3">
                  {form.discountType === "percentage" && (
                    <div>
                      <label className="text-xs font-medium text-[#374151] mb-2 block">Max Discount Cap ₹</label>
                      <input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} placeholder="e.g. 2000 (0 = no cap)"
                        className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-[#374151] mb-2 block">Min Order ₹</label>
                    <input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} placeholder="0 = no minimum"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all" />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-[#374151] mb-2 block">Description</label>
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. 20% off for new brands on first subscription"
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all" />
                </div>

                {/* Plans + Cycles */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[#374151] mb-2 block">Applicable Plans</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PLAN_OPTIONS.map((plan) => {
                        const selected = form.applicablePlans.includes(plan) || (plan !== "All" && form.applicablePlans.includes("All"));
                        return (
                          <button key={plan} onClick={() => togglePlan(plan)}
                            className={`px-3 py-[7px] rounded-lg text-[11px] font-medium border transition-all ${
                              selected ? "bg-[#2F6BFF] border-[#2F6BFF] text-white" : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#2F6BFF]/40"
                            }`}
                          >
                            {plan === "All" ? "All Plans" : plan}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#374151] mb-2 block">Billing Cycles</label>
                    <div className="flex gap-1.5">
                      {(["monthly", "yearly"] as const).map((cycle) => {
                        const selected = form.applicableBillingCycles.includes(cycle);
                        return (
                          <button key={cycle} onClick={() => toggleCycle(cycle)}
                            className={`px-3.5 py-[7px] rounded-lg text-[11px] font-medium border transition-all ${
                              selected ? "bg-[#10b981] border-[#10b981] text-white" : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#10b981]/40"
                            }`}
                          >
                            {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#374151] mb-2 block flex items-center gap-1"><Users size={11} /> Total Usage Limit</label>
                    <input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="0 = unlimited"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#374151] mb-2 block">Per-User Limit</label>
                    <input type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} placeholder="0 = unlimited"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all" />
                  </div>
                </div>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#374151] mb-2 block flex items-center gap-1"><Calendar size={11} /> Valid From</label>
                    <input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#374151] mb-2 block flex items-center gap-1"><Calendar size={11} /> Valid Until</label>
                    <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all" />
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between bg-gradient-to-r from-[#f8f9fc] to-[#f1f5f9] rounded-2xl px-5 py-4 border border-[#e2e8f0]">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${form.isActive ? "bg-[#ecfdf5]" : "bg-[#f1f5f9]"}`}>
                      {form.isActive ? <CheckCircle size={16} className="text-[#10b981]" /> : <XCircle size={16} className="text-[#94a3b8]" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1a1a2e]">{form.isActive ? "Active" : "Inactive"}</p>
                      <p className="text-[11px] text-[#94a3b8]">{form.isActive ? "Coupon is live and usable" : "Coupon is disabled"}</p>
                    </div>
                  </div>
                  <button onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`transition-colors ${form.isActive ? "text-[#10b981]" : "text-[#94a3b8]"}`}>
                    {form.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 pt-4 border-t border-[#e2e8f0] flex items-center gap-3 bg-[#fafbfd]">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-[#e2e8f0] text-[#64748b] text-sm font-medium hover:bg-white transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-[#2F6BFF]/20 active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
                  {formMode === "create" ? <><Sparkles size={14} /> Create Coupon</> : <><Check size={14} /> Save Changes</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}