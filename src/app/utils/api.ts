/**
 * API Client for FLUBN Backend
 * Communicates with the Supabase Edge Function server.
 * All data is persisted in the Supabase KV store.
 */
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/server`;

/** Get the current auth token (Supabase session or anon key) */
function getAuthHeader(): string {
  try {
    const session = localStorage.getItem("flubn_session");
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed?.access_token) {
        return `Bearer ${parsed.access_token}`;
      }
    }
  } catch { /* ignore */ }
  return `Bearer ${publicAnonKey}`;
}

const isNetworkError = (err: any): boolean =>
  err?.message?.includes("Failed to fetch") ||
  err?.message?.includes("NetworkError") ||
  err?.message?.includes("Load failed") ||
  err?.message?.includes("net::ERR_");

async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: getAuthHeader(),
    ...(options.headers as Record<string, string> || {}),
  };

  // Abort after 30 seconds to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errorBody = await res.text();
      // 404s indicate missing documents or endpoints that haven't been deployed yet.
      // Treat them as a silent no-op (same as offline) so callers don't throw.
      // 401s mean no valid session yet — contexts fall back to localStorage defaults.
      if (res.status === 404 || res.status === 401 || res.status === 403) {
        return null as T;
      }
      console.error(`API error [${res.status}] ${path}:`, errorBody);
      throw new Error(`API error ${res.status}: ${errorBody}`);
    }
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (isNetworkError(err) || err.name === "AbortError") {
      // Network unavailable or timeout — return null so callers degrade gracefully
      return null as T;
    }
    console.error(`API request failed for ${path}:`, err.message);
    throw err;
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signup(data: {
  email: string;
  password: string;
  name: string;
  role: string;
  profileData?: any;
}) {
  return request("/signup", { method: "POST", body: JSON.stringify(data) });
}

export async function login(data: { email: string; password: string }) {
  return request("/login", { method: "POST", body: JSON.stringify(data) });
}

export async function getProfile() {
  return request("/me");
}

export async function updateProfile(updates: any) {
  return request("/me", { method: "PUT", body: JSON.stringify(updates) });
}

// ── User Account Management ──────────────────────────────────────────────────

export async function changePassword(currentPassword: string, newPassword: string) {
  return request<{ success: boolean; error?: string }>("/user/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function deleteAccount(reason: string, notes?: string) {
  return request<{ success: boolean; error?: string }>("/user/delete-account", {
    method: "POST",
    body: JSON.stringify({ reason, notes }),
  });
}

// ── Influencers ─────────────────────────────────────────────────────────────

export async function getInfluencers() {
  return request("/influencers");
}

export async function getInfluencer(id: string) {
  return request(`/influencers/${id}`);
}

export async function saveInfluencer(data: any) {
  return request("/influencers", { method: "POST", body: JSON.stringify(data) });
}

export async function updateInfluencer(id: string, updates: any) {
  return request(`/influencers/${id}`, { method: "PUT", body: JSON.stringify(updates) });
}

export async function deleteInfluencer(id: string) {
  return request(`/influencers/${id}`, { method: "DELETE" });
}

// ── Collaborations ───────────────────────────────────────────────────────────

export async function getCollaborations(filters?: { brandId?: string; influencerId?: string }) {
  const params = new URLSearchParams();
  if (filters?.brandId) params.set("brandId", filters.brandId);
  if (filters?.influencerId) params.set("influencerId", filters.influencerId);
  const qs = params.toString();
  return request(`/collaborations${qs ? `?${qs}` : ""}`);
}

export async function createCollaboration(data: any) {
  return request("/collaborations", { method: "POST", body: JSON.stringify(data) });
}

export async function updateCollaboration(id: string, updates: any) {
  return request(`/collaborations/${id}`, { method: "PUT", body: JSON.stringify(updates) });
}

export async function sendCollabMessage(collaborationId: string, message: any) {
  return request(`/collaborations/${collaborationId}/message`, {
    method: "POST",
    body: JSON.stringify(message),
  });
}

export async function saveAllCollaborations(collaborations: any[]) {
  return request("/collaborations", { method: "PUT", body: JSON.stringify(collaborations) });
}

// ── Admin Users ──────────────────────────────────────────────────────────────

export async function getAdminUsers() {
  return request("/admin/users");
}

export async function updateAdminUser(id: string, updates: any) {
  return request(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(updates) });
}

export async function addAdminUser(user: any) {
  return request("/admin/users", { method: "POST", body: JSON.stringify(user) });
}

export async function removeAdminUser(id: string) {
  return request(`/admin/users/${id}`, { method: "DELETE" });
}

// ── Blog Posts ──────────────────────────────────────────────────────────────

export async function getBlogPosts() {
  return request("/blogs");
}

export async function createBlogPost(data: any) {
  return request("/blogs", { method: "POST", body: JSON.stringify(data) });
}

export async function updateBlogPost(id: string, updates: any) {
  return request(`/blogs/${id}`, { method: "PUT", body: JSON.stringify(updates) });
}

export async function deleteBlogPost(id: string) {
  return request(`/blogs/${id}`, { method: "DELETE" });
}

export async function saveAllBlogPosts(posts: any[]) {
  return request("/blogs/batch", { method: "PUT", body: JSON.stringify(posts) });
}

// ── Brand Verification ──────────────────────────────────────────────────────

export async function getVerifications() {
  return request("/verifications");
}

export async function getVerification(brandId: string) {
  return request(`/verifications/${brandId}`);
}

export async function submitVerification(data: any) {
  return request("/verifications", { method: "POST", body: JSON.stringify(data) });
}

export async function approveVerification(brandId: string, adminName: string, adminNotes?: string) {
  return request(`/verifications/${brandId}/approve`, {
    method: "PUT",
    body: JSON.stringify({ adminName, adminNotes }),
  });
}

export async function rejectVerification(brandId: string, reason: string) {
  return request(`/verifications/${brandId}/reject`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });
}

export async function saveAllVerifications(verifications: any[]) {
  return request("/verifications", { method: "PUT", body: JSON.stringify(verifications) });
}

// ── Subscription ─────────────────────────────────────────────────────────────

export async function getBrandPlan(userId: string) {
  return request(`/subscription/${userId}`);
}

export async function saveBrandPlan(userId: string, planData: any) {
  return request(`/subscription/${userId}`, { method: "PUT", body: JSON.stringify(planData) });
}

export async function getMessageUsage(userId: string) {
  return request(`/message-usage/${userId}`);
}

export async function incrementMessageUsage(userId: string) {
  return request(`/message-usage/${userId}/increment`, { method: "POST" });
}

// ── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(key: string) {
  return request(`/settings/${key}`);
}

export async function saveSettings(key: string, data: any) {
  return request(`/settings/${key}`, { method: "PUT", body: JSON.stringify(data) });
}

// ── Generic Data ─────────────────────────────────────────────────────────────

export async function getData(key: string) {
  return request(`/data/${key}`);
}

export async function saveData(key: string, data: any) {
  return request(`/data/${key}`, { method: "PUT", body: JSON.stringify(data) });
}

// ── Statistics ───────────────────────────────────────────────────────────────

export async function getStats() {
  return request("/stats");
}

// ── Admin Password Change (server-side) ──────────────────────────────────────

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  return request("/admin/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ── Seed ─────────────────────────────────────────────────────────────────────

export async function seedData(data: any) {
  return request("/seed", { method: "POST", body: JSON.stringify(data) });
}

export async function forceSeedData(data: any) {
  return request("/seed/force", { method: "POST", body: JSON.stringify(data) });
}

export async function cleanupMockData() {
  return request("/seed/cleanup-mock", { method: "POST" });
}

// ── IP Tracking ────────────────────────────────────────────────────────────

export async function getIPRecords() {
  return request("/ip-tracking");
}

export async function saveIPRecords(records: any[]) {
  return request("/ip-tracking", { method: "PUT", body: JSON.stringify(records) });
}

export async function getIPSettings() {
  return request("/ip-settings");
}

export async function saveIPSettings(settings: any) {
  return request("/ip-settings", { method: "PUT", body: JSON.stringify(settings) });
}

// ── Billing ─────────────────────────────────────────────────────────────────

export async function getBillingHistory(userId: string) {
  return request(`/billing/${userId}`);
}

export async function addBillingEntry(userId: string, entry: any) {
  return request(`/billing/${userId}`, { method: "POST", body: JSON.stringify(entry) });
}

// ── Ratings ──────────────────────────────────────────────────────────────────

export async function getRatings() {
  return request("/ratings");
}

export async function saveRatings(ratings: any[]) {
  return request("/ratings", { method: "PUT", body: JSON.stringify(ratings) });
}

// ── Inquiries ────────────────────────────────────────────────────────────────

export async function getInquiries() {
  return request("/inquiries");
}

export async function submitInquiry(data: any) {
  return request("/inquiries", { method: "POST", body: JSON.stringify(data) });
}

export async function saveInquiries(inquiries: any[]) {
  return request("/inquiries", { method: "PUT", body: JSON.stringify(inquiries) });
}

// ── Deletion Requests ────────────────────────────────────────────────────────

export async function getDeletionRequests() {
  return request("/deletion-requests");
}

export async function submitDeletionRequest(data: any) {
  return request("/deletion-requests", { method: "POST", body: JSON.stringify(data) });
}

export async function saveDeletionRequests(requests: any[]) {
  return request("/deletion-requests", { method: "PUT", body: JSON.stringify(requests) });
}

// ── Trust Badges ─────────────────────────────────────────────────────────────

export async function getTrustBadges() {
  return request("/trust-badges");
}

export async function saveTrustBadges(badges: any) {
  return request("/trust-badges", { method: "PUT", body: JSON.stringify(badges) });
}

// ── Favorites ────────────────────────────────────────────────────────────────

export async function getFavorites(userId: string) {
  return request(`/favorites/${userId}`);
}

export async function saveFavorites(userId: string, favorites: any[]) {
  return request(`/favorites/${userId}`, { method: "PUT", body: JSON.stringify(favorites) });
}

// ── Email ────────────────────────────────────────────────────────────────────

export async function sendEmailViaEdgeFunction(data: {
  to: string;
  subject: string;
  htmlBody: string;
  templateId?: string;
  // Provider credentials — passed through to the edge function for server-side sending.
  // When present the edge function calls the provider directly (no CORS limitation).
  provider?: string;
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
  // Mailgun-specific
  domain?: string;
  region?: string;
  textBody?: string;
}) {
  return request<{ success: boolean; messageId?: string; error?: string }>("/email/send", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function sendBulkEmail(data: {
  recipients: Array<{ email: string; name: string }>;
  subject: string;
  htmlBody: string;
  templateId?: string;
}) {
  return request<{ success: boolean; sent: number; failed: number; error?: string }>("/email/bulk", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Dashboard Layout ──────────────────────────────────────────────────────────

export async function getDashboardLayout(dashboardType: string) {
  return request<{ order: string[]; updatedAt: string } | null>(`/dashboard-layout/${dashboardType}`);
}

export async function saveDashboardLayout(dashboardType: string, order: string[]) {
  return request<{ success: boolean }>(`/dashboard-layout/${dashboardType}`, {
    method: "PUT",
    body: JSON.stringify({ order }),
  });
}