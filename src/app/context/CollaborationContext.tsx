import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as api from "../utils/api";
import {
  sendNewRequestToInfluencer,
  sendRequestAcceptedToBrand,
  sendRequestRejectedToBrand,
  sendPriceNegotiationToBrand,
  sendPriceNegotiationToInfluencer,
} from "../utils/emailNotifications";

/**
 * Helper: Get influencer email from localStorage
 */
function getInfluencerEmail(influencerId?: string): string | null {
  if (!influencerId) return null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("flubn_registered_")) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "");
        if (data.id === influencerId || data.email === influencerId) {
          return data.email;
        }
      } catch {}
    }
  }
  return null;
}

/**
 * Helper: Get brand email from localStorage
 */
function getBrandEmail(brandId?: string): string | null {
  if (!brandId) return null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("flubn_registered_")) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "");
        if (data.id === brandId || data.email === brandId) {
          return data.email;
        }
      } catch {}
    }
  }
  return null;
}

type RequestStatus = "pending" | "accepted" | "rejected";

/**
 * Contact sharing status — mutual consent required before either party sees contacts.
 *
 * Flow:
 *   none → brand_requested / influencer_requested
 *          → shared (both accept)  |  declined (either declines)
 */
export type ContactShareStatus =
  | "none"
  | "brand_requested"
  | "influencer_requested"
  | "shared"
  | "declined";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: "brand" | "influencer";
  senderName: string;
  text: string;
  timestamp: string;
  type?: "normal" | "price_request" | "price_accepted" | "price_rejected" | "price_countered";
  requestedAmount?: number;
  replyTo?: { id: string; senderName: string; text: string };
}

interface PriceRequest {
  amount: number;
  requestedAt: string;
  status: "pending" | "accepted" | "rejected" | "countered";
  messageId: string;
  counterAmount?: number;
}

export interface CollaborationRequest {
  id: string;
  brandName: string;
  brandLogo: string;
  brandPhoto?: string;
  brandId?: string;
  influencerName?: string;
  influencerPhoto?: string;
  influencerId?: string;
  campaignName: string;
  budget: number;
  timeline: string;
  status: RequestStatus;
  deliverables: string;
  message: string;

  contactEmail?: string;
  contactPhone?: string;
  brandContactEmail?: string;
  brandContactPhone?: string;

  contactShareStatus?: ContactShareStatus;

  negotiationRound?: number;
  priceSettled?: boolean;
  settledPrice?: number;

  rejectionComment?: string;
  acceptComment?: string;
  brandReply?: string;
  sentDate?: string;
  sentAt?: string;
  respondedAt?: string;
  chatMessages?: ChatMessage[];
  pendingPriceRequest?: PriceRequest;
}

/** Maximum number of price negotiation rounds before auto-close */
export const MAX_NEGOTIATION_ROUNDS = 3;

interface CollaborationContextType {
  requests: CollaborationRequest[];
  addRequest: (request: Omit<CollaborationRequest, "id" | "status">) => void;
  updateRequestStatus: (id: string, status: RequestStatus, comment?: string) => void;
  addBrandReply: (id: string, reply: string) => void;
  sendChatMessage: (requestId: string, message: Omit<ChatMessage, "id" | "timestamp">) => void;
  getRequestsForInfluencer: (influencerId: string) => CollaborationRequest[];
  getRequestsFromBrand: (brandId: string) => CollaborationRequest[];
  sendPriceRequest: (requestId: string, amount: number, influencerName: string, influencerId: string) => void;
  respondToPriceRequest: (requestId: string, action: "accepted" | "rejected", brandName: string, brandId: string) => void;
  sendCounterOffer: (requestId: string, counterAmount: number, brandName: string, brandId: string) => void;
  respondToCounterOffer: (requestId: string, action: "accepted" | "rejected", influencerName: string, influencerId: string) => void;
  requestContactShare: (requestId: string, initiator: "brand" | "influencer", email?: string, phone?: string) => void;
  respondToContactShare: (requestId: string, action: "accept" | "decline", email?: string, phone?: string) => void;
  hasPendingRequestTo: (influencerId: string, brandId: string) => boolean;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

const STORAGE_KEY = "flubn_collaboration_requests";

/** Load persisted requests from localStorage, starting with empty for new users. */
function loadRequests(): CollaborationRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CollaborationRequest[];
  } catch { /* ignore corrupt data */ }
  return [];
}

/** Persist the full requests array to localStorage. */
function persistRequests(reqs: CollaborationRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reqs));
  } catch { /* quota exceeded — fail silently */ }
}

/** Sync to backend (fire-and-forget) */
function syncToBackend(reqs: CollaborationRequest[]): void {
  api.saveAllCollaborations(reqs).catch((err) => {
    if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && !err.message?.includes("Load failed")) {
      console.error("Collaboration sync error:", err.message);
    }
  });
}

