import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle, Search, ArrowLeft, Clock, CheckCircle, XCircle,
  Inbox, ChevronDown, Briefcase,
} from "lucide-react";
import { useCollaboration } from "../../context/CollaborationContext";
import { useAuth } from "../../context/AuthContext";
import { ChatPanel } from "../../components/ChatPanel";
import { ProfileAvatar, hashGradient } from "../../components/ProfileAvatar";
import { getUnreadCount, markChatAsRead } from "../../utils/chatReadState";
import { isBrandVerified } from "../../utils/brandVerification";
import { VerifiedBadge } from "../../components/VerifiedBadge";

function formatRelative(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

const CAMPAIGN_COLORS = [
  { bg: "#EBF2FF", text: "#2F6BFF", dot: "#2F6BFF" },
  { bg: "#F0FDF4", text: "#16a34a", dot: "#22c55e" },
  { bg: "#FFF7ED", text: "#ea580c", dot: "#f97316" },
  { bg: "#FDF4FF", text: "#9333ea", dot: "#a855f7" },
  { bg: "#FFF1F2", text: "#e11d48", dot: "#f43f5e" },
  { bg: "#F0FDFA", text: "#0d9488", dot: "#14b8a6" },
  { bg: "#FFFBEB", text: "#d97706", dot: "#f59e0b" },
];
function campaignColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return CAMPAIGN_COLORS[h % CAMPAIGN_COLORS.length];
}

