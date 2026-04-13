import { useState } from "react";
import { ProfileModal } from "./ProfileModal";

interface ProfileAvatarProps {
  photo?: string;
  name?: string;
  size?: string;          // tailwind size classes e.g. "w-11 h-11"
  textSize?: string;      // tailwind text size e.g. "text-sm"
  gradient?: string;      // CSS gradient string
  className?: string;     // extra classes on the img/div
  userId?: string;        // User ID to fetch profile
  userType?: "brand" | "influencer"; // Type of user
  requestId?: string;     // Request ID to check contact sharing
  clickable?: boolean;    // Whether to show profile on click
}

/** Deterministic gradient palette — hashed from a seed string */
const GRADIENTS = [
  "linear-gradient(135deg, #0F3D91, #2F6BFF)",
  "linear-gradient(135deg, #7c3aed, #a78bfa)",
  "linear-gradient(135deg, #0d9488, #34d399)",
  "linear-gradient(135deg, #b45309, #fbbf24)",
  "linear-gradient(135deg, #be185d, #f472b6)",
  "linear-gradient(135deg, #065f46, #34d399)",
  "linear-gradient(135deg, #1d4ed8, #60a5fa)",
  "linear-gradient(135deg, #9f1239, #f43f5e)",
  "linear-gradient(135deg, #374151, #9ca3af)",
  "linear-gradient(135deg, #92400e, #f97316)",
];

export function hashGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return GRADIENTS[h % GRADIENTS.length];
}

/** Derive 2-char initials from a full name */
export function nameInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * Displays a circular profile avatar.
 * Shows `photo` if provided and loads successfully; otherwise renders
 * a gradient circle with 2-character initials derived from `name`.
 * If `clickable` and `userId`/`userType` are provided, clicking opens a profile modal.
 */
export function ProfileAvatar({
  photo,
  name,
  size = "w-11 h-11",
  textSize = "text-sm",
  gradient,
  className = "",
  userId,
  userType,
  requestId,
  clickable = false,
}: ProfileAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const bg = gradient ?? hashGradient(name ?? "?");
  const initials = nameInitials(name);

  const handleClick = () => {
    if (clickable && userId && userType) {
      setShowModal(true);
    }
  };

  const handleClickWithStop = (e: React.MouseEvent) => {
    if (clickable && userId && userType) {
      e.stopPropagation(); // Prevent click from bubbling to parent button
      setShowModal(true);
    }
  };

  const wrapperClass = clickable && userId && userType
    ? "cursor-pointer hover:opacity-80 transition-opacity"
    : "";

  if (photo && !imgError) {
    return (
      <>
        <img
          src={photo}
          alt={name ?? ""}
          className={`${size} rounded-full object-cover object-center ${className} ${wrapperClass}`}
          onError={() => setImgError(true)}
          onClick={clickable ? handleClickWithStop : undefined}
        />
        {clickable && userId && userType && showModal && (
          <ProfileModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            userId={userId}
            userType={userType}
            requestId={requestId}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className={`${size} rounded-full flex items-center justify-center text-white ${textSize} font-medium ${className} ${wrapperClass}`}
        style={{ background: bg }}
        onClick={handleClickWithStop}
      >
        {initials}
      </div>
      {clickable && userId && userType && showModal && (
        <ProfileModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          userId={userId}
          userType={userType}
          requestId={requestId}
        />
      )}
    </>
  );
}