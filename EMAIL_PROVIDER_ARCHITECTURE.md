# FLUBN Email Provider System - Visual Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUBN APPLICATION                         │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              User Actions (Signup, Purchase, etc)          │ │
│  └───────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   EMAIL SERVICE                             │ │
│  │                  (emailService.ts)                          │ │
│  │                                                              │ │
│  │  • Template Processing                                      │ │
│  │  • Variable Substitution                                    │ │
│  │  • Queue Management                                         │ │
│  │  • Retry Logic                                              │ │
│  └───────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              PROVIDER REGISTRY                              │ │
│  │             (emailProviders.ts)                             │ │
│  │                                                              │ │
│  │  getActiveProvider() → Returns configured provider          │ │
│  └───────────────────────────┬────────────────────────────────┘ │
│                              │                                   │
│             ┌────────────────┼────────────────┐                 │
│             │                │                 │                 │
│             ▼                ▼                 ▼                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    BREVO     │  │   SUPABASE   │  │  SENDGRID   │          │
│  │   PROVIDER   │  │   PROVIDER   │  │  (Future)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
└─────────┼─────────────────┼──────────────────┼───────────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Brevo API  │  │   Supabase   │  │ SendGrid API │
│              │  │ Edge Function│  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       └─────────────────┴──────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  Email Delivery  │
              │   to Recipients  │
              └──────────────────┘
```

## Admin UI Flow

```
┌────────────────────────────────────────────────────────────┐
│              ADMIN DASHBOARD                                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │                   EMAIL CENTER                          ││
│  │                                                          ││
│  │  [Templates] [Logs] [Queue] [Providers] [Brevo]        ││
│  │                              ▲                           ││
│  │                              │                           ││
│  │                    Click Providers Tab                   ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │             PROVIDER MANAGEMENT                         ││
│  │                                                          ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             ││
│  │  │  Brevo   │  │ Supabase │  │SendGrid  │             ││
│  │  │  [✓]     │  │  [ ]     │  │  [ ]     │             ││
│  │  │ Active   │  │Configure │  │Configure │             ││
│  │  │ [Edit]   │  │          │  │          │             ││
│  │  └──────────┘  └──────────┘  └──────────┘             ││
│  │                                                          ││
│  │  Click "Configure" on any provider ▼                    ││
│  │                                                          ││
│  │  ┌────────────────────────────────────────────────┐    ││
│  │  │  Configure Brevo                                │    ││
│  │  │  ──────────────────────────────────────────    │    ││
│  │  │  API Key: [*********************] [👁]         │    ││
│  │  │  Sender Email: [noreply@flubn.com]             │    ││
│  │  │  Sender Name: [FLUBN]                          │    ││
│  │  │                                                  │    ││
│  │  │  [Test Connection]  [Save Configuration]       │    ││
│  │  └────────────────────────────────────────────────┘    ││
│  └──────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CONFIGURATION STORAGE                     │
│                        (localStorage)                        │
│                                                               │
│  Key: flubn_email_providers                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [                                                        ││
│  │   {                                                      ││
│  │     type: "brevo",                                       ││
│  │     name: "Brevo",                                       ││
│  │     enabled: true,                                       ││
│  │     credentials: { apiKey: "xkeysib-..." },            ││
│  │     settings: {                                          ││
│  │       senderEmail: "noreply@flubn.com",                 ││
│  │       senderName: "FLUBN"                                ││
│  │     }                                                     ││
│  │   },                                                      ││
│  │   { ... other providers ... }                           ││
│  │ ]                                                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Key: flubn_active_email_provider                            │
│  Value: "brevo"                                              │
└─────────────────────────────────────────────────────────────┘
```

## Provider Lifecycle

```
1. REGISTRATION
   ┌──────────────────────┐
   │ registerProvider()   │  ← Called on app initialization
   │                      │
   │ Adds to registry map │
   └──────────┬───────────┘
              │
              ▼

2. CONFIGURATION
   ┌──────────────────────┐
   │ Admin UI             │  ← User configures via UI
   │                      │
   │ Enter credentials    │
   │ Test connection      │
   │ Save configuration   │
   └──────────┬───────────┘
              │
              ▼

3. ACTIVATION
   ┌──────────────────────┐
   │ Toggle switch ON     │  ← User enables provider
   │                      │
   │ setActiveProvider()  │
   └──────────┬───────────┘
              │
              ▼

4. USAGE
   ┌──────────────────────┐
   │ sendEmail()          │  ← Email triggered
   │                      │
   │ → getActiveProvider()│
   │ → provider.sendEmail()│
   └──────────┬───────────┘
              │
              ▼

