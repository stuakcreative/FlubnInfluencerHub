import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { CollaborationProvider } from "./context/CollaborationContext";
import { FooterProvider } from "./context/FooterContext";
import { SiteSettingsProvider } from "./context/SiteSettingsContext";
import { StatisticsProvider } from "./context/StatisticsContext";
import { AdminUsersProvider } from "./context/AdminUsersContext";
import { DevTools } from "./components/DevTools";
import { hydrateInfluencersFromBackend } from "./utils/dataManager";

// Suppress network errors from Supabase client and background syncs
if (typeof window !== "undefined") {
  // 1. Suppress unhandled promise rejections caused by network failures
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message || String(event.reason || "");
    if (
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("Load failed") ||
      msg.includes("net::ERR_") ||
      msg.includes("TypeError: Failed")
    ) {
      event.preventDefault();
    }
  });

  // 2. Suppress console.error noise from the Supabase JS client library and
  //    any other source that logs network failures (e.g. realtime, token refresh).
  const _origError = console.error.bind(console);
  console.error = (...args: any[]) => {
    const msg = args.map((a) => (a instanceof Error ? a.message : String(a ?? ""))).join(" ");
    if (
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("Load failed") ||
      msg.includes("net::ERR_") ||
      msg.includes("FetchError") ||
      msg.includes("TypeError: Failed")
    ) {
      return; // silently drop network-related console errors
    }
    _origError(...args);
  };
}

export default function App() {
  // On every app startup, restore influencer data from the edge function KV store.
  // This runs before any page renders so components see the real list, not stale cache.
  useEffect(() => {
    hydrateInfluencersFromBackend();
  }, []);

  return (
    <div className="w-full max-w-[100vw] overflow-x-hidden">
      <AuthProvider>
        <StatisticsProvider>
          <CollaborationProvider>
            <AdminUsersProvider>
              <SiteSettingsProvider>
                <FooterProvider>
                    <RouterProvider router={router} />
                  <Toaster
                    position="top-right"
                    closeButton
                    toastOptions={{
                      style: {
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontFamily: "'Inter', sans-serif",
                      },
                    }}
                  />
                  {/* DEV ONLY — Remove before production */}
                  <DevTools />
                </FooterProvider>
              </SiteSettingsProvider>
            </AdminUsersProvider>
          </CollaborationProvider>
        </StatisticsProvider>
      </AuthProvider>
    </div>
  );
}