import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import Layout from "@/components/Layout";
import {
  useGetProject, useListMedia, useListGalleries, useCreateGallery,
  useCreateAiJob, useGetProjectStats, getListGalleriesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ImageIcon, Zap, Share2, Plus, ExternalLink, Eye, Heart,
  Download, Loader2
} from "lucide-react";
import { useLocation as useWLocation } from "wouter";

const AI_JOB_TYPES = [
  { value: "sky_replacement", label: "Sky Replacement", credits: 2 },
  { value: "virtual_staging", label: "Virtual Staging", credits: 5 },
  { value: "declutter", label: "Declutter Room", credits: 3 },
  { value: "day_to_dusk", label: "Day to Dusk", credits: 3 },
  { value: "object_removal", label: "Object Removal", credits: 2 },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/15 text-primary",
  delivered: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  archived: "bg-muted/50 text-muted-foreground",
};

export default function ProjectDetailPage() {
  const [, params] = useRoute("/projects/:id");
  const projectId = parseInt(params?.id ?? "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<number | null>(null);
  const [selectedJobType, setSelectedJobType] = useState("sky_replacement");

  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: media, isLoading: mediaLoading } = useListMedia(projectId);
  const { data: galleries } = useListGalleries(projectId);
  const { data: stats } = useGetProjectStats(projectId);
  const createGallery = useCreateGallery();
  const createAiJob = useCreateAiJob();

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

  const handleRunAiJob = () => {
    if (!selectedMedia) {
      toast({ title: "Select a photo first", variant: "destructive" });
      return;
    }
    createAiJob.mutate({
      mediaId: selectedMedia,
      data: { jobType: selectedJobType as "sky_replacement" | "virtual_staging" | "declutter" | "day_to_dusk" | "hdr_enhancement" | "object_removal" | "color_grading" | "furniture_replacement" }
    }, {
      onSuccess: () => {
        setAiDialogOpen(false);
        toast({ title: "AI job queued", description: "Processing will begin shortly" });
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

  const photoMedia = media?.filter(m => m.mediaType === "photo") ?? [];

  return (
    <Layout
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: project.name }
      ]}
    >
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
                <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary" data-testid="button-ai-tools">
                      <Zap className="w-4 h-4 mr-1.5" /> AI Tools
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Run AI Enhancement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <Label>Select Photo</Label>
                        <Select value={selectedMedia?.toString() ?? ""} onValueChange={v => setSelectedMedia(parseInt(v))}>
                          <SelectTrigger className="mt-1.5" data-testid="select-ai-media">
                            <SelectValue placeholder="Choose a photo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {photoMedia.map(m => (
                              <SelectItem key={m.id} value={m.id.toString()}>{m.filename}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Enhancement Type</Label>
                        <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                          <SelectTrigger className="mt-1.5" data-testid="select-ai-job-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_JOB_TYPES.map(j => (
                              <SelectItem key={j.value} value={j.value}>
                                {j.label} — {j.credits} credits
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedMedia && (
                        <div className="rounded-lg overflow-hidden bg-muted h-32">
                          <img
                            src={photoMedia.find(m => m.id === selectedMedia)?.originalUrl ?? ""}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button onClick={handleRunAiJob} disabled={createAiJob.isPending} data-testid="button-run-ai-job">
                        {createAiJob.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : "Run Enhancement"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

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
            { label: "Photos", value: stats?.photos ?? photoMedia.length },
            { label: "Videos", value: stats?.videos ?? 0 },
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

          <TabsContent value="media" className="mt-4">
            {mediaLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
              </div>
            ) : (media?.length ?? 0) === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                <ImageIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">No media uploaded yet</p>
                <p className="text-xs text-muted-foreground/60">Upload photos and videos to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {media?.map(m => (
                  <div key={m.id} className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer" data-testid={`media-item-${m.id}`}>
                    <img
                      src={m.thumbnailUrl ?? m.originalUrl}
                      alt={m.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-center p-2">
                        <p className="text-xs font-medium truncate max-w-full">{m.filename}</p>
                      </div>
                    </div>
                    {m.status === "approved" && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                        <Heart className="w-3 h-3 text-accent-foreground fill-current" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
