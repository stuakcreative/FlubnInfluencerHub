import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase, Star, Eye, EyeOff, ArrowRight, ArrowLeft, Zap,
  User, Building2, Globe, MapPin, Tag, Check,
  Shield, FileText, ChevronDown, AlertCircle, Users, ClipboardPaste,
  Camera, X, ImagePlus, Mail, ShieldCheck, ZoomIn, ZoomOut,
} from "lucide-react";
import logoImg from "figma:asset/e7264dfc47b30ea75f1117a681656d8a7b208e0d.png";
import logoLightImg from "figma:asset/36e9d26213447b2de3f782dd680e42364845966c.png";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { useAuth, supabase } from "../context/AuthContext";
import { useStatistics } from "../context/StatisticsContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { canCreateFreeAccount, trackAccountCreation } from "../utils/ipTracking";
import { CountryPhoneInput, COUNTRIES, getFullPhone, type Country } from "../components/CountryPhoneInput";
import { LOCATION_GROUPS } from "../data/locations";
import { CATEGORIES as DISCOVER_CATEGORIES } from "../data/mock-data";
import { addInfluencer, type Influencer } from "../utils/dataManager";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

// Helper to get all registered users from localStorage
function getAllRegisteredUsers(): any[] {
  const users: any[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("flubn_registered_")) {
      try {
        const data = localStorage.getItem(key);
        if (data) users.push(JSON.parse(data));
      } catch {}
    }
  }
  return users;
}

function isEmailTaken(email: string): boolean {
  return getAllRegisteredUsers().some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
}

// Check if email exists in Supabase (both auth and database)
async function checkEmailExistsInSupabase(email: string): Promise<boolean> {
  try {
    // Check brands table
    const { data: brandData } = await supabase
      .from("brands")
      .select("email")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    
    if (brandData) return true;

    // Check influencers table
    const { data: influencerData } = await supabase
      .from("influencers")
      .select("email")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    
    if (influencerData) return true;

    return false;
  } catch (error) {
    console.error("Error checking email:", error);
    return false;
  }
}

