import * as api from "./api";

const STORAGE_KEY = "flubn_chat_lastread";

function getReadMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function compositeKey(userId: string, requestId: string): string {
  return `${userId}__${requestId}`;
}

/** Call this whenever a user opens a chat panel for a request. */
export function markChatAsRead(userId: string, requestId: string): void {
  const map = getReadMap();
  map[compositeKey(userId, requestId)] = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage quota exceeded — fail silently
  }
  // Sync to backend
  api.saveData("chat_lastread", map).catch(() => {});
}

/** Returns the ISO timestamp of when the user last read this chat, or null if never. */
export function getLastReadAt(userId: string, requestId: string): string | null {
  return getReadMap()[compositeKey(userId, requestId)] || null;
}

/**
 * Returns the count of UNREAD messages in a chat.
 * Only counts messages sent by the OTHER role (not by the current user),
 * and only those sent AFTER the last time the current user opened this chat.
 *
 * If the chat has never been opened (lastReadAt is null), all messages
 * from the other party are considered unread.
 */
export function getUnreadCount(
  userId: string,
  requestId: string,
  messages: { senderRole: string; senderName?: string; timestamp: string }[],
  currentRole: "brand" | "influencer"
): number {
  if (!messages || messages.length === 0) return 0;
  const otherRole = currentRole === "brand" ? "influencer" : "brand";
  const lastReadAt = getLastReadAt(userId, requestId);

  if (!lastReadAt) {
    // Never opened — all messages from the other party are unread
    return messages.filter((m) => m.senderRole === otherRole).length;
  }

  const lastReadTime = new Date(lastReadAt).getTime();
  return messages.filter(
    (m) =>
      m.senderRole === otherRole &&
      new Date(m.timestamp).getTime() > lastReadTime
  ).length;
}