export default function InfluencerChats() {
  const { requests: allRequests } = useCollaboration();
  const { user } = useAuth();
  // Only show this influencer's own conversations
  const requests = allRequests.filter((r) => r.influencerId === user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const activeId = searchParams.get("id");
  const [mobileView, setMobileView] = useState<"list" | "chat">(activeId ? "chat" : "list");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeId) setMobileView("chat");
  }, [activeId]);

  const userId = user?.id ?? "influencer_user";

  const conversations = requests
    .filter((r) => r.status === "accepted")
    .sort((a, b) => {
      const aLast = a.chatMessages?.length
        ? new Date(a.chatMessages[a.chatMessages.length - 1].timestamp).getTime()
        : new Date(a.sentDate || 0).getTime();
      const bLast = b.chatMessages?.length
        ? new Date(b.chatMessages[b.chatMessages.length - 1].timestamp).getTime()
        : new Date(b.sentDate || 0).getTime();
      return bLast - aLast;
    });

  const filtered = conversations.filter(
    (r) =>
      r.brandName?.toLowerCase().includes(search.toLowerCase()) ||
      r.campaignName.toLowerCase().includes(search.toLowerCase())
  );

  // Group by brandId (fallback to brandName)
  const groups = (() => {
    const map = new Map<string, typeof filtered>();
    for (const conv of filtered) {
      const key = conv.brandId ?? conv.brandName ?? "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(conv);
    }
    return Array.from(map.entries())
      .map(([key, convs]) => {
        const lastActivity = Math.max(
          ...convs.map((c) =>
            c.chatMessages?.length
              ? new Date(c.chatMessages[c.chatMessages.length - 1].timestamp).getTime()
              : new Date(c.sentDate || 0).getTime()
          )
        );
        const totalUnread = convs.reduce(
          (sum, c) => sum + getUnreadCount(userId, c.id, c.chatMessages ?? [], "influencer"),
          0
        );
        return { key, convs, lastActivity, totalUnread };
      })
      .sort((a, b) => b.lastActivity - a.lastActivity);
  })();

  const totalUnread = conversations.reduce(
    (sum, r) => sum + getUnreadCount(userId, r.id, r.chatMessages ?? [], "influencer"),
    0
  );

  const selectConversation = (id: string) => {
    setSearchParams({ id });
    setMobileView("chat");
    // Mark chat as read immediately when selected
    markChatAsRead(userId, id);
  };

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeRequest = requests.find((r) => r.id === activeId);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#f8f9fc] overflow-hidden -m-6">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div
        className={`flex flex-col w-full md:w-[300px] lg:w-[340px] bg-white border-r border-[#e2e8f0] shrink-0 ${
          mobileView === "chat" ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-[#1a1a2e]">Messages</h1>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 bg-[#2F6BFF] text-white text-xs rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by brand or campaign…"
              className="w-full pl-9 pr-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            />
          </div>
        </div>

        {/* List */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
        >
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mb-3">
                <Inbox size={22} className="text-[#94a3b8]" />
              </div>
              {conversations.length === 0 ? (
                <>
                  <p className="text-[#1a1a2e] text-sm">No conversations yet</p>
                  <p className="text-[#94a3b8] text-xs mt-1 max-w-[200px]">
                    Chats unlock when you accept a brand's collaboration request
                  </p>
                  <button
                    onClick={() => navigate("/influencer/requests")}
                    className="mt-4 px-4 py-2 bg-[#EBF2FF] text-[#2F6BFF] text-xs rounded-xl hover:bg-[#dbeafe] transition-colors"
                  >
                    View Requests
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[#1a1a2e] text-sm">No results</p>
                  <p className="text-[#94a3b8] text-xs mt-1">Try a different search</p>
                </>
              )}
            </div>
          ) : (
            <div className="py-2">
              {groups.map(({ key, convs, totalUnread: groupUnread }) => {
                const rep = convs[0];
                const isMulti = convs.length > 1;
                const isGroupCollapsed = !!collapsed[key];

                if (!isMulti) {
                  // ── Single flat row ──────────────────────────────────
                  const req = convs[0];
                  const isActive = req.id === activeId;
                  const unread = getUnreadCount(userId, req.id, req.chatMessages ?? [], "influencer");
                  const lastMsg = req.chatMessages?.length
                    ? req.chatMessages[req.chatMessages.length - 1]
                    : null;
                  const lastTime = lastMsg
                    ? formatRelative(lastMsg.timestamp)
                    : formatRelative(req.sentDate);
                  const color = campaignColor(req.campaignName);

                  return (
                    <motion.button
                      key={req.id}
                      onClick={() => selectConversation(req.id)}
                      whileHover={{ backgroundColor: isActive ? undefined : "#f8f9fc" }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                        isActive ? "bg-[#EBF2FF] border-r-2 border-[#2F6BFF]" : "hover:bg-[#f8f9fc]"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <ProfileAvatar
                          photo={req.brandPhoto}
                          name={req.brandName}
                          gradient={hashGradient(key)}
                          size="w-11 h-11"
                          userId={req.brandId}
                          userType="brand"
                          requestId={req.id}
                          clickable={false}
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10b981] border-2 border-white rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-sm text-[#1a1a2e] truncate">{req.brandName}</span>
                            {req.brandId && isBrandVerified(req.brandId) && <VerifiedBadge size={12} />}
                          </div>
                          <span className="text-[10px] text-[#94a3b8] shrink-0">{lastTime}</span>
                        </div>
                        {/* Campaign pill */}
                        <div className="mb-1">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md truncate max-w-full"
                            style={{ background: color.bg, color: color.text }}
                          >
                            <Briefcase size={9} />
                            {req.campaignName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-[#64748b] truncate">
                            {lastMsg ? (
                              <>
                                {lastMsg.senderRole === "influencer" ? "You: " : ""}
                                {lastMsg.type === "price_request"
                                  ? "💰 Budget update request"
                                  : lastMsg.text.length > 40
                                  ? lastMsg.text.slice(0, 40) + "…"
                                  : lastMsg.text}
                              </>
                            ) : (
                              <span className="italic text-[#94a3b8]">No messages yet</span>
                            )}
                          </p>
                          {unread > 0 && (
                            <span className="shrink-0 min-w-[20px] h-5 px-1.5 bg-[#2F6BFF] text-white text-[10px] rounded-full flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                }

                // ── Multi-campaign group ─────────────────────────────────
                return (
                  <div key={key}>
                    {/* Group header */}
                    <button
                      onClick={() => toggleCollapse(key)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fc] transition-colors text-left"
                    >
                      <div className="relative shrink-0">
                        <ProfileAvatar
                          photo={rep.brandPhoto}
                          name={rep.brandName}
                          gradient={hashGradient(key)}
                          size="w-11 h-11"
                          userId={rep.brandId}
                          userType="brand"
                          requestId={rep.id}
                          clickable={false}
                        />
                        {/* Project count badge */}
                        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#2F6BFF] text-white text-[9px] flex items-center justify-center border-2 border-white">
                          {convs.length}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm text-[#1a1a2e] truncate">{rep.brandName}</span>
                          {rep.brandId && isBrandVerified(rep.brandId) && <VerifiedBadge size={12} />}
                        </div>
                        <p className="text-[11px] text-[#94a3b8]">{convs.length} active projects</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {groupUnread > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 bg-[#2F6BFF] text-white text-[10px] rounded-full flex items-center justify-center">
                            {groupUnread}
                          </span>
                        )}
                        <motion.div
                          animate={{ rotate: isGroupCollapsed ? -90 : 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <ChevronDown size={14} className="text-[#94a3b8]" />
                        </motion.div>
                      </div>
                    </button>

                    {/* Campaign sub-items */}
                    <AnimatePresence initial={false}>
                      {!isGroupCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="relative ml-[34px] border-l-2 border-[#e2e8f0] pl-0">
                            {convs.map((req, idx) => {
                              const isActive = req.id === activeId;
                              const unread = getUnreadCount(userId, req.id, req.chatMessages ?? [], "influencer");
                              const lastMsg = req.chatMessages?.length
                                ? req.chatMessages[req.chatMessages.length - 1]
                                : null;
                              const lastTime = lastMsg
                                ? formatRelative(lastMsg.timestamp)
                                : formatRelative(req.sentDate);
                              const color = campaignColor(req.campaignName);
                              const isLast = idx === convs.length - 1;

                              return (
                                <motion.button
                                  key={req.id}
                                  onClick={() => selectConversation(req.id)}
                                  whileHover={{ backgroundColor: isActive ? undefined : "#f8f9fc" }}
                                  className={`w-full flex items-start gap-3 pl-4 pr-4 py-3 text-left transition-colors relative ${
                                    isActive
                                      ? "bg-[#EBF2FF] border-r-2 border-[#2F6BFF]"
                                      : "hover:bg-[#f8f9fc]"
                                  } ${isLast ? "mb-1" : ""}`}
                                >
                                  {/* Thread connector dot */}
                                  <span
                                    className="absolute left-[-5px] top-[18px] w-2.5 h-2.5 rounded-full border-2 border-white"
                                    style={{ background: color.dot }}
                                  />

                                  {/* Campaign icon */}
                                  <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                                    style={{ background: color.bg }}
                                  >
                                    <Briefcase size={14} style={{ color: color.text }} />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <span
                                        className="text-sm truncate"
                                        style={{ color: isActive ? "#2F6BFF" : "#1a1a2e" }}
                                      >
                                        {req.campaignName}
                                      </span>
                                      <span className="text-[10px] text-[#94a3b8] shrink-0">{lastTime}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs text-[#64748b] truncate">
                                        {lastMsg ? (
                                          <>
                                            {lastMsg.senderRole === "influencer" ? "You: " : ""}
                                            {lastMsg.type === "price_request"
                                              ? "💰 Budget update"
                                              : lastMsg.text.length > 38
                                              ? lastMsg.text.slice(0, 38) + "…"
                                              : lastMsg.text}
                                          </>
                                        ) : (
                                          <span className="italic text-[#94a3b8]">No messages yet</span>
                                        )}
                                      </p>
                                      {unread > 0 && (
                                        <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-[#2F6BFF] text-white text-[10px] rounded-full flex items-center justify-center">
                                          {unread}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Divider between groups */}
                    <div className="mx-4 border-b border-[#f1f5f9]" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#e2e8f0] shrink-0">
          <button
            onClick={() => navigate("/influencer/requests")}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-[#64748b] hover:text-[#2F6BFF] hover:bg-[#f1f5f9] rounded-xl transition-colors"
          >
            <Clock size={13} />
            View all collaboration requests
          </button>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col overflow-hidden ${
          mobileView === "list" ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Mobile back */}
        <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-[#e2e8f0] shrink-0">
          <button
            onClick={() => { setMobileView("list"); setSearchParams({}); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#f1f5f9] text-[#64748b] transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          {activeRequest && (
            <div className="min-w-0">
              <span className="text-[#1a1a2e] text-sm block truncate">{activeRequest.brandName}</span>
              <span className="text-[#94a3b8] text-xs block truncate">{activeRequest.campaignName}</span>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeId ? (
              <motion.div
                key={activeId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <ChatPanel
                  key={activeId}
                  isOpen={true}
                  onClose={() => { setSearchParams({}); setMobileView("list"); }}
                  requestId={activeId}
                  currentUserRole="influencer"
                  currentUserId={userId}
                  currentUserName={user?.name ?? "You"}
                  embedded={true}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center px-8"
              >
                <div className="w-20 h-20 rounded-3xl bg-[#EBF2FF] flex items-center justify-center mb-5">
                  <MessageCircle size={36} className="text-[#2F6BFF]" />
                </div>
                <h2 className="text-[#1a1a2e] text-xl mb-2">Your Messages</h2>
                <p className="text-[#64748b] text-sm max-w-[280px]">
                  Select a conversation from the left to start chatting with a brand.
                </p>

                {conversations.length > 0 && (
                  <div className="mt-6 flex flex-col gap-2 w-full max-w-[300px]">
                    {conversations.slice(0, 3).map((r) => {
                      const unread = getUnreadCount(userId, r.id, r.chatMessages ?? [], "influencer");
                      const color = campaignColor(r.campaignName);
                      return (
                        <button
                          key={r.id}
                          onClick={() => selectConversation(r.id)}
                          className="flex items-center gap-3 px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl hover:border-[#2F6BFF]/40 hover:bg-[#EBF2FF]/30 transition-colors text-left"
                        >
                          <ProfileAvatar
                            photo={r.brandPhoto}
                            name={r.brandName}
                            gradient={hashGradient(r.brandId ?? r.brandName ?? "unknown")}
                            size="w-8 h-8"
                            textSize="text-xs"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#1a1a2e] truncate">{r.brandName}</p>
                            <p
                              className="text-[10px] truncate px-1.5 py-0.5 rounded-md inline-block mt-0.5"
                              style={{ background: color.bg, color: color.text }}
                            >
                              {r.campaignName}
                            </p>
                          </div>
                          {unread > 0 && (
                            <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-[#2F6BFF] text-white text-[10px] rounded-full flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 flex items-center gap-6 text-xs text-[#94a3b8]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-[#10b981]" /> Accepted
                  </span>
                  <span className="flex items-center gap-1.5">
                    <XCircle size={13} className="text-[#ef4444]" /> Declined
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[#f59e0b]" /> Pending
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}