// Save partial signup progress to localStorage
function saveSignupProgress(data: any) {
  try {
    localStorage.setItem("flubn_signup_progress", JSON.stringify({
      ...data,
      savedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error saving signup progress:", error);
  }
}

// Load partial signup progress from localStorage
function loadSignupProgress(): any | null {
  try {
    const saved = localStorage.getItem("flubn_signup_progress");
    if (!saved) return null;
    
    const data = JSON.parse(saved);
    const savedAt = new Date(data.savedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
    
    // Clear progress if older than 24 hours
    if (hoursDiff > 24) {
      localStorage.removeItem("flubn_signup_progress");
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error loading signup progress:", error);
    return null;
  }
}

// Clear signup progress
function clearSignupProgress() {
  try {
    localStorage.removeItem("flubn_signup_progress");
  } catch (error) {
    console.error("Error clearing signup progress:", error);
  }
}

function isCompanyNameTaken(companyName: string): boolean {
  return getAllRegisteredUsers().some(
    (u) => u.companyName?.toLowerCase().trim() === companyName.toLowerCase().trim()
  );
}

function isPhoneTaken(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\s+/g, "");
  return getAllRegisteredUsers().some(
    (u) => u.phone?.replace(/\s+/g, "") === cleaned
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

const INDUSTRIES = DISCOVER_CATEGORIES.filter((c) => c !== "All");

const CATEGORIES = DISCOVER_CATEGORIES.filter((c) => c !== "All");

// LOCATIONS now imported from ../data/locations.ts (LOCATION_GROUPS) with optgroup support

// Inline SVG icons for OAuth providers
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MetaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="white">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// Step 0 = Account, 1 = Verify Email (OTP), 2 = Profile, 3 = Agreement
const STEP_LABELS = [
  { label: "Account", icon: User },
  { label: "Verify Email", icon: Mail },
  { label: "Profile", icon: Building2 },
  { label: "Agreement", icon: Shield },
];

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

export default function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { stats } = useStatistics();
  const { getLogoUrl, getDarkLogoUrl } = useSiteSettings();
  const initialRole = searchParams.get("role") || "";

  // Multi-step state
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);
  
  // Server status check
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");

  // Step 0: Basic info
  const [role, setRole] = useState<"brand" | "influencer" | "">(
    initialRole === "brand" || initialRole === "influencer" ? initialRole : ""
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Step 1: OTP verification
  const [otpCode, setOtpCode] = useState("");
  const [enteredOtp, setEnteredOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);

  // Step 2: Profile completion
  const [profilePicture, setProfilePicture] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image cropping state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // Brand fields
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [brandPhone, setBrandPhone] = useState("");
  const [brandContactEmail, setBrandContactEmail] = useState("");

  // Creator fields
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [category, setCategory] = useState("");
  const [creatorPhone, setCreatorPhone] = useState("");

  // Country code dropdown state
  const [brandCountry, setBrandCountry] = useState<Country>(COUNTRIES[0]);
  const [creatorCountry, setCreatorCountry] = useState<Country>(COUNTRIES[0]);

  // Step 3: Agreements
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToAge, setAgreedToAge] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // OAuth state
  const [oauthProvider, setOauthProvider] = useState<"google" | "meta" | null>(null);
  const [oauthVerified, setOauthVerified] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "meta" | null>(null);

  // Check server health and load saved progress on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(
          `https://kzbdftqsnxieiotwfnsc.supabase.co/functions/v1/server/health`,
          { method: "GET", signal: AbortSignal.timeout(5000) }
        );
        if (response.ok) {
          setServerStatus("online");
        } else {
          setServerStatus("offline");
        }
      } catch {
        setServerStatus("offline");
      }
    };
    checkHealth();

    // Load saved signup progress if available
    const savedProgress = loadSignupProgress();
    if (savedProgress) {
      setProgressLoaded(true);
      
      toast.info("Resume your signup", {
        description: "We found your incomplete signup. Continue where you left off!",
        duration: 5000,
      });
      
      // Restore all saved fields
      if (savedProgress.role) setRole(savedProgress.role);
      if (savedProgress.name) setName(savedProgress.name);
      if (savedProgress.email) setEmail(savedProgress.email);
      if (savedProgress.password) setPassword(savedProgress.password);
      if (savedProgress.currentStep !== undefined) setCurrentStep(savedProgress.currentStep);
      
      // Restore profile fields
      if (savedProgress.profilePicture) setProfilePicture(savedProgress.profilePicture);
      if (savedProgress.companyName) setCompanyName(savedProgress.companyName);
      if (savedProgress.industry) setIndustry(savedProgress.industry);
      if (savedProgress.website) setWebsite(savedProgress.website);
      if (savedProgress.brandPhone) setBrandPhone(savedProgress.brandPhone);
      if (savedProgress.brandContactEmail) setBrandContactEmail(savedProgress.brandContactEmail);
      if (savedProgress.bio) setBio(savedProgress.bio);
      if (savedProgress.location) setLocation(savedProgress.location);
      if (savedProgress.customLocation) setCustomLocation(savedProgress.customLocation);
      if (savedProgress.category) setCategory(savedProgress.category);
      if (savedProgress.creatorPhone) setCreatorPhone(savedProgress.creatorPhone);
      if (savedProgress.brandCountry) setBrandCountry(savedProgress.brandCountry);
      if (savedProgress.creatorCountry) setCreatorCountry(savedProgress.creatorCountry);
    }
  }, []);

  // Resend OTP countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  // ─── OTP helpers ────────────────────────────────────────────
  const generateOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(code);
    return code;
  };

  const startResendTimer = () => setResendTimer(30);

  const handleResendOtp = () => {
    const code = generateOtp();
    setEnteredOtp(["", "", "", "", "", ""]);
    toast.success(`📧 New OTP generated: ${code}`, {
      description: "Enter this 6-digit code to verify your email.",
      duration: 30000,
    });
    startResendTimer();
    // Auto-focus first box
    setTimeout(() => document.getElementById("otp-0")?.focus(), 100);
  };

  const handleOtpInput = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/\D/g, "");
    if (!value && e.target.value !== "") return;
    const newOtp = [...enteredOtp];
    newOtp[index] = value ? value[0] : "";
    setEnteredOtp(newOtp);
    if (value && index < 5) {
      setTimeout(() => document.getElementById(`otp-${index + 1}`)?.focus(), 0);
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !enteredOtp[index] && index > 0) {
      const newOtp = [...enteredOtp];
      newOtp[index - 1] = "";
      setEnteredOtp(newOtp);
      setTimeout(() => document.getElementById(`otp-${index - 1}`)?.focus(), 0);
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setEnteredOtp(pasted.split(""));
      setTimeout(() => document.getElementById("otp-5")?.focus(), 0);
    }
  };

  const handleOtpVerify = () => {
    const entered = enteredOtp.join("");
    if (entered.length < 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    if (entered !== otpCode) {
      toast.error("Incorrect OTP", {
        description: "The code you entered doesn't match. Please try again.",
      });
      setEnteredOtp(["", "", "", "", "", ""]);
      setTimeout(() => document.getElementById("otp-0")?.focus(), 100);
      return;
    }
    toast.success("Email verified!", { description: "Your email address has been confirmed." });
    
    // Save progress after OTP verification
    saveSignupProgress({
      role,
      name,
      email,
      password,
      currentStep: 1,
    });
    
    goToStep(2);
  };

  // ─── Navigation ──────────────────────────────────────────────
  const goToStep = (step: number) => {
    // If user navigates back to step 0, clear OAuth state so they can use manual signup
    if (step === 0 && oauthVerified) {
      setOauthProvider(null);
      setOauthVerified(false);
      setName("");
      setEmail("");
      setProfilePicture("");
    }
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  // ─── Profile picture ────────────────────────────────────────
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", { description: "Please upload a JPG, PNG, WebP, or GIF image." });
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
      toast.success("Profile picture added!");
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

  const removeProfilePicture = () => {
    setProfilePicture("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Profile picture removed");
  };

  // ─── Start fresh (clear saved progress) ──────────────────────
  const handleStartFresh = () => {
    clearSignupProgress();
    setProgressLoaded(false);
    setCurrentStep(0);
    setRole("");
    setName("");
    setEmail("");
    setPassword("");
    setEmailError("");
    setProfilePicture("");
    setCompanyName("");
    setIndustry("");
    setWebsite("");
    setBrandPhone("");
    setBrandContactEmail("");
    setBio("");
    setLocation("");
    setCustomLocation("");
    setCategory("");
    setCreatorPhone("");
    setBrandCountry(COUNTRIES[0]);
    setCreatorCountry(COUNTRIES[0]);
    toast.success("Starting fresh", { description: "All saved progress has been cleared." });
  };

  // ─── Email validation ────────────────────────────────────────
  const handleEmailBlur = async () => {
    if (!email.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;

    // Check localStorage
    if (isEmailTaken(email)) {
      setEmailError("This email is already registered. Please log in instead.");
      return;
    }

    // Check Supabase
    const existsInSupabase = await checkEmailExistsInSupabase(email);
    if (existsInSupabase) {
      setEmailError("This email is already registered. Please log in instead.");
    }
  };

  // ─── Step validators ────────────────────────────────────────
  const handleStep0Next = async () => {
    if (!role) { toast.error("Please select a role (Brand or Creator)"); return; }
    if (!name.trim()) { toast.error("Please enter your full name"); return; }
    if (!email.trim()) { toast.error("Please enter your email address"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { toast.error("Please enter a valid email address"); return; }
    
    // Check localStorage first
    if (isEmailTaken(email)) {
      setEmailError("This email is already associated with an account. Please log in instead.");
      toast.error("Email already registered", {
        description: "An account with this email already exists. Try logging in.",
        action: {
          label: "Go to Login",
          onClick: () => navigate("/login"),
        },
        duration: 8000,
      });
      emailInputRef.current?.focus();
      return;
    }

    // Check Supabase database for existing fully completed accounts
    setIsLoading(true);
    const emailExistsInSupabase = await checkEmailExistsInSupabase(email);
    setIsLoading(false);
    
    if (emailExistsInSupabase) {
      setEmailError("This email is already registered. Please log in instead.");
      toast.error("Email already registered", {
        description: "A fully registered account with this email already exists. Please log in.",
        action: {
          label: "Go to Login",
          onClick: () => navigate("/login"),
        },
        duration: 8000,
      });
      emailInputRef.current?.focus();
      return;
    }
    
    setEmailError("");
    if (!password) { toast.error("Please create a password"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
    if (!hasLetter || !hasNumber || !hasSymbol) {
      toast.error("Password must include letters, numbers, and at least one symbol (!@#$%...)");
      return;
    }

    // Check IP-based account creation limits
    const ipCheck = canCreateFreeAccount();
    if (!ipCheck.allowed) {
      toast.error("Account Creation Blocked", {
        description: ipCheck.reason || "Unable to create account. Please contact support.",
      });
      setIsLoading(false);
      return;
    }

    // Create account immediately after validation
    setIsLoading(true);
    try {
      const userId = `user_${Date.now()}`;
      const tracked = trackAccountCreation(email, userId, "free");
      if (!tracked) {
        toast.error("Account Creation Failed", {
          description: "Maximum free accounts reached for this IP.",
        });
        setIsLoading(false);
        return;
      }

      // Create account with minimal data (profile can be completed later)
      await signup(name, email, password, role as "brand" | "influencer", {
        profileCompleted: false, // Mark as incomplete so user can complete profile later
        agreedToTerms: true,
        agreedToPrivacy: true,
      });

      // Sync influencer to dataManager directory
      if (role === "influencer") {
        const cachedUser = localStorage.getItem("flubn_user");
        const userData = cachedUser ? JSON.parse(cachedUser) : null;
        const influencerId = userData?.id || userId;
        const newInfluencer: Influencer = {
          id: influencerId,
          name,
          photo: "",
          bio: "",
          category: "Lifestyle",
          location: "India",
          followers: 0,
          ratePerPost: 0,
          gender: "Other",
          platforms: [],
          socialLinks: [],
          portfolio: [],
          email: email.toLowerCase(),
          phone: "",
          status: "active",
          currency: "INR",
          username: "",
          createdAt: new Date().toISOString(),
          badges: [],
        };
        addInfluencer(newInfluencer);
      }

      // Register in admin users list
      try {
        const cachedUser = localStorage.getItem("flubn_user");
        const userData = cachedUser ? JSON.parse(cachedUser) : null;
        const finalUserId = userData?.id || userId;
        const adminKey = "flubn_admin_users";
        const adminRaw = localStorage.getItem(adminKey);
        const adminUsers: any[] = adminRaw ? JSON.parse(adminRaw) : [];
        const alreadyExists = adminUsers.some(
          (u: any) => u.id === finalUserId || u.email?.toLowerCase() === email.toLowerCase()
        );
        if (!alreadyExists) {
          const joinDate = new Date().toISOString();
          adminUsers.unshift({
            id: finalUserId,
            name: role === "brand" ? name : name, // Company name can be added later in profile
            email: email.toLowerCase(),
            role,
            status: "active",
            joinDate,
          });
          localStorage.setItem(adminKey, JSON.stringify(adminUsers));

          // Backfill join date into flubn_registered_ record
          try {
            const regKey = `flubn_registered_${email.toLowerCase()}`;
            const regRaw = localStorage.getItem(regKey);
            if (regRaw) {
              const reg = JSON.parse(regRaw);
              if (!reg.createdAt) {
                reg.createdAt = joinDate;
                localStorage.setItem(regKey, JSON.stringify(reg));
              }
            }
          } catch { /* skip */ }
        }
      } catch { /* non-critical */ }

      // Clear signup progress after successful registration
      clearSignupProgress();

      toast.success("Account created successfully!", {
        description: `Welcome to Flubn, ${name}! You can complete your profile anytime.`,
      });

      // Navigate to dashboard
      navigate(role === "influencer" ? "/influencer/profile?welcome=true" : `/${role}`);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("already exists") || msg.includes("already been registered") || msg.includes("log in instead") || msg.includes("User already registered")) {
        toast.error("Account already exists", {
          description: "An account with this email already exists. Please log in instead.",
          action: {
            label: "Go to Login",
            onClick: () => navigate("/login"),
          },
        });
      } else {
        toast.error("Signup failed", { description: msg || "Please try again or use a different email." });
      }
      setIsLoading(false);
    }
  };

  const handleStep2Next = () => {
    if (role === "brand") {
      if (!companyName.trim()) { toast.error("Please enter your company name"); return; }
      if (isCompanyNameTaken(companyName)) {
        toast.error("Company name already registered", {
          description: "A brand with this name already exists.",
        });
        return;
      }
      if (!industry) { toast.error("Please select your industry"); return; }
      if (website.trim()) {
        const urlRegex = /^https?:\/\/.+\..+/i;
        if (!urlRegex.test(website.trim())) {
          toast.error("Invalid website URL", { description: "Please enter a valid URL starting with http:// or https://" });
          return;
        }
      }
      if (brandContactEmail.trim()) {
        const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(brandContactEmail.trim())) {
          toast.error("Invalid contact email", { description: "Please enter a valid email address." });
          return;
        }
      }
      if (!brandPhone.trim()) { toast.error("Please enter your phone number"); return; }
      if (isPhoneTaken(getFullPhone(brandPhone, brandCountry))) {
        toast.error("Phone number already registered"); return;
      }
      if (!profilePicture) { toast.error("Please upload a profile picture"); return; }
    } else {
      if (!bio.trim()) { toast.error("Please write a short bio"); return; }
      if (!category) { toast.error("Please select your content category"); return; }
      if (!location) { toast.error("Please select your location"); return; }
      if (location === "Other" && !customLocation.trim()) {
        toast.error("Please enter your location"); return;
      }
      if (!creatorPhone.trim()) { toast.error("Please enter your phone number"); return; }
      if (isPhoneTaken(getFullPhone(creatorPhone, creatorCountry))) {
        toast.error("Phone number already registered"); return;
      }
      if (!profilePicture) { toast.error("Please upload a profile picture"); return; }
    }

    // Save progress after step 2 (profile completion)
    saveSignupProgress({
      role,
      name,
      email,
      password,
      currentStep: 2,
      profilePicture,
      companyName,
      industry,
      website,
      brandPhone,
      brandContactEmail,
      brandCountry,
      bio,
      location,
      customLocation,
      category,
      creatorPhone,
      creatorCountry,
    });

    goToStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!agreedToTerms) { toast.error("Please agree to the Terms & Conditions"); return; }
    if (!agreedToPrivacy) { toast.error("Please agree to the Privacy Policy"); return; }
    if (!agreedToAge) { toast.error("Please acknowledge the minor influencer enrollment policy"); return; }

    const ipCheck = canCreateFreeAccount();
    if (!ipCheck.allowed) {
      toast.error("Account Creation Blocked", {
        description: ipCheck.reason || "Unable to create account. Please contact support.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const userId = `user_${Date.now()}`;
      const tracked = trackAccountCreation(email, userId, "free");
      if (!tracked) {
        toast.error("Account Creation Failed", {
          description: "Maximum free accounts reached for this IP.",
        });
        setIsLoading(false);
        return;
      }

      const profileData = role === "brand"
        ? {
            companyName,
            industry,
            website: website || undefined,
            phone: getFullPhone(brandPhone, brandCountry) || undefined,
            brandContactEmail: brandContactEmail.trim() || undefined,
          }
        : {
            bio,
            location: location === "Other" ? customLocation : location,
            category,
            phone: getFullPhone(creatorPhone, creatorCountry) || undefined,
          };

      await signup(name, email, password, role as "brand" | "influencer", {
        ...profileData,
        profilePicture: profilePicture || undefined,
        profileCompleted: true,
        agreedToTerms: true,
        agreedToPrivacy: true,
      });

      // Sync influencer to dataManager directory so they appear in Discover, admin, and dashboard badges
      if (role === "influencer") {
        const cachedUser = localStorage.getItem("flubn_user");
        const userData = cachedUser ? JSON.parse(cachedUser) : null;
        const influencerId = userData?.id || `user_${Date.now()}`;
        const finalLocation = location === "Other" ? customLocation : location;
        const newInfluencer: Influencer = {
          id: influencerId,
          name,
          photo: profilePicture || "",
          bio: bio || "",
          category: category || "Lifestyle",
          location: finalLocation || "India",
          followers: 0,
          ratePerPost: 0,
          gender: "Other",
          platforms: [],
          socialLinks: [],
          portfolio: [],
          email: email.toLowerCase(),
          phone: getFullPhone(creatorPhone, creatorCountry) || "",
          status: "active",
          currency: "INR",
          username: "",
          createdAt: new Date().toISOString(),
          badges: [],
        };
        addInfluencer(newInfluencer);
      }

      // ── Register in admin users list so admin panel shows this user immediately ──
      try {
        const cachedUser = localStorage.getItem("flubn_user");
        const userData = cachedUser ? JSON.parse(cachedUser) : null;
        const userId = userData?.id;
        if (userId) {
          const adminKey = "flubn_admin_users";
          const adminRaw = localStorage.getItem(adminKey);
          const adminUsers: any[] = adminRaw ? JSON.parse(adminRaw) : [];
          const alreadyExists = adminUsers.some(
            (u: any) => u.id === userId || u.email?.toLowerCase() === email.toLowerCase()
          );
          if (!alreadyExists) {
            const joinDate = new Date().toISOString();
            adminUsers.unshift({
              id: userId,
              name: role === "brand" ? (companyName || name) : name,
              email: email.toLowerCase(),
              role,
              status: "active",
              joinDate,
            });
            localStorage.setItem(adminKey, JSON.stringify(adminUsers));
            // Backfill join date into the flubn_registered_ record
            try {
              const regKey = `flubn_registered_${email.toLowerCase()}`;
              const regRaw = localStorage.getItem(regKey);
              if (regRaw) {
                const reg = JSON.parse(regRaw);
                if (!reg.createdAt) { reg.createdAt = joinDate; localStorage.setItem(regKey, JSON.stringify(reg)); }
              }
            } catch { /* skip */ }
          }
        }
      } catch { /* non-critical — admin sync failure should not block signup */ }

      // Clear signup progress after successful registration
      clearSignupProgress();
      
      toast.success("Account created successfully!", {
        description: `Welcome to Flubn, ${name}! Your journey starts now.`,
      });
      navigate(role === "influencer" ? "/influencer/profile?welcome=true" : `/${role}`);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("already exists") || msg.includes("already been registered") || msg.includes("log in instead") || msg.includes("User already registered")) {
        toast.error("Account already exists", { 
          description: "An account with this email already exists. Please log in instead.",
          action: {
            label: "Go to Login",
            onClick: () => navigate("/login"),
          },
        });
      } else {
        toast.error("Signup failed", { description: msg || "Please try again or use a different email." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── OAuth Signup ────────────────────────────────────────────
  const handleOAuthSignup = async (provider: "google" | "meta") => {
    if (!role) {
      toast.error("Select a role first", {
        description: "Please choose Brand or Creator before connecting your account.",
      });
      return;
    }
    setOauthLoading(provider);
    const providerLabel = provider === "google" ? "Google" : "Meta";

    try {
      const oauthProvider = provider === "google" ? "google" : "facebook";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: oauthProvider,
        options: {
          redirectTo: `${window.location.origin}/${role}`,
        },
      });

      if (error) {
        toast.error(`${providerLabel} signup failed`, {
          description: error.message.includes("provider is not enabled")
            ? `${providerLabel} OAuth is not configured yet. Please use email/password signup or ask the admin to enable it.`
            : error.message,
        });
      }
    } catch {
      toast.error("OAuth signup failed", { description: "Please try again." });
    } finally {
      setOauthLoading(null);
    }
  };

  // ─── Step indicator ──────────────────────────────────────────
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-7">
      {STEP_LABELS.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        return (
          <div key={step.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? "text-white shadow-md"
                    : isActive
                    ? "text-white shadow-lg shadow-[#2F6BFF]/30"
                    : "bg-[#f1f5f9] text-[#94a3b8]"
                }`}
                style={
                  isCompleted
                    ? { background: "linear-gradient(135deg, #10b981, #059669)" }
                    : isActive
                    ? { background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }
                    : undefined
                }
              >
                {isCompleted ? <Check size={15} /> : <Icon size={15} />}
              </div>
              <span
                className={`text-[10px] mt-1.5 text-center transition-colors leading-tight ${
                  isActive ? "text-[#2F6BFF]" : isCompleted ? "text-[#10b981]" : "text-[#94a3b8]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div
                className={`h-[2px] flex-1 mx-1 mt-[-18px] rounded-full transition-all duration-300 ${
                  index < currentStep ? "bg-[#10b981]" : "bg-[#e2e8f0]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── Step 0: Account ────────────────────────────────────────
  const renderStep0 = () => (
    <motion.div
      key="step0"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="mb-7">
        <label className="text-[13px] text-[#64748b] mb-3 block">I am a...</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("brand")}
            className={`flex flex-col items-center gap-2.5 p-5 rounded-[14px] border-2 transition-all ${
              role === "brand" ? "border-[#2F6BFF] bg-[#EBF2FF]" : "border-[#e2e8f0] hover:border-[#2F6BFF]/30"
            }`}
          >
            <div
              className={`w-11 h-11 rounded-[12px] flex items-center justify-center transition-all ${
                role === "brand" ? "text-white" : "bg-[#f1f5f9] text-[#64748b]"
              }`}
              style={role === "brand" ? { background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" } : undefined}
            >
              <Briefcase size={20} />
            </div>
            <span className={`text-[14px] ${role === "brand" ? "text-[#2F6BFF]" : "text-[#64748b]"}`}>Brand</span>
          </button>
          <button
            type="button"
            onClick={() => setRole("influencer")}
            className={`flex flex-col items-center gap-2.5 p-5 rounded-[14px] border-2 transition-all ${
              role === "influencer" ? "border-[#2F6BFF] bg-[#EBF2FF]" : "border-[#e2e8f0] hover:border-[#2F6BFF]/30"
            }`}
          >
            <div
              className={`w-11 h-11 rounded-[12px] flex items-center justify-center transition-all ${
                role === "influencer" ? "text-white" : "bg-[#f1f5f9] text-[#64748b]"
              }`}
              style={role === "influencer" ? { background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" } : undefined}
            >
              <Star size={20} />
            </div>
            <span className={`text-[14px] ${role === "influencer" ? "text-[#2F6BFF]" : "text-[#64748b]"}`}>Creator</span>
          </button>
        </div>
      </div>

      {/* ── OAuth Buttons ── */}
      <div className="space-y-3 mb-6">
        <button
          type="button"
          onClick={() => handleOAuthSignup("google")}
          disabled={oauthLoading !== null}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border-2 border-[#e2e8f0] rounded-[12px] hover:border-[#4285F4]/40 hover:bg-[#f8faff] transition-all text-[14px] text-[#1a1a2e] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {oauthLoading === "google" ? (
            <svg className="animate-spin h-4 w-4 text-[#4285F4]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <GoogleIcon />
          )}
          {oauthLoading === "google" ? "Connecting to Google…" : "Continue with Google"}
        </button>

        <button
          type="button"
          onClick={() => handleOAuthSignup("meta")}
          disabled={oauthLoading !== null}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-[12px] hover:opacity-90 transition-all text-[14px] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          style={{ background: oauthLoading === "meta" ? "#1877F2cc" : "#1877F2" }}
        >
          {oauthLoading === "meta" ? (
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <MetaIcon />
          )}
          {oauthLoading === "meta" ? "Connecting to Meta…" : "Continue with Meta"}
        </button>

        {/* What OAuth gives you — role-aware hint */}
        {role && (
          <p className="text-[11px] text-[#94a3b8] text-center leading-[17px]">
            {role === "brand"
              ? "OAuth verifies your identity. You'll add company social pages for brand verification in Settings."
              : "OAuth verifies your identity and pre-fills your profile — no OTP needed."}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-[#e2e8f0]" />
        <span className="text-[11px] text-[#94a3b8] whitespace-nowrap">or sign up with email</span>
        <div className="flex-1 h-px bg-[#e2e8f0]" />
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-[13px] text-[#64748b] mb-1.5 block">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_#f8f9fc] [&:-webkit-autofill]:[-webkit-text-fill-color:#1a1a2e]"
          />
        </div>
        <div>
          <label className="text-[13px] text-[#64748b] mb-1.5 block">Email address</label>
          <input
            ref={emailInputRef}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
            onBlur={handleEmailBlur}
            placeholder="you@email.com"
            className={`w-full px-4 py-3 bg-[#f8f9fc] border rounded-[12px] text-[#1a1a2e] text-[15px] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 transition-all [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_#f8f9fc] [&:-webkit-autofill]:[-webkit-text-fill-color:#1a1a2e] ${emailError ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-[#e2e8f0] focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"}`}
          />
          {emailError && (
            <p className="text-[12px] text-red-500 mt-1.5 flex items-center gap-1.5">
              <span>{emailError}</span>
              <button type="button" onClick={() => navigate("/login")} className="text-[#2F6BFF] hover:underline font-medium">Log in</button>
            </p>
          )}
        </div>
        <div>
          <label className="text-[13px] text-[#64748b] mb-1.5 block">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all pr-11 [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_#f8f9fc] [&:-webkit-autofill]:[-webkit-text-fill-color:#1a1a2e]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-[11px] text-[#94a3b8] mt-1.5">Must include letters, numbers & symbols (min 6 chars)</p>
        </div>

        <button
          type="button"
          onClick={handleStep0Next}
          disabled={!role}
          className="w-full py-3.5 text-white rounded-[12px] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-[15px] shadow-lg shadow-[#2F6BFF]/20"
          style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
        >
          Continue
          <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );

  // ─── Step 1: Verify Email (OTP) ──────────────────────────────
  const renderStepOtp = () => (
    <motion.div
      key="step-otp"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="text-center mb-5">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: "linear-gradient(135deg, #EBF2FF, #d4e5ff)" }}
        >
          <Mail size={26} className="text-[#2F6BFF]" />
        </div>
        <p className="text-[13px] text-[#64748b]">A verification code was sent to</p>
        <p className="text-[15px] text-[#1a1a2e] mt-0.5 truncate max-w-full">{email}</p>
      </div>

      {/* Demo notice */}
      <div className="bg-[#fffbeb] border border-[#fcd34d]/60 rounded-[12px] p-3 mb-5 flex items-start gap-2">
        <AlertCircle size={15} className="text-[#f59e0b] shrink-0 mt-0.5" />
        <p className="text-[12px] text-[#92400e] leading-[18px]">
          <span className="font-semibold">Demo mode:</span> Check the notification toast for your OTP code. In production, this would be sent to your inbox.
        </p>
      </div>

      {/* 6-digit OTP boxes */}
      <div className="flex gap-2 justify-center mb-5">
        {enteredOtp.map((digit, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpInput(e, i)}
            onKeyDown={(e) => handleOtpKeyDown(e, i)}
            onPaste={i === 0 ? handleOtpPaste : undefined}
            className={`w-11 h-13 text-center text-[22px] text-[#1a1a2e] bg-[#f8f9fc] border-2 rounded-xl focus:outline-none transition-all ${
              digit
                ? "border-[#2F6BFF] bg-[#EBF2FF]/40"
                : "border-[#e2e8f0] focus:border-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/15"
            }`}
            style={{ height: "52px" }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleOtpVerify}
        className="w-full py-3.5 text-white rounded-[12px] hover:opacity-90 transition-all flex items-center justify-center gap-2 text-[15px] shadow-lg shadow-[#2F6BFF]/20"
        style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
      >
        <ShieldCheck size={16} />
        Verify & Continue
      </button>

      <div className="flex items-center justify-between mt-4">
        <button
          type="button"
          onClick={() => goToStep(0)}
          className="text-[13px] text-[#94a3b8] hover:text-[#64748b] flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={14} />
          Change email
        </button>
        {resendTimer > 0 ? (
          <p className="text-[13px] text-[#94a3b8]">Resend in {resendTimer}s</p>
        ) : (
          <button
            type="button"
            onClick={handleResendOtp}
            className="text-[13px] text-[#2F6BFF] hover:underline transition-colors"
          >
            Resend OTP
          </button>
        )}
      </div>
    </motion.div>
  );

  // ─── Step 2: Profile ─────────────────────────────────────────
  const renderStep2Brand = () => (
    <div className="space-y-5">
      <div>
        <label className="text-[13px] text-[#64748b] mb-1.5 block">
          Company Name <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your company or brand name"
            className="w-full pl-10 pr-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_#f8f9fc] [&:-webkit-autofill]:[-webkit-text-fill-color:#1a1a2e]"
          />
        </div>
      </div>
      <div>
        <label className="text-[13px] text-[#64748b] mb-1.5 block">
          Industry <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] z-10" />
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all appearance-none"
          >
            <option value="">Select your industry</option>
            {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
        </div>
      </div>
      <div>
        <label className="text-[13px] text-[#64748b] mb-1.5 block">Website</label>
        <div className="relative">
          <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              let pasted = e.clipboardData.getData("text").trim();
              if (pasted && !/^https?:\/\//i.test(pasted)) pasted = "https://" + pasted;
              setWebsite(pasted);
            }}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val && !/^https?:\/\//i.test(val)) setWebsite("https://" + val);
            }}
            placeholder="https://yourwebsite.com"
            pattern="https?://.+\..+"
            className="w-full pl-10 pr-24 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_#f8f9fc] [&:-webkit-autofill]:[-webkit-text-fill-color:#1a1a2e] [&:placeholder-shown]:border-[#e2e8f0] [&:placeholder-shown]:[box-shadow:none] [&:not(:placeholder-shown):invalid]:border-red-400 [&:not(:placeholder-shown):invalid]:ring-2 [&:not(:placeholder-shown):invalid]:ring-red-400/20 [&:not(:placeholder-shown):valid]:border-green-400 [&:not(:placeholder-shown):valid]:ring-2 [&:not(:placeholder-shown):valid]:ring-green-400/20"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {website && (
              <button
                type="button"
                onClick={() => { setWebsite(""); toast.success("URL cleared"); }}
                className="px-2 py-1.5 text-[11px] text-[#94a3b8] hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  const trimmed = text.trim();
                  if (trimmed) {
                    const urlRegex = /^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.*$/i;
                    if (urlRegex.test(trimmed)) {
                      setWebsite(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
                      toast.success("URL pasted successfully");
                    } else {
                      toast.error("Clipboard doesn't contain a valid URL");
                    }
                  } else {
                    toast.error("Clipboard is empty");
                  }
                } catch {
                  toast.error("Unable to access clipboard. Please allow clipboard permission.");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2F6BFF]/10 text-[#2F6BFF] rounded-[8px] hover:bg-[#2F6BFF]/20 transition-all text-[12px]"
            >
              <ClipboardPaste size={13} />
              Paste
            </button>
          </div>
        </div>
        <p className="text-[11px] text-[#94a3b8] mt-1">Click "Paste" to add your website URL from clipboard</p>
      </div>
      <div>
        <label className="text-[13px] text-[#64748b] mb-1.5 block">Phone Number <span className="text-red-500">*</span></label>
        <CountryPhoneInput
          value={brandPhone}
          onChange={setBrandPhone}
          selectedCountry={brandCountry}
          onCountryChange={setBrandCountry}
          variant="signup"
        />
      </div>
      <div>
        <label className="text-[13px] text-[#64748b] mb-1.5 block">
          Collaboration Contact Email
          <span className="ml-2 text-[11px] text-[#94a3b8]">(shown to influencers when they accept)</span>
        </label>
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="email"
            value={brandContactEmail}
            onChange={(e) => setBrandContactEmail(e.target.value)}
            placeholder={email || "contact@company.com"}
            pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
            className="w-full pl-10 pr-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_#f8f9fc] [&:-webkit-autofill]:[-webkit-text-fill-color:#1a1a2e] [&:placeholder-shown]:border-[#e2e8f0] [&:placeholder-shown]:[box-shadow:none] [&:not(:placeholder-shown):invalid]:border-red-400 [&:not(:placeholder-shown):invalid]:ring-2 [&:not(:placeholder-shown):invalid]:ring-red-400/20"
          />
        </div>
        <p className="text-[11px] text-[#94a3b8] mt-1">Leave blank to use your login email ({email})</p>
      </div>
    </div>
  );

  const renderStep2Creator = () => (
    <div className="space-y-5">
      <div>
        <label className="text-[13px] text-[#64748b] mb-1.5 block">
          Bio <span className="text-red-400">*</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell brands about yourself and your content..."
          rows={3}
          maxLength={200}
          className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all resize-none"
        />
        <p className="text-[11px] text-[#94a3b8] mt-1 text-right">{bio.length}/200</p>
      </div>
      <div>
        <label className="text-[13px] text-[#64748b] mb-1.5 block">
          Content Category <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] z-10" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all appearance-none"
          >
            <option value="">Select your category</option>
            {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
        </div>
      </div>
      <div>
        <label className="text-[13px] text-[#64748b] mb-1.5 block">
          Location <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] z-10" />
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all appearance-none"
          >
            <option value="">Select your city</option>
            {LOCATION_GROUPS.map((group) => (
              <optgroup key={group.region} label={group.region}>
                {group.cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </optgroup>
            ))}
            <option value="Other">Other</option>
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
        </div>
        {location === "Other" && (
          <input
            type="text"
            value={customLocation}
            onChange={(e) => setCustomLocation(e.target.value)}
            placeholder="Enter your location"
            className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all mt-2 [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_#f8f9fc] [&:-webkit-autofill]:[-webkit-text-fill-color:#1a1a2e]"
          />
        )}
      </div>
      <div>
        <label className="text-[13px] text-[#64748b] mb-1.5 block">Phone Number <span className="text-red-500">*</span></label>
        <CountryPhoneInput
          value={creatorPhone}
          onChange={setCreatorPhone}
          selectedCountry={creatorCountry}
          onCountryChange={setCreatorCountry}
          variant="signup"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <motion.div
      key="step2"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
          >
            {role === "brand" ? <Building2 size={14} /> : <Star size={14} />}
          </div>
          <span className="text-[15px] text-[#1a1a2e]">
            {role === "brand" ? "Brand Profile" : "Creator Profile"}
          </span>
        </div>
        <p className="text-[13px] text-[#94a3b8]">
          Complete your profile to help {role === "brand" ? "creators find you" : "brands discover you"}
        </p>
      </div>

      {/* Profile Picture Upload */}
      <div className="mb-5">
        <label className="text-[13px] text-[#64748b] mb-3 block">Profile Picture <span className="text-red-500">*</span></label>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div
              className={`w-[72px] h-[72px] rounded-full flex items-center justify-center overflow-hidden border-2 transition-all ${
                profilePicture ? "border-[#2F6BFF]/30" : "border-dashed border-[#d1d5db] bg-[#f8f9fc]"
              }`}
            >
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={28} className="text-[#c0c8d8]" />
              )}
            </div>
            {profilePicture && (
              <button
                type="button"
                onClick={removeProfilePicture}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
              >
                <X size={11} />
              </button>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleProfilePictureChange}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[10px] text-[13px] text-[#64748b] hover:border-[#2F6BFF]/30 hover:bg-[#EBF2FF]/50 transition-all"
            >
              {profilePicture ? (
                <><Camera size={14} className="text-[#2F6BFF]" />Change Photo</>
              ) : (
                <><ImagePlus size={14} className="text-[#94a3b8]" />Upload Photo</>
              )}
            </button>
            <p className="text-[11px] text-[#94a3b8] mt-1.5">JPG, PNG, WebP or GIF · Max 1MB</p>
          </div>
        </div>
      </div>

      {role === "brand" ? renderStep2Brand() : renderStep2Creator()}

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={() => goToStep(oauthVerified ? 0 : 1)}
          className="flex-1 py-3.5 text-[#64748b] rounded-[12px] border border-[#e2e8f0] hover:bg-[#f1f5f9] transition-all flex items-center justify-center gap-2 text-[15px]"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={handleStep2Next}
          className="flex-[2] py-3.5 text-white rounded-[12px] hover:opacity-90 transition-all flex items-center justify-center gap-2 text-[15px] shadow-lg shadow-[#2F6BFF]/20"
          style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
        >
          Continue
          <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );

  // ─── Step 3: Agreement ───────────────────────────────────────
  const renderStep3 = () => (
    <motion.div
      key="step3"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}
          >
            <Shield size={14} />
          </div>
          <span className="text-[15px] text-[#1a1a2e]">Terms & Agreements</span>
        </div>
        <p className="text-[13px] text-[#94a3b8]">
          Please review and accept the following to create your account
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-[#f8f9fc] border border-[#e2e8f0] rounded-[14px] p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={14} className="text-[#10b981]" />
          {oauthVerified && oauthProvider ? (
            <div className="flex items-center gap-1.5">
              <p className="text-[12px] text-[#10b981]">
                Verified via {oauthProvider === "google" ? "Google" : "Meta"}
              </p>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] text-white"
                style={{ background: oauthProvider === "google" ? "#4285F4" : "#1877F2" }}>
                {oauthProvider === "google" ? <GoogleIcon /> : <MetaIcon />}
              </span>
            </div>
          ) : (
            <p className="text-[12px] text-[#10b981]">Email verified via OTP</p>
          )}
        </div>
        <div className="flex items-center gap-3 pb-3 border-b border-[#e2e8f0]">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#2F6BFF]/20 flex items-center justify-center bg-[#f1f5f9] shrink-0">
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={18} className="text-[#c0c8d8]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] text-[#1a1a2e] truncate">{name}</p>
            <p className="text-[12px] text-[#94a3b8] truncate">{email}</p>
          </div>
        </div>
        <div className="space-y-1.5 mt-3">
          <div className="flex justify-between text-[13px]">
            <span className="text-[#64748b]">Role</span>
            <span className="text-[#1a1a2e] capitalize">{role === "influencer" ? "Creator" : role}</span>
          </div>
          {role === "brand" && companyName && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[#64748b]">Company</span>
              <span className="text-[#1a1a2e]">{companyName}</span>
            </div>
          )}
          {role === "influencer" && category && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[#64748b]">Category</span>
              <span className="text-[#1a1a2e]">{category}</span>
            </div>
          )}
          {role === "influencer" && (location === "Other" ? customLocation : location) && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[#64748b]">Location</span>
              <span className="text-[#1a1a2e]">{location === "Other" ? customLocation : location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-4">
        {[
          {
            checked: agreedToTerms, onChange: setAgreedToTerms,
            label: (<>I agree to the{" "}<Link to="/terms-of-service" target="_blank" className="text-[#2F6BFF] hover:underline inline-flex items-center gap-0.5">Terms & Conditions<FileText size={11} /></Link><span className="text-red-400 ml-0.5">*</span></>),
          },
          {
            checked: agreedToPrivacy, onChange: setAgreedToPrivacy,
            label: (<>I agree to the{" "}<Link to="/privacy-policy" target="_blank" className="text-[#2F6BFF] hover:underline inline-flex items-center gap-0.5">Privacy Policy<FileText size={11} /></Link><span className="text-red-400 ml-0.5">*</span></>),
          },
          {
            checked: agreedToAge, onChange: setAgreedToAge,
            label: (<>I acknowledge that minor influencers (under 18) require parental/guardian consent<span className="text-red-400 ml-0.5">*</span></>),
          },
        ].map((item, i) => (
          <label key={i} className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5">
              <input type="checkbox" checked={item.checked} onChange={(e) => item.onChange(e.target.checked)} className="sr-only" />
              <div
                className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all ${
                  item.checked ? "border-[#2F6BFF] bg-[#2F6BFF]" : "border-[#d1d5db] group-hover:border-[#2F6BFF]/50"
                }`}
              >
                {item.checked && <Check size={13} className="text-white" />}
              </div>
            </div>
            <div className="text-[13px] text-[#64748b] leading-[20px]">{item.label}</div>
          </label>
        ))}
      </div>

      <div className="bg-[#FFF7ED] border border-[#f59e0b]/15 rounded-[12px] p-3.5 mt-4 flex items-start gap-2.5">
        <Users size={15} className="text-[#f59e0b] mt-0.5 shrink-0" />
        <p className="text-[12px] text-[#92400e]/80 leading-[18px]">
          Flubn welcomes creators of all ages. Minor influencers can enroll with parental or guardian consent.
        </p>
      </div>

      <div className="bg-[#EBF2FF] border border-[#2F6BFF]/10 rounded-[12px] p-3.5 mt-3 flex items-start gap-2.5">
        <Shield size={15} className="text-[#2F6BFF] mt-0.5 shrink-0" />
        <p className="text-[12px] text-[#2F6BFF]/80 leading-[18px]">
          Your data is protected. We never share your personal information with third parties without consent.
        </p>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={() => goToStep(2)}
          className="flex-1 py-3.5 text-[#64748b] rounded-[12px] border border-[#e2e8f0] hover:bg-[#f1f5f9] transition-all flex items-center justify-center gap-2 text-[15px]"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={handleFinalSubmit}
          disabled={!agreedToTerms || !agreedToPrivacy || !agreedToAge || isLoading}
          className="flex-[2] py-3.5 text-white rounded-[12px] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-[15px] shadow-lg shadow-[#2F6BFF]/20"
          style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating Account...
            </>
          ) : (
            <>Create Account<ArrowRight size={16} /></>
          )}
        </button>
      </div>
    </motion.div>
  );

  // ─── Heading copy per step ───────────────────────────────────
  const stepHeadingMap = [
    { tag: "Get started", h1: "Create your account", sub: "Join the premier influencer marketplace" },
    { tag: "Step 2 of 4", h1: "Verify your email", sub: "Enter the code sent to your inbox" },
    { tag: "Step 3 of 4", h1: "Complete your profile", sub: "Help us personalise your experience" },
    { tag: "Almost there", h1: "Review & agree", sub: "Accept the terms to finalise your account" },
  ];
  const heading = stepHeadingMap[currentStep] || stepHeadingMap[0];

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex font-['Inter',sans-serif]">
      {/* Left - Dark branded panel */}
      <div className="hidden lg:flex lg:w-[48%] relative bg-[#0a090f] overflow-hidden items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-[10%] left-[20%] w-[60%] h-[50%] opacity-35" style={{ background: "radial-gradient(ellipse at 40% 40%, rgba(47,107,255,0.5), transparent 60%)" }} />
          <div className="absolute bottom-0 right-0 w-[55%] h-[55%] opacity-25" style={{ background: "radial-gradient(ellipse at 80% 90%, rgba(107,169,255,0.4), transparent 65%)" }} />
          <div className="absolute top-0 right-[10%] w-[40%] h-[40%] opacity-15" style={{ background: "radial-gradient(ellipse at 70% 10%, rgba(15,61,145,0.6), transparent 60%)" }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 500 600">
          <circle cx="140" cy="200" r="130" stroke="rgba(47,107,255,0.25)" strokeWidth="25" fill="none" />
          <circle cx="380" cy="400" r="90" stroke="rgba(107,169,255,0.2)" strokeWidth="20" fill="none" />
          <circle cx="120" cy="480" r="50" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
        </svg>

        <div className="relative z-10 px-12 xl:px-16 max-w-[520px]">
          <Link to="/"><img src={getDarkLogoUrl() || logoImg} alt="Flubn" className="h-12 w-auto mb-12" /></Link>
          <h1 className="text-white text-[38px] xl:text-[48px] !leading-[1.05] tracking-[-2px]">
            Start your journey on{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #2F6BFF 0%, #6BA9FF 100%)" }}>
              Flubn
            </span>
          </h1>
          <p className="text-white/40 text-[16px] leading-[26px] mt-5 max-w-[380px]">
            Join India's premier influencer marketplace. Whether you're a brand or a creator, we've got you covered.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { title: "Verified Profiles", desc: "Every creator is vetted for authenticity" },
              { title: "Secure Collaboration", desc: "Contact unlock only after mutual acceptance" },
              { title: "Analytics Dashboard", desc: "Track performance and growth in real-time" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-[8px] flex items-center justify-center mt-0.5 shrink-0" style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}>
                  <Zap size={13} className="text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-[14px]">{item.title}</p>
                  <p className="text-white/30 text-[12px] mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[
                "https://images.unsplash.com/photo-1762522921456-cdfe882d36c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHByb2Zlc3Npb25hbCUyMHdvbWFuJTIwaGVhZHNob3QlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzU3MjM5ODB8MA&ixlib=rb-4.1.0&q=80&w=1080",
                "https://images.unsplash.com/photo-1758599543154-76ec1c4257df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwZW50cmVwcmVuZXVyJTIwYnVzaW5lc3MlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzU3MjM5ODB8MA&ixlib=rb-4.1.0&q=80&w=1080",
                "https://images.unsplash.com/photo-1520689728498-7dd1a9814607?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMGZlbWFsZSUyMHByb2Zlc3Npb25hbCUyMGhlYWRzaG90fGVufDF8fHx8MTc3NTcwNTU1OXww&ixlib=rb-4.1.0&q=80&w=1080",
                "https://images.unsplash.com/photo-1600896997793-b8ed3459a17f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwcHJvZmVzc2lvbmFsJTIwbWFsZSUyMHBvcnRyYWl0fGVufDF8fHx8MTc3NTcyMzk4MHww&ixlib=rb-4.1.0&q=80&w=1080"
              ].map((src, i) => (
                <ImageWithFallback
                  key={i}
                  src={src}
                  alt="Creator"
                  className="w-8 h-8 rounded-full border-2 border-[#0a090f] object-cover"
                />
              ))}
            </div>
            <p className="text-white/35 text-[13px]">
              Trusted by <span className="text-white/60">{stats.influencersDisplay}</span> creators
            </p>
          </div>
        </div>
      </div>

      {/* Right - Form side */}
      <div className="flex-1 bg-[#f8f9fc] flex items-center justify-center p-6 sm:p-8">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <motion.div variants={fadeUp} className="text-center mb-8 lg:hidden">
            <Link to="/"><img src={getLogoUrl() || logoLightImg} alt="Flubn" className="h-8 w-auto mx-auto mb-4" /></Link>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-[#2F6BFF]" />
              <span className="text-[#2F6BFF] text-sm">{heading.tag}</span>
            </div>
            <h1 className="text-[28px] text-[#0a090f] tracking-[-1px]">{heading.h1}</h1>
            <p className="text-[#64748b] mt-1.5 text-[15px]">{heading.sub}</p>
          </motion.div>

          {/* Server Status Alert */}
          {serverStatus === "offline" && (
            <motion.div variants={fadeUp} className="mt-6">
              
            </motion.div>
          )}

          {serverStatus === "online" && (
            <motion.div variants={fadeUp} className="mt-6">
              <div className="bg-green-50 border-2 border-green-200 rounded-[16px] px-4 py-2.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-green-800 text-[13px] font-medium">Server Connected</p>
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} className="mt-8">
            <div className="bg-white rounded-[20px] shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-[#e2e8f0]/60 p-7">
              {/* Saved Progress Banner */}
              {progressLoaded && (
                <div className="mb-5 bg-blue-50 border border-blue-200 rounded-[12px] p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-600" />
                    <p className="text-blue-800 text-[13px]">
                      <span className="font-medium">Progress restored!</span> Continue where you left off.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartFresh}
                    className="text-[12px] text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    Start Fresh
                  </button>
                </div>
              )}
              
              {renderStepIndicator()}

              <AnimatePresence mode="wait" custom={direction}>
                {currentStep === 0 && renderStep0()}
                {currentStep === 1 && renderStepOtp()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
              </AnimatePresence>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-[#e2e8f0]" />
                <span className="text-[12px] text-[#94a3b8]">OR</span>
                <div className="flex-1 h-px bg-[#e2e8f0]" />
              </div>
              <p className="text-center text-[14px] text-[#94a3b8]">
                Already have an account?{" "}
                <Link to="/login" className="text-[#2F6BFF] hover:underline">Log in</Link>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

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
                <h3 className="text-lg text-[#1a1a2e]">Crop Your Photo</h3>
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