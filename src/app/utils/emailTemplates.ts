/**
 * Email Template System for FLUBN
 * 
 * Templates support variable substitution using {{variableName}} syntax
 * Each template has: id, name, subject, body (HTML), variables
 */

export interface EmailTemplate {
  id: string;
  name: string;
  category: "transactional" | "promotional" | "notification";
  subject: string;
  body: string; // HTML content
  variables: string[]; // Available variables for this template
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailLog {
  id: string;
  templateId: string;
  templateName: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  status: "sent" | "failed" | "pending";
  sentAt: string;
  error?: string;
}

const STORAGE_KEY_TEMPLATES = "flubn_email_templates";
const STORAGE_KEY_LOGS = "flubn_email_logs";

// Default email templates
export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "influencer_welcome",
    name: "Influencer Welcome Email",
    category: "transactional",
    subject: "Welcome to FLUBN, {{name}}! 🎉",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to FLUBN!</h1>
        </div>
        <div style="background-color: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi <strong>{{name}}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Thank you for joining FLUBN - India's premier influencer marketplace! We're excited to help you connect with top brands and grow your influence.
          </p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #667eea; margin-top: 0;">Next Steps:</h3>
            <ul style="color: #374151; line-height: 1.8;">
              <li>Complete your profile to attract brands</li>
              <li>Add your social media links and follower counts</li>
              <li>Set your pricing and content specialties</li>
              <li>Browse collaboration opportunities</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Complete Your Profile
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Need help? Reply to this email or contact our support team.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            © 2026 FLUBN. All rights reserved.
          </p>
        </div>
      </div>
    `,
    variables: ["name", "email", "dashboardUrl"],
    enabled: true,
  },
  {
    id: "brand_welcome",
    name: "Brand Welcome Email",
    category: "transactional",
    subject: "Welcome to FLUBN, {{companyName}}! 🚀",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to FLUBN!</h1>
        </div>
        <div style="background-color: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi <strong>{{name}}</strong> from <strong>{{companyName}}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Thank you for choosing FLUBN! We're thrilled to help you discover and collaborate with the perfect influencers for your brand.
          </p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #667eea; margin-top: 0;">Get Started:</h3>
            <ul style="color: #374151; line-height: 1.8;">
              <li>Browse our verified influencer database</li>
              <li>Filter by category, location, and followers</li>
              <li>Send collaboration requests instantly</li>
              <li>Track campaign performance</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{discoverUrl}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Discover Influencers
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Questions? Our team is here to help!
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            © 2026 FLUBN. All rights reserved.
          </p>
        </div>
      </div>
    `,
    variables: ["name", "companyName", "email", "discoverUrl"],
    enabled: true,
  },
  {
    id: "influencer_profile_complete",
    name: "Influencer Profile Completed",
    category: "transactional",
    subject: "Your FLUBN Profile is Live! ✨",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎊 Profile Complete!</h1>
        </div>
        <div style="background-color: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Congratulations <strong>{{name}}</strong>!</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Your profile is now complete and visible to brands! You're ready to start receiving collaboration requests.
          </p>
          <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #10b981;">
            <p style="color: #065f46; margin: 0; font-weight: bold;">✓ Your profile is now discoverable</p>
            <p style="color: #065f46; margin: 10px 0 0 0;">Brands can find you and send collaboration opportunities directly.</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{profileUrl}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              View Your Profile
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            © 2026 FLUBN. All rights reserved.
          </p>
        </div>
      </div>
    `,
    variables: ["name", "profileUrl"],
    enabled: true,
  },
  {
    id: "influencer_new_request",
    name: "New Collaboration Request (Influencer)",
    category: "notification",
    subject: "New Collaboration Request from {{brandName}} 💼",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Collaboration Request!</h1>
        </div>
        <div style="background-color: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi <strong>{{influencerName}}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            <strong>{{brandName}}</strong> wants to collaborate with you!
          </p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">Campaign Details:</h3>
            <table style="width: 100%; color: #374151;">
              <tr>
                <td style="padding: 8px 0;"><strong>Campaign:</strong></td>
                <td style="padding: 8px 0;">{{campaignName}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Budget:</strong></td>
                <td style="padding: 8px 0;">₹{{budget}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Timeline:</strong></td>
                <td style="padding: 8px 0;">{{timeline}}</td>
              </tr>
            </table>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #374151;"><strong>Message:</strong></p>
              <p style="margin: 10px 0 0 0; color: #6b7280;">{{message}}</p>
            </div>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{requestUrl}}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              View Request
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            © 2026 FLUBN. All rights reserved.
          </p>
        </div>
      </div>
    `,
    variables: ["influencerName", "brandName", "campaignName", "budget", "timeline", "message", "requestUrl"],
    enabled: true,
  },
  {
    id: "brand_request_accepted",
    name: "Request Accepted (Brand)",
    category: "notification",
    subject: "{{influencerName}} accepted your collaboration request! 🎉",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Request Accepted! 🎉</h1>
        </div>
        <div style="background-color: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Great news, <strong>{{brandName}}</strong>!</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            <strong>{{influencerName}}</strong> has accepted your collaboration request for <strong>{{campaignName}}</strong>.
          </p>
          {{#if comment}}
          <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #10b981;">
            <p style="color: #065f46; margin: 0;"><strong>Message from {{influencerName}}:</strong></p>
            <p style="color: #065f46; margin: 10px 0 0 0;">{{comment}}</p>
          </div>
          {{/if}}
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #10b981; margin-top: 0;">Next Steps:</h3>
            <ul style="color: #374151; line-height: 1.8;">
              <li>Connect via the chat to discuss campaign details</li>
              <li>Share your brand guidelines and assets</li>
              <li>Finalize the timeline and deliverables</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{chatUrl}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Start Chat
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            © 2026 FLUBN. All rights reserved.
          </p>
        </div>
      </div>
    `,
    variables: ["brandName", "influencerName", "campaignName", "comment", "chatUrl"],
    enabled: true,
  },
  {
    id: "brand_request_rejected",
    name: "Request Rejected (Brand)",
    category: "notification",
    subject: "Update on your collaboration request with {{influencerName}}",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Request Update</h1>
        </div>
        <div style="background-color: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi <strong>{{brandName}}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Unfortunately, <strong>{{influencerName}}</strong> is unable to accept your collaboration request for <strong>{{campaignName}}</strong> at this time.
          </p>
          {{#if rejectionComment}}
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #6b7280;">
            <p style="color: #374151; margin: 0;"><strong>Reason:</strong></p>
            <p style="color: #6b7280; margin: 10px 0 0 0;">{{rejectionComment}}</p>
          </div>
          {{/if}}
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #3b82f6;">
            <p style="color: #1e40af; margin: 0; font-weight: bold;">💡 Don't give up!</p>
            <p style="color: #1e40af; margin: 10px 0 0 0;">Explore other talented influencers on FLUBN who might be a perfect fit for your campaign.</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{discoverUrl}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Discover More Influencers
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            © 2026 FLUBN. All rights reserved.
          </p>
        </div>
      </div>
    `,
    variables: ["brandName", "influencerName", "campaignName", "rejectionComment", "discoverUrl"],
    enabled: true,
  },
  {
    id: "promotional_template",
    name: "Promotional Email Template",
    category: "promotional",
    subject: "{{subject}}",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">{{title}}</h1>
        </div>
        <div style="background-color: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi <strong>{{name}}</strong>,</p>
          <div style="font-size: 16px; color: #374151; line-height: 1.6;">
            {{content}}
          </div>
          {{#if ctaText}}
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{ctaUrl}}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              {{ctaText}}
            </a>
          </div>
          {{/if}}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            © 2026 FLUBN. All rights reserved.
          </p>
        </div>
      </div>
    `,
    variables: ["name", "subject", "title", "content", "ctaText", "ctaUrl"],
    enabled: true,
  },
];

// Template Management Functions
export function getEmailTemplates(): EmailTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error loading email templates:", e);
  }
  // Initialize with defaults
  saveEmailTemplates(DEFAULT_EMAIL_TEMPLATES);
  return DEFAULT_EMAIL_TEMPLATES;
}

export function saveEmailTemplates(templates: EmailTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error("Error saving email templates:", e);
  }
}

export function getTemplateById(id: string): EmailTemplate | null {
  const templates = getEmailTemplates();
  return templates.find((t) => t.id === id) || null;
}

export function updateTemplate(id: string, updates: Partial<EmailTemplate>): void {
  const templates = getEmailTemplates();
  const index = templates.findIndex((t) => t.id === id);
  if (index !== -1) {
    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveEmailTemplates(templates);
  }
}

export function createTemplate(template: Omit<EmailTemplate, "id" | "createdAt">): EmailTemplate {
  const newTemplate: EmailTemplate = {
    ...template,
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  const templates = getEmailTemplates();
  templates.push(newTemplate);
  saveEmailTemplates(templates);
  return newTemplate;
}

export function deleteTemplate(id: string): void {
  // Don't allow deleting default templates
  if (!id.startsWith("custom_")) {
    throw new Error("Cannot delete default templates");
  }
  const templates = getEmailTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  saveEmailTemplates(filtered);
}

// Email Logs Management
export function getEmailLogs(limit = 100): EmailLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LOGS);
    if (stored) {
      const logs: EmailLog[] = JSON.parse(stored);
      return logs.slice(0, limit).sort((a, b) => 
        new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      );
    }
  } catch (e) {
    console.error("Error loading email logs:", e);
  }
  return [];
}

export function addEmailLog(log: Omit<EmailLog, "id" | "sentAt">): void {
  try {
    const logs = getEmailLogs();
    const newLog: EmailLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sentAt: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep only last 500 logs
    const trimmed = logs.slice(0, 500);
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(trimmed));
  } catch (e) {
    console.error("Error saving email log:", e);
  }
}

export function clearEmailLogs(): void {
  localStorage.removeItem(STORAGE_KEY_LOGS);
}

// Variable substitution helper
export function substituteVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  
  // Handle {{variable}} syntax
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value || ''));
  });
  
  // Handle {{#if variable}}...{{/if}} conditional blocks
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return variables[varName] ? content : '';
  });
  
  // Clean up any remaining unsubstituted variables
  result = result.replace(/{{[^}]+}}/g, '');
  
  return result;
}
