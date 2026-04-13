import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Send, ChartBar, Check,
  Star, ChevronDown,
  MapPin,
  MessageCircle, Eye,
  ArrowRight, Shield, Users, TrendingUp, Zap, BadgeCheck, Award, Sparkles, Heart, Lock, CheckCheck,
  MessageSquare, Infinity, Target,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { TRUST_BADGES, PRICING_PLANS } from "../data/mock-data";
import { getInfluencers } from "../utils/dataManager";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useState, useEffect, useMemo } from "react";
import { getActivePricingPlans, getActiveTestimonials } from "../utils/dataManager";
import Slider from "react-slick";
import "../styles/slick-overrides.css";
import { useStatistics } from "../context/StatisticsContext";
import { FeaturedCreators } from "../components/FeaturedCreators";
import * as api from "../utils/api";

/* Figma asset imports */
import imgHeroPhoto from "figma:asset/ac41ae254d38d8de0a2eee9f2d318b5e6f23506e.png";
import imgLogoHaba from "figma:asset/0f459dd0ef5645b2c669d5f5e8f33ef4962212e9.png";
import imgLogoAll from "figma:asset/9efb5c31acea1162d78954b1f72b09485b72bdc5.png";
import imgLogoEvo from "figma:asset/5dbd3ccf9187e8ede82fdbfa752de359c881c52c.png";
import imgLogoCaneva from "figma:asset/29eb6e929d6cdc91f748970c73cb05bd1ea381fd.png";
import imgLogoIdruide from "figma:asset/c59fbe81e8e04f0a528fa68c722e5b015bf719a2.png";
import imgLogoHexagon from "figma:asset/f4d2a1b60191175119fcbc5b37e0e9a8ec88e732.png";
import imgLogoKiabi from "figma:asset/d40648cc70581a6b43bdc9fb0ccde589cbc407eb.png";
import imgLogoHula from "figma:asset/c611bc778ec8b95c1d65f8a1c1e16f9bcad8d089.png";
import imgLogoMemento from "figma:asset/b95f8cd4f252d08f5f8ec95326d7fe55874f3046.png";
import imgLogoBpce from "figma:asset/013f17cf14e56d3424320b1fdad03dd425930a41.png";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

