import { Search, CheckCircle, Ban, MapPin, Users, Download, Star, ShieldCheck, Trash2, PlayCircle, BadgeCheck, Filter, ChevronDown } from "lucide-react";
import { getInfluencers, updateInfluencer, toggleInfluencerFeatured, toggleInfluencerVerified, deleteInfluencer } from "../../utils/dataManager";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { exportToCSV } from "../../utils/export-csv";
import { Pagination } from "../../components/Pagination";
import { useState, useEffect } from "react";
import { motion } from "motion/react";

export default function AdminInfluencers() {
  const [influencers, setInfluencers] = useState(getInfluencers());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState<{
    infId: string;
    type: "suspend" | "reactivate" | "delete";
  } | null>(null);

  // Listen for influencers updates
  useEffect(() => {
    const handleInfluencersUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setInfluencers(customEvent.detail || getInfluencers());
    };

    window.addEventListener("influencersUpdated", handleInfluencersUpdate);
    return () => {
      window.removeEventListener("influencersUpdated", handleInfluencersUpdate);
    };
  }, []);

  const categories = Array.from(new Set(influencers.map((inf) => inf.category))).sort();

  const filtered = influencers.filter((inf) => {
    const matchSearch =
      inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || inf.status === statusFilter;
    const matchCategory = categoryFilter === "all" || inf.category === categoryFilter;
    const matchVerified = verifiedFilter === "all" || (verifiedFilter === "yes" ? inf.isVerified : !inf.isVerified);
    const matchFeatured = featuredFilter === "all" || (featuredFilter === "yes" ? inf.isFeatured : !inf.isFeatured);
    return matchSearch && matchStatus && matchCategory && matchVerified && matchFeatured;
  });

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, categoryFilter, verifiedFilter, featuredFilter]);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handleAction = () => {
    if (!confirmAction) return;
    const inf = influencers.find((i) => i.id === confirmAction.infId);

    if (confirmAction.type === "delete") {
      deleteInfluencer(confirmAction.infId, inf?.email);
      setInfluencers(getInfluencers());
      toast.success(`${inf?.name} has been permanently deleted`);
      setConfirmAction(null);
      return;
    }

    updateInfluencer(confirmAction.infId, {
      status: confirmAction.type === "suspend" ? "suspended" : "active",
    });
    if (confirmAction.type === "suspend") {
      toast.error(`${inf?.name} has been suspended`);
    } else {
      toast.success(`${inf?.name} has been reactivated`);
    }
    setConfirmAction(null);
  };

  const formatFollowers = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Influencer Management</h1>
          <p className="text-[#64748b] text-sm mt-1">
            Approve and manage influencer profiles.
            <span className="ml-2 inline-flex items-center gap-1 text-[#2F6BFF]">
              <BadgeCheck size={11} />
              {influencers.filter((i) => i.isVerified).length} verified
            </span>
            <span className="ml-2 inline-flex items-center gap-1 text-[#f59e0b]">
              <Star size={11} className="fill-[#f59e0b]" />
              {influencers.filter((i) => i.isFeatured).length} featured
            </span>
          </p>
        </div>
        <button
          onClick={() => {
            const headers = ["Name", "Category", "Location", "Followers", "Collabs Starting At", "Status"];
            const rows = filtered.map((inf) => [
              inf.name, inf.category, inf.location, `${inf.followers}`, `${inf.ratePerPost}`, inf.status,
            ]);
            exportToCSV("influencers", headers, rows);
            toast.success(`Exported ${filtered.length} influencers`);
          }}
          className="px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#1a1a2e] rounded-xl flex items-center gap-2 hover:bg-[#f8f9fc] transition-colors text-sm"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search influencers..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[14px] text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[#64748b]">
          <Filter size={15} />
        </div>
        <div className="flex gap-1 bg-white border border-[#e2e8f0] rounded-xl p-1">
          {["all", "active", "suspended"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                statusFilter === status
                  ? "bg-[#2F6BFF] text-white"
                  : "text-[#64748b] hover:bg-[#f8f9fc]"
              }`}
            >
              {status === "all" ? "All" : status}
            </button>
          ))}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 cursor-pointer"
        >
          <option value="all">All Verified</option>
          <option value="yes">Verified</option>
          <option value="no">Not Verified</option>
        </select>
        <select
          value={featuredFilter}
          onChange={(e) => setFeaturedFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 cursor-pointer"
        >
          <option value="all">All Featured</option>
          <option value="yes">Featured</option>
          <option value="no">Not Featured</option>
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paged.map((inf) => (
          <motion.div
            key={inf.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="w-full flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
              <ImageWithFallback
                src={inf.photo}
                alt={inf.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover object-center shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[#1a1a2e] truncate">{inf.name}</p>
                  {inf.isVerified && (
                    <BadgeCheck
                      size={14}
                      strokeWidth={2.5}
                      className="text-[#2F6BFF] shrink-0"
                      style={{ filter: "drop-shadow(0 0 3px rgba(47,107,255,0.4))" }}
                    />
                  )}
                  {inf.isFeatured && (
                    <Star size={12} className="text-[#f59e0b] fill-[#f59e0b] shrink-0" />
                  )}
                </div>
                <p className="text-sm text-[#2F6BFF]">{inf.category}</p>
                <div className="flex items-center gap-3 text-xs text-[#94a3b8] mt-1">
                  <span className="flex items-center gap-0.5">
                    <MapPin size={10} />
                    {inf.location.split(",")[0]}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Users size={10} />
                    {formatFollowers(inf.followers)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    inf.status === "active"
                      ? "bg-[#ecfdf5] text-[#10b981]"
                      : "bg-[#fef2f2] text-[#ef4444]"
                  }`}
                >
                  {inf.status === "active" ? "Active" : "Suspended"}
                </span>
                {inf.isVerified && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF2FF] text-[#2F6BFF] text-center">
                    Verified
                  </span>
                )}
                {inf.isFeatured && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#f59e0b] text-center">
                    Featured
                  </span>
                )}
              </div>
            </div>
            <div className="flex border-t border-[#e2e8f0]">
              <button
                onClick={() => {
                  const nowVerified = toggleInfluencerVerified(inf.id);
                  setInfluencers(getInfluencers());
                  toast.success(
                    nowVerified
                      ? `${inf.name} is now verified with a blue badge`
                      : `${inf.name} verification badge removed`
                  );
                }}
                className={`flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 transition-colors border-r border-[#e2e8f0] ${
                  inf.isVerified
                    ? "text-[#2F6BFF] hover:bg-[#EBF2FF]"
                    : "text-[#94a3b8] hover:bg-[#f8f9fc] hover:text-[#2F6BFF]"
                }`}
              >
                <BadgeCheck size={14} className={inf.isVerified ? "fill-[#2F6BFF]/10" : ""} />
                {inf.isVerified ? "Unverify" : "Verify"}
              </button>
              <button
                onClick={() => {
                  const nowFeatured = toggleInfluencerFeatured(inf.id);
                  // Immediately refresh local state to guarantee UI update
                  setInfluencers(getInfluencers());
                  toast.success(
                    nowFeatured
                      ? `${inf.name} is now featured on the landing page`
                      : `${inf.name} removed from featured`
                  );
                }}
                className={`flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 transition-colors border-r border-[#e2e8f0] ${
                  inf.isFeatured
                    ? "text-[#f59e0b] hover:bg-[#fffbeb]"
                    : "text-[#94a3b8] hover:bg-[#f8f9fc] hover:text-[#f59e0b]"
                }`}
              >
                <Star size={14} className={inf.isFeatured ? "fill-[#f59e0b]" : ""} />
                {inf.isFeatured ? "Unfeature" : "Feature"}
              </button>
              <button
                onClick={() =>
                  setConfirmAction({
                    infId: inf.id,
                    type: inf.status === "active" ? "suspend" : "reactivate",
                  })
                }
                className={`flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 transition-colors border-r border-[#e2e8f0] ${
                  inf.status === "active"
                    ? "text-[#f59e0b] hover:bg-[#fffbeb]"
                    : "text-[#10b981] hover:bg-[#ecfdf5]"
                }`}
              >
                {inf.status === "active" ? (
                  <>
                    <Ban size={14} /> Suspend
                  </>
                ) : (
                  <>
                    <PlayCircle size={14} /> Reactivate
                  </>
                )}
              </button>
              <button
                onClick={() =>
                  setConfirmAction({
                    infId: inf.id,
                    type: "delete",
                  })
                }
                className="flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 transition-colors text-[#ef4444] hover:bg-[#fef2f2]"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="influencers" tableFooter={false} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.type === "suspend"
            ? `Suspend ${influencers.find((i) => i.id === confirmAction?.infId)?.name}?`
            : confirmAction?.type === "reactivate"
            ? `Reactivate ${influencers.find((i) => i.id === confirmAction?.infId)?.name}?`
            : `Delete ${influencers.find((i) => i.id === confirmAction?.infId)?.name}?`
        }
        description={
          confirmAction?.type === "suspend"
            ? "This will suspend the influencer's account. They will not appear on Discover or be able to receive collaboration requests."
            : confirmAction?.type === "reactivate"
            ? "This will reactivate the influencer's account. They will appear on Discover and be able to receive collaboration requests again."
            : "This will permanently delete the influencer from the platform. This action cannot be undone."
        }
        confirmLabel={
          confirmAction?.type === "suspend"
            ? "Suspend Influencer"
            : confirmAction?.type === "reactivate"
            ? "Reactivate Influencer"
            : "Delete Influencer"
        }
        variant={
          confirmAction?.type === "reactivate"
            ? "info"
            : confirmAction?.type === "suspend"
            ? "warning"
            : "danger"
        }
        onConfirm={handleAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}