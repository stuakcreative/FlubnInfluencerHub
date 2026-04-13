import { useState, useEffect, useRef } from "react";
import {
  Mail, Phone, Clock, DollarSign, Search, MessageSquare, AlertCircle,
  Send, MessageCircle, Lock, Share2, ShieldCheck, ShieldX, ArrowUpDown, SlidersHorizontal, X, CalendarDays,
} from "lucide-react";
import { Pagination } from "../../components/Pagination";
import { useNavigate, useLocation } from "react-router";
import { useCollaboration } from "../../context/CollaborationContext";
import { useAuth } from "../../context/AuthContext";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { toast } from "sonner";
import { getBrandPlan, type BrandPlan } from "../../utils/brandSubscription";
import { isInfluencerVerified } from "../../utils/influencerVerification";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import type { ContactShareStatus } from "../../context/CollaborationContext";
import { DatePicker } from "../../components/DatePicker";
import { getUnreadCount } from "../../utils/chatReadState";
import { motion, AnimatePresence } from "motion/react";

export default function BrandSentRequests() {
  const { requests, respondToContactShare, requestContactShare } = useCollaboration();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [brandPlan, setBrandPlan] = useState<BrandPlan>(() => getBrandPlan());
  const [sortBy, setSortBy] = useState<string>("newest");

  const [highlightId, setHighlightId] = useState<string | null>(null);
  // No longer need in-memory readChats — persisted via chatReadState utility
  const [readNotes, setReadNotes] = useState<Set<string>>(new Set());
  const location = useLocation();

  // ── Filter popup state ────────────────────────────────────────────────────
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // Draft state (only applied on "Apply")
  const [draftMinBudget, setDraftMinBudget] = useState("");
  const [draftMaxBudget, setDraftMaxBudget] = useState("");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");

  // ── Auto-scroll refs ──────────────────────────────────────────────────────
  const dateFromRef = useRef<HTMLDivElement>(null);
  const dateToRef = useRef<HTMLDivElement>(null);

  const openFilterPopup = () => {
    setDraftMinBudget(minBudget);
    setDraftMaxBudget(maxBudget);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setShowFilterPopup(true);
  };

  const applyFilters = () => {
    setMinBudget(draftMinBudget);
    setMaxBudget(draftMaxBudget);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setShowFilterPopup(false);
  };

  const resetPopupFilters = () => {
    setDraftMinBudget("");
    setDraftMaxBudget("");
    setDraftDateFrom("");
    setDraftDateTo("");
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortBy("newest");
    setMinBudget("");
    setMaxBudget("");
    setDateFrom("");
    setDateTo("");
  };

  const popupFilterCount =
    (minBudget ? 1 : 0) + (maxBudget ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const openChat = (id: string) => {
    const currentPlan = getBrandPlan();
    if (!currentPlan.isPaid) {
      toast.error("Chat is a paid feature", {
        description: "Upgrade your subscription to message influencers directly.",
        action: { label: "Upgrade", onClick: () => navigate("/brand/subscription") },
      });
      return;
    }
    // Navigate to the dedicated Messages page with the conversation pre-selected
    navigate(`/brand/chats?id=${id}`);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chatId = params.get("chat");
    const hlId = params.get("highlight");
    if (chatId) {
      navigate(`/brand/chats?id=${chatId}`, { replace: true });
    }
    if (hlId) {
      setHighlightId(hlId);
      setExpandedId(hlId);
      setTimeout(() => setHighlightId(null), 2500);
      window.history.replaceState(null, "", location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync brandPlan state whenever DevTools or Subscription page changes it
  useEffect(() => {
    const handler = () => setBrandPlan(getBrandPlan());
    window.addEventListener("flubn:plan-changed", handler);
    return () => window.removeEventListener("flubn:plan-changed", handler);
  }, []);

  // ── Contact share helpers ──────────────────────────────────────────────────

  const handleRespondToContactShare = (reqId: string, action: "accept" | "decline") => {
    respondToContactShare(reqId, action, user?.brandContactEmail || user?.email, user?.phone);
    if (action === "accept") {
      toast.success("Contact details shared! ✅", {
        description: "Both you and the influencer can now see each other's contact info.",
      });
    } else {
      toast("Contact sharing declined.", { description: "The influencer has been notified." });
    }
  };

  // ── Contact share status UI ────────────────────────────────────────────────

  const ContactShareSection = ({ req }: { req: typeof requests[0] }) => {
    const status: ContactShareStatus = req.contactShareStatus ?? "none";
    if (req.status !== "accepted") return null;

    // Influencer initiated — brand must consent
    if (status === "influencer_requested") {
      return (
        <div className="bg-[#EBF2FF] border border-[#c7dbff] rounded-xl p-4 mt-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2F6BFF] flex items-center justify-center shrink-0">
              <Share2 size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#1e40af]">
                <strong>{req.influencerName}</strong> wants to share contact details with you
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

    // Brand initiated — waiting for influencer to consent
    if (status === "brand_requested") {
      return (
        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-3 mt-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center shrink-0">
            <Clock size={13} className="text-[#f59e0b]" />
          </div>
          <div>
            <p className="text-xs text-[#92400e]">Waiting for influencer's consent…</p>
            <p className="text-[10px] text-[#78350f]">Contact details will appear once the influencer agrees.</p>
          </div>
        </div>
      );
    }

    // Shared — show both contacts
    if (status === "shared") {
      return (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-4 mt-3">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} className="text-[#10b981]" />
            <span className="text-xs text-[#059669]">Contact details shared ✅</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-[#94a3b8] uppercase mb-1.5">Influencer Contact</p>
              {req.contactEmail && (
                <p className="flex items-center gap-1.5 text-sm text-[#1a1a2e]">
                  <Mail size={13} className="text-[#10b981] shrink-0" /> {req.contactEmail}
                </p>
              )}
              {req.contactPhone && (
                <p className="flex items-center gap-1.5 text-sm text-[#1a1a2e] mt-1">
                  <Phone size={13} className="text-[#10b981] shrink-0" /> {req.contactPhone}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-[#94a3b8] uppercase mb-1.5">Your Contact (visible to influencer)</p>
              {req.brandContactEmail && (
                <p className="flex items-center gap-1.5 text-sm text-[#1a1a2e]">
                  <Mail size={13} className="text-[#2F6BFF] shrink-0" /> {req.brandContactEmail}
                </p>
              )}
              {req.brandContactPhone && (
                <p className="flex items-center gap-1.5 text-sm text-[#1a1a2e] mt-1">
                  <Phone size={13} className="text-[#2F6BFF] shrink-0" /> {req.brandContactPhone}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Declined
    if (status === "declined") {
      return (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 mt-3 flex items-center gap-2.5">
          <ShieldX size={14} className="text-[#ef4444] shrink-0" />
          <div>
            <p className="text-xs text-[#ef4444]">Contact sharing was declined</p>
            <button
              onClick={() => {
                requestContactShare(req.id, "brand", user?.brandContactEmail || user?.email, user?.phone);
                toast.success("Re-request sent!");
              }}
              className="text-[10px] text-[#2F6BFF] hover:underline mt-0.5"
            >
              Send a new request
            </button>
          </div>
        </div>
      );
    }

    // None — brand OR influencer can initiate
    return (
      <div className="mt-3 pt-3 border-t border-[#f1f5f9]">
        <p className="text-xs text-[#94a3b8] mb-2">Want to communicate outside the platform?</p>
        <button
          onClick={() => {
            requestContactShare(req.id, "brand", user?.brandContactEmail || user?.email, user?.phone);
            toast.success("Contact share request sent!", {
              description: "The influencer will be notified and must consent before contacts are revealed.",
            });
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[#2F6BFF] bg-[#EBF2FF] border border-[#c7dbff] rounded-lg hover:bg-[#dbeafe] transition-colors"
        >
          <Share2 size={12} /> Request Contact Details
        </button>
      </div>
    );
  };

  // Only show requests sent by this brand
  const brandRequests = requests.filter((r) => r.brandId === user?.id);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
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

  const filteredRequests = brandRequests
    .filter((req) => {
      const matchesSearch =
        (req.influencerName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        req.campaignName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      const matchesMinBudget = !minBudget || req.budget >= Number(minBudget);
      const matchesMaxBudget = !maxBudget || req.budget <= Number(maxBudget);
      const reqDate = req.sentDate ? new Date(req.sentDate).getTime() : null;
      const matchesDateFrom = !dateFrom || (reqDate !== null && reqDate >= new Date(dateFrom).getTime());
      const matchesDateTo = !dateTo || (reqDate !== null && reqDate <= new Date(dateTo).getTime());
      return matchesSearch && matchesStatus && matchesMinBudget && matchesMaxBudget && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.sentDate || "").getTime() - new Date(a.sentDate || "").getTime();
      if (sortBy === "oldest") return new Date(a.sentDate || "").getTime() - new Date(b.sentDate || "").getTime();
      if (sortBy === "budget-high") return b.budget - a.budget;
      if (sortBy === "budget-low") return a.budget - b.budget;
      return 0;
    });

  const statusCounts = {
    all: brandRequests.length,
    pending: brandRequests.filter((r) => r.status === "pending").length,
    accepted: brandRequests.filter((r) => r.status === "accepted").length,
    rejected: brandRequests.filter((r) => r.status === "rejected").length,
  };

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0) +
    popupFilterCount;

  const hasExpandableContent = (req: typeof requests[0]) =>
    (req.status === "rejected" && req.rejectionComment) ||
    (req.status === "accepted" && (req.acceptComment || req.brandReply || true)); // always expandable when accepted

  // Reset to page 1 whenever filters/sort change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, sortBy, minBudget, maxBudget, dateFrom, dateTo]);

  // Smooth scroll to top on page change
  useEffect(() => {
    if (currentPage > 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  // ── Pagination helpers ────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ROWS_PER_PAGE));
  const pagedRequests = filteredRequests.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Sent Requests</h1>
        <p className="text-[#64748b] text-sm mt-1">Track all your collaboration requests.</p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by influencer or campaign..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#1a1a2e] transition-colors"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            )}
          </div>
          <div className="relative">
            <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-8 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] cursor-pointer appearance-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="budget-high">Budget: High → Low</option>
              <option value="budget-low">Budget: Low → High</option>
            </select>
          </div>
          {/* Filter popup button */}
          <button
            onClick={openFilterPopup}
            className={`relative px-4 py-3 rounded-xl border flex items-center gap-2 transition-colors ${
              popupFilterCount > 0
                ? "bg-[#2F6BFF] text-white border-[#2F6BFF]"
                : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2F6BFF]/30"
            }`}
          >
            <SlidersHorizontal size={18} />
            <span className="hidden sm:inline">Filters</span>
            {popupFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-[#2F6BFF] text-[10px] flex items-center justify-center shrink-0">
                {popupFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter popup modal */}
        <AnimatePresence>
          {showFilterPopup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowFilterPopup(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
                  <div className="flex items-center gap-2 text-[#1a1a2e]">
                    <SlidersHorizontal size={18} className="text-[#2F6BFF]" />
                    <span>Filter Requests</span>
                  </div>
                  <button
                    onClick={() => setShowFilterPopup(false)}
                    className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#1a1a2e] hover:bg-[#f1f5f9] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                  {/* Budget range */}
                  <div>
                    <label className="text-sm text-[#64748b] mb-3 flex items-center gap-1.5">
                      <DollarSign size={14} className="text-[#2F6BFF]" />
                      Budget Range (₹)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-[#94a3b8] mb-1 block">Min Budget</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] text-sm pointer-events-none select-none">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={draftMinBudget}
                            onChange={(e) => setDraftMinBudget(e.target.value)}
                            onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                            placeholder="0"
                            className="w-full pl-7 pr-3 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-[#94a3b8] mb-1 block">Max Budget</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] text-sm pointer-events-none select-none">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={draftMaxBudget}
                            onChange={(e) => setDraftMaxBudget(e.target.value)}
                            onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                            placeholder="∞"
                            className="w-full pl-7 pr-3 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date range */}
                  <div>
                    <label className="text-sm text-[#64748b] mb-3 flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-[#2F6BFF]" />
                      Sent Date Range
                    </label>
                    <div className="space-y-3">
                      <div ref={dateFromRef}>
                        <DatePicker
                          label="From"
                          value={draftDateFrom}
                          onChange={(val) => {
                            setDraftDateFrom(val);
                            if (draftDateTo && val > draftDateTo) setDraftDateTo("");
                          }}
                          onOpenChange={(isOpen) => {
                            if (isOpen && dateFromRef.current) {
                              setTimeout(() => {
                                dateFromRef.current?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
                              }, 50);
                            }
                          }}
                          minDate="2020-01-01"
                          maxDate={new Date(new Date().getFullYear() + 5, new Date().getMonth(), new Date().getDate()).toISOString().split("T")[0]}
                          placeholder="Start of range"
                        />
                      </div>
                      <div ref={dateToRef}>
                        <DatePicker
                          label="To"
                          value={draftDateTo}
                          onChange={(val) => setDraftDateTo(val)}
                          onOpenChange={(isOpen) => {
                            if (isOpen && dateToRef.current) {
                              setTimeout(() => {
                                dateToRef.current?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
                              }, 50);
                            }
                          }}
                          minDate={draftDateFrom || "2020-01-01"}
                          maxDate={new Date(new Date().getFullYear() + 5, new Date().getMonth(), new Date().getDate()).toISOString().split("T")[0]}
                          placeholder="End of range"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[#e2e8f0] bg-[#f8f9fc]">
                  <button
                    onClick={resetPopupFilters}
                    className="text-sm text-[#94a3b8] hover:text-[#1a1a2e] transition-colors"
                  >
                    Reset all
                  </button>
                  <button
                    onClick={applyFilters}
                    className="px-5 py-2.5 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#2558e8] transition-colors text-sm"
                  >
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { label: "All", value: "all", color: "border-[#2F6BFF] bg-[#EBF2FF] text-[#2F6BFF]" },
            { label: "Pending", value: "pending", color: "border-[#f59e0b] bg-[#fffbeb] text-[#f59e0b]" },
            { label: "Accepted", value: "accepted", color: "border-[#10b981] bg-[#ecfdf5] text-[#10b981]" },
            { label: "Rejected", value: "rejected", color: "border-[#ef4444] bg-[#fef2f2] text-[#ef4444]" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm transition-all whitespace-nowrap ${
                statusFilter === tab.value
                  ? tab.color
                  : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#2F6BFF]/30"
              }`}
            >
              {tab.label} ({statusCounts[tab.value as keyof typeof statusCounts]})
            </button>
          ))}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs text-[#ef4444] bg-[#fef2f2] border border-[#fecaca] rounded-xl hover:bg-[#fee2e2] transition-colors whitespace-nowrap"
            >
              <span>×</span> Clear all
            </button>
          )}
        </div>

        {/* Results count */}
        {(searchQuery || statusFilter !== "all" || popupFilterCount > 0) && (
          <p className="text-xs text-[#94a3b8]">
            Showing <span className="text-[#1a1a2e]">{filteredRequests.length}</span> of {brandRequests.length} requests
          </p>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f8f9fc] border-b border-[#e2e8f0]">
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Influencer</th>
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Campaign</th>
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Budget</th>
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Sent</th>
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Status</th>
              <th className="text-left px-6 py-4 text-sm text-[#64748b]">Contacts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] flex items-center justify-center">
                      <Search size={24} className="text-[#94a3b8]" />
                    </div>
                    <p className="text-[#1a1a2e] text-sm">No requests found</p>
                    <p className="text-[#94a3b8] text-xs">Try adjusting your search or filters</p>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-[#2F6BFF] hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pagedRequests.flatMap((req) => {
                  const rows = [
                    <tr
                      key={req.id}
                      className={`hover:bg-[#f8f9fc] transition-all duration-500 ${highlightId === req.id ? "ring-2 ring-inset ring-[#2F6BFF] bg-[#EBF2FF]/40" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <ImageWithFallback
                            src={req.influencerPhoto}
                            alt={req.influencerName}
                            className="w-9 h-9 rounded-lg object-cover"
                            fallback={<div className="w-9 h-9 rounded-lg bg-gray-300 flex items-center justify-center">?</div>}
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#1a1a2e]">{req.influencerName}</span>
                            {req.influencerId && isInfluencerVerified(req.influencerId) && (
                              <VerifiedBadge size={14} />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1a1a2e]">{req.campaignName}</td>
                      <td className="px-6 py-4 text-[#1a1a2e]">₹{req.budget.toLocaleString()}</td>
                      <td className="px-6 py-4 text-[#64748b] text-sm">{req.sentDate || req.timeline}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getStatusBadge(req.status)}

                          {/* Notes / expand toggle */}
                          {hasExpandableContent(req) && (
                            <button
                              onClick={() => {
                                setExpandedId(expandedId === req.id ? null : req.id);
                                setReadNotes((prev) => new Set(prev).add(req.id));
                              }}
                              className={`relative w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                expandedId === req.id
                                  ? req.status === "rejected"
                                    ? "bg-[#ef4444] text-white"
                                    : "bg-[#10b981] text-white"
                                  : req.status === "rejected"
                                  ? "bg-[#fef2f2] text-[#ef4444] hover:bg-[#ef4444] hover:text-white"
                                  : "bg-[#ecfdf5] text-[#10b981] hover:bg-[#10b981] hover:text-white"
                              }`}
                              title={expandedId === req.id ? "Hide notes" : "View notes"}
                            >
                              <MessageSquare size={13} />
                              {!readNotes.has(req.id) && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#2F6BFF] rounded-full border border-white" />
                              )}
                            </button>
                          )}

                          {/* Chat button */}
                          {req.status !== "pending" &&
                            (brandPlan.isPaid ? (
                              <button
                                onClick={() => openChat(req.id)}
                                className="relative w-7 h-7 rounded-lg flex items-center justify-center bg-[#EBF2FF] text-[#2F6BFF] hover:bg-[#2F6BFF] hover:text-white transition-colors"
                                title="Open Chat"
                              >
                                <MessageCircle size={13} />
                                {getUnreadCount(user?.id ?? "brand_user", req.id, req.chatMessages ?? [], "brand") > 0 && (
                                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#2F6BFF] rounded-full border border-white" />
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => openChat(req.id)}
                                className="relative w-7 h-7 rounded-lg flex items-center justify-center bg-[#f1f5f9] text-[#94a3b8] hover:bg-[#fee2e2] hover:text-[#ef4444] transition-colors"
                                title="Upgrade to chat"
                              >
                                <Lock size={11} />
                              </button>
                            ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {req.status !== "accepted" ? (
                          <span className="text-xs text-[#cbd5e1]">—</span>
                        ) : req.contactShareStatus === "shared" ? (
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-[#10b981] uppercase flex items-center gap-1">
                              <ShieldCheck size={10} /> Shared
                            </p>
                            {req.contactEmail && (
                              <p className="flex items-center gap-1 text-xs text-[#1a1a2e]">
                                <Mail size={11} className="text-[#10b981]" /> {req.contactEmail}
                              </p>
                            )}
                          </div>
                        ) : req.contactShareStatus === "brand_requested" ? (
                          <span className="text-xs text-[#f59e0b]">Awaiting consent…</span>
                        ) : req.contactShareStatus === "influencer_requested" ? (
                          <span className="text-xs text-[#2F6BFF] animate-pulse">Influencer wants to share ↗</span>
                        ) : (
                          <span className="text-xs text-[#cbd5e1]">Awaiting influencer</span>
                        )}
                      </td>
                    </tr>,
                  ];

                  if (expandedId === req.id && hasExpandableContent(req)) {
                    rows.push(
                      <tr key={`${req.id}-expanded`}>
                        <td colSpan={6} className="px-6 py-0 bg-[#f8f9fc]">
                          <AnimatePresence>
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="py-4 space-y-3">
                                {req.status === "rejected" && req.rejectionComment && (
                                  <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-[#ef4444] flex items-center justify-center shrink-0">
                                        <AlertCircle size={16} className="text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm text-[#ef4444] mb-1">Rejection Reason</p>
                                        <p className="text-sm text-[#64748b]">{req.rejectionComment}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {req.status === "accepted" && req.acceptComment && (
                                  <div className="bg-[#ecfdf5] border border-[#d1fae5] rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-[#10b981] flex items-center justify-center shrink-0">
                                        <MessageSquare size={16} className="text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm text-[#10b981] mb-1">Influencer's Message</p>
                                        <p className="text-sm text-[#64748b]">{req.acceptComment}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {req.brandReply && (
                                  <div className="bg-[#EBF2FF] border border-[#c7dbff] rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-[#2F6BFF] flex items-center justify-center shrink-0">
                                        <Send size={16} className="text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm text-[#2F6BFF] mb-1">Your Earlier Reply</p>
                                        <p className="text-sm text-[#64748b]">{req.brandReply}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Contact share section */}
                                <ContactShareSection req={req} />

                                {/* Chat CTA */}
                                {req.status === "accepted" && (
                                  <div className="flex items-center justify-between pt-1">
                                    <p className="text-xs text-[#94a3b8]">
                                      {(req.chatMessages?.length ?? 0) > 0
                                        ? `${req.chatMessages!.length} message${req.chatMessages!.length !== 1 ? "s" : ""} in chat`
                                        : "No messages yet - start the conversation"}
                                    </p>
                                    {brandPlan.isPaid ? (
                                      <button
                                        onClick={() => { openChat(req.id); setExpandedId(null); }}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#2F6BFF] rounded-xl hover:bg-[#1e5ae0] transition-colors"
                                      >
                                        <MessageCircle size={14} />
                                        {(req.chatMessages?.length ?? 0) > 0 ? "Continue Chat" : "Start Chat"}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => openChat(req.id)}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#64748b] bg-[#f1f5f9] rounded-xl hover:bg-[#fee2e2] hover:text-[#ef4444] transition-colors border border-[#e2e8f0]"
                                      >
                                        <Lock size={13} /> Upgrade to Chat
                                      </button>
                                    )}
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
                })
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRequests.length}
          itemsPerPage={ROWS_PER_PAGE}
          onPageChange={setCurrentPage}
          label="requests"
        />
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
                onClick={clearAllFilters}
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
              className={`bg-white rounded-xl border p-4 transition-all duration-500 ${highlightId === req.id ? "border-[#2F6BFF] ring-2 ring-[#2F6BFF]/30 bg-[#EBF2FF]/20" : "border-[#e2e8f0]"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <ImageWithFallback
                    src={req.influencerPhoto}
                    alt={req.influencerName}
                    className="w-10 h-10 rounded-xl object-cover"
                    fallback={<div className="w-10 h-10 rounded-xl bg-gray-300 flex items-center justify-center">?</div>}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[#1a1a2e]">{req.influencerName}</p>
                      {req.influencerId && isInfluencerVerified(req.influencerId) && (
                        <VerifiedBadge size={14} />
                      )}
                    </div>
                    <p className="text-sm text-[#64748b]">{req.campaignName}</p>
                  </div>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div className="flex items-center gap-4 mt-3 text-sm text-[#64748b]">
                <span className="flex items-center gap-1"><DollarSign size={14} />₹{req.budget.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Clock size={14} />{req.sentDate}</span>
              </div>

              {req.status === "rejected" && req.rejectionComment && (
                <div className="mt-3 bg-[#fef2f2] border border-[#fee2e2] rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-[#ef4444] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[#ef4444] mb-1">Rejection Reason</p>
                      <p className="text-sm text-[#64748b]">{req.rejectionComment}</p>
                    </div>
                  </div>
                </div>
              )}

              {req.status === "accepted" && req.acceptComment && (
                <div className="mt-3 bg-[#ecfdf5] border border-[#d1fae5] rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <MessageSquare size={16} className="text-[#10b981] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[#10b981] mb-1">Influencer's Message</p>
                      <p className="text-sm text-[#64748b]">{req.acceptComment}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact share section */}
              {req.status === "accepted" && <ContactShareSection req={req} />}

              {req.status !== "pending" &&
                (brandPlan.isPaid ? (
                  <button
                    onClick={() => openChat(req.id)}
                    className="mt-3 w-full py-2.5 text-sm text-white bg-[#2F6BFF] border border-[#2F6BFF] rounded-xl hover:bg-[#1e5ae0] transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={14} />
                    {(req.chatMessages?.length ?? 0) > 0 ? "Continue Chat" : "Start Chat"}
                    {getUnreadCount(user?.id ?? "brand_user", req.id, req.chatMessages ?? [], "brand") > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.5 bg-white/25 text-white text-[10px] rounded-full">
                        {getUnreadCount(user?.id ?? "brand_user", req.id, req.chatMessages ?? [], "brand")} new
                      </span>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => openChat(req.id)}
                    className="mt-3 w-full py-2.5 text-sm text-[#64748b] bg-[#f1f5f9] border border-[#e2e8f0] rounded-xl hover:bg-[#fee2e2] hover:text-[#ef4444] transition-colors flex items-center justify-center gap-2"
                  >
                    <Lock size={14} /> Upgrade to Chat
                  </button>
                ))}
            </motion.div>
          ))
        )}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRequests.length}
          itemsPerPage={ROWS_PER_PAGE}
          onPageChange={setCurrentPage}
          label="requests"
          tableFooter={false}
        />
      </div>

    </div>
  );
}