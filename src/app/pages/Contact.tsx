import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  Mail, Phone, MapPin, Send, Clock, MessageSquare,
  User, ChevronDown, Check, ArrowRight, Heart, Globe,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { toast } from "sonner";
import { useFooter } from "../context/FooterContext";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { CountryPhoneInput, COUNTRIES, getFullPhone, type Country } from "../components/CountryPhoneInput";

const SUBJECT_OPTIONS = [
  "General Inquiry",
  "Brand Partnership",
  "Creator Onboarding",
  "Pricing & Plans",
  "Technical Support",
  "Feedback & Suggestions",
  "Report an Issue",
  "Other",
];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function Contact() {
  const { footerData } = useFooter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Country code dropdown state
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // India default

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }
    if (formData.phone.trim()) {
      const digits = formData.phone.replace(/\D/g, "");
      if (digits.length > 0 && digits.length < selectedCountry.digits) {
        newErrors.phone = `${selectedCountry.name} numbers need ${selectedCountry.digits} digits`;
      }
    }
    if (!formData.subject) newErrors.subject = "Please select a subject";
    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (formatted: string) => {
    setFormData((prev) => ({ ...prev, phone: formatted }));
    if (errors.phone) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.phone;
        return copy;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSending(true);
    setTimeout(() => {
      const fullPhone = getFullPhone(formData.phone, selectedCountry) || "N/A";
      const inquiry = {
        id: `ci_${Date.now()}`,
        type: "contact" as const,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: fullPhone,
        subject: formData.subject,
        message: formData.message.trim(),
        status: "new" as const,
        submittedAt: new Date().toISOString(),
      };
      try {
        const existing = JSON.parse(localStorage.getItem("flubn_contact_inquiries") || "[]");
        existing.unshift(inquiry);
        localStorage.setItem("flubn_contact_inquiries", JSON.stringify(existing));
        window.dispatchEvent(new CustomEvent("contactInquiryUpdated", { detail: existing }));
        // Sync to backend
        import("../utils/api").then(api => api.submitInquiry(inquiry)).catch(() => {});
        setSubmitted(true);
        toast.success("Message sent successfully!", {
          description: "We'll get back to you within 24 hours.",
        });
      } catch {
        toast.error("Failed to send message. Please try again.");
      }
      setSending(false);
    }, 800);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const faqs = [
    {
      q: "How quickly will I get a response?",
      a: "Our team typically responds within 24 hours during business days. For urgent matters, we recommend calling us directly.",
    },
    {
      q: "Do you offer custom enterprise plans?",
      a: "Yes! If you're a brand looking for tailored features and pricing, our sales team can create a custom plan that fits your needs.",
    },
    {
      q: "How can I become a creator on FLUBN?",
      a: "Simply sign up as a creator on our platform. Once your profile is set up and verified, brands will be able to discover and collaborate with you.",
    },
    {
      q: "Is my data safe with FLUBN?",
      a: "Absolutely. We take data privacy seriously and follow industry-standard security practices. Read our Privacy Policy for more details.",
    },
    {
      q: "Can I schedule a demo of the platform?",
      a: "Of course! Just send us a message through this form with 'Demo Request' as the subject, and we'll set up a personalized walkthrough.",
    },
  ];

  return (
    <div className="min-h-screen bg-white font-['Inter',sans-serif]">
      <Navbar />

      {/* ========== HERO ========== */}
      <section className="px-5 sm:px-8 lg:px-[100px] pt-8">
        <div className="relative overflow-hidden bg-[#0a090f] rounded-[30px] sm:rounded-[50px]">
          {/* Gradient blobs */}
          <div className="absolute inset-0">
            <div
              className="absolute top-0 right-0 w-[60%] h-full opacity-40"
              style={{ background: "radial-gradient(ellipse at 70% 40%, rgba(47,107,255,0.5), transparent 60%)" }}
            />
            <div
              className="absolute bottom-0 left-[20%] w-[40%] h-[60%] opacity-25"
              style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(107,169,255,0.4), transparent 70%)" }}
            />
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-8 sm:px-12 lg:px-[80px] py-20 lg:py-28 text-center">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/80 px-4 py-1.5 rounded-full text-sm mb-6 border border-white/10">
                <Heart size={14} className="text-[#6BA9FF]" />
                We'd love to hear from you
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-white text-[42px] sm:text-[56px] lg:text-[72px] !leading-[1] tracking-[-2px]">
                Get in{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #2F6BFF 0%, #6BA9FF 100%)" }}>
                  Touch
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-white/50 text-[17px] leading-[28px] mt-6 max-w-[520px] mx-auto">
                Have questions about our platform? Want to discuss a partnership? We're here to help you succeed.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== CONTACT INFO CARDS ========== */}
      <section className="py-16 lg:py-20 px-5 sm:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-[0.06]"
            style={{ background: "radial-gradient(ellipse at center, rgba(47,107,255,0.6), transparent 70%)" }}
          />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16"
          >
            {[
              {
                icon: Mail,
                label: "Email Us",
                value: footerData.contactInfo.email,
                href: `mailto:${footerData.contactInfo.email}`,
                color: "#2F6BFF",
                bg: "#EBF2FF",
              },
              {
                icon: Phone,
                label: "Call Us",
                value: footerData.contactInfo.phone,
                href: `tel:${footerData.contactInfo.phone.replace(/\s/g, "")}`,
                color: "#10b981",
                bg: "#ecfdf5",
              },
              {
                icon: MapPin,
                label: "Visit Us",
                value: footerData.contactInfo.address,
                href: null,
                color: "#f59e0b",
                bg: "#fffbeb",
              },
              {
                icon: Clock,
                label: "Business Hours",
                value: "Mon - Sat, 9 AM - 7 PM IST",
                href: null,
                color: "#8b5cf6",
                bg: "#faf5ff",
              },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                variants={fadeUp}
                className="bg-white rounded-2xl border border-[#e8eaf0] p-6 hover:shadow-lg hover:border-[#d0d5dd] transition-all duration-300 group"
              >
                <div
                  className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: item.bg }}
                >
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <p className="text-[#94a3b8] text-[13px] uppercase tracking-[0.06em] mb-1">{item.label}</p>
                {item.href ? (
                  <a href={item.href} className="text-[#0a090f] text-[15px] hover:text-[#2F6BFF] transition-colors">
                    {item.value}
                  </a>
                ) : (
                  <p className="text-[#0a090f] text-[15px]">{item.value}</p>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* ========== FORM + IMAGE ========== */}
          <div className="grid lg:grid-cols-5 gap-10 items-start">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-3 order-2 lg:order-1"
            >
              <div className="bg-white rounded-[24px] border border-[#e8eaf0] p-6 sm:p-8 shadow-[0_1px_20px_rgba(0,0,0,0.04)]">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16"
                  >
                    <div className="w-20 h-20 rounded-full bg-[#ecfdf5] flex items-center justify-center mx-auto mb-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      >
                        <Check size={36} className="text-[#10b981]" />
                      </motion.div>
                    </div>
                    <h3 className="text-[#0a090f] text-2xl mb-3">Message Sent!</h3>
                    <p className="text-black/50 text-[15px] max-w-sm mx-auto mb-8">
                      Thank you for reaching out. Our team will review your message and get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#f8f9fc] border border-[#e2e8f0] rounded-xl text-[#0a090f] hover:bg-[#f1f3f9] transition-all text-sm"
                    >
                      Send Another Message
                      <ArrowRight size={14} />
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-11 h-11 rounded-[14px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
                        <Send size={17} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-[#0a090f] text-[19px]">Send us a Message</h3>
                        <p className="text-black/40 text-[13px]">Fill out the form and we'll be in touch soon.</p>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Name & Email */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[#0a090f] text-[13px] mb-2">Full Name <span className="text-[#ef4444]">*</span></label>
                          <div className="relative">
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0b8c9]" />
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => handleChange("name", e.target.value)}
                              placeholder="Your full name"
                              className={`w-full pl-10 pr-4 py-3 bg-[#f8f9fc] border rounded-xl text-sm text-[#0a090f] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] focus:bg-white transition-all ${
                                errors.name ? "border-[#ef4444]/50 bg-[#fef2f2]" : "border-[#e2e8f0]"
                              }`}
                            />
                          </div>
                          {errors.name && <p className="text-[#ef4444] text-xs mt-1.5">{errors.name}</p>}
                        </div>
                        <div>
                          <label className="block text-[#0a090f] text-[13px] mb-2">Email Address <span className="text-[#ef4444]">*</span></label>
                          <div className="relative">
                            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0b8c9]" />
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => handleChange("email", e.target.value)}
                              placeholder="you@example.com"
                              className={`w-full pl-10 pr-4 py-3 bg-[#f8f9fc] border rounded-xl text-sm text-[#0a090f] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] focus:bg-white transition-all ${
                                errors.email ? "border-[#ef4444]/50 bg-[#fef2f2]" : "border-[#e2e8f0]"
                              }`}
                            />
                          </div>
                          {errors.email && <p className="text-[#ef4444] text-xs mt-1.5">{errors.email}</p>}
                        </div>
                      </div>

                      {/* Phone & Subject */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[#0a090f] text-[13px] mb-2">Phone Number <span className="text-[#b0b8c9]">(optional)</span></label>
                          <CountryPhoneInput
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            selectedCountry={selectedCountry}
                            onCountryChange={setSelectedCountry}
                            hasError={!!errors.phone}
                          />
                          {errors.phone && <p className="text-[#ef4444] text-xs mt-1">{errors.phone}</p>}
                        </div>
                        <div>
                          <label className="block text-[#0a090f] text-[13px] mb-2">Subject <span className="text-[#ef4444]">*</span></label>
                          <div className="relative">
                            <MessageSquare size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0b8c9]" />
                            <select
                              value={formData.subject}
                              onChange={(e) => handleChange("subject", e.target.value)}
                              className={`w-full pl-10 pr-10 py-3 bg-[#f8f9fc] border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] focus:bg-white transition-all ${
                                errors.subject ? "border-[#ef4444]/50 bg-[#fef2f2]" : "border-[#e2e8f0]"
                              } ${!formData.subject ? "text-[#b0b8c9]" : "text-[#0a090f]"}`}
                            >
                              <option value="">Select a subject</option>
                              {SUBJECT_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b0b8c9] pointer-events-none" />
                          </div>
                          {errors.subject && <p className="text-[#ef4444] text-xs mt-1.5">{errors.subject}</p>}
                        </div>
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-[#0a090f] text-[13px] mb-2">Message <span className="text-[#ef4444]">*</span></label>
                        <textarea
                          value={formData.message}
                          onChange={(e) => handleChange("message", e.target.value)}
                          placeholder="Tell us how we can help you..."
                          rows={5}
                          className={`w-full px-4 py-3 bg-[#f8f9fc] border rounded-xl text-sm text-[#0a090f] placeholder:text-[#b0b8c9] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] focus:bg-white transition-all resize-none ${
                            errors.message ? "border-[#ef4444]/50 bg-[#fef2f2]" : "border-[#e2e8f0]"
                          }`}
                        />
                        <div className="flex items-center justify-between mt-1.5">
                          {errors.message ? (
                            <p className="text-[#ef4444] text-xs">{errors.message}</p>
                          ) : (
                            <span />
                          )}
                          <span className={`text-xs ${formData.message.length > 0 && formData.message.length < 10 ? "text-[#ef4444]/70" : "text-[#b0b8c9]"}`}>
                            {formData.message.length}/500
                          </span>
                        </div>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={sending}
                        className="w-full py-3.5 rounded-xl text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
                      >
                        {sending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send size={15} />
                            Send Message
                          </>
                        )}
                      </button>

                      <p className="text-black/30 text-xs text-center">
                        By submitting this form, you agree to our{" "}
                        <Link to="/privacy-policy" className="text-[#2F6BFF]/60 hover:text-[#2F6BFF] transition-colors">
                          Privacy Policy
                        </Link>
                        . We'll never share your information with third parties.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </motion.div>

            {/* Right Side — Image + Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="lg:col-span-2 space-y-5 order-1 lg:order-2"
            >
              {/* Image Card */}
              <div className="relative rounded-[24px] overflow-hidden border border-[#e8eaf0] h-[260px] shadow-[0_1px_20px_rgba(0,0,0,0.04)]">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1760611656007-f767a8082758?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB0ZWFtJTIwY29sbGFib3JhdGlvbiUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NzE0OTc0ODZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Flubn Team"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a090f]/70 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2F6BFF, #6BA9FF)" }}>
                      <Globe size={14} className="text-white" />
                    </div>
                    <span className="text-white text-[15px]">Serving brands & creators across India</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f8f9fc] rounded-2xl border border-[#e8eaf0] p-5 text-center">
                  <p className="text-[#0a090f] text-[28px] tracking-[-1px]">{"<"}24h</p>
                  <p className="text-black/40 text-[13px] mt-1">Response Time</p>
                </div>
                <div className="bg-[#f8f9fc] rounded-2xl border border-[#e8eaf0] p-5 text-center">
                  <p className="text-[#0a090f] text-[28px] tracking-[-1px]">98%</p>
                  <p className="text-black/40 text-[13px] mt-1">Satisfaction Rate</p>
                </div>
              </div>

              {/* CTA Card */}
              <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <h4 className="text-white text-[17px] mb-2">Looking for custom pricing?</h4>
                  <p className="text-white/60 text-[13px] leading-[20px] mb-4">
                    Enterprise plans tailored to your brand's needs with dedicated support.
                  </p>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 text-white text-sm bg-white/15 hover:bg-white/25 border border-white/20 px-4 py-2 rounded-xl transition-all"
                  >
                    View Plans <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== FAQ SECTION ========== */}
      <section className="py-16 lg:py-20 px-5 sm:px-8 bg-[#f8f9fc]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.span variants={fadeUp} className="text-[#2F6BFF] text-[13px] tracking-[0.1em] uppercase">
              Support
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-[#0a090f] text-[32px] sm:text-[42px] !leading-[1.15] tracking-[-1px] mt-3">
              Frequently Asked Questions
            </motion.h2>
            <motion.p variants={fadeUp} className="text-black/50 text-[16px] mt-4">
              Quick answers to common questions about FLUBN
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="space-y-3"
          >
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="bg-white rounded-2xl border border-[#e8eaf0] overflow-hidden hover:shadow-md transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="text-[#0a090f] text-[15px] pr-4">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-[#94a3b8] shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="px-6 pb-5"
                  >
                    <p className="text-black/50 text-[15px] leading-[26px]">{faq.a}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}