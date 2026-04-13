import { useState } from "react";
import { getInfluencers } from "../../utils/dataManager";
import { RefreshCw, Database, TrendingUp } from "lucide-react";
import { useStatistics } from "../../context/StatisticsContext";

export default function DebugStorage() {
  const [data, setData] = useState<any>(null);
  const { stats, refreshStats } = useStatistics();

  const loadData = () => {
    refreshStats(); // Refresh statistics
    const influencers = getInfluencers();
    const rawData = localStorage.getItem("flubn_influencers");
    
    setData({
      influencers,
      rawData: rawData ? JSON.parse(rawData) : null,
      verifiedCount: influencers.filter(inf => inf.status === "active").length,
      suspendedCount: influencers.filter(inf => inf.status === "suspended").length,
      statuses: influencers.map(inf => ({
        id: inf.id,
        name: inf.name,
        status: inf.status
      }))
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Storage Debug</h1>
          <p className="text-[#64748b] text-sm mt-1">
            Check localStorage data for influencers
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2.5 bg-[#2F6BFF] text-white rounded-xl flex items-center gap-2 hover:bg-[#2557D6] transition-colors"
        >
          <RefreshCw size={16} />
          Load Data
        </button>
      </div>

      {data && (
        <div className="space-y-4">
          {/* Statistics Context Values */}
          <div className="bg-gradient-to-br from-[#2F6BFF] to-[#6BA9FF] rounded-xl p-6 text-white">
            <h2 className="text-lg mb-4 flex items-center gap-2">
              <TrendingUp size={18} />
              Current Statistics Context Values
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-xs text-white/70 mb-1">Total Influencers</p>
                <p className="text-2xl font-semibold">{stats.totalInfluencers}</p>
                <p className="text-xs text-white/50 mt-1">Display: {stats.influencersDisplay}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-xs text-white/70 mb-1">Verified Influencers</p>
                <p className="text-2xl font-semibold">{stats.verifiedInfluencers}</p>
                <p className="text-xs text-white/50 mt-1">Display: {stats.verifiedInfluencersDisplay}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-xs text-white/70 mb-1">Total Brands</p>
                <p className="text-2xl font-semibold">{stats.totalBrands}</p>
                <p className="text-xs text-white/50 mt-1">Display: {stats.brandsDisplay}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-xs text-white/70 mb-1">Collaborations</p>
                <p className="text-2xl font-semibold">{stats.totalCollaborations}</p>
                <p className="text-xs text-white/50 mt-1">Display: {stats.collaborationsDisplay}</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <p className="text-sm text-[#64748b]">Total Influencers</p>
              <p className="text-2xl text-[#1a1a2e] mt-1">{data.influencers.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <p className="text-sm text-[#64748b]">Verified</p>
              <p className="text-2xl text-[#10b981] mt-1">{data.verifiedCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <p className="text-sm text-[#64748b]">Suspended</p>
              <p className="text-2xl text-[#f59e0b] mt-1">{data.suspendedCount}</p>
            </div>
          </div>

          {/* Influencer List */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <h2 className="text-lg text-[#1a1a2e] mb-4 flex items-center gap-2">
              <Database size={18} />
              Influencer Statuses
            </h2>
            <div className="space-y-2">
              {data.statuses.map((inf: any) => (
                <div key={inf.id} className="flex items-center justify-between p-3 bg-[#f8f9fc] rounded-lg">
                  <div>
                    <p className="text-[#1a1a2e]">{inf.name}</p>
                    <p className="text-xs text-[#64748b]">ID: {inf.id}</p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      inf.status === "active"
                        ? "bg-[#ecfdf5] text-[#10b981]"
                        : "bg-[#fef2f2] text-[#ef4444]"
                    }`}
                  >
                    {inf.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Data */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <h2 className="text-lg text-[#1a1a2e] mb-4">Raw localStorage Data</h2>
            <pre className="bg-[#0a090f] text-[#10b981] p-4 rounded-lg overflow-auto max-h-96 text-xs">
              {JSON.stringify(data.rawData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}