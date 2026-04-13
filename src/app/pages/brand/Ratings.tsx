import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, X, Check, MessageSquare, Clock, Target, Zap, Award, ThumbsUp, ArrowUpDown } from "lucide-react";
import { COMPLETED_COLLABORATIONS, RATINGS } from "../../data/mock-data";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { toast } from "sonner";
import { Pagination } from "../../components/Pagination";

export default function BrandRatings() {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedCollab, setSelectedCollab] = useState<any>(null);
  const [ratingData, setRatingData] = useState({
    communication: 0,
    contentQuality: 0,
    timeliness: 0,
    professionalism: 0,
    review: "",
  });

  const handleRate = (collab: any) => {
    setSelectedCollab(collab);
    setShowRatingModal(true);
    setRatingData({
      communication: 0,
      contentQuality: 0,
      timeliness: 0,
      professionalism: 0,
      review: "",
    });
  };

  const handleSubmitRating = (e: React.FormEvent) => {
    e.preventDefault();
    const { communication, contentQuality, timeliness, professionalism } = ratingData;
    
    if (!communication || !contentQuality || !timeliness || !professionalism) {
      toast.error("Please rate all categories");
      return;
    }

    const avgRating = (communication + contentQuality + timeliness + professionalism) / 4;

    toast.success(`Rating submitted for ${selectedCollab.influencerName}!`, {
      description: `Overall rating: ${avgRating.toFixed(1)}/5 stars`,
    });

    setShowRatingModal(false);
    setSelectedCollab(null);
  };

  const RatingStars = ({ category, value, onChange }: { category: string; value: number; onChange: (val: number) => void }) => (
    <div>
      <label className="text-sm text-[#64748b] mb-2 block">{category}</label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={28}
              className={star <= value ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#e2e8f0]"}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const unratedCollabs = COMPLETED_COLLABORATIONS.filter((c) => !c.hasRating);
  const ratedCollabs = COMPLETED_COLLABORATIONS.filter((c) => c.hasRating);
  
  const filteredRatings = RATINGS
    .filter((r) => {
      if (statusFilter === "all") return true;
      return r.status === statusFilter;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
      if (sortBy === "oldest") return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
      if (sortBy === "rating-high") return b.overallRating - a.overallRating;
      if (sortBy === "rating-low") return a.overallRating - b.overallRating;
      return 0;
    });

  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRatings.length / ROWS_PER_PAGE));
  const pagedRatings = filteredRatings.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // Reset page when filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortBy]);

  // Smooth scroll to top on page change
  useEffect(() => {
    if (currentPage > 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Rate Your Collaborations</h1>
        <p className="text-[#64748b] mt-1">
          Share your experience working with influencers to help build trust in the community
        </p>
      </div>

      {/* Pending Ratings */}
      {unratedCollabs.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1 h-5 rounded-full bg-[#f59e0b]" />
            <h2 className="text-lg text-[#1a1a2e]">Pending Ratings</h2>
            <span className="ml-auto px-2.5 py-0.5 bg-[#fef3c7] text-[#f59e0b] rounded-full text-xs">
              {unratedCollabs.length} awaiting
            </span>
          </div>
          <div className="space-y-3">
            {unratedCollabs.map((collab) => (
              <motion.div
                key={collab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-[#f8f9fc] rounded-xl border border-[#e2e8f0] hover:border-[#2F6BFF]/30 transition-all"
              >
                <ImageWithFallback
                  src={collab.influencerPhoto}
                  alt={collab.influencerName}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1a1a2e] truncate">{collab.influencerName}</p>
                  <p className="text-xs text-[#94a3b8] truncate">{collab.campaignName}</p>
                  <p className="text-[10px] text-[#94a3b8] mt-0.5">Completed: {collab.completedDate}</p>
                </div>
                <button
                  onClick={() => handleRate(collab)}
                  className="px-3 py-2 sm:px-4 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors text-sm flex items-center gap-2 shrink-0"
                >
                  <Star size={14} className="shrink-0" />
                  <span className="hidden sm:inline">Rate Now</span>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Your Ratings */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-1 h-5 rounded-full bg-[#10b981]" />
          <h2 className="text-lg text-[#1a1a2e]">Your Ratings</h2>
          <span className="ml-auto px-2.5 py-0.5 bg-[#d1fae5] text-[#10b981] rounded-full text-xs">
            {filteredRatings.length} shown
          </span>
        </div>

        {/* Filter Tabs + Sort Row */}
        <div className="space-y-3 mb-6">
          {/* Sort control */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#94a3b8]">
              {filteredRatings.length} {filteredRatings.length === 1 ? "rating" : "ratings"}
            </p>
            <div className="relative">
              <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-8 pr-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-[#1a1a2e] text-xs focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] cursor-pointer appearance-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="rating-high">Rating: High → Low</option>
                <option value="rating-low">Rating: Low → High</option>
              </select>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { label: "All", value: "all", activeColor: "border-[#2F6BFF] bg-[#EBF2FF] text-[#2F6BFF]" },
              { label: "Pending", value: "pending", activeColor: "border-[#f59e0b] bg-[#fffbeb] text-[#f59e0b]" },
              { label: "Approved", value: "approved", activeColor: "border-[#10b981] bg-[#ecfdf5] text-[#10b981]" },
              { label: "Rejected", value: "rejected", activeColor: "border-[#ef4444] bg-[#fef2f2] text-[#ef4444]" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-2 rounded-xl text-sm border transition-all whitespace-nowrap ${
                  statusFilter === tab.value
                    ? tab.activeColor
                    : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2F6BFF]/30"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${
                  statusFilter === tab.value ? "bg-current/10" : "bg-[#f1f5f9] text-[#94a3b8]"
                }`}>
                  {tab.value === "all" ? RATINGS.length : RATINGS.filter(r => r.status === tab.value).length}
                </span>
              </button>
            ))}
            {/* Clear sort if non-default */}
            {(sortBy !== "newest" || statusFilter !== "all") && (
              <button
                onClick={() => { setSortBy("newest"); setStatusFilter("all"); }}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs text-[#ef4444] bg-[#fef2f2] border border-[#fecaca] rounded-xl hover:bg-[#fee2e2] transition-colors whitespace-nowrap"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>

        {filteredRatings.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#f8f9fc] flex items-center justify-center mx-auto mb-4">
              <Star size={24} className="text-[#94a3b8]" />
            </div>
            <p className="text-[#64748b]">No ratings submitted yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pagedRatings.map((rating) => (
              <motion.div
                key={rating.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full border border-[#e2e8f0] rounded-xl p-3 sm:p-4"
              >
                <div className="flex items-start gap-2 sm:gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm text-[#1a1a2e]">{rating.influencerName}</p>
                      <span className="px-2 py-0.5 bg-[#EBF2FF] text-[#2F6BFF] rounded-full text-[10px]">
                        {rating.campaignName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            className={s <= Math.round(rating.overallRating) ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#e2e8f0]"}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#64748b]">{rating.overallRating.toFixed(1)}/5</span>
                      <span className="text-xs text-[#94a3b8]">• {rating.createdDate}</span>
                    </div>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-full text-xs shrink-0 ${
                      rating.status === "approved"
                        ? "bg-[#d1fae5] text-[#10b981]"
                        : rating.status === "pending"
                        ? "bg-[#fef3c7] text-[#f59e0b]"
                        : "bg-[#fee2e2] text-[#ef4444]"
                    }`}
                  >
                    {rating.status}
                  </div>
                </div>

                {/* Rating Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
                  {[
                    { label: "Communication", value: rating.communication, icon: MessageSquare },
                    { label: "Quality", value: rating.contentQuality, icon: Award },
                    { label: "Timeliness", value: rating.timeliness, icon: Clock },
                    { label: "Professional", value: rating.professionalism, icon: Target },
                  ].map((metric) => (
                    <div key={metric.label} className="bg-[#f8f9fc] rounded-lg p-2 text-center">
                      <metric.icon size={14} className="text-[#64748b] mx-auto mb-1" />
                      <p className="text-xs text-[#94a3b8] mb-0.5">{metric.label}</p>
                      <p className="text-sm text-[#1a1a2e]">{metric.value}/5</p>
                    </div>
                  ))}
                </div>

                {/* Review Text */}
                <div className="bg-[#f8f9fc] rounded-lg p-3">
                  <p className="text-xs text-[#64748b] leading-relaxed">{rating.review}</p>
                </div>

                {rating.adminNotes && (
                  <div className="mt-2 flex items-start gap-2 bg-[#fef3c7] border border-[#fde68a] rounded-lg p-2">
                    <MessageSquare size={12} className="text-[#f59e0b] mt-0.5 shrink-0" />
                    <p className="text-xs text-[#92400e]">
                      <span className="font-medium">Admin Note:</span> {rating.adminNotes}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
        {filteredRatings.length > ROWS_PER_PAGE && (
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredRatings.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="ratings" tableFooter={false} />
        )}
      </div>

      {/* Rating Modal */}
      <AnimatePresence>
        {showRatingModal && selectedCollab && (
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
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <ImageWithFallback
                    src={selectedCollab.influencerPhoto}
                    alt={selectedCollab.influencerName}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div>
                    <h2 className="text-lg text-[#1a1a2e]">Rate {selectedCollab.influencerName}</h2>
                    <p className="text-sm text-[#64748b]">{selectedCollab.campaignName}</p>
                  </div>
                </div>
                <button onClick={() => setShowRatingModal(false)} className="text-[#94a3b8] hover:text-[#64748b]">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitRating} className="p-6 space-y-5">
                <div className="bg-[#f8f9fc] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp size={16} className="text-[#2F6BFF]" />
                    <p className="text-sm text-[#1a1a2e]">Rate Your Experience</p>
                  </div>
                  <p className="text-xs text-[#64748b]">
                    Your honest feedback helps other brands make informed decisions and encourages quality collaborations.
                  </p>
                </div>

                <div className="space-y-4">
                  <RatingStars
                    category="Communication"
                    value={ratingData.communication}
                    onChange={(val) => setRatingData({ ...ratingData, communication: val })}
                  />
                  <RatingStars
                    category="Content Quality"
                    value={ratingData.contentQuality}
                    onChange={(val) => setRatingData({ ...ratingData, contentQuality: val })}
                  />
                  <RatingStars
                    category="Timeliness"
                    value={ratingData.timeliness}
                    onChange={(val) => setRatingData({ ...ratingData, timeliness: val })}
                  />
                  <RatingStars
                    category="Professionalism"
                    value={ratingData.professionalism}
                    onChange={(val) => setRatingData({ ...ratingData, professionalism: val })}
                  />
                </div>

                <div>
                  <label className="text-sm text-[#64748b] mb-2 block">Your Review</label>
                  <textarea
                    value={ratingData.review}
                    onChange={(e) => setRatingData({ ...ratingData, review: e.target.value })}
                    placeholder="Share your experience working with this influencer..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] resize-none"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRatingModal(false)}
                    className="flex-1 py-3 bg-[#f8f9fc] text-[#64748b] rounded-xl hover:bg-[#e2e8f0] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#2F6BFF]/25"
                  >
                    <Check size={16} />
                    Submit Rating
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}