import { useMemo } from "react";
import { motion } from "motion/react";
import {
  Users, Eye, TrendingUp, BarChart2, ArrowUp, ArrowDown, Minus, Crown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getInfluencers } from "../utils/dataManager";
import {
  getProfileViewStats,
  getProfileViewCount,
  seedProfileViews,
} from "../utils/profileViews";

function fmtNum(num: number) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/** Compute percentile rank (0-100) given a value and a sorted-asc array */
function percentileRank(value: number, sortedArr: number[]): number {
  if (sortedArr.length === 0) return 0;
  let count = 0;
  for (const v of sortedArr) {
    if (v < value) count++;
    else if (v === value) count += 0.5;
  }
  return Math.round((count / sortedArr.length) * 100);
}

interface BenchmarkMetric {
  label: string;
  yours: number;
  categoryAvg: number;
  top10Threshold: number;
  percentile: number;
  icon: typeof Eye;
  color: string;
  format: (n: number) => string;
}

export function CreatorBenchmark() {
  const { user } = useAuth();

  const benchmark = useMemo(() => {
    const all = getInfluencers();

    // Ensure profile views are seeded
    seedProfileViews(all.map((i) => i.id));

    // Find current influencer
    const me =
      all.find((inf) => inf.email === user?.email) ||
      all.find((inf) => inf.name === user?.name) ||
      all.find((inf) => inf.id === user?.id) ||
      all.find((inf) => inf.status === "active") || // demo fallback
      null;

    if (!me) return null;

    // Peers = same category
    const peers = all.filter((inf) => inf.category === me.category && inf.id !== me.id);
    const allInCategory = [me, ...peers];

    if (allInCategory.length < 2) return null; // Not enough data

    // Build metrics
    const followerValues = allInCategory.map((i) => i.followers).sort((a, b) => a - b);
    const viewValues = allInCategory
      .map((i) => getProfileViewCount(i.id))
      .sort((a, b) => a - b);

    // Collabs starting rate comparison
    const rateValues = allInCategory.map((i) => i.ratePerPost).sort((a, b) => a - b);

    // Platform count comparison
    const platformValues = allInCategory
      .map((i) => i.platforms?.length || 0)
      .sort((a, b) => a - b);

    const myViews = getProfileViewCount(me.id);
    const myStats = getProfileViewStats(me.id);

    const avgFollowers = Math.round(
      allInCategory.reduce((s, i) => s + i.followers, 0) / allInCategory.length
    );
    const avgViews = Math.round(
      allInCategory.reduce((s, i) => s + getProfileViewCount(i.id), 0) / allInCategory.length
    );
    const avgRate = Math.round(
      allInCategory.reduce((s, i) => s + i.ratePerPost, 0) / allInCategory.length
    );

    const top10Followers = followerValues[Math.floor(followerValues.length * 0.9)] || followerValues[followerValues.length - 1];
    const top10Views = viewValues[Math.floor(viewValues.length * 0.9)] || viewValues[viewValues.length - 1];
    const top10Rate = rateValues[Math.floor(rateValues.length * 0.9)] || rateValues[rateValues.length - 1];

    const metrics: BenchmarkMetric[] = [
      {
        label: "Followers",
        yours: me.followers,
        categoryAvg: avgFollowers,
        top10Threshold: top10Followers,
        percentile: percentileRank(me.followers, followerValues),
        icon: Users,
        color: "#2F6BFF",
        format: fmtNum,
      },
      {
        label: "Profile Views",
        yours: myViews,
        categoryAvg: avgViews,
        top10Threshold: top10Views,
        percentile: percentileRank(myViews, viewValues),
        icon: Eye,
        color: "#8b5cf6",
        format: fmtNum,
      },
      {
        label: "Collabs Starting At",
        yours: me.ratePerPost,
        categoryAvg: avgRate,
        top10Threshold: top10Rate,
        percentile: percentileRank(me.ratePerPost, rateValues),
        icon: TrendingUp,
        color: "#10b981",
        format: (n: number) => `₹${fmtNum(n)}`,
      },
    ];

    // Overall visibility percentile (average of all metric percentiles)
    const overallPercentile = Math.round(
      metrics.reduce((s, m) => s + m.percentile, 0) / metrics.length
    );

    return {
      me,
      peers,
      category: me.category,
      totalInCategory: allInCategory.length,
      metrics,
      overallPercentile,
      trend: myStats.trend,
    };
  }, [user]);

  if (!benchmark) return null;

  const { category, totalInCategory, metrics, overallPercentile, trend } = benchmark;

  // Determine rank label based on overall percentile
  const rankLabel =
    overallPercentile >= 90
      ? "Top 10%"
      : overallPercentile >= 75
      ? "Top 25%"
      : overallPercentile >= 50
      ? "Top 50%"
      : overallPercentile >= 25
      ? "Top 75%"
      : "Growing";

  const rankColor =
    overallPercentile >= 90
      ? "#f59e0b"
      : overallPercentile >= 75
      ? "#10b981"
      : overallPercentile >= 50
      ? "#2F6BFF"
      : "#8b5cf6";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#e2e8f0]">
        <div className="w-9 h-9 rounded-xl bg-[#fff7ed] flex items-center justify-center">
          <BarChart2 size={18} className="text-[#f59e0b]" />
        </div>
        <div className="flex-1">
          <p className="text-[#1a1a2e]">Creator Benchmark</p>
          <p className="text-[10px] text-[#94a3b8]">
            Compared to {totalInCategory - 1} other {category} creator{totalInCategory > 2 ? "s" : ""} on FLUBN
          </p>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Overall Rank Badge */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
              style={{ background: `${rankColor}12`, border: `2px solid ${rankColor}30` }}
            >
              <Crown size={22} style={{ color: rankColor }} />
              {overallPercentile >= 75 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center"
                >
                  <span className="text-[9px]" style={{ color: rankColor }}>
                    {overallPercentile >= 90 ? "🔥" : "⭐"}
                  </span>
                </motion.div>
              )}
            </div>
            <div>
              <p className="text-[#1a1a2e]" style={{ color: rankColor }}>
                {rankLabel}
              </p>
              <p className="text-[10px] text-[#94a3b8]">
                in {category} creators
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl text-[#1a1a2e]">{overallPercentile}<span className="text-sm text-[#94a3b8]">th</span></p>
            <p className="text-[10px] text-[#94a3b8]">percentile</p>
          </div>
        </div>

        {/* Metric comparison bars */}
        <div className="space-y-4">
          {metrics.map((metric, idx) => {
            const diff = metric.yours - metric.categoryAvg;
            const diffPct = metric.categoryAvg > 0 ? Math.round((diff / metric.categoryAvg) * 100) : 0;
            const isAbove = diff > 0;
            const isEqual = diff === 0;

            // For the bar, normalize against the top10 threshold
            const maxVal = Math.max(metric.top10Threshold, metric.yours) * 1.1;
            const yourBar = Math.max(Math.round((metric.yours / maxVal) * 100), 3);
            const avgBar = Math.max(Math.round((metric.categoryAvg / maxVal) * 100), 3);

            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.08 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <metric.icon size={13} style={{ color: metric.color }} />
                    <span className="text-[11px] text-[#475569]">{metric.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isEqual && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${isAbove ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                        {isAbove ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                        {Math.abs(diffPct)}% vs avg
                      </span>
                    )}
                    {isEqual && (
                      <span className="text-[10px] text-[#94a3b8] flex items-center gap-0.5">
                        <Minus size={9} /> On par
                      </span>
                    )}
                  </div>
                </div>

                {/* Double bar */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#94a3b8] w-8 shrink-0">You</span>
                    <div className="flex-1 h-[7px] bg-[#f1f5f9] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${yourBar}%` }}
                        transition={{ delay: 0.4 + idx * 0.08, duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: metric.color }}
                      />
                    </div>
                    <span className="text-[10px] text-[#1a1a2e] w-14 text-right tabular-nums">
                      {metric.format(metric.yours)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#94a3b8] w-8 shrink-0">Avg</span>
                    <div className="flex-1 h-[7px] bg-[#f1f5f9] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${avgBar}%` }}
                        transition={{ delay: 0.45 + idx * 0.08, duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full bg-[#cbd5e1]"
                      />
                    </div>
                    <span className="text-[10px] text-[#94a3b8] w-14 text-right tabular-nums">
                      {metric.format(metric.categoryAvg)}
                    </span>
                  </div>
                </div>

                {/* Top 10% threshold indicator */}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[9px] text-[#b0b8c9]">Top 10%: {metric.format(metric.top10Threshold)}+</span>
                  {metric.percentile >= 90 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#fff7ed] text-[#f59e0b]">
                      You're here!
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Insights / Tips */}
        <div className="mt-5 pt-4 border-t border-[#f1f5f9]">
          <p className="text-[10px] text-[#94a3b8] mb-2">Insights</p>
          <div className="space-y-1.5">
            {metrics.map((m) => {
              if (m.percentile >= 90) {
                return (
                  <p key={m.label} className="text-[11px] text-[#10b981] flex items-start gap-1.5">
                    <span className="mt-0.5">🏆</span>
                    Your {m.label.toLowerCase()} are in the top 10% of {category} creators
                  </p>
                );
              }
              if (m.percentile < 50 && m.yours < m.categoryAvg) {
                return (
                  <p key={m.label} className="text-[11px] text-[#64748b] flex items-start gap-1.5">
                    <span className="mt-0.5">💡</span>
                    Your {m.label.toLowerCase()} ({m.format(m.yours)}) are below the {category} average ({m.format(m.categoryAvg)}). Share your profile more to boost visibility.
                  </p>
                );
              }
              return (
                <p key={m.label} className="text-[11px] text-[#64748b] flex items-start gap-1.5">
                  <span className="mt-0.5">📊</span>
                  Your {m.label.toLowerCase()} are on track — keep engaging to climb higher.
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}