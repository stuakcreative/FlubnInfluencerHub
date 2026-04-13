import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck, Search, CheckCircle, XCircle, Clock, ExternalLink,
  AlertCircle, Building2, Copy, Check, X, SlidersHorizontal, Download,
  RefreshCw, BadgeCheck, Link2, RotateCcw, Settings,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllVerifications,
  approveVerification,
  rejectVerification,
  getCompanyTypeOption,
  formatVerifDate,
  getVerifyUrl,
  getCustomVerifyUrls,
  saveCustomVerifyUrls,
  resetVerifyUrl,
  COMPANY_TYPE_OPTIONS,
  type BrandVerificationData,
  type VerificationStatus,
  type VerifyUrlMap,
} from "../../utils/brandVerification";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { exportToCSV } from "../../utils/export-csv";
import { Pagination } from "../../components/Pagination";

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: VerificationStatus }) {
  if (status === "verified")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#ecfdf5] text-[#10b981] rounded-full text-xs">
        <CheckCircle size={11} /> Verified
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#fffbeb] text-[#f59e0b] rounded-full text-xs">
        <Clock size={11} /> Pending
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#fef2f2] text-[#ef4444] rounded-full text-xs">
        <XCircle size={11} /> Rejected
      </span>
    );
  return null;
}

