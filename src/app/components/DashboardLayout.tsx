import image_5941056aab0ec57084ebd0ad67b7bbfd14536f65 from 'figma:asset/5941056aab0ec57084ebd0ad67b7bbfd14536f65.png'
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link, Outlet } from "react-router";
import {
  LayoutDashboard, User, MessageSquare, MessageCircle, ChartBar, Settings, Search, Send,
  CreditCard, Users, UserCheck, Building2, FileText, DollarSign, Handshake,
  Menu, X, LogOut, ChevronRight, ChevronDown, Bell, Check, Heart, Trash2,
  UserPlus, TrendingUp, ShieldCheck, Star, Eye, AlertCircle, Quote, UserX, Wallet, Footprints as FooterIcon, Shield, BadgeCheck, Megaphone,
  XCircle, Clock, CheckCircle, Share2, IndianRupee, ArrowUpDown, Ticket, Lock, Image, Mail,
} from "lucide-react";
import logoImg from "figma:asset/36e9d26213447b2de3f782dd680e42364845966c.png";
import { getInfluencers, addInfluencer, updateInfluencer, getPendingTestimonials, getTestimonialsByUser, type Influencer } from "../utils/dataManager";
import { BLOG_POSTS } from "../data/mock-data";
import { useAuth } from "../context/AuthContext";
import { useCollaboration } from "../context/CollaborationContext";
import { useSiteSettings } from "../context/SiteSettingsContext";

type SidebarItem = {
  label: string;
  to: string;
  icon: React.ElementType;
};

type SidebarGroup = {
  category: string;
  items: SidebarItem[];
};

const influencerMenu: SidebarItem[] = [
  { label: "Dashboard", to: "/influencer", icon: LayoutDashboard },
  { label: "My Profile", to: "/influencer/profile", icon: User },
  { label: "Collaboration Requests", to: "/influencer/requests", icon: MessageSquare },
  { label: "Messages", to: "/influencer/chats", icon: MessageCircle },
  { label: "Analytics", to: "/influencer/analytics", icon: ChartBar },
  { label: "My Testimonials", to: "/influencer/testimonials", icon: Quote },
  { label: "Settings", to: "/influencer/settings", icon: Settings },
];

const brandMenu: SidebarItem[] = [
  { label: "Dashboard", to: "/brand", icon: LayoutDashboard },
  { label: "Discover Influencers", to: "/brand/discover", icon: Search },
  { label: "Sent Requests", to: "/brand/requests", icon: Send },
  { label: "Messages", to: "/brand/chats", icon: MessageSquare },
  { label: "Saved Influencers", to: "/brand/favorites", icon: Heart },
  { label: "Rate Collaborations", to: "/brand/ratings", icon: Star },
  { label: "Analytics", to: "/brand/analytics", icon: ChartBar },
  { label: "Subscription", to: "/brand/subscription", icon: CreditCard },
  { label: "My Testimonials", to: "/brand/testimonials", icon: Quote },
  { label: "Settings", to: "/brand/settings", icon: Settings },
];

const adminMenu: SidebarItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Influencers", to: "/admin/influencers", icon: UserCheck },
  { label: "Brands", to: "/admin/brands", icon: Building2 },
  { label: "Subscriptions", to: "/admin/subscriptions", icon: CreditCard },
  { label: "Collaborations", to: "/admin/collaborations", icon: Handshake },
  { label: "Chat Monitor", to: "/admin/chat-monitor", icon: Eye },
  { label: "Ratings & Reviews", to: "/admin/ratings", icon: Star },
  { label: "Blogs", to: "/admin/blogs", icon: FileText },
  { label: "Payments", to: "/admin/payments", icon: DollarSign },
  { label: "Payment Gateway", to: "/admin/payment-gateway", icon: Wallet },
  { label: "Pricing Plans", to: "/admin/pricing", icon: DollarSign },
  { label: "Coupons", to: "/admin/coupons", icon: Ticket },
  { label: "Testimonials", to: "/admin/testimonials", icon: Quote },
  { label: "Trust Badges", to: "/admin/trust-badges", icon: BadgeCheck },
  { label: "Trust Logos", to: "/admin/trust-logos", icon: Image },
  { label: "Footer Settings", to: "/admin/footer-settings", icon: FooterIcon },
  { label: "IP Tracking", to: "/admin/ip-tracking", icon: Shield },
  { label: "Inquiries", to: "/admin/sales-inquiries", icon: Megaphone },
  { label: "Deletion Requests", to: "/admin/deletion-requests", icon: UserX },
];

