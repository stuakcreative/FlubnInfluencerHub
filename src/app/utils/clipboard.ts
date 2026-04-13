/**
 * Safe clipboard copy that falls back to execCommand when
 * the Clipboard API is blocked by permissions policy.
 */
export function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Try modern API first
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(resolve).catch(() => {
        // Fallback
        fallbackCopy(text) ? resolve() : reject(new Error("Copy failed"));
      });
    } else {
      fallbackCopy(text) ? resolve() : reject(new Error("Copy failed"));
    }
  });
}

function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
