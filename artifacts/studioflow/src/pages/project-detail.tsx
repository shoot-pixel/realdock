import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import Layout from "@/components/Layout";
import ImageViewer from "@/components/ImageViewer";
import UploadZone from "@/components/UploadZone";
import {
  useGetProject, useListMedia, useListGalleries, useCreateGallery,
  useGetProjectStats, getListGalleriesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ImageIcon, Zap, Share2, Plus, ExternalLink, Eye, Heart, Upload,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft:     "badge-draft",
  active:    "badge-active",
  delivered: "badge-delivered",
  archived:  "badge-archived",
};

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
      {/* Image viewer — rendered outside the scrollable layout */}
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
            {/* Upload zone — shown when toggled or when no media */}
            {(showUpload || (!mediaLoading && allMedia.length === 0)) && (
              <UploadZone
                projectId={projectId}
              />
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
                    {allMedia.length} {allMedia.length === 1 ? "file" : "files"} · Click any image to open and apply AI enhancements.
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
                    <div
                      key={m.id}
                      onClick={() => setViewerIndex(i)}
                      className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer"
                      data-testid={`media-item-${m.id}`}
                    >
                      <img
                        src={m.thumbnailUrl ?? m.originalUrl}
                        alt={m.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                        <Zap className="w-5 h-5 text-primary" />
                        <p className="text-[11px] text-white font-medium">Open &amp; Edit</p>
                      </div>
                      {m.status === "approved" && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                          <Heart className="w-3 h-3 text-accent-foreground fill-current" />
                        </div>
                      )}
                    </div>
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
                          <Eye className="w-3.5 h-3.5 mr-1" /> Manage
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
