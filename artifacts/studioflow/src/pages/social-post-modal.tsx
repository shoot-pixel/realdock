import { useState, useEffect, useRef, useCallback } from "react";
import { X, Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialPostData {
  tagline: string;
  address: string;
  projectName: string;
  coverImageUrl: string | null;
  companyName: string;
}

interface SocialPostModalProps {
  token: string;
  onClose: () => void;
}

const W = 1080;
const H = 1920;
const GOLD = "#C9A96E";
const PAD = 88;

// Draw letter-spaced text centered at x (char-by-char for full compat)
function fillSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number,
) {
  const chars = [...text];
  const charWidths = chars.map(c => ctx.measureText(c).width);
  const total = charWidths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y);
    x += charWidths[i] + spacing;
  }
}

// Wrap text to fit maxWidth — returns array of lines
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
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

function drawPost(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement | null,
  data: SocialPostData,
) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // ── Background ───────────────────────────────────────────────────────────
  ctx.fillStyle = "#0d0e11";
  ctx.fillRect(0, 0, W, H);

  if (img && img.naturalWidth > 0) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const imgAspect = iw / ih;
    const canvasAspect = W / H;
    let dw: number, dh: number, dx: number, dy: number;
    if (imgAspect > canvasAspect) {
      dh = H;
      dw = dh * imgAspect;
      dx = (W - dw) / 2;
      dy = 0;
    } else {
      dw = W;
      dh = dw / imgAspect;
      dx = 0;
      dy = (H - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // ── Overlays ─────────────────────────────────────────────────────────────
  // Top vignette
  const topGrad = ctx.createLinearGradient(0, 0, 0, 640);
  topGrad.addColorStop(0, "rgba(0,0,0,0.88)");
  topGrad.addColorStop(0.6, "rgba(0,0,0,0.40)");
  topGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 640);

  // Bottom vignette
  const botGrad = ctx.createLinearGradient(0, 1050, 0, H);
  botGrad.addColorStop(0, "rgba(0,0,0,0)");
  botGrad.addColorStop(0.35, "rgba(0,0,0,0.72)");
  botGrad.addColorStop(1, "rgba(0,0,0,0.96)");
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, 1050, W, H - 1050);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // ── TOP — "COMING SOON" block ─────────────────────────────────────────────
  const lineY1 = 148;
  const lineY2 = 300;

  // Gold decorative lines
  const drawLine = (y: number, alpha = 0.75) => {
    ctx.save();
    ctx.strokeStyle = `rgba(201,169,110,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    ctx.restore();
  };

  drawLine(lineY1);
  drawLine(lineY2);

  // Small "PRESENTED BY" label above "COMING SOON"
  ctx.fillStyle = `rgba(201,169,110,0.80)`;
  ctx.font = `500 26px Inter, -apple-system, sans-serif`;
  fillSpaced(ctx, "PRESENTED BY", W / 2, lineY1 - 22, 4);

  // "COMING SOON"
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 96px 'Playfair Display', Georgia, serif`;
  fillSpaced(ctx, "COMING SOON", W / 2, 244, 7);

  // ── BOTTOM block ──────────────────────────────────────────────────────────
  const maxW = W - PAD * 2;

  // Address
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `400 58px 'Playfair Display', Georgia, serif`;
  const addrLines = wrapText(ctx, data.address, maxW);
  const addrLineH = 76;
  const addrBlockH = addrLines.length * addrLineH;
  const addrStartY = 1430;
  for (let i = 0; i < addrLines.length; i++) {
    ctx.fillText(addrLines[i], W / 2, addrStartY + i * addrLineH);
  }

  // Tagline
  const tagStartY = addrStartY + addrBlockH + 54;
  ctx.fillStyle = GOLD;
  ctx.font = `italic 38px 'Playfair Display', Georgia, serif`;
  const tagLines = wrapText(ctx, data.tagline, maxW);
  const tagLineH = 56;
  for (let i = 0; i < tagLines.length; i++) {
    ctx.fillText(tagLines[i], W / 2, tagStartY + i * tagLineH);
  }

  // Short divider
  const divY = tagStartY + tagLines.length * tagLineH + 72;
  const divHalfW = 120;
  ctx.save();
  ctx.strokeStyle = `rgba(201,169,110,0.40)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - divHalfW, divY);
  ctx.lineTo(W / 2 + divHalfW, divY);
  ctx.stroke();
  ctx.restore();

  // Company name
  ctx.fillStyle = "rgba(255,255,255,0.50)";
  ctx.font = `500 28px Inter, -apple-system, sans-serif`;
  fillSpaced(ctx, data.companyName.toUpperCase(), W / 2, divY + 56, 3.5);

  // Tiny RealDock watermark at the very bottom
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.font = `400 22px Inter, -apple-system, sans-serif`;
  ctx.fillText("Powered by RealDock", W / 2, H - 48);
}

export default function SocialPostModal({ token, onClose }: SocialPostModalProps) {
  const [data, setData] = useState<SocialPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setData(null);
    setRendered(false);
    fetch(`/api/gallery/${token}/social-post`, { method: "POST" })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: SocialPostData) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
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
      // Try with crossOrigin first (needed to export canvas to blob)
      const img = await loadImg(data.coverImageUrl, "anonymous");
      drawPost(canvas, img, data);
    } catch {
      try {
        // Fallback: load without crossOrigin (preview only; download may be tainted)
        const img = await loadImg(data.coverImageUrl);
        drawPost(canvas, img, data);
      } catch {
        drawPost(canvas, null, data);
      }
    }
    setRendered(true);
  }, [data]);

  useEffect(() => {
    if (data) render();
  }, [data, render]);

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
        a.download = `social-post-${(data?.address ?? "property").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloading(false);
      }, "image/png");
    } catch {
      // Canvas may be tainted — open in new tab instead
      const dataUrl = canvas.toDataURL("image/png");
      window.open(dataUrl, "_blank");
      setDownloading(false);
    }
  }, [rendered, data]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-[hsl(225_14%_8%)] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[95vh]">

        {/* Header */}
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

        {/* Canvas preview */}
        <div className="flex-1 overflow-y-auto p-5 flex items-center justify-center min-h-0">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-12 h-12 rounded-2xl bg-[hsl(39_52%_61%/0.10)] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[hsl(39_52%_61%)] animate-spin" />
              </div>
              <p className="text-sm text-white/50">Generating your post…</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-sm text-white/40 mb-4">Failed to generate. Please try again.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setError(false);
                  setLoading(true);
                  fetch(`/api/gallery/${token}/social-post`, { method: "POST" })
                    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
                    .then((d: SocialPostData) => setData(d))
                    .catch(() => setError(true))
                    .finally(() => setLoading(false));
                }}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div
              className="relative rounded-xl overflow-hidden shadow-2xl"
              style={{ width: "100%", maxWidth: "260px", aspectRatio: "9/16" }}
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
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="px-5 pb-5 shrink-0 space-y-2.5">
            <Button
              onClick={handleDownload}
              disabled={!rendered || downloading}
              className="w-full bg-[hsl(39_52%_61%)] text-[hsl(225_14%_8%)] hover:bg-[hsl(39_52%_52%)] font-semibold"
            >
              {downloading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Download PNG</>
              )}
            </Button>
            <p className="text-[11px] text-white/25 text-center">
              1080 × 1920 px · optimized for Instagram Stories & Reels
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
