"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { createLead, fetchLeads, updateLead, deleteLead } from "@/app/actions/admin-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, Edit, Trash2, CheckCircle2, PhoneCall, User, Briefcase, Activity } from "lucide-react";

type Lead = Tables<"leads">;

function statusVariant(status: string) {
  switch (status.toLowerCase()) {
    case "active":
    case "engaged":
    case "replied":
      return "default";
    case "paused":
    case "new":
    case "nurture":
      return "secondary";
    case "bounced":
    case "do_not_contact":
    case "do-not-contact":
      return "destructive";
    default:
      return "outline";
  }
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Never";
}

export default function Leads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    source: "private",
    status: "new",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    source: "private",
    status: "new",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const loadLeads = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeads<Lead>();
      setLeads(data ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load leads");
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) void loadLeads();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await createLead<Lead>({
        name: createForm.name,
        email: createForm.email,
        company: createForm.company,
        role: createForm.role,
        source: createForm.source,
        status: createForm.status,
      });
      setCreateForm({ name: "", email: "", company: "", role: "", source: "private", status: "new" });
      setView("list");
      toast({ title: "Lead created" });
      await loadLeads();
    } catch (requestError) {
      toast({
        title: "Lead failed",
        description: requestError instanceof Error ? requestError.message : "Unable to create lead",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleStartEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditForm({
      name: lead.name,
      email: lead.email,
      company: lead.company || "",
      role: lead.role || "",
      source: lead.source || "private",
      status: lead.status || "new",
    });
    setView("edit");
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingLead) return;
    setSaving(true);
    try {
      await updateLead<Lead>(editingLead.id, editForm);
      setView("list");
      setEditingLead(null);
      toast({ title: "Lead updated" });
      await loadLeads();
    } catch (requestError) {
      toast({
        title: "Update failed",
        description: requestError instanceof Error ? requestError.message : "Unable to update lead",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;
    setSaving(true);
    try {
      await deleteLead(leadToDelete.id);
      toast({ title: "Lead deleted" });
      setLeadToDelete(null);
      setDeleteDialogOpen(false);
      setView("list");
      await loadLeads();
    } catch (requestError) {
      toast({
        title: "Deletion failed",
        description: requestError instanceof Error ? requestError.message : "Cannot delete lead",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const activeCount = leads.filter((lead) => ["active", "engaged", "replied"].includes(lead.status.toLowerCase())).length;
  const contactedCount = leads.filter((lead) => Boolean(lead.last_contacted_at)).length;

  const renderFormFields = (
    form: typeof createForm,
    setForm: React.Dispatch<React.SetStateAction<typeof createForm>>
  ) => (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-[14px] font-semibold">Personal Information</h3>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-muted-foreground">Full Name</Label>
            <Input required className="h-9 text-[13px]" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-muted-foreground">Email Address</Label>
            <Input required type="email" className="h-9 text-[13px]" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Briefcase className="h-4 w-4 text-primary" />
          <h3 className="text-[14px] font-semibold">Professional Details</h3>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-muted-foreground">Company</Label>
            <Input className="h-9 text-[13px]" value={form.company} onChange={(e) => setForm((v) => ({ ...v, company: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-muted-foreground">Role / Title</Label>
            <Input className="h-9 text-[13px]" value={form.role} onChange={(e) => setForm((v) => ({ ...v, role: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-[14px] font-semibold">System Configuration</h3>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-muted-foreground">Lead Scope</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={form.source} onChange={(e) => setForm((v) => ({ ...v, source: e.target.value }))}>
              <option value="private">Private (Only you)</option>
              <option value="global">Global (All users)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-muted-foreground">Current Status</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}>
              <option value="new">New</option>
              <option value="active">Active</option>
              <option value="engaged">Engaged</option>
              <option value="replied">Replied</option>
              <option value="paused">Paused</option>
              <option value="nurture">Nurture</option>
              <option value="bounced">Bounced</option>
              <option value="do_not_contact">Do Not Contact</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-[100rem] mx-auto p-6 md:p-8 space-y-6">
        
        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {view === "list" ? (
                <BreadcrumbPage className="text-[13px] font-medium text-foreground">
                  Leads
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  className="text-[13px] font-medium cursor-pointer"
                  onClick={() => setView("list")}
                >
                  Leads
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {view === "create" && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[13px] font-medium text-foreground">
                    New lead
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
            {view === "edit" && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[13px] font-medium text-foreground max-w-[200px] truncate">
                    {editingLead ? `Edit · ${editingLead.name}` : "Edit lead"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        {view === "list" && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Manage contacts, engagement statuses, and tracking.
                </p>
              </div>
              <Button onClick={() => setView("create")} className="h-9 gap-2 text-[13px]">
                <Plus className="h-3.5 w-3.5" /> Add lead
              </Button>
            </div>

            {/* Compact Stats Row */}
            <div className="flex items-center gap-3 text-[13px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">{leads.length}</span> lead{leads.length !== 1 ? "s" : ""}
              </span>
              {activeCount > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">{activeCount}</span> active pipeline
                  </span>
                </>
              )}
              {contactedCount > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1.5">
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">{contactedCount}</span> contacted
                  </span>
                </>
              )}
            </div>

            <section className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-[14px] font-semibold">Lead database</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading leads...
                </div>
              ) : error ? (
                <div className="px-4 py-12 text-center text-sm text-destructive">{error}</div>
              ) : leads.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last contacted</TableHead>
                      <TableHead className="w-[90px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>{lead.company || "-"}</TableCell>
                        <TableCell>{lead.role || "-"}</TableCell>
                        <TableCell className="capitalize">{lead.source || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(lead.status)} className="capitalize">
                            {lead.status?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(lead.last_contacted_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit(lead)}
                              className="h-8 w-8 hover:bg-secondary"
                              title="Edit"
                            >
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setLeadToDelete(lead); setDeleteDialogOpen(true); }}
                              className="h-8 w-8 hover:bg-destructive/10"
                              title="Delete"
                            >
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
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">No leads yet. Import a CSV or add your first contact to start a campaign.</p>
                </div>
              )}
            </section>
          </>
        )}

        {view === "create" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">New lead</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Add a private lead or mark it global for shared campaign attachment.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              {renderFormFields(createForm, setCreateForm)}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setView("list")} className="h-9 text-[13px]">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="h-9 text-[13px] gap-2">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Add lead
                </Button>
              </div>
            </form>
          </div>
        )}

        {view === "edit" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Edit lead</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Modify lead details or delete it permanently.
              </p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              {renderFormFields(editForm, setEditForm)}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => { if (editingLead) { setLeadToDelete(editingLead); setDeleteDialogOpen(true); } }}
                  className="h-9 text-[13px] gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete lead
                </Button>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="ghost" onClick={() => setView("list")} className="h-9 text-[13px]">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="h-9 text-[13px] gap-2">
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;<span className="font-semibold text-foreground">{leadToDelete?.name}</span>&quot;. This action cannot be undone.
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
              Delete lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
