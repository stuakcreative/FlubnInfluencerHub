import { useState } from "react";
import { useFooter } from "../../context/FooterContext";
import { Plus, Trash2, Save, Instagram, Twitter, Linkedin, Facebook, Youtube } from "lucide-react";

export default function AdminFooterSettings() {
  const {
    footerData,
    updateFooterData,
    updateSection,
    addLinkToSection,
    removeLinkFromSection,
    updateLinkInSection,
    updateSocialLink,
    updateLegalLink,
  } = useFooter();

  const [activeTab, setActiveTab] = useState<"general" | "sections" | "contact" | "social" | "legal">("general");

  // Form states
  const [newLink, setNewLink] = useState<{ sectionId: string; label: string; url: string }>({
    sectionId: "",
    label: "",
    url: "",
  });

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
        return null;
    }
  };

  const handleAddLink = (sectionId: string) => {
    if (newLink.label && newLink.url) {
      addLinkToSection(sectionId, {
        id: Date.now().toString(),
        label: newLink.label,
        url: newLink.url,
      });
      setNewLink({ sectionId: "", label: "", url: "" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a090f] p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-white text-3xl mb-2">Footer Settings</h1>
          <p className="text-white/60">Manage footer content, links, and contact information</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "general", label: "General" },
            { id: "sections", label: "Link Sections" },
            { id: "contact", label: "Contact Info" },
            { id: "social", label: "Social Media" },
            { id: "legal", label: "Legal Links" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6 lg:p-8">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <label className="block text-white/70 mb-2">Brand Description</label>
                <textarea
                  value={footerData.brandDescription}
                  onChange={(e) => updateFooterData({ brandDescription: e.target.value })}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                  placeholder="Enter brand description..."
                />
              </div>

              <div>
                <label className="block text-white/70 mb-2">CTA Title</label>
                <input
                  type="text"
                  value={footerData.ctaTitle}
                  onChange={(e) => updateFooterData({ ctaTitle: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                  placeholder="Enter CTA title..."
                />
              </div>

              <div>
                <label className="block text-white/70 mb-2">CTA Description</label>
                <textarea
                  value={footerData.ctaDescription}
                  onChange={(e) => updateFooterData({ ctaDescription: e.target.value })}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                  placeholder="Enter CTA description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/70 mb-2">Creator Count Display</label>
                  <input
                    type="text"
                    value={footerData.stats.creatorCount}
                    onChange={(e) =>
                      updateFooterData({
                        stats: { ...footerData.stats, creatorCount: e.target.value },
                      })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                    placeholder="e.g., 12.5K+ Creators"
                  />
                </div>

                <div>
                  <label className="block text-white/70 mb-2">Copyright Text</label>
                  <input
                    type="text"
                    value={footerData.copyright}
                    onChange={(e) => updateFooterData({ copyright: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                    placeholder="© 2026 Flubn. All rights reserved."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sections Tab */}
          {activeTab === "sections" && (
            <div className="space-y-8">
              {footerData.sections.map((section) => (
                <div key={section.id} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="mb-4">
                    <label className="block text-white/70 mb-2">Section Title</label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                    />
                  </div>

                  <div className="space-y-3 mb-4">
                    {section.links.map((link) => (
                      <div key={link.id} className="flex gap-3 items-center">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) =>
                            updateLinkInSection(section.id, link.id, { label: e.target.value })
                          }
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) =>
                            updateLinkInSection(section.id, link.id, { url: e.target.value })
                          }
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                          placeholder="URL"
                        />
                        <button
                          onClick={() => removeLinkFromSection(section.id, link.id)}
                          className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newLink.sectionId === section.id ? newLink.label : ""}
                        onChange={(e) =>
                          setNewLink({ sectionId: section.id, label: e.target.value, url: newLink.url })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                        placeholder="New link label"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newLink.sectionId === section.id ? newLink.url : ""}
                        onChange={(e) =>
                          setNewLink({ sectionId: section.id, label: newLink.label, url: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                        placeholder="URL"
                      />
                    </div>
                    <button
                      onClick={() => handleAddLink(section.id)}
                      className="px-4 py-2 bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === "contact" && (
            <div className="space-y-6">
              <div>
                <label className="block text-white/70 mb-2">Email Address</label>
                <input
                  type="email"
                  value={footerData.contactInfo.email}
                  onChange={(e) =>
                    updateFooterData({
                      contactInfo: { ...footerData.contactInfo, email: e.target.value },
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                  placeholder="hello@flubn.com"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={footerData.contactInfo.phone}
                  onChange={(e) =>
                    updateFooterData({
                      contactInfo: { ...footerData.contactInfo, phone: e.target.value },
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-2">WhatsApp Number</label>
                <input
                  type="tel"
                  value={footerData.contactInfo.whatsapp || ""}
                  onChange={(e) =>
                    updateFooterData({
                      contactInfo: { ...footerData.contactInfo, whatsapp: e.target.value },
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                  placeholder="+91 98765 43210"
                />
                <p className="text-white/40 text-xs mt-2">
                  This number will be used for the WhatsApp chat link in the footer. Leave empty to hide.
                </p>
              </div>

              <div>
                <label className="block text-white/70 mb-2">Address</label>
                <input
                  type="text"
                  value={footerData.contactInfo.address}
                  onChange={(e) =>
                    updateFooterData({
                      contactInfo: { ...footerData.contactInfo, address: e.target.value },
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                  placeholder="Mumbai, India"
                />
              </div>
            </div>
          )}

          {/* Social Tab */}
          {activeTab === "social" && (
            <div className="space-y-4">
              {footerData.socialLinks.map((social) => (
                <div key={social.id} className="flex gap-3 items-center bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                    {getSocialIcon(social.platform)}
                  </div>
                  <div className="flex-1">
                    <div className="text-white/70 text-sm capitalize mb-1">{social.platform}</div>
                    <input
                      type="url"
                      value={social.url}
                      onChange={(e) => updateSocialLink(social.id, { url: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                      placeholder={`https://${social.platform}.com/flubn`}
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={social.enabled}
                      onChange={(e) => updateSocialLink(social.id, { enabled: e.target.checked })}
                      className="w-5 h-5 rounded bg-white/5 border-white/20 text-[#2F6BFF] focus:ring-[#2F6BFF]"
                    />
                    <span className="text-white/60 text-sm">Enabled</span>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Legal Tab */}
          {activeTab === "legal" && (
            <div className="space-y-6">
              {/* Legal Page Links */}
              <div>
                <h3 className="text-white text-lg mb-4">Legal Page Links</h3>
                <div className="space-y-4">
                  {footerData.legalLinks.map((link) => (
                    <div key={link.id} className="flex gap-3 items-center">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLegalLink(link.id, { label: e.target.value })}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                        placeholder="Label"
                      />
                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) => updateLegalLink(link.id, { url: e.target.value })}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50"
                        placeholder="URL"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10 my-8"></div>

              {/* Legal Page Content */}
              <div>
                <h3 className="text-white text-lg mb-4">Legal Page Content</h3>
                <div className="space-y-6">
                  {/* Privacy Policy Content */}
                  <div>
                    <label className="block text-white/70 mb-2">Privacy Policy Content</label>
                    <textarea
                      value={footerData.legalPages?.privacyPolicy || ""}
                      onChange={(e) =>
                        updateFooterData({
                          legalPages: {
                            ...(footerData.legalPages || {}),
                            privacyPolicy: e.target.value,
                            termsOfService: footerData.legalPages?.termsOfService || "",
                            cookiePolicy: footerData.legalPages?.cookiePolicy || "",
                          },
                        })
                      }
                      rows={12}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50 font-mono text-sm"
                      placeholder="Enter Privacy Policy content..."
                    />
                    <p className="text-white/40 text-xs mt-2">
                      Tip: Use line breaks to separate sections. Changes will be reflected on the Privacy Policy page.
                    </p>
                  </div>

                  {/* Terms of Service Content */}
                  <div>
                    <label className="block text-white/70 mb-2">Terms of Service Content</label>
                    <textarea
                      value={footerData.legalPages?.termsOfService || ""}
                      onChange={(e) =>
                        updateFooterData({
                          legalPages: {
                            ...(footerData.legalPages || {}),
                            privacyPolicy: footerData.legalPages?.privacyPolicy || "",
                            termsOfService: e.target.value,
                            cookiePolicy: footerData.legalPages?.cookiePolicy || "",
                          },
                        })
                      }
                      rows={12}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50 font-mono text-sm"
                      placeholder="Enter Terms of Service content..."
                    />
                    <p className="text-white/40 text-xs mt-2">
                      Tip: Use line breaks to separate sections. Changes will be reflected on the Terms of Service page.
                    </p>
                  </div>

                  {/* Cookie Policy Content */}
                  <div>
                    <label className="block text-white/70 mb-2">Cookie Policy Content</label>
                    <textarea
                      value={footerData.legalPages?.cookiePolicy || ""}
                      onChange={(e) =>
                        updateFooterData({
                          legalPages: {
                            ...(footerData.legalPages || {}),
                            privacyPolicy: footerData.legalPages?.privacyPolicy || "",
                            termsOfService: footerData.legalPages?.termsOfService || "",
                            cookiePolicy: e.target.value,
                          },
                        })
                      }
                      rows={12}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2F6BFF]/50 font-mono text-sm"
                      placeholder="Enter Cookie Policy content..."
                    />
                    <p className="text-white/40 text-xs mt-2">
                      Tip: Use line breaks to separate sections. Changes will be reflected on the Cookie Policy page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Notice */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-center gap-2 text-blue-400">
            <Save size={18} />
            <p className="text-sm">Changes are automatically saved and reflected in the footer instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}