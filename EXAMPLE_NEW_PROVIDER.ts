/**
 * Example: How to Add a New Email Provider to FLUBN
 * 
 * This example shows how to integrate "EmailPro" (fictional provider)
 * Copy this template and customize for your actual provider.
 */

import type {
  EmailProvider,
  EmailProviderConfig,
  SendEmailRequest,
  SendEmailResponse,
  ProviderTestResult,
  ProviderStats,
} from "./emailProviders";

// ══════════════════════════════════════════════════════════════════════════════
// EXAMPLE: EmailPro Provider
// ══════════════════════════════════════════════════════════════════════════════

export const EmailProProvider: EmailProvider = {
  // 1. Basic Information
  type: "emailpro", // Must match ProviderType in emailProviders.ts
  name: "EmailPro",
  description: "Fast and reliable email delivery with 99.9% uptime. 1000 free emails/month.",

  // 2. Configuration Fields (shown in admin UI)
  configFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      helpText: "Get your API key from EmailPro Dashboard > Settings > API Keys",
      placeholder: "ep_live_xxxxxxxxxxxxx",
    },
    {
      key: "apiSecret",
      label: "API Secret",
      type: "password",
      required: true,
      helpText: "Secret key for authenticating API requests",
      placeholder: "ep_secret_xxxxxxxxxxxxx",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      helpText: "Select the region closest to your users",
      options: [
        { value: "us-east-1", label: "US East (Virginia)" },
        { value: "us-west-1", label: "US West (California)" },
        { value: "eu-west-1", label: "EU (Ireland)" },
        { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
      ],
    },
    {
      key: "senderEmail",
      label: "Sender Email",
      type: "email",
      required: true,
      helpText: "Must be a verified domain in EmailPro",
      placeholder: "noreply@flubn.com",
    },
    {
      key: "senderName",
      label: "Sender Name",
      type: "text",
      required: false,
      placeholder: "FLUBN",
    },
    {
      key: "replyToEmail",
      label: "Reply-To Email",
      type: "email",
      required: false,
      placeholder: "support@flubn.com",
    },
  ],

  // 3. Send Email Implementation
  async sendEmail(
    request: SendEmailRequest,
    config: EmailProviderConfig
  ): Promise<SendEmailResponse> {
    const { apiKey, apiSecret, region } = config.credentials;
    const { senderEmail, senderName = "FLUBN", replyToEmail } = config.settings;

    // Validate required fields
    if (!apiKey || !apiSecret || !region || !senderEmail) {
      return {
        success: false,
        error: "Missing required configuration: API key, secret, region, or sender email",
      };
    }

    try {
      // Build API endpoint based on region
      const endpoint = `https://api-${region}.emailpro.com/v1/send`;

      // Prepare request payload (customize for your provider's API)
      const payload = {
        from: {
          email: senderEmail,
          name: senderName,
        },
        to: [
          {
            email: request.to,
            name: request.toName,
          },
        ],
        subject: request.subject,
        html: request.htmlContent,
        ...(request.textContent && { text: request.textContent }),
        ...(replyToEmail && { replyTo: { email: replyToEmail } }),
        ...(request.tags && { tags: request.tags }),
      };

      // Make API call
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "X-API-Secret": apiSecret,
          "Content-Type": "application/json",
          "User-Agent": "FLUBN/1.0",
        },
        body: JSON.stringify(payload),
      });

      // Handle non-200 responses
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse response
      const data = await response.json();

      return {
        success: true,
        messageId: data.messageId || data.id,
      };
    } catch (error: any) {
      console.error("EmailPro send error:", error);
      return {
        success: false,
        error: error.message || "Failed to send email via EmailPro",
      };
    }
  },

  // 4. Test Connection Implementation
  async testConnection(config: EmailProviderConfig): Promise<ProviderTestResult> {
    const { apiKey, apiSecret, region } = config.credentials;

    if (!apiKey || !apiSecret || !region) {
      return {
        success: false,
        message: "Configuration incomplete",
        error: "API key, secret, and region are required",
      };
    }

    try {
      // Test API endpoint (usually an account info or health check endpoint)
      const endpoint = `https://api-${region}.emailpro.com/v1/account`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "X-API-Secret": apiSecret,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const account = await response.json();

      return {
        success: true,
        message: `Successfully connected to ${account.email}`,
        accountInfo: {
          email: account.email,
          plan: account.plan?.name || "Unknown",
          creditsRemaining: account.credits?.remaining || 0,
          verified: account.verified,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Connection test failed",
        error: error.message || "Unable to connect to EmailPro API",
      };
    }
  },

  // 5. Get Statistics (Optional)
  async getStats(config: EmailProviderConfig, days = 7): Promise<ProviderStats | null> {
    const { apiKey, apiSecret, region } = config.credentials;

    if (!apiKey || !apiSecret || !region) {
      return null;
    }

    try {
      const endpoint = `https://api-${region}.emailpro.com/v1/stats`;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await fetch(
        `${endpoint}?start=${startDate}&end=${endDate}`,
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "X-API-Secret": apiSecret,
          },
        }
      );

      if (!response.ok) return null;

      const stats = await response.json();

      return {
        requests: stats.sent || 0,
        delivered: stats.delivered || 0,
        failed: stats.failed || 0,
        bounces: stats.bounced || 0,
        opens: stats.opened || 0,
        clicks: stats.clicked || 0,
      };
    } catch (error) {
      console.error("EmailPro stats error:", error);
      return null;
    }
  },

  // 6. Validate Configuration (Optional but recommended)
  validateConfig(config: EmailProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check API credentials
    if (!config.credentials.apiKey?.trim()) {
      errors.push("API Key is required");
    } else if (!config.credentials.apiKey.startsWith("ep_live_")) {
      errors.push("API Key must start with 'ep_live_'");
    }

    if (!config.credentials.apiSecret?.trim()) {
      errors.push("API Secret is required");
    } else if (!config.credentials.apiSecret.startsWith("ep_secret_")) {
      errors.push("API Secret must start with 'ep_secret_'");
    }

    if (!config.credentials.region?.trim()) {
      errors.push("Region is required");
    }

    // Check sender information
    if (!config.settings.senderEmail?.trim()) {
      errors.push("Sender Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.settings.senderEmail)) {
      errors.push("Sender Email must be a valid email address");
    }

    // Check reply-to if provided
    if (config.settings.replyToEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.settings.replyToEmail)) {
        errors.push("Reply-To Email must be a valid email address");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// How to Activate This Provider
// ══════════════════════════════════════════���═══════════════════════════════════

/*
  1. Add to emailProviderAdapters.ts:
     - Copy the EmailProProvider implementation above

  2. Add type to emailProviders.ts ProviderType union:
     export type ProviderType = 
       | "supabase"
       | "brevo"
       | "emailpro"  // <-- Add this
       | ...;

  3. Register in emailService.ts:
     import { EmailProProvider } from "./emailProviderAdapters";
     registerProvider(EmailProProvider);  // <-- Add this line

  4. That's it! The provider will now appear in:
     Admin > Email Center > Providers tab

  5. To use it:
     - Click "Configure" on the EmailPro card
     - Enter your API credentials
     - Click "Test Connection"
     - Click "Save Configuration"
     - Toggle the switch to enable and activate it
*/
