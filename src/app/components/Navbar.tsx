import image_36e9d26213447b2de3f782dd680e42364845966c from 'figma:asset/36e9d26213447b2de3f782dd680e42364845966c.png'
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, X, LogOut, User } from "lucide-react";
import logoImg from "figma:asset/e7264dfc47b30ea75f1117a681656d8a7b208e0d.png";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { useSiteSettings } from "../context/SiteSettingsContext";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { getLogoUrl } = useSiteSettings();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
    setMobileOpen(false);
  };

  const navLinks = [
    { label: "Discover", to: "/discover" },
    { label: "Pricing", to: "/pricing" },
    { label: "About", to: "/about" },
    { label: "Blog", to: "/blog" },
    { label: "Contact", to: "/contact" },
  ];

  return (
    <nav className="sticky top-0 z-50">
      <div className="mx-4 sm:mx-6 lg:mx-[44px] mt-0">
        <div className="bg-white/80 backdrop-blur-xl rounded-b-[20px] border-x border-b border-[#e2e8f0]/60 shadow-[0_1px_18px_0_rgba(0,0,0,0.06)]">
          <div className="px-6 sm:px-8 flex items-center justify-between h-[68px]">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img src={getLogoUrl() || image_36e9d26213447b2de3f782dd680e42364845966c} alt="Flubn" className="h-10 w-auto" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="px-5 py-2 text-[#0a090f] text-[16px] hover:text-[#2F6BFF] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  {user?.profilePicture ? (
                    <Link to={`/${user.role}`} className="flex items-center gap-2">
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover object-center border-2 border-[#e2e8f0]"
                      />
                    </Link>
                  ) : (
                    <Link
                      to={`/${user?.role}`}
                      className="w-9 h-9 rounded-full bg-[#EBF2FF] flex items-center justify-center text-[#2F6BFF] hover:bg-[#2F6BFF]/20 transition-colors"
                    >
                      <User size={18} />
                    </Link>
                  )}
                  <button
                    className="px-5 py-2.5 text-white rounded-full hover:opacity-90 transition-opacity text-[15px] shadow-[1px_1px_17px_0px_rgba(10,9,15,0.3)] flex items-center gap-2"
                    style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="px-5 py-2 text-[#0a090f] text-[16px] hover:text-[#2F6BFF] transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="px-5 py-2.5 text-white rounded-full hover:opacity-90 transition-opacity text-[15px] shadow-[1px_1px_17px_0px_rgba(10,9,15,0.3)]"
                    style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
                  >
                    Join now
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-[#0a090f] hover:bg-[#f4f4f4] rounded-xl transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden pb-5 border-t border-[#e2e8f0] mx-6 pt-4">
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="px-4 py-3 rounded-xl text-[#0a090f] text-[16px] hover:bg-[#f4f4f4] transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex gap-3 mt-4">
                  {isAuthenticated ? (
                    <div className="flex items-center gap-3">
                      <Link
                        to="/profile"
                        className="flex-1 text-center px-4 py-3 text-[#0a090f] border border-[#e2e8f0] rounded-xl text-[15px]"
                        onClick={() => setMobileOpen(false)}
                      >
                        <User size={20} />
                      </Link>
                      <button
                        className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl text-[15px] font-medium hover:opacity-90 active:scale-95 transition-all whitespace-nowrap"
                        style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
                        onClick={handleLogout}
                      >
                        <LogOut size={15} />
                        Log out
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Link
                        to="/login"
                        className="flex-1 text-center px-4 py-3 text-[#0a090f] border border-[#e2e8f0] rounded-xl text-[15px]"
                        onClick={() => setMobileOpen(false)}
                      >
                        Log in
                      </Link>
                      <Link
                        to="/signup"
                        className="flex-1 text-center px-4 py-3 text-white rounded-xl text-[15px] whitespace-nowrap"
                        style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}
                        onClick={() => setMobileOpen(false)}
                      >
                        Get Started
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}