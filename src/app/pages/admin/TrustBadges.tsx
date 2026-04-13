import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { BadgeCheck, Star, Zap, Award, TrendingUp, Sparkles, Heart, Plus, Edit2, Trash2, Eye, EyeOff, Search } from "lucide-react";
import { TRUST_BADGES } from "../../data/mock-data";
import { getInfluencers } from "../../utils/dataManager";
import { AUTO_BADGE_IDS, mergeInfluencerBadges } from "../../utils/badgeEngine";
import { toast } from "sonner";

// Icon mapping
const iconMap: Record<string, any> = {
  BadgeCheck,
  Star,
  Zap,
  Award,
  TrendingUp,
  Sparkles,
  Heart,
};

export default function AdminTrustBadges() {
  const [badges, setBadges] = useState(TRUST_BADGES);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [influencers, setInfluencers] = useState([]);

  useEffect(() => {
    const fetchInfluencers = async () => {
      const data = await getInfluencers();
      setInfluencers(data);
    };
    fetchInfluencers();

    // Listen for influencer updates
    const handleInfluencersUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setInfluencers(customEvent.detail || getInfluencers());
    };

    window.addEventListener("influencersUpdated", handleInfluencersUpdate);
    return () => {
      window.removeEventListener("influencersUpdated", handleInfluencersUpdate);
    };
  }, []);

  const filtered = badges.filter((badge) => {
    const matchesSearch = badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      badge.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = showInactive || badge.status === "active";
    return matchesSearch && matchesStatus;
  });

  const toggleStatus = (id: string) => {
    setBadges((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: b.status === "active" ? ("inactive" as const) : ("active" as const) } : b
      )
    );
    toast.success("Badge status updated");
  };

  const handleDelete = (id: string) => {
    const usageCount = getBadgeUsageCount(id);
    if (usageCount > 0) {
      toast.error(`Cannot delete: Badge is assigned to ${usageCount} influencers`);
      return;
    }
    
    setBadges((prev) => prev.filter((b) => b.id !== id));
    toast.success("Badge deleted successfully");
  };

  // Count influencers with each badge — uses the engine for AUTO badges, raw array for MANUAL (tb1)
  const getBadgeUsageCount = (badgeId: string) => {
    return (influencers as any[]).filter((inf) =>
      mergeInfluencerBadges(inf).includes(badgeId)
    ).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Trust Badges Management</h1>
          <p className="text-[#64748b] text-sm mt-1">
            Manage trust badges that can be assigned to influencers
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[280px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search badges..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
          />
        </div>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
            showInactive
              ? "bg-[#2F6BFF] text-white border-[#2F6BFF]"
              : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2F6BFF]"
          }`}
        >
          {showInactive ? <Eye size={16} /> : <EyeOff size={16} />}
          {showInactive ? "Showing All" : "Active Only"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <p className="text-sm text-[#64748b]">Total Badges</p>
          <p className="text-2xl text-[#1a1a2e] mt-1">{badges.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <p className="text-sm text-[#64748b]">Active Badges</p>
          <p className="text-2xl text-[#1a1a2e] mt-1">
            {badges.filter((b) => b.status === "active").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <p className="text-sm text-[#64748b]">Total Assignments</p>
          <p className="text-2xl text-[#1a1a2e] mt-1">
            {(influencers as any[]).reduce(
              (sum, inf) => sum + mergeInfluencerBadges(inf).length,
              0
            )}
          </p>
        </div>
      </div>

      {/* Badges Grid */}
      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((badge, index) => {
            const IconComponent = iconMap[badge.icon];
            const usageCount = getBadgeUsageCount(badge.id);
            const verifiedTotal = (influencers as any[]).filter((i: any) => i.status === "active").length;
            const pct = verifiedTotal > 0 ? Math.round((usageCount / verifiedTotal) * 100) : 0;

            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-xl border p-5 hover:shadow-lg transition-all flex flex-col ${
                  badge.status === "inactive"
                    ? "border-[#e2e8f0] opacity-60"
                    : "border-[#e2e8f0]"
                }`}
              >
                {/* Header — icon + name + id inline, actions right */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: badge.bgColor }}
                    >
                      {IconComponent && <IconComponent size={20} style={{ color: badge.color }} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-[#1a1a2e] font-medium leading-snug truncate">{badge.name}</h3>
                        {/* Auto / Manual pill */}
                        {(AUTO_BADGE_IDS as readonly string[]).includes(badge.id) ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#10b981] border border-[#10b981]/20 leading-none shrink-0">AUTO</span>
                        ) : (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#EBF2FF] text-[#2F6BFF] border border-[#2F6BFF]/20 leading-none shrink-0">MANUAL</span>
                        )}
                      </div>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: badge.bgColor, color: badge.color }}
                      >
                        {badge.id}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => toggleStatus(badge.id)}
                      className="p-1.5 text-[#64748b] hover:text-[#2F6BFF] hover:bg-[#EBF2FF] rounded-lg transition-colors"
                      title={badge.status === "active" ? "Deactivate" : "Activate"}
                    >
                      {badge.status === "active" ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                  </div>
                </div>

                {/* Award Criteria — compact chips */}
                <div className="mb-4">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: badge.color }}
                  >
                    Award Criteria
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(badge.criteria && badge.criteria.length > 0
                      ? badge.criteria
                      : [badge.description]
                    ).map((item, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg text-[#475569] border border-[#e2e8f0] leading-snug"
                        style={{ backgroundColor: badge.bgColor }}
                      >
                        <span
                          className="w-1 h-1 rounded-full shrink-0"
                          style={{ backgroundColor: badge.color }}
                        />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dynamic assignment stats */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#64748b]">
                      <span className="font-semibold text-[#1a1a2e]">{usageCount}</span>
                      {" "}/ {verifiedTotal} verified influencers
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        badge.status === "active"
                          ? "bg-[#ecfdf5] text-[#10b981]"
                          : "bg-[#f1f5f9] text-[#64748b]"
                      }`}
                    >
                      {badge.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: badge.color }}
                    />
                  </div>
                  <p className="text-[10px] text-[#94a3b8]">
                    {pct}% coverage across verified influencers
                  </p>
                </div>

                {/* Labelled colour swatches */}
                <div className="mt-4 pt-3 border-t border-[#e2e8f0] flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded border border-[#e2e8f0]"
                      style={{ backgroundColor: badge.color }}
                    />
                    <span className="text-[10px] text-[#94a3b8]">Icon</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <div
                      className="flex-1 h-5 rounded border border-[#e2e8f0]"
                      style={{ backgroundColor: badge.bgColor }}
                    />
                    <span className="text-[10px] text-[#94a3b8]">BG</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-[#e2e8f0]">
          <Search size={40} className="mx-auto text-[#d1d5db] mb-4" />
          <p className="text-[#64748b]">No badges found matching your search</p>
        </div>
      )}
    </div>
  );
}