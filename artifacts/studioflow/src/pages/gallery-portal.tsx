import { useState } from "react";
import { useRoute } from "wouter";
import { useGetPublicGallery, useToggleFavorite, useCreateComment } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Heart, Download, MessageSquare, X, ChevronLeft, ChevronRight, Send, Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GalleryPortalPage() {
  const [, params] = useRoute("/gallery/:token");
  const token = params?.token ?? "";
  const { toast } = useToast();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentMediaId, setCommentMediaId] = useState<number | null>(null);
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const { data: gallery, isLoading } = useGetPublicGallery(token);
  const toggleFavorite = useToggleFavorite();
  const createComment = useCreateComment();

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark(d => !d);
  };

  const media = gallery?.media ?? [];

  const handleFavorite = (mediaId: number) => {
    const isFav = favorites.has(mediaId);
    if (isFav) {
      setFavorites(prev => { const s = new Set(prev); s.delete(mediaId); return s; });
    } else {
      setFavorites(prev => new Set(prev).add(mediaId));
    }
    toggleFavorite.mutate({
      mediaId,
      data: { galleryToken: token, clientName: "Visitor" }
    }, {
      onError: () => {
        if (isFav) setFavorites(prev => new Set(prev).add(mediaId));
        else setFavorites(prev => { const s = new Set(prev); s.delete(mediaId); return s; });
      },
    });
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Download started" });
  };

  const handleComment = () => {
    if (!commentBody.trim() || !commentName.trim() || !commentMediaId) return;
    createComment.mutate({
      mediaId: commentMediaId,
      data: {
        authorName: commentName,
        authorEmail: commentEmail || null,
        body: commentBody,
        isClientComment: true,
      }
    }, {
      onSuccess: () => {
        setCommentBody("");
        setCommentDialogOpen(false);
        toast({ title: "Comment posted" });
      },
    });
  };

  const lightboxMedia = lightboxIndex !== null ? media[lightboxIndex] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="w-48 h-6 mx-auto" />
          <Skeleton className="w-32 h-4 mx-auto" />
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Gallery Not Found</h1>
          <p className="text-muted-foreground">This gallery link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="gallery-portal">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{gallery.galleryName}</p>
              <p className="text-xs text-muted-foreground">{media.length} photos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {favorites.size} favorited
            </Badge>
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              data-testid="button-toggle-theme"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Gallery message */}
      {gallery.clientMessage && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-primary/8 border border-primary/20 rounded-xl p-5">
            <p className="text-sm text-foreground leading-relaxed">{gallery.clientMessage}</p>
          </div>
        </div>
      )}

      {/* Photo grid */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {media.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Camera className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No photos in this gallery yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {media.map((m, idx) => (
              <div
                key={m.id}
                className="group relative aspect-square bg-muted rounded-xl overflow-hidden cursor-pointer"
                data-testid={`gallery-photo-${m.id}`}
              >
                <img
                  src={m.thumbnailUrl ?? m.originalUrl}
                  alt={m.filename}
                  onClick={() => setLightboxIndex(idx)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1.5">
                  {gallery.allowFavorites && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFavorite(m.id); }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${favorites.has(m.id) ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}
                      data-testid={`button-favorite-${m.id}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${favorites.has(m.id) ? "fill-current" : ""}`} />
                    </button>
                  )}
                  {gallery.allowComments && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCommentMediaId(m.id); setCommentDialogOpen(true); }}
                      className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center"
                      data-testid={`button-comment-${m.id}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {gallery.allowDownload && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(m.originalUrl, m.filename); }}
                      className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center"
                      data-testid={`button-download-${m.id}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {favorites.has(m.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <Heart className="w-3 h-3 text-white fill-current" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxMedia && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
          data-testid="lightbox"
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-5 h-5" />
          </button>

          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? i - 1 : 0); }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {lightboxIndex < media.length - 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? i + 1 : 0); }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <img
            src={lightboxMedia.originalUrl}
            alt={lightboxMedia.filename}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <span className="text-white/60 text-xs">{lightboxIndex + 1} / {media.length}</span>
            <div className="flex gap-1.5">
              {gallery.allowFavorites && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleFavorite(lightboxMedia.id); }}
                  className={`h-8 px-3 rounded-full text-xs flex items-center gap-1.5 transition-colors ${favorites.has(lightboxMedia.id) ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${favorites.has(lightboxMedia.id) ? "fill-current" : ""}`} />
                  Favorite
                </button>
              )}
              {gallery.allowDownload && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(lightboxMedia.originalUrl, lightboxMedia.filename); }}
                  className="h-8 px-3 rounded-full bg-white/20 text-white hover:bg-white/30 text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comment dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Your Name</label>
              <Input value={commentName} onChange={e => setCommentName(e.target.value)} placeholder="Sarah Chen" data-testid="input-comment-name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input type="email" value={commentEmail} onChange={e => setCommentEmail(e.target.value)} placeholder="sarah@example.com" data-testid="input-comment-email" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Comment</label>
              <Textarea value={commentBody} onChange={e => setCommentBody(e.target.value)} placeholder="I love this shot! Can you..." rows={3} data-testid="textarea-comment-body" />
            </div>
          </div>
          <Button
            onClick={handleComment}
            disabled={!commentBody.trim() || !commentName.trim() || createComment.isPending}
            className="w-full"
            data-testid="button-submit-comment"
          >
            <Send className="w-4 h-4 mr-2" />
            Post Comment
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
