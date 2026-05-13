import { useState, useEffect, useRef, useCallback } from "react";
import { X, Download, Loader2, Share2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialPostData {
  tagline: string;
  address: string;
  projectName: string;
  coverImageUrl: string | null;
  clientName: string | null;
}

interface SocialPostModalProps {
  token: string;
  onClose: () => void;
}

const W = 1080;
const H = 1920;
const GOLD = "#C9A96E";
const PAD = 96;

// Wrap text to fit maxWidth — returns array of lines
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawPost(canvas: HTMLCanvasElement, img: HTMLImageElement | null, data: SocialPostData) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // ── Background ───────────────────────────────────────────────────────────
  ctx.fillStyle = "#0a0b0e";
  ctx.fillRect(0, 0, W, H);

  // Cover photo — center-crop to fill 9:16
  if (img && img.naturalWidth > 0) {
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = W / H;
    let dw: number, dh: number, dx: number, dy: number;
    if (imgAspect > canvasAspect) {
      dh = H; dw = dh * imgAspect; dx = (W - dw) / 2; dy = 0;
    } else {
      dw = W; dh = dw / imgAspect; dx = 0; dy = (H - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // ── Gradient overlays ────────────────────────────────────────────────────
  // Top — heavy at very top, fades to transparent
  const topGrad = ctx.createLinearGradient(0, 0, 0, 700);
  topGrad.addColorStop(0,   "rgba(0,0,0,0.92)");
  topGrad.addColorStop(0.5, "rgba(0,0,0,0.55)");
  topGrad.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 700);

  // Bottom — builds up from transparent to nearly opaque
  const botGrad = ctx.createLinearGradient(0, 1080, 0, H);
  botGrad.addColorStop(0,    "rgba(0,0,0,0)");
  botGrad.addColorStop(0.30, "rgba(0,0,0,0.65)");
  botGrad.addColorStop(0.70, "rgba(0,0,0,0.85)");
  botGrad.addColorStop(1,    "rgba(0,0,0,0.96)");
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, 1080, W, H - 1080);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // ── Gold rule helper ─────────────────────────────────────────────────────
  const rule = (y: number, alpha = 0.70, xPad = PAD) => {
    ctx.save();
    ctx.strokeStyle = `rgba(201,169,110,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xPad, y);
    ctx.lineTo(W - xPad, y);
    ctx.stroke();
    ctx.restore();
  };

  // ── TOP BLOCK — "COMING / SOON" ──────────────────────────────────────────
  // Block is centered in the dark top zone (0–660px).
  // Font cap-height ≈ 76px at 104px; line pitch = 130px.
  // Visual block: top_rule → 60px gap → COMING cap → 130px → SOON cap → 60px → bot_rule
  // Total visual ≈ 60+76+130+76+60 = 402px → start at (660-402)/2 ≈ 130
  const topRuleY  = 158;
  const comingY   = 310;   // baseline; visual top ≈ 310-76 = 234 (74px below rule)
  const soonY     = 440;   // baseline; visual bottom ≈ 440
  const botRuleY  = 512;   // 72px below SOON baseline

  rule(topRuleY);
  rule(botRuleY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 104px 'Playfair Display', Georgia, serif`;
  ctx.fillText("COMING", W / 2, comingY);
  ctx.fillText("SOON",   W / 2, soonY);

  // ── BOTTOM BLOCK ─────────────────────────────────────────────────────────
  const maxW = W - PAD * 2;

  // Address
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `400 56px 'Playfair Display', Georgia, serif`;
  const addrLines = wrapText(ctx, data.address, maxW);
  const addrLineH = 74;
  // Pin the last address line to y=1500 so content anchors to the bottom area
  const addrStartY = 1480 - (addrLines.length - 1) * addrLineH;
  for (let i = 0; i < addrLines.length; i++) {
    ctx.fillText(addrLines[i], W / 2, addrStartY + i * addrLineH);
  }

  // Short gold rule between address and tagline
  const midRuleY = addrStartY + addrLines.length * addrLineH + 44;
  rule(midRuleY, 0.35, PAD + 180);

  // Tagline (italic gold)
  ctx.fillStyle = GOLD;
  ctx.font = `italic 38px 'Playfair Display', Georgia, serif`;
  const tagLines = wrapText(ctx, data.tagline, maxW - 80);
  const tagLineH = 56;
  const tagStartY = midRuleY + 56;
  for (let i = 0; i < tagLines.length; i++) {
    ctx.fillText(tagLines[i], W / 2, tagStartY + i * tagLineH);
  }

  // "Presented by [Client Name]"
  if (data.clientName) {
    const presY = tagStartY + tagLines.length * tagLineH + 72;
    ctx.fillStyle = "rgba(255,255,255,0.40)";
    ctx.font = `400 28px 'Playfair Display', Georgia, serif`;
    ctx.fillText(`Presented by ${data.clientName}`, W / 2, presY);
  }
}

// ─── Modal component ──────────────────────────────────────────────────────────

export default function SocialPostModal({ token, onClose }: SocialPostModalProps) {
  const [baseData, setBaseData]       = useState<Omit<SocialPostData, "tagline"> | null>(null);
  const [taglines, setTaglines]       = useState<string[]>([]);
  const [activeIdx, setActiveIdx]     = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [regenerating, setRegenerating]     = useState(false);
  const [error, setError]             = useState(false);
  const [rendered, setRendered]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentData: SocialPostData | null =
    baseData && taglines.length > 0
      ? { ...baseData, tagline: taglines[activeIdx] }
      : null;

  // ── Fetch a new variant from the API ─────────────────────────────────────
  const fetchVariant = useCallback((): Promise<SocialPostData> =>
    fetch(`/api/gallery/${token}/social-post`, { method: "POST" })
      .then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<SocialPostData>; }),
    [token]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    setInitialLoading(true);
    setError(false);
    fetchVariant()
      .then(d => {
        const { tagline, ...rest } = d;
        setBaseData(rest);
        setTaglines([tagline]);
        setActiveIdx(0);
      })
      .catch(() => setError(true))
      .finally(() => setInitialLoading(false));
  }, [fetchVariant]);

  // ── Regenerate — adds a new tagline variant ───────────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (regenerating) return;
    setRegenerating(true);
    try {
      const d = await fetchVariant();
      setTaglines(prev => {
        const next = [...prev, d.tagline];
        setActiveIdx(next.length - 1);
        return next;
      });
    } catch {
      // silently ignore — existing variants still usable
    } finally {
      setRegenerating(false);
    }
  }, [regenerating, fetchVariant]);

  // ── Canvas render ─────────────────────────────────────────────────────────
  const render = useCallback(async (data: SocialPostData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendered(false);

    await document.fonts.ready;

    if (!data.coverImageUrl) {
      drawPost(canvas, null, data);
      setRendered(true);
      return;
    }

    const loadImg = (src: string, crossOrigin?: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        if (crossOrigin) img.crossOrigin = crossOrigin;
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    try {
      const img = await loadImg(data.coverImageUrl, "anonymous");
      drawPost(canvas, img, data);
    } catch {
      try {
        const img = await loadImg(data.coverImageUrl);
        drawPost(canvas, img, data);
      } catch {
        drawPost(canvas, null, data);
      }
    }
    setRendered(true);
  }, []);

  useEffect(() => {
    if (currentData) render(currentData);
  }, [currentData, render]);

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rendered) return;
    setDownloading(true);
    try {
      canvas.toBlob(blob => {
        if (!blob) { setDownloading(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `social-post-${(baseData?.address ?? "property").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloading(false);
      }, "image/png");
    } catch {
      const dataUrl = canvas.toDataURL("image/png");
      window.open(dataUrl, "_blank");
      setDownloading(false);
    }
  }, [rendered, baseData]);

  const canGoBack = activeIdx > 0;
  const canGoNext = activeIdx < taglines.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-[hsl(225_14%_8%)] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[95vh]">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(39_52%_61%/0.12)] flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4 text-[hsl(39_52%_61%)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">Social Post</p>
              <p className="text-[11px] text-white/40 mt-0.5">9:16 · Instagram Story / Reels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Preview area ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-3 flex flex-col items-center gap-3 min-h-0">
          {initialLoading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-12 h-12 rounded-2xl bg-[hsl(39_52%_61%/0.10)] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[hsl(39_52%_61%)] animate-spin" />
              </div>
              <p className="text-sm text-white/50">Generating your post…</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-sm text-white/40 mb-4">Failed to generate. Please try again.</p>
              <Button size="sm" variant="outline" onClick={() => {
                setError(false);
                setInitialLoading(true);
                fetchVariant()
                  .then(d => { const { tagline, ...rest } = d; setBaseData(rest); setTaglines([tagline]); setActiveIdx(0); })
                  .catch(() => setError(true))
                  .finally(() => setInitialLoading(false));
              }}>Try Again</Button>
            </div>
          ) : (
            <>
              {/* Canvas with optional prev/next overlay */}
              <div className="relative flex items-center justify-center w-full">
                {/* Prev arrow */}
                {canGoBack && (
                  <button
                    onClick={() => setActiveIdx(i => i - 1)}
                    className="absolute left-0 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                {/* Canvas */}
                <div
                  className="relative rounded-xl overflow-hidden shadow-2xl"
                  style={{ width: "100%", maxWidth: "240px", aspectRatio: "9/16" }}
                >
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ display: rendered ? "block" : "none" }}
                  />
                  {!rendered && (
                    <div className="absolute inset-0 bg-[hsl(225_14%_12%)] flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-[hsl(39_52%_61%)] animate-spin" />
                    </div>
                  )}
                </div>

                {/* Next arrow */}
                {canGoNext && (
                  <button
                    onClick={() => setActiveIdx(i => i + 1)}
                    className="absolute right-0 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Variant dots — only shown when multiple variants exist */}
              {taglines.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {taglines.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIdx(i)}
                      className={`rounded-full transition-all ${
                        i === activeIdx
                          ? "w-4 h-1.5 bg-[hsl(39_52%_61%)]"
                          : "w-1.5 h-1.5 bg-white/25 hover:bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Tagline preview text */}
              {taglines[activeIdx] && (
                <p className="text-[11px] text-white/35 text-center italic leading-relaxed px-2">
                  "{taglines[activeIdx]}"
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        {!initialLoading && !error && (
          <div className="px-5 pb-5 pt-1 shrink-0 space-y-2">
            <div className="flex gap-2">
              <Button
                onClick={handleRegenerate}
                disabled={regenerating}
                variant="outline"
                className="flex-1 border-white/15 text-white/70 hover:text-white hover:bg-white/8 hover:border-white/25"
              >
                {regenerating
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating…</>
                  : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Regenerate</>
                }
              </Button>
              <Button
                onClick={handleDownload}
                disabled={!rendered || downloading}
                className="flex-1 bg-[hsl(39_52%_61%)] text-[hsl(225_14%_8%)] hover:bg-[hsl(39_52%_52%)] font-semibold"
              >
                {downloading
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
                  : <><Download className="w-3.5 h-3.5 mr-1.5" />Download</>
                }
              </Button>
            </div>
            <p className="text-[10px] text-white/20 text-center">
              1080 × 1920 px · optimized for Instagram Stories & Reels
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
