/**
 * Email Notification Events for FLUBN
 * 
 * Event handlers that trigger emails for key user actions
 */

import { sendEmail } from "./emailService";
import type { UserRole } from "../context/AuthContext";

const APP_URL = window.location.origin;

/**
 * Helper: Get influencer email from localStorage
 */
function getInfluencerEmail(influencerId?: string): string | null {
  if (!influencerId) return null;
  
  // Check registered users
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("flubn_registered_")) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "");
        if (data.id === influencerId || data.email === influencerId) {
          return data.email;
        }
      } catch {}
    }
  }
  
  return null;
}

/**
 * Helper: Get brand email from localStorage
 */
function getBrandEmail(brandId?: string): string | null {
  if (!brandId) return null;
  
  // Check registered users
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("flubn_registered_")) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "");
        if (data.id === brandId || data.email === brandId) {
          return data.email;
        }
      } catch {}
    }
  }
  
  return null;
}

/**
 * Send welcome email after signup
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  role: UserRole,
  additionalData?: Record<string, any>
): Promise<void> {
  if (role === "influencer") {
    await sendEmail({
      to: userEmail,
      toName: userName,
      templateId: "influencer_welcome",
      variables: {
        name: userName,
        email: userEmail,
        dashboardUrl: `${APP_URL}/influencer/dashboard`,
      },
    });
  } else if (role === "brand") {
    await sendEmail({
      to: userEmail,
      toName: userName,
      templateId: "brand_welcome",
      variables: {
        name: userName,
        companyName: additionalData?.companyName || userName,
        email: userEmail,
        discoverUrl: `${APP_URL}/brand/discover`,
      },
    });
  }
}

/**
 * Send email when influencer completes profile
 */
export async function sendProfileCompleteEmail(
  userEmail: string,
  userName: string,
  username?: string
): Promise<void> {
  const profileUrl = username 
    ? `${APP_URL}/${username}`
    : `${APP_URL}/influencer/profile`;

  await sendEmail({
    to: userEmail,
    toName: userName,
    templateId: "influencer_profile_complete",
    variables: {
      name: userName,
      profileUrl,
    },
  });
}

/**
 * Send email to influencer when they receive a new collaboration request
 */
export async function sendNewRequestToInfluencer(request: {
  influencerId?: string;
  influencerName?: string;
  contactEmail?: string;
  brandName: string;
  campaignName: string;
  budget: number;
  timeline: string;
  message: string;
  id: string;
}): Promise<void> {
  // Get influencer email from localStorage
  const influencerEmail = request.contactEmail || getInfluencerEmail(request.influencerId);
  if (!influencerEmail) {
    console.warn("No email found for influencer:", request.influencerId);
    return;
  }

  const influencerName = request.influencerName || "there";

  await sendEmail({
    to: influencerEmail,
    toName: influencerName,
    templateId: "influencer_new_request",
    variables: {
      influencerName,
      brandName: request.brandName,
      campaignName: request.campaignName,
      budget: request.budget.toLocaleString("en-IN"),
      timeline: request.timeline,
      message: request.message,
      requestUrl: `${APP_URL}/influencer/requests`,
    },
  });
}

/**
 * Send email to brand when influencer accepts their request
 */
export async function sendRequestAcceptedToBrand(request: {
  brandId?: string;
  brandContactEmail?: string;
  brandName: string;
  influencerName?: string;
  campaignName: string;
  acceptComment?: string;
  id: string;
}): Promise<void> {
  const brandEmail = request.brandContactEmail || getBrandEmail(request.brandId);
  if (!brandEmail) {
    console.warn("No email found for brand:", request.brandId);
    return;
  }

  await sendEmail({
    to: brandEmail,
    toName: request.brandName,
    templateId: "brand_request_accepted",
    variables: {
      brandName: request.brandName,
      influencerName: request.influencerName || "the influencer",
      campaignName: request.campaignName,
      comment: request.acceptComment || "",
      chatUrl: `${APP_URL}/brand/chats`,
    },
  });
}

/**
 * Send email to brand when influencer rejects their request
 */
export async function sendRequestRejectedToBrand(request: {
  brandId?: string;
  brandContactEmail?: string;
  brandName: string;
  influencerName?: string;
  campaignName: string;
  rejectionComment?: string;
}): Promise<void> {
  const brandEmail = request.brandContactEmail || getBrandEmail(request.brandId);
  if (!brandEmail) {
    console.warn("No email found for brand:", request.brandId);
    return;
  }

  await sendEmail({
    to: brandEmail,
    toName: request.brandName,
    templateId: "brand_request_rejected",
    variables: {
      brandName: request.brandName,
      influencerName: request.influencerName || "the influencer",
      campaignName: request.campaignName,
      rejectionComment: request.rejectionComment || "",
      discoverUrl: `${APP_URL}/brand/discover`,
    },
  });
}

