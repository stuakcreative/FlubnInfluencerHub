import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import * as api from "../utils/api";
import { sendWelcomeEmail } from "../utils/emailNotifications";

/** Safe localStorage.setItem — clears non-essential cache keys on QuotaExceededError */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e?.name === "QuotaExceededError" || e?.code === 22) {
      console.warn(`[FLUBN] Quota exceeded for "${key}". Clearing caches…`);
      const expendable = ["flubn_trust_logos", "flubn_trust_badges_cache", "flubn_footer_cache"];
      expendable.forEach((k) => localStorage.removeItem(k));
      const protected_ = ["flubn_session", "flubn_user", "flubn_pricing_plans", "flubn_testimonials", "flubn_influencers", "flubn_collaboration_requests", "flubn_collab_wipe_v1"];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("flubn_") && !protected_.includes(k)) {
          localStorage.removeItem(k);
        }
      }
      try { localStorage.setItem(key, value); } catch {
        console.warn(`[FLUBN] Still over quota for "${key}". Skipping.`);
      }
    } else {
      throw e;
    }
  }
}

export type UserRole = "brand" | "influencer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePicture?: string;
  phone?: string;
  profileCompleted?: boolean;
  agreedToTerms?: boolean;
  agreedToPrivacy?: boolean;
  // Brand-specific fields
  companyName?: string;
  industry?: string;
  website?: string;
  brandContactEmail?: string;
  // Influencer-specific fields
  bio?: string;
  location?: string;
  category?: string;
  followers?: string;
  ratePerPost?: string;
  currency?: string;
  gender?: string;
  username?: string;
  socialLinks?: { platformId: string; url: string }[];
  platformFollowers?: { platformId: string; followers: string }[];
  portfolio?: any[];
  contentSpecialties?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole, profileData?: Partial<User>) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  isLoading: boolean;
  /** True once the Supabase session has been validated (not just cache-read).
   *  DashboardLayout role-guards must wait for this before redirecting. */
  isSessionValidated: boolean;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  updateProfile: () => {},
  isLoading: true,
  isSessionValidated: false,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Create a singleton Supabase client for the frontend
// ── Custom storage adapter ────────────────────────────────────────────────────
// The preview iframe has a very small localStorage quota (~5 KB). Supabase's
// auth token alone can exceed it, causing "exceeded the quota" errors.
// We use sessionStorage first, falling back to an in-memory map.
const memoryStore: Record<string, string> = {};

const safeStorage = {
  getItem: (key: string): string | null => {
    try { return sessionStorage.getItem(key); } catch { return memoryStore[key] ?? null; }
  },
  setItem: (key: string, value: string): void => {
    try { sessionStorage.setItem(key, value); } catch {
      try { localStorage.setItem(key, value); } catch { memoryStore[key] = value; }
    }
  },
  removeItem: (key: string): void => {
    try { sessionStorage.removeItem(key); } catch {}
    try { localStorage.removeItem(key); } catch {}
    delete memoryStore[key];
  },
};

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  { auth: { storage: safeStorage, persistSession: true, autoRefreshToken: true } },
);
export { supabase };

/** True when err (or err.message) looks like a network / connectivity failure. */
function isAuthNetworkError(err: any): boolean {
  const msg: string = err?.message || String(err || "");
  return (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed") ||
    msg.includes("net::ERR_") ||
    msg.includes("FetchError")
  );
}

