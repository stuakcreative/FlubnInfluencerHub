import { Handshake, Clock, CheckCircle, XCircle, Download, Filter, Search, MessageSquare, AlertCircle, Check, ChevronDown, ChevronUp, Send, Share2, ShieldCheck, BadgeCheck, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "../../utils/export-csv";
import { useCollaboration } from "../../context/CollaborationContext";
import { isBrandVerified } from "../../utils/brandVerification";
import { isInfluencerVerified } from "../../utils/influencerVerification";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { Pagination } from "../../components/Pagination";
import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";

export default function AdminCollaborations() {
  const { requests } = useCollaboration();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // Auto-expand and highlight a collaboration when navigating from a notification
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (id) {
      setExpandedId(id);
      setHighlightId(id);
      setStatusFilter("all");
      setTimeout(() => setHighlightId(null), 2500);
      // Silently clean URL without touching React Router history
      window.history.replaceState(null, "", location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = requests.filter((c) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchSearch =
      c.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.influencerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.campaignName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const getStatusIcon = (status: string) => {
    if (status === "accepted") return <CheckCircle size={14} className="text-[#10b981]" />;
    if (status === "rejected") return <XCircle size={14} className="text-[#ef4444]" />;
    return <Clock size={14} className="text-[#f59e0b]" />;
  };

  const handleExport = () => {
    const headers = ["Brand", "Influencer", "Campaign", "Budget", "Status", "Date", "Accept Comment", "Rejection Reason", "Brand Reply"];
    const rows = filtered.map((c) => [
      c.brandName,
      c.influencerName || "N/A",
      c.campaignName,
      `${c.budget}`,
      c.status,
      c.sentDate || c.timeline || "",
      c.acceptComment || "",
      c.rejectionComment || "",
      c.brandReply || "",
    ]);
    exportToCSV("collaborations", headers, rows);
    toast.success(`Exported ${filtered.length} collaborations`);
  };

  const totalBudget = filtered.reduce((sum, c) => sum + c.budget, 0);

  const hasComments = (req: typeof requests[0]) =>
    (req.status === "accepted" && req.acceptComment) ||
    (req.status === "rejected" && req.rejectionComment) ||
    req.brandReply;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Collaborations</h1>
          <p className="text-[#64748b] text-sm mt-1">Monitor all platform collaborations.</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#1a1a2e] rounded-xl flex items-center gap-2 hover:bg-[#f8f9fc] transition-colors text-sm"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Total", value: requests.length, color: "#2F6BFF", bg: "#EBF2FF" },
          { label: "Pending", value: requests.filter((c) => c.status === "pending").length, color: "#f59e0b", bg: "#fffbeb" },
          { label: "Accepted", value: requests.filter((c) => c.status === "accepted").length, color: "#10b981", bg: "#ecfdf5" },
          { label: "Rejected", value: requests.filter((c) => c.status === "rejected").length, color: "#ef4444", bg: "#fef2f2" },
          { label: "Total Budget", value: totalBudget, color: "#8b5cf6", bg: "#faf5ff" },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-[#e2e8f0] p-4 text-center"
          >
            <p className="text-2xl text-[#1a1a2e]">{stat.label === "Total Budget" ? (() => { const v = stat.value as number; if (v >= 1e7) return `\u20b9${(v / 1e7).toFixed(2)} Cr`; if (v >= 1e5) return `\u20b9${(v / 1e5).toFixed(2)} L`; if (v >= 1e3) return `\u20b9${(v / 1e3).toFixed(1)}K`; return `\u20b9${v.toLocaleString("en-IN")}`; })() : stat.value}</p>
            <p className="text-xs text-[#64748b] mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brand, influencer, campaign..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[14px] text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[#64748b]">
          <Filter size={15} />
        </div>
        <div className="flex gap-1 bg-white border border-[#e2e8f0] rounded-xl p-1">
          {["all", "pending", "accepted", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                statusFilter === status
                  ? "bg-[#2F6BFF] text-white"
                  : "text-[#64748b] hover:bg-[#f8f9fc]"
              }`}
            >
              {status === "all" ? "All" : status}
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
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Influencer</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Campaign</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Budget</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Status</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Messages</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {paged.flatMap((collab) => {
                const rows = [
                  <tr key={collab.id} className={`hover:bg-[#f8f9fc] transition-all duration-500 ${highlightId === collab.id ? "ring-2 ring-inset ring-[#2F6BFF] bg-[#EBF2FF]/40" : ""}`}>
                    <td className="px-6 py-4 text-[#1a1a2e] text-sm">
                      <div className="flex items-center gap-1.5">
                        {collab.brandName}
                        {collab.brandId && isBrandVerified(collab.brandId) && <VerifiedBadge size={13} />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#1a1a2e] text-sm">
                      <div className="flex items-center gap-1.5">
                        {collab.influencerName || "N/A"}
                        {collab.influencerId && isInfluencerVerified(collab.influencerId) && <VerifiedBadge size={13} />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#64748b] text-sm">{collab.campaignName}</td>
                    <td className="px-6 py-4 text-[#1a1a2e] text-sm">{"\u20b9"}{collab.budget.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${
                          collab.status === "accepted" ? "bg-[#ecfdf5] text-[#10b981]" :
                          collab.status === "rejected" ? "bg-[#fef2f2] text-[#ef4444]" :
                          "bg-[#fffbeb] text-[#f59e0b]"
                        }`}>
                          {getStatusIcon(collab.status)}
                          {collab.status.charAt(0).toUpperCase() + collab.status.slice(1)}
                        </span>
                        {/* Contact share pill */}
                        {collab.contactShareStatus === "shared" && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded-full">
                            <ShieldCheck size={9} /> Contacts shared
                          </span>
                        )}
                        {/* Price settled pill */}
                        {collab.priceSettled && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#2F6BFF] bg-[#EBF2FF] px-2 py-0.5 rounded-full">
                            <BadgeCheck size={9} /> ₹{collab.settledPrice?.toLocaleString()} agreed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {hasComments(collab) ? (
                        <button
                          onClick={() => setExpandedId(expandedId === collab.id ? null : collab.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                            expandedId === collab.id
                              ? "bg-[#EBF2FF] text-[#2F6BFF]"
                              : "bg-[#f8f9fc] text-[#64748b] hover:bg-[#EBF2FF] hover:text-[#2F6BFF]"
                          }`}
                        >
                          <MessageSquare size={12} />
                          {expandedId === collab.id ? "Hide" : "View"}
                          {expandedId === collab.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      ) : (
                        <span className="text-xs text-[#b0b8c9]">No messages</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#64748b]">{collab.sentDate || collab.timeline}</td>
                  </tr>
                ];

                // Expandable comment row
                if (expandedId === collab.id && hasComments(collab)) {
                  rows.push(
                    <tr key={`${collab.id}-comments`}>
                      <td colSpan={7} className="px-6 py-0">
                        <AnimatePresence>
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="py-4 space-y-3">
                              {/* Accept comment from influencer */}
                              {collab.status === "accepted" && collab.acceptComment && (
                                <div className="bg-[#ecfdf5] border border-[#d1fae5] rounded-xl p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#10b981] flex items-center justify-center shrink-0">
                                      <Check size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm text-[#10b981]">Influencer's Acceptance Message</p>
                                        <span className="text-[10px] text-[#64748b] bg-white/60 px-2 py-0.5 rounded-full">
                                          {collab.influencerName || "Influencer"}
                                        </span>
                                      </div>
                                      <p className="text-sm text-[#64748b]">{collab.acceptComment}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Rejection comment from influencer */}
                              {collab.status === "rejected" && collab.rejectionComment && (
                                <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#ef4444] flex items-center justify-center shrink-0">
                                      <AlertCircle size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm text-[#ef4444]">Rejection Reason</p>
                                        <span className="text-[10px] text-[#64748b] bg-white/60 px-2 py-0.5 rounded-full">
                                          {collab.influencerName || "Influencer"}
                                        </span>
                                      </div>
                                      <p className="text-sm text-[#64748b]">{collab.rejectionComment}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Brand reply */}
                              {collab.brandReply && (
                                <div className="bg-[#EBF2FF] border border-[#c7dbff] rounded-xl p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#2F6BFF] flex items-center justify-center shrink-0">
                                      <Send size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm text-[#2F6BFF]">Brand's Reply</p>
                                        <span className="text-[10px] text-[#64748b] bg-white/60 px-2 py-0.5 rounded-full">
                                          {collab.brandName}
                                        </span>
                                      </div>
                                      <p className="text-sm text-[#64748b]">{collab.brandReply}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Price negotiation summary */}
                              {collab.status === "accepted" && collab.pendingPriceRequest && (
                                <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#f59e0b] flex items-center justify-center shrink-0">
                                      <IndianRupee size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm text-[#92400e]">Price Negotiation</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                          collab.priceSettled ? "bg-[#ecfdf5] text-[#10b981]" :
                                          collab.pendingPriceRequest.status === "pending" ? "bg-[#fffbeb] text-[#f59e0b]" :
                                          "bg-[#fef2f2] text-[#ef4444]"
                                        }`}>
                                          {collab.priceSettled ? "Agreed" : collab.pendingPriceRequest.status}
                                        </span>
                                      </div>
                                      <p className="text-xs text-[#64748b]">
                                        Requested: ₹{collab.pendingPriceRequest.amount.toLocaleString()} · 
                                        Round {collab.negotiationRound ?? 0}/3 · 
                                        Original: ₹{collab.budget.toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </td>
                    </tr>
                  );
                }

                return rows;
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#94a3b8] text-sm">
                    No collaborations match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="collaborations" />
      </div>
    </div>
  );
}