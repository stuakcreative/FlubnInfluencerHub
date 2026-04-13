import { createBrowserRouter } from "react-router";
import RootLayout from "./components/RootLayout";
import Landing from "./pages/Landing";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import InfluencerPublicProfile from "./pages/InfluencerPublicProfile";
import Discover from "./pages/Discover";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import InfluencerLayout from "./components/InfluencerLayout";
import InfluencerDashboard from "./pages/influencer/Dashboard";
import InfluencerProfile from "./pages/influencer/Profile";
import InfluencerRequests from "./pages/influencer/Requests";
import InfluencerAnalytics from "./pages/influencer/Analytics";
import InfluencerSettings from "./pages/influencer/Settings";
import InfluencerTestimonials from "./pages/influencer/Testimonials";
import InfluencerChats from "./pages/influencer/Chats";
import BrandLayout from "./components/BrandLayout";
import BrandDashboard from "./pages/brand/Dashboard";
import BrandDiscover from "./pages/brand/Discover";
import BrandSentRequests from "./pages/brand/SentRequests";
import BrandFavorites from "./pages/brand/Favorites";
import BrandRatings from "./pages/brand/Ratings";
import BrandAnalytics from "./pages/brand/Analytics";
import BrandSubscription from "./pages/brand/Subscription";
import BrandSettings from "./pages/brand/Settings";
import BrandTestimonials from "./pages/brand/Testimonials";
import BrandChats from "./pages/brand/Chats";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminInfluencers from "./pages/admin/AdminInfluencers";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminCollaborations from "./pages/admin/AdminCollaborations";
import AdminRatings from "./pages/admin/AdminRatings";
import AdminBlogs from "./pages/admin/AdminBlogs";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminTestimonials from "./pages/admin/AdminTestimonials";
import AdminDeletionRequests from "./pages/admin/AdminDeletionRequests";
import AdminPaymentGateway from "./pages/admin/AdminPaymentGateway";
import AdminFooterSettings from "./pages/admin/AdminFooterSettings";
import AdminIPTracking from "./pages/admin/AdminIPTracking";
import AdminTrustBadges from "./pages/admin/TrustBadges";
import AdminSalesInquiries from "./pages/admin/AdminSalesInquiries";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminEmailCenter from "./pages/admin/AdminEmailCenter";
import AdminChatMonitor from "./pages/admin/AdminChatMonitor";
import AdminBrandVerification from "./pages/admin/AdminBrandVerification";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminTrustLogos from "./pages/admin/AdminTrustLogos";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        path: "/",
        Component: Landing,
      },
      {
        path: "/blog",
        Component: Blog,
      },
      {
        path: "/blog/:id",
        Component: BlogDetail,
      },
      {
        path: "/discover",
        Component: Discover,
      },
      {
        path: "/about",
        Component: About,
      },
      {
        path: "/pricing",
        Component: Pricing,
      },
      {
        path: "/contact",
        Component: Contact,
      },
      {
        path: "/signup",
        Component: Signup,
      },
      {
        path: "/login",
        Component: Login,
      },
      {
        path: "/influencer/view/:id",
        Component: InfluencerPublicProfile,
      },
      {
        path: "/:username",
        Component: InfluencerPublicProfile,
      },
      {
        path: "/influencer",
        Component: InfluencerLayout,
        children: [
          { index: true, Component: InfluencerDashboard },
          { path: "profile", Component: InfluencerProfile },
          { path: "requests", Component: InfluencerRequests },
          { path: "chats", Component: InfluencerChats },
          { path: "analytics", Component: InfluencerAnalytics },
          { path: "testimonials", Component: InfluencerTestimonials },
          { path: "settings", Component: InfluencerSettings },
        ],
      },
      {
        path: "/brand",
        Component: BrandLayout,
        children: [
          { index: true, Component: BrandDashboard },
          { path: "discover", Component: BrandDiscover },
          { path: "requests", Component: BrandSentRequests },
          { path: "chats", Component: BrandChats },
          { path: "favorites", Component: BrandFavorites },
          { path: "ratings", Component: BrandRatings },
          { path: "analytics", Component: BrandAnalytics },
          { path: "subscription", Component: BrandSubscription },
          { path: "testimonials", Component: BrandTestimonials },
          { path: "settings", Component: BrandSettings },
        ],
      },
      {
        path: "/admin",
        Component: AdminLayout,
        children: [
          { index: true, Component: AdminDashboard },
          { path: "users", Component: AdminUsers },
          { path: "influencers", Component: AdminInfluencers },
          { path: "brands", Component: AdminBrands },
          { path: "subscriptions", Component: AdminSubscriptions },
          { path: "collaborations", Component: AdminCollaborations },
          { path: "ratings", Component: AdminRatings },
          { path: "blogs", Component: AdminBlogs },
          { path: "payments", Component: AdminPayments },
          { path: "pricing", Component: AdminPricing },
          { path: "testimonials", Component: AdminTestimonials },
          { path: "trust-badges", Component: AdminTrustBadges },
          { path: "deletion-requests", Component: AdminDeletionRequests },
          { path: "payment-gateway", Component: AdminPaymentGateway },
          { path: "footer-settings", Component: AdminFooterSettings },
          { path: "ip-tracking", Component: AdminIPTracking },
          { path: "sales-inquiries", Component: AdminSalesInquiries },
          { path: "settings", Component: AdminSettings },
          { path: "email-center", Component: AdminEmailCenter },
          { path: "chat-monitor", Component: AdminChatMonitor },
          { path: "brand-verification", Component: AdminBrandVerification },
          { path: "coupons", Component: AdminCoupons },
          { path: "trust-logos", Component: AdminTrustLogos },
        ],
      },
      {
        path: "/privacy-policy",
        Component: PrivacyPolicy,
      },
      {
        path: "/terms-of-service",
        Component: TermsOfService,
      },
      {
        path: "/cookie-policy",
        Component: CookiePolicy,
      },
      {
        path: "*",
        Component: NotFound,
      },
    ],
  },
]);