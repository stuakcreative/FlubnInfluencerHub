/**
 * Email Service for FLUBN
 * 
 * Handles email delivery via configurable email providers
 * Supports queuing, retry logic, and logging
 */

import * as api from "./api";
import { 
  getTemplateById, 
  substituteVariables, 
  addEmailLog,
  type EmailTemplate 
} from "./emailTemplates";
import {
  sendEmailViaProvider,
  getActiveProviderConfig,
  migrateLegacyConfigs,
  registerProvider,
} from "./emailProviders";
import {
  BrevoProvider,
  SupabaseProvider,
  SendGridProvider,
  ResendProvider,
  MailgunProvider,
} from "./emailProviderAdapters";

// ── Initialize Providers ──────────────────────────────────────────────────────

// Register all available providers
registerProvider(BrevoProvider);
registerProvider(SupabaseProvider);
registerProvider(SendGridProvider);
registerProvider(ResendProvider);
registerProvider(MailgunProvider);

// Migrate legacy configs on first load
migrateLegacyConfigs();

export interface SendEmailParams {
  to: string;
  toName: string;
  templateId: string;
  variables: Record<string, any>;
  sendImmediately?: boolean;
}

export interface QueuedEmail {
  id: string;
  params: SendEmailParams;
  status: "pending" | "sending" | "sent" | "failed";
  createdAt: string;
  sentAt?: string;
  error?: string;
  retryCount: number;
}

const STORAGE_KEY_QUEUE = "flubn_email_queue";
const MAX_RETRIES = 3;

/**
 * Send an email using a template
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, toName, templateId, variables, sendImmediately = true } = params;

  // Get template
  const template = getTemplateById(templateId);
  if (!template) {
    console.error(`Email template not found: ${templateId}`);
    return false;
  }

  if (!template.enabled) {
    console.warn(`Email template disabled: ${templateId}`);
    return false;
  }

  // Add to queue if not sending immediately
  if (!sendImmediately) {
    queueEmail(params);
    return true;
  }

  // Prepare email content
  const subject = substituteVariables(template.subject, variables);
  const body = substituteVariables(template.body, variables);

  try {
    let success = false;

    // ── Route: Configurable Email Provider ──
    const result = await sendEmailViaProvider({
      to,
      toName,
      subject,
      htmlContent: body,
      tags: [templateId],
    });
    success = result.success;
    if (!result.success) throw new Error(result.error || "Provider send failed");

    if (success) {
      // Log success
      addEmailLog({
        templateId,
        templateName: template.name,
        recipientEmail: to,
        recipientName: toName,
        subject,
        status: "sent",
      });
      return true;
    }
    return false;
  } catch (error: any) {
    console.error("Error sending email:", error);
    
    // Log failure
    addEmailLog({
      templateId,
      templateName: template.name,
      recipientEmail: to,
      recipientName: toName,
      subject,
      status: "failed",
      error: error.message,
    });
    
    return false;
  }
}

/**
 * Add email to queue for later sending
 */
export function queueEmail(params: SendEmailParams): void {
  try {
    const queue = getEmailQueue();
    const queuedEmail: QueuedEmail = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      params,
      status: "pending",
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(queuedEmail);
    saveEmailQueue(queue);
  } catch (e) {
    console.error("Error queueing email:", e);
  }
}

/**
 * Process pending emails in queue
 */
export async function processEmailQueue(): Promise<void> {
  const queue = getEmailQueue();
  const pending = queue.filter((e) => e.status === "pending" || e.status === "failed");

  for (const queuedEmail of pending) {
    // Skip if max retries exceeded
    if (queuedEmail.retryCount >= MAX_RETRIES) {
      queuedEmail.status = "failed";
      continue;
    }

    queuedEmail.status = "sending";
    saveEmailQueue(queue);

    const success = await sendEmail({
      ...queuedEmail.params,
      sendImmediately: true,
    });

    if (success) {
      queuedEmail.status = "sent";
      queuedEmail.sentAt = new Date().toISOString();
    } else {
      queuedEmail.status = "failed";
      queuedEmail.retryCount++;
    }
  }

  saveEmailQueue(queue);
  
  // Clean up old sent emails (keep only last 24 hours)
  cleanupQueue();
}

/**
 * Get email queue
 */
export function getEmailQueue(): QueuedEmail[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_QUEUE);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error loading email queue:", e);
  }
  return [];
}

/**
 * Save email queue
 */
function saveEmailQueue(queue: QueuedEmail[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error("Error saving email queue:", e);
  }
}

/**
 * Clean up old emails from queue
 */
function cleanupQueue(): void {
  const queue = getEmailQueue();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  const cleaned = queue.filter((e) => {
    if (e.status === "sent") {
      const sentTime = e.sentAt ? new Date(e.sentAt).getTime() : 0;
      return sentTime > oneDayAgo;
    }
    return true; // Keep pending/failed
  });

  saveEmailQueue(cleaned);
}

/**
 * Clear entire queue (admin action)
 */
export function clearEmailQueue(): void {
  localStorage.removeItem(STORAGE_KEY_QUEUE);
}

/**
 * Retry failed emails
 */
export async function retryFailedEmails(): Promise<void> {
  const queue = getEmailQueue();
  queue.forEach((e) => {
    if (e.status === "failed" && e.retryCount < MAX_RETRIES) {
      e.status = "pending";
    }
  });
  saveEmailQueue(queue);
  await processEmailQueue();
}

/**
 * Send bulk emails (for promotional campaigns)
 */
export async function sendBulkEmails(
  recipients: Array<{ email: string; name: string }>,
  templateId: string,
  baseVariables: Record<string, any>,
  batchSize = 10
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const promises = batch.map((recipient) => {
      const variables = {
        ...baseVariables,
        name: recipient.name,
        email: recipient.email,
      };
      
      return sendEmail({
        to: recipient.email,
        toName: recipient.name,
        templateId,
        variables,
        sendImmediately: true,
      });
    });

    const results = await Promise.all(promises);
    sent += results.filter((r) => r).length;
    failed += results.filter((r) => !r).length;

    // Small delay between batches
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { sent, failed };
}