import { useState, useEffect, useRef, useCallback } from "react";
import { X, Download, Loader2, Share2, RefreshCw, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SocialPostData {
  taglines: string[];
  address: string;
  projectName: string;
  coverImageUrl: string | null;
  clientName: string | null;
}

interface BaseData {
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

const STYLE_LABELS = ["Dark Luxury", "Editorial", "Cinematic", "Minimal", "White Frame"] as const;
const NUM_STYLES = STYLE_LABELS.length;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function drawBg(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, w = W, h = H, oy = 0) {
  if (!img || img.naturalWidth === 0) return;
  const ar = img.naturalWidth / img.naturalHeight;
  const ca = w / h;
  let dw: number, dh: number, dx: number, dy: number;
  if (ar > ca) { dh = h; dw = dh * ar; dx = (w - dw) / 2; dy = oy; }
  else { dw = w; dh = dw / ar; dx = 0; dy = oy + (h - dh) / 2; }
  ctx.drawImage(img, dx, dy, dw, dh);
}

// ─── Style 0 — Dark Luxury ───────────────────────────────────────────────────

function drawDarkLuxury(canvas: HTMLCanvasElement, img: HTMLImageElement | null, data: BaseData, tagline: string) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0a0b0e";
  ctx.fillRect(0, 0, W, H);
  drawBg(ctx, img);

  const topGrad = ctx.createLinearGradient(0, 0, 0, 700);
  topGrad.addColorStop(0, "rgba(0,0,0,0.92)");
  topGrad.addColorStop(0.5, "rgba(0,0,0,0.55)");
  topGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, 700);

  const botGrad = ctx.createLinearGradient(0, 1080, 0, H);
  botGrad.addColorStop(0, "rgba(0,0,0,0)");
  botGrad.addColorStop(0.3, "rgba(0,0,0,0.65)");
  botGrad.addColorStop(0.7, "rgba(0,0,0,0.85)");
  botGrad.addColorStop(1, "rgba(0,0,0,0.96)");
  ctx.fillStyle = botGrad; ctx.fillRect(0, 1080, W, H - 1080);

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

  const rule = (y: number, alpha = 0.70, xPad = PAD) => {
    ctx.save(); ctx.strokeStyle = `rgba(201,169,110,${alpha})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xPad, y); ctx.lineTo(W - xPad, y); ctx.stroke(); ctx.restore();
  };

  rule(158); rule(512);
  ctx.fillStyle = "#FFFFFF"; ctx.font = `bold 104px 'Playfair Display', Georgia, serif`;
  ctx.fillText("COMING", W / 2, 310);
  ctx.fillText("SOON", W / 2, 440);

  const maxW = W - PAD * 2;
  ctx.fillStyle = "#FFFFFF"; ctx.font = `400 56px 'Playfair Display', Georgia, serif`;
  const addrLines = wrapText(ctx, data.address, maxW);
  const addrLineH = 74;
  const addrStartY = 1480 - (addrLines.length - 1) * addrLineH;
  addrLines.forEach((l, i) => ctx.fillText(l, W / 2, addrStartY + i * addrLineH));

  const midRuleY = addrStartY + addrLines.length * addrLineH + 44;
  rule(midRuleY, 0.35, PAD + 180);

  ctx.fillStyle = GOLD; ctx.font = `italic 38px 'Playfair Display', Georgia, serif`;
  const tagLines = wrapText(ctx, tagline, maxW - 80);
  const tagStartY = midRuleY + 56;
  tagLines.forEach((l, i) => ctx.fillText(l, W / 2, tagStartY + i * 56));

  if (data.clientName) {
    const presY = tagStartY + tagLines.length * 56 + 72;
    ctx.fillStyle = "rgba(255,255,255,0.40)"; ctx.font = `400 28px 'Playfair Display', Georgia, serif`;
    ctx.fillText(`Presented by ${data.clientName}`, W / 2, presY);
  }
}

// ─── Style 1 — Editorial Bold ────────────────────────────────────────────────

function drawEditorial(canvas: HTMLCanvasElement, img: HTMLImageElement | null, data: BaseData, tagline: string) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#080808"; ctx.fillRect(0, 0, W, H);
  drawBg(ctx, img);

  // Solid charcoal strip at bottom
  const stripY = 1360;
  ctx.fillStyle = "rgba(8,8,8,0.94)"; ctx.fillRect(0, stripY, W, H - stripY);
  // Blend edge
  const blendGrad = ctx.createLinearGradient(0, stripY - 160, 0, stripY);
  blendGrad.addColorStop(0, "rgba(8,8,8,0)");
  blendGrad.addColorStop(1, "rgba(8,8,8,0.94)");
  ctx.fillStyle = blendGrad; ctx.fillRect(0, stripY - 160, W, 160);

  // Top-left "COMING SOON" small caps with manual spacing
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = GOLD; ctx.font = `400 21px Helvetica, Arial, sans-serif`;
  ctx.fillText("C O M I N G   S O O N", 80, 74);
  ctx.save(); ctx.strokeStyle = `rgba(201,169,110,0.45)`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 90); ctx.lineTo(520, 90); ctx.stroke(); ctx.restore();

  // Main content in strip
  const lpad = 80;
  const maxW = W - lpad - 80;

  ctx.fillStyle = "#FFFFFF"; ctx.font = `900 78px Helvetica, Arial, sans-serif`;
  const addrUp = data.address.toUpperCase();
  const addrLines = wrapText(ctx, addrUp, maxW);
  let y = stripY + 88;
  addrLines.forEach(l => { ctx.fillText(l, lpad, y); y += 94; });

  // Gold rule
  y += 12;
  ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(lpad, y); ctx.lineTo(lpad + 280, y); ctx.stroke(); ctx.restore();
  y += 50;

  ctx.fillStyle = "rgba(255,255,255,0.62)"; ctx.font = `italic 36px Georgia, serif`;
  const tagLines = wrapText(ctx, tagline, maxW);
  tagLines.forEach(l => { ctx.fillText(l, lpad, y); y += 50; });

  if (data.clientName) {
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = `400 23px Helvetica, Arial, sans-serif`;
    ctx.fillText(`Presented by ${data.clientName}`, W - 80, H - 56);
  }
}

// ─── Style 2 — Cinematic Amber ───────────────────────────────────────────────

function drawCinematic(canvas: HTMLCanvasElement, img: HTMLImageElement | null, data: BaseData, tagline: string) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#180d04"; ctx.fillRect(0, 0, W, H);
  drawBg(ctx, img);

  // Warm amber tint
  ctx.fillStyle = "rgba(160, 88, 18, 0.30)"; ctx.fillRect(0, 0, W, H);

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.82);
  vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

  // Top label
  ctx.fillStyle = "rgba(255,255,255,0.48)"; ctx.font = `300 28px Georgia, serif`;
  ctx.fillText("C O M I N G   S O O N", W / 2, 110);

  // Center block
  const cy = H / 2 + 80;
  const rule = (y: number, w = 640, a = 0.55) => {
    ctx.save(); ctx.strokeStyle = `rgba(201,169,110,${a})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo((W - w) / 2, y); ctx.lineTo((W + w) / 2, y); ctx.stroke(); ctx.restore();
  };

  // Address
  ctx.fillStyle = "#FFF8EE"; ctx.font = `italic 70px 'Playfair Display', Georgia, serif`;
  const addrLines = wrapText(ctx, data.address, 840);
  const addrLineH = 92;
  const addrTotalH = addrLines.length * addrLineH;
  let addrY = cy - addrTotalH / 2 + 60;
  rule(addrY - 90, 640, 0.45);
  addrLines.forEach(l => { ctx.fillText(l, W / 2, addrY); addrY += addrLineH; });
  rule(addrY, 640, 0.45);
  addrY += 80;

  // Tagline
  ctx.fillStyle = "rgba(255,240,205,0.72)"; ctx.font = `300 38px Georgia, serif`;
  const tagLines = wrapText(ctx, tagline, 840);
  tagLines.forEach(l => { ctx.fillText(l, W / 2, addrY); addrY += 54; });

  if (data.clientName) {
    ctx.fillStyle = "rgba(255,220,150,0.42)"; ctx.font = `400 26px Georgia, serif`;
    ctx.fillText(`Presented by ${data.clientName}`, W / 2, H - 76);
  }
}

