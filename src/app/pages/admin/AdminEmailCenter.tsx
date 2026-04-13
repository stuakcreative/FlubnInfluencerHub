import { useState, useMemo } from "react";
import {
  Mail,
  Send,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import {
  getEmailTemplates,
  getEmailLogs,
  updateTemplate,
  createTemplate,
  deleteTemplate,
  clearEmailLogs,
  substituteVariables,
  type EmailTemplate,
  type EmailLog,
} from "../../utils/emailTemplates";
import {
  sendBulkEmails,
  getEmailQueue,
  processEmailQueue,
  retryFailedEmails,
  clearEmailQueue,
  type QueuedEmail,
} from "../../utils/emailService";
import { ProviderManagement } from "../../components/admin/ProviderManagement";

export default function AdminEmailCenter() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(getEmailTemplates());
  const [logs, setLogs] = useState<EmailLog[]>(getEmailLogs());
  const [queue, setQueue] = useState<QueuedEmail[]>(getEmailQueue());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Dialogs
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showBulkEmailDialog, setShowBulkEmailDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  // Form states
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "transactional" as EmailTemplate["category"],
    subject: "",
    body: "",
    variables: "",
  });
  const [bulkEmailForm, setBulkEmailForm] = useState({
    templateId: "",
    recipientType: "all" as "all" | "influencers" | "brands",
    customSubject: "",
    customContent: "",
  });

  // ── Refresh data ──────────────────────────────────────────────────────────
  const refreshData = () => {
    setTemplates(getEmailTemplates());
    setLogs(getEmailLogs());
    setQueue(getEmailQueue());
  };

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        filterCategory === "all" || template.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, filterCategory]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.templateName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || log.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [logs, searchQuery, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter((l) => l.status === "sent").length;
    const failed = logs.filter((l) => l.status === "failed").length;
    const pending = queue.filter((q) => q.status === "pending").length;
    return { total, sent, failed, pending };
  }, [logs, queue]);

  // Create/Edit Template
  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const variables = templateForm.variables
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      if (editingTemplate) {
        updateTemplate(editingTemplate.id, {
          name: templateForm.name,
          category: templateForm.category,
          subject: templateForm.subject,
          body: templateForm.body,
          variables,
        });
        toast.success("Template updated successfully");
      } else {
        createTemplate({
          name: templateForm.name,
          category: templateForm.category,
          subject: templateForm.subject,
          body: templateForm.body,
          variables,
          enabled: true,
        });
        toast.success("Template created successfully");
      }

      refreshData();
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      resetTemplateForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      deleteTemplate(id);
      toast.success("Template deleted successfully");
      refreshData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template");
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      category: "transactional",
      subject: "",
      body: "",
      variables: "",
    });
  };

  // Send Bulk Email
  const handleSendBulkEmail = async () => {
    if (!bulkEmailForm.templateId) {
      toast.error("Please select a template");
      return;
    }

    try {
      const allUsers: Array<{ email: string; name: string; role: string }> = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("flubn_registered_")) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || "");
            if (data.email && data.name) {
              allUsers.push({
                email: data.email,
                name: data.name,
                role: data.role || "brand",
              });
            }
          } catch {}
        }
      }

      let recipients = allUsers;
      if (bulkEmailForm.recipientType === "influencers") {
        recipients = allUsers.filter((u) => u.role === "influencer");
      } else if (bulkEmailForm.recipientType === "brands") {
        recipients = allUsers.filter((u) => u.role === "brand");
      }

      if (recipients.length === 0) {
        toast.error("No recipients found");
        return;
      }

      const baseVariables: Record<string, any> = {};
      if (bulkEmailForm.customSubject) {
        baseVariables.subject = bulkEmailForm.customSubject;
      }
      if (bulkEmailForm.customContent) {
        baseVariables.content = bulkEmailForm.customContent;
        baseVariables.title = "Important Update";
      }

      toast.info(`Sending emails to ${recipients.length} recipients...`);

      const result = await sendBulkEmails(
        recipients.map((r) => ({ email: r.email, name: r.name })),
        bulkEmailForm.templateId,
        baseVariables
      );

      toast.success(`Successfully sent ${result.sent} emails. Failed: ${result.failed}`);
      refreshData();
      setShowBulkEmailDialog(false);
      setBulkEmailForm({
        templateId: "",
        recipientType: "all",
        customSubject: "",
        customContent: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to send bulk emails");
    }
  };

  // Queue Management
  const handleProcessQueue = async () => {
    toast.info("Processing email queue...");
    await processEmailQueue();
    refreshData();
    toast.success("Queue processed successfully");
  };

  const handleRetryFailed = async () => {
    toast.info("Retrying failed emails...");
    await retryFailedEmails();
    refreshData();
    toast.success("Failed emails queued for retry");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Center</h1>
          <p className="text-muted-foreground">Manage email templates and campaigns</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setEditingTemplate(null);
              resetTemplateForm();
              setShowTemplateDialog(true);
            }}
          >
            <Plus className="size-4 mr-2" />
            New Template
          </Button>
          <Button onClick={() => setShowBulkEmailDialog(true)} variant="default">
            <Send className="size-4 mr-2" />
            Send Bulk Email
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <Clock className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Email Logs</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <Settings className="size-4" />
            Providers
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="promotional">Promotional</SelectItem>
                <SelectItem value="notification">Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.subject}</CardDescription>
                    </div>
                    <Badge variant={template.category === "promotional" ? "default" : "secondary"}>
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.variables.map((v) => (
                      <Badge key={v} variant="outline" className="text-xs">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPreviewTemplate(template);
                        setShowPreviewDialog(true);
                      }}
                    >
                      <Eye className="size-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTemplate(template);
                        setTemplateForm({
                          name: template.name,
                          category: template.category,
                          subject: template.subject,
                          body: template.body,
                          variables: template.variables.join(", "),
                        });
                        setShowTemplateDialog(true);
                      }}
                    >
                      <Edit className="size-4 mr-2" />
                      Edit
                    </Button>
                    {template.id.startsWith("custom_") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="size-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Clear all email logs?")) {
                  clearEmailLogs();
                  refreshData();
                  toast.success("Logs cleared");
                }
              }}
            >
              <Trash2 className="size-4 mr-2" />
              Clear Logs
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.slice(0, 100).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.sentAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{log.recipientName}</div>
                      <div className="text-xs text-muted-foreground">{log.recipientEmail}</div>
                    </TableCell>
                    <TableCell className="text-sm">{log.templateName}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === "sent" ? "default" : "destructive"}>
                        {log.status}
                      </Badge>
                      {log.error && (
                        <div className="text-xs text-red-500 mt-1">{log.error}</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={handleProcessQueue}>
              <RefreshCw className="size-4 mr-2" />
              Process Queue
            </Button>
            <Button onClick={handleRetryFailed} variant="outline">
              <RefreshCw className="size-4 mr-2" />
              Retry Failed
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Clear entire queue?")) {
                  clearEmailQueue();
                  refreshData();
                  toast.success("Queue cleared");
                }
              }}
            >
              <Trash2 className="size-4 mr-2" />
              Clear Queue
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Retries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      {new Date(item.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{item.params.toName}</div>
                      <div className="text-xs text-muted-foreground">{item.params.to}</div>
                    </TableCell>
                    <TableCell className="text-sm">{item.params.templateId}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "sent"
                            ? "default"
                            : item.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{item.retryCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Providers Tab — includes Brevo analytics when Brevo is active */}
        <TabsContent value="providers" className="space-y-6">
          <ProviderManagement />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              Use {`{{variableName}}`} for dynamic content. Conditional blocks:{" "}
              {`{{#if variable}}...{{/if}}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Welcome Email"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={templateForm.category}
                onValueChange={(value: any) =>
                  setTemplateForm({ ...templateForm, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transactional">Transactional</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject Line</Label>
              <Input
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                placeholder="Welcome to FLUBN, {{name}}!"
              />
            </div>
            <div>
              <Label>Email Body (HTML)</Label>
              <Textarea
                value={templateForm.body}
                onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                placeholder="<div>...</div>"
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label>Variables (comma-separated)</Label>
              <Input
                value={templateForm.variables}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, variables: e.target.value })
                }
                placeholder="name, email, dashboardUrl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject:</Label>
              <p className="text-sm mt-1">{previewTemplate?.subject}</p>
            </div>
            <div>
              <Label>Body Preview:</Label>
              <div
                className="border rounded-lg p-4 mt-2 bg-white"
                dangerouslySetInnerHTML={{
                  __html: substituteVariables(previewTemplate?.body || "", {
                    name: "John Doe",
                    email: "john@example.com",
                    companyName: "Example Co.",
                    brandName: "Example Brand",
                    influencerName: "Priya Sharma",
                    campaignName: "Summer Collection 2026",
                    budget: "50000",
                    timeline: "2 weeks",
                    message: "Looking forward to working with you!",
                    dashboardUrl: "#",
                    profileUrl: "#",
                    requestUrl: "#",
                    chatUrl: "#",
                    discoverUrl: "#",
                  }),
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={showBulkEmailDialog} onOpenChange={setShowBulkEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Bulk Email</DialogTitle>
            <DialogDescription>Send promotional emails to multiple recipients</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Template</Label>
              <Select
                value={bulkEmailForm.templateId}
                onValueChange={(value) =>
                  setBulkEmailForm({ ...bulkEmailForm, templateId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates
                    .filter(
                      (t) =>
                        t.category === "promotional" || t.id === "promotional_template"
                    )
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipients</Label>
              <Select
                value={bulkEmailForm.recipientType}
                onValueChange={(value: any) =>
                  setBulkEmailForm({ ...bulkEmailForm, recipientType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="influencers">Influencers Only</SelectItem>
                  <SelectItem value="brands">Brands Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject (optional override)</Label>
              <Input
                value={bulkEmailForm.customSubject}
                onChange={(e) =>
                  setBulkEmailForm({ ...bulkEmailForm, customSubject: e.target.value })
                }
                placeholder="Custom subject line..."
              />
            </div>
            <div>
              <Label>Custom Content (optional)</Label>
              <Textarea
                value={bulkEmailForm.customContent}
                onChange={(e) =>
                  setBulkEmailForm({ ...bulkEmailForm, customContent: e.target.value })
                }
                placeholder="Additional content or message..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendBulkEmail}>
              <Send className="size-4 mr-2" />
              Send Emails
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
