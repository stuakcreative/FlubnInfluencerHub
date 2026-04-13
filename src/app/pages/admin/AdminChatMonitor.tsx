import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, Search, Filter, Eye, X, ChevronDown,
  IndianRupee, TrendingUp, Check, Building2, UserCheck,
  Shield, Clock, CheckCircle, XCircle, CornerUpLeft,
  ArrowLeft, Hash, ChevronUp,
} from "lucide-react";
import { useCollaboration } from "../../context/CollaborationContext";
import type { ChatMessage } from "../../context/CollaborationContext";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { Pagination } from "../../components/Pagination";

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

function formatRelative(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "1d ago";
  if (diffDay < 7) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 7)}w ago`;
}

// ── Read-only message bubble (no interactivity) ──────────────────
function ReadOnlyBubble({ msg, prevMsg, request }: {
  msg: ChatMessage;
  prevMsg?: ChatMessage;
  request: any;
}) {
  const isInfluencer = msg.senderRole === "influencer";
  const showDateSep =
    !prevMsg ||
    new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();
  const showSenderName =
    !prevMsg || prevMsg.senderRole !== msg.senderRole;

  // price_request card (read-only)
  if (msg.type === "price_request") {
    const priceStatus = request.pendingPriceRequest?.messageId === msg.id
      ? request.pendingPriceRequest?.status
      : undefined;
    const counterAmt = request.pendingPriceRequest?.counterAmount;
    return (
      <div>
        {showDateSep && (
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#e8ecf4]" />
            <span className="text-[10px] text-[#94a3b8] px-2 py-0.5 rounded-full bg-[#f1f5f9]">
              {formatDate(msg.timestamp)}
            </span>
            <div className="flex-1 h-px bg-[#e8ecf4]" />
          </div>
        )}
        <div className="flex justify-start mb-3">
          <div className="max-w-[85%]">
            {showSenderName && (
              <span className="text-[10px] text-[#94a3b8] mb-1 px-1 block">{msg.senderName}</span>
            )}
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl rounded-bl-sm p-3.5 min-w-[240px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#f59e0b]/15 flex items-center justify-center shrink-0">
                  <TrendingUp size={14} className="text-[#f59e0b]" />
                </div>
                <span className="text-xs text-[#92400e]">Budget Update Request</span>
                {/* Status badge */}
                {priceStatus && (
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wide ${
                    priceStatus === "accepted" ? "bg-[#ecfdf5] text-[#10b981]" :
                    priceStatus === "rejected" ? "bg-[#fef2f2] text-[#ef4444]" :
                    priceStatus === "countered" ? "bg-[#EBF2FF] text-[#2F6BFF]" :
                    "bg-[#fffbeb] text-[#f59e0b]"
                  }`}>
                    {priceStatus}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#78350f] mb-2">{msg.text}</p>
              <div className="flex items-center gap-1.5 bg-white/70 rounded-xl px-3 py-2">
                <IndianRupee size={14} className="text-[#f59e0b]" />
                <span className="text-[#1a1a2e] text-sm">{msg.requestedAmount?.toLocaleString()}</span>
                <span className="text-[11px] text-[#94a3b8] ml-auto">was ₹{request.budget.toLocaleString()}</span>
              </div>
              {counterAmt && priceStatus === "countered" && (
                <div className="mt-2 flex items-center gap-1.5 bg-[#EBF2FF] rounded-xl px-3 py-2">
                  <IndianRupee size={14} className="text-[#2F6BFF]" />
                  <span className="text-[#2F6BFF] text-sm">{counterAmt.toLocaleString()}</span>
                  <span className="text-[11px] text-[#94a3b8] ml-auto">counter offer</span>
                </div>
              )}
              {/* Admin read-only label */}
              <div className="mt-2.5 flex items-center gap-1 text-[10px] text-[#94a3b8]">
                <Shield size={9} />
                Admin view — read only
              </div>
            </div>
            <span className="text-[10px] text-[#94a3b8] px-1 mt-0.5 block">{formatTime(msg.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }

  // normal / system messages
  const isBrand = msg.senderRole === "brand";
  return (
    <div>
      {showDateSep && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#e8ecf4]" />
          <span className="text-[10px] text-[#94a3b8] px-2 py-0.5 rounded-full bg-[#f1f5f9]">
            {formatDate(msg.timestamp)}
          </span>
          <div className="flex-1 h-px bg-[#e8ecf4]" />
        </div>
      )}
      <div className={`flex mb-1 ${isBrand ? "justify-end" : "justify-start"}`}>
        {/* Influencer avatar placeholder */}
        {!isBrand && (
          <div className="w-7 shrink-0 mr-2 self-end">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px]"
              style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
            >
              {(msg.senderName?.[0] ?? "?").toUpperCase()}
            </div>
          </div>
        )}
        <div className={`flex flex-col ${isBrand ? "items-end" : "items-start"} max-w-[78%]`}>
          {showSenderName && (
            <span className="text-[10px] text-[#94a3b8] mb-1 px-1 flex items-center gap-1">
              {msg.senderName}
              <span className={`px-1.5 py-px rounded-full text-[9px] ${isBrand ? "bg-[#EBF2FF] text-[#2F6BFF]" : "bg-[#f0fdf4] text-[#10b981]"}`}>
                {isBrand ? "Brand" : "Influencer"}
              </span>
            </span>
          )}
          {/* Reply-to quote */}
          {msg.replyTo && (
            <div className={`flex items-start gap-1.5 mb-1 px-2 py-1.5 rounded-xl border text-xs max-w-full ${
              isBrand
                ? "bg-[#dbeafe]/40 border-[#93c5fd]/30 text-[#1e40af]"
                : "bg-[#f0fdf4]/60 border-[#86efac]/30 text-[#14532d]"
            }`}>
              <CornerUpLeft size={10} className="mt-0.5 shrink-0 opacity-60" />
              <div className="min-w-0">
                <p className="opacity-60 text-[10px]">{msg.replyTo.senderName}</p>
                <p className="truncate opacity-80">{msg.replyTo.text}</p>
              </div>
            </div>
          )}
          {/* Bubble */}
          <div
            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
              isBrand
                ? "bg-[#2F6BFF] text-white rounded-br-sm"
                : msg.type === "price_accepted"
                ? "bg-[#ecfdf5] text-[#14532d] border border-[#bbf7d0] rounded-bl-sm"
                : msg.type === "price_rejected"
                ? "bg-[#fef2f2] text-[#7f1d1d] border border-[#fecaca] rounded-bl-sm"
                : msg.type === "price_countered"
                ? "bg-[#EBF2FF] text-[#1e3a8a] border border-[#bfdbfe] rounded-bl-sm"
                : "bg-[#f1f5f9] text-[#1a1a2e] rounded-bl-sm"
            }`}
          >
            {msg.text}
          </div>
          <span className="text-[10px] text-[#94a3b8] px-1 mt-0.5">{formatTime(msg.timestamp)}</span>
        </div>
        {/* Brand avatar */}
        {isBrand && (
          <div className="w-7 shrink-0 ml-2 self-end">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px]"
              style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)" }}
            >
              {(msg.senderName?.[0] ?? "?").toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function AdminChatMonitor() {
  const { requests } = useCollaboration();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "has_messages" | "price_negotiation">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgSearch, setMsgSearch] = useState("");
  const [msgMatchIdx, setMsgMatchIdx] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Only accepted collaborations can have chats
  const accepted = requests.filter((r) => r.status === "accepted");

  const filtered = accepted.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      r.brandName.toLowerCase().includes(q) ||
      (r.influencerName ?? "").toLowerCase().includes(q) ||
      r.campaignName.toLowerCase().includes(q);
    const msgs = r.chatMessages ?? [];
    const matchFilter =
      filter === "all" ||
      (filter === "has_messages" && msgs.length > 0) ||
      (filter === "price_negotiation" && msgs.some((m) => m.type === "price_request"));
    return matchSearch && matchFilter;
  });

  const selected = requests.find((r) => r.id === selectedId);
  const selectedMessages = selected?.chatMessages ?? [];

  const [currentPage, setCurrentPage] = useState(1);
  const LIST_PER_PAGE = 10;
  useEffect(() => { setCurrentPage(1); }, [filter, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / LIST_PER_PAGE));
  const pagedList = filtered.slice((currentPage - 1) * LIST_PER_PAGE, currentPage * LIST_PER_PAGE);

  // Scroll to bottom when chat opens or new messages arrive
  useEffect(() => {
    if (selectedId) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    }
  }, [selectedId, selectedMessages.length]);

  // Reset message search when switching conversations
  useEffect(() => {
    setMsgSearch("");
    setMsgMatchIdx(0);
    setSearchOpen(false);
  }, [selectedId]);

  // Compute matched message IDs
  const matchedIds = msgSearch.trim()
    ? selectedMessages
        .filter((m) => m.text.toLowerCase().includes(msgSearch.toLowerCase()))
        .map((m) => m.id)
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

  const totalChats = accepted.filter((r) => (r.chatMessages?.length ?? 0) > 0).length;
  const totalMessages = accepted.reduce((sum, r) => sum + (r.chatMessages?.length ?? 0), 0);
  const priceNegotiations = accepted.filter((r) =>
    (r.chatMessages ?? []).some((m) => m.type === "price_request")
  ).length;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Chat Monitor</h1>
          <p className="text-[#64748b] text-sm mt-1">
            Read-only view of all brand ↔ influencer conversations.
          </p>
        </div>
        {/* Admin badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#fef9c3] border border-[#fde68a] rounded-xl">
          <Shield size={13} className="text-[#d97706]" />
          <span className="text-xs text-[#92400e]">Admin Read-Only Access</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Collabs", value: accepted.length, color: "#2F6BFF", bg: "#EBF2FF", icon: CheckCircle },
          { label: "Have Chats", value: totalChats, color: "#10b981", bg: "#ecfdf5", icon: MessageSquare },
          { label: "Total Messages", value: totalMessages, color: "#8b5cf6", bg: "#faf5ff", icon: Hash },
          { label: "Price Negotiations", value: priceNegotiations, color: "#f59e0b", bg: "#fffbeb", icon: IndianRupee },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: s.bg }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl text-[#1a1a2e]">{s.value}</p>
              <p className="text-xs text-[#94a3b8]">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ height: "calc(100vh - 340px)", minHeight: 480 }}>

        {/* ── Left: conversation list ── */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex flex-col bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden ${selectedId ? "hidden lg:flex w-full lg:w-[340px] shrink-0" : "w-full lg:w-[340px] shrink-0"}`}
        >
          {/* Search */}
          <div className="p-3 border-b border-[#e2e8f0] space-y-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brand, influencer…"
                className="w-full pl-9 pr-3 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
              />
            </div>
            {/* Filters */}
            <div className="flex gap-1">
              {(["all", "has_messages", "price_negotiation"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] transition-colors ${
                    filter === f
                      ? "bg-[#1a1a2e] text-white"
                      : "bg-[#f8f9fc] text-[#64748b] hover:bg-[#e2e8f0]"
                  }`}
                >
                  {f === "all" ? "All" : f === "has_messages" ? "Has Chat" : "Negotiation"}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f1f5f9]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageSquare size={32} className="text-[#cbd5e1] mb-3" />
                <p className="text-sm text-[#94a3b8]">No conversations found</p>
              </div>
            ) : (
              pagedList.map((r) => {
                const msgs = r.chatMessages ?? [];
                const lastMsg = msgs[msgs.length - 1];
                const hasPriceNeg = msgs.some((m) => m.type === "price_request");
                const isActive = selectedId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      isActive
                        ? "bg-[#EBF2FF] border-l-2 border-[#2F6BFF]"
                        : "hover:bg-[#f8f9fc] border-l-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm"
                        style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
                      >
                        {(r.brandName?.[0] ?? "B").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-sm text-[#1a1a2e] truncate">{r.brandName}</p>
                          <span className="text-[#94a3b8] text-xs shrink-0">↔</span>
                          <p className="text-sm text-[#10b981] truncate">{r.influencerName ?? "—"}</p>
                        </div>
                        <p className="text-xs text-[#64748b] truncate mb-1">{r.campaignName}</p>
                        {lastMsg ? (
                          <p className="text-[11px] text-[#94a3b8] truncate">{lastMsg.senderName}: {lastMsg.text}</p>
                        ) : (
                          <p className="text-[11px] text-[#cbd5e1] italic">No messages yet</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-[#ecfdf5] text-[#10b981] text-[9px] rounded-full">
                            Accepted
                          </span>
                          {msgs.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-[#f1f5f9] text-[#64748b] text-[9px] rounded-full">
                              {msgs.length} msg{msgs.length > 1 ? "s" : ""}
                            </span>
                          )}
                          {hasPriceNeg && (
                            <span className="px-1.5 py-0.5 bg-[#fffbeb] text-[#d97706] text-[9px] rounded-full flex items-center gap-0.5">
                              <IndianRupee size={8} /> Negotiation
                            </span>
                          )}
                          {lastMsg && (
                            <span className="ml-auto text-[9px] text-[#94a3b8]">
                              {formatRelative(lastMsg.timestamp)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={LIST_PER_PAGE} onPageChange={setCurrentPage} label="chats" />
        </motion.div>

        {/* ── Right: chat viewer ── */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className={`relative flex-1 flex flex-col bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden min-w-0 ${!selectedId ? "hidden lg:flex" : "flex"}`}
        >
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}
              >
                <Eye size={34} className="text-white" />
              </div>
              <p className="text-[#1a1a2e] mb-1">Select a conversation</p>
              <p className="text-sm text-[#94a3b8] max-w-[260px]">
                Choose a collaboration from the list to view the full chat history.
              </p>
              <div className="mt-6 flex items-center gap-2 px-4 py-2.5 bg-[#fef9c3] border border-[#fde68a] rounded-xl">
                <Shield size={14} className="text-[#d97706]" />
                <p className="text-xs text-[#92400e]">All messages are read-only. Admin cannot send messages.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e8ecf4] bg-white shrink-0">
                {/* Back button (mobile) */}
                <button
                  onClick={() => setSelectedId(null)}
                  className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#f1f5f9] text-[#64748b] transition-colors shrink-0"
                >
                  <ArrowLeft size={16} />
                </button>

                {/* Brand avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm shrink-0"
                  style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)" }}
                >
                  {(selected.brandName?.[0] ?? "B").toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-[#1a1a2e] truncate">{selected.brandName}</p>
                    <span className="text-[#94a3b8] text-xs shrink-0">↔</span>
                    <p className="text-sm text-[#10b981] truncate">{selected.influencerName ?? "—"}</p>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] truncate">{selected.campaignName}</p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <span className="px-2 py-0.5 bg-[#ecfdf5] text-[#10b981] text-[10px] rounded-full flex items-center gap-0.5">
                    <CheckCircle size={9} /> Accepted
                  </span>
                  <span className="px-2 py-0.5 bg-[#fef9c3] text-[#d97706] text-[10px] rounded-full flex items-center gap-0.5">
                    <Shield size={9} /> Read-only
                  </span>
                </div>
              </div>

              {/* Campaign info bar */}
              <div className="px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e8ecf4] shrink-0">
                <div className="flex items-center gap-4 flex-wrap text-[11px] text-[#94a3b8]">
                  <span>Budget: <span className="text-[#1a1a2e]">₹{selected.budget.toLocaleString()}</span></span>
                  <span className="text-[#e2e8f0]">·</span>
                  <span>Timeline: <span className="text-[#1a1a2e]">{selected.timeline}</span></span>
                  <span className="text-[#e2e8f0]">·</span>
                  <span>{selectedMessages.length} message{selectedMessages.length !== 1 ? "s" : ""}</span>
                  {selected.pendingPriceRequest && (
                    <>
                      <span className="text-[#e2e8f0]">·</span>
                      <span className="flex items-center gap-1">
                        <IndianRupee size={10} className="text-[#f59e0b]" />
                        Price negotiation:{" "}
                        <span className={`ml-0.5 ${
                          selected.pendingPriceRequest.status === "accepted" ? "text-[#10b981]" :
                          selected.pendingPriceRequest.status === "rejected" ? "text-[#ef4444]" :
                          selected.pendingPriceRequest.status === "countered" ? "text-[#2F6BFF]" :
                          "text-[#f59e0b]"
                        }`}>
                          {selected.pendingPriceRequest.status}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
              >
                {selectedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-[#EBF2FF] flex items-center justify-center mb-4">
                      <MessageSquare size={28} className="text-[#2F6BFF]" />
                    </div>
                    <p className="text-sm text-[#1a1a2e]">No messages yet</p>
                    <p className="text-xs text-[#94a3b8] mt-1">
                      The brand and influencer haven't chatted yet.
                    </p>
                  </div>
                ) : (
                  selectedMessages.map((msg, idx) => {
                    const isMatch =
                      msgSearch.trim() !== "" &&
                      msg.text.toLowerCase().includes(msgSearch.toLowerCase());
                    const matchPos = matchedIds.indexOf(msg.id);
                    const isCurrentMatch = isMatch && matchPos === msgMatchIdx;
                    return (
                      <div
                        key={msg.id}
                        ref={(el) => {
                          if (isMatch) msgRefs.current[msg.id] = el;
                        }}
                        className={`rounded-2xl transition-all duration-200 ${
                          isCurrentMatch
                            ? "ring-2 ring-[#2F6BFF]/50 bg-[#EBF2FF]/30 -mx-1 px-1"
                            : isMatch
                            ? "ring-1 ring-[#2F6BFF]/20 bg-[#EBF2FF]/10 -mx-1 px-1"
                            : ""
                        }`}
                      >
                        <ReadOnlyBubble
                          msg={msg}
                          prevMsg={selectedMessages[idx - 1]}
                          request={selected}
                        />
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />

                {/* Floating search button */}
                {selectedMessages.length > 0 && (
                  <div className="absolute bottom-16 right-4 z-20 flex flex-col items-end gap-2">
                    <AnimatePresence>
                      {searchOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.92, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.92, y: 10 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-2xl shadow-xl px-3 py-2.5 w-72"
                        >
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
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      onClick={() => {
                        if (searchOpen) { setMsgSearch(""); setMsgMatchIdx(0); }
                        setSearchOpen((o) => !o);
                      }}
                      whileTap={{ scale: 0.88 }}
                      whileHover={{ scale: 1.08 }}
                      className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors ${
                        searchOpen ? "bg-[#1a1a2e] text-white" : "bg-[#2F6BFF] text-white"
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {searchOpen ? (
                          <motion.span
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center justify-center"
                          >
                            <X size={15} />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="search"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center justify-center"
                          >
                            <Search size={15} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Read-only footer */}
              <div className="px-4 py-3 border-t border-[#e8ecf4] bg-[#fef9c3]/60 shrink-0 flex items-center gap-2">
                <Shield size={13} className="text-[#d97706] shrink-0" />
                <p className="text-xs text-[#92400e]">
                  You are viewing this conversation as an admin. Sending messages is disabled.
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}