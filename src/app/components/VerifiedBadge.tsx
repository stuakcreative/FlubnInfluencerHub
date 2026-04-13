import { BadgeCheck } from "lucide-react";

interface VerifiedBadgeProps {
  /** Icon size in px. Default: 15 */
  size?: number;
  /** Show a text label next to the icon. Default: false */
  showLabel?: boolean;
  /** Extra class names on the wrapper span */
  className?: string;
}

/**
 * VerifiedBadge — blue BadgeCheck tick shown next to verified brand names.
 * Usage: <VerifiedBadge /> or <VerifiedBadge size={18} showLabel />
 */
export function VerifiedBadge({ size = 15, showLabel = false, className = "" }: VerifiedBadgeProps) {
  return (
    <span
      title="Verified Brand"
      className={`inline-flex items-center gap-1 ${className}`}
    >
      <BadgeCheck
        size={size}
        strokeWidth={2.5}
        className="text-[#2F6BFF] shrink-0"
        style={{ filter: "drop-shadow(0 0 3px rgba(47,107,255,0.35))" }}
      />
      {showLabel && (
        <span className="text-[#2F6BFF] font-medium" style={{ fontSize: size * 0.8 }}>
          Verified
        </span>
      )}
    </span>
  );
}