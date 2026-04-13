import React from "react";
import { type TestimonialData } from "../../data/mock-data";
import { getTestimonials, addTestimonial, updateTestimonial, deleteTestimonial, approveTestimonial, rejectTestimonial } from "../../utils/dataManager";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { exportToCSV } from "../../utils/export-csv";
import { Pagination } from "../../components/Pagination";
import { useState, useEffect } from "react";
import {
  Plus, Download, Star, Eye, EyeOff, Edit2, Trash2, X,
  MessageSquare, Quote, Clock, User, CheckCircle, XCircle,
} from "lucide-react";

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialData | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [formData, setFormData] = useState<Partial<TestimonialData>>({
    name: "",
    role: "",
    company: "",
    quote: "",
    avatar: "",
    type: "brand",
    rating: 5,
    status: "active",
    featured: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(testimonials.length / ROWS_PER_PAGE));
  const pagedTestimonials = testimonials.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  useEffect(() => {
    setTestimonials(getTestimonials());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTestimonial) {
      // Update existing testimonial
      const updatedTestimonial = { ...editingTestimonial, ...formData };
      console.log("✏️ Updating testimonial:", updatedTestimonial);
      setTestimonials(
        testimonials.map((t) => (t.id === editingTestimonial.id ? updatedTestimonial : t))
      );
      updateTestimonial(editingTestimonial.id, updatedTestimonial);
      toast.success("Testimonial updated successfully!");
    } else {
      // Add new testimonial
      const newTestimonial: TestimonialData = {
        id: `t${Date.now()}`,
        name: formData.name || "",
        role: formData.role || "",
        company: formData.company,
        quote: formData.quote || "",
        avatar: formData.avatar || formData.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "??",
        type: formData.type || "brand",
        rating: formData.rating || 5,
        status: formData.status || "active",
        featured: formData.featured || false,
        createdDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };
      console.log("➕ Adding new testimonial:", newTestimonial);
      console.log("📋 Will appear on homepage?", newTestimonial.status === "active" && newTestimonial.featured);
      setTestimonials([...testimonials, newTestimonial]);
      addTestimonial(newTestimonial);
      toast.success("New testimonial added successfully!");
    }
    handleCloseModal();
  };

  const handleEdit = (testimonial: TestimonialData) => {
    setEditingTestimonial(testimonial);
    setFormData(testimonial);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this testimonial?")) {
      setTestimonials(testimonials.filter((t) => t.id !== id));
      deleteTestimonial(id);
      toast.success("Testimonial deleted successfully!");
    }
  };

  const handleToggleStatus = (id: string) => {
    const current = testimonials.find((t) => t.id === id);
    if (current) {
      const newStatus = current.status === "active" ? "inactive" as const : "active" as const;
      const updates: Partial<TestimonialData> = { status: newStatus };
      // When setting to inactive, also disable featured
      if (newStatus === "inactive" && current.featured) {
        updates.featured = false;
      }
      updateTestimonial(id, updates);
      setTestimonials(getTestimonials());
      toast.success(
        newStatus === "inactive" && current.featured
          ? "Testimonial deactivated and removed from featured!"
          : "Testimonial status updated!"
      );
    }
  };

  const handleToggleFeatured = (id: string) => {
    const current = testimonials.find((t) => t.id === id);
    if (current) {
      // Prevent featuring an inactive testimonial
      if (current.status === "inactive" && !current.featured) {
        toast.error("Cannot feature an inactive testimonial. Activate it first.");
        return;
      }
      updateTestimonial(id, { featured: !current.featured });
      setTestimonials(getTestimonials());
      toast.success(current.featured ? "Removed from featured" : "Added to featured!");
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTestimonial(null);
    setFormData({
      name: "",
      role: "",
      company: "",
      quote: "",
      avatar: "",
      type: "brand",
      rating: 5,
      status: "active",
      featured: false,
    });
  };

  const handleExport = () => {
    const exportData = testimonials.map((testimonial) => ({
      Name: testimonial.name,
      Role: testimonial.role,
      Company: testimonial.company || "N/A",
      Quote: testimonial.quote,
      Rating: testimonial.rating || "N/A",
      Status: testimonial.status,
      Featured: testimonial.featured ? "Yes" : "No",
      "Created Date": testimonial.createdDate,
    }));
    exportToCSV(exportData, "testimonials");
    toast.success("Testimonials exported successfully!");
  };

  const handleApprove = (id: string) => {
    approveTestimonial(id);
    setTestimonials(getTestimonials());
    toast.success("Testimonial approved! It's now active.");
  };

  const handleReject = (id: string) => {
    rejectTestimonial(id, rejectionReason || "Does not meet our guidelines");
    setTestimonials(getTestimonials());
    setShowRejectModal(null);
    setRejectionReason("");
    toast.success("Testimonial rejected.");
  };

  const activeTestimonials = testimonials.filter((t) => t.status === "active");
  const featuredTestimonials = testimonials.filter((t) => t.featured);
  const homepageTestimonials = testimonials.filter((t) => t.status === "active" && t.featured);
  const pendingSubmissions = testimonials.filter((t) => t.submissionStatus === "pending");
  const userSubmitted = testimonials.filter((t) => !!t.submittedBy);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl text-[#1a1a2e]">Testimonials Management</h1>
            <p className="text-sm text-[#64748b] mt-1">Manage customer testimonials and reviews</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleExport}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#64748b] rounded-xl hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF] transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#2F6BFF]/25 text-sm whitespace-nowrap"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Testimonial</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-[#EBF2FF] border border-[#2F6BFF]/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Star size={18} className="text-[#2F6BFF] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-[#1a1a2e]">
                <strong>{homepageTestimonials.length} testimonial{homepageTestimonials.length !== 1 ? 's' : ''}</strong> will appear on the homepage
              </p>
              <p className="text-xs text-[#64748b] mt-1">
                Only testimonials that are both <strong>Active</strong> and <strong>Featured</strong> will be displayed on the homepage. All <strong>Active</strong> testimonials (regardless of Featured) appear on the <strong>About</strong> page carousel.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare size={20} className="text-[#2F6BFF]" />
              <span className="text-xs text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-full">Total</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-1">{testimonials.length}</p>
            <p className="text-sm text-[#64748b]">Total Testimonials</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-2">
              <Star size={20} className="text-[#f59e0b]" />
              <span className="text-xs text-[#f59e0b] bg-[#fef3c7] px-2 py-0.5 rounded-full">Featured</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-1">{featuredTestimonials.length}</p>
            <p className="text-sm text-[#64748b]">Featured on Homepage</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-2">
              <Eye size={20} className="text-[#10b981]" />
              <span className="text-xs text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-full">Active</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-1">{activeTestimonials.length}</p>
            <p className="text-sm text-[#64748b]">Active Testimonials</p>
          </div>
        </div>

        {/* Pending Submissions from Users */}
        {pendingSubmissions.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-[#f59e0b]/30">
            <div className="px-6 py-4 border-b border-[#f59e0b]/20 bg-[#fffbeb]/50 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#fffbeb] flex items-center justify-center">
                  <Clock size={16} className="text-[#f59e0b]" />
                </div>
                <div>
                  <h3 className="text-sm text-[#1a1a2e]">Pending Submissions</h3>
                  <p className="text-xs text-[#64748b]">{pendingSubmissions.length} testimonial{pendingSubmissions.length !== 1 ? "s" : ""} awaiting your review</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs bg-[#f59e0b] text-white">
                {pendingSubmissions.length} Pending
              </span>
            </div>
            <div className="divide-y divide-[#e2e8f0]">
              {pendingSubmissions.map((t) => (
                <div key={t.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm shrink-0"
                      style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
                    >
                      {t.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-[#1a1a2e]">{t.name}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                          t.type === "influencer"
                            ? "bg-[#f5f3ff] text-[#8b5cf6]"
                            : "bg-[#EBF2FF] text-[#2F6BFF]"
                        }`}>
                          <User size={9} />
                          {t.type === "influencer" ? "Creator" : "Brand"}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#fffbeb] text-[#f59e0b]">
                          <Clock size={9} />
                          Pending
                        </span>
                      </div>
                      <p className="text-xs text-[#94a3b8] mb-2">{t.role} {t.company ? `at ${t.company}` : ""}</p>
                      <div className="bg-[#f8f9fc] rounded-xl p-4 mb-3 border border-[#e2e8f0]">
                        <Quote size={14} className="text-[#2F6BFF]/20 mb-1" />
                        <p className="text-sm text-[#64748b] leading-relaxed">{t.quote}</p>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={13}
                              className={s <= (t.rating || 0) ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#e2e8f0]"}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[#94a3b8]">Submitted {t.createdDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(t.id)}
                          className="px-4 py-2 bg-[#10b981] text-white rounded-lg text-xs hover:bg-[#059669] transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => { setShowRejectModal(t.id); setRejectionReason(""); }}
                          className="px-4 py-2 bg-white border border-[#ef4444]/30 text-[#ef4444] rounded-lg text-xs hover:bg-[#fef2f2] transition-colors flex items-center gap-1.5"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                        <button
                          onClick={() => handleEdit(t)}
                          className="px-4 py-2 bg-white border border-[#e2e8f0] text-[#64748b] rounded-lg text-xs hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF] transition-colors flex items-center gap-1.5"
                        >
                          <Edit2 size={14} />
                          Edit & Approve
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testimonials List */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8f9fc] border-b border-[#e2e8f0]">
                <tr>
                  <th className="text-left px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Author</th>
                  <th className="text-left px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Testimonial</th>
                  <th className="text-left px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Rating</th>
                  <th className="text-left px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Source</th>
                  <th className="text-left px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Featured</th>
                  <th className="text-left px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Date</th>
                  <th className="text-right px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {pagedTestimonials.map((testimonial) => (
                  <tr key={testimonial.id} className="hover:bg-[#f8f9fc] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm shrink-0"
                          style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
                        >
                          {testimonial.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#1a1a2e] truncate">{testimonial.name}</p>
                          <p className="text-xs text-[#94a3b8] truncate">
                            {testimonial.role}
                            {testimonial.company && `, ${testimonial.company}`}
                            <span className={`ml-1.5 inline-flex px-1.5 py-[1px] rounded-full text-[10px] ${
                              testimonial.type === "influencer"
                                ? "bg-[#f5f3ff] text-[#8b5cf6]"
                                : "bg-[#EBF2FF] text-[#2F6BFF]"
                            }`}>
                              {testimonial.type === "influencer" ? "Creator" : "Brand"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <div className="relative">
                        <Quote size={14} className="absolute -left-1 -top-1 text-[#2F6BFF]/20" />
                        <p className="text-sm text-[#64748b] line-clamp-2 pl-3">{testimonial.quote}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {testimonial.rating ? (
                        <div className="flex items-center gap-1">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} size={14} className="fill-[#f59e0b] text-[#f59e0b]" />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-[#94a3b8]">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {testimonial.submittedBy ? (
                        <span className="text-xs text-[#64748b]">User Submission</span>
                      ) : (
                        <span className="text-xs text-[#64748b]">Admin</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(testimonial.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 ${
                          testimonial.status === "active"
                            ? "bg-[#ecfdf5] text-[#10b981]"
                            : "bg-[#fef2f2] text-[#ef4444]"
                        }`}
                      >
                        {testimonial.status === "active" ? <Eye size={12} /> : <EyeOff size={12} />}
                        {testimonial.status}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleFeatured(testimonial.id)}
                        disabled={testimonial.status === "inactive"}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 ${
                          testimonial.status === "inactive"
                            ? "bg-[#f8f9fc] text-[#d1d5db] cursor-not-allowed opacity-50"
                            : testimonial.featured ? "bg-[#fef3c7] text-[#f59e0b]" : "bg-[#f8f9fc] text-[#94a3b8]"
                        }`}
                        title={testimonial.status === "inactive" ? "Activate testimonial first to feature it" : ""}
                      >
                        <Star size={12} fill={testimonial.featured ? "currentColor" : "none"} />
                        {testimonial.featured ? "Featured" : "Not Featured"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#64748b]">{testimonial.createdDate}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(testimonial)}
                          className="p-2 text-[#2F6BFF] hover:bg-[#EBF2FF] rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(testimonial.id)}
                          className="p-2 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={testimonials.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="testimonials" />
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
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
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-xl text-[#1a1a2e]">
                  {editingTestimonial ? "Edit" : "Add New"} Testimonial
                </h2>
                <button onClick={handleCloseModal} className="text-[#94a3b8] hover:text-[#64748b]">
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ravi Kumar"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Role *</label>
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="e.g. Marketing Head"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Company (Optional)</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="e.g. StyleCraft"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Avatar Initials</label>
                    <input
                      type="text"
                      value={formData.avatar}
                      onChange={(e) => setFormData({ ...formData, avatar: e.target.value.toUpperCase() })}
                      placeholder="RK"
                      maxLength={2}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">Profile Type *</label>
                  <select
                    value={formData.type || "brand"}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as "brand" | "influencer" })}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                  >
                    <option value="brand">Brand</option>
                    <option value="influencer">Influencer / Creator</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">Testimonial Quote *</label>
                  <textarea
                    value={formData.quote}
                    onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                    placeholder="Write the testimonial message here..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Rating (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as "active" | "inactive";
                        const updates: Partial<TestimonialData> = { status: newStatus };
                        if (newStatus === "inactive") {
                          updates.featured = false;
                        }
                        setFormData({ ...formData, ...updates });
                      }}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className={`flex items-center gap-2 px-4 py-3 ${formData.status === "inactive" ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                        disabled={formData.status === "inactive"}
                        className="w-4 h-4 rounded border-[#e2e8f0] text-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/20 disabled:opacity-50"
                      />
                      <span className="text-sm text-[#64748b]">Featured</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-3 bg-[#f8f9fc] text-[#64748b] rounded-xl hover:bg-[#e2e8f0] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors shadow-lg shadow-[#2F6BFF]/25"
                  >
                    {editingTestimonial ? "Update Testimonial" : "Add Testimonial"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
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
              className="bg-white rounded-2xl max-w-md w-full"
            >
              <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center">
                    <XCircle size={20} className="text-[#ef4444]" />
                  </div>
                  <div>
                    <h2 className="text-[#1a1a2e]">Reject Testimonial</h2>
                    <p className="text-xs text-[#64748b]">Provide a reason for the rejection</p>
                  </div>
                </div>
                <button onClick={() => setShowRejectModal(null)} className="text-[#94a3b8] hover:text-[#64748b]">
                  <X size={22} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Content doesn't meet our guidelines, too short, promotional content..."
                    rows={3}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/20 focus:border-[#ef4444] resize-none text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowRejectModal(null)}
                    className="flex-1 px-4 py-3 bg-[#f8f9fc] text-[#64748b] rounded-xl hover:bg-[#e2e8f0] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReject(showRejectModal)}
                    className="flex-1 px-4 py-3 bg-[#ef4444] text-white rounded-xl hover:bg-[#dc2626] transition-colors shadow-lg shadow-[#ef4444]/25"
                  >
                    Reject Testimonial
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}