import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { DollarSign, ArrowDownRight, ArrowUpRight, Download, Filter, Search, Settings, Key, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "../../utils/export-csv";
import { useAdminUsers } from "../../context/AdminUsersContext";
import { PRICING_PLANS } from "../../data/mock-data";
import { Pagination } from "../../components/Pagination";

export default function AdminPayments() {
  const { users: adminUsers } = useAdminUsers();
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // Derive payments from real brand users who have a paid plan
  const payments = useMemo(() => {
    return adminUsers
      .filter(u => u.role === "brand" && u.plan && u.plan !== "Free")
      .map((u, i) => {
        const plan = PRICING_PLANS.find(p => p.name === u.plan);
        return {
          id: `pay-${u.id || i}`,
          brand: u.name,
          amount: plan?.price || 0,
          plan: u.plan || "",
          date: u.joinDate || "",
          status: "success" as const,
          method: "Razorpay",
        };
      });
  }, [adminUsers]);

  const filtered = payments.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchMethod = methodFilter === "all" || p.method === methodFilter;
    const matchSearch = p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchMethod && matchSearch;
  });

  const totalRevenue = payments.filter((p) => p.status === "success").reduce((sum, p) => sum + p.amount, 0);
  const filteredTotal = filtered.reduce((sum, p) => sum + p.amount, 0);

  const methods = [...new Set(payments.map((p) => p.method))];
  const statuses = [...new Set(payments.map((p) => p.status))];

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, methodFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handleExport = () => {
    const headers = ["Brand", "Amount", "Plan", "Method", "Date", "Status"];
    const rows = filtered.map((p) => [
      p.brand, `${p.amount}`, p.plan, p.method, p.date, p.status,
    ]);
    exportToCSV("payments", headers, rows);
    toast.success(`Exported ${filtered.length} payments`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Payments</h1>
          <p className="text-[#64748b] text-sm mt-1">Track all platform payments.</p>
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
              <p className="text-sm text-[#64748b]">Total Revenue</p>
              <p className="text-2xl text-[#1a1a2e] mt-1">{"\u20b9"}{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] flex items-center justify-center">
              <DollarSign size={20} className="text-[#10b981]" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#64748b]">Successful</p>
              <p className="text-2xl text-[#1a1a2e] mt-1">{payments.filter((p) => p.status === "success").length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
              <ArrowUpRight size={20} className="text-[#2F6BFF]" />
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#64748b]">Failed</p>
              <p className="text-2xl text-[#1a1a2e] mt-1">{payments.filter((p) => p.status === "failed").length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center">
              <ArrowDownRight size={20} className="text-[#ef4444]" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brand..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[14px] text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[#64748b]">
          <Filter size={15} />
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
        <div className="flex gap-1 bg-white border border-[#e2e8f0] rounded-xl p-1">
          {["all", ...methods].map((method) => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`px-3.5 py-1.5 rounded-lg text-sm transition-colors ${
                methodFilter === method
                  ? "bg-[#2F6BFF] text-white"
                  : "text-[#64748b] hover:bg-[#f8f9fc]"
              }`}
            >
              {method === "all" ? "All Methods" : method}
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
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Amount</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Plan</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Method</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Date</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {paged.map((payment) => (
                <tr key={payment.id} className="hover:bg-[#f8f9fc] transition-colors">
                  <td className="px-6 py-4 text-[#1a1a2e] text-sm">{payment.brand}</td>
                  <td className="px-6 py-4 text-[#1a1a2e] text-sm">{"\u20b9"}{payment.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs ${
                      payment.plan === "Pro" ? "bg-[#EBF2FF] text-[#2F6BFF]" : "bg-[#f8f9fc] text-[#64748b]"
                    }`}>
                      {payment.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#64748b]">{payment.method}</td>
                  <td className="px-6 py-4 text-sm text-[#64748b]">{payment.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs ${
                      payment.status === "success" ? "bg-[#ecfdf5] text-[#10b981]" :
                      payment.status === "failed" ? "bg-[#fef2f2] text-[#ef4444]" :
                      "bg-[#fffbeb] text-[#f59e0b]"
                    }`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#94a3b8] text-sm">
                    No payments match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="payments" />
      </div>
    </div>
  );
}