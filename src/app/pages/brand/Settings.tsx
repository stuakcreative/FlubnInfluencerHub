import { VerifiedBadge } from "../../components/VerifiedBadge";

/**
 * Helper function to create a cropped image from the canvas
 */
async function createCroppedImage(
  imageSrc: string,
  pixelCrop: Area
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to match the cropped area
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Return as base64 data URL
  return canvas.toDataURL("image/jpeg", 0.95);
}

/**
 * Helper to create an image element from a source
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

export default function BrandSettings() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteNotes, setDeleteNotes] = useState("");
  const [companyName, setCompanyName] = useState(user?.companyName || user?.name || "");
  const [companyEmail, setCompanyEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [industry, setIndustry] = useState(user?.industry || "");
  const [website, setWebsite] = useState(user?.website || "");
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || "");
  const [notifications, setNotifications] = useState({
    responses: true,
    newInfluencers: true,
    billing: false,
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // ── Verification state ────────────────────────────────────────────────────
  const [verification, setVerification] = useState<BrandVerificationData | null>(() =>
    user?.id ? getVerificationByBrandId(user.id) : null
  );
  const [companyType, setCompanyType] = useState<CompanyType>("gst");
  const [regNumber, setRegNumber] = useState("");
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  // Image cropping state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      // Check file size (max 5MB for initial upload)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large", { description: "Please upload an image smaller than 5MB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageToCrop(result);
        setShowCropModal(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    try {
      const croppedImage = await createCroppedImage(imageToCrop, croppedAreaPixels);
      
      // Validate final size (1MB)
      const sizeInBytes = (croppedImage.length * 3) / 4;
      if (sizeInBytes > 1 * 1024 * 1024) {
        toast.error("Cropped image too large", { 
          description: "Please zoom out or select a smaller area." 
        });
        return;
      }

      setProfilePicture(croppedImage);
      setShowCropModal(false);
      setImageToCrop(null);
      toast.success("Profile picture updated! Click 'Save Settings' to confirm.");
    } catch (error) {
      console.error("Crop error:", error);
      toast.error("Failed to crop image. Please try again.");
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleSave = () => {
    // Update profile in auth context — email is intentionally excluded (locked after registration)
    updateProfile({
      name: companyName,
      companyName,
      phone,
      industry,
      website,
      profilePicture,
    });

    setSaved(true);
    toast.success("Settings saved successfully!");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteRequest = () => {
    if (!deleteReason) {
      toast.error("Please select a reason for deletion");
      return;
    }
    // In a real app, this would submit to an API
    setShowDeleteModal(false);
    toast.success("Account deletion request submitted", {
      description: "Admin will review your request shortly. You'll receive an email notification.",
    });
    setDeleteReason("");
    setDeleteNotes("");
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result === null) {
        toast.error("Unable to reach the server. Please check your connection and try again.");
        return;
      }
      if ((result as any)?.error) {
        toast.error((result as any).error);
        return;
      }
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    }
  };

  const handleVerificationSubmit = () => {
    if (!regNumber.trim()) {
      toast.error("Please enter your registration number");
      return;
    }
    if (!user?.id) return;
    const result = submitVerification(
      user.id,
      user.companyName || user.name || "Unknown Brand",
      user.email || "",
      companyType,
      regNumber
    );
    setVerification(result);
    setShowResubmitForm(false);
    setRegNumber("");
    toast.success("Verification request submitted!", {
      description: "Our admin team will review your details and respond within 24–48 hours.",
    });
  };

  const selectedTypeOption = getCompanyTypeOption(companyType);
  const indianTypes = COMPANY_TYPE_OPTIONS.filter((o) => o.group === "india");
  const foreignTypes = COMPANY_TYPE_OPTIONS.filter((o) => o.group === "foreign");

  const verificationStatus = verification?.status ?? "not_started";
  const showVerifForm =
    verificationStatus === "not_started" ||
    verificationStatus === "rejected" && showResubmitForm;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Settings</h1>
        <p className="text-[#64748b] text-sm mt-1">Manage your brand account settings.</p>
      </div>

      {/* Profile Picture */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
            <User size={18} className="text-[#2F6BFF]" />
          </div>
          <div>
            <h2 className="text-lg text-[#1a1a2e]">Brand Logo</h2>
            <p className="text-sm text-[#64748b]">Upload your company logo</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Brand Logo"
                className="w-24 h-24 rounded-xl object-cover border-2 border-[#e2e8f0]"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-[#f8f9fc] border-2 border-[#e2e8f0] flex items-center justify-center">
                <Building2 size={32} className="text-[#94a3b8]" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#2F6BFF] text-white rounded-lg flex items-center justify-center hover:bg-[#0F3D91] transition-colors shadow-lg"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[#64748b] mb-2">
              Upload a square logo for best results. Accepted formats: JPG, PNG, GIF
            </p>
            <p className="text-xs text-[#94a3b8]">Maximum file size: 1MB · JPG, PNG, GIF</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 px-4 py-2 bg-[#f8f9fc] text-[#2F6BFF] border border-[#e2e8f0] rounded-lg hover:bg-[#EBF2FF] transition-colors text-sm"
            >
              Choose File
            </button>
          </div>
        </div>
      </motion.div>

      {/* Company Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
            <Building2 size={18} className="text-[#2F6BFF]" />
          </div>
          <div>
            <h2 className="text-lg text-[#1a1a2e]">Company Information</h2>
            <p className="text-sm text-[#64748b]">Update your company details</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            />
          </div>
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Email</label>
            <div className="relative">
              <input
                type="email"
                value={companyEmail}
                readOnly
                className="w-full px-4 py-3 bg-[#f1f5f9] border border-[#e2e8f0] rounded-xl text-[#94a3b8] cursor-not-allowed pr-10"
              />
              <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-1 flex items-center gap-1">
              <Lock size={10} /> Email cannot be changed after registration
            </p>
          </div>
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            />
          </div>
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Industry</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            />
          </div>
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
            />
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
            <Bell size={18} className="text-[#2F6BFF]" />
          </div>
          <div>
            <h2 className="text-lg text-[#1a1a2e]">Notifications</h2>
            <p className="text-sm text-[#64748b]">Configure notifications</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { key: "responses", label: "Request responses", desc: "When an influencer accepts or rejects your request" },
            { key: "newInfluencers", label: "New influencers", desc: "When new influencers matching your preferences join" },
            { key: "billing", label: "Billing alerts", desc: "Subscription and payment notifications" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-[#1a1a2e] text-sm">{item.label}</p>
                <p className="text-xs text-[#94a3b8]">{item.desc}</p>
              </div>
              <button
                onClick={() =>
                  setNotifications((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key as keyof typeof prev],
                  }))
                }
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  notifications[item.key as keyof typeof notifications]
                    ? "bg-[#2F6BFF]"
                    : "bg-[#e2e8f0]"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifications[item.key as keyof typeof notifications]
                      ? "translate-x-5"
                      : ""
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Password */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
            <Lock size={18} className="text-[#2F6BFF]" />
          </div>
          <div>
            <h2 className="text-lg text-[#1a1a2e]">Security</h2>
            <p className="text-sm text-[#64748b]">Manage your password</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
              >
                {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">New Password</label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
              >
                {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-[#64748b] mb-1.5 block">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
              >
                {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            onClick={handlePasswordChange}
            className="px-4 py-2 border border-[#2F6BFF] text-[#2F6BFF] rounded-lg hover:bg-[#EBF2FF] transition-colors text-sm"
          >
            Change Password
          </button>
        </div>
      </motion.div>

      {/* ── Brand Verification ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={`bg-white rounded-xl border p-6 ${
          verificationStatus === "verified"
            ? "border-[#10b981]/40"
            : verificationStatus === "rejected"
            ? "border-red-200"
            : verificationStatus === "pending"
            ? "border-[#f59e0b]/40"
            : "border-[#e2e8f0]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              verificationStatus === "verified"
                ? "bg-[#ecfdf5]"
                : verificationStatus === "rejected"
                ? "bg-[#fef2f2]"
                : verificationStatus === "pending"
                ? "bg-[#fffbeb]"
                : "bg-[#EBF2FF]"
            }`}
          >
            {verificationStatus === "verified" ? (
              <CheckCircle size={18} className="text-[#10b981]" />
            ) : verificationStatus === "rejected" ? (
              <AlertCircle size={18} className="text-[#ef4444]" />
            ) : verificationStatus === "pending" ? (
              <Clock size={18} className="text-[#f59e0b]" />
            ) : (
              <ShieldCheck size={18} className="text-[#2F6BFF]" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg text-[#1a1a2e]">Brand Verification</h2>
              {verificationStatus === "verified" && <VerifiedBadge size={18} showLabel />}
            </div>
            <p className="text-sm text-[#64748b]">
              {verificationStatus === "verified"
                ? "Your brand is verified — ✅ badge is visible to all influencers"
                : verificationStatus === "pending"
                ? "Verification request is under review by our admin team"
                : verificationStatus === "rejected"
                ? "Verification not approved — review the reason and resubmit"
                : "Verify your brand with a government registration number"}
            </p>
          </div>
        </div>

        {/* ── VERIFIED state ────────────────────────────────────────────────── */}
        {verificationStatus === "verified" && (
          <div className="bg-[#f0fdf4] border border-[#10b981]/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#10b981]" />
              <span className="text-[#10b981] text-sm">Verified Brand</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-[#94a3b8] text-xs block mb-0.5">Company Type</span>
                <span className="text-[#1a1a2e]">
                  {getCompanyTypeOption(verification!.companyType)?.label}
                </span>
              </div>
              <div>
                <span className="text-[#94a3b8] text-xs block mb-0.5">Registration Number</span>
                <span className="text-[#1a1a2e] font-mono">{verification!.registrationNumber}</span>
              </div>
              <div>
                <span className="text-[#94a3b8] text-xs block mb-0.5">Verified On</span>
                <span className="text-[#1a1a2e]">{formatVerifDate(verification!.verifiedAt)}</span>
              </div>
              <div>
                <span className="text-[#94a3b8] text-xs block mb-0.5">Verified By</span>
                <span className="text-[#1a1a2e]">{verification!.verifiedBy || "Admin"}</span>
              </div>
            </div>
            {verification?.adminNotes && (
              <p className="text-xs text-[#64748b] border-t border-[#10b981]/20 pt-2">
                <span className="text-[#94a3b8]">Admin note:</span> {verification.adminNotes}
              </p>
            )}
          </div>
        )}

        {/* ── PENDING state ─────────────────────────────────────────────────── */}
        {verificationStatus === "pending" && (
          <div className="bg-[#fffbeb] border border-[#f59e0b]/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#f59e0b]" />
              <span className="text-[#f59e0b] text-sm">Under Review — typically 24–48 hours</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-[#94a3b8] text-xs block mb-0.5">Submitted</span>
                <span className="text-[#1a1a2e]">{formatVerifDate(verification!.submittedAt)}</span>
              </div>
              <div>
                <span className="text-[#94a3b8] text-xs block mb-0.5">Company Type</span>
                <span className="text-[#1a1a2e]">
                  {getCompanyTypeOption(verification!.companyType)?.label}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#94a3b8] text-xs block mb-0.5">Registration Number</span>
                <span className="text-[#1a1a2e] font-mono">{verification!.registrationNumber}</span>
              </div>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Our team will verify your details on the relevant government portal and notify you via the
              notification bell.
            </p>
          </div>
        )}

        {/* ── REJECTED state ────────────────────────────────────────────────── */}
        {verificationStatus === "rejected" && !showResubmitForm && (
          <div className="bg-[#fef2f2] border border-red-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-[#ef4444]" />
              <span className="text-[#ef4444] text-sm">Verification Not Approved</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-[#94a3b8] text-xs block mb-0.5">Rejected On</span>
                <span className="text-[#1a1a2e]">{formatVerifDate(verification!.rejectedAt)}</span>
              </div>
              <div>
                <span className="text-[#94a3b8] text-xs block mb-0.5">Registration Number</span>
                <span className="text-[#1a1a2e] font-mono">{verification!.registrationNumber}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#94a3b8] text-xs block mb-0.5">Reason</span>
                <span className="text-[#1a1a2e]">{verification!.rejectionReason}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setShowResubmitForm(true);
                setCompanyType(verification!.companyType);
                setRegNumber(verification!.registrationNumber);
              }}
              className="mt-1 flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-[#ef4444] rounded-lg hover:bg-[#fef2f2] transition-colors text-sm"
            >
              <RefreshCw size={14} />
              Fix &amp; Resubmit
            </button>
          </div>
        )}

        {/* ── FORM — shown for not_started or rejected+resubmit ─────────────── */}
        {showVerifForm && (
          <div className="space-y-4">
            {verificationStatus === "rejected" && showResubmitForm && (
              <div className="flex items-center justify-between bg-[#fef2f2] border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-[#ef4444]">
                  Resubmitting — correct the number and click Submit
                </p>
                <button
                  onClick={() => setShowResubmitForm(false)}
                  className="text-[#94a3b8] hover:text-[#64748b]"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Step 1 — What is this? */}
            {verificationStatus === "not_started" && (
              <div className="bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl p-4">
                <p className="text-sm text-[#1a1a2e] mb-1">How it works</p>
                <ol className="text-sm text-[#64748b] space-y-1 list-decimal list-inside">
                  <li>Select your company type (GST, PAN, CIN, etc.)</li>
                  <li>Enter your official registration number</li>
                  <li>Submit — admin verifies on the govt. portal within 24–48 hrs</li>
                  <li>Get your ✅ Verified badge next to your brand name</li>
                </ol>
              </div>
            )}

            {/* Step 2 — Company type selector */}
            <div>
              <label className="text-sm text-[#64748b] mb-1.5 block">Company Type</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTypeDropdownOpen((v) => !v)}
                  className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-left text-[#1a1a2e] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                >
                  <span className="text-sm">
                    {selectedTypeOption?.label ?? "Select company type"}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-[#94a3b8] transition-transform ${typeDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {typeDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-20 mt-1 w-full bg-white border border-[#e2e8f0] rounded-xl shadow-lg overflow-hidden"
                    >
                      <div className="px-3 pt-2 pb-1">
                        <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Indian Companies</p>
                      </div>
                      {indianTypes.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setCompanyType(opt.value); setTypeDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f8f9fc] transition-colors ${
                            companyType === opt.value ? "bg-[#EBF2FF] text-[#2F6BFF]" : "text-[#1a1a2e]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                      <div className="px-3 pt-3 pb-1 border-t border-[#f1f5f9]">
                        <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Foreign Companies</p>
                      </div>
                      {foreignTypes.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setCompanyType(opt.value); setTypeDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f8f9fc] transition-colors ${
                            companyType === opt.value ? "bg-[#EBF2FF] text-[#2F6BFF]" : "text-[#1a1a2e]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {selectedTypeOption?.hint && (
                <p className="text-xs text-[#94a3b8] mt-1.5">{selectedTypeOption.hint}</p>
              )}
            </div>

            {/* Step 3 — Registration number */}
            <div>
              <label className="text-sm text-[#64748b] mb-1.5 block">Registration Number</label>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder={selectedTypeOption?.placeholder ?? "Enter registration number"}
                className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#1a1a2e] font-mono focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-[#94a3b8]">
                Admin will verify this number on the official government portal — no documents needed.
              </p>
              <button
                onClick={handleVerificationSubmit}
                className="px-5 py-2.5 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors text-sm flex items-center gap-2 shadow-lg shadow-[#2F6BFF]/25"
              >
                <ShieldCheck size={15} />
                Submit for Verification
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-red-200 p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center">
            <Trash2 size={18} className="text-[#ef4444]" />
          </div>
          <div>
            <h2 className="text-lg text-[#1a1a2e]">Danger Zone</h2>
            <p className="text-sm text-[#64748b]">Irreversible actions</p>
          </div>
        </div>
        <p className="text-sm text-[#64748b] mb-4">
          Once you delete your account, there is no going back. All your data,
          subscription, and collaboration history will be permanently removed.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 border border-red-300 text-[#ef4444] rounded-lg hover:bg-[#fef2f2] transition-colors text-sm"
        >
          Delete Account
        </button>
      </motion.div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all ${
            saved
              ? "bg-[#10b981] text-white"
              : "bg-[#2F6BFF] text-white hover:bg-[#0F3D91] shadow-lg shadow-[#2F6BFF]/25"
          }`}
        >
          <Save size={16} />
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg text-[#1a1a2e]">Delete Brand Account</h2>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-[#64748b] hover:text-[#ef4444] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-[#64748b] mb-4">
                This action is irreversible. All your data, active subscription, sent collaboration requests, and brand profile will be permanently deleted.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">Reason for Deletion</label>
                  <select
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                  >
                    <option value="">Select a reason</option>
                    <option value="no_longer_needed">No longer needed</option>
                    <option value="switching_services">Switching to another service</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#64748b] mb-1.5 block">Additional Notes</label>
                  <textarea
                    value={deleteNotes}
                    onChange={(e) => setDeleteNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleDeleteRequest}
                  className="px-4 py-2 border border-red-300 text-[#ef4444] rounded-lg hover:bg-[#fef2f2] transition-colors text-sm"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Cropping Modal */}
      <AnimatePresence>
        {showCropModal && imageToCrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
                <h3 className="text-lg text-[#1a1a2e]">Crop Your Logo</h3>
                <button
                  onClick={handleCropCancel}
                  className="w-8 h-8 rounded-lg hover:bg-[#f8f9fc] flex items-center justify-center transition-colors text-[#64748b] hover:text-[#1a1a2e]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Cropper Area */}
              <div className="p-6 space-y-4">
                <div className="relative h-80 bg-[#f8f9fc] rounded-xl overflow-hidden">
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    cropShape="round"
                    showGrid={false}
                  />
                </div>

                {/* Zoom Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-[#64748b]">Zoom</label>
                    <span className="text-sm text-[#2F6BFF]">{Math.round(zoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ZoomOut size={16} className="text-[#94a3b8]" />
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1 h-2 bg-[#e2e8f0] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2F6BFF] [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <ZoomIn size={16} className="text-[#94a3b8]" />
                  </div>
                </div>

                <p className="text-xs text-[#94a3b8] text-center">
                  Drag to reposition • Use slider to zoom
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e2e8f0]">
                <button
                  onClick={handleCropCancel}
                  className="px-4 py-2 text-[#64748b] hover:text-[#1a1a2e] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropSave}
                  className="px-5 py-2.5 bg-[#2F6BFF] text-white rounded-lg hover:bg-[#0F3D91] transition-colors text-sm shadow-lg shadow-[#2F6BFF]/25"
                >
                  Save & Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}