/**
 * Send email confirmation to brand after sending a request
 */
export async function sendRequestSentConfirmationToBrand(params: {
  brandEmail: string;
  brandName: string;
  influencerName: string;
  campaignName: string;
}): Promise<void> {
  const { brandEmail, brandName, influencerName, campaignName } = params;

  // Using the promotional template for this custom message
  await sendEmail({
    to: brandEmail,
    toName: brandName,
    templateId: "promotional_template",
    variables: {
      name: brandName,
      subject: `Collaboration Request Sent to ${influencerName}`,
      title: "Request Sent Successfully! ✅",
      content: `
        <p>Your collaboration request for <strong>${campaignName}</strong> has been sent to <strong>${influencerName}</strong>.</p>
        <p style="margin-top: 20px;">You'll receive an email notification when ${influencerName} responds to your request.</p>
        <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #3b82f6;">
          <p style="color: #1e40af; margin: 0;">💡 <strong>Pro Tip:</strong> While you wait, explore more talented influencers on FLUBN!</p>
        </div>
      `,
      ctaText: "View Sent Requests",
      ctaUrl: `${APP_URL}/brand/sent-requests`,
    },
  });
}

/**
 * Send price negotiation email to brand
 */
export async function sendPriceNegotiationToBrand(params: {
  brandEmail: string;
  brandName: string;
  influencerName: string;
  campaignName: string;
  proposedPrice: number;
  type: "request" | "counter";
}): Promise<void> {
  const { brandEmail, brandName, influencerName, campaignName, proposedPrice, type } = params;

  const title = type === "request" 
    ? `${influencerName} has sent a price proposal`
    : `${influencerName} sent a counter offer`;

  await sendEmail({
    to: brandEmail,
    toName: brandName,
    templateId: "promotional_template",
    variables: {
      name: brandName,
      subject: `Price Proposal for ${campaignName}`,
      title,
      content: `
        <p><strong>${influencerName}</strong> has proposed a price of <strong>₹${proposedPrice.toLocaleString("en-IN")}</strong> for the campaign <strong>${campaignName}</strong>.</p>
        <p style="margin-top: 20px;">You can accept this proposal or negotiate further via the chat.</p>
      `,
      ctaText: "View & Respond",
      ctaUrl: `${APP_URL}/brand/chats`,
    },
  });
}

/**
 * Send price negotiation email to influencer
 */
export async function sendPriceNegotiationToInfluencer(params: {
  influencerEmail: string;
  influencerName: string;
  brandName: string;
  campaignName: string;
  proposedPrice: number;
  type: "accepted" | "counter";
}): Promise<void> {
  const { influencerEmail, influencerName, brandName, campaignName, proposedPrice, type } = params;

  const title = type === "accepted"
    ? `${brandName} accepted your price!`
    : `${brandName} sent a counter offer`;

  await sendEmail({
    to: influencerEmail,
    toName: influencerName,
    templateId: "promotional_template",
    variables: {
      name: influencerName,
      subject: type === "accepted" ? `Great news! ${brandName} accepted your price` : `Counter offer from ${brandName}`,
      title,
      content: type === "accepted"
        ? `
          <p>Congratulations! <strong>${brandName}</strong> has accepted your proposed price of <strong>₹${proposedPrice.toLocaleString("en-IN")}</strong> for <strong>${campaignName}</strong>.</p>
          <p style="margin-top: 20px;">Continue the conversation in the chat to finalize campaign details.</p>
        `
        : `
          <p><strong>${brandName}</strong> has proposed a counter offer of <strong>₹${proposedPrice.toLocaleString("en-IN")}</strong> for the campaign <strong>${campaignName}</strong>.</p>
          <p style="margin-top: 20px;">You can accept this offer or continue negotiating via the chat.</p>
        `,
      ctaText: "Go to Chat",
      ctaUrl: `${APP_URL}/influencer/chats`,
    },
  });
}

/**
 * Send contact share notification
 */
export async function sendContactSharedNotification(params: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  campaignName: string;
  recipientRole: "brand" | "influencer";
}): Promise<void> {
  const { recipientEmail, recipientName, senderName, campaignName, recipientRole } = params;

  const chatUrl = recipientRole === "brand" 
    ? `${APP_URL}/brand/chats`
    : `${APP_URL}/influencer/chats`;

  await sendEmail({
    to: recipientEmail,
    toName: recipientName,
    templateId: "promotional_template",
    variables: {
      name: recipientName,
      subject: `Contact details shared for ${campaignName}`,
      title: "Contact Details Shared! 📧",
      content: `
        <p><strong>${senderName}</strong> has shared their contact details with you for the campaign <strong>${campaignName}</strong>.</p>
        <p style="margin-top: 20px;">You can now view their contact information in the chat and continue your collaboration off-platform if needed.</p>
      `,
      ctaText: "View Contact Details",
      ctaUrl: chatUrl,
    },
  });
}