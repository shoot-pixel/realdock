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
  Upload, ImageIcon, Loader2, Building2, X, LayoutGrid, CheckSquare,
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

// ─── Logo / image upload helper ───────────────────────────────────────────────

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

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("Failed to upload file");

  return `/api/storage${objectPath}`;
}

// ─── Single-image upload zone ─────────────────────────────────────────────────

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
          <img src={currentUrl} alt={label} className="w-full h-full object-contain p-2" />
          {onClear && (
            <button
              onClick={onClear}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 hover:bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
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
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
          }`}
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

  // Local state for fields that need Save buttons
  const [customCss, setCustomCss]         = useState("");
  const [cssEdited, setCssEdited]         = useState(false);
  const [companyName, setCompanyName]     = useState("");
  const [companyEdited, setCompanyEdited] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<number>>(new Set());
  const [mediaSelectionChanged, setMediaSelectionChanged] = useState(false);

  useEffect(() => {
    if (gallery?.customCss != null) setCustomCss(gallery.customCss ?? "");
    if (gallery?.companyName != null) setCompanyName(gallery.companyName ?? "");
  }, [gallery?.customCss, gallery?.companyName]);

  useEffect(() => {
    if (gallery?.mediaIds) {
      setSelectedMediaIds(new Set(gallery.mediaIds));
    }
  }, [gallery?.mediaIds]);

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

  // ── Media selection helpers ──────────────────────────────────────────────────
  const toggleMedia = (id: number) => {
    setSelectedMediaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setMediaSelectionChanged(true);
  };

  const selectAll = () => {
    setSelectedMediaIds(new Set((allMedia ?? []).map(m => m.id)));
    setMediaSelectionChanged(true);
  };

  const clearAll = () => {
    setSelectedMediaIds(new Set());
    setMediaSelectionChanged(true);
  };

  const saveMediaSelection = () => {
    mutate({ mediaIds: Array.from(selectedMediaIds) }, "Gallery photos updated", () => {
      setMediaSelectionChanged(false);
    });
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
          <div className="flex gap-2 shrink-0">
            {currentVisibility !== "private" && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyLink} data-testid="button-copy-gallery-link">
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </Button>
                <Button size="sm" onClick={() => window.open(`/gallery/${gallery.shareToken}`, "_blank")} data-testid="button-open-gallery">
                  <ExternalLink className="w-4 h-4 mr-2" /> Open Gallery
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Photos in this gallery ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm">Photos in Gallery</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {selectedMediaIds.size} of {allMedia?.length ?? 0} selected
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                  <CheckSquare className="w-3.5 h-3.5 mr-1" /> All
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
                  <X className="w-3.5 h-3.5 mr-1" /> None
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select which photos appear in the client gallery. If none are selected, all project photos are shown.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!allMedia || allMedia.length === 0 ? (
              <div className="text-center py-8">
                <Images className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No photos uploaded to this project yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {allMedia.map(m => {
                  const selected = selectedMediaIds.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMedia(m.id)}
                      data-testid={`toggle-media-${m.id}`}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selected ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      <img
                        src={m.thumbnailUrl ?? m.originalUrl}
                        alt={m.filename}
                        className={`w-full h-full object-cover transition-opacity ${selected ? "" : "opacity-60 hover:opacity-80"}`}
                      />
                      {selected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {mediaSelectionChanged && (
              <div className="flex justify-end">
                <Button size="sm" onClick={saveMediaSelection} disabled={updateGallery.isPending}>
                  {updateGallery.isPending ? "Saving…" : "Save Selection"}
                </Button>
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
            <div className="grid grid-cols-3 gap-3">
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
            {/* Company name */}
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

            {/* Logo upload */}
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
            {/* Pick from project media */}
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
                        <img src={m.thumbnailUrl ?? m.originalUrl} alt={m.filename} className="w-full h-full object-cover" />
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

            {/* Or upload new cover */}
            <ImageUploadZone
              label="Or upload a cover image"
              currentUrl={gallery.coverImageUrl}
              hint="Landscape 16:9 works best · JPEG or PNG"
              onUploaded={url => mutate({ coverImageUrl: url }, "Cover image uploaded")}
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
            <p className="text-xs text-muted-foreground mt-0.5">Choose how the client-facing gallery looks.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="theme-grid">
              {GALLERY_THEMES.map(theme => {
                const isSelected = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => mutate({ theme: theme.id }, "Theme updated")}
                    data-testid={`theme-option-${theme.id}`}
                    className={`relative rounded-xl border-2 overflow-hidden text-left transition-all ${
                      isSelected ? "border-primary shadow-md" : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="h-16 flex flex-col p-2 gap-1.5" style={{ backgroundColor: theme.bg, borderBottom: `1px solid ${theme.border}` }}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                        <div className="h-1.5 rounded-full w-14 opacity-60" style={{ backgroundColor: theme.text }} />
                      </div>
                      <div className="grid grid-cols-3 gap-1 mt-0.5">
                        {[theme.card, theme.border, theme.accent].map((c, i) => (
                          <div key={i} className="h-5 rounded-md" style={{ backgroundColor: c, opacity: i === 1 ? 0.5 : 1 }} />
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-2 bg-card">
                      <p className="text-xs font-semibold text-foreground truncate">{theme.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{theme.description}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
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
            <p className="text-xs text-muted-foreground mt-0.5">Applied on top of the selected theme.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={customCss}
              onChange={e => { setCustomCss(e.target.value); setCssEdited(true); }}
              placeholder={`.gallery-portal {\n  font-family: 'Georgia', serif;\n}`}
              className="font-mono text-xs min-h-[120px] resize-y bg-muted/50 border-border"
              data-testid="textarea-custom-css"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant={cssEdited ? "default" : "outline"}
                onClick={() => mutate({ customCss: customCss || null }, "CSS saved", () => setCssEdited(false))}
                disabled={!cssEdited || updateGallery.isPending}
                data-testid="button-save-custom-css"
              >
                {updateGallery.isPending ? "Saving…" : "Save CSS"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Analytics ──────────────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-2xl font-bold">{gallery.viewCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total views</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-2xl font-bold">{gallery.downloadCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Downloads</p>
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
