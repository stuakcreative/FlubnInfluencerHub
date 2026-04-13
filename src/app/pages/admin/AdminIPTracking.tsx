import { useState, useEffect } from "react";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Ban, 
  Trash2, 
  Settings, 
  Users,
  Eye,
  Activity
} from "lucide-react";
import {
  getAllIPRecords,
  toggleIPBlock,
  deleteIPRecord,
  getIPStatistics,
  getIPSettings,
  updateIPSettings,
  IPRecord,
} from "../../utils/ipTracking";
import { Pagination } from "../../components/Pagination";

export default function AdminIPTracking() {
  const [ipRecords, setIpRecords] = useState<IPRecord[]>(getAllIPRecords());
  const [settings, setSettings] = useState(getIPSettings());
  const [activeTab, setActiveTab] = useState<"overview" | "ips" | "settings">("overview");
  const [expandedIP, setExpandedIP] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(ipRecords.length / ROWS_PER_PAGE));
  const pagedRecords = ipRecords.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const stats = getIPStatistics();

  const refreshData = () => {
    setIpRecords(getAllIPRecords());
  };

  const handleToggleBlock = (ip: string) => {
    toggleIPBlock(ip);
    refreshData();
  };

  const handleDelete = (ip: string) => {
    if (confirm(`Are you sure you want to delete all records for IP ${ip}?`)) {
      deleteIPRecord(ip);
      refreshData();
    }
  };

  const handleSaveSettings = () => {
    updateIPSettings(settings);
    alert("Settings saved successfully!");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-[#0a090f] p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F3D91] to-[#2F6BFF] flex items-center justify-center">
              <Shield className="text-white" size={20} />
            </div>
            <h1 className="text-white text-3xl">IP Tracking & Fraud Prevention</h1>
          </div>
          <p className="text-white/60">Monitor and manage IP-based signup restrictions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Activity className="text-blue-400" size={20} />
              </div>
              <span className="text-2xl text-white">{stats.totalIPs}</span>
            </div>
            <p className="text-white/60 text-sm">Total IP Addresses</p>
          </div>

          <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Ban className="text-red-400" size={20} />
              </div>
              <span className="text-2xl text-white">{stats.blockedIPs}</span>
            </div>
            <p className="text-white/60 text-sm">Blocked IPs</p>
          </div>

          <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="text-yellow-400" size={20} />
              </div>
              <span className="text-2xl text-white">{stats.suspiciousIPs}</span>
            </div>
            <p className="text-white/60 text-sm">Suspicious IPs</p>
          </div>

          <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Users className="text-green-400" size={20} />
              </div>
              <span className="text-2xl text-white">{stats.totalAccounts}</span>
            </div>
            <p className="text-white/60 text-sm">Total Accounts</p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-400">{stats.freeAccounts} free</span>
              <span className="text-white/40">•</span>
              <span className="text-blue-400">{stats.paidAccounts} paid</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "overview", label: "Overview", icon: Eye },
            { id: "ips", label: "IP Records", icon: Shield },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6 lg:p-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-white text-lg mb-4">IP Tracking Status</h3>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    {settings.enableIPTracking ? (
                      <>
                        <CheckCircle className="text-green-400" size={24} />
                        <span className="text-white">IP Tracking is Enabled</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="text-yellow-400" size={24} />
                        <span className="text-white">IP Tracking is Disabled</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-white/70">
                      <span className="text-white">Max Free Accounts per IP:</span> {settings.maxFreeAccountsPerIP}
                    </p>
                    <p className="text-white/70">
                      <span className="text-white">Auto-block after limit:</span>{" "}
                      {settings.autoBlockAfterLimit ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-white text-lg mb-4">How It Works</h3>
                <div className="space-y-3 text-white/70 text-sm">
                  <p>
                    • When a user signs up for a <span className="text-white">free plan</span>, their IP address is tracked
                  </p>
                  <p>
                    • If the same IP tries to create more than{" "}
                    <span className="text-white">{settings.maxFreeAccountsPerIP} free accounts</span>, the signup will be blocked
                  </p>
                  <p>
                    • Users can bypass this restriction by upgrading to a <span className="text-white">paid plan</span>
                  </p>
                  <p>
                    • Admins can manually block/unblock specific IP addresses
                  </p>
                  <p className="text-yellow-400/80 mt-4">
                    ⚠️ Note: This is a client-side simulation. In production, IP tracking must be done server-side for security.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* IP Records Tab */}
          {activeTab === "ips" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-lg">IP Address Records ({ipRecords.length})</h3>
              </div>

              {ipRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="mx-auto text-white/20 mb-4" size={48} />
                  <p className="text-white/60">No IP records found</p>
                  <p className="text-white/40 text-sm mt-2">Records will appear here when users sign up</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pagedRecords.map((record) => {
                    const freeCount = record.accounts.filter((a) => a.plan === "free").length;
                    const paidCount = record.accounts.filter((a) => a.plan === "paid").length;
                    const isSuspicious = freeCount >= settings.maxFreeAccountsPerIP;
                    const isExpanded = expandedIP === record.ip;

                    return (
                      <div
                        key={record.ip}
                        className={`bg-white/5 rounded-xl border ${
                          record.blocked
                            ? "border-red-500/30"
                            : isSuspicious
                            ? "border-yellow-500/30"
                            : "border-white/10"
                        } overflow-hidden`}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <code className="text-white bg-white/10 px-3 py-1 rounded-lg text-sm">
                                  {record.ip}
                                </code>
                                {record.blocked && (
                                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-lg">
                                    Blocked
                                  </span>
                                )}
                                {!record.blocked && isSuspicious && (
                                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-lg">
                                    Suspicious
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-4 text-sm text-white/60">
                                <span>
                                  {record.accounts.length} account{record.accounts.length !== 1 ? "s" : ""}
                                </span>
                                <span>•</span>
                                <span className="text-green-400">{freeCount} free</span>
                                {paidCount > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-blue-400">{paidCount} paid</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setExpandedIP(isExpanded ? null : record.ip)}
                                className="px-3 py-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors text-sm"
                              >
                                {isExpanded ? "Hide" : "View"} Details
                              </button>
                              <button
                                onClick={() => handleToggleBlock(record.ip)}
                                className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                                  record.blocked
                                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                }`}
                              >
                                {record.blocked ? "Unblock" : "Block"}
                              </button>
                              <button
                                onClick={() => handleDelete(record.ip)}
                                className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                <div>
                                  <p className="text-white/40 mb-1">First Seen</p>
                                  <p className="text-white/70">{formatDate(record.firstSeen)}</p>
                                </div>
                                <div>
                                  <p className="text-white/40 mb-1">Last Seen</p>
                                  <p className="text-white/70">{formatDate(record.lastSeen)}</p>
                                </div>
                              </div>

                              <p className="text-white/60 text-sm mb-3">Accounts:</p>
                              <div className="space-y-2">
                                {record.accounts.map((account, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-white/5 rounded-lg p-3 border border-white/5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-white text-sm">{account.email}</p>
                                        <p className="text-white/40 text-xs mt-1">
                                          {formatDate(account.createdAt)}
                                        </p>
                                      </div>
                                      <span
                                        className={`px-2 py-1 text-xs rounded-lg ${
                                          account.plan === "free"
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-blue-500/20 text-blue-400"
                                        }`}
                                      >
                                        {account.plan}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={ipRecords.length} itemsPerPage={ROWS_PER_PAGE} onPageChange={setCurrentPage} label="IPs" tableFooter={false} />
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-white text-lg mb-4">IP Tracking Configuration</h3>
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="text-white mb-1">Enable IP Tracking</p>
                        <p className="text-white/60 text-sm">
                          Track IP addresses during signup to prevent abuse
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.enableIPTracking}
                        onChange={(e) =>
                          setSettings({ ...settings, enableIPTracking: e.target.checked })
                        }
                        className="w-12 h-6 bg-white/10 rounded-full appearance-none cursor-pointer checked:bg-gradient-to-r checked:from-[#0F3D91] checked:to-[#2F6BFF] relative transition-colors before:content-[''] before:absolute before:w-5 before:h-5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-6"
                      />
                    </label>
                  </div>

                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <label className="block mb-2 text-white">
                      Max Free Accounts per IP
                    </label>
                    <p className="text-white/60 text-sm mb-3">
                      Maximum number of free accounts allowed from a single IP address
                    </p>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.maxFreeAccountsPerIP}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          maxFreeAccountsPerIP: parseInt(e.target.value) || 2,
                        })
                      }
                      className="w-full max-w-[200px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="text-white mb-1">Auto-block After Limit</p>
                        <p className="text-white/60 text-sm">
                          Automatically block IP addresses that exceed the free account limit
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoBlockAfterLimit}
                        onChange={(e) =>
                          setSettings({ ...settings, autoBlockAfterLimit: e.target.checked })
                        }
                        className="w-12 h-6 bg-white/10 rounded-full appearance-none cursor-pointer checked:bg-gradient-to-r checked:from-[#0F3D91] checked:to-[#2F6BFF] relative transition-colors before:content-[''] before:absolute before:w-5 before:h-5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-6"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                className="px-6 py-3 bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] text-white rounded-xl hover:opacity-90 transition-opacity"
              >
                Save Settings
              </button>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={20} />
                  <div className="text-sm">
                    <p className="text-yellow-400 mb-1">Important Security Note</p>
                    <p className="text-yellow-400/80">
                      This is a client-side demo implementation. In a production environment, IP tracking
                      and validation must be performed on the server-side to prevent bypass and ensure
                      security. Never rely solely on client-side validation for fraud prevention.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}