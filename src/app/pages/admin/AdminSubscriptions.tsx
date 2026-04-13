import { CreditCard, TrendingUp, DollarSign, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "../../utils/export-csv";
import { getPricingPlans } from "../../utils/dataManager";
import { useAdminUsers } from "../../context/AdminUsersContext";
import { PRICING_PLANS } from "../../data/mock-data";
import { Pagination } from "../../components/Pagination";
import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";

export default function AdminSubscriptions() {
  const { users: adminUsers } = useAdminUsers();
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planNames, setPlanNames] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    const names = getPricingPlans().map((p) => p.name);
    setPlanNames([...new Set(names)]);

    const handleUpdate = () => {
      const updated = getPricingPlans().map((p) => p.name);
      setPlanNames([...new Set(updated)]);
    };
    window.addEventListener("pricingPlansUpdated", handleUpdate);
    return () => window.removeEventListener("pricingPlansUpdated", handleUpdate);
  }, []);

  // Derive subscriptions from real brand users
  const subscriptions = useMemo(() => {
    return adminUsers
      .filter(u => u.role === "brand" && u.plan)
      .map((u, i) => {
        const plan = PRICING_PLANS.find(p => p.name === u.plan);
        const isPaid = u.plan !== "Free" && (plan?.price || 0) > 0;
        return {
          id: `sub-${u.id || i}`,
          brand: u.name,
          plan: u.plan || "Free",
          amount: plan?.price || 0,
          status: isPaid ? "active" : "free",
          startDate: u.joinDate || "",
          nextBilling: isPaid ? "—" : "—",
        };
      });
  }, [adminUsers]);

  const filtered = subscriptions.filter((s) => {
    const matchPlan = planFilter === "all" || s.plan === planFilter;
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchPlan && matchStatus;
  });

  useEffect(() => { setCurrentPage(1); }, [planFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const totalMRR = subscriptions.filter((s) => s.status === "active").reduce((sum, s) => sum + s.amount, 0);
  const activeCount = subscriptions.filter((s) => s.status === "active").length;

  const handleExport = () => {
    const headers = ["Brand", "Plan", "Amount", "Status", "Start Date", "Next Billing"];
    const rows = filtered.map((s) => [
      s.brand, s.plan, `${s.amount}`, s.status, s.startDate, s.nextBilling,
    ]);
    exportToCSV("subscriptions", headers, rows);
    toast.success(`Exported ${filtered.length} subscriptions`);
  };

  const statuses = [...new Set(subscriptions.map((s) => s.status))];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Subscriptions</h1>
          <p className="text-[#64748b] text-sm mt-1">Manage brand subscriptions and billing.</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#1a1a2e] rounded-xl flex items-center gap-2 hover:bg-[#f8f9fc] transition-colors text-sm"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#64748b]">Monthly Recurring Revenue</p>
              <p className="text-2xl text-[#1a1a2e] mt-1">{"\u20b9"}{totalMRR.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#fffbeb] flex items-center justify-center">
              <DollarSign size={20} className="text-[#f59e0b]" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#64748b]">Active Subscriptions</p>
              <p className="text-2xl text-[#1a1a2e] mt-1">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] flex items-center justify-center">
              <CreditCard size={20} className="text-[#10b981]" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#64748b]">Churn Rate</p>
              <p className="text-2xl text-[#1a1a2e] mt-1">{subscriptions.length > 0 ? "0%" : "—"}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
              <TrendingUp size={20} className="text-[#2F6BFF]" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-[#64748b]">
          <Filter size={15} />
          <span>Filters:</span>
        </div>
        <div className="flex gap-1 bg-white border border-[#e2e8f0] rounded-xl p-1">
          {["all", ...planNames].map((plan) => (
            <button
              key={plan}
              onClick={() => setPlanFilter(plan)}
              className={`px-3.5 py-1.5 rounded-lg text-sm transition-colors ${
                planFilter === plan
                  ? "bg-[#2F6BFF] text-white"
                  : "text-[#64748b] hover:bg-[#f8f9fc]"
              }`}
            >
              {plan === "all" ? "All Plans" : plan}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white border border-[#e2e8f0] rounded-xl p-1">
          {["all", ...statuses].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                statusFilter === status
                  ? "bg-[#2F6BFF] text-white"
                  : "text-[#64748b] hover:bg-[#f8f9fc]"
              }`}
            >
              {status === "all" ? "All Status" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-[#e2e8f0]">
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Brand</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Plan</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Amount</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Status</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Start Date</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Next Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {paged.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#f8f9fc] transition-colors">
                  <td className="px-6 py-4 text-[#1a1a2e] text-sm">{sub.brand}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs ${
                      sub.plan === "Pro" ? "bg-[#EBF2FF] text-[#2F6BFF]" : "bg-[#f8f9fc] text-[#64748b]"
                    }`}>
                      {sub.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#1a1a2e] text-sm">{"\u20b9"}{sub.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs ${
                      sub.status === "active" ? "bg-[#ecfdf5] text-[#10b981]" :
                      sub.status === "cancelled" ? "bg-[#fef2f2] text-[#ef4444]" :
                      "bg-[#fffbeb] text-[#f59e0b]"
                    }`}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#64748b]">{sub.startDate}</td>
                  <td className="px-6 py-4 text-sm text-[#64748b]">{sub.nextBilling}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#94a3b8] text-sm">
                    No subscriptions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="subscriptions" />
      </div>
    </div>
  );
}