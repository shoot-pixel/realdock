import { useRoute, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useGetGallery, useListMedia, getGetGalleryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Copy, Images } from "lucide-react";

export default function GalleryManagePage() {
  const [, params] = useRoute("/projects/:projectId/gallery/:galleryId");
  const projectId = parseInt(params?.projectId ?? "0");
  const galleryId = parseInt(params?.galleryId ?? "0");
  const { toast } = useToast();

  const { data: gallery, isLoading } = useGetGallery(galleryId);
  const { data: allMedia } = useListMedia(projectId);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/gallery/${gallery?.shareToken}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
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
            <Button variant="outline" size="sm" onClick={handleCopyLink} data-testid="button-copy-gallery-link">
              <Copy className="w-4 h-4 mr-2" /> Copy Link
            </Button>
            <Button size="sm" onClick={() => window.open(`/gallery/${gallery.shareToken}`, "_blank")} data-testid="button-open-gallery">
              <ExternalLink className="w-4 h-4 mr-2" /> Open Gallery
            </Button>
          </div>
        </div>

        {/* Share link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Share Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/gallery/${gallery.shareToken}`}
                className="font-mono text-xs"
                data-testid="input-gallery-share-link"
              />
              <Button variant="outline" onClick={handleCopyLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gallery details */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Allow Downloads", value: gallery.allowDownload ? "Yes" : "No" },
            { label: "Allow Favorites", value: gallery.allowFavorites ? "Yes" : "No" },
            { label: "Allow Comments", value: gallery.allowComments ? "Yes" : "No" },
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