5. MONITORING
   ┌──────────────────────┐
   │ Email Logs           │  ← Track success/failure
   │                      │
   │ Provider stats       │
   └──────────────────────┘
```

## Adding New Provider Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPER WORKFLOW                        │
│                                                               │
│  Step 1: Create Provider Adapter                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ /src/app/utils/emailProviderAdapters.ts                 ││
│  │                                                           ││
│  │ export const NewProvider: EmailProvider = {             ││
│  │   type: "new-provider",                                  ││
│  │   name: "New Provider",                                  ││
│  │   configFields: [...],                                   ││
│  │   sendEmail: async () => { ... },                       ││
│  │   testConnection: async () => { ... },                  ││
│  │ };                                                        ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                               │
│                              ▼                               │
│  Step 2: Add Type Definition                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ /src/app/utils/emailProviders.ts                        ││
│  │                                                           ││
│  │ export type ProviderType =                               ││
│  │   | "brevo"                                              ││
│  │   | "new-provider";  ← Add here                         ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                               │
│                              ▼                               │
│  Step 3: Register Provider                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ /src/app/utils/emailService.ts                          ││
│  │                                                           ││
│  │ import { NewProvider } from "./emailProviderAdapters";  ││
│  │ registerProvider(NewProvider);                           ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                               │
│                              ▼                               │
│  Step 4: Test in Admin UI                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Admin > Email Center > Providers                        ││
│  │                                                           ││
│  │ ✓ Provider appears automatically                        ││
│  │ ✓ Configure, test, activate                             ││
│  │ ✓ Ready to send emails!                                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌────────────────────────────────────────────────────────────┐
│                    EMAIL SEND REQUEST                       │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │ Get Active      │
              │ Provider Config │
              └────────┬────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼ Config exists             ▼ No config
┌──────────────────┐        ┌─────────────────────┐
│ Send via         │        │ Return error:       │
│ Provider         │        │ "No provider        │
└────────┬─────────┘        │  configured"        │
         │                  └─────────────────────┘
         │
         ▼
┌──────────────────┐
│ API Call         │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼ Success ▼ Failure
┌────────┐  ┌───────────┐
│ Log    │  │ Log Error │
│ Success│  │ Retry     │
│ Return │  │ Queue     │
└────────┘  └───────────┘
```

## Security Layers

```
┌────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │                   ADMIN ONLY ACCESS                     ││
│  │  • RequireAuth with role="admin"                       ││
│  │  • Route protection on /admin/*                        ││
│  └────────────────────────────────────────────────────────┘│
│                              │                              │
│                              ▼                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │              PROVIDER MANAGEMENT UI                     ││
│  │  • Password input type                                  ││
│  │  • Show/hide toggle                                     ││
│  │  • No credential exposure in UI                        ││
│  └────────────────────────────────────────────────────────┘│
│                              │                              │
│                              ▼                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │               LOCALSTORAGE                              ││
│  │  • Admin-accessible only                                ││
│  │  • Not exposed to regular users                        ││
│  │  • Client-side only (dev/demo)                         ││
│  └────────────────────────────────────────────────────────┘│
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   Provider API   │
                    │   (HTTPS)        │
                    └──────────────────┘

PRODUCTION RECOMMENDATION:
┌────────────────────────────────────────────────────────────┐
│  Move to Environment Variables + Backend Proxy             │
│  • API keys in .env (never committed)                      │
│  • Backend handles provider communication                  │
│  • Frontend never sees credentials                         │
└────────────────────────────────────────────────────────────┘
```

## File Organization

```
/
├── src/app/
│   ├── utils/
│   │   ├── emailProviders.ts          ← Core provider system
│   │   ├── emailProviderAdapters.ts   ← Provider implementations
│   │   ├── emailService.ts            ← Unified email service
│   │   ├── emailTemplates.ts          ← Template management
│   │   ├── emailNotifications.ts      ← Notification triggers
│   │   └── brevoService.ts            ← Legacy (for reference)
│   │
│   ├── components/
│   │   └── admin/
│   │       └── ProviderManagement.tsx  ← Provider UI
│   │
│   └── pages/
│       └── admin/
│           └── AdminEmailCenter.tsx    ← Email Center + Providers tab
│
├── EMAIL_PROVIDER_README.md            ← Main documentation
├── EMAIL_PROVIDER_GUIDE.md             ← Developer guide
├── EMAIL_PROVIDER_QUICK_REF.md         ← Quick reference
├── EMAIL_PROVIDER_MIGRATION.md         ← Migration notice
├── EMAIL_PROVIDER_ARCHITECTURE.md      ← This file
└── EXAMPLE_NEW_PROVIDER.ts             ← Provider template
```

---

**Visual Guide Complete** | Understanding the system architecture
