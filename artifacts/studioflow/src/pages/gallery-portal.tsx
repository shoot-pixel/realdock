import { useState, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { useGetPublicGallery } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera, Download, X, ChevronLeft, ChevronRight, ImageIcon, CheckCircle2, Loader2,
} from "lucide-react";

// ─── Theme system ─────────────────────────────────────────────────────────────

interface ThemeVars {
  background: string; foreground: string; card: string; cardForeground: string;
  primary: string; primaryForeground: string; muted: string; mutedForeground: string;
  border: string; input: string; ring: string; popover: string; popoverForeground: string;
  secondary: string; secondaryForeground: string; isDark: boolean;
}

const THEME_VARS: Record<string, ThemeVars> = {
  "classic":     { background:"36 18% 96%", foreground:"225 18% 12%", card:"0 0% 100%", cardForeground:"225 18% 12%", primary:"39 52% 55%", primaryForeground:"225 18% 10%", muted:"30 14% 92%", mutedForeground:"225 8% 48%", border:"30 14% 88%", input:"30 14% 85%", ring:"39 52% 55%", popover:"0 0% 100%", popoverForeground:"225 18% 12%", secondary:"36 15% 90%", secondaryForeground:"225 14% 25%", isDark:false },
  "studio-dark": { background:"225 14% 8%", foreground:"40 8% 89%", card:"225 12% 11%", cardForeground:"40 8% 89%", primary:"39 52% 61%", primaryForeground:"225 14% 8%", muted:"225 10% 14%", mutedForeground:"225 5% 44%", border:"225 10% 15%", input:"225 10% 18%", ring:"39 52% 61%", popover:"225 13% 10%", popoverForeground:"40 8% 89%", secondary:"225 10% 16%", secondaryForeground:"40 6% 82%", isDark:true },
  "warm-ivory":  { background:"37 35% 95%", foreground:"30 30% 12%", card:"38 30% 99%", cardForeground:"30 30% 12%", primary:"28 50% 44%", primaryForeground:"38 30% 99%", muted:"37 20% 89%", mutedForeground:"30 18% 44%", border:"35 16% 83%", input:"35 16% 80%", ring:"28 50% 44%", popover:"38 30% 99%", popoverForeground:"30 30% 12%", secondary:"37 22% 90%", secondaryForeground:"30 20% 25%", isDark:false },
  "midnight":    { background:"0 0% 4%", foreground:"0 0% 94%", card:"0 0% 7%", cardForeground:"0 0% 94%", primary:"230 70% 68%", primaryForeground:"0 0% 4%", muted:"0 0% 11%", mutedForeground:"0 0% 50%", border:"0 0% 14%", input:"0 0% 16%", ring:"230 70% 68%", popover:"0 0% 6%", popoverForeground:"0 0% 94%", secondary:"0 0% 12%", secondaryForeground:"0 0% 80%", isDark:true },
  "forest":      { background:"140 28% 8%", foreground:"120 10% 90%", card:"140 26% 11%", cardForeground:"120 10% 90%", primary:"130 42% 52%", primaryForeground:"140 28% 8%", muted:"140 18% 14%", mutedForeground:"130 8% 50%", border:"140 18% 17%", input:"140 18% 18%", ring:"130 42% 52%", popover:"140 26% 10%", popoverForeground:"120 10% 90%", secondary:"140 18% 15%", secondaryForeground:"120 8% 75%", isDark:true },
  "slate":       { background:"220 18% 10%", foreground:"215 15% 88%", card:"220 16% 13%", cardForeground:"215 15% 88%", primary:"210 62% 58%", primaryForeground:"220 18% 10%", muted:"220 12% 16%", mutedForeground:"220 8% 48%", border:"220 14% 19%", input:"220 14% 20%", ring:"210 62% 58%", popover:"220 16% 12%", popoverForeground:"215 15% 88%", secondary:"220 12% 17%", secondaryForeground:"215 10% 72%", isDark:true },
};