// ─── Style 3 — Modern Minimal ────────────────────────────────────────────────

function drawMinimal(canvas: HTMLCanvasElement, img: HTMLImageElement | null, data: BaseData, tagline: string) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0d0d0d"; ctx.fillRect(0, 0, W, H);
  drawBg(ctx, img);

  // Subtle top gradient only
  const topG = ctx.createLinearGradient(0, 0, 0, 380);
  topG.addColorStop(0, "rgba(0,0,0,0.85)"); topG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topG; ctx.fillRect(0, 0, W, 380);

  // Bottom gradient
  const botG = ctx.createLinearGradient(0, H - 500, 0, H);
  botG.addColorStop(0, "rgba(0,0,0,0)"); botG.addColorStop(1, "rgba(0,0,0,0.90)");
  ctx.fillStyle = botG; ctx.fillRect(0, H - 500, W, 500);

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

  // Huge top type — COMING white, SOON gold
  ctx.fillStyle = "#FFFFFF"; ctx.font = `bold 148px Arial, Helvetica, sans-serif`;
  ctx.fillText("COMING", W / 2, 224);
  ctx.fillStyle = GOLD; ctx.font = `bold 148px Arial, Helvetica, sans-serif`;
  ctx.fillText("SOON", W / 2, 390);

  // Thin white hairline separator
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(210, 428); ctx.lineTo(W - 210, 428); ctx.stroke(); ctx.restore();

  // Bottom: address
  ctx.fillStyle = "#FFFFFF"; ctx.font = `300 50px Helvetica, Arial, sans-serif`;
  const addrLines = wrapText(ctx, data.address, W - 180);
  const addrLineH = 66;
  let addrY = H - 200 - (addrLines.length - 1) * addrLineH;
  addrLines.forEach(l => { ctx.fillText(l, W / 2, addrY); addrY += addrLineH; });

  // Tagline micro
  ctx.fillStyle = "rgba(255,255,255,0.42)"; ctx.font = `italic 30px Georgia, serif`;
  const tagLines = wrapText(ctx, tagline, W - 220);
  if (tagLines[0]) ctx.fillText(tagLines[0], W / 2, H - 90);

  if (data.clientName) {
    ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.font = `400 22px Helvetica, Arial, sans-serif`;
    ctx.fillText(`Presented by ${data.clientName}`, W / 2, H - 44);
  }
}