const adminMenuGrouped: SidebarGroup[] = [
  {
    category: "Overview",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    category: "User Management",
    items: [
      { label: "Users", to: "/admin/users", icon: Users },
      { label: "Influencers", to: "/admin/influencers", icon: UserCheck },
      { label: "Brands", to: "/admin/brands", icon: Building2 },
      { label: "Brand Verification", to: "/admin/brand-verification", icon: ShieldCheck },
    ],
  },
  {
    category: "Business",
    items: [
      { label: "Collaborations", to: "/admin/collaborations", icon: Handshake },
      { label: "Chat Monitor", to: "/admin/chat-monitor", icon: Eye },
      { label: "Subscriptions", to: "/admin/subscriptions", icon: CreditCard },
      { label: "Pricing Plans", to: "/admin/pricing", icon: DollarSign },
      { label: "Ratings & Reviews", to: "/admin/ratings", icon: Star },
    ],
  },
  {
    category: "Finance",
    items: [
      { label: "Payments", to: "/admin/payments", icon: DollarSign },
      { label: "Payment Gateway", to: "/admin/payment-gateway", icon: Wallet },
      { label: "Coupons", to: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    category: "Content",
    items: [
      { label: "Blogs", to: "/admin/blogs", icon: FileText },
      { label: "Testimonials", to: "/admin/testimonials", icon: Quote },
      { label: "Trust Badges", to: "/admin/trust-badges", icon: BadgeCheck },
      { label: "Trust Logos", to: "/admin/trust-logos", icon: Image },
    ],
  },
  {
    category: "System",
    items: [
      { label: "Email Center", to: "/admin/email-center", icon: Mail },
      { label: "Settings", to: "/admin/settings", icon: Settings },
      { label: "Footer Settings", to: "/admin/footer-settings", icon: FooterIcon },
      { label: "IP Tracking", to: "/admin/ip-tracking", icon: Shield },
      { label: "Inquiries", to: "/admin/sales-inquiries", icon: Megaphone },
      { label: "Deletion Requests", to: "/admin/deletion-requests", icon: UserX },
    ],
  },
];

type NotifItem = {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  link?: string;
};

// ── Notification helpers ──
const NOTIF_STORAGE_KEY = "flubn_notif_state";

type NotifPersistedState = {
  readIds: string[];
  dismissedIds: string[];
  clearedAt: string | null; // ISO timestamp – ignore requests with sentDate before this
};

function loadNotifState(): NotifPersistedState {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { readIds: [], dismissedIds: [], clearedAt: null };
}

function saveNotifState(state: NotifPersistedState) {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return "1d ago";
    if (diffDay < 7) return `${diffDay}d ago`;
    const diffWeek = Math.floor(diffDay / 7);
    return `${diffWeek}w ago`;
  } catch {
    return "";
  }
}

type CollabRequest = {
  id: string;
  brandName: string;
  brandId?: string;
  influencerName?: string;
  influencerId?: string;
  campaignName: string;
  budget: number;
  status: "pending" | "accepted" | "rejected";
  sentDate?: string;
  rejectionComment?: string;
  acceptComment?: string;
  brandReply?: string;
  [key: string]: any;
};

function buildNotificationsFromRequests(
  requests: CollabRequest[],
  role: "influencer" | "brand" | "admin",
  persistedState: NotifPersistedState,
  userId?: string
): NotifItem[] {
  const { dismissedIds, clearedAt } = persistedState;
  const items: NotifItem[] = [];

  // Filter out requests that were sent before the user last cleared all
  const filteredRequests = clearedAt
    ? requests.filter((r) => {
        const dateStr = r.sentAt || r.sentDate;
        if (!dateStr) return true;
        try {
          return new Date(dateStr).getTime() > new Date(clearedAt).getTime();
        } catch { return true; }
      })
    : requests;

  if (role === "influencer") {
    filteredRequests.forEach((req) => {
      // Pending → "New collaboration request"
      if (req.status === "pending") {
        const nid = `inf-pending-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "New collaboration request",
            desc: `${req.brandName} wants to collaborate on ${req.campaignName}`,
            time: formatRelativeTime(req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: Send,
            iconColor: "#2F6BFF",
            iconBg: "#EBF2FF",
            link: `/influencer/requests?highlight=${req.id}`,
          });
        }
      }
      // Accepted → "Collaboration confirmed"
      if (req.status === "accepted") {
        const nid = `inf-accepted-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Collaboration confirmed",
            desc: `You accepted ${req.brandName}'s "${req.campaignName}" — chat is now unlocked`,
            time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: Check,
            iconColor: "#10b981",
            iconBg: "#ecfdf5",
            link: `/influencer/requests?chat=${req.id}`,
          });
        }

        // Notification when brand replied to influencer's accept message
        if (req.brandReply) {
          const rnid = `inf-brand-reply-${req.id}`;
          if (!dismissedIds.includes(rnid)) {
            items.push({
              id: rnid,
              title: "Brand replied to your message",
              desc: `${req.brandName} replied on "${req.campaignName}": "${req.brandReply.slice(0, 60)}${req.brandReply.length > 60 ? "..." : ""}"`,
              time: formatRelativeTime(req.respondedAt || req.sentDate),
              read: persistedState.readIds.includes(rnid),
              icon: MessageSquare,
              iconColor: "#2F6BFF",
              iconBg: "#EBF2FF",
              link: `/influencer/requests?chat=${req.id}`,
            });
          }
        }
      }
      // Rejected
      if (req.status === "rejected") {
        const nid = `inf-rejected-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Request declined",
            desc: `You declined ${req.brandName}'s "${req.campaignName}"`,
            time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: XCircle,
            iconColor: "#ef4444",
            iconBg: "#fef2f2",
            link: `/influencer/requests?highlight=${req.id}`,
          });
        }
      }

      // ── Contact share notifications for influencer ──
      if (req.contactShareStatus === "brand_requested") {
        const nid = `inf-contact-request-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Contact share request",
            desc: `${req.brandName} wants to share contact details on "${req.campaignName}"`,
            time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: Share2,
            iconColor: "#8b5cf6",
            iconBg: "#faf5ff",
            link: `/influencer/requests?highlight=${req.id}`,
          });
        }
      }
      if (req.contactShareStatus === "shared") {
        const nid = `inf-contact-shared-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Contacts shared!",
            desc: `Contact details are now visible for "${req.campaignName}" with ${req.brandName}`,
            time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: Share2,
            iconColor: "#10b981",
            iconBg: "#ecfdf5",
            link: `/influencer/requests?highlight=${req.id}`,
          });
        }
      }

      // ── Price negotiation notifications for influencer ──
      if (req.pendingPriceRequest) {
        const pr = req.pendingPriceRequest;
        if (pr.status === "countered") {
          const nid = `inf-price-counter-${req.id}-${pr.counterAmount}`;
          if (!dismissedIds.includes(nid)) {
            items.push({
              id: nid,
              title: "Counter offer received",
              desc: `${req.brandName} countered with ₹${(pr.counterAmount ?? pr.amount).toLocaleString("en-IN")} on "${req.campaignName}"`,
              time: formatRelativeTime(pr.requestedAt),
              read: persistedState.readIds.includes(nid),
              icon: ArrowUpDown,
              iconColor: "#f59e0b",
              iconBg: "#fffbeb",
              link: `/influencer/chats?id=${req.id}`,
            });
          }
        }
      }
      if (req.priceSettled && req.settledPrice) {
        const nid = `inf-price-settled-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Price agreed!",
            desc: `Budget agreed at ₹${req.settledPrice.toLocaleString("en-IN")} for "${req.campaignName}"`,
            time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: IndianRupee,
            iconColor: "#10b981",
            iconBg: "#ecfdf5",
            link: `/influencer/chats?id=${req.id}`,
          });
        }
      }
    });

    // Testimonial status notifications for influencer
    if (userId) {
      try {
        const userTestimonials = getTestimonialsByUser(userId);
        userTestimonials.forEach((t) => {
          // Skip if cleared after testimonial was created
          if (clearedAt && t.createdDate) {
            try {
              if (new Date(t.createdDate).getTime() <= new Date(clearedAt).getTime()) return;
            } catch { /* ignore */ }
          }
          if (t.submissionStatus === "approved") {
            const nid = `inf-testimonial-approved-${t.id}`;
            if (!dismissedIds.includes(nid)) {
              items.push({
                id: nid,
                title: "Testimonial approved!",
                desc: `Your testimonial has been approved and is now live on the homepage`,
                time: formatRelativeTime(t.createdDate),
                read: persistedState.readIds.includes(nid),
                icon: CheckCircle,
                iconColor: "#10b981",
                iconBg: "#ecfdf5",
                link: "/influencer/testimonials",
              });
            }
          }
          if (t.submissionStatus === "rejected") {
            const nid = `inf-testimonial-rejected-${t.id}`;
            if (!dismissedIds.includes(nid)) {
              items.push({
                id: nid,
                title: "Testimonial rejected",
                desc: t.rejectionReason
                  ? `Reason: ${t.rejectionReason}`
                  : "Your testimonial was not approved. Check details for more info.",
                time: formatRelativeTime(t.createdDate),
                read: persistedState.readIds.includes(nid),
                icon: XCircle,
                iconColor: "#ef4444",
                iconBg: "#fef2f2",
                link: "/influencer/testimonials",
              });
            }
          }
        });
      } catch { /* ignore */ }
    }
  }

  if (role === "brand") {
    filteredRequests.forEach((req) => {
      // Pending → "Invite sent"
      if (req.status === "pending") {
        const nid = `brand-pending-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Invite sent",
            desc: `Your "${req.campaignName}" invite to ${req.influencerName || "an influencer"} is pending`,
            time: formatRelativeTime(req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: Clock,
            iconColor: "#f59e0b",
            iconBg: "#fffbeb",
            link: `/brand/requests?highlight=${req.id}`,
          });
        }
      }
      // Accepted
      if (req.status === "accepted") {
        const nid = `brand-accepted-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Request accepted!",
            desc: `${req.influencerName || "An influencer"} accepted your "${req.campaignName}" — contact unlocked`,
            time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: Check,
            iconColor: "#10b981",
            iconBg: "#ecfdf5",
            link: `/brand/requests?chat=${req.id}`,
          });
        }

        // Additional notification if influencer left an accept message
        if (req.acceptComment) {
          const mnid = `brand-accept-msg-${req.id}`;
          if (!dismissedIds.includes(mnid)) {
            items.push({
              id: mnid,
              title: "New message from influencer",
              desc: `${req.influencerName || "An influencer"} left a message on "${req.campaignName}": "${req.acceptComment.slice(0, 60)}${req.acceptComment.length > 60 ? "..." : ""}"`,
              time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
              read: persistedState.readIds.includes(mnid),
              icon: MessageSquare,
              iconColor: "#2F6BFF",
              iconBg: "#EBF2FF",
              link: `/brand/requests?chat=${req.id}`,
            });
          }
        }
      }
      // Rejected
      if (req.status === "rejected") {
        const nid = `brand-rejected-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Request declined",
            desc: `${req.influencerName || "An influencer"} declined your "${req.campaignName}"`,
            time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: X,
            iconColor: "#ef4444",
            iconBg: "#fef2f2",
            link: `/brand/requests?highlight=${req.id}`,
          });
        }
      }

      // ── Contact share notifications for brand ──
      if (req.contactShareStatus === "influencer_requested") {
        const nid = `brand-contact-request-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Contact share request",
            desc: `${req.influencerName || "An influencer"} wants to share contact details on "${req.campaignName}"`,
            time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: Share2,
            iconColor: "#8b5cf6",
            iconBg: "#faf5ff",
            link: `/brand/requests?highlight=${req.id}`,
          });
        }
      }
      if (req.contactShareStatus === "shared") {
        const nid = `brand-contact-shared-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Contacts shared!",
            desc: `Contact details are now visible for "${req.campaignName}" with ${req.influencerName || "the influencer"}`,
            time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: Share2,
            iconColor: "#10b981",
            iconBg: "#ecfdf5",
            link: `/brand/requests?highlight=${req.id}`,
          });
        }
      }

      // ── Price negotiation notifications for brand ──
      if (req.pendingPriceRequest) {
        const pr = req.pendingPriceRequest;
        if (pr.status === "pending") {
          const nid = `brand-price-request-${req.id}-${pr.amount}`;
          if (!dismissedIds.includes(nid)) {
            items.push({
              id: nid,
              title: "Price update requested",
              desc: `${req.influencerName || "An influencer"} requested ₹${pr.amount.toLocaleString("en-IN")} on "${req.campaignName}"`,
              time: formatRelativeTime(pr.requestedAt),
              read: persistedState.readIds.includes(nid),
              icon: IndianRupee,
              iconColor: "#f59e0b",
              iconBg: "#fffbeb",
              link: `/brand/chats?id=${req.id}`,
            });
          }
        }
      }
      if (req.priceSettled && req.settledPrice) {
        const nid = `brand-price-settled-${req.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Price agreed!",
            desc: `Budget agreed at ₹${req.settledPrice.toLocaleString("en-IN")} for "${req.campaignName}"`,
            time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
            read: persistedState.readIds.includes(nid),
            icon: IndianRupee,
            iconColor: "#10b981",
            iconBg: "#ecfdf5",
            link: `/brand/chats?id=${req.id}`,
          });
        }
      }
    });

    // Testimonial status notifications for brand
    if (userId) {
      try {
        const userTestimonials = getTestimonialsByUser(userId);
        userTestimonials.forEach((t) => {
          // Skip if cleared after testimonial was created
          if (clearedAt && t.createdDate) {
            try {
              if (new Date(t.createdDate).getTime() <= new Date(clearedAt).getTime()) return;
            } catch { /* ignore */ }
          }
          if (t.submissionStatus === "approved") {
            const nid = `brand-testimonial-approved-${t.id}`;
            if (!dismissedIds.includes(nid)) {
              items.push({
                id: nid,
                title: "Testimonial approved!",
                desc: `Your testimonial has been approved and is now live on the homepage`,
                time: formatRelativeTime(t.createdDate),
                read: persistedState.readIds.includes(nid),
                icon: CheckCircle,
                iconColor: "#10b981",
                iconBg: "#ecfdf5",
                link: "/brand/testimonials",
              });
            }
          }
          if (t.submissionStatus === "rejected") {
            const nid = `brand-testimonial-rejected-${t.id}`;
            if (!dismissedIds.includes(nid)) {
              items.push({
                id: nid,
                title: "Testimonial rejected",
                desc: t.rejectionReason
                  ? `Reason: ${t.rejectionReason}`
                  : "Your testimonial was not approved. Check details for more info.",
                time: formatRelativeTime(t.createdDate),
                read: persistedState.readIds.includes(nid),
                icon: XCircle,
                iconColor: "#ef4444",
                iconBg: "#fef2f2",
                link: "/brand/testimonials",
              });
            }
          }
        });
      } catch { /* ignore */ }
    }

    // Brand verification status notifications
    if (userId) {
      try {
        const raw = localStorage.getItem("flubn_brand_verifications");
        const verifications = raw ? JSON.parse(raw) : [];
        const brandVerif = verifications.find((v: any) => v.brandId === userId);
        if (brandVerif) {
          if (brandVerif.status === "verified" && brandVerif.verifiedAt) {
            if (!(clearedAt && new Date(brandVerif.verifiedAt).getTime() <= new Date(clearedAt).getTime())) {
              const nid = `brand-verified-${brandVerif.brandId}`;
              if (!dismissedIds.includes(nid)) {
                items.push({
                  id: nid,
                  title: "Brand Verified! ✅",
                  desc: "Your brand is now verified on FLUBN. The ✅ badge is now visible to all influencers.",
                  time: formatRelativeTime(brandVerif.verifiedAt),
                  read: persistedState.readIds.includes(nid),
                  icon: CheckCircle,
                  iconColor: "#10b981",
                  iconBg: "#ecfdf5",
                  link: "/brand/settings",
                });
              }
            }
          }
          if (brandVerif.status === "rejected" && brandVerif.rejectedAt) {
            if (!(clearedAt && new Date(brandVerif.rejectedAt).getTime() <= new Date(clearedAt).getTime())) {
              const nid = `brand-verif-rejected-${brandVerif.brandId}`;
              if (!dismissedIds.includes(nid)) {
                items.push({
                  id: nid,
                  title: "Verification not approved",
                  desc: brandVerif.rejectionReason
                    ? `Reason: ${brandVerif.rejectionReason}`
                    : "Your verification request was not approved. Please check and resubmit.",
                  time: formatRelativeTime(brandVerif.rejectedAt),
                  read: persistedState.readIds.includes(nid),
                  icon: XCircle,
                  iconColor: "#ef4444",
                  iconBg: "#fef2f2",
                  link: "/brand/settings",
                });
              }
            }
          }
        }
      } catch { /* ignore */ }
    }
  }

  if (role === "admin") {
    filteredRequests.forEach((req) => {
      // Every request is a notification for admin
      const nid = `admin-req-${req.id}-${req.status}`;
      if (dismissedIds.includes(nid)) return;

      if (req.status === "pending") {
        items.push({
          id: nid,
          title: "New collaboration request",
          desc: `${req.brandName} invited ${req.influencerName || "an influencer"} for "${req.campaignName}" — ₹${req.budget.toLocaleString("en-IN")}`,
          time: formatRelativeTime(req.sentAt || req.sentDate),
          read: persistedState.readIds.includes(nid),
          icon: Send,
          iconColor: "#2F6BFF",
          iconBg: "#EBF2FF",
          link: `/admin/collaborations?id=${req.id}`,
        });
      } else if (req.status === "accepted") {
        items.push({
          id: nid,
          title: "Collaboration accepted",
          desc: `${req.influencerName || "Influencer"} accepted ${req.brandName}'s "${req.campaignName}"`,
          time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
          read: persistedState.readIds.includes(nid),
          icon: Check,
          iconColor: "#10b981",
          iconBg: "#ecfdf5",
          link: `/admin/collaborations?id=${req.id}`,
        });
      } else if (req.status === "rejected") {
        items.push({
          id: nid,
          title: "Collaboration rejected",
          desc: `${req.influencerName || "Influencer"} rejected ${req.brandName}'s "${req.campaignName}"`,
          time: formatRelativeTime(req.respondedAt || req.sentAt || req.sentDate),
          read: persistedState.readIds.includes(nid),
          icon: XCircle,
          iconColor: "#ef4444",
          iconBg: "#fef2f2",
          link: `/admin/collaborations?id=${req.id}`,
        });
      }
    });

    // Pending testimonial submissions for admin
    try {
      const pendingTestimonials = getPendingTestimonials();
      pendingTestimonials.forEach((t) => {
        // Skip if cleared after testimonial was created
        if (clearedAt && t.createdDate) {
          try {
            if (new Date(t.createdDate).getTime() <= new Date(clearedAt).getTime()) return;
          } catch { /* ignore */ }
        }
        const nid = `admin-testimonial-pending-${t.id}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "New testimonial submission",
            desc: `${t.name} (${t.type === "influencer" ? "Creator" : "Brand"}) submitted a testimonial for review`,
            time: formatRelativeTime(t.createdDate),
            read: persistedState.readIds.includes(nid),
            icon: Quote,
            iconColor: "#f59e0b",
            iconBg: "#fffbeb",
            link: "/admin/testimonials",
          });
        }
      });
    } catch { /* ignore if data not loaded */ }

    // Pending brand verification requests for admin
    try {
      const raw = localStorage.getItem("flubn_brand_verifications");
      const allVerifs = raw ? JSON.parse(raw) : [];
      const pendingVerifs = allVerifs.filter((v: any) => v.status === "pending");
      pendingVerifs.forEach((v: any) => {
        if (clearedAt && v.submittedAt) {
          try {
            if (new Date(v.submittedAt).getTime() <= new Date(clearedAt).getTime()) return;
          } catch { /* ignore */ }
        }
        const nid = `admin-brand-verif-${v.brandId}`;
        if (!dismissedIds.includes(nid)) {
          items.push({
            id: nid,
            title: "Brand verification request",
            desc: `${v.brandName} submitted a ${v.companyType.toUpperCase()} number for verification`,
            time: formatRelativeTime(v.submittedAt),
            read: persistedState.readIds.includes(nid),
            icon: ShieldCheck,
            iconColor: "#2F6BFF",
            iconBg: "#EBF2FF",
            link: "/admin/brand-verification",
          });
        }
      });
    } catch { /* ignore */ }
  }

  // Sort newest first
  items.sort((a, b) => {
    const parsePriority = (t: string) => {
      if (t === "Just now") return 0;
      const match = t.match(/^(\d+)(m|h|d|w)/);
      if (!match) return 9999;
      const val = parseInt(match[1]);
      const unit = match[2];
      if (unit === "m") return val;
      if (unit === "h") return val * 60;
      if (unit === "d") return val * 1440;
      if (unit === "w") return val * 10080;
      return 9999;
    };
    return parsePriority(a.time) - parsePriority(b.time);
  });

  return items;
}

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  link: string;
  type: string;
};

interface DashboardLayoutProps {
  role: "influencer" | "brand" | "admin";
}

/** Check if an influencer has completed their profile (price + social link + work) */
function isInfluencerProfileComplete(user: any): boolean {
  if (!user || user.role !== "influencer") return true;

  // Check auth user object first
  const hasPrice = !!(user.ratePerPost && String(user.ratePerPost).trim());
  const hasSocialLink = Array.isArray(user.socialLinks) && user.socialLinks.some((l: any) => l.url?.trim());
  const hasWork = Array.isArray(user.portfolio) && user.portfolio.length > 0;

  if (hasPrice && hasSocialLink && hasWork) return true;

  // Cross-reference with the influencer data store (may have data the auth user doesn't)
  const influencers = getInfluencers();
  const userEmailLower = user.email?.toLowerCase() || "";
  const inf = influencers.find((i) => i.id === user.id || (userEmailLower && i.email?.toLowerCase() === userEmailLower));
  if (!inf) return false;

  const infHasPrice = !!(inf.ratePerPost && Number(inf.ratePerPost) > 0);
  const infHasPlatform = Array.isArray(inf.platforms) && inf.platforms.length > 0;
  const infHasSocialLink = Array.isArray(inf.socialLinks) && inf.socialLinks.some((l) => l.url?.trim());
  const infHasWork = Array.isArray(inf.portfolio) && inf.portfolio.length > 0;

  // Combine both sources — auth user + influencer data store
  const combinedPrice = hasPrice || infHasPrice;
  const combinedSocial = hasSocialLink || infHasSocialLink || infHasPlatform;
  const combinedWork = hasWork || infHasWork;

  return combinedPrice && combinedSocial && combinedWork;
}

// Pages that influencers can access even without a complete profile
const INFLUENCER_UNLOCKED_PATHS = ["/influencer/profile"];

/** DashboardLayout – all hooks called unconditionally before any early return */
export default function DashboardLayout({ role }: DashboardLayoutProps) {
  const { user, logout, isAuthenticated, isLoading, isSessionValidated } = useAuth();
  const { requests: liveRequests } = useCollaboration();
  const { getLogoUrl, getDarkLogoUrl } = useSiteSettings();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    "User Management": true,
    "Business": true,
    "Finance": true,
    "Content": true,
    "System": true,
  });
  const location = useLocation();

  // Influencer profile completion gating
  const influencerProfileComplete = role === "influencer" ? isInfluencerProfileComplete(user) : true;
  const isLockedPage = role === "influencer" && !influencerProfileComplete && !INFLUENCER_UNLOCKED_PATHS.some(p => location.pathname.startsWith(p));

  // Redirect to profile if influencer tries to access locked pages
  useEffect(() => {
    if (isLockedPage) {
      navigate("/influencer/profile", { replace: true });
    }
  }, [isLockedPage, navigate]);

  // Sync influencer user data to dataManager directory on mount (ensures signup data shows everywhere)
  useEffect(() => {
    if (role !== "influencer" || !user?.id || !user?.email) return;
    const existing = getInfluencers();
    const emailLower = user.email.toLowerCase();

    const byId = existing.find((inf) => inf.id === user.id);
    const byEmail = existing.find((inf) => inf.email?.toLowerCase() === emailLower);

    if (byId) {
      // Correct entry already exists — nothing to do
      return;
    }

    if (byEmail) {
      // Found by email but ID doesn't match the current auth ID.
      // This happens when signup stored a temporary ID. Fix it silently.
      updateInfluencer(byEmail.id, { id: user.id, email: emailLower });
      return;
    }

    // Truly new — add a stub so the influencer appears in the system
    const newInfluencer: Influencer = {
      id: user.id,
      name: user.name || "",
      photo: user.profilePicture || "",
      bio: user.bio || "",
      category: user.category || "Lifestyle",
      location: user.location || "India",
      followers: typeof user.followers === "number" ? user.followers : parseInt(user.followers || "0") || 0,
      ratePerPost: parseFloat(user.ratePerPost || "0") || 0,
      gender: user.gender || "Other",
      platforms: (user.socialLinks || []).map((l: any) => l.platformId).filter(Boolean),
      socialLinks: user.socialLinks || [],
      portfolio: user.portfolio || [],
      email: emailLower,
      phone: user.phone || "",
      status: "active",
      currency: user.currency || "INR",
      username: user.username || "",
      createdAt: new Date().toISOString(),
      badges: [],
    };
    addInfluencer(newInfluencer);
  }, [role, user?.id]);

  // Persisted notification state (read / dismissed / cleared)
  const [persistedNotifState, setPersistedNotifState] = useState<NotifPersistedState>(loadNotifState);

  // Build notifications dynamically from live requests
  const notifItems = useMemo(
    () => buildNotificationsFromRequests(liveRequests as CollabRequest[], role, persistedNotifState, user?.id),
    [liveRequests, role, persistedNotifState, user?.id]
  );

  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const menu = role === "influencer" ? influencerMenu : role === "brand" ? brandMenu : adminMenu;
  const roleName = role === "influencer" ? "Influencer" : role === "brand" ? "Brand" : "Admin";
  const unreadCount = notifItems.filter((n) => !n.read).length;

  const isActive = (to: string) => {
    if (to === `/${role}`) return location.pathname === `/${role}`;
    return location.pathname.startsWith(to);
  };

  const markAllRead = useCallback(() => {
    setPersistedNotifState((prev) => {
      const allIds = [...new Set([...prev.readIds, ...notifItems.map((n) => n.id)])];
      const next = { ...prev, readIds: allIds };
      saveNotifState(next);
      return next;
    });
  }, [notifItems]);

  const deleteNotif = useCallback((id: string) => {
    setPersistedNotifState((prev) => {
      const next = { ...prev, dismissedIds: [...new Set([...prev.dismissedIds, id])] };
      saveNotifState(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setPersistedNotifState((prev) => {
      const next = { ...prev, clearedAt: new Date().toISOString(), dismissedIds: [], readIds: [] };
      saveNotifState(next);
      return next;
    });
  }, []);

  // Build search index based on role
  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Always search menu/pages
    menu.forEach((item) => {
      if (item.label.toLowerCase().includes(q)) {
        results.push({
          id: `page-${item.to}`,
          title: item.label,
          subtitle: "Page",
          icon: item.icon,
          link: item.to,
          type: "Page",
        });
      }
    });

    if (role === "influencer") {
      // Search collaboration requests (live data from CollaborationContext)
      liveRequests.forEach((req: any) => {
        if (
          (req.campaignName?.toLowerCase().includes(q) || req.brandName?.toLowerCase().includes(q)) &&
          !results.some((r) => r.id === `req-${req.id}`)
        ) {
          results.push({
            id: `req-${req.id}`,
            title: req.campaignName,
            subtitle: `${req.brandName} · ₹${req.budget?.toLocaleString()}`,
            icon: MessageSquare,
            link: "/influencer/requests",
            type: "Request",
          });
        }
      });
    }

    if (role === "brand") {
      // Search influencers
      getInfluencers().forEach((inf) => {
        if (inf.name.toLowerCase().includes(q) || inf.category.toLowerCase().includes(q) || inf.location.toLowerCase().includes(q)) {
          results.push({
            id: `inf-${inf.id}`,
            title: inf.name,
            subtitle: `${inf.category} · ${inf.location}`,
            icon: User,
            link: (inf as any).username ? `/@${(inf as any).username}` : `/influencer/view/${inf.id}`,
            type: "Influencer",
          });
        }
      });
      // Search sent requests (live data from CollaborationContext)
      liveRequests.forEach((req: any) => {
        if (
          (req.campaignName?.toLowerCase().includes(q) || req.influencerName?.toLowerCase().includes(q)) &&
          !results.some((r) => r.id === `breq-${req.id}`)
        ) {
          results.push({
            id: `breq-${req.id}`,
            title: req.campaignName,
            subtitle: `To ${req.influencerName || "Influencer"} · ₹${req.budget?.toLocaleString()}`,
            icon: Send,
            link: "/brand/requests",
            type: "Request",
          });
        }
      });
    }

    if (role === "admin") {
      // Search influencers
      getInfluencers().forEach((inf) => {
        if (inf.name.toLowerCase().includes(q) || inf.category.toLowerCase().includes(q)) {
          results.push({
            id: `inf-${inf.id}`,
            title: inf.name,
            subtitle: `${inf.category} · ${inf.followers.toLocaleString()} followers`,
            icon: UserCheck,
            link: "/admin/influencers",
            type: "Influencer",
          });
        }
      });
      // Search blog posts
      BLOG_POSTS.forEach((post) => {
        if (post.title.toLowerCase().includes(q) || post.category.toLowerCase().includes(q)) {
          results.push({
            id: `blog-${post.id}`,
            title: post.title,
            subtitle: `${post.category} · ${post.date}`,
            icon: FileText,
            link: "/admin/blogs",
            type: "Blog",
          });
        }
      });
    }

    return results.slice(0, 8);
  }, [searchQuery, role, menu, liveRequests]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close search on navigation
  useEffect(() => {
    setSearchFocused(false);
    setSearchQuery("");
  }, [location.pathname]);

  // ── Auth Guard: redirect if not logged in or wrong role ──────────────────
  useEffect(() => {
    // Wait until Supabase has confirmed the session — never act on stale localStorage cache.
    // isSessionValidated is set to true only after supabase.auth.getSession() resolves.
    if (isLoading || !isSessionValidated) return;
    if (!isAuthenticated || !user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.role !== role) {
      navigate(`/${user.role}`, { replace: true });
    }
  }, [isAuthenticated, isLoading, isSessionValidated, user, role, navigate]);

  // Scroll main content to top only when changing major sections (not within chats/requests)
  useEffect(() => {
    const previousPath = sessionStorage.getItem('previousPath');
    const currentPath = location.pathname;
    
    // Extract the base route (e.g., "/brand/chats" from "/brand/chats?id=123")
    const getCurrentBase = (path: string) => {
      const withoutQuery = path.split('?')[0];
      const parts = withoutQuery.split('/').filter(Boolean);
      return parts.slice(0, 2).join('/'); // e.g., "brand/chats"
    };
    
    const prevBase = previousPath ? getCurrentBase(previousPath) : '';
    const currBase = getCurrentBase(currentPath);
    
    // Only scroll to top if we changed to a different section
    if (prevBase !== currBase) {
      mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }
    
    sessionStorage.setItem('previousPath', currentPath);
  }, [location.pathname]);

  // Don't render while auth is loading or user has wrong role
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#2F6BFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#64748b]">Loading...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !user || user.role !== role) {
    return null;
  }

  const showSearchResults = searchFocused && searchQuery.trim().length > 0;

  return (
    <div className="flex h-screen bg-[#f8f9fc] font-['Inter',sans-serif] overflow-hidden w-full max-w-full relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Dark premium style */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-[#0a090f] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar gradient accents */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 right-0 w-[80%] h-[40%] opacity-20"
            style={{ background: "radial-gradient(ellipse at 80% 10%, rgba(47,107,255,0.5), transparent 70%)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-[60%] h-[30%] opacity-15"
            style={{ background: "radial-gradient(ellipse at 10% 100%, rgba(107,169,255,0.3), transparent 70%)" }}
          />
        </div>

        {/* Logo & close */}
        <div className="relative z-10 px-5 h-16 flex items-center justify-between border-b border-white/[0.06]">
          <Link to="/" className="flex items-center gap-2">
            <img src={image_5941056aab0ec57084ebd0ad67b7bbfd14536f65} alt="Flubn" className="h-10 w-auto" />
          </Link>
          <button className="lg:hidden text-white/70 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Role badge */}
        <div className="relative z-10 px-5 pt-5 pb-3">
          <div className="inline-flex items-center gap-2 bg-white/[0.06] backdrop-blur-sm text-white/60 px-3 py-1.5 rounded-[8px] text-[11px] tracking-[0.06em] uppercase border border-white/[0.06]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF]" />
            {roleName} Panel
          </div>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 px-3 py-2 overflow-y-auto">
          {role === "admin" ? (
            // Admin: grouped sidebar with collapsible category dropdowns
            adminMenuGrouped.map((group, groupIdx) => {
              const isCollapsed = collapsedGroups[group.category] ?? false;
              const hasActiveItem = group.items.some((item) => isActive(item.to));

              return (
                <div key={group.category} className={groupIdx > 0 ? "mt-1" : ""}>
                  {groupIdx === 0 ? (
                    // Overview group — no header, always visible
                    group.items.map((item) => {
                      const active = isActive(item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] mb-0.5 transition-all text-[14px] ${
                            active
                              ? "text-white"
                              : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"
                          }`}
                          style={active ? { background: "linear-gradient(135deg, rgba(15,61,145,0.5) 0%, rgba(47,107,255,0.4) 100%)" } : undefined}
                        >
                          <item.icon size={17} className={active ? "text-[#6BA9FF]" : ""} />
                          <span className="flex-1 text-[#ffffffcc]">{item.label}</span>
                          {active && <ChevronRight size={13} className="text-[#6BA9FF]" />}
                        </Link>
                      );
                    })
                  ) : (
                    <>
                      {/* Collapsible category header */}
                      <button
                        onClick={() =>
                          setCollapsedGroups((prev) => ({
                            ...prev,
                            [group.category]: !prev[group.category],
                          }))
                        }
                        className="w-full px-3.5 py-2 flex items-center gap-2 group/cat cursor-pointer rounded-[8px] hover:bg-white/[0.06] transition-colors"
                      >
                        <ChevronDown
                          size={13}
                          className={`text-white/50 transition-transform duration-200 ${
                            isCollapsed ? "-rotate-90" : ""
                          }`}
                        />
                        <span className={`text-[10px] tracking-[0.08em] uppercase transition-colors ${
                          hasActiveItem ? "text-[#6BA9FF]" : "text-white/70 group-hover/cat:text-white/80"
                        }`}>
                          {group.category}
                        </span>
                        <div className="flex-1 h-px bg-white/[0.08]" />
                        <span className="text-[9px] text-white/35 tabular-nums">
                          {group.items.length}
                        </span>
                      </button>

                      {/* Collapsible items */}
                      <div
                        className="overflow-hidden transition-all duration-200"
                        style={{
                          maxHeight: isCollapsed ? 0 : group.items.length * 44,
                          opacity: isCollapsed ? 0 : 1,
                        }}
                      >
                        {group.items.map((item) => {
                          const active = isActive(item.to);
                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] mb-0.5 transition-all text-[14px] ml-1 ${
                                active
                                  ? "text-white"
                                  : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"
                              }`}
                              style={active ? { background: "linear-gradient(135deg, rgba(15,61,145,0.5) 0%, rgba(47,107,255,0.4) 100%)" } : undefined}
                            >
                              <item.icon size={16} className={active ? "text-[#6BA9FF]" : ""} />
                              <span className="flex-1 text-[#ffffffcc]">{item.label}</span>
                              {active && <ChevronRight size={13} className="text-[#6BA9FF]" />}
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            // Influencer & Brand: flat menu
            menu.map((item) => {
              const active = isActive(item.to);
              const isProfilePage = item.to === "/influencer/profile";
              const isLocked = role === "influencer" && !influencerProfileComplete && !isProfilePage;

              if (isLocked) {
                return (
                  <div
                    key={item.to}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] mb-0.5 text-[14px] text-white/20 cursor-not-allowed select-none"
                    title="Complete your profile to unlock"
                  >
                    <item.icon size={17} />
                    <span className="flex-1">{item.label}</span>
                    <Lock size={13} className="text-white/20" />
                  </div>
                );
              }

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] mb-0.5 transition-all text-[14px] ${
                    active
                      ? "text-white"
                      : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"
                  }`}
                  style={active ? { background: "linear-gradient(135deg, rgba(15,61,145,0.5) 0%, rgba(47,107,255,0.4) 100%)" } : undefined}
                >
                  <item.icon size={17} className={active ? "text-[#6BA9FF]" : ""} />
                  <span className="flex-1 text-[#ffffffcc]">{item.label}</span>
                  {active && <ChevronRight size={13} className="text-[#6BA9FF]" />}
                </Link>
              );
            })
          )}
        </nav>

        {/* User card & logout */}
        <div className="relative z-10 p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-2 mb-3">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-9 h-9 rounded-[10px] object-cover object-center border border-white/10"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[13px] text-white"
                style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : roleName[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-[13px] truncate">{(user?.role === "brand" ? user?.companyName || user?.name : user?.name) || `${roleName} Account`}</p>
              <p className="text-white/60 text-[11px] truncate">{user?.email || "demo@flubn.com"}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 text-white/70 hover:text-red-400 hover:bg-red-500/[0.08] rounded-[10px] transition-all text-[14px] w-full"
          >
            <LogOut size={17} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden">
        {/* Top bar */}
        <header className="h-16 shrink-0 bg-white border-b border-[#e2e8f0] flex items-center px-4 lg:px-8 gap-4 relative z-30 w-full max-w-full">
          <button
            className="lg:hidden text-[#64748b] p-1.5 hover:bg-[#f1f5f9] rounded-[10px] transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          {/* Search bar with results dropdown */}
          <div className="hidden sm:flex flex-1 max-w-md relative" ref={searchRef}>
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder={
                role === "influencer"
                  ? "Search requests, pages..."
                  : role === "brand"
                  ? "Search influencers, requests..."
                  : "Search users, blogs, pages..."
              }
              className="w-full pl-10 pr-10 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[12px] text-[14px] text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchFocused(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors z-10"
              >
                <X size={15} />
              </button>
            )}

            {/* Search results dropdown */}
            {showSearchResults && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-[14px] shadow-[0_8px_30px_rgba(0,0,0,0.1)] border border-[#e2e8f0]/80 z-50 overflow-hidden">
                {searchResults.length > 0 ? (
                  <>
                    <div className="px-4 py-2.5 border-b border-[#e2e8f0]/60">
                      <p className="text-[11px] text-[#94a3b8] uppercase tracking-wider">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto py-1">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => {
                            navigate(result.link);
                            setSearchQuery("");
                            setSearchFocused(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fc] transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-[8px] bg-[#EBF2FF] flex items-center justify-center shrink-0">
                            <result.icon size={15} className="text-[#2F6BFF]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-[#1a1a2e] truncate">{result.title}</p>
                            <p className="text-[11px] text-[#94a3b8] truncate">{result.subtitle}</p>
                          </div>
                          <span className="text-[10px] text-[#b0b8c9] bg-[#f1f5f9] px-2 py-0.5 rounded-full shrink-0">{result.type}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <Search size={20} className="mx-auto text-[#d1d5db] mb-2" />
                    <p className="text-[13px] text-[#94a3b8]">No results for "{searchQuery}"</p>
                    <p className="text-[11px] text-[#b0b8c9] mt-1">Try a different keyword</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2.5 rounded-[10px] transition-colors ${
                  notifOpen ? "bg-[#EBF2FF] text-[#2F6BFF]" : "text-[#64748b] hover:bg-[#f1f5f9]"
                }`}
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span
                    className="absolute top-1 right-1 min-w-[18px] h-[18px] text-white text-[10px] rounded-full flex items-center justify-center px-1"
                    style={{ background: "linear-gradient(135deg, #ef4444, #f87171)" }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[72px] sm:top-full mt-0 sm:mt-2 w-auto sm:w-[380px] max-w-[380px] bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.1)] border border-[#e2e8f0]/80 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-[#e2e8f0] gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <h3 className="text-[14px] text-[#1a1a2e]">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="min-w-[20px] h-[20px] text-white text-[10px] rounded-full flex items-center justify-center px-1.5 shrink-0" style={{ background: "linear-gradient(135deg, #2F6BFF, #6BA9FF)" }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[12px] text-[#2F6BFF] hover:underline flex items-center gap-1"
                          title="Mark all read"
                        >
                          <Check size={12} /> <span className="hidden sm:inline">Mark all read</span>
                        </button>
                      )}
                      {notifItems.length > 0 && (
                        <button
                          onClick={() => {
                            setPersistedNotifState((prev) => {
                              const allDismissed = [...new Set([...prev.dismissedIds, ...notifItems.map((n) => n.id)])];
                              const next = { ...prev, clearedAt: new Date().toISOString(), dismissedIds: allDismissed, readIds: [] };
                              saveNotifState(next);
                              return next;
                            });
                          }}
                          className="text-[12px] text-[#94a3b8] hover:text-[#ef4444] hover:underline flex items-center gap-1 transition-colors"
                          title="Clear all"
                        >
                          <Trash2 size={11} /> <span className="hidden sm:inline">Clear</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notification items */}
                  {notifItems.length > 0 ? (
                    <div className="max-h-[380px] overflow-y-auto">
                      {notifItems.map((notif) => (
                        <div
                          key={notif.id}
                          className={`group px-3 sm:px-5 py-3.5 border-b border-[#e2e8f0]/40 last:border-b-0 hover:bg-[#f8f9fc] transition-colors cursor-pointer ${
                            !notif.read ? "bg-[#EBF2FF]/30" : ""
                          }`}
                          onClick={() => {
                            // Mark as read
                            setPersistedNotifState((prev) => {
                              const next = { ...prev, readIds: [...new Set([...prev.readIds, notif.id])] };
                              saveNotifState(next);
                              return next;
                            });
                            // Navigate to relevant page
                            if (notif.link) {
                              navigate(notif.link);
                              setNotifOpen(false);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            {/* Icon */}
                            <div
                              className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5"
                              style={{ backgroundColor: notif.iconBg }}
                            >
                              <notif.icon size={14} style={{ color: notif.iconColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-[13px] ${!notif.read ? "text-[#1a1a2e]" : "text-[#64748b]"}`}>{notif.title}</p>
                                {!notif.read && (
                                  <div className="w-2 h-2 rounded-full bg-[#2F6BFF] shrink-0 mt-1.5" />
                                )}
                              </div>
                              <p className="text-[12px] text-[#94a3b8] mt-0.5 line-clamp-2">{notif.desc}</p>
                              <p className="text-[11px] text-[#b0b8c9] mt-1">{notif.time}</p>
                            </div>
                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotif(notif.id);
                              }}
                              className="p-1 text-[#b0b8c9] hover:text-[#ef4444] hover:bg-[#fef2f2] rounded-md transition-all shrink-0 mt-0.5"
                              title="Dismiss"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 sm:px-5 py-10 text-center">
                      <Bell size={24} className="mx-auto text-[#d1d5db] mb-2" />
                      <p className="text-[13px] text-[#94a3b8]">All caught up!</p>
                      <p className="text-[11px] text-[#b0b8c9] mt-1">No notifications at the moment</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-3 sm:px-5 py-3 border-t border-[#e2e8f0] flex items-center justify-between">
                    <span className="text-[11px] text-[#b0b8c9] truncate">
                      {notifItems.length > 0
                        ? `${notifItems.length} notification${notifItems.length !== 1 ? "s" : ""}`
                        : "No notifications"}
                    </span>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="text-[12px] text-[#2F6BFF] hover:underline shrink-0 ml-2"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-[#e2e8f0] hidden sm:block mx-1" />

            {/* User avatar */}
            <div className="flex items-center gap-2.5">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-8 h-8 rounded-[8px] object-cover object-center border border-[#e2e8f0]"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-[8px] text-white flex items-center justify-center text-[13px]"
                  style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : roleName[0]}
                </div>
              )}
              <span className="hidden sm:block text-[14px] text-[#1a1a2e]">{user?.name || roleName}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full max-w-full p-4 sm:p-6 lg:p-8 bg-[#f8f9fc]"
          style={{ scrollBehavior: 'auto' }}
          onScrollCapture={(e) => {
            // Prevent scroll restoration on navigation
            e.currentTarget.dataset.scrollPos = String(e.currentTarget.scrollTop);
          }}
        >
          {role === "influencer" && !influencerProfileComplete && (
            <div className="mb-6 bg-gradient-to-r from-[#2F6BFF]/10 to-[#6BA9FF]/10 border border-[#2F6BFF]/20 rounded-[14px] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2F6BFF]/15 flex items-center justify-center shrink-0">
                <AlertCircle size={20} className="text-[#2F6BFF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#1a1a2e] text-[14px] font-medium">Complete your profile to go live</p>
                <p className="text-[#64748b] text-[12px] mt-0.5">
                  Add your rate, at least one social media link, and one work sample to appear on Discover and unlock all features.
                </p>
              </div>
              <Link
                to="/influencer/profile"
                className="shrink-0 px-4 py-2 bg-[#2F6BFF] text-white text-[13px] rounded-[10px] hover:bg-[#1e5ae0] transition-colors"
              >
                Complete Profile
              </Link>
            </div>
          )}
          <Outlet key={location.pathname} />
        </main>
      </div>
    </div>
  );
}