export function CollaborationProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<CollaborationRequest[]>(() => {
    const WIPE_FLAG = "flubn_collab_wipe_v1";
    if (!localStorage.getItem(WIPE_FLAG)) {
      // Only wipe if there are genuinely no existing requests — this prevents
      // the flag being deleted by quota cleanup from triggering a destructive wipe.
      const existing = loadRequests();
      if (existing.length === 0) {
        localStorage.setItem(WIPE_FLAG, "done");
        localStorage.removeItem(STORAGE_KEY);
        return [];
      }
      // Requests already exist → flag was lost to quota cleanup, not a real first boot.
      // Restore the flag and keep the data.
      localStorage.setItem(WIPE_FLAG, "synced");
      return existing;
    }
    return loadRequests();
  });

  // Load from backend on mount
  useEffect(() => {
    const WIPE_FLAG = "flubn_collab_wipe_v1";
    const justWiped = localStorage.getItem(WIPE_FLAG) === "done";
    // If we just wiped, push empty array to backend too — but ONLY if the backend
    // is also empty, to avoid overwriting data that exists there.
    if (justWiped && requests.length === 0) {
      api.getCollaborations().then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          // Backend has data — restore it locally instead of wiping it
          setRequests(data);
          persistRequests(data);
        } else {
          syncToBackend([]);
        }
        localStorage.setItem(WIPE_FLAG, "synced");
      }).catch(() => {
        localStorage.setItem(WIPE_FLAG, "synced");
      });
      return;
    }
    api.getCollaborations().then((data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        setRequests(data);
        persistRequests(data);
      } else {
        // Seed backend with local data
        const local = loadRequests();
        if (local.length > 0) {
          syncToBackend(local);
        }
      }
    }).catch((err) => {
      // Silently fall back to localStorage when backend is unavailable
      if (!err.message?.includes("Failed to fetch")) {
        console.error("Failed to load collaborations from backend:", err.message);
      }
    });
  }, []);

  /** Wrapper that persists every state update to localStorage + backend. */
  const setAndPersist = (updater: (prev: CollaborationRequest[]) => CollaborationRequest[]) => {
    setRequests((prev) => {
      const next = updater(prev);
      persistRequests(next);
      syncToBackend(next);
      return next;
    });
  };

  // ── Add new request ────────────────────────────────────────────────────────
  const addRequest = (request: Omit<CollaborationRequest, "id" | "status">) => {
    const existingSharedContact = requests.find(
      (r) =>
        r.brandId === request.brandId &&
        r.influencerId === request.influencerId &&
        r.contactShareStatus === "shared"
    );

    const newRequest: CollaborationRequest = {
      ...request,
      id: Date.now().toString(),
      status: "pending",
      contactShareStatus: existingSharedContact ? "shared" : "none",
      negotiationRound: 0,
      chatMessages: [],
    };
    setAndPersist((prev) => [newRequest, ...prev]);
    sendNewRequestToInfluencer(newRequest);
  };

  // ── Accept / Reject ───────────────────────────────────────────────────────
  const updateRequestStatus = (id: string, status: RequestStatus, comment?: string) => {
    setAndPersist((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              respondedAt: new Date().toISOString(),
              ...(status === "accepted" ? { acceptComment: comment } : {}),
              ...(status === "rejected" && comment ? { rejectionComment: comment } : {}),
            }
          : r
      )
    );
    if (status === "accepted") {
      const request = requests.find((r) => r.id === id);
      if (request) {
        sendRequestAcceptedToBrand(request);
      }
    } else if (status === "rejected") {
      const request = requests.find((r) => r.id === id);
      if (request) {
        sendRequestRejectedToBrand(request);
      }
    }
  };

  // ── Legacy brand reply ─────────────────────────────────────────────────────
  const addBrandReply = (id: string, reply: string) => {
    setAndPersist((prev) =>
      prev.map((r) => (r.id === id ? { ...r, brandReply: reply } : r))
    );
  };

  // ── Chat messages ──────────────────────────────────────────────────────────
  const sendChatMessage = (requestId: string, message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMsg: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    setAndPersist((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, chatMessages: [...(r.chatMessages ?? []), newMsg] }
          : r
      )
    );
  };

  // ─ Price negotiation ──────────────────────────────────────────────────────

  const sendPriceRequest = (
    requestId: string,
    amount: number,
    influencerName: string,
    influencerId: string
  ) => {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    setAndPersist((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        if ((r.negotiationRound ?? 0) >= MAX_NEGOTIATION_ROUNDS) return r;

        const priceMsg: ChatMessage = {
          id: msgId,
          senderId: influencerId,
          senderRole: "influencer",
          senderName: influencerName,
          text: `I'd like to request a budget update to ₹${amount.toLocaleString()} for this collaboration.`,
          timestamp: now,
          type: "price_request",
          requestedAmount: amount,
        };

        return {
          ...r,
          chatMessages: [...(r.chatMessages ?? []), priceMsg],
          pendingPriceRequest: {
            amount,
            requestedAt: now,
            status: "pending",
            messageId: msgId,
          },
          negotiationRound: (r.negotiationRound ?? 0) + 1,
        };
      })
    );
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      const brandEmail = request.brandContactEmail || getBrandEmail(request.brandId);
      if (brandEmail) {
        sendPriceNegotiationToBrand({
          brandEmail,
          brandName: request.brandName,
          influencerName: request.influencerName || influencerName,
          campaignName: request.campaignName,
          proposedPrice: amount,
          type: "request",
        });
      }
    }
  };

  const respondToPriceRequest = (
    requestId: string,
    action: "accepted" | "rejected",
    brandName: string,
    brandId: string
  ) => {
    setAndPersist((prev) =>
      prev.map((r) => {
        if (r.id !== requestId || !r.pendingPriceRequest) return r;
        const { amount } = r.pendingPriceRequest;
        const now = new Date().toISOString();

        const responseMsg: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          senderId: brandId,
          senderRole: "brand",
          senderName: brandName,
          text:
            action === "accepted"
              ? `Budget update accepted! The collaboration budget is now ₹${amount.toLocaleString()}.`
              : `Sorry, the requested budget of ₹${amount.toLocaleString()} cannot be accommodated at this time.`,
          timestamp: now,
          type: action === "accepted" ? "price_accepted" : "price_rejected",
          requestedAmount: amount,
        };

        return {
          ...r,
          budget: action === "accepted" ? amount : r.budget,
          chatMessages: [...(r.chatMessages ?? []), responseMsg],
          pendingPriceRequest: { ...r.pendingPriceRequest, status: action },
          ...(action === "accepted"
            ? { priceSettled: true, settledPrice: amount }
            : {}),
        };
      })
    );
    const request = requests.find((r) => r.id === requestId);
    if (request && request.pendingPriceRequest) {
      const influencerEmail = request.contactEmail || getInfluencerEmail(request.influencerId);
      if (influencerEmail) {
        sendPriceNegotiationToInfluencer({
          influencerEmail,
          influencerName: request.influencerName || "there",
          brandName: request.brandName,
          campaignName: request.campaignName,
          proposedPrice: request.pendingPriceRequest.amount,
          type: action === "accepted" ? "accepted" : "counter",
        });
      }
    }
  };

  const sendCounterOffer = (
    requestId: string,
    counterAmount: number,
    brandName: string,
    brandId: string
  ) => {
    setAndPersist((prev) =>
      prev.map((r) => {
        if (r.id !== requestId || !r.pendingPriceRequest) return r;
        if ((r.negotiationRound ?? 0) >= MAX_NEGOTIATION_ROUNDS) return r;

        const { amount } = r.pendingPriceRequest;
        const now = new Date().toISOString();

        const counterMsg: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          senderId: brandId,
          senderRole: "brand",
          senderName: brandName,
          text: `Counter offer: ₹${counterAmount.toLocaleString()} (you requested ₹${amount.toLocaleString()})`,
          timestamp: now,
          type: "price_countered",
          requestedAmount: counterAmount,
        };

        return {
          ...r,
          chatMessages: [...(r.chatMessages ?? []), counterMsg],
          pendingPriceRequest: {
            ...r.pendingPriceRequest,
            status: "countered" as const,
            counterAmount,
          },
          negotiationRound: (r.negotiationRound ?? 0) + 1,
        };
      })
    );
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      const influencerEmail = request.contactEmail || getInfluencerEmail(request.influencerId);
      if (influencerEmail) {
        sendPriceNegotiationToInfluencer({
          influencerEmail,
          influencerName: request.influencerName || "there",
          brandName: request.brandName,
          campaignName: request.campaignName,
          proposedPrice: counterAmount,
          type: "counter",
        });
      }
    }
  };

  const respondToCounterOffer = (
    requestId: string,
    action: "accepted" | "rejected",
    influencerName: string,
    influencerId: string
  ) => {
    setAndPersist((prev) =>
      prev.map((r) => {
        if (r.id !== requestId || !r.pendingPriceRequest) return r;
        const { counterAmount } = r.pendingPriceRequest;
        const agreedAmount = counterAmount ?? r.pendingPriceRequest.amount;
        const now = new Date().toISOString();

        const responseMsg: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          senderId: influencerId,
          senderRole: "influencer",
          senderName: influencerName,
          text:
            action === "accepted"
              ? `Counter offer accepted! Budget agreed at ₹${agreedAmount.toLocaleString()}.`
              : `Counter offer declined. Budget remains at ₹${r.budget.toLocaleString()}.`,
          timestamp: now,
          type: action === "accepted" ? "price_accepted" : "price_rejected",
          requestedAmount: agreedAmount,
        };

        return {
          ...r,
          budget: action === "accepted" ? agreedAmount : r.budget,
          chatMessages: [...(r.chatMessages ?? []), responseMsg],
          pendingPriceRequest: {
            ...r.pendingPriceRequest,
            status: action === "accepted" ? ("accepted" as const) : ("rejected" as const),
          },
          ...(action === "accepted"
            ? { priceSettled: true, settledPrice: agreedAmount }
            : {}),
        };
      })
    );
    const request = requests.find((r) => r.id === requestId);
    if (request && request.pendingPriceRequest) {
      const brandEmail = request.brandContactEmail || getBrandEmail(request.brandId);
      if (brandEmail) {
        const agreedAmount = request.pendingPriceRequest.counterAmount ?? request.pendingPriceRequest.amount;
        sendPriceNegotiationToBrand({
          brandEmail,
          brandName: request.brandName,
          influencerName: request.influencerName || influencerName,
          campaignName: request.campaignName,
          proposedPrice: agreedAmount,
          type: action === "accepted" ? "request" : "counter",
        });
      }
    }
  };

  // ── Mutual contact sharing ─────────────────────────────────────────────────

  const requestContactShare = (
    requestId: string,
    initiator: "brand" | "influencer",
    email?: string,
    phone?: string
  ) => {
    setAndPersist((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        if (initiator === "brand") {
          return {
            ...r,
            contactShareStatus: "brand_requested" as ContactShareStatus,
            brandContactEmail: email || r.brandContactEmail,
            brandContactPhone: phone || r.brandContactPhone,
          };
        } else {
          return {
            ...r,
            contactShareStatus: "influencer_requested" as ContactShareStatus,
            contactEmail: email || r.contactEmail,
            contactPhone: phone || r.contactPhone,
          };
        }
      })
    );
  };

  const respondToContactShare = (
    requestId: string,
    action: "accept" | "decline",
    email?: string,
    phone?: string
  ) => {
    setAndPersist((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        if (action === "decline") {
          return { ...r, contactShareStatus: "declined" as ContactShareStatus };
        }
        if (r.contactShareStatus === "brand_requested") {
          return {
            ...r,
            contactShareStatus: "shared" as ContactShareStatus,
            contactEmail: email || r.contactEmail || "influencer@email.com",
            contactPhone: phone || r.contactPhone || "+91 98765 00000",
          };
        } else {
          return {
            ...r,
            contactShareStatus: "shared" as ContactShareStatus,
            brandContactEmail: email || r.brandContactEmail || "brand@company.com",
            brandContactPhone: phone || r.brandContactPhone || "+91 98000 00000",
          };
        }
      })
    );
  };

  // ── Selectors ──────────────────────────────────────────────────────────────
  const getRequestsForInfluencer = (influencerId: string) =>
    requests.filter((r) => r.influencerId === influencerId);

  const getRequestsFromBrand = (brandId: string) =>
    requests.filter((r) => r.brandId === brandId);

  const hasPendingRequestTo = (influencerId: string, brandId: string): boolean =>
    requests.some(
      (r) => r.influencerId === influencerId && r.brandId === brandId && r.status === "pending"
    );

  return (
    <CollaborationContext.Provider
      value={{
        requests,
        addRequest,
        updateRequestStatus,
        addBrandReply,
        sendChatMessage,
        getRequestsForInfluencer,
        getRequestsFromBrand,
        sendPriceRequest,
        respondToPriceRequest,
        sendCounterOffer,
        respondToCounterOffer,
        requestContactShare,
        respondToContactShare,
        hasPendingRequestTo,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (context === undefined) {
    return {
      requests: [] as CollaborationRequest[],
      addRequest: () => {},
      updateRequestStatus: () => {},
      addBrandReply: () => {},
      sendChatMessage: () => {},
      getRequestsForInfluencer: (_id: string) => [] as CollaborationRequest[],
      getRequestsFromBrand: (_id: string) => [] as CollaborationRequest[],
      sendPriceRequest: () => {},
      respondToPriceRequest: () => {},
      sendCounterOffer: () => {},
      respondToCounterOffer: () => {},
      requestContactShare: () => {},
      respondToContactShare: () => {},
      hasPendingRequestTo: () => false,
    } as CollaborationContextType;
  }
  return context;
}