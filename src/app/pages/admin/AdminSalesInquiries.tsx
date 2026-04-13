import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, Megaphone, Globe, Check, Search, X, Send, Phone,
  Mail, Building2, Tag, CreditCard, ArrowRight, Clock, Trash2, Download,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "../../utils/export-csv";
import * as api from "../../utils/api";
import { Pagination } from "../../components/Pagination";

interface SalesInquiry {
  id: string;
  type: "sales";
  brandName: string;
  companyName: string;
  email: string;
  phone: string;
  industry: string;
  currentPlan: string;
  currentPlanPrice: number;
  message: string;
  status: "new" | "contacted" | "resolved";
  submittedAt: string;
  profilePicture?: string;
}

interface ContactInquiry {
  id: string;
  type: "contact";
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: "new" | "contacted" | "resolved";
  submittedAt: string;
}

type Inquiry = SalesInquiry | ContactInquiry;

function isSales(inq: Inquiry): inq is SalesInquiry {
  return inq.type === "sales" || !("subject" in inq);
}

function isContact(inq: Inquiry): inq is ContactInquiry {
  return inq.type === "contact";
}

function getDisplayName(inq: Inquiry) {
  return isSales(inq) ? inq.brandName : inq.name;
}

function getSubtitle(inq: Inquiry) {
  if (isSales(inq)) return `${inq.companyName} \u00b7 ${inq.industry}`;
  return inq.subject;
}

