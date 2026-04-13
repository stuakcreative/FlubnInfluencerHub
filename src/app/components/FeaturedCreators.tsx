import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router";
import {
  MapPin,
  Users,
  Check,
  ArrowRight,
  Sparkles,
  Instagram,
  Youtube,
  Twitter,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Star,
  Zap,
  Award,
  TrendingUp,
  Heart,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getFeaturedInfluencers } from "../utils/dataManager";
import { TRUST_BADGES } from "../data/mock-data";
import { mergeInfluencerBadges } from "../utils/badgeEngine";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const SAVED_KEY_PREFIX = "brand-saved-influencers";
const CARD_HEIGHT = 440;
const GAP = 18;

const formatFollowers = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

const categoryColors: Record<string, { dot: string }> = {
  Fashion:    { dot: "bg-[#ec4899]" },
  Technology: { dot: "bg-[#3b82f6]" },
  Food:       { dot: "bg-[#f97316]" },
  Fitness:    { dot: "bg-[#10b981]" },
  Travel:     { dot: "bg-[#8b5cf6]" },
  Beauty:     { dot: "bg-[#d946ef]" },
  Lifestyle:  { dot: "bg-[#eab308]" },
  Gaming:     { dot: "bg-[#22c55e]" },
  Education:  { dot: "bg-[#0ea5e9]" },
};
const defaultDot = "bg-[#64748b]";

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "instagram": return Instagram;
    case "youtube":   return Youtube;
    case "twitter":   return Twitter;
    default:          return null;
  }
};

const getBadgeIcon = (iconName: string) => {
  switch (iconName) {
    case "BadgeCheck":  return BadgeCheck;
    case "Star":        return Star;
    case "Zap":         return Zap;
    case "Award":       return Award;
    case "TrendingUp":  return TrendingUp;
    case "Sparkles":    return Sparkles;
    case "Heart":       return Heart;
    default:            return BadgeCheck;
  }
};

function getVisibleCount(w: number): number {
  if (w < 560) return 1;
  if (w < 860) return 2;
  if (w < 1120) return 3;
  return 4;
}

