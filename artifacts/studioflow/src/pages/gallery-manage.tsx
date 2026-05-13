import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute } from "wouter";
import Layout from "@/components/Layout";
import {
  useGetGallery, useListMedia, useUpdateGallery, getGetGalleryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ExternalLink, Copy, Images, Lock, Link2, Globe, Check, Palette, Code2,
  Upload, ImageIcon, Loader2, Building2, X, GripVertical, Plus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Visibility = "private" | "link_only" | "public";

const VISIBILITY_OPTIONS = [
  { value: "private" as Visibility,   label: "Private",    description: "Only you can view", icon: Lock },
  { value: "link_only" as Visibility, label: "Link Only",  description: "Anyone with the link", icon: Link2 },
  { value: "public" as Visibility,    label: "Public",     description: "Open to everyone", icon: Globe },
];

const GALLERY_THEMES = [
  { id: "classic",     name: "Classic Light", description: "Clean white, timeless",  bg: "#F6F3EE", card: "#FFFFFF",  text: "#191C26", accent: "#C9A96E", border: "#E5DDD0" },
  { id: "studio-dark", name: "Studio Dark",   description: "Charcoal, cinematic",    bg: "#111316", card: "#181B21",  text: "#E6E3DE", accent: "#C9A96E", border: "#1C2029" },
  { id: "warm-ivory",  name: "Warm Ivory",    description: "Cream, soft luxury",     bg: "#FAF5EC", card: "#FFF8F0",  text: "#2A1F0F", accent: "#8B5E3C", border: "#E8D9C0" },
  { id: "midnight",    name: "Midnight",      description: "True black, dramatic",   bg: "#090909", card: "#111111",  text: "#F2F2F2", accent: "#8B9EFF", border: "#202020" },
  { id: "forest",      name: "Forest",        description: "Deep green, organic",    bg: "#111A14", card: "#172019",  text: "#DFF0E2", accent: "#6DB87A", border: "#1E3022" },
  { id: "slate",       name: "Slate",         description: "Cool gray, modern",      bg: "#141B23", card: "#1A2230",  text: "#DEE7F2", accent: "#6FA6D4", border: "#1F2D3E" },
];

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadFileToStorage(file: File): Promise<string> {
  const token = localStorage.getItem("sf_token");
  if (!token) throw new Error("Not authenticated");
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!urlRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await urlRes.json();
  const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!putRes.ok) throw new Error("Failed to upload file");
  return `/api/storage${objectPath}`;
}

// ─── Image upload zone ────────────────────────────────────────────────────────

interface ImageUploadProps {
  label: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onClear?: () => void;
  accept?: string;
  hint?: string;
}

