"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import {
  createCampaignWithSetup,
  fetchCampaignLeadDetails,
  fetchCampaigns,
  fetchLeads,
  fetchRuntimeConfigs,
  fetchSenders,
  fetchTemplates,
  updateCampaignRuntimeConfig,
  updateCampaign,
  deleteCampaign,
  type CampaignLeadDetail,
} from "@/app/actions/admin-actions";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Plus, Send, Settings2, Users, Edit, Trash2, CheckCircle2, AlertCircle, FileText, Mailbox, CalendarClock } from "lucide-react";

type Campaign = Tables<"campaigns">;
type Template = Tables<"email_templates">;
type Lead = Tables<"leads">;
type Sender = Tables<"sender_accounts">;
type RuntimeConfig = Tables<"campaign_runtime_config">;

const dayOptions = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

function statusVariant(status: string) {
  switch (status.toLowerCase()) {
    case "active":
    case "running":
      return "default";
    case "paused":
    case "draft":
      return "secondary";
    case "archived":
    case "stopped":
      return "destructive";
    default:
      return "outline";
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Campaigns() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [runtimeConfigs, setRuntimeConfigs] = useState<RuntimeConfig[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View state: 'list' | 'create' | 'edit' | 'details' | 'runtime'
  const [view, setView] = useState<"list" | "create" | "edit" | "details" | "runtime">("list");
  
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignLeadDetails, setCampaignLeadDetails] = useState<CampaignLeadDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const [leadScope, setLeadScope] = useState<"private" | "global">("private");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  
  const [createForm, setCreateForm] = useState({
    name: "",
    status: "active",
    senderAccountId: "",
    templateId: "",
    followupTemplateId: "",
    followupDelayDays: "3",
    timezone: "Asia/Kolkata",
    startHour: "0",
    endHour: "23",
    activeDays: [1, 2, 3, 4, 5, 6, 7],
    isPaused: false,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    status: "active",
    senderAccountId: "",
    templateId: "",
  });

  const [runtimeForm, setRuntimeForm] = useState({
    campaignId: "",
    timezone: "Asia/Kolkata",
    startHour: "0",
    endHour: "23",
    activeDays: [1, 2, 3, 4, 5, 6, 7],
    isPaused: false,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  const privateLeads = useMemo(() => leads.filter((lead) => lead.source !== "global"), [leads]);
  const campaignLeadOptions = leadScope === "global" ? leads : privateLeads;
  const attachedLeadsCount = leadScope === "global" ? campaignLeadOptions.length : selectedLeadIds.length;

  const loadWorkspace = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [campaignData, templateData, leadData, senderData, runtimeData] = await Promise.all([
        fetchCampaigns<Campaign>(user.id),
        fetchTemplates<Template>(user.id),
        fetchLeads<Lead>(),
        fetchSenders<Sender>(user.id),
        fetchRuntimeConfigs<RuntimeConfig>(),
      ]);
      setCampaigns(campaignData ?? []);
      setTemplates(templateData ?? []);
      setLeads(leadData ?? []);
      setSenders(senderData ?? []);
      setRuntimeConfigs(runtimeData ?? []);

      setCreateForm((v) => ({
        ...v,
        senderAccountId: v.senderAccountId || senderData?.[0]?.id || "",
        templateId: v.templateId || templateData?.[0]?.id || "",
      }));
      setRuntimeForm((v) => ({
        ...v,
        campaignId: v.campaignId || campaignData?.[0]?.id || "",
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load campaign workspace");
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) void loadWorkspace();
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timeoutId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const activeCount = campaigns.filter((c) => c.status.toLowerCase() === "active").length;
  const setupCount = Math.max(campaigns.length - activeCount, 0);
  const selectedRuntime = runtimeConfigs.find((c) => c.campaign_id === runtimeForm.campaignId);

  const toggleDay = (day: number, target: "create" | "runtime") => {
    if (target === "create") {
      setCreateForm((v) => ({
        ...v,
        activeDays: v.activeDays.includes(day) ? v.activeDays.filter((i) => i !== day) : [...v.activeDays, day].sort(),
      }));
    } else {
      setRuntimeForm((v) => ({
        ...v,
        activeDays: v.activeDays.includes(day) ? v.activeDays.filter((i) => i !== day) : [...v.activeDays, day].sort(),
      }));
    }
  };

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds((v) => v.includes(leadId) ? v.filter((id) => id !== leadId) : [...v, leadId]);
  };

  const handleCreateCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const leadIds = leadScope === "global" ? campaignLeadOptions.map((lead) => lead.id) : selectedLeadIds;
    
    if (leadIds.length === 0) {
      toast({ title: "No leads attached", description: "Please attach at least one lead to this campaign.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await createCampaignWithSetup<Campaign>(user.id, {
        name: createForm.name,
        status: createForm.status,
        senderAccountId: createForm.senderAccountId,
        templateId: createForm.templateId,
        leadIds,
        followupTemplateId: createForm.followupTemplateId || undefined,
        followupDelayDays: Number(createForm.followupDelayDays || 3),
        timezone: createForm.timezone,
        startHour: Number(createForm.startHour),
        endHour: Number(createForm.endHour),
        activeDays: createForm.activeDays,
        isPaused: createForm.isPaused,
      });
      setCreateForm((v) => ({ ...v, name: "", followupTemplateId: "" }));
      setSelectedLeadIds([]);
      setView("list");
      toast({ title: "Campaign created" });
      await loadWorkspace();
    } catch (requestError) {
      toast({
        title: "Campaign failed",
        description: requestError instanceof Error ? requestError.message : "Unable to create campaign",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleStartEdit = async (campaign: Campaign) => {
    if (!user) return;
    setSelectedCampaign(campaign);
    setEditForm({
      name: campaign.name,
      status: campaign.status,
      senderAccountId: campaign.sender_account_id || "",
      templateId: campaign.template_id || "",
    });
    setView("edit");
    
    try {
      const data = await fetchCampaignLeadDetails(user.id, campaign.id);
      setSelectedLeadIds(data.map(item => item.lead_id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !selectedCampaign) return;
    
    const leadIds = leadScope === "global" ? campaignLeadOptions.map((lead) => lead.id) : selectedLeadIds;
    
    setSaving(true);
    try {
      await updateCampaign<Campaign>(user.id, selectedCampaign.id, {
        ...editForm,
        leadIds
      });
      setView("list");
      setSelectedCampaign(null);
      toast({ title: "Campaign updated" });
      await loadWorkspace();
    } catch (requestError) {
      toast({
        title: "Update failed",
        description: requestError instanceof Error ? requestError.message : "Unable to update campaign",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !campaignToDelete) return;
    setSaving(true);
    try {
      await deleteCampaign(user.id, campaignToDelete.id);
      toast({ title: "Campaign deleted" });
      setCampaignToDelete(null);
      setDeleteDialogOpen(false);
      setView("list");
      await loadWorkspace();
    } catch (requestError) {
      toast({
        title: "Deletion failed",
        description: requestError instanceof Error ? requestError.message : "Unable to delete campaign",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleRuntimeCampaignChange = (campaignId: string) => {
    const config = runtimeConfigs.find((item) => item.campaign_id === campaignId);
    setRuntimeForm({
      campaignId,
      timezone: config?.timezone ?? "Asia/Kolkata",
      startHour: String(config?.start_hour ?? 0),
      endHour: String(config?.end_hour ?? 23),
      activeDays: config?.active_days ?? [1, 2, 3, 4, 5, 6, 7],
      isPaused: config?.is_paused ?? false,
    });
  };

  const handleUpdateRuntime = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!runtimeForm.campaignId) return;
    setSaving(true);
    try {
      await updateCampaignRuntimeConfig<RuntimeConfig>(runtimeForm.campaignId, {
        timezone: runtimeForm.timezone,
        startHour: Number(runtimeForm.startHour),
        endHour: Number(runtimeForm.endHour),
        activeDays: runtimeForm.activeDays,
        isPaused: runtimeForm.isPaused,
      });
      toast({ title: "Runtime config saved" });
      setView("list");
      await loadWorkspace();
    } catch (requestError) {
      toast({
        title: "Runtime update failed",
        description: requestError instanceof Error ? requestError.message : "Unable to update runtime config",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const openCampaignDetails = async (campaign: Campaign) => {
    if (!user) return;
    setSelectedCampaign(campaign);
    setView("details");
    setCampaignLeadDetails([]);
    setDetailLoading(true);
    try {
      const data = await fetchCampaignLeadDetails(user.id, campaign.id);
      setCampaignLeadDetails(data);
    } catch (requestError) {
      toast({
        title: "Campaign details failed",
        description: requestError instanceof Error ? requestError.message : "Unable to load campaign leads",
        variant: "destructive",
      });
    }
    setDetailLoading(false);
  };

  const resetView = () => {
    setView("list");
    setSelectedCampaign(null);
    setCampaignLeadDetails([]);
  };

  return (
    <AppLayout>
      <div className="max-w-[100rem] mx-auto p-6 md:p-8 space-y-6">

        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {view === "list" ? (
                <BreadcrumbPage className="text-[13px] font-medium text-foreground">Campaigns</BreadcrumbPage>
              ) : (
                <BreadcrumbLink className="text-[13px] font-medium cursor-pointer" onClick={resetView}>
                  Campaigns
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {view === "create" && (
              <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage className="text-[13px] font-medium text-foreground">New campaign</BreadcrumbPage></BreadcrumbItem></>
            )}
            {view === "edit" && (
              <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage className="text-[13px] font-medium text-foreground max-w-[200px] truncate">{selectedCampaign ? `Edit · ${selectedCampaign.name}` : "Edit campaign"}</BreadcrumbPage></BreadcrumbItem></>
            )}
            {view === "details" && (
              <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage className="text-[13px] font-medium text-foreground max-w-[200px] truncate">{selectedCampaign ? selectedCampaign.name : "Details"}</BreadcrumbPage></BreadcrumbItem></>
            )}
            {view === "runtime" && (
              <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage className="text-[13px] font-medium text-foreground">Runtime settings</BreadcrumbPage></BreadcrumbItem></>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
                <p className="mt-1 text-[13px] text-muted-foreground">Sequences, runtime config, and lead assignment.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setView("runtime")} variant="outline" className="h-9 gap-2 text-[13px]">
                  <Settings2 className="h-3.5 w-3.5" /> Runtime
                </Button>
                <Button onClick={() => setView("create")} className="h-9 gap-2 text-[13px]">
                  <Plus className="h-3.5 w-3.5" /> Add campaign
                </Button>
              </div>
            </div>

            {/* Compact Stats Row */}
            <div className="flex items-center gap-3 text-[13px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">{campaigns.length}</span> campaign{campaigns.length !== 1 ? "s" : ""}
              </span>
              {activeCount > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">{activeCount}</span> active
                  </span>
                </>
              )}
              {setupCount > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span className="font-semibold">{setupCount}</span> need setup
                  </span>
                </>
              )}
            </div>

            <section className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
                <Send className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-[14px] font-semibold">Campaigns overview</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading campaigns...
                </div>
              ) : error ? (
                <div className="px-4 py-12 text-center text-sm text-destructive">{error}</div>
              ) : campaigns.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sender account</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right w-[110px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium cursor-pointer text-primary hover:underline" onClick={() => void openCampaignDetails(campaign)}>
                          {campaign.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(campaign.status)} className="capitalize">
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{campaign.sender_account_id ? campaign.sender_account_id.slice(0, 8) : "-"}</TableCell>
                        <TableCell>{campaign.template_id ? campaign.template_id.slice(0, 8) : "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(campaign.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => void openCampaignDetails(campaign)} className="h-8 w-8 hover:bg-secondary" title="View details">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => void handleStartEdit(campaign)} className="h-8 w-8 hover:bg-secondary" title="Edit">
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setCampaignToDelete(campaign); setDeleteDialogOpen(true); }} className="h-8 w-8 hover:bg-destructive/10" title="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="px-4 py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary/40">
                    <Send className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">No campaigns yet. Connect a sender, create a template, then launch a sequence.</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* ── CREATE VIEW ── */}
        {view === "create" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create campaign</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Set up a new outreach sequence with sender, templates, runtime config, and leads.
              </p>
            </div>
            
            <form onSubmit={handleCreateCampaign} className="space-y-6">
              {/* Section 1: General Info */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <Send className="h-4 w-4 text-primary" />
                  <h3 className="text-[14px] font-semibold">General Information</h3>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-1">
                    <Label className="text-[12px] font-medium text-muted-foreground">Campaign name</Label>
                    <Input required className="h-9 text-[13px]" value={createForm.name} onChange={(e) => setCreateForm((v) => ({ ...v, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 md:col-span-1">
                    <Label className="text-[12px] font-medium text-muted-foreground">Status</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={createForm.status} onChange={(e) => setCreateForm((v) => ({ ...v, status: e.target.value }))}>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Configuration */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-[14px] font-semibold">Configuration</h3>
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-muted-foreground">Sender Account</Label>
                    <select required className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={createForm.senderAccountId} onChange={(e) => setCreateForm((v) => ({ ...v, senderAccountId: e.target.value }))}>
                      <option value="">Select sender</option>
                      {senders.map((s) => (<option key={s.id} value={s.id}>{s.email}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label className="text-[12px] font-medium text-muted-foreground">Step 1 (Primary Template)</Label>
                    <select required className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={createForm.templateId} onChange={(e) => setCreateForm((v) => ({ ...v, templateId: e.target.value }))}>
                      <option value="">Select template</option>
                      {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label className="text-[12px] font-medium text-muted-foreground">Step 2 (Follow-up Template)</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={createForm.followupTemplateId} onChange={(e) => setCreateForm((v) => ({ ...v, followupTemplateId: e.target.value }))}>
                      <option value="">None</option>
                      {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-muted-foreground">Follow-up delay (days)</Label>
                    <Input type="number" min={0} className="h-9 text-[13px]" value={createForm.followupDelayDays} onChange={(e) => setCreateForm((v) => ({ ...v, followupDelayDays: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Section 3: Runtime & Schedule */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <h3 className="text-[14px] font-semibold">Runtime & Schedule</h3>
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-muted-foreground">Timezone</Label>
                    <Input required className="h-9 text-[13px]" value={createForm.timezone} onChange={(e) => setCreateForm((v) => ({ ...v, timezone: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-muted-foreground">Start hour (0-23)</Label>
                    <Input required type="number" min={0} max={23} className="h-9 text-[13px]" value={createForm.startHour} onChange={(e) => setCreateForm((v) => ({ ...v, startHour: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-muted-foreground">End hour (0-23)</Label>
                    <Input required type="number" min={0} max={23} className="h-9 text-[13px]" value={createForm.endHour} onChange={(e) => setCreateForm((v) => ({ ...v, endHour: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label className="text-[12px] font-medium text-muted-foreground block">Active Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {dayOptions.map((day) => (
                        <Button key={day.value} type="button" variant={createForm.activeDays.includes(day.value) ? "default" : "outline"} className="h-8 px-3 text-[12px]" onClick={() => toggleDay(day.value, "create")}>
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="lg:col-span-1 flex items-center pt-2">
                    <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer">
                      <Checkbox checked={createForm.isPaused} onCheckedChange={(c) => setCreateForm((v) => ({ ...v, isPaused: c === true }))} />
                      Pause runtime initially
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 4: Target Audience (Leads) */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-[14px] font-semibold">Target Audience</h3>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/10 p-5">
                  <div className="space-y-1">
                    <h4 className="text-[14px] font-medium">Attached Leads</h4>
                    <p className="text-[12px] text-muted-foreground">
                      {attachedLeadsCount > 0 
                        ? `${attachedLeadsCount} lead${attachedLeadsCount !== 1 ? 's' : ''} currently selected for this campaign.`
                        : "No leads selected yet. Attach leads to begin sending."}
                    </p>
                  </div>
                  <Button type="button" onClick={() => setLeadDialogOpen(true)} variant="outline" className="h-9 gap-2 text-[13px]">
                    <Users className="h-3.5 w-3.5" /> Attach Leads
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={resetView} className="h-9 text-[13px]">Cancel</Button>
                <Button type="submit" disabled={saving || !templates.length || !senders.length} className="h-9 text-[13px] gap-2">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create campaign
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── EDIT VIEW ── */}
        {view === "edit" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Edit campaign</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Update campaign status, sender, and primary template.
              </p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-6">
              
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <Send className="h-4 w-4 text-primary" />
                  <h3 className="text-[14px] font-semibold">General Information</h3>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-muted-foreground">Campaign name</Label>
                    <Input required className="h-9 text-[13px]" value={editForm.name} onChange={(e) => setEditForm((v) => ({ ...v, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-muted-foreground">Status</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={editForm.status} onChange={(e) => setEditForm((v) => ({ ...v, status: e.target.value }))}>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="paused">Paused</option>
                      <option value="stopped">Stopped</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-[14px] font-semibold">Configuration</h3>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-muted-foreground">Sender</Label>
                    <select required className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={editForm.senderAccountId} onChange={(e) => setEditForm((v) => ({ ...v, senderAccountId: e.target.value }))}>
                      <option value="">Select sender</option>
                      {senders.map((s) => (<option key={s.id} value={s.id}>{s.email}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-muted-foreground">Template</Label>
                    <select required className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={editForm.templateId} onChange={(e) => setEditForm((v) => ({ ...v, templateId: e.target.value }))}>
                      <option value="">Select template</option>
                      {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-[14px] font-semibold">Target Audience</h3>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/10 p-5">
                  <div className="space-y-1">
                    <h4 className="text-[14px] font-medium">Attached Leads</h4>
                    <p className="text-[12px] text-muted-foreground">
                      {attachedLeadsCount > 0 
                        ? `${attachedLeadsCount} lead${attachedLeadsCount !== 1 ? 's' : ''} currently selected for this campaign.`
                        : "No leads selected yet. Attach leads to begin sending."}
                    </p>
                  </div>
                  <Button type="button" onClick={() => setLeadDialogOpen(true)} variant="outline" className="h-9 gap-2 text-[13px]">
                    <Users className="h-3.5 w-3.5" /> Attach Leads
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="destructive" onClick={() => { if (selectedCampaign) { setCampaignToDelete(selectedCampaign); setDeleteDialogOpen(true); } }} className="h-9 text-[13px] gap-2">
                  <Trash2 className="h-3.5 w-3.5" /> Delete campaign
                </Button>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="ghost" onClick={resetView} className="h-9 text-[13px]">Cancel</Button>
                  <Button type="submit" disabled={saving} className="h-9 text-[13px] gap-2">
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── RUNTIME CONFIG VIEW ── */}
        {view === "runtime" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Runtime configuration</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Adjust sending hours, active days, timezone, and pause state for a campaign.
              </p>
            </div>
            <form onSubmit={handleUpdateRuntime} className="space-y-6">
              
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <h3 className="text-[14px] font-semibold">Schedule Configuration</h3>
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label className="text-[12px] font-medium text-muted-foreground">Select Campaign</Label>
                    <select required className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={runtimeForm.campaignId} onChange={(e) => handleRuntimeCampaignChange(e.target.value)}>
                      <option value="">Select campaign</option>
                      {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label className="text-[12px] font-medium text-muted-foreground">Timezone</Label>
                    <Input required className="h-9 text-[13px]" value={runtimeForm.timezone} onChange={(e) => setRuntimeForm((v) => ({ ...v, timezone: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label className="text-[12px] font-medium text-muted-foreground">Start hour</Label>
                    <Input required type="number" min={0} max={23} className="h-9 text-[13px]" value={runtimeForm.startHour} onChange={(e) => setRuntimeForm((v) => ({ ...v, startHour: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 lg:col-span-2">
                    <Label className="text-[12px] font-medium text-muted-foreground">End hour</Label>
                    <Input required type="number" min={0} max={23} className="h-9 text-[13px]" value={runtimeForm.endHour} onChange={(e) => setRuntimeForm((v) => ({ ...v, endHour: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 lg:col-span-4">
                    <Label className="text-[12px] font-medium text-muted-foreground block">Active Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {dayOptions.map((day) => (
                        <Button key={day.value} type="button" variant={runtimeForm.activeDays.includes(day.value) ? "default" : "outline"} className="h-8 px-4 text-[12px]" onClick={() => toggleDay(day.value, "runtime")}>
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="lg:col-span-4 pt-2">
                    <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer">
                      <Checkbox checked={runtimeForm.isPaused} onCheckedChange={(c) => setRuntimeForm((v) => ({ ...v, isPaused: c === true }))} />
                      Pause this campaign globally
                    </label>
                  </div>
                </div>

                {selectedRuntime && (
                  <div className="mt-4 rounded-lg border border-border bg-secondary/10 px-4 py-3 text-[12px] text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <strong>Current window:</strong> {selectedRuntime.start_hour}:00 - {selectedRuntime.end_hour}:00, {selectedRuntime.timezone}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={resetView} className="h-9 text-[13px]">Cancel</Button>
                <Button type="submit" disabled={saving || !runtimeForm.campaignId} className="h-9 text-[13px] gap-2">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save runtime
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── DETAILS VIEW ── */}
        {view === "details" && selectedCampaign && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card px-6 py-5 flex flex-wrap gap-8 items-center shadow-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Campaign</div>
                <div className="text-[15px] font-semibold">{selectedCampaign.name}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Status</div>
                <Badge variant={statusVariant(selectedCampaign.status)} className="capitalize">
                  {selectedCampaign.status}
                </Badge>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Created</div>
                <div className="text-[13px]">{formatDate(selectedCampaign.created_at)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Leads</div>
                <div className="text-[13px] font-medium">{detailLoading ? "…" : campaignLeadDetails.length}</div>
              </div>
            </div>

            <section className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-[14px] font-semibold">Leads attached to campaign</h2>
                {!detailLoading && (
                  <span className="ml-auto text-[12px] text-muted-foreground">{campaignLeadDetails.length} total</span>
                )}
              </div>
              {detailLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading campaign leads...
                </div>
              ) : campaignLeadDetails.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next send</TableHead>
                      <TableHead>Last sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignLeadDetails.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.leads?.name ?? "-"}</TableCell>
                        <TableCell>{item.leads?.email ?? "-"}</TableCell>
                        <TableCell>{item.leads?.company || "-"}</TableCell>
                        <TableCell>{item.current_step}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(item.status)} className="capitalize">
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.next_send_at ? formatDate(item.next_send_at) : "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{item.last_sent_at ? formatDate(item.last_sent_at) : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary/40">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">No leads are attached to this campaign.</p>
                </div>
              )}
            </section>
          </div>
        )}

      </div>

      {/* LEAD ATTACHMENT DIALOG */}
      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col sm:max-w-3xl p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle>Attach Leads</DialogTitle>
            <DialogDescription>
              Select the leads you want to attach to this campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 flex items-center justify-between shrink-0 bg-secondary/10 border-b border-border">
            <div className="space-y-1.5 w-1/2">
              <Label className="text-[12px] font-medium text-muted-foreground">Lead scope</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={leadScope} onChange={(e) => setLeadScope(e.target.value as "private" | "global")}>
                <option value="private">Private leads</option>
                <option value="global">Global leads (All users)</option>
              </select>
            </div>
            <div className="text-[13px] font-medium mt-4">
              {attachedLeadsCount} lead{attachedLeadsCount !== 1 ? 's' : ''} selected
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-6">
            {campaignLeadOptions.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {campaignLeadOptions.map((lead) => (
                  <label key={lead.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer transition-colors hover:border-primary/50">
                    <Checkbox className="mt-0.5" checked={leadScope === "global" || selectedLeadIds.includes(lead.id)} disabled={leadScope === "global"} onCheckedChange={() => toggleLead(lead.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium leading-tight">{lead.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{lead.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-8 w-8 text-muted-foreground/50 mb-3" />
                <p className="text-[14px] font-medium">No leads available</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Switch the scope or add leads in the Leads section first.
                </p>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end">
            <Button type="button" onClick={() => setLeadDialogOpen(false)} className="h-9 text-[13px]">
              Confirm Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;<span className="font-semibold text-foreground">{campaignToDelete?.name}</span>&quot; and its sequences. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleDeleteConfirm(); }}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
