import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import Layout from "@/components/Layout";
import ImageViewer from "@/components/ImageViewer";
import UploadZone from "@/components/UploadZone";
import {
  useGetProject, useListMedia, useListGalleries, useCreateGallery,
  useGetProjectStats, getListGalleriesQueryKey, getListMediaQueryKey,
  useDeleteMedia, useUpdateMedia, useUpdateProject, useReorderMedia, useCreateInvoice, useDeleteGallery,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ImageIcon, Zap, Share2, Plus, ExternalLink, Eye as EyeIcon, Upload,
  Trash2, RefreshCw, Loader2, Star, GripVertical, Receipt, X, AlertTriangle, Pencil,
  Cloud, Home, Sparkles, Moon, Layers, Paintbrush, Crop, LayoutGrid,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "draft",     label: "Draft" },
  { value: "active",    label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "delivered", label: "Delivered" },
  { value: "paid",      label: "Paid" },
  { value: "archived",  label: "Archived" },
];

const STATUS_COLORS: Record<string, string> = {
  draft:     "badge-draft",
  active:    "badge-active",
  delivered: "badge-delivered",
  archived:  "badge-archived",
  completed: "badge-completed",
  paid:      "badge-paid",
};

const AI_TOOLS = [
  { type: "sky_replacement",       label: "Sky Replacement",    desc: "Swap dull skies for bright, dramatic ones.",        icon: Cloud,       credits: 2 },
  { type: "virtual_staging",       label: "Virtual Staging",    desc: "Digitally furnish empty rooms to show potential.",   icon: Home,        credits: 5 },
  { type: "declutter",             label: "Declutter",          desc: "Remove clutter and distracting objects.",            icon: Sparkles,    credits: 3 },
  { type: "day_to_dusk",           label: "Day to Dusk",        desc: "Transform daylight shots into twilight scenes.",     icon: Moon,        credits: 3 },
  { type: "hdr_enhancement",       label: "HDR Enhancement",    desc: "Balance exposure across highlights and shadows.",    icon: Layers,      credits: 2 },
  { type: "object_removal",        label: "Object Removal",     desc: "Erase specific items cleanly from the scene.",       icon: Crop,        credits: 2 },
  { type: "color_grading",         label: "Color Grading",      desc: "Professional tone and color correction.",            icon: Paintbrush,  credits: 1 },
  { type: "furniture_replacement", label: "Furniture Replace",  desc: "Swap existing furniture for curated new pieces.",    icon: LayoutGrid,  credits: 5 },
] as const;

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadReplacementFile(file: File): Promise<{ originalUrl: string; thumbnailUrl: string | null; filename: string }> {
  const token = localStorage.getItem("sf_token");
  if (!token) throw new Error("Not authenticated");

  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!urlRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await urlRes.json();

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("Upload failed");

  return { originalUrl: `/api/storage${objectPath}`, thumbnailUrl: `/api/storage${objectPath}`, filename: file.name };
}

// ── Media card ────────────────────────────────────────────────────────────────

