# Email Provider System - Quick Reference

## 🚀 Quick Start

### For End Users (Admins)

```
1. Admin Dashboard → Email Center → Providers tab
2. Click "Configure" on your preferred provider
3. Enter API credentials
4. Click "Test Connection"
5. Click "Save Configuration"
6. Toggle switch to activate
```

### For Developers

```typescript
// Send email (automatically uses active provider)
import { sendEmail } from "./utils/emailService";

await sendEmail({
  to: "user@example.com",
  toName: "John Doe",
  templateId: "welcome",
  variables: { name: "John" },
});
```

## 📦 Supported Providers

| Provider | Status | Free Tier | Docs |
|----------|--------|-----------|------|
| Brevo | ✅ Ready | 300/day | [brevo.com](https://www.brevo.com) |
| Supabase | ✅ Ready | Custom | [supabase.com](https://supabase.com) |
| SendGrid | 🔄 Soon | 100/day | [sendgrid.com](https://sendgrid.com) |
| Resend | 🔄 Soon | 100/day | [resend.com](https://resend.com) |
| Mailgun | 🔄 Soon | 100/day | [mailgun.com](https://mailgun.com) |

## 🔧 Common Operations

### Check Active Provider
```typescript
import { getActiveProviderType, getActiveProviderConfig } from "./utils/emailProviders";

const type = getActiveProviderType(); // "brevo" | "supabase" | null
const config = getActiveProviderConfig(); // Full config or null
```

### Switch Provider
```typescript
import { setActiveProvider } from "./utils/emailProviders";

setActiveProvider("brevo"); // Activate Brevo
setActiveProvider(null);    // Deactivate all
```

### Get All Providers
```typescript
import { getAllProviders } from "./utils/emailProviders";

const providers = getAllProviders(); // Array of EmailProvider
providers.forEach(p => console.log(p.name));
```

### Test Provider
```typescript
import { getProvider } from "./utils/emailProviders";

const provider = getProvider("brevo");
const result = await provider.testConnection(config);

if (result.success) {
  console.log("Connected:", result.message);
} else {
  console.error("Failed:", result.error);
}
```

## 📝 Adding New Provider

### 1. Create Adapter (emailProviderAdapters.ts)
```typescript
export const NewProvider: EmailProvider = {
  type: "new-provider",
  name: "New Provider",
  description: "...",
  configFields: [...],
  async sendEmail(request, config) { /* implementation */ },
  async testConnection(config) { /* implementation */ },
};
```

### 2. Add Type (emailProviders.ts)
```typescript
export type ProviderType = 
  | "supabase"
  | "brevo"
  | "new-provider"; // Add this
```

### 3. Register (emailService.ts)
```typescript
import { NewProvider } from "./emailProviderAdapters";
registerProvider(NewProvider);
```

### 4. Done! 🎉
Provider now appears in Admin > Email Center > Providers

## 🔐 Security Best Practices

### Development
- ✅ Store configs in localStorage (admin only)
- ✅ Use password type for API keys
- ✅ Show/hide password toggle
- ✅ Test connection before saving

### Production
- 🔒 Use environment variables
- 🔒 Implement backend proxy
- 🔒 Rate limit API calls
- 🔒 Audit logs for changes
- 🔒 Encrypt sensitive data

## 🐛 Troubleshooting

### Provider Not Appearing
```typescript
// Check registration
import { getAllProviders } from "./utils/emailProviders";
console.log(getAllProviders().map(p => p.type));
```

### Emails Not Sending
```typescript
// Check active provider
import { getActiveProviderConfig } from "./utils/emailProviders";
const config = getActiveProviderConfig();
console.log(config ? "Active" : "No provider configured");
```

### Test Connection Fails
- Verify API credentials are correct
- Check network/CORS issues
- Review provider's API documentation
- Check browser console for errors

## 📊 Provider Stats

### Get Stats
```typescript
const provider = getProvider("brevo");
const stats = await provider.getStats?.(config, 7); // Last 7 days

if (stats) {
  console.log(`Delivered: ${stats.delivered}/${stats.requests}`);
  console.log(`Opens: ${stats.opens}, Clicks: ${stats.clicks}`);
}
```

## 🔄 Migration

### From Legacy Brevo Config
Migration happens automatically on first load:
```typescript
migrateLegacyConfigs(); // Called in emailService.ts
```

Old config at `flubn_brevo_config` → New system

## 📚 Documentation

- **Full Guide**: `/EMAIL_PROVIDER_GUIDE.md`
- **Example Provider**: `/EXAMPLE_NEW_PROVIDER.ts`
- **Migration Notice**: `/EMAIL_PROVIDER_MIGRATION.md`
- **Admin UI**: Admin > Email Center > Providers

## 💡 Tips

1. **Test First** - Always test connection before activating
2. **Backup Config** - Save provider configs externally
3. **Monitor Logs** - Check Email Logs tab for issues
4. **Use Fallback** - Keep Supabase Edge Function as backup
5. **Rate Limits** - Stay within provider's free tier limits

## 🎯 Common Use Cases

### Switch for Cost Optimization
```
1. Configure multiple providers
2. Compare pricing for your volume
3. Switch to cheaper option
4. Monitor delivery rates
```

### Testing New Provider
```
1. Configure without enabling
2. Test connection
3. Send test email via Bulk Email
4. Monitor results
5. Enable if satisfied
```

### Redundancy Setup
```
1. Keep Supabase Edge Function configured
2. Use Brevo as primary
3. Switch manually if Brevo has issues
4. (Future: automatic failover)
```

---

**Need more help?** Read the full developer guide or check the admin UI tooltips.