function CompanyTypePill({ type }: { type: string }) {
  const opt = getCompanyTypeOption(type as any);
  const isIndian = opt?.group === "india";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${
        isIndian
          ? "bg-[#EBF2FF] text-[#2F6BFF]"
          : "bg-[#f0fdf4] text-[#10b981]"
      }`}
    >
      {opt?.label ?? type}
    </span>
  );
}

function RelativeTime({ iso }: { iso?: string }) {
  if (!iso) return <span className="text-[#94a3b8]">—</span>;
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return <span className="text-[#64748b] text-xs">Just now</span>;
    if (mins < 60) return <span className="text-[#64748b] text-xs">{mins}m ago</span>;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return <span className="text-[#64748b] text-xs">{hrs}h ago</span>;
    const days = Math.floor(hrs / 24);
    if (days === 1) return <span className="text-[#64748b] text-xs">1d ago</span>;
    if (days < 7) return <span className="text-[#64748b] text-xs">{days}d ago</span>;
    return <span className="text-[#64748b] text-xs">{formatVerifDate(iso)}</span>;
  } catch {
    return <span className="text-[#94a3b8] text-xs">—</span>;
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminBrandVerification() {
  const [verifications, setVerifications] = useState<BrandVerificationData[]>([]);
  const [tab, setTab] = useState<"all" | "pending" | "verified" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveModal, setApproveModal] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [urlDrawer, setUrlDrawer] = useState(false);
  const [urlDraft, setUrlDraft] = useState<VerifyUrlMap>({});
  const [urlSaved, setUrlSaved] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"pending_first" | "newest" | "oldest" | "name_az">("pending_first");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const reload = () => setVerifications(getAllVerifications());

  useEffect(() => {
    reload();
  }, []);

  // Auto-update every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      reload();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const counts = {
    all: verifications.length,
    pending: verifications.filter((v) => v.status === "pending").length,
    verified: verifications.filter((v) => v.status === "verified").length,
    rejected: verifications.filter((v) => v.status === "rejected").length,
  };

  const filtered = verifications.filter((v) => {
    const matchTab = tab === "all" || v.status === tab;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      v.brandName.toLowerCase().includes(q) ||
      v.registrationNumber.toLowerCase().includes(q) ||
      v.brandEmail.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  // Sort: pending first, then by submittedAt desc
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name_az") {
      return a.brandName.localeCompare(b.brandName);
    }
    if (sortBy === "newest") {
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    }
    // pending_first
    const order: Record<VerificationStatus, number> = { pending: 0, rejected: 1, verified: 2, not_started: 3 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  useEffect(() => { setCurrentPage(1); }, [tab, search, sortBy]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const paged = sorted.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleApprove = () => {
    if (!approveModal) return;
    const v = verifications.find((x) => x.brandId === approveModal);
    if (!v) return;
    approveVerification(approveModal, "Admin", adminNotes || undefined);
    reload();
    setApproveModal(null);
    setAdminNotes("");
    toast.success(`${v.brandName} is now Verified!`, {
      description: "The ✅ Verified badge will appear next to their brand name.",
    });
  };

  const handleReject = () => {
    if (!rejectModal || !rejectReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    const v = verifications.find((x) => x.brandId === rejectModal);
    if (!v) return;
    rejectVerification(rejectModal, rejectReason.trim());
    reload();
    setRejectModal(null);
    setRejectReason("");
    toast.error(`${v.brandName} — verification rejected`, {
      description: "Brand has been notified with the reason.",
    });
  };

  const copyToClipboardFn = (text: string, id: string) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      setCopiedId(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
    document.body.removeChild(ta);
  };

  const handleExport = () => {
    const headers = ["Brand", "Email", "Type", "Reg. Number", "Status", "Submitted", "Verified/Rejected On"];
    const rows = sorted.map((v) => [
      v.brandName,
      v.brandEmail,
      getCompanyTypeOption(v.companyType)?.label ?? v.companyType,
      v.registrationNumber,
      v.status,
      formatVerifDate(v.submittedAt),
      formatVerifDate(v.verifiedAt || v.rejectedAt),
    ]);
    exportToCSV("brand-verifications", headers, rows);
    toast.success(`Exported ${sorted.length} records`);
  };

  const openUrlDrawer = () => {
    setUrlDraft(getCustomVerifyUrls());
    setUrlDrawer(true);
  };

  const saveUrl = (type: string) => {
    const updated = { ...urlDraft };
    saveCustomVerifyUrls(updated);
    setUrlSaved(type);
    toast.success("Verify URL saved");
    setTimeout(() => setUrlSaved(null), 2000);
  };

  const resetUrl = (type: string) => {
    resetVerifyUrl(type as any);
    const updated = { ...urlDraft };
    delete updated[type as keyof VerifyUrlMap];
    setUrlDraft(updated);
    toast.success("Reset to default URL");
  };

  // ── Tab buttons ───────────────────────────────────────────────────────────
  const tabs: { key: typeof tab; label: string; color?: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending", color: "#f59e0b" },
    { key: "verified", label: "Verified", color: "#10b981" },
    { key: "rejected", label: "Rejected", color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl text-[#1a1a2e]">Brand Verification</h1>
            {counts.pending > 0 && (
              <span className="px-2 py-0.5 bg-[#f59e0b] text-white rounded-full text-xs">
                {counts.pending} pending
              </span>
            )}
          </div>
          <p className="text-[#64748b] text-sm mt-1">
            Review brand registration numbers and approve or reject verification requests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openUrlDrawer}
            className="px-3 sm:px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#1a1a2e] rounded-xl flex items-center gap-2 hover:bg-[#f8f9fc] transition-colors text-sm"
          >
            <Link2 size={15} />
            <span className="hidden sm:inline">Manage Verify URLs</span>
          </button>
          <button
            onClick={handleExport}
            className="px-3 sm:px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#1a1a2e] rounded-xl flex items-center gap-2 hover:bg-[#f8f9fc] transition-colors text-sm"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", count: counts.all, icon: Building2, bg: "#EBF2FF", color: "#2F6BFF" },
          { label: "Pending", count: counts.pending, icon: Clock, bg: "#fffbeb", color: "#f59e0b" },
          { label: "Verified", count: counts.verified, icon: CheckCircle, bg: "#ecfdf5", color: "#10b981" },
          { label: "Rejected", count: counts.rejected, icon: XCircle, bg: "#fef2f2", color: "#ef4444" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#e2e8f0] rounded-xl p-4 flex items-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: s.bg }}
            >
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-[#94a3b8] text-xs">{s.label}</p>
              <p className="text-[#1a1a2e] text-xl">{s.count}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* How-to note for admin */}
      <div className="bg-[#EBF2FF] border border-[#2F6BFF]/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertCircle size={16} className="text-[#2F6BFF] shrink-0 mt-0.5" />
        <div className="text-sm text-[#2F6BFF]">
          <span className="font-medium">How to verify:</span> Click the{" "}
          <span className="underline">Verify Online</span> link next to a brand's registration number to open
          the official government portal. Confirm the number matches the company name, then Approve or Reject
          with a clear reason.
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl p-1 shrink-0 flex-wrap w-full sm:w-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                tab === t.key
                  ? "bg-white text-[#1a1a2e] shadow-sm border border-[#e2e8f0]"
                  : "text-[#64748b] hover:text-[#1a1a2e]"
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] text-white shrink-0"
                  style={{ background: t.color || "#94a3b8" }}
                >
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative flex-1 min-w-0 w-full sm:w-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand name, email or reg. number…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
          />
        </div>
        {/* Sort */}
        <div className="shrink-0 w-full sm:w-auto">
          <select
            className="w-full px-3 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] cursor-pointer"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="pending_first">Pending first</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name_az">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-xl py-16 flex flex-col items-center gap-3">
          <ShieldCheck size={40} className="text-[#e2e8f0]" />
          <p className="text-[#64748b] text-sm">No verification requests match your filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paged.map((v, idx) => {
            const typeOpt = getCompanyTypeOption(v.companyType);
            const isExpanded = expandedId === v.brandId;
            const initials = v.brandName
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();

            return (
              <motion.div
                key={v.brandId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${
                  v.status === "pending"
                    ? "border-[#f59e0b]/30"
                    : v.status === "verified"
                    ? "border-[#10b981]/20"
                    : v.status === "rejected"
                    ? "border-red-200"
                    : "border-[#e2e8f0]"
                }`}
              >
                {/* Main row */}
                <div className="p-3 sm:p-4 lg:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center text-[#2F6BFF] shrink-0 text-sm">
                        {initials}
                      </div>

                      {/* Brand info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#1a1a2e] text-sm">{v.brandName}</span>
                          {v.status === "verified" ? (
                            <VerifiedBadge size={15} />
                          ) : (
                            <StatusBadge status={v.status} />
                          )}
                        </div>
                        <p className="text-[#94a3b8] text-xs mt-0.5 truncate">{v.brandEmail}</p>
                      </div>

                      {/* Company type pill */}
                      <div className="shrink-0 hidden lg:block">
                        <CompanyTypePill type={v.companyType} />
                      </div>
                    </div>

                    {/* Reg number */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <code className="text-[#1a1a2e] text-xs sm:text-sm bg-[#f8f9fc] px-2 py-0.5 rounded-lg border border-[#e2e8f0]">
                        {v.registrationNumber}
                      </code>
                      <button
                        onClick={() => copyToClipboardFn(v.registrationNumber, v.brandId)}
                        className="text-[#94a3b8] hover:text-[#2F6BFF] transition-colors"
                        title="Copy"
                      >
                        {copiedId === v.brandId ? (
                          <Check size={13} className="text-[#10b981]" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                      {typeOpt?.verifyUrl && (
                        <a
                          href={getVerifyUrl(v.companyType)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2F6BFF] hover:underline text-xs flex items-center gap-0.5 whitespace-nowrap"
                          title="Verify online"
                        >
                          Verify Online <ExternalLink size={11} />
                        </a>
                      )}
                    </div>

                    {/* Submitted time */}
                    <div className="text-right shrink-0 hidden lg:block">
                      <p className="text-[#94a3b8] text-[11px]">Submitted</p>
                      <RelativeTime iso={v.submittedAt} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : v.brandId)}
                        className="text-xs text-[#64748b] hover:text-[#2F6BFF] transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#f8f9fc]"
                      >
                        <SlidersHorizontal size={12} />
                        {isExpanded ? "Hide" : "Details"}
                      </button>
                      {v.status === "pending" && (
                        <>
                          <button
                            onClick={() => { setRejectModal(v.brandId); setRejectReason(""); }}
                            className="px-2 sm:px-3 py-1.5 border border-red-200 text-[#ef4444] rounded-lg hover:bg-[#fef2f2] transition-colors text-xs flex items-center gap-1 whitespace-nowrap"
                          >
                            <XCircle size={13} /> <span className="hidden sm:inline">Reject</span>
                          </button>
                          <button
                            onClick={() => { setApproveModal(v.brandId); setAdminNotes(""); }}
                            className="px-2 sm:px-3 py-1.5 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-colors text-xs flex items-center gap-1 whitespace-nowrap"
                          >
                            <CheckCircle size={13} /> <span className="hidden sm:inline">Approve</span>
                          </button>
                        </>
                      )}
                      {v.status === "verified" && (
                        <span className="text-xs text-[#10b981] flex items-center gap-1 whitespace-nowrap">
                          <CheckCircle size={13} /> Verified {formatVerifDate(v.verifiedAt)}
                        </span>
                      )}
                      {v.status === "rejected" && (
                        <button
                          onClick={() => { setApproveModal(v.brandId); setAdminNotes(""); }}
                          className="px-2 sm:px-3 py-1.5 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-colors text-xs flex items-center gap-1 whitespace-nowrap"
                        >
                          <CheckCircle size={13} /> <span className="hidden sm:inline">Approve Anyway</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[#f1f5f9] bg-[#f8f9fc] px-5 py-4 space-y-3">
                        <div className="grid sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-[#94a3b8] text-xs mb-0.5">Company Type</p>
                            <p className="text-[#1a1a2e]">{typeOpt?.label ?? v.companyType}</p>
                            {typeOpt?.hint && (
                              <p className="text-[#94a3b8] text-xs mt-0.5">{typeOpt.hint}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[#94a3b8] text-xs mb-0.5">Registration Number</p>
                            <code className="text-[#1a1a2e]">{v.registrationNumber}</code>
                          </div>
                          <div>
                            <p className="text-[#94a3b8] text-xs mb-0.5">Submitted</p>
                            <p className="text-[#1a1a2e]">{formatVerifDate(v.submittedAt)}</p>
                          </div>
                          {v.status === "verified" && (
                            <>
                              <div>
                                <p className="text-[#94a3b8] text-xs mb-0.5">Verified On</p>
                                <p className="text-[#1a1a2e]">{formatVerifDate(v.verifiedAt)}</p>
                              </div>
                              <div>
                                <p className="text-[#94a3b8] text-xs mb-0.5">Verified By</p>
                                <p className="text-[#1a1a2e]">{v.verifiedBy || "Admin"}</p>
                              </div>
                              {v.adminNotes && (
                                <div className="sm:col-span-3">
                                  <p className="text-[#94a3b8] text-xs mb-0.5">Admin Notes</p>
                                  <p className="text-[#1a1a2e]">{v.adminNotes}</p>
                                </div>
                              )}
                            </>
                          )}
                          {v.status === "rejected" && (
                            <>
                              <div>
                                <p className="text-[#94a3b8] text-xs mb-0.5">Rejected On</p>
                                <p className="text-[#1a1a2e]">{formatVerifDate(v.rejectedAt)}</p>
                              </div>
                              <div className="sm:col-span-2">
                                <p className="text-[#94a3b8] text-xs mb-0.5">Rejection Reason</p>
                                <p className="text-[#ef4444]">{v.rejectionReason}</p>
                              </div>
                            </>
                          )}
                        </div>
                        {typeOpt?.verifyUrl && (
                          <a
                            href={getVerifyUrl(v.companyType)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#2F6BFF] hover:underline"
                          >
                            <ExternalLink size={12} />
                            Verify {v.registrationNumber} on official portal
                          </a>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
      {sorted.length > ROWS_PER_PAGE && (
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={sorted.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="requests" tableFooter={false} />
      )}

      {/* ── Approve Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {approveModal && (() => {
          const v = verifications.find((x) => x.brandId === approveModal);
          if (!v) return null;
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] flex items-center justify-center">
                      <CheckCircle size={20} className="text-[#10b981]" />
                    </div>
                    <div>
                      <h3 className="text-[#1a1a2e]">Approve Verification</h3>
                      <p className="text-xs text-[#94a3b8]">{v.brandName}</p>
                    </div>
                  </div>
                  <button onClick={() => setApproveModal(null)} className="text-[#94a3b8] hover:text-[#64748b]">
                    <X size={18} />
                  </button>
                </div>

                {/* Summary */}
                <div className="bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl p-4 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Brand</span>
                    <span className="text-[#1a1a2e]">{v.brandName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Type</span>
                    <span className="text-[#1a1a2e]">{getCompanyTypeOption(v.companyType)?.label}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[#94a3b8]">Reg. Number</span>
                    <div className="flex items-center gap-1.5">
                      <code className="text-[#1a1a2e] bg-white border border-[#e2e8f0] px-2 py-0.5 rounded-lg text-xs">
                        {v.registrationNumber}
                      </code>
                      {getCompanyTypeOption(v.companyType)?.verifyUrl && (
                        <a
                          href={getVerifyUrl(v.companyType)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2F6BFF] hover:underline text-xs flex items-center gap-0.5"
                        >
                          Verify <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="text-sm text-[#64748b] mb-1.5 block">
                    Admin Notes <span className="text-[#94a3b8]">(optional)</span>
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="e.g. Verified on MCA portal — CIN matches company name and status is Active."
                    rows={3}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] resize-none"
                  />
                </div>

                <p className="text-xs text-[#94a3b8] mb-4">
                  Approving will give {v.brandName} a{" "}
                  <VerifiedBadge size={12} className="inline" /> badge visible to all influencers.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setApproveModal(null)}
                    className="flex-1 px-4 py-2.5 border border-[#e2e8f0] text-[#64748b] rounded-xl hover:bg-[#f8f9fc] transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    className="flex-1 px-4 py-2.5 bg-[#10b981] text-white rounded-xl hover:bg-[#059669] transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <BadgeCheck size={15} />
                    Approve &amp; Verify
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Reject Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {rejectModal && (() => {
          const v = verifications.find((x) => x.brandId === rejectModal);
          if (!v) return null;
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center">
                      <XCircle size={20} className="text-[#ef4444]" />
                    </div>
                    <div>
                      <h3 className="text-[#1a1a2e]">Reject Verification</h3>
                      <p className="text-xs text-[#94a3b8]">{v.brandName}</p>
                    </div>
                  </div>
                  <button onClick={() => setRejectModal(null)} className="text-[#94a3b8] hover:text-[#64748b]">
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl px-4 py-3 mb-4 text-sm flex items-center gap-3">
                  <code className="text-[#1a1a2e] bg-white border border-[#e2e8f0] px-2 py-1 rounded-lg">
                    {v.registrationNumber}
                  </code>
                  <span className="text-[#94a3b8]">·</span>
                  <span className="text-[#64748b]">{getCompanyTypeOption(v.companyType)?.label}</span>
                </div>

                <div className="mb-2">
                  <label className="text-sm text-[#64748b] mb-1.5 block">
                    Rejection Reason <span className="text-[#ef4444]">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why the verification was rejected. The brand will see this reason and can correct + resubmit."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#ef4444]/20 focus:border-[#ef4444] resize-none"
                  />
                  <p className="text-xs text-[#94a3b8] mt-1">
                    Be specific — e.g. "GST number format is incorrect" or "CIN not found on MCA portal"
                  </p>
                </div>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setRejectModal(null)}
                    className="flex-1 px-4 py-2.5 border border-[#e2e8f0] text-[#64748b] rounded-xl hover:bg-[#f8f9fc] transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim()}
                    className="flex-1 px-4 py-2.5 bg-[#ef4444] text-white rounded-xl hover:bg-[#dc2626] transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Manage Verify URLs Drawer ─────────────────────────────────────── */}
      <AnimatePresence>
        {urlDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
                    <Settings size={17} className="text-[#2F6BFF]" />
                  </div>
                  <div>
                    <h2 className="text-[#1a1a2e]">Manage Verify URLs</h2>
                    <p className="text-xs text-[#94a3b8]">Custom redirect URLs for each company type</p>
                  </div>
                </div>
                <button
                  onClick={() => setUrlDrawer(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f8f9fc] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Info banner */}
              <div className="mx-6 mt-4 px-4 py-3 bg-[#EBF2FF] border border-[#2F6BFF]/20 rounded-xl flex gap-3 text-xs text-[#2F6BFF]">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>
                  These URLs open when admin clicks <strong>"Verify Online"</strong> next to a brand's registration number.
                  Leave blank to use the default government portal URL.
                </span>
              </div>

              {/* URL list */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                {/* India */}
                <p className="text-[10px] text-[#94a3b8] uppercase tracking-widest mb-3 mt-1">Indian Company Types</p>
                {COMPANY_TYPE_OPTIONS.filter((o) => o.group === "india").map((opt) => {
                  const defaultUrl = opt.verifyUrl;
                  const customVal = urlDraft[opt.value];
                  const currentVal = customVal ?? defaultUrl;
                  const isCustomised = customVal !== undefined && customVal !== defaultUrl;

                  return (
                    <div key={opt.value} className="bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[#1a1a2e]">{opt.label}</p>
                          <p className="text-[11px] text-[#94a3b8]">{opt.hint}</p>
                        </div>
                        {isCustomised && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF2FF] text-[#2F6BFF] border border-[#2F6BFF]/20 shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={currentVal}
                          onChange={(e) => setUrlDraft((d) => ({ ...d, [opt.value]: e.target.value }))}
                          placeholder={defaultUrl || "https://…"}
                          className="flex-1 min-w-0 px-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-lg text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                        />
                        {/* Save */}
                        <button
                          onClick={() => saveUrl(opt.value)}
                          title="Save"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2F6BFF] text-white hover:bg-[#2356d8] transition-colors shrink-0"
                        >
                          {urlSaved === opt.value ? <Check size={13} /> : <Check size={13} />}
                        </button>
                        {/* Reset to default */}
                        {isCustomised && (
                          <button
                            onClick={() => resetUrl(opt.value)}
                            title="Reset to default"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#94a3b8] hover:text-[#ef4444] hover:border-red-200 transition-colors shrink-0"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                        {/* Open link */}
                        {currentVal && (
                          <a
                            href={currentVal}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open URL"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:text-[#2F6BFF] hover:border-[#2F6BFF]/30 transition-colors shrink-0"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      {defaultUrl && isCustomised && (
                        <p className="text-[10px] text-[#94a3b8] flex items-center gap-1">
                          Default: <span className="text-[#64748b] truncate">{defaultUrl}</span>
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Foreign */}
                <p className="text-[10px] text-[#94a3b8] uppercase tracking-widest mb-3 mt-5">Foreign Company Types</p>
                {COMPANY_TYPE_OPTIONS.filter((o) => o.group === "foreign").map((opt) => {
                  const defaultUrl = opt.verifyUrl;
                  const customVal = urlDraft[opt.value];
                  const currentVal = customVal ?? defaultUrl;
                  const isCustomised = customVal !== undefined && customVal !== defaultUrl;

                  return (
                    <div key={opt.value} className="bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[#1a1a2e]">{opt.label}</p>
                          <p className="text-[11px] text-[#94a3b8]">{opt.hint}</p>
                        </div>
                        {isCustomised && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF2FF] text-[#2F6BFF] border border-[#2F6BFF]/20 shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={currentVal}
                          onChange={(e) => setUrlDraft((d) => ({ ...d, [opt.value]: e.target.value }))}
                          placeholder="https://… (optional for foreign types)"
                          className="flex-1 min-w-0 px-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-lg text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                        />
                        <button
                          onClick={() => saveUrl(opt.value)}
                          title="Save"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2F6BFF] text-white hover:bg-[#2356d8] transition-colors shrink-0"
                        >
                          <Check size={13} />
                        </button>
                        {isCustomised && (
                          <button
                            onClick={() => resetUrl(opt.value)}
                            title="Reset to default"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#94a3b8] hover:text-[#ef4444] hover:border-red-200 transition-colors shrink-0"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                        {currentVal && (
                          <a
                            href={currentVal}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open URL"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:text-[#2F6BFF] hover:border-[#2F6BFF]/30 transition-colors shrink-0"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      {defaultUrl && isCustomised && (
                        <p className="text-[10px] text-[#94a3b8] flex items-center gap-1">
                          Default: <span className="text-[#64748b] truncate">{defaultUrl}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-between gap-3">
                <p className="text-xs text-[#94a3b8]">Changes save per URL — no bulk save needed</p>
                <button
                  onClick={() => setUrlDrawer(false)}
                  className="px-5 py-2.5 bg-[#1a1a2e] text-white rounded-xl text-sm hover:bg-[#2d2d4e] transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}