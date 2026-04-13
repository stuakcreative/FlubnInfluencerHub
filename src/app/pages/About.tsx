import Slider from "react-slick";
import "../styles/slick-overrides.css";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Users, Zap, Shield, TrendingUp, Heart, Target, ArrowRight, Star, Quote } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useStatistics } from "../context/StatisticsContext";
import { useState, useEffect } from "react";
import { getAllApprovedTestimonials } from "../utils/dataManager";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

export default function About() {
  const { stats } = useStatistics();
  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    setTestimonials(getAllApprovedTestimonials());

    const handleUpdate = () => {
      setTestimonials(getAllApprovedTestimonials());
    };

    window.addEventListener("testimonialsUpdated", handleUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "flubn_testimonials") handleUpdate();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("testimonialsUpdated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white font-['Inter',sans-serif]">
      <Navbar />

      {/* Hero */}
      <section className="px-5 sm:px-8 lg:px-[100px] pt-8">
        <div className="relative overflow-hidden bg-[#0a090f] rounded-[30px] sm:rounded-[50px]">
          <div className="absolute inset-0">
            <div
              className="absolute top-0 right-0 w-[60%] h-full opacity-40"
              style={{ background: "radial-gradient(ellipse at 70% 40%, rgba(47,107,255,0.5), transparent 60%)" }}
            />
            <div
              className="absolute bottom-0 left-[20%] w-[40%] h-[60%] opacity-25"
              style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(107,169,255,0.4), transparent 70%)" }}
            />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-8 sm:px-12 lg:px-[80px] py-20 lg:py-32 text-center">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/80 px-4 py-1.5 rounded-full text-sm mb-6 border border-white/10">
                <Heart size={14} className="text-[#6BA9FF]" />
                Our Story
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-white text-[42px] sm:text-[56px] lg:text-[72px] !leading-[1] tracking-[-2px]">
                We connect brands with{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #2F6BFF 0%, #6BA9FF 100%)" }}>
                  creators
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-white/50 text-[17px] leading-[28px] mt-6 max-w-[560px] mx-auto">
                Flubn is India's premier influencer marketplace built to make collaborations simpler, faster, and more meaningful for everyone involved.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 lg:py-28 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
          >
            <motion.div variants={fadeUp}>
              <span className="text-[#2F6BFF] text-[13px] tracking-[0.1em] uppercase">Our Mission</span>
              <h2 className="text-[#0a090f] text-[32px] sm:text-[42px] !leading-[1.15] tracking-[-1px] mt-3">
                Democratizing influencer marketing in India
              </h2>
              <p className="text-black/60 text-[16px] leading-[27px] mt-6">
                We started Flubn because we saw a gap: brands struggled to find the right creators, and creators missed out on great opportunities. Our platform bridges that divide with transparency, verified profiles, and privacy-first design.
              </p>
              <p className="text-black/60 text-[16px] leading-[27px] mt-4">
                Every collaboration on Flubn starts with mutual consent <span className="text-[#0a090f] font-[600]">contact details only unlock after both sides agree</span>. This protects creators and ensures brands connect with genuinely interested partners.
              </p>
            </motion.div>
            <motion.div variants={scaleIn} className="rounded-[24px] overflow-hidden h-[380px]">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758873268663-5a362616b5a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwY3JlYXRpdmUlMjB0ZWFtJTIwY29sbGFib3JhdGlvbiUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NzA5ODIzOTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Team collaboration"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-24 px-5 sm:px-8 bg-[#f8f9fc]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <h2 className="text-[#0a090f] text-[32px] sm:text-[42px] !leading-[1.1] tracking-[-1px]">
              What we stand for
            </h2>
            <p className="text-black/50 text-[17px] mt-4 max-w-[480px] mx-auto">
              Our core values guide every feature we build and every decision we make.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {[
              { icon: <Shield size={22} />, title: "Privacy First", desc: "Creator contact details stay hidden until they accept a collaboration. No spam, no unsolicited messages." },
              { icon: <Users size={22} />, title: "Community Driven", desc: `${stats.verifiedInfluencersDisplay} verified creators and ${stats.brandsDisplay} brands building authentic partnerships together.` },
              { icon: <Target size={22} />, title: "Precision Matching", desc: "Advanced filters by category, location, platform, and audience size to find the perfect fit." },
              { icon: <Zap size={22} />, title: "Speed & Simplicity", desc: "Send collaboration requests in minutes, not days. Our streamlined workflow cuts the back-and-forth." },
              { icon: <TrendingUp size={22} />, title: "Data Transparency", desc: "Real-time analytics for both brands and creators track every campaign's performance openly." },
              { icon: <Heart size={22} />, title: "Fair for All", desc: "Creators join free, forever. Brands get transparent pricing with no hidden fees or surprise charges." },
            ].map((v) => (
              <motion.div
                key={v.title}
                variants={scaleIn}
                className="bg-white rounded-[20px] p-7 border border-[#e2e8f0] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-shadow"
              >
                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-5 text-white" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
                  {v.icon}
                </div>
                <h3 className="text-[#0a090f] text-[18px] mb-2">{v.title}</h3>
                <p className="text-black/50 text-[15px] leading-[24px]">{v.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 lg:py-24 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { value: stats.verifiedInfluencersDisplay, label: "Verified Creators" },
              { value: stats.brandsDisplay, label: "Active Brands" },
              { value: stats.collaborationsDisplay, label: "Collaborations" },
              { value: "98%", label: "Satisfaction Rate" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="text-center p-6"
              >
                <div className="text-[36px] sm:text-[44px] tracking-[-1px] bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
                  {stat.value}
                </div>
                <p className="text-black/50 text-[15px] mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 lg:py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
          >
            <motion.div variants={scaleIn} className="rounded-[24px] overflow-hidden h-[380px] order-2 lg:order-1">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1568658173325-c7b8a11d5666?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwZm91bmRlcnMlMjB0ZWFtJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzcwOTgyNDAwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Our team"
                className="w-full h-full object-cover"
              />
            </motion.div>
            <motion.div variants={fadeUp} className="order-1 lg:order-2">
              <span className="text-[#2F6BFF] text-[13px] tracking-[0.1em] uppercase">Our Team</span>
              <h2 className="text-[#0a090f] text-[32px] sm:text-[42px] !leading-[1.15] tracking-[-1px] mt-3">
                Built by marketers, for marketers
              </h2>
              <p className="text-black/60 text-[16px] leading-[27px] mt-6">
                Our team combines deep expertise in influencer marketing, product design, and technology. We've been on both sides as brand managers seeking the right voices, and as creators looking for meaningful partnerships.
              </p>
              <p className="text-black/60 text-[16px] leading-[27px] mt-4">
                Based in Chennai, we're passionate about empowering India's creator economy and making influencer marketing accessible to brands of every size.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 mt-8 px-7 py-4 text-white rounded-full hover:opacity-90 transition-all text-[16px] group"
                style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
              >
                Contact us
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========== TESTIMONIALS CAROUSEL ========== */}
      <section className="py-16 lg:py-24 px-5 sm:px-8 bg-[#f8f9fc]">
        <div className="max-w-[1200px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-[#2F6BFF] text-[13px] tracking-[0.1em] uppercase">Testimonials</span>
            <h2 className="text-[#0a090f] text-[32px] sm:text-[42px] !leading-[1.1] tracking-[-1px] mt-3">
              What our community says
            </h2>
            <p className="text-black/50 text-[17px] mt-4 max-w-[520px] mx-auto">
              Hear from the brands and creators who trust Flubn to power their collaborations.
            </p>
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
                {testimonials.map((t: any) => (
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
                <Quote size={40} className="text-[#e2e8f0] mx-auto mb-3" />
                <p className="text-[#94a3b8] text-sm">No testimonials yet. Check back soon!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 sm:px-8 lg:px-[100px] pb-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={scaleIn}
          className="relative rounded-[24px] overflow-hidden p-10 sm:p-14 lg:p-20 text-center"
          style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-white text-[32px] sm:text-[42px] !leading-[1.1] tracking-[-1px]">
              Ready to get started?
            </h2>
            <p className="text-white/60 text-[17px] mt-4 max-w-[460px] mx-auto leading-[28px]">
              Whether you're a brand looking for creators or a creator seeking partnerships - Flubn has you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link
                to="/signup?role=brand"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white text-[#0F3D91] rounded-full hover:bg-white/90 transition-all text-[16px] font-[500] shadow-xl"
              >
                Start as Brand
              </Link>
              <Link
                to="/signup?role=influencer"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 text-white rounded-full border border-white/25 hover:bg-white/10 transition-all text-[16px]"
              >
                Join as Creator
              </Link>
            </div>
          </div>
        </motion.div>
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