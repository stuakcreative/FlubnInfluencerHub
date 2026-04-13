import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Star,
  Search,
  Filter,
  Edit2,
  Trash2,
  Check,
  X,
  MessageSquare,
  Clock,
  Award,
  Target,
  Download,
  Eye,
  AlertCircle,
} from "lucide-react";
import { RATINGS, type Rating } from "../../data/mock-data";
import { toast } from "sonner";
import { exportToCSV } from "../../utils/export-csv";
import { Pagination } from "../../components/Pagination";

export default function AdminRatings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState<"approved" | "pending" | "rejected">("approved");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const filteredRatings = RATINGS.filter((rating) => {
    const matchesSearch =
      rating.influencerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rating.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rating.campaignName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || rating.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  // Smooth scroll to top on page change
  useEffect(() => {
    if (currentPage > 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRatings.length / ROWS_PER_PAGE));
  const paged = filteredRatings.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handleEdit = (rating: Rating) => {
    setSelectedRating(rating);
    setAdminNotes(rating.adminNotes || "");
    setNewStatus(rating.status);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    toast.success("Rating updated successfully", {
      description: `Status changed to ${newStatus}`,
    });
    setShowEditModal(false);
    setSelectedRating(null);
  };

  const handleDelete = (id: string, influencerName: string) => {
    if (confirm(`Delete rating for ${influencerName}? This action cannot be undone.`)) {
      toast.success("Rating deleted successfully");
    }
  };

  const handleApprove = (id: string, influencerName: string) => {
    toast.success(`Rating approved for ${influencerName}`);
  };

  const handleReject = (id: string, influencerName: string) => {
    toast.success(`Rating rejected for ${influencerName}`);
  };

  const handleExportCSV = () => {
    const dataToExport = filteredRatings.map((r) => ({
      ID: r.id,
      Influencer: r.influencerName,
      Brand: r.brandName,
      Campaign: r.campaignName,
      Communication: r.communication,
      "Content Quality": r.contentQuality,
      Timeliness: r.timeliness,
      Professionalism: r.professionalism,
      "Overall Rating": r.overallRating,
      Review: r.review,
      Status: r.status,
      Date: r.createdDate,
      "Admin Notes": r.adminNotes || "",
    }));
    exportToCSV(dataToExport, `ratings-${new Date().toISOString().split("T")[0]}`);
  };

  const stats = {
    total: RATINGS.length,
    approved: RATINGS.filter((r) => r.status === "approved").length,
    pending: RATINGS.filter((r) => r.status === "pending").length,
    rejected: RATINGS.filter((r) => r.status === "rejected").length,
    avgRating: (RATINGS.reduce((sum, r) => sum + r.overallRating, 0) / RATINGS.length).toFixed(1),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Rating Management</h1>
        <p className="text-[#64748b] mt-1">
          Moderate and manage all brand ratings and reviews
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Ratings", value: stats.total, color: "#2F6BFF", icon: Star },
          { label: "Approved", value: stats.approved, color: "#10b981", icon: Check },
          { label: "Pending", value: stats.pending, color: "#f59e0b", icon: Clock },
          { label: "Rejected", value: stats.rejected, color: "#ef4444", icon: X },
          { label: "Avg Rating", value: stats.avgRating, color: "#8b5cf6", icon: Award },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#e2e8f0] p-4"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: `${stat.color}15` }}
            >
              <stat.icon size={20} style={{ color: stat.color }} />
            </div>
            <p className="text-2xl text-[#1a1a2e]">{stat.value}</p>
            <p className="text-xs text-[#94a3b8] mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search by influencer, brand, or campaign..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="pl-10 pr-8 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors flex items-center gap-2 text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ratings Table */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f8f9fc] border-b border-[#e2e8f0]">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-[#64748b] uppercase tracking-wider">Influencer</th>
                <th className="text-left px-4 py-3 text-xs text-[#64748b] uppercase tracking-wider">Brand</th>
                <th className="text-left px-4 py-3 text-xs text-[#64748b] uppercase tracking-wider">Campaign</th>
                <th className="text-left px-4 py-3 text-xs text-[#64748b] uppercase tracking-wider">Rating</th>
                <th className="text-left px-4 py-3 text-xs text-[#64748b] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs text-[#64748b] uppercase tracking-wider">Date</th>
                <th className="text-right px-4 py-3 text-xs text-[#64748b] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Star size={40} className="text-[#e2e8f0] mb-3" />
                      <p className="text-[#64748b]">No ratings found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((rating) => (
                  <tr key={rating.id} className="hover:bg-[#f8f9fc] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm text-[#1a1a2e]">{rating.influencerName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[#64748b]">{rating.brandName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[#64748b] max-w-[200px] truncate">{rating.campaignName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={s <= Math.round(rating.overallRating) ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#e2e8f0]"}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[#64748b]">{rating.overallRating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs ${
                          rating.status === "approved"
                            ? "bg-[#d1fae5] text-[#10b981]"
                            : rating.status === "pending"
                            ? "bg-[#fef3c7] text-[#f59e0b]"
                            : "bg-[#fee2e2] text-[#ef4444]"
                        }`}
                      >
                        {rating.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-[#94a3b8]">{rating.createdDate}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {rating.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(rating.id, rating.influencerName)}
                              className="p-1.5 text-[#10b981] hover:bg-[#d1fae5] rounded-lg transition-colors"
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleReject(rating.id, rating.influencerName)}
                              className="p-1.5 text-[#ef4444] hover:bg-[#fee2e2] rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEdit(rating)}
                          className="p-1.5 text-[#2F6BFF] hover:bg-[#EBF2FF] rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(rating.id, rating.influencerName)}
                          className="p-1.5 text-[#ef4444] hover:bg-[#fee2e2] rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredRatings.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="ratings" />
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedRating && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between">
              <h2 className="text-lg text-[#1a1a2e]">Manage Rating</h2>
              <button onClick={() => setShowEditModal(false)} className="text-[#94a3b8] hover:text-[#64748b]">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Rating Details */}
              <div className="bg-[#f8f9fc] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#1a1a2e]">{selectedRating.influencerName}</p>
                    <p className="text-xs text-[#94a3b8]">rated by {selectedRating.brandName}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star size={16} className="fill-[#f59e0b] text-[#f59e0b]" />
                    <span className="text-sm text-[#1a1a2e]">{selectedRating.overallRating.toFixed(1)}/5</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Comm.", value: selectedRating.communication, icon: MessageSquare },
                    { label: "Quality", value: selectedRating.contentQuality, icon: Award },
                    { label: "Time", value: selectedRating.timeliness, icon: Clock },
                    { label: "Prof.", value: selectedRating.professionalism, icon: Target },
                  ].map((metric) => (
                    <div key={metric.label} className="bg-white rounded-lg p-2 text-center">
                      <metric.icon size={12} className="text-[#64748b] mx-auto mb-1" />
                      <p className="text-xs text-[#94a3b8]">{metric.label}</p>
                      <p className="text-sm text-[#1a1a2e]">{metric.value}/5</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-[#64748b] leading-relaxed">{selectedRating.review}</p>
                </div>
              </div>

              {/* Status Control */}
              <div>
                <label className="text-sm text-[#64748b] mb-2 block">Rating Status</label>
                <div className="flex gap-2">
                  {(["approved", "pending", "rejected"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setNewStatus(status)}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm transition-all ${
                        newStatus === status
                          ? status === "approved"
                            ? "bg-[#d1fae5] text-[#10b981] border-2 border-[#10b981]"
                            : status === "pending"
                            ? "bg-[#fef3c7] text-[#f59e0b] border-2 border-[#f59e0b]"
                            : "bg-[#fee2e2] text-[#ef4444] border-2 border-[#ef4444]"
                          : "bg-[#f8f9fc] text-[#64748b] border-2 border-transparent hover:border-[#e2e8f0]"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="text-sm text-[#64748b] mb-2 block">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this rating..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] resize-none text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-[#f8f9fc] text-[#64748b] rounded-xl hover:bg-[#e2e8f0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2.5 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}