/* ─── Creator Card ─────────────────────────────────────────────── */
function CreatorCard({
  inf,
  isFeatured = false,
}: {
  inf: any;
  isLiked: boolean;
  onToggleLike: (id: string) => boolean;
  isFeatured?: boolean;
}) {
  const dot = (categoryColors[inf.category] || { dot: defaultDot }).dot;
  const earnedBadges = inf.status === "active"
    ? mergeInfluencerBadges(inf)
        .map((id: string) => TRUST_BADGES.find((b) => b.id === id && b.status === "active"))
        .filter(Boolean) as typeof TRUST_BADGES
    : [];

  return (
    <div className="group relative h-full select-none">
      <Link
        to={(inf as any).username ? `/@${(inf as any).username}` : `/influencer/view/${inf.id}`}
        className="block relative h-full rounded-[22px] overflow-hidden bg-[#080711] shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.18)] transition-shadow duration-500"
        draggable={false}
      >
        {/* Photo */}
        <ImageWithFallback
          src={inf.photo}
          alt={inf.name}
          className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-[1.045] transition-transform duration-[900ms] ease-out"
        />

        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/20 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2F6BFF]/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-600" />

        {/* Top badges */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-lg text-white/90 text-[10px] border border-white/10">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {inf.category}
          </span>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {/* Platforms */}
          {inf.platforms?.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                {(inf.platforms || []).map((p: string) => {
                  const Icon = getPlatformIcon(p);
                  if (!Icon) return null;
                  return (
                    <span key={p} className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                      <Icon size={11} className="text-white/85" />
                    </span>
                  );
                })}
              </div>

              {/* Earned trust badges */}
              {earnedBadges.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {earnedBadges.slice(0, 3).map((badge) => {
                    const BadgeIcon = getBadgeIcon(badge.icon);
                    return (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.04 * earnedBadges.indexOf(badge), type: "spring", stiffness: 260, damping: 20 }}
                        title={badge.name}
                        className="relative"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{
                            background: `radial-gradient(circle at 38% 35%, ${badge.color}cc, ${badge.color}88)`,
                            border: `1.5px solid rgba(255,255,255,0.9)`,
                            boxShadow: `0 2px 6px ${badge.color}70`,
                          }}
                        >
                          <BadgeIcon size={11} style={{ color: "#fff" }} />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-[0.5px] shadow-sm">
                          <BadgeCheck size={6} style={{ color: badge.color, display: "block" }} />
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Overflow pill */}
                  {earnedBadges.length > 3 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 20 }}
                      title={`${earnedBadges.length - 3} more badge${earnedBadges.length - 3 > 1 ? "s" : ""}`}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(255,255,255,0.15)",
                        border: "1.5px solid rgba(255,255,255,0.9)",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                      }}
                    >
                      <span style={{ color: "#fff", fontSize: 8, fontWeight: 700, lineHeight: 1 }}>
                        +{earnedBadges.length - 3}
                      </span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Name + verified badge */}
          <div className="flex items-center gap-2 mb-1.5">
            <h4 className="text-white text-[16px] !leading-snug truncate">{inf.name}</h4>
            {inf.status === "active" && (
              <BadgeCheck
                size={15}
                strokeWidth={2.5}
                className="text-white shrink-0"
                style={{ filter: "drop-shadow(0 0 5px rgba(47,107,255,0.9)) drop-shadow(0 0 2px rgba(47,107,255,1))" }}
              />
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-white/80 text-[11px]">
            <span className="flex items-center gap-1">
              <MapPin size={10} className="text-white/60" />
              {(inf.location || "").split(",")[0]}
            </span>
            <span className="flex items-center gap-1">
              <Users size={10} className="text-white/60" />
              {(() => {
                // Use top-level followers if set, otherwise sum per-platform counts
                const total =
                  inf.followers && inf.followers > 0
                    ? inf.followers
                    : inf.platformFollowers && typeof inf.platformFollowers === "object"
                      ? Object.values(inf.platformFollowers as Record<string, number>).reduce(
                          (sum: number, v: number) => sum + (v || 0),
                          0
                        )
                      : 0;
                return total > 0 ? formatFollowers(total) : "—";
              })()}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ─── Section ──────────────────────────────────────────────────── */
export function FeaturedCreators() {
  const [influencers, setInfluencers] = useState<any[]>(() => getFeaturedInfluencers());
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Key is per-brand so saved lists never bleed across accounts
  const savedKey = `${SAVED_KEY_PREFIX}-${user?.id ?? "guest"}`;

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`${SAVED_KEY_PREFIX}-${user?.id ?? "guest"}`) ?? "[]"); }
    catch { return []; }
  });

  /* Slider state */
  const trackRef    = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingDir     = useRef<1 | -1>(1);

  const [containerW, setContainerW] = useState(0);
  const [slideIdx,   setSlideIdx]   = useState(0);
  const [isPaused,   setIsPaused]   = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  /* Measure */
  useEffect(() => {
    const measure = () => {
      if (trackRef.current) setContainerW(trackRef.current.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, []);

  const visible  = getVisibleCount(containerW);
  const cardW    = containerW > 0 ? (containerW - GAP * (visible - 1)) / visible : 240;
  const maxSlide = Math.max(0, influencers.length - visible);
  const canScroll = influencers.length > visible;
  const clamped  = Math.min(slideIdx, maxSlide);
  const translateX = -(clamped * (cardW + GAP));
  const fillPct = influencers.length > 0
    ? Math.min(100, ((clamped + visible) / influencers.length) * 100)
    : 100;

  /* Navigation */
  const slide = useCallback((dir: 1 | -1) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideIdx(p => Math.min(Math.max(p + dir, 0), maxSlide));
    setTimeout(() => setIsAnimating(false), 680);
  }, [isAnimating, maxSlide]);

  const goNext = useCallback(() => slide(1),  [slide]);
  const goPrev = useCallback(() => slide(-1), [slide]);
  const goTo   = useCallback((i: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideIdx(Math.min(Math.max(i, 0), maxSlide));
    setTimeout(() => setIsAnimating(false), 680);
  }, [isAnimating, maxSlide]);

  /* Reset on data change */
  useEffect(() => { setSlideIdx(0); pingDir.current = 1; }, [influencers.length]);

  /* Auto-scroll (ping-pong) */
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!canScroll || maxSlide <= 0 || isPaused) return;
    intervalRef.current = setInterval(() => {
      setSlideIdx(p => {
        const n = p + pingDir.current;
        if (n >= maxSlide) { pingDir.current = -1; return maxSlide; }
        if (n <= 0)        { pingDir.current =  1; return 0; }
        return n;
      });
    }, 3600);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [canScroll, maxSlide, isPaused]);

  /* Data refresh */
  useEffect(() => {
    const refresh = () => setInfluencers(getFeaturedInfluencers());
    refresh();
    window.addEventListener("influencersUpdated", refresh);
    const onStorage = (e: StorageEvent) => { if (e.key === "flubn_influencers") refresh(); };
    window.addEventListener("storage", onStorage);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("influencersUpdated", refresh);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  /* Saved sync — re-read whenever the logged-in user changes */
  useEffect(() => {
    const sync = () => {
      try { setSavedIds(JSON.parse(localStorage.getItem(savedKey) ?? "[]")); }
      catch { setSavedIds([]); }
    };
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, [savedKey]);

  const toggleSave = useCallback((id: string): boolean => {
    if (!isAuthenticated) {
      toast.error("Sign in to save influencers", {
        description: "Create a brand account to save your favourite creators",
        action: { label: "Sign in", onClick: () => navigate("/login") },
      });
      return false;
    }
    if (user?.role !== "brand") {
      toast.error("Only brands can save influencers", { description: "This feature is available for brand accounts" });
      return false;
    }
    setSavedIds(prev => {
      const has = prev.includes(id);
      const next = has ? prev.filter(s => s !== id) : [...prev, id];
      localStorage.setItem(savedKey, JSON.stringify(next));
      const inf = influencers.find(i => i.id === id);
      toast.success(has ? "Removed from saved" : "Saved to favourites", { description: inf?.name });
      return next;
    });
    return true;
  }, [isAuthenticated, user, navigate, influencers, savedKey]);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <section className="py-16 lg:py-24 px-5 sm:px-8 lg:px-[100px] relative overflow-hidden">
      {/* BG blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] opacity-[0.035]"
          style={{ background: "radial-gradient(circle at 65% 25%, #2F6BFF, transparent 58%)" }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] opacity-[0.025]"
          style={{ background: "radial-gradient(circle at 35% 75%, #6BA9FF, transparent 55%)" }} />
      </div>

      <div className="relative">
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.09 } } }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10"
        >
          {/* Left: title + sub */}
          <div>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } }}
              className="flex items-center gap-2.5 mb-4"
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2F6BFF]/[0.07] border border-[#2F6BFF]/12 text-[#2F6BFF] text-sm">
                <Sparkles size={13} />
                Handpicked by FLUBN
              </span>
            </motion.div>

            <motion.h2
              variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } }}
              className="text-[#0a090f] text-[32px] sm:text-[43px] !leading-[1.05]"
            >
              Featured creators
            </motion.h2>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } }}
              className="text-[#64748b] text-[16px] leading-relaxed mt-3 max-w-[500px]"
            >
              Top influencers selected for their outstanding content, engagement, and brand collaboration track record.
            </motion.p>
          </div>

          {/* Right: nav arrows + CTA */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55 } } }}
            className="flex items-center gap-3 shrink-0"
          >
            {canScroll && (
              <div className="flex items-center gap-1.5 p-1 bg-[#f1f4fb] rounded-full border border-[#e2e8f0]">
                <button
                  onClick={goPrev}
                  disabled={clamped === 0}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#475569] bg-transparent hover:bg-white hover:text-[#2F6BFF] hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                  aria-label="Previous"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  onClick={goNext}
                  disabled={clamped >= maxSlide}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#475569] bg-transparent hover:bg-white hover:text-[#2F6BFF] hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                  aria-label="Next"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            )}

            <Link
              to="/discover"
              className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-full hover:shadow-[0_8px_28px_rgba(47,107,255,0.32)] transition-all duration-300 text-[15px] group"
              style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
            >
              Discover all
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-300" />
            </Link>
          </motion.div>
        </motion.div>

        {/* ── Card strip ─────────────────────────────────────────── */}
        {influencers.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Overflow clip wrapper */}
            <div ref={trackRef} className="overflow-hidden rounded-[4px]">
              {/* Sliding track */}
              <div
                className="flex"
                style={{
                  gap: `${GAP}px`,
                  transform: `translateX(${translateX}px)`,
                  transition: "transform 0.68s cubic-bezier(0.32, 0.72, 0, 1)",
                  willChange: "transform",
                }}
              >
                {influencers.map((inf, i) => (
                  <div
                    key={inf.id}
                    style={{ width: `${cardW}px`, height: `${CARD_HEIGHT}px`, flexShrink: 0 }}
                  >
                    <CreatorCard
                      inf={inf}
                      isLiked={savedIds.includes(inf.id)}
                      onToggleLike={toggleSave}
                      isFeatured={i === 0}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Footer: progress + dots ─────────────────────── */}
            {canScroll && (
              <div className="mt-5 flex items-center gap-5">
                {/* Readable count */}
                <span className="text-[13px] text-[#94a3b8] shrink-0 tabular-nums">
                  {clamped + 1}–{Math.min(clamped + visible, influencers.length)}{" "}
                  <span className="text-[#cbd5e1]">of</span>{" "}
                  {influencers.length}
                </span>

                {/* Track bar + dot combo */}
                <div className="flex-1 flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="flex-1 h-[3px] bg-[#edf0f7] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#2F6BFF] to-[#6BA9FF] rounded-full"
                      animate={{ width: `${fillPct}%` }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                    />
                  </div>

                  {/* Dot indicators (max 8, else hidden) */}
                  {maxSlide + 1 <= 8 && (
                    <div className="flex items-center gap-1">
                      {Array(maxSlide + 1).fill(null).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => goTo(i)}
                          aria-label={`Go to position ${i + 1}`}
                          className={`rounded-full transition-all duration-300 ${
                            i === clamped
                              ? "w-5 h-2 bg-[#2F6BFF]"
                              : "w-2 h-2 bg-[#d1d9ee] hover:bg-[#a0aece]"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center py-20 rounded-[28px] bg-gradient-to-br from-[#f8f9fc] to-[#eef2ff] border border-[#e2e8f0]"
          >
            <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-5">
              <Sparkles size={30} className="text-[#2F6BFF]" />
            </div>
            <p className="text-[#1a1a2e] text-xl">No featured creators yet</p>
            <p className="text-[#64748b] text-sm mt-2 text-center max-w-[340px]">
              Our team is curating the best creators. Check back soon or explore all creators now.
            </p>
            <Link
              to="/discover"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-[#2F6BFF] text-sm rounded-full border border-[#2F6BFF]/20 hover:bg-[#2F6BFF]/5 transition-colors"
            >
              Browse all creators <ArrowRight size={14} />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}