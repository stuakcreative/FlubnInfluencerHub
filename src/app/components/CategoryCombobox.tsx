import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Plus } from "lucide-react";

interface CategoryComboboxProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
}

export function CategoryCombobox({ value, onChange, suggestions }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal query when the parent resets the form (e.g. open modal again)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const commit = useCallback(
    (val: string) => {
      const trimmed = val.trim();
      if (trimmed) onChange(trimmed);
      setOpen(false);
    },
    [onChange]
  );

  // Close on outside click and commit whatever is typed
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commit(query);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [query, commit]);

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes(query.toLowerCase())
  );

  const isNew =
    query.trim() !== "" &&
    !suggestions.some((s) => s.toLowerCase() === query.trim().toLowerCase());

  const select = (cat: string) => {
    setQuery(cat);
    onChange(cat);
    setOpen(false);
  };

  return (
    // No label rendered here — the parent form row provides it
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            onChange(val); // always keep formData in sync on every keystroke
            setOpen(true);
          }}
          onBlur={() => {
            // Small delay so onMouseDown on dropdown items fires first
            setTimeout(() => setOpen(false), 150);
          }}
          placeholder="Select or type a new category…"
          className="w-full px-4 py-3 pr-10 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b]"
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#e2e8f0] rounded-xl shadow-lg overflow-hidden">
          {/* Existing matches */}
          {filtered.length > 0 && (
            <ul className="py-1 max-h-48 overflow-y-auto">
              {filtered.map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(cat);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      cat === value
                        ? "bg-[#EBF2FF] text-[#2F6BFF]"
                        : "text-[#1a1a2e] hover:bg-[#f8f9fc]"
                    }`}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Create new category row */}
          {isNew && (
            <>
              {filtered.length > 0 && <div className="border-t border-[#e2e8f0]" />}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(query.trim());
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-[#2F6BFF] hover:bg-[#EBF2FF] flex items-center gap-2"
              >
                <Plus size={14} />
                Create &ldquo;{query.trim()}&rdquo;
              </button>
            </>
          )}

          {/* Empty state */}
          {filtered.length === 0 && !isNew && (
            <p className="px-4 py-3 text-sm text-[#94a3b8]">No categories found</p>
          )}
        </div>
      )}
    </div>
  );
}