import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowRight, AlertCircle, UserPlus, CheckCircle2 } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

// ── Inline OAuth provider icons ──────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MetaIcon = ({ color = "white" }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={color}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
import logoImg from "figma:asset/e7264dfc47b30ea75f1117a681656d8a7b208e0d.png";
import logoLightImg from "figma:asset/36e9d26213447b2de3f782dd680e42364845966c.png";
import { toast } from "sonner";
import { useAuth, supabase } from "../context/AuthContext";
import { useStatistics } from "../context/StatisticsContext";
import { useSiteSettings } from "../context/SiteSettingsContext";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { stats } = useStatistics();
  const { getLogoUrl, getDarkLogoUrl } = useSiteSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"brand" | "influencer" | "admin">("brand");
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "meta" | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");

  // Admin setup state
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  const [adminSetupName, setAdminSetupName] = useState("");
  const [adminSetupEmail, setAdminSetupEmail] = useState("");
  const [adminSetupPassword, setAdminSetupPassword] = useState("");
  const [adminSetupLoading, setAdminSetupLoading] = useState(false);
  const [adminSetupDone, setAdminSetupDone] = useState(false);

  // Pre-fill email if previously remembered
  useEffect(() => {
    const savedEmail = localStorage.getItem("flubn_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Check server health on mount
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
  }, []);

  const handleOAuthLogin = async (provider: "google" | "meta") => {
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
        toast.error(`${providerLabel} login failed`, {
          description: error.message.includes("provider is not enabled")
            ? `${providerLabel} OAuth is not configured yet. Please use email/password login or ask the admin to enable it.`
            : error.message,
        });
      }
    } catch {
      toast.error("OAuth login failed", { description: "Please try again." });
    } finally {
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    
    try {
      await login(email, password, role);
      
      // Save or clear remembered email
      if (rememberMe) {
        localStorage.setItem("flubn_remembered_email", email);
      } else {
        localStorage.removeItem("flubn_remembered_email");
      }
      
      toast.success("Welcome back!", {
        description: `Logged in as ${role}.`,
      });
      navigate(`/${role}`);
    } catch (error: any) {
      toast.error("Login failed", {
        description: error?.message || "Please check your credentials and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSetupName || !adminSetupEmail || !adminSetupPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (adminSetupPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setAdminSetupLoading(true);
    try {
      // Try edge function seed to create admin (handles email_confirm: true)
      const result = await import("../utils/api").then(api =>
        api.seedData({ createAdminUser: { email: adminSetupEmail, password: adminSetupPassword, name: adminSetupName } })
      );
      if (result) {
        setAdminSetupDone(true);
        setEmail(adminSetupEmail);
        setPassword(adminSetupPassword);
        toast.success("Admin account created!", {
          description: "You can now log in with your admin credentials.",
        });
        setShowAdminSetup(false);
      } else {
        // Fallback: direct Supabase signup
        const { supabase } = await import("../context/AuthContext");
        const { data, error } = await supabase.auth.signUp({
          email: adminSetupEmail,
          password: adminSetupPassword,
          options: { data: { name: adminSetupName, role: "admin", profileCompleted: true } },
        });
        if (error) throw new Error(error.message);
        setAdminSetupDone(true);
        setEmail(adminSetupEmail);
        setPassword(adminSetupPassword);
        toast.success("Admin account created!", {
          description: data.session ? "You can now log in." : "Check your email to confirm, then log in.",
        });
        setShowAdminSetup(false);
      }
    } catch (err: any) {
      toast.error("Setup failed", { description: err?.message || "Please try again." });
    } finally {
      setAdminSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-['Inter',sans-serif]">
      {/* Left - Dark branded panel */}
      <div className="hidden lg:flex lg:w-[48%] relative bg-[#0a090f] overflow-hidden items-center justify-center">
        {/* Gradient blobs */}
        <div className="absolute inset-0">
          <div
            className="absolute top-0 right-0 w-[70%] h-full opacity-40"
            style={{ background: "radial-gradient(ellipse at 70% 30%, rgba(47,107,255,0.5), transparent 60%)" }}
          />
          <div
            className="absolute bottom-0 left-[10%] w-[50%] h-[60%] opacity-25"
            style={{ background: "radial-gradient(ellipse at 30% 100%, rgba(107,169,255,0.4), transparent 70%)" }}
          />
          <div
            className="absolute top-[20%] left-[40%] w-[40%] h-[40%] opacity-15"
            style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(15,61,145,0.6), transparent 60%)" }}
          />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        {/* Decorative circles */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 500 600">
          <circle cx="350" cy="180" r="140" stroke="rgba(47,107,255,0.25)" strokeWidth="25" fill="none" />
          <circle cx="150" cy="420" r="100" stroke="rgba(107,169,255,0.2)" strokeWidth="20" fill="none" />
          <circle cx="380" cy="450" r="60" stroke="rgba(255,255,255,0.05)" strokeWidth="15" fill="none" />
        </svg>

        <div className="relative z-10 px-12 xl:px-16 max-w-[520px]">
          <Link to="/">
            <img src={getDarkLogoUrl() || logoImg} alt="Flubn" className="h-12 w-auto mb-12" />
          </Link>
          <h1 className="text-white text-[38px] xl:text-[48px] !leading-[1.05] tracking-[-2px]">
            Welcome back to{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #2F6BFF 0%, #6BA9FF 100%)" }}>
              Flubn
            </span>
          </h1>
          <p className="text-white/40 text-[16px] leading-[26px] mt-5 max-w-[380px]">
            Connect with top creators and brands. Manage your collaborations and grow your influence.
          </p>

          {/* Stats row */}
          <div className="flex gap-8 mt-10">
            {[
              { value: stats.influencersDisplay, label: "Creators" },
              { value: stats.brandsDisplay, label: "Brands" },
              { value: "98%", label: "Satisfaction" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-white text-[22px] tracking-[-0.5px]">{stat.value}</p>
                <p className="text-white/30 text-[13px] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Floating testimonial */}
          <div className="mt-12 bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-[16px] p-5">
            <div className="flex items-center gap-3 mb-3">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1576558656222-ba66febe3dec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDF8fHx8MTc3NTcxNzQxNnww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Priya Sharma"
                className="w-9 h-9 rounded-full object-cover object-center"
              />
              <div>
                <p className="text-white/80 text-[14px]">Priya Sharma</p>
                <p className="text-white/30 text-[12px]">Top Creator</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-[#fbbf24] text-[12px]">★</span>
                ))}
              </div>
            </div>
            <p className="text-white/40 text-[13px] leading-[20px]">
              "Flubn transformed my career. I've connected with amazing brands and tripled my collaboration income."
            </p>
          </div>
        </div>
      </div>

      {/* Right - Form side */}
      <div className="flex-1 bg-[#f8f9fc] flex items-center justify-center p-6 sm:p-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <motion.div variants={fadeUp} className="text-center mb-8 lg:hidden">
            <Link to="/">
              <img src={getLogoUrl() || logoLightImg} alt="Flubn" className="h-8 w-auto mx-auto mb-4" />
            </Link>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-2 mb-2">
              
              <span className="text-[#2F6BFF] text-sm">Welcome back</span>
            </div>
            <h1 className="text-[28px] text-[#0a090f] tracking-[-1px]">Log in to your account</h1>
            <p className="text-[#64748b] mt-1.5 text-[15px]">Pick your role and sign in to continue</p>
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

          <motion.div variants={fadeUp} className="mt-8">{/* Changed from mt-8 to match spacing */}
            <div className="bg-white rounded-[20px] shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-[#e2e8f0]/60 p-7">
              {/* Role tabs */}
              <div className="flex gap-1 bg-[#f1f5f9] rounded-[14px] p-1 mb-7">
                {(["brand", "influencer", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRole(r); setShowAdminSetup(false); setAdminSetupDone(false); }}
                    className={`flex-1 py-2.5 text-[13px] rounded-[10px] transition-all capitalize ${
                      role === r
                        ? "text-white shadow-sm"
                        : "text-[#64748b] hover:text-[#2F6BFF]"
                    }`}
                    style={role === r ? { background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" } : undefined}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-[13px] text-[#64748b] mb-1.5 block">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_white] [&:-webkit-autofill]:[-webkit-text-fill-color:#1a1a2e]"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-[#64748b] mb-1.5 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-[12px] text-[#1a1a2e] text-[15px] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[13px] text-[#64748b] cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-[#e2e8f0] text-[#2F6BFF] focus:ring-[#2F6BFF]"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                  </label>
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!email) {
                        toast.error("Enter your email first", {
                          description: "Please type your email address above, then click Forgot password.",
                        });
                        return;
                      }
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/login`,
                        });
                        if (error) {
                          toast.error("Password reset failed", { description: error.message });
                        } else {
                          toast.success("Password reset link sent!", {
                            description: "If an account exists with that email, you'll receive a reset link shortly.",
                          });
                        }
                      } catch {
                        toast.error("Something went wrong", { description: "Please try again later." });
                      }
                    }}
                    className="text-[13px] text-[#2F6BFF] hover:underline"
                  >Forgot password?</a>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 text-white rounded-[12px] hover:opacity-90 transition-all flex items-center justify-center gap-2 text-[15px] shadow-lg shadow-[#2F6BFF]/20"
                  style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
                >
                  {isLoading ? "Logging in..." : "Log in"}
                  <ArrowRight size={16} />
                </button>
              </form>

              {/* Admin First-Time Setup */}
              {role === "admin" && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdminSetup(!showAdminSetup)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-dashed border-[#e2e8f0] rounded-[12px] text-[13px] text-[#94a3b8] hover:text-[#2F6BFF] hover:border-[#2F6BFF]/40 transition-all"
                  >
                    <UserPlus size={15} />
                    First time? Create admin account
                  </button>

                  {showAdminSetup && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-[14px] p-4"
                    >
                      <p className="text-[12px] text-[#64748b] mb-3">
                        Create your first admin account. This sets up admin access in Supabase.
                      </p>
                      <form onSubmit={handleAdminSetup} className="space-y-3">
                        <input
                          type="text"
                          value={adminSetupName}
                          onChange={e => setAdminSetupName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full px-3 py-2.5 bg-white border border-[#e2e8f0] rounded-[10px] text-[14px] text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                        />
                        <input
                          type="email"
                          value={adminSetupEmail}
                          onChange={e => setAdminSetupEmail(e.target.value)}
                          placeholder="Admin email"
                          className="w-full px-3 py-2.5 bg-white border border-[#e2e8f0] rounded-[10px] text-[14px] text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                        />
                        <input
                          type="password"
                          value={adminSetupPassword}
                          onChange={e => setAdminSetupPassword(e.target.value)}
                          placeholder="Password (min 6 chars)"
                          className="w-full px-3 py-2.5 bg-white border border-[#e2e8f0] rounded-[10px] text-[14px] text-[#1a1a2e] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF]"
                        />
                        <button
                          type="submit"
                          disabled={adminSetupLoading}
                          className="w-full py-2.5 text-white rounded-[10px] text-[13px] transition-all disabled:opacity-60"
                          style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}
                        >
                          {adminSetupLoading ? "Creating..." : "Create Admin Account"}
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {adminSetupDone && (
                    <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-[12px] px-3 py-2">
                      <CheckCircle2 size={15} className="text-green-600" />
                      <p className="text-green-700 text-[12px]">Admin created — credentials filled above. Click Log in!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-[#e2e8f0]" />
                <span className="text-[12px] text-[#94a3b8]">or continue with</span>
                <div className="flex-1 h-px bg-[#e2e8f0]" />
              </div>

              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin("google")}
                  disabled={oauthLoading !== null || isLoading}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border-2 border-[#e2e8f0] rounded-[12px] hover:border-[#4285F4]/40 hover:bg-[#f8faff] transition-all text-[13px] text-[#1a1a2e] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {oauthLoading === "google" ? (
                    <svg className="animate-spin h-4 w-4 text-[#4285F4]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : <GoogleIcon />}
                  <span>{oauthLoading === "google" ? "Signing in…" : "Google"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthLogin("meta")}
                  disabled={oauthLoading !== null || isLoading}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-[12px] hover:opacity-90 transition-all text-[13px] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  style={{ background: "#1877F2" }}
                >
                  {oauthLoading === "meta" ? (
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : <MetaIcon />}
                  <span>{oauthLoading === "meta" ? "Signing in…" : "Meta"}</span>
                </button>
              </div>

              <p className="text-center text-[14px] text-[#94a3b8]">
                Don't have an account?{" "}
                <Link to="/signup" className="text-[#2F6BFF] hover:underline">
                  Sign up for free
                </Link>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}