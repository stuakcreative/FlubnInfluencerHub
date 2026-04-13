/**
 * Profile Views Tracker
 * Tracks unique profile views per influencer using localStorage.
 * In production, this would be backed by Supabase analytics.
 */

const STORAGE_KEY = "flubn_profile_views";
const SESSION_KEY = "flubn_viewed_profiles";
const SEED_VERSION_KEY = "flubn_profile_views_seed_v";
const CURRENT_SEED_VERSION = 2; // Bump when seed data format changes

export interface ProfileViewEntry {
  influencerId: string;
  timestamp: string;
  referrer: string;
  source: "direct" | "shared_link" | "discover" | "search" | "social";
}

export interface ProfileViewStats {
  totalViews: number;
  uniqueVisitors: number;
  viewsByDay: { date: string; views: number }[];
  viewsBySource: { source: string; count: number }[];
  recentViews: ProfileViewEntry[];
  trend: number; // percentage change vs previous period
  topReferrers: { url: string; domain: string; count: number; favicon: string }[];
}

function getStoredViews(): ProfileViewEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveViews(views: ProfileViewEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

function getSessionViewed(): string[] {
  try {
    const data = sessionStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function addSessionViewed(influencerId: string): void {
  const viewed = getSessionViewed();
  if (!viewed.includes(influencerId)) {
    viewed.push(influencerId);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(viewed));
  }
}

/**
 * Detect the source of the visit based on referrer and URL params.
 */
function detectSource(): ProfileViewEntry["source"] {
  const url = new URL(window.location.href);
  const ref = document.referrer;

  // Check for UTM or share params
  if (url.searchParams.get("utm_source") === "share" || url.searchParams.get("ref") === "share") {
    return "shared_link";
  }

  // Check referrer for social platforms
  if (ref) {
    const socialDomains = ["facebook.com", "twitter.com", "x.com", "linkedin.com", "instagram.com", "youtube.com", "t.me", "whatsapp.com", "wa.me"];
    if (socialDomains.some((d) => ref.includes(d))) return "social";
    if (ref.includes(window.location.origin)) {
      // Internal referrer — check if from discover page
      if (ref.includes("/discover") || ref.includes("/brand/discover")) return "discover";
      if (ref.includes("/search")) return "search";
    }
  }

  return "direct";
}

/**
 * Record a profile view. Deduplicates within the same session.
 */
export function recordProfileView(influencerId: string): void {
  const sessionViewed = getSessionViewed();
  
  // Only count one view per profile per session
  if (sessionViewed.includes(influencerId)) return;

  const entry: ProfileViewEntry = {
    influencerId,
    timestamp: new Date().toISOString(),
    referrer: document.referrer || "direct",
    source: detectSource(),
  };

  const views = getStoredViews();
  views.push(entry);

  // Cap at 10,000 entries to avoid localStorage bloat
  if (views.length > 10000) {
    views.splice(0, views.length - 10000);
  }

  saveViews(views);
  addSessionViewed(influencerId);

  // Dispatch event for real-time dashboard updates
  window.dispatchEvent(new CustomEvent("profileViewRecorded", { detail: { influencerId, entry } }));
}

/**
 * Get the total view count for an influencer.
 */
export function getProfileViewCount(influencerId: string): number {
  return getStoredViews().filter((v) => v.influencerId === influencerId).length;
}

/**
 * Get detailed stats for an influencer's profile views.
 */
export function getProfileViewStats(influencerId: string, days: number = 30): ProfileViewStats {
  const allViews = getStoredViews().filter((v) => v.influencerId === influencerId);
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousCutoff = new Date(cutoff.getTime() - days * 24 * 60 * 60 * 1000);

  const periodViews = allViews.filter((v) => new Date(v.timestamp) >= cutoff);
  const previousPeriodViews = allViews.filter(
    (v) => new Date(v.timestamp) >= previousCutoff && new Date(v.timestamp) < cutoff
  );

  // Unique visitors (approximate: by day + source combination)
  const uniqueKeys = new Set(periodViews.map((v) => `${v.timestamp.slice(0, 10)}-${v.source}`));

  // Views by day
  const dayMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = 0;
  }
  periodViews.forEach((v) => {
    const key = v.timestamp.slice(0, 10);
    if (dayMap[key] !== undefined) dayMap[key]++;
  });
  const viewsByDay = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, views]) => ({ date, views }));

  // Views by source
  const sourceMap: Record<string, number> = {};
  periodViews.forEach((v) => {
    sourceMap[v.source] = (sourceMap[v.source] || 0) + 1;
  });
  const viewsBySource = Object.entries(sourceMap)
    .sort(([, a], [, b]) => b - a)
    .map(([source, count]) => ({ source, count }));

  // Trend
  const trend =
    previousPeriodViews.length > 0
      ? Math.round(((periodViews.length - previousPeriodViews.length) / previousPeriodViews.length) * 100)
      : periodViews.length > 0
      ? 100
      : 0;

  // Top referrers — group by domain, rank by count
  const referrerMap: Record<string, { url: string; count: number }> = {};
  periodViews.forEach((v) => {
    if (!v.referrer || v.referrer === "direct" || v.referrer === "") return;
    try {
      const u = new URL(v.referrer.startsWith("http") ? v.referrer : `https://${v.referrer}`);
      const domain = u.hostname.replace(/^www\./, "");
      if (!referrerMap[domain]) {
        referrerMap[domain] = { url: v.referrer, count: 0 };
      }
      referrerMap[domain].count++;
    } catch {
      // non-URL referrer string
      const domain = v.referrer.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      if (domain) {
        if (!referrerMap[domain]) {
          referrerMap[domain] = { url: v.referrer, count: 0 };
        }
        referrerMap[domain].count++;
      }
    }
  });

  const topReferrers = Object.entries(referrerMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 8)
    .map(([domain, { url, count }]) => ({
      url,
      domain,
      count,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    }));

  return {
    totalViews: allViews.length,
    uniqueVisitors: uniqueKeys.size,
    viewsByDay,
    viewsBySource,
    recentViews: periodViews.slice(-20).reverse(),
    trend,
    topReferrers,
  };
}

