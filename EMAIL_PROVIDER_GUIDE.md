# Email Provider System - Developer Guide

## Overview

FLUBN uses an extensible email provider system that allows easy integration of multiple email service providers. The system is designed to be provider-agnostic with a unified interface.

## Architecture

### Core Files

- **`/src/app/utils/emailProviders.ts`** - Provider management system, storage, and registry
- **`/src/app/utils/emailProviderAdapters.ts`** - Concrete provider implementations
- **`/src/app/utils/emailService.ts`** - Email sending service that routes through providers
- **`/src/app/components/admin/ProviderManagement.tsx`** - UI for provider configuration

### Components

1. **EmailProvider Interface**: Defines the contract all providers must implement
2. **Provider Registry**: Central registry for all available providers
3. **Provider Adapters**: Concrete implementations for each service
4. **Provider Management UI**: Admin interface for configuration

## Adding a New Email Provider

### Step 1: Create Provider Adapter

Add your provider implementation to `/src/app/utils/emailProviderAdapters.ts`:

```typescript
export const YourProviderName: EmailProvider = {
  type: "your-provider",  // Unique identifier
  name: "Your Provider Name",  // Display name
  description: "Brief description of the provider and its benefits",
  
  // Configuration fields shown in the UI
  configFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      helpText: "Get your API key from Provider Dashboard",
      placeholder: "sk_xxxxx",
    },
    {
      key: "senderEmail",
      label: "Sender Email",
      type: "email",
      required: true,
      placeholder: "noreply@flubn.com",
    },
    // Add more fields as needed
  ],
  
  // Implementation of email sending
  async sendEmail(request: SendEmailRequest, config: EmailProviderConfig): Promise<SendEmailResponse> {
    const { apiKey } = config.credentials;
    const { senderEmail } = config.settings;
    
    try {
      // Your provider-specific API call
      const response = await fetch("https://api.yourprovider.com/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: senderEmail,
          to: request.to,
          subject: request.subject,
          html: request.htmlContent,
        }),
      });
      
      const data = await response.json();
      
      return {
        success: true,
        messageId: data.id,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
      };
    }
  },
  
  // Test connection/credentials
  async testConnection(config: EmailProviderConfig): Promise<ProviderTestResult> {
    const { apiKey } = config.credentials;
    
    try {
      const response = await fetch("https://api.yourprovider.com/account", {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });
      
      const account = await response.json();
      
      return {
        success: true,
        message: `Connected to ${account.email}`,
        accountInfo: account,
      };
    } catch (e: any) {
      return {
        success: false,
        message: "Connection failed",
        error: e.message,
      };
    }
  },
  
  // Optional: Get statistics
  async getStats(config: EmailProviderConfig, days = 7): Promise<ProviderStats | null> {
    // Implement if your provider supports stats
    return null;
  },
  
  // Optional: Validate configuration
  validateConfig(config: EmailProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.credentials.apiKey?.trim()) {
      errors.push("API Key is required");
    }
    
    if (!config.settings.senderEmail?.trim()) {
      errors.push("Sender Email is required");
    }
    
    return { valid: errors.length === 0, errors };
  },
};
```

### Step 2: Register the Provider

In `/src/app/utils/emailService.ts`, import and register your provider:

```typescript
import { YourProviderName } from "./emailProviderAdapters";

// Register all available providers
registerProvider(BrevoProvider);
registerProvider(SupabaseProvider);
registerProvider(YourProviderName); // <-- Add this line
```

### Step 3: Add Provider Type (Optional)

If you want TypeScript autocomplete, add your provider type to the `ProviderType` union in `/src/app/utils/emailProviders.ts`:

```typescript
export type ProviderType = 
  | "supabase"
  | "brevo"
  | "sendgrid"
  | "mailgun"
  | "aws-ses"
  | "resend"
  | "mailchimp"
  | "postmark"
  | "your-provider"; // <-- Add this
```

### Step 4: Test Your Provider

1. Go to **Admin > Email Center > Providers** tab
2. Click **Configure** on your new provider
3. Enter API credentials
4. Click **Test Connection** to verify
5. Click **Save Configuration**
6. Toggle the switch to enable and activate your provider

That's it! Your provider is now integrated and ready to send emails.

## Current Providers

### Production Ready
- ✅ **Brevo** - Full integration with analytics
- ✅ **Supabase Edge Function** - Custom edge function

### Coming Soon
- 🔄 **SendGrid** - Skeleton implementation ready
- 🔄 **Resend** - Skeleton implementation ready
- 🔄 **Mailgun** - Skeleton implementation ready

## Provider Selection Logic

The system automatically routes emails through the active provider:

1. Admin configures provider in Email Center
2. Admin enables the provider (toggle switch)
3. Provider becomes active automatically
4. All emails are sent through the active provider
5. If no provider is active, emails will fail gracefully with error message

## Configuration Storage

Provider configurations are stored in `localStorage`:

- **Key**: `flubn_email_providers` - Array of all provider configs
- **Key**: `flubn_active_email_provider` - Currently active provider type

## API Key Security

⚠️ **Important**: API keys are stored in localStorage and only accessible in the admin panel. Never expose provider configurations to regular users.

For production deployments:
- Use environment variables for API keys
- Implement server-side provider configuration
- Use Supabase Edge Functions or backend API for sensitive operations

## Migration from Legacy System

The system includes automatic migration from the legacy Brevo-only configuration:

```typescript
migrateLegacyConfigs(); // Called automatically in emailService.ts
```

This migrates the old `flubn_brevo_config` format to the new provider system.

## Best Practices

1. **Always implement testConnection()** - Critical for UX
2. **Provide helpful error messages** - Users need to know what went wrong
3. **Validate before saving** - Use validateConfig() to catch issues early
4. **Support both credentials and settings** - Separate sensitive data from general settings
5. **Return meaningful messageId** - Helps with tracking and debugging
6. **Handle rate limits** - Implement exponential backoff if needed
7. **Document configuration steps** - Add clear helpText to configFields

## Testing

```typescript
// Test email sending
const result = await sendEmailViaProvider({
  to: "test@example.com",
  toName: "Test User",
  subject: "Test Email",
  htmlContent: "<p>Hello World</p>",
});

console.log(result.success ? "Sent!" : result.error);
```

## Troubleshooting

### Provider not appearing in UI
- Check if provider is registered in `emailService.ts`
- Verify provider implements EmailProvider interface
- Check browser console for errors

### Test connection fails
- Verify API credentials are correct
- Check if provider API endpoint is accessible
- Review testConnection() implementation

### Emails not sending
- Ensure provider is enabled (toggle is ON)
- Check provider is set as active
- Review email logs in Admin > Email Center > Logs
- Check browser console and network tab

## Future Enhancements

Potential improvements to the provider system:

- [ ] Multiple active providers with fallback logic
- [ ] Provider-specific rate limiting
- [ ] Advanced routing rules (by recipient, template, etc.)
- [ ] Real-time provider health monitoring
- [ ] Email queue prioritization by provider
- [ ] A/B testing across providers
- [ ] Cost optimization routing
- [ ] Provider performance analytics
