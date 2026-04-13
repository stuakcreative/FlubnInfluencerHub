import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, MapPin, Users, DollarSign, Eye, Send, X, Trash2, Search, Check, BadgeCheck, Star, Zap, Award, TrendingUp, Sparkles, Instagram, Youtube, Twitter, Facebook } from "lucide-react";
import { getInfluencers } from "../../utils/dataManager";
import { TRUST_BADGES } from "../../data/mock-data";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { toast } from "sonner";
import { Link } from "react-router";
import * as api from "../../utils/api";
import { mergeInfluencerBadges } from "../../utils/badgeEngine";
import { isInfluencerVerified } from "../../utils/influencerVerification";
import { Pagination } from "../../components/Pagination";

const badgeIconMap: Record<string, any> = {
  BadgeCheck, Star, Zap, Award, TrendingUp, Sparkles, Heart,
};

export default function BrandFavorites() {
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('brand-saved-influencers');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [influencers, setInfluencers] = useState<any[]>([]);

  // Load influencers and listen for updates
  useEffect(() => {
    const loadInfluencers = () => {
      setInfluencers(getInfluencers());
    };
    
    loadInfluencers();

    const handleInfluencersUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setInfluencers(customEvent.detail || getInfluencers());
    };

    const handleStorageChange = () => {
      const saved = localStorage.getItem('brand-saved-influencers');
      setSavedIds(saved ? JSON.parse(saved) : []);
      loadInfluencers(); // Also reload influencers when storage changes
    };
    
    window.addEventListener('influencersUpdated', handleInfluencersUpdate);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('influencersUpdated', handleInfluencersUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const savedInfluencers = influencers.filter((inf) => savedIds.includes(inf.id));

  const filtered = savedInfluencers.filter(
    (inf) =>
      inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [currentPage, setCurrentPage] = useState(1);
  const GRID_PER_PAGE = 12;
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / GRID_PER_PAGE));
  const pagedInfluencers = filtered.slice((currentPage - 1) * GRID_PER_PAGE, currentPage * GRID_PER_PAGE);

  const handleRemove = (id: string) => {
    const inf = influencers.find((i) => i.id === id);
    const newSavedIds = savedIds.filter((sid) => sid !== id);
    setSavedIds(newSavedIds);
    localStorage.setItem('brand-saved-influencers', JSON.stringify(newSavedIds));
    // Sync to backend
    try {
      const userId = JSON.parse(localStorage.getItem("flubn_user") || "{}").id;
      if (userId) api.saveFavorites(userId, newSavedIds).catch(() => {});
    } catch { /* ignore */ }
    setRemoveId(null);
    toast.success(`${inf?.name} removed from favorites`);
  };

  const formatFollowers = (num: number) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Saved Influencers</h1>
        <p className="text-[#64748b] text-sm mt-1">
          Your favorite influencers for quick access. {savedInfluencers.length} saved.
        </p>
      </div>

      {/* Search */}
      {savedInfluencers.length > 0 && (
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved influencers..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
          />
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {pagedInfluencers.map((inf) => (
              <motion.div
                key={inf.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden hover:shadow-lg transition-all group hover:-translate-y-1"
              >
                <div className="relative h-40 overflow-hidden">
                  <ImageWithFallback
                    src={inf.photo}
                    alt={inf.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <button
                    onClick={() => setRemoveId(inf.id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-[#ef4444] hover:bg-white transition-colors"
                    title="Remove from favorites"
                  >
                    <Heart size={16} fill="currentColor" />
                  </button>

                  {/* Trust Badge strip — bottom-left of photo */}
                  {inf.status === "active" && (() => {
                    const infBadges = mergeInfluencerBadges(inf)
                      .map((id: string) => TRUST_BADGES.find((b: any) => b.id === id && b.status === "active"))
                      .filter(Boolean);
                    if (infBadges.length === 0) return null;
                    const visible = infBadges.slice(0, 4);
                    const remaining = infBadges.length - visible.length;
                    return (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                        {visible.map((badge: any, i: number) => {
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
                        (inf.platformFollowers && !Array.isArray(inf.platformFollowers) && typeof inf.platformFollowers === "object"
                          ? Object.values(inf.platformFollowers as Record<string, number>).reduce((s: number, v) => s + (Number(v) || 0), 0)
                          : 0) || inf.followers || 0
                      )}</div>
                      <div className="text-xs text-[#94a3b8]">total reach</div>
                    </div>
                  </div>

                  {/* Platform Followers Breakdown */}
                  {inf.platformFollowers && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {Object.entries(inf.platformFollowers).map(([platform, followers]) => {
                        const platformIcon = getPlatformIcon(platform);
                        return (
                          <div key={platform} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f8f9fc] rounded-lg text-xs">
                            <span className="text-[#64748b]">{platformIcon}</span>
                            <span className="text-[#1a1a2e]">{formatFollowers(followers as number)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {inf.bio && (
                    <p className="text-[#64748b] text-sm line-clamp-2 mb-4">{inf.bio}</p>
                  )}

                  <div className="flex items-center gap-3 text-sm text-[#64748b] mb-4">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-[#94a3b8]" />
                      {inf.location.split(",")[0]}
                    </span>
                    <span className="text-[#e2e8f0]">|</span>
                    <span className="flex items-center gap-1">
                      <Users size={14} className="text-[#94a3b8]" />
                      {"\u20b9"}{inf.ratePerPost.toLocaleString()}/Collabs Starting At
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={(inf as any).username ? `/@${(inf as any).username}` : `/influencer/view/${inf.id}`}
                      state={{ from: 'brand-dashboard' }}
                      className="flex-1 py-2.5 border border-[#e2e8f0] text-[#64748b] rounded-xl text-sm flex items-center justify-center gap-1.5 hover:bg-[#f8f9fc] transition-all"
                    >
                      <Eye size={14} /> View Profile
                    </Link>
                    <Link
                      to="/brand/discover"
                      className="flex-1 py-2.5 bg-[#2F6BFF] text-white rounded-xl text-sm flex items-center justify-center gap-1.5 hover:bg-[#0F3D91] transition-all shadow-md shadow-[#2F6BFF]/15"
                    >
                      <Send size={14} /> Collaborate
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={GRID_PER_PAGE} onPageChange={setCurrentPage} label="influencers" tableFooter={false} />
        </>
      ) : savedInfluencers.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-[#fef2f2] flex items-center justify-center mx-auto mb-4">
            <Heart size={32} className="text-[#ef4444]/40" />
          </div>
          <h3 className="text-lg text-[#1a1a2e]">No saved influencers yet</h3>
          <p className="text-[#64748b] text-sm mt-2 max-w-md mx-auto">
            Browse our influencer directory and save your favorites for quick access later.
          </p>
          <Link
            to="/brand/discover"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors mt-6"
          >
            <Search size={16} />
            Discover Influencers
          </Link>
        </div>
      ) : (
        <div className="text-center py-16 text-[#94a3b8]">
          <Search size={40} className="mx-auto mb-4 opacity-50" />
          <p>No saved influencers match your search.</p>
        </div>
      )}

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={!!removeId}
        title="Remove from Favorites"
        description="Are you sure you want to remove this influencer from your saved list? You can always save them again later."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => removeId && handleRemove(removeId)}
        onCancel={() => setRemoveId(null)}
      />
    </div>
  );
}