/**
 * Seed some initial view data for demo purposes.
 * This ensures new users see meaningful analytics.
 */
export function seedProfileViews(influencerIds: string[]): void {
  const existing = getStoredViews();
  const storedVersion = parseInt(localStorage.getItem(SEED_VERSION_KEY) || "0", 10);

  // Re-seed if version changed (new referrer data) or no data exists
  if (existing.length > 0 && storedVersion >= CURRENT_SEED_VERSION) return;

  // Clear old seed data if version mismatch
  if (storedVersion < CURRENT_SEED_VERSION) {
    localStorage.removeItem(STORAGE_KEY);
  }

  const sources: ProfileViewEntry["source"][] = ["direct", "shared_link", "discover", "search", "social"];

  // Realistic referrer URLs for seeding
  const referrerPool: Record<ProfileViewEntry["source"], string[]> = {
    direct: [""],
    shared_link: [
      "https://wa.me",
      "https://t.me/share",
      "https://wa.me/send",
    ],
    discover: [
      `${window.location.origin}/discover`,
      `${window.location.origin}/brand/discover`,
    ],
    search: [
      `${window.location.origin}/brand/discover?q=fashion`,
      `${window.location.origin}/brand/discover?q=lifestyle`,
    ],
    social: [
      "https://instagram.com/stories",
      "https://instagram.com/p/abc123",
      "https://twitter.com/user/status/123456",
      "https://x.com/user/status/789012",
      "https://linkedin.com/feed/update/urn:li:activity:123",
      "https://linkedin.com/posts/creator-spotlight",
      "https://youtube.com/watch?v=demoVideo1",
      "https://youtube.com/shorts/shortDemo2",
      "https://facebook.com/groups/influencerHub",
      "https://reddit.com/r/influencermarketing/comments/abc",
      "https://blog.example.com/top-influencers-2026",
      "https://medium.com/@brand/best-creators-to-follow",
      "https://pinterest.com/pin/987654321",
      "https://quora.com/What-are-the-best-influencer-platforms",
    ],
  };

  const views: ProfileViewEntry[] = [];
  const now = Date.now();

  influencerIds.forEach((infId) => {
    // Generate 30-90 views over the past 30 days
    const viewCount = 30 + Math.floor(Math.random() * 60);
    for (let i = 0; i < viewCount; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const hoursAgo = Math.floor(Math.random() * 24);
      const timestamp = new Date(now - daysAgo * 86400000 - hoursAgo * 3600000);
      const source = sources[Math.floor(Math.random() * sources.length)];
      const pool = referrerPool[source];
      const referrer = pool[Math.floor(Math.random() * pool.length)];
      views.push({
        influencerId: infId,
        timestamp: timestamp.toISOString(),
        referrer,
        source,
      });
    }
  });

  saveViews(views);
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION.toString());
}