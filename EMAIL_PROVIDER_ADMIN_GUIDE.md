# 📧 Email Provider Setup - Simple Guide for Admins

## What is This?

FLUBN can now send emails through different email services (like Brevo, SendGrid, etc.). You can choose which service to use and switch between them anytime through the Admin panel.

## Why Multiple Providers?

- **Reliability**: If one service has issues, switch to another
- **Cost**: Choose the most affordable option for your volume
- **Features**: Different providers offer different capabilities
- **Flexibility**: No vendor lock-in

## Currently Available

### ✅ Brevo (Recommended)
- **Best for**: Small to medium businesses
- **Free tier**: 300 emails per day
- **Features**: Great analytics, easy setup
- **Setup time**: 5 minutes

### ✅ Supabase Edge Function
- **Best for**: Custom implementations
- **Cost**: Depends on your Supabase plan
- **Features**: Full control, custom logic
- **Setup time**: Already configured

### 🔜 Coming Soon
- SendGrid
- Resend
- Mailgun
- AWS SES

## How to Set Up a Provider

### Step 1: Go to Email Center
1. Login to FLUBN Admin Dashboard
2. Click on **"Email Center"** in the left sidebar
3. Click on the **"Providers"** tab

### Step 2: Choose a Provider
You'll see cards for each available provider. Each card shows:
- Provider name and icon
- Status (Active, Configured, or Not Configured)
- Brief description

### Step 3: Configure Provider
1. Click the **"Configure"** button on your chosen provider
2. A form will appear asking for:
   - **API Key**: Get this from the provider's website
   - **Sender Email**: The "from" email address (must be verified)
   - **Sender Name**: Usually "FLUBN" or your company name
   - Other provider-specific settings

### Step 4: Get Your API Credentials

#### For Brevo:
1. Go to [https://app.brevo.com](https://app.brevo.com)
2. Sign up for a free account (if you don't have one)
3. Go to **Settings** → **SMTP & API** → **API Keys**
4. Click **"Generate a new API key"**
5. Copy the API key (starts with `xkeysib-`)
6. Add a verified sender email in **Senders** section

#### For Other Providers:
Similar process - check their documentation for "API Keys" or "SMTP Settings"

### Step 5: Test Connection
1. After entering your credentials, click **"Test Connection"**
2. Wait a few seconds
3. You'll see either:
   - ✅ **Success**: "Connected successfully to [your email]"
   - ❌ **Failed**: Error message explaining the issue

### Step 6: Save Configuration
1. Once the test passes, click **"Save Configuration"**
2. Your provider is now configured but not active yet

### Step 7: Activate Provider
1. Toggle the switch next to your provider to **ON**
2. The provider card will show **"Active"** badge
3. All emails will now be sent through this provider

## Switching Providers

To switch to a different provider:

1. Configure the new provider (Steps 3-6 above)
2. Toggle OFF the current provider
3. Toggle ON the new provider
4. Done! Emails now go through the new provider

## Checking Status

### Active Provider
Look for the badge at the top right:
- 🟢 **Green dot + "Active: [Provider Name]"** = Working
- 🔴 **Gray dot + "No Active Provider"** = Not configured

### Email Logs
Click the **"Email Logs"** tab to see:
- Which emails were sent
- Success/failure status
- Error messages if any failed

## Common Issues

### "No Active Provider" Warning
**Problem**: No provider is enabled
**Solution**: Configure and enable a provider

### "Test Connection Failed"
**Problem**: Wrong credentials or network issue
**Solution**: 
- Double-check your API key
- Verify sender email is approved by provider
- Check internet connection

### Emails Not Sending
**Problem**: Provider inactive or credentials expired
**Solution**:
1. Check provider toggle is ON
2. Check Email Logs for error details
3. Test connection again
4. Update credentials if expired

## Best Practices

### For Daily Operations
- ✅ Keep at least one provider configured as backup
- ✅ Check Email Logs weekly to monitor delivery
- ✅ Update API keys before they expire

### For Testing
- ✅ Always click "Test Connection" before saving
- ✅ Send a test email after activation
- ✅ Monitor first batch of emails

### For Security
- ✅ Never share API keys publicly
- ✅ Use strong passwords for provider accounts
- ✅ Enable two-factor authentication on provider accounts

## Frequently Asked Questions

### Q: Can I use multiple providers at once?
**A**: Currently, only one provider can be active at a time. You can switch between them anytime.

### Q: Will emails be lost when switching?
**A**: No, queued emails will be sent through the new active provider.

### Q: How do I know which provider to choose?
**A**: Start with Brevo - it's free for up to 300 emails/day and very reliable.

### Q: What happens if I disable all providers?
**A**: New emails will fail to send until you enable a provider. Existing emails in the queue will wait.

### Q: Can I delete a provider configuration?
**A**: Yes, click the X button on the provider card. You'll be asked to confirm.

### Q: How much does it cost?
**A**: 
- **Brevo**: Free for 300 emails/day, paid plans start at $25/month
- **Supabase**: Depends on your plan
- Other providers have similar free tiers

## Need Help?

### Quick Troubleshooting
1. Check the provider toggle is ON (green)
2. Test the connection
3. Check Email Logs for error details
4. Try a different provider

### Getting Support
1. Check the documentation files in the project
2. Look at Email Logs for specific error messages
3. Contact your development team with:
   - Which provider you're using
   - Error message from logs
   - Screenshot of the issue

## Quick Setup Checklist

- [ ] Open Admin Dashboard
- [ ] Go to Email Center → Providers tab
- [ ] Click "Configure" on preferred provider
- [ ] Get API key from provider's website
- [ ] Enter credentials in form
- [ ] Click "Test Connection"
- [ ] See success message
- [ ] Click "Save Configuration"
- [ ] Toggle switch to ON
- [ ] Verify "Active" badge appears
- [ ] Send test email to verify
- [ ] Done! 🎉

## Provider Comparison

| Feature | Brevo | Supabase | SendGrid (Soon) |
|---------|-------|----------|-----------------|
| **Free Emails/Day** | 300 | Custom | 100 |
| **Setup Difficulty** | Easy | Moderate | Easy |
| **Analytics** | ✅ Yes | ❌ No | ✅ Yes |
| **Support** | Email | Community | Email |
| **Best For** | Most users | Developers | High volume |

## Tips for Success

1. **Start Simple**: Begin with Brevo - it's the easiest
2. **Test First**: Always test before switching in production
3. **Monitor Logs**: Check delivery status regularly
4. **Keep Backup**: Configure two providers for redundancy
5. **Update Keys**: API keys may expire - update proactively

---

**Questions?** Contact your development team or check the detailed documentation files.

**Status**: Your email system is flexible, reliable, and easy to manage! 🚀
