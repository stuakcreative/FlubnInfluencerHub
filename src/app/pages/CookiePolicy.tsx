import { useFooter } from "../context/FooterContext";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export default function CookiePolicy() {
  const { footerData } = useFooter();

  return (
    <div className="min-h-screen bg-[#0a090f] text-white">
      <Navbar />
      <div className="max-w-[900px] mx-auto px-6 py-20">
        <h1 className="text-4xl mb-8">Cookie Policy</h1>
        <div className="space-y-6 text-white/70 leading-relaxed whitespace-pre-wrap">
          {footerData.legalPages?.cookiePolicy || "Cookie Policy content will appear here once configured by the admin."}
        </div>
      </div>
      <Footer />
    </div>
  );
}