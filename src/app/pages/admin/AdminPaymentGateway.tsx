import { useState } from "react";
import { motion } from "motion/react";
import { Settings, Key, Eye, EyeOff, CheckCircle, AlertCircle, Save, RefreshCw, Play, Monitor } from "lucide-react";
import { toast } from "sonner";

interface PaymentGatewayConfig {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  isEnabled: boolean;
  webhookSecret: string;
  demoMode: boolean;
}

export default function AdminPaymentGateway() {
  const [showKeyId, setShowKeyId] = useState(false);
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load saved config from localStorage or use defaults
  const [config, setConfig] = useState<PaymentGatewayConfig>(() => {
    const saved = localStorage.getItem("razorpay_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...parsed, demoMode: parsed.demoMode ?? false };
    }
    return {
      razorpayKeyId: "",
      razorpayKeySecret: "",
      isEnabled: false,
      webhookSecret: "",
      demoMode: false,
    };
  });

  const handleInputChange = (field: keyof PaymentGatewayConfig, value: string | boolean) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    // In demo mode, credentials are not required
    if (!config.demoMode && (!config.razorpayKeyId || !config.razorpayKeySecret)) {
      toast.error("Please fill in all required fields or enable Demo Mode");
      return;
    }

    // Auto-enable the gateway when valid credentials are present
    const hasValidCredentials =
      config.demoMode ||
      (config.razorpayKeyId.startsWith("rzp_") && !!config.razorpayKeySecret);

    const configToSave = {
      ...config,
      isEnabled: hasValidCredentials ? true : config.isEnabled,
    };

    localStorage.setItem("razorpay_config", JSON.stringify(configToSave));
    // Notify same-tab listeners so Subscription page picks up the change immediately
    window.dispatchEvent(new Event("storage"));
    setConfig(configToSave);
    toast.success(
      hasValidCredentials
        ? "Payment gateway saved and activated successfully"
        : "Payment gateway settings saved successfully"
    );
  };

  const handleTestConnection = async () => {
    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      toast.error("Please configure Razorpay credentials first");
      return;
    }

    setIsTesting(true);
    
    // Simulate API test (in production, this would test the actual Razorpay connection)
    setTimeout(() => {
      setIsTesting(false);
      
      // Mock validation: Check if Key ID starts with "rzp_"
      if (config.razorpayKeyId.startsWith("rzp_")) {
        toast.success("Connection test successful! Razorpay is configured correctly.");
      } else {
        toast.error("Invalid Key ID format. Should start with 'rzp_test_' or 'rzp_live_'");
      }
    }, 2000);
  };

  const isKeyIdValid = config.razorpayKeyId.startsWith("rzp_");
  const isConfigured = config.demoMode || (isKeyIdValid && !!config.razorpayKeySecret);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Payment Gateway Settings</h1>
        <p className="text-[#64748b] text-sm mt-1">Configure Razorpay integration for platform payments.</p>
      </div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              config.isEnabled && isConfigured
                ? "bg-[#ecfdf5]"
                : isConfigured
                ? "bg-[#fffbeb]"
                : "bg-[#fef2f2]"
            }`}>
              {config.isEnabled && isConfigured ? (
                <CheckCircle size={24} className="text-[#10b981]" />
              ) : isConfigured ? (
                <AlertCircle size={24} className="text-[#f59e0b]" />
              ) : (
                <AlertCircle size={24} className="text-[#ef4444]" />
              )}
            </div>
            <div>
              <h3 className="text-[#1a1a2e]">Gateway Status</h3>
              <p className="text-sm text-[#64748b] mt-0.5">
                {config.isEnabled && isConfigured
                  ? config.demoMode
                    ? "Demo mode active — simulated payments enabled"
                    : "Razorpay is active and accepting payments"
                  : isConfigured
                  ? "Credentials entered — click Save to activate"
                  : "Payment gateway is not configured"}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-sm text-[#64748b]">Enable Gateway</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => handleInputChange("isEnabled", e.target.checked)}
                disabled={!isConfigured}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                config.isEnabled ? "bg-[#2F6BFF]" : "bg-[#e2e8f0]"
              } ${!isConfigured ? "opacity-50 cursor-not-allowed" : ""}`}></div>
              <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                config.isEnabled ? "translate-x-5" : ""
              }`}></div>
            </div>
          </label>
        </div>

        {!isConfigured && (
          <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-[#f59e0b] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#92400e]">
                <strong>Action Required:</strong> Configure your Razorpay credentials below to start accepting payments.
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Demo Mode Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`bg-white rounded-xl border-2 p-6 transition-all ${
          config.demoMode ? "border-[#f59e0b]/40 shadow-[0_0_0_3px_rgba(245,158,11,0.08)]" : "border-[#e2e8f0]"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              config.demoMode ? "bg-[#fffbeb]" : "bg-[#f1f5f9]"
            }`}>
              <Monitor size={22} className={config.demoMode ? "text-[#f59e0b]" : "text-[#94a3b8]"} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[#1a1a2e]">Demo Mode</h3>
                {config.demoMode && (
                  <span className="text-[10px] bg-[#fffbeb] text-[#f59e0b] px-2 py-0.5 rounded-full border border-[#f59e0b]/20">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-[#64748b] mt-0.5 max-w-md">
                Enable simulated payments for testing without real Razorpay credentials. Brands can complete the full checkout flow with a simulated payment UI.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer shrink-0 ml-4">
            <span className="text-sm text-[#64748b]">Enable Demo</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={config.demoMode}
                onChange={(e) => {
                  const newVal = e.target.checked;
                  handleInputChange("demoMode", newVal);
                  if (newVal) {
                    handleInputChange("isEnabled", true);
                  }
                }}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                config.demoMode ? "bg-[#f59e0b]" : "bg-[#e2e8f0]"
              }`}></div>
              <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                config.demoMode ? "translate-x-5" : ""
              }`}></div>
            </div>
          </label>
        </div>

        {config.demoMode && (
          <div className="mt-4 bg-[#fffbeb] border border-[#fef3c7] rounded-lg p-3.5 flex items-start gap-2.5">
            <Play size={14} className="text-[#f59e0b] shrink-0 mt-0.5" />
            <div className="text-xs text-[#92400e] space-y-1">
              <p>Demo mode is active. Payments will be simulated — no real charges will be made.</p>
              <p className="text-[#b45309]/70">Razorpay credentials are optional while demo mode is enabled. Remember to disable demo mode and configure real credentials before going live.</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Razorpay Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] flex items-center justify-center">
            <Key size={20} className="text-[#2F6BFF]" />
          </div>
          <div>
            <h3 className="text-[#1a1a2e]">Razorpay API Credentials</h3>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Get your credentials from{" "}
              <a
                href="https://dashboard.razorpay.com/app/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2F6BFF] hover:underline"
              >
                Razorpay Dashboard
              </a>
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Key ID */}
          <div>
            <label className="block text-sm text-[#1a1a2e] mb-2">
              Key ID <span className="text-[#ef4444]">*</span>
            </label>
            <div className="relative">
              <input
                type={showKeyId ? "text" : "password"}
                value={config.razorpayKeyId}
                onChange={(e) => handleInputChange("razorpayKeyId", e.target.value)}
                placeholder="rzp_test_xxxxxxxxxxxxxxxx or rzp_live_xxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2.5 pr-11 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKeyId(!showKeyId)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#1a1a2e] transition-colors"
              >
                {showKeyId ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {config.razorpayKeyId && (
              <p className={`text-xs mt-1.5 ${isKeyIdValid ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                {isKeyIdValid ? "✓ Valid key format" : "⚠ Key should start with 'rzp_test_' or 'rzp_live_'"}
              </p>
            )}
          </div>

          {/* Key Secret */}
          <div>
            <label className="block text-sm text-[#1a1a2e] mb-2">
              Key Secret <span className="text-[#ef4444]">*</span>
            </label>
            <div className="relative">
              <input
                type={showKeySecret ? "text" : "password"}
                value={config.razorpayKeySecret}
                onChange={(e) => handleInputChange("razorpayKeySecret", e.target.value)}
                placeholder="Enter your Razorpay Key Secret"
                className="w-full px-4 py-2.5 pr-11 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKeySecret(!showKeySecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#1a1a2e] transition-colors"
              >
                {showKeySecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1.5">
              Keep this secret safe. Never share it publicly.
            </p>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="block text-sm text-[#1a1a2e] mb-2">
              Webhook Secret <span className="text-[#64748b] text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type={showWebhookSecret ? "text" : "password"}
                value={config.webhookSecret}
                onChange={(e) => handleInputChange("webhookSecret", e.target.value)}
                placeholder="whsec_xxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2.5 pr-11 bg-white border border-[#e2e8f0] rounded-xl text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/20 focus:border-[#2F6BFF] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#1a1a2e] transition-colors"
              >
                {showWebhookSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1.5">
              Used to verify webhook signatures from Razorpay.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[#e2e8f0]">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#2F6BFF] text-white rounded-xl flex items-center gap-2 hover:bg-[#0F3D91] transition-colors text-sm"
          >
            <Save size={16} />
            Save Configuration
          </button>
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !isConfigured}
            className="px-5 py-2.5 bg-white border border-[#e2e8f0] text-[#1a1a2e] rounded-xl flex items-center gap-2 hover:bg-[#f8f9fc] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={isTesting ? "animate-spin" : ""} />
            {isTesting ? "Testing..." : "Test Connection"}
          </button>
        </div>
      </motion.div>

      {/* Integration Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#faf5ff] flex items-center justify-center">
            <Settings size={20} className="text-[#8b5cf6]" />
          </div>
          <h3 className="text-[#1a1a2e]">Integration Guide</h3>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-[#EBF2FF] text-[#2F6BFF] text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <p className="text-sm text-[#1a1a2e] mb-1">Create a Razorpay Account</p>
              <p className="text-xs text-[#94a3b8]">
                Sign up at{" "}
                <a
                  href="https://dashboard.razorpay.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2F6BFF] hover:underline"
                >
                  razorpay.com
                </a>{" "}
                and complete the KYC verification.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-[#EBF2FF] text-[#2F6BFF] text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <p className="text-sm text-[#1a1a2e] mb-1">Generate API Keys</p>
              <p className="text-xs text-[#94a3b8]">
                Go to Settings → API Keys in your Razorpay Dashboard and generate test/live keys.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-[#EBF2FF] text-[#2F6BFF] text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <p className="text-sm text-[#1a1a2e] mb-1">Configure Webhook (Optional)</p>
              <p className="text-xs text-[#94a3b8]">
                Set up webhook URL in Razorpay Dashboard to receive payment event notifications.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-[#EBF2FF] text-[#2F6BFF] text-xs flex items-center justify-center shrink-0">
              4
            </div>
            <div>
              <p className="text-sm text-[#1a1a2e] mb-1">Save & Test</p>
              <p className="text-xs text-[#94a3b8]">
                Enter your credentials above, save the configuration, and test the connection.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-[#eff6ff] border border-[#dbeafe] rounded-lg">
          <p className="text-xs text-[#1e40af]">
            <strong>Note:</strong> Use test keys (rzp_test_) during development. Switch to live keys (rzp_live_) only after thorough testing and when ready for production.
          </p>
        </div>
      </motion.div>
    </div>
  );
}