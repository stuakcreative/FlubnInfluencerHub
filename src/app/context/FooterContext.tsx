import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as api from "../utils/api";

export interface FooterLink {
  id: string;
  label: string;
  url: string;
}

export interface SocialLink {
  id: string;
  platform: "instagram" | "twitter" | "linkedin" | "facebook" | "youtube";
  url: string;
  enabled: boolean;
}

export interface FooterSection {
  id: string;
  title: string;
  links: FooterLink[];
}

export interface ContactInfo {
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
}

export interface FooterData {
  brandDescription: string;
  socialLinks: SocialLink[];
  sections: FooterSection[];
  contactInfo: ContactInfo;
  ctaTitle: string;
  ctaDescription: string;
  stats: {
    creatorCount: string;
    verified: boolean;
  };
  copyright: string;
  legalLinks: FooterLink[];
  legalPages: {
    privacyPolicy: string;
    termsOfService: string;
    cookiePolicy: string;
  };
}

interface FooterContextType {
  footerData: FooterData;
  updateFooterData: (data: Partial<FooterData>) => void;
  updateSection: (sectionId: string, section: Partial<FooterSection>) => void;
  addLinkToSection: (sectionId: string, link: FooterLink) => void;
  removeLinkFromSection: (sectionId: string, linkId: string) => void;
  updateLinkInSection: (sectionId: string, linkId: string, link: Partial<FooterLink>) => void;
  updateSocialLink: (linkId: string, link: Partial<SocialLink>) => void;
  updateLegalLink: (linkId: string, link: Partial<FooterLink>) => void;
}

const FooterContext = createContext<FooterContextType | undefined>(undefined);

const initialFooterData: FooterData = {
  brandDescription: "India's premier influencer marketplace connecting brands with verified creators for meaningful collaborations.",
  socialLinks: [
    { id: "1", platform: "instagram", url: "https://instagram.com/flubn", enabled: true },
    { id: "2", platform: "twitter", url: "https://twitter.com/flubn", enabled: true },
    { id: "3", platform: "linkedin", url: "https://linkedin.com/company/flubn", enabled: true },
    { id: "4", platform: "facebook", url: "https://facebook.com/flubn", enabled: true },
  ],
  sections: [
    {
      id: "platform",
      title: "Platform",
      links: [
        { id: "p1", label: "Home", url: "/" },
        { id: "p2", label: "Discover", url: "/discover" },
        { id: "p3", label: "Pricing", url: "/pricing" },
        { id: "p4", label: "About", url: "/about" },
        { id: "p5", label: "Blog", url: "/blog" },
        { id: "p6", label: "Contact", url: "/contact" },
        { id: "p7", label: "For Brands", url: "/signup?role=brand" },
        { id: "p8", label: "For Creators", url: "/signup?role=influencer" },
      ],
    },
    {
      id: "features",
      title: "Features",
      links: [
        { id: "f1", label: "Advanced Filtering", url: "#" },
        { id: "f2", label: "Verified Profiles", url: "#" },
        { id: "f3", label: "Direct Collaboration", url: "#" },
        { id: "f4", label: "Contact Unlock", url: "#" },
        { id: "f5", label: "Analytics Dashboard", url: "#" },
        { id: "f6", label: "Subscription Plans", url: "#" },
      ],
    },
  ],
  contactInfo: {
    email: "hello@flubn.com",
    phone: "+91 98765 43210",
    whatsapp: "",
    address: "Mumbai, India",
  },
  ctaTitle: "Ready to grow your brand?",
  ctaDescription: "Join 12,500+ creators and hundreds of brands already collaborating on Flubn.",
  stats: {
    creatorCount: "12.5K+ Creators",
    verified: true,
  },
  copyright: "© 2026 Flubn. All rights reserved.",
  legalLinks: [
    { id: "l1", label: "Privacy Policy", url: "/privacy-policy" },
    { id: "l2", label: "Terms of Service", url: "/terms-of-service" },
    { id: "l3", label: "Cookie Policy", url: "/cookie-policy" },
  ],
  legalPages: {
    privacyPolicy: `Last updated: February 16, 2026

1. Information We Collect

At Flubn, we collect information that you provide directly to us when creating an account, including your name, email address, profile information, and any other information you choose to provide.

2. How We Use Your Information

We use the information we collect to provide, maintain, and improve our services, to communicate with you, to monitor and analyze trends and usage, and to personalize your experience on our platform.

3. Information Sharing

We do not sell your personal information. We may share your information with third-party service providers who assist us in operating our platform, conducting our business, or serving our users.

4. Data Security

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

5. Contact Us

If you have any questions about this Privacy Policy, please contact us at privacy@flubn.com`,
    termsOfService: `Last updated: February 16, 2026

1. Acceptance of Terms

By accessing and using Flubn, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.

2. Use License

Permission is granted to temporarily access Flubn for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.

3. User Accounts

You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.

4. Content Standards

Users must not post content that is defamatory, obscene, threatening, invasive of privacy, infringing of intellectual property rights, or otherwise injurious to third parties.

5. Termination

We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever including breach of the Terms.

6. Contact Information

For questions about the Terms of Service, please contact us at legal@flubn.com`,
    cookiePolicy: `Last updated: February 16, 2026

1. What Are Cookies

Cookies are small text files that are stored on your computer or mobile device when you visit our website. They help us make your visit to Flubn more useful by remembering your preferences.

2. How We Use Cookies

We use cookies to understand how you use our website, to remember your preferences, to personalize your experience, and to analyze our website traffic.

3. Types of Cookies We Use

• Essential Cookies: Required for the website to function properly
• Analytics Cookies: Help us understand how visitors interact with our website
• Preference Cookies: Remember your settings and preferences
• Marketing Cookies: Track your online activity to help advertisers deliver more relevant advertising

4. Managing Cookies

You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed. However, this may prevent you from taking full advantage of our website.

5. Contact Us

If you have questions about our use of cookies, please contact us at privacy@flubn.com`,
  },
};

