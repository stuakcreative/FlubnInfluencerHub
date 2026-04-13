import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Settings,
  Check,
  X,
  Eye,
  EyeOff,
  TestTube2,
  Zap,
  Loader2,
  AlertCircle,
  Server,
  Mail,
  Shield,
  Plug,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { toast } from "sonner";
import {
  getAllProviders,
  getProviderConfig,
  saveProviderConfig,
  deleteProviderConfig,
  setActiveProvider,
  getActiveProviderType,
  getProvider,
  type EmailProviderConfig,
  type EmailProvider,
  type ProviderType,
} from "../../utils/emailProviders";
import { EmailAnalytics } from "./BrevoAnalytics";

export function ProviderManagement() {
  const [providers] = useState<EmailProvider[]>(getAllProviders());
  const [activeProviderType, setActiveProviderType] = useState<ProviderType | null>(
    getActiveProviderType()
  );
  const [configs, setConfigs] = useState<Record<string, EmailProviderConfig>>({});
  const [editingProvider, setEditingProvider] = useState<ProviderType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  function loadConfigs() {
    const loaded: Record<string, EmailProviderConfig> = {};
    providers.forEach((provider) => {
      const config = getProviderConfig(provider.type);
      if (config) {
        loaded[provider.type] = config;
      }
    });
    setConfigs(loaded);
  }

  function handleEditProvider(type: ProviderType) {
    const provider = getProvider(type);
    if (!provider) return;

    const config = configs[type];
    const data: Record<string, string> = {};

    // Load credentials
    if (config) {
      provider.configFields.forEach((field) => {
        if (field.key in config.credentials) {
          data[field.key] = config.credentials[field.key];
        } else if (field.key in config.settings) {
          data[field.key] = config.settings[field.key];
        }
      });
    }

    setFormData(data);
    setEditingProvider(type);
  }

  async function handleTestConnection() {
    if (!editingProvider) return;

    const provider = getProvider(editingProvider);
    if (!provider) return;

    setTesting(true);

    try {
      // Build temp config from form data
      const tempConfig: EmailProviderConfig = {
        type: editingProvider,
        name: provider.name,
        enabled: false,
        credentials: {},
        settings: {},
      };

      provider.configFields.forEach((field) => {
        const value = formData[field.key] || "";
        if (field.type === "password" || field.key.toLowerCase().includes("key")) {
          tempConfig.credentials[field.key] = value;
        } else {
          tempConfig.settings[field.key] = value;
        }
      });

      const result = await provider.testConnection(tempConfig);

      if (result.success) {
        toast.success("Connection Successful", {
          description: result.message,
        });
      } else {
        toast.error("Connection Failed", {
          description: result.error || result.message,
        });
      }
    } catch (error: any) {
      toast.error("Test Failed", {
        description: error.message,
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveProvider() {
    if (!editingProvider) return;

    const provider = getProvider(editingProvider);
    if (!provider) return;

    setSaving(true);

    try {
      // Build config — preserve existing enabled state so saving doesn't disable a live provider
      const existingConfig = configs[editingProvider];
      const config: EmailProviderConfig = {
        type: editingProvider,
        name: provider.name,
        enabled: existingConfig?.enabled ?? false, // ← preserve, don't reset to false
        credentials: {},
        settings: {},
      };

      provider.configFields.forEach((field) => {
        const value = formData[field.key] || "";
        if (field.type === "password" || field.key.toLowerCase().includes("key")) {
          config.credentials[field.key] = value;
        } else {
          config.settings[field.key] = value;
        }
      });

      // Validate if provider has validation
      if (provider.validateConfig) {
        const validation = provider.validateConfig(config);
        if (!validation.valid) {
          toast.error("Validation Failed", {
            description: validation.errors.join(", "),
          });
          return;
        }
      }

      saveProviderConfig(config);
      loadConfigs();
      setEditingProvider(null);
      setFormData({});

      toast.success("Provider Saved", {
        description: `${provider.name} configuration saved successfully.`,
      });
    } catch (error: any) {
      toast.error("Save Failed", {
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  }

  function handleToggleProvider(type: ProviderType, enabled: boolean) {
    const config = configs[type];
    if (!config) return;

    const updated = { ...config, enabled };
    saveProviderConfig(updated);
    loadConfigs();

    if (enabled) {
      setActiveProvider(type);
      setActiveProviderType(type);
      toast.success("Provider Activated", {
        description: `${config.name} is now the active email provider.`,
      });
    } else if (activeProviderType === type) {
      setActiveProvider(null);
      setActiveProviderType(null);
      toast.info("Provider Deactivated", {
        description: "No active email provider. Configure and enable one.",
      });
    }
  }

  function handleDeleteProvider(type: ProviderType) {
    if (!confirm("Are you sure you want to delete this provider configuration?")) {
      return;
    }

    deleteProviderConfig(type);
    loadConfigs();
    toast.success("Provider Deleted");
  }

  const getProviderIcon = (type: ProviderType) => {
    switch (type) {
      case "supabase":
        return Server;
      case "brevo":
      case "sendgrid":
      case "mailgun":
      case "resend":
      case "mailchimp":
      case "postmark":
        return Mail;
      case "aws-ses":
        return Shield;
      default:
        return Plug;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Providers</h2>
          <p className="text-muted-foreground">
            Configure and manage your email delivery providers
          </p>
        </div>
        <Badge variant={activeProviderType ? "default" : "secondary"} className="gap-2">
          <span
            className="inline-flex size-2 rounded-full"
            style={{ background: activeProviderType ? "#22c55e" : "#94a3b8" }}
          />
          {activeProviderType
            ? `Active: ${configs[activeProviderType]?.name || activeProviderType}`
            : "No Active Provider"}
        </Badge>
      </div>

      {/* Active Provider Warning */}
      {!activeProviderType && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="size-5 text-yellow-500 shrink-0" />
              <div>
                <p className="font-medium text-yellow-600">No Active Email Provider</p>
                <p className="text-sm text-yellow-600/80">
                  Configure and enable a provider below to start sending emails.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => {
          const config = configs[provider.type];
          const isConfigured = !!config;
          const isActive = activeProviderType === provider.type;
          const isEnabled = config?.enabled || false;
          const Icon = getProviderIcon(provider.type);

          // Per-provider metadata
          const providerMeta: Record<string, {
            color: string;
            bgColor: string;
            freeTier: string;
            setupUrl: string;
            implemented: boolean;
          }> = {
            brevo: {
              color: "text-blue-600",
              bgColor: "bg-blue-50",
              freeTier: "300 emails/day free",
              setupUrl: "https://app.brevo.com/settings/keys/api",
              implemented: true,
            },
            supabase: {
              color: "text-green-600",
              bgColor: "bg-green-50",
              freeTier: "Custom edge function",
              setupUrl: "https://supabase.com/dashboard",
              implemented: true,
            },
            sendgrid: {
              color: "text-cyan-600",
              bgColor: "bg-cyan-50",
              freeTier: "100 emails/day free",
              setupUrl: "https://app.sendgrid.com/settings/api_keys",
              implemented: true,
            },
            resend: {
              color: "text-violet-600",
              bgColor: "bg-violet-50",
              freeTier: "3,000 emails/month free",
              setupUrl: "https://resend.com/api-keys",
              implemented: true,
            },
            mailgun: {
              color: "text-red-600",
              bgColor: "bg-red-50",
              freeTier: "5,000 emails/month (trial)",
              setupUrl: "https://app.mailgun.com/settings/api_security",
              implemented: true,
            },
          };

          const meta = providerMeta[provider.type] ?? {
            color: "text-primary",
            bgColor: "bg-primary/10",
            freeTier: "",
            setupUrl: "#",
            implemented: false,
          };

          return (
            <motion.div
              key={provider.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                className={`transition-all h-full flex flex-col ${
                  isActive ? "ring-2 ring-green-500 shadow-lg" : ""
                } ${!meta.implemented && !isConfigured ? "opacity-70" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-lg ${meta.bgColor} flex items-center justify-center`}>
                        <Icon className={`size-5 ${meta.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base leading-tight">{provider.name}</CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {isActive && (
                            <Badge variant="default" className="text-xs h-5 bg-green-600">
                              ● Active
                            </Badge>
                          )}
                          {isConfigured && !isActive && (
                            <Badge variant="secondary" className="text-xs h-5">
                              Configured
                            </Badge>
                          )}
                          {!isConfigured && meta.implemented && (
                            <Badge variant="outline" className="text-xs h-5">
                              Not Configured
                            </Badge>
                          )}
                          {meta.implemented ? (
                            <Badge className="text-xs h-5 bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                              ✓ Live
                            </Badge>
                          ) : (
                            <Badge className="text-xs h-5 bg-amber-100 text-amber-700 border-amber-200" variant="outline">
                              Coming Soon
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {isConfigured && meta.implemented && (
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          handleToggleProvider(provider.type, checked)
                        }
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground flex-1">{provider.description}</p>

                  {/* Free tier & setup link */}
                  <div className="flex items-center justify-between text-xs">
                    {meta.freeTier && (
                      <span className={`${meta.color} font-medium`}>
                        🎁 {meta.freeTier}
                      </span>
                    )}
                    <a
                      href={meta.setupUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-primary underline underline-offset-2 ml-auto"
                    >
                      Get API Key ↗
                    </a>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {meta.implemented ? (
                      <>
                        <Button
                          size="sm"
                          variant={isConfigured ? "outline" : "default"}
                          className="flex-1"
                          onClick={() => handleEditProvider(provider.type)}
                        >
                          <Settings className="size-4 mr-2" />
                          {isConfigured ? "Edit Config" : "Configure"}
                        </Button>
                        {isConfigured && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteProvider(provider.type)}
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 opacity-50 cursor-not-allowed"
                        disabled
                        title="This provider integration is coming soon"
                      >
                        <Settings className="size-4 mr-2" />
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Configuration Dialog */}
      {editingProvider && (
        <Card className="mt-6 border-2 border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Configure {getProvider(editingProvider)?.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {getProvider(editingProvider)?.description}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingProvider(null);
                  setFormData({});
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {getProvider(editingProvider)?.configFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>

                {field.type === "select" && field.options ? (
                  <Select
                    value={formData[field.key] || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, [field.key]: value })
                    }
                  >
                    <SelectTrigger id={field.key}>
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="relative">
                    <Input
                      id={field.key}
                      type={
                        field.type === "password"
                          ? showPasswords[field.key] ? "text" : "password"
                          : field.type
                      }
                      placeholder={field.placeholder}
                      value={formData[field.key] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.key]: e.target.value })
                      }
                    />
                    {field.type === "password" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            [field.key]: !showPasswords[field.key],
                          })
                        }
                      >
                        {showPasswords[field.key] ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {field.helpText && (
                  <p className="text-xs text-muted-foreground">{field.helpText}</p>
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleTestConnection}
                variant="outline"
                disabled={testing || saving}
                className="flex-1"
              >
                {testing ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube2 className="size-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button
                onClick={handleSaveProvider}
                disabled={testing || saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="size-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics — shown for the active provider */}
      {activeProviderType && <EmailAnalytics providerType={activeProviderType} />}
    </div>
  );
}