import { useState, useEffect } from "react";
import { Trash2, Download, Check, X, Clock, UserX, Building2, User, AlertCircle } from "lucide-react";
import { DELETION_REQUESTS, type DeletionRequest } from "../../data/mock-data";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { exportToCSV } from "../../utils/export-csv";
import { Pagination } from "../../components/Pagination";

export default function AdminDeletionRequests() {
  const [requests, setRequests] = useState<DeletionRequest[]>(DELETION_REQUESTS);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const filteredRequests =
    filter === "all" ? requests : requests.filter((req) => req.status === filter);

  useEffect(() => { setCurrentPage(1); }, [filter]);
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ROWS_PER_PAGE));
  const paged = filteredRequests.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handleViewDetails = (request: DeletionRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || "");
    setShowDetailModal(true);
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    if (!confirm("Are you sure you want to approve this account deletion request? This action will permanently delete the user's account.")) return;

    setRequests(
      requests.map((req) =>
        req.id === selectedRequest.id
          ? {
              ...req,
              status: "approved",
              adminNotes,
              processedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              processedBy: "Admin",
            }
          : req
      )
    );
    toast.success("Deletion request approved. User account will be deleted.");
    setShowDetailModal(false);
    setSelectedRequest(null);
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    if (!adminNotes.trim()) {
      toast.error("Please provide a reason for rejecting this request");
      return;
    }

    setRequests(
      requests.map((req) =>
        req.id === selectedRequest.id
          ? {
              ...req,
              status: "rejected",
              adminNotes,
              processedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              processedBy: "Admin",
            }
          : req
      )
    );
    toast.success("Deletion request rejected.");
    setShowDetailModal(false);
    setSelectedRequest(null);
  };

  const handleExport = () => {
    const exportData = filteredRequests.map((request) => ({
      User: request.userName,
      Email: request.userEmail,
      Role: request.userRole,
      Reason: request.reason,
      "Additional Notes": request.additionalNotes || "N/A",
      "Request Date": request.requestDate,
      Status: request.status,
      "Admin Notes": request.adminNotes || "N/A",
      "Processed Date": request.processedDate || "N/A",
      "Processed By": request.processedBy || "N/A",
    }));
    exportToCSV(exportData, `deletion-requests-${filter}`);
    toast.success("Deletion requests exported successfully!");
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-[#1a1a2e]">Account Deletion Requests</h1>
            <p className="text-sm text-[#64748b] mt-1">Manage user account deletion requests</p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-white border border-[#e2e8f0] text-[#64748b] rounded-xl hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF] transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock size={20} className="text-[#f59e0b]" />
              <span className="text-xs text-[#f59e0b] bg-[#fef3c7] px-2 py-0.5 rounded-full">Pending</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-1">{pendingCount}</p>
            <p className="text-sm text-[#64748b]">Awaiting Review</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-2">
              <Check size={20} className="text-[#10b981]" />
              <span className="text-xs text-[#10b981] bg-[#ecfdf5] px-2 py-0.5 rounded-full">Approved</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-1">{approvedCount}</p>
            <p className="text-sm text-[#64748b]">Approved Deletions</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-2">
              <X size={20} className="text-[#ef4444]" />
              <span className="text-xs text-[#ef4444] bg-[#fef2f2] px-2 py-0.5 rounded-full">Rejected</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-1">{rejectedCount}</p>
            <p className="text-sm text-[#64748b]">Rejected Requests</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-2">
              <UserX size={20} className="text-[#2F6BFF]" />
              <span className="text-xs text-[#2F6BFF] bg-[#EBF2FF] px-2 py-0.5 rounded-full">Total</span>
            </div>
            <p className="text-2xl text-[#1a1a2e] mb-1">{requests.length}</p>
            <p className="text-sm text-[#64748b]">Total Requests</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          {(["all", "pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                filter === status
                  ? "bg-[#2F6BFF] text-white"
                  : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#2F6BFF]/30"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== "all" && (
                <span className="ml-2 opacity-75">
                  ({status === "pending" ? pendingCount : status === "approved" ? approvedCount : rejectedCount})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8f9fc] border-b border-[#e2e8f0]">
                <tr>
                  <th className="text-left px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Reason</th>
                  <th className="text-left px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Request Date</th>
                  <th className="text-left px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs text-[#64748b] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <UserX size={48} className="text-[#e2e8f0] mx-auto mb-3" />
                      <p className="text-sm text-[#94a3b8]">No deletion requests found</p>
                    </td>
                  </tr>
                ) : (
                  paged.map((request) => (
                    <tr key={request.id} className="hover:bg-[#f8f9fc] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm shrink-0"
                            style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
                          >
                            {request.userRole === "brand" ? <Building2 size={18} /> : <User size={18} />}
                          </div>
                          <div>
                            <p className="text-sm text-[#1a1a2e]">{request.userName}</p>
                            <p className="text-xs text-[#94a3b8]">{request.userEmail}</p>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                request.userRole === "brand"
                                  ? "bg-[#EBF2FF] text-[#2F6BFF]"
                                  : "bg-[#fef3c7] text-[#f59e0b]"
                              }`}
                            >
                              {request.userRole}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#1a1a2e]">{request.reason}</p>
                        {request.additionalNotes && (
                          <p className="text-xs text-[#94a3b8] line-clamp-1 mt-0.5">{request.additionalNotes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{request.requestDate}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs inline-flex items-center gap-1 ${
                            request.status === "pending"
                              ? "bg-[#fef3c7] text-[#f59e0b]"
                              : request.status === "approved"
                              ? "bg-[#ecfdf5] text-[#10b981]"
                              : "bg-[#fef2f2] text-[#ef4444]"
                          }`}
                        >
                          {request.status === "pending" && <Clock size={12} />}
                          {request.status === "approved" && <Check size={12} />}
                          {request.status === "rejected" && <X size={12} />}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                        {request.processedDate && (
                          <p className="text-xs text-[#94a3b8] mt-1">on {request.processedDate}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="px-3 py-1.5 bg-[#2F6BFF] text-white rounded-lg hover:bg-[#0F3D91] transition-colors text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredRequests.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="requests" />
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRequest && (
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
                <h2 className="text-xl text-[#1a1a2e]">Account Deletion Request Details</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-[#94a3b8] hover:text-[#64748b]">
                  <X size={22} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* User Info */}
                <div className="bg-[#f8f9fc] rounded-xl p-4 border border-[#e2e8f0]">
                  <h3 className="text-sm text-[#64748b] mb-3">User Information</h3>
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
                    >
                      {selectedRequest.userRole === "brand" ? <Building2 size={24} /> : <User size={24} />}
                    </div>
                    <div>
                      <p className="text-lg text-[#1a1a2e]">{selectedRequest.userName}</p>
                      <p className="text-sm text-[#64748b]">{selectedRequest.userEmail}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                          selectedRequest.userRole === "brand"
                            ? "bg-[#EBF2FF] text-[#2F6BFF]"
                            : "bg-[#fef3c7] text-[#f59e0b]"
                        }`}
                      >
                        {selectedRequest.userRole}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div>
                  <h3 className="text-sm text-[#64748b] mb-3">Deletion Request</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-[#94a3b8] mb-1">Reason</p>
                      <p className="text-sm text-[#1a1a2e]">{selectedRequest.reason}</p>
                    </div>
                    {selectedRequest.additionalNotes && (
                      <div>
                        <p className="text-xs text-[#94a3b8] mb-1">Additional Notes</p>
                        <div className="bg-[#f8f9fc] rounded-lg p-3 border border-[#e2e8f0]">
                          <p className="text-sm text-[#64748b]">{selectedRequest.additionalNotes}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-[#94a3b8] mb-1">Request Date</p>
                      <p className="text-sm text-[#1a1a2e]">{selectedRequest.requestDate}</p>
                    </div>
                  </div>
                </div>

                {/* Current Status */}
                <div>
                  <h3 className="text-sm text-[#64748b] mb-3">Current Status</h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-2 ${
                        selectedRequest.status === "pending"
                          ? "bg-[#fef3c7] text-[#f59e0b]"
                          : selectedRequest.status === "approved"
                          ? "bg-[#ecfdf5] text-[#10b981]"
                          : "bg-[#fef2f2] text-[#ef4444]"
                      }`}
                    >
                      {selectedRequest.status === "pending" && <Clock size={16} />}
                      {selectedRequest.status === "approved" && <Check size={16} />}
                      {selectedRequest.status === "rejected" && <X size={16} />}
                      {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                    </span>
                    {selectedRequest.processedDate && (
                      <span className="text-sm text-[#64748b]">
                        on {selectedRequest.processedDate} by {selectedRequest.processedBy}
                      </span>
                    )}
                  </div>
                  {selectedRequest.adminNotes && selectedRequest.status !== "pending" && (
                    <div className="mt-3 bg-[#f8f9fc] rounded-lg p-3 border border-[#e2e8f0]">
                      <p className="text-xs text-[#94a3b8] mb-1">Admin Notes</p>
                      <p className="text-sm text-[#64748b]">{selectedRequest.adminNotes}</p>
                    </div>
                  )}
                </div>

                {/* Admin Action (Only for pending requests) */}
                {selectedRequest.status === "pending" && (
                  <>
                    <div className="bg-[#fef3c7]/30 border border-[#f59e0b]/20 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-[#f59e0b] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-[#1a1a2e] mb-1">Important</p>
                          <p className="text-xs text-[#64748b]">
                            Approving this request will permanently delete the user's account and all associated data
                            within 30 days as per our data retention policy. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-[#64748b] mb-1.5 block">Admin Notes / Reason</label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes or reason for your decision..."
                        rows={3}
                        className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleReject}
                        className="flex-1 px-4 py-3 bg-white border-2 border-[#ef4444] text-[#ef4444] rounded-xl hover:bg-[#fef2f2] transition-colors flex items-center justify-center gap-2"
                      >
                        <X size={18} />
                        Reject Request
                      </button>
                      <button
                        onClick={handleApprove}
                        className="flex-1 px-4 py-3 bg-[#ef4444] text-white rounded-xl hover:bg-[#dc2626] transition-colors shadow-lg shadow-[#ef4444]/25 flex items-center justify-center gap-2"
                      >
                        <Check size={18} />
                        Approve & Delete Account
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}