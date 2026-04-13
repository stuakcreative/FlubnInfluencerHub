import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export interface Country {
  code: string;
  flag: string;
  name: string;
  digits: number;
}

export const COUNTRIES: Country[] = [
  { code: "91",  flag: "\u{1F1EE}\u{1F1F3}", name: "India",         digits: 10 },
  { code: "1",   flag: "\u{1F1FA}\u{1F1F8}", name: "US/Canada",     digits: 10 },
  { code: "44",  flag: "\u{1F1EC}\u{1F1E7}", name: "UK",            digits: 10 },
  { code: "61",  flag: "\u{1F1E6}\u{1F1FA}", name: "Australia",     digits: 9  },
  { code: "86",  flag: "\u{1F1E8}\u{1F1F3}", name: "China",         digits: 11 },
  { code: "81",  flag: "\u{1F1EF}\u{1F1F5}", name: "Japan",         digits: 10 },
  { code: "49",  flag: "\u{1F1E9}\u{1F1EA}", name: "Germany",       digits: 11 },
  { code: "33",  flag: "\u{1F1EB}\u{1F1F7}", name: "France",        digits: 9  },
  { code: "971", flag: "\u{1F1E6}\u{1F1EA}", name: "UAE",           digits: 9  },
  { code: "65",  flag: "\u{1F1F8}\u{1F1EC}", name: "Singapore",     digits: 8  },
  { code: "60",  flag: "\u{1F1F2}\u{1F1FE}", name: "Malaysia",      digits: 10 },
  { code: "966", flag: "\u{1F1F8}\u{1F1E6}", name: "Saudi Arabia",  digits: 9  },
  { code: "880", flag: "\u{1F1E7}\u{1F1E9}", name: "Bangladesh",    digits: 10 },
  { code: "92",  flag: "\u{1F1F5}\u{1F1F0}", name: "Pakistan",      digits: 10 },
  { code: "94",  flag: "\u{1F1F1}\u{1F1F0}", name: "Sri Lanka",     digits: 9  },
  { code: "977", flag: "\u{1F1F3}\u{1F1F5}", name: "Nepal",         digits: 10 },
  { code: "7",   flag: "\u{1F1F7}\u{1F1FA}", name: "Russia",        digits: 10 },
  { code: "55",  flag: "\u{1F1E7}\u{1F1F7}", name: "Brazil",        digits: 11 },
  { code: "82",  flag: "\u{1F1F0}\u{1F1F7}", name: "South Korea",   digits: 10 },
  { code: "62",  flag: "\u{1F1EE}\u{1F1E9}", name: "Indonesia",     digits: 11 },
  { code: "39",  flag: "\u{1F1EE}\u{1F1F9}", name: "Italy",         digits: 10 },
  { code: "34",  flag: "\u{1F1EA}\u{1F1F8}", name: "Spain",         digits: 9  },
  { code: "52",  flag: "\u{1F1F2}\u{1F1FD}", name: "Mexico",        digits: 10 },
  { code: "27",  flag: "\u{1F1FF}\u{1F1E6}", name: "South Africa",  digits: 9  },
  { code: "234", flag: "\u{1F1F3}\u{1F1EC}", name: "Nigeria",       digits: 10 },
  { code: "254", flag: "\u{1F1F0}\u{1F1EA}", name: "Kenya",         digits: 9  },
  { code: "63",  flag: "\u{1F1F5}\u{1F1ED}", name: "Philippines",   digits: 10 },
  { code: "66",  flag: "\u{1F1F9}\u{1F1ED}", name: "Thailand",      digits: 9  },
  { code: "84",  flag: "\u{1F1FB}\u{1F1F3}", name: "Vietnam",       digits: 10 },
  { code: "90",  flag: "\u{1F1F9}\u{1F1F7}", name: "Turkey",        digits: 10 },
  { code: "48",  flag: "\u{1F1F5}\u{1F1F1}", name: "Poland",        digits: 9  },
  { code: "31",  flag: "\u{1F1F3}\u{1F1F1}", name: "Netherlands",   digits: 9  },
  { code: "46",  flag: "\u{1F1F8}\u{1F1EA}", name: "Sweden",        digits: 9  },
  { code: "47",  flag: "\u{1F1F3}\u{1F1F4}", name: "Norway",        digits: 8  },
  { code: "41",  flag: "\u{1F1E8}\u{1F1ED}", name: "Switzerland",   digits: 9  },
  { code: "20",  flag: "\u{1F1EA}\u{1F1EC}", name: "Egypt",         digits: 10 },
  { code: "964", flag: "\u{1F1EE}\u{1F1F6}", name: "Iraq",          digits: 10 },
  { code: "98",  flag: "\u{1F1EE}\u{1F1F7}", name: "Iran",          digits: 10 },
  { code: "353", flag: "\u{1F1EE}\u{1F1EA}", name: "Ireland",       digits: 9  },
  { code: "64",  flag: "\u{1F1F3}\u{1F1FF}", name: "New Zealand",   digits: 9  },
  { code: "351", flag: "\u{1F1F5}\u{1F1F9}", name: "Portugal",      digits: 9  },
  { code: "30",  flag: "\u{1F1EC}\u{1F1F7}", name: "Greece",        digits: 10 },
  { code: "36",  flag: "\u{1F1ED}\u{1F1FA}", name: "Hungary",       digits: 9  },
  { code: "43",  flag: "\u{1F1E6}\u{1F1F9}", name: "Austria",       digits: 10 },
  { code: "32",  flag: "\u{1F1E7}\u{1F1EA}", name: "Belgium",       digits: 9  },
  { code: "45",  flag: "\u{1F1E9}\u{1F1F0}", name: "Denmark",       digits: 8  },
  { code: "358", flag: "\u{1F1EB}\u{1F1EE}", name: "Finland",       digits: 10 },
];