interface MediaCardProps {
  m: { id: number; filename: string; originalUrl: string; thumbnailUrl?: string | null };
  index: number;
  onOpen: (i: number) => void;
  projectId: number;
  coverImageUrl?: string | null;
  onSetCover: (url: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isOver: boolean;
}

function MediaCard({ m, index, onOpen, projectId, coverImageUrl, onSetCover, onDragStart, onDragOver, onDragEnd, isDragging, isOver }: MediaCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();
  const [replacing, setReplacing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isCover = !!(coverImageUrl && (coverImageUrl === m.originalUrl || coverImageUrl === m.thumbnailUrl));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListMediaQueryKey(projectId) });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteMedia.mutate({ id: m.id }, {
      onSuccess: () => { invalidate(); toast({ title: "Photo deleted" }); },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  const handleReplace = useCallback(async (file: File) => {
    setReplacing(true);
    try {
      const { originalUrl, thumbnailUrl, filename } = await uploadReplacementFile(file);
      updateMedia.mutate({ id: m.id, data: { originalUrl, thumbnailUrl, filename } }, {
        onSuccess: () => { invalidate(); toast({ title: "Photo replaced" }); },
        onError: () => toast({ title: "Replace failed", variant: "destructive" }),
      });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setReplacing(false);
    }
  }, [m.id]);

  const busy = deleteMedia.isPending || replacing;

  return (
    <div
      className={`group relative aspect-square bg-muted rounded-lg overflow-hidden transition-all ${
        isDragging ? "opacity-40 scale-95 cursor-grabbing" : "cursor-grab"
      } ${isOver ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
      data-testid={`media-item-${m.id}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDragEnd={onDragEnd}
      onMouseLeave={() => setConfirmDelete(false)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleReplace(f); e.target.value = ""; }}
      />

      <img
        src={m.thumbnailUrl ?? m.originalUrl}
        alt={m.filename}
        onClick={() => !busy && onOpen(index)}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />

      {/* Drag handle */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
        <div className="w-6 h-6 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <GripVertical className="w-3 h-3 text-white/70" />
        </div>
      </div>

      {/* Cover badge */}
      {isCover && (
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
          <span className="text-[9.5px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5" /> Cover
          </span>
        </div>
      )}

      {/* Hover overlay */}
      <div
        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5"
        style={{ pointerEvents: "none" }}
      >
        <Zap className="w-5 h-5 text-primary" />
        <p className="text-[11px] text-white font-medium">Open &amp; Edit</p>
      </div>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {!isCover && (
          <button
            onClick={e => { e.stopPropagation(); onSetCover(m.originalUrl); }}
            title="Set as cover image"
            className="w-7 h-7 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-primary/80 hover:text-primary-foreground flex items-center justify-center transition-colors"
          >
            <Star className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
          disabled={busy}
          data-testid={`button-replace-${m.id}`}
          title="Replace with new file"
          className="w-7 h-7 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50"
        >
          {replacing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          data-testid={`button-delete-${m.id}`}
          title={confirmDelete ? "Click again to confirm delete" : "Delete photo"}
          className={`h-7 rounded-md backdrop-blur-sm border text-white flex items-center justify-center gap-1 transition-all disabled:opacity-50 px-1.5 ${
            confirmDelete
              ? "bg-destructive border-destructive/80 text-[10px] font-medium min-w-[56px]"
              : "w-7 bg-black/60 border-white/10 hover:bg-destructive hover:border-destructive"
          }`}
        >
          {deleteMedia.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirmDelete ? <>Confirm</> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ── Invoice dialog ─────────────────────────────────────────────────────────────

interface LineItem { description: string; amount: string }

interface InvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
}

function InvoiceDialog({ open, onClose, projectId, projectName }: InvoiceDialogProps) {
  const { toast } = useToast();
  const createInvoice = useCreateInvoice();

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "Photography Services", amount: "" }]);
  const [isExisting, setIsExisting] = useState(false);
  const [existingToken, setExistingToken] = useState<string | null>(null);

  // Pre-populate from existing invoice when dialog opens
  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem("sf_token");
    if (!token) return;
    fetch(`/api/projects/${projectId}/invoice`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => {
      if (!r.ok) return null;
      return r.json();
    }).then((inv: { clientName: string; clientEmail: string | null; dueDate: string | null; notes: string | null; lineItems: Array<{ description: string; amount: number }>; shareToken: string } | null) => {
      if (!inv) return;
      setClientName(inv.clientName ?? "");
      setClientEmail(inv.clientEmail ?? "");
      setDueDate(inv.dueDate ?? "");
      setNotes(inv.notes ?? "");
      setLineItems(
        inv.lineItems?.length
          ? inv.lineItems.map(l => ({ description: l.description, amount: String(l.amount) }))
          : [{ description: "Photography Services", amount: "" }]
      );
      setIsExisting(true);
      setExistingToken(inv.shareToken);
    }).catch(() => {});
  }, [open, projectId]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setClientName("");
      setClientEmail("");
      setDueDate("");
      setNotes("");
      setLineItems([{ description: "Photography Services", amount: "" }]);
      setIsExisting(false);
      setExistingToken(null);
    }
  }, [open]);

  const total = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const addLine = () => setLineItems(prev => [...prev, { description: "", amount: "" }]);
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, val: string) =>
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleSubmit = () => {
    if (!clientName.trim()) {
      toast({ title: "Client name is required", variant: "destructive" });
      return;
    }
    const items = lineItems.filter(l => l.description.trim()).map(l => ({
      description: l.description,
      amount: parseFloat(l.amount) || 0,
    }));
    if (items.length === 0) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }
    createInvoice.mutate({
      id: projectId,
      data: {
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || null,
        lineItems: items,
        notes: notes.trim() || null,
        dueDate: dueDate || null,
      },
    }, {
      onSuccess: inv => {
        const shareUrl = `${window.location.origin}/invoice/${inv.shareToken ?? existingToken}`;
        navigator.clipboard.writeText(shareUrl).catch(() => {});
        toast({
          title: isExisting ? "Invoice updated" : "Invoice created",
          description: "Share link copied to clipboard.",
        });
        onClose();
      },
      onError: () => toast({ title: isExisting ? "Failed to update invoice" : "Failed to create invoice", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            {isExisting ? "Update Invoice" : "Create Invoice"} — {projectName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Client Name *</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Sarah Chen" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Client Email</Label>
              <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="sarah@example.com" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Line Items</Label>
            {lineItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  className="flex-1"
                  placeholder="Description"
                  value={item.description}
                  onChange={e => updateLine(i, "description", e.target.value)}
                />
                <Input
                  className="w-28"
                  type="number"
                  placeholder="$0.00"
                  min="0"
                  step="0.01"
                  value={item.amount}
                  onChange={e => updateLine(i, "amount", e.target.value)}
                />
                {lineItems.length > 1 && (
                  <button onClick={() => removeLine(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addLine} className="text-xs text-primary hover:underline underline-offset-2">
              + Add line item
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-primary/8 border border-primary/15 px-4 py-2.5">
            <span className="text-sm font-medium text-foreground/70">Total</span>
            <span className="text-lg font-bold text-primary">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment due within 30 days…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createInvoice.isPending}>
            {createInvoice.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Receipt className="w-4 h-4 mr-2" />}
            {isExisting ? "Update Invoice" : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const [, params] = useRoute("/projects/:id");
  const projectId = parseInt(params?.id ?? "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [confirmDeleteGalleryId, setConfirmDeleteGalleryId] = useState<number | null>(null);
  const [aiToolDialog, setAiToolDialog] = useState<{ type: string; label: string; credits: number } | null>(null);
  const [aiMediaId, setAiMediaId] = useState<number | null>(null);
  const [submittingAiJob, setSubmittingAiJob] = useState(false);

  // DnD state
  const [orderedIds, setOrderedIds] = useState<number[]>([]);
  const dragIndexRef = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const pendingReorder = useRef(false);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: media, isLoading: mediaLoading } = useListMedia(projectId);
  const { data: galleries } = useListGalleries(projectId);
  const { data: stats } = useGetProjectStats(projectId);
  const createGallery = useCreateGallery();
  const deleteGallery = useDeleteGallery();
  const updateProject = useUpdateProject();
  const reorderMedia = useReorderMedia();

  useEffect(() => {
    if (media && !pendingReorder.current) {
      setOrderedIds(media.map(m => m.id));
    }
  }, [media]);

  const mediaById = Object.fromEntries((media ?? []).map(m => [m.id, m]));
  const orderedMedia = orderedIds.map(id => mediaById[id]).filter(Boolean) as NonNullable<typeof media>;

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (hoverIndex: number) => {
    if (dragIndexRef.current === null || dragIndexRef.current === hoverIndex) return;
    setOverIndex(hoverIndex);
    setOrderedIds(prev => {
      const next = [...prev];
      const [item] = next.splice(dragIndexRef.current!, 1);
      next.splice(hoverIndex, 0, item);
      dragIndexRef.current = hoverIndex;
      return next;
    });
  };

  const handleDragEnd = () => {
    setOverIndex(null);
    dragIndexRef.current = null;
    pendingReorder.current = true;
    reorderMedia.mutate({ id: projectId, data: { ids: orderedIds } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey(projectId) });
        pendingReorder.current = false;
        toast({ title: "Order saved" });
      },
      onError: () => {
        pendingReorder.current = false;
        toast({ title: "Failed to save order", variant: "destructive" });
      },
    });
  };

  const handleSetCover = (url: string) => {
    updateProject.mutate({ id: projectId, data: { coverImageUrl: url } }, {
      onSuccess: () => toast({ title: "Cover image updated" }),
      onError: () => toast({ title: "Failed to set cover", variant: "destructive" }),
    });
  };

  const handleStatusChange = (status: string) => {
    updateProject.mutate({ id: projectId, data: { status: status as "draft" | "active" | "delivered" | "archived" | "completed" | "paid" } }, {
      onSuccess: () => toast({ title: `Status updated to ${STATUS_OPTIONS.find(s => s.value === status)?.label ?? status}` }),
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    });
  };

  const handleCreateGallery = () => {
    createGallery.mutate({
      projectId,
      data: {
        name: `${project?.name ?? "Project"} Gallery`,
        isPublic: true,
        allowDownload: true,
        allowFavorites: true,
        allowComments: true,
        isPasswordProtected: false,
        password: null,
        expiresAt: null,
      },
    }, {
      onSuccess: gal => {
        queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey(projectId) });
        toast({ title: "Gallery created", description: `Share token: ${gal.shareToken}` });
        setLocation(`/projects/${projectId}/gallery/${gal.id}`);
      },
    });
  };

  if (projectLoading) {
    return (
      <Layout title="Project" breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "Loading..." }]}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-48 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout title="Not Found" breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "Not Found" }]}>
        <div className="p-6 text-center py-16">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </Layout>
    );
  }

  const allMedia = orderedMedia.length > 0 ? orderedMedia : (media ?? []);

  return (
    <Layout
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: project.name },
      ]}
    >
      {viewerIndex !== null && allMedia.length > 0 && (
        <ImageViewer
          media={allMedia}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      <InvoiceDialog
        open={showInvoiceDialog}
        onClose={() => setShowInvoiceDialog(false)}
        projectId={projectId}
        projectName={project.name}
      />

      <div className="p-6 space-y-6">
        {/* Hero */}
        <div className="relative rounded-xl overflow-hidden h-52 bg-muted">
          {project.coverImageUrl ? (
            <img src={project.coverImageUrl} alt={project.name} loading="eager" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                {/* Status selector */}
                <div className="mb-2">
                  <Select value={project.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                      <Badge className={`text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[project.status] ?? "badge-draft"}`}>
                        {STATUS_OPTIONS.find(s => s.value === project.status)?.label ?? project.status}
                        <span className="ml-1 text-[9px] opacity-60">▾</span>
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                <p className="text-white/70 text-sm">{project.address}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => setLocation(`/projects/${projectId}/edit`)}
                  data-testid="button-edit-project"
                >
                  <Pencil className="w-4 h-4 mr-1.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => setShowInvoiceDialog(true)}
                  data-testid="button-create-invoice"
                >
                  <Receipt className="w-4 h-4 mr-1.5" /> Invoice
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => setShowUpload(s => !s)}
                  data-testid="button-upload-media"
                >
                  <Upload className="w-4 h-4 mr-1.5" /> Upload
                </Button>
                <Button size="sm" onClick={handleCreateGallery} disabled={createGallery.isPending} data-testid="button-create-gallery">
                  <Share2 className="w-4 h-4 mr-1.5" /> Share Gallery
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Photos",    value: stats?.photos    ?? allMedia.filter(m => m.mediaType === "photo").length },
            { label: "Videos",   value: stats?.videos    ?? allMedia.filter(m => m.mediaType === "video").length },
            { label: "AI Jobs",  value: stats?.aiProcessed ?? 0 },
            { label: "Galleries", value: galleries?.length ?? 0 },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="media">
          <TabsList>
            <TabsTrigger value="media" data-testid="tab-media">Media</TabsTrigger>
            <TabsTrigger value="galleries" data-testid="tab-galleries">Galleries</TabsTrigger>
            <TabsTrigger value="ai-tools" data-testid="tab-ai-tools">
              <Zap className="w-3.5 h-3.5 mr-1.5" />AI Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="media" className="mt-4 space-y-4">
            {(showUpload || (!mediaLoading && allMedia.length === 0)) && (
              <UploadZone projectId={projectId} />
            )}

            {mediaLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
              </div>
            ) : allMedia.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">Drop your first photos above to get started.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] text-muted-foreground">
                    {allMedia.length} {allMedia.length === 1 ? "file" : "files"} · Drag to reorder · Hover for cover, delete, or replace
                  </p>
                  {!showUpload && (
                    <button
                      onClick={() => setShowUpload(true)}
                      className="text-[11.5px] text-primary hover:underline"
                      data-testid="button-show-upload"
                    >
                      + Add more
                    </button>
                  )}
                </div>
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                  onDragOver={e => e.preventDefault()}
                >
                  {allMedia.map((m, i) => (
                    <MediaCard
                      key={m.id}
                      m={m}
                      index={i}
                      onOpen={setViewerIndex}
                      projectId={projectId}
                      coverImageUrl={project.coverImageUrl}
                      onSetCover={handleSetCover}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      isDragging={dragIndexRef.current === i}
                      isOver={overIndex === i}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="galleries" className="mt-4">
            {(!galleries || galleries.length === 0) ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                <Share2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">No galleries created yet</p>
                <Button onClick={handleCreateGallery} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Create Gallery
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {galleries.map(g => (
                  <Card key={g.id} data-testid={`card-gallery-${g.id}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm">{g.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {g.isPublic ? "Public" : "Private"} · {g.viewCount} views · {g.downloadCount} downloads
                        </p>
                        <p className="text-xs font-mono text-primary mt-1">/gallery/{g.shareToken}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center justify-end">
                        <Badge variant={g.isPublic ? "default" : "secondary"} className="text-xs">
                          {g.isPublic ? "Live" : "Draft"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => window.open(`/gallery/${g.shareToken}`, "_blank")}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setLocation(`/projects/${projectId}/gallery/${g.id}`)}>
                          <EyeIcon className="w-3.5 h-3.5 mr-1" /> Manage
                        </Button>
                        {confirmDeleteGalleryId === g.id ? (
                          <div className="flex gap-1.5 items-center">
                            <span className="text-[11px] text-destructive font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Delete?
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteGallery.isPending}
                              data-testid={`button-confirm-delete-gallery-${g.id}`}
                              onClick={() => {
                                deleteGallery.mutate({ id: g.id }, {
                                  onSuccess: () => {
                                    queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey(projectId) });
                                    setConfirmDeleteGalleryId(null);
                                    toast({ title: "Gallery deleted" });
                                  },
                                  onError: () => toast({ title: "Failed to delete gallery", variant: "destructive" }),
                                });
                              }}
                            >
                              {deleteGallery.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, delete"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmDeleteGalleryId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-delete-gallery-${g.id}`}
                            className="text-muted-foreground hover:text-destructive hover:border-destructive"
                            onClick={() => setConfirmDeleteGalleryId(g.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="ai-tools" className="mt-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-0.5">AI Enhancement Tools</h3>
              <p className="text-xs text-muted-foreground">
                Select a tool, then choose which photo to apply it to.
                Credits are deducted when the job starts.
              </p>
            </div>
            {allMedia.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-1">No media uploaded yet</p>
                <p className="text-xs text-muted-foreground/70">Upload photos first to use AI tools</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {AI_TOOLS.map(tool => (
                  <button
                    key={tool.type}
                    data-testid={`ai-tool-${tool.type}`}
                    onClick={() => {
                      setAiToolDialog({ type: tool.type, label: tool.label, credits: tool.credits });
                      setAiMediaId(allMedia[0]?.id ?? null);
                    }}
                    className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                        <tool.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {tool.credits} cr
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-foreground mb-1">{tool.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{tool.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* AI Tool Dialog */}
        <Dialog open={!!aiToolDialog} onOpenChange={v => { if (!v) setAiToolDialog(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                {aiToolDialog?.label}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                This job will consume <strong className="text-foreground">{aiToolDialog?.credits} AI credits</strong> from your monthly balance.
              </p>
              <div>
                <Label className="mb-1.5 block">Apply to photo</Label>
                <Select
                  value={aiMediaId?.toString() ?? ""}
                  onValueChange={v => setAiMediaId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a photo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allMedia.filter(m => m.mediaType === "photo" || !m.mediaType).map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAiToolDialog(null)} disabled={submittingAiJob}>
                Cancel
              </Button>
              <Button
                disabled={!aiMediaId || submittingAiJob}
                onClick={async () => {
                  if (!aiMediaId || !aiToolDialog) return;
                  const tkn = localStorage.getItem("sf_token");
                  setSubmittingAiJob(true);
                  try {
                    const resp = await fetch(`/api/media/${aiMediaId}/ai-jobs`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tkn}` },
                      body: JSON.stringify({ jobType: aiToolDialog.type }),
                    });
                    if (!resp.ok) throw new Error("Failed");
                    toast({ title: "AI job started", description: `${aiToolDialog.label} is processing. Check back shortly.` });
                    setAiToolDialog(null);
                    setAiMediaId(null);
                  } catch {
                    toast({ title: "Could not start AI job", variant: "destructive" });
                  } finally {
                    setSubmittingAiJob(false);
                  }
                }}
              >
                {submittingAiJob ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Zap className="w-4 h-4 mr-1.5" />}
                Start Job
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
