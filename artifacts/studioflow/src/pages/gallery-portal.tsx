import { useState, useEffect } from "react";
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

interface ThemeVars {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  popover: string;
  popoverForeground: string;
  secondary: string;
  secondaryForeground: string;
  isDark: boolean;
}

const THEME_VARS: Record<string, ThemeVars> = {
  "classic": {
    background: "36 18% 96%",
    foreground: "225 18% 12%",
    card: "0 0% 100%",
    cardForeground: "225 18% 12%",
    primary: "39 52% 55%",
    primaryForeground: "225 18% 10%",
    muted: "30 14% 92%",
    mutedForeground: "225 8% 48%",
    border: "30 14% 88%",
    input: "30 14% 85%",
    ring: "39 52% 55%",
    popover: "0 0% 100%",
    popoverForeground: "225 18% 12%",
    secondary: "36 15% 90%",
    secondaryForeground: "225 14% 25%",
    isDark: false,
  },
  "studio-dark": {
    background: "225 14% 8%",
    foreground: "40 8% 89%",
    card: "225 12% 11%",
    cardForeground: "40 8% 89%",
    primary: "39 52% 61%",
    primaryForeground: "225 14% 8%",
    muted: "225 10% 14%",
    mutedForeground: "225 5% 44%",
    border: "225 10% 15%",
    input: "225 10% 18%",
    ring: "39 52% 61%",
    popover: "225 13% 10%",
    popoverForeground: "40 8% 89%",
    secondary: "225 10% 16%",
    secondaryForeground: "40 6% 82%",
    isDark: true,
  },
  "warm-ivory": {
    background: "37 35% 95%",
    foreground: "30 30% 12%",
    card: "38 30% 99%",
    cardForeground: "30 30% 12%",
    primary: "28 50% 44%",
    primaryForeground: "38 30% 99%",
    muted: "37 20% 89%",
    mutedForeground: "30 18% 44%",
    border: "35 16% 83%",
    input: "35 16% 80%",
    ring: "28 50% 44%",
    popover: "38 30% 99%",
    popoverForeground: "30 30% 12%",
    secondary: "37 22% 90%",
    secondaryForeground: "30 20% 25%",
    isDark: false,
  },
  "midnight": {
    background: "0 0% 4%",
    foreground: "0 0% 94%",
    card: "0 0% 7%",
    cardForeground: "0 0% 94%",
    primary: "230 70% 68%",
    primaryForeground: "0 0% 4%",
    muted: "0 0% 11%",
    mutedForeground: "0 0% 50%",
    border: "0 0% 14%",
    input: "0 0% 16%",
    ring: "230 70% 68%",
    popover: "0 0% 6%",
    popoverForeground: "0 0% 94%",
    secondary: "0 0% 12%",
    secondaryForeground: "0 0% 80%",
    isDark: true,
  },
  "forest": {
    background: "140 28% 8%",
    foreground: "120 10% 90%",
    card: "140 26% 11%",
    cardForeground: "120 10% 90%",
    primary: "130 42% 52%",
    primaryForeground: "140 28% 8%",
    muted: "140 18% 14%",
    mutedForeground: "130 8% 50%",
    border: "140 18% 17%",
    input: "140 18% 18%",
    ring: "130 42% 52%",
    popover: "140 26% 10%",
    popoverForeground: "120 10% 90%",
    secondary: "140 18% 15%",
    secondaryForeground: "120 8% 75%",
    isDark: true,
  },
  "slate": {
    background: "220 18% 10%",
    foreground: "215 15% 88%",
    card: "220 16% 13%",
    cardForeground: "215 15% 88%",
    primary: "210 62% 58%",
    primaryForeground: "220 18% 10%",
    muted: "220 12% 16%",
    mutedForeground: "220 8% 48%",
    border: "220 14% 19%",
    input: "220 14% 20%",
    ring: "210 62% 58%",
    popover: "220 16% 12%",
    popoverForeground: "215 15% 88%",
    secondary: "220 12% 17%",
    secondaryForeground: "215 10% 72%",
    isDark: true,
  },
};

