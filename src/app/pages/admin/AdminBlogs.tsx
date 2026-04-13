import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Plus, Edit, Trash2, Eye, X, Save, Download, RotateCcw,
  FileText, Star, StarOff, Image as ImageIcon, AlignLeft,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { exportToCSV } from "../../utils/export-csv";
import { CategoryCombobox } from "../../components/CategoryCombobox";
import { Pagination } from "../../components/Pagination";
import {
  getBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  resetBlogPosts,
  type BlogPost,
} from "../../utils/blogStorage";

const CATEGORIES = ["Strategy", "Trends", "Tips", "Analytics", "Growth"];

const emptyForm: Omit<BlogPost, "id"> = {
  title: "",
  excerpt: "",
  content: "",
  image: "",
  category: "Strategy",
  author: "Flubn Team",
  date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  readTime: "5 min read",
  featured: false,
};

export default function AdminBlogs() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<Omit<BlogPost, "id">>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetDialog, setResetDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "featured">("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // Load from localStorage on mount
  useEffect(() => {
    setBlogs(getBlogPosts());
  }, []);

  // Dynamically build unique category list from live posts, preserving base order
  const allCategories = [
    "All",
    ...Array.from(
      new Set([...CATEGORIES, ...blogs.map((b) => b.category).filter(Boolean)])
    ),
  ];

  // Derived filtered list
  const filtered = blogs.filter((b) => {
    const matchTab = activeTab === "all" || b.featured;
    const matchCat = categoryFilter === "All" || b.category === categoryFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q);
    return matchTab && matchCat && matchSearch;
  });

  useEffect(() => { setCurrentPage(1); }, [search, categoryFilter, activeTab]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleDelete = (id: string) => {
    const updated = deleteBlogPost(id);
    setBlogs(updated);
    setDeleteId(null);
    toast.success("Blog post deleted");
  };

  const handleEdit = (blog: BlogPost) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      excerpt: blog.excerpt,
      content: blog.content ?? "",
      image: blog.image,
      category: blog.category,
      author: blog.author,
      date: blog.date,
      readTime: blog.readTime,
      featured: blog.featured,
    });
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingBlog(null);
    setFormData({
      ...emptyForm,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.excerpt.trim()) {
      toast.error("Title and excerpt are required");
      return;
    }
    let updated: BlogPost[];
    if (editingBlog) {
      // If marking as featured, unfeature all others first
      if (formData.featured) {
        const currentFeatured = blogs.find((b) => b.featured && b.id !== editingBlog.id);
        if (currentFeatured) updateBlogPost(currentFeatured.id, { featured: false });
      }
      updated = updateBlogPost(editingBlog.id, formData);
      toast.success("Blog post updated");
    } else {
      // If new post marked featured, unfeature all others first
      if (formData.featured) {
        const currentFeatured = blogs.find((b) => b.featured);
        if (currentFeatured) updateBlogPost(currentFeatured.id, { featured: false });
      }
      updated = createBlogPost(formData);
      toast.success("Blog post created");
    }
    setBlogs(updated);
    setShowModal(false);
  };

  const handleToggleFeatured = (blog: BlogPost) => {
    if (blog.featured) {
      // Clicking active featured → unfeature it
      const updated = updateBlogPost(blog.id, { featured: false });
      setBlogs(updated);
      toast.success("Removed from featured");
    } else {
      // Unfeature everyone, then feature this one
      const currentFeatured = blogs.find((b) => b.featured);
      let posts = blogs;
      if (currentFeatured) {
        posts = updateBlogPost(currentFeatured.id, { featured: false });
      }
      const updated = updateBlogPost(blog.id, { featured: true });
      setBlogs(updated);
      toast.success(`"${blog.title.slice(0, 40)}…" is now the featured post`);
    }
  };

  const handleReset = () => {
    const fresh = resetBlogPosts();
    setBlogs(fresh);
    setResetDialog(false);
    toast.success("Blog posts reset to defaults");
  };

  const handleExport = () => {
    const headers = ["Title", "Category", "Author", "Date", "Read Time", "Featured"];
    const rows = filtered.map((b) => [
      b.title, b.category, b.author, b.date, b.readTime, b.featured ? "Yes" : "No",
    ]);
    exportToCSV("blogs", headers, rows);
    toast.success(`Exported ${filtered.length} blog posts`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Blog Management</h1>
          <p className="text-[#64748b] text-sm mt-1">
            Create, edit and publish blog posts. Changes appear live on the website instantly.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#1a1a2e] rounded-xl flex items-center gap-2 hover:bg-[#f8f9fc] transition-colors text-sm"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            onClick={handleNew}
            className="px-4 py-2.5 bg-[#2F6BFF] text-white rounded-xl flex items-center gap-2 hover:bg-[#0F3D91] transition-colors text-sm"
          >
            <Plus size={16} />
            New Post
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Posts", value: blogs.length, color: "#2F6BFF", bg: "#EBF2FF" },
          { label: "Featured", value: blogs.filter((b) => b.featured).length, color: "#f59e0b", bg: "#fffbeb" },
          { label: "With Content", value: blogs.filter((b) => b.content?.trim()).length, color: "#10b981", bg: "#ecfdf5" },
        ].map((s) => (
          <div key={s.label} className="w-full bg-white border border-[#e2e8f0] rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
              <FileText size={16} style={{ color: s.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#94a3b8] text-xs">{s.label}</p>
              <p className="text-[#1a1a2e] text-xl">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3">
        {/* Tab + Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl p-1">
            {(["all", "featured"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3.5 py-1.5 rounded-lg text-sm transition-all capitalize ${
                  activeTab === t
                    ? "bg-white text-[#1a1a2e] shadow-sm border border-[#e2e8f0]"
                    : "text-[#64748b] hover:text-[#1a1a2e]"
                }`}
              >
                {t === "all" ? `All (${blogs.length})` : `Featured (${blogs.filter((b) => b.featured).length})`}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, category or author…"
              className="w-full pl-4 pr-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            />
          </div>
        </div>
        {/* Category chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-all border ${
                categoryFilter === cat
                  ? "bg-[#2F6BFF] text-white border-[#2F6BFF] shadow-sm"
                  : "bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2F6BFF]/40 hover:text-[#2F6BFF]"
              }`}
            >
              {cat}
              {cat !== "All" && (
                <span className="ml-1 opacity-60">
                  ({blogs.filter((b) => b.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-[#e2e8f0]">
                <th className="text-left px-5 py-4 text-xs text-[#64748b] uppercase tracking-wide">Title</th>
                <th className="text-left px-5 py-4 text-xs text-[#64748b] uppercase tracking-wide">Category</th>
                <th className="text-left px-5 py-4 text-xs text-[#64748b] uppercase tracking-wide hidden sm:table-cell">Date</th>
                <th className="text-left px-5 py-4 text-xs text-[#64748b] uppercase tracking-wide hidden md:table-cell">Content</th>
                <th className="text-left px-5 py-4 text-xs text-[#64748b] uppercase tracking-wide">Featured</th>
                <th className="text-right px-5 py-4 text-xs text-[#64748b] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-[#94a3b8] text-sm">
                    No blog posts found
                  </td>
                </tr>
              ) : (
                paged.map((blog) => (
                  <tr
                    key={blog.id}
                    className="hover:bg-[#f8f9fc] transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {blog.image ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[#f8f9fc] border border-[#e2e8f0]">
                            <img src={blog.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#f8f9fc] border border-[#e2e8f0] flex items-center justify-center shrink-0">
                            <ImageIcon size={14} className="text-[#94a3b8]" />
                          </div>
                        )}
                        <p className="text-[#1a1a2e] text-sm max-w-[220px] truncate">{blog.title}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-0.5 bg-[#EBF2FF] text-[#2F6BFF] rounded-full text-xs">
                        {blog.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#64748b] hidden sm:table-cell whitespace-nowrap">
                      {blog.date}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {blog.content?.trim() ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#10b981]">
                          <AlignLeft size={11} /> Written
                        </span>
                      ) : (
                        <span className="text-xs text-[#94a3b8]">Auto-generated</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleFeatured(blog)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          blog.featured
                            ? "text-[#f59e0b] bg-[#fffbeb] hover:bg-[#fef3c7]"
                            : "text-[#cbd5e1] hover:text-[#f59e0b] hover:bg-[#fffbeb]"
                        }`}
                        title={blog.featured ? "Remove from featured" : "Set as featured (replaces current)"}
                      >
                        <motion.span
                          key={blog.featured ? "starred" : "unstarred"}
                          initial={{ scale: 0.6, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className="inline-flex"
                        >
                          {blog.featured ? <Star size={14} /> : <StarOff size={14} />}
                        </motion.span>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => navigate(`/blog/${blog.id}`)}
                          className="p-2 text-[#64748b] hover:text-[#2F6BFF] hover:bg-[#EBF2FF] rounded-lg transition-colors"
                          title="View on website"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(blog)}
                          className="p-2 text-[#64748b] hover:text-[#2F6BFF] hover:bg-[#EBF2FF] rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(blog.id)}
                          className="p-2 text-[#64748b] hover:text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="posts" />
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
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
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
            >
              {/* Modal header */}
              <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-lg text-[#1a1a2e]">
                  {editingBlog ? "Edit Blog Post" : "Create New Blog Post"}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-[#94a3b8] hover:text-[#64748b]">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">
                    Title <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter blog post title"
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                    required
                  />
                </div>

                {/* Excerpt */}
                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">
                    Excerpt / Summary <span className="text-[#ef4444]">*</span>
                  </label>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    placeholder="A short description shown on the blog listing page"
                    rows={2}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] resize-none"
                    required
                  />
                </div>

                {/* Content body */}
                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">
                    Article Body{" "}
                    <span className="text-[#94a3b8] text-xs">(leave blank for auto-generated placeholder content)</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder={`Write the full article here. Supports basic markdown:\n\n## Section Heading\n\nParagraph text goes here.\n\n- Bullet point one\n- Bullet point two\n\n**Bold text** for emphasis.`}
                    rows={10}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] resize-y text-sm font-mono"
                  />
                </div>

                {/* Meta row 1 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Category</label>
                    <CategoryCombobox
                      value={formData.category}
                      onChange={(cat) => setFormData((prev) => ({ ...prev, category: cat }))}
                      suggestions={allCategories.filter((c) => c !== "All")}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Read Time</label>
                    <input
                      type="text"
                      value={formData.readTime}
                      onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                      placeholder="5 min read"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                    />
                  </div>
                </div>

                {/* Meta row 2 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Author</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="Flubn Team"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#64748b] mb-1.5 block">Date</label>
                    <input
                      type="text"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      placeholder="Mar 10, 2026"
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                    />
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">Cover Image URL</label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://images.unsplash.com/…"
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                  />
                  {formData.image && (
                    <div className="mt-2 rounded-xl overflow-hidden h-28 border border-[#e2e8f0]">
                      <img src={formData.image} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                </div>

                {/* Featured toggle */}
                <div className="flex items-start gap-3 p-4 bg-[#fffbeb] border border-[#fde68a] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
                      formData.featured ? "bg-[#f59e0b]" : "bg-[#e2e8f0]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                        formData.featured ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-sm text-[#92400e]">Mark as featured post</p>
                    <p className="text-xs text-[#b45309] mt-0.5">
                      Only one post can be featured at a time. Setting this will automatically unfeature{" "}
                      {blogs.find((b) => b.featured && b.id !== editingBlog?.id)
                        ? `"${blogs.find((b) => b.featured && b.id !== editingBlog?.id)!.title.slice(0, 30)}…"`
                        : "the current featured post"}
                      .
                    </p>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-[#e2e8f0] text-[#64748b] rounded-xl hover:bg-[#f8f9fc] transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#2F6BFF]/25 text-sm"
                  >
                    <Save size={15} />
                    {editingBlog ? "Save Changes" : "Publish Post"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Blog Post"
        description="Are you sure you want to delete this blog post? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      {/* Reset Confirmation */}
      <ConfirmDialog
        open={resetDialog}
        title="Reset Blog Posts"
        description="This will discard all your custom posts and restore the original 6 default articles. Are you sure?"
        confirmLabel="Reset"
        variant="danger"
        onConfirm={handleReset}
        onCancel={() => setResetDialog(false)}
      />
    </div>
  );
}