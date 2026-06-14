"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import {
  createTemplate, fetchTemplates, updateTemplate, deleteTemplate,
  uploadAndRegisterAttachment, deleteAttachmentRecord, fetchUserAttachments,
  publishTemplateToGlobal, unpublishGlobalTemplate,
  fetchGlobalVariables, updateGlobalVariables,
} from "@/app/actions/admin-actions";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Loader2, Plus, Edit, Trash2, Paperclip,
  UploadCloud, X, FileCheck2, HardDrive, Library,
  Globe, Send, Mail, BookMarked, ChevronDown, ChevronUp, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import GlobalTemplatesSection from "@/components/GlobalTemplatesSection";

type Template      = Tables<"email_templates">;
type GlobalTemplate = Tables<"global_email_templates">;
type LibraryPdf    = Tables<"template_attachments">;

type AttachmentState = {
  id?: string;        // library record id (if picked from library)
  name: string;
  path: string;
  size: number;
  mimeType: string;
  url: string;
} | null;

const MAX_STORAGE = 100 * 1024 * 1024; // 100 MB

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ─── Storage bar ─────────────────────────────────────────────────────────────
function StorageBar({ usedBytes }: { usedBytes: number }) {
  const pct = Math.min((usedBytes / MAX_STORAGE) * 100, 100);
  const color = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          Storage used
        </span>
        <span>
          <span className={pct >= 90 ? "text-destructive font-semibold" : "font-medium text-foreground"}>
            {formatBytes(usedBytes)}
          </span>
          {" / 100 MB"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Drop Zone ───────────────────────────────────────────────────────────────
function DropZone({
  uploading,
  progress,
  onFile,
}: {
  uploading: boolean;
  progress: number;
  onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  if (uploading) {
    return (
      <div className="rounded-lg border border-border bg-secondary/20 px-4 py-6 text-center">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />
        <p className="text-[12px] text-muted-foreground mb-2">Uploading… {progress}%</p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => ref.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragEnter={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={[
        "cursor-pointer select-none rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
        over ? "border-primary bg-primary/5" : "border-border bg-secondary/10 hover:border-primary/40 hover:bg-secondary/20",
      ].join(" ")}
    >
      <UploadCloud className={`mx-auto mb-2 h-7 w-7 transition-colors ${over ? "text-primary" : "text-muted-foreground"}`} />
      <p className="text-[13px] font-medium">
        Drop a PDF here or{" "}
        <span className="text-primary underline-offset-2 hover:underline">browse</span>
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">PDF only · max 10 MB per file</p>
      <input ref={ref} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ─── PDF Library Card ────────────────────────────────────────────────────────
function PdfCard({
  pdf,
  selected,
  onSelect,
  onDelete,
}: {
  pdf: LibraryPdf;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className={[
        "group relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all cursor-pointer",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/40 hover:bg-secondary/20",
      ].join(" ")}
      onClick={() => { if (!confirmDelete) onSelect(); }}
    >
      {/* PDF icon + name */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <FileCheck2 className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium leading-tight" title={pdf.name}>
            {pdf.name}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatBytes(pdf.size)} · {formatDate(pdf.created_at)}
          </p>
        </div>
      </div>

      {/* Confirm delete inline */}
      {confirmDelete ? (
        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <p className="text-[11px] text-destructive flex-1">Delete this file?</p>
          <Button
            size="sm"
            variant="destructive"
            className="h-6 px-2 text-[11px]"
            onClick={() => { onDelete(); setConfirmDelete(false); }}
          >
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-1.5 top-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          title="Delete from library"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}

      {selected && (
        <div className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── PDF Picker Dialog ───────────────────────────────────────────────────────
function PdfPickerDialog({
  open,
  onOpenChange,
  userId,
  currentAttachment,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  currentAttachment: AttachmentState;
  onSelect: (att: AttachmentState) => void;
}) {
  const { toast } = useToast();
  const [library, setLibrary] = useState<LibraryPdf[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState("library");

  const storageUsed = library.reduce((s, p) => s + (p.size ?? 0), 0);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchUserAttachments<LibraryPdf>(userId);
      setLibrary(data);
    } catch (e) {
      toast({ title: "Failed to load library", variant: "destructive", description: e instanceof Error ? e.message : undefined });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      void load();
      // Default to library if there are files, else upload
      setTab("library");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setProgress(10);
    let cur = 10;
    const interval = setInterval(() => {
      if (cur < 80) { cur += 12; setProgress(cur); }
    }, 300);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("userId", userId);
      const result = await uploadAndRegisterAttachment(fd) as LibraryPdf;
      clearInterval(interval);
      setProgress(100);
      setLibrary((prev) => [result, ...prev]);
      // Auto-select the newly uploaded file
      onSelect({
        id: result.id,
        name: result.name,
        path: result.path,
        size: result.size,
        mimeType: result.mime_type,
        url: result.url ?? "",
      });
      toast({ title: "PDF uploaded and selected" });
      onOpenChange(false);
    } catch (e) {
      clearInterval(interval);
      toast({ title: "Upload failed", variant: "destructive", description: e instanceof Error ? e.message : undefined });
    }
    setUploading(false);
    setTimeout(() => setProgress(0), 600);
  };

  const handleDelete = async (pdf: LibraryPdf) => {
    setDeleting(pdf.id);
    try {
      await deleteAttachmentRecord(userId, pdf.id, pdf.path);
      setLibrary((prev) => prev.filter((p) => p.id !== pdf.id));
      // If the currently selected attachment was this one, clear it
      if (currentAttachment?.path === pdf.path) onSelect(null);
      toast({ title: "PDF deleted from library" });
    } catch (e) {
      toast({ title: "Delete failed", variant: "destructive", description: e instanceof Error ? e.message : undefined });
    }
    setDeleting(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-4 w-4 text-primary" />
            PDF Attachments
          </DialogTitle>
          <DialogDescription>
            Pick a previously uploaded PDF or upload a new one.
          </DialogDescription>
          <div className="mt-3">
            <StorageBar usedBytes={storageUsed} />
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-6 mt-4 mb-0 shrink-0 w-fit">
            <TabsTrigger value="library" className="text-[12px] gap-1.5">
              <Library className="h-3.5 w-3.5" />
              My library
              {library.length > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 py-0 text-[10px] font-semibold text-primary">
                  {library.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-[12px] gap-1.5">
              <UploadCloud className="h-3.5 w-3.5" />
              Upload new
            </TabsTrigger>
          </TabsList>

          {/* Library tab */}
          <TabsContent value="library" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading library…
              </div>
            ) : library.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary/40">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[13px] font-medium">No PDFs uploaded yet</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Switch to &quot;Upload new&quot; to add your first file.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 h-8 text-[12px] gap-1.5"
                  onClick={() => setTab("upload")}
                >
                  <UploadCloud className="h-3.5 w-3.5" /> Upload a PDF
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {library.map((pdf) => (
                  <PdfCard
                    key={pdf.id}
                    pdf={pdf}
                    selected={currentAttachment?.path === pdf.path}
                    onSelect={() => {
                      onSelect({
                        id: pdf.id,
                        name: pdf.name,
                        path: pdf.path,
                        size: pdf.size,
                        mimeType: pdf.mime_type,
                        url: pdf.url ?? "",
                      });
                      onOpenChange(false);
                    }}
                    onDelete={() => {
                      if (!deleting) void handleDelete(pdf);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Upload tab */}
          <TabsContent value="upload" className="px-6 py-4 mt-0">
            <DropZone uploading={uploading} progress={progress} onFile={handleUpload} />
            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              Uploaded PDFs are saved to your library and can be reused across templates.
            </p>
          </TabsContent>
        </Tabs>

        <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-[13px]">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Attached file card (inline in form) ─────────────────────────────────────
function AttachedFileCard({
  attachment,
  onRemove,
  onChangePdf,
}: {
  attachment: AttachmentState;
  onRemove: () => void;
  onChangePdf: () => void;
}) {
  if (!attachment) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <FileCheck2 className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{attachment.name}</p>
        <p className="text-[11px] text-muted-foreground">{formatBytes(attachment.size)}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onChangePdf}
        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground shrink-0"
      >
        Change
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        title="Remove attachment"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1].trim());
  }
  return Array.from(matches);
}

function compileTemplate(text: string, values: Record<string, string>) {
  if (!text) return "";
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const k = key.trim();
    if (k in values) return values[k] || match; // Keep placeholder if blank
    return match;
  });
}

type VarItem = { key: string; value: string };

function compileLivePreview(
  subject: string,
  bodyText: string,
  variables: VarItem[],
  globalVars: Record<string, string>
) {
  const presetPreviews: Record<string, string> = {
    lead: "Alex Smith",
    company: "Innovate LLC",
    role: "Director of Product",
  };
  const customObj = Object.fromEntries(
    variables.filter((v) => v.key.trim() !== "").map((v) => [v.key.trim(), v.value])
  );
  const compileValues = {
    ...presetPreviews,
    ...globalVars,
    name: globalVars.name || "[Your Name]",
    signature: globalVars.signature || "[Your Signature]",
    ...customObj,
  };
  return {
    sub: compileTemplate(subject, compileValues),
    body: compileTemplate(bodyText, compileValues),
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Templates({
  initialTemplates,
  initialTemplatesCount,
  globalTemplates,
  userId: userIdProp,
}: {
  initialTemplates: Template[];
  initialTemplatesCount: number;
  globalTemplates: GlobalTemplate[];
  userId: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [totalCount, setTotalCount] = useState<number>(initialTemplatesCount);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const limit = 10;
  const totalPages = Math.ceil(totalCount / limit);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({ name: "", subject: "", bodyText: "" });
  const [createAttachment, setCreateAttachment] = useState<AttachmentState>(null);
  const [createVariables, setCreateVariables] = useState<{ key: string; value: string }[]>([]);

  // Edit form
  const [editForm, setEditForm] = useState({ name: "", subject: "", bodyText: "" });
  const [editAttachment, setEditAttachment] = useState<AttachmentState>(null);
  const [editVariables, setEditVariables] = useState<{ key: string; value: string }[]>([]);

  // Global variables state (signature, name, and custom ones) stored in users table
  const [globalVars, setGlobalVars] = useState<Record<string, string>>({ name: "", signature: "" });

  // Dialog state for global variables configuration
  const [globalVarsDialogOpen, setGlobalVarsDialogOpen] = useState(false);
  const [tempGlobalVars, setTempGlobalVars] = useState<{ key: string; value: string }[]>([]);

  // Local view controls for CREATE and EDIT editors
  const [varsExpanded, setVarsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Fetch global variables when user is loaded
  useEffect(() => {
    if (user) {
      const loadGlobalVars = async () => {
        try {
          const res = await fetchGlobalVariables(user.id);
          setGlobalVars(res);
        } catch (e) {
          console.error("Failed to fetch global variables:", e);
        }
      };
      void loadGlobalVars();
    }
  }, [user]);

  // PDF picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"create" | "edit">("create");

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  // Publish dialog
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [templateToPublish, setTemplateToPublish] = useState<Template | null>(null);
  const [publishForm, setPublishForm] = useState({ category: "General", description: "" });
  const [publishing, setPublishing] = useState(false);
  const [manageGlobalDialogOpen, setManageGlobalDialogOpen] = useState(false);
  const [templateToManage, setTemplateToManage] = useState<Template | null>(null);
  const [managingGlobal, setManagingGlobal] = useState(false);
  const publishedIds = new Set(templates.filter((t) => t.is_published_to_global).map((t) => t.id));

  const openPicker = (target: "create" | "edit") => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const handleAttachmentSelect = (att: AttachmentState) => {
    if (pickerTarget === "create") setCreateAttachment(att);
    else setEditAttachment(att);
    setPickerOpen(false);
  };

  const renderVariablesAccordion = (
    variables: { key: string; value: string }[],
    setVariables: React.Dispatch<React.SetStateAction<{ key: string; value: string }[]>>,
    target: "create" | "edit"
  ) => {
    const handleAddUserVariable = () => {
      setVariables((prev) => [...prev, { key: "", value: "" }]);
    };

    const handleUpdateUserVariableKey = (index: number, val: string) => {
      const cleanKey = val.replace(/[{}]/g, "").trim();
      setVariables((prev) =>
        prev.map((item, i) => (i === index ? { ...item, key: cleanKey } : item))
      );
    };

    const handleUpdateUserVariableValue = (index: number, val: string) => {
      setVariables((prev) =>
        prev.map((item, i) => (i === index ? { ...item, value: val } : item))
      );
    };

    const handleRemoveUserVariable = (index: number) => {
      setVariables((prev) => prev.filter((_, i) => i !== index));
    };

    return (
      <div className="border border-border rounded-lg overflow-hidden bg-secondary/5 mb-4">
        <button
          type="button"
          onClick={() => setVarsExpanded(!varsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-secondary/10 hover:bg-secondary/20 transition-colors text-[13px] font-medium text-foreground"
        >
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Variables - define your own
          </span>
          {varsExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {varsExpanded && (
          <div className="p-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6 bg-card">
            {/* 1st Column: Preset Variables */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preset Variables (Read-only)</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-md bg-secondary/20 border border-border/50 text-[12px]">
                  <span className="font-mono text-primary font-medium">{"{{lead}}"}</span>
                  <span className="text-muted-foreground text-[11px]">companies&apos; leads name</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-secondary/20 border border-border/50 text-[12px]">
                  <span className="font-mono text-primary font-medium">{"{{company}}"}</span>
                  <span className="text-muted-foreground text-[11px]">company name</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-secondary/20 border border-border/50 text-[12px]">
                  <span className="font-mono text-primary font-medium">{"{{role}}"}</span>
                  <span className="text-muted-foreground text-[11px]">lead role</span>
                </div>
              </div>
            </div>

            {/* 2nd Column: User-Defined Variables */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">User-Defined Variables</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddUserVariable}
                  className="h-7 px-2 text-[11px] gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Variable
                </Button>
              </div>

              {variables.length === 0 ? (
                <div className="text-[12px] text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
                  No custom variables defined.
                </div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {variables.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <Input
                          placeholder="Key"
                          value={item.key}
                          onChange={(e) => handleUpdateUserVariableKey(index, e.target.value)}
                          className="h-8 text-[12px] font-mono"
                        />
                        <Input
                          placeholder="Default Value"
                          value={item.value}
                          onChange={(e) => handleUpdateUserVariableValue(index, e.target.value)}
                          className="h-8 text-[12px]"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUserVariable(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };


  const handleOpenGlobalVars = () => {
    const arr = Object.entries(globalVars).map(([key, value]) => ({ key, value }));
    if (!arr.some((x) => x.key === "name")) arr.unshift({ key: "name", value: "" });
    const signatureIdx = arr.findIndex((x) => x.key === "signature");
    if (signatureIdx === -1) {
      arr.push({ key: "signature", value: "" });
    }
    setTempGlobalVars(arr);
    setGlobalVarsDialogOpen(true);
  };

  const handleSaveGlobalVars = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const record = Object.fromEntries(
        tempGlobalVars.filter((v) => v.key.trim() !== "").map((v) => [v.key.trim(), v.value])
      );
      await updateGlobalVariables(user.id, record);
      setGlobalVars(record);
      setGlobalVarsDialogOpen(false);
      toast({ title: "Global variables saved!" });
    } catch (e) {
      toast({
        title: "Failed to save global variables",
        variant: "destructive",
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  // Load templates
  const loadTemplates = async (pageNumber: number = currentPage) => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTemplates<Template>(user.id, pageNumber, limit);
      setTemplates(res?.data ?? []);
      setTotalCount(res?.count ?? 0);
      setCurrentPage(pageNumber);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    }
    setLoading(false);
  };

  // localStorage draft (text fields only)
  useEffect(() => {
    const saved = localStorage.getItem("dumpmail_new_template_draft");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p && typeof p === "object") {
          setTimeout(() => setCreateForm({ name: p.name || "", subject: p.subject || "", bodyText: p.bodyText || "" }), 0);
        }
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (createForm.name || createForm.subject || createForm.bodyText)
      localStorage.setItem("dumpmail_new_template_draft", JSON.stringify(createForm));
    else localStorage.removeItem("dumpmail_new_template_draft");
  }, [createForm]);

  // Create
  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const variables = Object.fromEntries(
        createVariables.filter((v) => v.key.trim() !== "").map((v) => [v.key.trim(), v.value])
      );
      await Promise.all([
        createTemplate<Template>(user.id, {
          name: createForm.name,
          subject: createForm.subject,
          bodyText: createForm.bodyText,
          attachmentName: createAttachment?.name ?? null,
          attachmentPath: createAttachment?.path ?? null,
          attachmentSize: createAttachment?.size ?? null,
          attachmentMimeType: createAttachment?.mimeType ?? null,
          attachmentUrl: createAttachment?.url ?? null,
          variables,
        }),
        updateGlobalVariables(user.id, globalVars),
      ]);
      setCreateForm({ name: "", subject: "", bodyText: "" });
      setCreateAttachment(null);
      setCreateVariables([]);
      localStorage.removeItem("dumpmail_new_template_draft");
      setView("list");
      toast({ title: "Template added" });
      await loadTemplates(1);
    } catch (e) {
      toast({ title: "Failed to add template", variant: "destructive", description: e instanceof Error ? e.message : undefined });
    }
    setSaving(false);
  };

  // Start edit
  const handleStartEdit = (t: Template) => {
    setEditingTemplate(t);
    setEditForm({ name: t.name, subject: t.subject, bodyText: t.body_text || "" });
    setEditAttachment(
      t.attachment_path
        ? { name: t.attachment_name ?? "", path: t.attachment_path, size: t.attachment_size ?? 0, mimeType: t.attachment_mime_type ?? "application/pdf", url: t.attachment_url ?? "" }
        : null,
    );
    const varsObj = (t.variables as Record<string, string>) || {};
    const varsArray = Object.entries(varsObj).map(([key, value]) => ({ key, value }));
    setEditVariables(varsArray);
    setVarsExpanded(false);
    setActiveTab("edit");
    setView("edit");
  };

  // Update
  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !editingTemplate) return;
    setSaving(true);
    try {
      const variables = Object.fromEntries(
        editVariables.filter((v) => v.key.trim() !== "").map((v) => [v.key.trim(), v.value])
      );
      await Promise.all([
        updateTemplate<Template>(user.id, editingTemplate.id, {
          name: editForm.name,
          subject: editForm.subject,
          bodyText: editForm.bodyText,
          attachmentName: editAttachment?.name ?? null,
          attachmentPath: editAttachment?.path ?? null,
          attachmentSize: editAttachment?.size ?? null,
          attachmentMimeType: editAttachment?.mimeType ?? null,
          attachmentUrl: editAttachment?.url ?? null,
          variables,
        }),
        updateGlobalVariables(user.id, globalVars),
      ]);
      setView("list");
      setEditVariables([]);
      toast({ title: "Template updated" });
      await loadTemplates();
    } catch (e) {
      toast({ title: "Update failed", variant: "destructive", description: e instanceof Error ? e.message : undefined });
    }
    setSaving(false);
  };

  // Delete template
  const handleDeleteConfirm = async () => {
    if (!user || !templateToDelete) return;
    setSaving(true);
    try {
      await deleteTemplate(user.id, templateToDelete.id);
      toast({ title: "Template deleted" });
      setTemplateToDelete(null);
      setDeleteDialogOpen(false);
      setView("list");
      await loadTemplates();
    } catch (e) {
      toast({ title: "Deletion failed", variant: "destructive", description: e instanceof Error ? e.message : "Template may be in use by a campaign." });
    }
    setSaving(false);
  };

  // Shared attachment field
  const renderAttachmentField = (
    attachment: AttachmentState,
    setAttachment: (v: AttachmentState) => void,
    target: "create" | "edit",
  ) => (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5">
        <Paperclip className="h-3.5 w-3.5" />
        PDF attachment
        <span className="font-normal text-muted-foreground/60">(optional)</span>
      </Label>
      {attachment ? (
        <AttachedFileCard
          attachment={attachment}
          onRemove={() => setAttachment(null)}
          onChangePdf={() => openPicker(target)}
        />
      ) : (
        <button
          type="button"
          onClick={() => openPicker(target)}
          className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-border bg-secondary/10 px-4 py-4 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary/20 hover:text-foreground"
        >
          <UploadCloud className="h-4 w-4 shrink-0" />
          <span>Attach a PDF — upload new or pick from your library</span>
        </button>
      )}
    </div>
  );

  // Publish a template to global
  const handlePublish = async () => {
    if (!user || !templateToPublish) return;
    setPublishing(true);
    try {
      await publishTemplateToGlobal(user.id, templateToPublish.id, {
        category: publishForm.category,
        description: publishForm.description,
      });
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateToPublish.id ? { ...t, is_published_to_global: true } : t
        )
      );
      toast({ title: "Template published to global library!" });
      setPublishDialogOpen(false);
      setTemplateToPublish(null);
    } catch (e) {
      toast({
        title: "Failed to publish",
        variant: "destructive",
        description: e instanceof Error ? e.message : undefined,
      });
    }
    setPublishing(false);
  };

  const handleUnpublish = async (t: Template) => {
    if (!user) return;
    try {
      await unpublishGlobalTemplate(user.id, t.id);
      setTemplates((prev) =>
        prev.map((tmpl) =>
          tmpl.id === t.id ? { ...tmpl, is_published_to_global: false } : tmpl
        )
      );
      toast({ title: "Template removed from global library" });
    } catch (e) {
      toast({
        title: "Failed to unpublish",
        variant: "destructive",
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const handleUpdateGlobal = async (t: Template) => {
    if (!user) return;
    setManagingGlobal(true);
    try {
      const { data: existingGlobal, error: fetchErr } = await supabase
        .from("global_email_templates")
        .select("category, description, preview_image_url")
        .eq("original_template_id", t.id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      await publishTemplateToGlobal(user.id, t.id, {
        category: existingGlobal?.category || "General",
        description: existingGlobal?.description || "",
        previewImageUrl: existingGlobal?.preview_image_url || undefined,
      });

      toast({ title: "Global template updated with local changes!" });
      setManageGlobalDialogOpen(false);
      setTemplateToManage(null);
    } catch (e) {
      toast({
        title: "Failed to update global template",
        variant: "destructive",
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setManagingGlobal(false);
    }
  };

  const handleDeleteGlobal = async (t: Template) => {
    if (!user) return;
    setManagingGlobal(true);
    try {
      await unpublishGlobalTemplate(user.id, t.id);
      setTemplates((prev) =>
        prev.map((tmpl) =>
          tmpl.id === t.id ? { ...tmpl, is_published_to_global: false } : tmpl
        )
      );
      toast({ title: "Template removed from global library" });
      setManageGlobalDialogOpen(false);
      setTemplateToManage(null);
    } catch (e) {
      toast({
        title: "Failed to unpublish",
        variant: "destructive",
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setManagingGlobal(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[100rem] mx-auto p-6 md:p-8 space-y-6">

        {/* Breadcrumb – only shown on sub-views */}
        {view !== "list" && (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink className="text-[13px] font-medium cursor-pointer" onClick={() => setView("list")}>
                  Templates
                </BreadcrumbLink>
              </BreadcrumbItem>
              {view === "create" && (
                <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage className="text-[13px] font-medium text-foreground">New template</BreadcrumbPage></BreadcrumbItem></>
              )}
              {view === "edit" && (
                <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage className="text-[13px] font-medium text-foreground max-w-[220px] truncate">{editingTemplate ? `Edit · ${editingTemplate.name}` : "Edit template"}</BreadcrumbPage></BreadcrumbItem></>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {/* ── LIST ── */}
        {view === "list" && (
          <>
            {/* Global templates section */}
            {globalTemplates.length > 0 && (
              <GlobalTemplatesSection
                globalTemplates={globalTemplates}
                userId={userIdProp}
              />
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Email templates</h1>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Reusable outreach templates for campaign sequences.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleOpenGlobalVars} variant="outline" className="h-9 gap-2 text-[13px]">
                  <Settings className="h-3.5 w-3.5" /> Global Variables
                </Button>
                <Button onClick={() => { setView("create"); setVarsExpanded(false); setActiveTab("edit"); }} className="h-9 gap-2 text-[13px]">
                  <Plus className="h-3.5 w-3.5" /> Add template
                </Button>
              </div>
            </div>

            {/* Table */}
            <section className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-[14px] font-semibold">Template library</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading templates…
                </div>
              ) : error ? (
                <div className="px-4 py-12 text-center text-sm text-destructive">{error}</div>
              ) : templates.length ? (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Attachment</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">{t.subject}</TableCell>
                        <TableCell>
                          {t.attachment_name ? (
                            <a
                              href={t.attachment_url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[11px] font-medium hover:bg-secondary/80 transition-colors max-w-[160px]"
                              title={t.attachment_name}
                            >
                              <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{t.attachment_name}</span>
                            </a>
                          ) : (
                            <span className="text-[12px] text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {publishedIds.has(t.id) ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setTemplateToManage(t); setManageGlobalDialogOpen(true); }}
                                className="h-8 px-2 text-[11px] gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                title="Published to global — click to update or unpublish"
                              >
                                <Globe className="h-3 w-3" />
                                Published
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setTemplateToPublish(t); setPublishForm({ category: "General", description: "" }); setPublishDialogOpen(true); }}
                                className="h-8 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground hover:bg-secondary"
                                title="Publish to global library"
                              >
                                <Send className="h-3 w-3" />
                                Publish
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleStartEdit(t)} className="h-8 w-8 hover:bg-secondary" title="Edit">
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setTemplateToDelete(t); setDeleteDialogOpen(true); }} className="h-8 w-8 hover:bg-destructive/10" title="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10 flex-wrap gap-4">
                    <div className="text-[13px] text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{Math.min((currentPage - 1) * limit + 1, totalCount)}</span> to{" "}
                      <span className="font-medium text-foreground">{Math.min(currentPage * limit, totalCount)}</span> of{" "}
                      <span className="font-medium text-foreground">{totalCount}</span> templates
                    </div>
                    <Pagination className="w-auto mx-0">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => currentPage > 1 && loadTemplates(currentPage - 1)}
                            className={cn("cursor-pointer", currentPage === 1 && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                        {(() => {
                          const pages: (number | string)[] = [];
                          for (let i = 1; i <= totalPages; i++) {
                            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                              pages.push(i);
                            } else if (pages[pages.length - 1] !== "ellipsis") {
                              pages.push("ellipsis");
                            }
                          }
                          return pages.map((pageNum, idx) => {
                            if (pageNum === "ellipsis") {
                              return (
                                <PaginationItem key={`ellipsis-${idx}`}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  isActive={currentPage === pageNum}
                                  onClick={() => loadTemplates(pageNum as number)}
                                  className="cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          });
                        })()}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => currentPage < totalPages && loadTemplates(currentPage + 1)}
                            className={cn("cursor-pointer", currentPage === totalPages && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
                </>
              ) : (
                <div className="px-4 py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary/40">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">No templates yet. Create your first outreach draft.</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* ── CREATE ── */}
        {view === "create" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-violet-950 via-indigo-900 to-slate-900 px-6 py-8 shadow-xl">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_70%,hsl(var(--primary))_0%,transparent_60%)]" />
              <div className="relative z-10">
                <h1 className="text-2xl font-bold text-white tracking-tight">New template</h1>
                <p className="mt-1 text-[13px] text-white/70">
                  Create a reusable email template, configure custom variables, and preview the output live.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-md space-y-5">
              {renderVariablesAccordion(createVariables, setCreateVariables, "create")}

              <div className="border border-border rounded-lg overflow-hidden bg-secondary/5 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "edit" ? "preview" : "edit")}
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary/10 hover:bg-secondary/20 transition-colors text-[13px] font-medium text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {activeTab === "edit" ? "Template - Edit Mode" : "Template - Live Preview"}
                  </span>
                  <span className="text-[11px] text-primary font-medium hover:underline">
                    {activeTab === "edit" ? "Switch to Live Preview" : "Switch to Editor"}
                  </span>
                </button>
              </div>

              {activeTab === "edit" ? (
                <form onSubmit={handleCreate} className="grid gap-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-muted-foreground">Name</Label>
                      <Input required placeholder="e.g. Cold Outreach Intro" className="h-9 text-[13px]" value={createForm.name} onChange={(e) => setCreateForm((v) => ({ ...v, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-muted-foreground">Subject</Label>
                      <Input required placeholder="e.g. Quick question about your product" className="h-9 text-[13px]" value={createForm.subject} onChange={(e) => setCreateForm((v) => ({ ...v, subject: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-muted-foreground">Body text</Label>
                    <Textarea required placeholder="Hi {{lead}}, I noticed your project {{project}}..." className="min-h-[200px] text-[13px] font-sans resize-y" value={createForm.bodyText} onChange={(e) => setCreateForm((v) => ({ ...v, bodyText: e.target.value }))} />
                  </div>
                  {renderAttachmentField(createAttachment, setCreateAttachment, "create")}
                  <div className="flex items-center justify-end gap-3 pt-1 border-t border-border/50">
                    <Button type="button" variant="ghost" onClick={() => setView("list")} className="h-9 text-[13px]">Cancel</Button>
                    <Button type="submit" disabled={saving} className="h-9 text-[13px] gap-2">
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Add template
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const preview = compileLivePreview(createForm.subject, createForm.bodyText, createVariables, globalVars);
                    return (
                      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="space-y-2 pb-4 border-b border-border/60">
                          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <span className="font-semibold text-foreground">Subject:</span>
                            <span className="text-foreground font-medium">{preview.sub || <span className="italic text-muted-foreground/50">No subject</span>}</span>
                          </div>
                          {createAttachment && (
                            <div className="flex items-center gap-1.5 text-[11px] bg-secondary/40 px-2 py-1 rounded w-fit border border-border/50 text-muted-foreground">
                              <Paperclip className="h-3 w-3" />
                              <span>{createAttachment.name}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans text-foreground min-h-[180px]">
                          {preview.body || <span className="italic text-muted-foreground/50">No body text</span>}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-end gap-3 pt-1 border-t border-border/50">
                    <Button type="button" variant="ghost" onClick={() => setView("list")} className="h-9 text-[13px]">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EDIT ── */}
        {view === "edit" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-violet-950 via-indigo-900 to-slate-900 px-6 py-8 shadow-xl">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_70%,hsl(var(--primary))_0%,transparent_60%)]" />
              <div className="relative z-10">
                <h1 className="text-2xl font-bold text-white tracking-tight">Edit template</h1>
                <p className="mt-1 text-[13px] text-white/70">
                  Modify template details, update variable defaults, and preview changes in real-time.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-md space-y-5">
              {renderVariablesAccordion(editVariables, setEditVariables, "edit")}

              <div className="border border-border rounded-lg overflow-hidden bg-secondary/5 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "edit" ? "preview" : "edit")}
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary/10 hover:bg-secondary/20 transition-colors text-[13px] font-medium text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {activeTab === "edit" ? "Template - Edit Mode" : "Template - Live Preview"}
                  </span>
                  <span className="text-[11px] text-primary font-medium hover:underline">
                    {activeTab === "edit" ? "Switch to Live Preview" : "Switch to Editor"}
                  </span>
                </button>
              </div>

              {activeTab === "edit" ? (
                <form onSubmit={handleUpdate} className="grid gap-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-muted-foreground">Name</Label>
                      <Input required className="h-9 text-[13px]" value={editForm.name} onChange={(e) => setEditForm((v) => ({ ...v, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-muted-foreground">Subject</Label>
                      <Input required className="h-9 text-[13px]" value={editForm.subject} onChange={(e) => setEditForm((v) => ({ ...v, subject: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-muted-foreground">Body text</Label>
                    <Textarea required className="min-h-[200px] text-[13px] font-sans resize-y" value={editForm.bodyText} onChange={(e) => setEditForm((v) => ({ ...v, bodyText: e.target.value }))} />
                  </div>
                  {renderAttachmentField(editAttachment, setEditAttachment, "edit")}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <Button type="button" variant="destructive" onClick={() => { if (editingTemplate) { setTemplateToDelete(editingTemplate); setDeleteDialogOpen(true); } }} className="h-9 text-[13px] gap-2">
                      <Trash2 className="h-3.5 w-3.5" /> Delete template
                    </Button>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="ghost" onClick={() => setView("list")} className="h-9 text-[13px]">Cancel</Button>
                      <Button type="submit" disabled={saving} className="h-9 text-[13px] gap-2">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save changes
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const preview = compileLivePreview(editForm.subject, editForm.bodyText, editVariables, globalVars);
                    return (
                      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="space-y-2 pb-4 border-b border-border/60">
                          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <span className="font-semibold text-foreground">Subject:</span>
                            <span className="text-foreground font-medium">{preview.sub || <span className="italic text-muted-foreground/50">No subject</span>}</span>
                          </div>
                          {editAttachment && (
                            <div className="flex items-center gap-1.5 text-[11px] bg-secondary/40 px-2 py-1 rounded w-fit border border-border/50 text-muted-foreground">
                              <Paperclip className="h-3 w-3" />
                              <span>{editAttachment.name}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans text-foreground min-h-[180px]">
                          {preview.body || <span className="italic text-muted-foreground/50">No body text</span>}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <Button type="button" variant="destructive" onClick={() => { if (editingTemplate) { setTemplateToDelete(editingTemplate); setDeleteDialogOpen(true); } }} className="h-9 text-[13px] gap-2">
                      <Trash2 className="h-3.5 w-3.5" /> Delete template
                    </Button>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="ghost" onClick={() => setView("list")} className="h-9 text-[13px]">Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PDF Picker Dialog */}
      {user && (
        <PdfPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          userId={user.id}
          currentAttachment={pickerTarget === "create" ? createAttachment : editAttachment}
          onSelect={handleAttachmentSelect}
        />
      )}

      {/* Delete template confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;
              <span className="font-semibold text-foreground">{templateToDelete?.name}</span>
              &quot;. The PDF attachment will remain in your library. This action cannot be undone.
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
              Delete template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish to global dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Publish to Global Library
            </DialogTitle>
            <DialogDescription>
              Share &quot;<span className="font-medium text-foreground">{templateToPublish?.name}</span>&quot; with the Dumpmail community. Anyone can add it to their library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">Category</Label>
              <select
                value={publishForm.category}
                onChange={(e) => setPublishForm((v) => ({ ...v, category: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {["General", "Cold Outreach", "Follow-up", "Introduction", "Re-engagement", "Partnership"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-muted-foreground">
                Description <span className="font-normal text-muted-foreground/60">(optional)</span>
              </Label>
              <Textarea
                placeholder="Briefly describe when to use this template…"
                className="min-h-[80px] text-[13px] font-sans resize-none"
                value={publishForm.description}
                onChange={(e) => setPublishForm((v) => ({ ...v, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setPublishDialogOpen(false)} className="text-[13px]">Cancel</Button>
            <Button
              size="sm"
              onClick={() => void handlePublish()}
              disabled={publishing}
              className="gap-2 text-[13px]"
            >
              {publishing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Globe className="h-3.5 w-3.5" />
              Publish
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Manage Global Template Dialog */}
      <Dialog open={manageGlobalDialogOpen} onOpenChange={setManageGlobalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Globe className="h-4 w-4" />
              Manage Global Template
            </DialogTitle>
            <DialogDescription>
              This template &quot;<span className="font-semibold text-foreground">{templateToManage?.name}</span>&quot; is already published to the community.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-[13px] text-muted-foreground leading-relaxed">
            Would you like to sync the community template with your latest local edits, or remove it from the global library entirely?
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setManageGlobalDialogOpen(false)}
              className="text-[13px] h-9"
              disabled={managingGlobal}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => templateToManage && void handleDeleteGlobal(templateToManage)}
              className="text-[13px] h-9 gap-2"
              disabled={managingGlobal}
            >
              {managingGlobal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Unpublish (Delete)
            </Button>
            <Button
              onClick={() => templateToManage && void handleUpdateGlobal(templateToManage)}
              className="text-[13px] h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={managingGlobal}
            >
              {managingGlobal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
              Sync (Update Global)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Variables Dialog */}
      <Dialog open={globalVarsDialogOpen} onOpenChange={setGlobalVarsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Global Variables
            </DialogTitle>
            <DialogDescription>
              Variables configured here are shared across all templates.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Global Variables</h3>
              
              <div className="space-y-4">
                {tempGlobalVars.map((item, index) => {
                  if (item.key === "name") {
                    return (
                      <div key={index} className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-muted-foreground flex items-center justify-between">
                          <span>name (Your name)</span>
                          <span className="font-mono text-[10px] text-primary">{"{{name}}"}</span>
                        </Label>
                        <Input
                          placeholder="e.g. John Doe"
                          value={item.value}
                          onChange={(e) =>
                            setTempGlobalVars((prev) =>
                              prev.map((v, i) => (i === index ? { ...v, value: e.target.value } : v))
                            )
                          }
                          className="h-9 text-[13px]"
                        />
                      </div>
                    );
                  }

                  if (item.key === "signature") {
                    return (
                      <div key={index} className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-muted-foreground flex items-center justify-between">
                          <span>signature (Your signature)</span>
                          <span className="font-mono text-[10px] text-primary">{"{{signature}}"}</span>
                        </Label>
                        <Textarea
                          placeholder="e.g. Best regards,\nJohn"
                          value={item.value}
                          onChange={(e) =>
                            setTempGlobalVars((prev) =>
                              prev.map((v, i) => (i === index ? { ...v, value: e.target.value } : v))
                            )
                          }
                          className="min-h-[80px] text-[13px] font-sans"
                        />
                      </div>
                    );
                  }

                  // Custom global variables
                  return (
                    <div key={index} className="flex items-start gap-2 pt-3 border-t border-border/60">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Variable Key</Label>
                          <Input
                            placeholder="e.g. company_phone"
                            value={item.key}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, ""); // alphanumeric and underscores only
                              setTempGlobalVars((prev) =>
                                prev.map((v, i) => (i === index ? { ...v, key: val } : v))
                              );
                            }}
                            className="h-9 text-[12px] font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Value</Label>
                          <Input
                            placeholder="Value"
                            value={item.value}
                            onChange={(e) => {
                              setTempGlobalVars((prev) =>
                                prev.map((v, i) => (i === index ? { ...v, value: e.target.value } : v))
                              );
                            }}
                            className="h-9 text-[12px]"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setTempGlobalVars((prev) => prev.filter((_, i) => i !== index));
                        }}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0 mt-5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTempGlobalVars((prev) => [...prev, { key: "", value: "" }])}
                  className="h-8 text-[12px] gap-1.5 w-full border-dashed"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Custom Global Variable
                </Button>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-3 bg-secondary/10">
            <Button variant="ghost" size="sm" onClick={() => setGlobalVarsDialogOpen(false)} className="text-[13px] h-9">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveGlobalVars} disabled={saving} className="text-[13px] h-9 gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Variables
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
