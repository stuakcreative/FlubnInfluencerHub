import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  X, Send, MessageSquare, ChevronDown, IndianRupee, Check,
  AlertCircle, TrendingUp, Lock, Crown, Zap, Rocket, ArrowRight, CornerUpLeft, Search, ChevronUp,
  ShieldCheck, BadgeCheck, Share2, Phone, Mail, ShieldX, Briefcase,
} from "lucide-react";
import { useCollaboration, MAX_NEGOTIATION_ROUNDS } from "../context/CollaborationContext";
import { ProfileAvatar } from "./ProfileAvatar";
import {
  getBrandPlan,
  getDailyMessageCount,
  incrementDailyMessageCount,
  canSendMessage,
  remainingMessages,
  type BrandPlan,
} from "../utils/brandSubscription";
import { isBrandVerified } from "../utils/brandVerification";
import { VerifiedBadge } from "./VerifiedBadge";
import { useAuth } from "../context/AuthContext";
import { markChatAsRead } from "../utils/chatReadState";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
  currentUserRole: "brand" | "influencer";
  currentUserId: string;
  currentUserName: string;
  embedded?: boolean; // renders inline without backdrop/slide animation
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Returns plan-tier icon + colour for the mini badge */
function PlanBadge({ plan }: { plan: BrandPlan }) {
  const cfg = {
    Free:       { Icon: Lock,   bg: "#f1f5f9", text: "#64748b", label: "Free Plan"       },
    Basic:      { Icon: Rocket, bg: "#eff6ff", text: "#3b82f6", label: "Basic Plan"      },
    Pro:        { Icon: Zap,    bg: "#EBF2FF", text: "#2F6BFF", label: "Pro Plan"        },
    Enterprise: { Icon: Crown,  bg: "#faf5ff", text: "#8b5cf6", label: "Enterprise Plan" },
  }[plan.name];
  const { Icon } = cfg;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}

