export type CurrencyCode =
  | "INR" | "USD" | "EUR" | "GBP" | "JPY" | "CNY"
  | "AED" | "SGD" | "AUD" | "CAD" | "KRW" | "BRL"
  | "MYR" | "THB" | "PHP" | "TRY" | "ZAR" | "IDR" | "VND";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  /**
   * Whether a space should appear between the symbol and the number.
   * Based on each currency's international typographic convention:
   *  - true  → "₹ 1,000" / "R 1 000" / "RM 1,000" / "Rp 1,000"
   *  - false → "$1,000"  / "£1,000"  / "R$1,000"  / "฿1,000"
   */
  space: boolean;
}

export const CURRENCIES: Currency[] = [
  // ── space: true  — symbol is a letter/word prefix that reads better with a gap ──
  { code: "INR", symbol: "₹",   name: "Indian Rupee",        locale: "en-IN",  space: true  },
  { code: "EUR", symbol: "€",   name: "Euro",                locale: "de-DE",  space: true  },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham",          locale: "ar-AE",  space: true  },
  { code: "ZAR", symbol: "R",   name: "South African Rand",  locale: "en-ZA",  space: true  },
  { code: "MYR", symbol: "RM",  name: "Malaysian Ringgit",   locale: "ms-MY",  space: true  },
  { code: "IDR", symbol: "Rp",  name: "Indonesian Rupiah",   locale: "id-ID",  space: true  },

  // ── space: false — compact single-character / dollar-family symbols ──
  { code: "USD", symbol: "$",   name: "US Dollar",           locale: "en-US",  space: false },
  { code: "GBP", symbol: "£",   name: "British Pound",       locale: "en-GB",  space: false },
  { code: "JPY", symbol: "¥",   name: "Japanese Yen",        locale: "ja-JP",  space: false },
  { code: "CNY", symbol: "元",  name: "Chinese Yuan",        locale: "zh-CN",  space: false },
  { code: "SGD", symbol: "S$",  name: "Singapore Dollar",    locale: "en-SG",  space: false },
  { code: "AUD", symbol: "A$",  name: "Australian Dollar",   locale: "en-AU",  space: false },
  { code: "CAD", symbol: "C$",  name: "Canadian Dollar",     locale: "en-CA",  space: false },
  { code: "KRW", symbol: "₩",   name: "South Korean Won",    locale: "ko-KR",  space: false },
  { code: "BRL", symbol: "R$",  name: "Brazilian Real",      locale: "pt-BR",  space: false },
  { code: "THB", symbol: "฿",   name: "Thai Baht",           locale: "th-TH",  space: false },
  { code: "PHP", symbol: "₱",   name: "Philippine Peso",     locale: "fil-PH", space: false },
  { code: "TRY", symbol: "₺",   name: "Turkish Lira",        locale: "tr-TR",  space: false },
  { code: "VND", symbol: "₫",   name: "Vietnamese Dong",     locale: "vi-VN",  space: false },
];

/** Look up a currency by its code, falling back to INR */
export const getCurrency = (code: string): Currency =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

/**
 * Format a numeric rate with the correct currency symbol.
 *
 * Applies per-currency spacing convention:
 *   INR  → ₹ 1,000   (space)
 *   ZAR  → R 1 000   (space)
 *   MYR  → RM 1,000  (space)
 *   USD  → $1,000    (no space)
 *   GBP  → £1,000    (no space)
 */
export const formatRate = (amount: number, currencyCode = "INR"): string => {
  const cur = getCurrency(currencyCode);
  const sep = cur.space ? "\u202F" : ""; // narrow no-break space for "spaced" currencies
  try {
    return `${cur.symbol}${sep}${amount.toLocaleString(cur.locale)}`;
  } catch {
    return `${cur.symbol}${sep}${amount.toLocaleString()}`;
  }
};
