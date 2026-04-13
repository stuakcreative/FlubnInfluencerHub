import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as api from "../utils/api";

export interface SiteSettings {
  // Branding
  siteName: string;
  customLogoUrl: string;     // light/default background logo (base64)
  customDarkLogoUrl: string; // dark background logo (base64)
  faviconUrl: string;        // favicon (base64)
  // SEO
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
  googleAnalyticsId: string;
  // Admin account (email only — password is NEVER stored client-side)
  adminEmail: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "FLUBN",
  customLogoUrl: "",
  customDarkLogoUrl: "",
  faviconUrl: "",
  metaTitle: "FLUBN - Influencer Marketplace",
  metaDescription: "Connect brands with top influencers. Find, collaborate, and grow your reach with FLUBN's powerful influencer marketing platform.",
  metaKeywords: "influencer, marketing, brand, collaboration, social media, creators",
  ogImage: "",
  googleAnalyticsId: "",
  adminEmail: "admin@flubn.com",
};

const STORAGE_KEY = "flubn_site_settings";

interface SiteSettingsContextType {
  settings: SiteSettings;
  updateSettings: (updates: Partial<SiteSettings>) => void;
  resetSettings: () => void;
  getLogoUrl: () => string | null;     // light bg logo — null = use default
  getDarkLogoUrl: () => string | null; // dark bg logo — null = use default
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

function loadSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: SiteSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
  // Sync to backend
  api.saveSettings("site", settings).catch((err) => {
    if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && !err.message?.includes("Load failed")) {
      console.error("Site settings sync error:", err.message);
    }
  });
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(loadSettings);

  // Load from backend on mount
  useEffect(() => {
    api.getSettings("site").then((data) => {
      if (data && typeof data === "object" && data.siteName) {
        const merged = { ...DEFAULT_SETTINGS, ...data };
        setSettings(merged);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, []);

  // Sync SEO meta tags
  useEffect(() => {
    if (settings.metaTitle) {
      document.title = settings.metaTitle;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && settings.metaDescription) {
      metaDesc.setAttribute("content", settings.metaDescription);
    } else if (settings.metaDescription) {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = settings.metaDescription;
      document.head.appendChild(meta);
    }
    const metaKw = document.querySelector('meta[name="keywords"]');
    if (metaKw && settings.metaKeywords) {
      metaKw.setAttribute("content", settings.metaKeywords);
    } else if (settings.metaKeywords) {
      const meta = document.createElement("meta");
      meta.name = "keywords";
      meta.content = settings.metaKeywords;
      document.head.appendChild(meta);
    }
  }, [settings.metaTitle, settings.metaDescription, settings.metaKeywords]);

  // Sync favicon
  useEffect(() => {
    if (settings.faviconUrl) {
      let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
  }, [settings.faviconUrl]);

  const updateSettings = (updates: Partial<SiteSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  };

  const resetSettings = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    saveSettings({ ...DEFAULT_SETTINGS });
  };

  const getLogoUrl = () => {
    return settings.customLogoUrl || null;
  };

  const getDarkLogoUrl = () => {
    return settings.customDarkLogoUrl || null;
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, updateSettings, resetSettings, getLogoUrl, getDarkLogoUrl }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    return {
      settings: { ...DEFAULT_SETTINGS },
      updateSettings: () => {},
      resetSettings: () => {},
      getLogoUrl: () => null,
      getDarkLogoUrl: () => null,
    } as SiteSettingsContextType;
  }
  return context;
}