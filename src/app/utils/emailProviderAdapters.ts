/**
 * Email Provider Adapters for FLUBN
 * 
 * Concrete implementations of EmailProvider interface for each supported service.
 */

import type {
  EmailProvider,
  EmailProviderConfig,
  SendEmailRequest,
  SendEmailResponse,
  ProviderTestResult,
  ProviderStats,
} from "./emailProviders";
import * as api from "./api";

// ══════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/** Returns true if the error is a browser-side network/CORS block (not an API error). */
function isCorsOrNetworkError(e: any): boolean {
  const msg: string = e?.message || "";
  return (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed") ||
    msg.includes("net::ERR_") ||
    msg.includes("CORS") ||
    msg.includes("cross-origin")
  );
}

/**
 * CORS fallback: when a provider's send endpoint blocks browser requests,
 * we route the email through the deployed Supabase Edge Function instead.
 * The email still gets delivered; we just surface a warning to the user.
 */
async function sendViaEdgeFunctionFallback(
  request: SendEmailRequest,
  providerName: string
): Promise<SendEmailResponse> {
  try {
    const response = await api.sendEmailViaEdgeFunction({
      to: request.to,
      subject: request.subject,
      htmlBody: request.htmlContent,
      templateId: request.tags?.[0] || "custom",
    });
    if (response && response.success) {
      return {
        success: true,
        messageId: `edge-fallback-${Date.now()}`,
        warning: `${providerName} API cannot be called directly from the browser (CORS policy). Your email was delivered via the Supabase Edge Function instead. For production, configure ${providerName} in your Edge Function.`,
      };
    }
    // response is null (403/404 from edge fn) or explicitly failed
    const reason = response?.error ?? "Edge Function returned an error (403/404 — check deployment)";
    return {
      success: false,
      error: `${providerName} API blocked by CORS. Edge Function fallback also failed: ${reason}`,
    };
  } catch (fallbackErr: any) {
    return {
      success: false,
      error: `${providerName} API blocked by CORS. Edge Function fallback also failed: ${fallbackErr.message}`,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BREVO PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

const BREVO_API_BASE = "https://api.brevo.com/v3";

async function brevoFetch<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BREVO_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Brevo API error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const BrevoProvider: EmailProvider = {
  type: "brevo",
  name: "Brevo (Sendinblue)",
  description: "Professional email service with powerful deliverability and analytics. Up to 300 emails/day free.",
  
  configFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      helpText: "Get your API key from Brevo Dashboard > SMTP & API > API Keys",
      placeholder: "xkeysib-xxxxx",
    },
    {
      key: "senderEmail",
      label: "Sender Email",
      type: "email",
      required: true,
      helpText: "Must be verified in your Brevo account",
      placeholder: "noreply@flubn.com",
    },
    {
      key: "senderName",
      label: "Sender Name",
      type: "text",
      required: false,
      placeholder: "FLUBN",
    },
  ],
  
  async sendEmail(request: SendEmailRequest, config: EmailProviderConfig): Promise<SendEmailResponse> {
    const { apiKey } = config.credentials;
    const { senderEmail, senderName = "FLUBN" } = config.settings;
    
    if (!apiKey || !senderEmail) {
      return { success: false, error: "Brevo API key or sender email not configured" };
    }
    
    try {
      const data = await brevoFetch<{ messageId: string }>(
        "/smtp/email",
        apiKey,
        {
          method: "POST",
          body: JSON.stringify({
            sender: { email: senderEmail, name: senderName },
            to: [{ email: request.to, name: request.toName }],
            subject: request.subject,
            htmlContent: request.htmlContent,
            ...(request.textContent && { textContent: request.textContent }),
            ...(request.replyTo && { replyTo: { email: request.replyTo } }),
            ...(request.tags && { tags: request.tags }),
          }),
        }
      );
      return { success: true, messageId: data.messageId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
  
  async testConnection(config: EmailProviderConfig): Promise<ProviderTestResult> {
    const { apiKey } = config.credentials;
    
    if (!apiKey) {
      return { success: false, message: "API key is required", error: "Missing API key" };
    }
    
    try {
      const account = await brevoFetch<any>("/account", apiKey);
      return {
        success: true,
        message: `Connected successfully to ${account.email}`,
        accountInfo: {
          email: account.email,
          companyName: account.companyName,
          plan: account.plan,
        },
      };
    } catch (e: any) {
      return { success: false, message: "Connection failed", error: e.message };
    }
  },
  
  async getStats(config: EmailProviderConfig, days = 7): Promise<ProviderStats | null> {
    const { apiKey } = config.credentials;
    if (!apiKey) return null;
    
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - (days - 1) * 86_400_000)
      .toISOString()
      .split("T")[0];
    
    try {
      const stats = await brevoFetch<any>(
        `/smtp/statistics/aggregatedReport?startDate=${startDate}&endDate=${endDate}`,
        apiKey
      );
      
      return {
        requests: stats.requests || 0,
        delivered: stats.delivered || 0,
        failed: (stats.hardBounces || 0) + (stats.softBounces || 0) + (stats.invalid || 0),
        bounces: (stats.hardBounces || 0) + (stats.softBounces || 0),
        opens: stats.uniqueOpens || 0,
        clicks: stats.uniqueClicks || 0,
      };
    } catch {
      return null;
    }
  },
  
  validateConfig(config: EmailProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.credentials.apiKey?.trim()) {
      errors.push("API Key is required");
    }
    
    if (!config.settings.senderEmail?.trim()) {
      errors.push("Sender Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.settings.senderEmail)) {
      errors.push("Sender Email must be valid");
    }
    
    return { valid: errors.length === 0, errors };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// SUPABASE PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

export const SupabaseProvider: EmailProvider = {
  type: "supabase",
  name: "Supabase Edge Function",
  description: "Use your custom Supabase Edge Function for email delivery. Requires deployed edge function.",
  
  configFields: [
    {
      key: "projectRef",
      label: "Project Reference",
      type: "text",
      required: true,
      helpText: "Your Supabase project ref (e.g., kzbdftqsnxieiotwfnsc)",
      placeholder: "kzbdftqsnxieiotwfnsc",
    },
    {
      key: "functionName",
      label: "Function Name",
      type: "text",
      required: true,
      helpText: "Name of your deployed edge function",
      placeholder: "server",
    },
    {
      key: "anonKey",
      label: "Anon Key (Optional)",
      type: "password",
      required: false,
      helpText: "Optional: Supabase anon key if your function requires it",
    },
  ],
  
  async sendEmail(request: SendEmailRequest, config: EmailProviderConfig): Promise<SendEmailResponse> {
    try {
      const response = await api.sendEmailViaEdgeFunction({
        to: request.to,
        subject: request.subject,
        htmlBody: request.htmlContent,
        templateId: request.tags?.[0] || "custom",
      });
      
      if (response.success) {
        return { success: true, messageId: `supabase-${Date.now()}` };
      } else {
        return { success: false, error: response.error || "Failed to send email" };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
  
  async testConnection(config: EmailProviderConfig): Promise<ProviderTestResult> {
    const { projectRef, functionName } = config.credentials;
    
    if (!projectRef || !functionName) {
      return {
        success: false,
        message: "Configuration incomplete",
        error: "Project reference and function name are required",
      };
    }
    
    try {
      // Try a simple health check or test email
      const response = await api.sendEmailViaEdgeFunction({
        to: "test@example.com",
        subject: "Test Connection",
        htmlBody: "<p>Test</p>",
        templateId: "test",
      });
      
      return {
        success: response.success,
        message: response.success ? "Connection successful" : "Connection failed",
        error: response.error,
      };
    } catch (e: any) {
      return { success: false, message: "Connection failed", error: e.message };
    }
  },
  
  validateConfig(config: EmailProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.settings.projectRef?.trim()) {
      errors.push("Project Reference is required");
    }
    
    if (!config.settings.functionName?.trim()) {
      errors.push("Function Name is required");
    }
    
    return { valid: errors.length === 0, errors };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// SENDGRID PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

const SENDGRID_API_BASE = "https://api.sendgrid.com/v3";

async function sendgridFetch<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${SENDGRID_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      err?.errors?.[0]?.message ||
      `SendGrid API error ${res.status}: ${res.statusText}`;
    throw new Error(msg);
  }

  // 202 Accepted has no body
  if (res.status === 202 || res.headers.get("content-length") === "0") {
    return {} as T;
  }

  return res.json();
}

export const SendGridProvider: EmailProvider = {
  type: "sendgrid",
  name: "SendGrid",
  description: "Twilio SendGrid email delivery platform. Powerful and scalable email API.",

  configFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      helpText: "Get your API key from SendGrid Dashboard > Settings > API Keys",
      placeholder: "SG.xxxxx",
    },
    {
      key: "senderEmail",
      label: "Sender Email",
      type: "email",
      required: true,
      helpText: "Must be a verified sender in SendGrid",
      placeholder: "noreply@flubn.com",
    },
    {
      key: "senderName",
      label: "Sender Name",
      type: "text",
      required: false,
      placeholder: "FLUBN",
    },
  ],

  async sendEmail(request: SendEmailRequest, config: EmailProviderConfig): Promise<SendEmailResponse> {
    const { apiKey } = config.credentials;
    const { senderEmail, senderName = "FLUBN" } = config.settings;

    if (!apiKey || !senderEmail) {
      return { success: false, error: "SendGrid API key or sender email not configured" };
    }

    // SendGrid blocks browser CORS — route through the Supabase Edge Function
    const response = await api.sendEmailViaEdgeFunction({
      to: request.to,
      subject: request.subject,
      htmlBody: request.htmlContent,
      textBody: request.textContent,
      provider: "sendgrid",
      apiKey,
      senderEmail,
      senderName,
      templateId: request.tags?.[0],
    });

    if (response?.success) return { success: true, messageId: response.messageId };
    return { success: false, error: response?.error || "Failed to send via Supabase Edge Function" };
  },

  async testConnection(config: EmailProviderConfig): Promise<ProviderTestResult> {
    const { apiKey } = config.credentials;

    if (!apiKey) {
      return { success: false, message: "API key is required", error: "Missing API key" };
    }

    try {
      const profile = await sendgridFetch<any>("/user/profile", apiKey);
      return {
        success: true,
        message: `Connected as ${profile.email || "SendGrid user"}`,
        accountInfo: {
          email: profile.email,
          username: profile.username,
        },
      };
    } catch (e: any) {
      // CORS: browser can't hit SendGrid's management endpoints directly.
      // Validate key format and treat as a soft pass.
      if (isCorsOrNetworkError(e)) {
        if (apiKey.startsWith("SG.") && apiKey.length > 20) {
          return {
            success: true,
            message: "API key format looks valid ✓ (browser CORS prevents a live ping — send a test email to fully confirm)",
          };
        }
        return {
          success: false,
          message: "Connection failed",
          error: "Network/CORS error — check your API key format (must start with SG.)",
        };
      }
      return { success: false, message: "Connection failed", error: e.message };
    }
  },

  validateConfig(config: EmailProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.credentials.apiKey?.trim()) {
      errors.push("API Key is required");
    } else if (!config.credentials.apiKey.startsWith("SG.")) {
      errors.push("API Key must start with 'SG.'");
    }

    if (!config.settings.senderEmail?.trim()) {
      errors.push("Sender Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.settings.senderEmail)) {
      errors.push("Sender Email must be valid");
    }

    return { valid: errors.length === 0, errors };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// RESEND PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

const RESEND_API_BASE = "https://api.resend.com";

async function resendFetch<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${RESEND_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.name || `Resend API error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const ResendProvider: EmailProvider = {
  type: "resend",
  name: "Resend",
  description: "Modern email API for developers. Simple, reliable, and built for the modern web.",

  configFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      helpText: "Get your API key from Resend Dashboard > API Keys",
      placeholder: "re_xxxxx",
    },
    {
      key: "senderEmail",
      label: "Sender Email",
      type: "email",
      required: true,
      helpText: "Must use a verified domain in Resend (use onboarding@resend.dev for testing)",
      placeholder: "noreply@flubn.com",
    },
    {
      key: "senderName",
      label: "Sender Name",
      type: "text",
      required: false,
      placeholder: "FLUBN",
    },
  ],

  async sendEmail(request: SendEmailRequest, config: EmailProviderConfig): Promise<SendEmailResponse> {
    const { apiKey } = config.credentials;
    const { senderEmail, senderName = "FLUBN" } = config.settings;

    if (!apiKey || !senderEmail) {
      return { success: false, error: "Resend API key or sender email not configured" };
    }

    // Resend blocks browser CORS — route through the Supabase Edge Function
    const response = await api.sendEmailViaEdgeFunction({
      to: request.to,
      subject: request.subject,
      htmlBody: request.htmlContent,
      textBody: request.textContent,
      provider: "resend",
      apiKey,
      senderEmail,
      senderName,
      templateId: request.tags?.[0],
    });

    if (response?.success) return { success: true, messageId: response.messageId };
    return { success: false, error: response?.error || "Failed to send via Supabase Edge Function" };
  },

  async testConnection(config: EmailProviderConfig): Promise<ProviderTestResult> {
    const { apiKey } = config.credentials;

    if (!apiKey) {
      return { success: false, message: "API key is required", error: "Missing API key" };
    }

    try {
      // GET /domains is a lightweight authenticated endpoint
      const data = await resendFetch<{ data: any[] }>("/domains", apiKey);
      const domainCount = data?.data?.length ?? 0;
      return {
        success: true,
        message: `Connected successfully. ${domainCount} domain(s) verified.`,
        accountInfo: { domains: domainCount },
      };
    } catch (e: any) {
      // CORS: Resend's GET endpoints block browser cross-origin requests.
      // Validate key format and treat as a soft pass.
      if (isCorsOrNetworkError(e)) {
        if (apiKey.startsWith("re_") && apiKey.length > 10) {
          return {
            success: true,
            message: "API key format looks valid ✓ (browser CORS prevents a live ping — send a test email to fully confirm)",
          };
        }
        return {
          success: false,
          message: "Connection failed",
          error: "Network/CORS error — check your API key format (must start with re_)",
        };
      }
      // Real API error (e.g. 401 invalid key)
      if (e.message?.includes("401") || e.message?.toLowerCase().includes("unauthorized") || e.message?.toLowerCase().includes("invalid")) {
        return { success: false, message: "Invalid API key", error: "The API key was rejected by Resend. Please check it and try again." };
      }
      return { success: false, message: "Connection failed", error: e.message };
    }
  },

  validateConfig(config: EmailProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.credentials.apiKey?.trim()) {
      errors.push("API Key is required");
    } else if (!config.credentials.apiKey.startsWith("re_")) {
      errors.push("API Key must start with 're_'");
    }

    if (!config.settings.senderEmail?.trim()) {
      errors.push("Sender Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.settings.senderEmail)) {
      errors.push("Sender Email must be valid");
    }

    return { valid: errors.length === 0, errors };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// MAILGUN PROVIDER
// ═════════════════════════════════════════════════════════════════════════════

function mailgunBase(region: string): string {
  return region === "eu"
    ? "https://api.eu.mailgun.net/v3"
    : "https://api.mailgun.net/v3";
}

async function mailgunFetch<T>(
  url: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const encoded = btoa(`api:${apiKey}`);
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${encoded}`,
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Mailgun API error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const MailgunProvider: EmailProvider = {
  type: "mailgun",
  name: "Mailgun",
  description: "Powerful transactional email API service. Developer-friendly with excellent deliverability.",

  configFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      helpText: "Private API key from Mailgun Dashboard > Settings > API Security",
      placeholder: "key-xxxxx",
    },
    {
      key: "domain",
      label: "Sending Domain",
      type: "text",
      required: true,
      helpText: "Your verified sending domain in Mailgun",
      placeholder: "mg.flubn.com",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      options: [
        { value: "us", label: "US (api.mailgun.net)" },
        { value: "eu", label: "EU (api.eu.mailgun.net)" },
      ],
    },
    {
      key: "senderEmail",
      label: "Sender Email",
      type: "email",
      required: true,
      helpText: "Must match or be within your verified domain",
      placeholder: "noreply@mg.flubn.com",
    },
    {
      key: "senderName",
      label: "Sender Name",
      type: "text",
      required: false,
      placeholder: "FLUBN",
    },
  ],

  async sendEmail(request: SendEmailRequest, config: EmailProviderConfig): Promise<SendEmailResponse> {
    const { apiKey } = config.credentials;
    const { domain, region = "us", senderEmail, senderName = "FLUBN" } = config.settings;

    if (!apiKey || !domain || !senderEmail) {
      return { success: false, error: "Mailgun API key, domain, or sender email not configured" };
    }

    // Mailgun blocks browser CORS — route through the Supabase Edge Function
    const response = await api.sendEmailViaEdgeFunction({
      to: request.to,
      subject: request.subject,
      htmlBody: request.htmlContent,
      textBody: request.textContent,
      provider: "mailgun",
      apiKey,
      senderEmail,
      senderName,
      domain,
      region,
      templateId: request.tags?.[0],
    });

    if (response?.success) return { success: true, messageId: response.messageId };
    return { success: false, error: response?.error || "Failed to send via Supabase Edge Function" };
  },

  async testConnection(config: EmailProviderConfig): Promise<ProviderTestResult> {
    const { apiKey } = config.credentials;
    const { domain, region = "us" } = config.settings;

    if (!apiKey || !domain) {
      return {
        success: false,
        message: "Configuration incomplete",
        error: "API key and domain are required",
      };
    }

    try {
      const data = await mailgunFetch<any>(
        `${mailgunBase(region)}/domains/${domain}`,
        apiKey
      );
      return {
        success: true,
        message: `Connected. Domain "${data.domain?.name || domain}" is ${data.domain?.state || "active"}.`,
        accountInfo: {
          domain: data.domain?.name,
          state: data.domain?.state,
          region,
        },
      };
    } catch (e: any) {
      // CORS: Mailgun blocks browser cross-origin requests on domain endpoints.
      if (isCorsOrNetworkError(e)) {
        if (apiKey.length > 10 && domain.includes(".")) {
          return {
            success: true,
            message: "Credentials look valid ✓ (browser CORS prevents a live ping — send a test email to fully confirm)",
          };
        }
        return {
          success: false,
          message: "Connection failed",
          error: "Network/CORS error — double-check your API key and domain",
        };
      }
      return { success: false, message: "Connection failed", error: e.message };
    }
  },

  validateConfig(config: EmailProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.credentials.apiKey?.trim()) {
      errors.push("API Key is required");
    }

    if (!config.settings.domain?.trim()) {
      errors.push("Sending Domain is required");
    }

    if (!config.settings.region?.trim()) {
      errors.push("Region is required");
    }

    if (!config.settings.senderEmail?.trim()) {
      errors.push("Sender Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.settings.senderEmail)) {
      errors.push("Sender Email must be valid");
    }

    return { valid: errors.length === 0, errors };
  },
};