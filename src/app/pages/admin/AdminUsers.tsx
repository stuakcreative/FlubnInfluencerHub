import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Search, MoreVertical, Shield, Ban, CheckCircle, UserCheck, Building2, Download, Trash2 } from "lucide-react";
import { Pagination } from "../../components/Pagination";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { exportToCSV } from "../../utils/export-csv";
import { useAdminUsers } from "../../context/AdminUsersContext";
import { deleteInfluencer } from "../../utils/dataManager";

export default function AdminUsers() {
  const { users: adminUsersData, updateUser, removeUser } = useAdminUsers();
  const [users, setUsers] = useState(adminUsersData);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    type: "suspend" | "reactivate" | "delete";
  } | null>(null);

  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  useEffect(() => { setCurrentPage(1); }, [searchQuery, roleFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const openMenu = useCallback((userId: string) => {
    if (activeMenu === userId) {
      setActiveMenu(null);
      setMenuPos(null);
      return;
    }

    const btn = buttonRefs.current[userId];
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const menuHeight = 100; // approximate dropdown height
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 16;

    setMenuPos({
      top: openUp ? rect.top : rect.bottom + 4,
      left: rect.right - 176, // 176px = w-44 = 11rem
      openUp,
    });
    setActiveMenu(userId);
  }, [activeMenu]);

  const closeMenu = useCallback(() => {
    setActiveMenu(null);
    setMenuPos(null);
  }, []);

  // Close menu on scroll or resize
  useEffect(() => {
    if (!activeMenu) return;

    const handleScrollOrResize = () => closeMenu();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [activeMenu, closeMenu]);

  // Sync local state when context data changes (e.g. navigating away and back)
  useEffect(() => {
    setUsers(adminUsersData);
  }, [adminUsersData]);

  const handleAction = () => {
    if (!confirmAction) return;
    const { userId, type } = confirmAction;
    const user = users.find((u) => u.id === userId);

    if (type === "delete") {
      // Remove from context + localStorage
      removeUser(userId);
      // Also remove from the influencer data store so they disappear from Discover
      // Pass email as fallback in case the IDs differ between admin users and influencer data stores
      deleteInfluencer(userId, user?.email);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success(`${user?.name} has been permanently deleted`);
      setConfirmAction(null);
      closeMenu();
      return;
    }

    const newStatus = type === "suspend" ? "suspended" : "active";

    // Persist to context + localStorage
    updateUser(userId, { status: newStatus });

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: newStatus,
            }
          : u
      )
    );

    if (type === "reactivate") {
      toast.success(`${user?.name} has been reactivated`);
    } else {
      toast.error(`${user?.name} has been suspended`);
    }

    setConfirmAction(null);
    closeMenu();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-[#ecfdf5] text-[#10b981]",
      suspended: "bg-[#fef2f2] text-[#ef4444]",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${styles[status] || ""}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    return role === "influencer" ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#faf5ff] text-[#8b5cf6] rounded-full text-xs">
        <UserCheck size={12} /> Influencer
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#eff6ff] text-[#3b82f6] rounded-full text-xs">
        <Building2 size={12} /> Brand
      </span>
    );
  };

  const getConfirmDialogProps = () => {
    if (!confirmAction) return null;
    const user = users.find((u) => u.id === confirmAction.userId);
    if (confirmAction.type === "delete") {
      return {
        title: `Delete ${user?.name}?`,
        description: `This will permanently remove ${user?.name} and all their data from the platform. This action cannot be undone.`,
        confirmLabel: "Delete User",
        variant: "danger" as const,
      };
    }
    if (confirmAction.type === "suspend") {
      return {
        title: `Suspend ${user?.name}?`,
        description: `This will immediately restrict ${user?.name}'s access to the platform. They won't be able to use any features until reactivated.`,
        confirmLabel: "Suspend User",
        variant: "danger" as const,
      };
    }
    return {
      title: `Reactivate ${user?.name}?`,
      description: `This will restore ${user?.name}'s full access to the platform.`,
      confirmLabel: "Reactivate",
      variant: "info" as const,
    };
  };

  const dialogProps = getConfirmDialogProps();
  const activeUser = activeMenu ? users.find((u) => u.id === activeMenu) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Users Management</h1>
          <p className="text-[#64748b] text-sm mt-1">Manage all platform users.</p>
        </div>
        <button
          onClick={() => {
            const headers = ["Name", "Email", "Role", "Status", "Joined"];
            const rows = filtered.map((u) => [u.name, u.email, u.role, u.status, u.joinDate]);
            exportToCSV("users", headers, rows);
            toast.success(`Exported ${filtered.length} users`);
          }}
          className="px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#1a1a2e] rounded-xl flex items-center gap-2 hover:bg-[#f8f9fc] transition-colors text-sm"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20"
          />
        </div>
        <div className="flex gap-1 bg-white border border-[#e2e8f0] rounded-xl p-1">
          {["all", "influencer", "brand"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${
                roleFilter === r
                  ? "bg-[#2F6BFF] text-white"
                  : "text-[#64748b] hover:bg-[#f8f9fc]"
              }`}
            >
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-[#e2e8f0]">
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">User</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Role</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Status</th>
                <th className="text-left px-6 py-4 text-sm text-[#64748b]">Joined</th>
                <th className="text-right px-6 py-4 text-sm text-[#64748b]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {paged.map((user) => (
                <tr key={user.id} className="hover:bg-[#f8f9fc] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg text-white flex items-center justify-center text-xs" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}>
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-[#1a1a2e] text-sm">{user.name}</p>
                        <p className="text-xs text-[#94a3b8]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                  <td className="px-6 py-4 text-sm text-[#64748b]">{user.joinDate}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <button
                        ref={(el) => { buttonRefs.current[user.id] = el; }}
                        onClick={() => openMenu(user.id)}
                        className="p-2 text-[#64748b] hover:bg-[#f8f9fc] rounded-lg"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="users" />
      </div>

      {/* Fixed-position dropdown menu (rendered outside the table to avoid overflow clipping) */}
      {activeMenu && menuPos && activeUser && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeMenu}
          />
          {/* Dropdown */}
          <div
            className="fixed z-[9999] w-44 bg-white rounded-xl shadow-xl border border-[#e2e8f0] py-1.5"
            style={{
              top: menuPos.openUp ? undefined : menuPos.top,
              bottom: menuPos.openUp ? window.innerHeight - menuPos.top + 4 : undefined,
              left: Math.max(8, menuPos.left),
            }}
          >
            <button
              onClick={() => {
                setConfirmAction({
                  userId: activeUser.id,
                  type:
                    activeUser.status === "suspended"
                      ? "reactivate"
                      : "suspend",
                });
                closeMenu();
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                activeUser.status === "suspended"
                  ? "text-[#10b981] hover:bg-[#f0fdf4]"
                  : "text-[#ef4444] hover:bg-[#fef2f2]"
              }`}
            >
              {activeUser.status === "suspended" ? (
                <>
                  <Shield size={15} /> Reactivate
                </>
              ) : (
                <>
                  <Ban size={15} /> Suspend
                </>
              )}
            </button>
            <button
              onClick={() => {
                setConfirmAction({
                  userId: activeUser.id,
                  type: "delete",
                });
                closeMenu();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-[#ef4444] hover:bg-[#fef2f2] flex items-center gap-2.5 transition-colors border-t border-[#e2e8f0]"
            >
              <Trash2 size={15} /> Delete User
            </button>
          </div>
        </>
      )}

      {/* Confirm Dialog */}
      {dialogProps && (
        <ConfirmDialog
          open={!!confirmAction}
          title={dialogProps.title}
          description={dialogProps.description}
          confirmLabel={dialogProps.confirmLabel}
          variant={dialogProps.variant}
          onConfirm={handleAction}
          onCancel={() => {
            setConfirmAction(null);
            closeMenu();
          }}
        />
      )}
    </div>
  );
}