export function FooterProvider({ children }: { children: ReactNode }) {
  const [footerData, setFooterData] = useState<FooterData>(initialFooterData);

  // Load from backend on mount
  useEffect(() => {
    api.getSettings("footer").then((data) => {
      if (data && typeof data === "object" && data.brandDescription) {
        setFooterData(data);
      }
    }).catch(() => {});
  }, []);

  /** Sync to backend */
  const syncFooter = (data: FooterData) => {
    api.saveSettings("footer", data).catch((err) => {
      if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && !err.message?.includes("Load failed")) {
        console.error("Footer sync error:", err.message);
      }
    });
  };

  const updateFooterData = (data: Partial<FooterData>) => {
    setFooterData((prev) => {
      const next = { ...prev, ...data };
      syncFooter(next);
      return next;
    });
  };

  const updateSection = (sectionId: string, section: Partial<FooterSection>) => {
    setFooterData((prev) => {
      const next = {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, ...section } : s
        ),
      };
      syncFooter(next);
      return next;
    });
  };

  const addLinkToSection = (sectionId: string, link: FooterLink) => {
    setFooterData((prev) => {
      const next = {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, links: [...s.links, link] } : s
        ),
      };
      syncFooter(next);
      return next;
    });
  };

  const removeLinkFromSection = (sectionId: string, linkId: string) => {
    setFooterData((prev) => {
      const next = {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId
            ? { ...s, links: s.links.filter((l) => l.id !== linkId) }
            : s
        ),
      };
      syncFooter(next);
      return next;
    });
  };

  const updateLinkInSection = (sectionId: string, linkId: string, link: Partial<FooterLink>) => {
    setFooterData((prev) => {
      const next = {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                links: s.links.map((l) => (l.id === linkId ? { ...l, ...link } : l)),
              }
            : s
        ),
      };
      syncFooter(next);
      return next;
    });
  };

  const updateSocialLink = (linkId: string, link: Partial<SocialLink>) => {
    setFooterData((prev) => {
      const next = {
        ...prev,
        socialLinks: prev.socialLinks.map((l) =>
          l.id === linkId ? { ...l, ...link } : l
        ),
      };
      syncFooter(next);
      return next;
    });
  };

  const updateLegalLink = (linkId: string, link: Partial<FooterLink>) => {
    setFooterData((prev) => {
      const next = {
        ...prev,
        legalLinks: prev.legalLinks.map((l) =>
          l.id === linkId ? { ...l, ...link } : l
        ),
      };
      syncFooter(next);
      return next;
    });
  };

  return (
    <FooterContext.Provider
      value={{
        footerData,
        updateFooterData,
        updateSection,
        addLinkToSection,
        removeLinkFromSection,
        updateLinkInSection,
        updateSocialLink,
        updateLegalLink,
      }}
    >
      {children}
    </FooterContext.Provider>
  );
}

export function useFooter() {
  const context = useContext(FooterContext);
  if (context === undefined) {
    // Return a safe fallback so components render outside of provider (e.g. Figma preview)
    return {
      footerData: initialFooterData,
      updateFooterData: () => {},
      updateSection: () => {},
      addLinkToSection: () => {},
      removeLinkFromSection: () => {},
      updateLinkInSection: () => {},
      updateSocialLink: () => {},
      updateLegalLink: () => {},
    } as FooterContextType;
  }
  return context;
}