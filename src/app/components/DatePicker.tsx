import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

interface DatePickerProps {
  value: string;           // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  minDate?: string;        // "YYYY-MM-DD"
  maxDate?: string;        // "YYYY-MM-DD"
  placeholder?: string;
  label?: string;
  required?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date",
  label,
  required,
  onOpenChange,
}: DatePickerProps) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const effectiveMin = minDate ?? todayStr;
  const effectiveMax =
    maxDate ??
    new Date(today.getFullYear() + 5, today.getMonth(), today.getDate())
      .toISOString()
      .split("T")[0];

  // Initialise view to the selected date (or today)
  const initDate = value ? new Date(value + "T00:00:00") : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth()); // 0-based
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Notify parent when calendar opens/closes
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(open);
    }
  }, [open, onOpenChange]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null);

  const toStr = (d: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  };

  const canGoPrev = (() => {
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const lastOfPrev = new Date(prevY, prevM + 1, 0).toISOString().split("T")[0];
    return lastOfPrev >= effectiveMin;
  })();

  const canGoNext = (() => {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const firstOfNext = `${nextY}-${String(nextM + 1).padStart(2, "0")}-01`;
    return firstOfNext <= effectiveMax;
  })();

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="relative" ref={ref}>
      {label && <span className="text-xs text-[#64748b] mb-1.5 block">{label}</span>}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 bg-white border rounded-xl text-sm transition-all shadow-sm ${
          open
            ? "border-[#2F6BFF] ring-2 ring-[#2F6BFF]/20"
            : "border-[#e2e8f0] hover:border-[#2F6BFF]/40"
        }`}
      >
        <CalendarDays size={15} className={displayValue ? "text-[#2F6BFF]" : "text-[#94a3b8]"} />
        <span className={`flex-1 text-left ${displayValue ? "text-[#1a1a2e]" : "text-[#94a3b8]"}`}>
          {displayValue || placeholder}
        </span>
        {value && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-[#94a3b8] hover:text-[#64748b] transition-colors px-0.5"
          >
            ×
          </span>
        )}
        {/* hidden input for required validation */}
        {required && (
          <input
            tabIndex={-1}
            required
            value={value}
            onChange={() => {}}
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
          />
        )}
      </button>

      {/* Calendar Popup */}
      {open && (
        <div className="absolute z-[200] mt-2 w-[280px] bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] p-4 left-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              disabled={!canGoPrev}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-sm text-[#1a1a2e]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              disabled={!canGoNext}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[10px] text-[#94a3b8] py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const ds = toStr(day);
              const isSelected = ds === value;
              const isToday = ds === todayStr;
              const disabled = ds < effectiveMin || ds > effectiveMax;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(ds);
                    setOpen(false);
                  }}
                  className={`
                    w-9 h-9 mx-auto flex items-center justify-center rounded-lg text-sm transition-all
                    ${isSelected
                      ? "bg-[#2F6BFF] text-white shadow-md shadow-[#2F6BFF]/30"
                      : isToday && !disabled
                      ? "border border-[#2F6BFF] text-[#2F6BFF] hover:bg-[#EBF2FF]"
                      : disabled
                      ? "text-[#cbd5e1] cursor-not-allowed"
                      : "text-[#1a1a2e] hover:bg-[#EBF2FF] hover:text-[#2F6BFF]"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          {todayStr >= effectiveMin && todayStr <= effectiveMax && (
            <button
              type="button"
              onClick={() => { onChange(todayStr); setOpen(false); }}
              className="mt-3 w-full text-center text-xs text-[#2F6BFF] hover:text-[#0F3D91] transition-colors py-1 rounded-lg hover:bg-[#EBF2FF]"
            >
              Today
            </button>
          )}
        </div>
      )}
    </div>
  );
}
