import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useOutletContext, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Film, Video, Image, Camera, Trash2, ExternalLink, Plus, Save, X,
  ChevronDown, Link as LinkIcon, Globe, Hash, Music, Tv,
  Instagram, Youtube, Twitter, Linkedin, Facebook, MessageCircle, Handshake,
  BadgeCheck, Star, Zap, Award, TrendingUp, Sparkles, Heart, BadgeDollarSign, Check, MapPin,
  ZoomIn, ZoomOut, RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { CATEGORIES, TRUST_BADGES } from "../../data/mock-data";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { mergeInfluencerBadges } from "../../utils/badgeEngine";
import { CURRENCIES, getCurrency } from "../../utils/currencies";
import { updateInfluencer, addInfluencer, getInfluencers, type Influencer } from "../../utils/dataManager";
import { LOCATION_GROUPS, ALL_LOCATIONS } from "../../data/locations";
import { sendEmail } from "../../utils/emailService";

/** Parse shorthand follower strings like "125K", "1.5M", "2B" into numbers */
function parseFollowerShorthand(val: string): number {
  if (!val) return 0;
  const cleaned = val.trim().toUpperCase();
  const match = cleaned.match(/^([0-9]*\.?[0-9]+)\s*([KMB]?)$/);
  if (!match) return parseInt(cleaned) || 0;
  const num = parseFloat(match[1]);
  const suffix = match[2];
  if (suffix === "K") return Math.round(num * 1_000);
  if (suffix === "M") return Math.round(num * 1_000_000);
  if (suffix === "B") return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

/** Format a number to compact display: 1500 → "1.5K", 2000000 → "2M" */
function formatFollowerCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1).replace(/\.0$/, "")}K`;
  return n.toString();
}

/**
 * Helper function to create a cropped image from the canvas
 */
async function createCroppedImage(
  imageSrc: string,
  pixelCrop: Area
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to match the cropped area
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Return as base64 data URL
  return canvas.toDataURL("image/jpeg", 0.95);
}

/**
 * Helper to create an image element from a source
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

// Type definition for Outlet context
type DashboardContext = {
  user: any;
  logout: () => void;
  navigate: (path: string) => void;
  role: string;
  menuItems: any[];
  pendingCollaborations: any[];
  unreadNotifications: number;
};

type WorkType = "reel" | "video" | "photo" | "collaboration";

interface PortfolioItem {
  id: string;
  type: WorkType;
  title: string;
  url: string;
  thumbnail: string;
  description: string;
}

const WORK_TYPES: { id: WorkType; label: string; icon: React.ElementType; color: string }[] = [
  { id: "reel", label: "Reel", icon: Film, color: "#E4405F" },
  { id: "video", label: "Video", icon: Video, color: "#FF0000" },
  { id: "photo", label: "Photo", icon: Image, color: "#2F6BFF" },
  { id: "collaboration", label: "Collaboration", icon: Handshake, color: "#10b981" },
];

const INITIAL_PORTFOLIO: PortfolioItem[] = [];

const SPECIALTY_OPTIONS = [
  "Product Reviews",
  "Unboxing",
  "Tutorials / How-to",
  "Lifestyle",
  "Travel",
  "Fashion & Style",
  "Beauty & Makeup",
  "Fitness & Health",
  "Food & Cooking",
  "Tech & Gadgets",
  "Gaming",
  "Reels / Short-form",
  "Long-form Videos",
  "Photography",
  "Brand Collaborations",
  "Vlogs",
  "Comedy / Entertainment",
  "Parenting",
  "Education",
  "Finance & Business",
];

export default function InfluencerProfile() {
  const { user, updateProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Show welcome modal for new influencer signups
  useEffect(() => {
    if (searchParams.get("welcome") === "true") {
      setShowWelcomeModal(true);
      // Remove the query param from the URL without navigation
      setSearchParams({}, { replace: true });
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image cropping state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Find the user's own influencer record (if it exists) for badges/status
  const myInfluencerRecord = useMemo(() => {
    if (!user) return null;
    const all = getInfluencers();
    return all.find(inf => inf.id === user.id || inf.email === user.email) || null;
  }, [user]);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    category: user?.category || "",
    location: user?.location || "",
    phone: user?.phone || "",
    followers: user?.followers || "",
    ratePerPost: user?.ratePerPost || "",
    currency: user?.currency || "INR",
  });

  // Determine if the current location is a preset or custom one
  const currentLoc = user?.location || "";
  const isPresetLocation = ALL_LOCATIONS.includes(currentLoc);
  const [locationMode, setLocationMode] = useState<"preset" | "custom">(
    isPresetLocation || !currentLoc ? "preset" : "custom"
  );
  const [customLocation, setCustomLocation] = useState(isPresetLocation ? "" : currentLoc);

  const handleLocationSelect = (value: string) => {
    if (value === "Other") {
      setLocationMode("custom");
      handleChange("location", customLocation);
    } else {
      setLocationMode("preset");
      setCustomLocation("");
      handleChange("location", value);
    }
  };

  const handleCustomLocationChange = (value: string) => {
    setCustomLocation(value);
    handleChange("location", value);
  };

  const allPlatforms = [
    { id: "instagram", icon: Instagram, label: "Instagram", color: "#E4405F", placeholder: "https://instagram.com/username" },
    { id: "youtube", icon: Youtube, label: "YouTube", color: "#FF0000", placeholder: "https://youtube.com/@channel" },
    { id: "tiktok", icon: Music, label: "TikTok", color: "#000000", placeholder: "https://tiktok.com/@username", letter: "T" },
    { id: "twitter", icon: Twitter, label: "Twitter / X", color: "#1DA1F2", placeholder: "https://x.com/username" },
    { id: "linkedin", icon: Linkedin, label: "LinkedIn", color: "#0A66C2", placeholder: "https://linkedin.com/in/username" },
    { id: "facebook", icon: Facebook, label: "Facebook", color: "#1877F2", placeholder: "https://facebook.com/page" },
    { id: "twitch", icon: Tv, label: "Twitch", color: "#9146FF", placeholder: "https://twitch.tv/username" },
    { id: "pinterest", icon: Hash, label: "Pinterest", color: "#E60023", placeholder: "https://pinterest.com/username", letter: "P" },
    { id: "snapchat", icon: MessageCircle, label: "Snapchat", color: "#FFFC00", textColor: "#1a1a2e", placeholder: "https://snapchat.com/add/username" },
    { id: "threads", icon: Hash, label: "Threads", color: "#000000", placeholder: "https://threads.net/@username", letter: "@" },
    { id: "discord", icon: MessageCircle, label: "Discord", color: "#5865F2", placeholder: "https://discord.gg/invite" },
    { id: "spotify", icon: Music, label: "Spotify", color: "#1DB954", placeholder: "https://open.spotify.com/artist/..." },
    { id: "website", icon: Globe, label: "Website", color: "#64748b", placeholder: "https://yourwebsite.com" },
    { id: "other", icon: LinkIcon, label: "Other Link", color: "#94a3b8", placeholder: "https://..." },
  ];

  const [socialLinks, setSocialLinks] = useState<{ platformId: string; url: string }[]>(() => {
    if (user?.socialLinks && user.socialLinks.length > 0) {
      return user.socialLinks;
    }
    return [
      { platformId: "instagram", url: "" },
      { platformId: "youtube", url: "" },
    ];
  });

  const [platformFollowers, setPlatformFollowers] = useState<{ platformId: string; followers: string }[]>(() => {
    if (user?.platformFollowers && user.platformFollowers.length > 0) {
      return user.platformFollowers;
    }
    return [
      { platformId: "instagram", followers: "" },
      { platformId: "youtube", followers: "" },
    ];
  });

  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const activePlatformIds = socialLinks.map((s) => s.platformId);
  const availablePlatforms = allPlatforms.filter(
    (p) => !activePlatformIds.includes(p.id) || p.id === "other"
  );

  const addSocialLink = (platformId: string) => {
    setSocialLinks((prev) => [...prev, { platformId, url: "" }]);
    setPlatformFollowers((prev) => {
      if (!prev.find(p => p.platformId === platformId)) {
        return [...prev, { platformId, followers: "" }];
      }
      return prev;
    });
    setShowAddDropdown(false);
  };

  const removeSocialLink = (index: number) => {
    const platformId = socialLinks[index].platformId;
    setSocialLinks((prev) => prev.filter((_, i) => i !== index));
    setPlatformFollowers((prev) => prev.filter(p => p.platformId !== platformId));
  };

  const updateSocialUrl = (index: number, url: string) => {
    setSocialLinks((prev) => prev.map((s, i) => (i === index ? { ...s, url } : s)));
  };

  const updatePlatformFollowers = (platformId: string, followers: string) => {
    setPlatformFollowers((prev) => {
      const existing = prev.find(p => p.platformId === platformId);
      if (existing) {
        return prev.map(p => p.platformId === platformId ? { ...p, followers } : p);
      } else {
        return [...prev, { platformId, followers }];
      }
    });
  };

  const getPlatformFollowers = (platformId: string) => {
    return platformFollowers.find(p => p.platformId === platformId)?.followers || "";
  };

  const getPlatform = (id: string) => allPlatforms.find((p) => p.id === id)!;

  // Content Specialties state
  const [contentSpecialties, setContentSpecialties] = useState<string[]>(
    () => (user?.contentSpecialties && user.contentSpecialties.length > 0 ? user.contentSpecialties : [])
  );

  const toggleSpecialty = (tag: string) => {
    setContentSpecialties((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const [customSpecialtyInput, setCustomSpecialtyInput] = useState("");

  const addCustomSpecialty = () => {
    const trimmed = customSpecialtyInput.trim();
    if (!trimmed) return;
    if (contentSpecialties.map((s) => s.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error("Already added", { description: `"${trimmed}" is already in your specialties.` });
      return;
    }
    setContentSpecialties((prev) => [...prev, trimmed]);
    setCustomSpecialtyInput("");
  };

  // Portfolio / Works state
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    if (user?.portfolio && user.portfolio.length > 0) {
      return user.portfolio as PortfolioItem[];
    }
    return INITIAL_PORTFOLIO;
  });

  /**
   * Re-sync ALL form state when the logged-in user's identity changes.
   *
   * Why: useState initializers run only ONCE on mount. After logout the
   * flubn_user cache is cleared, so the component can mount while Supabase
   * auth is still resolving (user = null). By the time the session resolves
   * and user is populated, all initializers have already fired with empty
   * values. This effect corrects that by re-populating every field from
   * auth metadata AND the influencer localStorage record as a fallback.
   */
  useEffect(() => {
    const inf = myInfluencerRecord;
    if (!user && !inf) return;

    // Core text fields
    setFormData({
      name:        user?.name        || inf?.name        || "",
      bio:         user?.bio         || inf?.bio         || "",
      category:    user?.category    || inf?.category    || "",
      location:    user?.location    || inf?.location    || "",
      phone:       user?.phone       || inf?.phone       || "",
      followers:   user?.followers   || (inf?.followers   ? formatFollowerCount(inf.followers)   : ""),
      ratePerPost: user?.ratePerPost || (inf?.ratePerPost ? String(inf.ratePerPost)               : ""),
      currency:    user?.currency    || inf?.currency    || "INR",
    });

    // Location mode
    const loc = user?.location || inf?.location || "";
    if (loc) {
      if (ALL_LOCATIONS.includes(loc)) {
        setLocationMode("preset");
        setCustomLocation("");
      } else {
        setLocationMode("custom");
        setCustomLocation(loc);
      }
    }

    // Social links — auth metadata takes priority, then influencer record
    const bestSocialLinks =
      (user?.socialLinks?.some((s) => s.url) ? user.socialLinks : null) ||
      (inf?.socialLinks?.length               ? inf.socialLinks  : null);
    if (bestSocialLinks && bestSocialLinks.length > 0) {
      setSocialLinks(bestSocialLinks);
    }

    // Platform followers — auth metadata is array; influencer record is Record<string,number>
    const infPfRecord = inf?.platformFollowers;
    const infPfArray: { platformId: string; followers: string }[] | null =
      infPfRecord && typeof infPfRecord === "object" && !Array.isArray(infPfRecord)
        ? Object.entries(infPfRecord as Record<string, number>).map(([k, v]) => ({
            platformId: k.charAt(0).toLowerCase() + k.slice(1),
            followers: formatFollowerCount(v),
          }))
        : null;
    const bestPlatformFollowers =
      (user?.platformFollowers?.some((p) => p.followers) ? user.platformFollowers : null) ||
      infPfArray;
    if (bestPlatformFollowers && bestPlatformFollowers.length > 0) {
      setPlatformFollowers(bestPlatformFollowers);
    }

    // Content specialties
    const bestSpecialties =
      (user?.contentSpecialties?.length  ? user.contentSpecialties : null) ||
      (inf?.contentSpecialties?.length   ? inf.contentSpecialties  : null);
    if (bestSpecialties && bestSpecialties.length > 0) {
      setContentSpecialties(bestSpecialties);
    }

    // Portfolio
    const bestPortfolio =
      (user?.portfolio?.length ? user.portfolio : null) ||
      (inf?.portfolio?.length  ? inf.portfolio  : null);
    if (bestPortfolio && bestPortfolio.length > 0) {
      setPortfolio(bestPortfolio as PortfolioItem[]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Re-runs once per login — repopulates form from the best available source

  const [showAddWork, setShowAddWork] = useState(false);
  const [loadingThumbnails, setLoadingThumbnails] = useState<Set<string>>(new Set());
  const [viewingItem, setViewingItem] = useState<PortfolioItem | null>(null);
  const [newWork, setNewWork] = useState<{
    type: WorkType;
    title: string;
    url: string;
    description: string;
  }>({
    type: "reel",
    title: "",
    url: "",
    description: "",
  });

  /**
   * Auto-extract a thumbnail from the pasted URL.
   * - YouTube → real thumbnail via img.youtube.com
   * - Instagram, TikTok, Twitter, etc. → branded platform placeholder
   * - Unknown → work-type branded gradient (never a stock photo)
   */
  const getThumbnailFromUrl = (url: string, type: WorkType): string => {
    // YouTube: extract video ID for real thumbnail
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    // Social platforms — return branded placeholder key
    if (/instagram\.com/i.test(url)) return "platform:instagram";
    if (/tiktok\.com/i.test(url)) return "platform:tiktok";
    if (/twitter\.com|x\.com/i.test(url)) return "platform:twitter";
    if (/facebook\.com|fb\.com/i.test(url)) return "platform:facebook";
    if (/linkedin\.com/i.test(url)) return "platform:linkedin";
    if (/pinterest\.com/i.test(url)) return "platform:pinterest";
    if (/snapchat\.com/i.test(url)) return "platform:snapchat";
    if (/twitch\.tv/i.test(url)) return "platform:twitch";
    // Generic fallback — show a work-type branded gradient, never a stock photo
    return `platform:${type}`;
  };

  /** Config for platform-branded placeholder cards */
  const PLATFORM_STYLES: Record<string, { gradient: string; icon: React.ElementType; label: string }> = {
    instagram: { gradient: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)", icon: Instagram, label: "Instagram" },
    tiktok:    { gradient: "linear-gradient(135deg, #010101 0%, #1a1a2e 60%, #fe2c55 100%)", icon: Music,     label: "TikTok" },
    twitter:   { gradient: "linear-gradient(135deg, #1DA1F2 0%, #0d8fd9 100%)",              icon: Twitter,   label: "X / Twitter" },
    facebook:  { gradient: "linear-gradient(135deg, #1877F2 0%, #0d5fcb 100%)",              icon: Facebook,  label: "Facebook" },
    linkedin:  { gradient: "linear-gradient(135deg, #0A66C2 0%, #084e96 100%)",              icon: Linkedin,  label: "LinkedIn" },
    pinterest: { gradient: "linear-gradient(135deg, #E60023 0%, #b8001c 100%)",              icon: Hash,      label: "Pinterest" },
    snapchat:  { gradient: "linear-gradient(135deg, #FFFC00 0%, #f0e500 100%)",              icon: MessageCircle, label: "Snapchat" },
    twitch:    { gradient: "linear-gradient(135deg, #9146FF 0%, #6c35cc 100%)",              icon: Tv,        label: "Twitch" },
    // Work-type fallbacks (shown when URL doesn't match any known platform)
    reel:          { gradient: "linear-gradient(135deg, #E4405F 0%, #9b0030 100%)",          icon: Film,      label: "Reel" },
    video:         { gradient: "linear-gradient(135deg, #FF0000 0%, #8b0000 100%)",          icon: Video,     label: "Video" },
    photo:         { gradient: "linear-gradient(135deg, #2F6BFF 0%, #0F3D91 100%)",          icon: Image,     label: "Photo" },
    collaboration: { gradient: "linear-gradient(135deg, #10b981 0%, #065f46 100%)",          icon: Handshake, label: "Collab" },
  };

  /**
   * Async: hit Microlink to extract og:image from any URL.
   * Updates the portfolio item in-place when the real thumb arrives.
   */
  const fetchAndUpdateThumbnail = async (itemId: string, url: string) => {
    setLoadingThumbnails((prev) => new Set(prev).add(itemId));
    try {
      const res = await fetch(
        `https://api.microlink.io/?url=${encodeURIComponent(url)}`
      );
      const data = await res.json();
      if (data.status === "success") {
        const thumb = data.data?.image?.url || data.data?.screenshot?.url;
        if (thumb) {
          setPortfolio((prev) =>
            prev.map((p) => (p.id === itemId ? { ...p, thumbnail: thumb } : p))
          );
        }
      }
    } catch {
      // keep branded gradient as fallback
    } finally {
      setLoadingThumbnails((prev) => {
        const s = new Set(prev);
        s.delete(itemId);
        return s;
      });
    }
  };

  const addPortfolioItem = () => {
    if (!newWork.title.trim()) {
      toast.error("Please add a title for your work.");
      return;
    }
    if (!newWork.url.trim()) {
      toast.error("Please paste the link to your work.");
      return;
    }
    // Auto-prepend https:// if the user forgot the protocol
    const finalUrl = /^https?:\/\//i.test(newWork.url.trim())
      ? newWork.url.trim()
      : `https://${newWork.url.trim()}`;

    // Validate: must be a real URL with a proper domain
    try {
      const parsed = new URL(finalUrl);
      if (!parsed.hostname.includes(".")) throw new Error("no domain");
    } catch {
      toast.error("Invalid URL", {
        description: "Please paste a valid link (e.g. https://instagram.com/reel/...).",
      });
      return;
    }

    const itemId = `w${Date.now()}`;
    const initialThumb = getThumbnailFromUrl(finalUrl, newWork.type);

    const item: PortfolioItem = {
      id: itemId,
      type: newWork.type,
      title: newWork.title.trim(),
      url: finalUrl,
      description: newWork.description.trim(),
      thumbnail: initialThumb,
    };
    setPortfolio((prev) => [...prev, item]);
    setNewWork({ type: "reel", title: "", url: "", description: "" });
    setShowAddWork(false);
    toast.success("Work added! Fetching thumbnail…");

    // For non-YouTube links, fetch the real thumbnail async via Microlink
    if (!initialThumb.startsWith("https://img.youtube.com")) {
      fetchAndUpdateThumbnail(itemId, finalUrl);
    }
  };

  const removePortfolioItem = (id: string) => {
    setPortfolio((prev) => prev.filter((p) => p.id !== id));
    toast.success("Work removed from portfolio.");
  };

  /**
   * Returns an embeddable iframe src for a social URL, or null if not embeddable.
   */
  const getEmbedUrl = (url: string): string | null => {
    // YouTube
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;

    // Instagram reel or post
    const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    if (igMatch) return `https://www.instagram.com/p/${igMatch[1]}/embed/`;

    // TikTok
    const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    if (ttMatch) return `https://www.tiktok.com/embed/v2/${ttMatch[1]}`;

    // Facebook post / reel / video
    if (/facebook\.com/i.test(url))
      return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500`;

    return null;
  };

  const isYouTube = (url: string) =>
    /youtube\.com|youtu\.be/i.test(url);
  const isPortrait = (url: string) =>
    /instagram\.com|tiktok\.com/i.test(url);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!formData.ratePerPost?.trim()) {
      toast.error("Rate for Collabs Starting is required", {
        description: "Please enter your starting rate before saving.",
      });
      return;
    }

    // Require at least one social media link with a URL
    const filledSocialLinks = socialLinks.filter((l) => l.url?.trim());
    if (filledSocialLinks.length === 0) {
      toast.error("Social media link required", {
        description: "Please add at least one social media link to complete your profile.",
      });
      return;
    }

    // Require followers count for every filled social link
    const missingFollowers = filledSocialLinks.filter(
      (l) => !getPlatformFollowers(l.platformId)?.trim()
    );
    if (missingFollowers.length > 0) {
      toast.error("Followers count required", {
        description: "Please enter the follower count for every social media link you've added.",
      });
      return;
    }

    // Require at least one portfolio/work item
    if (portfolio.length === 0) {
      toast.error("Work/Portfolio required", {
        description: "Please add at least one work item (reel, video, photo, or collaboration) to showcase your content.",
      });
      return;
    }

    // Require at least one content specialty
    if (contentSpecialties.length === 0) {
      toast.error("Content Specialties required", {
        description: "Please select at least one content specialty so brands know what you create.",
      });
      return;
    }

    updateProfile({
      name: formData.name,
      bio: formData.bio,
      category: formData.category,
      location: formData.location,
      phone: formData.phone,
      followers: String(formData.followers),
      ratePerPost: formData.ratePerPost,
      currency: formData.currency,
      socialLinks: socialLinks,
      platformFollowers: platformFollowers,
      portfolio: portfolio,
      contentSpecialties: contentSpecialties,
    });

    // Sync profile to the influencers list so it appears in Discover, Favorites, etc.
    if (user?.id) {
      const allInfluencers = getInfluencers();
      const emailLower = user.email?.toLowerCase() || "";
      const match = allInfluencers.find(
        (inf) => inf.id === user.id || (emailLower && inf.email?.toLowerCase() === emailLower)
      );

      // Convert platformFollowers from array format to Record<string, number> for Influencer type
      const platformFollowersRecord: Record<string, number> = {};
      platformFollowers.forEach((pf: any) => {
        if (pf.platformId && pf.followers) {
          const key = pf.platformId.charAt(0).toUpperCase() + pf.platformId.slice(1);
          platformFollowersRecord[key] = parseFollowerShorthand(String(pf.followers));
        }
      });

      // Convert platformIds to display names (e.g. "instagram" → "Instagram")
      const platformNames = socialLinks
        .filter((l: any) => l.url?.trim())
        .map((l: any) => l.platformId.charAt(0).toUpperCase() + l.platformId.slice(1))
        .filter(Boolean);

      const influencerUpdates: Partial<Influencer> = {
        name: formData.name,
        bio: formData.bio,
        category: formData.category,
        location: formData.location,
        followers: parseFollowerShorthand(String(formData.followers)),
        ratePerPost: parseFloat(formData.ratePerPost) || 0,
        currency: formData.currency,
        phone: formData.phone,
        platformFollowers: platformFollowersRecord,
        platforms: platformNames,
        socialLinks: socialLinks.filter((l: any) => l.url?.trim()),
        portfolio: portfolio,
        contentSpecialties: contentSpecialties,
        ...(user.profilePicture ? { photo: user.profilePicture } : {}),
        ...(user.username ? { username: user.username } : {}),
      };

      const isNewProfile = !match;
      if (match) {
        // Update existing influencer with all fields
        updateInfluencer(match.id, influencerUpdates);
      } else {
        // New influencer — add them to the list so they appear in Discover
        const newInfluencer: Influencer = {
          id: user.id,
          name: formData.name,
          photo: user.profilePicture || "",
          bio: formData.bio || "",
          category: formData.category || "Lifestyle",
          location: formData.location || "India",
          followers: parseFollowerShorthand(String(formData.followers)),
          ratePerPost: parseFloat(formData.ratePerPost) || 0,
          gender: user.gender || "Other",
          platforms: platformNames,
          platformFollowers: platformFollowersRecord,
          socialLinks: socialLinks.filter((l: any) => l.url?.trim()),
          portfolio: portfolio,
          contentSpecialties: contentSpecialties,
          email: user.email || "",
          phone: formData.phone || "",
          status: "pending",
          currency: formData.currency || "INR",
          username: user.username || "",
          createdAt: new Date().toISOString(),
          badges: [],
        };
        addInfluencer(newInfluencer);
      }

      if (isNewProfile) {
        // Send profile completion email to the new influencer
        sendEmail({
          to: user.email || "",
          toName: formData.name || user.name || "Influencer",
          templateId: "influencer_profile_complete",
          variables: {
            name: formData.name || user.name || "Influencer",
            profileUrl: `${window.location.origin}/influencer/profile`,
          },
        }).catch(() => {
          // Email failure is non-blocking — profile save succeeds regardless
        });

        setSaved(true);
        toast.success("You're now live on FLUBN!", {
          description: "Your profile is visible to brands on the Discover page. Start receiving collaboration requests!",
          duration: 6000,
        });
        setTimeout(() => setSaved(false), 2000);
        return;
      }
    }

    setSaved(true);
    toast.success("Profile updated successfully!", {
      description: "Your changes are now live.",
    });
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large", { description: "Please upload an image smaller than 5MB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageToCrop(result);
        setShowCropModal(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    try {
      const croppedImage = await createCroppedImage(imageToCrop, croppedAreaPixels);
      
      // Check if cropped image size is reasonable (should be smaller after crop)
      const sizeInBytes = Math.round((croppedImage.length * 3) / 4);
      if (sizeInBytes > 1 * 1024 * 1024) {
        toast.error("Cropped image too large", { 
          description: "Please zoom in more or select a smaller area." 
        });
        return;
      }

      updateProfile({ profilePicture: croppedImage });
      setShowCropModal(false);
      setImageToCrop(null);
      toast.success("Profile picture updated successfully!");
    } catch (error) {
      console.error("Crop error:", error);
      toast.error("Failed to crop image", { description: "Please try again." });
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  // Trust badges — derived from user's actual influencer record
  const activeBadges = myInfluencerRecord?.status === "active"
    ? mergeInfluencerBadges(myInfluencerRecord)
        .map(badgeId => TRUST_BADGES.find(b => b.id === badgeId && b.status === "active"))
        .filter(Boolean) as typeof TRUST_BADGES
    : [];

  const badgeIconMap: Record<string, any> = {
    BadgeCheck, Star, Zap, Award, TrendingUp, Sparkles, Heart,
  };

  return (
    <div className="space-y-6">
      {/* ── Welcome Modal for New Influencers ── */}
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Gradient Header */}
              <div className="relative bg-gradient-to-br from-[#2F6BFF] via-[#1e4fd6] to-[#6366f1] px-6 pt-8 pb-10 text-center overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-10 -left-10 w-44 h-44 bg-white/15 rounded-full blur-2xl" />
                  <div className="absolute top-1/2 -right-8 w-36 h-36 bg-[#a78bfa]/20 rounded-full blur-2xl" />
                  <div className="absolute -bottom-12 left-1/3 w-52 h-28 bg-[#38bdf8]/15 rounded-full blur-3xl" />
                  <div className="absolute top-4 right-1/4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12)_0%,transparent_60%)]" />
                </div>
                <button
                  onClick={() => setShowWelcomeModal(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
                >
                  <X size={16} />
                </button>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: "spring", damping: 12 }}
                  className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4"
                >
                  <Sparkles size={32} className="text-white" />
                </motion.div>
                <h2 className="text-xl font-bold text-white mb-1">Welcome to FLUBN! 🎉</h2>
                <p className="text-white/80 text-sm">Your account has been created successfully</p>
              </div>

              {/* Body */}
              <div className="px-6 py-6">
                <h3 className="text-[#1a1a2e] font-semibold text-base mb-3">Complete your profile to go live</h3>
                <p className="text-[#64748b] text-sm mb-5">
                  Fill in the details below to make your profile visible to brands on the Discover page. Once completed, brands can find you and send collaboration requests.
                </p>

                <div className="space-y-3 mb-6">
                  {[
                    { label: "Add your total followers count", icon: TrendingUp, done: !!user?.followers },
                    { label: "Set your rate per collaboration", icon: BadgeDollarSign, done: !!user?.ratePerPost },
                    { label: "Link your social media accounts", icon: Globe, done: !!(user?.socialLinks && user.socialLinks.some((s: any) => s.url?.trim())) },
                    { label: "Add your best work to portfolio", icon: Film, done: !!(user?.portfolio && user.portfolio.length > 0) },
                    { label: "Pick your content specialties", icon: Hash, done: !!(user?.contentSpecialties && user.contentSpecialties.length > 0) },
                  ].map((item, idx) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + idx * 0.08 }}
                      className="flex items-center gap-3"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        item.done
                          ? "bg-[#10b981]/10 text-[#10b981]"
                          : "bg-[#f1f5f9] text-[#94a3b8]"
                      }`}>
                        {item.done ? <Check size={14} /> : <item.icon size={14} />}
                      </div>
                      <span className={`text-sm ${item.done ? "text-[#10b981] line-through" : "text-[#1a1a2e]"}`}>
                        {item.label}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowWelcomeModal(false)}
                  className="w-full py-3 bg-gradient-to-r from-[#2F6BFF] to-[#6366f1] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all text-sm"
                >
                  Let's Complete My Profile
                </motion.button>
                <p className="text-center text-[11px] text-[#94a3b8] mt-3">
                  Your profile won't appear on the website until you save it with all required fields.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Image Crop Modal ── */}
      <AnimatePresence>
        {showCropModal && imageToCrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Crop Profile Picture</h2>
                <button
                  onClick={handleCropCancel}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Crop Area */}
              <div className="relative w-full h-96 bg-[#f8f9fc]">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* Controls */}
              <div className="px-6 py-5 space-y-4 border-t border-[#e2e8f0]">
                {/* Zoom Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-[#64748b] font-medium flex items-center gap-2">
                      <ZoomIn size={16} />
                      Zoom
                    </label>
                    <span className="text-sm text-[#94a3b8]">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#e2e8f0] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2F6BFF] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#2F6BFF] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                  />
                </div>

                <p className="text-xs text-[#94a3b8]">
                  💡 Drag the image to reposition, use the slider to zoom in/out
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCropCancel}
                    className="flex-1 px-4 py-3 bg-[#f1f5f9] text-[#64748b] font-medium rounded-xl hover:bg-[#e2e8f0] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCropSave}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2F6BFF] to-[#6366f1] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                  >
                    Save & Apply
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-2xl text-[#1a1a2e]">My Profile</h1>
        <p className="text-[#64748b] text-sm mt-1">Manage your influencer profile and social links.</p>
      </div>

      {/* Profile Photo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <h2 className="text-lg text-[#1a1a2e] mb-4">Profile Photo</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-24 h-24 rounded-2xl object-cover object-center"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#0F3D91] to-[#2F6BFF] flex items-center justify-center text-white text-2xl font-semibold">
                {(user?.name || formData.name || "?")[0]?.toUpperCase()}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleProfilePictureChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#2F6BFF] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#0F3D91] transition-colors"
            >
              <Camera size={14} />
            </button>
          </div>
          <div>
            <p className="text-[#1a1a2e]">{formData.name}</p>
            <p className="text-sm text-[#64748b]">{formData.category} Creator</p>
            <p className="text-xs text-[#94a3b8] mt-1">Click the camera icon to upload & crop a new photo (max 5MB)</p>
          </div>
        </div>
      </motion.div>

      {/* Basic Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <h2 className="text-lg text-[#1a1a2e] mb-4">Basic Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            />
          </div>
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Email Address</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-4 py-3 bg-[#f1f3f5] border border-[#e2e8f0] rounded-xl text-[#64748b] cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Category</label>
            <select
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            >
              {CATEGORIES.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            />
          </div>
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Location</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] z-10" />
              <select
                value={locationMode === "custom" ? "Other" : formData.location}
                onChange={(e) => handleLocationSelect(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] appearance-none"
              >
                <option value="">Select your city</option>
                {LOCATION_GROUPS.map((group) => (
                  <optgroup key={group.region} label={group.region}>
                    {group.cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </optgroup>
                ))}
                <option value="Other">Other</option>
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
            </div>
            {locationMode === "custom" && (
              <input
                type="text"
                value={customLocation}
                onChange={(e) => handleCustomLocationChange(e.target.value)}
                placeholder="Enter your city, country"
                className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] mt-2"
              />
            )}
          </div>
{/* Followers Count removed - total reach is auto-calculated from social media links */}
        </div>
        <div className="mt-4">
          <label className="text-sm text-[#64748b] mb-1.5 block">Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] resize-none"
          />
        </div>
      </motion.div>

      {/* Rate & Currency */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#fdf4ff] flex items-center justify-center">
            <BadgeDollarSign size={18} className="text-[#ec4899]" />
          </div>
          <div>
            <h2 className="text-lg text-[#1a1a2e]">Rate &amp; Currency</h2>
            <p className="text-sm text-[#64748b]">Set your rate for collabs starting at, shown publicly on your profile</p>
          </div>
        </div>

        {/* Current selection banner */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#fdf4ff] border border-[#f0abfc] rounded-xl mb-5">
          <span className="text-xl">{getCurrency(formData.currency).symbol}</span>
          <div>
            <p className="text-sm text-[#1a1a2e]">
              <span className="text-[#ec4899]">{getCurrency(formData.currency).code}</span>
              {" - "}{getCurrency(formData.currency).name}
            </p>
            {formData.ratePerPost && (
              <p className="text-xs text-[#94a3b8]">
                Current rate: {getCurrency(formData.currency).symbol}
                {parseFloat(formData.ratePerPost.replace(/,/g, "") || "0").toLocaleString(getCurrency(formData.currency).locale)} / Collabs Starting At
              </p>
            )}
          </div>
        </div>

        {/* Currency pill grid */}
        <div className="mb-5">
          <p className="text-xs text-[#64748b] mb-2">Select currency</p>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((cur) => (
              <button
                key={cur.code}
                type="button"
                onClick={() => handleChange("currency", cur.code)}
                title={cur.name}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${
                  formData.currency === cur.code
                    ? "bg-[#ec4899] border-[#ec4899] text-white shadow-md shadow-[#ec4899]/25"
                    : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#ec4899] hover:text-[#ec4899]"
                }`}
              >
                <span className="text-sm leading-none">{cur.symbol}</span>
                <span>{cur.code}</span>
                {formData.currency === cur.code && <Check size={11} />}
              </button>
            ))}
          </div>
        </div>

        {/* Rate input */}
        <div>
          <label className="text-sm text-[#64748b] mb-1.5 block">
            Collabs Starting At
            <span className="ml-1 text-[#ec4899]">({getCurrency(formData.currency).symbol} {getCurrency(formData.currency).code})</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm select-none">
              {getCurrency(formData.currency).symbol}
            </span>
            <input
              type="text"
              inputMode="numeric"
              required
              value={formData.ratePerPost}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  handleChange("ratePerPost", val);
                }
              }}
              placeholder={`Enter amount in ${getCurrency(formData.currency).name}`}
              className={`w-full pl-8 pr-4 py-3 bg-[#f8f9fc] border rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#ec4899]/20 focus:border-[#ec4899] ${
                !formData.ratePerPost?.trim() ? "border-red-400" : "border-[#e2e8f0]"
              }`}
            />
          </div>
          <p className="text-xs text-[#94a3b8] mt-2">
            Saved when you click <span className="text-[#2F6BFF]">Save Changes</span> below updates your public profile instantly.
          </p>
        </div>
      </motion.div>

      {/* Social Media */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
              <LinkIcon size={18} className="text-[#2F6BFF]" />
            </div>
            <div>
              <h2 className="text-lg text-[#1a1a2e]">Social Media Links</h2>
              <p className="text-sm text-[#64748b]">Connect your social profiles to boost visibility</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#EBF2FF] text-[#2F6BFF] text-xs">
            {socialLinks.filter(l => l.url?.trim() && getPlatformFollowers(l.platformId)?.trim()).length} connected
          </span>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {socialLinks.map((link, index) => {
              const platform = getPlatform(link.platformId);
              return (
                <motion.div
                  key={`${link.platformId}-${index}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="group/row"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-shadow duration-300 group-hover/row:shadow-md"
                      style={{ backgroundColor: `${platform.color}15` }}
                    >
                      <platform.icon size={18} style={{ color: platform.color }} />
                    </div>
                    <div className="flex-1 grid sm:grid-cols-[1fr_180px] gap-3">
                      <div className="relative">
                        <span className="absolute left-4 top-1 text-[10px] uppercase tracking-wider text-[#94a3b8]">
                          {platform.label}
                        </span>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => updateSocialUrl(index, e.target.value)}
                          placeholder={platform.placeholder}
                          className="w-full pl-4 pr-4 pt-5 pb-2 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-sm placeholder:text-[#c5cad3] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-colors"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1 text-[10px] uppercase tracking-wider text-[#94a3b8]">
                          Followers
                        </span>
                        <input
                          type="text"
                          value={getPlatformFollowers(link.platformId)}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            if (val === "" || /^[0-9]*\.?[0-9]*[KMB]?$/.test(val)) {
                              updatePlatformFollowers(link.platformId, val);
                            }
                          }}
                          placeholder="e.g. 125K, 1.5M"
                          maxLength={10}
                          className="w-full pl-4 pr-4 pt-5 pb-2 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-sm placeholder:text-[#c5cad3] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-colors"
                        />
                        {getPlatformFollowers(link.platformId) && parseFollowerShorthand(getPlatformFollowers(link.platformId)) > 0 && (
                          <p className="text-[10px] text-[#94a3b8] mt-0.5 pl-1">= {parseFollowerShorthand(getPlatformFollowers(link.platformId)).toLocaleString("en-IN")}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeSocialLink(index)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all opacity-0 group-hover/row:opacity-100"
                      title="Remove link"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add Link Button + Dropdown */}
          <div className="relative pt-1">
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="w-full px-4 py-3 border border-dashed border-[#d0d7e3] rounded-xl text-[#64748b] hover:border-[#2F6BFF] hover:text-[#2F6BFF] hover:bg-[#EBF2FF]/30 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} />
              Add social link
              <ChevronDown size={14} className={`transition-transform ${showAddDropdown ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showAddDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-2 left-0 w-full bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-20 max-h-[280px] overflow-y-auto"
                >
                  <div className="p-2 grid sm:grid-cols-2 gap-1">
                    {availablePlatforms.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => addSocialLink(platform.id)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f8f9fc] transition-colors text-left"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${platform.color}15` }}
                        >
                          <platform.icon size={15} style={{ color: platform.color }} />
                        </div>
                        <span className="text-sm text-[#1a1a2e]">{platform.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Content Specialties */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center shrink-0">
            <Hash size={18} className="text-[#2F6BFF]" />
          </div>
          <div>
            <h2 className="text-lg text-[#1a1a2e]">Content Specialties <span className="text-[#ec4899] text-sm">*</span></h2>
            <p className="text-sm text-[#64748b]">Select all types of content you create shown on your public profile</p>
          </div>
        </div>

        {/* Predefined options */}
        <div className="flex flex-wrap gap-2">
          {SPECIALTY_OPTIONS.map((tag) => {
            const active = contentSpecialties.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleSpecialty(tag)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  active
                    ? "bg-[#2F6BFF] border-[#2F6BFF] text-white shadow-sm shadow-[#2F6BFF]/25"
                    : "bg-[#f8f9fc] border-[#e2e8f0] text-[#64748b] hover:border-[#2F6BFF]/40 hover:text-[#2F6BFF]"
                }`}
              >
                {active && <Check size={11} className="inline mr-1 -mt-0.5" />}
                {tag}
              </button>
            );
          })}
        </div>

        {/* Custom tags */}
        {contentSpecialties.filter((s) => !SPECIALTY_OPTIONS.includes(s)).length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#f1f5f9]">
            <p className="text-xs text-[#94a3b8] mb-2 flex items-center gap-1.5">
              <Sparkles size={11} className="text-[#2F6BFF]" />
              Your custom specialties
            </p>
            <div className="flex flex-wrap gap-2">
              {contentSpecialties
                .filter((s) => !SPECIALTY_OPTIONS.includes(s))
                .map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-[#2F6BFF] border border-[#2F6BFF] text-white shadow-sm shadow-[#2F6BFF]/25"
                  >
                    <Check size={11} className="-mt-0.5" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleSpecialty(tag)}
                      className="ml-0.5 hover:text-white/70 transition-colors"
                      title="Remove"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Add custom specialty input */}
        <div className="mt-4 pt-4 border-t border-[#f1f5f9]">
          <p className="text-xs text-[#94a3b8] mb-2">Don't see yours? Add a custom specialty:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customSpecialtyInput}
              onChange={(e) => { const v = e.target.value; setCustomSpecialtyInput(v.charAt(0).toUpperCase() + v.slice(1)); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addCustomSpecialty(); }
              }}
              placeholder="e.g. Sustainable Living, Pet Care…"
              maxLength={40}
              className="flex-1 px-3 py-2 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-colors"
            />
            <button
              type="button"
              onClick={addCustomSpecialty}
              disabled={!customSpecialtyInput.trim()}
              className="px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#2F6BFF] text-white hover:bg-[#0F3D91] shadow-sm shadow-[#2F6BFF]/20"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
          {customSpecialtyInput.trim().length > 0 && (
            <p className="text-[11px] text-[#94a3b8] mt-1.5">{40 - customSpecialtyInput.trim().length} characters remaining · Press Enter or click Add</p>
          )}
        </div>

        {contentSpecialties.length === 0 && (
          <p className="text-xs text-[#ec4899] mt-3">Please select at least one specialty.</p>
        )}
        {contentSpecialties.length > 0 && (
          <p className="text-xs text-[#94a3b8] mt-3">
            {contentSpecialties.length} selected
            {contentSpecialties.filter((s) => !SPECIALTY_OPTIONS.includes(s)).length > 0 && (
              <span className="ml-1 text-[#2F6BFF]">
                ({contentSpecialties.filter((s) => !SPECIALTY_OPTIONS.includes(s)).length} custom)
              </span>
            )}
          </p>
        )}
      </motion.div>

      {/* Portfolio / Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
              <Film size={18} className="text-[#2F6BFF]" />
            </div>
            <div>
              <h2 className="text-lg text-[#1a1a2e]">Portfolio / Works</h2>
              <p className="text-sm text-[#64748b]">Showcase your best reels, videos, photos & collaborations</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {portfolio.length === 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-[#f1f5f9] text-[#94a3b8] text-xs border border-[#e2e8f0]">
                0 Works
              </span>
            ) : (
              <>
                <span className="px-2.5 py-1 rounded-full bg-[#1a1a2e] text-white text-xs">
                  {portfolio.length} Work{portfolio.length > 1 ? "s" : ""}
                </span>
                {WORK_TYPES
                  .map((wt) => ({ ...wt, count: portfolio.filter((p) => p.type === wt.id).length }))
                  .filter((wt) => wt.count > 0)
                  .map((wt) => (
                    <span
                      key={wt.id}
                      className="px-2 py-0.5 rounded-full text-[10px] text-white flex items-center gap-1"
                      style={{ backgroundColor: wt.color }}
                    >
                      <wt.icon size={9} />
                      {wt.count} {wt.label}{wt.count > 1 ? "s" : ""}
                    </span>
                  ))}
              </>
            )}
          </div>
        </div>

        {/* Existing works grid — Instagram portrait style */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
          <AnimatePresence mode="popLayout">
            {portfolio.map((item) => {
              const workType = WORK_TYPES.find((w) => w.id === item.type)!;
              const WorkIcon = workType.icon;
              const playable = item.type === "reel" || item.type === "video";
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="group/card relative rounded-xl overflow-hidden"
                >
                  <div
                    className="relative overflow-hidden rounded-xl cursor-pointer"
                    style={{ aspectRatio: "4/5", backgroundColor: `${workType.color}22` }}
                    onClick={() => setViewingItem(item)}
                  >
                    {/* Platform-branded placeholder OR real image */}
                    {item.thumbnail.startsWith("platform:") ? (() => {
                      const pKey = item.thumbnail.replace("platform:", "");
                      const ps = PLATFORM_STYLES[pKey];
                      const PIcon = ps?.icon || LinkIcon;
                      return (
                        <div
                          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                          style={{ background: ps?.gradient || `linear-gradient(135deg, ${workType.color}88, ${workType.color}44)` }}
                        >
                          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
                            <PIcon size={28} className="text-white drop-shadow" />
                          </div>
                          <span className="text-white/80 text-[11px] tracking-wide">{ps?.label ?? "Link"}</span>
                        </div>
                      );
                    })() : (
                      <ImageWithFallback
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover object-center group-hover/card:scale-105 transition-transform duration-500"
                      />
                    )}
                    {/* Hover darken overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/30 transition-all duration-300 pointer-events-none" />
                    {/* Shimmer while thumbnail is being fetched */}
                    {loadingThumbnails.has(item.id) && (
                      <div className="absolute inset-0 z-25 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      </div>
                    )}
                    {/* Bottom gradient for text */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Play button opens in-platform viewer */}
                    {playable && (
                      <div
                        className="absolute inset-0 flex items-center justify-center z-10"
                        onClick={(e) => { e.stopPropagation(); setViewingItem(item); }}
                      >
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/25 group-hover/card:scale-110 group-hover/card:bg-white/30 transition-all duration-300 shadow-lg">
                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-white ml-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Type badge */}
                    <span
                      className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider text-white flex items-center gap-1 backdrop-blur-sm z-20"
                      style={{ backgroundColor: `${workType.color}cc` }}
                    >
                      <WorkIcon size={10} />
                      {workType.label}
                    </span>
                    {/* Delete button */}
                    <button
                      onClick={() => removePortfolioItem(item.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/40 backdrop-blur-sm text-white/80 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover/card:opacity-100 z-30"
                    >
                      <Trash2 size={12} />
                    </button>
                    {/* External link */}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-white hover:text-[#1a1a2e] flex items-center justify-center transition-all z-30 shadow-md opacity-0 group-hover/card:opacity-100"
                      title="Open link"
                    >
                      <ExternalLink size={11} />
                    </a>
                    {/* Bottom text overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
                      <p className="text-white text-xs drop-shadow-md line-clamp-2">{item.title}</p>
                      {item.description && (
                        <p className="text-white/50 text-[10px] mt-0.5 truncate">{item.description}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Add Work Form */}
        <AnimatePresence>
          {showAddWork && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-4 bg-[#f8f9fc] rounded-xl border border-[#e2e8f0] p-4 space-y-3"
            >
              <p className="text-sm text-[#1a1a2e]">Add new work</p>
              {/* Type selector */}
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">What type of work is this?</label>
                <div className="flex flex-wrap gap-2">
                  {WORK_TYPES.map((wt) => {
                    const WtIcon = wt.icon;
                    return (
                      <button
                        key={wt.id}
                        onClick={() => setNewWork({ ...newWork, type: wt.id })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
                          newWork.type === wt.id
                            ? "text-white border-transparent shadow-sm"
                            : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2F6BFF]/30"
                        }`}
                        style={newWork.type === wt.id ? { backgroundColor: wt.color } : {}}
                      >
                        <WtIcon size={13} />
                        {wt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1 block">Title *</label>
                <input
                  type="text"
                  value={newWork.title}
                  onChange={(e) => setNewWork({ ...newWork, title: e.target.value })}
                  placeholder={
                    newWork.type === "reel" ? "e.g. Summer Fashion Lookbook"
                    : newWork.type === "video" ? "e.g. StyleCraft Product Review"
                    : newWork.type === "photo" ? "e.g. Behind the Scenes Photoshoot"
                    : "e.g. GlowUp Skincare x Priya"
                  }
                  className="w-full px-3 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm text-[#1a1a2e] placeholder:text-[#c5cad3] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                />
                <p className="text-[10px] text-[#94a3b8] mt-1">Give your work a short, catchy name</p>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1 block">Paste Link *</label>
                {/* type="text" prevents browser URL validation from blocking input */}
                <input
                  type="text"
                  value={newWork.url}
                  onChange={(e) => setNewWork({ ...newWork, url: e.target.value })}
                  onPaste={(e) => {
                    e.preventDefault();
                    const raw = e.clipboardData.getData("text").trim();
                    const cleaned = raw.replace(/\s+/g, "");
                    if (!cleaned) return;
                    const fixed = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
                    try {
                      const parsed = new URL(fixed);
                      if (!parsed.hostname.includes(".")) throw new Error("no domain");
                      setNewWork({ ...newWork, url: fixed });
                    } catch {
                      toast.error("Invalid URL", {
                        description: "Please paste a valid link (e.g. https://instagram.com/reel/...).",
                      });
                    }
                  }}
                  placeholder={
                    newWork.type === "reel" ? "https://instagram.com/reel/ABC123..."
                    : newWork.type === "video" ? "https://youtube.com/watch?v=..."
                    : newWork.type === "photo" ? "https://instagram.com/p/ABC123..."
                    : "https://instagram.com/p/... or any link"
                  }
                  className="w-full px-3 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm text-[#1a1a2e] placeholder:text-[#c5cad3] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                />
                <p className="text-[10px] text-[#94a3b8] mt-1">
                  {newWork.type === "reel"
                    ? "Open your reel on Instagram/TikTok, tap Share → Copy Link, and paste here"
                    : newWork.type === "video"
                    ? "Open your video on YouTube/Instagram, copy the URL from the address bar or share menu"
                    : newWork.type === "photo"
                    ? "Open your photo post, tap Share → Copy Link, and paste here"
                    : "Copy the post or campaign link and paste here"}
                </p>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1 block">Description (optional)</label>
                <input
                  type="text"
                  value={newWork.description}
                  onChange={(e) => setNewWork({ ...newWork, description: e.target.value })}
                  placeholder="e.g. Trending summer outfits styled for everyday wear"
                  className="w-full px-3 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm text-[#1a1a2e] placeholder:text-[#c5cad3] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                />
                <p className="text-[10px] text-[#94a3b8] mt-1">A brief line about what this work is about</p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowAddWork(false);
                    setNewWork({ type: "reel", title: "", url: "", description: "" });
                  }}
                  className="px-4 py-2 rounded-lg text-sm text-[#64748b] hover:bg-[#e2e8f0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addPortfolioItem}
                  className="px-4 py-2 rounded-lg text-sm text-white bg-[#2F6BFF] hover:bg-[#0F3D91] transition-colors flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Add Work
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showAddWork && (
          <button
            onClick={() => setShowAddWork(true)}
            className="w-full px-4 py-3 border border-dashed border-[#d0d7e3] rounded-xl text-[#64748b] hover:border-[#2F6BFF] hover:text-[#2F6BFF] hover:bg-[#EBF2FF]/30 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={16} />
            Add work to portfolio
          </button>
        )}
      </motion.div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all ${
            saved
              ? "bg-[#10b981] text-white"
              : "bg-[#2F6BFF] text-white hover:bg-[#0F3D91] shadow-lg shadow-[#2F6BFF]/25"
          }`}
        >
          <Save size={16} />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════
          In-Platform Content Viewer Modal
      ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {viewingItem && (() => {
          const embedUrl = getEmbedUrl(viewingItem.url);
          const portrait  = isPortrait(viewingItem.url);
          const youtube   = isYouTube(viewingItem.url);
          const workType  = WORK_TYPES.find((w) => w.id === viewingItem.type)!;
          return (
            <motion.div
              key="viewer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[300] flex items-center justify-center p-4"
              style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
              onClick={() => setViewingItem(null)}
            >
              <motion.div
                key="viewer-panel"
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex flex-col rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  width:    youtube ? "min(720px, 95vw)" : portrait ? "min(400px, 95vw)" : "min(560px, 95vw)",
                  maxHeight: "92vh",
                  background: "#0f0f1a",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${workType.color}33` }}
                  >
                    <workType.icon size={14} style={{ color: workType.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{viewingItem.title}</p>
                    {viewingItem.description && (
                      <p className="text-white/40 text-[11px] truncate">{viewingItem.description}</p>
                    )}
                  </div>
                  <a
                    href={viewingItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all shrink-0"
                    title="Open on platform"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={13} />
                  </a>
                  <button
                    onClick={() => setViewingItem(null)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-hidden min-h-0">
                  {embedUrl ? (
                    <div
                      className="w-full"
                      style={youtube
                        ? { paddingBottom: "56.25%", position: "relative", height: 0 }
                        : { height: portrait ? "580px" : "480px" }}
                    >
                      <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        style={!youtube ? { position: "static", width: "100%", height: "100%" } : undefined}
                      />
                    </div>
                  ) : (
                    /* Non-embeddable: show thumbnail + open-on-platform CTA */
                    <div className="flex flex-col items-center justify-center gap-5 p-8 text-center" style={{ minHeight: 320 }}>
                      {viewingItem.thumbnail.startsWith("platform:") ? (() => {
                        const pKey = viewingItem.thumbnail.replace("platform:", "");
                        const ps = PLATFORM_STYLES[pKey];
                        const PIcon = ps?.icon || LinkIcon;
                        return (
                          <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center"
                            style={{ background: ps?.gradient || "#1e293b" }}
                          >
                            <PIcon size={36} className="text-white" />
                          </div>
                        );
                      })() : (
                        <img
                          src={viewingItem.thumbnail}
                          alt={viewingItem.title}
                          className="max-h-48 rounded-xl object-cover shadow-lg"
                        />
                      )}
                      <div>
                        <p className="text-white/60 text-sm mb-4">
                          This content can't be embedded directly — open it on the platform to view.
                        </p>
                        <a
                          href={viewingItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white transition-all"
                          style={{ background: workType.color }}
                        >
                          <ExternalLink size={14} />
                          Open on Platform
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}