import React, { useState, useEffect, useRef } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useSiteSettings, type SiteSettings } from "../../context/SiteSettingsContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings, Image, Globe, Shield, Save, RotateCcw, Upload, Trash2,
  Eye, EyeOff, Check, AlertCircle, Search as SearchIcon, FileText, X,
  Moon, Sun, Star
} from "lucide-react";
import { toast } from "sonner";
import * as api from "../../utils/api";

type TabId = "branding" | "seo" | "account";

const TABS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "branding", label: "Branding", icon: Image, desc: "Logo, site name & identity" },
  { id: "seo", label: "SEO & Analytics", icon: SearchIcon, desc: "Meta tags & tracking" },
  { id: "account", label: "Admin Account", icon: Shield, desc: "Email & password" },
];

const inputClass =
  "w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all";
const labelClass = "block text-sm text-[#1a1a2e] mb-1.5";
const hintClass = "text-xs text-[#94a3b8] mt-1";

/* ── generic image upload validator ── */
function validateImageFile(file: File, maxMB = 1): boolean {
  if (!file.type.startsWith("image/")) {
    toast.error("Invalid file type", { description: "Please upload an image file (PNG, JPG, SVG, WebP, ICO)" });
    return false;
  }
  if (file.size > 20 * 1024 * 1024) {
    toast.error("File too large", { description: `File must be under 20MB` });
    return false;
  }
  return true;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminSettings() {
  const { settings, updateSettings, resetSettings } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<TabId>("branding");
  const [draft, setDraft] = useState<SiteSettings>({ ...settings });
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const lightLogoRef = useRef<HTMLInputElement>(null);
  const darkLogoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft({ ...settings });
    setNewEmail(settings.adminEmail);
  }, [settings]);

  useEffect(() => {
    const changed = JSON.stringify(draft) !== JSON.stringify(settings);
    setHasChanges(changed);
  }, [draft, settings]);

  const updateDraft = (updates: Partial<SiteSettings>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof SiteSettings,
    maxMB = 1
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file, maxMB)) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateDraft({ [field]: reader.result as string });
      toast.success("Image uploaded!");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeFile = (
    field: "customLogoUrl" | "customDarkLogoUrl" | "faviconUrl",
    ref: React.RefObject<HTMLInputElement | null>
  ) => {
    updateDraft({ [field]: "" });
    if (ref.current) ref.current.value = "";
  };

  const handleSave = () => {
    updateSettings(draft);
    toast.success("Settings saved", { description: "Your changes have been applied across the platform." });
    setHasChanges(false);
  };

  const handlePasswordChange = async () => {
    if (!currentPassword) { toast.error("Current password required"); return; }
    if (!newPassword || newPassword.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (newPassword !== confirmNewPassword) { toast.error("Passwords do not match"); return; }
    try {
      const result = await api.changeAdminPassword(currentPassword, newPassword);
      if (!result) {
        toast.error("Unable to connect to server. Please try again.");
        return;
      }
      toast.success("Password updated successfully");
      setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
    } catch (err: any) {
      toast.error("Password change failed", { description: err.message || "Incorrect current password or server error" });
    }
  };

  const handleEmailChange = () => {
    if (!newEmail || !newEmail.includes("@")) { toast.error("Please enter a valid email"); return; }
    updateSettings({ adminEmail: newEmail });
    toast.success("Admin email updated", { description: `New email: ${newEmail}` });
  };

  const handleReset = () => {
    resetSettings();
    setDraft({ ...settings });
    setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
    setShowResetConfirm(false);
    toast.success("Settings reset to defaults");
  };

  return (
    <div className="max-w-6xl mx-auto font-['Inter',sans-serif]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2F6BFF] to-[#0F3D91] flex items-center justify-center">
            <Settings size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl text-[#1a1a2e]">Platform Settings</h1>
            <p className="text-sm text-[#94a3b8]">Manage branding, SEO, and admin credentials</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-[240px] shrink-0">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-2 lg:sticky lg:top-8">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" });
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all mb-0.5 ${
                    active
                      ? "bg-[#EBF2FF] text-[#2F6BFF]"
                      : "text-[#64748b] hover:bg-[#f8f9fc] hover:text-[#1a1a2e]"
                  }`}
                >
                  <tab.icon size={18} />
                  <div>
                    <span className="text-sm block">{tab.label}</span>
                    <span className="text-[10px] text-[#94a3b8] block mt-0.5">{tab.desc}</span>
                  </div>
                </button>
              );
            })}
            <div className="h-px bg-[#e2e8f0] my-2" />
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-[#ef4444] hover:bg-[#fef2f2] transition-all text-sm"
            >
              <RotateCcw size={16} />
              Reset All to Defaults
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "branding" && (
                <BrandingTab
                  draft={draft}
                  updateDraft={updateDraft}
                  lightLogoRef={lightLogoRef}
                  darkLogoRef={darkLogoRef}
                  faviconRef={faviconRef}
                  handleFileUpload={handleImageUpload}
                  removeFile={removeFile}
                />
              )}
              {activeTab === "seo" && (
                <SeoTab draft={draft} updateDraft={updateDraft} />
              )}
              {activeTab === "account" && (
                <AccountTab
                  settings={settings}
                  newEmail={newEmail}
                  setNewEmail={setNewEmail}
                  handleEmailChange={handleEmailChange}
                  currentPassword={currentPassword}
                  setCurrentPassword={setCurrentPassword}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  confirmNewPassword={confirmNewPassword}
                  setConfirmNewPassword={setConfirmNewPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  showNewPassword={showNewPassword}
                  setShowNewPassword={setShowNewPassword}
                  handlePasswordChange={handlePasswordChange}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Sticky Save Bar (only for branding/seo tabs) */}
          {activeTab !== "account" && (
            <div className="mt-6 bg-white rounded-2xl border border-[#e2e8f0] px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-[#94a3b8]">
                {hasChanges ? (
                  <span className="text-[#f59e0b] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] inline-block" />
                    You have unsaved changes
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] inline-block" />
                    All changes saved
                  </span>
                )}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setDraft({ ...settings })}
                  disabled={!hasChanges}
                  className="px-4 py-2 text-sm text-[#64748b] hover:text-[#1a1a2e] border border-[#e2e8f0] rounded-xl hover:bg-[#f8f9fc] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="px-5 py-2 text-sm text-white rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: hasChanges
                      ? "linear-gradient(135deg, #2F6BFF 0%, #0F3D91 100%)"
                      : "#94a3b8",
                  }}
                >
                  <Save size={15} />
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        title="Reset All Settings?"
        description="This will restore all platform settings to their factory defaults. Your custom logos, favicon, SEO settings, and admin credentials will be reset."
        confirmLabel="Reset Everything"
        variant="danger"
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}

/* ══════════════════════════ LOGO UPLOAD CARD ══════════════════════════ */
function LogoUploadCard({
  title,
  description,
  icon: Icon,
  iconColor,
  previewBg,
  previewBorder,
  placeholderText,
  placeholderTextClass,
  value,
  inputRef,
  accept,
  onUpload,
  onRemove,
  previewSize,
  hint,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  previewBg: string;
  previewBorder: string;
  placeholderText: string;
  placeholderTextClass: string;
  value: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  previewSize: { w: string; h: string };
  hint: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8f9fc]">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <h2 className="text-sm text-[#1a1a2e]">{title}</h2>
        </div>
        <p className="text-xs text-[#94a3b8] mt-1">{description}</p>
      </div>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Preview */}
          <div className="shrink-0">
            <div
              className={`${previewSize.w} ${previewSize.h} rounded-xl border-2 border-dashed ${previewBorder} flex items-center justify-center ${previewBg} overflow-hidden`}
            >
              {value ? (
                <img
                  src={value}
                  alt={title}
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <span className={`text-xs ${placeholderTextClass}`}>{placeholderText}</span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={onUpload}
              className="hidden"
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#EBF2FF] text-[#2F6BFF] rounded-xl text-sm hover:bg-[#d9e6ff] transition-colors"
            >
              <Upload size={16} />
              {value ? "Replace Logo" : "Upload Logo"}
            </button>
            <p className={hintClass}>{hint}</p>

            {value && (
              <button
                onClick={onRemove}
                className="flex items-center gap-2 px-4 py-2 text-sm text-[#ef4444] hover:bg-[#fef2f2] rounded-xl transition-colors"
              >
                <Trash2 size={14} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ BRANDING TAB ══════════════════════════ */
function BrandingTab({
  draft,
  updateDraft,
  lightLogoRef,
  darkLogoRef,
  faviconRef,
  handleFileUpload,
  removeFile,
}: {
  draft: SiteSettings;
  updateDraft: (u: Partial<SiteSettings>) => void;
  lightLogoRef: React.RefObject<HTMLInputElement | null>;
  darkLogoRef: React.RefObject<HTMLInputElement | null>;
  faviconRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "customLogoUrl" | "customDarkLogoUrl" | "faviconUrl",
    maxMB?: number
  ) => void;
  removeFile: (
    field: "customLogoUrl" | "customDarkLogoUrl" | "faviconUrl",
    ref: React.RefObject<HTMLInputElement | null>
  ) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Where logos appear */}
      <div className="bg-[#EBF2FF]/50 rounded-2xl p-4 border border-[#2F6BFF]/10">
        <div className="flex items-start gap-2.5">
          <AlertCircle size={16} className="text-[#2F6BFF] mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="text-[#2F6BFF]">Where these logos appear:</span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 mt-1.5 text-[#64748b]">
              <div className="flex items-center gap-1.5">
                <Sun size={11} className="text-[#f59e0b]" />
                <span>Light logo: Public Navbar, Login & Signup (mobile)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Moon size={11} className="text-[#6366f1]" />
                <span>Dark logo: Sidebar, Footer, Login & Signup (left panel)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star size={11} className="text-[#10b981]" />
                <span>Favicon: Browser tab icon</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Light / Current Logo */}
      <LogoUploadCard
        title="Logo — Light Background"
        description="Used on the public Navbar, Login & Signup pages (mobile view), and anywhere with a light/white background."
        icon={Sun}
        iconColor="text-[#f59e0b]"
        previewBg="bg-white"
        previewBorder="border-[#e2e8f0]"
        placeholderText="Default FLUBN Logo"
        placeholderTextClass="text-[#b0b8c9]"
        value={draft.customLogoUrl}
        inputRef={lightLogoRef}
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onUpload={(e) => handleFileUpload(e, "customLogoUrl")}
        onRemove={() => removeFile("customLogoUrl", lightLogoRef)}
        previewSize={{ w: "w-[200px]", h: "h-[80px]" }}
        hint="Recommended: PNG or SVG with transparent background, max 2MB. Ideal size: 200x60px."
      />

      {/* Dark Background Logo */}
      <LogoUploadCard
        title="Logo — Dark Background"
        description="Used on the dashboard sidebar, Footer, and the Login & Signup left panels (dark areas). If not set, the light logo will be used everywhere."
        icon={Moon}
        iconColor="text-[#6366f1]"
        previewBg="bg-[#0a090f]"
        previewBorder="border-white/10"
        placeholderText="Default FLUBN Logo"
        placeholderTextClass="text-white/30"
        value={draft.customDarkLogoUrl}
        inputRef={darkLogoRef}
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onUpload={(e) => handleFileUpload(e, "customDarkLogoUrl")}
        onRemove={() => removeFile("customDarkLogoUrl", darkLogoRef)}
        previewSize={{ w: "w-[200px]", h: "h-[80px]" }}
        hint="Recommended: Light-colored or white logo for dark backgrounds. PNG or SVG, max 2MB."
      />

      {/* Favicon Upload */}
      <LogoUploadCard
        title="Favicon"
        description="The small icon shown in the browser tab. Upload an ICO, PNG, or SVG file."
        icon={Star}
        iconColor="text-[#10b981]"
        previewBg="bg-[#f8f9fc]"
        previewBorder="border-[#e2e8f0]"
        placeholderText="No favicon"
        placeholderTextClass="text-[#b0b8c9]"
        value={draft.faviconUrl}
        inputRef={faviconRef}
        accept="image/x-icon,image/png,image/svg+xml,image/vnd.microsoft.icon,image/jpeg,image/webp"
        onUpload={(e) => handleFileUpload(e, "faviconUrl", 1)}
        onRemove={() => removeFile("faviconUrl", faviconRef)}
        previewSize={{ w: "w-[80px]", h: "h-[80px]" }}
        hint="Recommended: 32x32 or 64x64px. ICO, PNG, or SVG. Max 1MB."
      />

      {/* Site Name */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8f9fc]">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#2F6BFF]" />
            <h2 className="text-sm text-[#1a1a2e]">Site Identity</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Site Name</label>
            <input
              type="text"
              value={draft.siteName}
              onChange={(e) => updateDraft({ siteName: e.target.value })}
              placeholder="FLUBN"
              className={inputClass}
            />
            <p className={hintClass}>Used in browser tab title and email communications</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ SEO TAB ══════════════════════════ */
function SeoTab({
  draft,
  updateDraft,
}: {
  draft: SiteSettings;
  updateDraft: (u: Partial<SiteSettings>) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Meta Tags */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8f9fc]">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-[#2F6BFF]" />
            <h2 className="text-sm text-[#1a1a2e]">Meta Tags</h2>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1">
            Control how your site appears in search engines and social media shares
          </p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className={labelClass}>Meta Title</label>
            <input
              type="text"
              value={draft.metaTitle}
              onChange={(e) => updateDraft({ metaTitle: e.target.value })}
              placeholder="FLUBN - Influencer Marketplace"
              className={inputClass}
            />
            <div className="flex justify-between mt-1">
              <p className={hintClass}>Recommended: 50-60 characters</p>
              <span className={`text-xs ${draft.metaTitle.length > 60 ? "text-[#f59e0b]" : "text-[#94a3b8]"}`}>
                {draft.metaTitle.length}/60
              </span>
            </div>
          </div>

          <div>
            <label className={labelClass}>Meta Description</label>
            <textarea
              value={draft.metaDescription}
              onChange={(e) => updateDraft({ metaDescription: e.target.value })}
              placeholder="Connect brands with top influencers..."
              rows={3}
              className={inputClass + " resize-none"}
            />
            <div className="flex justify-between mt-1">
              <p className={hintClass}>Recommended: 150-160 characters</p>
              <span className={`text-xs ${draft.metaDescription.length > 160 ? "text-[#f59e0b]" : "text-[#94a3b8]"}`}>
                {draft.metaDescription.length}/160
              </span>
            </div>
          </div>

          <div>
            <label className={labelClass}>Meta Keywords</label>
            <input
              type="text"
              value={draft.metaKeywords}
              onChange={(e) => updateDraft({ metaKeywords: e.target.value })}
              placeholder="influencer, marketing, brand, collaboration"
              className={inputClass}
            />
            <p className={hintClass}>Comma-separated keywords</p>
          </div>

          <div>
            <label className={labelClass}>OG Image URL</label>
            <input
              type="text"
              value={draft.ogImage}
              onChange={(e) => updateDraft({ ogImage: e.target.value })}
              placeholder="https://example.com/og-image.jpg"
              className={inputClass}
            />
            <p className={hintClass}>Image shown when sharing on social media (1200x630px recommended)</p>
          </div>
        </div>
      </div>

      {/* Search Preview */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8f9fc]">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-[#2F6BFF]" />
            <h2 className="text-sm text-[#1a1a2e]">Search Engine Preview</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-[#f8f9fc] rounded-xl p-5 border border-[#e2e8f0]">
            <p className="text-xs text-[#94a3b8] mb-1">flubn.com</p>
            <p className="text-[#1a0dab] text-lg hover:underline cursor-pointer truncate">
              {draft.metaTitle || "FLUBN - Influencer Marketplace"}
            </p>
            <p className="text-sm text-[#545454] mt-1 line-clamp-2">
              {draft.metaDescription || "Connect brands with top influencers..."}
            </p>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8f9fc]">
          <div className="flex items-center gap-2">
            <SearchIcon size={16} className="text-[#2F6BFF]" />
            <h2 className="text-sm text-[#1a1a2e]">Analytics & Tracking</h2>
          </div>
        </div>
        <div className="p-6">
          <div>
            <label className={labelClass}>Google Analytics ID</label>
            <input
              type="text"
              value={draft.googleAnalyticsId}
              onChange={(e) => updateDraft({ googleAnalyticsId: e.target.value })}
              placeholder="G-XXXXXXXXXX"
              className={inputClass}
            />
            <p className={hintClass}>Enter your GA4 measurement ID to enable analytics tracking</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ ACCOUNT TAB ══════════════════════════ */
function AccountTab({
  settings,
  newEmail,
  setNewEmail,
  handleEmailChange,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  showPassword,
  setShowPassword,
  showNewPassword,
  setShowNewPassword,
  handlePasswordChange,
}: {
  settings: SiteSettings;
  newEmail: string;
  setNewEmail: (v: string) => void;
  handleEmailChange: () => void;
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showNewPassword: boolean;
  setShowNewPassword: (v: boolean) => void;
  handlePasswordChange: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Admin Email */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8f9fc]">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#2F6BFF]" />
            <h2 className="text-sm text-[#1a1a2e]">Admin Login Email</h2>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1">Change the email address used for admin login</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Current Email</label>
            <div className="px-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-sm text-[#64748b]">
              {settings.adminEmail}
            </div>
          </div>
          <div>
            <label className={labelClass}>New Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="admin@yourdomain.com"
              className={inputClass}
            />
          </div>
          <button
            onClick={handleEmailChange}
            disabled={newEmail === settings.adminEmail || !newEmail}
            className="px-5 py-2.5 text-sm text-white rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background:
                newEmail !== settings.adminEmail && newEmail
                  ? "linear-gradient(135deg, #2F6BFF 0%, #0F3D91 100%)"
                  : "#94a3b8",
            }}
          >
            <Check size={15} />
            Update Email
          </button>
        </div>
      </div>

      {/* Admin Password */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8f9fc]">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#f59e0b]" />
            <h2 className="text-sm text-[#1a1a2e]">Reset Password</h2>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1">Change the admin login password</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={inputClass + " pr-10"}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className={inputClass + " pr-10"}
              />
              <button
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all"
                      style={{
                        background:
                          newPassword.length >= i * 3
                            ? newPassword.length >= 12
                              ? "#10b981"
                              : newPassword.length >= 8
                              ? "#f59e0b"
                              : "#ef4444"
                            : "#e2e8f0",
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-[#94a3b8]">
                  {newPassword.length >= 12 ? "Strong" : newPassword.length >= 8 ? "Medium" : newPassword.length >= 6 ? "Weak" : "Too short"}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Re-enter new password"
              className={inputClass}
            />
            {confirmNewPassword && confirmNewPassword !== newPassword && (
              <p className="text-xs text-[#ef4444] mt-1 flex items-center gap-1">
                <X size={12} />
                Passwords do not match
              </p>
            )}
            {confirmNewPassword && confirmNewPassword === newPassword && newPassword.length >= 6 && (
              <p className="text-xs text-[#10b981] mt-1 flex items-center gap-1">
                <Check size={12} />
                Passwords match
              </p>
            )}
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={!currentPassword || !newPassword || newPassword !== confirmNewPassword || newPassword.length < 6}
            className="px-5 py-2.5 text-sm text-white rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background:
                currentPassword && newPassword && newPassword === confirmNewPassword && newPassword.length >= 6
                  ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                  : "#94a3b8",
            }}
          >
            <Shield size={15} />
            Change Password
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-[#fffbeb] rounded-2xl border border-[#f59e0b]/20 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-[#f59e0b] mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm text-[#92400e]">Security Notice</h3>
            <p className="text-xs text-[#a16207] mt-1">
              In this demo, credentials are stored in localStorage. In production, passwords would be hashed and stored securely on the server. Never share your admin credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}