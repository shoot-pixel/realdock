import { useState } from "react";
import { useRoute } from "wouter";
import {
  useGetPublicGallery,
  useToggleFavorite,
  useCreateComment,
  useGenerateListingPreview,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Camera, Heart, Download, MessageSquare, X, ChevronLeft, ChevronRight,
  Send, Sun, Moon, Sparkles, MapPin, Home, DollarSign, CheckCircle2,
  ExternalLink, Loader2, ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLATFORM_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  "Zillow":       { bg: "bg-[#006AFF]", text: "text-white", accent: "#006AFF" },
  "Redfin":       { bg: "bg-[#CC0000]", text: "text-white", accent: "#CC0000" },
  "Realtor.com":  { bg: "bg-[#D92228]", text: "text-white", accent: "#D92228" },
  "Compass":      { bg: "bg-black",     text: "text-white", accent: "#000000" },
};

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
  const [listingPreviewOpen, setListingPreviewOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState(0);

  const { data: gallery, isLoading } = useGetPublicGallery(token);
  const toggleFavorite = useToggleFavorite();
  const createComment = useCreateComment();
  const generateListing = useGenerateListingPreview();

  const listing = generateListing.data;

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

  const handleOpenListingPreview = () => {
    setListingPreviewOpen(true);
    if (!listing && !generateListing.isPending) {
      generateListing.mutate({ token });
    }
  };

  const lightboxMedia = lightboxIndex !== null ? media[lightboxIndex] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Camera className="w-7 h-7 text-primary" />
          </div>
          <Skeleton className="w-48 h-5 mx-auto" />
          <Skeleton className="w-32 h-3.5 mx-auto" />
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
            <Camera className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Gallery Not Available</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This gallery link may be private, expired, or no longer available. Contact the photographer for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="gallery-portal">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{gallery.galleryName}</p>
              <p className="text-xs text-muted-foreground">{media.length} {media.length === 1 ? "photo" : "photos"} · by {gallery.photographerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {favorites.size > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
                <Heart className="w-3 h-3 text-red-500 fill-current" />
                <span className="text-xs font-medium text-red-600 dark:text-red-400">{favorites.size}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={handleOpenListingPreview}
              data-testid="button-listing-preview"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Listing Preview</span>
              <span className="sm:hidden">Preview</span>
            </Button>
            <button
              onClick={toggleDark}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              data-testid="button-toggle-theme"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Hero message */}
      {gallery.clientMessage && (
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 pb-2">
          <div className="bg-primary/6 border border-primary/15 rounded-2xl px-6 py-5">
            <p className="text-sm text-foreground leading-relaxed">{gallery.clientMessage}</p>
          </div>
        </div>
      )}

      {/* Photo grid */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 pb-16">
        {media.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Camera className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">No photos in this gallery yet.</p>
          </div>
        ) : (
          <>
            {/* Masonry-style grid */}
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
              {media.map((m, idx) => (
                <div
                  key={m.id}
                  className="group relative bg-muted rounded-2xl overflow-hidden cursor-pointer break-inside-avoid"
                  data-testid={`gallery-photo-${m.id}`}
                >
                  <img
                    src={m.thumbnailUrl ?? m.originalUrl}
                    alt={m.filename}
                    onClick={() => setLightboxIndex(idx)}
                    className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                    loading="lazy"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex justify-end gap-1.5">
                      {gallery.allowFavorites && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFavorite(m.id); }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                            favorites.has(m.id)
                              ? "bg-red-500 text-white scale-110"
                              : "bg-white/20 backdrop-blur-sm text-white hover:bg-red-500"
                          }`}
                          data-testid={`button-favorite-${m.id}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${favorites.has(m.id) ? "fill-current" : ""}`} />
                        </button>
                      )}
                      {gallery.allowComments && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCommentMediaId(m.id); setCommentDialogOpen(true); }}
                          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 flex items-center justify-center transition-colors"
                          data-testid={`button-comment-${m.id}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {gallery.allowDownload && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(m.originalUrl, m.filename); }}
                          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 flex items-center justify-center transition-colors"
                          data-testid={`button-download-${m.id}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {favorites.has(m.id) && (
                    <div className="absolute top-2.5 right-2.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                      <Heart className="w-3 h-3 text-white fill-current" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer bar */}
            <div className="mt-10 flex items-center justify-between text-xs text-muted-foreground">
              <span>Delivered by <strong className="text-foreground">StudioFlow</strong></span>
              <span>{media.length} photos · {gallery.photographerName}</span>
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxMedia && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
          data-testid="lightbox"
        >
          <button
            className="absolute top-5 right-5 text-white/60 hover:text-white w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-5 h-5" />
          </button>

          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white/60 hover:text-white w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? i - 1 : 0); }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {lightboxIndex < media.length - 1 && (
            <button
              className="absolute right-4 text-white/60 hover:text-white w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? i + 1 : 0); }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <img
            src={lightboxMedia.originalUrl}
            alt={lightboxMedia.filename}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
            <span className="text-white/50 text-xs tabular-nums">{lightboxIndex + 1} / {media.length}</span>
            {gallery.allowFavorites && (
              <button
                onClick={(e) => { e.stopPropagation(); handleFavorite(lightboxMedia.id); }}
                className={`h-8 px-3 rounded-full text-xs flex items-center gap-1.5 transition-all ${favorites.has(lightboxMedia.id) ? "bg-red-500 text-white" : "bg-white/15 text-white hover:bg-white/25"}`}
              >
                <Heart className={`w-3.5 h-3.5 ${favorites.has(lightboxMedia.id) ? "fill-current" : ""}`} />
                Favorite
              </button>
            )}
            {gallery.allowDownload && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(lightboxMedia.originalUrl, lightboxMedia.filename); }}
                className="h-8 px-3 rounded-full bg-white/15 text-white hover:bg-white/25 text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            )}
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

      {/* Listing Preview Modal */}
      <Dialog open={listingPreviewOpen} onOpenChange={setListingPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Listing Preview</h2>
                <p className="text-xs text-muted-foreground">AI-generated real estate listing</p>
              </div>
            </div>
            <button
              onClick={() => setListingPreviewOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6" data-testid="listing-preview-content">
            {generateListing.isPending && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Generating your listing...</p>
                  <p className="text-sm text-muted-foreground mt-1">Our AI is crafting a compelling real estate description</p>
                </div>
              </div>
            )}

            {!generateListing.isPending && !listing && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Couldn't generate listing</p>
                  <p className="text-sm text-muted-foreground mt-1">Please try again</p>
                </div>
                <Button size="sm" onClick={() => generateListing.mutate({ token })}>
                  Try Again
                </Button>
              </div>
            )}

            {listing && (
              <div className="space-y-6">
                {/* Property header */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-bold text-foreground leading-tight">{listing.headline}</h3>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-primary">{listing.suggestedPrice}</p>
                      <p className="text-xs text-muted-foreground">Est. price</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{listing.address}</span>
                  </div>
                </div>

                {/* Photo strip */}
                {listing.photoUrls && listing.photoUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden">
                    {listing.photoUrls.slice(0, 3).map((url, i) => (
                      <div key={i} className={`aspect-[4/3] bg-muted overflow-hidden ${i === 0 ? "col-span-2 row-span-1" : ""}`}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">About this property</h4>
                  <p className="text-sm leading-relaxed text-foreground">{listing.description}</p>
                </div>

                {/* Highlights */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Property Highlights</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {listing.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground leading-snug">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Platform previews */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">How it looks on listing sites</h4>

                  {/* Platform tabs */}
                  <div className="flex gap-1.5 mb-4 flex-wrap">
                    {listing.platforms.map((p, i) => {
                      const colors = PLATFORM_COLORS[p.name] ?? { bg: "bg-gray-700", text: "text-white", accent: "#555" };
                      return (
                        <button
                          key={p.name}
                          onClick={() => setActivePlatform(i)}
                          data-testid={`platform-tab-${p.name.toLowerCase().replace(/\W/g, "-")}`}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            activePlatform === i
                              ? `${colors.bg} ${colors.text} shadow-md`
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active platform card */}
                  {listing.platforms[activePlatform] && (() => {
                    const platform = listing.platforms[activePlatform]!;
                    const colors = PLATFORM_COLORS[platform.name] ?? { bg: "bg-gray-700", text: "text-white", accent: "#555" };
                    return (
                      <div className="rounded-2xl border border-border overflow-hidden shadow-sm" data-testid="platform-listing-card">
                        {/* Platform chrome */}
                        <div className={`${colors.bg} ${colors.text} px-4 py-2.5 flex items-center justify-between`}>
                          <div>
                            <p className="text-sm font-bold">{platform.name}</p>
                            <p className="text-xs opacity-75">{platform.tagline}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 opacity-60" />
                        </div>

                        {/* Listing content */}
                        <div className="bg-white dark:bg-zinc-900">
                          {/* Hero image */}
                          {listing.photoUrls[0] && (
                            <div className="aspect-[16/9] overflow-hidden bg-muted relative">
                              <img src={listing.photoUrls[0]} alt="" className="w-full h-full object-cover" />
                              <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                                {listing.photoUrls.length} photos
                              </div>
                            </div>
                          )}

                          <div className="p-5">
                            {/* Price + address */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{listing.suggestedPrice}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{listing.address}</p>
                              </div>
                            </div>

                            {/* Stats row */}
                            <div className="flex gap-4 py-3 border-y border-gray-100 dark:border-zinc-800 mb-4">
                              <div className="text-center">
                                <p className="text-base font-bold text-gray-900 dark:text-white">{listing.bedrooms ?? "—"}</p>
                                <p className="text-xs text-gray-400">beds</p>
                              </div>
                              <div className="text-center">
                                <p className="text-base font-bold text-gray-900 dark:text-white">{listing.bathrooms ?? "—"}</p>
                                <p className="text-xs text-gray-400">baths</p>
                              </div>
                              <div className="text-center">
                                <p className="text-base font-bold text-gray-900 dark:text-white">{listing.squareFeet ? listing.squareFeet.toLocaleString() : "—"}</p>
                                <p className="text-xs text-gray-400">sqft</p>
                              </div>
                              <div className="text-center">
                                <p className="text-base font-bold text-gray-900 dark:text-white">{listing.photoUrls.length}</p>
                                <p className="text-xs text-gray-400">photos</p>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-4">
                              {listing.description}
                            </p>

                            {/* Highlights */}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {listing.highlights.slice(0, 4).map((h, i) => (
                                <span key={i} className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full">
                                  {h.split(" ").slice(0, 4).join(" ")}...
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  Generated by StudioFlow AI · {new Date(listing.generatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
