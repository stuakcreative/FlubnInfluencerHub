import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigationType } from "react-router";
import { motion } from "motion/react";
import {
  Search, MapPin, Users, DollarSign, CheckCircle, Filter, X, ChevronDown,
  Sparkles, SlidersHorizontal, Instagram, Youtube, Twitter, ArrowRight, Eye, Check, Facebook,
  BadgeCheck, Star, Zap, Award, TrendingUp, Heart, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { formatRate } from "../utils/currencies";
import { getInfluencers } from "../utils/dataManager";
import { CATEGORIES, LOCATIONS, PLATFORMS, PRICE_RANGES, FOLLOWER_RANGES, GENDERS, TRUST_BADGES } from "../data/mock-data";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useStatistics } from "../context/StatisticsContext";
import { mergeInfluencerBadges } from "../utils/badgeEngine";

const badgeIconMap: Record<string, any> = {
  BadgeCheck, Star, Zap, Award, TrendingUp, Sparkles, Heart,
};

export default function Discover() {
  const [influencers, setInfluencers] = useState(getInfluencers());
  const [searchQuery, setSearchQuery] = useState("");
  
  // Listen for influencers updates
  useEffect(() => {
    const handleInfluencersUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setInfluencers(customEvent.detail || getInfluencers());
    };

    // Re-read fresh data whenever this page becomes visible (e.g. navigating back)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setInfluencers(getInfluencers());
      }
    };

    window.addEventListener("influencersUpdated", handleInfluencersUpdate);
    document.addEventListener("visibilitychange", handleVisibility);
    
    // Always re-read on mount to catch updates made while unmounted
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
    switch (platform) {
      case "Instagram": return <Instagram size={13} />;
      case "YouTube": return <Youtube size={13} />;
      case "Twitter": return <Twitter size={13} />;
      case "Facebook": return <Facebook size={13} />;
      default: return null;
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } },
  };

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [selectedPlatform, setSelectedPlatform] = useState("All Platforms");
  const [selectedPriceRange, setSelectedPriceRange] = useState("Any Budget");
  const [selectedFollowerRange, setSelectedFollowerRange] = useState("Any Followers");
  const [selectedGender, setSelectedGender] = useState("All Genders");
  const [showFilters, setShowFilters] = useState(false);
  const navigationType = useNavigationType();
  const [currentPage, setCurrentPage] = useState(() => {
    // Only restore saved page on browser back/forward (POP), reset to 1 on fresh navigation
    if (navigationType === "POP") {
      const saved = sessionStorage.getItem("flubn-discover-page");
      if (saved) {
        const p = parseInt(saved, 10);
        if (!isNaN(p) && p > 0) return p;
      }
    } else {
      sessionStorage.removeItem("flubn-discover-page");
    }
    return 1;
  });
  const ITEMS_PER_PAGE = 12;
  const isInitialMount = useRef(true);
  const prevFiltersRef = useRef("");

  // Dynamically derive location options from actual influencer data
  const dynamicLocations = useMemo(() => {
    const uniqueLocations = Array.from(new Set(influencers.map((inf) => inf.location))).sort();
    return ["All Locations", ...uniqueLocations];
  }, [influencers]);

  // Build a filter key to detect actual filter changes
  const filterKey = `${searchQuery}|${selectedCategory}|${selectedLocation}|${selectedPlatform}|${selectedPriceRange}|${selectedFollowerRange}|${selectedGender}`;

  // Reset page to 1 when filters/search actually change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevFiltersRef.current = filterKey;
      return;
    }
    if (prevFiltersRef.current !== filterKey) {
      prevFiltersRef.current = filterKey;
      setCurrentPage(1);
      sessionStorage.setItem("flubn-discover-page", "1");
    }
  }, [filterKey]);

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

  const filtered = useMemo(() => {
    return influencers.filter((inf) => {
      // Show only active influencers on public discover (exclude suspended)
      if (inf.status === "suspended") return false;
      const matchSearch =
        (inf.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inf.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inf.bio || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === "All" || inf.category === selectedCategory;
      const matchLocation = selectedLocation === "All Locations" || inf.location === selectedLocation;
      const matchPlatform = selectedPlatform === "All Platforms" || (inf.platforms || []).includes(selectedPlatform);
      const matchPrice = matchPriceRange(inf.ratePerPost, selectedPriceRange);
      const matchFollower = matchFollowerRange(inf.followers, selectedFollowerRange);
      const matchGender = selectedGender === "All Genders" || inf.gender === selectedGender;
      return matchSearch && matchCategory && matchLocation && matchPlatform && matchPrice && matchFollower && matchGender;
    }).sort((a, b) => b.followers - a.followers);
  }, [influencers, searchQuery, selectedCategory, selectedLocation, selectedPlatform, selectedPriceRange, selectedFollowerRange, selectedGender]);

  const stats = useStatistics();

  return (
    <div className="min-h-screen bg-white font-['Inter',sans-serif]">
      <Navbar />

      {/* Hero Banner */}
      <section className="px-5 sm:px-8 lg:px-[100px] pt-8">
        <div className="relative overflow-hidden bg-[#0a090f] rounded-[30px] sm:rounded-[50px]">
          <div className="absolute inset-0">
            <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[600px]" style={{ background: "radial-gradient(ellipse at center, rgba(15,61,145,0.3), transparent 60%)" }} />
            <div className="absolute bottom-[-30%] left-[-10%] w-[400px] h-[400px]" style={{ background: "radial-gradient(ellipse at center, rgba(47,107,255,0.3), transparent 60%)" }} />
          </div>
          <div className="relative max-w-7xl mx-auto px-8 sm:px-12 lg:px-[80px] py-16 lg:py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 px-4 py-1.5 rounded-full text-sm mb-6 border border-white/10">
                <Sparkles size={14} className="text-[#fbbf24]" />
                Explore {stats.verifiedInfluencersDisplay} verified creators
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-white !leading-tight tracking-tight max-w-3xl mx-auto">
                Discover Top{" "}
                <span className="bg-gradient-to-r from-[#2F6BFF] to-[#6BA9FF] bg-clip-text text-transparent">
                  Influencers
                </span>
              </h1>
              <p className="mt-5 text-white/60 text-lg max-w-xl mx-auto">
                Browse verified creators across categories, locations, and platforms. Find the perfect match for your brand.
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-2xl mx-auto mt-10"
            >
              <div className="relative">
                <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search influencers by name, category, or keyword..."
                  className="w-full pl-13 pr-5 py-4 bg-white rounded-2xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-4 focus:ring-[#2F6BFF]/20 shadow-2xl shadow-black/20 text-sm"
                />
              </div>
            </motion.div>

            {/* Category Pills */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-2 mt-6"
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                    selectedCategory === cat
                      ? "bg-white text-[#2F6BFF] shadow-lg"
                      : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <p className="text-[#1a1a2e]">
              <span className="text-[#2F6BFF]">{filtered.length}</span> influencer{filtered.length !== 1 ? "s" : ""} found
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${
              showFilters
                ? "bg-[#2F6BFF] text-white shadow-lg shadow-[#2F6BFF]/25"
                : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#2F6BFF]/30"
            }`}
          >
            <SlidersHorizontal size={16} />
            Filters
            <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#64748b] mb-2 block">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-[#64748b] mb-2 block">Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                >
                  {dynamicLocations.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-[#64748b] mb-2 block">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-[#64748b] mb-2 block">Price Range</label>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                >
                  {PRICE_RANGES.map((pr) => (
                    <option key={pr} value={pr}>{pr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-[#64748b] mb-2 block">Follower Range</label>
                <select
                  value={selectedFollowerRange}
                  onChange={(e) => setSelectedFollowerRange(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                >
                  {FOLLOWER_RANGES.map((fr) => (
                    <option key={fr} value={fr}>{fr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-[#64748b] mb-2 block">Gender</label>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Influencer Grid */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          id="influencer-grid"
        >
          {filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((inf) => (
            <motion.div
              key={inf.id}
              variants={fadeUp}
              className="group bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden hover:shadow-xl hover:shadow-[#2F6BFF]/8 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                <ImageWithFallback
                  src={inf.photo}
                  alt={inf.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

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
                      {(inf as any).isVerified && (
                        <BadgeCheck
                          size={18}
                          strokeWidth={2.5}
                          className="text-[#2F6BFF] shrink-0"
                          style={{ filter: "drop-shadow(0 0 4px rgba(47,107,255,0.5))" }}
                          title="Verified"
                        />
                      )}
                    </h3>
                    <span className="text-[#2F6BFF] bg-[#EBF2FF] px-2.5 py-0.5 rounded-full text-xs mt-1 inline-block">
                      {inf.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[#1a1a2e] text-lg">{(() => {
                      const total =
                        (inf.platformFollowers && !Array.isArray(inf.platformFollowers) && typeof inf.platformFollowers === "object"
                          ? Object.values(inf.platformFollowers).reduce((s: number, v) => s + (Number(v) || 0), 0)
                          : 0) || inf.followers || 0;
                      if (total >= 1_000_000) return `${Number((total / 1_000_000).toFixed(1))}M`;
                      if (total >= 1_000)     return `${Number((total / 1_000).toFixed(1))}K`;
                      return total.toString();
                    })()}</div>
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
                          {(() => {
                            const caseAliases: Record<string, string> = {
                              youtube: "YouTube", instagram: "Instagram",
                              twitter: "Twitter", facebook: "Facebook",
                              linkedin: "LinkedIn", tiktok: "TikTok",
                            };
                            const resolvedKey = caseAliases[platform.toLowerCase()] ?? platform;
                            const brandColors: Record<string, string> = {
                              Instagram: "#E4405F", YouTube: "#FF0000",
                              Twitter: "#1DA1F2", Facebook: "#1877F2",
                              TikTok: "#000000", LinkedIn: "#0A66C2",
                            };
                            const iconMap: Record<string, React.ElementType> = {
                              Instagram, YouTube: Youtube, Twitter, Facebook,
                            };
                            const resolvedColor = brandColors[resolvedKey] ?? "#2F6BFF";
                            const Icon = iconMap[resolvedKey];
                            return Icon ? <Icon size={13} style={{ color: resolvedColor }} /> : null;
                          })()}
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
                    {formatRate(inf.ratePerPost, inf.currency)}/Collabs Starting At
                  </span>
                </div>

                <Link
                  to={(inf as any).username ? `/@${(inf as any).username}` : `/influencer/view/${inf.id}`}
                  onClick={() => {
                    console.log('[Discover] Clicking View Profile:', {
                      id: inf.id,
                      username: (inf as any).username,
                      name: inf.name,
                      linkTo: (inf as any).username ? `/@${(inf as any).username}` : `/influencer/view/${inf.id}`
                    });
                  }}
                  className="w-full py-2.5 bg-[#2F6BFF] text-white rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-[#0F3D91] transition-all shadow-md shadow-[#2F6BFF]/15 group/btn"
                >
                  <Eye size={14} />
                  View Profile
                  <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-[#94a3b8]">
            <Search size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg">No influencers found matching your criteria.</p>
            <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > ITEMS_PER_PAGE && (() => {
          const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
          const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
          const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

          // Generate page numbers with ellipsis
          const getPageNumbers = () => {
            const pages: (number | string)[] = [];
            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
              pages.push(1);
              if (currentPage > 3) pages.push("...");
              for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(i);
              }
              if (currentPage < totalPages - 2) pages.push("...");
              pages.push(totalPages);
            }
            return pages;
          };

          const handlePageChange = (page: number) => {
            setCurrentPage(page);
            sessionStorage.setItem("flubn-discover-page", String(page));
            // Scroll to top of grid
            document.querySelector("#influencer-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
          };

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-10 flex flex-col items-center gap-4"
            >
              {/* Page info */}
              <p className="text-sm text-[#94a3b8]">
                Showing <span className="text-[#1a1a2e] font-medium">{startItem}-{endItem}</span> of{" "}
                <span className="text-[#1a1a2e] font-medium">{filtered.length}</span> influencers
              </p>

              {/* Pagination controls */}
              <div className="flex items-center gap-1.5">
                {/* First page */}
                {totalPages > 7 && currentPage > 3 && (
                  <button
                    onClick={() => handlePageChange(1)}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl text-sm bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF] transition-all"
                    title="First page"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                )}

                {/* Previous */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm transition-all ${
                    currentPage === 1
                      ? "bg-[#f8f9fc] text-[#cbd5e1] cursor-not-allowed"
                      : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF]"
                  }`}
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Page numbers - desktop */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {getPageNumbers().map((page, idx) =>
                    typeof page === "string" ? (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-[#94a3b8] text-sm select-none">
                        •••
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                          currentPage === page
                            ? "bg-[#2F6BFF] text-white shadow-lg shadow-[#2F6BFF]/25 scale-105"
                            : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF] hover:scale-105"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                {/* Page indicator - mobile */}
                <div className="flex sm:hidden items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl">
                  <span className="text-sm font-semibold text-[#2F6BFF]">{currentPage}</span>
                  <span className="text-xs text-[#94a3b8]">/</span>
                  <span className="text-sm text-[#64748b]">{totalPages}</span>
                </div>

                {/* Next */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm transition-all ${
                    currentPage === totalPages
                      ? "bg-[#f8f9fc] text-[#cbd5e1] cursor-not-allowed"
                      : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF]"
                  }`}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight size={16} />
                </button>

                {/* Last page */}
                {totalPages > 7 && currentPage < totalPages - 2 && (
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl text-sm bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF] transition-all"
                    title="Last page"
                  >
                    <ChevronsRight size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })()}

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="rounded-3xl p-12 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl text-white mb-3">Want to collaborate?</h2>
              <p className="text-white/70 mb-8 max-w-md mx-auto">
                Sign up as a brand to send collaboration requests and unlock contact details.
              </p>
              <Link
                to="/signup?role=brand"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[#2F6BFF] rounded-xl hover:bg-white/90 transition-all shadow-xl text-sm"
              >
                Get Started as a Brand
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

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