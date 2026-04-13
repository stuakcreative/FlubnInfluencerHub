import { Link } from "react-router";
import { motion } from "motion/react";
import { Check, ArrowRight, Sparkles, Send, MessageSquare, Infinity, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { getActivePricingPlans } from "../utils/dataManager";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

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

export default function Pricing() {
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Load pricing plans from localStorage
  useEffect(() => {
    const plans = getActivePricingPlans();
    console.log("💰 Pricing page loading data:", { plans });
    setPricingPlans(plans);

    // Listen for updates from admin panel
    const handlePricingUpdate = () => {
      const updatedPlans = getActivePricingPlans();
      console.log("🔔 Pricing page received update:", updatedPlans);
      setPricingPlans(updatedPlans);
    };

    // Listen for storage changes (works across tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "flubn_pricing_plans") {
        const updatedPlans = getActivePricingPlans();
        console.log("🔔 Pricing page received storage update:", updatedPlans);
        setPricingPlans(updatedPlans);
      }
    };

    // Listen for custom event (works in same tab)
    window.addEventListener("pricingPlansUpdated", handlePricingUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("pricingPlansUpdated", handlePricingUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white font-['Inter',sans-serif]">
      {/* Navbar */}
      <Navbar />
      
      {/* Hero Section */}
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
                <Sparkles size={14} className="text-[#6BA9FF]" />
                Simple & Transparent Pricing
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-white text-[42px] sm:text-[56px] lg:text-[72px] !leading-[1] tracking-[-2px]">
                Plans that scale with{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #2F6BFF 0%, #6BA9FF 100%)" }}>
                  your growth
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-white/50 text-[17px] leading-[28px] mt-6 max-w-[520px] mx-auto">
                Choose the plan that fits your brand. Creators always join free. No hidden fees, cancel anytime.
              </motion.p>

              {/* Billing Toggle */}
              <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-5 py-2.5 rounded-xl text-[15px] transition-all ${
                    billingCycle === "monthly"
                      ? "bg-white text-[#0a090f] shadow-lg"
                      : "bg-white/10 text-white/60 border border-white/10 hover:bg-white/15"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-5 py-2.5 rounded-xl text-[15px] transition-all whitespace-nowrap inline-flex items-center ${
                    billingCycle === "yearly"
                      ? "bg-white text-[#0a090f] shadow-lg"
                      : "bg-white/10 text-white/60 border border-white/10 hover:bg-white/15"
                  }`}
                >
                  Yearly
                  <span className="ml-2 text-xs bg-[#10b981] text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                    Save up to 20%
                  </span>
                </button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 lg:py-20 px-5 sm:px-8">
        <div className="max-w-[1200px] mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="grid md:grid-cols-3 gap-5 max-w-[1000px] mx-auto"
          >
            {pricingPlans.map((plan, index) => {
              const isFree = plan.name === "Free";
              const isPopular = plan.popular;
              
              const displayPrice = billingCycle === "yearly" && plan.yearlyPrice
                ? Math.round(plan.yearlyPrice / 12)
                : plan.price;

              return (
                <motion.div
                  key={plan.id}
                  variants={scaleIn}
                  transition={{ duration: 0.25, delay: index * 0.06 }}
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
                        {isFree ? "Free" : `₹${displayPrice.toLocaleString()}`}
                      </span>
                      <span className={`text-[16px] ${isPopular ? "text-white/50" : "text-black/40"}`}>
                        {isFree ? "forever" : billingCycle === "yearly" ? "/mo" : "/month"}
                      </span>
                    </div>
                    
                    {!isFree && plan.yearlyPrice && billingCycle === "yearly" && (
                      <div className="mt-2 space-y-1">
                        <div className={`text-[12px] px-2 py-1 rounded-full inline-block ${
                          isPopular ? "bg-white/20 text-white" : "bg-[#ecfdf5] text-[#10b981]"
                        }`}>
                          Save ₹{((plan.price * 12) - plan.yearlyPrice).toLocaleString()}/year
                        </div>
                      </div>
                    )}
                    
                    {!isFree && billingCycle === "yearly" && plan.yearlyPrice && (
                      <p className={`text-[13px] mt-2 ${isPopular ? "text-white/50" : "text-black/40"}`}>
                        Billed ₹{plan.yearlyPrice.toLocaleString()} annually
                      </p>
                    )}
                  </div>

                  {/* Collaboration & Chat limits */}
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

                  <p className={`text-[15px] mt-3 leading-[24px] ${isPopular ? "text-white/60" : "text-black/60"}`}>
                    {plan.description}
                  </p>
                  <ul className="mt-6 space-y-3 flex-1">
                    {plan.features.map((feature: string) => (
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

      {/* FAQ Section */}
      <section className="py-20 px-5 sm:px-8 bg-white">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <h2 className="text-[#0a090f] text-[36px] sm:text-[42px] !leading-[1.2] tracking-[-1px] mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-black/60 text-[16px]">
              Everything you need to know about our pricing
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="space-y-4"
          >
            {[
              {
                q: "Can I switch plans at any time?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, debit cards, UPI, and net banking for Indian customers."
              },
              {
                q: "Is there a contract or commitment?",
                a: "No long-term contracts required. You can cancel your subscription at any time with no cancellation fees."
              },
              {
                q: "Do you offer refunds?",
                a: "Yes, we offer a 7-day money-back guarantee for all new subscriptions if you're not satisfied."
              },
              {
                q: "Are there any hidden fees?",
                a: "No hidden fees. The price you see is what you pay. All features within your plan are included."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                className="bg-[#f8f9fc] border border-[#e2e8f0] rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-[#0a090f] text-[18px] font-semibold mb-2">
                  {faq.q}
                </h3>
                <p className="text-black/60 text-[15px] leading-[26px]">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="max-w-[800px] mx-auto text-center rounded-[32px] p-12 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <h2 className="text-white text-[32px] sm:text-[42px] !leading-[1.2] tracking-[-1px] mb-4">
              Ready to get started?
            </h2>
            <p className="text-white/80 text-[16px] mb-8 max-w-[500px] mx-auto">
              Join thousands of brands and creators building successful collaborations on FLUBN.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup?role=influencer"
                className="px-8 py-4 bg-white text-[#2F6BFF] rounded-full text-[16px] font-medium hover:bg-white/90 transition-all shadow-xl"
              >
                Join as Creator
              </Link>
              <Link
                to="/signup?role=brand"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-full text-[16px] font-medium hover:bg-white/20 transition-all"
              >
                Join as Brand
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}