import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, MapPin, Users, DollarSign, IndianRupee, Banknote, Eye, Send, X, CheckCircle, Filter, SlidersHorizontal, ChevronDown, Instagram, Youtube, Twitter, Facebook, ArrowUpDown, Heart, Check, ArrowRight,
  BadgeCheck, Star, Zap, Award, TrendingUp, Sparkles,
  CheckSquare, Square, Layers, Save, FileText, Trash2, ChevronRight, ChevronLeft, Lightbulb, Crown, Calendar, Clock, MessageCircle,
  Linkedin, Music2, Globe,
} from "lucide-react";
import { getInfluencers, type Influencer } from "../../utils/dataManager";
import { CATEGORIES, LOCATIONS, PLATFORMS, PRICE_RANGES, FOLLOWER_RANGES, GENDERS, TRUST_BADGES } from "../../data/mock-data";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { toast } from "sonner";
import { useCollaboration } from "../../context/CollaborationContext";
import { useAuth } from "../../context/AuthContext";
import { mergeInfluencerBadges } from "../../utils/badgeEngine";
import { isInfluencerVerified } from "../../utils/influencerVerification";
import { AlertCircle } from "lucide-react";
import * as apiClient from "../../utils/api";
import { DatePicker } from "../../components/DatePicker";
import {
  canSendCollabRequest, remainingCollabRequests, getMonthlyCollabCount, incrementCollabCount,
  getPlanLimits, formatLimit,
} from "../../utils/planLimits";
import { Lock, ArrowRight as ArrowRightIcon } from "lucide-react";
import {
  getTemplates, saveTemplate, deleteTemplate, canSaveTemplate, getTemplateLimit,
  remainingTemplateSlots, type CampaignTemplate,
} from "../../utils/campaignTemplates";
import {
  getRecommendations, buildBrandProfile, hasSuggestionsAccess, type ScoredInfluencer,
} from "../../utils/recommendations";
import { Pagination } from "../../components/Pagination";

const badgeIconMap: Record<string, any> = {
  BadgeCheck, Star, Zap, Award, TrendingUp, Sparkles, Heart,
};