function ImageUploadZone({ label, currentUrl, onUploaded, onClear, accept = "image/*", hint }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFileToStorage(file);
      onUploaded(url);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [onUploaded, toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {currentUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted h-32">
          <img src={currentUrl} alt={label} loading="lazy" decoding="async" className="w-full h-full object-contain p-2" />
          {onClear && (
            <button onClick={onClear} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 hover:bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={e => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"}`}
        >
          <input ref={inputRef} type="file" accept={accept} className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <p className="text-xs text-foreground font-medium">Drop image or click to browse</p>
              {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Drag-sortable photo grid ─────────────────────────────────────────────────

interface DraggablePhotoGridProps {
  orderedIds: number[];
  mediaMap: Record<number, { id: number; filename: string; thumbnailUrl?: string | null; originalUrl: string }>;
  onChange: (next: number[]) => void;
}

function DraggablePhotoGrid({ orderedIds, mediaMap, onChange }: DraggablePhotoGridProps) {
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (i: number) => {
    dragIdx.current = i;
  };

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOverIdx(i);
  };

  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    const src = dragIdx.current;
    if (src === null || src === i) { setDragOverIdx(null); return; }
    const next = [...orderedIds];
    const [item] = next.splice(src, 1);
    next.splice(i, 0, item);
    onChange(next);
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  const removeAt = (i: number) => {
    const next = [...orderedIds];
    next.splice(i, 1);
    onChange(next);
  };

  if (orderedIds.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
        <Images className="w-7 h-7 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No photos added yet — pick from the available photos below.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
      {orderedIds.map((id, i) => {
        const m = mediaMap[id];
        if (!m) return null;
        const isOver = dragOverIdx === i;
        return (
          <div
            key={id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={e => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            data-testid={`draggable-media-${id}`}
            className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing select-none ${
              isOver ? "border-primary scale-95 opacity-60" : "border-primary/60 hover:border-primary"
            }`}
          >
            <img
              src={m.thumbnailUrl ?? m.originalUrl}
              alt={m.filename}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover pointer-events-none"
            />
            {/* Position number */}
            <div className="absolute bottom-1 left-1 min-w-[18px] h-[18px] bg-black/60 rounded text-[10px] font-semibold text-white flex items-center justify-center px-1">
              {i + 1}
            </div>
            {/* Grip hint */}
            <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-3.5 h-3.5 text-white drop-shadow" />
            </div>
            {/* Remove button */}
            <button
              onClick={() => removeAt(i)}
              data-testid={`remove-media-${id}`}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GalleryManagePage() {
  const [, params] = useRoute("/projects/:projectId/gallery/:galleryId");
  const projectId = parseInt(params?.projectId ?? "0");
  const galleryId = parseInt(params?.galleryId ?? "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gallery, isLoading } = useGetGallery(galleryId);
  const { data: allMedia } = useListMedia(projectId);
  const updateGallery = useUpdateGallery();

  const currentVisibility = (gallery?.visibility as Visibility | undefined) ?? "link_only";
  const currentTheme = gallery?.theme ?? "studio-dark";

  // Local state
  const [customCss, setCustomCss]         = useState("");
  const [cssEdited, setCssEdited]         = useState(false);
  const [companyName, setCompanyName]     = useState("");
  const [companyEdited, setCompanyEdited] = useState(false);

  // Ordered media IDs (array — position = gallery sort order)
  const [orderedIds, setOrderedIds] = useState<number[]>([]);
  const [mediaChanged, setMediaChanged] = useState(false);

  useEffect(() => {
    if (gallery?.customCss != null) setCustomCss(gallery.customCss ?? "");
    if (gallery?.companyName != null) setCompanyName(gallery.companyName ?? "");
  }, [gallery?.customCss, gallery?.companyName]);

  useEffect(() => {
    if (gallery?.mediaIds) {
      setOrderedIds(gallery.mediaIds);
    }
  }, [gallery?.mediaIds]);

  // Build a map for fast lookup
  const mediaMap = Object.fromEntries((allMedia ?? []).map(m => [m.id, m]));
  const includedSet = new Set(orderedIds);
  const availableMedia = (allMedia ?? []).filter(m => !includedSet.has(m.id));

  // ── Mutation helper ──────────────────────────────────────────────────────────
  const mutate = (data: Parameters<typeof updateGallery.mutate>[0]["data"], successMsg: string, cb?: () => void) => {
    updateGallery.mutate({ id: galleryId, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGalleryQueryKey(galleryId) });
        toast({ title: successMsg });
        cb?.();
      },
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/gallery/${gallery?.shareToken}`);
    toast({ title: "Link copied to clipboard" });
  };

  const handleOrderChange = (next: number[]) => {
    setOrderedIds(next);
    setMediaChanged(true);
  };

  const addMedia = (id: number) => {
    setOrderedIds(prev => [...prev, id]);
    setMediaChanged(true);
  };

  const saveMediaOrder = () => {
    mutate({ mediaIds: orderedIds }, "Gallery photos saved", () => setMediaChanged(false));
  };

  // ─── Loading / not found ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Layout breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "Gallery" }]}>
        <div className="p-6 space-y-4">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!gallery) {
    return (
      <Layout breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "Gallery" }]}>
        <div className="p-6 text-center py-16 text-muted-foreground">Gallery not found</div>
      </Layout>
    );
  }

  return (
    <Layout
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: "Project", href: `/projects/${projectId}` },
        { label: gallery.name },
      ]}
    >
      <div className="p-6 space-y-6">

        {/* ── Page header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{gallery.name}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant={gallery.isPublic ? "default" : "secondary"} className="text-xs">
                {gallery.isPublic ? "Live" : "Draft"}
              </Badge>
              <span className="text-sm text-muted-foreground">{gallery.viewCount} views · {gallery.downloadCount} downloads</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {currentVisibility !== "private" && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyLink} data-testid="button-copy-gallery-link">
                  <Copy className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Copy Link</span>
                </Button>
                <Button size="sm" onClick={() => window.open(`/gallery/${gallery.shareToken}`, "_blank")} data-testid="button-open-gallery">
                  <ExternalLink className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Open Gallery</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Photos in this gallery ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Photos in Gallery</CardTitle>
              <span className="text-xs text-muted-foreground">
                {orderedIds.length} of {allMedia?.length ?? 0} selected
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag photos to reorder. Clients see them in this exact order. Click a photo below to add it.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Ordered / draggable included photos */}
            <DraggablePhotoGrid
              orderedIds={orderedIds}
              mediaMap={mediaMap}
              onChange={handleOrderChange}
            />

            {/* Available (not yet included) photos */}
            {availableMedia.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Available — click to add</p>
                  <button
                    onClick={() => {
                      setOrderedIds(prev => [...prev, ...availableMedia.map(m => m.id)]);
                      setMediaChanged(true);
                    }}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add All
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                  {availableMedia.map(m => (
                    <button
                      key={m.id}
                      onClick={() => addMedia(m.id)}
                      data-testid={`add-media-${m.id}`}
                      className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary/50 transition-all"
                    >
                      <img
                        src={m.thumbnailUrl ?? m.originalUrl}
                        alt={m.filename}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover opacity-50 group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow">
                          <Plus className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save button */}
            {mediaChanged && (
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground">You have unsaved changes to the photo order.</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setOrderedIds(gallery.mediaIds ?? []); setMediaChanged(false); }}>
                    Discard
                  </Button>
                  <Button size="sm" onClick={saveMediaOrder} disabled={updateGallery.isPending} data-testid="button-save-media-order">
                    {updateGallery.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : "Save Order"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Client Access ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Client Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {VISIBILITY_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isSelected = currentVisibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => mutate({ visibility: opt.value, isPublic: opt.value !== "private" }, `Gallery set to ${opt.label.toLowerCase()}`)}
                    data-testid={`visibility-${opt.value}`}
                    className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected ? "border-primary bg-primary/8" : "border-border hover:border-muted-foreground/40 bg-card"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {currentVisibility !== "private" && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Share this link with your client:</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/gallery/${gallery.shareToken}`}
                    className="font-mono text-xs"
                    data-testid="input-gallery-share-link"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Branding ───────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Your Branding</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your logo and company name appear in the gallery header your clients see.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company / Studio Name</label>
              <div className="flex gap-2">
                <Input
                  value={companyName}
                  onChange={e => { setCompanyName(e.target.value); setCompanyEdited(true); }}
                  placeholder="e.g. Pacific Coast Photography"
                  data-testid="input-company-name"
                />
                <Button
                  size="sm"
                  variant={companyEdited ? "default" : "outline"}
                  disabled={!companyEdited || updateGallery.isPending}
                  onClick={() => mutate({ companyName: companyName || null }, "Company name saved", () => setCompanyEdited(false))}
                >
                  Save
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Shown in the gallery header and footer. Leave blank to use your account name.</p>
            </div>

            <ImageUploadZone
              label="Logo"
              currentUrl={gallery.brandingLogoUrl}
              hint="PNG or SVG with transparent background recommended · max 2 MB"
              onUploaded={url => mutate({ brandingLogoUrl: url }, "Logo uploaded")}
              onClear={() => mutate({ brandingLogoUrl: null }, "Logo removed")}
            />
          </CardContent>
        </Card>

        {/* ── Cover Image ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Cover Image</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              A full-width hero image shown at the top of the gallery. Pick from your uploaded photos or upload a new one.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {allMedia && allMedia.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Pick from project photos</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                  {allMedia.map(m => {
                    const isCover = gallery.coverImageUrl === (m.thumbnailUrl ?? m.originalUrl) || gallery.coverImageUrl === m.originalUrl;
                    return (
                      <button
                        key={m.id}
                        onClick={() => mutate({ coverImageUrl: m.thumbnailUrl ?? m.originalUrl }, "Cover image set")}
                        data-testid={`pick-cover-${m.id}`}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          isCover ? "border-primary" : "border-transparent hover:border-primary/40"
                        }`}
                      >
                        <img src={m.thumbnailUrl ?? m.originalUrl} alt={m.filename} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        {isCover && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <ImageUploadZone
              label="Or upload a cover image"
              currentUrl={gallery.coverImageUrl}
              hint="Landscape orientation recommended · min 1400px wide"
              onUploaded={url => mutate({ coverImageUrl: url }, "Cover image set")}
              onClear={() => mutate({ coverImageUrl: null }, "Cover image removed")}
            />
          </CardContent>
        </Card>

        {/* ── Gallery Theme ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Gallery Theme</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Choose the visual style of your client gallery.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GALLERY_THEMES.map(t => {
                const isSelected = currentTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => mutate({ theme: t.id }, `Theme set to ${t.name}`)}
                    data-testid={`theme-${t.id}`}
                    className={`relative flex flex-col gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected ? "border-primary" : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      {[t.bg, t.card, t.accent].map((c, i) => (
                        <div key={i} className="w-5 h-5 rounded-full border border-border" style={{ background: c }} />
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Custom CSS ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Custom CSS</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Override any gallery style with your own CSS.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={customCss}
              onChange={e => { setCustomCss(e.target.value); setCssEdited(true); }}
              placeholder=".gallery-header { font-family: 'Your Font', serif; }"
              className="font-mono text-xs min-h-[100px] resize-y"
              data-testid="input-custom-css"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant={cssEdited ? "default" : "outline"}
                disabled={!cssEdited || updateGallery.isPending}
                onClick={() => mutate({ customCss: customCss || null }, "CSS saved", () => setCssEdited(false))}
              >
                Save CSS
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
