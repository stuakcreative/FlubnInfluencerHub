# FLUBN - Influencer Marketplace Platform

![FLUBN](https://img.shields.io/badge/FLUBN-Influencer%20Marketplace-2F6BFF)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.1.12-38B2AC?logo=tailwind-css)

FLUBN is a modern, full-featured influencer marketplace platform that connects brands with influencers for marketing collaborations. Built with React, TypeScript, and a robust backend infrastructure, FLUBN provides comprehensive tools for campaign management, payments, analytics, and real-time collaboration.

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Configuration](#-configuration)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Webhook Configuration](#-webhook-configuration)
- [Deployment](#-deployment)
- [Theme & Styling](#-theme--styling)
- [Key Systems](#-key-systems)
- [Dashboard Types](#-dashboard-types)
- [Testing](#-testing)
- [Performance Optimization](#-performance-optimization)
- [Security Best Practices](#-security-best-practices)
- [Browser Compatibility](#-browser-compatibility)
- [Monitoring & Logging](#-monitoring--logging)
- [Troubleshooting](#-troubleshooting)
- [Known Issues & Solutions](#-known-issues--solutions)
- [Contributing](#-contributing)

## ✨ Features

### Core Features
- **Multi-Dashboard System**: Separate dashboards for Admins, Brands, and Influencers
- **Advanced Search & Discovery**: Find influencers by category, location, followers, and engagement
- **Campaign Management**: Create, track, and manage influencer marketing campaigns
- **Real-time Chat**: Built-in messaging system for brand-influencer communication
- **Payment Integration**: Razorpay integration for secure payments
- **Analytics & Reporting**: Comprehensive analytics with interactive charts (Recharts)
- **Verification System**: Multi-step verification for brands and influencers
- **Subscription Management**: Tiered subscription plans with feature gating
- **Badge Engine**: Dynamic badge system for achievements and milestones
- **Email Automation**: Event-driven email system powered by Brevo
- **Profile Customization**: Rich influencer profiles with portfolios and social links
- **Ratings & Reviews**: Testimonial and rating system
- **IP Tracking**: Admin tools for security and fraud prevention
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Drag & Drop Layouts**: Customizable dashboard widgets

### User Workflows
- **Brands**: Sign up → Subscribe → Discover influencers → Send collaboration requests → Manage campaigns → Make payments
- **Influencers**: Sign up → Verify → Build profile → Receive requests → Accept collaborations → Track analytics
- **Admins**: Monitor all activity → Manage users → Verify accounts → Process payments → Configure system settings

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript
- **Routing**: React Router 7.13.0
- **Styling**: Tailwind CSS 4.1.12
- **UI Components**: 
  - Radix UI (Accessible component primitives)
  - Material UI 7.3.5
  - Custom shadcn/ui components
- **Animation**: Motion (Framer Motion) 12.23.24
- **Forms**: React Hook Form 7.55.0
- **Charts**: Recharts 2.15.2
- **Icons**: Lucide React 0.487.0
- **Notifications**: Sonner 2.0.3
- **Drag & Drop**: React DND 16.0.1
- **Image Handling**: React Easy Crop 5.5.7
- **Date Handling**: date-fns 3.6.0

### Backend & Services
- **Database & Auth**: Supabase 2.99.1
- **Payment Gateway**: Razorpay
- **Email Service**: Brevo (event-driven emails)
- **Edge Functions**: Supabase Edge Functions (Deno)
- **State Management**: React Context API
- **Build Tool**: Vite 6.3.5

### Development Tools
- **Package Manager**: pnpm
- **CSS Processing**: PostCSS + Tailwind
- **Type Checking**: TypeScript
- **Linting**: ESLint (implied)

## 📁 Project Structure

```
flubn/
├── src/
│   ├── app/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # Base UI components (shadcn/ui)
│   │   │   ├── admin/           # Admin-specific components
│   │   │   ├── figma/           # Figma-imported components
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── ...
│   │   ├── context/             # React Context providers
│   │   │   ├── AuthContext.tsx
│   │   │   ├── StatisticsContext.tsx
│   │   │   ├── CollaborationContext.tsx
│   │   │   └── ...
│   │   ├── pages/               # Page components
│   │   │   ├── admin/           # Admin dashboard pages
│   │   │   ├── brand/           # Brand dashboard pages
│   │   │   ├── influencer/      # Influencer dashboard pages
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   └── ...
│   │   ├── utils/               # Utility functions
│   │   │   ├── api.ts           # API client
│   │   │   ├── emailService.ts  # Email integration
│   │   │   ├── dataManager.ts   # Data hydration
│   │   │   ├── badgeEngine.ts   # Badge system
│   │   │   ├── planLimits.ts    # Subscription limits
│   │   │   └── ...
│   │   ├── App.tsx              # Root component
│   │   └── routes.tsx           # Route definitions
│   ├── imports/                 # Figma-imported assets
│   └── styles/
│       ├── fonts.css            # Font imports
│       └── theme.css            # Theme tokens & base styles
├── supabase/
│   └── functions/               # Supabase Edge Functions
│       ├── server/
│       │   ├── index.tsx        # Main edge function
│       │   └── kv_store.tsx     # KV storage utilities
│       └── ...
├── utils/
│   └── supabase/
│       └── info.tsx             # Supabase configuration
├── package.json
├── vite.config.ts
├── postcss.config.mjs
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- pnpm 8+ (package manager)
- Supabase account
- Razorpay account (for payments)
- Brevo account (for emails)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flubn
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Supabase
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Razorpay
   VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   
   # Brevo (Email)
   VITE_BREVO_API_KEY=your_brevo_api_key
   
   # App Configuration
   VITE_APP_URL=http://localhost:5173
   ```

4. **Set up Supabase**
   
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run the database migrations (SQL schema)
   - Configure Row Level Security (RLS) policies
   - Set up authentication providers

5. **Start the development server**
   ```bash
   pnpm run dev
   ```
   
   The app will be available at `http://localhost:5173`

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Razorpay Payment Gateway
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key

# Brevo Email Service
VITE_BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=noreply@flubn.com
BREVO_SENDER_NAME=FLUBN

# Application URLs
VITE_APP_URL=http://localhost:5173
VITE_API_URL=https://your-project.supabase.co/functions/v1
```

### Optional Variables

```env
# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_CHAT=true
VITE_ENABLE_PAYMENTS=true

# Development Tools
VITE_ENABLE_DEVTOOLS=true
VITE_DEBUG_MODE=false

# Rate Limiting
VITE_API_RATE_LIMIT=100
VITE_UPLOAD_MAX_SIZE=5242880

# Session Configuration
VITE_SESSION_TIMEOUT=3600000
VITE_TOKEN_REFRESH_INTERVAL=300000

# Social Media Integration (Optional)
VITE_INSTAGRAM_CLIENT_ID=your_instagram_client_id
VITE_YOUTUBE_API_KEY=your_youtube_api_key
VITE_TIKTOK_CLIENT_KEY=your_tiktok_client_key

# Analytics & Monitoring (Optional)
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=your_sentry_dsn

# Email Template IDs (Brevo)
BREVO_TEMPLATE_WELCOME=1
BREVO_TEMPLATE_VERIFICATION=2
BREVO_TEMPLATE_COLLAB_REQUEST=3
BREVO_TEMPLATE_PAYMENT_CONFIRM=4
BREVO_TEMPLATE_CAMPAIGN_UPDATE=5
```

### Environment-Specific Configurations

**Development (.env.development)**:
```env
VITE_APP_URL=http://localhost:5173
VITE_ENABLE_DEVTOOLS=true
VITE_DEBUG_MODE=true
```

**Production (.env.production)**:
```env
VITE_APP_URL=https://flubn.com
VITE_ENABLE_DEVTOOLS=false
VITE_DEBUG_MODE=false
```

**Staging (.env.staging)**:
```env
VITE_APP_URL=https://staging.flubn.com
VITE_ENABLE_DEVTOOLS=true
VITE_DEBUG_MODE=true
```

### Security Notes

- **Never commit `.env` files to version control**
- Add `.env*` to `.gitignore` (except `.env.example`)
- Use different API keys for development, staging, and production
- Rotate secrets regularly, especially after team member changes
- Use Supabase's built-in secret management for Edge Functions
- Store production secrets in your deployment platform's environment variables

### Creating .env.example

Create a `.env.example` file with placeholder values for team members:

```env
# Copy this file to .env and fill in your actual values

VITE_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_here

VITE_BREVO_API_KEY=your_brevo_key_here
BREVO_SENDER_EMAIL=noreply@yourdomain.com

VITE_APP_URL=http://localhost:5173
```

## ⚙️ Configuration

### Supabase Edge Functions

FLUBN uses Supabase Edge Functions for server-side operations. Due to permission requirements, edge functions must be deployed with the `--no-verify-jwt` flag:

```bash
# Deploy all edge functions
supabase functions deploy --no-verify-jwt

# Deploy a specific function
supabase functions deploy server --no-verify-jwt
```

**Important**: The `--no-verify-jwt` flag is required due to current Supabase permission configurations. Ensure proper security measures are in place.

### Email Configuration

The platform uses Brevo for event-driven emails. Email templates are managed in `/src/app/utils/emailTemplates.ts`. Key email events:

- User registration
- Email verification
- Collaboration requests
- Payment confirmations
- Campaign updates
- System notifications

### Payment Configuration

Razorpay integration handles all payment processing:
- Subscription payments
- Campaign payments
- Refunds and disputes

Configure Razorpay webhooks to point to your Supabase Edge Functions for real-time payment updates.

### Database Setup

Key Supabase tables:
- `users` - User accounts and profiles
- `influencers` - Influencer-specific data
- `brands` - Brand company profiles
- `collaborations` - Collaboration requests and campaigns
- `subscriptions` - Subscription plans and user subscriptions
- `payments` - Payment records
- `messages` - Chat system messages
- `ratings` - Reviews and testimonials
- `badges` - Achievement badges

## 🗄️ Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- 'brand', 'influencer', 'admin'
  full_name VARCHAR(255),
  phone VARCHAR(20),
  country VARCHAR(100),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_users_verified ON users(is_verified);
```

#### influencers
```sql
CREATE TABLE influencers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  bio TEXT,
  category VARCHAR(100), -- 'fashion', 'tech', 'fitness', etc.
  niche VARCHAR(100),
  location VARCHAR(255),
  profile_image TEXT,
  cover_image TEXT,
  
  -- Social Media Stats
  instagram_handle VARCHAR(255),
  instagram_followers INTEGER DEFAULT 0,
  youtube_handle VARCHAR(255),
  youtube_subscribers INTEGER DEFAULT 0,
  tiktok_handle VARCHAR(255),
  tiktok_followers INTEGER DEFAULT 0,
  twitter_handle VARCHAR(255),
  twitter_followers INTEGER DEFAULT 0,
  
  -- Engagement Metrics
  avg_engagement_rate DECIMAL(5,2) DEFAULT 0,
  total_collaborations INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  
  -- Verification
  verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verification_documents JSONB DEFAULT '[]'::jsonb,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Portfolio
  portfolio_items JSONB DEFAULT '[]'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  
  -- Pricing
  base_rate DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Profile Views & Favorites
  profile_views INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_influencers_category ON influencers(category);
CREATE INDEX idx_influencers_location ON influencers(location);
CREATE INDEX idx_influencers_verification ON influencers(verification_status);
CREATE INDEX idx_influencers_rating ON influencers(rating DESC);
```

#### brands
```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  company_size VARCHAR(50), -- 'startup', 'small', 'medium', 'enterprise'
  website VARCHAR(255),
  logo_url TEXT,
  description TEXT,
  
  -- Verification
  verification_status VARCHAR(20) DEFAULT 'pending',
  verification_documents JSONB DEFAULT '[]'::jsonb,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Subscription
  subscription_plan VARCHAR(50) DEFAULT 'basic', -- 'basic', 'pro', 'enterprise'
  subscription_status VARCHAR(20) DEFAULT 'trial', -- 'trial', 'active', 'cancelled', 'expired'
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Contact Info
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  
  -- Stats
  total_campaigns INTEGER DEFAULT 0,
  active_campaigns INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_brands_subscription ON brands(subscription_plan);
CREATE INDEX idx_brands_verification ON brands(verification_status);
```

#### collaborations
```sql
CREATE TABLE collaborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  
  -- Campaign Details
  campaign_name VARCHAR(255) NOT NULL,
  campaign_description TEXT,
  deliverables TEXT,
  budget DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Timeline
  start_date DATE,
  end_date DATE,
  deadline DATE,
  
  -- Status Management
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'
  brand_message TEXT,
  influencer_response TEXT,
  
  -- Contract & Agreement
  agreement_url TEXT,
  signed_by_brand BOOLEAN DEFAULT FALSE,
  signed_by_influencer BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'refunded'
  payment_id UUID,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_collaborations_brand ON collaborations(brand_id);
CREATE INDEX idx_collaborations_influencer ON collaborations(influencer_id);
CREATE INDEX idx_collaborations_status ON collaborations(status);
CREATE INDEX idx_collaborations_dates ON collaborations(start_date, end_date);
```

#### messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaboration_id UUID REFERENCES collaborations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'image', 'system'
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_messages_collaboration ON messages(collaboration_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_read ON messages(is_read);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
```

#### subscriptions
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  plan_name VARCHAR(50) NOT NULL,
  
  -- Pricing
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly'
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'trial'
  
  -- Dates
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment Integration
  razorpay_subscription_id VARCHAR(255),
  razorpay_customer_id VARCHAR(255),
  
  -- Features
  features JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_brand ON subscriptions(brand_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_razorpay ON subscriptions(razorpay_subscription_id);
```

#### payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaboration_id UUID REFERENCES collaborations(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Parties
  payer_id UUID REFERENCES users(id),
  payee_id UUID REFERENCES users(id),
  
  -- Amount
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_type VARCHAR(20) NOT NULL, -- 'subscription', 'campaign', 'refund'
  
  -- Payment Gateway
  razorpay_payment_id VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  razorpay_signature VARCHAR(500),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  
  -- Metadata
  payment_method VARCHAR(50),
  gateway_response JSONB,
  failure_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payments_collaboration ON payments(collaboration_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_razorpay ON payments(razorpay_payment_id);
```

#### ratings
```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaboration_id UUID REFERENCES collaborations(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  
  -- Categories (for influencer ratings)
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  
  -- Visibility
  is_public BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Moderation
  is_approved BOOLEAN DEFAULT TRUE,
  moderation_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(collaboration_id, reviewer_id)
);

CREATE INDEX idx_ratings_collaboration ON ratings(collaboration_id);
CREATE INDEX idx_ratings_reviewer ON ratings(reviewer_id);
CREATE INDEX idx_ratings_reviewee ON ratings(reviewee_id);
CREATE INDEX idx_ratings_public ON ratings(is_public);
```

#### badges
```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  badge_type VARCHAR(50) NOT NULL, -- 'verification', 'milestone', 'achievement', 'custom'
  badge_name VARCHAR(100) NOT NULL,
  badge_description TEXT,
  icon_url TEXT,
  color VARCHAR(7), -- Hex color
  
  -- Criteria
  criteria JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_badges_user ON badges(user_id);
CREATE INDEX idx_badges_type ON badges(badge_type);
CREATE INDEX idx_badges_active ON badges(is_active);
```

### Supporting Tables

#### coupons
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
  discount_value DECIMAL(10,2) NOT NULL,
  
  -- Applicability
  applicable_to VARCHAR(20) DEFAULT 'all', -- 'all', 'subscription', 'campaign'
  plan_restrictions JSONB DEFAULT '[]'::jsonb,
  
  -- Limits
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  min_purchase_amount DECIMAL(10,2),
  
  -- Validity
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
```

#### ip_tracking
```sql
CREATE TABLE ip_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  
  -- Location
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Device Info
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  
  -- Activity
  action_type VARCHAR(50), -- 'login', 'signup', 'payment', 'profile_view'
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Flags
  is_suspicious BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ip_tracking_user ON ip_tracking(user_id);
CREATE INDEX idx_ip_tracking_ip ON ip_tracking(ip_address);
CREATE INDEX idx_ip_tracking_suspicious ON ip_tracking(is_suspicious);
CREATE INDEX idx_ip_tracking_created ON ip_tracking(created_at DESC);
```

### Row Level Security (RLS) Policies

Enable RLS on all tables and create policies for secure data access:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Example: Users can only read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Example: Public influencer profiles
CREATE POLICY "Anyone can view verified influencers" ON influencers
  FOR SELECT USING (verification_status = 'verified');

-- Example: Brands can only see their own collaborations
CREATE POLICY "Brands can view own collaborations" ON collaborations
  FOR SELECT USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
  );

-- Example: Messages visible to sender and receiver
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );
```

### Database Functions & Triggers

#### Auto-update timestamp trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON influencers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repeat for other tables...
```

#### Calculate average rating
```sql
CREATE OR REPLACE FUNCTION update_influencer_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE influencers
  SET 
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM ratings
      WHERE reviewee_id = (SELECT user_id FROM influencers WHERE id = NEW.reviewee_id)
      AND is_approved = TRUE
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM ratings
      WHERE reviewee_id = (SELECT user_id FROM influencers WHERE id = NEW.reviewee_id)
      AND is_approved = TRUE
    )
  WHERE user_id = NEW.reviewee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_after_insert AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_influencer_rating();
```

## 📡 API Documentation

### Supabase Edge Functions

FLUBN uses Supabase Edge Functions (Deno runtime) for server-side operations.

#### Base URL
```
https://your-project.supabase.co/functions/v1
```

#### Authentication

All API requests require authentication via JWT token in the Authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${supabaseToken}`,
  'Content-Type': 'application/json'
}
```

### Core Endpoints

#### 1. Server Function - Main API

**Endpoint**: `/server`

##### Get Influencers List
```http
GET /server?action=getInfluencers
```

**Query Parameters**:
- `category` (optional) - Filter by category
- `minFollowers` (optional) - Minimum follower count
- `maxFollowers` (optional) - Maximum follower count
- `location` (optional) - Filter by location
- `verified` (optional) - Only verified influencers (true/false)
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Results per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "displayName": "John Doe",
      "category": "fitness",
      "instagramFollowers": 50000,
      "rating": 4.8,
      "verified": true,
      "profileImage": "url"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

##### Get Influencer Profile
```http
GET /server?action=getInfluencer&id={influencerId}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "displayName": "John Doe",
    "bio": "Fitness enthusiast...",
    "category": "fitness",
    "portfolio": [...],
    "socialMedia": {
      "instagram": {...},
      "youtube": {...}
    },
    "stats": {
      "totalCollaborations": 25,
      "rating": 4.8,
      "profileViews": 1500
    }
  }
}
```

##### Create Collaboration Request
```http
POST /server
Content-Type: application/json

{
  "action": "createCollaboration",
  "brandId": "uuid",
  "influencerId": "uuid",
  "campaignName": "Summer Campaign 2026",
  "campaignDescription": "Product launch campaign",
  "deliverables": "3 Instagram posts, 1 story",
  "budget": 5000,
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "message": "We'd love to work with you..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "collaborationId": "uuid",
    "status": "pending",
    "createdAt": "2026-04-13T10:00:00Z"
  }
}
```

##### Update Collaboration Status
```http
PUT /server
Content-Type: application/json

{
  "action": "updateCollaboration",
  "collaborationId": "uuid",
  "status": "accepted",
  "influencerResponse": "I'd love to collaborate!"
}
```

##### Process Payment
```http
POST /server
Content-Type: application/json

{
  "action": "processPayment",
  "collaborationId": "uuid",
  "razorpayPaymentId": "pay_xxx",
  "razorpayOrderId": "order_xxx",
  "razorpaySignature": "signature_xxx",
  "amount": 5000
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "status": "completed",
    "transactionId": "razorpay_payment_id"
  }
}
```

##### Send Message
```http
POST /server
Content-Type: application/json

{
  "action": "sendMessage",
  "collaborationId": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "content": "Hi! Looking forward to working together.",
  "messageType": "text"
}
```

##### Get Analytics
```http
GET /server?action=getAnalytics&userId={userId}&type={userType}&startDate={date}&endDate={date}
```

**Parameters**:
- `userId` - User ID
- `type` - 'brand' or 'influencer'
- `startDate` - ISO date string
- `endDate` - ISO date string

**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCollaborations": 25,
      "activeCollaborations": 5,
      "totalRevenue": 125000,
      "avgRating": 4.7
    },
    "chartData": {
      "collaborations": [...],
      "revenue": [...],
      "engagement": [...]
    }
  }
}
```

### KV Store Functions

The KV store is used for session management and temporary data storage.

**Set Value**:
```http
POST /server/kv_store
Content-Type: application/json

{
  "action": "set",
  "key": "influencers_cache",
  "value": {...},
  "ttl": 3600
}
```

**Get Value**:
```http
GET /server/kv_store?key=influencers_cache
```

### Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {...}
  }
}
```

**Common Error Codes**:
- `UNAUTHORIZED` - Invalid or missing authentication token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request parameters
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `PAYMENT_FAILED` - Payment processing failed
- `SERVER_ERROR` - Internal server error

### Rate Limiting

- **Default Limit**: 100 requests per minute per user
- **Burst Limit**: 20 requests per second
- **Headers**:
  - `X-RateLimit-Limit` - Max requests allowed
  - `X-RateLimit-Remaining` - Remaining requests
  - `X-RateLimit-Reset` - Timestamp when limit resets

### Client SDK Usage

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Get influencers
const { data, error } = await supabase.functions.invoke('server', {
  body: { action: 'getInfluencers', category: 'fashion' }
});

// Create collaboration
const { data: collab } = await supabase.functions.invoke('server', {
  body: {
    action: 'createCollaboration',
    brandId: 'xxx',
    influencerId: 'yyy',
    campaignName: 'Campaign Name',
    budget: 5000
  }
});
```

## 🔗 Webhook Configuration

FLUBN integrates with external services via webhooks for real-time event processing.

### Razorpay Webhooks

Configure Razorpay webhooks to receive payment updates in real-time.

#### Setup

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/server/webhooks/razorpay`
3. Select events to subscribe to
4. Copy the webhook secret for signature verification

#### Webhook URL
```
https://your-project.supabase.co/functions/v1/server/webhooks/razorpay
```

#### Subscribed Events

- `payment.authorized` - Payment authorized
- `payment.captured` - Payment captured successfully
- `payment.failed` - Payment failed
- `subscription.activated` - Subscription activated
- `subscription.charged` - Subscription payment successful
- `subscription.cancelled` - Subscription cancelled
- `subscription.paused` - Subscription paused
- `refund.created` - Refund initiated
- `refund.processed` - Refund completed

#### Webhook Payload Example

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxxxxxxxxxxxx",
        "amount": 500000,
        "currency": "INR",
        "status": "captured",
        "order_id": "order_xxxxxxxxxxxxx",
        "created_at": 1650000000
      }
    }
  }
}
```

#### Signature Verification

```typescript
import crypto from 'crypto';

function verifyRazorpaySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return expectedSignature === signature;
}

// In your webhook handler
const isValid = verifyRazorpaySignature(
  req.body,
  req.headers['x-razorpay-signature'],
  process.env.RAZORPAY_WEBHOOK_SECRET
);
```

### Brevo (Email) Webhooks

Receive email delivery status, opens, clicks, and bounces.

#### Setup

1. Go to Brevo Dashboard → Transactional → Settings → Webhooks
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/server/webhooks/brevo`
3. Select events to track

#### Webhook URL
```
https://your-project.supabase.co/functions/v1/server/webhooks/brevo
```

#### Subscribed Events

- `delivered` - Email delivered successfully
- `opened` - Email opened by recipient
- `clicked` - Link clicked in email
- `bounced` - Email bounced (hard/soft)
- `spam` - Email marked as spam
- `unsubscribed` - User unsubscribed

#### Webhook Payload Example

```json
{
  "event": "delivered",
  "email": "user@example.com",
  "id": 12345,
  "date": "2026-04-13 10:00:00",
  "message-id": "<xxxxx@domain.com>",
  "tag": "campaign_invitation",
  "template_id": 3
}
```

#### Handling Email Events

```typescript
async function handleBrevoWebhook(event: any) {
  switch (event.event) {
    case 'delivered':
      // Update email status in database
      await updateEmailStatus(event.id, 'delivered');
      break;
    
    case 'opened':
      // Track email opens for analytics
      await trackEmailOpen(event.email, event.date);
      break;
    
    case 'clicked':
      // Track link clicks
      await trackEmailClick(event.email, event.link);
      break;
    
    case 'bounced':
      // Mark email as bounced, consider removing from list
      await handleBouncedEmail(event.email, event.reason);
      break;
  }
}
```

### Webhook Security Best Practices

1. **Verify Signatures**: Always verify webhook signatures before processing
2. **Use HTTPS**: Only accept webhooks over HTTPS
3. **Validate Payload**: Validate payload structure and data types
4. **Idempotency**: Handle duplicate webhook deliveries gracefully
5. **Async Processing**: Process webhooks asynchronously to avoid timeouts
6. **Error Handling**: Return 200 OK quickly, handle errors separately
7. **Logging**: Log all webhook events for debugging and auditing

### Webhook Testing

#### Local Testing with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your local server
pnpm run dev

# Expose local server
ngrok http 5173

# Use ngrok URL for webhook configuration
# Example: https://abc123.ngrok.io/webhooks/razorpay
```

#### Webhook Testing Tools

- **Razorpay**: Use Razorpay's test mode and webhook simulator
- **Brevo**: Use Brevo's webhook testing interface
- **RequestBin**: Create temporary webhook endpoints for testing
- **Postman**: Simulate webhook POST requests

### Webhook Retry Logic

Both Razorpay and Brevo retry failed webhooks:

- **Initial Retry**: After 5 minutes
- **Subsequent Retries**: Every hour for 24 hours
- **Final Retry**: After 24 hours

**Best Practice**: Return 200 status code as soon as webhook is received, then process asynchronously.

```typescript
// Good: Quick response
app.post('/webhooks/razorpay', (req, res) => {
  // Verify signature first
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Return 200 immediately
  res.status(200).send('Webhook received');
  
  // Process asynchronously
  processWebhookAsync(req.body).catch(err => {
    console.error('Webhook processing failed:', err);
  });
});
```

## 🚢 Deployment

### Build for Production

```bash
pnpm run build
```

**Note**: The production build creates optimized static files. This is NOT a standard Vite setup:
- The entry point is auto-generated at runtime (`__figma__entrypoint__.ts`)
- Do not create or modify `index.html` manually
- The app is already configured for the Figma Make hosting environment

### Deployment Checklist

- [ ] Set environment variables in production
- [ ] Deploy Supabase Edge Functions with `--no-verify-jwt`
- [ ] Configure Razorpay webhooks
- [ ] Set up Brevo email templates
- [ ] Enable Supabase RLS policies
- [ ] Test all user flows (brand, influencer, admin)
- [ ] Verify payment processing
- [ ] Test email delivery
- [ ] Remove DevTools component from production

### Environment-Specific Notes

- **Development**: DevTools panel available at bottom-right corner
- **Production**: Remove `<DevTools />` component from `App.tsx`
- **Staging**: Use separate Supabase project for testing

## 🎨 Theme & Styling

### Brand Colors

FLUBN uses a consistent color palette throughout the application:

```css
/* Primary Colors */
--flubn-light: #EBF2FF;      /* Light background/badges */
--flubn-medium: #c7dbff;     /* Medium accent */
--flubn-primary: #2F6BFF;    /* Primary blue */
--flubn-dark: #0F3D91;       /* Dark blue */

/* Gradients */
--flubn-heading-gradient: linear-gradient(to right, #0F3D91, #2F6BFF);
```

### Usage Examples

**Badges/Accents**:
```jsx
<div className="bg-[#EBF2FF] text-[#2F6BFF]">Badge</div>
<div className="bg-[#c7dbff]">Accent</div>
```

**Headings with Gradient**:
```jsx
<h1 className="bg-gradient-to-r from-[#0F3D91] to-[#2F6BFF] bg-clip-text text-transparent">
  FLUBN
</h1>
```

### Typography

- **Font Family**: Inter (loaded via `src/styles/fonts.css`)
- **Font Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Base Styles**: Defined in `src/styles/theme.css`

### Tailwind Configuration

The project uses **Tailwind CSS v4**:
- Base styles in `src/styles/theme.css`
- Font imports in `src/styles/fonts.css`
- No `tailwind.config.js` file (v4 uses CSS-based configuration)
- Custom tokens and utilities defined via CSS variables

## 🔑 Key Systems

### Authentication Flow

1. **User Registration**:
   - Email registration moved to account page (immediate signup)
   - No email verification required for initial access
   - Profile completion optional
   - Agreement step optional

2. **User Types**:
   - **Brand**: Company accounts with subscription requirements
   - **Influencer**: Creator accounts with verification system
   - **Admin**: Platform administrators with full access

### Verification System

- **Influencer Verification**: Multi-step process for authenticity
- **Brand Verification**: Company verification for trusted status
- Verification badges displayed on profiles
- Admin approval workflow

### Subscription Plans

Three tiers for brands:
- **Basic**: Limited features, low monthly cost
- **Pro**: Extended features, moderate monthly cost
- **Enterprise**: Full features, premium pricing

Plan limits managed via `src/app/utils/planLimits.ts`

### Badge Engine

Dynamic achievement system:
- **Activity Badges**: Based on user actions (collaborations, messages)
- **Milestone Badges**: Based on metrics (followers, engagement)
- **Verification Badges**: Trust and authenticity indicators
- **Custom Badges**: Admin-assigned special recognition

Badge logic in `src/app/utils/badgeEngine.ts`

### Analytics System

Powered by Recharts:
- Campaign performance metrics
- Engagement analytics
- Revenue tracking
- User growth statistics
- Custom date range filtering

**Important Fix**: Chart data includes unique IDs to prevent React key errors:
```typescript
const chartData = data.map((item, index) => ({
  ...item,
  id: `${item.name}-${index}` // Unique ID for each data point
}));
```

Gradient elements also use unique IDs to prevent conflicts.

### Chat System

Real-time messaging between brands and influencers:
- WebSocket-based via Supabase Realtime
- Read receipts and typing indicators
- File attachments support
- Emoji support
- Admin monitoring capabilities

### Data Management

- **Client-side Cache**: Local storage for performance
- **Backend Sync**: Automatic hydration from Supabase Edge Functions
- **KV Store**: Edge function key-value storage for session data
- On app startup, `hydrateInfluencersFromBackend()` restores data

## 📊 Dashboard Types

### Admin Dashboard (`/admin/*`)

Full platform control with pages for:
- **Dashboard**: Overview with statistics and charts
- **Users**: Manage all users (brands, influencers)
- **Brands**: Brand verification and management
- **Influencers**: Influencer verification and profiles
- **Collaborations**: Monitor all campaigns
- **Payments**: Payment processing and reconciliation
- **Subscriptions**: Subscription management
- **Coupons**: Discount code management
- **Email Center**: Bulk email campaigns
- **Chat Monitor**: View all platform messages
- **Settings**: System configuration
- **IP Tracking**: Security and fraud detection
- **Blogs**: Content management
- **Testimonials**: Review management

### Brand Dashboard (`/brand/*`)

Brand-specific tools:
- **Dashboard**: Brand analytics and overview
- **Discover**: Search and filter influencers
- **Sent Requests**: Track collaboration requests
- **Chats**: Message influencers
- **Favorites**: Saved influencer profiles
- **Analytics**: Campaign performance
- **Subscription**: Manage subscription plan
- **Settings**: Brand profile settings
- **Ratings**: View and manage reviews
- **Testimonials**: Customer testimonials

### Influencer Dashboard (`/influencer/*`)

Creator-focused interface:
- **Dashboard**: Personal analytics
- **Profile**: Edit influencer profile and portfolio
- **Requests**: Incoming collaboration requests
- **Chats**: Brand communications
- **Analytics**: Performance metrics
- **Settings**: Account settings
- **Testimonials**: Client reviews

## 🐛 Known Issues & Solutions

### Resolved Issues

#### 1. Logo Display Issue ✅ FIXED
**Problem**: Logo not displaying correctly across dashboards
**Solution**: Updated logo import in `DashboardLayout.tsx` to use correct FLUBN logo image
**Location**: `/src/app/components/DashboardLayout.tsx`

#### 2. Recharts Duplicate Key Warnings ✅ FIXED
**Problem**: React warnings about duplicate keys in chart components
**Solution**: Added unique IDs to all chart data objects and gradient elements
**Example**:
```typescript
const data = rawData.map((item, index) => ({
  ...item,
  id: `unique-${index}-${item.name}`
}));
```

#### 3. Influencer Card Image Cropping ✅ FIXED
**Problem**: Profile photos getting cropped incorrectly (faces cut off)
**Solution**: Added proper `object-top` and `object-center` positioning classes
**Locations**: All influencer card components throughout the app
**Code**:
```jsx
<img 
  className="w-full h-48 object-cover object-top" 
  src={influencer.image} 
  alt={influencer.name} 
/>
```

#### 4. Email Registration Flow ✅ FIXED
**Problem**: Email registration required during multi-step onboarding
**Solution**: Moved email registration to account page for immediate signup
**Change**: Users can now complete signup without email verification, profile completion, or agreement steps

### Current Considerations

#### Network Error Suppression
The app suppresses network errors from Supabase client to improve user experience. This is intentional for offline scenarios but may hide real API issues during development.

**Location**: `App.tsx` lines 14-47

#### DevTools in Production
The `<DevTools />` component is currently enabled. **Remove before production deployment**.

**Location**: `App.tsx` line 77

## 📝 Development Guidelines

### Code Style

1. **Component Structure**:
   - Use functional components with hooks
   - Prefer named exports for components
   - Keep components focused and single-purpose

2. **TypeScript**:
   - Use explicit types for props and state
   - Avoid `any` type unless absolutely necessary
   - Define interfaces for complex data structures

3. **Styling**:
   - Use Tailwind utility classes
   - Avoid custom CSS unless necessary
   - Follow the FLUBN color palette
   - Do not use font size/weight classes unless specifically changing from defaults

4. **File Organization**:
   - Components in `/src/app/components/`
   - Pages in `/src/app/pages/[dashboard-type]/`
   - Utilities in `/src/app/utils/`
   - Context providers in `/src/app/context/`

### Important Notes

- **User Request Scope**: Only modify code elements specifically selected or requested by the user
- **Confirmation Required**: Ask for confirmation before modifying files outside the current scope
- **Asset Management**:
  - Raster images use `figma:asset/` import scheme (NOT a file path)
  - SVGs use relative paths from `/src/imports/`
  - Use `ImageWithFallback` component for new images

### Testing Workflows

1. **Brand Flow**:
   ```
   Sign up → Choose plan → Verify email → Browse influencers → 
   Send request → Chat → Create campaign → Process payment
   ```

2. **Influencer Flow**:
   ```
   Sign up → Complete profile → Get verified → 
   Receive requests → Accept collaboration → Chat with brand → 
   Complete campaign → Receive payment
   ```

3. **Admin Flow**:
   ```
   Login → Review pending verifications → Approve/reject → 
   Monitor collaborations → Process payments → Manage disputes
   ```

## 🧪 Testing

### Testing Strategy

FLUBN currently uses manual testing and user acceptance testing. For production readiness, consider implementing:

#### Unit Testing
Test individual functions and utilities.

**Recommended Stack**:
- **Framework**: Vitest (works seamlessly with Vite)
- **Assertions**: Vitest built-in matchers
- **Mocking**: Vitest mocking utilities

```bash
pnpm add -D vitest @vitest/ui
```

**Example Test** (`src/app/utils/badgeEngine.test.ts`):
```typescript
import { describe, it, expect } from 'vitest';
import { calculateBadges, shouldAwardBadge } from './badgeEngine';

describe('Badge Engine', () => {
  it('should award milestone badge for 10 collaborations', () => {
    const user = { totalCollaborations: 10 };
    const badges = calculateBadges(user);
    
    expect(badges).toContainEqual({
      type: 'milestone',
      name: '10_collaborations'
    });
  });
  
  it('should not award badge below threshold', () => {
    const user = { totalCollaborations: 5 };
    const result = shouldAwardBadge(user, '10_collaborations');
    
    expect(result).toBe(false);
  });
});
```

#### Component Testing
Test React components in isolation.

**Recommended Stack**:
- **Framework**: React Testing Library
- **DOM Testing**: @testing-library/react
- **User Events**: @testing-library/user-event

```bash
pnpm add -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

**Example Test** (`src/app/components/InfluencerCard.test.tsx`):
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfluencerCard } from './InfluencerCard';

describe('InfluencerCard', () => {
  it('renders influencer name and category', () => {
    const influencer = {
      id: '1',
      displayName: 'John Doe',
      category: 'fitness',
      instagramFollowers: 50000
    };
    
    render(<InfluencerCard influencer={influencer} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('fitness')).toBeInTheDocument();
  });
  
  it('displays verified badge for verified influencers', () => {
    const influencer = {
      id: '1',
      displayName: 'Jane Doe',
      verified: true
    };
    
    render(<InfluencerCard influencer={influencer} />);
    
    expect(screen.getByLabelText('Verified')).toBeInTheDocument();
  });
});
```

#### Integration Testing
Test complete user flows.

**Example Test** (`tests/integration/collaboration-flow.test.ts`):
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/app/App';

describe('Collaboration Flow', () => {
  beforeEach(() => {
    // Setup test database state
    // Mock Supabase client
  });
  
  it('brand can send collaboration request to influencer', async () => {
    render(<App />);
    
    // Login as brand
    await userEvent.type(screen.getByLabelText('Email'), 'brand@test.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    // Navigate to discover page
    await userEvent.click(screen.getByText('Discover'));
    
    // Select influencer
    await userEvent.click(screen.getByText('John Doe'));
    
    // Send collaboration request
    await userEvent.click(screen.getByRole('button', { name: 'Collaborate' }));
    await userEvent.type(screen.getByLabelText('Campaign Name'), 'Summer Campaign');
    await userEvent.type(screen.getByLabelText('Budget'), '5000');
    await userEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    
    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/request sent successfully/i)).toBeInTheDocument();
    });
  });
});
```

#### E2E Testing
Test the entire application flow in a browser.

**Recommended Stack**:
- **Framework**: Playwright or Cypress
- **Visual Regression**: Percy or Chromatic

```bash
pnpm add -D @playwright/test
```

**Example Test** (`tests/e2e/signup.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test('brand can complete signup process', async ({ page }) => {
  await page.goto('http://localhost:5173/signup');
  
  // Fill signup form
  await page.fill('[name="email"]', 'newbrand@test.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.selectOption('[name="userType"]', 'brand');
  await page.fill('[name="companyName"]', 'Test Company');
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Verify redirect to dashboard
  await expect(page).toHaveURL(/\/brand\/dashboard/);
  
  // Verify welcome message
  await expect(page.locator('h1')).toContainText('Welcome to FLUBN');
});
```

### Running Tests

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

```bash
# Run unit tests
pnpm test

# Run tests in UI mode
pnpm test:ui

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### Test Coverage Goals

Aim for these coverage targets:

- **Utils/Business Logic**: 80%+ coverage
- **Components**: 60%+ coverage  
- **Critical Paths**: 100% coverage (auth, payments, collaboration requests)
- **Edge Functions**: 70%+ coverage

### Mocking External Services

#### Mock Supabase

```typescript
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      update: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
    auth: {
      signIn: vi.fn(() => Promise.resolve({ user: {}, error: null })),
      signUp: vi.fn(() => Promise.resolve({ user: {}, error: null })),
    },
  })),
}));
```

#### Mock Razorpay

```typescript
// Mock Razorpay SDK
global.Razorpay = class MockRazorpay {
  constructor(options) {
    this.options = options;
  }
  
  on(event, handler) {
    // Mock event handlers
  }
  
  open() {
    // Simulate successful payment
    setTimeout(() => {
      this.options.handler({
        razorpay_payment_id: 'pay_test_123',
        razorpay_order_id: 'order_test_123',
        razorpay_signature: 'sig_test_123'
      });
    }, 100);
  }
};
```

#### Mock Brevo

```typescript
// Mock email service
vi.mock('./utils/emailService', () => ({
  sendEmail: vi.fn(() => Promise.resolve({ success: true, messageId: '123' })),
  sendBulkEmail: vi.fn(() => Promise.resolve({ success: true, sent: 10 })),
}));
```

### Manual Testing Checklist

Until automated tests are implemented, use this checklist:

#### Authentication
- [ ] Sign up as brand
- [ ] Sign up as influencer
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Logout
- [ ] Password reset flow
- [ ] Email verification

#### Brand Workflows
- [ ] Browse influencers
- [ ] Filter by category, location, followers
- [ ] View influencer profile
- [ ] Send collaboration request
- [ ] Chat with influencer
- [ ] Make payment (test mode)
- [ ] Subscribe to plan
- [ ] Upgrade/downgrade plan
- [ ] Cancel subscription

#### Influencer Workflows
- [ ] Complete profile
- [ ] Upload portfolio items
- [ ] Submit verification documents
- [ ] Receive collaboration requests
- [ ] Accept/reject requests
- [ ] Chat with brands
- [ ] View analytics
- [ ] Receive payments

#### Admin Workflows
- [ ] View all users
- [ ] Approve/reject verifications
- [ ] Monitor collaborations
- [ ] Process payments
- [ ] Send bulk emails
- [ ] Create coupons
- [ ] View IP tracking logs
- [ ] Update site settings

#### Cross-browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

#### Responsive Testing
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

## ⚡ Performance Optimization

### Frontend Performance

#### Code Splitting

Implement route-based code splitting to reduce initial bundle size:

```typescript
import { lazy, Suspense } from 'react';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/brand/Dashboard'));
const Discover = lazy(() => import('./pages/brand/Discover'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/brand/dashboard" element={<Dashboard />} />
        <Route path="/brand/discover" element={<Discover />} />
      </Routes>
    </Suspense>
  );
}
```

#### Image Optimization

1. Use lazy loading for images
2. Serve WebP format with fallbacks
3. Use responsive images
4. Implement CDN for assets

#### Component Optimization

Use React.memo and useMemo to prevent unnecessary re-renders.

### Backend Performance

1. **Database Indexing**: Ensure all frequently queried columns have indexes
2. **Query Optimization**: Use specific column selection and pagination
3. **Caching**: Implement multi-layer caching (browser, localStorage, Edge Functions)
4. **Connection Pooling**: Reuse database connections

### Performance Monitoring

Monitor Core Web Vitals:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

## 🔒 Security Best Practices

### Authentication & Authorization
- Enable Row Level Security (RLS) on all Supabase tables
- Use strong password policies (min 8 chars, complexity requirements)
- Implement JWT with short expiration times
- Verify all webhook signatures

### Data Protection
- Validate and sanitize all user input
- Prevent XSS attacks (use DOMPurify for user-generated HTML)
- Prevent SQL injection (use parameterized queries)
- Never log sensitive data (passwords, tokens, payment info)

### API Security
- Implement rate limiting (100 requests/min per user)
- Configure CORS properly (specific origins, not *)
- Use HTTPS everywhere
- Store secrets in environment variables only

### Payment Security
- Always verify Razorpay signatures server-side
- Never trust client-side payment data
- Implement idempotency for webhooks
- Validate payment amounts on server

## 🌐 Browser Compatibility

### Supported Browsers

**Desktop**: Chrome, Firefox, Safari, Edge (latest 2 versions)
**Mobile**: iOS Safari 14+, Chrome Mobile, Samsung Internet

### Known Issues
- Safari: Requires `-webkit-` prefix for backdrop-filter
- iOS: Use `font-size: 16px` on inputs to prevent zoom
- iOS: Use `100dvh` instead of `100vh` for full height

## 📊 Monitoring & Logging

### Error Tracking
Implement Sentry or similar error tracking:
- Track JavaScript errors
- Monitor API failures
- Capture user feedback

### Application Logging
Use structured logging (JSON format) with appropriate log levels:
- DEBUG: Development debugging
- INFO: General information
- WARN: Warning conditions
- ERROR: Error conditions

### Analytics
Track user behavior and application metrics:
- Page views
- User actions (collaboration requests, payments)
- Conversion funnels
- Performance metrics

**Never log sensitive data**: passwords, tokens, credit cards, PII

## 🔧 Troubleshooting

### Common Issues

#### Logo Not Displaying
**Problem**: Logo image not showing in dashboards
**Solution**: Check import path in `DashboardLayout.tsx` uses correct FLUBN logo
**Location**: `/src/app/components/DashboardLayout.tsx`

#### Recharts Warnings
**Problem**: React key warnings in chart components
**Solution**: Add unique IDs to chart data objects and gradient elements
```typescript
const data = rawData.map((item, index) => ({
  ...item,
  id: `unique-${index}-${item.name}`
}));
```

#### Image Cropping Issues
**Problem**: Profile photos cut off incorrectly
**Solution**: Add `object-top` or `object-center` classes
```jsx
<img className="w-full h-48 object-cover object-top" src={url} />
```

#### Supabase Connection Errors
**Problem**: "Failed to fetch" or network errors
**Solution**: These are suppressed in `App.tsx` for offline scenarios. Check:
- Supabase URL and keys in `.env`
- Network connectivity
- Supabase project status

#### Razorpay Payment Failures
**Problem**: Payment not processing
**Solution**: Verify:
- Razorpay keys are correct (test/live mode)
- Webhook URL is configured
- Signature verification is working
- Server-side validation is enabled

#### Email Not Sending
**Problem**: Brevo emails not delivered
**Solution**: Check:
- Brevo API key is valid
- Sender email is verified in Brevo
- Email template IDs are correct
- Webhook is configured for delivery status

#### Edge Function Deployment Fails
**Problem**: Cannot deploy Supabase Edge Functions
**Solution**: Use `--no-verify-jwt` flag
```bash
supabase functions deploy server --no-verify-jwt
```

### Debug Mode

Enable debug mode for detailed logging:

```env
VITE_DEBUG_MODE=true
```

This will:
- Show detailed console logs
- Display API request/response data
- Enable DevTools panel
- Show performance metrics

### Getting Help

1. Check this troubleshooting section
2. Review browser console for errors
3. Check Supabase logs in dashboard
4. Review Razorpay dashboard for payment issues
5. Check Brevo logs for email delivery status
6. Open an issue on GitHub with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS information
   - Console error messages
   - Screenshots if applicable

## 🤝 Contributing

### Before Making Changes

1. Read the current state and background information
2. Understand the specific scope of the request
3. Only modify files explicitly mentioned or selected
4. Ask for confirmation before touching other files

### Pull Request Guidelines

1. Test all affected dashboards (admin, brand, influencer)
2. Verify responsive design on mobile/tablet/desktop
3. Ensure no console errors or warnings
4. Check that email flows work correctly
5. Verify payment integration functionality
6. Update this README if adding new features

## 📄 License

[Add your license information here]

## 🙋 Support

For questions or issues:
- Open an issue on GitHub
- Contact the development team
- Review the documentation

---

**Built with ❤️ by the FLUBN Team**

Last Updated: April 13, 2026
