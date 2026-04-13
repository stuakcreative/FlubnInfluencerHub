// ──────────────────────────────────────────────────────────────────────────────
// FLUBN — Production Data Definitions & Configuration Constants
// All user/content data is stored in Supabase + localStorage.
// This file contains ONLY type definitions, configuration constants, and
// empty default arrays for data that is created at runtime.
// ──────────────────────────────────────────────────────────────────────────────

// ── Influencers (populated via signup + admin) ──────────────────────────────
export const INFLUENCERS: any[] = [];

// ── Collaboration Requests (created at runtime) ─────────────────────────────
export const COLLABORATION_REQUESTS: any[] = [];

// ── Brand Sent Requests (created at runtime) ────────────────────────────────
export const BRAND_SENT_REQUESTS: any[] = [];

// ── Blog Posts (managed via admin CMS) ──────────────────────────────────────
export const BLOG_POSTS: any[] = [];

// ── Admin Users (populated via signup + admin) ──────────────────────────────
export const ADMIN_USERS: any[] = [];

// ── Ratings & Reviews ───────────────────────────────────────────────────────
export interface Rating {
  id: string;
  influencerId: string;
  influencerName: string;
  brandId: string;
  brandName: string;
  collaborationId: string;
  campaignName: string;
  communication: number;
  contentQuality: number;
  timeliness: number;
  professionalism: number;
  overallRating: number;
  review: string;
  createdDate: string;
  status: "approved" | "pending" | "rejected";
  adminNotes?: string;
}

export const RATINGS: Rating[] = [];

// ── Completed Collaborations ────────────────────────────────────────────────
export const COMPLETED_COLLABORATIONS: any[] = [];

// ── Account Deletion Requests ───────────────────────────────────────────────
export interface DeletionRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: "brand" | "influencer";
  reason: string;
  additionalNotes?: string;
  requestDate: string;
  status: "pending" | "approved" | "rejected";
  adminNotes?: string;
  processedDate?: string;
  processedBy?: string;
}

export const DELETION_REQUESTS: DeletionRequest[] = [];

// ── Testimonials ────────────────────────────────────────────────────────────
export interface TestimonialData {
  id: string;
  name: string;
  role: string;
  company?: string;
  quote: string;
  avatar: string;
  profileImage?: string;
  type: "brand" | "influencer";
  rating?: number;
  status: "active" | "inactive";
  featured: boolean;
  createdDate: string;
  submittedBy?: string;
  submissionStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

export const TESTIMONIALS_DATA: TestimonialData[] = [];

// Legacy testimonials format (derived)
export const TESTIMONIALS: { id: string; name: string; role: string; quote: string; avatar: string }[] = [];

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION CONSTANTS (not user data — keep these)
// ══════════════════════════════════════════════════════════════════════════════

export const CATEGORIES = [
  "All",
  "Fashion",
  "Beauty",
  "Technology",
  "Fitness",
  "Food",
  "Travel",
  "Lifestyle",
  "Gaming",
  "Education",
  "Music",
  "Sports",
  "Photography",
  "Art & Design",
  "Finance",
  "Health & Wellness",
  "Comedy",
  "Parenting",
  "Other",
];

export const LOCATIONS = [
  "All Locations",
  "Mumbai, India",
  "Delhi, India",
  "Bangalore, India",
  "Hyderabad, India",
  "Pune, India",
  "Jaipur, India",
  "Chennai, India",
  "Kolkata, India",
  "New York, USA",
  "Los Angeles, USA",
  "London, UK",
  "Dubai, UAE",
  "Singapore",
  "Toronto, Canada",
  "Sydney, Australia",
  "Paris, France",
  "Berlin, Germany",
  "Tokyo, Japan",
];

export const PLATFORMS = ["All Platforms", "Instagram", "YouTube", "Twitter", "LinkedIn", "Facebook"];

export const PRICE_RANGES = [
  "Any Budget",
  "Under \u20B910,000",
  "\u20B910,000 - \u20B915,000",
  "\u20B915,000 - \u20B920,000",
  "\u20B920,000+",
];

export const FOLLOWER_RANGES = [
  "Any Followers",
  "10K - 50K",
  "50K - 100K",
  "100K - 200K",
  "200K - 500K",
  "500K+",
];

export const GENDERS = ["All Genders", "Male", "Female"];

// ── Pricing Plans (system configuration, managed by admin) ──────────────────
export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  yearlyPrice?: number;
  billingCycle: "monthly" | "yearly";
  description: string;
  features: string[];
  popular?: boolean;
  featured?: boolean;
  status: "active" | "inactive";
  createdDate: string;
  updatedDate?: string;
  collaborationLimit?: number;
  dailyMessageLimit?: number;
  searchesPerDay?: number;
  activeCampaigns?: number;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "p1",
    name: "Free",
    price: 0,
    billingCycle: "monthly",
    description: "Perfect for getting started",
    features: [
      "Browse influencers",
      "Basic search filters",
      "Up to 5 searches per day",
      "Limited messaging",
    ],
    status: "active",
    createdDate: "Jan 1, 2026",
    collaborationLimit: 5,
    dailyMessageLimit: 0,
  },
  {
    id: "p2",
    name: "Basic",
    price: 2999,
    yearlyPrice: 28788,
    billingCycle: "monthly",
    description: "For small businesses",
    features: [
      "Everything in Free",
      "Unlimited searches",
      "Advanced filters",
      "Up to 10 active campaigns",
      "Basic analytics",
      "Email support",
    ],
    status: "active",
    createdDate: "Jan 1, 2026",
    collaborationLimit: 20,
    dailyMessageLimit: 30,
  },
  {
    id: "p3",
    name: "Pro",
    price: 5999,
    yearlyPrice: 65988,
    billingCycle: "monthly",
    description: "For growing brands",
    features: [
      "Everything in Basic",
      "Unlimited campaigns",
      "Advanced analytics",
      "Priority support",
      "Custom contracts",
      "Performance tracking",
      "Dedicated account manager",
    ],
    popular: true,
    featured: true,
    status: "active",
    createdDate: "Jan 1, 2026",
    collaborationLimit: 50,
    dailyMessageLimit: 100,
  },
  {
    id: "p4",
    name: "Enterprise",
    price: 14999,
    yearlyPrice: 179988,
    billingCycle: "monthly",
    description: "For large organizations",
    features: [
      "Everything in Pro",
      "White-label solutions",
      "API access",
      "Custom integrations",
      "24/7 phone support",
      "Quarterly business reviews",
      "Multi-user accounts",
    ],
    status: "active",
    createdDate: "Jan 1, 2026",
    collaborationLimit: 200,
    dailyMessageLimit: -1,
  },
];

