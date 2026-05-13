import { useState, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import Layout from "@/components/Layout";
import ImageViewer from "@/components/ImageViewer";
import UploadZone from "@/components/UploadZone";
import {
  useGetProject, useListMedia, useListGalleries, useCreateGallery,
  useGetProjectStats, getListGalleriesQueryKey, getListMediaQueryKey,
  useDeleteMedia, useUpdateMedia,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ImageIcon, Zap, Share2, Plus, ExternalLink, Eye as EyeIcon, Upload,
  Trash2, RefreshCw, Loader2,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft:     "badge-draft",
  active:    "badge-active",
  delivered: "badge-delivered",
  archived:  "badge-archived",
};

// ── Upload helper (same presigned-URL flow as UploadZone) ────────────────────

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

  const servingUrl = `/api/storage${objectPath}`;
  return { originalUrl: servingUrl, thumbnailUrl: servingUrl, filename: file.name };
}

// ── Media card ────────────────────────────────────────────────────────────────

interface MediaCardProps {
  m: { id: number; filename: string; originalUrl: string; thumbnailUrl?: string | null };
  index: number;
  onOpen: (i: number) => void;
  projectId: number;
}

function MediaCard({ m, index, onOpen, projectId }: MediaCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();
  const [replacing, setReplacing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
  }, [m.id, updateMedia, invalidate, toast]);

  const busy = deleteMedia.isPending || replacing;

  return (
    <div
      className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer"
      data-testid={`media-item-${m.id}`}
      onMouseLeave={() => setConfirmDelete(false)}
    >
      {/* Hidden file input for replace */}
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
      />

      {/* Open/Edit overlay */}
      <div
        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 pointer-events-none"
        style={{ pointerEvents: "none" }}
      >
        <Zap className="w-5 h-5 text-primary" />
        <p className="text-[11px] text-white font-medium">Open &amp; Edit</p>
      </div>

      {/* Action buttons — top row */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {/* Replace */}
        <button
          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
          disabled={busy}
          data-testid={`button-replace-${m.id}`}
          title="Replace with new file"
          className="w-7 h-7 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
        >
          {replacing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Delete / Confirm */}
        <button
          onClick={handleDelete}
          disabled={busy}
          data-testid={`button-delete-${m.id}`}
          title={confirmDelete ? "Click again to confirm delete" : "Delete photo"}
          className={`h-7 rounded-md backdrop-blur-sm border text-white flex items-center justify-center gap-1 transition-all disabled:opacity-50 px-1.5 ${
            confirmDelete
              ? "bg-destructive border-destructive/80 text-white text-[10px] font-medium min-w-[56px]"
              : "w-7 bg-black/60 border-white/10 hover:bg-destructive hover:border-destructive"
          }`}
        >
          {deleteMedia.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : confirmDelete ? (
            <>Confirm</>
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
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

  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: media, isLoading: mediaLoading } = useListMedia(projectId);
  const { data: galleries } = useListGalleries(projectId);
  const { data: stats } = useGetProjectStats(projectId);
  const createGallery = useCreateGallery();

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
      }
    }, {
      onSuccess: (gal) => {
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
          <div className="grid grid-cols-4 gap-4">
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

  const allMedia = media ?? [];

  return (
    <Layout
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: project.name }
      ]}
    >
      {viewerIndex !== null && allMedia.length > 0 && (
        <ImageViewer
          media={allMedia}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      <div className="p-6 space-y-6">
        {/* Hero */}
        <div className="relative rounded-xl overflow-hidden h-52 bg-muted">
          {project.coverImageUrl ? (
            <img src={project.coverImageUrl} alt={project.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between">
              <div>
                <Badge className={`mb-2 text-xs font-semibold ${STATUS_COLORS[project.status]}`}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </Badge>
                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                <p className="text-white/70 text-sm">{project.address}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => { setShowUpload(s => !s); }}
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
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Photos", value: stats?.photos ?? allMedia.filter(m => m.mediaType === "photo").length },
            { label: "Videos", value: stats?.videos ?? allMedia.filter(m => m.mediaType === "video").length },
            { label: "AI Jobs", value: stats?.aiProcessed ?? 0 },
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
                    {allMedia.length} {allMedia.length === 1 ? "file" : "files"} · Hover a photo to delete or replace it. Click to open &amp; edit.
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {allMedia.map((m, i) => (
                    <MediaCard
                      key={m.id}
                      m={m}
                      index={i}
                      onOpen={setViewerIndex}
                      projectId={projectId}
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
                      <div className="flex gap-2 items-center">
                        <Badge variant={g.isPublic ? "default" : "secondary"} className="text-xs">
                          {g.isPublic ? "Live" : "Draft"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => window.open(`/gallery/${g.shareToken}`, "_blank")}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setLocation(`/projects/${projectId}/gallery/${g.id}`)}>
                          <EyeIcon className="w-3.5 h-3.5 mr-1" /> Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
