import { Search, Building2, CreditCard, Ban, Shield, Download, BadgeCheck, Clock, XCircle, ExternalLink, Trash2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { exportToCSV } from "../../utils/export-csv";
import { getVerificationByBrandId } from "../../utils/brandVerification";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { Link } from "react-router";
import { useAdminUsers } from "../../context/AdminUsersContext";
import { Pagination } from "../../components/Pagination";

export default function AdminBrands() {
  const { users: adminUsersData, updateUser, removeUser } = useAdminUsers();
  const brandUsers = useMemo(() => adminUsersData.filter((u) => u.role === "brand"), [adminUsersData]);
  const [brands, setBrands] = useState(brandUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    brandId: string;
    type: "suspend" | "reactivate" | "delete";
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // Sync local state when context data changes (e.g. navigating away and back)
  useEffect(() => {
    setBrands(brandUsers);
  }, [brandUsers]);

  const filtered = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handleAction = () => {
    if (!confirmAction) return;
    const brand = brands.find((b) => b.id === confirmAction.brandId);

    if (confirmAction.type === "delete") {
      removeUser(confirmAction.brandId);
      setBrands((prev) => prev.filter((b) => b.id !== confirmAction.brandId));
      toast.success(`${brand?.name} has been permanently deleted`);
      setConfirmAction(null);
      return;
    }

    const newStatus = confirmAction.type === "suspend" ? "suspended" : "active";

    // Persist to context + localStorage
    updateUser(confirmAction.brandId, { status: newStatus });

    setBrands((prev) =>
      prev.map((b) =>
        b.id === confirmAction.brandId
          ? { ...b, status: newStatus }
          : b
      )
    );

    if (confirmAction.type === "reactivate") {
      toast.success(`${brand?.name} has been reactivated`);
    } else {
      toast.error(`${brand?.name} has been suspended`);
    }
    setConfirmAction(null);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-[#ecfdf5] text-[#10b981]",
      suspended: "bg-[#fef2f2] text-[#ef4444]",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${styles[status] || ""}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPlanBadge = (plan?: string) => {
    if (!plan) return <span className="text-xs text-[#94a3b8]">Free</span>;
    const colors: Record<string, string> = {
      Basic: "bg-[#eff6ff] text-[#3b82f6]",
      Pro: "bg-[#EBF2FF] text-[#2F6BFF]",
      Enterprise: "bg-[#faf5ff] text-[#8b5cf6]",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colors[plan] || ""}`}>
        <CreditCard size={12} /> {plan}
      </span>
    );
  };

  const getVerificationBadge = (brandId: string) => {
    const verification = getVerificationByBrandId(brandId);
    if (!verification) {
      return <span className="text-xs text-[#94a3b8]">Not Applied</span>;
    }
    if (verification.status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#ecfdf5] text-[#10b981] rounded-full text-xs">
          <BadgeCheck size={12} /> Verified
        </span>
      );
    }
    if (verification.status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fffbeb] text-[#f59e0b] rounded-full text-xs">
          <Clock size={12} /> Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fef2f2] text-[#ef4444] rounded-full text-xs">
        <XCircle size={12} /> Rejected
      </span>
    );
  };

  const dialogProps = confirmAction
    ? confirmAction.type === "delete"
      ? {
          title: `Delete ${brands.find((b) => b.id === confirmAction.brandId)?.name}?`,
          description: `This will permanently remove this brand and all their data from the platform. This action cannot be undone.`,
          confirmLabel: "Delete Brand",
          variant: "danger" as const,
        }
      : confirmAction.type === "suspend"
      ? {
          title: `Suspend ${brands.find((b) => b.id === confirmAction.brandId)?.name}?`,
          description: `This will immediately restrict this brand's access to the platform.`,
          confirmLabel: "Suspend Brand",
          variant: "danger" as const,
        }
      : {
          title: `Reactivate ${brands.find((b) => b.id === confirmAction.brandId)?.name}?`,
          description: `This will restore this brand's full access to the platform.`,
          confirmLabel: "Reactivate",
          variant: "info" as const,
        }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Brands Management</h1>
          <p className="text-[#64748b] text-sm mt-1">Manage brand accounts and subscriptions.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/brand-verification"
            className="px-4 py-2.5 bg-[#2F6BFF] text-white rounded-xl flex items-center gap-2 hover:bg-[#0F3D91] transition-colors text-sm"
          >
            <BadgeCheck size={15} />
            Verification Requests
          </Link>
          <button
            onClick={() => {
              const headers = ["Name", "Email", "Plan", "Status", "Joined", "Verification"];
              const rows = filtered.map((b) => {
                const v = getVerificationByBrandId(b.id);
                return [b.name, b.email, b.plan || "Free", b.status, b.joinDate, v?.status || "Not Applied"];
              });
              exportToCSV("brands", headers, rows);
              toast.success(`Exported ${filtered.length} brands`);
            }}
            className="px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#1a1a2e] rounded-xl flex items-center gap-2 hover:bg-[#f8f9fc] transition-colors text-sm"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search brands..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
        />
      </div>

      {/* Brands Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-[#e2e8f0]">
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Brand</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Plan</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Verification</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Status</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Joined</th>
                <th className="text-right px-6 py-4 text-sm text-[#64748b]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {paged.map((brand) => {
                const verification = getVerificationByBrandId(brand.id);
                return (
                  <tr key={brand.id} className="hover:bg-[#f8f9fc] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg text-white flex items-center justify-center text-xs"
                          style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}
                        >
                          {brand.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div>
                            <p className="text-[#1a1a2e] text-sm">{brand.name}</p>
                            <p className="text-xs text-[#94a3b8]">{brand.email}</p>
                          </div>
                          {verification?.status === "approved" && <VerifiedBadge size={16} type="brand" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getPlanBadge(brand.plan)}</td>
                    <td className="px-6 py-4">{getVerificationBadge(brand.id)}</td>
                    <td className="px-6 py-4">{getStatusBadge(brand.status)}</td>
                    <td className="px-6 py-4 text-sm text-[#64748b]">{brand.joinDate}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() =>
                            setConfirmAction({
                              brandId: brand.id,
                              type: brand.status === "suspended" ? "reactivate" : "suspend",
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
                            brand.status === "suspended"
                              ? "text-[#10b981] hover:bg-[#f0fdf4]"
                              : "text-[#ef4444] hover:bg-[#fef2f2]"
                          }`}
                        >
                          {brand.status === "suspended" ? (
                            <>
                              <Shield size={13} /> Reactivate
                            </>
                          ) : (
                            <>
                              <Ban size={13} /> Suspend
                            </>
                          )}
                        </button>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              brandId: brand.id,
                              type: "delete",
                            })
                          }
                          className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors text-[#ef4444] hover:bg-[#fef2f2]"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="brands" />
      </div>

      {/* Confirm Dialog */}
      {dialogProps && (
        <ConfirmDialog
          open={!!confirmAction}
          title={dialogProps.title}
          description={dialogProps.description}
          confirmLabel={dialogProps.confirmLabel}
          variant={dialogProps.variant}
          onConfirm={handleAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}