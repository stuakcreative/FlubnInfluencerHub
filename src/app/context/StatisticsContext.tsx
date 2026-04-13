import { createContext, useContext, ReactNode, useMemo, useEffect, useState } from "react";
import { getInfluencers } from "../utils/dataManager";
import * as api from "../utils/api";

interface Statistics {
  totalInfluencers: number;
  verifiedInfluencers: number;
  totalBrands: number;
  totalCollaborations: number;
  activeCollaborations: number;
  // Formatted strings for display
  influencersDisplay: string;
  verifiedInfluencersDisplay: string;
  brandsDisplay: string;
  collaborationsDisplay: string;
}

interface StatisticsContextType {
  stats: Statistics;
  refreshStats: () => void;
}

const defaultStats: Statistics = {
  totalInfluencers: 0,
  verifiedInfluencers: 0,
  totalBrands: 0,
  totalCollaborations: 0,
  activeCollaborations: 0,
  influencersDisplay: "0+",
  verifiedInfluencersDisplay: "0+",
  brandsDisplay: "0+",
  collaborationsDisplay: "0+",
};

const StatisticsContext = createContext<StatisticsContextType>({
  stats: defaultStats,
  refreshStats: () => {},
});

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    const thousands = Math.floor(num / 100) / 10;
    return `${thousands}K+`;
  }
  return `${num}+`;
};

export function StatisticsProvider({ children }: { children: ReactNode }) {
  const [backendStats, setBackendStats] = useState<any>(null);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [influencersData, setInfluencersData] = useState(getInfluencers());

  // Load stats from backend
  useEffect(() => {
    api.getStats().then((data) => {
      if (data) setBackendStats(data);
    }).catch(() => {});
  }, []);

  // Load registered users from localStorage (fallback)
  useEffect(() => {
    const loadRegisteredUsers = () => {
      const allKeys = Object.keys(localStorage);
      const users: any[] = [];
      const seenEmails = new Set<string>();

      // Source 1: flubn_admin_users (populated by AdminUsersContext from backend KV)
      try {
        const adminRaw = localStorage.getItem("flubn_admin_users");
        if (adminRaw) {
          const adminList: any[] = JSON.parse(adminRaw);
          adminList.forEach(u => {
            if (u.email && !seenEmails.has(u.email.toLowerCase())) {
              users.push(u);
              seenEmails.add(u.email.toLowerCase());
            }
          });
        }
      } catch { /* skip */ }

      // Source 2: flubn_registered_* keys (written at signup time)
      allKeys.forEach(key => {
        if (key.startsWith('flubn_registered_')) {
          try {
            const userData = localStorage.getItem(key);
            if (userData) {
              const u = JSON.parse(userData);
              if (u.email && !seenEmails.has(u.email.toLowerCase())) {
                users.push(u);
                seenEmails.add(u.email.toLowerCase());
              }
            }
          } catch { /* skip */ }
        }
      });

      setRegisteredUsers(users);
    };

    loadRegisteredUsers();

    // Standard cross-tab storage event
    window.addEventListener('storage', loadRegisteredUsers);
    // Same-tab event dispatched by AdminUsersContext after backend hydration
    window.addEventListener('adminUsersUpdated', loadRegisteredUsers);
    return () => {
      window.removeEventListener('storage', loadRegisteredUsers);
      window.removeEventListener('adminUsersUpdated', loadRegisteredUsers);
    };
  }, []);

  useEffect(() => {
    const handleInfluencersUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setInfluencersData(customEvent.detail || getInfluencers());
    };
    window.addEventListener("influencersUpdated", handleInfluencersUpdate);
    return () => window.removeEventListener("influencersUpdated", handleInfluencersUpdate);
  }, []);

  const stats = useMemo(() => {
    // Prefer backend stats if available
    if (backendStats && backendStats.totalInfluencers > 0) {
      return {
        ...backendStats,
        influencersDisplay: formatNumber(backendStats.totalInfluencers),
        verifiedInfluencersDisplay: formatNumber(backendStats.verifiedInfluencers),
        brandsDisplay: formatNumber(backendStats.totalBrands),
        collaborationsDisplay: formatNumber(backendStats.totalCollaborations),
      };
    }

    // Fallback to local calculation
    // Count ONLY influencers that exist in the real influencers data store to prevent double-counting
    const totalInfluencers = influencersData.length;
    const verifiedInfluencers = influencersData.filter(inf => (inf as any).isVerified === true).length;
    
    const registeredBrands = registeredUsers.filter(u => u.role === 'brand');
    const totalBrands = registeredBrands.length;
    const totalCollaborations = 0; // Populated from real collaboration data at runtime
    const activeCollaborations = 0;

    return {
      totalInfluencers,
      verifiedInfluencers,
      totalBrands,
      totalCollaborations,
      activeCollaborations,
      influencersDisplay: formatNumber(totalInfluencers),
      verifiedInfluencersDisplay: formatNumber(verifiedInfluencers),
      brandsDisplay: formatNumber(totalBrands),
      collaborationsDisplay: formatNumber(totalCollaborations),
    };
  }, [registeredUsers, influencersData, backendStats]);

  const refreshStats = () => {
    // Refresh from backend
    api.getStats().then((data) => {
      if (data) setBackendStats(data);
    }).catch(() => {});

    // Also refresh local data
    const allKeys = Object.keys(localStorage);
    const users: any[] = [];
    const seenEmails = new Set<string>();

    // Source 1: flubn_admin_users (populated by AdminUsersContext from backend KV)
    try {
      const adminRaw = localStorage.getItem("flubn_admin_users");
      if (adminRaw) {
        const adminList: any[] = JSON.parse(adminRaw);
        adminList.forEach(u => {
          if (u.email && !seenEmails.has(u.email.toLowerCase())) {
            users.push(u);
            seenEmails.add(u.email.toLowerCase());
          }
        });
      }
    } catch { /* skip */ }

    // Source 2: flubn_registered_* keys (written at signup time)
    allKeys.forEach(key => {
      if (key.startsWith('flubn_registered_')) {
        try {
          const userData = localStorage.getItem(key);
          if (userData) {
            const u = JSON.parse(userData);
            if (u.email && !seenEmails.has(u.email.toLowerCase())) {
              users.push(u);
              seenEmails.add(u.email.toLowerCase());
            }
          }
        } catch { /* skip */ }
      }
    });
    setRegisteredUsers(users);
    setInfluencersData(getInfluencers());
  };

  return (
    <StatisticsContext.Provider value={{ stats, refreshStats }}>
      {children}
    </StatisticsContext.Provider>
  );
}

export function useStatistics() {
  return useContext(StatisticsContext);
}