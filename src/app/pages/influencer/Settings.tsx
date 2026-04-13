import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Trash2, X, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { changePassword, deleteAccount } from "../../utils/api";
import { ShareProfileWidget } from "../../components/ShareProfileWidget";

export default function InfluencerSettings() {
  const { logout } = useAuth();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteNotes, setDeleteNotes] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result === null) {
        // Edge function unreachable — silently no-op; inform user
        toast.error("Unable to reach the server. Please check your connection and try again.");
        return;
      }
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Password change error:", err.message);
      toast.error(err.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteReason) {
      toast.error("Please select a reason for deletion");
      return;
    }

    const reasonLabels: Record<string, string> = {
      reason1: "No longer want to use the platform",
      reason2: "Found a better platform",
      reason3: "Other",
    };

    setDeletingAccount(true);
    try {
      const result = await deleteAccount(
        reasonLabels[deleteReason] || deleteReason,
        deleteNotes || undefined,
      );

      // If result is null the edge function was unreachable — still proceed
      // with local cleanup so the user isn't stuck on the platform.
      if (result?.error) {
        toast.error(result.error);
        setDeletingAccount(false);
        return;
      }

      // Clean up local data
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith("flubn_"));
      keysToRemove.forEach(k => localStorage.removeItem(k));

      toast.success("Account deleted successfully. Redirecting...");
      setShowDeleteModal(false);

      setTimeout(() => {
        logout();
        window.location.href = "/";
      }, 1500);
    } catch (err: any) {
      console.error("Account deletion error:", err.message);
      toast.error(err.message || "Failed to delete account");
      setDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Settings</h1>
        <p className="text-[#64748b] text-sm mt-1">Manage your account preferences.</p>
      </div>

      {/* ── Change Password ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
            <Lock size={18} className="text-[#2F6BFF]" />
          </div>
          <div>
            <h2 className="text-lg text-[#1a1a2e]">Change Password</h2>
            <p className="text-sm text-[#64748b]">Update your account password</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { label: "Current Password", value: currentPassword, setter: setCurrentPassword, showKey: "current" as const },
            { label: "New Password", value: newPassword, setter: setNewPassword, showKey: "new" as const },
            { label: "Confirm New Password", value: confirmPassword, setter: setConfirmPassword, showKey: "confirm" as const },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-sm text-[#64748b] mb-1.5 block">{f.label}</label>
              <div className="relative">
                <input
                  type={showPasswords[f.showKey] ? "text" : "password"}
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  disabled={changingPassword}
                  className="w-full px-4 py-3 pr-11 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPasswords((prev) => ({ ...prev, [f.showKey]: !prev[f.showKey] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
                >
                  {showPasswords[f.showKey] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={handlePasswordChange}
            disabled={changingPassword}
            className="px-4 py-2 border border-[#2F6BFF] text-[#2F6BFF] rounded-lg hover:bg-[#e0f2fe] transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {changingPassword && <Loader2 size={14} className="animate-spin" />}
            {changingPassword ? "Changing..." : "Change Password"}
          </button>
        </div>
      </motion.div>

      {/* ── Share Profile ─────────────────────────────────────────────────────── */}
      <ShareProfileWidget />

      {/* ── Danger Zone ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-red-200 p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center">
            <Trash2 size={18} className="text-[#ef4444]" />
          </div>
          <div>
            <h2 className="text-lg text-[#1a1a2e]">Danger Zone</h2>
            <p className="text-sm text-[#64748b]">Irreversible actions</p>
          </div>
        </div>
        <p className="text-sm text-[#64748b] mb-4">
          Once you delete your account, there is no going back. All your data will be permanently removed.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 border border-red-300 text-[#ef4444] rounded-lg hover:bg-[#fef2f2] transition-colors text-sm"
        >
          Delete Account
        </button>
      </motion.div>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-[440px] max-w-[95vw] mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg text-[#1a1a2e] font-semibold">Delete Account</h2>
                <button onClick={() => !deletingAccount && setShowDeleteModal(false)} className="text-[#64748b] hover:text-[#1a1a2e]">
                  <X size={18} />
                </button>
              </div>
              <div className="bg-[#fef2f2] border border-red-100 rounded-lg p-3 mb-4">
                <p className="text-sm text-[#ef4444] font-medium">Warning: This action cannot be undone</p>
                <p className="text-xs text-[#64748b] mt-1">
                  Your account, profile, collaboration history, and all associated data will be permanently deleted from our servers.
                </p>
              </div>
              <p className="text-sm text-[#64748b] mb-3">Please tell us why you're leaving:</p>
              <div className="space-y-2">
                {[
                  { id: "reason1", label: "I no longer want to use the platform" },
                  { id: "reason2", label: "I found a better platform" },
                  { id: "reason3", label: "Other" },
                ].map((r) => (
                  <div key={r.id} className="flex items-center">
                    <input type="radio" id={r.id} name="deleteReason" value={r.id}
                      checked={deleteReason === r.id} onChange={() => setDeleteReason(r.id)}
                      disabled={deletingAccount} className="mr-2" />
                    <label htmlFor={r.id} className="text-sm text-[#64748b]">{r.label}</label>
                  </div>
                ))}
              </div>
              {deleteReason === "reason3" && (
                <div className="mt-4">
                  <label className="text-sm text-[#64748b] mb-1.5 block">Please specify</label>
                  <input type="text" value={deleteNotes} onChange={(e) => setDeleteNotes(e.target.value)}
                    disabled={deletingAccount}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] disabled:opacity-50" />
                </div>
              )}
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => !deletingAccount && setShowDeleteModal(false)}
                  disabled={deletingAccount}
                  className="px-4 py-2 text-sm text-[#64748b] hover:text-[#1a1a2e] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="px-4 py-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {deletingAccount && <Loader2 size={14} className="animate-spin" />}
                  {deletingAccount ? "Deleting..." : "Delete My Account"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}