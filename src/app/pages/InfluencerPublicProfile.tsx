import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin, Users, DollarSign, Wallet, Instagram, Youtube, Twitter, Linkedin, Globe,
  CheckCircle, Check, Star, Send, X, ArrowLeft, Eye, Briefcase, Calendar, TrendingUp, Music, Facebook,
  BadgeCheck, Shield, Heart, Share2, ChartBar, MessageCircle, ExternalLink, Link as LinkIcon,
  Film, Video, Image, Handshake, Zap, Award, Sparkles, AlertCircle,
  FileText, Save, ChevronLeft, ChevronRight, Trash2, Lightbulb, Lock,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import NotFound from "./NotFound";
import { getInfluencers, type Influencer } from "../utils/dataManager";
import { RATINGS, TRUST_BADGES, COMPLETED_COLLABORATIONS, COLLABORATION_REQUESTS } from "../data/mock-data";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { mergeInfluencerBadges } from "../utils/badgeEngine";
import { copyToClipboard } from "../utils/clipboard";
import { formatRate } from "../utils/currencies";
import { isInfluencerVerified } from "../utils/influencerVerification";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useCollaboration } from "../context/CollaborationContext";
import { DatePicker } from "../components/DatePicker";
import { recordProfileView, getProfileViewCount } from "../utils/profileViews";
import {
  getTemplates, saveTemplate, deleteTemplate, getTemplateLimit,
  type CampaignTemplate,
} from "../utils/campaignTemplates";
import { getPlanLimits, formatLimit } from "../utils/planLimits";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const platformIcons: Record<string, React.ElementType> = {
  Instagram,
  YouTube: Youtube,
  Twitter,
  LinkedIn: Linkedin,
  Facebook,
};

// Social links are loaded from the influencer's saved data (socialLinks field)

type WorkType = "reel" | "video" | "photo" | "collaboration";

interface PortfolioItem {
  id: string;
  type: WorkType;
  title: string;
  url: string;
  thumbnail: string;
  description: string;
}

const WORK_TYPE_META: Record<WorkType, { label: string; icon: React.ElementType; color: string }> = {
  reel: { label: "Reel", icon: Film, color: "#E4405F" },
  video: { label: "Video", icon: Video, color: "#FF0000" },
  photo: { label: "Photo", icon: Image, color: "#2F6BFF" },
  collaboration: { label: "Collaboration", icon: Handshake, color: "#10b981" },
};

// Portfolio items are stored on each influencer's profile — no hardcoded fallback
const PORTFOLIO_MAP: Record<string, PortfolioItem[]> = {};

const PLATFORM_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  instagram: { icon: Instagram, label: "Instagram", color: "#E4405F" },
  youtube: { icon: Youtube, label: "YouTube", color: "#FF0000" },
  tiktok: { icon: Music, label: "TikTok", color: "#000000" },
  twitter: { icon: Twitter, label: "Twitter / X", color: "#1DA1F2" },
  linkedin: { icon: Linkedin, label: "LinkedIn", color: "#0A66C2" },
  facebook: { icon: Facebook, label: "Facebook", color: "#1877F2" },
  twitch: { icon: LinkIcon, label: "Twitch", color: "#9146FF" },
  pinterest: { icon: LinkIcon, label: "Pinterest", color: "#E60023" },
  snapchat: { icon: LinkIcon, label: "Snapchat", color: "#FFFC00" },
  threads: { icon: LinkIcon, label: "Threads", color: "#000000" },
  discord: { icon: LinkIcon, label: "Discord", color: "#5865F2" },
  spotify: { icon: Music, label: "Spotify", color: "#1DB954" },
  website: { icon: Globe, label: "Website", color: "#64748b" },
  other: { icon: LinkIcon, label: "Link", color: "#94a3b8" },
};

// Badge icon mapping
const badgeIconMap: Record<string, React.ElementType> = {
  BadgeCheck,
  Star,
  Zap,
  Award,
  TrendingUp,
  Sparkles,
  Heart,
};