/** Build a User object from Supabase user_metadata */
function buildUserFromMeta(id: string, email: string, meta: any, roleOverride?: UserRole): User {
  const effectiveRole = (meta?.role as UserRole) || roleOverride || "brand";
  const effectiveName =
    effectiveRole === "brand"
      ? meta?.companyName || meta?.name || email.split("@")[0] || "User"
      : meta?.name || email.split("@")[0] || "User";

  return {
    id,
    name: effectiveName,
    email,
    role: effectiveRole,
    profilePicture: meta?.profilePicture,
    phone: meta?.phone,
    profileCompleted: meta?.profileCompleted !== false,
    agreedToTerms: meta?.agreedToTerms,
    agreedToPrivacy: meta?.agreedToPrivacy,
    bio: meta?.bio,
    location: meta?.location,
    category: meta?.category,
    followers: meta?.followers,
    ratePerPost: meta?.ratePerPost,
    currency: meta?.currency,
    gender: meta?.gender,
    username: meta?.username,
    socialLinks: meta?.socialLinks || [],
    platformFollowers: meta?.platformFollowers || [],
    portfolio: meta?.portfolio || [],
    contentSpecialties: meta?.contentSpecialties || [],
    companyName: meta?.companyName,
    industry: meta?.industry,
    website: meta?.website,
    brandContactEmail: meta?.brandContactEmail,
  };
}