function applyTheme(themeId: string): void {
  const vars = THEME_VARS[themeId] ?? THEME_VARS["studio-dark"]!;
  const keys: (keyof Omit<ThemeVars, "isDark">)[] = [
    "background","foreground","card","cardForeground","primary","primaryForeground",
    "muted","mutedForeground","border","input","ring","popover","popoverForeground",
    "secondary","secondaryForeground",
  ];
  const cssVarMap: Record<string, string> = {
    cardForeground: "card-foreground", primaryForeground: "primary-foreground",
    mutedForeground: "muted-foreground", popoverForeground: "popover-foreground",
    secondaryForeground: "secondary-foreground",
  };
  const el = document.documentElement;
  keys.forEach(k => {
    const cssKey = cssVarMap[k] ?? k.replace(/([A-Z])/g, "-$1").toLowerCase();
    el.style.setProperty(`--${cssKey}`, vars[k] as string);
  });
  el.style.setProperty("--accent", vars.primary);
  el.style.setProperty("--accent-foreground", vars.primaryForeground);
  if (vars.isDark) el.classList.add("dark"); else el.classList.remove("dark");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GalleryPortalPage() {
  const [, params] = useRoute("/gallery/:token");
  const token = params?.token ?? "";

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);

  const { data: gallery, isLoading } = useGetPublicGallery(token);

  // Apply theme + custom CSS when gallery loads
  useEffect(() => {
    if (!gallery) return;
    applyTheme(gallery.theme ?? "studio-dark");

    const id = "gallery-portal-custom-css";
    document.getElementById(id)?.remove();
    if (gallery.customCss) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = gallery.customCss;
      document.head.appendChild(el);
    }

    return () => {
      // Restore app theme on unmount
      const el = document.documentElement;
      el.removeAttribute("style");
      el.classList.add("dark");
      document.getElementById(id)?.remove();
    };
  }, [gallery?.theme, gallery?.customCss]);

  const media = gallery?.media ?? [];

  // Navigate lightbox
  const prev = useCallback(() => setLightboxIndex(i => (i !== null && i > 0 ? i - 1 : i)), []);
  const next = useCallback(() => setLightboxIndex(i => (i !== null && i < media.length - 1 ? i + 1 : i)), [media.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, prev, next]);

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = async () => {
    if (downloading || !gallery?.allowDownload) return;
    setDownloading(true);
    setDownloadDone(false);
    for (let i = 0; i < media.length; i++) {
      const m = media[i]!;
      handleDownload(m.originalUrl, m.filename);
      if (i < media.length - 1) await new Promise(r => setTimeout(r, 350));
    }
    setDownloading(false);
    setDownloadDone(true);
    setTimeout(() => setDownloadDone(false), 4000);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Camera className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <Skeleton className="w-48 h-5 mx-auto" />
          <Skeleton className="w-32 h-3.5 mx-auto" />
        </div>
      </div>
    );
  }

  // ── Not found / private ────────────────────────────────────────────────────
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

  const lightboxMedia = lightboxIndex !== null ? media[lightboxIndex] : null;
  const displayName = gallery.companyName || gallery.photographerName;

  return (
    <div className="min-h-screen bg-background gallery-portal" data-testid="gallery-portal">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">

          {/* Branding */}
          <div className="flex items-center gap-3 min-w-0">
            {gallery.brandingLogoUrl ? (
              <img
                src={gallery.brandingLogoUrl}
                alt={displayName}
                className="h-8 w-auto max-w-[120px] object-contain"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate leading-tight">{displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{gallery.galleryName}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {media.length} {media.length === 1 ? "photo" : "photos"}
            </span>
            {gallery.allowDownload && media.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloading}
                data-testid="button-download-all"
                className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : downloadDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {downloading ? "Downloading…" : downloadDone ? "Done!" : "Download All"}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Cover image ─────────────────────────────────────────────────────── */}
      {gallery.coverImageUrl && (
        <div className="relative h-64 sm:h-80 overflow-hidden">
          <img
            src={gallery.coverImageUrl}
            alt={gallery.galleryName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-5 sm:px-8 pb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-md">{gallery.galleryName}</h1>
            {gallery.projectAddress && (
              <p className="text-sm text-white/70 mt-1">{gallery.projectAddress}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Client message ──────────────────────────────────────────────────── */}
      {gallery.clientMessage && (
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-6 pb-2">
          <div className="bg-primary/6 border border-primary/15 rounded-2xl px-6 py-4">
            <p className="text-sm text-foreground leading-relaxed">{gallery.clientMessage}</p>
          </div>
        </div>
      )}

      {/* ── Gallery title (no cover image) ──────────────────────────────────── */}
      {!gallery.coverImageUrl && (
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-8 pb-2">
          <h1 className="text-2xl font-bold text-foreground">{gallery.galleryName}</h1>
          {gallery.projectAddress && (
            <p className="text-sm text-muted-foreground mt-1">{gallery.projectAddress}</p>
          )}
        </div>
      )}

      {/* ── Photo grid ──────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-6 pb-20">
        {media.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm">No photos in this gallery yet.</p>
          </div>
        ) : (
          <>
            {/* Masonry grid */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3">
              {media.map((m, idx) => (
                <div
                  key={m.id}
                  className="group relative bg-muted rounded-2xl overflow-hidden break-inside-avoid"
                  data-testid={`gallery-photo-${m.id}`}
                >
                  <img
                    src={m.thumbnailUrl ?? m.originalUrl}
                    alt={m.filename}
                    onClick={() => setLightboxIndex(idx)}
                    className="w-full object-cover cursor-pointer group-hover:scale-[1.015] transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  {/* Download button */}
                  {gallery.allowDownload && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDownload(m.originalUrl, m.filename); }}
                      data-testid={`button-download-${m.id}`}
                      className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary hover:border-primary hover:scale-110"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}

                  {/* Photo number badge */}
                  <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-[10px] text-white/80 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full tabular-nums">
                      {idx + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {gallery.brandingLogoUrl ? (
                  <img src={gallery.brandingLogoUrl} alt={displayName} className="h-5 w-auto object-contain" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-primary" />
                )}
                <span><strong className="text-foreground">{displayName}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <span>{media.length} {media.length === 1 ? "photo" : "photos"}</span>
                {gallery.allowDownload && (
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloading}
                    className="flex items-center gap-1.5 text-primary hover:underline underline-offset-2 disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" />
                    Download all
                  </button>
                )}
                <span className="text-muted-foreground/50">·</span>
                <span>Powered by <strong className="text-foreground">StudioFlow</strong></span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
      {lightboxMedia && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/96 backdrop-blur-sm flex items-center justify-center"
          data-testid="lightbox"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
              onClick={e => { e.stopPropagation(); prev(); }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Next */}
          {lightboxIndex < media.length - 1 && (
            <button
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
              onClick={e => { e.stopPropagation(); next(); }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Image */}
          <img
            src={lightboxMedia.originalUrl}
            alt={lightboxMedia.filename}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />

          {/* Bottom bar */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
            <span className="text-white/50 text-xs tabular-nums">
              {lightboxIndex + 1} / {media.length}
            </span>
            {gallery.allowDownload && (
              <button
                onClick={e => { e.stopPropagation(); handleDownload(lightboxMedia.originalUrl, lightboxMedia.filename); }}
                className="h-8 px-4 rounded-full bg-white/15 text-white hover:bg-primary hover:text-primary-foreground text-xs flex items-center gap-1.5 transition-colors backdrop-blur-sm"
                data-testid="button-lightbox-download"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
