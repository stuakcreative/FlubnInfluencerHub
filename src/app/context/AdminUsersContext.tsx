import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import * as api from "../utils/api";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joinDate: string;
  plan?: string;
}

interface AdminUsersContextType {
  users: AdminUser[];
  updateUser: (id: string, updates: Partial<AdminUser>) => void;
  addUser: (user: AdminUser) => void;
  removeUser: (id: string) => void;
}

const AdminUsersContext = createContext<AdminUsersContextType | undefined>(undefined);

const STORAGE_KEY = "flubn_admin_users";

/** Merge all registration sources into a deduped AdminUser array and persist it. */
function mergeAndPersist(stored: AdminUser[]): AdminUser[] {
  const merged = new Map<string, AdminUser>(stored.map(u => [u.id, u]));
  const storedEmails = new Set(stored.map(u => u.email?.toLowerCase()).filter(Boolean));

  // 1. Merge from flubn_registered_* keys (all email/password signups write here)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("flubn_registered_")) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const reg = JSON.parse(raw);
        if (!reg.id || !reg.email) continue;
        // Don't overwrite entries that have admin-applied mutations (status/plan)
        if (merged.has(reg.id) || storedEmails.has(reg.email.toLowerCase())) continue;
        merged.set(reg.id, {
          id: reg.id,
          name: reg.role === "brand"
            ? (reg.companyName || reg.name || reg.email.split("@")[0])
            : (reg.name || reg.email.split("@")[0]),
          email: reg.email,
          role: reg.role || "brand",
          status: "active",
          joinDate: reg.createdAt || reg.joinDate || new Date().toISOString(),
          plan: reg.plan,
        });
        storedEmails.add(reg.email.toLowerCase());
      } catch { /* skip corrupt entry */ }
    }
  } catch { /* skip */ }

  // 2. Merge from flubn_influencers (the main influencer data store)
  try {
    const infRaw = localStorage.getItem("flubn_influencers");
    if (infRaw) {
      const influencers: any[] = JSON.parse(infRaw);
      influencers.forEach((inf) => {
        if (!inf.id || !inf.email) return;
        if (merged.has(inf.id) || storedEmails.has(inf.email.toLowerCase())) return;
        merged.set(inf.id, {
          id: inf.id,
          name: inf.name || "Unknown",
          email: inf.email,
          role: "influencer",
          status: inf.status || "active",
          joinDate: inf.createdAt || new Date().toISOString(),
        });
        storedEmails.add(inf.email.toLowerCase());
      });
    }
  } catch { /* skip */ }

  const result = Array.from(merged.values());

  // Persist merged result back so next load is instant
  if (result.length > stored.length) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(result)); } catch { /* quota */ }
  }

  return result;
}

/** Load persisted users from localStorage, merging all registration sources. */
function loadUsers(): AdminUser[] {
  let stored: AdminUser[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as AdminUser[];
  } catch { /* ignore corrupt data */ }
  return mergeAndPersist(stored);
}

/** Persist the full users array to localStorage. */
function persistUsers(users: AdminUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    // Notify same-tab listeners (e.g. StatisticsContext) that the list changed
    window.dispatchEvent(new CustomEvent("adminUsersUpdated", { detail: users }));
  } catch { /* quota exceeded — fail silently */ }
}

/** Sync to backend (fire-and-forget) */
function syncUsersToBackend(users: AdminUser[]): void {
  // NOTE: We do NOT call api.saveData("admin_users_full", users) here because
  // that writes to the KV key "data:admin_users_full" which is NEVER read back.
  // The authoritative "admin_users" KV key is maintained server-side by the
  // /signup and /login routes. Individual mutations still go via the correct
  // per-record admin API calls in updateUser / addUser / removeUser below.
  void users; // suppress unused warning
}

export function AdminUsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AdminUser[]>(loadUsers);

  // Re-sync from all registration sources every time the provider mounts,
  // so newly signed-up users appear without a full page reload.
  useEffect(() => {
    setUsers((prev) => {
      const fresh = mergeAndPersist(prev);
      // Only update state if we actually found new users
      return fresh.length > prev.length ? fresh : prev;
    });
  }, []);

  // Load from backend on mount — always try, not just for admin.
  // This restores the full user list even when localStorage is empty after a session reset.
  useEffect(() => {
    api.getAdminUsers().then((data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        // Merge backend data with local so we never lose local-only users
        setUsers((prev) => {
          const mergedMap = new Map<string, AdminUser>(prev.map(u => [u.id, u]));
          data.forEach((u: AdminUser) => {
            if (!mergedMap.has(u.id)) mergedMap.set(u.id, u);
            else {
              // Backend wins for name/role/email; local wins for admin-applied status/plan
              const local = mergedMap.get(u.id)!;
              mergedMap.set(u.id, {
                ...u,
                status: local.status ?? u.status,
                plan: local.plan ?? u.plan,
              });
            }
          });
          const result = Array.from(mergedMap.values());
          persistUsers(result);
          return result;
        });
      } else {
        // Seed backend with local data
        const local = loadUsers();
        if (local.length > 0) {
          api.saveData("admin_users_full", local).catch(() => {});
          Promise.all(local.map(u => api.addAdminUser(u).catch(() => {}))).catch(() => {});
        }
      }
    }).catch((err) => {
      if (err?.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError") && !err.message.includes("Load failed")) {
        console.error("Failed to load admin users from backend:", err.message);
      }
    });
  }, []);

  /** Wrapper that persists every state update to localStorage + backend. */
  const setAndPersist = useCallback(
    (updater: (prev: AdminUser[]) => AdminUser[]) => {
      setUsers((prev) => {
        const next = updater(prev);
        persistUsers(next);
        syncUsersToBackend(next);
        return next;
      });
    },
    []
  );

  const updateUser = useCallback(
    (id: string, updates: Partial<AdminUser>) => {
      setAndPersist((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
      );
      api.updateAdminUser(id, updates).catch(() => {});
    },
    [setAndPersist]
  );

  const addUser = useCallback(
    (user: AdminUser) => {
      setAndPersist((prev) => {
        // Prevent duplicates
        if (prev.some(u => u.id === user.id || u.email?.toLowerCase() === user.email?.toLowerCase())) {
          return prev;
        }
        return [user, ...prev];
      });
      api.addAdminUser(user).catch(() => {});
    },
    [setAndPersist]
  );

  const removeUser = useCallback(
    (id: string) => {
      setAndPersist((prev) => prev.filter((u) => u.id !== id));
      api.removeAdminUser(id).catch(() => {});
    },
    [setAndPersist]
  );

  return (
    <AdminUsersContext.Provider value={{ users, updateUser, addUser, removeUser }}>
      {children}
    </AdminUsersContext.Provider>
  );
}

export function useAdminUsers() {
  const context = useContext(AdminUsersContext);
  if (context === undefined) {
    return {
      users: [] as AdminUser[],
      updateUser: () => {},
      addUser: () => {},
      removeUser: () => {},
    } as AdminUsersContextType;
  }
  return context;
}