/** Upsert the user into flubn_admin_users localStorage so the admin panel always has them. */
function upsertAdminUser(u: User): void {
  if (!u.id || !u.email || u.role === "admin") return; // Don't add admin accounts to the user list
  try {
    const key = "flubn_admin_users";
    const raw = localStorage.getItem(key);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const existingIdx = list.findIndex(
      (a: any) => a.id === u.id || a.email?.toLowerCase() === u.email.toLowerCase()
    );
    if (existingIdx === -1) {
      // New entry — prepend
      list.unshift({
        id: u.id,
        name: u.role === "brand" ? (u.companyName || u.name) : u.name,
        email: u.email.toLowerCase(),
        role: u.role,
        status: "active",
        joinDate: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(list));
    } else {
      // Update name/role if they changed, but preserve admin-applied status/plan
      const existing = list[existingIdx];
      const updatedName = u.role === "brand" ? (u.companyName || u.name) : u.name;
      if (existing.name !== updatedName || existing.role !== u.role) {
        list[existingIdx] = { ...existing, name: updatedName, role: u.role };
        localStorage.setItem(key, JSON.stringify(list));
      }
    }
  } catch { /* non-critical */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionValidated, setIsSessionValidated] = useState(false);

  // Load user from localStorage cache + validate session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for cached user first for instant UI — but DON'T set isLoading=false yet.
        // We keep isLoading=true until Supabase confirms the session so that role-guards
        // in DashboardLayout don't fire against a stale cached role.
        const cachedUser = localStorage.getItem("flubn_user");
        let cachedParsed: User | null = null;
        if (cachedUser) {
          try {
            cachedParsed = JSON.parse(cachedUser) as User;
            setUser(cachedParsed);
          } catch { /* ignore */ }
          // ← intentionally NOT setting isLoading=false or isSessionValidated=true here
        }

        // Validate the session with Supabase directly (with timeout)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
        const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);

        if (!sessionResult || !("data" in sessionResult)) {
          if (!cachedUser) {
            setUser(null);
            localStorage.removeItem("flubn_user");
            localStorage.removeItem("flubn_session");
          }
          setIsLoading(false);
          setIsSessionValidated(true);
          return;
        }

        const { data: { session }, error } = sessionResult;
        if (error || !session) {
          if (!cachedUser) {
            setUser(null);
            localStorage.removeItem("flubn_user");
            localStorage.removeItem("flubn_session");
          }
          setIsLoading(false);
          setIsSessionValidated(true);
          return;
        }

        // Store session token
        safeSetItem("flubn_session", JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }));

        // Build profile from metadata (instant) — this is the authoritative role
        const meta = session.user.user_metadata;
        // Use the cached role as a fallback so a hot-reload never resets admin → brand
        // when user_metadata.role is not explicitly stored in Supabase.
        const metaProfile = buildUserFromMeta(session.user.id, session.user.email || "", meta, cachedParsed?.role ?? undefined);
        setUser(metaProfile);
        safeSetItem("flubn_user", JSON.stringify(metaProfile));

        // Session is confirmed — safe for role-guards to act
        setIsLoading(false);
        setIsSessionValidated(true);

        // Background: try to get richer profile from edge function KV store
        api.getProfile()
          .then(profile => {
            if (profile?.id) {
              const enriched: User = { ...metaProfile };
              (Object.keys(profile) as (keyof User)[]).forEach((key) => {
                // Never overwrite the authenticated role from the KV store —
                // the KV store may have a stale/different role and would cause
                // the admin → brand redirect bug on hot reload.
                if (key === "role") return;
                const val = profile[key];
                if (val !== undefined && val !== null && val !== "") {
                  (enriched as any)[key] = val;
                }
              });
              setUser(enriched);
              safeSetItem("flubn_user", JSON.stringify(enriched));
            }
          })
          .catch(() => { /* edge function unavailable — metadata profile is fine */ });

      } catch {
        // Supabase session check failed — keep cached user if present
        setIsSessionValidated(true);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        localStorage.removeItem("flubn_user");
        localStorage.removeItem("flubn_session");
      } else if (event === "TOKEN_REFRESHED" && session) {
        safeSetItem("flubn_session", JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * LOGIN — uses Supabase Auth directly. No edge function dependency.
   * Works for ALL users (brand, influencer, admin) as long as the account exists.
   */
  const login = async (email: string, password: string, role: UserRole) => {
    // Step 1: Direct Supabase Auth — always reliable
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Surface network problems as a friendly, non-technical message
      if (isAuthNetworkError(error)) {
        throw new Error("Connection error — please check your internet and try again.");
      }
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("invalid_credentials")
      ) {
        throw new Error("Invalid email or password. Please check your credentials.");
      }
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      throw new Error("Login failed. Please try again.");
    }

    const meta = data.user.user_metadata || {};
    const serverRole = meta.role as UserRole | undefined;

    // Step 2: Role validation
    if (serverRole && serverRole !== role) {
      // Sign out immediately to prevent wrong-role session
      await supabase.auth.signOut().catch(() => {});
      throw new Error(
        `This account is registered as "${serverRole}". Please select the "${serverRole}" tab.`
      );
    }

    const effectiveRole: UserRole = serverRole || role;

    // Step 3: Build profile from metadata (instant, no network needed)
    const userProfile = buildUserFromMeta(data.user.id, data.user.email || email, meta, effectiveRole);
    // Ensure role is correct
    userProfile.role = effectiveRole;

    // Step 4: Store session
    safeSetItem("flubn_session", JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }));

    setUser(userProfile);
    safeSetItem("flubn_user", JSON.stringify(userProfile));

    // Ensure this user appears in the admin panel
    upsertAdminUser(userProfile);

    // Step 5: Background — enrich profile from edge function KV (non-blocking)
    // Only merge fields that are explicitly present so stale KV data never strips good metadata values.
    api.getProfile()
      .then(profile => {
        if (profile?.id) {
          const enriched: User = { ...userProfile };
          (Object.keys(profile) as (keyof User)[]).forEach((key) => {
            const val = profile[key];
            if (val !== undefined && val !== null && val !== "") {
              (enriched as any)[key] = val;
            }
          });
          setUser(enriched);
          safeSetItem("flubn_user", JSON.stringify(enriched));
        }
      })
      .catch(() => { /* edge function unavailable — metadata profile is sufficient */ });
  };

  /**
   * SIGNUP — tries edge function first (handles email_confirm:true),
   * falls back to direct Supabase Auth if edge function is unavailable.
   */
  const signup = async (name: string, email: string, password: string, role: UserRole, profileData?: Partial<User>) => {
    const fullProfileData = {
      profileCompleted: true,
      agreedToTerms: true,
      agreedToPrivacy: true,
      ...profileData,
    };

    // For brand accounts, the display name should always be the company name
    const displayName = role === "brand"
      ? (fullProfileData.companyName || name)
      : name;

    // ── Attempt 1: Edge function (bypasses email confirmation) ───────────────
    try {
      const result = await api.signup({
        email,
        password,
        name: displayName,
        role,
        profileData: fullProfileData,
      });

      if (result && !result.error) {
        // Edge function succeeded
        const userProfile: User = result.user || buildUserFromMeta("", email, { name: displayName, role, ...fullProfileData });
        const session = result.session;

        setUser(userProfile);
        safeSetItem("flubn_user", JSON.stringify(userProfile));
        safeSetItem(`flubn_registered_${email.toLowerCase()}`, JSON.stringify({ id: userProfile.id, name: displayName, email, role, ...profileData }));

        // Ensure this user appears in the admin panel immediately
        upsertAdminUser(userProfile);

        if (session) {
          safeSetItem("flubn_session", JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }));
          supabase.auth.setSession(session).catch(() => {});
        }
        
        // Send welcome email (non-blocking)
        sendWelcomeEmail(email, displayName, role, { companyName: fullProfileData.companyName }).catch(() => {});
        
        return; // ✓ Done
      }

      // Edge function returned a specific error (not a network failure)
      if (result && result.error) {
        throw new Error(result.error);
      }

      // result is null → network error → fall through to Attempt 2
    } catch (err: any) {
      // If it's a real error (not network), throw it immediately
      const isNetworkError =
        err?.message?.includes("Failed to fetch") ||
        err?.message?.includes("NetworkError") ||
        err?.message?.includes("Load failed") ||
        err?.message?.includes("net::ERR_");

      if (!isNetworkError) {
        throw err;
      }
      // Network error → fall through to Attempt 2
      console.warn("[FLUBN] Edge function unreachable for signup, trying direct Supabase auth...");
    }

    // ── Attempt 2: Direct Supabase Auth (fallback) ───────────────────────────
    const allMeta = { name: displayName, role, ...fullProfileData };
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: allMeta },
    });

    if (signupError) {
      if (isAuthNetworkError(signupError)) {
        throw new Error("Connection error — please check your internet and try again.");
      }
      if (signupError.message.includes("already registered") || signupError.message.includes("already exists")) {
        throw new Error("An account with this email already exists. Please log in instead.");
      }
      throw new Error(signupError.message);
    }

    if (!signupData.user) {
      throw new Error("Signup failed. Please try again.");
    }

    if (signupData.session) {
      // Email confirmation is disabled — user is immediately signed in
      const userProfile = buildUserFromMeta(signupData.user.id, email, allMeta, role);
      setUser(userProfile);
      safeSetItem("flubn_user", JSON.stringify(userProfile));
      safeSetItem(`flubn_registered_${email.toLowerCase()}`, JSON.stringify({ id: userProfile.id, name: displayName, email, role, ...profileData }));
      safeSetItem("flubn_session", JSON.stringify({
        access_token: signupData.session.access_token,
        refresh_token: signupData.session.refresh_token,
      }));

      // Ensure this user appears in the admin panel immediately
      upsertAdminUser(userProfile);
      
      // Send welcome email (non-blocking)
      sendWelcomeEmail(email, displayName, role, { companyName: fullProfileData.companyName }).catch(() => {});
    } else {
      // Email confirmation required
      throw new Error(
        "Account created! Please check your email to confirm your account, then log in."
      );
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem("flubn_user");
    localStorage.removeItem("flubn_session");
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    safeSetItem("flubn_user", JSON.stringify(updatedUser));

    // Update Supabase user_metadata (so profile persists across sessions)
    supabase.auth.updateUser({ data: updates }).catch(() => {});

    // Sync to edge function KV store (non-blocking)
    api.updateProfile(updates).catch((err: any) => {
      if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && !err.message?.includes("Load failed")) {
        console.error("Profile update sync error:", err.message);
      }
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateProfile,
        isLoading,
        isSessionValidated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}