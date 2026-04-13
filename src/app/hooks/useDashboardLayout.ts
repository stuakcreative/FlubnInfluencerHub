import { useState, useCallback, useEffect, useRef } from "react";
import { getDashboardLayout, saveDashboardLayout } from "../utils/api";

export type DashboardType = "brand" | "influencer" | "admin";

export function useDashboardLayout(
  dashboardType: DashboardType,
  defaultWidgets: readonly string[],
  userId?: string
) {
  const localKey = `flubn_dashboard_layout_${dashboardType}_${userId || "guest"}`;

  // Initialize from localStorage, falling back to default order
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        // Keep only known widget IDs from the saved order, then append any new ones
        const merged = parsed.filter((id) => defaultWidgets.includes(id));
        const newOnes = defaultWidgets.filter((id) => !merged.includes(id));
        return [...merged, ...newOnes];
      }
    } catch {
      /* ignore */
    }
    return [...defaultWidgets];
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Immediately persist to localStorage
  const saveLocal = useCallback(
    (order: string[]) => {
      try {
        localStorage.setItem(localKey, JSON.stringify(order));
      } catch {
        /* ignore */
      }
    },
    [localKey]
  );

  // Debounced backend sync — fires 1.5 s after the last reorder
  const scheduleSync = useCallback(
    (order: string[]) => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(async () => {
        try {
          setIsSaving(true);
          await saveDashboardLayout(dashboardType, order);
        } catch {
          /* non-critical */
        } finally {
          setIsSaving(false);
        }
      }, 1500);
    },
    [dashboardType]
  );

  // On mount, silently fetch the latest layout from the backend (background sync)
  useEffect(() => {
    if (!userId) return;
    getDashboardLayout(dashboardType)
      .then((data) => {
        if (data?.order && Array.isArray(data.order) && data.order.length > 0) {
          const merged = data.order.filter((id: string) =>
            defaultWidgets.includes(id)
          );
          const newOnes = defaultWidgets.filter((id) => !merged.includes(id));
          const full = [...merged, ...newOnes];
          setWidgetOrder(full);
          saveLocal(full);
        }
      })
      .catch(() => {
        /* ignore */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dashboardType]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  /** Move widget from one index to another (called during drag hover) */
  const reorderWidgets = useCallback(
    (fromIndex: number, toIndex: number) => {
      setWidgetOrder((prev) => {
        const next = [...prev];
        const [removed] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, removed);
        saveLocal(next);
        return next;
      });
    },
    [saveLocal]
  );

  /** Reset to the original default order */
  const resetLayout = useCallback(() => {
    const def = [...defaultWidgets];
    setWidgetOrder(def);
    saveLocal(def);
    scheduleSync(def);
  }, [defaultWidgets, saveLocal, scheduleSync]);

  /** Persist current layout to backend and exit edit mode */
  const saveAndExit = useCallback(() => {
    setWidgetOrder((prev) => {
      scheduleSync(prev);
      return prev;
    });
    setIsEditing(false);
  }, [scheduleSync]);

  return {
    widgetOrder,
    isEditing,
    setIsEditing,
    isSaving,
    reorderWidgets,
    resetLayout,
    saveAndExit,
  };
}