export default function InfluencerPublicProfile() {
  const { id, username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addRequest, hasPendingRequestTo } = useCollaboration();
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  // If it's a root parameter but doesn't start with '@', it's an invalid route (like /random-page)
  if (username && !username.startsWith('@')) {
    return <NotFound />;
  }

  // Decode URL parameters in case they were encoded
  const decodedId = id ? decodeURIComponent(id) : undefined;
  const decodedUsername = username?.startsWith('@') ? decodeURIComponent(username.substring(1)) : undefined;
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [formData, setFormData] = useState({
    campaignName: "",
    budget: "",
    deliverables: "",
    timeline: "",
    message: "",
  });

  const [timelineStart, setTimelineStart] = useState("");
  const [timelineEnd, setTimelineEnd] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState<string>("all");
  const [dupWarning, setDupWarning] = useState(false);

  // ── Auto-scroll refs ──────────────────────────────────────────────────────
  const dupWarningRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const startDateRef = useRef<HTMLDivElement>(null);
  const endDateRef = useRef<HTMLDivElement>(null);

  // ── Campaign Templates ───────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<CampaignTemplate[]>(() => getTemplates());
  const [showSaveTemplateInput, setShowSaveTemplateInput] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const planLimits = getPlanLimits();

  const loadTemplate = (tpl: CampaignTemplate) => {
    setFormData({
      campaignName: tpl.campaignName || "",
      budget: tpl.budget || "",
      deliverables: tpl.deliverables || "",
      timeline: tpl.timeline || "",
      message: tpl.message || "",
    });
    if (tpl.timelineStart) setTimelineStart(tpl.timelineStart);
    if (tpl.timelineEnd) setTimelineEnd(tpl.timelineEnd);
  };

  const handleSaveAsTemplate = () => {
    if (!saveTemplateName.trim()) return;
    const saved = saveTemplate({
      name: saveTemplateName.trim(),
      campaignName: formData.campaignName,
      budget: formData.budget,
      deliverables: formData.deliverables,
      message: formData.message,
      timeline: formData.timeline,
      timelineStart,
      timelineEnd,
    });
    if (saved) {
      setTemplates(getTemplates());
      toast.success("Template saved!", { description: `"${saveTemplateName.trim()}" is now reusable.` });
    } else {
      toast.error("Template limit reached", { description: "Upgrade your plan to save more templates." });
    }
    setShowSaveTemplateInput(false);
    setSaveTemplateName("");
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
    setTemplates(getTemplates());
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  // Auto-scroll to warnings when they appear
  useEffect(() => {
    if (dupWarning && formRef.current) {
      // Scroll form to the bottom to show both warning and button
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollTo({ top: formRef.current.scrollHeight, behavior: "smooth" });
        }
      }, 100);
    }
  }, [dupWarning]);

  const handleAuthRequired = (action: string) => {
    toast.error(`Please log in as a brand to ${action}`, {
      description: "Only brands can send collaboration requests",
      action: {
        label: "Sign Up as Brand",
        onClick: () => navigate("/signup?role=brand"),
      },
    });
  };

  const handleWrongRole = () => {
    toast.error("Only brands can send collaboration requests", {
      description: "This feature is available for brand accounts only",
    });
  };

  const formatFollowers = (num: number) => {
    if (num >= 1000000) return `${Number((num / 1000000).toFixed(1))}M`;
    if (num >= 1000) return `${Number((num / 1000).toFixed(1))}K`;
    return num.toString();
  };

  // Resolve influencer by id or username
  const resolveInfluencer = (list: any[]) => {
    if (decodedId) {
      const match = list.find((inf: any) => inf.id === decodedId);
      if (match) return match;
    }
    if (decodedUsername) {
      // Direct username match
      const byUsername = list.find((inf: any) => inf.username === decodedUsername);
      if (byUsername) return byUsername;
      // Fallback: match by name-derived slug (for influencers whose username wasn't migrated yet)
      const byNameSlug = list.find((inf: any) => {
        if (!inf.name) return false;
        const slug = inf.name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        return slug === decodedUsername;
      });
      return byNameSlug || null;
    }
    return null;
  };

  useEffect(() => {
    const fetchInfluencer = () => {
      const influencers = getInfluencers();
      console.log('[InfluencerProfile] Loading profile...', {
        decodedId,
        decodedUsername,
        totalInfluencers: influencers.length,
        influencerIds: influencers.map(i => ({ id: i.id, username: i.username, name: i.name }))
      });
      const found = resolveInfluencer(influencers);
      console.log('[InfluencerProfile] Resolved influencer:', found);
      setInfluencer(found);
    };

    fetchInfluencer();

    // Same-tab: fires when admin updates influencer data (verify, badge assign, feature)
    const handleInfluencersUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const updated: any[] = customEvent.detail || getInfluencers();
      setInfluencer(resolveInfluencer(updated));
    };

    // Cross-tab: fires when localStorage changes in another browser tab
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === "flubn_influencers" && e.newValue) {
        try {
          const updated: any[] = JSON.parse(e.newValue);
          setInfluencer(resolveInfluencer(updated));
        } catch {
          fetchInfluencer();
        }
      }
    };

    window.addEventListener("influencersUpdated", handleInfluencersUpdate);
    window.addEventListener("storage", handleStorageUpdate);
    return () => {
      window.removeEventListener("influencersUpdated", handleInfluencersUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, [decodedId, decodedUsername]);

  // Record profile view (deduplicated per session)
  useEffect(() => {
    if (influencer) {
      recordProfileView(influencer.id);
    }
  }, [influencer?.id]);

  // Set OG meta tags for social sharing previews
  useEffect(() => {
    if (!influencer) return;
    const formatFollowersOG = (num: number) => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
      return num.toString();
    };
    const title = `${influencer.name} (@${influencer.username || influencer.id}) | FLUBN`;
    const description = `${influencer.bio?.slice(0, 140) || `${influencer.category} creator`} • ${formatFollowersOG(influencer.followers)} followers • ${influencer.location}`;
    const profileUrl = influencer.username
      ? `${window.location.origin}/@${influencer.username}`
      : `${window.location.origin}/influencer/view/${influencer.id}`;

    document.title = title;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        if (property.startsWith("og:") || property.startsWith("article:")) {
          el.setAttribute("property", property);
        } else {
          el.setAttribute("name", property);
        }
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("og:title", title);
    setMeta("og:description", description);
    setMeta("og:image", influencer.photo);
    setMeta("og:url", profileUrl);
    setMeta("og:type", "profile");
    setMeta("og:site_name", "FLUBN");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", influencer.photo);

    return () => {
      document.title = "FLUBN — Influencer Marketplace";
      ["og:title", "og:description", "og:image", "og:url", "og:type", "og:site_name",
       "twitter:card", "twitter:title", "twitter:description", "twitter:image", "description"
      ].forEach((prop) => {
        const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
        if (el) el.remove();
      });
    };
  }, [influencer]);

  if (!influencer) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] font-['Inter',sans-serif]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl text-[#1a1a2e]">Influencer Not Found</h1>
          <p className="text-[#64748b] mt-2">This profile doesn't exist or has been removed.</p>
          <Link
            to="/brand/discover"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Discover
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!influencer) return;

    // Duplicate pending request guard — warn once, confirm on second click
    if (hasPendingRequestTo(influencer.id, user?.id ?? "") && !dupWarning) {
      setDupWarning(true);
      return;
    }
    
    // Get brand name (user.companyName for brands, or user.name as fallback)
    const brandName = user?.companyName || user?.name || "Anonymous Brand";
    const brandLogo = brandName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    
    // Add the request to the context
    addRequest({
      brandName,
      brandLogo,
      brandPhoto: user?.profilePicture,
      campaignName: formData.campaignName,
      budget: parseInt(formData.budget.replace(/,/g, '')) || 0,
      timeline: formData.timeline,
      deliverables: formData.deliverables,
      message: formData.message,
      influencerId: influencer.id,
      brandContactEmail: user?.brandContactEmail || user?.email,
      brandContactPhone: user?.phone,
    });
    
    setRequestSent(true);
    setDupWarning(false);
    toast.success(`Collaboration request sent to ${influencer.name}!`, {
      description: "You'll be notified when they respond.",
    });
    setTimeout(() => {
      setShowRequestModal(false);
      setRequestSent(false);
      setFormData({ campaignName: "", budget: "", deliverables: "", timeline: "", message: "" });
      setTimelineStart("");
      setTimelineEnd("");
    }, 2500);
  };

  // Calculate real ratings from approved ratings data
  const influencerRatings = RATINGS.filter(
    (r) => r.influencerId === influencer.id && r.status === "approved"
  );

  // Real engagement & stats data
  const avgRating =
    influencerRatings.length > 0
      ? (influencerRatings.reduce((sum, r) => sum + r.overallRating, 0) / influencerRatings.length).toFixed(1)
      : "N/A";

  const viewCount = getProfileViewCount(influencer.id);

  // Total reach: sum all platform followers first, fall back to influencer.followers
  const totalReach = (() => {
    const platformSum =
      influencer.platformFollowers &&
      typeof influencer.platformFollowers === "object" &&
      !Array.isArray(influencer.platformFollowers)
        ? Object.values(influencer.platformFollowers).reduce((s: number, v) => s + (Number(v) || 0), 0)
        : 0;
    return platformSum || influencer.followers || 0;
  })();

  const engagementStats = [
    { label: "Followers", value: formatFollowers(totalReach), icon: Users, color: "#2F6BFF" },
    { label: "Avg Rating", value: avgRating === "N/A" ? "N/A" : `${avgRating} ★`, icon: Star, color: "#f59e0b" },
    { label: "Profile Views", value: viewCount > 0 ? formatFollowers(viewCount) : "—", icon: Eye, color: "#8b5cf6" },
    { label: "Collabs Starting At", value: formatRate(influencer.ratePerPost, influencer.currency || "INR"), icon: DollarSign, color: "#ec4899" },
  ];

  // Derive recent collabs from completed collaborations — no hardcoded data
  const recentCollabs = COMPLETED_COLLABORATIONS
    .filter((c) => c.influencerId === influencer.id)
    .slice(0, 3)
    .map((c) => ({ brand: c.brandName || "Brand", campaign: c.campaignName || "Campaign", date: c.completedDate || "" }));

  // Dynamic Quick Info values
  const collabCount = COMPLETED_COLLABORATIONS.filter(
    (c) => c.influencerId === influencer.id
  ).length;

  // Member since — derived from ISO createdAt timestamp
  const memberSince = influencer.createdAt
    ? new Date(influencer.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : "—";

  // Response time — avg(respondedAt − sentAt) across all responded requests for this influencer
  const respondedRequests = COLLABORATION_REQUESTS.filter(
    (r: any) => r.influencerId === influencer.id && r.sentAt && r.respondedAt
  );
  const responseTime = (() => {
    if (respondedRequests.length === 0) return "N/A";
    const avgMs =
      respondedRequests.reduce((sum: number, r: any) => {
        return sum + (new Date(r.respondedAt).getTime() - new Date(r.sentAt).getTime());
      }, 0) / respondedRequests.length;
    const avgHours = Math.round(avgMs / (1000 * 60 * 60));
    if (avgHours < 1) return "< 1 hour";
    return `~${avgHours} hour${avgHours !== 1 ? "s" : ""}`;
  })();

  // Trust badges — plain variable (no hook) placed here, after the null-guard
  // early return, so `influencer` is guaranteed to be fully loaded on every render.
  const activeBadges: typeof TRUST_BADGES =
    influencer.status === "active"
      ? (mergeInfluencerBadges(influencer)
          .map((badgeId) =>
            TRUST_BADGES.find((b) => b.id === badgeId && b.status === "active")
          )
          .filter(Boolean) as typeof TRUST_BADGES)
      : [];

  const hasRatings = influencerRatings.length > 0;
  
  const avgRatings = hasRatings
    ? {
        overall: influencerRatings.reduce((sum, r) => sum + r.overallRating, 0) / influencerRatings.length,
        communication: influencerRatings.reduce((sum, r) => sum + r.communication, 0) / influencerRatings.length,
        contentQuality: influencerRatings.reduce((sum, r) => sum + r.contentQuality, 0) / influencerRatings.length,
        timeliness: influencerRatings.reduce((sum, r) => sum + r.timeliness, 0) / influencerRatings.length,
        professionalism: influencerRatings.reduce((sum, r) => sum + r.professionalism, 0) / influencerRatings.length,
      }
    : {
        overall: 0,
        communication: 0,
        contentQuality: 0,
        timeliness: 0,
        professionalism: 0,
      };

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-['Inter',sans-serif]">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative py-20 lg:py-28 overflow-hidden" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(-1);
                }}
                className="inline-flex items-center gap-1.5 text-white/80 text-sm hover:text-white hover:gap-2.5 transition-all mb-8"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            </motion.div>

            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
              <motion.div variants={fadeUp}>
                <ImageWithFallback
                  src={influencer.photo}
                  alt={influencer.name}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-white/20 shadow-xl"
                />
              </motion.div>
              <motion.div variants={fadeUp} className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl sm:text-4xl text-white">{influencer.name}</h1>

                  {isInfluencerVerified(influencer.id) && (
                    <BadgeCheck
                      size={20}
                      strokeWidth={2.5}
                      className="text-white shrink-0"
                      style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))" }}
                      title="Social account verified"
                    />
                  )}
                </div>
                <p className="text-white/80 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white">
                    {influencer.category}
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <MapPin size={14} /> {influencer.location}
                  </span>
                </p>

                {/* Compact earned badge row — 3 visible + overflow pill */}

              </motion.div>
              <motion.div variants={fadeUp} className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      handleAuthRequired("save this profile");
                      return;
                    }
                    setIsSaved(!isSaved);
                    toast.success(isSaved ? "Removed from favorites" : "Added to favorites");
                  }}
                  className={`p-3 rounded-xl transition-all ${
                    isSaved
                      ? "bg-white text-[#ef4444]"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={async () => {
                    const profileUrl = influencer.username
                      ? `${window.location.origin}/@${influencer.username}`
                      : window.location.href;
                    const shareData = {
                      title: `${influencer.name} on FLUBN`,
                      text: `Check out ${influencer.name}'s profile on FLUBN — ${influencer.category} creator with ${formatFollowers(influencer.followers)} followers`,
                      url: profileUrl,
                    };
                    // Try native Web Share API first (mobile)
                    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
                      try {
                        await navigator.share(shareData);
                        return;
                      } catch { /* user cancelled or unsupported */ }
                    }
                    // Fallback: copy to clipboard
                    copyToClipboard(profileUrl).then(() => {
                      toast.success("Profile link copied to clipboard!", {
                        description: profileUrl,
                      });
                    }).catch(() => {
                      toast.success("Share this profile", {
                        description: profileUrl,
                      });
                    });
                  }}
                  className="p-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all"
                >
                  <Share2 size={20} />
                </button>
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      handleAuthRequired("send a collaboration request");
                      return;
                    }
                    if (user?.role !== "brand") {
                      handleWrongRole();
                      return;
                    }
                    setShowRequestModal(true);
                    setRequestSent(false);
                    setDupWarning(false);
                    setFormData({ campaignName: "", budget: "", deliverables: "", timeline: "", message: "" });
                  }}
                  className="px-6 py-3 bg-white text-[#2F6BFF] rounded-xl hover:bg-white/90 transition-all flex items-center gap-2 shadow-lg"
                >
                  <Send size={16} />
                  <span className="hidden sm:inline">Collaborate</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-[#e2e8f0] p-6"
            >
              <h2 className="text-lg text-[#1a1a2e] mb-3">About</h2>
              <p className="text-[#64748b] leading-relaxed">{influencer.bio || "No bio provided yet."}</p>
            </motion.div>

            {/* Trust Badges — tb1 manual, tb2-tb7 auto-computed */}
            {activeBadges.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="rounded-2xl overflow-hidden border border-[#e2e8f0]"
                  style={{ boxShadow: "0 8px 32px rgba(47,107,255,0.08)" }}
                >
                  {/* Header */}
                  <div
                    className="flex items-center justify-between px-5 py-3.5"
                    style={{ background: "linear-gradient(to right, #f5f8ff, #eef3ff)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #2F6BFF, #1a4fd6)" }}
                      >
                        <Shield size={13} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-[#1a1a2e]">Trust Badges</p>
                        <p className="text-[10px] text-[#94a3b8]">Verified achievements</p>
                      </div>
                    </div>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white"
                      style={{
                        background: "linear-gradient(135deg, #2F6BFF, #1a4fd6)",
                        boxShadow: "0 2px 8px rgba(47,107,255,0.35)",
                      }}
                    >
                      <span className="text-white text-[11px]">{activeBadges.length}</span>
                    </div>
                  </div>

                  {/* Medallion grid */}
                  <div
                    className="bg-white px-5 py-6"
                  >
                    <div className="grid grid-cols-3 gap-x-4 gap-y-6">

                      {/* Non-featured badges */}
                      {activeBadges.filter(b => b.id !== "tb7").map((badge, i) => {
                        const BadgeIcon = badgeIconMap[badge.icon];
                        return (
                          <motion.div
                            key={badge.id}
                            initial={{ opacity: 0, scale: 0.75 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.06 + i * 0.05, type: "spring", stiffness: 220, damping: 20 }}
                            className="flex flex-col items-center gap-[9px] text-center"
                          >
                            <motion.div
                              whileHover={{ scale: 1.06, y: -2 }}
                              transition={{ type: "spring", stiffness: 300, damping: 22 }}
                              className="flex flex-col items-center gap-[9px] w-full cursor-pointer"
                            >
                              <div className="relative">
                                <motion.div
                                  className="w-[54px] h-[54px] rounded-full flex items-center justify-center"
                                  whileHover={{ boxShadow: `0 0 0 5px ${badge.color}14, 0 8px 16px ${badge.color}30` }}
                                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                                  style={{
                                    background: `radial-gradient(circle at 38% 35%, ${badge.color}55, ${badge.color}18)`,
                                    border: `2px solid ${badge.color}58`,
                                    boxShadow: `0 0 0 5px ${badge.color}0e, 0 6px 18px ${badge.color}32`,
                                  }}
                                >
                                  {BadgeIcon && <BadgeIcon size={22} style={{ color: badge.color }} />}
                                </motion.div>
                                <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-[1.5px] shadow-sm">
                                  <BadgeCheck size={14} style={{ color: badge.color, display: "block" }} />
                                </div>
                              </div>
                              <p className="text-[10px] text-[#475569] leading-tight text-center break-words max-w-full px-0.5">{badge.name}</p>
                            </motion.div>
                          </motion.div>
                        );
                      })}

                      {/* Brand Favorite — full row, centred */}
                      {(() => {
                        const fav = activeBadges.find(b => b.id === "tb7");
                        if (!fav) return null;
                        const FavIcon = badgeIconMap[fav.icon];
                        const favIdx = activeBadges.length - 1;
                        return (
                          <div className="col-span-3 flex items-center justify-center">
                            <motion.div
                              key={fav.id}
                              initial={{ opacity: 0, scale: 0.75 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.06 + favIdx * 0.05, type: "spring", stiffness: 220, damping: 20 }}
                              className="flex flex-col items-center gap-[9px] text-center"
                            >
                              <motion.div
                                whileHover={{ scale: 1.06, y: -2 }}
                                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                                className="flex flex-col items-center gap-[9px] w-full cursor-pointer"
                              >
                                <div className="relative">
                                  <motion.div
                                    className="w-[54px] h-[54px] rounded-full flex items-center justify-center"
                                    whileHover={{ boxShadow: `0 0 0 5px ${fav.color}14, 0 8px 16px ${fav.color}30` }}
                                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                                    style={{
                                      background: `radial-gradient(circle at 38% 35%, ${fav.color}55, ${fav.color}18)`,
                                      border: `2px solid ${fav.color}58`,
                                      boxShadow: `0 0 0 5px ${fav.color}0e, 0 6px 18px ${fav.color}32`,
                                    }}
                                  >
                                    {FavIcon && <FavIcon size={22} style={{ color: fav.color }} />}
                                  </motion.div>
                                  <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-[1.5px] shadow-sm">
                                    <BadgeCheck size={14} style={{ color: fav.color, display: "block" }} />
                                  </div>
                                </div>
                                <p className="text-[10px] text-[#475569] leading-tight text-center break-words max-w-full px-0.5">{fav.name}</p>
                              </motion.div>
                            </motion.div>
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                </motion.div>
            )}

            {/* Engagement Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              {engagementStats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-center hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    {stat.label === "Collabs Starting At"
                      ? <Wallet size={20} style={{ color: stat.color }} />
                      : <stat.icon size={20} style={{ color: stat.color }} />
                    }
                  </div>
                  <p className="text-xl text-[#1a1a2e]">{stat.value}</p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            {/* FLUBN Collaborations Banner — only shown when there are completed collabs */}
            {collabCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="relative rounded-2xl overflow-hidden border border-[#10b98125]"
                style={{ background: "linear-gradient(135deg, #f0fdf8 0%, #eff6ff 100%)" }}
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                    >
                      <Handshake size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-[#1a1a2e]">Collaborations on FLUBN</p>
                      <p className="text-xs text-[#64748b]">Completed within our platform</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl text-[#10b981]">{collabCount}</p>
                      <p className="text-[10px] text-[#94a3b8] uppercase tracking-wide">completed</p>
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#10b98118" }}>
                      <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse block" />
                    </div>
                  </div>
                </div>
                <div className="absolute right-20 top-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none">
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-[#10b981]" />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Platform Reach - NEW! */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-[#e2e8f0] p-6"
            >
              <h2 className="text-lg text-[#1a1a2e] mb-4">Platform Reach</h2>
              <div className="grid gap-3">
                {influencer.platformFollowers && !Array.isArray(influencer.platformFollowers) && typeof influencer.platformFollowers === "object" && Object.entries(influencer.platformFollowers).map(([platform, followers]) => {
                  const PlatformIcon = platformIcons[platform];
                  const colors: Record<string, string> = {
                    Instagram: "#E4405F",
                    YouTube: "#FF0000",
                    Twitter: "#1DA1F2",
                    Facebook: "#1877F2",
                  };
                  const color = colors[platform] || "#2F6BFF";
                  
                  return (
                    <div
                      key={platform}
                      className="flex items-center justify-between p-4 bg-[#f8f9fc] rounded-xl hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        {(() => {
                          const caseAliases: Record<string, string> = {
                            youtube:   "YouTube",
                            linkedin:  "LinkedIn",
                            instagram: "Instagram",
                            twitter:   "Twitter",
                            facebook:  "Facebook",
                            tiktok:    "TikTok",
                          };
                          const resolvedKey =
                            caseAliases[platform.toLowerCase()] ??
                            (platform.charAt(0).toUpperCase() + platform.slice(1));
                          const brandColors: Record<string, string> = {
                            Instagram: "#E4405F",
                            YouTube:   "#FF0000",
                            Twitter:   "#1DA1F2",
                            Facebook:  "#1877F2",
                            TikTok:    "#000000",
                            LinkedIn:  "#0A66C2",
                          };
                          const resolvedColor = brandColors[resolvedKey] ?? color;
                          const Icon = platformIcons[resolvedKey] ?? platformIcons[platform] ?? Globe;
                          return (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${resolvedColor}15` }}
                            >
                              <Icon size={20} style={{ color: resolvedColor }} />
                            </div>
                          );
                        })()}
                        <div>
                          <p className="text-sm text-[#1a1a2e]">{platform}</p>
                          <p className="text-xs text-[#64748b]">
                            {(() => {
                              // Look up the URL from socialLinks using a normalised platformId match
                              const normKey = platform.toLowerCase().replace(/\s+/g, "").replace("/x", "");
                              const link = (influencer.socialLinks || []).find(
                                (l) => l.platformId.toLowerCase().replace(/\s+/g, "") === normKey
                              );
                              if (link?.url) {
                                // Extract handle from URL, e.g. instagram.com/handle → @handle
                                const handle = link.url.replace(/\/$/, "").split("/").pop() || "";
                                return handle ? `@${handle}` : link.url.replace(/^https?:\/\//, "");
                              }
                              return "";
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg text-[#1a1a2e]">{formatFollowers(followers as number)}</p>
                        <p className="text-xs text-[#94a3b8]">followers</p>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-2 pt-3 border-t border-[#e2e8f0]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#64748b]">Total Reach</span>
                    <span className="text-lg text-[#1a1a2e]">
                      {(() => {
                        const total =
                          (influencer.platformFollowers &&
                           typeof influencer.platformFollowers === "object" &&
                           !Array.isArray(influencer.platformFollowers)
                            ? Object.values(influencer.platformFollowers).reduce((s: number, v) => s + (Number(v) || 0), 0)
                            : 0) || influencer.followers || 0;
                        if (total >= 1_000_000) return `${Number((total / 1_000_000).toFixed(1))}M`;
                        if (total >= 1_000)     return `${Number((total / 1_000).toFixed(1))}K`;
                        return total.toString();
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Recent Collaborations — only shown when there are completed collabs */}
            {recentCollabs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-[#e2e8f0] p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg text-[#1a1a2e]">Recent Collaborations</h2>
                  <span className="text-xs text-[#94a3b8]">Showing {recentCollabs.length} of {collabCount}</span>
                </div>
                <div className="space-y-3">
                  {recentCollabs.map((collab, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-3 bg-[#f8f9fc] rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-lg text-white flex items-center justify-center text-xs shrink-0" style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}>
                        {collab.brand.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#1a1a2e] truncate">{collab.campaign}</p>
                        <p className="text-xs text-[#94a3b8]">{collab.brand}</p>
                      </div>
                      <span className="text-xs text-[#94a3b8] flex items-center gap-1">
                        <Calendar size={12} /> {collab.date}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Content Specialties — filled in by the influencer on their profile */}
            {((influencer as any).contentSpecialties as string[] | undefined)?.length! > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-2xl border border-[#e2e8f0] p-6"
              >
                <h2 className="text-lg text-[#1a1a2e] mb-4">Content Specialties</h2>
                <div className="flex flex-wrap gap-2">
                  {((influencer as any).contentSpecialties as string[]).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-[#f8f9fc] text-[#64748b] border border-[#e2e8f0] rounded-full text-sm hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF] transition-colors cursor-default"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Portfolio / Works — reads from influencer.portfolio saved in profile */}
            {((influencer.portfolio || []) as PortfolioItem[]).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl overflow-hidden"
              >
                {(() => {
                  const portfolioItems = (influencer.portfolio || []) as PortfolioItem[];
                  return (
                    <>
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #2F6BFF, #6BA9FF)" }} />
                    <h2 className="text-lg text-[#1a1a2e]">Portfolio</h2>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(["all", ...Array.from(new Set(portfolioItems.map(i => i.type)))] as string[]).map((type) => {
                      const isAll = type === "all";
                      const meta = !isAll ? WORK_TYPE_META[type as keyof typeof WORK_TYPE_META] : null;
                      const TypeIcon = meta?.icon;
                      const count = isAll
                        ? portfolioItems.length
                        : portfolioItems.filter(i => i.type === type).length;
                      const active = portfolioFilter === type;
                      return (
                        <button
                          key={type}
                          onClick={() => setPortfolioFilter(type)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${
                            active
                              ? "text-white shadow-sm"
                              : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                          }`}
                          style={active ? { backgroundColor: isAll ? "#2F6BFF" : meta?.color } : {}}
                        >
                          {TypeIcon && <TypeIcon size={10} />}
                          {isAll ? "All" : meta?.label}
                          <span className={`ml-0.5 ${active ? "opacity-80" : "opacity-50"}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Instagram-style portrait grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {portfolioItems.filter(item => portfolioFilter === "all" || item.type === portfolioFilter).map((item) => {
                    const workMeta = WORK_TYPE_META[item.type];
                    const WorkIcon = workMeta.icon;
                    const playable = item.type === "reel" || item.type === "video";
                    return (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/work relative block rounded-xl overflow-hidden"
                      >
                        <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "4/5" }}>
                          <ImageWithFallback
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover/work:scale-105 transition-transform duration-500"
                          />
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover/work:bg-black/30 transition-all duration-300" />
                          {/* Permanent bottom gradient for text */}
                          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                          {/* Play button for reels/videos */}
                          {playable && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/25 group-hover/work:scale-110 group-hover/work:bg-white/30 transition-all duration-300 shadow-lg">
                                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-white ml-0.5" />
                              </div>
                            </div>
                          )}
                          {/* Type badge - top left */}
                          <span
                            className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider text-white flex items-center gap-1 backdrop-blur-sm"
                            style={{ backgroundColor: `${workMeta.color}cc` }}
                          >
                            <WorkIcon size={10} />
                            {workMeta.label}
                          </span>
                          {/* External link - top right on hover */}
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-md bg-white/15 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/work:opacity-100 transition-all">
                            <ExternalLink size={11} />
                          </div>
                          {/* Bottom text overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-2.5">
                            <p className="text-white text-xs drop-shadow-md line-clamp-2">{item.title}</p>
                            {item.description && (
                              <p className="text-white/50 text-[10px] mt-0.5 truncate">{item.description}</p>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-[#e2e8f0] p-6"
            >
              <h2 className="text-lg text-[#1a1a2e] mb-4">Connect</h2>
              <div className="space-y-2">
                {(influencer.socialLinks || []).map((link) => {
                  const meta = PLATFORM_META[link.platformId];
                  if (!meta) return null;
                  const SocialIcon = meta.icon;
                  return (
                    <a
                      key={link.platformId}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-[#f8f9fc] rounded-xl hover:shadow-md hover:border-[#2F6BFF]/20 transition-all group/social cursor-pointer"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/social:scale-110"
                        style={{ backgroundColor: `${meta.color}15` }}
                      >
                        <SocialIcon size={17} style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#1a1a2e]">{meta.label}</p>
                        <p className="text-xs text-[#94a3b8] truncate">{link.url.replace(/^https?:\/\//, "")}</p>
                      </div>
                      <ExternalLink size={14} className="text-[#c5cad3] group-hover/social:text-[#2F6BFF] transition-colors shrink-0" />
                    </a>
                  );
                })}
              </div>
            </motion.div>

            {/* Quick Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-[#e2e8f0] p-6"
            >
              <h2 className="text-lg text-[#1a1a2e] mb-4">Quick Info</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748b]">Category</span>
                  <span className="text-[#1a1a2e] px-2.5 py-0.5 bg-[#EBF2FF] text-[#2F6BFF] rounded-full text-xs">
                    {influencer.category}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748b]">Location</span>
                  <span className="text-[#1a1a2e]">{influencer.location.split(",")[0]}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748b]">Response Time</span>
                  <span className="text-[#1a1a2e]">{responseTime}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748b]">Collaborations</span>
                  <span className="text-[#1a1a2e]">{collabCount} completed</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748b]">Member since</span>
                  <span className="text-[#1a1a2e]">{memberSince}</span>
                </div>
              </div>
            </motion.div>

            {/* Rating */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl border border-[#e2e8f0] p-6"
            >
              <h2 className="text-lg text-[#1a1a2e] mb-3">Brand Rating</h2>
              {hasRatings ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={18}
                          className={s <= Math.round(avgRatings.overall) ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#e2e8f0]"}
                        />
                      ))}
                    </div>
                    <span className="text-[#1a1a2e]">{avgRatings.overall.toFixed(1)}</span>
                    <span className="text-xs text-[#94a3b8]">({influencerRatings.length} {influencerRatings.length === 1 ? 'review' : 'reviews'})</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "Communication", value: avgRatings.communication },
                      { label: "Content Quality", value: avgRatings.contentQuality },
                      { label: "Timeliness", value: avgRatings.timeliness },
                      { label: "Professionalism", value: avgRatings.professionalism },
                    ].map((r) => {
                      const percentage = (r.value / 5) * 100;
                      return (
                        <div key={r.label} className="flex items-center gap-2 text-xs">
                          <span className="text-[#64748b] w-28">{r.label}</span>
                          <div className="flex-1 h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percentage}%`, background: "linear-gradient(90deg, #0F3D91, #2F6BFF)" }}
                            />
                          </div>
                          <span className="text-[#94a3b8] w-8 text-right">{percentage.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* View Reviews Button */}
                  {influencerRatings.length > 0 && (
                    <button
                      onClick={() => setShowAllReviews(true)}
                      className="w-full mt-4 py-2.5 text-sm text-[#2F6BFF] border border-[#2F6BFF]/30 rounded-xl hover:bg-[#EBF2FF] transition-colors"
                    >
                      View All Reviews ({influencerRatings.length})
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <Star size={32} className="text-[#e2e8f0] mx-auto mb-2" />
                  <p className="text-sm text-[#94a3b8]">No ratings yet</p>
                  <p className="text-xs text-[#b0b8c9] mt-1">Be the first to collaborate and review!</p>
                </div>
              )}
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
            >
              <h3 className="text-white mb-2">Ready to collaborate?</h3>
              <p className="text-white/80 text-sm mb-4">
                Send a collaboration request and start creating impactful campaigns together.
              </p>
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    handleAuthRequired("send a collaboration request");
                    return;
                  }
                  if (user?.role !== "brand") {
                    handleWrongRole();
                    return;
                  }
                  setShowRequestModal(true);
                  setRequestSent(false);
                  setDupWarning(false);
                  setFormData({ campaignName: "", budget: "", deliverables: "", timeline: "", message: "" });
                  setTimelineStart("");
                  setTimelineEnd("");
                }}
                className="block w-full text-center py-2.5 bg-white text-[#2F6BFF] rounded-xl hover:bg-white/90 transition-colors text-sm"
              >
                Send Collaboration Request
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Send Collaboration Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRequestModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ImageWithFallback
                    src={influencer.photo}
                    alt={influencer.name}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <h2 className="text-lg text-[#1a1a2e]">Send Collaboration Request</h2>
                    <p className="text-sm text-[#64748b]">to {influencer.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowRequestModal(false)} className="text-[#94a3b8] hover:text-[#64748b]">
                  <X size={20} />
                </button>
              </div>

              {requestSent ? (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#ecfdf5] flex items-center justify-center mx-auto mb-4">
                    <Send size={24} className="text-[#10b981]" />
                  </div>
                  <h3 className="text-lg text-[#1a1a2e]">Request Sent!</h3>
                  <p className="text-sm text-[#64748b] mt-2">
                    Your collaboration request has been sent to {influencer.name}. You'll be notified when they respond.
                  </p>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleSubmitRequest} className="p-6 space-y-4 overflow-y-auto max-h-[min(600px,70vh)] flubn-scrollbar">
                  {/* ── Template Load/Save Bar ───────────────────────────── */}
                  {planLimits.campaignTemplates !== 0 ? (
                    <div className="rounded-xl border border-[#e2e8f0] bg-gradient-to-b from-[#f8f9fc] to-white overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f1f5f9]">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-[#2F6BFF]/10 flex items-center justify-center">
                            <FileText size={11} className="text-[#2F6BFF]" />
                          </div>
                          <span className="text-xs font-semibold text-[#1a1a2e]">Templates</span>
                          {templates.length > 0 && (
                            <span className="text-[10px] text-[#94a3b8] bg-[#f1f5f9] px-1.5 py-0.5 rounded-md font-medium">{templates.length}/{formatLimit(getTemplateLimit())}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Scroll arrows - only when 2+ templates */}
                          {templates.length >= 2 && !showSaveTemplateInput && (
                            <div className="flex items-center gap-1 mr-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById("profile-tpl-scroll");
                                  el?.scrollBy({ left: -180, behavior: "smooth" });
                                }}
                                className="w-5 h-5 rounded-md bg-white border border-[#e2e8f0] flex items-center justify-center text-[#94a3b8] hover:text-[#2F6BFF] hover:border-[#2F6BFF]/40 hover:shadow-sm transition-all"
                              >
                                <ChevronLeft size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById("profile-tpl-scroll");
                                  el?.scrollBy({ left: 180, behavior: "smooth" });
                                }}
                                className="w-5 h-5 rounded-md bg-white border border-[#e2e8f0] flex items-center justify-center text-[#94a3b8] hover:text-[#2F6BFF] hover:border-[#2F6BFF]/40 hover:shadow-sm transition-all"
                              >
                                <ChevronRight size={12} />
                              </button>
                            </div>
                          )}
                          {!showSaveTemplateInput ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSaveTemplateName(formData.campaignName || "");
                                setShowSaveTemplateInput(true);
                              }}
                              disabled={!formData.campaignName.trim() && !formData.budget && !formData.deliverables.trim() && !formData.message.trim()}
                              className="text-[11px] text-white bg-[#2F6BFF] hover:bg-[#0F3D91] font-medium flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed transition-all px-2.5 py-1 rounded-lg shadow-sm"
                            >
                              <Save size={10} /> Save
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={saveTemplateName}
                                onChange={(e) => setSaveTemplateName(e.target.value)}
                                placeholder="Template name..."
                                className="w-32 text-[11px] px-2.5 py-1 bg-white border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]/40 text-[#1a1a2e] placeholder:text-[#c4ccd8]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); handleSaveAsTemplate(); }
                                  if (e.key === "Escape") { setShowSaveTemplateInput(false); setSaveTemplateName(""); }
                                }}
                              />
                              <button type="button" onClick={handleSaveAsTemplate} className="w-6 h-6 rounded-lg bg-[#2F6BFF] text-white flex items-center justify-center hover:bg-[#0F3D91] transition-colors shadow-sm">
                                <Check size={12} />
                              </button>
                              <button type="button" onClick={() => { setShowSaveTemplateInput(false); setSaveTemplateName(""); }} className="w-6 h-6 rounded-lg text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] flex items-center justify-center transition-colors">
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Template Cards - horizontal scroll */}
                      {templates.length > 0 && (
                        <div className="relative">
                          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent z-[1] pointer-events-none rounded-bl-xl" />
                          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent z-[1] pointer-events-none rounded-br-xl" />
                          <div
                            id="profile-tpl-scroll"
                            className="flex gap-2 overflow-x-auto py-3 px-4 scroll-smooth"
                            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                          >
                            {templates.map((tpl) => (
                              <div
                                key={tpl.id}
                                className="group/tpl flex-shrink-0 w-44 bg-white rounded-xl border border-[#e8ecf1] hover:border-[#2F6BFF]/30 hover:shadow-md transition-all duration-200 relative overflow-hidden"
                              >
                                <div className="h-[2px] bg-gradient-to-r from-[#2F6BFF] to-[#8b5cf6]" />
                                <div className="p-2.5 pt-2">
                                  <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <div className="w-4 h-4 rounded bg-[#2F6BFF]/8 flex items-center justify-center flex-shrink-0">
                                        <FileText size={8} className="text-[#2F6BFF]" />
                                      </div>
                                      <p className="text-[11px] font-semibold text-[#1a1a2e] truncate leading-tight">{tpl.name}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                                      className="text-[#d1d5db] hover:text-[#ef4444] opacity-0 group-hover/tpl:opacity-100 transition-all shrink-0 p-0.5 -mr-0.5 rounded hover:bg-[#fef2f2]"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                  <p className="text-[9.5px] text-[#94a3b8] truncate mb-2 pl-[22px]">{tpl.campaignName || "No campaign name"}</p>
                                  <div className="flex items-center gap-1 mb-2.5 flex-wrap pl-[22px]">
                                    {tpl.budget && (
                                      <span className="text-[8.5px] text-[#16a34a] bg-[#f0fdf4] border border-[#dcfce7] px-1.5 py-px rounded-md font-semibold">₹{tpl.budget}</span>
                                    )}
                                    {tpl.deliverables && (
                                      <span className="text-[8.5px] text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] px-1.5 py-px rounded-md truncate max-w-[70px]">{tpl.deliverables}</span>
                                    )}
                                    {(tpl.timelineStart || tpl.timelineEnd) && (
                                      <span className="text-[8.5px] text-[#8b5cf6] bg-[#f5f3ff] border border-[#ede9fe] px-1.5 py-px rounded-md whitespace-nowrap">{tpl.timelineStart}{tpl.timelineEnd ? ` → ${tpl.timelineEnd}` : ""}</span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => loadTemplate(tpl)}
                                    className="w-full text-[10.5px] text-[#2F6BFF] font-semibold py-1.5 rounded-lg bg-gradient-to-r from-[#EBF2FF] to-[#f0f0ff] hover:from-[#dce8ff] hover:to-[#e8e5ff] transition-all flex items-center justify-center gap-1 border border-[#2F6BFF]/10"
                                  >
                                    <Zap size={10} /> Use template
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty hint */}
                      {templates.length === 0 && (
                        <div className="px-4 py-3 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                            <Lightbulb size={14} className="text-[#94a3b8]" />
                          </div>
                          <p className="text-[11px] text-[#94a3b8] leading-relaxed">Fill out the form below, then click <span className="font-medium text-[#64748b]">"Save"</span> to create a reusable template.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-[#f8f9fc] rounded-xl border border-[#e2e8f0] opacity-60">
                      <Lock size={12} className="text-[#94a3b8]" />
                      <span className="text-xs text-[#94a3b8]">Campaign templates require</span>
                      <Link to="/brand/subscription" className="text-xs text-[#2F6BFF] hover:underline">Basic+ plan</Link>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Campaign Name</label>
                    <input
                      type="text"
                      value={formData.campaignName}
                      onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                      placeholder="e.g. Summer Collection Launch"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                      required
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-[#64748b] mb-1.5 block">Budget</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b] text-sm select-none pointer-events-none">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.budget}
                          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                          onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                          placeholder="50,000"
                          className="w-full pl-8 pr-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-[#64748b] mb-1.5 block">Timeline</label>
                      <div className="space-y-3">
                        <div ref={startDateRef}>
                          <DatePicker
                            label="Start Date"
                            value={timelineStart}
                            onChange={(val) => {
                              setTimelineStart(val);
                              if (timelineEnd && val > timelineEnd) setTimelineEnd("");
                              const label = val
                                ? `${formatDateLabel(val)}${timelineEnd && val <= timelineEnd ? " – " + formatDateLabel(timelineEnd) : ""}`
                                : "";
                              setFormData({ ...formData, timeline: label });
                            }}
                            onOpenChange={(isOpen) => {
                              if (isOpen && startDateRef.current) {
                                setTimeout(() => {
                                  startDateRef.current?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
                                }, 50);
                              }
                            }}
                            minDate={new Date().toISOString().split("T")[0]}
                            maxDate={new Date(new Date().getFullYear() + 5, new Date().getMonth(), new Date().getDate()).toISOString().split("T")[0]}
                            placeholder="Pick start date"
                            required
                          />
                        </div>
                        <div ref={endDateRef}>
                          <DatePicker
                            label="End Date"
                            value={timelineEnd}
                            onChange={(val) => {
                              setTimelineEnd(val);
                              const label = val
                                ? `${timelineStart ? formatDateLabel(timelineStart) + " – " : ""}${formatDateLabel(val)}`
                                : "";
                              setFormData({ ...formData, timeline: label });
                            }}
                            onOpenChange={(isOpen) => {
                              if (isOpen && endDateRef.current) {
                                setTimeout(() => {
                                  endDateRef.current?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
                                }, 50);
                              }
                            }}
                            minDate={timelineStart || new Date().toISOString().split("T")[0]}
                            maxDate={new Date(new Date().getFullYear() + 5, new Date().getMonth(), new Date().getDate()).toISOString().split("T")[0]}
                            placeholder="Pick end date"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Deliverables</label>
                    <input
                      type="text"
                      value={formData.deliverables}
                      onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                      placeholder="e.g. 3 Instagram Reels, 2 Stories"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Message</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell the influencer about your campaign..."
                      rows={3}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] resize-none"
                      required
                    />
                  </div>
                  {dupWarning && (
                    <div ref={dupWarningRef} className="flex items-start gap-3 p-3.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl">
                      <AlertCircle size={16} className="text-[#f59e0b] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-[#92400e]">You already have a pending request to this influencer.</p>
                        <p className="text-xs text-[#78350f] mt-0.5">Click "Send Collaboration Request" again to confirm sending for a different project.</p>
                      </div>
                    </div>
                  )}
                  <button
                    ref={submitButtonRef}
                    type="submit"
                    className="w-full py-3 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#2F6BFF]/25"
                  >
                    <Send size={16} />
                    Send Collaboration Request
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews Modal */}
      <AnimatePresence>
        {showAllReviews && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAllReviews(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl text-[#1a1a2e]">Brand Reviews</h2>
                  <p className="text-sm text-[#64748b] mt-0.5">
                    {influencerRatings.length} verified {influencerRatings.length === 1 ? 'review' : 'reviews'} from brand collaborations
                  </p>
                </div>
                <button onClick={() => setShowAllReviews(false)} className="text-[#94a3b8] hover:text-[#64748b]">
                  <X size={22} />
                </button>
              </div>

              {/* Reviews List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#e2e8f0] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent hover:[&::-webkit-scrollbar-thumb]:bg-[#cbd5e1]">
                {influencerRatings.map((rating) => (
                  <motion.div
                    key={rating.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-[#e2e8f0] rounded-xl p-5 bg-white hover:shadow-md transition-shadow"
                  >
                    {/* Brand Info & Rating */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm shrink-0"
                          style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
                        >
                          {rating.brandName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-[#1a1a2e]">{rating.brandName}</p>
                          <p className="text-xs text-[#94a3b8]">{rating.campaignName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={14}
                                className={s <= Math.round(rating.overallRating) ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#e2e8f0]"}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-[#1a1a2e]">{rating.overallRating.toFixed(1)}</span>
                        </div>
                        <p className="text-[10px] text-[#94a3b8]">{rating.createdDate}</p>
                      </div>
                    </div>

                    {/* Rating Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      {[
                        { label: "Communication", value: rating.communication, icon: MessageCircle },
                        { label: "Quality", value: rating.contentQuality, icon: Star },
                        { label: "Timeliness", value: rating.timeliness, icon: ChartBar },
                        { label: "Professional", value: rating.professionalism, icon: Shield },
                      ].map((metric) => (
                        <div key={metric.label} className="bg-[#f8f9fc] rounded-lg p-2.5 text-center">
                          <metric.icon size={14} className="text-[#64748b] mx-auto mb-1" />
                          <p className="text-[10px] text-[#94a3b8] mb-0.5">{metric.label}</p>
                          <p className="text-sm text-[#1a1a2e]">{metric.value}/5</p>
                        </div>
                      ))}
                    </div>

                    {/* Review Text */}
                    <div className="bg-[#f8f9fc] rounded-xl p-4 border border-[#e2e8f0]">
                      <p className="text-sm text-[#64748b] leading-relaxed">{rating.review}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#e2e8f0] bg-[#f8f9fc] shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#64748b]">
                    <Shield size={14} className="text-[#10b981]" />
                    <span>All reviews are from verified collaborations</span>
                  </div>
                  <button
                    onClick={() => setShowAllReviews(false)}
                    className="px-4 py-2 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== GRADIENT FOOTER WRAPPER ========== */}
      <section className="px-5 pb-0">
        <div className="rounded-t-[8px] p-[5px] pt-[5px]" style={{ background: "linear-gradient(180deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
          <div className="bg-[#0a090f] rounded-t-0">
            <Footer />
          </div>
        </div>
      </section>
    </div>
  );
}