import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Mail, Phone, MapPin, Calendar, Globe, Instagram,
  CheckCircle, Award, Briefcase, Users, TrendingUp,
  Building2, Shield, ExternalLink, BadgeCheck, Star, 
  Zap, Sparkles, Heart,
} from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { useCollaboration } from "../context/CollaborationContext";
import { isInfluencerVerified } from "../utils/influencerVerification";
import { isBrandVerified } from "../utils/brandVerification";
import { mergeInfluencerBadges } from "../utils/badgeEngine";
import { TRUST_BADGES, COLLABORATION_REQUESTS, RATINGS, COMPLETED_COLLABORATIONS } from "../data/mock-data";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userType: "brand" | "influencer";
  requestId?: string; // To check contact sharing status
}

export function ProfileModal({ isOpen, onClose, userId, userType, requestId }: ProfileModalProps) {
  const { requests } = useCollaboration();
  const [profileData, setProfileData] = useState<any>(null);
  const [contactShared, setContactShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setProfileData(null);
      setLoading(true);
      setError(null);
      return;
    }

    // Validate userId
    if (!userId) {
      console.error("ProfileModal: userId is undefined!");
      setError("User ID is missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Check if contact is shared for this specific request
    if (requestId) {
      const req = requests.find((r) => r.id === requestId);
      setContactShared(req?.contactShareStatus === "shared");
    } else {
      setContactShared(false);
    }

    // Load profile data from localStorage
    if (userType === "influencer") {
      const influencers = JSON.parse(localStorage.getItem("flubn_influencers") || "[]");
      
      const profile = influencers.find((inf: any) => {
        // Try both string and number comparison
        return inf.id === userId || inf.id === String(userId) || String(inf.id) === String(userId);
      });
      
      if (profile) {
        // Calculate actual completed collaborations count from COMPLETED_COLLABORATIONS data
        const completedCollabs = COMPLETED_COLLABORATIONS.filter(
          (collab: any) => 
            collab.influencerId === userId || String(collab.influencerId) === String(userId)
        ).length;

        // Calculate actual average rating from approved brand reviews
        const approvedRatings = RATINGS.filter(
          (rating: any) => 
            (rating.influencerId === userId || String(rating.influencerId) === String(userId)) && 
            rating.status === "approved"
        );
        
        const averageRating = approvedRatings.length > 0
          ? approvedRatings.reduce((sum: number, r: any) => sum + r.overallRating, 0) / approvedRatings.length
          : null;

        // Merge badges into the profile object (don't replace the whole profile!)
        const mergedBadges = mergeInfluencerBadges(profile);
        
        setProfileData({ 
          ...profile, 
          badges: mergedBadges,
          completedCollabs,
          averageRating,
        });
        setLoading(false);
      } else {
        console.warn("Influencer not found:", userId);
        setError(`Influencer profile not found (ID: ${userId})`);
        setLoading(false);
      }
    } else {
      // For brands, try localStorage first, then fall back to extracting from collaboration requests
      const brands = JSON.parse(localStorage.getItem("flubn_brands") || "[]");
      
      let profile = brands.find((b: any) => {
        // Try both string and number comparison
        return b.id === userId || b.id === String(userId) || String(b.id) === String(userId);
      });
      
      // If not in localStorage, try to extract from collaboration requests
      if (!profile) {
        const collabRequest = COLLABORATION_REQUESTS.find((req: any) => req.brandId === userId);
        if (collabRequest) {
          // Build brand profile from collaboration request data
          profile = {
            id: userId,
            name: collabRequest.brandName,
            logo: collabRequest.brandPhoto || null,
            email: collabRequest.brandContactEmail || null,
            phone: collabRequest.brandContactPhone || null,
            description: collabRequest.message || null,
            industry: null,
            location: null,
            companySize: null,
            activeCampaigns: COLLABORATION_REQUESTS.filter((r: any) => r.brandId === userId && r.status === "accepted").length,
            website: null,
          };
        }
      }
      
      if (profile) {
        setProfileData(profile);
        setLoading(false);
      } else {
        console.warn("Brand not found:", userId);
        setError(`Brand profile not found (ID: ${userId})`);
        setLoading(false);
      }
    }
  }, [isOpen, userId, userType, requestId, requests]);

  if (!profileData && !loading && !error) return null;

  const verified =
    userType === "influencer"
      ? isInfluencerVerified(userId)
      : isBrandVerified(userId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[90vh] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-[#e2e8f0] shrink-0">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-[#64748b]" />
              </button>
              <h2 className="text-[#1a1a2e] text-xl">Profile Details</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin" }}>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2F6BFF] to-[#1e40af] flex items-center justify-center mb-4 animate-pulse shadow-lg">
                    <Users size={32} className="text-white" />
                  </div>
                  <p className="text-[#1a1a2e] font-medium mb-1">Loading profile...</p>
                  <p className="text-[#94a3b8] text-sm">Please wait a moment</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] flex items-center justify-center mb-4 shadow-lg">
                    <X size={32} className="text-white" />
                  </div>
                  <p className="text-[#1a1a2e] font-medium mb-1">Unable to load profile</p>
                  <p className="text-[#64748b] text-sm max-w-sm text-center">{error}</p>
                </div>
              ) : profileData ? (
                <>
                  {userType === "influencer" ? (
                    <InfluencerProfile data={profileData} verified={verified} contactShared={contactShared} />
                  ) : (
                    <BrandProfile data={profileData} verified={verified} contactShared={contactShared} />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#94a3b8] to-[#64748b] flex items-center justify-center mb-4 shadow-lg">
                    <Users size={32} className="text-white" />
                  </div>
                  <p className="text-[#1a1a2e] font-medium mb-1">No profile data available</p>
                  <p className="text-[#94a3b8] text-sm">Profile information could not be found</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────
// Influencer Profile View
// ──────────────────────────────────────────────────────────────────
function InfluencerProfile({ data, verified, contactShared }: any) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <ProfileAvatar
          photo={data.photo}
          name={data.name}
          size="w-24 h-24"
          textSize="text-2xl"
          className="mb-4"
        />
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-[#1a1a2e] text-2xl">{data.name}</h3>
          {verified && <VerifiedBadge size={18} />}
        </div>
        <p className="text-[#64748b] text-sm mb-1">
          @{data.username || (data.name ? data.name.toLowerCase().replace(/\s+/g, "") : "unknown")}
        </p>
        <p className="text-[#94a3b8] text-sm">{data.location}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#f8f9fc] rounded-2xl p-4 text-center">
          <Users size={20} className="text-[#2F6BFF] mx-auto mb-2" />
          <p className="text-[#1a1a2e] text-lg font-semibold">
            {data.followers
              ? data.followers >= 1000000
                ? `${(data.followers / 1000000).toFixed(1)}M`
                : data.followers >= 1000
                ? `${(data.followers / 1000).toFixed(1)}K`
                : data.followers.toLocaleString()
              : "0"}
          </p>
          <p className="text-[#94a3b8] text-xs mt-0.5">Followers</p>
        </div>
        <div className="bg-[#f8f9fc] rounded-2xl p-4 text-center">
          <Briefcase size={20} className="text-[#f59e0b] mx-auto mb-2" />
          <p className="text-[#1a1a2e] text-lg font-semibold">
            {data.completedCollabs ?? "0"}
          </p>
          <p className="text-[#94a3b8] text-xs mt-0.5">Collaboration</p>
        </div>
        <div className="bg-[#f8f9fc] rounded-2xl p-4 text-center">
          <Star size={20} className="text-[#f59e0b] mx-auto mb-2" fill="#f59e0b" />
          <p className="text-[#1a1a2e] text-lg font-semibold">
            {data.averageRating ? `${data.averageRating.toFixed(1)}` : "N/A"}
          </p>
          <p className="text-[#94a3b8] text-xs mt-0.5">Avg Rating</p>
        </div>
      </div>

      {/* Bio */}
      {data.bio && (
        <div>
          <h4 className="text-[#1a1a2e] text-sm font-medium mb-2">About</h4>
          <p className="text-[#64748b] text-sm leading-relaxed">{data.bio}</p>
        </div>
      )}

      {/* Categories */}
      {data.categories && data.categories.length > 0 && (
        <div>
          <h4 className="text-[#1a1a2e] text-sm font-medium mb-2">Categories</h4>
          <div className="flex flex-wrap gap-2">
            {data.categories.map((cat: string) => (
              <span
                key={cat}
                className="px-3 py-1.5 bg-[#EBF2FF] text-[#2F6BFF] text-xs rounded-full"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trust Badges */}
      {data.badges && data.badges.length > 0 && (() => {
        // Convert badge IDs to badge objects
        const badgeObjects = data.badges
          .map((badgeId: string) => TRUST_BADGES.find((b) => b.id === badgeId && b.status === "active"))
          .filter(Boolean);
        
        if (badgeObjects.length === 0) return null;
        
        // Icon mapping function
        const getBadgeIcon = (iconName: string) => {
          const iconMap: Record<string, any> = {
            BadgeCheck,
            Star,
            Zap,
            Award,
            TrendingUp,
            Sparkles,
            Heart,
          };
          return iconMap[iconName] || Award;
        };
        
        return (
          <div>
            <h4 className="text-[#1a1a2e] text-sm font-medium mb-4">Trust Badges</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-6">
              {/* Non-featured badges */}
              {badgeObjects.filter((b: any) => b.id !== "tb7").map((badge: any, i: number) => {
                const BadgeIcon = getBadgeIcon(badge.icon);
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
                          <BadgeIcon size={22} style={{ color: badge.color }} />
                        </motion.div>
                        <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-[1.5px] shadow-sm">
                          <CheckCircle size={14} style={{ color: badge.color, display: "block" }} />
                        </div>
                      </div>
                      <p className="text-[10px] text-[#475569] leading-tight text-center break-words max-w-full px-0.5">{badge.name}</p>
                    </motion.div>
                  </motion.div>
                );
              })}

              {/* Brand Favorite — full row, centred */}
              {(() => {
                const fav = badgeObjects.find((b: any) => b.id === "tb7");
                if (!fav) return null;
                const FavIcon = getBadgeIcon(fav.icon);
                const favIdx = badgeObjects.length - 1;
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
                            <FavIcon size={22} style={{ color: fav.color }} />
                          </motion.div>
                          <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-[1.5px] shadow-sm">
                            <CheckCircle size={14} style={{ color: fav.color, display: "block" }} />
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
        );
      })()}

      {/* Contact Information (only if shared) */}
      {contactShared && (
        <div className="bg-gradient-to-br from-[#EBF2FF] to-white border border-[#2F6BFF]/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-[#2F6BFF]" />
            <h4 className="text-[#1a1a2e] text-sm font-medium">Contact Information</h4>
            <span className="ml-auto px-2 py-0.5 bg-[#10b981]/10 text-[#10b981] text-[10px] rounded-full flex items-center gap-1">
              <CheckCircle size={10} /> Shared
            </span>
          </div>
          <div className="space-y-3">
            {data.email && (
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-[#64748b]" />
                <a
                  href={`mailto:${data.email}`}
                  className="text-[#2F6BFF] text-sm hover:underline"
                >
                  {data.email}
                </a>
              </div>
            )}
            {data.phone && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-[#64748b]" />
                <a
                  href={`tel:${data.phone}`}
                  className="text-[#2F6BFF] text-sm hover:underline"
                >
                  {data.phone}
                </a>
              </div>
            )}
            {data.instagram && (
              <div className="flex items-center gap-3">
                <Instagram size={16} className="text-[#64748b]" />
                <a
                  href={`https://instagram.com/${data.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2F6BFF] text-sm hover:underline flex items-center gap-1"
                >
                  @{data.instagram.replace('@', '')}
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {!contactShared && (
        <div className="bg-[#f8f9fc] border border-[#e2e8f0] rounded-2xl p-5 text-center">
          <Shield size={24} className="text-[#94a3b8] mx-auto mb-2" />
          <p className="text-[#64748b] text-sm">
            Contact information will be visible once both parties agree to share
          </p>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Brand Profile View
// ─────────────────────────────────────────────────────────────────
function BrandProfile({ data, verified, contactShared }: any) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center mb-4 shadow-lg border-4 border-white ring-2 ring-[#e2e8f0]"
          style={{
            background: data.logo
              ? `url(${data.logo}) center/cover`
              : "linear-gradient(135deg, #0F3D91, #2F6BFF)",
          }}
        >
          {!data.logo && (
            <span className="text-white text-4xl font-bold">
              {data.name?.charAt(0) || "B"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-[#1a1a2e] text-2xl font-semibold">{data.name}</h3>
          {verified && <VerifiedBadge size={20} />}
        </div>
        {data.industry && (
          <span className="px-4 py-1.5 bg-gradient-to-r from-[#EBF2FF] to-[#dbeafe] text-[#2F6BFF] text-sm font-medium rounded-full mb-2">
            {data.industry}
          </span>
        )}
        {data.location && (
          <div className="flex items-center gap-1.5 text-[#64748b] text-sm">
            <MapPin size={16} className="text-[#94a3b8]" />
            {data.location}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-gradient-to-br from-[#EBF2FF] via-white to-[#f8f9fc] rounded-2xl p-5 border border-[#e2e8f0] shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-md">
                <Briefcase size={22} className="text-white" />
              </div>
              <div>
                <p className="text-[#1a1a2e] text-2xl font-bold">{data.activeCampaigns || 0}</p>
                <p className="text-[#64748b] text-sm">Active Campaigns</p>
              </div>
            </div>
            <div className="w-16 h-16 rounded-full bg-[#10b981]/10 flex items-center justify-center">
              <TrendingUp size={28} className="text-[#10b981]" />
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {data.description && (
        <div className="bg-[#f8f9fc] rounded-2xl p-5 border border-[#e2e8f0]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2F6BFF] to-[#1e40af] flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <h4 className="text-[#1a1a2e] text-sm font-semibold">About the Brand</h4>
          </div>
          <p className="text-[#64748b] text-sm leading-relaxed">{data.description}</p>
        </div>
      )}

      {/* Website */}
      {data.website && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={16} className="text-[#2F6BFF]" />
            <h4 className="text-[#1a1a2e] text-sm font-semibold">Website</h4>
          </div>
          <a
            href={data.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#EBF2FF] to-white border border-[#2F6BFF]/20 rounded-xl hover:border-[#2F6BFF] hover:shadow-md transition-all group"
          >
            <span className="text-[#2F6BFF] text-sm font-medium truncate">{data.website}</span>
            <ExternalLink size={16} className="text-[#2F6BFF] shrink-0 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      )}

      {/* Contact Information (only if shared) */}
      {contactShared && (
        <div className="bg-gradient-to-br from-[#EBF2FF] via-white to-[#dbeafe] border-2 border-[#2F6BFF]/30 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2F6BFF] to-[#1e40af] flex items-center justify-center shadow-md">
              <Shield size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-[#1a1a2e] text-base font-semibold">Contact Information</h4>
              <p className="text-[#64748b] text-xs">Verified and shared</p>
            </div>
            <span className="px-3 py-1.5 bg-[#10b981] text-white text-xs font-medium rounded-full flex items-center gap-1.5 shadow-sm">
              <CheckCircle size={12} /> Shared
            </span>
          </div>
          <div className="space-y-3">
            {data.email && (
              <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#e2e8f0] hover:border-[#2F6BFF] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#EBF2FF] flex items-center justify-center shrink-0">
                  <Mail size={18} className="text-[#2F6BFF]" />
                </div>
                <a
                  href={`mailto:${data.email}`}
                  className="text-[#2F6BFF] text-sm font-medium hover:underline truncate"
                >
                  {data.email}
                </a>
              </div>
            )}
            {data.phone && (
              <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#e2e8f0] hover:border-[#2F6BFF] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#EBF2FF] flex items-center justify-center shrink-0">
                  <Phone size={18} className="text-[#2F6BFF]" />
                </div>
                <a
                  href={`tel:${data.phone}`}
                  className="text-[#2F6BFF] text-sm font-medium hover:underline"
                >
                  {data.phone}
                </a>
              </div>
            )}
            {data.contactPerson && (
              <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#e2e8f0]">
                <div className="w-9 h-9 rounded-lg bg-[#EBF2FF] flex items-center justify-center shrink-0">
                  <Users size={18} className="text-[#2F6BFF]" />
                </div>
                <div>
                  <p className="text-[#94a3b8] text-xs">Contact Person</p>
                  <p className="text-[#1a1a2e] text-sm font-medium">{data.contactPerson}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!contactShared && (
        <div className="bg-gradient-to-br from-[#f8f9fc] to-white border-2 border-dashed border-[#cbd5e1] rounded-2xl p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mx-auto mb-3">
            <Shield size={28} className="text-[#94a3b8]" />
          </div>
          <h4 className="text-[#1a1a2e] text-sm font-semibold mb-1">Contact Details Locked</h4>
          <p className="text-[#64748b] text-sm max-w-sm mx-auto">
            Contact information will be visible once both parties agree to share details
          </p>
        </div>
      )}
    </div>
  );
}