function buildThemeStyles(themeId: string): string {
  const vars = THEME_VARS[themeId] ?? THEME_VARS["studio-dark"]!;
  return `
    html {
      --background: ${vars.background} !important;
      --foreground: ${vars.foreground} !important;
      --card: ${vars.card} !important;
      --card-foreground: ${vars.cardForeground} !important;
      --primary: ${vars.primary} !important;
      --primary-foreground: ${vars.primaryForeground} !important;
      --muted: ${vars.muted} !important;
      --muted-foreground: ${vars.mutedForeground} !important;
      --border: ${vars.border} !important;
      --input: ${vars.input} !important;
      --ring: ${vars.ring} !important;
      --popover: ${vars.popover} !important;
      --popover-foreground: ${vars.popoverForeground} !important;
      --secondary: ${vars.secondary} !important;
      --secondary-foreground: ${vars.secondaryForeground} !important;
      --accent: ${vars.primary} !important;
      --accent-foreground: ${vars.primaryForeground} !important;
    }
  `;
}

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
  const [themeApplied, setThemeApplied] = useState(false);

  const { data: gallery, isLoading } = useGetPublicGallery(token);
  const toggleFavorite = useToggleFavorite();
  const createComment = useCreateComment();
  const generateListing = useGenerateListingPreview();

  const listing = generateListing.data;

  useEffect(() => {
    if (!gallery) return;

    const themeId = gallery.theme ?? "studio-dark";
    const vars = THEME_VARS[themeId] ?? THEME_VARS["studio-dark"]!;

    if (vars.isDark) {
      document.documentElement.classList.add("dark");
      setDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setDark(false);
    }

    const styleEl = document.createElement("style");
    styleEl.id = "gallery-portal-theme";
    styleEl.textContent = buildThemeStyles(themeId);

    const existingStyle = document.getElementById("gallery-portal-theme");
    if (existingStyle) existingStyle.remove();
    document.head.appendChild(styleEl);

    let customStyleEl: HTMLStyleElement | null = null;
    if (gallery.customCss) {
      customStyleEl = document.createElement("style");
      customStyleEl.id = "gallery-portal-custom-css";
      customStyleEl.textContent = gallery.customCss;
      const existingCustom = document.getElementById("gallery-portal-custom-css");
      if (existingCustom) existingCustom.remove();
      document.head.appendChild(customStyleEl);
    }

    setThemeApplied(true);

    return () => {
      document.getElementById("gallery-portal-theme")?.remove();
      document.getElementById("gallery-portal-custom-css")?.remove();
      document.documentElement.classList.add("dark");
    };
  }, [gallery?.theme, gallery?.customCss]);

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
    <div className="min-h-screen bg-background gallery-portal" data-testid="gallery-portal" data-theme={gallery.theme ?? "studio-dark"}>
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
              title={dark ? "Switch to light" : "Switch to dark"}
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
                          <span className="text-sm font-bold">{platform.name}</span>
                          <span className="text-xs opacity-75">{platform.tagline}</span>
                        </div>
                        {/* Listing content */}
                        <div className="bg-white p-4">
                          {listing.photoUrls?.[0] && (
                            <div className="aspect-[16/9] rounded-xl overflow-hidden mb-3 bg-gray-100">
                              <img src={listing.photoUrls[0]} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <p className="text-gray-900 font-bold text-lg">{listing.suggestedPrice}</p>
                          <p className="text-gray-700 font-medium text-sm mt-0.5">{listing.headline}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <p className="text-gray-500 text-xs">{listing.address}</p>
                          </div>
                          <p className="text-gray-600 text-xs mt-2 leading-relaxed line-clamp-3">{listing.description}</p>
                          <button
                            className="mt-3 w-full py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: colors.accent }}
                          >
                            View on {platform.name}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* CTA */}
                <div className="border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Ready to list?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Copy this listing to your preferred real estate platform</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${listing.headline}\n\n${listing.description}\n\n${listing.highlights.map(h => `• ${h}`).join("\n")}`);
                      toast({ title: "Listing copied to clipboard" });
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Copy Listing
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
