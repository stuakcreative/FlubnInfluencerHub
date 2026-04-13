import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Quote, Plus, Star, X, Clock, CheckCircle, XCircle,
  Send, AlertCircle, Sparkles, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { type TestimonialData } from "../../data/mock-data";
import {
  addTestimonial,
  getTestimonialsByUser,
} from "../../utils/dataManager";
import { Pagination } from "../../components/Pagination";

export default function InfluencerTestimonials() {
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  // Load user's testimonials
  const loadTestimonials = () => {
    if (user?.id) {
      const userTestimonials = getTestimonialsByUser(user.id);
      setTestimonials(userTestimonials);
    }
  };

  useEffect(() => {
    loadTestimonials();

    const handleUpdate = () => loadTestimonials();
    window.addEventListener("testimonialsUpdated", handleUpdate);
    return () => window.removeEventListener("testimonialsUpdated", handleUpdate);
  }, [user?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote.trim()) {
      toast.error("Please write your testimonial");
      return;
    }
    if (quote.trim().length < 20) {
      toast.error("Testimonial should be at least 20 characters");
      return;
    }

    const initials = user?.name
      ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "??";

    const newTestimonial: TestimonialData = {
      id: `t_user_${Date.now()}`,
      name: user?.name || "Anonymous",
      role: user?.category ? `${user.category} Creator` : "Content Creator",
      quote: quote.trim(),
      avatar: initials,
      profileImage: user?.profilePicture || "",
      type: "influencer",
      rating,
      status: "inactive", // Will be activated by admin upon approval
      featured: false,
      createdDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      submittedBy: user?.id || "",
      submissionStatus: "pending",
    };

    addTestimonial(newTestimonial);
    loadTestimonials();
    setQuote("");
    setRating(5);
    setShowSubmitModal(false);
    toast.success("Testimonial submitted for review! Admin will review it shortly.");
  };

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case "approved":
        return { icon: CheckCircle, label: "Approved", color: "text-[#10b981]", bg: "bg-[#ecfdf5]", border: "border-[#10b981]/20" };
      case "rejected":
        return { icon: XCircle, label: "Rejected", color: "text-[#ef4444]", bg: "bg-[#fef2f2]", border: "border-[#ef4444]/20" };
      case "pending":
      default:
        return { icon: Clock, label: "Pending Review", color: "text-[#f59e0b]", bg: "bg-[#fffbeb]", border: "border-[#f59e0b]/20" };
    }
  };

  const pendingCount = testimonials.filter((t) => t.submissionStatus === "pending").length;
  const approvedCount = testimonials.filter((t) => t.submissionStatus === "approved").length;
  const rejectedCount = testimonials.filter((t) => t.submissionStatus === "rejected").length;

  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  useEffect(() => { setCurrentPage(1); }, [testimonials.length]);
  const totalPages = Math.max(1, Math.ceil(testimonials.length / ROWS_PER_PAGE));
  const pagedTestimonials = testimonials.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-[#1a1a2e]">My Testimonials</h1>
            <p className="text-sm text-[#64748b] mt-1">
              Share your experience with Flubn and help others discover the platform
            </p>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2.5 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors flex items-center gap-2 shadow-lg shadow-[#2F6BFF]/25"
          >
            <Plus size={16} />
            Write Testimonial
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-[#EBF2FF] border border-[#2F6BFF]/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-[#2F6BFF] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-[#1a1a2e]">
                Your testimonial helps build trust on Flubn
              </p>
              <p className="text-xs text-[#64748b] mt-1">
                Share your genuine experience working with brands through our platform.
                All testimonials are reviewed by our team before being published on the homepage.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5">
            <div className="flex items-center justify-between mb-2">
              <Clock size={18} className="text-[#f59e0b]" />
              <span className="text-xs text-[#f59e0b] bg-[#fffbeb] px-2 py-0.5 rounded-full">Pending</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-0.5">{pendingCount}</p>
            <p className="text-sm text-[#64748b]">Awaiting Review</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle size={18} className="text-[#10b981]" />
              <span className="text-xs text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-full">Live</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-0.5">{approvedCount}</p>
            <p className="text-sm text-[#64748b]">Approved & Live</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare size={18} className="text-[#2F6BFF]" />
              <span className="text-xs text-[#2F6BFF] bg-[#EBF2FF] px-2 py-0.5 rounded-full">Total</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-0.5">{testimonials.length}</p>
            <p className="text-sm text-[#64748b]">Total Submitted</p>
          </div>
        </div>

        {/* Testimonials List */}
        {testimonials.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#EBF2FF] flex items-center justify-center mx-auto mb-4">
              <Quote size={28} className="text-[#2F6BFF]" />
            </div>
            <h3 className="text-[#1a1a2e] mb-2">No testimonials yet</h3>
            <p className="text-sm text-[#64748b] max-w-md mx-auto mb-6">
              Share your experience using Flubn! Your testimonial helps other creators
              and brands learn about the platform.
            </p>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-5 py-2.5 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Write Your First Testimonial
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pagedTestimonials.map((t) => {
              const statusConfig = getStatusConfig(t.submissionStatus);
              const StatusIcon = statusConfig.icon;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl border ${statusConfig.border} p-6`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm shrink-0"
                          style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
                        >
                          {t.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-[#1a1a2e]">{t.name}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${statusConfig.bg} ${statusConfig.color}`}>
                              <StatusIcon size={10} />
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-xs text-[#94a3b8]">{t.role}</p>
                        </div>
                      </div>

                      <div className="relative pl-3 mb-3">
                        <Quote size={14} className="absolute -left-0.5 -top-0.5 text-[#2F6BFF]/20" />
                        <p className="text-sm text-[#64748b] leading-relaxed">{t.quote}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={s <= (t.rating || 0) ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#e2e8f0]"}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[#94a3b8]">{t.createdDate}</span>
                        {t.featured && t.submissionStatus === "approved" && (
                          <span className="text-xs text-[#f59e0b] bg-[#fffbeb] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star size={10} fill="currentColor" />
                            Featured on Homepage
                          </span>
                        )}
                      </div>

                      {t.submissionStatus === "rejected" && t.rejectionReason && (
                        <div className="mt-3 p-3 bg-[#fef2f2] rounded-lg border border-[#ef4444]/10">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={14} className="text-[#ef4444] mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-[#ef4444]">Rejection reason:</p>
                              <p className="text-xs text-[#64748b] mt-0.5">{t.rejectionReason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {testimonials.length > ROWS_PER_PAGE && (
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={testimonials.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="testimonials" tableFooter={false} />
        )}
      </div>

      {/* Submit Testimonial Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full"
            >
              <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
                    <Quote size={20} className="text-[#2F6BFF]" />
                  </div>
                  <div>
                    <h2 className="text-[#1a1a2e]">Write a Testimonial</h2>
                    <p className="text-xs text-[#64748b]">Share your Flubn experience</p>
                  </div>
                </div>
                <button onClick={() => setShowSubmitModal(false)} className="text-[#94a3b8] hover:text-[#64748b]">
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Preview Card */}
                <div className="bg-[#f8f9fc] rounded-xl p-4 border border-[#e2e8f0]">
                  <p className="text-xs text-[#94a3b8] mb-2">Posting as</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs"
                      style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
                    >
                      {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                    </div>
                    <div>
                      <p className="text-sm text-[#1a1a2e]">{user?.name || "Your Name"}</p>
                      <p className="text-xs text-[#94a3b8]">
                        {user?.category ? `${user.category} Creator` : "Content Creator"}
                      </p>
                    </div>
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-[#f5f3ff] text-[#8b5cf6]">
                      Creator
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="text-sm text-[#64748b] mb-2 block">How would you rate Flubn?</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(s)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          size={28}
                          className={`transition-colors ${
                            s <= (hoverRating || rating)
                              ? "fill-[#f59e0b] text-[#f59e0b]"
                              : "text-[#e2e8f0]"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-3 text-sm text-[#64748b]">
                      {rating === 5 ? "Excellent!" : rating === 4 ? "Great!" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Poor"}
                    </span>
                  </div>
                </div>

                {/* Quote */}
                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">Your Experience *</label>
                  <textarea
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                    placeholder="Tell us about your experience using Flubn. How has it helped you connect with brands, manage collaborations, or grow as a creator?"
                    rows={5}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] resize-none text-sm"
                    required
                  />
                  <p className="text-xs text-[#94a3b8] mt-1">
                    {quote.length}/500 characters {quote.length < 20 && quote.length > 0 && "(minimum 20)"}
                  </p>
                </div>

                {/* Notice */}
                <div className="flex items-start gap-2 p-3 bg-[#fffbeb] rounded-lg border border-[#f59e0b]/10">
                  <AlertCircle size={14} className="text-[#f59e0b] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#64748b]">
                    Your testimonial will be reviewed by our team before being published.
                    You'll be notified once it's approved.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="flex-1 px-4 py-3 bg-[#f8f9fc] text-[#64748b] rounded-xl hover:bg-[#e2e8f0] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors shadow-lg shadow-[#2F6BFF]/25 flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    Submit for Review
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}