export default function BrandDiscover() {
  const { addRequest, hasPendingRequestTo } = useCollaboration();
  const { user } = useAuth();
  const [influencers, setInfluencers] = useState(getInfluencers());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [selectedPlatform, setSelectedPlatform] = useState("All Platforms");
  const [selectedPriceRange, setSelectedPriceRange] = useState("Any Budget");
  const [selectedFollowerRange, setSelectedFollowerRange] = useState("Any Followers");
  const [selectedGender, setSelectedGender] = useState("All Genders");
  const [sortBy, setSortBy] = useState<"name" | "followers" | "rate">("followers");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('brand-saved-influencers');
    return saved ? JSON.parse(saved) : [];
  });

  const [formData, setFormData] = useState({
    campaignName: "",
    budget: "",
    deliverables: "",
    timeline: "",
    message: "",
  });

  const [timelineStart, setTimelineStart] = useState("");
  const [timelineEnd, setTimelineEnd] = useState("");
  const [dupWarning, setDupWarning] = useState(false);
  const [validationError, setValidationError] = useState(false);

  // ── Bulk Actions state ───────────────────────────────────────────────────
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkSent, setBulkSent] = useState(false);

  // ── Campaign Templates state ─────────────────────────────────────────────
  const [templates, setTemplates] = useState<CampaignTemplate[]>(getTemplates());
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [showSaveTemplateInput, setShowSaveTemplateInput] = useState(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(null);

  // ── Suggested Influencers ────────────────────────────────────────────────
  const [showSuggestions, setShowSuggestions] = useState(true);

  // ── Auto-scroll refs ──────────────────────────────────────────────────────
  const dupWarningRef = useRef<HTMLDivElement>(null);
  const validationErrorRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const timelineSectionRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLDivElement>(null);
  const endDateRef = useRef<HTMLDivElement>(null);
  const bulkValidationErrorRef = useRef<HTMLDivElement>(null);
  const bulkSubmitButtonRef = useRef<HTMLButtonElement>(null);
  const bulkFormRef = useRef<HTMLFormElement>(null);
  const bulkTimelineSectionRef = useRef<HTMLDivElement>(null);
  const bulkStartDateRef = useRef<HTMLDivElement>(null);
  const bulkEndDateRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (validationError) {
      // Scroll form to the bottom in whichever modal is open
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollTo({ top: formRef.current.scrollHeight, behavior: "smooth" });
        } else if (bulkFormRef.current) {
          bulkFormRef.current.scrollTo({ top: bulkFormRef.current.scrollHeight, behavior: "smooth" });
        }
      }, 100);
    }
  }, [validationError]);

  // Listen for influencers updates
  useEffect(() => {
    const handleInfluencersUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setInfluencers(customEvent.detail || getInfluencers());
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setInfluencers(getInfluencers());
      }
    };

    window.addEventListener("influencersUpdated", handleInfluencersUpdate);
    document.addEventListener("visibilitychange", handleVisibility);
    setInfluencers(getInfluencers());
    
    return () => {
      window.removeEventListener("influencersUpdated", handleInfluencersUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const formatFollowers = (val: number | string | undefined) => {
    const num = typeof val === "string" ? parseInt(val) || 0 : (val || 0);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "instagram":  return <Instagram size={13} />;
      case "youtube":    return <Youtube size={13} />;
      case "twitter":
      case "x":          return <Twitter size={13} />;
      case "facebook":   return <Facebook size={13} />;
      case "linkedin":   return <Linkedin size={13} />;
      case "tiktok":     return <Music2 size={13} />;
      default:           return <Globe size={13} />;
    }
  };

  // Filter helper functions
  const matchPriceRange = (price: number, range: string) => {
    if (range === "Any Budget") return true;
    if (range === "Under ₹10,000") return price < 10000;
    if (range === "₹10,000 - ₹15,000") return price >= 10000 && price <= 15000;
    if (range === "₹15,000 - ₹20,000") return price >= 15000 && price <= 20000;
    if (range === "₹20,000+") return price >= 20000;
    return true;
  };

  const matchFollowerRange = (followers: number, range: string) => {
    if (range === "Any Followers") return true;
    if (range === "10K - 50K") return followers >= 10000 && followers <= 50000;
    if (range === "50K - 100K") return followers >= 50000 && followers <= 100000;
    if (range === "100K - 200K") return followers >= 100000 && followers <= 200000;
    if (range === "200K - 500K") return followers >= 200000 && followers <= 500000;
    if (range === "500K+") return followers >= 500000;
    return true;
  };

  const planLimits = getPlanLimits();

  // ── Bulk mode lock — disables all non-bulk interactions ────────────────
  const isBulkMode = bulkSelectedIds.size > 0 && planLimits.bulkActions;

  // ── Suggested Influencers (memoized) ───────────────────────────────────
  const suggestions = useMemo(() => {
    if (!hasSuggestionsAccess()) return [];
    const brandProfile = buildBrandProfile();
    return getRecommendations(influencers, brandProfile, 6);
  }, [influencers, planLimits.planName]);

  const filtered = influencers.filter((inf) => {
    // Only show active influencers (exclude suspended)
    if (inf.status === "suspended") return false;
    const matchSearch = (inf.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inf.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === "All" || inf.category === selectedCategory;
    const matchLocation = selectedLocation === "All Locations" || inf.location === selectedLocation;
    const matchPlatform = selectedPlatform === "All Platforms" || (inf.platforms || []).includes(selectedPlatform);
    const matchPrice = matchPriceRange(inf.ratePerPost, selectedPriceRange);
    const matchFollower = matchFollowerRange(inf.followers, selectedFollowerRange);
    const matchGender = selectedGender === "All Genders" || inf.gender === selectedGender;
    return matchSearch && matchCategory && matchLocation && matchPlatform && matchPrice && matchFollower && matchGender;
  }).sort((a, b) => {
    if (sortBy === "followers") return b.followers - a.followers;
    if (sortBy === "rate") return a.ratePerPost - b.ratePerPost;
    return a.name.localeCompare(b.name);
  });

  const [currentPage, setCurrentPage] = useState(1);
  const GRID_PER_PAGE = 12;
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedCategory, selectedLocation, selectedPlatform, selectedPriceRange, selectedFollowerRange, selectedGender, sortBy]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / GRID_PER_PAGE));
  const pagedInfluencers = filtered.slice((currentPage - 1) * GRID_PER_PAGE, currentPage * GRID_PER_PAGE);

  const handleSendRequest = (inf: Influencer) => {
    // Check collab request limit
    if (!canSendCollabRequest()) {
      toast.error("Monthly Collaboration Limit Reached", {
        description: `You've used all ${getPlanLimits().collabRequestsPerMonth} requests for this month on the ${getPlanLimits().planName} plan. Upgrade for more.`,
      });
      return;
    }
    setSelectedInfluencer(inf);
    setShowModal(true);
    setRequestSent(false);
    setDupWarning(false);
    setValidationError(false);
    // Preserve pre-loaded template data; only reset if form is empty
    const hasTemplateData = formData.campaignName || formData.budget || formData.deliverables || formData.message;
    if (!hasTemplateData) {
      setFormData({ campaignName: "", budget: "", deliverables: "", timeline: "", message: "" });
      setTimelineStart("");
      setTimelineEnd("");
    }
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInfluencer) return;

    // Validate form data - check if any required field is empty
    const isCampaignNameEmpty = !formData.campaignName.trim();
    const isBudgetEmpty = !formData.budget || formData.budget === "" || formData.budget === "0";
    const isDeliverablesEmpty = !formData.deliverables.trim();
    const isTimelineStartEmpty = !timelineStart.trim();
    const isTimelineEndEmpty = !timelineEnd.trim();
    const isMessageEmpty = !formData.message.trim();

    if (isCampaignNameEmpty || isBudgetEmpty || isDeliverablesEmpty || isTimelineStartEmpty || isTimelineEndEmpty || isMessageEmpty) {
      setValidationError(true);
      toast.error("Please fill in all fields", {
        description: "All fields including both start and end dates are required.",
      });
      return;
    }

    // Warn if brand already has a PENDING request to this influencer
    if (hasPendingRequestTo(selectedInfluencer.id, user?.id ?? "") && !dupWarning) {
      setDupWarning(true);
      toast.warning("Duplicate Request Warning", {
        description: "You already have a pending request to this influencer. Click 'Send Request' again to confirm.",
      });
      return; // first submit shows warning — second submit confirms and sends anyway
    }

    const brandName = user?.companyName || user?.name || "Anonymous Brand";
    const brandLogo = brandName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    addRequest({
      brandName,
      brandLogo,
      brandPhoto: user?.profilePicture,
      brandId: user?.id,
      campaignName: formData.campaignName,
      budget: parseInt(String(formData.budget).replace(/,/g, "")) || 0,
      timeline: formData.timeline,
      deliverables: formData.deliverables || "",
      message: formData.message || "",
      influencerId: selectedInfluencer.id,
      influencerName: selectedInfluencer.name,
      influencerPhoto: selectedInfluencer.photo,
      brandContactEmail: user?.brandContactEmail || user?.email,
      brandContactPhone: user?.phone,
    });
    incrementCollabCount();
    setRequestSent(true);
    setDupWarning(false);
    setValidationError(false);
    toast.success(`Request sent to ${selectedInfluencer.name}!`, {
      description: "You'll be notified when they respond.",
    });
    setTimeout(() => {
      setShowModal(false);
      setRequestSent(false);
      setFormData({ campaignName: "", budget: "", deliverables: "", timeline: "", message: "" });
      setTimelineStart("");
      setTimelineEnd("");
    }, 2000);
  };

  const handleSaveInfluencer = (id: string) => {
    const influencer = influencers.find(inf => inf.id === id);
    let newSavedIds: string[];
    if (savedIds.includes(id)) {
      newSavedIds = savedIds.filter((savedId) => savedId !== id);
      setSavedIds(newSavedIds);
      localStorage.setItem('brand-saved-influencers', JSON.stringify(newSavedIds));
      toast.success('Removed from favorites', {
        description: influencer?.name,
      });
    } else {
      newSavedIds = [...savedIds, id];
      setSavedIds(newSavedIds);
      localStorage.setItem('brand-saved-influencers', JSON.stringify(newSavedIds));
      toast.success('Added to favorites', {
        description: influencer?.name,
      });
    }
    // Sync to backend
    try {
      const userId = JSON.parse(localStorage.getItem("flubn_user") || "{}").id;
      if (userId) apiClient.saveFavorites(userId, newSavedIds).catch(() => {});
    } catch { /* ignore */ }
  };

  // ── Bulk Actions handlers ────────────────────────────────────────────────
  const toggleBulkSelect = (id: string) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearBulkSelection = () => setBulkSelectedIds(new Set());

  const handleBulkSend = (e: React.FormEvent) => {
    e.preventDefault();
    const isCampaignNameEmpty = !formData.campaignName.trim();
    const isBudgetEmpty = !formData.budget || formData.budget === "" || formData.budget === "0";
    const isDeliverablesEmpty = !formData.deliverables.trim();
    const isTimelineStartEmpty = !timelineStart.trim();
    const isTimelineEndEmpty = !timelineEnd.trim();
    const isMessageEmpty = !formData.message.trim();
    if (isCampaignNameEmpty || isBudgetEmpty || isDeliverablesEmpty || isTimelineStartEmpty || isTimelineEndEmpty || isMessageEmpty) {
      setValidationError(true);
      toast.error("Please fill in all fields");
      return;
    }
    setBulkSending(true);
    const brandName = user?.companyName || user?.name || "Anonymous Brand";
    const brandLogo = brandName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    let sentCount = 0;
    bulkSelectedIds.forEach((infId) => {
      const inf = influencers.find((i) => i.id === infId);
      if (!inf) return;
      if (!canSendCollabRequest()) return;
      addRequest({
        brandName,
        brandLogo,
        brandPhoto: user?.profilePicture,
        brandId: user?.id,
        campaignName: formData.campaignName,
        budget: parseInt(String(formData.budget).replace(/,/g, "")) || 0,
        timeline: formData.timeline,
        deliverables: formData.deliverables || "",
        message: formData.message || "",
        influencerId: inf.id,
        influencerName: inf.name,
        influencerPhoto: inf.photo,
        brandContactEmail: user?.brandContactEmail || user?.email,
        brandContactPhone: user?.phone,
      });
      incrementCollabCount();
      sentCount++;
    });
    setBulkSending(false);
    setBulkSent(true);
    toast.success(`${sentCount} collaboration request${sentCount !== 1 ? "s" : ""} sent!`);
    setTimeout(() => {
      setShowBulkModal(false);
      setBulkSent(false);
      clearBulkSelection();
      setFormData({ campaignName: "", budget: "", deliverables: "", timeline: "", message: "" });
      setTimelineStart("");
      setTimelineEnd("");
    }, 2000);
  };

  // ── Template handlers ────────────────────────────────────────────────────
  const loadTemplate = (tpl: CampaignTemplate) => {
    const start = tpl.timelineStart || "";
    const end = tpl.timelineEnd || "";
    setFormData({
      campaignName: tpl.campaignName,
      budget: tpl.budget,
      deliverables: tpl.deliverables,
      timeline: tpl.timeline || (start && end ? `${start} to ${end}` : ""),
      message: tpl.message,
    });
    setTimelineStart(start);
    setTimelineEnd(end);
    setShowTemplateDropdown(false);
    setActiveTemplateName(tpl.name);
    toast.success(`Template "${tpl.name}" loaded`);
  };

  const handleSaveAsTemplate = () => {
    if (!saveTemplateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    // Check for duplicate template name
    const existingTemplates = getTemplates();
    if (existingTemplates.some((t: CampaignTemplate) => t.name.toLowerCase() === saveTemplateName.trim().toLowerCase())) {
      toast.error("Template name already exists", {
        description: "Please choose a different name for your template.",
      });
      return;
    }
    const result = saveTemplate({
      name: saveTemplateName.trim(),
      campaignName: formData.campaignName,
      budget: formData.budget,
      deliverables: formData.deliverables,
      message: formData.message,
      timeline: formData.timeline,
      timelineStart,
      timelineEnd,
    });
    if (result) {
      setTemplates(getTemplates());
      setShowSaveTemplateInput(false);
      setSaveTemplateName("");
      toast.success(`Template "${result.name}" saved!`);
    } else {
      toast.error("Template limit reached", {
        description: `Your ${planLimits.planName} plan allows ${formatLimit(getTemplateLimit())} templates.`,
      });
    }
  };

  const handleDeleteTemplate = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (tpl && activeTemplateName === tpl.name) {
      setActiveTemplateName(null);
    }
    deleteTemplate(id);
    setTemplates(getTemplates());
    toast.success("Template deleted");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Discover Influencers</h1>
        <p className="text-[#64748b] text-sm mt-1">Find and connect with verified creators.</p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or category..."
              disabled={isBulkMode}
              className={`w-full pl-11 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] ${isBulkMode ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          </div>
          <button
            onClick={() => !isBulkMode && setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl border flex items-center gap-2 transition-colors ${
              isBulkMode ? "opacity-50 cursor-not-allowed bg-white text-[#64748b] border-[#e2e8f0]" : showFilters ? "bg-[#2F6BFF] text-white border-[#2F6BFF]" : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2F6BFF]/30"
            }`}
          >
            <SlidersHorizontal size={18} />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Plan usage indicators */}
        <div className="flex flex-wrap gap-2">
          {planLimits.collabRequestsPerMonth !== -1 && (
            <div className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
              !canSendCollabRequest()
                ? "bg-[#fef2f2] border-[#fecaca] text-[#ef4444]"
                : remainingCollabRequests() <= 3
                ? "bg-[#fffbeb] border-[#fde68a] text-[#f59e0b]"
                : "bg-[#f8f9fc] border-[#e2e8f0] text-[#64748b]"
            }`}>
              <Send size={12} />
              {canSendCollabRequest() ? `${remainingCollabRequests()} collabs left this month` : "Collab limit reached"}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />

              {/* Modal Panel */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
                  <div className="flex items-center gap-2 text-[#1a1a2e]">
                    <SlidersHorizontal size={18} className="text-[#2F6BFF]" />
                    <span>Filter Influencers</span>
                  </div>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#1a1a2e] hover:bg-[#f1f5f9] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Filter Grid */}
                <div className="p-6 grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Location</label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                    >
                      {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Platform</label>
                    <select
                      value={selectedPlatform}
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                    >
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  {/* Advanced Filters — locked for Free plan */}
                  {planLimits.planName === "Free" ? (
                    <div className="sm:col-span-3 relative">
                      <div className="grid sm:grid-cols-3 gap-4 opacity-40 pointer-events-none select-none">
                        <div>
                          <label className="text-sm text-[#64748b] mb-1.5 block">Price Range</label>
                          <select disabled className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#94a3b8]">
                            <option>Any Budget</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm text-[#64748b] mb-1.5 block">Follower Range</label>
                          <select disabled className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#94a3b8]">
                            <option>Any Followers</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm text-[#64748b] mb-1.5 block">Gender</label>
                          <select disabled className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#94a3b8]">
                            <option>All Genders</option>
                          </select>
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/95 backdrop-blur-sm border border-[#e2e8f0] rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-md">
                          <Lock size={14} className="text-[#94a3b8]" />
                          <span className="text-sm text-[#64748b]">Advanced filters require</span>
                          <Link
                            to="/brand/subscription"
                            className="text-sm text-[#2F6BFF] hover:underline flex items-center gap-1"
                            onClick={() => setShowFilters(false)}
                          >
                            Basic+ plan <ArrowRightIcon size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm text-[#64748b] mb-1.5 block">Price Range</label>
                        <select
                          value={selectedPriceRange}
                          onChange={(e) => setSelectedPriceRange(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                        >
                          {PRICE_RANGES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-[#64748b] mb-1.5 block">Follower Range</label>
                        <select
                          value={selectedFollowerRange}
                          onChange={(e) => setSelectedFollowerRange(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                        >
                          {FOLLOWER_RANGES.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-[#64748b] mb-1.5 block">Gender</label>
                        <select
                          value={selectedGender}
                          onChange={(e) => setSelectedGender(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                        >
                          {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[#e2e8f0] bg-[#f8f9fc]">
                  <button
                    onClick={() => {
                      setSelectedCategory("All");
                      setSelectedLocation("All Locations");
                      setSelectedPlatform("All Platforms");
                      setSelectedPriceRange("Any Budget");
                      setSelectedFollowerRange("Any Followers");
                      setSelectedGender("All Genders");
                    }}
                    className="text-sm text-[#94a3b8] hover:text-[#1a1a2e] transition-colors"
                  >
                    Reset all
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="px-5 py-2.5 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#2558e8] transition-colors text-sm"
                  >
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Suggested Influencers Section ───────────────────────────────────── */}
      {!hasSuggestionsAccess() ? (
        <div className="relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-gradient-to-r from-[#f8f9fc] to-[#EBF2FF]/50">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3 opacity-50">
              <Lightbulb size={18} className="text-[#f59e0b]" />
              <span className="text-sm font-medium text-[#1a1a2e]">Suggested For You</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 opacity-30">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-[#e2e8f0] rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-sm border border-[#e2e8f0] rounded-xl px-5 py-3 flex items-center gap-2.5 shadow-lg">
              <Crown size={16} className="text-[#f59e0b]" />
              <span className="text-sm text-[#64748b]">Smart suggestions require</span>
              <Link to="/brand/subscription" className="text-sm text-[#2F6BFF] hover:underline flex items-center gap-1 font-medium">
                Pro+ plan <ArrowRightIcon size={12} />
              </Link>
            </div>
          </div>
        </div>
      ) : suggestions.length > 0 && showSuggestions ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-r from-[#f8f9fc] via-white to-[#EBF2FF]/30 overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center">
                <Lightbulb size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium text-[#1a1a2e]">Suggested For You</span>
              <span className="text-[10px] text-[#94a3b8]">Based on your profile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const container = document.getElementById('suggestions-scroll');
                    if (container) container.scrollBy({ left: -240, behavior: 'smooth' });
                  }}
                  className="w-7 h-7 rounded-full border border-[#e2e8f0] bg-white hover:bg-[#f8f9fc] flex items-center justify-center text-[#64748b] hover:text-[#1a1a2e] transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => {
                    const container = document.getElementById('suggestions-scroll');
                    if (container) container.scrollBy({ left: 240, behavior: 'smooth' });
                  }}
                  className="w-7 h-7 rounded-full border border-[#e2e8f0] bg-white hover:bg-[#f8f9fc] flex items-center justify-center text-[#64748b] hover:text-[#1a1a2e] transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <button onClick={() => !isBulkMode && setShowSuggestions(false)} className={`text-xs text-[#94a3b8] hover:text-[#64748b] ${isBulkMode ? "opacity-50 cursor-not-allowed" : ""}`}>Hide</button>
            </div>
          </div>
          <div id="suggestions-scroll" className="px-5 pb-4 flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {suggestions.map((s, idx) => (
              <motion.div key={s.influencer.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                className="flex-shrink-0 w-56 bg-white rounded-xl border border-[#e2e8f0] hover:shadow-md transition-shadow"
              >
                <Link
                  to={isBulkMode ? "#" : ((s.influencer as any).username ? `/@${(s.influencer as any).username}` : `/influencer/view/${s.influencer.id}`)}
                  state={{ from: 'brand-dashboard' }}
                  onClick={(e) => { if (isBulkMode) e.preventDefault(); }}
                  className={`block p-3 no-underline ${isBulkMode ? "pointer-events-none opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <ImageWithFallback src={s.influencer.photo} alt={s.influencer.name} className="w-10 h-10 rounded-full object-cover object-center" />
                    <div className="min-w-0">
                      <p className="text-sm text-[#1a1a2e] truncate font-medium">{s.influencer.name}</p>
                      <p className="text-[10px] text-[#94a3b8]">{s.influencer.category} · {formatFollowers(s.influencer.followers)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <div className="h-1 flex-1 bg-[#e2e8f0] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#2F6BFF] to-[#8b5cf6]" style={{ width: `${Math.min(s.score, 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-[#2F6BFF]">{s.score}pt</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.matchReasons.slice(0, 2).map((r, i) => (
                      <span key={i} className="text-[9px] text-[#64748b] bg-[#f8f9fc] px-1.5 py-0.5 rounded">{r}</span>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : !showSuggestions && hasSuggestionsAccess() ? (
        <button onClick={() => !isBulkMode && setShowSuggestions(true)} className={`text-xs text-[#2F6BFF] hover:underline flex items-center gap-1 ${isBulkMode ? "opacity-50 cursor-not-allowed" : ""}`}>
          <Lightbulb size={12} /> Show Suggested Influencers
        </button>
      ) : null}

      {/* ── Results Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64748b]">{filtered.length} influencer{filtered.length !== 1 ? "s" : ""} found</p>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-[#94a3b8]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "followers" | "rate")}
            disabled={isBulkMode}
            className={`text-sm bg-white border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 ${isBulkMode ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <option value="followers">Most Followers</option>
            <option value="rate">Lowest Rate</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* ── My Templates Section ──────────────────────────────────────────── */}
      {planLimits.campaignTemplates !== 0 && templates.length > 0 && (
        <div className={`rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden transition-opacity ${isBulkMode ? "opacity-50 pointer-events-none" : ""}`}>
          <button
            onClick={() => !isBulkMode && setShowTemplatesPanel(!showTemplatesPanel)}
            className={`w-full px-5 py-4 flex items-center justify-between transition-all duration-200 ${isBulkMode ? "cursor-not-allowed" : "hover:bg-gradient-to-r hover:from-[#f8f9fc] hover:to-[#EBF2FF]/40"}`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2F6BFF]/10 to-[#8b5cf6]/10 flex items-center justify-center ring-1 ring-[#2F6BFF]/10">
                <FileText size={16} className="text-[#2F6BFF]" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-[#1a1a2e] tracking-tight">My Templates</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[11px] font-medium ${templates.length >= (getTemplateLimit() === -1 ? Infinity : getTemplateLimit()) ? "text-[#f59e0b]" : "text-[#64748b]"}`}>
                    {templates.length}/{formatLimit(getTemplateLimit())} slots used
                  </span>
                </div>
              </div>
            </div>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${showTemplatesPanel ? "bg-[#2F6BFF]/10 rotate-180" : "bg-[#f1f5f9]"}`}>
              <ChevronDown size={14} className={`transition-colors duration-200 ${showTemplatesPanel ? "text-[#2F6BFF]" : "text-[#94a3b8]"}`} />
            </div>
          </button>

          <AnimatePresence>
            {showTemplatesPanel && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 border-t border-[#f1f5f9]">
                  <div className="pt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.map((tpl, idx) => (
                      <motion.div
                        key={tpl.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`group relative rounded-xl transition-all duration-200 cursor-pointer overflow-hidden ${activeTemplateName === tpl.name ? "border-[#2F6BFF]/40 bg-[#EBF2FF]/30 ring-1 ring-[#2F6BFF]/10" : "border-[#e8ecf2] hover:border-[#2F6BFF]/20 bg-[#fafbfd] hover:bg-white"} border`}
                        onClick={() => {
                          const start = tpl.timelineStart || "";
                          const end = tpl.timelineEnd || "";
                          setFormData({
                            campaignName: tpl.campaignName,
                            budget: tpl.budget,
                            deliverables: tpl.deliverables,
                            timeline: tpl.timeline || (start && end ? `${start} to ${end}` : ""),
                            message: tpl.message,
                          });
                          setTimelineStart(start);
                          setTimelineEnd(end);
                          setShowTemplatesPanel(false);
                          setActiveTemplateName(tpl.name);
                          toast.success(`"${tpl.name}" loaded — now click any influencer to send`, { duration: 3000 });
                        }}
                      >
                        {/* Left accent stripe */}
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-gradient-to-b from-[#2F6BFF] to-[#8b5cf6] transition-opacity duration-200 ${activeTemplateName === tpl.name ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />

                        <div className="p-3 pl-3.5">
                          {/* Header row */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2F6BFF]/10 to-[#8b5cf6]/10 flex items-center justify-center flex-shrink-0">
                              <FileText size={13} className="text-[#2F6BFF]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] font-semibold text-[#1a1a2e] truncate leading-tight">{tpl.name}</p>
                              <p className="text-[10px] text-[#94a3b8] truncate leading-tight mt-0.5">{tpl.campaignName || "Untitled campaign"}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                              className="text-[#d1d5db] hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-all p-1 -m-1 rounded-md hover:bg-[#fef2f2] flex-shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Metadata grid */}
                          <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                            {tpl.budget && (
                              <div className="flex items-center gap-1.5 bg-[#f0fdf4] rounded-md px-2 py-1.5">
                                <Banknote size={12} className="text-[#16a34a] flex-shrink-0" />
                                <span className="text-[10px] text-[#16a34a] font-semibold truncate">₹{tpl.budget}</span>
                              </div>
                            )}
                            {tpl.deliverables && (
                              <div className="flex items-center gap-1.5 bg-[#f8fafc] rounded-md px-2 py-1.5">
                                <MessageCircle size={10} className="text-[#64748b] flex-shrink-0" />
                                <span className="text-[10px] text-[#64748b] font-medium truncate">{tpl.deliverables}</span>
                              </div>
                            )}
                            {(tpl.timelineStart || tpl.timelineEnd) && (
                              <div className={`flex items-center gap-1.5 bg-[#f5f3ff] rounded-md px-2 py-1.5 ${!tpl.budget || !tpl.deliverables ? "" : "col-span-2"}`}>
                                <Calendar size={10} className="text-[#8b5cf6] flex-shrink-0" />
                                <span className="text-[10px] text-[#8b5cf6] font-medium whitespace-nowrap truncate">{tpl.timelineStart}{tpl.timelineEnd ? ` → ${tpl.timelineEnd}` : ""}</span>
                              </div>
                            )}
                          </div>

                          {/* Footer action */}
                          <div className="flex items-center justify-end pt-1 border-t border-[#f1f5f9]">
                            {activeTemplateName === tpl.name ? (
                              <span className="text-[10px] text-[#16a34a] font-semibold flex items-center gap-1 bg-[#f0fdf4] px-2 py-0.5 rounded-full">
                                <Check size={10} /> Active
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#2F6BFF] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                Apply template <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Active Template Indicator ─────────────────────────────────────── */}
      <AnimatePresence>
        {activeTemplateName && !showTemplatesPanel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#EBF2FF] border border-[#2F6BFF]/15 ${isBulkMode ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#2F6BFF] flex items-center justify-center shrink-0">
                <Check size={13} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[#1a1a2e] truncate">
                  Using: <span className="text-[#2F6BFF]">{activeTemplateName}</span>
                </p>
                <p className="text-[10px] text-[#64748b]">Click any influencer card to send this template as a request</p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTemplateName(null);
                setFormData({ campaignName: "", budget: "", deliverables: "", timeline: "", message: "" });
                setTimelineStart("");
                setTimelineEnd("");
                toast("Template cleared", { duration: 2000 });
              }}
              className="text-[11px] text-[#64748b] hover:text-[#ef4444] font-medium px-2.5 py-1 rounded-lg hover:bg-white/60 transition-colors shrink-0 flex items-center gap-1"
            >
              <X size={12} />
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Mode Banner */}
      <AnimatePresence>
        {isBulkMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a1a2e] text-white"
          >
            <div className="w-7 h-7 rounded-lg bg-[#2F6BFF] flex items-center justify-center">
              <Lock size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Bulk Selection Mode Active</p>
              <p className="text-[11px] text-white/60">Select influencers, then send bulk request or clear selection to unlock the page</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-white/10 px-2.5 py-1 rounded-lg">{bulkSelectedIds.size} selected</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Influencer Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {pagedInfluencers.map((inf) => (
          <motion.div
            key={inf.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
              isBulkMode
                ? bulkSelectedIds.has(inf.id)
                  ? "border-[#2F6BFF] ring-2 ring-[#2F6BFF]/20 shadow-lg shadow-[#2F6BFF]/10"
                  : "border-[#e2e8f0] opacity-60"
                : "border-[#e2e8f0] hover:shadow-xl hover:shadow-[#2F6BFF]/8 hover:-translate-y-1"
            }`}
          >
            <div className="relative h-48 overflow-hidden">
              <ImageWithFallback
                src={inf.photo}
                alt={inf.name}
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Save button — top-right overlay */}
              <button
                onClick={() => !isBulkMode && handleSaveInfluencer(inf.id)}
                disabled={isBulkMode}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors ${isBulkMode ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <Heart
                  size={15}
                  className={savedIds.includes(inf.id) ? "text-[#ef4444]" : "text-[#94a3b8]"}
                  fill={savedIds.includes(inf.id) ? "currentColor" : "none"}
                />
              </button>

              {/* Bulk select checkbox — top-left (Pro/Enterprise only) */}
              {planLimits.bulkActions && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleBulkSelect(inf.id); }}
                  className={`absolute top-3 left-3 w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-all ${
                    bulkSelectedIds.has(inf.id)
                      ? "bg-[#2F6BFF] border-[#2F6BFF] text-white"
                      : "bg-white/90 backdrop-blur-sm border border-white/60 text-[#94a3b8] opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {bulkSelectedIds.has(inf.id) ? <Check size={14} /> : <Square size={14} />}
                </button>
              )}

              {/* Trust Badge strip — bottom-left of photo */}
              {inf.status === "active" && (() => {
                const infBadges = mergeInfluencerBadges(inf)
                  .map(id => TRUST_BADGES.find(b => b.id === id && b.status === "active"))
                  .filter(Boolean);
                if (infBadges.length === 0) return null;
                const visible = infBadges.slice(0, 4);
                const remaining = infBadges.length - visible.length;
                return (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    {visible.map((badge, i) => {
                      const BadgeIcon = badgeIconMap[badge!.icon];
                      return (
                        <motion.div
                          key={badge!.id}
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.04 * i, type: "spring", stiffness: 260, damping: 20 }}
                          title={badge!.name}
                          className="relative"
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              background: `radial-gradient(circle at 38% 35%, ${badge!.color}cc, ${badge!.color}88)`,
                              border: `1.5px solid rgba(255,255,255,0.9)`,
                              boxShadow: `0 2px 10px ${badge!.color}70`,
                            }}
                          >
                            {BadgeIcon && <BadgeIcon size={13} style={{ color: "#fff" }} />}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-[1px] shadow-sm">
                            <BadgeCheck size={9} style={{ color: badge!.color, display: "block" }} />
                          </div>
                        </motion.div>
                      );
                    })}
                    {remaining > 0 && (
                      <span className="text-[10px] text-white bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                        +{remaining}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="p-[20px]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-[#1a1a2e] text-lg flex items-center gap-1.5">
                    {inf.name}
                    {isInfluencerVerified(inf.id) && (
                      <span className="relative group/vbadge inline-flex items-center">
                        <BadgeCheck
                          size={16}
                          strokeWidth={2.5}
                          className="text-[#2F6BFF] shrink-0"
                          style={{ filter: "drop-shadow(0 0 3px rgba(47,107,255,0.35))" }}
                        />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#1a1a2e] text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/vbadge:opacity-100 transition-opacity pointer-events-none z-10">
                          Verified by FLUBN
                        </span>
                      </span>
                    )}
                  </h3>
                  <span className="text-[#2F6BFF] bg-[#EBF2FF] px-2.5 py-0.5 rounded-full text-xs mt-1 inline-block">
                    {inf.category}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[#1a1a2e] text-lg">{formatFollowers(
                    inf.followers ||
                    (inf.platformFollowers && !Array.isArray(inf.platformFollowers) && typeof inf.platformFollowers === "object"
                      ? Object.values(inf.platformFollowers).reduce((sum: number, v) => sum + (typeof v === "number" ? v : 0), 0)
                      : 0)
                  )}</div>
                  <div className="text-xs text-[#94a3b8]">total reach</div>
                </div>
              </div>

              {/* Platform Followers Breakdown */}
              {inf.platformFollowers && !Array.isArray(inf.platformFollowers) && typeof inf.platformFollowers === "object" && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {Object.entries(inf.platformFollowers).map(([platform, followers]) => {
                    const platformIcon = getPlatformIcon(platform);
                    return (
                      <div key={platform} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f8f9fc] rounded-lg text-xs">
                        <span className="text-[#64748b]">{platformIcon}</span>
                        <span className="text-[#1a1a2e]">{formatFollowers(typeof followers === "number" ? followers : 0)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-[#64748b] text-sm line-clamp-2 mb-4">{inf.bio}</p>

              <div className="flex items-center gap-3 text-sm text-[#64748b] mb-4">
                <span className="flex items-center gap-1">
                  <MapPin size={14} className="text-[#94a3b8]" />
                  {(inf.location || "").split(",")[0]}
                </span>
                <span className="text-[#e2e8f0]">|</span>
                <span className="flex items-center gap-1">
                  <Users size={14} className="text-[#94a3b8]" />
                  {"\u20b9"}{inf.ratePerPost.toLocaleString()}/Collabs Starting At
                </span>
              </div>

              <div className={`flex gap-2 ${isBulkMode ? "opacity-40 pointer-events-none" : ""}`}>
                <Link
                  to={isBulkMode ? "#" : ((inf as any).username ? `/@${(inf as any).username}` : `/influencer/view/${inf.id}`)}
                  state={{ from: 'brand-dashboard' }}
                  onClick={(e) => { if (isBulkMode) e.preventDefault(); }}
                  className={`flex-1 py-2.5 border border-[#e2e8f0] text-[#64748b] rounded-xl text-sm flex items-center justify-center gap-1.5 hover:bg-[#f8f9fc] transition-all ${isBulkMode ? "cursor-not-allowed" : ""}`}
                >
                  <Eye size={14} /> View
                </Link>
                <button
                  onClick={() => !isBulkMode && handleSendRequest(inf)}
                  disabled={isBulkMode}
                  className={`flex-1 py-2.5 bg-[#2F6BFF] text-white rounded-xl text-sm flex items-center justify-center gap-1.5 hover:bg-[#0F3D91] transition-all shadow-md shadow-[#2F6BFF]/15 group/btn ${isBulkMode ? "cursor-not-allowed" : ""}`}
                >
                  <Send size={14} /> Send Request
                  <ArrowRightIcon size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[#94a3b8]">
          <Search size={40} className="mx-auto mb-4 opacity-50" />
          <p>No influencers found matching your criteria.</p>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={GRID_PER_PAGE} onPageChange={setCurrentPage} label="influencers" tableFooter={false} />

      {/* Send Request Modal */}
      <AnimatePresence>
        {showModal && selectedInfluencer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between">
                <div>
                  <h2 className="text-lg text-[#1a1a2e]">Send Collaboration Request</h2>
                  <p className="text-sm text-[#64748b]">to {selectedInfluencer.name}</p>
                </div>
                <button onClick={() => { setShowModal(false); setRequestSent(false); setFormData({ campaignName: "", budget: "", deliverables: "", timeline: "", message: "" }); setTimelineStart(""); setTimelineEnd(""); setValidationError(false); setShowSaveTemplateInput(false); setSaveTemplateName(""); }} className="text-[#94a3b8] hover:text-[#64748b]">
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
                    Your collaboration request has been sent to {selectedInfluencer.name}. You'll be notified when they respond.
                  </p>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleSubmitRequest} className="p-6 space-y-4 overflow-y-auto max-h-[min(600px,70vh)] flubn-scrollbar">
                  {/* ── Template Load/Save Bar ───────────────────────────── */}
                  {planLimits.campaignTemplates !== 0 ? (
                    <div className="rounded-xl border border-[#e2e8f0] bg-gradient-to-b from-[#f8f9fc] to-white">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f1f5f9] rounded-t-xl">
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
                                  const el = document.getElementById("modal-tpl-scroll");
                                  el?.scrollBy({ left: -180, behavior: "smooth" });
                                }}
                                className="w-5 h-5 rounded-md bg-white border border-[#e2e8f0] flex items-center justify-center text-[#94a3b8] hover:text-[#2F6BFF] hover:border-[#2F6BFF]/40 hover:shadow-sm transition-all"
                              >
                                <ChevronLeft size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById("modal-tpl-scroll");
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
                              disabled={
                                !formData.campaignName.trim() ||
                                !formData.budget ||
                                !formData.timeline?.trim() ||
                                !formData.deliverables.trim() ||
                                !formData.message.trim()
                              }
                              className="text-[11px] text-white bg-[#2F6BFF] hover:bg-[#0F3D91] font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-all px-2.5 py-1 rounded-lg shadow-sm"
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
                              <button
                                type="button"
                                onClick={handleSaveAsTemplate}
                                disabled={!saveTemplateName.trim()}
                                className="w-6 h-6 rounded-lg bg-[#2F6BFF] text-white flex items-center justify-center hover:bg-[#0F3D91] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                              >
                                <Check size={12} />
                              </button>
                              <button type="button" onClick={() => { setShowSaveTemplateInput(false); setSaveTemplateName(""); }} className="w-6 h-6 rounded-lg text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] flex items-center justify-center transition-colors">
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Field completion status row — inline, zero clipping risk ── */}
                      {(() => {
                        const fields = [
                          { label: "Name",         filled: !!formData.campaignName.trim() },
                          { label: "Budget",       filled: !!formData.budget },
                          { label: "Timeline",     filled: !!formData.timeline?.trim() },
                          { label: "Deliverables", filled: !!formData.deliverables.trim() },
                          { label: "Message",      filled: !!formData.message.trim() },
                        ];
                        const allFilled = fields.every((f) => f.filled);
                        return (
                          <div className={`px-3.5 py-2 border-b border-[#f1f5f9] flex items-center gap-1.5 flex-wrap transition-colors ${allFilled ? "bg-[#f0fdf4]" : "bg-white"}`}>
                            {allFilled ? (
                              <span className="flex items-center gap-1.5 text-[9.5px] text-[#16a34a] font-semibold">
                                <Check size={10} className="shrink-0" /> All fields filled — ready to save!
                              </span>
                            ) : (
                              <>
                                <span className="text-[9px] text-[#b0b8c8] mr-0.5 shrink-0 select-none">Required:</span>
                                {fields.map(({ label, filled }) => (
                                  <span
                                    key={label}
                                    className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-medium transition-all ${
                                      filled
                                        ? "text-[#16a34a] bg-[#f0fdf4] border-[#bbf7d0]"
                                        : "text-[#94a3b8] bg-[#f8fafc] border-[#e2e8f0]"
                                    }`}
                                  >
                                    {filled
                                      ? <Check size={7} className="shrink-0" />
                                      : <span className="w-[5px] h-[5px] rounded-full bg-[#cbd5e1] inline-block shrink-0" />
                                    }
                                    {label}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* Template Cards - horizontal scroll */}
                      {templates.length > 0 && (
                        <div className="relative rounded-b-xl overflow-hidden">
                          {/* Left fade */}
                          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent z-[1] pointer-events-none rounded-bl-xl" />
                          {/* Right fade */}
                          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent z-[1] pointer-events-none rounded-br-xl" />
                          <div
                            id="modal-tpl-scroll"
                            className="flex gap-2 overflow-x-auto py-3 px-4 scroll-smooth"
                            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                          >
                            {templates.map((tpl) => (
                              <div
                                key={tpl.id}
                                className="group/tpl flex-shrink-0 w-44 bg-white rounded-xl border border-[#e8ecf1] hover:border-[#2F6BFF]/30 hover:shadow-md transition-all duration-200 relative overflow-hidden"
                              >
                                {/* Top accent bar */}
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
                        <div className="px-4 py-3 flex items-center gap-2.5 rounded-b-xl">
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
                      <Link to="/brand/subscription" className="text-xs text-[#2F6BFF] hover:underline" onClick={() => setShowModal(false)}>Basic+ plan</Link>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Campaign Name</label>
                    <input
                      type="text"
                      value={formData.campaignName}
                      onChange={(e) => {
                        setFormData({ ...formData, campaignName: e.target.value });
                        setValidationError(false);
                      }}
                      placeholder="e.g. Summer Collection Launch"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
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
                          onChange={(e) => {
                            setFormData({ ...formData, budget: e.target.value });
                            setValidationError(false);
                          }}
                          onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                          placeholder="50,000"
                          className="w-full pl-8 pr-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div ref={timelineSectionRef}>
                      <label className="text-sm text-[#64748b] mb-1.5 block">Timeline</label>
                      <div className="space-y-3">
                        {(() => {
                          const today = new Date();
                          const todayStr = today.toISOString().split("T")[0];
                          const maxDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate()).toISOString().split("T")[0];

                          const handleStartChange = (val: string) => {
                            setTimelineStart(val);
                            if (timelineEnd && val > timelineEnd) setTimelineEnd("");
                            const label = val
                              ? `${formatDateLabel(val)}${timelineEnd && val <= timelineEnd ? " – " + formatDateLabel(timelineEnd) : ""}`
                              : "";
                            setFormData({ ...formData, timeline: label });
                            setValidationError(false);
                          };

                          const handleEndChange = (val: string) => {
                            setTimelineEnd(val);
                            const label = val
                              ? `${timelineStart ? formatDateLabel(timelineStart) + " – " : ""}${formatDateLabel(val)}`
                              : "";
                            setFormData({ ...formData, timeline: label });
                            setValidationError(false);
                          };

                          const handleStartDateOpen = (isOpen: boolean) => {
                            if (isOpen && startDateRef.current) {
                              setTimeout(() => {
                                startDateRef.current?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
                              }, 50);
                            }
                          };

                          const handleEndDateOpen = (isOpen: boolean) => {
                            if (isOpen && endDateRef.current) {
                              setTimeout(() => {
                                endDateRef.current?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
                              }, 50);
                            }
                          };

                          return (
                            <>
                              <div ref={startDateRef}>
                                <DatePicker
                                  label="Start Date"
                                  value={timelineStart}
                                  onChange={handleStartChange}
                                  onOpenChange={handleStartDateOpen}
                                  minDate={todayStr}
                                  maxDate={maxDate}
                                  placeholder="Pick start date"
                                />
                              </div>
                              <div ref={endDateRef}>
                                <DatePicker
                                  label="End Date"
                                  value={timelineEnd}
                                  onChange={handleEndChange}
                                  onOpenChange={handleEndDateOpen}
                                  minDate={timelineStart || todayStr}
                                  maxDate={maxDate}
                                  placeholder="Pick end date"
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Deliverables</label>
                    <input
                      type="text"
                      value={formData.deliverables}
                      onChange={(e) => {
                        setFormData({ ...formData, deliverables: e.target.value });
                        setValidationError(false);
                      }}
                      placeholder="e.g. 3 Instagram Reels, 2 Stories"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Message</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => {
                        setFormData({ ...formData, message: e.target.value });
                        setValidationError(false);
                      }}
                      placeholder="Tell the influencer about your campaign..."
                      rows={3}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] resize-none"
                    />
                  </div>
                  {dupWarning && (
                    <div ref={dupWarningRef} className="flex items-start gap-3 p-3.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl">
                      <AlertCircle size={16} className="text-[#f59e0b] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-[#92400e]">You already have a pending request to this influencer.</p>
                        <p className="text-xs text-[#78350f] mt-0.5">Click "Send Request" again to confirm sending another request for a different project.</p>
                      </div>
                    </div>
                  )}
                  {validationError && (
                    <div ref={validationErrorRef} className="flex items-start gap-3 p-3.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl">
                      <AlertCircle size={16} className="text-[#f59e0b] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-[#92400e]">Please fill in all fields.</p>
                      </div>
                    </div>
                  )}
                  <button
                    ref={submitButtonRef}
                    type="submit"
                    className="w-full py-3 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#2F6BFF]/25"
                  >
                    <Send size={16} />
                    Send Request
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Bulk Action Bar ─────────────────────────────────────── */}
      <AnimatePresence>
        {bulkSelectedIds.size > 0 && planLimits.bulkActions && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1a1a2e] text-white rounded-2xl shadow-2xl shadow-black/30 px-6 py-3 flex items-center gap-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#2F6BFF] flex items-center justify-center text-sm font-bold">{bulkSelectedIds.size}</div>
              <span className="text-sm">selected</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <button
              onClick={() => {
                setShowBulkModal(true);
                setBulkSent(false);
                setValidationError(false);
                setFormData({ campaignName: "", budget: "", deliverables: "", timeline: "", message: "" });
                setTimelineStart("");
                setTimelineEnd("");
              }}
              className="px-4 py-2 bg-[#2F6BFF] rounded-xl text-sm flex items-center gap-1.5 hover:bg-[#2558e8] transition-colors"
            >
              <Send size={14} /> Send Bulk Request
            </button>
            <button onClick={clearBulkSelection} className="text-white/60 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk Send Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              ref={bulkFormRef}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[#e2e8f0]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg text-[#1a1a2e]">Bulk Collaboration Request</h2>
                    <p className="text-sm text-[#64748b]">Sending to {bulkSelectedIds.size} influencer{bulkSelectedIds.size !== 1 ? "s" : ""}</p>
                  </div>
                  <button onClick={() => { setShowBulkModal(false); setBulkSent(false); setFormData({ campaignName: "", budget: "", deliverables: "", timeline: "", message: "" }); setTimelineStart(""); setTimelineEnd(""); setValidationError(false); setShowSaveTemplateInput(false); setSaveTemplateName(""); }} className="text-[#94a3b8] hover:text-[#64748b]"><X size={20} /></button>
                </div>
                {/* Selected avatars */}
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  {Array.from(bulkSelectedIds).slice(0, 8).map((id) => {
                    const inf = influencers.find((i) => i.id === id);
                    return inf ? (
                      <div key={id} className="relative group/avatar">
                        <ImageWithFallback src={inf.photo} alt={inf.name} className="w-8 h-8 rounded-full object-cover object-center border-2 border-white shadow-sm" />
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-[#64748b] whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity bg-white px-1 rounded shadow-sm">{inf.name.split(" ")[0]}</span>
                      </div>
                    ) : null;
                  })}
                  {bulkSelectedIds.size > 8 && <span className="text-xs text-[#94a3b8] ml-1">+{bulkSelectedIds.size - 8} more</span>}
                </div>
              </div>
              {bulkSent ? (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#ecfdf5] flex items-center justify-center mx-auto mb-4">
                    <Layers size={24} className="text-[#10b981]" />
                  </div>
                  <h3 className="text-lg text-[#1a1a2e]">Requests Sent!</h3>
                  <p className="text-sm text-[#64748b] mt-2">{bulkSelectedIds.size} collaboration requests have been sent.</p>
                </div>
              ) : (
                <form onSubmit={handleBulkSend} className="p-6 space-y-4">
                  {/* Template bar for bulk too */}
                  {planLimits.campaignTemplates !== 0 && templates.length > 0 && (
                    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8f9fc] overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <FileText size={14} className="text-[#2F6BFF]" />
                        <span className="text-xs font-medium text-[#1a1a2e]">Load a template</span>
                      </div>
                      <div className="px-3 pb-3">
                        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                          {templates.map((tpl) => (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => loadTemplate(tpl)}
                              className="flex-shrink-0 w-44 bg-white rounded-lg border border-[#e2e8f0] hover:border-[#2F6BFF]/30 hover:shadow-sm transition-all p-2.5 text-left"
                            >
                              <p className="text-[11px] font-medium text-[#1a1a2e] truncate mb-1">{tpl.name}</p>
                              <p className="text-[10px] text-[#94a3b8] truncate mb-1.5">{tpl.campaignName || "No campaign name"}</p>
                              <div className="flex items-center gap-1 flex-wrap">
                                {tpl.budget && (
                                  <span className="text-[9px] text-[#16a34a] bg-[#f0fdf4] border border-[#bbf7d0]/50 px-1.5 py-px rounded font-medium">₹{tpl.budget}</span>
                                )}
                                {tpl.deliverables && (
                                  <span className="text-[9px] text-[#64748b] bg-[#f8f9fc] border border-[#e2e8f0] px-1.5 py-px rounded truncate max-w-[70px]">{tpl.deliverables}</span>
                                )}
                                {(tpl.timelineStart || tpl.timelineEnd) && (
                                  <span className="text-[9px] text-[#8b5cf6] bg-[#f5f3ff] border border-[#ddd6fe]/50 px-1.5 py-px rounded truncate max-w-[70px]">{tpl.timelineStart}{tpl.timelineEnd ? ` → ${tpl.timelineEnd}` : ""}</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Campaign Name</label>
                    <input type="text" value={formData.campaignName} onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })} placeholder="e.g. Summer Collection Launch" className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20" />
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Budget</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b] text-sm">₹</span>
                      <input type="number" min="0" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} onKeyDown={(e) => ["e","E","+","-","."].includes(e.key) && e.preventDefault()} placeholder="50,000" className="w-full pl-8 pr-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Timeline</label>
                    <div className="space-y-3">
                      {(() => {
                        const today = new Date();
                        const todayStr = today.toISOString().split("T")[0];
                        const maxDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate()).toISOString().split("T")[0];

                        const handleBulkStartDateOpen = (isOpen: boolean) => {
                          if (isOpen && bulkStartDateRef.current) {
                            setTimeout(() => {
                              bulkStartDateRef.current?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
                            }, 50);
                          }
                        };

                        const handleBulkEndDateOpen = (isOpen: boolean) => {
                          if (isOpen && bulkEndDateRef.current) {
                            setTimeout(() => {
                              bulkEndDateRef.current?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
                            }, 50);
                          }
                        };

                        return (
                          <>
                            <div ref={bulkStartDateRef}>
                              <DatePicker label="Start Date" value={timelineStart} onChange={(val) => { setTimelineStart(val); if (timelineEnd && val > timelineEnd) setTimelineEnd(""); setFormData({ ...formData, timeline: val ? `${formatDateLabel(val)}${timelineEnd && val <= timelineEnd ? " – " + formatDateLabel(timelineEnd) : ""}` : "" }); }} onOpenChange={handleBulkStartDateOpen} minDate={todayStr} maxDate={maxDate} placeholder="Pick start date" />
                            </div>
                            <div ref={bulkEndDateRef}>
                              <DatePicker label="End Date" value={timelineEnd} onChange={(val) => { setTimelineEnd(val); setFormData({ ...formData, timeline: val ? `${timelineStart ? formatDateLabel(timelineStart) + " – " : ""}${formatDateLabel(val)}` : "" }); }} onOpenChange={handleBulkEndDateOpen} minDate={timelineStart || todayStr} maxDate={maxDate} placeholder="Pick end date" />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Deliverables</label>
                    <input type="text" value={formData.deliverables} onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })} placeholder="e.g. 3 Instagram Reels, 2 Stories" className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20" />
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Message</label>
                    <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Tell the influencers about your campaign..." rows={3} className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 resize-none" />
                  </div>
                  {validationError && (
                    <div ref={bulkValidationErrorRef} className="flex items-start gap-3 p-3.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl">
                      <AlertCircle size={16} className="text-[#f59e0b] shrink-0 mt-0.5" />
                      <p className="text-sm text-[#92400e]">Please fill in all fields.</p>
                    </div>
                  )}
                  <button ref={bulkSubmitButtonRef} type="submit" disabled={bulkSending} className="w-full py-3 bg-gradient-to-r from-[#2F6BFF] to-[#8b5cf6] text-white rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-[#2F6BFF]/25">
                    <Layers size={16} />
                    Send to {bulkSelectedIds.size} Influencer{bulkSelectedIds.size !== 1 ? "s" : ""}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}