// ── Trust Badges (system configuration, managed by admin) ───────────────────
export interface TrustBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  status: "active" | "inactive";
  createdDate: string;
  updatedDate?: string;
  criteria: string[];
}

export const TRUST_BADGES: TrustBadge[] = [
  {
    id: "tb1",
    name: "Verified Creator",
    description: "Identity and social media accounts verified by Flubn",
    icon: "BadgeCheck",
    color: "#2F6BFF",
    bgColor: "#EBF2FF",
    status: "active",
    createdDate: "Jan 1, 2026",
    criteria: [
      "Account manually verified by admin",
      "At least 1 social media profile confirmed",
      "Profile completeness \u2265 80%",
    ],
  },
  {
    id: "tb2",
    name: "Top Rated",
    description: "Consistently receives 4.5+ star ratings from brands",
    icon: "Star",
    color: "#f59e0b",
    bgColor: "#fffbeb",
    status: "active",
    createdDate: "Jan 1, 2026",
    criteria: [
      "Avg brand rating \u2265 4.5 stars",
      "At least 1 approved brand review",
      "Content quality score \u2265 4.0",
      "Professionalism score \u2265 4.0",
    ],
  },
  {
    id: "tb3",
    name: "Fast Responder",
    description: "Responds to collaboration requests within 24 hours",
    icon: "Zap",
    color: "#8b5cf6",
    bgColor: "#faf5ff",
    status: "active",
    createdDate: "Jan 1, 2026",
    criteria: [
      "Timeliness score \u2265 4.5 across brand reviews",
      "At least 1 approved brand review",
      "Trending on platform",
    ],
  },
  {
    id: "tb4",
    name: "Professional",
    description: "Accepted collaborations with strong professionalism scores",
    icon: "Award",
    color: "#10b981",
    bgColor: "#ecfdf5",
    status: "active",
    createdDate: "Jan 1, 2026",
    criteria: [
      "Verified account status",
      "At least 1 accepted collaboration",
      "Professionalism score \u2265 4.0 in brand reviews",
    ],
  },
  {
    id: "tb5",
    name: "Rising Star",
    description: "Rapidly growing audience with high engagement rates",
    icon: "TrendingUp",
    color: "#f97316",
    bgColor: "#fff7ed",
    status: "active",
    createdDate: "Jan 1, 2026",
    criteria: [
      "Minimum 5,000 total followers",
      "Trending on platform",
      "Active on 2+ platforms",
    ],
  },
  {
    id: "tb6",
    name: "Quality Content",
    description: "Known for exceptional content production value",
    icon: "Sparkles",
    color: "#ec4899",
    bgColor: "#fdf2f8",
    status: "active",
    createdDate: "Jan 1, 2026",
    criteria: [
      "Featured by admin on platform",
      "Content quality score \u2265 4.0 in brand reviews",
    ],
  },
  {
    id: "tb7",
    name: "Brand Favorite",
    description: "Highly recommended by brands for repeat collaborations",
    icon: "Heart",
    color: "#f43f5e",
    bgColor: "#fff1f2",
    status: "active",
    createdDate: "Jan 1, 2026",
    criteria: [
      "Reviewed by 2+ different brands",
      "Average brand rating \u2265 4.7 stars",
    ],
  },
];
