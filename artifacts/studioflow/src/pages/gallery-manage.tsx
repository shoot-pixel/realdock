import { useState } from "react";
import { useRoute } from "wouter";
import Layout from "@/components/Layout";
import { useGetGallery, useListMedia, useUpdateGallery, getGetGalleryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Copy, Images, Lock, Link2, Globe, Check } from "lucide-react";

type Visibility = "private" | "link_only" | "public";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    value: "private",
    label: "Private",
    description: "Only you can view this gallery",
    icon: Lock,
  },
  {
    value: "link_only",
    label: "Link Only",
    description: "Anyone with the link can view",
    icon: Link2,
  },
  {
    value: "public",
    label: "Public",
    description: "Discoverable by anyone",
    icon: Globe,
  },
];

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

  const handleCopyLink = () => {
    const url = `${window.location.origin}/gallery/${gallery?.shareToken}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const handleVisibilityChange = (v: Visibility) => {
    if (!gallery) return;
    updateGallery.mutate(
      { id: galleryId, data: { visibility: v, isPublic: v !== "private" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGalleryQueryKey(galleryId) });
          toast({ title: `Gallery set to ${v === "link_only" ? "link only" : v}` });
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <Layout breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "Gallery" }]}>
        <div className="p-6">
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
        { label: gallery.name }
      ]}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{gallery.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={gallery.isPublic ? "default" : "secondary"}>
                {gallery.isPublic ? "Live" : "Draft"}
              </Badge>
              <span className="text-sm text-muted-foreground">{gallery.viewCount} views · {gallery.downloadCount} downloads</span>
            </div>
          </div>
          <div className="flex gap-2">
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

        {/* Visibility Control */}
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
                    onClick={() => handleVisibilityChange(opt.value)}
                    data-testid={`visibility-${opt.value}`}
                    className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/8"
                        : "border-border hover:border-muted-foreground/40 bg-card"
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

            {currentVisibility === "private" && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This gallery is private. Only you can access it. Switch to <strong>Link Only</strong> or <strong>Public</strong> to share it with your client.
                </p>
              </div>
            )}

            {currentVisibility === "link_only" && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-2">Share this link with your client:</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/gallery/${gallery.shareToken}`}
                    className="font-mono text-xs"
                    data-testid="input-gallery-share-link"
                  />
                  <Button variant="outline" onClick={handleCopyLink} size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gallery settings */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Allow Downloads", value: gallery.allowDownload ? "Enabled" : "Disabled" },
            { label: "Allow Favorites", value: gallery.allowFavorites ? "Enabled" : "Disabled" },
            { label: "Allow Comments", value: gallery.allowComments ? "Enabled" : "Disabled" },
          ].map(d => (
            <Card key={d.label}>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-foreground">{d.value}</p>
                <p className="text-xs text-muted-foreground">{d.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Client message */}
        {gallery.clientMessage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Client Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{gallery.clientMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-2xl font-bold">{gallery.viewCount}</p>
                <p className="text-xs text-muted-foreground">Total views</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{gallery.downloadCount}</p>
                <p className="text-xs text-muted-foreground">Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project media */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Project Media ({allMedia?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {allMedia && allMedia.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {allMedia.map(m => (
                  <div key={m.id} className="relative aspect-square bg-muted rounded-lg overflow-hidden" data-testid={`project-media-${m.id}`}>
                    <img src={m.thumbnailUrl ?? m.originalUrl} alt={m.filename} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Images className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No media in this project yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