// ─── Style 4 — White Frame ───────────────────────────────────────────────────

function drawWhiteFrame(canvas: HTMLCanvasElement, img: HTMLImageElement | null, data: BaseData, tagline: string) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Cream base
  ctx.fillStyle = "#F3EDE3"; ctx.fillRect(0, 0, W, H);

  // Photo in top 63%
  const photoH = Math.floor(H * 0.632);
  if (img && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, photoH); ctx.clip();
    const ar = img.naturalWidth / img.naturalHeight;
    const ca = W / photoH;
    let dw: number, dh: number, dx: number, dy: number;
    if (ar > ca) { dh = photoH; dw = dh * ar; dx = (W - dw) / 2; dy = 0; }
    else { dw = W; dh = dw / ar; dx = 0; dy = (photoH - dh) / 2; }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  // Thin dark rule separating photo from panel
  ctx.fillStyle = "#1a1410"; ctx.fillRect(0, photoH, W, 4);

  // Panel text
  const panelTop = photoH + 4;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const cx = W / 2;

  // "COMING SOON" in warm gold
  ctx.fillStyle = GOLD; ctx.font = `400 34px 'Playfair Display', Georgia, serif`;
  ctx.fillText("C O M I N G   S O O N", cx, panelTop + 88);

  // Thin gold underline
  ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.globalAlpha = 0.50;
  ctx.beginPath(); ctx.moveTo(cx - 190, panelTop + 112); ctx.lineTo(cx + 190, panelTop + 112); ctx.stroke(); ctx.restore();

  // Address bold dark
  ctx.fillStyle = "#1a1410"; ctx.font = `bold 66px 'Playfair Display', Georgia, serif`;
  const addrLines = wrapText(ctx, data.address, W - 140);
  const addrLineH = 82;
  let addrY = panelTop + 210;
  addrLines.forEach(l => { ctx.fillText(l, cx, addrY); addrY += addrLineH; });

  // Thin dark separator
  addrY += 14;
  ctx.save(); ctx.strokeStyle = "#1a1410"; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.18;
  ctx.beginPath(); ctx.moveTo(cx - 130, addrY); ctx.lineTo(cx + 130, addrY); ctx.stroke(); ctx.restore();
  addrY += 52;

  // Tagline italic warm
  ctx.fillStyle = "#6b5b4e"; ctx.font = `italic 34px 'Playfair Display', Georgia, serif`;
  const tagLines = wrapText(ctx, tagline, W - 200);
  tagLines.forEach(l => { ctx.fillText(l, cx, addrY); addrY += 50; });

  if (data.clientName) {
    ctx.fillStyle = "rgba(107,91,78,0.50)"; ctx.font = `400 24px 'Playfair Display', Georgia, serif`;
    ctx.fillText(`Presented by ${data.clientName}`, cx, H - 56);
  }
}