const formatFollowers = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [dynamicLogos, setDynamicLogos] = useState<string[] | null>(null);
  const [activePlan, setActivePlan] = useState<string>(
    () => localStorage.getItem("flubn_brand_active_plan") || "Free"
  );

  // Load dynamic trust logos from backend
  useEffect(() => {
    // Clear any stale trust logo cache that may be filling localStorage
    try { localStorage.removeItem("flubn_trust_logos"); } catch {}
    // Fetch from backend
    api.getData("trust_logos").then((data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        setDynamicLogos(data.map((l: any) => l.url));
        // Don't cache base64 logos in localStorage — they cause QuotaExceededError
      }
    }).catch(() => {});
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    const plans = getActivePricingPlans();
    const testimonials = getActiveTestimonials();
    const influencersData = getInfluencers();
    console.log("🏠 Landing page loading data:", { plans, testimonials, influencers: influencersData });
    const featuredPlans = plans.filter((p: any) => p.featured);
    setPricingPlans(featuredPlans.length > 0 ? featuredPlans : plans);
    setTestimonials(testimonials);
    setInfluencers(influencersData);

    // Listen for updates from admin panel (custom events for same tab)
    const handlePricingUpdate = () => {
      const updatedPlans = getActivePricingPlans();
      console.log("🔔 Landing page received pricing update:", updatedPlans);
      const featuredPlans = updatedPlans.filter((p: any) => p.featured);
      setPricingPlans(featuredPlans.length > 0 ? featuredPlans : updatedPlans);
    };

    const handleTestimonialsUpdate = () => {
      const updatedTestimonials = getActiveTestimonials();
      console.log("🔔 Landing page received testimonials update:", updatedTestimonials);
      setTestimonials(updatedTestimonials);
    };

    const handleInfluencersUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const updatedInfluencers = customEvent.detail || getInfluencers();
      console.log("🔔 Landing page received influencers update:", updatedInfluencers);
      setInfluencers(updatedInfluencers);
    };

    // Listen for storage changes (works across tabs and for navigation)
    const handleStorageChange = (e: StorageEvent) => {
      console.log("💾 Storage event detected:", e.key);
      if (e.key === "flubn_pricing_plans") {
        const updatedPlans = getActivePricingPlans();
        console.log("🔔 Landing page received storage pricing update:", updatedPlans);
        const featuredPlans = updatedPlans.filter((p: any) => p.featured);
        setPricingPlans(featuredPlans.length > 0 ? featuredPlans : updatedPlans);
      } else if (e.key === "flubn_testimonials") {
        const updatedTestimonials = getActiveTestimonials();
        console.log("🔔 Landing page received storage testimonials update:", updatedTestimonials);
        setTestimonials(updatedTestimonials);
      } else if (e.key === "flubn_influencers") {
        const updatedInfluencers = getInfluencers();
        console.log("🔔 Landing page received storage influencers update:", updatedInfluencers);
        setInfluencers(updatedInfluencers);
      } else if (e.key === "flubn_brand_active_plan") {
        setActivePlan(e.newValue || "Free");
      }
    };

    const handlePlanChanged = () => {
      setActivePlan(localStorage.getItem("flubn_brand_active_plan") || "Free");
    };

    window.addEventListener("pricingPlansUpdated", handlePricingUpdate);
    window.addEventListener("testimonialsUpdated", handleTestimonialsUpdate);
    window.addEventListener("influencersUpdated", handleInfluencersUpdate);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("planChanged", handlePlanChanged);
    console.log("👂 Landing page listening for updates");

    return () => {
      window.removeEventListener("pricingPlansUpdated", handlePricingUpdate);
      window.removeEventListener("testimonialsUpdated", handleTestimonialsUpdate);
      window.removeEventListener("influencersUpdated", handleInfluencersUpdate);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("planChanged", handlePlanChanged);
      console.log("🔇 Landing page stopped listening");
    };
  }, []);

  // Get active pricing plans for FAQs
  const basicPlan = pricingPlans.find((p) => p.name === "Basic");
  const proPlan = pricingPlans.find((p) => p.name === "Pro");

  const faqs = [
    {
      q: "Is Flubn free for influencers?",
      a: "Yes! Influencers can create profiles, receive collaboration requests, and manage their campaigns completely free of charge. We only charge subscription fees to brands.",
    },
    {
      q: "How does the contact unlock system work?",
      a: "To protect influencer privacy, contact details (email, phone) are hidden until the influencer accepts a brand's collaboration request. Once accepted, contact information is unlocked for both parties.",
    },
    {
      q: "What's the difference between Basic and Pro plans?",
      a: "The Basic plan (\u20b91,999/mo) includes 20 collaboration invites per month with basic filters. The Pro plan (\u20b94,999/mo) offers unlimited invites, advanced search filters, analytics dashboard, and priority support.",
    },
    {
      q: "How are influencers verified?",
      a: "Every influencer goes through our verification process where we validate their social media accounts, follower authenticity, and content quality before granting the verified badge.",
    },
    {
      q: "Can I cancel my subscription anytime?",
      a: "Absolutely. You can cancel, upgrade, or downgrade your subscription at any time. Changes take effect at the start of your next billing cycle, and there are no cancellation fees.",
    },
    {
      q: "How do I track campaign performance?",
      a: "Both brands and influencers get access to an analytics dashboard that tracks collaboration requests, acceptance rates, campaign values, and engagement metrics over time.",
    },
  ];

  const defaultTrustLogos = [
    imgLogoHaba, imgLogoAll, imgLogoEvo, imgLogoCaneva, imgLogoIdruide,
    imgLogoHexagon, imgLogoKiabi, imgLogoHula, imgLogoMemento, imgLogoBpce,
  ];
  const trustLogos = dynamicLogos && dynamicLogos.length > 0 ? dynamicLogos : defaultTrustLogos;

  const { stats } = useStatistics();

  return (
    <div className="relative min-h-screen bg-white font-['Inter',sans-serif]">
      <Navbar />

      {/* ========== HERO SECTION ========== */}
      <section className="px-5 sm:px-8 lg:px-[100px] pt-8 pb-0">
        <div className="relative bg-[#0a090f] rounded-[30px] sm:rounded-[50px] overflow-hidden min-h-[500px] sm:min-h-[600px] lg:min-h-[680px]">
          {/* Abstract gradient blob */}
          <div className="absolute right-0 top-0 bottom-0 w-[60%] overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 80% 70% at 60% 50%, rgba(15,61,145,0.4), transparent),
                  radial-gradient(ellipse 60% 60% at 80% 30%, rgba(47,107,255,0.5), transparent),
                  radial-gradient(ellipse 50% 50% at 40% 70%, rgba(107,169,255,0.3), transparent)
                `,
              }}
            />
            {/* Decorative circles */}
            <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 500 500">
              <circle cx="250" cy="200" r="180" stroke="rgba(15,61,145,0.3)" strokeWidth="30" fill="none" />
              <circle cx="300" cy="300" r="120" stroke="rgba(47,107,255,0.3)" strokeWidth="25" fill="none" />
              <circle cx="200" cy="350" r="80" stroke="rgba(107,169,255,0.2)" strokeWidth="20" fill="none" />
              <circle cx="350" cy="150" r="60" stroke="rgba(255,255,255,0.05)" strokeWidth="15" fill="none" />
            </svg>
          </div>

          {/* Hero content */}
          <div className="relative z-10 px-8 sm:px-12 lg:px-[80px] pt-16 sm:pt-20 lg:pt-24 pb-16 sm:pb-20">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-[600px]">
              <motion.h1
                variants={fadeUp}
                className="text-white text-[48px] sm:text-[80px] lg:text-[140px] !leading-[0.95] tracking-[-3px] lg:tracking-[-5px]"
              >
                Influencer<br />
                H<span className="inline-block relative">
                  <span className="relative z-10">u</span>
                  <span className="absolute -inset-1 rounded-full scale-[1.8] opacity-60 blur-[2px] -z-0" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }} />
                </span>b
              </motion.h1>

              {/* Floating card */}
              <motion.div
                variants={fadeUp}
                className="mt-20 sm:mt-12 bg-white rounded-[20px] inline-flex items-center gap-3 sm:gap-4 shadow-xl max-w-[420px] p-[16px]"
              >
                <div className="w-16 h-16 sm:w-[88px] sm:h-[88px] rounded-[14px] overflow-hidden shrink-0">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1665327465734-0fc17ecdceae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBjb250ZW50JTIwY3JlYXRvciUyMGluZmx1ZW5jZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzU3MjE3MjV8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Creator"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-[#0a090f] text-sm sm:text-[16px]">
                    Discover {stats.influencersDisplay} creators
                  </p>
                  <Link
                    to="/discover"
                    className="text-[#00e] text-sm sm:text-[14px] underline decoration-solid hover:text-[#2F6BFF] transition-colors mt-1 inline-block"
                  >
                    Let's explore!
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Vertical side badge */}
          <div className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 w-[50px] h-[160px] items-center justify-center rounded-l-[12px]" style={{ background: "linear-gradient(180deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
            <span className="text-white text-[13px] tracking-wider rotate-[-90deg] whitespace-nowrap">
              FLUBN 2026
            </span>
          </div>
        </div>
      </section>

      {/* ========== SUBTITLE / INTRO ========== */}
      <section className="py-20 lg:py-28 px-5 sm:px-8 relative overflow-hidden">
        {/* Premium gradient background accents */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-[400px] opacity-[0.08]"
            style={{ background: "radial-gradient(ellipse at center, rgba(47,107,255,0.6), transparent 70%)" }}
          />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-[900px] mx-auto text-center relative z-10"
        >
          {/* Premium badge */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0F3D91]/10 to-[#2F6BFF]/10 border border-[#2F6BFF]/20 rounded-full px-5 py-2 mb-6">
            <Sparkles size={13} className="text-[#2F6BFF]" />
            <span className="text-[13px] tracking-wide text-[#2F6BFF] font-medium">OUR APPROACH</span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[#0a090f] text-[36px] sm:text-[48px] lg:text-[58px] !leading-[1.1] tracking-[-2px] mb-6"
          >
            More <span className="bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] bg-clip-text text-transparent">simplicity</span>, flexibility,{" "}
            <span className="relative inline-block">
              design
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 100 8" preserveAspectRatio="none">
                <path d="M0,5 Q25,0 50,5 T100,5" stroke="url(#gradient)" strokeWidth="2" fill="none" />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0F3D91" />
                    <stop offset="100%" stopColor="#2F6BFF" />
                  </linearGradient>
                </defs>
              </svg>
            </span>{" "}
            and connections
          </motion.h2>

          <motion.div variants={fadeUp} className="max-w-[580px] mx-auto">
            <p className="text-[18px] text-black/70 leading-[32px] mb-4">
              At Flubn, we believe in{" "}
              <span className="relative inline-block px-3 py-1 bg-gradient-to-r from-[#0F3D91]/5 to-[#2F6BFF]/5 rounded-lg border border-[#2F6BFF]/20 text-[#0F3D91] font-medium">
                Less friction, More collaboration
              </span>
            </p>
            <p className="text-[16px] text-black/60 leading-[28px]">
              That's why we created <span className="font-semibold text-[#0a090f]">three clear offerings</span> to match your exact needs
            </p>
          </motion.div>

          {/* Decorative elements */}
          <motion.div
            variants={fadeUp}
            className="flex items-center justify-center gap-4 sm:gap-8 mt-10"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#0F3D91]/10 to-[#2F6BFF]/10 border border-[#2F6BFF]/20 flex items-center justify-center">
                <Zap className="text-[#2F6BFF]" size={16} />
              </div>
              <div className="text-left">
                <p className="text-[11px] sm:text-[12px] text-black/40 uppercase tracking-wide">Fast</p>
                <p className="text-[13px] sm:text-[14px] text-[#0a090f] font-medium">Setup</p>
              </div>
            </div>
            <div className="w-px h-8 bg-black/10" />
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#0F3D91]/10 to-[#2F6BFF]/10 border border-[#2F6BFF]/20 flex items-center justify-center">
                <Shield className="text-[#2F6BFF]" size={16} />
              </div>
              <div className="text-left">
                <p className="text-[11px] sm:text-[12px] text-black/40 uppercase tracking-wide">100%</p>
                <p className="text-[13px] sm:text-[14px] text-[#0a090f] font-medium">Secure</p>
              </div>
            </div>
            <div className="w-px h-8 bg-black/10" />
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#0F3D91]/10 to-[#2F6BFF]/10 border border-[#2F6BFF]/20 flex items-center justify-center">
                <TrendingUp className="text-[#2F6BFF]" size={16} />
              </div>
              <div className="text-left">
                <p className="text-[11px] sm:text-[12px] text-black/40 uppercase tracking-wide">Proven</p>
                <p className="text-[13px] sm:text-[14px] text-[#0a090f] font-medium">Results</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ========== OFFERS SECTION ========== */}
      <section className="px-5 sm:px-8 lg:px-[100px]">
        {/* Main dark card - Discover */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={scaleIn}
          className="relative bg-[#0a090f] rounded-[20px] overflow-hidden min-h-[320px] sm:min-h-[380px]"
        >
          {/* Background gradient mesh */}
          <div className="absolute inset-0">
            <div
              className="absolute top-0 left-0 w-[50%] h-full opacity-50"
              style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(15,61,145,0.5), transparent 70%)" }}
            />
            <div
              className="absolute top-0 right-0 w-[60%] h-full opacity-30"
              style={{ background: "radial-gradient(ellipse at 80% 30%, rgba(47,107,255,0.4), transparent 60%)" }}
            />
            <div
              className="absolute bottom-0 right-[20%] w-[40%] h-[60%] opacity-20"
              style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(107,169,255,0.5), transparent 70%)" }}
            />
            {/* Subtle grid pattern overlay */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-12 p-8 sm:p-10 lg:p-14">
            {/* Left content */}
            <div className="flex-1 min-w-0">
              {/* Icon badge */}
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-6 border border-white/10 bg-white/5 backdrop-blur-sm">
                <Search size={20} className="text-[#6BA9FF]" />
              </div>

              <h3 className="text-white text-[36px] sm:text-[44px] !leading-[1] tracking-[-0.5px]">
                Discover Creators
              </h3>

              <p className="text-white/55 text-[16px] leading-[26px] mt-5 max-w-[480px]">
                Browse thousands of verified influencer profiles with advanced filters to find the <span className="text-white font-[600]">perfect match</span> for your brand without endless searching.
              </p>

              {/* Feature tags */}
              <div className="flex flex-wrap gap-2.5 mt-7">
                {[
                  { icon: <Search size={13} />, label: "Advanced Filters" },
                  { icon: <Check size={13} />, label: "Verified Profiles" },
                  { icon: <ChartBar size={13} />, label: "Real-time Analytics" },
                ].map((tag) => (
                  <span
                    key={tag.label}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] text-white/80 bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm"
                  >
                    <span className="text-[#6BA9FF]">{tag.icon}</span>
                    {tag.label}
                  </span>
                ))}
              </div>

              <Link
                to="/discover"
                className="inline-flex items-center gap-2.5 mt-8 px-7 py-4 text-white rounded-full hover:opacity-90 transition-all text-[16px] group/btn"
                style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
              >
                Explore all influencers
                <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Right visual - Mock search + avatar stack */}
            <div className="hidden lg:block w-[340px] shrink-0">
              {/* Mock search bar */}
              <div className="bg-white/[0.07] backdrop-blur-md rounded-[16px] border border-white/[0.08] p-5">
                <div className="flex items-center gap-3 bg-white/[0.06] rounded-[10px] px-4 py-3 border border-white/[0.06]">
                  <Search size={16} className="text-white/30" />
                  <span className="text-white/30 text-[14px]">Search influencers...</span>
                </div>

                {/* Mini filter pills */}
                <div className="flex gap-2 mt-3">
                  <span className="px-3 py-1.5 rounded-full text-[11px] text-white/90 font-[500]" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}>Fashion</span>
                  <span className="px-3 py-1.5 rounded-full text-[11px] text-white/50 bg-white/[0.06] border border-white/[0.06]">Tech</span>
                  <span className="px-3 py-1.5 rounded-full text-[11px] text-white/50 bg-white/[0.06] border border-white/[0.06]">Food</span>
                  <span className="px-3 py-1.5 rounded-full text-[11px] text-white/50 bg-white/[0.06] border border-white/[0.06]">Travel</span>
                </div>

                {/* Creator preview rows */}
                <div className="mt-4 space-y-3">
                  {/* Static Creator 1 */}
                  <div className="flex items-center gap-3 p-2 rounded-[10px] bg-white/[0.04] border border-white/[0.04]">
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
                      <ImageWithFallback 
                        src="https://images.unsplash.com/photo-1611246706753-80b59941efc6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHdvbWFuJTIwZmFzaGlvbiUyMGluZmx1ZW5jZXJ8ZW58MXx8fHwxNzczODk4Mzc2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                        alt="Sarah Chen" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/90 text-[13px] truncate">Sarah Chen</span>
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 bg-[#103ab9]">
                          <Check size={8} className="text-white" />
                        </span>
                      </div>
                      <span className="text-white/35 text-[11px]">125K followers</span>
                    </div>
                    <span className="text-[11px] text-[#6BA9FF] px-2 py-0.5 bg-[#2F6BFF]/10 rounded-full border border-[#2F6BFF]/20">Fashion</span>
                  </div>

                  {/* Static Creator 2 */}
                  <div className="flex items-center gap-3 p-2 rounded-[10px] bg-white/[0.04] border border-white/[0.04]">
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
                      <ImageWithFallback 
                        src="https://images.unsplash.com/photo-1598596932689-31a0512bf127?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwdGVjaCUyMGVudHJlcHJlbmV1ciUyMHBvcnRyYWl0fGVufDF8fHx8MTc3Mzg5ODM3N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                        alt="Alex Kumar" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/90 text-[13px] truncate">Alex Kumar</span>
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 bg-[#103ab9]">
                          <Check size={8} className="text-white" />
                        </span>
                      </div>
                      <span className="text-white/35 text-[11px]">89K followers</span>
                    </div>
                    <span className="text-[11px] text-[#6BA9FF] px-2 py-0.5 bg-[#2F6BFF]/10 rounded-full border border-[#2F6BFF]/20">Tech</span>
                  </div>

                  {/* Static Creator 3 */}
                  <div className="flex items-center gap-3 p-2 rounded-[10px] bg-white/[0.04] border border-white/[0.04]">
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
                      <ImageWithFallback 
                        src="https://images.unsplash.com/photo-1765248149215-b0c913b904fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHdvbWFuJTIwbGlmZXN0eWxlJTIwY3JlYXRvcnxlbnwxfHx8fDE3NzM4OTgzNzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                        alt="Maya Patel" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/90 text-[13px] truncate">Maya Patel</span>
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 bg-[#103ab9]">
                          <Check size={8} className="text-white" />
                        </span>
                      </div>
                      <span className="text-white/35 text-[11px]">210K followers</span>
                    </div>
                    <span className="text-[11px] text-[#6BA9FF] px-2 py-0.5 bg-[#2F6BFF]/10 rounded-full border border-[#2F6BFF]/20">Lifestyle</span>
                  </div>
                </div>

                {/* Bottom stats */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#0a090f]">
                      <ImageWithFallback 
                        src="https://images.unsplash.com/photo-1611246706753-80b59941efc6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHdvbWFuJTIwZmFzaGlvbiUyMGluZmx1ZW5jZXJ8ZW58MXx8fHwxNzczODk4Mzc2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                        alt="Sarah Chen" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#0a090f]">
                      <ImageWithFallback 
                        src="https://images.unsplash.com/photo-1598596932689-31a0512bf127?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwdGVjaCUyMGVudHJlcHJlbmV1ciUyMHBvcnRyYWl0fGVufDF8fHx8MTc3Mzg5ODM3N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                        alt="Alex Kumar" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#0a090f]">
                      <ImageWithFallback 
                        src="https://images.unsplash.com/photo-1765248149215-b0c913b904fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHdvbWFuJTIwbGlmZXN0eWxlJTIwY3JlYXRvcnxlbnwxfHx8fDE3NzM4OTgzNzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                        alt="Maya Patel" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#0a090f]">
                      <ImageWithFallback 
                        src="https://images.unsplash.com/photo-1675238814412-f87beb56d214?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMHBob3RvZ3JhcGhlciUyMGhlYWRzaG90fGVufDF8fHx8MTc3Mzg5ODM3N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                        alt="David Lee" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    
                  </div>
                  <span className="text-white/40 text-[12px]">5,000+ creators</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Two side-by-side cards */}
        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          {/* Card - Connect */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            className="group relative rounded-[20px] overflow-hidden border border-[#e2e8f0] hover:border-[#2F6BFF]/30 transition-all duration-500 hover:shadow-[0_8px_40px_rgba(15,61,145,0.12)]"
          >
            {/* Top gradient accent bar */}
            <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #0F3D91 0%, #2F6BFF 50%, #6BA9FF 100%)" }} />

            <div className="p-8 sm:p-10 bg-white">
              {/* Icon badge */}
              <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-6" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
                <Send size={22} className="text-white" />
              </div>

              <h3 className="text-[#0a090f] text-[32px] sm:text-[40px] !leading-[1] tracking-[-0.5px]">
                Connect
              </h3>

              <p className="text-black/60 text-[16px] leading-[26px] mt-5 max-w-[420px]">
                Send collaboration requests directly to influencers with your campaign brief. 
                Reach the right creators <span className="text-[#0a090f] font-[600]">quickly and efficiently</span>.
              </p>

              {/* Feature list */}
              <div className="mt-7 space-y-4">
                {[
                  { icon: <Send size={15} />, text: "Direct collaboration requests" },
                  { icon: <Shield size={15} />, text: "Contact unlock on acceptance" },
                  { icon: <Users size={15} />, text: "Campaign brief sharing" },
                  { icon: <Zap size={15} />, text: "Instant notification system" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[10px] bg-[#f0f4ff] flex items-center justify-center shrink-0 text-[#2F6BFF]">
                      {f.icon}
                    </div>
                    <span className="text-[15px] text-black/70">{f.text}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/signup?role=brand"
                className="inline-flex items-center gap-2 mt-8 px-7 py-4 text-white rounded-full hover:opacity-90 transition-all text-[16px] group/btn"
                style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
              >
                Start collaborating now
                <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* Card - Grow */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            className="group relative bg-[#0a090f] rounded-[20px] overflow-hidden hover:shadow-[0_8px_40px_rgba(15,61,145,0.25)] transition-all duration-500"
          >
            {/* Subtle corner glow */}
            <div
              className="absolute top-0 right-0 w-[300px] h-[300px] opacity-40"
              style={{ background: "radial-gradient(ellipse at 100% 0%, rgba(47,107,255,0.4), transparent 70%)" }}
            />
            <div
              className="absolute bottom-0 left-0 w-[200px] h-[200px] opacity-25"
              style={{ background: "radial-gradient(ellipse at 0% 100%, rgba(107,169,255,0.4), transparent 70%)" }}
            />

            <div className="relative z-10 p-8 sm:p-10">
              {/* Icon badge */}
              <div className="w-14 h-14 rounded-[16px] bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/10">
                <TrendingUp size={22} className="text-white" />
              </div>

              <h3 className="text-white text-[32px] sm:text-[40px] !leading-[1] tracking-[-0.5px]">
                Grow
              </h3>

              <p className="text-white/60 text-[16px] leading-[26px] mt-5 max-w-[420px]">
                Need reinforcement on specific campaigns? Find influencers who adapt to your workflow and <span className="text-white font-[600]">scale your reach</span>.
              </p>

              {/* Feature list */}
              <div className="mt-7 space-y-4">
                {[
                  { icon: <Users size={15} />, text: "Niche creator network" },
                  { icon: <Zap size={15} />, text: "Tailored campaign expertise" },
                  { icon: <ChartBar size={15} />, text: "Performance analytics" },
                  { icon: <TrendingUp size={15} />, text: "Scalable team building" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[10px] bg-white/8 flex items-center justify-center shrink-0 text-[#6BA9FF] border border-white/10">
                      {f.icon}
                    </div>
                    <span className="text-[15px] text-white/70">{f.text}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 mt-8 px-7 py-4 bg-white text-[#0a090f] rounded-full hover:bg-white/90 transition-all text-[16px] group/btn font-[500]"
              >
                Explore the pro plan
                <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== MARQUEE TEXT ========== */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        <div
          className="whitespace-nowrap animate-[marquee-scroll_30s_linear_infinite]"
        >
          <span className="text-[120px] sm:text-[180px] lg:text-[260px] text-black/[0.04] tracking-tight select-none">
            Discover connect collaborate grow impact reach engage create&nbsp;&nbsp;&nbsp;discover connect collaborate grow impact reach engage create
          </span>
        </div>
        <style>{`
          @keyframes marquee-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {/* ========== MAKE YOU GROW, TOGETHER ========== */}
      <section className="py-0 px-5 sm:px-8 lg:px-0 overflow-hidden">
        <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row items-center">
          {/* Left text */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="flex-1 px-5 sm:px-8 lg:px-[100px] py-16 lg:py-28"
          >
            <motion.h2
              variants={fadeUp}
              className="text-[#0a090f] text-[36px] sm:text-[44px] lg:text-[55px] !leading-[1.1] max-w-[415px]"
            >
              Who we are & Why we care.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[17px] text-black/70 leading-[30px] mt-6 max-w-[560px]">
              At FLUBN, we believe the best partnerships are built on{" "}
              <span className="font-[700] text-black">trust, transparency, and shared vision</span>. Our team is passionate about bridging the gap between brands and creators crafting authentic collaborations that{" "}
              <span className="font-[700] text-black">deliver real impact</span>.
              {" "}We're more than a platform; we're your growth partners, committed to empowering every campaign with data-driven insights and human creativity.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 mt-8 px-8 py-5 text-white rounded-full hover:opacity-90 transition-opacity text-[17px]"
                style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
              >
                contact us
              </Link>
            </motion.div>
          </motion.div>

          {/* Right images */}
          <div className="flex-1 relative hidden lg:flex h-[520px]">
            {/* Decorative background blobs */}
            <div className="absolute -top-8 -right-8 w-72 h-72 bg-[#2F6BFF]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-4 w-48 h-48 bg-[#6BA9FF]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Main large image */}
            <div className="absolute top-0 left-0 w-[62%] h-[75%] rounded-2xl overflow-hidden shadow-2xl shadow-black/15 ring-1 ring-white/20 z-10">
              <ImageWithFallback
                src={imgHeroPhoto}
                alt="Collaboration"
                className="w-full h-full object-cover"
              />
              {/* Overlay badge */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2F6BFF] to-[#6BA9FF] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <p className="text-[11px] text-[#64748b] leading-tight">Trusted by</p>
                  <p className="text-[13px] font-semibold text-[#1a1a2e] leading-tight">500+ Brands</p>
                </div>
              </div>
            </div>

            {/* Secondary image - offset bottom-right */}
            <div className="absolute bottom-0 right-0 w-[52%] h-[60%] rounded-2xl overflow-hidden shadow-2xl shadow-black/15 ring-1 ring-white/20 z-20">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758273239504-b026c5bb2190?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmZsdWVuY2VyJTIwY29udGVudCUyMGNyZWF0b3IlMjBzdHVkaW8lMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzczODI5Mjc5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Content Creator"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Small accent image - top right */}
            <div className="absolute top-6 right-4 w-[30%] h-[28%] rounded-xl overflow-hidden shadow-xl shadow-black/10 ring-1 ring-white/20 z-[5]">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1760087615902-021b553577ce?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmFuZCUyMG1hcmtldGluZyUyMHRlYW0lMjBjb2xsYWJvcmF0aW9uJTIwbW9kZXJufGVufDF8fHx8MTc3MzgyOTI3OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Team collaboration"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Floating stats card */}
            <div className="absolute bottom-16 left-[48%] z-30 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl ring-1 ring-black/5">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] ring-2 ring-white" />
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] ring-2 ring-white" />
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2F6BFF] to-[#10b981] ring-2 ring-white" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#1a1a2e] leading-tight">1,200+ Creators</p>
                  <p className="text-[11px] text-[#64748b] leading-tight">Active on platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== TRUSTED BY ========== */}
      <section className="bg-[#f4f4f4] py-16 lg:py-20 px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="max-w-[1200px] mx-auto"
        >
          <style>{`
            @keyframes marquee-ltr { from { transform: translateX(0); } to { transform: translateX(-50%); } }
            @keyframes marquee-rtl { from { transform: translateX(-50%); } to { transform: translateX(0); } }
          `}</style>

          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#e2e8f0] text-[12px] text-[#64748b] mb-4 shadow-sm">
              <Users size={13} />
              500+ brands &amp; creators growing together
            </span>
            <h2 className="text-[#0a090f] text-[32px] sm:text-[42px] !leading-[1.05]">
              They trusted us
            </h2>
            <p className="text-[#64748b] text-[15px] mt-3">
              Join India's fastest-growing influencer marketplace
            </p>
          </div>

          {/* Row 1 — scrolls left */}
          <div className="overflow-hidden" style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)" }}>
            <div className="flex gap-4 w-max" style={{ animation: "marquee-ltr 28s linear infinite" }}>
              {[...trustLogos.slice(0, Math.ceil(trustLogos.length / 2)), ...trustLogos.slice(0, Math.ceil(trustLogos.length / 2))].map((logo, i) => (
                <div
                  key={`r1-${i}`}
                  className="flex items-center justify-center w-[140px] sm:w-[180px] h-[72px] sm:h-[88px] bg-white rounded-2xl border border-[#e8edf5] shadow-sm px-6 shrink-0 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
                >
                  <img src={logo} alt="Partner" className="max-h-[52px] max-w-full object-contain" />
                </div>
              ))}
            </div>
          </div>

          {/* Row 2 — scrolls right */}
          <div className="overflow-hidden mt-4" style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)" }}>
            <div className="flex gap-4 w-max" style={{ animation: "marquee-rtl 32s linear infinite" }}>
              {[...trustLogos.slice(Math.ceil(trustLogos.length / 2)), ...trustLogos.slice(Math.ceil(trustLogos.length / 2))].map((logo, i) => (
                <div
                  key={`r2-${i}`}
                  className="flex items-center justify-center w-[140px] sm:w-[180px] h-[72px] sm:h-[88px] bg-white rounded-2xl border border-[#e8edf5] shadow-sm px-6 shrink-0 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
                >
                  <img src={logo} alt="Partner" className="max-h-[52px] max-w-full object-contain" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ========== METHODOLOGY ========== */}
      <section className="py-16 lg:py-24 px-5 sm:px-8 lg:px-[140px]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={scaleIn}
          className="bg-[#0a090f] rounded-[30px] p-6 sm:p-10 lg:p-14 overflow-hidden relative"
        >
          {/* Animated background effects */}
          <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full pointer-events-none opacity-[0.07]" style={{ background: "radial-gradient(circle, #2F6BFF, transparent 70%)" }} />
          <div className="absolute bottom-[-150px] right-[-50px] w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.05]" style={{ background: "radial-gradient(circle, #6BA9FF, transparent 70%)" }} />
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full pointer-events-none opacity-[0.03]" style={{ background: "radial-gradient(ellipse, #2F6BFF, transparent 60%)" }} />

          {/* Dot pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Header */}
          <div className="text-center mb-10 lg:mb-14 relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#2F6BFF]/20 bg-[#2F6BFF]/[0.08] text-[#6BA9FF] text-[11px] uppercase tracking-[3px] mb-7"
            >
              <Zap size={12} />
              Process
            </motion.div>
            <h2 className="text-white text-[34px] sm:text-[44px] lg:text-[58px] !leading-[1] tracking-[-2px]">
              How the magic
              <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #2F6BFF 0%, #6BA9FF 50%, #a5caff 100%)" }}>
                happens
              </span>
            </h2>
          </div>

          {/* Bento Grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 auto-rows-auto"
          >
            {/* Card 01 - Discovery (spans 3 cols, large) */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 40, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" } } }}
              className="sm:col-span-2 lg:col-span-3 group relative"
            >
              <div className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[1px]" style={{ background: "linear-gradient(135deg, #2F6BFF40, #6BA9FF20, transparent)" }} />
              <div className="relative h-full rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-7 sm:p-8 transition-all duration-500 group-hover:border-[#2F6BFF]/25 group-hover:bg-white/[0.04] overflow-hidden">
                {/* Large decorative number */}
                <span className="absolute -right-4 -top-6 text-[140px] tracking-tighter text-white/[0.02] select-none pointer-events-none group-hover:text-white/[0.04] transition-colors duration-700" style={{ fontFamily: "monospace" }}>01</span>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(47,107,255,0.3)]" style={{ background: "linear-gradient(135deg, #2F6BFF, #0F3D91)" }}>
                      <MessageCircle size={20} className="text-white" />
                    </div>
                    <span className="text-[#2F6BFF] text-[11px] uppercase tracking-[2px]">Step 01</span>
                  </div>
                  <h4 className="text-white text-[26px] sm:text-[30px] !leading-[1.1] tracking-[-0.5px]">Discovery Calls</h4>
                  <p className="text-white/40 text-[15px] leading-[24px] mt-3 max-w-[380px]">
                    Deep-dive sessions to understand your brand DNA, target audience, campaign goals, and creative vision.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-5">
                    {["Brand Analysis", "Goal Setting", "Audience Mapping"].map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full text-[11px] text-white/50 bg-white/[0.04] border border-white/[0.06]">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 02 - Smart Matching (spans 3 cols) */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 40, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" } } }}
              className="sm:col-span-2 lg:col-span-3 group relative"
            >
              <div className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[1px]" style={{ background: "linear-gradient(135deg, #3B7AFF40, #6BA9FF20, transparent)" }} />
              <div className="relative h-full rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-7 sm:p-8 transition-all duration-500 group-hover:border-[#3B7AFF]/25 group-hover:bg-white/[0.04] overflow-hidden">
                <span className="absolute -right-4 -top-6 text-[140px] tracking-tighter text-white/[0.02] select-none pointer-events-none group-hover:text-white/[0.04] transition-colors duration-700" style={{ fontFamily: "monospace" }}>02</span>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(59,122,255,0.3)]" style={{ background: "linear-gradient(135deg, #3B7AFF, #2F6BFF)" }}>
                      <Search size={20} className="text-white" />
                    </div>
                    <span className="text-[#3B7AFF] text-[11px] uppercase tracking-[2px]">Step 02</span>
                  </div>
                  <h4 className="text-white text-[26px] sm:text-[30px] !leading-[1.1] tracking-[-0.5px]">Smart Matching</h4>
                  <p className="text-white/40 text-[15px] leading-[24px] mt-3 max-w-[380px]">
                    AI-powered filters and manual curation to find creators that perfectly resonate with your brand identity.
                  </p>
                  {/* Mini match visualization */}
                  <div className="flex items-center gap-3 mt-5">
                    <div className="flex -space-x-2">
                      {influencers.slice(0, 3).map((inf) => (
                        <div key={inf.id} className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#0a090f]">
                          <ImageWithFallback src={inf.photo} alt={inf.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <span className="text-[12px] text-white/30">{stats.influencersDisplay} creators matched</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 03 - Profile Review (spans 2 cols on lg) */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 40, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" } } }}
              className="sm:col-span-1 lg:col-span-2 group relative"
            >
              <div className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[1px]" style={{ background: "linear-gradient(135deg, #4D8AFF30, transparent)" }} />
              <div className="relative h-full rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-7 transition-all duration-500 group-hover:border-[#4D8AFF]/25 group-hover:bg-white/[0.04] overflow-hidden">
                <span className="absolute -right-2 -top-4 text-[120px] tracking-tighter text-white/[0.02] select-none pointer-events-none group-hover:text-white/[0.04] transition-colors duration-700" style={{ fontFamily: "monospace" }}>03</span>
                
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-5 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(77,138,255,0.3)]" style={{ background: "linear-gradient(135deg, #4D8AFF, #3B7AFF)" }}>
                    <Eye size={20} className="text-white" />
                  </div>
                  <span className="text-[#4D8AFF] text-[11px] uppercase tracking-[2px]">Step 03</span>
                  <h4 className="text-white text-[22px] sm:text-[24px] !leading-[1.1] tracking-[-0.5px] mt-2">Profile Review</h4>
                  <p className="text-white/40 text-[14px] leading-[22px] mt-3">
                    Comprehensive profiles with engagement data, audience insights, and content samples.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Card 04 - Campaign Launch (spans 2 cols on lg) */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 40, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" } } }}
              className="sm:col-span-1 lg:col-span-2 group relative"
            >
              <div className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[1px]" style={{ background: "linear-gradient(135deg, #5E99FF30, transparent)" }} />
              <div className="relative h-full rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-7 transition-all duration-500 group-hover:border-[#5E99FF]/25 group-hover:bg-white/[0.04] overflow-hidden">
                <span className="absolute -right-2 -top-4 text-[120px] tracking-tighter text-white/[0.02] select-none pointer-events-none group-hover:text-white/[0.04] transition-colors duration-700" style={{ fontFamily: "monospace" }}>04</span>

                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-5 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(94,153,255,0.3)]" style={{ background: "linear-gradient(135deg, #5E99FF, #4D8AFF)" }}>
                    <Send size={20} className="text-white" />
                  </div>
                  <span className="text-[#5E99FF] text-[11px] uppercase tracking-[2px]">Step 04</span>
                  <h4 className="text-white text-[22px] sm:text-[24px] !leading-[1.1] tracking-[-0.5px] mt-2">Campaign Launch</h4>
                  <p className="text-white/40 text-[14px] leading-[22px] mt-3">
                    Streamlined collaboration, contract management, and real-time campaign tracking.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Card 05 - Analytics (spans 2 cols on lg, featured) */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 40, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" } } }}
              className="sm:col-span-2 lg:col-span-2 group relative"
            >
              <div className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[1px]" style={{ background: "linear-gradient(135deg, #6BA9FF30, transparent)" }} />
              <div className="relative h-full rounded-[20px] border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-7 transition-all duration-500 group-hover:border-[#6BA9FF]/25 overflow-hidden">
                <span className="absolute -right-2 -top-4 text-[120px] tracking-tighter text-white/[0.02] select-none pointer-events-none group-hover:text-white/[0.04] transition-colors duration-700" style={{ fontFamily: "monospace" }}>05</span>

                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-5 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(107,169,255,0.3)]" style={{ background: "linear-gradient(135deg, #6BA9FF, #5E99FF)" }}>
                    <ChartBar size={20} className="text-white" />
                  </div>
                  <span className="text-[#6BA9FF] text-[11px] uppercase tracking-[2px]">Step 05</span>
                  <h4 className="text-white text-[22px] sm:text-[24px] !leading-[1.1] tracking-[-0.5px] mt-2">Analytics & ROI</h4>
                  <p className="text-white/40 text-[14px] leading-[22px] mt-3">
                    Real-time performance tracking with engagement, reach, and conversion metrics.
                  </p>
                  {/* Mini chart bars */}
                  <div className="flex items-end gap-1.5 mt-5 h-[40px]">
                    {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-[3px] transition-all duration-500 group-hover:opacity-100 opacity-60"
                        style={{
                          height: `${h}%`,
                          background: `linear-gradient(180deg, #6BA9FF${i > 6 ? "cc" : "66"}, #2F6BFF${i > 6 ? "99" : "33"})`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 lg:mt-16 relative z-10"
          >
            <Link
              to="/discover"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full text-white text-[15px] transition-all duration-300 hover:shadow-[0_0_30px_rgba(47,107,255,0.4)] hover:gap-3.5 group/cta"
              style={{ background: "linear-gradient(135deg, #244BEB 0%, #3370F5 100%)" }}
            >
              Start your campaign
              <ArrowRight size={16} className="group-hover/cta:translate-x-0.5 transition-transform" />
            </Link>
            <span className="text-white/25 text-[13px]">No credit card required</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ========== REAL-TIME CHAT SECTION ========== */}
      <section className="py-16 lg:py-24 px-5 sm:px-8 lg:px-[140px]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={scaleIn}
          className="bg-white rounded-[30px] overflow-hidden relative border border-[#e2e8f0] shadow-[0_4px_40px_rgba(15,61,145,0.07)]"
        >
          {/* Background blobs */}
          <div className="absolute top-[-150px] right-[-80px] w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.06]" style={{ background: "radial-gradient(circle, #2F6BFF, transparent 70%)" }} />
          <div className="absolute bottom-[-100px] left-[-60px] w-[400px] h-[400px] rounded-full pointer-events-none opacity-[0.04]" style={{ background: "radial-gradient(circle, #6BA9FF, transparent 70%)" }} />
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(15,61,145,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(15,61,145,0.4) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />

          <div className="relative z-10 flex flex-col lg:flex-row items-start gap-0">

            {/* ── Left: info + features ── */}
            <div className="flex-1 p-8 sm:p-12 lg:p-14 bg-white">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#2F6BFF]/25 bg-[#EBF2FF] text-[#2F6BFF] text-[11px] uppercase tracking-[3px] mb-7"
              >
                <MessageCircle size={12} />
                Direct Messaging
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className="text-[#0a090f] text-[34px] sm:text-[44px] lg:text-[52px] !leading-[1.05] tracking-[-2px] max-w-[460px]"
              >
                Brands &amp; creators,{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
                  talking directly
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-[#64748b] text-[16px] leading-[27px] mt-5 max-w-[440px]"
              >
                Skip the email chains. Once a collaboration is accepted, brands and influencers can message each other in real-time negotiate rates, share briefs, and seal deals without ever leaving FLUBN.
              </motion.p>

              {/* Feature list */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 }}
                className="mt-8 space-y-3.5"
              >
                {[
                  { icon: <MessageCircle size={15} />, text: "Real-time messaging after collab acceptance", color: "#2F6BFF" },
                  { icon: <Zap size={15} />, text: "Inline price negotiation counter-offer inside chat", color: "#f59e0b" },
                  { icon: <Shield size={15} />, text: "Contact details revealed only when both agree", color: "#10b981" },
                  { icon: <CheckCheck size={15} />, text: "Read receipts & message delivery status", color: "#2F6BFF" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 border border-[#e8edf5]"
                      style={{ color: f.color, background: `${f.color}12` }}
                    >
                      {f.icon}
                    </div>
                    <span className="text-[14px] text-[#374151]">{f.text}</span>
                  </div>
                ))}
              </motion.div>

              {/* Plan tiers */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="mt-10"
              >
                <p className="text-[#94a3b8] text-[11px] uppercase tracking-[2px] mb-3">Messages per day by plan</p>
                <div className="flex flex-wrap gap-2.5">
                  {PRICING_PLANS.map((plan) => {
                    const tierStyles: Record<string, { icon: React.ReactNode; bg: string; border: string; labelColor: string; limitColor: string }> = {
                      Free:       { icon: <Lock size={11} />,           bg: "#f1f5f9", border: "#e2e8f0", labelColor: "#94a3b8", limitColor: "#94a3b8" },
                      Basic:      { icon: <MessageCircle size={11} />,  bg: "#EBF2FF", border: "#bfdbfe", labelColor: "#64748b", limitColor: "#2F6BFF" },
                      Pro:        { icon: <Zap size={11} />,            bg: "#fffbeb", border: "#fde68a", labelColor: "#64748b", limitColor: "#d97706" },
                      Enterprise: { icon: <Sparkles size={11} />,       bg: "#f0fdf4", border: "#bbf7d0", labelColor: "#64748b", limitColor: "#10b981" },
                    };
                    const style = tierStyles[plan.name] || tierStyles.Basic;
                    const limit = plan.dailyMessageLimit === undefined || plan.dailyMessageLimit === 0
                      ? "Locked"
                      : plan.dailyMessageLimit === -1
                      ? "Unlimited"
                      : `${plan.dailyMessageLimit} / day`;
                    const tier = { label: plan.name, limit, ...style };
                    return (
                    <div
                      key={tier.label}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] border transition-all duration-300"
                      style={{
                        background: tier.bg,
                        borderColor: activePlan === tier.label ? tier.limitColor : tier.border,
                        color: tier.limitColor,
                        boxShadow: activePlan === tier.label
                          ? `0 0 0 2px ${tier.limitColor}33, 0 4px 14px ${tier.limitColor}22`
                          : "none",
                        transform: activePlan === tier.label ? "scale(1.04)" : "scale(1)",
                      }}
                    >
                      {tier.icon}
                      <span
                        className="text-[11px]"
                        style={{
                          color: activePlan === tier.label ? tier.limitColor : tier.labelColor,
                          fontWeight: activePlan === tier.label ? 700 : 400,
                        }}
                      >
                        {tier.label}
                      </span>
                      <span className="text-[11px]" style={{ fontWeight: activePlan === tier.label ? 600 : 400 }}>
                        {tier.limit}
                      </span>
                      {activePlan === tier.label && (
                        <span
                          className="ml-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full"
                          style={{ background: tier.limitColor }}
                        >
                          <Check size={8} strokeWidth={3} color="#fff" />
                        </span>
                      )}
                    </div>
                  );
                  })}
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35 }}
                className="mt-10"
              >
                <Link
                  to="/signup?role=brand"
                  className="inline-flex items-center gap-2.5 px-7 py-4 text-white rounded-full hover:opacity-90 transition-all text-[15px] group/btn"
                  style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
                >
                  Start messaging creators
                  <ArrowRight size={15} className="group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </div>

            {/* ── Right: mock chat window ── */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
              className="w-full lg:w-[420px] shrink-0 lg:self-stretch flex items-center justify-center p-6 lg:p-10 border-t lg:border-t-0 lg:border-l border-[#e2e8f0] bg-[#f4f7fb]"
            >
              <div className="w-full max-w-[380px] rounded-[20px] overflow-hidden border border-white/[0.08] shadow-2xl" style={{ background: "#111218" }}>

                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]" style={{ background: "#0d0e14" }}>
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-[#2F6BFF]/30">
                      <ImageWithFallback src="https://images.unsplash.com/photo-1667382137969-a11fd256717d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjB3b21hbiUyMGxpZmVzdHlsZSUyMGluZmx1ZW5jZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzI2MTQ0Njd8MA&ixlib=rb-4.1.0&q=80&w=1080" alt="Priya Sharma" className="w-full h-full object-cover" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10b981] rounded-full ring-2 ring-[#0d0e14]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] truncate">Priya Sharma</p>
                    <p className="text-white/35 text-[11px]">Online · Lifestyle Creator</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#10b981]" style={{ animation: "pulse 2s ease-in-out infinite" }} />
                    <span className="text-[10px] text-[#10b981]">Live</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-4 space-y-3 min-h-[260px]">

                  {/* Brand message */}
                  <div className="flex justify-end">
                    <div className="max-w-[78%]">
                      <div className="px-3.5 py-2.5 rounded-[14px] rounded-br-[4px] text-[13px] text-white" style={{ background: "linear-gradient(135deg, #1a3a8f, #2F6BFF)" }}>
                        Hi! 👋 Loved your latest content. Interested in a collab for our new serum launch?
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-white/25">9:42 AM</span>
                        <CheckCheck size={11} className="text-[#6BA9FF]" />
                      </div>
                    </div>
                  </div>

                  {/* Influencer message */}
                  <div className="flex justify-start">
                    <div className="max-w-[78%]">
                      <div className="px-3.5 py-2.5 rounded-[14px] rounded-bl-[4px] text-[13px] text-white/85 bg-white/[0.07] border border-white/[0.06]">
                        That sounds amazing! 🎉 What are the deliverables?
                      </div>
                      <span className="text-[10px] text-white/25 mt-1 block">9:43 AM</span>
                    </div>
                  </div>

                  {/* Brand — price proposal card */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="px-3.5 py-2.5 rounded-[14px] rounded-br-[4px] text-[13px] text-white mb-1.5" style={{ background: "linear-gradient(135deg, #1a3a8f, #2F6BFF)" }}>
                        3 Reels + 5 Stories. Here's our offer:
                      </div>
                      <div className="rounded-[14px] rounded-br-[4px] border border-[#f59e0b]/30 overflow-hidden" style={{ background: "#1a160a" }}>
                        <div className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Zap size={11} className="text-[#f59e0b]" />
                            <span className="text-[10px] text-[#f59e0b] uppercase tracking-wide">Price Proposal</span>
                          </div>
                          <p className="text-white text-[20px] tracking-tight">₹25,000</p>
                          <p className="text-white/35 text-[11px]">for 3 Reels + 5 Stories</p>
                        </div>
                        <div className="flex border-t border-[#f59e0b]/20">
                          <button className="flex-1 py-2 text-[11px] text-[#ef4444] hover:bg-white/[0.04] transition-colors">Decline</button>
                          <div className="w-px bg-[#f59e0b]/20" />
                          <button className="flex-1 py-2 text-[11px] text-[#f59e0b] hover:bg-white/[0.04] transition-colors">Counter</button>
                          <div className="w-px bg-[#f59e0b]/20" />
                          <button className="flex-1 py-2 text-[11px] text-[#10b981] hover:bg-white/[0.04] transition-colors">Accept</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-white/25">9:44 AM</span>
                        <CheckCheck size={11} className="text-[#6BA9FF]" />
                      </div>
                    </div>
                  </div>

                  {/* Influencer — counter offer */}
                  <div className="flex justify-start">
                    <div className="max-w-[78%]">
                      <div className="px-3.5 py-2.5 rounded-[14px] rounded-bl-[4px] text-[13px] text-white/85 bg-white/[0.07] border border-white/[0.06]">
                        Love it! Could we do <span className="text-[#10b981]">₹28,000</span>? I'll throw in an extra Story 🙌
                      </div>
                      <span className="text-[10px] text-white/25 mt-1 block">9:46 AM</span>
                    </div>
                  </div>

                  {/* Typing indicator */}
                  <div className="flex justify-end items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-white/20">Brand is typing</span>
                    <div className="flex gap-1 items-end">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF]/50"
                          style={{ animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="px-4 py-3 border-t border-white/[0.06]" style={{ background: "#0d0e14" }}>
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.06]">
                    <span className="text-white/20 text-[13px] flex-1 select-none">Type a message…</span>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0F3D91, #2F6BFF)" }}>
                      <Send size={13} className="text-white" />
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-white/15 mt-2">Pro plan · 87 messages remaining today</p>
                </div>

              </div>
            </motion.div>

          </div>
        </motion.div>
      </section>

      {/* ========== CONSENT-ONLY CONTACT SHARING ========== */}
      <section className="py-16 lg:py-24 px-5 sm:px-8 lg:px-[100px] relative overflow-hidden">
        {/* BG blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] opacity-[0.04]"
            style={{ background: "radial-gradient(circle at 20% 30%, #10b981, transparent 65%)" }} />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-[0.04]"
            style={{ background: "radial-gradient(circle at 80% 80%, #2F6BFF, transparent 65%)" }} />
        </div>

        <div className="max-w-[1200px] mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="text-center mb-14"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#EBF2FF] border border-[#c7dbff] text-[#2F6BFF] text-[11px] uppercase tracking-[3px] mb-6">
              <Shield size={12} />
              Privacy First
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-[#0a090f] text-[32px] sm:text-[44px] lg:text-[54px] !leading-[1.05] tracking-[-1.5px] mb-4">
              Contact details shared{" "}
              <span className="bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] bg-clip-text text-transparent">
                only with consent
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#64748b] text-[17px] leading-[28px] max-w-[560px] mx-auto">
              No one's contact info is ever revealed automatically. Both sides must explicitly agree before anything is shared keeping every collaboration safe.
            </motion.p>
          </motion.div>

          {/* Main content: flow steps + mock UI */}
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

            {/* Left: Step flow */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
              className="flex-1 space-y-4"
            >
              {[
                {
                  step: "01",
                  icon: <Users size={18} />,
                  color: "#2F6BFF",
                  bg: "#EBF2FF",
                  border: "#c7dbff",
                  title: "Collaboration accepted",
                  desc: "Once an influencer accepts a brand's request, both sides are connected but contact details remain hidden.",
                },
                {
                  step: "02",
                  icon: <MessageSquare size={18} />,
                  color: "#f59e0b",
                  bg: "#fffbeb",
                  border: "#fde68a",
                  title: "Either side can request contact",
                  desc: "Either the brand or the influencer can initiate a contact-share request from their dashboard or directly inside chat.",
                },
                {
                  step: "03",
                  icon: <Shield size={18} />,
                  color: "#8b5cf6",
                  bg: "#f5f3ff",
                  border: "#ddd6fe",
                  title: "Other party reviews & consents",
                  desc: "The recipient sees a clear consent prompt, Share My Contact or Decline. No pressure, no auto-reveal.",
                },
                {
                  step: "04",
                  icon: <Check size={18} />,
                  color: "#10b981",
                  bg: "#ecfdf5",
                  border: "#a7f3d0",
                  title: "Both contacts revealed mutually",
                  desc: "Once accepted, both parties' email and phone are shown simultaneously. Declined? No details are shared at all.",
                },
              ].map((item) => (
                <motion.div
                  key={item.step}
                  variants={fadeUp}
                  className="flex items-start gap-4 p-5 rounded-2xl border bg-white hover:shadow-md transition-shadow duration-300"
                  style={{ borderColor: item.border }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: item.bg, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] tracking-widest" style={{ color: item.color }}>STEP {item.step}</span>
                    </div>
                    <h4 className="text-[#0a090f] text-[15px] mb-1">{item.title}</h4>
                    <p className="text-[#64748b] text-[13px] leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Right: Mock consent UI */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="w-full lg:w-[400px] shrink-0"
            >
              <div className="rounded-[24px] border border-[#e2e8f0] bg-white shadow-[0_8px_40px_rgba(15,61,145,0.1)] overflow-hidden">

                {/* Header */}
                <div className="px-5 py-4 border-b border-[#f1f5f9] flex items-center gap-3 bg-[#f8f9fc]">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0F3D91] to-[#2F6BFF] flex items-center justify-center shrink-0">
                    <Shield size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#0a090f]">Contact Sharing Request</p>
                    <p className="text-[11px] text-[#94a3b8]">From NovaSkin Beauty → Ananya Kapoor</p>
                  </div>
                </div>

                {/* States stack */}
                <div className="p-5 space-y-4">

                  {/* State: Brand requests */}
                  <div className="rounded-xl bg-[#EBF2FF] border border-[#c7dbff] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={13} className="text-[#2F6BFF]" />
                      <span className="text-[11px] text-[#1e40af] uppercase tracking-wide">Brand Request Sent</span>
                    </div>
                    <p className="text-[13px] text-[#1e40af]">
                      <span className="font-semibold">NovaSkin Beauty</span> wants to exchange contact details with you.
                    </p>
                    <p className="text-[11px] text-[#64748b] mt-1">Details will only be revealed after you consent.</p>
                  </div>

                  {/* State: Influencer consent buttons */}
                  <div className="rounded-xl border border-[#e2e8f0] p-4">
                    <p className="text-[12px] text-[#64748b] mb-3">Influencer's response:</p>
                    <div className="flex gap-2.5">
                      <div className="flex-1 py-2.5 rounded-xl bg-[#2F6BFF] text-white text-[12px] flex items-center justify-center gap-1.5 shadow-sm">
                        <Check size={12} strokeWidth={2.5} /> Share My Contact
                      </div>
                      <div className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[#ef4444] text-[12px] flex items-center justify-center gap-1.5">
                        <span>✕</span> Decline
                      </div>
                    </div>
                  </div>

                  {/* State: Shared result */}
                  <div className="rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 rounded-full bg-[#10b981] flex items-center justify-center shrink-0">
                        <Check size={11} className="text-white" strokeWidth={2.5} />
                      </span>
                      <span className="text-[12px] text-[#059669]">Contact details shared ✅</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <div className="rounded-lg bg-white border border-[#d1fae5] p-2.5">
                        <p className="text-[10px] text-[#94a3b8] uppercase mb-1.5">Influencer</p>
                        <p className="text-[#1a1a2e]">📧 ananya@mail.com</p>
                        <p className="text-[#1a1a2e] mt-0.5">📞 +91 98765 43210</p>
                      </div>
                      <div className="rounded-lg bg-white border border-[#bfdbfe] p-2.5">
                        <p className="text-[10px] text-[#94a3b8] uppercase mb-1.5">Brand</p>
                        <p className="text-[#1a1a2e]">📧 hello@novaskin.in</p>
                        <p className="text-[#1a1a2e] mt-0.5">📞 +91 80000 12345</p>
                      </div>
                    </div>
                  </div>

                  {/* Declined state teaser */}
                  <div className="rounded-xl bg-[#fef2f2] border border-[#fecaca] p-3 flex items-center gap-2.5">
                    <span className="text-[#ef4444] text-[16px]">🛡️</span>
                    <p className="text-[12px] text-[#ef4444]">If declined zero details are shared. Full privacy guaranteed.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== BRAND VERIFICATION BADGE ========== */}
      <section className="py-16 lg:py-24 px-5 sm:px-8 lg:px-[100px] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9fc] to-white" />
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] opacity-[0.06]"
            style={{ background: "radial-gradient(ellipse at center, #2F6BFF, transparent 65%)" }} />
          <div className="absolute inset-0 opacity-[0.18]"
            style={{ backgroundImage: "radial-gradient(circle, #2F6BFF20 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        </div>

        <div className="max-w-[1200px] mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="text-center mb-14"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#EBF2FF] border border-[#c7dbff] text-[#2F6BFF] text-[11px] uppercase tracking-[3px] mb-6">
              <BadgeCheck size={12} />
              Brand Trust
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-[#0a090f] text-[32px] sm:text-[44px] lg:text-[54px] !leading-[1.05] tracking-[-1.5px] mb-4">
              Brands earn a{" "}
              <span className="bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] bg-clip-text text-transparent">
                Verified Badge
              </span>{" "}too
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[#64748b] text-[17px] leading-[28px] max-w-[540px] mx-auto">
              It's not just influencers who get verified. Brands that pass FLUBN's checks receive a Verified Brand badge giving creators the confidence to collaborate.
            </motion.p>
          </motion.div>

          {/* Two-column layout */}
          <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16">

            {/* Left: Mock brand profile card */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="w-full lg:w-[420px] shrink-0"
            >
              <div
                className="relative rounded-[24px] overflow-hidden p-7 text-white"
                style={{ background: "linear-gradient(135deg, #080d1a 0%, #0F3D91 55%, #1a4fb5 100%)" }}
              >
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-[0.06]"
                  style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                <div className="absolute top-[-80px] right-[-60px] w-[280px] h-[280px] rounded-full opacity-20"
                  style={{ background: "radial-gradient(circle, #6BA9FF, transparent 70%)" }} />

                <div className="relative z-10">
                  {/* Brand logo area */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-[16px] bg-white flex items-center justify-center shrink-0 shadow-lg">
                      <span className="text-[#2F6BFF] text-[18px]">NS</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-[17px]">NovaSkin Beauty</span>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] tracking-wide"
                          style={{ background: "rgba(47,107,255,0.25)", border: "1px solid rgba(107,169,255,0.5)", color: "#a5caff" }}
                        >
                          <BadgeCheck size={10} />
                          VERIFIED BRAND
                        </span>
                      </div>
                      <p className="text-white/50 text-[13px] mt-0.5">Beauty &amp; Skincare · Mumbai, IN</p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: "Campaigns", value: "24" },
                      { label: "Creators hired", value: "87" },
                      { label: "Avg. rating", value: "4.9 ⭐" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-white/[0.07] border border-white/10 p-3 text-center">
                        <p className="text-white text-[18px]">{s.value}</p>
                        <p className="text-white/40 text-[10px] mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Verification criteria */}
                  <div className="space-y-2">
                    {[
                      "Business registration verified",
                      "GST / tax ID confirmed",
                      "Active subscription (Basic+)",
                      "Zero payment disputes",
                    ].map((c) => (
                      <div key={c} className="flex items-center gap-2.5 text-[13px]">
                        <span className="w-4 h-4 rounded-full bg-[#10b981] flex items-center justify-center shrink-0">
                          <Check size={9} className="text-white" strokeWidth={3} />
                        </span>
                        <span className="text-white/80">{c}</span>
                      </div>
                    ))}
                  </div>

                  {/* Glowing badge display */}
                  <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(47,107,255,0.15)", border: "1px solid rgba(107,169,255,0.3)" }}>
                    <BadgeCheck size={22} style={{ color: "#6BA9FF", filter: "drop-shadow(0 0 6px rgba(107,169,255,0.9))" }} />
                    <div>
                      <p className="text-white text-[13px]">Verified Brand</p>
                      <p className="text-white/40 text-[11px]">Admin-reviewed &amp; approved · 2026</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: benefit points */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
              className="flex-1 space-y-5"
            >
              <motion.div variants={fadeUp}>
                <h3 className="text-[#0a090f] text-[24px] sm:text-[30px] !leading-[1.15] tracking-[-0.5px] mb-4">
                  What the Verified Brand badge means
                </h3>
                <p className="text-[#64748b] text-[15px] leading-[26px] mb-6">
                  Our admin team reviews every brand's business credentials, payment history, and collaboration track record before granting the badge. It signals to influencers that this brand is safe, serious, and trustworthy.
                </p>
              </motion.div>

              {[
                {
                  icon: <Shield size={18} />,
                  color: "#2F6BFF",
                  bg: "#EBF2FF",
                  title: "Business identity confirmed",
                  desc: "Company registration and tax ID are validated by FLUBN's admin team, no self-certification shortcuts.",
                },
                {
                  icon: <BadgeCheck size={18} />,
                  color: "#10b981",
                  bg: "#ecfdf5",
                  title: "Visible on every brand profile",
                  desc: "The glowing Verified badge appears next to the brand name on their profile, on collaboration requests, and in chat so influencers always know at a glance.",
                },
                {
                  icon: <Star size={18} />,
                  color: "#f59e0b",
                  bg: "#fffbeb",
                  title: "Builds influencer confidence",
                  desc: "Verified brands see higher acceptance rates. Creators are significantly more likely to accept requests from a brand they know has passed FLUBN's checks.",
                },
                {
                  icon: <Award size={18} />,
                  color: "#8b5cf6",
                  bg: "#f5f3ff",
                  title: "Admin-only cannot be self-assigned",
                  desc: "Like influencer verification, the brand badge is purely admin-granted. No brand can purchase or self-award this badge it must be earned.",
                },
              ].map((item) => (
                <motion.div
                  key={item.title}
                  variants={fadeUp}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-[#e8edf5] bg-white hover:shadow-md transition-shadow duration-300 hover:border-transparent"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: item.bg, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[#0a090f] text-[14px] mb-1">{item.title}</h4>
                    <p className="text-[#64748b] text-[13px] leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}

              <motion.div variants={fadeUp} className="pt-2">
                <Link
                  to="/signup?role=brand"
                  className="inline-flex items-center gap-2.5 px-7 py-4 text-white rounded-full hover:opacity-90 transition-all text-[15px] group/btn"
                  style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
                >
                  Sign up as Brand
                  <ArrowRight size={15} className="group-hover/btn:translate-x-1 transition-transform" />
                </Link>
                <p className="text-[12px] text-[#94a3b8] mt-3">Requires Basic plan or above · Admin review within 48 hrs</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== FEATURED CREATORS ========== */}
      <FeaturedCreators />

      {/* ========== TRUST BADGES ========== */}
      <section className="py-20 lg:py-28 px-5 sm:px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#eef2ff] via-white to-white" />
          <div
            className="absolute top-[-15%] right-[-8%] w-[700px] h-[700px] opacity-[0.09]"
            style={{ background: "radial-gradient(ellipse at center, rgba(47,107,255,1), transparent 65%)" }}
          />
          <div
            className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] opacity-[0.06]"
            style={{ background: "radial-gradient(ellipse at center, rgba(15,61,145,1), transparent 65%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage: "radial-gradient(circle, #2F6BFF28 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>

        <div className="max-w-[1200px] mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0F3D91]/10 to-[#2F6BFF]/10 border border-[#2F6BFF]/20 rounded-full px-5 py-2 mb-6">
              <BadgeCheck size={14} className="text-[#2F6BFF]" />
              <span className="text-[13px] tracking-wide text-[#2F6BFF] font-medium">VERIFIED QUALITY</span>
            </div>
            <h2 className="text-[#0a090f] text-[32px] sm:text-[42px] lg:text-[52px] !leading-[1.1] tracking-[-1px] mb-4">
              Trust Badges That{" "}
              <span className="bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] bg-clip-text text-transparent">
                Matter
              </span>
            </h2>
            <p className="text-black/60 text-[17px] mt-4 max-w-[580px] mx-auto leading-[28px]">
              Every badge is earned not bought. We verify and recognize top-performing influencers who consistently deliver quality, reliability, and results.
            </p>
          </motion.div>

          {/* Featured "Verified Creator" — flagship dark hero card */}
          {(() => {
            const iconMap: Record<string, any> = { BadgeCheck, Star, Zap, Award, TrendingUp, Sparkles, Heart, Shield };
            const featured = TRUST_BADGES.find(b => b.id === "tb1" && b.status === "active");
            if (!featured) return null;
            const FeaturedIcon = iconMap[featured.icon];
            return (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="relative overflow-hidden bg-[#0a090f] rounded-[28px] p-8 sm:p-10 mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-7"
              >
                <div className="absolute top-[-40%] right-[-8%] w-[450px] h-[450px] pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at center, rgba(15,61,145,0.45), transparent 60%)" }} />
                <div className="absolute bottom-[-40%] left-[-5%] w-[350px] h-[350px] pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at center, rgba(47,107,255,0.2), transparent 60%)" }} />
                <div className="absolute inset-0 opacity-[0.045] pointer-events-none"
                  style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />

                {/* Large circular badge */}
                <div className="relative flex-shrink-0 z-10">
                  <div
                    className="w-[84px] h-[84px] rounded-full flex items-center justify-center"
                    style={{
                      background: `radial-gradient(circle at 38% 35%, ${featured.color}66, ${featured.color}1e)`,
                      border: `2.5px solid ${featured.color}70`,
                      boxShadow: `0 0 0 10px ${featured.color}14, 0 14px 32px ${featured.color}44`,
                    }}
                  >
                    {FeaturedIcon && <FeaturedIcon size={34} style={{ color: featured.color }} />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-[#0a090f] p-[3px] shadow-lg">
                    <BadgeCheck size={17} style={{ color: featured.color, display: "block" }} />
                  </div>
                </div>

                {/* Text */}
                <div className="relative z-10 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-white text-[22px] font-semibold">{featured.name}</h3>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] tracking-widest font-medium"
                      style={{ background: `${featured.color}22`, color: featured.color, border: `1px solid ${featured.color}45` }}
                    >
                      FLAGSHIP
                    </span>
                  </div>
                  <p className="text-white/55 text-[15px] leading-relaxed mb-5">{featured.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {featured.criteria.map((c, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 text-[12px] text-white/65 bg-white/[0.07] border border-white/10 px-3 py-1.5 rounded-full"
                      >
                        <Check size={10} className="text-[#2F6BFF]" strokeWidth={3} />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* Remaining 6 badges — 3-column grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {TRUST_BADGES.filter(b => b.id !== "tb1" && b.status === "active").map((badge) => {
              const iconMap: Record<string, any> = { BadgeCheck, Star, Zap, Award, TrendingUp, Sparkles, Heart, Shield };
              const BadgeIcon = iconMap[badge.icon];
              return (
                <motion.div
                  key={badge.id}
                  variants={fadeUp}
                  className="group relative bg-white rounded-2xl border border-[#e2e8f0] p-5 hover:shadow-xl hover:border-transparent transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 15% 15%, ${badge.color}0d, transparent 65%)` }}
                  />
                  <div
                    className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, transparent, ${badge.color}90, transparent)` }}
                  />

                  <div className="relative flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300"
                        style={{
                          background: `radial-gradient(circle at 38% 35%, ${badge.color}55, ${badge.color}18)`,
                          border: `2px solid ${badge.color}58`,
                          boxShadow: `0 0 0 5px ${badge.color}0e, 0 6px 16px ${badge.color}28`,
                        }}
                      >
                        {BadgeIcon && <BadgeIcon size={18} style={{ color: badge.color }} />}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-[2px] shadow-md">
                        <BadgeCheck size={11} style={{ color: badge.color, display: "block" }} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-[#1a1a2e] text-[15px] font-semibold mb-1.5">{badge.name}</h3>
                      <p className="text-[#64748b] text-[13px] leading-relaxed">{badge.description}</p>
                    </div>
                  </div>

                  <div className="relative mt-4 pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                    <span className="text-[11px] text-[#94a3b8]">{badge.criteria.length} criteria to earn</span>
                    <div className="flex gap-1">
                      {badge.criteria.map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full transition-all duration-300 group-hover:scale-125"
                          style={{ backgroundColor: `${badge.color}70` }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mt-12"
          >
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] text-white rounded-xl hover:shadow-lg hover:shadow-[#2F6BFF]/25 transition-all duration-300 hover:-translate-y-0.5"
            >
              <span>Discover Verified Influencers</span>
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="py-20 lg:py-28 px-5 sm:px-8">
        <div className="max-w-[1200px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <h2 className="text-[#0a090f] text-[32px] sm:text-[42px] lg:text-[52px] !leading-[1.1] tracking-[-1px]">
              Simple, transparent pricing
            </h2>
            <p className="text-black/60 text-[17px] mt-4 max-w-[500px] mx-auto leading-[28px]">
              Choose the plan that fits your brand. Creators always join free.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-5 max-w-[1000px] mx-auto"
          >
            {pricingPlans.map((plan) => {
              const isFree = plan.name === "Free";
              const isPopular = plan.popular;

              return (
                <motion.div
                  key={plan.id}
                  variants={scaleIn}
                  className={`relative rounded-[20px] p-8 overflow-hidden flex flex-col h-full ${
                    isPopular
                      ? "text-white"
                      : isFree
                      ? "bg-[#f8f9fc] border border-[#e2e8f0]"
                      : "bg-white border border-[#e2e8f0] shadow-[1px_1px_30px_0px_rgba(0,0,0,0.06)]"
                  }`}
                  style={isPopular ? { background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" } : {}}
                >
                  {isPopular && (
                    <>
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                      <div className="absolute -top-1 right-6 bg-[#fbbf24] text-[#0a090f] text-[12px] px-4 py-1.5 rounded-b-[8px] tracking-wide font-[600]">
                        Popular
                      </div>
                    </>
                  )}
                  <h3 className={`text-[20px] ${isPopular ? "text-white" : "text-[#0a090f]"}`}>{plan.name}</h3>
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-[40px] tracking-tight ${isPopular ? "text-white" : "text-[#0a090f]"}`}>
                        {isFree ? "Free" : `₹${plan.price.toLocaleString()}`}
                      </span>
                      <span className={`text-[16px] ${isPopular ? "text-white/50" : "text-black/40"}`}>
                        {isFree ? "forever" : "/month"}
                      </span>
                    </div>
                    {!isFree && plan.yearlyPrice && (
                      <div className="mt-2 space-y-1">
                        <div className={`text-[12px] px-2 py-1 rounded-full inline-block ${
                          isPopular ? "bg-white/20 text-white" : "bg-[#ecfdf5] text-[#10b981]"
                        }`}>
                          Save ₹{((plan.price * 12) - plan.yearlyPrice).toLocaleString()}/year
                        </div>
                        <p className={`text-[13px] ${isPopular ? "text-white/50" : "text-black/40"}`}>
                          Billed ₹{plan.yearlyPrice.toLocaleString()} annually
                        </p>
                      </div>
                    )}

                    {/* Collaboration & Chat limit badges */}
                    {!isFree && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {plan.campaignTemplates !== undefined && (
                          <span className={`inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg ${
                            isPopular
                              ? "bg-white/20 text-white"
                              : plan.campaignTemplates === -1
                              ? "bg-[#ecfdf5] text-[#10b981]"
                              : plan.campaignTemplates === 0
                              ? "bg-[#fef2f2] text-[#ef4444]"
                              : "bg-[#faf5ff] text-[#8b5cf6]"
                          }`}>
                            <Target size={11} />
                            {plan.campaignTemplates === -1 ? "Unlimited" : plan.campaignTemplates === 0 ? "No" : plan.campaignTemplates} templates
                          </span>
                        )}
                        {plan.collaborationLimit && (
                          <span className={`inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg ${
                            isPopular ? "bg-white/20 text-white" : "bg-[#EBF2FF] text-[#2F6BFF]"
                          }`}>
                            <Send size={11} />
                            {plan.collaborationLimit} requests/mo
                          </span>
                        )}
                        {plan.dailyMessageLimit !== undefined && (
                          <span className={`inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg ${
                            isPopular
                              ? "bg-white/20 text-white"
                              : plan.dailyMessageLimit === 0
                              ? "bg-[#fef2f2] text-[#ef4444]"
                              : plan.dailyMessageLimit === -1
                              ? "bg-[#ecfdf5] text-[#10b981]"
                              : "bg-[#f5f3ff] text-[#7c3aed]"
                          }`}>
                            {plan.dailyMessageLimit === -1 ? <Infinity size={11} /> : <MessageSquare size={11} />}
                            {plan.dailyMessageLimit === -1
                              ? "Unlimited chat"
                              : plan.dailyMessageLimit === 0
                              ? "No chat access"
                              : `${plan.dailyMessageLimit} msgs/day`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className={`text-[15px] mt-3 leading-[24px] ${isPopular ? "text-white/60" : "text-black/60"}`}>
                    {plan.description}
                  </p>
                  <ul className="mt-6 space-y-3 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className={`flex items-start gap-2 text-[15px] ${isPopular ? "text-white/80" : "text-black/70"}`}>
                        <Check size={16} className={`mt-0.5 shrink-0 ${isFree ? "text-[#10b981]" : isPopular ? "text-white" : "text-[#2F6BFF]"}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={isFree ? "/signup?role=influencer" : "/signup?role=brand"}
                    className={`block text-center mt-8 py-4 rounded-full transition-all text-[16px] ${
                      isPopular
                        ? "bg-white text-[#2F6BFF] hover:bg-white/90 font-[500] shadow-xl"
                        : isFree
                        ? "border-2 border-[#e2e8f0] text-black/50 hover:border-[#2F6BFF] hover:text-[#2F6BFF]"
                        : "border-2 border-[#2F6BFF] text-[#2F6BFF] hover:bg-[#EBF2FF]"
                    }`}
                  >
                    {isFree ? "Join Free" : "Start Subscription"}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="py-16 lg:py-24 px-5 sm:px-8">
        <div className="max-w-[1200px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <h2 className="text-[#0a090f] text-[32px] sm:text-[42px] !leading-[1.1]">
              Loved by brands & creators
            </h2>
            <Link
              to="/about"
              className="inline-flex items-center gap-1.5 text-[#2F6BFF] text-[14px] mt-3 hover:underline transition-all"
            >
              View all reviews
              <ArrowRight size={14} />
            </Link>
          </motion.div>

          <div className="testimonials-carousel">
            {testimonials.length > 0 ? (
              <Slider
                dots={true}
                infinite={true}
                speed={700}
                slidesToShow={1}
                slidesToScroll={1}
                autoplay={true}
                autoplaySpeed={4500}
                pauseOnHover={true}
                fade={true}
                cssEase="ease-in-out"
              >
                {testimonials.map((t) => (
                  <div key={t.id} className="px-4 sm:px-16 lg:px-32 h-full">
                    <div className="bg-white rounded-[20px] p-7 border border-[#e2e8f0] shadow-[1px_1px_20px_0px_rgba(0,0,0,0.04)] hover:shadow-[1px_1px_30px_0px_rgba(0,0,0,0.08)] transition-shadow flex flex-col h-full">
                      {/* Decorative quote mark */}
                      <div className="text-[44px] leading-none text-[#e2e8f0] mb-1 select-none">&ldquo;</div>

                      {/* Stars */}
                      <div className="flex gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={15} className={s <= (t.rating || 5) ? "fill-[#fbbf24] text-[#fbbf24]" : "text-[#e2e8f0]"} />
                        ))}
                      </div>

                      {/* Quote — clamped to 4 lines for consistent card heights */}
                      <p className="text-black/65 leading-[27px] text-[15px] flex-1 line-clamp-4">{t.quote}</p>

                      <div className="mt-6 pt-5 border-t border-[#e2e8f0]">
                        <div className="flex items-center gap-3">
                          {/* Avatar with colour glow */}
                          <div className="relative shrink-0">
                            <div
                              className="absolute inset-0 rounded-full blur-[6px] opacity-40"
                              style={{
                                background: t.type === "influencer"
                                  ? "linear-gradient(135deg, #7c3aed, #a78bfa)"
                                  : "linear-gradient(135deg, #0F3D91, #2F6BFF)"
                              }}
                            />
                            {t.profileImage ? (
                              <img
                                src={t.profileImage}
                                alt={t.name}
                                className="relative w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-md"
                              />
                            ) : (
                              <div
                                className="relative w-11 h-11 rounded-full text-white flex items-center justify-center text-[14px] shadow-md ring-2 ring-white"
                                style={{
                                  background: t.type === "influencer"
                                    ? "linear-gradient(135deg, #7c3aed 0%, #a78bfa 60%, #c4b5fd 100%)"
                                    : "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)"
                                }}
                              >
                                {t.avatar}
                              </div>
                            )}
                          </div>

                          {/* Name + role */}
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] text-[#0a090f] font-[600] truncate">{t.name}</div>
                            <div className="text-[12px] text-black/40 truncate mt-0.5">{t.role}</div>
                          </div>

                          {/* Type pill — right-aligned */}
                          <span
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-[500]"
                            style={{
                              background: t.type === "influencer"
                                ? "linear-gradient(135deg, #7c3aed22, #a78bfa22)"
                                : "linear-gradient(135deg, #0F3D9122, #2F6BFF22)",
                              color: t.type === "influencer" ? "#7c3aed" : "#2F6BFF"
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: t.type === "influencer" ? "#8b5cf6" : "#2F6BFF" }}
                            />
                            {t.type === "influencer" ? "Creator" : "Brand"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </Slider>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#94a3b8] text-sm">No featured testimonials yet. Check back soon!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section className="py-16 lg:py-24 px-5 sm:px-8">
        <div className="max-w-[800px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <h2 className="text-[#0a090f] text-[32px] sm:text-[42px] !leading-[1.1]">
              Frequently asked questions
            </h2>
            <p className="text-black/50 text-[17px] mt-4">
              Everything you need to know about Flubn.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="space-y-3"
          >
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                variants={fadeUp}
                className={`rounded-[16px] border overflow-hidden transition-all duration-300 ${
                  openFaq === index
                    ? "bg-[#f4f4f4] border-black/10 shadow-sm"
                    : "bg-white border-[#e2e8f0] hover:border-black/15"
                }`}
              >
                <button
                  className="w-full flex items-center justify-between p-6 text-left"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <h3 className="text-[#0a090f] pr-4 text-[16px]">{faq.q}</h3>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      openFaq === index
                        ? "text-white"
                        : "bg-[#f4f4f4] text-black/30"
                    }`}
                    style={openFaq === index ? { background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" } : undefined}
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-300 ${openFaq === index ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-black/60 text-[15px] leading-[26px]">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========== GRADIENT FOOTER WRAPPER ========== */}
      <section className="px-5 pb-0">
        <div className="rounded-t-[8px] p-[5px] pt-[5px]" style={{ background: "linear-gradient(180deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
          <div className="bg-[#0a090f] rounded-t-0">
            <Footer />
          </div>
        </div>
      </section>
    </div>
  );
}