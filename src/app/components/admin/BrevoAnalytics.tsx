import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  RefreshCw,
  Send,
  CheckCircle,
  XCircle,
  Mail,
  MousePointerClick,
  ShieldAlert,
  Inbox,
  Activity,
  TestTube2,
  AlertTriangle,
  Eye,
  EyeOff,
  WifiOff,
  ExternalLink,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import {
  getProviderConfig,
  getProvider,
  type ProviderType,
  type EmailProviderConfig,
} from "../../utils/emailProviders";

// ══════════════════════════════════════════════════════════════════════════════
// LOCAL EMAIL LOG  (used by all non-Brevo providers)
// ══════════════════════════════════════════════════════════════════════════════

const LOCAL_LOG_KEY = "flubn_email_log";
const MAX_LOG = 200;

export interface LocalEmailLog {
  id: string;
  provider: ProviderType;
  to: string;
  toName?: string;
  subject: string;
  timestamp: string; // ISO
  status: "sent" | "failed";
  messageId?: string;
  error?: string;
}

function readLocalLog(): LocalEmailLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendLocalLog(entry: Omit<LocalEmailLog, "id">): void {
  try {
    const log = readLocalLog();
    const newEntry: LocalEmailLog = { id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`, ...entry };
    log.unshift(newEntry);
    localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(log.slice(0, MAX_LOG)));
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════���══════
// BREVO API HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface BrevoAggregatedStats {
  requests: number;
  delivered: number;
  hardBounces: number;
  softBounces: number;
  clicks: number;
  uniqueClicks: number;
  opens: number;
  uniqueOpens: number;
  unsubscriptions: number;
  complaints: number;
  blocked: number;
  invalid: number;
}

interface BrevoDaily extends BrevoAggregatedStats {
  date: string;
}

type BrevoEventType =
  | "requests"
  | "delivered"
  | "hardBounces"
  | "softBounces"
  | "clicks"
  | "opens"
  | "unsubscriptions"
  | "spam"
  | "invalid"
  | "deferred"
  | "blocked"
  | "error";

interface BrevoEvent {
  email: string;
  date: string;
  subject?: string;
  messageId?: string;
  event: BrevoEventType;
  ip?: string;
  link?: string;
}

const BREVO_API_BASE = "https://api.brevo.com/v3";

async function brevoApiFetch<T>(endpoint: string, apiKey: string, options: RequestInit = {}): Promise<T> {
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

async function fetchBrevoAggregated(apiKey: string, startDate: string, endDate: string): Promise<BrevoAggregatedStats | null> {
  try {
    return await brevoApiFetch<BrevoAggregatedStats>(
      `/smtp/statistics/aggregatedReport?startDate=${startDate}&endDate=${endDate}`,
      apiKey
    );
  } catch {
    return null;
  }
}

async function fetchBrevoDaily(apiKey: string, days: number): Promise<BrevoDaily[]> {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().split("T")[0];
  try {
    const data = await brevoApiFetch<{ reports: BrevoDaily[] }>(
      `/smtp/statistics/reports?startDate=${startDate}&endDate=${endDate}&aggregation=day`,
      apiKey
    );
    return data.reports || [];
  } catch {
    return [];
  }
}

async function fetchBrevoEvents(apiKey: string, limit = 100): Promise<BrevoEvent[]> {
  try {
    const data = await brevoApiFetch<{ events: BrevoEvent[] }>(
      `/smtp/statistics/events?limit=${limit}&sort=desc`,
      apiKey
    );
    return data.events || [];
  } catch {
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function calcDeliveryRate(stats: BrevoAggregatedStats): string {
  if (!stats.requests) return "0%";
  return ((stats.delivered / stats.requests) * 100).toFixed(1) + "%";
}
function calcOpenRate(stats: BrevoAggregatedStats): string {
  if (!stats.delivered) return "0%";
  return ((stats.uniqueOpens / stats.delivered) * 100).toFixed(1) + "%";
}
function calcClickRate(stats: BrevoAggregatedStats): string {
  if (!stats.delivered) return "0%";
  return ((stats.uniqueClicks / stats.delivered) * 100).toFixed(1) + "%";
}

function buildTestHtml(message: string, providerName: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">FLUBN Test Email</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">via ${providerName}</p>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
      <p style="color:#374151;font-size:16px;line-height:1.6;">${message}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;">Sent via FLUBN Admin Panel · ${providerName}</p>
    </div>
  </div>`;
}

const eventColor: Record<string, string> = {
  delivered: "bg-green-100 text-green-700",
  opens: "bg-purple-100 text-purple-700",
  clicks: "bg-orange-100 text-orange-700",
  hardBounces: "bg-red-100 text-red-700",
  softBounces: "bg-yellow-100 text-yellow-700",
  unsubscriptions: "bg-gray-100 text-gray-700",
  spam: "bg-red-100 text-red-700",
  blocked: "bg-red-100 text-red-700",
  deferred: "bg-yellow-100 text-yellow-700",
  requests: "bg-blue-100 text-blue-700",
  invalid: "bg-red-100 text-red-700",
  error: "bg-red-200 text-red-800",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const PROVIDER_LABELS: Record<string, string> = {
  brevo: "Brevo",
  sendgrid: "SendGrid",
  resend: "Resend",
  mailgun: "Mailgun",
  supabase: "Supabase Edge Fn",
};

// Build per-day local stats from log entries for chart
function buildLocalDailyData(log: LocalEmailLog[], days: number): { date: string; sent: number; failed: number }[] {
  const map: Record<string, { sent: number; failed: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().split("T")[0];
    map[d] = { sent: 0, failed: 0 };
  }
  log.forEach((entry) => {
    const d = entry.timestamp.split("T")[0];
    if (map[d]) {
      if (entry.status === "sent") map[d].sent++;
      else map[d].failed++;
    }
  });
  return Object.entries(map).map(([date, v]) => ({ date, ...v }));
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

interface EmailAnalyticsProps {
  providerType: ProviderType;
}

export function EmailAnalytics({ providerType }: EmailAnalyticsProps) {
  const config = getProviderConfig(providerType) as EmailProviderConfig | null;
  const provider = getProvider(providerType);
  const isBrevo = providerType === "brevo";

  const apiKey = config?.credentials?.apiKey?.trim() || "";
  const senderEmail = config?.settings?.senderEmail?.trim() || "";
  const senderName = config?.settings?.senderName?.trim() || "FLUBN";
  const providerLabel = PROVIDER_LABELS[providerType] || providerType;

  // ── Brevo-specific state ─────────────────────────────────────────────────
  const [brevoStats, setBrevoStats] = useState<BrevoAggregatedStats | null>(null);
  const [brevoDaily, setBrevoDaily] = useState<BrevoDaily[]>([]);
  const [brevoEvents, setBrevoEvents] = useState<BrevoEvent[]>([]);

  // ── Local log state (all providers) ─────────────────────────────────────
  const [localLog, setLocalLog] = useState<LocalEmailLog[]>([]);

  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [eventFilter, setEventFilter] = useState("all");
  const [brevoPage, setBrevoPage] = useState(1);
  const [localPage, setLocalPage] = useState(1);

  const [testForm, setTestForm] = useState({
    to: "",
    name: "",
    subject: `Test Email from FLUBN via ${providerLabel}`,
    message: `This is a test email sent from the FLUBN admin panel via ${providerLabel}.`,
  });
  const [showMsg, setShowMsg] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  // ── Reset pages when filter changes ──────────────────────────────────────
  useEffect(() => {
    setBrevoPage(1);
    setLocalPage(1);
  }, [eventFilter]);

  // ── Load data on mount / when provider changes ───────────────────────────
  useEffect(() => {
    setTestForm((f) => ({
      ...f,
      subject: `Test Email from FLUBN via ${providerLabel}`,
      message: `This is a test email sent from the FLUBN admin panel via ${providerLabel}.`,
    }));
    loadData(7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerType, apiKey]);

  async function loadData(d: number = days) {
    setLoading(true);
    try {
      // Always reload local log
      const log = readLocalLog().filter((e) => e.provider === providerType);
      setLocalLog(log);

      if (isBrevo && apiKey) {
        const endDate = new Date().toISOString().split("T")[0];
        const startDate = new Date(Date.now() - (d - 1) * 86_400_000).toISOString().split("T")[0];
        const [s, dl, ev] = await Promise.all([
          fetchBrevoAggregated(apiKey, startDate, endDate),
          fetchBrevoDaily(apiKey, d),
          fetchBrevoEvents(apiKey, 100),
        ]);
        if (s) setBrevoStats(s);
        setBrevoDaily(dl);
        setBrevoEvents(ev);
      }
    } catch (e: any) {
      toast.error("Failed to load analytics: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Test email ────────────────────────────────────────────────────────────
  async function handleSendTest() {
    if (!testForm.to.trim()) { toast.error("Recipient email required"); return; }
    if (!config) { toast.error(`${providerLabel} is not configured.`); return; }
    if (!provider) { toast.error(`Provider ${providerLabel} not registered.`); return; }
    if (!senderEmail) { toast.error("Sender email not configured. Edit the provider and add a sender email."); return; }

    setTestLoading(true);
    try {
      const result = await provider.sendEmail(
        {
          to: testForm.to.trim(),
          toName: testForm.name.trim() || "Test User",
          subject: testForm.subject || `Test Email from FLUBN via ${providerLabel}`,
          htmlContent: buildTestHtml(testForm.message, providerLabel),
          tags: ["test"],
        },
        config
      );

      // Log the result locally (for all providers)
      appendLocalLog({
        provider: providerType,
        to: testForm.to.trim(),
        toName: testForm.name.trim() || "Test User",
        subject: testForm.subject,
        timestamp: new Date().toISOString(),
        status: result.success ? "sent" : "failed",
        messageId: result.messageId,
        error: result.error,
      });

      if (result.success) {
        if (result.warning) {
          // CORS fallback was used — email delivered via Edge Function instead
          toast.warning("Email delivered via Supabase Edge Function fallback", {
            description: result.warning,
            duration: 8000,
          });
        } else {
          toast.success(`Test email sent! ${result.messageId ? `ID: ${result.messageId}` : ""}`);
        }
      } else {
        toast.error(`Failed: ${result.error}`);
      }
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setTestLoading(false);
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredBrevoEvents = useMemo(() => {
    if (eventFilter === "all") return brevoEvents;
    return brevoEvents.filter((e) => e.event === eventFilter);
  }, [brevoEvents, eventFilter]);

  const filteredLocalLog = useMemo(() => {
    if (eventFilter === "all") return localLog;
    return localLog.filter((e) => e.status === eventFilter);
  }, [localLog, eventFilter]);

  const localDailyData = useMemo(() => buildLocalDailyData(localLog, days), [localLog, days]);

  const localStatCards = useMemo(() => {
    const sent = localLog.filter((e) => e.status === "sent").length;
    const failed = localLog.filter((e) => e.status === "failed").length;
    const total = localLog.length;
    const rate = total ? ((sent / total) * 100).toFixed(1) + "%" : "—";
    return [
      { label: "Total Sent", value: total, icon: Inbox, color: "text-blue-500", bg: "bg-blue-50" },
      { label: "Delivered", value: sent, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", sub: rate },
      { label: "Failed", value: failed, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
    ];
  }, [localLog]);

  const brevoStatCards = brevoStats
    ? [
        { label: "Requests", value: brevoStats.requests ?? 0, icon: Inbox, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Delivered", value: brevoStats.delivered ?? 0, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", sub: calcDeliveryRate(brevoStats) },
        { label: "Opens", value: brevoStats.uniqueOpens ?? 0, icon: Mail, color: "text-purple-500", bg: "bg-purple-50", sub: calcOpenRate(brevoStats) },
        { label: "Clicks", value: brevoStats.uniqueClicks ?? 0, icon: MousePointerClick, color: "text-orange-500", bg: "bg-orange-50", sub: calcClickRate(brevoStats) },
        { label: "Bounces", value: (brevoStats.hardBounces ?? 0) + (brevoStats.softBounces ?? 0), icon: ShieldAlert, color: "text-red-500", bg: "bg-red-50" },
        { label: "Unsubscribed", value: brevoStats.unsubscriptions ?? 0, icon: XCircle, color: "text-gray-500", bg: "bg-gray-50" },
      ]
    : [];

  // ── Guard: not configured ────────────────────────────────────────────────
  if (!config) {
    return (
      <div className="space-y-4 mt-6 pt-6 border-t">
        <Card className="border-yellow-400/60 bg-yellow-50/60">
          <CardContent className="flex items-start gap-3 pt-6">
            <WifiOff className="size-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">{providerLabel} not configured</p>
              <p className="text-sm text-yellow-700 mt-1">
                Click <span className="font-medium">Configure</span> on the {providerLabel} provider card above,
                enter your credentials, then click <span className="font-medium">Save Configuration</span>. Analytics
                and the test email tool will appear here once configured.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Brevo-specific guard: no API key ─────────────────────────────────────
  if (isBrevo && !apiKey) {
    return (
      <div className="space-y-4 mt-6 pt-6 border-t">
        <Card className="border-yellow-400/60 bg-yellow-50/60">
          <CardContent className="flex items-start gap-3 pt-6">
            <WifiOff className="size-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">Brevo API key not found</p>
              <p className="text-sm text-yellow-700 mt-1">
                Click <span className="font-medium">Edit</span> on the Brevo provider card above,
                enter your API key and sender email, then click{" "}
                <span className="font-medium">Save Configuration</span>. Analytics and the test
                email tool will appear here once configured.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 mt-6 pt-6 border-t">
      {/* Security note */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <AlertTriangle className="size-4 mt-0.5 shrink-0" />
        <span>
          <span className="font-semibold">Admin-only.</span> Credentials are stored in browser
          localStorage under the unified provider config. For production, proxy calls through your
          Supabase Edge Function.
        </span>
      </div>

      {/* Non-Brevo CORS notice */}
      {!isBrevo && (
        <div className="flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800">
          <Info className="size-4 mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">{providerLabel} analytics note.</span>{" "}
            {providerLabel}'s stats &amp; event APIs block browser CORS requests, so delivery
            analytics below are based on emails logged locally by FLUBN. Real open/click tracking
            requires webhook integration on your backend.
          </span>
        </div>
      )}

      {/* ── Brevo: delivery error diagnostic banner ───────────────────── */}
      {isBrevo && brevoEvents.some((e) => e.event === "error") && (
        null
      )}

      {/* ── Analytics Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="size-5 text-blue-500" />
          {providerLabel} Delivery Analytics
        </h3>
        <div className="flex items-center gap-2">
          {([7, 14, 30] as const).map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              onClick={() => { setDays(d); loadData(d); }}
            >
              {d}d
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => loadData(days)} disabled={loading} className="gap-1">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      {isBrevo ? (
        brevoStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {brevoStatCards.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <div className={`flex size-8 items-center justify-center rounded-full ${s.bg} mb-2`}>
                    <s.icon className={`size-4 ${s.color}`} />
                  </div>
                  <div className="text-2xl font-bold">{(s.value ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  {s.sub && <div className={`text-xs font-medium mt-0.5 ${s.color}`}>{s.sub}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {localStatCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className={`flex size-8 items-center justify-center rounded-full ${s.bg} mb-2`}>
                  <s.icon className={`size-4 ${s.color}`} />
                </div>
                <div className="text-2xl font-bold">{(s.value ?? 0).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                {s.sub && <div className={`text-xs font-medium mt-0.5 ${s.color}`}>{s.sub}</div>}
              </CardContent>
            </Card>
          ))}
          <Card className="md:col-span-3 border-dashed">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <Info className="size-4 shrink-0" />
              Opens &amp; clicks require webhook integration. Set up {providerLabel} webhooks pointing to your Supabase Edge Function to track these events.
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Daily Activity Chart ──────────────────────────────────────────── */}
      {isBrevo ? (
        brevoDaily.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Email Activity</CardTitle>
              <CardDescription>Last {days} days — delivered, opens, clicks</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={brevoDaily} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gOpens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="delivered" stroke="#22c55e" fill="url(#gDelivered)" strokeWidth={2} name="Delivered" />
                  <Area type="monotone" dataKey="uniqueOpens" stroke="#8b5cf6" fill="url(#gOpens)" strokeWidth={2} name="Opens" />
                  <Area type="monotone" dataKey="uniqueClicks" stroke="#f97316" fill="url(#gClicks)" strokeWidth={2} name="Clicks" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Email Activity</CardTitle>
            <CardDescription>Last {days} days — sent &amp; failed (locally tracked)</CardDescription>
          </CardHeader>
          <CardContent>
            {localDailyData.every((d) => d.sent === 0 && d.failed === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <Inbox className="size-8 opacity-30" />
                No activity yet. Send a test email to see data here.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={localDailyData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sent" name="Sent" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {loading && (isBrevo ? brevoDaily.length === 0 : localLog.length === 0) && (
        <Card>
          <CardContent className="flex items-center justify-center py-16 text-muted-foreground gap-3">
            <RefreshCw className="size-5 animate-spin" />
            Loading {providerLabel} analytics...
          </CardContent>
        </Card>
      )}

      {/* ── Recent Email Events ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="size-4 text-blue-500" />
                Recent Email Events
              </CardTitle>
              <CardDescription>
                {isBrevo
                  ? "Last 100 transactional email events from Brevo"
                  : `Locally tracked email events for ${providerLabel}`}
              </CardDescription>
            </div>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {isBrevo ? (
                  <>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="opens">Opened</SelectItem>
                    <SelectItem value="clicks">Clicked</SelectItem>
                    <SelectItem value="hardBounces">Hard Bounce</SelectItem>
                    <SelectItem value="softBounces">Soft Bounce</SelectItem>
                    <SelectItem value="unsubscriptions">Unsubscribed</SelectItem>
                    <SelectItem value="spam">Spam</SelectItem>
                    <SelectItem value="deferred">Deferred</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isBrevo ? (
            filteredBrevoEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                <Inbox className="size-8 opacity-30" />
                {brevoEvents.length === 0
                  ? "No events yet. Send a test email to get started."
                  : "No events match this filter."}
              </div>
            ) : (() => {
              const PAGE = 10;
              const totalPages = Math.ceil(filteredBrevoEvents.length / PAGE);
              const pageRows = filteredBrevoEvents.slice((brevoPage - 1) * PAGE, brevoPage * PAGE);
              return (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.map((ev, i) => (
                        <TableRow key={`${ev.messageId ?? i}-${(brevoPage - 1) * PAGE + i}`}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {ev.date
                              ? new Date(ev.date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm max-w-[160px] truncate">{ev.email}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{ev.subject || "—"}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${eventColor[ev.event] || "bg-gray-100 text-gray-700"}`}>
                              {ev.event}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                            {ev.link ? (
                              <a href={ev.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate block">{ev.link}</a>
                            ) : (ev.ip || "—")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {(brevoPage - 1) * PAGE + 1}–{Math.min(brevoPage * PAGE, filteredBrevoEvents.length)} of {filteredBrevoEvents.length}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={brevoPage === 1}
                          onClick={() => setBrevoPage((p) => p - 1)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-[#2F6BFF] hover:border-[#2F6BFF]/40 hover:bg-[#eef2ff] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-medium text-foreground px-1">
                          {brevoPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={brevoPage === totalPages}
                          onClick={() => setBrevoPage((p) => p + 1)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-[#2F6BFF] hover:border-[#2F6BFF]/40 hover:bg-[#eef2ff] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          ) : (
            filteredLocalLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                <Inbox className="size-8 opacity-30" />
                {localLog.length === 0
                  ? "No events yet. Send a test email to get started."
                  : "No events match this filter."}
              </div>
            ) : (() => {
              const PAGE = 10;
              const totalPages = Math.ceil(filteredLocalLog.length / PAGE);
              const pageRows = filteredLocalLog.slice((localPage - 1) * PAGE, localPage * PAGE);
              return (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Message ID / Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.map((ev) => (
                        <TableRow key={ev.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(ev.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell className="text-sm max-w-[160px] truncate">{ev.to}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{ev.subject}</TableCell>
                          <TableCell>
                            <Badge
                              className={`text-xs ${ev.status === "sent" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                              variant="outline"
                            >
                              {ev.status === "sent" ? "✓ Sent" : "✗ Failed"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                            {ev.status === "sent"
                              ? (ev.messageId || "—")
                              : <span className="text-red-500">{ev.error || "Unknown error"}</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {(localPage - 1) * PAGE + 1}–{Math.min(localPage * PAGE, filteredLocalLog.length)} of {filteredLocalLog.length}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={localPage === 1}
                          onClick={() => setLocalPage((p) => p - 1)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-[#2F6BFF] hover:border-[#2F6BFF]/40 hover:bg-[#eef2ff] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-medium text-foreground px-1">
                          {localPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={localPage === totalPages}
                          onClick={() => setLocalPage((p) => p + 1)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-[#2F6BFF] hover:border-[#2F6BFF]/40 hover:bg-[#eef2ff] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </CardContent>
      </Card>

      {/* ── Send Test Email ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TestTube2 className="size-4 text-violet-500" />
            Send Test Email via {providerLabel}
          </CardTitle>
          <CardDescription>
            Verify your {providerLabel} setup is working correctly
            {senderEmail && (
              <span className="ml-1 text-green-600">
                · Sending from <span className="font-medium">{senderEmail}</span>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!senderEmail && (
            <div className="flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-800">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              Sender email is not set. Edit the {providerLabel} provider and add a sender email before sending.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Recipient Email <span className="text-red-500">*</span></Label>
              <Input
                className="mt-1"
                type="email"
                value={testForm.to}
                onChange={(e) => setTestForm({ ...testForm, to: e.target.value })}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label>Recipient Name</Label>
              <Input
                className="mt-1"
                value={testForm.name}
                onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                placeholder="Test User"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Subject</Label>
              <Input
                className="mt-1"
                value={testForm.subject}
                onChange={(e) => setTestForm({ ...testForm, subject: e.target.value })}
                placeholder={`Test Email from FLUBN via ${providerLabel}`}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Message</Label>
              <div className="relative mt-1">
                <Textarea
                  rows={showMsg ? 4 : 2}
                  value={testForm.message}
                  onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                  placeholder="Test message body..."
                />
                <button
                  type="button"
                  className="absolute right-3 top-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowMsg((v) => !v)}
                >
                  {showMsg ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>
          <Button onClick={handleSendTest} disabled={testLoading || !senderEmail} className="gap-2">
            {testLoading ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send Test Email
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// backward-compat alias (used by older import)
export { EmailAnalytics as BrevoAnalytics };