export function ChatPanel({
  isOpen,
  onClose,
  requestId,
  currentUserRole,
  currentUserId,
  currentUserName,
  embedded = false,
}: Props) {
  const { requests, sendChatMessage, sendPriceRequest, respondToPriceRequest, sendCounterOffer, respondToCounterOffer, requestContactShare, respondToContactShare } = useCollaboration();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Price request state
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [priceAmount, setPriceAmount] = useState("");
  const [priceError, setPriceError] = useState("");

  // Counter offer state
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterError, setCounterError] = useState("");
  const [counterTargetMsgId, setCounterTargetMsgId] = useState<string | null>(null);

  // Reply-to state
  const [replyTo, setReplyTo] = useState<{ id: string; senderName: string; text: string } | null>(null);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [msgSearch, setMsgSearch] = useState("");
  const [msgMatchIdx, setMsgMatchIdx] = useState(0);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Subscription state (brand only)
  const [brandPlan, setBrandPlan] = useState<BrandPlan | null>(null);
  const [todayCount, setTodayCount] = useState(0);

  // ── Brand side: load + live-sync subscription plan ─────────────────────────
  useEffect(() => {
    if (isOpen && currentUserRole === "brand") {
      const plan = getBrandPlan();
      setBrandPlan(plan);
      setTodayCount(getDailyMessageCount(currentUserId));
    }
  }, [isOpen, currentUserRole, currentUserId]);

  useEffect(() => {
    if (currentUserRole !== "brand") return;
    const handler = () => {
      const plan = getBrandPlan();
      setBrandPlan(plan);
      setTodayCount(getDailyMessageCount(currentUserId));
    };
    window.addEventListener("flubn:plan-changed", handler);
    return () => window.removeEventListener("flubn:plan-changed", handler);
  }, [currentUserRole, currentUserId]);

  // ── Influencer side: check BRAND's plan (influencer can't chat if brand is Free) ──
  const [brandIsFreePlanForInfluencer, setBrandIsFreePlanForInfluencer] = useState(false);

  useEffect(() => {
    if (currentUserRole === "influencer") {
      setBrandIsFreePlanForInfluencer(!getBrandPlan().isPaid);
    }
  }, [isOpen, currentUserRole]);

  useEffect(() => {
    if (currentUserRole !== "influencer") return;
    const handler = () => setBrandIsFreePlanForInfluencer(!getBrandPlan().isPaid);
    window.addEventListener("flubn:plan-changed", handler);
    return () => window.removeEventListener("flubn:plan-changed", handler);
  }, [currentUserRole]);

  const request = requests.find((r) => r.id === requestId);
  const messages = request?.chatMessages ?? [];

  // Block influencer while a price request OR counter offer is unresolved
  const pendingPriceStatus = request?.pendingPriceRequest?.status;
  const hasPendingPriceRequest =
    pendingPriceStatus === "pending" || pendingPriceStatus === "countered";

  const negotiationRound = request?.negotiationRound ?? 0;
  const maxRoundsReached = negotiationRound >= MAX_NEGOTIATION_ROUNDS;

  // ── Pinned bar visibility — computed at component level so chat bubbles can suppress duplicate buttons ──
  const pendingPriceMsgId = request?.pendingPriceRequest?.messageId ?? null;
  const pendingPriceMsg = pendingPriceMsgId
    ? messages.find((m) => m.id === pendingPriceMsgId)
    : undefined;

  // Collapse state — user can minimise the pinned bar; auto-resets when a new price message arrives
  const [pinnedBarCollapsed, setPinnedBarCollapsed] = useState(false);
  useEffect(() => {
    setPinnedBarCollapsed(false);
  }, [pendingPriceMsgId]);

  // showPinnedBar reflects whether the bar is LOGICALLY active (not whether it's visually collapsed)
  // — this keeps chat-bubble duplicate-button suppression correct even when the bar is collapsed.
  const showPinnedBar =
    !!pendingPriceMsg &&
    ((currentUserRole === "brand" && pendingPriceStatus === "pending") ||
     (currentUserRole === "influencer" && pendingPriceStatus === "countered"));

  // Derived subscription checks (brand side)
  const isBrandGated = currentUserRole === "brand" && brandPlan !== null;
  const isFreePlan   = isBrandGated && !brandPlan!.isPaid;
  const limitReached = isBrandGated && brandPlan!.isPaid &&
    brandPlan!.dailyMessageLimit !== -1 &&
    todayCount >= brandPlan!.dailyMessageLimit;
  const isUnlimited  = isBrandGated && brandPlan!.dailyMessageLimit === -1;
  const remaining    = isBrandGated && brandPlan
    ? remainingMessages(currentUserId, brandPlan)
    : -1;

  // Influencer locked out when brand hasn't paid for chat
  const isInfluencerChatLocked =
    currentUserRole === "influencer" && brandIsFreePlanForInfluencer;

  // Auto-scroll to bottom when panel opens or new message arrives (desktop only)
  useEffect(() => {
    if (isOpen && window.innerWidth >= 768) {
      // Immediate scroll when opening a chat
      setTimeout(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: "instant", block: "end" });
        }
      }, 50);
      
      // Follow-up smooth scroll for new messages
      setTimeout(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }, 150);
    }
  }, [isOpen, messages.length]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isFreePlan && !limitReached) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isFreePlan, limitReached]);

  // Mark chat as read whenever panel opens — clears the unread dot in the parent list
  useEffect(() => {
    if (isOpen && requestId) {
      markChatAsRead(currentUserId, requestId);
    }
  }, [isOpen, requestId, currentUserId]);

  // Reset price input when panel closes
  useEffect(() => {
    if (!isOpen) {
      setShowPriceInput(false);
      setPriceAmount("");
      setPriceError("");
      setShowCounterInput(false);
      setCounterAmount("");
      setCounterError("");
      setCounterTargetMsgId(null);
      setReplyTo(null);
      setSearchOpen(false);
      setMsgSearch("");
      setMsgMatchIdx(0);
    }
  }, [isOpen]);

  // Show scroll-to-bottom button when user scrolls up
  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 80);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = () => {
    if (!text.trim() || !request) return;
    // Guard: brand subscription check
    if (currentUserRole === "brand" && brandPlan) {
      if (!canSendMessage(currentUserId, brandPlan)) return;
    }
    sendChatMessage(request.id, {
      senderId: currentUserId,
      senderRole: currentUserRole,
      senderName: currentUserName,
      text: text.trim(),
      type: "normal",
      ...(replyTo ? { replyTo } : {}),
    });
    // Track usage for brand
    if (currentUserRole === "brand") {
      incrementDailyMessageCount(currentUserId);
      setTodayCount((c) => c + 1);
    }
    setText("");
    setReplyTo(null);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleSendPriceRequest = () => {
    const amount = parseInt(priceAmount.replace(/,/g, ""), 10);
    if (!priceAmount || isNaN(amount) || amount <= 0) {
      setPriceError("Please enter a valid amount.");
      return;
    }
    if (request && amount <= request.budget) {
      setPriceError(`Amount must be greater than current budget ₹${request.budget.toLocaleString()}.`);
      return;
    }
    setPriceError("");
    sendPriceRequest(requestId!, amount, currentUserName, currentUserId);
    setShowPriceInput(false);
    setPriceAmount("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const handleRespondToPrice = (action: "accepted" | "rejected") => {
    respondToPriceRequest(requestId!, action, currentUserName, currentUserId);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const handleRespondToCounter = (action: "accepted" | "rejected") => {
    respondToCounterOffer(requestId!, action, currentUserName, currentUserId);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const handleCounterOffer = () => {
    const raw = counterAmount.replace(/,/g, "").trim();
    const amount = parseInt(raw, 10);
    const min = request ? request.budget + 1 : 0;
    const max = request ? (request.pendingPriceRequest?.amount ?? 0) - 1 : 0;

    if (!raw || isNaN(amount) || amount <= 0) {
      toast.error("Enter a counter amount first.");
      return;
    }
    if (request && (amount < min || amount > max)) {
      toast.error(`Enter a value between ₹${min.toLocaleString()} and ₹${max.toLocaleString()}.`);
      return;
    }
    sendCounterOffer(requestId!, amount, currentUserName, currentUserId);
    toast.success(`Counter offer of ₹${amount.toLocaleString()} sent!`);
    setShowCounterInput(false);
    setCounterAmount("");
    setCounterError("");
    setCounterTargetMsgId(null);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  // Compute matched message IDs
  const matchedIds = msgSearch.trim()
    ? messages.filter((m) => m.text.toLowerCase().includes(msgSearch.toLowerCase())).map((m) => m.id)
    : [];

  const nextMatch = () =>
    setMsgMatchIdx((i) => (matchedIds.length === 0 ? 0 : (i + 1) % matchedIds.length));
  const prevMatch = () =>
    setMsgMatchIdx((i) => (matchedIds.length === 0 ? 0 : (i - 1 + matchedIds.length) % matchedIds.length));

  // Scroll to current match
  useEffect(() => {
    const id = matchedIds[msgMatchIdx];
    if (id && msgRefs.current[id]) {
      msgRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [msgMatchIdx, msgSearch]);

  if (!request && isOpen && !embedded) return null;

  const otherName =
    currentUserRole === "brand" ? request?.influencerName : request?.brandName;
  const otherPhoto =
    currentUserRole === "brand" ? request?.influencerPhoto : request?.brandPhoto;
  const otherInitial = (otherName ?? "?")[0].toUpperCase();

  // Derive other user's info from the request object
  const otherUserId = currentUserRole === "brand" ? request?.influencerId : request?.brandId;
  const otherUserType = currentUserRole === "brand" ? "influencer" : "brand";

  return (
    <AnimatePresence>
      {(isOpen || embedded) && request && (
        <>
          {/* Backdrop — hidden in embedded mode */}
          {!embedded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
              onClick={onClose}
            />
          )}

          {/* Panel */}
          <motion.div
            initial={embedded ? false : { x: "100%", opacity: 0.5 }}
            animate={embedded ? {} : { x: 0, opacity: 1 }}
            exit={embedded ? {} : { x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className={
              embedded
                ? "flex flex-col h-full w-full bg-white overflow-hidden"
                : "fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white z-50 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.12)]"
            }
          >
            {/* ── Header ─────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e8ecf4] bg-white shrink-0">
              {!embedded && (
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#f1f5f9] text-[#64748b] hover:text-[#1a1a2e] transition-colors shrink-0"
                  aria-label="Close chat"
                >
                  <X size={18} />
                </button>
              )}

              {/* Avatar */}
              <div className="relative shrink-0">
                <ProfileAvatar
                  photo={otherPhoto}
                  name={otherName}
                  size="w-10 h-10"
                  userId={otherUserId}
                  userType={otherUserType}
                  requestId={requestId}
                  clickable={true}
                />
                {/* Online dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10b981] border-2 border-white rounded-full" />
              </div>

              {/* Name + campaign */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
                  <p className="text-[#1a1a2e] text-sm truncate">{otherName}</p>
                  {currentUserRole === "influencer" && request.brandId && isBrandVerified(request.brandId) && (
                    <VerifiedBadge size={14} />
                  )}
                </div>
                {/* Campaign badge — prominent so you always know which project this chat is for */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-[#EBF2FF] text-[#2F6BFF] max-w-full">
                  <Briefcase size={9} className="shrink-0" />
                  <span className="truncate">{request.campaignName}</span>
                </span>
              </div>

              {/* Search button */}
              <button
                onClick={() => {
                  if (searchOpen) { setMsgSearch(""); setMsgMatchIdx(0); }
                  setSearchOpen((o) => !o);
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                  searchOpen
                    ? "bg-[#EBF2FF] text-[#2F6BFF]"
                    : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#1a1a2e]"
                }`}
                aria-label="Search messages"
              >
                <Search size={15} />
              </button>

              {/* Status badge */}
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] shrink-0 ${
                  request.status === "accepted"
                    ? "bg-[#ecfdf5] text-[#10b981]"
                    : request.status === "rejected"
                    ? "bg-[#fef2f2] text-[#ef4444]"
                    : "bg-[#fffbeb] text-[#f59e0b]"
                }`}
              >
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
            </div>

            {/* ── Search bar ─────────────────────────────── */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden shrink-0"
                >
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e8ecf4]">
                    <Search size={13} className="text-[#94a3b8] shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      value={msgSearch}
                      onChange={(e) => { setMsgSearch(e.target.value); setMsgMatchIdx(0); }}
                      placeholder="Search messages…"
                      className="flex-1 text-xs text-[#1a1a2e] placeholder:text-[#b0bac9] bg-transparent outline-none min-w-0"
                    />
                    {msgSearch && (
                      <>
                        <span className={`text-[10px] shrink-0 px-2 py-0.5 rounded-full ${
                          matchedIds.length === 0 ? "bg-[#fef2f2] text-[#ef4444]" : "bg-[#EBF2FF] text-[#2F6BFF]"
                        }`}>
                          {matchedIds.length === 0 ? "0 found" : `${msgMatchIdx + 1} / ${matchedIds.length}`}
                        </span>
                        <div className="flex items-center shrink-0 border border-[#e2e8f0] rounded-lg overflow-hidden">
                          <button
                            onClick={prevMatch}
                            disabled={matchedIds.length === 0}
                            className="w-6 h-6 flex items-center justify-center text-[#64748b] hover:bg-[#EBF2FF] hover:text-[#2F6BFF] disabled:opacity-30 transition-colors border-r border-[#e2e8f0]"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={nextMatch}
                            disabled={matchedIds.length === 0}
                            className="w-6 h-6 flex items-center justify-center text-[#64748b] hover:bg-[#EBF2FF] hover:text-[#2F6BFF] disabled:opacity-30 transition-colors"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => { setMsgSearch(""); setMsgMatchIdx(0); }}
                          className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center bg-[#e2e8f0] hover:bg-[#fecaca] text-[#94a3b8] hover:text-[#ef4444] transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Campaign summary bar */}
            <div className="px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e8ecf4] shrink-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] text-[#94a3b8] flex items-center gap-1 flex-wrap">
                  Budget:{" "}
                  <span className="text-[#1a1a2e] flex items-center gap-0.5">
                    ₹{request.budget.toLocaleString()}
                    {hasPendingPriceRequest && (
                      <span className="ml-1 px-1.5 py-0.5 bg-[#fffbeb] text-[#f59e0b] text-[10px] rounded-full border border-[#fde68a]">
                        Pending update
                      </span>
                    )}
                  </span>
                  <span className="mx-2 text-[#e2e8f0]">·</span>
                  Timeline: <span className="text-[#1a1a2e]">{request.timeline}</span>
                </p>
                {/* Plan badge (brand only) */}
                {isBrandGated && brandPlan && <PlanBadge plan={brandPlan} />}
              </div>
            </div>

            {/* ── Subscription gate: BRAND on Free plan ────── */}
            {isFreePlan ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}
                >
                  <Lock size={34} className="text-white" />
                </div>
                <h3 className="text-[#1a1a2e] text-lg mb-2">Chat is a Paid Feature</h3>
                <p className="text-[#64748b] text-sm leading-relaxed max-w-[280px] mb-6">
                  Upgrade to a paid plan to start messaging influencers directly, negotiate
                  budgets, and manage campaigns in real time.
                </p>

                {/* Plan comparison mini-table */}
                <div className="w-full max-w-[300px] bg-[#f8f9fc] rounded-2xl border border-[#e2e8f0] p-4 mb-6 text-left">
                  <p className="text-[11px] text-[#94a3b8] uppercase tracking-wider mb-3">Chat Limits by Plan</p>
                  {(
                    [
                      { name: "Basic",      limit: "30 messages / day",   Icon: Rocket, color: "#3b82f6" },
                      { name: "Pro",        limit: "100 messages / day",  Icon: Zap,    color: "#2F6BFF" },
                      { name: "Enterprise", limit: "Unlimited messages",  Icon: Crown,  color: "#8b5cf6" },
                    ] as const
                  ).map(({ name, limit, Icon, color }) => (
                    <div key={name} className="flex items-center gap-2.5 py-2 border-b border-[#e2e8f0] last:border-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: color + "20" }}
                      >
                        <Icon size={13} style={{ color }} />
                      </div>
                      <span className="text-sm text-[#1a1a2e] flex-1">{name}</span>
                      <span className="text-xs text-[#64748b]">{limit}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="/brand/subscription"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm transition-all hover:opacity-90 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
                >
                  Upgrade Now <ArrowRight size={15} />
                </a>

                {/* Contact info — read-only, shown if influencer already shared */}
                {request?.status === "accepted" && request.contactShareStatus === "shared" && (
                  <div className="mt-5 w-full max-w-[300px] bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl p-3 text-left">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShieldCheck size={13} className="text-[#10b981]" />
                      <span className="text-xs text-[#059669]">Contact shared by influencer ✅</span>
                    </div>
                    {request.contactEmail && <p className="text-xs text-[#1a1a2e]">📧 {request.contactEmail}</p>}
                    {request.contactPhone && <p className="text-xs text-[#1a1a2e] mt-1">📞 {request.contactPhone}</p>}
                  </div>
                )}

                <p className="text-[10px] text-[#94a3b8] mt-4">
                  You can view past messages but cannot reply.
                </p>
              </div>
            ) : isInfluencerChatLocked ? (
              /* ── Influencer: Brand hasn't unlocked chat ─── */
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg, #374151 0%, #6b7280 100%)" }}
                >
                  <Lock size={34} className="text-white" />
                </div>
                <h3 className="text-[#1a1a2e] text-lg mb-2">Brand Hasn't Unlocked Chat</h3>
                <p className="text-[#64748b] text-sm leading-relaxed max-w-[280px] mb-4">
                  This brand is on the Free plan and hasn't activated chat messaging yet.
                  You'll be notified once they upgrade and can message you.
                </p>
                <div className="w-full max-w-[280px] bg-[#f8f9fc] border border-[#e2e8f0] rounded-2xl p-4 text-left">
                  <p className="text-[11px] text-[#94a3b8] uppercase tracking-wider mb-2">What you can do now</p>
                  <p className="text-xs text-[#64748b] flex items-start gap-2">
                    <span className="text-[#10b981] shrink-0">✓</span>
                    Wait for the brand to upgrade their plan
                  </p>
                  <p className="text-xs text-[#64748b] flex items-start gap-2 mt-1.5">
                    <span className="text-[#10b981] shrink-0">✓</span>
                    Request contact details to communicate outside the platform
                  </p>
                </div>
                <p className="text-[10px] text-[#94a3b8] mt-4">
                  Chat will unlock automatically once the brand upgrades.
                </p>
              </div>
            ) : (
              /* ── Messages (paid or influencer) ─────────── */
              <div
                ref={messagesRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
              >
                {/* ── Price Settled Banner ── */}
                {request?.priceSettled && (
                  <div className="flex items-center gap-2.5 bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl px-4 py-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-[#10b981] flex items-center justify-center shrink-0">
                      <BadgeCheck size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-[#065f46]">
                        Price agreed — <strong>₹{request.settledPrice?.toLocaleString()}</strong>
                      </p>
                      <p className="text-[10px] text-[#94a3b8]">Budget locked in for this collaboration</p>
                    </div>
                  </div>
                )}

                {/* ── Max negotiation rounds reached banner ── */}
                {maxRoundsReached && !request?.priceSettled && (
                  <div className="flex items-center gap-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-2xl px-4 py-3 mb-3">
                    <AlertCircle size={15} className="text-[#f59e0b] shrink-0" />
                    <p className="text-xs text-[#92400e]">
                      Maximum {MAX_NEGOTIATION_ROUNDS} negotiation rounds reached. Original budget of ₹{request?.budget.toLocaleString()} applies.
                    </p>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-[#EBF2FF] flex items-center justify-center mb-4">
                      <MessageSquare size={28} className="text-[#2F6BFF]" />
                    </div>
                    <p className="text-[#1a1a2e] text-sm">No messages yet</p>
                    <p className="text-[#94a3b8] text-xs mt-1 max-w-[200px]">
                      Start the conversation — say hello!
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isMe = msg.senderRole === currentUserRole;
                      const prevMsg = messages[idx - 1];
                      const showDateSep =
                        idx === 0 ||
                        new Date(msg.timestamp).toDateString() !==
                          new Date(prevMsg.timestamp).toDateString();
                      const showSenderName =
                        !isMe &&
                        (idx === 0 || messages[idx - 1].senderRole !== msg.senderRole);
                      const isLastInGroup =
                        idx === messages.length - 1 ||
                        messages[idx + 1].senderRole !== msg.senderRole;

                      // Highlight helpers
                      const isMatch = msgSearch.trim() !== "" && msg.text.toLowerCase().includes(msgSearch.toLowerCase());
                      const isCurrentMatch = isMatch && matchedIds.indexOf(msg.id) === msgMatchIdx;
                      const highlightClass = isCurrentMatch
                        ? "ring-2 ring-[#2F6BFF]/50 bg-[#EBF2FF]/20 rounded-2xl -mx-1 px-1"
                        : isMatch
                        ? "ring-1 ring-[#2F6BFF]/20 bg-[#EBF2FF]/10 rounded-2xl -mx-1 px-1"
                        : "";

                      // ── Price request bubble ─────────────────
                      if (msg.type === "price_request") {
                        const priceStatus = request.pendingPriceRequest?.messageId === msg.id
                          ? request.pendingPriceRequest?.status
                          : undefined;
                        const isPending        = priceStatus === "pending";
                        const isCounterPending = priceStatus === "countered";
                        const isResolved       = priceStatus === "accepted" || priceStatus === "rejected";
                        const counterAmt       = request.pendingPriceRequest?.counterAmount;
                        return (
                          <div
                            key={msg.id}
                            data-msg-id={msg.id}
                            ref={(el) => { if (isMatch) msgRefs.current[msg.id] = el; }}
                            className={`transition-all duration-200 ${highlightClass}`}
                          >
                            {showDateSep && (
                              <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px bg-[#e8ecf4]" />
                                <span className="text-[10px] text-[#94a3b8] px-2 py-0.5 rounded-full bg-[#f1f5f9]">
                                  {formatDate(msg.timestamp)}
                                </span>
                                <div className="flex-1 h-px bg-[#e8ecf4]" />
                              </div>
                            )}
                            <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-3`}>
                              {!isMe && (
                                <div className="w-7 shrink-0 mr-2 self-end">
                                  <ProfileAvatar
                                    photo={otherPhoto}
                                    name={otherName}
                                    size="w-7 h-7"
                                    textSize="text-[10px]"
                                  />
                                </div>
                              )}
                              <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%]`}>
                                {showSenderName && (
                                  <span className="text-[10px] text-[#94a3b8] mb-1 px-1">
                                    {msg.senderName}
                                  </span>
                                )}
                                {/* ── Price card ── */}
                                <div className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl rounded-bl-sm p-3.5 min-w-[240px]">
                                  {/* Header */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-7 h-7 rounded-full bg-[#f59e0b]/15 flex items-center justify-center shrink-0">
                                      <TrendingUp size={14} className="text-[#f59e0b]" />
                                    </div>
                                    <span className="text-xs text-[#92400e]">Budget Update Request</span>
                                  </div>
                                  <p className="text-sm text-[#78350f] mb-2">{msg.text}</p>

                                  {/* Original requested amount row */}
                                  <div className="flex items-center gap-1.5 bg-white/70 rounded-xl px-3 py-2 mb-2.5">
                                    <IndianRupee size={14} className="text-[#f59e0b]" />
                                    <span className="text-[#1a1a2e] text-sm">
                                      {msg.requestedAmount?.toLocaleString()}
                                    </span>
                                    <span className="text-[11px] text-[#94a3b8] ml-auto">
                                      was ₹{request.budget.toLocaleString()}
                                    </span>
                                  </div>

                                  {/* ── STATE 1a: Brand — Accept / Counter / Decline ──
                                       Only shown in chat when there is NO pinned bar active.
                                       When pinned bar is showing, the bubble becomes a read-only record. */}
                                  {currentUserRole === "brand" && isPending && !showCounterInput && !showPinnedBar && (
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => handleRespondToPrice("accepted")}
                                        className="flex-1 py-1.5 bg-[#10b981] text-white text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#059669] transition-colors"
                                      >
                                        <Check size={12} /> Accept
                                      </button>
                                      {!maxRoundsReached ? (
                                        <button
                                          onClick={() => {
                                            setShowCounterInput(true);
                                            setCounterTargetMsgId(msg.id);
                                            setCounterAmount("");
                                            setCounterError("");
                                          }}
                                          className="flex-1 py-1.5 bg-[#EBF2FF] text-[#2F6BFF] text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#dbeafe] transition-colors border border-[#2F6BFF]/20"
                                        >
                                          <IndianRupee size={11} /> Counter {negotiationRound > 0 && `(${MAX_NEGOTIATION_ROUNDS - negotiationRound} left)`}
                                        </button>
                                      ) : (
                                        <div className="flex-1 py-1.5 bg-[#f1f5f9] text-[#94a3b8] text-xs rounded-lg flex items-center justify-center gap-1 cursor-not-allowed" title="Max negotiation rounds reached">
                                          <IndianRupee size={11} /> Max rounds
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleRespondToPrice("rejected")}
                                        className="flex-1 py-1.5 bg-white border border-[#fde68a] text-[#92400e] text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#fef9c3] transition-colors"
                                      >
                                        <X size={12} /> Decline
                                      </button>
                                    </div>
                                  )}

                                  {/* ── STATE 1b: Brand — counter amount stepper (chat) ──
                                       Hidden when pinned bar is active; counter input lives in pin only. */}
                                  {currentUserRole === "brand" && isPending && showCounterInput && !showPinnedBar && (
                                    <div>
                                      <p className="text-[10px] text-[#64748b] mb-1.5">
                                        Counter (between ₹{(request.budget + 1).toLocaleString()} – ₹{((request.pendingPriceRequest?.amount ?? 0) - 1).toLocaleString()}):
                                      </p>
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <button
                                          onClick={() => {
                                            const min = request.budget + 1;
                                            const cur = parseInt(counterAmount || String(min), 10);
                                            const next = Math.max(min, (isNaN(cur) ? min : cur) - 1);
                                            setCounterAmount(String(next));
                                            setCounterError("");
                                          }}
                                          className="w-8 h-8 rounded-lg bg-[#f1f5f9] text-[#64748b] flex items-center justify-center hover:bg-[#e2e8f0] transition-colors text-base shrink-0"
                                        >-</button>
                                        <div className="flex-1 flex items-center bg-white border border-[#fde68a] rounded-lg px-2.5 focus-within:ring-2 focus-within:ring-[#f59e0b]/20 focus-within:border-[#f59e0b] transition-all">
                                          <IndianRupee size={12} className="text-[#f59e0b] shrink-0" />
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={counterAmount}
                                            onChange={(e) => {
                                              const val = e.target.value.replace(/[^0-9]/g, "");
                                              setCounterAmount(val);
                                              setCounterError("");
                                            }}
                                            placeholder={`e.g. ${Math.round((request.budget + (request.pendingPriceRequest?.amount ?? request.budget * 2)) / 2)}`}
                                            className="w-full bg-transparent text-sm text-[#1a1a2e] placeholder:text-[#cbd5e1] focus:outline-none py-1.5 pl-1"
                                          />
                                        </div>
                                        <button
                                          onClick={() => {
                                            const max = (request.pendingPriceRequest?.amount ?? 0) - 1;
                                            const min = request.budget + 1;
                                            const cur = parseInt(counterAmount || String(min), 10);
                                            const next = Math.min(max, (isNaN(cur) ? min : cur) + 1);
                                            setCounterAmount(String(next));
                                            setCounterError("");
                                          }}
                                          className="w-8 h-8 rounded-lg bg-[#f1f5f9] text-[#64748b] flex items-center justify-center hover:bg-[#e2e8f0] transition-colors text-base shrink-0"
                                        >+</button>
                                      </div>
                                      <div className="flex gap-1.5">
                                        <button
                                          onClick={handleCounterOffer}
                                          className="flex-1 py-1.5 bg-[#2F6BFF] text-white text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#1e5ae0] transition-colors"
                                        >
                                          <Send size={11} /> Send Counter
                                        </button>
                                        <button
                                          onClick={() => { setShowCounterInput(false); setCounterAmount(""); setCounterError(""); setCounterTargetMsgId(null); }}
                                          className="px-3 py-1.5 bg-white border border-[#e2e8f0] text-[#64748b] text-xs rounded-lg hover:bg-[#f1f5f9] transition-colors"
                                        >Cancel</button>
                                      </div>
                                    </div>
                                  )}

                                  {/* ── PINNED REDIRECT (brand, pending): chat bubble is read-only ── */}
                                  {currentUserRole === "brand" && isPending && showPinnedBar && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-2 bg-white/60 rounded-xl border border-[#fde68a]/60">
                                      <ChevronDown size={11} className="text-[#f59e0b] shrink-0" />
                                      <span className="text-[10px] text-[#92400e]">
                                        Respond via the action bar below
                                      </span>
                                    </div>
                                  )}

                                  {/* ── STATE 2a: Brand — waiting for influencer's counter response ──
                                       Always shown in chat (informational, no pinned bar for this state). */}
                                  {currentUserRole === "brand" && isCounterPending && (
                                    <div className="flex items-center gap-2 bg-[#EBF2FF] rounded-xl px-3 py-2">
                                      <IndianRupee size={13} className="text-[#2F6BFF] shrink-0" />
                                      <div>
                                        <p className="text-[11px] text-[#1e40af]">
                                          Counter sent: <strong>₹{counterAmt?.toLocaleString()}</strong>
                                        </p>
                                        <p className="text-[10px] text-[#64748b]">Awaiting influencer's response…</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* ── STATE 2b: Influencer — Accept or Decline the brand's counter ──
                                       Hidden when pinned bar is active; actions live in pin only. */}
                                  {currentUserRole === "influencer" && isCounterPending && !showPinnedBar && (
                                    <div>
                                      <div className="flex items-center gap-2 bg-[#EBF2FF] rounded-xl px-3 py-2 mb-2.5">
                                        <IndianRupee size={13} className="text-[#2F6BFF] shrink-0" />
                                        <div>
                                          <p className="text-[11px] text-[#1e40af]">
                                            Brand countered: <strong>₹{counterAmt?.toLocaleString()}</strong>
                                          </p>
                                          <p className="text-[10px] text-[#64748b]">
                                            vs your request of ₹{msg.requestedAmount?.toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex gap-1.5">
                                        <button
                                          onClick={() => handleRespondToCounter("accepted")}
                                          className="flex-1 py-1.5 bg-[#10b981] text-white text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#059669] transition-colors"
                                        >
                                          <Check size={12} /> Accept ₹{counterAmt?.toLocaleString()}
                                        </button>
                                        <button
                                          onClick={() => handleRespondToCounter("rejected")}
                                          className="flex-1 py-1.5 bg-white border border-[#fde68a] text-[#92400e] text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#fef9c3] transition-colors"
                                        >
                                          <X size={12} /> Decline
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* ── PINNED REDIRECT (influencer, countered): chat bubble is read-only ── */}
                                  {currentUserRole === "influencer" && isCounterPending && showPinnedBar && (
                                    <div>
                                      <div className="flex items-center gap-2 bg-[#EBF2FF] rounded-xl px-3 py-2 mb-2">
                                        <IndianRupee size={13} className="text-[#2F6BFF] shrink-0" />
                                        <div>
                                          <p className="text-[11px] text-[#1e40af]">
                                            Brand countered: <strong>₹{counterAmt?.toLocaleString()}</strong>
                                          </p>
                                          <p className="text-[10px] text-[#64748b]">
                                            vs your request of ₹{msg.requestedAmount?.toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5 px-2.5 py-2 bg-white/60 rounded-xl border border-[#bfdbfe]/60">
                                        <ChevronDown size={11} className="text-[#2F6BFF] shrink-0" />
                                        <span className="text-[10px] text-[#1e40af]">
                                          Respond via the action bar below
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* ── STATE 3: Fully resolved — accepted or declined ── */}
                                  {isResolved && (
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                        priceStatus === "accepted"
                                          ? "bg-[#ecfdf5] text-[#10b981]"
                                          : "bg-[#fef2f2] text-[#ef4444]"
                                      }`}
                                    >
                                      {priceStatus === "accepted"
                                        ? `✓ Agreed ₹${(counterAmt ?? msg.requestedAmount)?.toLocaleString()}`
                                        : "✕ Declined"}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#94a3b8] mt-1 px-1">
                                  {formatTime(msg.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // ── Price accepted/rejected system bubble ──
                      if (msg.type === "price_accepted" || msg.type === "price_rejected") {
                        const isAccepted = msg.type === "price_accepted";
                        return (
                          <div
                            key={msg.id}
                            ref={(el) => { if (isMatch) msgRefs.current[msg.id] = el; }}
                            className={`transition-all duration-200 ${highlightClass}`}
                          >
                            {showDateSep && (
                              <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px bg-[#e8ecf4]" />
                                <span className="text-[10px] text-[#94a3b8] px-2 py-0.5 rounded-full bg-[#f1f5f9]">
                                  {formatDate(msg.timestamp)}
                                </span>
                                <div className="flex-1 h-px bg-[#e8ecf4]" />
                              </div>
                            )}
                            <div className="flex justify-center mb-3">
                              <div
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs max-w-[85%] ${
                                  isAccepted
                                    ? "bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46]"
                                    : "bg-[#fef2f2] border border-[#fecaca] text-[#7f1d1d]"
                                }`}
                              >
                                {isAccepted ? (
                                  <Check size={13} className="text-[#10b981] shrink-0" />
                                ) : (
                                  <AlertCircle size={13} className="text-[#ef4444] shrink-0" />
                                )}
                                <span>{msg.text}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // ── Price countered system bubble ──────────
                      if (msg.type === "price_countered") {
                        return (
                          <div
                            key={msg.id}
                            ref={(el) => { if (isMatch) msgRefs.current[msg.id] = el; }}
                            className={`transition-all duration-200 ${highlightClass}`}
                          >
                            {showDateSep && (
                              <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px bg-[#e8ecf4]" />
                                <span className="text-[10px] text-[#94a3b8] px-2 py-0.5 rounded-full bg-[#f1f5f9]">
                                  {formatDate(msg.timestamp)}
                                </span>
                                <div className="flex-1 h-px bg-[#e8ecf4]" />
                              </div>
                            )}
                            <div className="flex justify-center mb-3">
                              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs max-w-[85%] bg-[#EBF2FF] border border-[#bfdbfe] text-[#1e40af]">
                                <IndianRupee size={13} className="text-[#2F6BFF] shrink-0" />
                                <span>{msg.text}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // ── Normal message bubble ────────────────
                      return (
                        <div
                          key={msg.id}
                          data-msg-id={msg.id}
                          ref={(el) => { if (isMatch) msgRefs.current[msg.id] = el; }}
                          className={`group transition-all duration-200 ${highlightClass}`}
                        >
                          {showDateSep && (
                            <div className="flex items-center gap-3 my-4">
                              <div className="flex-1 h-px bg-[#e8ecf4]" />
                              <span className="text-[10px] text-[#94a3b8] px-2 py-0.5 rounded-full bg-[#f1f5f9]">
                                {formatDate(msg.timestamp)}
                              </span>
                              <div className="flex-1 h-px bg-[#e8ecf4]" />
                            </div>
                          )}

                          <div
                            className={`flex items-end gap-1 ${isMe ? "justify-end" : "justify-start"} ${
                              isLastInGroup ? "mb-3" : "mb-0.5"
                            }`}
                          >
                            {/* Reply button — left of MY message */}
                            {isMe && (
                              <button
                                onClick={() => {
                                  setReplyTo({ id: msg.id, senderName: msg.senderName, text: msg.text });
                                  setTimeout(() => inputRef.current?.focus(), 60);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-6 h-6 rounded-full bg-[#f1f5f9] text-[#94a3b8] hover:bg-[#dbeafe] hover:text-[#2F6BFF] flex items-center justify-center mb-0.5"
                                title="Reply"
                              >
                                <CornerUpLeft size={12} />
                              </button>
                            )}

                            {!isMe && (
                              <div className="w-7 shrink-0 mr-1 self-end">
                                {isLastInGroup && (
                                  <ProfileAvatar
                                    photo={otherPhoto}
                                    name={otherName}
                                    size="w-7 h-7"
                                    textSize="text-[10px]"
                                  />
                                )}
                              </div>
                            )}

                            <div
                              className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[78%]`}
                            >
                              {showSenderName && (
                                <span className="text-[10px] text-[#94a3b8] mb-1 px-1">
                                  {msg.senderName}
                                </span>
                              )}
                              <div
                                className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                                  isMe
                                    ? "bg-[#2F6BFF] text-white rounded-2xl rounded-br-sm"
                                    : "bg-[#f1f5f9] text-[#1a1a2e] rounded-2xl rounded-bl-sm"
                                }`}
                              >
                                {/* ── Quoted reply preview ── */}
                                {msg.replyTo && (
                                  <button
                                    onClick={() => {
                                      const el = messagesRef.current?.querySelector(`[data-msg-id="${msg.replyTo!.id}"]`);
                                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                                    }}
                                    className={`w-full text-left flex flex-col mb-2 px-2.5 py-1.5 rounded-lg border-l-[3px] transition-opacity hover:opacity-80 ${
                                      isMe
                                        ? "bg-white/20 border-white/60"
                                        : "bg-white border-[#2F6BFF]"
                                    }`}
                                  >
                                    <span className={`text-[10px] mb-0.5 ${isMe ? "text-white/80" : "text-[#2F6BFF]"}`}>
                                      ↩ {msg.replyTo.senderName}
                                    </span>
                                    <span className={`text-[11px] line-clamp-1 ${isMe ? "text-white/70" : "text-[#64748b]"}`}>
                                      {msg.replyTo.text}
                                    </span>
                                  </button>
                                )}
                                {msg.text}
                              </div>
                              {isLastInGroup && (
                                <span className="text-[10px] text-[#94a3b8] mt-1 px-1">
                                  {formatTime(msg.timestamp)}
                                </span>
                              )}
                            </div>

                            {/* Reply button — right of OTHER's message */}
                            {!isMe && (
                              <button
                                onClick={() => {
                                  setReplyTo({ id: msg.id, senderName: msg.senderName, text: msg.text });
                                  setTimeout(() => inputRef.current?.focus(), 60);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-6 h-6 rounded-full bg-[#f1f5f9] text-[#94a3b8] hover:bg-[#dbeafe] hover:text-[#2F6BFF] flex items-center justify-center mb-0.5"
                                title="Reply"
                              >
                                <CornerUpLeft size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>
            )}

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {showScrollBtn && !isFreePlan && !isInfluencerChatLocked && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-24 right-5 w-9 h-9 rounded-full bg-[#2F6BFF] text-white shadow-lg flex items-center justify-center hover:bg-[#1e5ae0] transition-colors z-10"
                  aria-label="Scroll to latest"
                >
                  <ChevronDown size={17} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* ── Pinned Budget Update Request action bar ────────────────────────────
                 This is the SINGLE source-of-truth for actions on the latest pending
                 Budget Update Request. The chat bubble for that message shows
                 read-only info + a "respond below" hint — no duplicate buttons.
            ──────────────────────────────────────────────────────────────────── */}
            {!isFreePlan && !isInfluencerChatLocked && showPinnedBar && pendingPriceMsg && (() => {
              const pinnedPriceStatus = request.pendingPriceRequest?.status;
              const isPinnedPending = pinnedPriceStatus === "pending";
              const isPinnedCounterPending = pinnedPriceStatus === "countered";
              const pinnedCounterAmt = request.pendingPriceRequest?.counterAmount;

              const scrollToMsg = () => {
                const el =
                  messagesRef.current?.querySelector(`[data-msg-id="${pendingPriceMsg.id}"]`) ||
                  msgRefs.current[pendingPriceMsg.id];
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              };

              return (
                <div className="border-t-2 border-[#f59e0b]/40 bg-[#fffbeb] shrink-0 shadow-[0_-4px_16px_rgba(245,158,11,0.08)]">
                  {pinnedBarCollapsed ? (
                    /* ── Collapsed strip ── */
                    <div className="flex items-center gap-1 px-4 py-2">
                      {/* Left: click to scroll to the price message */}
                      <button
                        onClick={scrollToMsg}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-75 transition-opacity"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#f59e0b]/20 flex items-center justify-center shrink-0">
                          <TrendingUp size={10} className="text-[#f59e0b]" />
                        </div>
                        <span className="text-[11px] text-[#92400e] truncate">
                          {isPinnedPending ? "Budget Update Request" : "Counter Offer Received"}
                          {" · "}
                          <span className="text-[#1a1a2e]">
                            ₹{(isPinnedCounterPending && pinnedCounterAmt
                              ? pinnedCounterAmt
                              : pendingPriceMsg.requestedAmount
                            )?.toLocaleString()}
                          </span>
                        </span>
                      </button>
                      {/* ↑ ChevronUp = expand the bar back up */}
                      <button
                        onClick={() => setPinnedBarCollapsed(false)}
                        title="Expand"
                        className="p-1 rounded-md hover:bg-[#fde68a]/40 transition-colors shrink-0"
                      >
                        <ChevronUp size={14} className="text-[#94a3b8] hover:text-[#f59e0b] transition-colors" />
                      </button>
                    </div>
                  ) : (
                  <div className="px-4 py-3">
                  {/* ── Header row ── */}
                  <div className="flex items-center gap-2 mb-2.5">
                    {/* Left: click to scroll to the price message */}
                    <button
                      onClick={scrollToMsg}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-75 transition-opacity"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#f59e0b]/20 flex items-center justify-center shrink-0">
                        <TrendingUp size={12} className="text-[#f59e0b]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] text-[#92400e]">
                          {isPinnedPending ? "Budget Update Request" : "Counter Offer Received"}
                        </span>
                        {isPinnedCounterPending && pinnedCounterAmt && (
                          <span className="ml-1.5 text-[10px] text-[#64748b]">
                            (was ₹{pendingPriceMsg.requestedAmount?.toLocaleString()})
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-[#1a1a2e] flex items-center gap-0.5 shrink-0">
                        <IndianRupee size={12} className="text-[#f59e0b]" />
                        {isPinnedCounterPending && pinnedCounterAmt
                          ? pinnedCounterAmt.toLocaleString()
                          : pendingPriceMsg.requestedAmount?.toLocaleString()}
                      </span>
                    </button>
                    {/* ↓ ChevronDown = collapse the bar */}
                    <button
                      onClick={() => setPinnedBarCollapsed(true)}
                      title="Collapse"
                      className="p-1 rounded-md hover:bg-[#fde68a]/40 transition-colors shrink-0"
                    >
                      <ChevronDown size={14} className="text-[#94a3b8] hover:text-[#f59e0b] transition-colors" />
                    </button>
                  </div>

                  {/* ── Brand: Accept / Counter / Decline ── */}
                  {currentUserRole === "brand" && isPinnedPending && !showCounterInput && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleRespondToPrice("accepted")}
                        className="flex-1 py-1.5 bg-[#10b981] text-white text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#059669] transition-colors"
                      >
                        <Check size={12} /> Accept
                      </button>
                      {!maxRoundsReached ? (
                        <button
                          onClick={() => {
                            setShowCounterInput(true);
                            setCounterTargetMsgId(pendingPriceMsg.id);
                            setCounterAmount("");
                            setCounterError("");
                          }}
                          className="flex-1 py-1.5 bg-[#EBF2FF] text-[#2F6BFF] text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#dbeafe] transition-colors border border-[#2F6BFF]/20"
                        >
                          <IndianRupee size={11} /> Counter{" "}
                          {negotiationRound > 0 && `(${MAX_NEGOTIATION_ROUNDS - negotiationRound} left)`}
                        </button>
                      ) : (
                        <div
                          className="flex-1 py-1.5 bg-[#f1f5f9] text-[#94a3b8] text-xs rounded-lg flex items-center justify-center gap-1 cursor-not-allowed"
                          title="Max negotiation rounds reached"
                        >
                          <IndianRupee size={11} /> Max rounds
                        </div>
                      )}
                      <button
                        onClick={() => handleRespondToPrice("rejected")}
                        className="flex-1 py-1.5 bg-white border border-[#fde68a] text-[#92400e] text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#fef9c3] transition-colors"
                      >
                        <X size={12} /> Decline
                      </button>
                    </div>
                  )}

                  {/* ── Brand: counter amount stepper ── */}
                  {currentUserRole === "brand" && isPinnedPending && showCounterInput && (
                    <div>
                      <p className="text-[10px] text-[#64748b] mb-1.5">
                        Counter (between ₹{(request.budget + 1).toLocaleString()} –{" "}
                        ₹{((request.pendingPriceRequest?.amount ?? 0) - 1).toLocaleString()}):
                      </p>
                      <div className="flex items-center gap-1.5 mb-2">
                        <button
                          onClick={() => {
                            const min = request.budget + 1;
                            const cur = parseInt(counterAmount || String(min), 10);
                            const next = Math.max(min, (isNaN(cur) ? min : cur) - 1);
                            setCounterAmount(String(next));
                          }}
                          className="w-8 h-8 rounded-lg bg-[#f1f5f9] text-[#64748b] flex items-center justify-center hover:bg-[#e2e8f0] transition-colors text-base shrink-0"
                        >-</button>
                        <div className="flex-1 flex items-center bg-white border border-[#fde68a] rounded-lg px-2.5 focus-within:ring-2 focus-within:ring-[#f59e0b]/20 focus-within:border-[#f59e0b] transition-all">
                          <IndianRupee size={12} className="text-[#f59e0b] shrink-0" />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={counterAmount}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setCounterAmount(val);
                            }}
                            placeholder={`e.g. ${Math.round(
                              (request.budget + (request.pendingPriceRequest?.amount ?? request.budget * 2)) / 2
                            )}`}
                            className="w-full bg-transparent text-sm text-[#1a1a2e] placeholder:text-[#cbd5e1] focus:outline-none py-1.5 pl-1"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const max = (request.pendingPriceRequest?.amount ?? 0) - 1;
                            const min = request.budget + 1;
                            const cur = parseInt(counterAmount || String(min), 10);
                            const next = Math.min(max, (isNaN(cur) ? min : cur) + 1);
                            setCounterAmount(String(next));
                          }}
                          className="w-8 h-8 rounded-lg bg-[#f1f5f9] text-[#64748b] flex items-center justify-center hover:bg-[#e2e8f0] transition-colors text-base shrink-0"
                        >+</button>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleCounterOffer}
                          className="flex-1 py-1.5 bg-[#2F6BFF] text-white text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#1e5ae0] transition-colors"
                        >
                          <Send size={11} /> Send Counter
                        </button>
                        <button
                          onClick={() => {
                            setShowCounterInput(false);
                            setCounterAmount("");
                            setCounterError("");
                            setCounterTargetMsgId(null);
                          }}
                          className="px-3 py-1.5 bg-white border border-[#e2e8f0] text-[#64748b] text-xs rounded-lg hover:bg-[#f1f5f9] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Influencer: Accept or Decline the brand's counter ── */}
                  {currentUserRole === "influencer" && isPinnedCounterPending && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleRespondToCounter("accepted")}
                        className="flex-1 py-1.5 bg-[#10b981] text-white text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#059669] transition-colors"
                      >
                        <Check size={12} /> Accept ₹{pinnedCounterAmt?.toLocaleString()}
                      </button>
                      <button
                        onClick={() => handleRespondToCounter("rejected")}
                        className="flex-1 py-1.5 bg-white border border-[#fde68a] text-[#92400e] text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#fef9c3] transition-colors"
                      >
                        <X size={12} /> Decline
                      </button>
                    </div>
                  )}
                  </div>
                  )}
                </div>
              );
            })()}

            {/* ── PAID plan input area ─────────────────────── */}
            {!isFreePlan && !isInfluencerChatLocked && (
              <>
                {/* ── Price Request Input (influencer only) ── */}
                <AnimatePresence>
                  {showPriceInput && currentUserRole === "influencer" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-[#e8ecf4] shrink-0"
                    >
                      <div className="px-4 py-3 bg-[#fffbeb]">
                        <p className="text-xs text-[#92400e] mb-2 flex items-center gap-1.5">
                          <TrendingUp size={12} />
                          Request a higher budget from the brand
                          {negotiationRound > 0 && (
                            <span className="ml-auto text-[10px] bg-[#fef9c3] text-[#92400e] px-1.5 py-0.5 rounded-full">
                              Round {negotiationRound}/{MAX_NEGOTIATION_ROUNDS}
                            </span>
                          )}
                        </p>
                        {maxRoundsReached ? (
                          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 text-xs text-[#ef4444] flex items-center gap-2">
                            <AlertCircle size={13} />
                            Max negotiation rounds reached. No further requests can be sent.
                          </div>
                        ) : (
                        <div className="flex gap-2">
                          <div className="flex-1 flex items-center bg-white border border-[#fde68a] rounded-xl px-3 focus-within:ring-2 focus-within:ring-[#f59e0b]/20 focus-within:border-[#f59e0b] transition-all">
                            <IndianRupee size={14} className="text-[#f59e0b] shrink-0" />
                            <input
                              type="number"
                              value={priceAmount}
                              onChange={(e) => {
                                setPriceAmount(e.target.value);
                                setPriceError("");
                              }}
                              placeholder={`Current: ₹${request.budget.toLocaleString()}`}
                              className="flex-1 bg-transparent text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none py-2.5 pl-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              min={request.budget + 1}
                            />
                          </div>
                          <button
                            onClick={handleSendPriceRequest}
                            className="px-4 py-2.5 bg-[#f59e0b] text-white text-sm rounded-xl hover:bg-[#d97706] transition-colors flex items-center gap-1.5 shrink-0"
                          >
                            <Send size={13} /> Send
                          </button>
                          <button
                            onClick={() => {
                              setShowPriceInput(false);
                              setPriceAmount("");
                              setPriceError("");
                            }}
                            className="w-10 h-10 flex items-center justify-center text-[#94a3b8] hover:text-[#1a1a2e] hover:bg-[#f1f5f9] rounded-xl transition-colors shrink-0"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        )}
                        {priceError && (
                          <p className="text-[11px] text-[#ef4444] mt-1.5 flex items-center gap-1">
                            <AlertCircle size={10} /> {priceError}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Daily limit reached banner (brand only) ── */}
                {limitReached && (
                  <div className="px-4 py-3 bg-[#fef2f2] border-t border-[#fee2e2] shrink-0">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#ef4444]/10 flex items-center justify-center shrink-0">
                        <AlertCircle size={15} className="text-[#ef4444]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[#ef4444]">Daily Message Limit Reached</p>
                        <p className="text-xs text-[#64748b] mt-0.5">
                          You've used all {brandPlan!.dailyMessageLimit} messages for today on your{" "}
                          <strong>{brandPlan!.name} plan</strong>. Limit resets at midnight.
                        </p>
                        <a
                          href="/brand/subscription"
                          className="inline-flex items-center gap-1 text-xs text-[#2F6BFF] mt-2 hover:underline"
                        >
                          Upgrade for more messages <ArrowRight size={11} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Daily usage bar (brand only, paid, not unlimited) ── */}
                {isBrandGated && brandPlan!.isPaid && !isUnlimited && !limitReached && (
                  <div className="px-4 pt-2.5 pb-0 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#94a3b8]">
                        Messages today
                      </span>
                      <span
                        className={`text-[10px] ${
                          remaining <= 5 ? "text-[#f59e0b]" : "text-[#64748b]"
                        }`}
                      >
                        {todayCount} / {brandPlan!.dailyMessageLimit}
                        {remaining <= 10 && ` · ${remaining} left`}
                      </span>
                    </div>
                    <div className="h-1 bg-[#f1f5f9] rounded-full overflow-hidden mb-2.5">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background:
                            remaining <= 5
                              ? "#ef4444"
                              : remaining <= 20
                              ? "#f59e0b"
                              : "#2F6BFF",
                        }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min((todayCount / brandPlan!.dailyMessageLimit) * 100, 100)}%`,
                        }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}

                {/* ── Input ──────────────────────────────────── */}
                <div
                  className={`px-4 pb-4 border-t border-[#e8ecf4] bg-white shrink-0 ${
                    isBrandGated && brandPlan!.isPaid && !isUnlimited ? "pt-1" : "pt-3"
                  }`}
                >
                  {/* ── Contact Share strip — accepted collaborations, both roles ── */}
                  {request.status === "accepted" && (() => {
                    const cs = request.contactShareStatus ?? "none";
                    const myEmail = currentUserRole === "brand"
                      ? (user?.brandContactEmail || user?.email || "")
                      : (user?.email || "");
                    const myPhone = user?.phone || "";

                    // "none" or "declined" → no button needed (contacts available in dashboard)
                    if (cs === "none" || cs === "declined") {
                      return null;
                    }

                    // Waiting for the OTHER party to respond
                    if (
                      (cs === "brand_requested" && currentUserRole === "brand") ||
                      (cs === "influencer_requested" && currentUserRole === "influencer")
                    ) {
                      return (
                        <div className="mb-2.5 flex items-center gap-2 px-3 py-1.5 bg-[#fffbeb] border border-[#fde68a] rounded-lg">
                          <div className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full animate-pulse shrink-0" />
                          <span className="text-xs text-[#92400e]">Waiting for consent…</span>
                        </div>
                      );
                    }

                    // Other party requests our consent — show accept/decline
                    if (
                      (cs === "brand_requested" && currentUserRole === "influencer") ||
                      (cs === "influencer_requested" && currentUserRole === "brand")
                    ) {
                      return (
                        <div className="mb-2.5 bg-[#EBF2FF] border border-[#c7dbff] rounded-xl p-3">
                          <p className="text-xs text-[#1e40af] mb-2 flex items-center gap-1.5">
                            <Share2 size={12} />
                            {cs === "brand_requested" ? request.brandName : (request.influencerName ?? "They")} wants to exchange contact details
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                respondToContactShare(request.id, "accept", myEmail || undefined, myPhone || undefined);
                                toast.success("Contacts shared! ✅");
                              }}
                              className="flex-1 py-1.5 bg-[#2F6BFF] text-white text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#1e5ae0] transition-colors"
                            >
                              <ShieldCheck size={11} /> Share My Contact
                            </button>
                            <button
                              onClick={() => {
                                respondToContactShare(request.id, "decline");
                                toast("Declined.", { description: "Contact sharing request declined." });
                              }}
                              className="flex-1 py-1.5 bg-white border border-[#e2e8f0] text-[#64748b] text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-[#fef2f2] hover:text-[#ef4444] transition-colors"
                            >
                              <ShieldX size={11} /> Decline
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // Shared — contacts available in dashboard, nothing to show here
                    if (cs === "shared") {
                      return null;
                    }

                    return null;
                  })()}

                  {/* Request Price button (influencer only, accepted collaboration) */}
                  {currentUserRole === "influencer" && request.status === "accepted" && (
                    <div className="mb-2.5">
                      <button
                        onClick={() => setShowPriceInput((v) => !v)}
                        disabled={hasPendingPriceRequest}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          hasPendingPriceRequest
                            ? "bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed"
                            : showPriceInput
                            ? "bg-[#fde68a]/60 text-[#92400e] border border-[#fde68a]"
                            : "bg-[#fffbeb] text-[#92400e] border border-[#fde68a] hover:bg-[#fde68a]/50"
                        }`}
                      >
                        <IndianRupee size={12} />
                        {pendingPriceStatus === "countered"
                          ? "Counter offer pending…"
                          : pendingPriceStatus === "pending"
                          ? "Price request pending…"
                          : "Request Price Update"}
                      </button>
                    </div>
                  )}

                  {/* ── Reply preview strip ── */}
                  <AnimatePresence>
                    {replyTo && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden mb-2"
                      >
                        <div className="flex items-center gap-2 px-3 py-2 bg-[#EBF2FF] rounded-xl border-l-[3px] border-[#2F6BFF]">
                          <CornerUpLeft size={13} className="text-[#2F6BFF] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-[#2F6BFF]">{replyTo.senderName}</p>
                            <p className="text-[11px] text-[#64748b] truncate">{replyTo.text}</p>
                          </div>
                          <button
                            onClick={() => setReplyTo(null)}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[#94a3b8] hover:text-[#1a1a2e] hover:bg-[#c7d9f8] transition-colors shrink-0"
                            aria-label="Cancel reply"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-end gap-2">
                    <div className="flex-1 bg-[#f8f9fc] border border-[#e2e8f0] rounded-2xl px-4 py-2.5 focus-within:border-[#2F6BFF] focus-within:ring-2 focus-within:ring-[#2F6BFF]/15 transition-all">
                      <textarea
                        ref={inputRef}
                        value={text}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        disabled={limitReached}
                        placeholder={limitReached ? "Daily limit reached — upgrade to continue…" : "Type a message…"}
                        rows={1}
                        className="w-full bg-transparent text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none resize-none max-h-[120px] leading-relaxed disabled:cursor-not-allowed"
                        style={{ overflowY: "auto" }}
                      />
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={!text.trim() || limitReached}
                      className="w-11 h-11 rounded-2xl bg-[#2F6BFF] flex items-center justify-center text-white hover:bg-[#1e5ae0] disabled:opacity-35 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
                      aria-label="Send message"
                    >
                      <Send size={17} />
                    </button>
                  </div>
                  <p className="text-[10px] text-[#c4cdd8] mt-2 pl-1">
                    {isUnlimited
                      ? "Unlimited messages · Enterprise Plan"
                      : "Enter to send · Shift + Enter for new line"}
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}