// Format local digits in groups of 5
export const formatLocalDigits = (digits: string, maxDigits: number): string => {
  const limited = digits.slice(0, maxDigits);
  if (limited.length <= 5) return limited;
  const parts: string[] = [];
  for (let i = 0; i < limited.length; i += 5) {
    parts.push(limited.slice(i, i + 5));
  }
  return parts.join(" ");
};

// Get full phone string with country code (for submission)
export const getFullPhone = (localDigits: string, country: Country): string => {
  const digits = localDigits.replace(/\D/g, "");
  return digits.length > 0 ? `+${country.code} ${localDigits.trim()}` : "";
};

interface CountryPhoneInputProps {
  value: string;
  onChange: (formatted: string) => void;
  selectedCountry: Country;
  onCountryChange: (country: Country) => void;
  hasError?: boolean;
  /** Visual variant: "contact" uses rounded-xl, "signup" uses rounded-[12px] */
  variant?: "contact" | "signup";
}

export function CountryPhoneInput({
  value,
  onChange,
  selectedCountry,
  onCountryChange,
  hasError = false,
  variant = "contact",
}: CountryPhoneInputProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevCountryRef = useRef(selectedCountry.code);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  // Keep refs in sync
  valueRef.current = value;
  onChangeRef.current = onChange;

  // When country changes, clear phone number
  useEffect(() => {
    if (prevCountryRef.current !== selectedCountry.code) {
      prevCountryRef.current = selectedCountry.code;
      onChangeRef.current("");
    }
  }, [selectedCountry.code]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [dropdownOpen]);

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search)
  );

  const handlePhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const formatted = formatLocalDigits(digits, selectedCountry.digits);
    onChange(formatted);
  };

  const borderRadius = variant === "signup" ? "rounded-[12px]" : "rounded-xl";
  const dropdownRadius = variant === "signup" ? "rounded-[12px]" : "rounded-xl";

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`flex items-stretch bg-[#f8f9fc] border ${borderRadius} overflow-visible transition-all ${
          hasError ? "border-[#ef4444]/50 bg-[#fef2f2]" : "border-[#e2e8f0]"
        } focus-within:ring-2 focus-within:ring-[#2F6BFF]/20 focus-within:border-[#2F6BFF] focus-within:bg-white`}
      >
        {/* Country Code Selector Button */}
        <button
          type="button"
          onClick={() => {
            setDropdownOpen(!dropdownOpen);
            setSearch("");
          }}
          className="flex items-center gap-1 px-3 border-r border-[#e2e8f0] hover:bg-[#f1f3f9] transition-colors shrink-0"
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="text-[#0a090f] text-xs">+{selectedCountry.code}</span>
          <ChevronDown
            size={12}
            className={`text-[#94a3b8] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Phone Input */}
        <input
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => handlePhoneChange(e.target.value)}
          onKeyDown={(e) => {
            if (/[a-zA-Z]/.test(e.key) && e.key.length === 1) e.preventDefault();
            if (
              !/[0-9]/.test(e.key) &&
              !["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) &&
              !e.ctrlKey &&
              !e.metaKey
            ) {
              e.preventDefault();
            }
          }}
          placeholder={`${selectedCountry.digits} digit number`}
          maxLength={selectedCountry.digits + Math.floor(selectedCountry.digits / 5)}
          className={`flex-1 min-w-0 px-3 py-3 bg-transparent text-sm text-[#0a090f] placeholder:text-[#b0b8c9] focus:outline-none [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_#f8f9fc] [&:-webkit-autofill]:[-webkit-text-fill-color:#1a1a2e] ${
            variant === "signup" ? "text-[15px] text-[#1a1a2e]" : ""
          }`}
        />
      </div>

      {/* Country Dropdown */}
      {dropdownOpen && (
        <div
          className={`absolute left-0 top-[calc(100%+4px)] w-full bg-white border border-[#e2e8f0] ${dropdownRadius} shadow-lg z-50 overflow-hidden`}
        >
          {/* Search */}
          <div className="relative border-b border-[#e8eaf0]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b8c9]" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full pl-8 pr-3 py-2.5 text-[13px] text-[#0a090f] placeholder:text-[#b0b8c9] focus:outline-none bg-[#fafbfd]"
            />
          </div>
          {/* List */}
          <div className="max-h-[200px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-[#94a3b8] text-center">No countries found</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onCountryChange(c);
                    setDropdownOpen(false);
                    setSearch("");
                    // Clear phone number when country changes
                    onChangeRef.current("");
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-[#f1f3f9] transition-colors ${
                    selectedCountry.code === c.code ? "bg-[#EBF2FF] text-[#2F6BFF]" : "text-[#0a090f]"
                  }`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-[#94a3b8] text-[12px] shrink-0">+{c.code}</span>
                  {selectedCountry.code === c.code && (
                    <Check size={14} className="text-[#2F6BFF] shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Hint text */}
      <p className="text-[11px] text-[#94a3b8] mt-1">
        {(() => {
          const digitCount = value.replace(/\D/g, "").length;
          return digitCount > 0
            ? `${digitCount}/${selectedCountry.digits} digits (${selectedCountry.name})`
            : `Select country & enter ${selectedCountry.digits}-digit number`;
        })()}
      </p>
    </div>
  );
}