const DRAW_FNS = [drawDarkLuxury, drawEditorial, drawCinematic, drawMinimal, drawWhiteFrame];

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function SocialPostModal({ token, onClose }: SocialPostModalProps) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [baseData, setBaseData] = useState<BaseData | null>(null);
  const [taglines, setTaglines] = useState<(string | null)[]>(Array(NUM_STYLES).fill(null));
  const [activeStyle, setActiveStyle] = useState(0);
  const [rendered, setRendered] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // ── Load image ──────────────────────────────────────────────────────────────
  const loadImg = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(img);
      img.onerror = () => {
        // retry without crossOrigin
        const img2 = new Image();
        img2.onload = () => res(img2);
        img2.onerror = rej;
        img2.src = src;
      };
      img.src = src;
    });
  }, []);

  // ── Render current style to canvas ─────────────────────────────────────────
  const renderStyle = useCallback(async (styleIdx: number, tag: string, base: BaseData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendered(false);
    await document.fonts.ready;

    if (base.coverImageUrl && !imgRef.current) {
      try { imgRef.current = await loadImg(base.coverImageUrl); } catch { /* no image */ }
    }
    DRAW_FNS[styleIdx]!(canvas, imgRef.current, base, tag);
    setRendered(true);
  }, [loadImg]);

  // ── Initial fetch — get all 5 taglines in one call ─────────────────────────
  useEffect(() => {
    fetch(`/api/gallery/${token}/social-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 5 }),
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<SocialPostData>; })
      .then(async d => {
        const base: BaseData = {
          address: d.address,
          projectName: d.projectName,
          coverImageUrl: d.coverImageUrl,
          clientName: d.clientName,
        };
        // pad/trim to NUM_STYLES
        const tags: (string | null)[] = Array(NUM_STYLES).fill(null);
        d.taglines.forEach((t, i) => { if (i < NUM_STYLES) tags[i] = t; });

        setBaseData(base);
        setTaglines(tags);
        setActiveStyle(0);
        setPhase("ready");

        if (base.coverImageUrl) {
          try { imgRef.current = await loadImg(base.coverImageUrl); } catch { /* ok */ }
        }
        if (tags[0]) renderStyle(0, tags[0], base);
      })
      .catch(() => setPhase("error"));
  }, [token, loadImg, renderStyle]);

  // ── Re-render when style changes ───────────────────────────────────────────
  useEffect(() => {
    const tag = taglines[activeStyle];
    if (phase === "ready" && baseData && tag) {
      renderStyle(activeStyle, tag, baseData);
    }
  }, [activeStyle, taglines, phase, baseData, renderStyle]);

  // ── Navigate styles ────────────────────────────────────────────────────────
  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= NUM_STYLES) return;
    setActiveStyle(idx);
  }, []);

  // ── Generate Again ─────────────────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (regenerating || !baseData) return;
    setRegenerating(true);
    setPromptOpen(false);
    try {
      const res = await fetch(`/api/gallery/${token}/social-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1, prompt: promptText.trim() }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json() as SocialPostData;
      const newTag = d.taglines[0];
      if (newTag) {
        setTaglines(prev => {
          const next = [...prev];
          next[activeStyle] = newTag;
          return next;
        });
      }
      setPromptText("");
    } catch { /* silent */ }
    finally { setRegenerating(false); }
  }, [regenerating, baseData, token, promptText, activeStyle]);

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rendered) return;
    setDownloading(true);
    const styleName = STYLE_LABELS[activeStyle]?.toLowerCase().replace(/\s+/g, "-") ?? "post";
    const addrSlug = (baseData?.address ?? "property").replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40);
    try {
      canvas.toBlob(blob => {
        if (!blob) { setDownloading(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `social-post-${styleName}-${addrSlug}.png`; a.click();
        URL.revokeObjectURL(url);
        setDownloading(false);
      }, "image/png");
    } catch {
      window.open(canvas.toDataURL("image/png"), "_blank");
      setDownloading(false);
    }
  }, [rendered, baseData, activeStyle]);

  const currentTag = taglines[activeStyle];

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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-3 flex flex-col items-center gap-3 min-h-0">

          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-12 h-12 rounded-2xl bg-[hsl(39_52%_61%/0.10)] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[hsl(39_52%_61%)] animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm text-white/60 font-medium">Generating 5 designs…</p>
                <p className="text-[11px] text-white/30 mt-1">Using your cover image</p>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="text-center py-16">
              <p className="text-sm text-white/40 mb-4">Failed to generate. Please try again.</p>
              <Button size="sm" variant="outline" onClick={() => { setPhase("loading"); window.location.reload(); }}>
                Try Again
              </Button>
            </div>
          )}

          {phase === "ready" && (
            <>
              {/* Style chips */}
              <div className="flex gap-1.5 w-full justify-center flex-wrap">
                {STYLE_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-medium transition-all border",
                      i === activeStyle
                        ? "bg-[hsl(39_52%_61%)] text-[hsl(225_14%_8%)] border-[hsl(39_52%_61%)]"
                        : "bg-transparent text-white/45 border-white/12 hover:text-white/70 hover:border-white/25"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Canvas with arrows */}
              <div className="relative flex items-center justify-center w-full">
                {activeStyle > 0 && (
                  <button
                    onClick={() => goTo(activeStyle - 1)}
                    className="absolute left-0 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <div
                  className="relative rounded-xl overflow-hidden shadow-2xl"
                  style={{ width: "100%", maxWidth: "232px", aspectRatio: "9/16" }}
                >
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ display: rendered ? "block" : "none" }}
                  />
                  {(!rendered || regenerating) && (
                    <div className="absolute inset-0 bg-[hsl(225_14%_12%)] flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 text-[hsl(39_52%_61%)] animate-spin" />
                      {regenerating && <p className="text-[11px] text-white/40">Generating new copy…</p>}
                    </div>
                  )}
                  {/* Style label overlay */}
                  {rendered && !regenerating && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                      <span className="text-[10px] text-white/50 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {STYLE_LABELS[activeStyle]}
                      </span>
                    </div>
                  )}
                </div>

                {activeStyle < NUM_STYLES - 1 && (
                  <button
                    onClick={() => goTo(activeStyle + 1)}
                    className="absolute right-0 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dot indicators */}
              <div className="flex items-center gap-1.5">
                {STYLE_LABELS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={cn(
                      "rounded-full transition-all",
                      i === activeStyle
                        ? "w-4 h-1.5 bg-[hsl(39_52%_61%)]"
                        : "w-1.5 h-1.5 bg-white/25 hover:bg-white/40"
                    )}
                  />
                ))}
              </div>

              {/* Tagline preview */}
              {currentTag && (
                <p className="text-[11px] text-white/32 text-center italic leading-relaxed px-2">
                  "{currentTag}"
                </p>
              )}

              {/* Generate Again prompt box */}
              {promptOpen && (
                <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                  <p className="text-[11px] text-white/50 font-medium">Describe what you want</p>
                  <textarea
                    value={promptText}
                    onChange={e => setPromptText(e.target.value)}
                    placeholder="e.g. make it more dramatic, use coastal vibes, emphasize exclusivity…"
                    className="w-full bg-transparent text-white/80 text-[12px] placeholder:text-white/25 resize-none outline-none leading-relaxed"
                    rows={3}
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRegenerate(); }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setPromptOpen(false); setPromptText(""); }}
                      className="text-[11px] text-white/35 hover:text-white/60 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      className="text-[11px] text-[hsl(39_52%_61%)] hover:text-[hsl(39_52%_72%)] font-semibold transition-colors disabled:opacity-50"
                    >
                      {regenerating ? "Generating…" : "Generate →"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {phase === "ready" && (
          <div className="px-5 pb-5 pt-1 shrink-0 space-y-2">
            <div className="flex gap-2">
              <Button
                onClick={() => setPromptOpen(o => !o)}
                disabled={regenerating}
                variant="outline"
                className="flex-1 border-white/15 text-white/70 hover:text-white hover:bg-white/8 hover:border-white/25"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Generate Again
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
