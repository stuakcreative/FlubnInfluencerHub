import { Link } from "react-router";
import { Instagram, Twitter, Linkedin, Mail, Phone, MapPin, ArrowRight, Send, Facebook, Youtube, MessageCircle } from "lucide-react";
import logoImg from "figma:asset/e7264dfc47b30ea75f1117a681656d8a7b208e0d.png";
import { useFooter } from "../context/FooterContext";
import { useStatistics } from "../context/StatisticsContext";
import { useSiteSettings } from "../context/SiteSettingsContext";

export function Footer() {
  const { footerData } = useFooter();
  const { stats } = useStatistics();
  const { getLogoUrl, getDarkLogoUrl } = useSiteSettings();

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram size={16} />;
      case "twitter":
        return <Twitter size={16} />;
      case "linkedin":
        return <Linkedin size={16} />;
      case "facebook":
        return <Facebook size={16} />;
      case "youtube":
        return <Youtube size={16} />;
      default:
        return <Instagram size={16} />;
    }
  };

  return (
    <footer id="footer" className="bg-[#0a090f] text-white relative overflow-hidden">
      {/* Subtle background gradient accents */}
      <div
        className="absolute top-0 left-0 w-[40%] h-[50%] opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(15,61,145,0.5), transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[35%] h-[40%] opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 100% 100%, rgba(47,107,255,0.4), transparent 70%)" }}
      />

      <div className="relative z-10 max-w-[1300px] mx-auto px-8 sm:px-10 lg:px-[40px]">
        {/* Newsletter CTA Banner */}
        <div className="py-12 lg:py-16 border-b border-white/[0.08]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-[480px]">
              <h3 className="text-white text-[28px] sm:text-[36px] !leading-[1.1] tracking-[-0.5px]">
                {footerData.ctaTitle}
              </h3>
              <p className="text-white/75 text-[15px] leading-[24px] mt-3">
                Join {stats.influencersDisplay} creators and {stats.brandsDisplay} brands already collaborating on Flubn.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Link
                to="/signup?role=brand"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 text-white rounded-full hover:opacity-90 transition-all text-[15px] group"
                style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
              >
                Get started as Brand
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/signup?role=influencer"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 text-white/80 rounded-full border border-white/[0.12] hover:border-white/25 hover:text-white transition-all text-[15px]"
              >
                Join as Creator
              </Link>
            </div>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="py-12 lg:py-14 grid grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-4">
            <div className="flex items-center gap-2.5 mb-5">
              <img src={getDarkLogoUrl() || logoImg} alt="Flubn" className="h-12 w-auto" />
            </div>
            <p className="text-white/70 text-[14px] leading-[23px] max-w-[280px]">
              {footerData.brandDescription}
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-6">
              {footerData.socialLinks
                .filter((social) => social.enabled)
                .map((social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.platform}
                    className="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.12] hover:border-white/[0.15] transition-all duration-300"
                  >
                    {getSocialIcon(social.platform)}
                  </a>
                ))}
            </div>
          </div>

          {/* Dynamic Sections */}
          {footerData.sections.map((section) => (
            <div key={section.id} className="col-span-1 lg:col-span-2">
              <h4 className="text-white/70 text-[13px] tracking-[0.08em] uppercase mb-5">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.id}>
                    {link.url.startsWith("http") ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/70 text-[14px] hover:text-white transition-colors duration-300"
                      >
                        {link.label}
                      </a>
                    ) : link.url === "#" ? (
                      <span className="text-white/70 text-[14px]">{link.label}</span>
                    ) : (
                      <Link
                        to={link.url}
                        className="text-white/70 text-[14px] hover:text-white transition-colors duration-300"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div className="col-span-2 lg:col-span-4">
            <h4 className="text-white/70 text-[13px] tracking-[0.08em] uppercase mb-5">Get in touch</h4>
            <div className="space-y-3.5">
              <a
                href={`mailto:${footerData.contactInfo.email}`}
                className="flex items-center gap-3 text-white/70 hover:text-white transition-colors duration-300 group"
              >
                <div className="w-8 h-8 rounded-[8px] bg-white/[0.05] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-white/[0.1] group-hover:border-white/[0.12] transition-all">
                  <Mail size={14} className="text-white/50" />
                </div>
                <span className="text-[14px]">{footerData.contactInfo.email}</span>
              </a>
              <a
                href={`tel:${footerData.contactInfo.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3 text-white/70 hover:text-white transition-colors duration-300 group"
              >
                <div className="w-8 h-8 rounded-[8px] bg-white/[0.05] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-white/[0.1] group-hover:border-white/[0.12] transition-all">
                  <Phone size={14} className="text-white/50" />
                </div>
                <span className="text-[14px]">{footerData.contactInfo.phone}</span>
              </a>
              {footerData.contactInfo.whatsapp && (
                <a
                  href={`https://wa.me/${footerData.contactInfo.whatsapp.replace(/[\s+\-()]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-white/70 hover:text-white transition-colors duration-300 group"
                >
                  <div className="w-8 h-8 rounded-[8px] bg-white/[0.05] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-[#25D366]/20 group-hover:border-[#25D366]/30 transition-all">
                    <MessageCircle size={14} className="text-white/50 group-hover:text-[#25D366]" />
                  </div>
                  <span className="text-[14px]">WhatsApp</span>
                </a>
              )}
              <div className="flex items-center gap-3 text-white/70">
                <div className="w-8 h-8 rounded-[8px] bg-white/[0.05] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-white/50" />
                </div>
                <span className="text-[14px]">{footerData.contactInfo.address}</span>
              </div>
            </div>

            {/* Stats badge */}
            <div className="flex items-center gap-3 mt-7">
              <div
                className="h-[34px] rounded-l-[8px] px-4 flex items-center text-white text-[12px] font-[600]"
                style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}
              >
                {stats.influencersDisplay} Creators
              </div>
              <div className="h-[34px] bg-white/[0.06] rounded-r-[8px] px-3.5 flex items-center text-white/60 text-[12px] font-[600] border border-white/[0.08] -ml-3">
                Verified ✓
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/[0.08] py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/65 text-[13px]">{footerData.copyright}</p>
          <div className="flex items-center gap-6">
            {footerData.legalLinks.map((link) => (
              <Link
                key={link.id}
                to={link.url}
                className="text-white/60 text-[13px] hover:text-white/90 transition-colors duration-300"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}