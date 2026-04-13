import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Share2, Copy, Check, Globe, Link as LinkIcon,
  Eye, ChevronDown, ChevronUp, QrCode, Download,
  ArrowUpRight,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { copyToClipboard } from "../utils/clipboard";
import { useAuth } from "../context/AuthContext";
import { getInfluencers } from "../utils/dataManager";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// Social platform share URL builders
const shareUrls = {
  whatsapp: (url: string, text: string) =>
    `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text}\n${url}`)}`,
  twitter: (url: string, text: string) =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  linkedin: (url: string, _text: string) =>
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  facebook: (url: string, _text: string) =>
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  telegram: (url: string, text: string) =>
    `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  email: (url: string, text: string) =>
    `mailto:?subject=${encodeURIComponent("Check out my profile on FLUBN")}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
};

const socialPlatforms = [
  { key: "whatsapp", label: "WhatsApp", color: "#25D366", bg: "#e8faf0", icon: "WA" },
  { key: "twitter", label: "X", color: "#000000", bg: "#f1f5f9", icon: "𝕏" },
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2", bg: "#e8f0fe", icon: "in" },
  { key: "facebook", label: "Facebook", color: "#1877F2", bg: "#e7f0ff", icon: "fb" },
  { key: "telegram", label: "Telegram", color: "#0088CC", bg: "#e6f4fa", icon: "TG" },
  { key: "email", label: "Email", color: "#64748b", bg: "#f1f5f9", icon: "✉" },
] as const;

function fmtNum(num: number) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function ShareProfileWidget() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const influencerData = useMemo(() => {
    const all = getInfluencers();
    return (
      all.find((inf) => inf.email === user?.email) ||
      all.find((inf) => inf.name === user?.name) ||
      all.find((inf) => inf.id === user?.id) ||
      all.find((inf) => inf.status === "active") || // demo fallback
      null
    );
  }, [user]);

  const username = influencerData?.username;
  const profileUrl = username
    ? `${window.location.origin}/@${username}`
    : `${window.location.origin}/influencer/view/${influencerData?.id || user?.id || ""}`;

  const shareText = influencerData
    ? `Check out ${influencerData.name}'s profile on FLUBN - ${influencerData.category} creator with ${fmtNum(influencerData.followers)} followers`
    : `Check out my profile on FLUBN`;

  const handleCopy = async () => {
    try {
      await copyToClipboard(profileUrl);
      setCopied(true);
      toast.success("Profile link copied!", { description: profileUrl });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy. Try selecting the link manually.");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${influencerData?.name || user?.name} on FLUBN`,
          text: shareText,
          url: profileUrl,
        });
      } catch { /* cancelled */ }
    }
  };

  const handlePlatformShare = (platform: string) => {
    const builder = shareUrls[platform as keyof typeof shareUrls];
    if (builder) {
      window.open(builder(profileUrl, shareText), "_blank", "noopener,noreferrer,width=600,height=400");
    }
  };

  const downloadQR = () => {
    const container = qrRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement("a");
      a.download = `flubn-${username || influencerData?.id || "profile"}-qr.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      toast.success("QR code downloaded!");
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  const visiblePlatforms = showAllPlatforms ? socialPlatforms : socialPlatforms.slice(0, 4);

  return (
    <div className="space-y-5">
      {/* ── Share Profile Card ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm"
      >
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#2F6BFF]/5 via-[#0F3D91]/3 to-transparent" />
          <div className="relative flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #2F6BFF, #0F3D91)" }}
              >
                <Share2 size={18} className="text-white" />
              </div>
              <div>
                <p className="text-[#1a1a2e]">Share Profile</p>
                <p className="text-[11px] text-[#94a3b8]">Grow your reach across platforms</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setShowQR(!showQR); setShowPreview(false); }}
                className={`p-2 rounded-lg transition-all ${showQR ? "bg-[#8b5cf6]/10 text-[#8b5cf6]" : "text-[#94a3b8] hover:bg-[#f8f9fc] hover:text-[#64748b]"}`}
                title="QR Code"
              >
                <QrCode size={16} />
              </button>
              <button
                onClick={() => { setShowPreview(!showPreview); setShowQR(false); }}
                className={`p-2 rounded-lg transition-all ${showPreview ? "bg-[#2F6BFF]/10 text-[#2F6BFF]" : "text-[#94a3b8] hover:bg-[#f8f9fc] hover:text-[#64748b]"}`}
                title="Preview"
              >
                <Eye size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-[24px]">
          {/* Profile URL */}
          <div>
            <label className="text-[11px] text-[#94a3b8] mb-2 block uppercase tracking-wider">Your public profile</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2.5 px-4 py-3 bg-[#f8f9fc] rounded-xl border border-[#e2e8f0] min-w-0 group hover:border-[#2F6BFF]/30 transition-colors">
                <LinkIcon size={14} className="text-[#94a3b8] shrink-0 group-hover:text-[#2F6BFF] transition-colors" />
                <span className="text-sm text-[#1a1a2e] truncate select-all">
                  {profileUrl.replace(/^https?:\/\//, "")}
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                className={`shrink-0 px-4 py-3 rounded-xl text-sm flex items-center gap-2 transition-all ${
                  copied
                    ? "bg-[#ecfdf5] text-[#10b981] border border-[#10b981]/20"
                    : "bg-[#2F6BFF] text-white hover:bg-[#0F3D91] shadow-md shadow-[#2F6BFF]/20"
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </motion.button>
            </div>
            {!username && (
              <p className="text-[10px] text-[#f59e0b] mt-2 flex items-center gap-1 bg-[#fffbeb] px-3 py-1.5 rounded-lg">
                <Globe size={10} />
                Set a username in Settings to get a cleaner URL like flubn.com/@yourname
              </p>
            )}
          </div>

          {/* Share to platforms */}
          <div>
            <label className="text-[11px] text-[#94a3b8] mb-2.5 block uppercase tracking-wider">Share directly</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {visiblePlatforms.map((platform) => (
                <motion.button
                  key={platform.key}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handlePlatformShare(platform.key)}
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-[#e2e8f0] hover:border-transparent hover:shadow-md transition-all group"
                  style={{ "--hover-bg": platform.bg } as React.CSSProperties}
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: platform.color }}
                  >
                    {platform.icon}
                  </span>
                  <span className="text-xs text-[#64748b] group-hover:text-[#1a1a2e] truncate">
                    {platform.label}
                  </span>
                </motion.button>
              ))}
            </div>
            {socialPlatforms.length > 4 && (
              <button
                onClick={() => setShowAllPlatforms(!showAllPlatforms)}
                className="mt-2.5 text-xs text-[#2F6BFF] hover:underline flex items-center gap-1"
              >
                {showAllPlatforms ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showAllPlatforms ? "Show less" : `+${socialPlatforms.length - 4} more platforms`}
              </button>
            )}
          </div>

          {/* Native Share (mobile) */}
          {"share" in navigator && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleNativeShare}
              className="w-full py-3 rounded-xl border border-dashed border-[#d1d5db] text-sm text-[#64748b] hover:bg-[#f8f9fc] hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF] transition-all flex items-center justify-center gap-2"
            >
              <Share2 size={14} />
              Share via device...
            </motion.button>
          )}

          {/* Pro Tips */}
          <div className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #f8f9fc 0%, #f0f4ff 100%)" }}>
            <div className="p-4">
              <p className="text-xs text-[#475569] mb-2.5 flex items-center gap-1.5">
                <ArrowUpRight size={12} className="text-[#2F6BFF]" />
                Pro tips for more reach
              </p>
              <div className="space-y-2">
                {[
                  "Add your FLUBN link to your Instagram / YouTube bio",
                  'Share in your Stories with a "Work with me" CTA',
                  "Include it in your email signature for brand outreach",
                  "Pin it in your Linktree or other link-in-bio tools",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-[#2F6BFF]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] text-[#2F6BFF]">{i + 1}</span>
                    </span>
                    <p className="text-[11px] text-[#64748b] leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── QR Code Panel ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-[#e2e8f0]"
            >
              <div className="px-6 py-6">
                <p className="text-xs text-[#64748b] mb-4 flex items-center gap-2">
                  <QrCode size={14} className="text-[#8b5cf6]" />
                  Scan to open your profile
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div
                    className="p-4 rounded-2xl border border-[#e2e8f0] shadow-sm"
                    style={{ background: "linear-gradient(135deg, #ffffff, #fafbff)" }}
                    ref={qrRef}
                  >
                    <QRCodeSVG
                      value={profileUrl}
                      size={160}
                      level="M"
                      includeMargin
                      fgColor="#1a1a2e"
                      bgColor="#ffffff"
                    />
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm text-[#64748b] leading-relaxed">
                      Download and add this QR code to your business cards, media kits, or event materials.
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={downloadQR}
                      className="px-5 py-3 bg-[#2F6BFF] text-white rounded-xl text-sm flex items-center gap-2 hover:bg-[#0F3D91] transition-colors shadow-md shadow-[#2F6BFF]/20"
                    >
                      <Download size={14} />
                      Download QR as PNG
                    </motion.button>
                    <p className="text-[10px] text-[#94a3b8]">
                      512 × 512 px — perfect for print & digital
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Link Preview Panel ────────────────────────────────────────── */}
        <AnimatePresence>
          {showPreview && influencerData && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-[#e2e8f0]"
            >
              <div className="px-6 py-6">
                <p className="text-xs text-[#64748b] mb-4 flex items-center gap-2">
                  <Eye size={14} className="text-[#2F6BFF]" />
                  Link preview (how it appears when shared)
                </p>
                <div className="border border-[#e2e8f0] rounded-2xl overflow-hidden bg-white shadow-sm max-w-sm">
                  <div className="relative h-40 overflow-hidden bg-[#f0f4ff]">
                    <ImageWithFallback
                      src={influencerData.photo}
                      alt={influencerData.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white text-sm truncate">
                        {influencerData.name} (@{username || influencerData.id}) | FLUBN
                      </p>
                    </div>
                  </div>
                  <div className="p-3.5">
                    <p className="text-[11px] text-[#64748b] line-clamp-2 leading-relaxed">
                      {influencerData.bio?.slice(0, 140)}{" "}
                      {fmtNum(influencerData.followers)} followers{" "}
                      {influencerData.location}
                    </p>
                    <p className="text-[10px] text-[#94a3b8] mt-2 flex items-center gap-1">
                      <Globe size={9} />
                      {profileUrl.replace(/^https?:\/\//, "").split("/")[0]}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}