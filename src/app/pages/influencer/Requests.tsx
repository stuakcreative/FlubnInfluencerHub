import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, X, Eye, Mail, Phone, Clock, DollarSign,
  ChevronDown, ChevronUp, MessageSquare, Send,
  MessageCircle, Share2, ShieldCheck, ShieldX, Handshake,
  Search, ArrowUpDown, SlidersHorizontal,
} from "lucide-react";
import { Pagination } from "../../components/Pagination";
import { useCollaboration } from "../../context/CollaborationContext";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { isBrandVerified } from "../../utils/brandVerification";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import type { ContactShareStatus } from "../../context/CollaborationContext";
import { getUnreadCount } from "../../utils/chatReadState";
import { isBrandOnFreePlan } from "../../utils/brandSubscription";

type RequestStatus = "pending" | "accepted" | "rejected";

export default function InfluencerRequests() {
  const { requests: allRequests, updateRequestStatus, requestContactShare, respondToContactShare } = useCollaboration();
  const { user } = useAuth();

  // Only show requests targeted at this influencer
  const requests = allRequests.filter((r) => r.influencerId === user?.id);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Search / filter / sort ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [budgetMin, setBudgetMin] = useState<string>("");
  const [budgetMax, setBudgetMax] = useState<string>("");
  const [hasChatOnly, setHasChatOnly] = useState(false);
  const [contactFilter, setContactFilter] = useState<string>("any"); // "any" | "shared" | "pending" | "none"

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null);
  const [acceptComment, setAcceptComment] = useState("");

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const openChat = (id: string) => {
    navigate(`/influencer/chats?id=${id}`);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chatId = params.get("chat");
    const hlId = params.get("highlight");
    if (chatId) {
      navigate(`/influencer/chats?id=${chatId}`, { replace: true });
    }
    if (hlId) {
      setHighlightId(hlId);
      setExpandedId(hlId);
      setTimeout(() => setHighlightId(null), 2500);
      window.history.replaceState(null, "", location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = (id: string, action: RequestStatus) => {
    if (action === "rejected") { setRejectingRequestId(id); setShowRejectModal(true); return; }
    if (action === "accepted") { setAcceptingRequestId(id); setShowAcceptModal(true); return; }
  };

  const confirmAccept = () => {
    const req = requests.find((r) => r.id === acceptingRequestId);
    if (acceptingRequestId) {
      updateRequestStatus(acceptingRequestId, "accepted", acceptComment.trim() || undefined);
      toast.success(`Collaboration with ${req?.brandName} accepted!`, {
        description: "Chat is now unlocked. You can message them directly.",
      });
    }
    setShowAcceptModal(false);
    setAcceptingRequestId(null);
    setAcceptComment("");
  };

  const confirmReject = () => {
    if (!rejectionComment.trim()) { toast.error("Please provide a reason for rejection"); return; }
    const req = requests.find((r) => r.id === rejectingRequestId);
    if (rejectingRequestId) {
      updateRequestStatus(rejectingRequestId, "rejected", rejectionComment.trim());
      toast.error(`Collaboration with ${req?.brandName} declined`, {
        description: "The brand has been notified.",
      });
    }
    setShowRejectModal(false);
    setRejectingRequestId(null);
    setRejectionComment("");
  };

  // ── Contact share helpers ──────────────────────────────────────────────────

  const handleRequestContact = (reqId: string) => {
    requestContactShare(reqId, "influencer", user?.email, user?.phone);
    toast.success("Contact share request sent!", {
      description: "The brand will be notified and must consent before contacts are revealed.",
    });
  };

  const handleRespondToContactShare = (reqId: string, action: "accept" | "decline") => {
    respondToContactShare(reqId, action, user?.email, user?.phone);
    if (action === "accept") {
      toast.success("Contact details shared! ✅", {
        description: "Both you and the brand can now see each other's contact info.",
      });
    } else {
      toast("Contact sharing declined.", { description: "The brand has been notified." });
    }
  };

  // ── Contact share status UI ────────────────────────────────────────────────

  const ContactShareSection = ({ req }: { req: typeof requests[0] }) => {
    const status: ContactShareStatus = req.contactShareStatus ?? "none";

    if (req.status !== "accepted") return null;

    // Brand initiated a share request — influencer must consent
    if (status === "brand_requested") {
      return (
        <div className="bg-[#EBF2FF] border border-[#c7dbff] rounded-xl p-4 mt-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2F6BFF] flex items-center justify-center shrink-0">
              <Share2 size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#1e40af]">
                <strong>{req.brandName}</strong> wants to share contact details with you
              </p>
              <p className="text-xs text-[#64748b] mt-0.5">
                Both parties' details will only be revealed after you consent.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleRespondToContactShare(req.id, "accept")}
                  className="flex-1 py-2 bg-[#2F6BFF] text-white text-xs rounded-lg flex items-center justify-center gap-1.5 hover:bg-[#1e5ae0] transition-colors"
                >
                  <ShieldCheck size={13} /> Share My Contact
                </button>
                <button
                  onClick={() => handleRespondToContactShare(req.id, "decline")}
                  className="flex-1 py-2 bg-white border border-[#e2e8f0] text-[#64748b] text-xs rounded-lg flex items-center justify-center gap-1.5 hover:bg-[#fef2f2] hover:text-[#ef4444] transition-colors"
                >
                  <ShieldX size={13} /> Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Influencer already requested — waiting for brand
    if (status === "influencer_requested") {
      return (
        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-3 mt-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center shrink-0">
            <Clock size={13} className="text-[#f59e0b]" />
          </div>
          <div>
            <p className="text-xs text-[#92400e]">Contact request sent — waiting for brand's consent</p>
            <p className="text-[10px] text-[#78350f]">You'll see their contact details once they agree</p>
          </div>
        </div>
      );
    }

    // Shared — contact info already shown in the row
    if (status === "shared") {
      return null;
    }

    // Declined
    if (status === "declined") {
      return (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 mt-3 flex items-center gap-2.5">
          <ShieldX size={14} className="text-[#ef4444] shrink-0" />
          <div>
            <p className="text-xs text-[#ef4444]">Contact sharing was declined</p>
            <button
              onClick={() => handleRequestContact(req.id)}
              className="text-[10px] text-[#2F6BFF] hover:underline mt-0.5"
            >
              Send a new request
            </button>
          </div>
        </div>
      );
    }

    // None — offer to request brand contact
    return (
      <div className="mt-3 pt-3 border-t border-[#f1f5f9]">
        <p className="text-xs text-[#94a3b8] mb-2">
          Want to communicate outside the platform?
        </p>
        {(() => {
          const activeWithBrand =
            !!req.brandId &&
            requests.some(
              (r) =>
                r.id !== req.id &&
                r.brandId === req.brandId &&
                !!r.contactShareStatus &&
                r.contactShareStatus !== "none" &&
                r.contactShareStatus !== "declined"
            );
          return activeWithBrand ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[#f59e0b] bg-[#fffbeb] border border-[#fde68a] rounded-lg cursor-default select-none">
              <Clock size={12} className="shrink-0" />
              <span>Contact already requested for this brand</span>
            </div>
          ) : (
            <button
              onClick={() => handleRequestContact(req.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[#2F6BFF] bg-[#EBF2FF] border border-[#c7dbff] rounded-lg hover:bg-[#dbeafe] transition-colors"
            >
              <Share2 size={12} /> Request Contact Details
            </button>
          );
        })()}
      </div>
    );
  };

  const getStatusBadge = (status: RequestStatus) => {
    const styles = {
      pending: "bg-[#fffbeb] text-[#f59e0b]",
      accepted: "bg-[#ecfdf5] text-[#10b981]",
      rejected: "bg-[#fef2f2] text-[#ef4444]",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const filteredRequests = requests
    .filter((req) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        req.brandName?.toLowerCase().includes(q) ||
        req.campaignName?.toLowerCase().includes(q) ||
        req.deliverables?.toLowerCase().includes(q) ||
        false;
      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      const matchesBudget =
        (!budgetMin || req.budget >= parseFloat(budgetMin)) &&
        (!budgetMax || req.budget <= parseFloat(budgetMax));
      const matchesChat = !hasChatOnly || (req.chatMessages?.length ?? 0) > 0;
      const matchesContact =
        contactFilter === "any" ||
        (contactFilter === "shared" && req.contactShareStatus === "shared") ||
        (contactFilter === "pending" && req.contactShareStatus === "brand_requested") ||
        (contactFilter === "none" && req.contactShareStatus === "none");
      return matchesSearch && matchesStatus && matchesBudget && matchesChat && matchesContact;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.sentDate || "").getTime() - new Date(a.sentDate || "").getTime();
      if (sortBy === "oldest") return new Date(a.sentDate || "").getTime() - new Date(b.sentDate || "").getTime();
      if (sortBy === "budget-high") return b.budget - a.budget;
      if (sortBy === "budget-low") return a.budget - b.budget;
      return 0;
    });

  const statusCounts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    accepted: requests.filter((r) => r.status === "accepted").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (searchQuery ? 1 : 0) + (sortBy !== "newest" ? 1 : 0) + (budgetMin || budgetMax ? 1 : 0) + (hasChatOnly ? 1 : 0) + (contactFilter !== "any" ? 1 : 0);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, sortBy, budgetMin, budgetMax, hasChatOnly, contactFilter]);

  // Smooth scroll to top on page change (improves mobile UX)
  useEffect(() => {
    if (currentPage > 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ROWS_PER_PAGE));
  const pagedRequests = filteredRequests.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // ── Budget spin helpers ────────────────────────────────────────────────────
  const stepBudget = (setter: (v: string) => void, current: string, dir: 1 | -1) => {
    const val = parseInt(current) || 0;
    const next = Math.max(0, val + dir * 1000);
    setter(String(next));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Collaboration Requests</h1>
        <p className="text-[#64748b] text-sm mt-1">Manage incoming brand collaboration requests.</p>
      </div>

      {/* ── Search + Filter + Sort bar ───────────────────────────────────── */}
      <div className="space-y-3">
        {/* Row 1: search + filter toggle + sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by brand or campaign…"
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#1a1a2e] transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {/* Sort */}
          <div className="relative">
            <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-8 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] cursor-pointer appearance-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="budget-high">Budget: High → Low</option>
              <option value="budget-low">Budget: Low → High</option>
            </select>
          </div>
          {/* Filter toggle (mobile: expands panel) */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-[#EBF2FF] border-[#2F6BFF]/40 text-[#2F6BFF]"
                : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#2F6BFF]/30"
            }`}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#2F6BFF] text-white text-[10px] flex items-center justify-center shrink-0">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Filter popup modal ─────────────────────────────────────────── */}
        <AnimatePresence>
          {showFilters && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              />
              {/* Modal card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              >
                <div
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#EBF2FF] flex items-center justify-center">
                        <SlidersHorizontal size={15} className="text-[#2F6BFF]" />
                      </div>
                      <div>
                        <h3 className="text-sm text-[#1a1a2e]">Advanced Filters</h3>
                        {activeFilterCount > 0 && (
                          <p className="text-[10px] text-[#2F6BFF]">{activeFilterCount} active · {filteredRequests.length} result{filteredRequests.length !== 1 ? "s" : ""}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="w-8 h-8 rounded-lg bg-[#f8f9fc] flex items-center justify-center text-[#94a3b8] hover:text-[#1a1a2e] hover:bg-[#f1f5f9] transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

                    {/* ── Budget Range ── */}
                    <div>
                      <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <DollarSign size={11} className="text-[#2F6BFF]" /> Budget Range
                      </p>
                      <div className="flex items-center gap-3">

                        {/* Min input with custom blue spinners */}
                        <div className="relative flex-1 group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2F6BFF] text-sm z-10 pointer-events-none">₹</span>
                          <input
                            type="number"
                            value={budgetMin}
                            onChange={(e) => setBudgetMin(e.target.value)}
                            placeholder="Min"
                            min={0}
                            className="w-full pl-7 pr-7 py-2.5 bg-[#EBF2FF] border border-[#2F6BFF]/30 rounded-xl text-[#1a1a2e] text-sm placeholder:text-[#2F6BFF]/40 focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          {/* Custom blue up/down buttons — visible on hover only */}
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button
                              type="button"
                              onClick={() => stepBudget(setBudgetMin, budgetMin, 1)}
                              className="w-[16px] h-[13px] bg-[#2F6BFF] hover:bg-[#1e5ae0] active:bg-[#1a4fd0] rounded-t flex items-center justify-center text-white transition-colors"
                            >
                              <ChevronUp size={8} strokeWidth={3} />
                            </button>
                            <button
                              type="button"
                              onClick={() => stepBudget(setBudgetMin, budgetMin, -1)}
                              className="w-[16px] h-[13px] bg-[#2F6BFF] hover:bg-[#1e5ae0] active:bg-[#1a4fd0] rounded-b flex items-center justify-center text-white transition-colors"
                            >
                              <ChevronDown size={8} strokeWidth={3} />
                            </button>
                          </div>
                        </div>

                        <div className="w-5 h-px bg-[#2F6BFF]/20 shrink-0" />

                        {/* Max input with custom blue spinners */}
                        <div className="relative flex-1 group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2F6BFF] text-sm z-10 pointer-events-none">₹</span>
                          <input
                            type="number"
                            value={budgetMax}
                            onChange={(e) => setBudgetMax(e.target.value)}
                            placeholder="Max"
                            min={0}
                            className="w-full pl-7 pr-7 py-2.5 bg-[#EBF2FF] border border-[#2F6BFF]/30 rounded-xl text-[#1a1a2e] text-sm placeholder:text-[#2F6BFF]/40 focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          {/* Custom blue up/down buttons — visible on hover only */}
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <button
                              type="button"
                              onClick={() => stepBudget(setBudgetMax, budgetMax, 1)}
                              className="w-[16px] h-[13px] bg-[#2F6BFF] hover:bg-[#1e5ae0] active:bg-[#1a4fd0] rounded-t flex items-center justify-center text-white transition-colors"
                            >
                              <ChevronUp size={8} strokeWidth={3} />
                            </button>
                            <button
                              type="button"
                              onClick={() => stepBudget(setBudgetMax, budgetMax, -1)}
                              className="w-[16px] h-[13px] bg-[#2F6BFF] hover:bg-[#1e5ae0] active:bg-[#1a4fd0] rounded-b flex items-center justify-center text-white transition-colors"
                            >
                              <ChevronDown size={8} strokeWidth={3} />
                            </button>
                          </div>
                        </div>

                        {(budgetMin || budgetMax) && (
                          <button
                            onClick={() => { setBudgetMin(""); setBudgetMax(""); }}
                            className="w-8 h-8 rounded-lg bg-[#fef2f2] flex items-center justify-center text-[#ef4444] hover:bg-[#fee2e2] transition-colors shrink-0"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      {/* Quick presets */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {[
                          { label: "Under ₹10K", min: "", max: "10000" },
                          { label: "₹10K–₹50K", min: "10000", max: "50000" },
                          { label: "₹50K–₹1L", min: "50000", max: "100000" },
                          { label: "₹1L+", min: "100000", max: "" },
                        ].map((p) => (
                          <button
                            key={p.label}
                            onClick={() => { setBudgetMin(p.min); setBudgetMax(p.max); }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
                              budgetMin === p.min && budgetMax === p.max
                                ? "bg-[#EBF2FF] border-[#2F6BFF]/40 text-[#2F6BFF]"
                                : "bg-[#f8f9fc] border-[#e2e8f0] text-[#64748b] hover:border-[#2F6BFF]/30"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-[#f1f5f9]" />

                    {/* ── Contact Status ── */}
                    <div>
                      <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Share2 size={11} className="text-[#2F6BFF]" /> Contact Status
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "any", label: "Any", icon: "🔍", desc: "All requests" },
                          { value: "shared", label: "Shared", icon: "✅", desc: "Contacts visible" },
                          { value: "pending", label: "Awaiting", icon: "⏳", desc: "Consent needed" },
                          { value: "none", label: "Not requested", icon: "🔒", desc: "Not initiated" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setContactFilter(opt.value)}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                              contactFilter === opt.value
                                ? "bg-[#EBF2FF] border-[#2F6BFF]/40 shadow-sm"
                                : "bg-[#f8f9fc] border-[#e2e8f0] hover:border-[#2F6BFF]/30 hover:bg-white"
                            }`}
                          >
                            <span className="text-base leading-none mt-0.5">{opt.icon}</span>
                            <div>
                              <p className={`text-xs ${contactFilter === opt.value ? "text-[#2F6BFF]" : "text-[#1a1a2e]"}`}>{opt.label}</p>
                              <p className="text-[10px] text-[#94a3b8] mt-0.5">{opt.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-[#f1f5f9]" />

                    {/* ── Quick Filters ── */}
                    <div>
                      <p className="text-xs text-[#94a3b8] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <MessageCircle size={11} className="text-[#2F6BFF]" /> Quick Filters
                      </p>
                      <button
                        onClick={() => setHasChatOnly((v) => !v)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                          hasChatOnly
                            ? "bg-[#EBF2FF] border-[#2F6BFF]/40"
                            : "bg-[#f8f9fc] border-[#e2e8f0] hover:border-[#2F6BFF]/30 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <MessageCircle size={15} className={hasChatOnly ? "text-[#2F6BFF]" : "text-[#94a3b8]"} />
                          <div className="text-left">
                            <p className={`text-sm ${hasChatOnly ? "text-[#2F6BFF]" : "text-[#1a1a2e]"}`}>Has chat messages</p>
                            <p className="text-[10px] text-[#94a3b8]">Only show requests with active chat</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${hasChatOnly ? "bg-[#2F6BFF] border-[#2F6BFF]" : "border-[#cbd5e1] bg-white"}`}>
                          {hasChatOnly && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-4 border-t border-[#f1f5f9] flex items-center gap-3">
                    <button
                      onClick={() => { setBudgetMin(""); setBudgetMax(""); setHasChatOnly(false); setContactFilter("any"); }}
                      className="flex-1 py-2.5 text-sm text-[#64748b] bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl hover:bg-[#f1f5f9] transition-colors"
                    >
                      Reset Filters
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="flex-1 py-2.5 text-sm text-white rounded-xl transition-colors"
                      style={{ background: "linear-gradient(135deg, #2F6BFF 0%, #0F3D91 100%)" }}
                    >
                      Apply · {filteredRequests.length} result{filteredRequests.length !== 1 ? "s" : ""}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Row 2: status tabs — always visible */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
          {([
            { label: "All", value: "all", activeColor: "border-[#2F6BFF] bg-[#EBF2FF] text-[#2F6BFF]" },
            { label: "Pending", value: "pending", activeColor: "border-[#f59e0b] bg-[#fffbeb] text-[#f59e0b]" },
            { label: "Accepted", value: "accepted", activeColor: "border-[#10b981] bg-[#ecfdf5] text-[#10b981]" },
            { label: "Rejected", value: "rejected", activeColor: "border-[#ef4444] bg-[#fef2f2] text-[#ef4444]" },
          ] as const).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm border transition-all whitespace-nowrap ${
                statusFilter === tab.value
                  ? tab.activeColor
                  : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2F6BFF]/30"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${
                statusFilter === tab.value ? "bg-current/10" : "bg-[#f1f5f9] text-[#94a3b8]"
              }`}>
                {statusCounts[tab.value]}
              </span>
            </button>
          ))}
          {/* Clear all filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSearchQuery(""); setStatusFilter("all"); setSortBy("newest"); setBudgetMin(""); setBudgetMax(""); setHasChatOnly(false); setContactFilter("any"); }}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs text-[#ef4444] bg-[#fef2f2] border border-[#fecaca] rounded-xl hover:bg-[#fee2e2] transition-colors whitespace-nowrap"
            >
              <X size={11} /> Clear all
            </button>
          )}
        </div>

        {/* Results count */}
        {(searchQuery || statusFilter !== "all") && (
          <p className="text-xs text-[#94a3b8]">
            Showing <span className="text-[#1a1a2e]">{filteredRequests.length}</span> of {requests.length} requests
          </p>
        )}
      </div>

      {/* Pending contact consent notifications (sticky alerts) */}
      {requests
        .filter((r) => r.contactShareStatus === "brand_requested" && r.status === "accepted")
        .map((r) => (
          <motion.div
            key={`alert-${r.id}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#EBF2FF] border border-[#2F6BFF]/30 rounded-xl p-4 flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-[#2F6BFF] flex items-center justify-center shrink-0">
              <Share2 size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#1e40af]">
                <strong>{r.brandName}</strong> wants to share contact details for <em>{r.campaignName}</em>
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleRespondToContactShare(r.id, "accept")}
                  className="px-3 py-1.5 bg-[#2F6BFF] text-white text-xs rounded-lg flex items-center gap-1.5 hover:bg-[#1e5ae0] transition-colors"
                >
                  <ShieldCheck size={12} /> Share My Contact
                </button>
                <button
                  onClick={() => handleRespondToContactShare(r.id, "decline")}
                  className="px-3 py-1.5 bg-white border border-[#e2e8f0] text-[#64748b] text-xs rounded-lg hover:bg-[#fef2f2] hover:text-[#ef4444] transition-colors"
                >
                  <ShieldX size={12} /> Decline
                </button>
              </div>
            </div>
          </motion.div>
        ))}

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f8f9fc] border-b border-[#e2e8f0]">
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Brand</th>
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Campaign</th>
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Budget</th>
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Timeline</th>
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Status</th>
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Contacts</th>
              <th className="text-right px-6 py-4 text-sm text-[#64748b]">Actions</th>
            </tr>
          </thead>
          {filteredRequests.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] flex items-center justify-center">
                      <Search size={24} className="text-[#94a3b8]" />
                    </div>
                    <p className="text-[#1a1a2e] text-sm">No requests found</p>
                    <p className="text-[#94a3b8] text-xs">Try adjusting your search or filters</p>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => { setSearchQuery(""); setStatusFilter("all"); setSortBy("newest"); setBudgetMin(""); setBudgetMax(""); setHasChatOnly(false); setContactFilter("any"); }}
                        className="text-xs text-[#2F6BFF] hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          ) : (
            pagedRequests.map((req) => (
              <tbody key={req.id} className="divide-y divide-[#e2e8f0]">
                <tr className={`hover:bg-[#f8f9fc] transition-all duration-500 ${highlightId === req.id ? "ring-2 ring-inset ring-[#2F6BFF] bg-[#EBF2FF]/40" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg text-white flex items-center justify-center text-xs" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}>
                        {req.brandLogo}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#1a1a2e]">{req.brandName}</span>
                        {req.brandId && isBrandVerified(req.brandId) && <VerifiedBadge size={15} />}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#1a1a2e]">{req.campaignName}</td>
                  <td className="px-6 py-4 text-[#1a1a2e]">₹{req.budget.toLocaleString()}</td>
                  <td className="px-6 py-4 text-[#64748b] text-sm">{req.timeline}</td>
                  <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                  <td className="px-6 py-4">
                    {req.status !== "accepted" ? (
                      <span className="text-xs text-[#cbd5e1]">—</span>
                    ) : req.contactShareStatus === "shared" ? (
                      <div className="space-y-1">
                        <p className="text-[10px] text-[#10b981] uppercase flex items-center gap-1">
                          <ShieldCheck size={10} /> Shared
                        </p>
                        {req.brandContactEmail && (
                          <p className="flex items-center gap-1 text-xs text-[#1a1a2e]">
                            <Mail size={11} className="text-[#10b981]" /> {req.brandContactEmail}
                          </p>
                        )}
                        {req.brandContactPhone && (
                          <p className="flex items-center gap-1 text-xs text-[#1a1a2e]">
                            <Phone size={11} className="text-[#10b981]" /> {req.brandContactPhone}
                          </p>
                        )}
                      </div>
                    ) : req.contactShareStatus === "brand_requested" ? (
                      <span className="text-xs text-[#2F6BFF] animate-pulse">Consent needed ↗</span>
                    ) : (
                      <span className="text-xs text-[#94a3b8]">Not shared yet</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                        className="p-2 text-[#64748b] hover:text-[#2F6BFF] hover:bg-[#EBF2FF] rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {req.status !== "pending" && (() => {
                        const blocked = !!req.brandId && isBrandOnFreePlan(req.brandId);
                        return (
                          <div className="relative group">
                            <button
                              onClick={() => {
                                if (blocked) {
                                  toast.error("Brand not subscribed", {
                                    description: "This brand hasn't activated a paid plan — chat is unavailable for their campaigns.",
                                  });
                                  return;
                                }
                                openChat(req.id);
                              }}
                              className={`relative p-2 rounded-lg transition-colors ${
                                blocked
                                  ? "text-[#f59e0b] bg-[#fffbeb] hover:bg-[#fef3c7] cursor-not-allowed"
                                  : "text-[#64748b] hover:text-[#2F6BFF] hover:bg-[#EBF2FF]"
                              }`}
                            >
                              <MessageCircle size={16} />
                              {!blocked && getUnreadCount(user?.id ?? "influencer_user", req.id, req.chatMessages ?? [], "influencer") > 0 && (
                                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#2F6BFF] rounded-full border border-white" />
                              )}
                            </button>

                            {/* Tooltip */}
                            <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 px-2 py-1 rounded-md bg-[#1e293b] text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[9999] shadow-lg">
                              {blocked ? "Brand not subscribed" : "Open Chat"}
                            </span>
                          </div>
                        );
                      })()}
                      {req.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAction(req.id, "accepted")}
                            className="p-2 text-[#10b981] hover:bg-[#ecfdf5] rounded-lg transition-colors"
                            title="Accept"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleAction(req.id, "rejected")}
                            className="p-2 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                <AnimatePresence>
                  {expandedId === req.id && (
                    <tr key={`${req.id}-details`}>
                      <td colSpan={7} className="px-6 py-0">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-[#f8f9fc] rounded-xl p-[16px] mx-[0px] my-[16px]">
                            <div>
                              <span className="text-xs text-[#94a3b8] uppercase">Deliverables</span>
                              <p className="text-sm text-[#1a1a2e] mt-1">{req.deliverables}</p>
                            </div>
                            <div>
                              <span className="text-xs text-[#94a3b8] uppercase">Message</span>
                              <p className="text-sm text-[#64748b] mt-1">{req.message}</p>
                            </div>
                            {req.status === "accepted" && req.acceptComment && (
                              <div className="bg-[#ecfdf5] border border-[#d1fae5] rounded-lg p-3">
                                <span className="text-xs text-[#10b981] uppercase">Your Acceptance Message</span>
                                <p className="text-sm text-[#64748b] mt-1">{req.acceptComment}</p>
                              </div>
                            )}
                            {req.status === "accepted" && req.brandReply && (
                              <div className="bg-[#EBF2FF] border border-[#c7dbff] rounded-lg p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Send size={12} className="text-[#2F6BFF]" />
                                  <span className="text-xs text-[#2F6BFF] uppercase">Brand's Reply</span>
                                </div>
                                <p className="text-sm text-[#64748b]">{req.brandReply}</p>
                              </div>
                            )}
                            {/* Contact share section */}
                            <ContactShareSection req={req} />
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            ))
          )}
        </table>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredRequests.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="requests" />
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e2e8f0] py-14 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] flex items-center justify-center">
              <Search size={24} className="text-[#94a3b8]" />
            </div>
            <p className="text-[#1a1a2e] text-sm">No requests found</p>
            <p className="text-[#94a3b8] text-xs">Try adjusting your search or filters</p>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setSearchQuery(""); setStatusFilter("all"); setSortBy("newest"); setBudgetMin(""); setBudgetMax(""); setHasChatOnly(false); setContactFilter("any"); }}
                className="text-xs text-[#2F6BFF] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          pagedRequests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl border overflow-hidden transition-all duration-500 ${highlightId === req.id ? "border-[#2F6BFF] ring-2 ring-[#2F6BFF]/30 bg-[#EBF2FF]/10" : "border-[#e2e8f0]"}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg text-white flex items-center justify-center text-sm" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}>
                      {req.brandLogo}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[#1a1a2e]">{req.brandName}</p>
                        {req.brandId && isBrandVerified(req.brandId) && <VerifiedBadge size={15} />}
                      </div>
                      <p className="text-sm text-[#64748b]">{req.campaignName}</p>
                    </div>
                  </div>
                  {getStatusBadge(req.status)}
                </div>

                <div className="flex items-center gap-4 mt-4 text-sm text-[#64748b]">
                  <span className="flex items-center gap-1"><DollarSign size={14} />₹{req.budget.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Clock size={14} />{req.timeline}</span>
                </div>

                <button
                  onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                  className="text-sm text-[#2F6BFF] flex items-center gap-1 mt-3"
                >
                  {expandedId === req.id ? "Hide Details" : "View Details"}
                  {expandedId === req.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <AnimatePresence>
                  {expandedId === req.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-[#e2e8f0] space-y-2">
                        <p className="text-xs text-[#94a3b8] uppercase">Deliverables</p>
                        <p className="text-sm text-[#1a1a2e]">{req.deliverables}</p>
                        <p className="text-xs text-[#94a3b8] uppercase mt-2">Message</p>
                        <p className="text-sm text-[#64748b]">{req.message}</p>
                        {req.status === "accepted" && req.acceptComment && (
                          <div className="bg-[#ecfdf5] border border-[#d1fae5] rounded-lg p-3 mt-2">
                            <span className="text-xs text-[#10b981]">Your Acceptance Message</span>
                            <p className="text-sm text-[#64748b] mt-1">{req.acceptComment}</p>
                          </div>
                        )}
                        {req.status === "accepted" && req.brandReply && (
                          <div className="bg-[#EBF2FF] border border-[#c7dbff] rounded-lg p-3 mt-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Send size={12} className="text-[#2F6BFF]" />
                              <span className="text-xs text-[#2F6BFF] uppercase">Brand's Reply</span>
                            </div>
                            <p className="text-sm text-[#64748b]">{req.brandReply}</p>
                          </div>
                        )}
                        <ContactShareSection req={req} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {req.status === "pending" && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleAction(req.id, "accepted")}
                      className="flex-1 py-2 bg-[#10b981] text-white rounded-lg text-sm flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> Accept
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "rejected")}
                      className="flex-1 py-2 bg-[#ef4444] text-white rounded-lg text-sm flex items-center justify-center gap-1"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
                {req.status !== "pending" && (() => {
                  const unread = getUnreadCount(user?.id ?? "influencer_user", req.id, req.chatMessages ?? [], "influencer");
                  return (
                    <button
                      onClick={() => openChat(req.id)}
                      className="relative mt-3 w-full py-2.5 text-sm text-[#2F6BFF] bg-[#EBF2FF] border border-[#c7dbff] rounded-xl hover:bg-[#dce8ff] transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={14} />
                      Open Chat
                      {unread > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-[#2F6BFF] text-white text-[10px] rounded-full">
                          {unread} new
                        </span>
                      )}
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          ))
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredRequests.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="requests" tableFooter={false} />
      </div>

      {/* Accept Modal */}
      <AnimatePresence>
        {showAcceptModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] flex items-center justify-center">
                    <Handshake size={20} className="text-[#10b981]" />
                  </div>
                  <div>
                    <h2 className="text-lg text-[#1a1a2e]">Accept Collaboration</h2>
                    <p className="text-xs text-[#64748b]">
                      {requests.find((r) => r.id === acceptingRequestId)?.brandName} · {requests.find((r) => r.id === acceptingRequestId)?.campaignName}
                    </p>
                  </div>
                </div>
                <div className="bg-[#f0fdf4] border border-[#d1fae5] rounded-xl p-3 mb-4">
                  <p className="text-xs text-[#059669] flex items-start gap-2">
                    <MessageCircle size={13} className="shrink-0 mt-0.5" />
                    Chat will be unlocked immediately. Contact details are kept private until both parties mutually consent to share them.
                  </p>
                </div>
                <div className="relative">
                  <textarea
                    value={acceptComment}
                    onChange={(e) => setAcceptComment(e.target.value)}
                    className="w-full h-28 px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] resize-none"
                    placeholder="Optional message for the brand — your availability, preferred comms, anything relevant…"
                    maxLength={500}
                  />
                  <span className="absolute bottom-3 right-3 text-[10px] text-[#94a3b8]">{acceptComment.length}/500</span>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { setShowAcceptModal(false); setAcceptingRequestId(null); setAcceptComment(""); }}
                    className="flex-1 py-3 bg-white border border-[#e2e8f0] text-[#64748b] rounded-xl text-sm hover:bg-[#f8f9fc] transition-colors">
                    Cancel
                  </button>
                  <button onClick={confirmAccept}
                    className="flex-1 py-3 bg-[#10b981] text-white rounded-xl text-sm hover:bg-[#059669] transition-colors flex items-center justify-center gap-2">
                    <Check size={16} /> Confirm Accept
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center">
                    <MessageSquare size={20} className="text-[#ef4444]" />
                  </div>
                  <div>
                    <h2 className="text-lg text-[#1a1a2e]">Decline Collaboration</h2>
                    <p className="text-xs text-[#64748b]">{requests.find((r) => r.id === rejectingRequestId)?.brandName}</p>
                  </div>
                </div>
                <p className="text-sm text-[#64748b] mb-4">
                  Please provide a reason — the brand will see your response.
                </p>
                <textarea
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  className="w-full h-32 px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/20 focus:border-[#ef4444] resize-none"
                  placeholder="e.g., Budget doesn't match my rates, timeline conflict, not aligned with my brand…"
                />
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { setShowRejectModal(false); setRejectingRequestId(null); setRejectionComment(""); }}
                    className="flex-1 py-3 bg-white border border-[#e2e8f0] text-[#64748b] rounded-xl text-sm hover:bg-[#f8f9fc] transition-colors">
                    Cancel
                  </button>
                  <button onClick={confirmReject}
                    className="flex-1 py-3 bg-[#ef4444] text-white rounded-xl text-sm hover:bg-[#dc2626] transition-colors flex items-center justify-center gap-2">
                    <X size={16} /> Confirm Decline
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