export default function AdminSalesInquiries() {
  const [salesInquiries, setSalesInquiries] = useState<SalesInquiry[]>([]);
  const [contactInquiries, setContactInquiries] = useState<ContactInquiry[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "sales" | "contact">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "contacted" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // Load from localStorage
  const loadAll = () => {
    try {
      const sales = JSON.parse(localStorage.getItem("flubn_sales_inquiries") || "[]").map((s: any) => ({ ...s, type: "sales" }));
      setSalesInquiries(sales);
    } catch { setSalesInquiries([]); }
    try {
      const contacts = JSON.parse(localStorage.getItem("flubn_contact_inquiries") || "[]").map((c: any) => ({ ...c, type: "contact" }));
      setContactInquiries(contacts);
    } catch { setContactInquiries([]); }
  };

  useEffect(() => {
    loadAll();
    const handler = () => loadAll();
    const storageHandler = (e: StorageEvent) => {
      if (e.key === "flubn_sales_inquiries" || e.key === "flubn_contact_inquiries") loadAll();
    };
    window.addEventListener("salesInquiryUpdated", handler);
    window.addEventListener("contactInquiryUpdated", handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("salesInquiryUpdated", handler);
      window.removeEventListener("contactInquiryUpdated", handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  // Combined list
  const allInquiries: Inquiry[] = [...salesInquiries, ...contactInquiries].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  const saveInquiry = (inq: Inquiry, action: "update" | "delete", newStatus?: Inquiry["status"]) => {
    if (isSales(inq)) {
      let updated: SalesInquiry[];
      if (action === "delete") {
        updated = salesInquiries.filter((s) => s.id !== inq.id);
      } else {
        updated = salesInquiries.map((s) => s.id === inq.id ? { ...s, status: newStatus! } : s);
      }
      // Remove type field for storage
      const forStorage = updated.map(({ type, ...rest }) => rest);
      localStorage.setItem("flubn_sales_inquiries", JSON.stringify(forStorage));
      setSalesInquiries(updated);
      window.dispatchEvent(new CustomEvent("salesInquiryUpdated"));
      // Sync to backend
      api.saveData("sales_inquiries", forStorage).catch(() => {});
    } else {
      let updated: ContactInquiry[];
      if (action === "delete") {
        updated = contactInquiries.filter((c) => c.id !== inq.id);
      } else {
        updated = contactInquiries.map((c) => c.id === inq.id ? { ...c, status: newStatus! } : c);
      }
      const forStorage = updated.map(({ type, ...rest }) => rest);
      localStorage.setItem("flubn_contact_inquiries", JSON.stringify(forStorage));
      setContactInquiries(updated);
      window.dispatchEvent(new CustomEvent("contactInquiryUpdated"));
      // Sync to backend
      api.saveData("contact_inquiries", forStorage).catch(() => {});
    }
  };

  const updateStatus = (inq: Inquiry, status: Inquiry["status"]) => {
    saveInquiry(inq, "update", status);
    if (selectedInquiry?.id === inq.id) {
      setSelectedInquiry({ ...inq, status });
    }
    toast.success(`Inquiry marked as ${status}`);
  };

  const deleteInquiry = (inq: Inquiry) => {
    saveInquiry(inq, "delete");
    if (selectedInquiry?.id === inq.id) setSelectedInquiry(null);
    toast.success("Inquiry deleted");
  };

  const handleExport = () => {
    const headers = ["Type", "Name", "Email", "Phone", "Subject/Industry", "Message", "Status", "Submitted"];
    const rows = filteredList.map((inq) => [
      isSales(inq) ? "Sales" : "Contact",
      getDisplayName(inq),
      inq.email,
      inq.phone,
      isSales(inq) ? inq.industry : inq.subject,
      inq.message,
      inq.status,
      new Date(inq.submittedAt).toLocaleString(),
    ]);
    exportToCSV("inquiries_export", headers, rows);
    toast.success("Inquiries exported");
  };

  // Filtering
  const tabFiltered = activeTab === "all"
    ? allInquiries
    : activeTab === "sales"
      ? allInquiries.filter((i) => isSales(i))
      : allInquiries.filter((i) => isContact(i));

  const statusFiltered = filterStatus === "all"
    ? tabFiltered
    : tabFiltered.filter((i) => i.status === filterStatus);

  const filteredList = statusFiltered.filter((inq) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = getDisplayName(inq).toLowerCase();
    return (
      name.includes(q) ||
      inq.email.toLowerCase().includes(q) ||
      inq.message.toLowerCase().includes(q) ||
      (isSales(inq) && (inq.companyName.toLowerCase().includes(q) || inq.industry.toLowerCase().includes(q))) ||
      (isContact(inq) && inq.subject.toLowerCase().includes(q))
    );
  });

  useEffect(() => { setCurrentPage(1); }, [activeTab, filterStatus, searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredList.length / ROWS_PER_PAGE));
  const pagedList = filteredList.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // Stats
  const totalNew = allInquiries.filter((i) => i.status === "new").length;
  const salesCount = salesInquiries.length;
  const contactCount = contactInquiries.length;
  const salesNew = salesInquiries.filter((i) => i.status === "new").length;
  const contactNew = contactInquiries.filter((i) => i.status === "new").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return { bg: "#EBF2FF", text: "#2F6BFF", dot: "#2F6BFF" };
      case "contacted": return { bg: "#fffbeb", text: "#f59e0b", dot: "#f59e0b" };
      case "resolved": return { bg: "#ecfdf5", text: "#10b981", dot: "#10b981" };
      default: return { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" };
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Inquiries</h1>
          <p className="text-[#64748b] text-sm mt-1">
            All inquiries from the Contact page and brand enterprise requests.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={allInquiries.length === 0}
          className="px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#1a1a2e] rounded-xl flex items-center gap-2 hover:bg-[#f8f9fc] transition-colors text-sm disabled:opacity-50"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Inquiries", value: allInquiries.length, icon: MessageSquare, color: "#2F6BFF", bg: "#EBF2FF", badge: totalNew },
          { label: "Sales Inquiries", value: salesCount, icon: Megaphone, color: "#8b5cf6", bg: "#faf5ff", badge: salesNew },
          { label: "Contact Messages", value: contactCount, icon: Globe, color: "#3b82f6", bg: "#eff6ff", badge: contactNew },
          { label: "Resolved", value: allInquiries.filter((i) => i.status === "resolved").length, icon: Check, color: "#10b981", bg: "#ecfdf5", badge: 0 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-[#e2e8f0] p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#64748b]">{stat.label}</p>
                <p className="text-2xl text-[#1a1a2e] mt-1">{stat.value}</p>
              </div>
              <div className="relative">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                  <stat.icon size={16} style={{ color: stat.color }} />
                </div>
                {stat.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-[#ef4444] text-white text-[9px] rounded-full flex items-center justify-center px-1">
                    {stat.badge}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-3"
      >
        {/* Type Tabs */}
        <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-xl w-fit">
          {([
            { key: "all", label: "All", count: allInquiries.length },
            { key: "sales", label: "Sales", count: salesCount },
            { key: "contact", label: "Contact", count: contactCount },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedInquiry(null); }}
              className={`px-4 py-2 rounded-[10px] text-xs transition-all flex items-center gap-2 ${
                activeTab === tab.key
                  ? "bg-white text-[#1a1a2e] shadow-sm"
                  : "text-[#64748b] hover:text-[#1a1a2e]"
              }`}
            >
              {tab.key === "sales" && <Megaphone size={12} />}
              {tab.key === "contact" && <Globe size={12} />}
              {tab.key === "all" && <MessageSquare size={12} />}
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? "bg-[#EBF2FF] text-[#2F6BFF]" : "bg-[#e2e8f0] text-[#94a3b8]"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, subject, or industry..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            />
          </div>
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-xl shrink-0">
            {(["all", "new", "contacted", "resolved"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3.5 py-2 rounded-[10px] text-xs transition-all capitalize ${
                  filterStatus === status
                    ? "bg-white text-[#1a1a2e] shadow-sm"
                    : "text-[#64748b] hover:text-[#1a1a2e]"
                }`}
              >
                {status}
                {status === "new" && totalNew > 0 && (
                  <span className="ml-1.5 bg-[#2F6BFF] text-white text-[9px] px-1.5 py-0.5 rounded-full">
                    {totalNew}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Inquiry List */}
      {allInquiries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center"
        >
          <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} className="text-[#d1d5db]" />
          </div>
          <h3 className="text-[#1a1a2e] text-lg mb-2">No Inquiries Yet</h3>
          <p className="text-[#64748b] text-sm max-w-md mx-auto">
            When visitors submit the Contact form or brands request enterprise plans, their inquiries will appear here.
          </p>
        </motion.div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 text-center">
          <Search size={24} className="mx-auto text-[#d1d5db] mb-2" />
          <p className="text-[#94a3b8] text-sm">No inquiries match your filters.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5">
          {/* List */}
          <div className={`${selectedInquiry ? "lg:col-span-2" : "lg:col-span-5"} space-y-3`}>
            {pagedList.map((inq, i) => {
              const statusColor = getStatusColor(inq.status);
              const isSelected = selectedInquiry?.id === inq.id;
              const isSalesType = isSales(inq);

              return (
                <motion.div
                  key={inq.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedInquiry(inq)}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? "border-[#2F6BFF] shadow-[0_0_0_2px_rgba(47,107,255,0.1)]"
                      : "border-[#e2e8f0]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {isSalesType && (inq as SalesInquiry).profilePicture ? (
                      <img
                        src={(inq as SalesInquiry).profilePicture}
                        alt={getDisplayName(inq)}
                        className="w-10 h-10 rounded-xl object-cover object-center border border-[#e2e8f0]"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm shrink-0"
                        style={{
                          background: isSalesType
                            ? "linear-gradient(135deg, #0F3D91, #2F6BFF)"
                            : "linear-gradient(135deg, #10b981, #34d399)"
                        }}
                      >
                        {getDisplayName(inq)[0]?.toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-sm text-[#1a1a2e] truncate">{getDisplayName(inq)}</h4>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: isSalesType ? "#faf5ff" : "#eff6ff",
                              color: isSalesType ? "#8b5cf6" : "#3b82f6",
                            }}
                          >
                            {isSalesType ? "Sales" : "Contact"}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#94a3b8] shrink-0">{timeAgo(inq.submittedAt)}</span>
                      </div>
                      <p className="text-xs text-[#64748b] truncate mt-0.5">
                        {getSubtitle(inq)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full capitalize"
                          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor.dot }} />
                          {inq.status}
                        </span>
                        {isSalesType && (
                          <span className="text-[10px] text-[#94a3b8]">
                            {(inq as SalesInquiry).currentPlan} Plan
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredList.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="inquiries" tableFooter={false} />
          </div>

          {/* Detail Panel */}
          <AnimatePresence mode="wait">
            {selectedInquiry && (
              <motion.div
                key={selectedInquiry.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="lg:col-span-3 bg-white rounded-xl border border-[#e2e8f0] overflow-hidden sticky top-4"
              >
                {/* Detail Header */}
                <div
                  className="p-6 text-white relative overflow-hidden"
                  style={{
                    background: isSales(selectedInquiry)
                      ? "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)"
                      : "linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%)"
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {isSales(selectedInquiry) && selectedInquiry.profilePicture ? (
                          <img
                            src={selectedInquiry.profilePicture}
                            alt={getDisplayName(selectedInquiry)}
                            className="w-12 h-12 rounded-xl object-cover object-center border-2 border-white/20"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-lg border border-white/10">
                            {getDisplayName(selectedInquiry)[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="text-white text-lg">{getDisplayName(selectedInquiry)}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-white/60 text-xs">
                              {isSales(selectedInquiry) ? selectedInquiry.companyName : selectedInquiry.subject}
                            </span>
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                              {isSales(selectedInquiry) ? "Sales Inquiry" : "Contact Form"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedInquiry(null)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Detail Body */}
                <div className="p-6 space-y-5">
                  {/* Status */}
                  <div>
                    <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-2">Status</p>
                    <div className="flex items-center gap-2">
                      {(["new", "contacted", "resolved"] as const).map((status) => {
                        const color = getStatusColor(status);
                        const isActive = selectedInquiry.status === status;
                        return (
                          <button
                            key={status}
                            onClick={() => updateStatus(selectedInquiry, status)}
                            className={`px-4 py-2 rounded-xl text-xs capitalize transition-all flex items-center gap-1.5 ${
                              isActive
                                ? "shadow-sm border-2"
                                : "border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8f9fc]"
                            }`}
                            style={isActive ? { backgroundColor: color.bg, color: color.text, borderColor: color.text + "40" } : undefined}
                          >
                            {status === "new" && <Send size={12} />}
                            {status === "contacted" && <Phone size={12} />}
                            {status === "resolved" && <Check size={12} />}
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div>
                    <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-3">Contact Details</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-[#f8f9fc] rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-[#EBF2FF] flex items-center justify-center">
                          <Mail size={14} className="text-[#2F6BFF]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#94a3b8]">Email</p>
                          <p className="text-sm text-[#1a1a2e] truncate">{selectedInquiry.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-[#f8f9fc] rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] flex items-center justify-center">
                          <Phone size={14} className="text-[#10b981]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#94a3b8]">Phone</p>
                          <p className="text-sm text-[#1a1a2e]">{selectedInquiry.phone || "N/A"}</p>
                        </div>
                      </div>
                      {isSales(selectedInquiry) && (
                        <div className="flex items-center gap-3 p-3 bg-[#f8f9fc] rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-[#faf5ff] flex items-center justify-center">
                            <Building2 size={14} className="text-[#8b5cf6]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#94a3b8]">Industry</p>
                            <p className="text-sm text-[#1a1a2e]">{selectedInquiry.industry}</p>
                          </div>
                        </div>
                      )}
                      {isContact(selectedInquiry) && (
                        <div className="flex items-center gap-3 p-3 bg-[#f8f9fc] rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-[#fffbeb] flex items-center justify-center">
                            <Tag size={14} className="text-[#f59e0b]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#94a3b8]">Subject</p>
                            <p className="text-sm text-[#1a1a2e]">{selectedInquiry.subject}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current Plan (Sales only) */}
                  {isSales(selectedInquiry) && (
                    <div>
                      <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-3">Current Subscription</p>
                      <div className="flex items-center gap-3 p-4 bg-[#f8f9fc] rounded-xl border border-[#e2e8f0]/50">
                        <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
                          <CreditCard size={18} className="text-[#2F6BFF]" />
                        </div>
                        <div>
                          <p className="text-sm text-[#1a1a2e]">{selectedInquiry.currentPlan} Plan</p>
                          <p className="text-xs text-[#94a3b8]">
                            ₹{selectedInquiry.currentPlanPrice.toLocaleString()}/month
                          </p>
                        </div>
                        <ArrowRight size={14} className="ml-auto text-[#94a3b8]" />
                        <div className="text-right">
                          <p className="text-sm text-[#f59e0b]">Enterprise</p>
                          <p className="text-xs text-[#94a3b8]">Requested</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div>
                    <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-2">Message</p>
                    <p className="text-sm text-[#64748b] bg-[#f8f9fc] rounded-xl p-4 border border-[#e2e8f0]/50">
                      {selectedInquiry.message}
                    </p>
                  </div>

                  {/* Submitted time */}
                  <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                    <Clock size={12} />
                    Submitted on {formatDate(selectedInquiry.submittedAt)} at {formatTime(selectedInquiry.submittedAt)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-[#e2e8f0]">
                    <button
                      onClick={() => {
                        updateStatus(selectedInquiry, "contacted");
                        toast.success("Marked as contacted!");
                      }}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                      style={{
                        background: isSales(selectedInquiry)
                          ? "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)"
                          : "linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%)"
                      }}
                    >
                      <Phone size={14} />
                      Mark Contacted
                    </button>
                    <button
                      onClick={() => {
                        updateStatus(selectedInquiry, "resolved");
                      }}
                      className="px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-[#10b981] hover:bg-[#ecfdf5] hover:border-[#10b981]/30 transition-all text-sm flex items-center gap-2"
                    >
                      <Check size={14} />
                      Resolve
                    </button>
                    <button
                      onClick={() => deleteInquiry(selectedInquiry)}
                      className="p-2.5 rounded-xl border border-[#e2e8f0] text-[#ef4444] hover:bg-[#fef2f2] hover:border-[#ef4444]/30 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}