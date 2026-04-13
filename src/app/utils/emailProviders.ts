/**
 * Email Provider Management System for FLUBN
 * 
 * Extensible architecture to support multiple email service providers:
 * - Brevo (formerly Sendinblue)
 * - Supabase Edge Function
 * - SendGrid (future)
 * - Mailgun (future)
 * - AWS SES (future)
 * - Resend (future)
 * 
 * Each provider implements the EmailProvider interface and can be easily
 * configured through the Admin Email Center.
 */

// ── Core Types ────────────────────────────────────────────────────────────────

export type ProviderType = 
  | "supabase"
  | "brevo"
  | "sendgrid"
  | "mailgun"
  | "aws-ses"
  | "resend"
  | "mailchimp"
  | "postmark";

export interface EmailProviderConfig {
  type: ProviderType;
  name: string;
  enabled: boolean;
  credentials: Record<string, string>;
  settings: Record<string, any>;
}

export interface SendEmailRequest {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: string;
  tags?: string[];
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Set when a CORS fallback was used (e.g. routed via Supabase Edge Function) */
  warning?: string;
}

export interface ProviderStats {
  requests: number;
  delivered: number;
  failed: number;
  bounces: number;
  opens?: number;
  clicks?: number;
}

export interface ProviderTestResult {
  success: boolean;
  message: string;
  accountInfo?: any;
  error?: string;
}

// ── Email Provider Interface ──────────────────────────────────────────────────

export interface EmailProvider {
  /** Provider type identifier */
  type: ProviderType;
  
  /** Human-readable name */
  name: string;
  
  /** Description of the provider */
  description: string;
  
  /** Configuration fields required for this provider */
  configFields: Array<{
    key: string;
    label: string;
    type: "text" | "password" | "email" | "url" | "select";
    placeholder?: string;
    required: boolean;
    helpText?: string;
    options?: Array<{ value: string; label: string }>;
  }>;
  
  /** Send an email */
  sendEmail(request: SendEmailRequest, config: EmailProviderConfig): Promise<SendEmailResponse>;
  
  /** Test the connection/credentials */
  testConnection(config: EmailProviderConfig): Promise<ProviderTestResult>;
  
  /** Get provider statistics (if supported) */
  getStats?(config: EmailProviderConfig, days?: number): Promise<ProviderStats | null>;
  
  /** Validate configuration before saving */
  validateConfig?(config: EmailProviderConfig): { valid: boolean; errors: string[] };
}

// ── Provider Storage ──────────────────────────────────────────────────────────

const STORAGE_KEY_PROVIDERS = "flubn_email_providers";
const STORAGE_KEY_ACTIVE = "flubn_active_email_provider";

export function getAllProviderConfigs(): EmailProviderConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROVIDERS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveProviderConfig(config: EmailProviderConfig): void {
  const configs = getAllProviderConfigs();
  const index = configs.findIndex((c) => c.type === config.type);
  
  if (index >= 0) {
    configs[index] = config;
  } else {
    configs.push(config);
  }
  
  localStorage.setItem(STORAGE_KEY_PROVIDERS, JSON.stringify(configs));
}

export function getProviderConfig(type: ProviderType): EmailProviderConfig | null {
  const configs = getAllProviderConfigs();
  return configs.find((c) => c.type === type) || null;
}

export function deleteProviderConfig(type: ProviderType): void {
  const configs = getAllProviderConfigs();
  const filtered = configs.filter((c) => c.type !== type);
  localStorage.setItem(STORAGE_KEY_PROVIDERS, JSON.stringify(filtered));
  
  // If this was the active provider, clear it
  if (getActiveProviderType() === type) {
    setActiveProvider(null);
  }
}

export function setActiveProvider(type: ProviderType | null): void {
  if (type) {
    localStorage.setItem(STORAGE_KEY_ACTIVE, type);
  } else {
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
  }
}

export function getActiveProviderType(): ProviderType | null {
  return localStorage.getItem(STORAGE_KEY_ACTIVE) as ProviderType | null;
}

export function getActiveProviderConfig(): EmailProviderConfig | null {
  const type = getActiveProviderType();
  if (!type) return null;
  
  const config = getProviderConfig(type);
  return config?.enabled ? config : null;
}

// ── Provider Registry ─────────────────────────────────────────────────────────

const providerRegistry = new Map<ProviderType, EmailProvider>();

export function registerProvider(provider: EmailProvider): void {
  providerRegistry.set(provider.type, provider);
}

export function getProvider(type: ProviderType): EmailProvider | null {
  return providerRegistry.get(type) || null;
}

export function getAllProviders(): EmailProvider[] {
  return Array.from(providerRegistry.values());
}

export function getActiveProvider(): EmailProvider | null {
  const type = getActiveProviderType();
  return type ? getProvider(type) : null;
}

// ── Unified Send Function ─────────────────────────────────────────────────────

/**
 * Send email using the currently active provider
 */
export async function sendEmailViaProvider(
  request: SendEmailRequest
): Promise<SendEmailResponse> {
  const config = getActiveProviderConfig();
  
  if (!config) {
    return {
      success: false,
      error: "No email provider configured. Please configure a provider in Admin > Email Center.",
    };
  }
  
  const provider = getProvider(config.type);
  
  if (!provider) {
    return {
      success: false,
      error: `Provider '${config.type}' not found in registry.`,
    };
  }
  
  try {
    return await provider.sendEmail(request, config);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Unknown error sending email",
    };
  }
}

// ── Migration Helper ──────────────────────────────────────────────────────────

/**
 * Migrate legacy Brevo config to new provider system
 */
export function migrateLegacyConfigs(): void {
  // Check if migration already done
  const migrated = localStorage.getItem("flubn_providers_migrated");
  if (migrated === "true") return;
  
  // Migrate Brevo config if exists
  const brevoLegacy = localStorage.getItem("flubn_brevo_config");
  if (brevoLegacy) {
    try {
      const legacy = JSON.parse(brevoLegacy);
      const newConfig: EmailProviderConfig = {
        type: "brevo",
        name: "Brevo",
        enabled: legacy.enabled || false,
        credentials: {
          apiKey: legacy.apiKey || "",
        },
        settings: {
          senderEmail: legacy.senderEmail || "",
          senderName: legacy.senderName || "FLUBN",
        },
      };
      saveProviderConfig(newConfig);
      
      // Set as active if it was enabled
      if (newConfig.enabled) {
        setActiveProvider("brevo");
      }
    } catch (e) {
      console.error("Failed to migrate Brevo config:", e);
    }
  }
  
  // Mark migration as complete
  localStorage.setItem("flubn_providers_migrated", "true");
}