import { useState, useEffect, useRef, useCallback } from "react";
import { X, Download, Loader2, Share2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 1080;
const H = 1920;
const GOLD = "#C9A96E";
const THUMB_W = 108;
const THUMB_H = 192;

const STYLES = [
  { label: "Dark Luxury",  accent: "#C9A96E" },
  { label: "Editorial",    accent: "#FFFFFF" },
  { label: "Cinematic",    accent: "#D4845A" },
  { label: "Minimal",      accent: "#7DD3D3" },
  { label: "White Frame",  accent: "#F3EDE3" },
] as const;

const NUM_STYLES = STYLES.length;

const DEFAULTS = [
  "A rare opportunity to own an exceptional residence in a coveted location.",
  "Where luxury meets lifestyle — an address like no other.",
  "Timeless elegance awaits in this extraordinary property.",
  "An exceptional home for those who demand the very best.",
  "Discover the pinnacle of refined living.",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line); line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawImg(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number) {
  if (!img || img.naturalWidth === 0) return;
  const ar = img.naturalWidth / img.naturalHeight;
  const ca = w / h;
  let dw: number, dh: number, dx: number, dy: number;
  if (ar > ca) { dh = h; dw = dh * ar; dx = x + (w - dw) / 2; dy = y; }
  else { dw = w; dh = dw / ar; dx = x; dy = y + (h - dh) / 2; }
  ctx.drawImage(img, dx, dy, dw, dh);
}

// All draw functions operate in 1080×1920 coordinate space.
// The caller applies ctx.scale() for thumbnails.

// ─── Style 0: Dark Luxury ─────────────────────────────────────────────────────

function drawDarkLuxury(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, base: BaseData, tagline: string) {
  const PAD = 96;
  ctx.fillStyle = "#0a0b0e"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.rect(0, 0, W, H); ctx.clip();
  drawImg(ctx, img, 0, 0, W, H);
  ctx.restore();

  const topG = ctx.createLinearGradient(0, 0, 0, 700);
  topG.addColorStop(0, "rgba(0,0,0,0.92)"); topG.addColorStop(0.5, "rgba(0,0,0,0.55)"); topG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topG; ctx.fillRect(0, 0, W, 700);
  const botG = ctx.createLinearGradient(0, 1080, 0, H);
  botG.addColorStop(0, "rgba(0,0,0,0)"); botG.addColorStop(0.3, "rgba(0,0,0,0.68)"); botG.addColorStop(1, "rgba(0,0,0,0.97)");
  ctx.fillStyle = botG; ctx.fillRect(0, 1080, W, H - 1080);

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const rule = (y: number, xPad = PAD, a = 0.70) => {
    ctx.save(); ctx.strokeStyle = `rgba(201,169,110,${a})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xPad, y); ctx.lineTo(W - xPad, y); ctx.stroke(); ctx.restore();
  };
  rule(158); rule(512);
  ctx.fillStyle = "#FFF"; ctx.font = `bold 104px 'Playfair Display', Georgia, serif`;
  ctx.fillText("COMING", W / 2, 310); ctx.fillText("SOON", W / 2, 440);

  const mW = W - PAD * 2;
  ctx.fillStyle = "#FFF"; ctx.font = `400 56px 'Playfair Display', Georgia, serif`;
  const aLines = wrapText(ctx, base.address, mW);
  const aStartY = 1480 - (aLines.length - 1) * 74;
  aLines.forEach((l, i) => ctx.fillText(l, W / 2, aStartY + i * 74));
  const rY = aStartY + aLines.length * 74 + 44;
  rule(rY, PAD + 180, 0.35);
  ctx.fillStyle = GOLD; ctx.font = `italic 38px 'Playfair Display', Georgia, serif`;
  const tLines = wrapText(ctx, tagline, mW - 80);
  const tY = rY + 56;
  tLines.forEach((l, i) => ctx.fillText(l, W / 2, tY + i * 56));
  if (base.clientName) {
    ctx.fillStyle = "rgba(255,255,255,0.38)"; ctx.font = `400 28px 'Playfair Display', Georgia, serif`;
    ctx.fillText(`Presented by ${base.clientName}`, W / 2, tY + tLines.length * 56 + 72);
  }
}

// ─── Style 1: Editorial ──────────────────────────────────────────────────────

function drawEditorial(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, base: BaseData, tagline: string) {
  ctx.fillStyle = "#080808"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.rect(0, 0, W, H); ctx.clip();
  drawImg(ctx, img, 0, 0, W, H);
  ctx.restore();

  // Bottom charcoal strip
  const stripY = 1340;
  const blendG = ctx.createLinearGradient(0, stripY - 200, 0, stripY);
  blendG.addColorStop(0, "rgba(8,8,8,0)"); blendG.addColorStop(1, "rgba(8,8,8,0.96)");
  ctx.fillStyle = blendG; ctx.fillRect(0, stripY - 200, W, 200);
  ctx.fillStyle = "rgba(8,8,8,0.96)"; ctx.fillRect(0, stripY, W, H - stripY);

  // Top-left label
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = GOLD; ctx.font = `400 22px Helvetica, Arial, sans-serif`;
  ctx.fillText("C O M I N G   S O O N", 80, 76);
  ctx.save(); ctx.strokeStyle = `rgba(201,169,110,0.45)`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 92); ctx.lineTo(540, 92); ctx.stroke(); ctx.restore();

  // Address bold
  const lp = 80;
  ctx.fillStyle = "#FFF"; ctx.font = `900 76px Helvetica, Arial, sans-serif`;
  const aLines = wrapText(ctx, base.address.toUpperCase(), W - lp - 80);
  let y = stripY + 90;
  aLines.forEach(l => { ctx.fillText(l, lp, y); y += 94; });

  // Gold rule
  y += 10;
  ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(lp, y); ctx.lineTo(lp + 300, y); ctx.stroke(); ctx.restore();
  y += 52;

  ctx.fillStyle = "rgba(255,255,255,0.60)"; ctx.font = `italic 36px Georgia, serif`;
  wrapText(ctx, tagline, W - lp - 80).forEach(l => { ctx.fillText(l, lp, y); y += 52; });

  if (base.clientName) {
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.27)";
    ctx.font = `400 23px Helvetica, Arial, sans-serif`;
    ctx.fillText(`Presented by ${base.clientName}`, W - 80, H - 58);
  }
}

// ─── Style 2: Cinematic ──────────────────────────────────────────────────────

function drawCinematic(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, base: BaseData, tagline: string) {
  ctx.fillStyle = "#180d04"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.rect(0, 0, W, H); ctx.clip();
  drawImg(ctx, img, 0, 0, W, H);
  ctx.restore();

  ctx.fillStyle = "rgba(155, 82, 14, 0.32)"; ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.82);
  vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.48)"; ctx.font = `300 28px Georgia, serif`;
  ctx.fillText("C O M I N G   S O O N", W / 2, 108);

  const rule = (y: number, rw = 650, a = 0.50) => {
    ctx.save(); ctx.strokeStyle = `rgba(201,169,110,${a})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo((W - rw) / 2, y); ctx.lineTo((W + rw) / 2, y); ctx.stroke(); ctx.restore();
  };

  ctx.fillStyle = "#FFF8EE"; ctx.font = `italic 70px 'Playfair Display', Georgia, serif`;
  const aLines = wrapText(ctx, base.address, 840);
  const aTotalH = aLines.length * 92;
  const cy = H / 2 + 60;
  let aY = cy - aTotalH / 2 + 60;
  rule(aY - 96, 650, 0.42);
  aLines.forEach(l => { ctx.fillText(l, W / 2, aY); aY += 92; });
  rule(aY, 650, 0.42); aY += 82;

  ctx.fillStyle = "rgba(255,238,200,0.72)"; ctx.font = `300 38px Georgia, serif`;
  wrapText(ctx, tagline, 840).forEach(l => { ctx.fillText(l, W / 2, aY); aY += 56; });

  if (base.clientName) {
    ctx.fillStyle = "rgba(255,216,140,0.42)"; ctx.font = `400 26px Georgia, serif`;
    ctx.fillText(`Presented by ${base.clientName}`, W / 2, H - 78);
  }
}

// ─── Style 3: Minimal ────────────────────────────────────────────────────────

function drawMinimal(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, base: BaseData, tagline: string) {
  ctx.fillStyle = "#0d0d0d"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.rect(0, 0, W, H); ctx.clip();
  drawImg(ctx, img, 0, 0, W, H);
  ctx.restore();

  const topG = ctx.createLinearGradient(0, 0, 0, 420);
  topG.addColorStop(0, "rgba(0,0,0,0.88)"); topG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topG; ctx.fillRect(0, 0, W, 420);
  const botG = ctx.createLinearGradient(0, H - 520, 0, H);
  botG.addColorStop(0, "rgba(0,0,0,0)"); botG.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = botG; ctx.fillRect(0, H - 520, W, 520);

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#FFF"; ctx.font = `bold 152px Arial, Helvetica, sans-serif`;
  ctx.fillText("COMING", W / 2, 228);
  ctx.fillStyle = GOLD; ctx.font = `bold 152px Arial, Helvetica, sans-serif`;
  ctx.fillText("SOON", W / 2, 400);
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(220, 440); ctx.lineTo(W - 220, 440); ctx.stroke(); ctx.restore();

  ctx.fillStyle = "#FFF"; ctx.font = `300 50px Helvetica, Arial, sans-serif`;
  const aLines = wrapText(ctx, base.address, W - 180);
  let aY = H - 220 - (aLines.length - 1) * 66;
  aLines.forEach(l => { ctx.fillText(l, W / 2, aY); aY += 66; });

  ctx.fillStyle = "rgba(255,255,255,0.40)"; ctx.font = `italic 30px Georgia, serif`;
  const tLines = wrapText(ctx, tagline, W - 220);
  if (tLines[0]) ctx.fillText(tLines[0], W / 2, H - 106);

  if (base.clientName) {
    ctx.fillStyle = "rgba(255,255,255,0.20)"; ctx.font = `400 22px Helvetica, Arial, sans-serif`;
    ctx.fillText(`Presented by ${base.clientName}`, W / 2, H - 48);
  }
}

// ─── Style 4: White Frame ────────────────────────────────────────────────────

function drawWhiteFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, base: BaseData, tagline: string) {
  ctx.fillStyle = "#F3EDE3"; ctx.fillRect(0, 0, W, H);
  const photoH = Math.floor(H * 0.625);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, photoH); ctx.clip();
  drawImg(ctx, img, 0, 0, W, photoH);
  ctx.restore();
  ctx.fillStyle = "#1a1410"; ctx.fillRect(0, photoH, W, 4);

  const pTop = photoH + 4;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = GOLD; ctx.font = `400 34px 'Playfair Display', Georgia, serif`;
  ctx.fillText("C O M I N G   S O O N", W / 2, pTop + 90);
  ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.globalAlpha = 0.48;
  ctx.beginPath(); ctx.moveTo(W / 2 - 195, pTop + 114); ctx.lineTo(W / 2 + 195, pTop + 114); ctx.stroke(); ctx.restore();

  ctx.fillStyle = "#1a1410"; ctx.font = `bold 66px 'Playfair Display', Georgia, serif`;
  const aLines = wrapText(ctx, base.address, W - 140);
  let aY = pTop + 210;
  aLines.forEach(l => { ctx.fillText(l, W / 2, aY); aY += 82; });

  aY += 14;
  ctx.save(); ctx.strokeStyle = "#1a1410"; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.18;
  ctx.beginPath(); ctx.moveTo(W / 2 - 130, aY); ctx.lineTo(W / 2 + 130, aY); ctx.stroke(); ctx.restore();
  aY += 52;

  ctx.fillStyle = "#6b5b4e"; ctx.font = `italic 34px 'Playfair Display', Georgia, serif`;
  wrapText(ctx, tagline, W - 200).forEach(l => { ctx.fillText(l, W / 2, aY); aY += 50; });

  if (base.clientName) {
    ctx.fillStyle = "rgba(107,91,78,0.48)"; ctx.font = `400 24px 'Playfair Display', Georgia, serif`;
    ctx.fillText(`Presented by ${base.clientName}`, W / 2, H - 58);
  }
}

const DRAW_FNS = [drawDarkLuxury, drawEditorial, drawCinematic, drawMinimal, drawWhiteFrame];

// ─── Render helpers ───────────────────────────────────────────────────────────

async function renderToCanvas(
  canvas: HTMLCanvasElement,
  styleIdx: number,
  img: HTMLImageElement | null,
  base: BaseData,
  tagline: string,
  targetW = W,
  targetH = H,
) {
  await document.fonts.ready;
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  if (targetW !== W) ctx.scale(targetW / W, targetH / H);
  DRAW_FNS[styleIdx]!(ctx, img, base, tagline);
  ctx.restore();
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function SocialPostModal({ token, onClose }: SocialPostModalProps) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [baseData, setBaseData] = useState<BaseData | null>(null);
  const [taglines, setTaglines] = useState<string[]>([]);
  const [activeStyle, setActiveStyle] = useState(0);
  const [rendered, setRendered] = useState(false);
  const [thumbDone, setThumbDone] = useState<boolean[]>(Array(NUM_STYLES).fill(false));
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [prompt, setPrompt] = useState("");

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const thumbRefs = useRef<(HTMLCanvasElement | null)[]>(Array(NUM_STYLES).fill(null));
  const imgRef = useRef<HTMLImageElement | null>(null);

  // ── Load image (try with CORS first, fall back) ────────────────────────────
  const loadImage = useCallback(async (url: string): Promise<HTMLImageElement | null> => {
    const tryLoad = (crossOrigin: boolean) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        if (crossOrigin) img.crossOrigin = "anonymous";
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = url;
      });
    try { return await tryLoad(true); } catch { /* */ }
    try { return await tryLoad(false); } catch { /* */ }
    return null;
  }, []);

  // ── Render one style to main canvas + thumbnail ────────────────────────────
  const renderStyle = useCallback(async (
    styleIdx: number,
    tag: string,
    base: BaseData,
    img: HTMLImageElement | null,
    updateMain: boolean,
  ) => {
    // Render thumbnail
    const thumb = thumbRefs.current[styleIdx];
    if (thumb) {
      await renderToCanvas(thumb, styleIdx, img, base, tag, THUMB_W, THUMB_H);
      setThumbDone(prev => { const n = [...prev]; n[styleIdx] = true; return n; });
    }
    // Render main if needed
    if (updateMain && mainCanvasRef.current) {
      await renderToCanvas(mainCanvasRef.current, styleIdx, img, base, tag);
      setRendered(true);
    }
  }, []);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    setPhase("loading");
    setRendered(false);
    setThumbDone(Array(NUM_STYLES).fill(false));

    fetch(`/api/gallery/${token}/social-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 5 }),
    })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(async (d: { taglines?: string[]; address: string; projectName: string; coverImageUrl: string | null; clientName: string | null }) => {
        const base: BaseData = {
          address: d.address, projectName: d.projectName,
          coverImageUrl: d.coverImageUrl, clientName: d.clientName,
        };
        const tags: string[] = Array.isArray(d.taglines) ? d.taglines.slice(0, NUM_STYLES) : [];
        while (tags.length < NUM_STYLES) tags.push(DEFAULTS[tags.length] ?? DEFAULTS[0]);

        setBaseData(base);
        setTaglines(tags);
        setActiveStyle(0);
        setPhase("ready");

        const img = base.coverImageUrl ? await loadImage(base.coverImageUrl) : null;
        imgRef.current = img;

        // Render all styles; style 0 also updates main canvas
        for (let i = 0; i < NUM_STYLES; i++) {
          renderStyle(i, tags[i]!, base, img, i === 0);
        }
      })
      .catch(() => setPhase("error"));
  }, [token, loadImage, renderStyle]);

  // ── Switch style ───────────────────────────────────────────────────────────
  const goTo = useCallback((idx: number) => {
    if (idx === activeStyle || !baseData || !taglines[idx]) return;
    setActiveStyle(idx);
    setRendered(false);
    renderToCanvas(mainCanvasRef.current!, idx, imgRef.current, baseData, taglines[idx]!)
      .then(() => setRendered(true));
  }, [activeStyle, baseData, taglines]);

  // ── Generate 5 new styles ──────────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (regenerating || !baseData) return;
    setRegenerating(true);
    setRendered(false);
    setThumbDone(Array(NUM_STYLES).fill(false));
    try {
      const d = await fetch(`/api/gallery/${token}/social-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5, prompt: prompt.trim() }),
      }).then(r => (r.ok ? r.json() : Promise.reject())) as { taglines?: string[] };

      const tags: string[] = Array.isArray(d.taglines) ? d.taglines.slice(0, NUM_STYLES) : [];
      while (tags.length < NUM_STYLES) tags.push(DEFAULTS[tags.length] ?? DEFAULTS[0]);
      setTaglines(tags);

      const img = imgRef.current;
      for (let i = 0; i < NUM_STYLES; i++) {
        renderStyle(i, tags[i]!, baseData, img, i === activeStyle);
      }
    } catch { /* silent */ }
    finally { setRegenerating(false); }
  }, [regenerating, baseData, token, prompt, activeStyle, renderStyle]);

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas || !rendered || downloading) return;
    setDownloading(true);
    const name = `social-post-${STYLES[activeStyle]!.label.toLowerCase().replace(/\s+/g, "-")}.png`;
    try {
      canvas.toBlob(blob => {
        if (!blob) { setDownloading(false); return; }
        const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
        a.click(); URL.revokeObjectURL(a.href); setDownloading(false);
      }, "image/png");
    } catch {
      window.open(canvas.toDataURL("image/png"), "_blank"); setDownloading(false);
    }
  }, [rendered, downloading, activeStyle]);

  // ─── UI ────────────────────────────────────────────────────────────────────

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
              <p className="text-[11px] text-white/40 mt-0.5">9:16 · 5 unique designs</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 pt-4 pb-3 flex flex-col gap-3 items-center">

          {/* Loading */}
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3 py-14">
              <div className="w-12 h-12 rounded-2xl bg-[hsl(39_52%_61%/0.10)] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[hsl(39_52%_61%)] animate-spin" />
              </div>
              <p className="text-sm text-white/55">Generating 5 designs…</p>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="text-center py-14">
              <p className="text-sm text-white/40 mb-4">Failed to generate. Please try again.</p>
              <Button size="sm" variant="outline" onClick={() => setPhase("loading")}>Try Again</Button>
            </div>
          )}

          {/* Ready */}
          {phase === "ready" && (
            <>
              {/* Main preview */}
              <div
                className="relative rounded-xl overflow-hidden shadow-2xl w-full"
                style={{ maxWidth: "232px", aspectRatio: "9/16" }}
              >
                <canvas
                  ref={mainCanvasRef}
                  className="w-full h-full"
                  style={{ display: rendered && !regenerating ? "block" : "none" }}
                />
                {(!rendered || regenerating) && (
                  <div className="absolute inset-0 bg-[hsl(225_14%_12%)] flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-[hsl(39_52%_61%)] animate-spin" />
                    <p className="text-[11px] text-white/35">{regenerating ? "Regenerating…" : "Rendering…"}</p>
                  </div>
                )}
                {/* Active style label */}
                {rendered && !regenerating && (
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/50 text-white/60 backdrop-blur-sm">
                      {STYLES[activeStyle]!.label} · {activeStyle + 1} of {NUM_STYLES}
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnail strip — all 5 visible at once */}
              <div className="flex gap-2 w-full justify-center">
                {STYLES.map((style, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={cn(
                      "relative rounded-lg overflow-hidden transition-all ring-offset-[hsl(225_14%_8%)] focus:outline-none",
                      i === activeStyle
                        ? "ring-2 ring-offset-2"
                        : "opacity-60 hover:opacity-90",
                    )}
                    style={i === activeStyle ? { ringColor: style.accent } as React.CSSProperties : {}}
                  >
                    <div
                      className="overflow-hidden rounded-lg"
                      style={{
                        width: THUMB_W / 2,
                        height: THUMB_H / 2,
                        outline: i === activeStyle ? `2px solid ${style.accent}` : "2px solid transparent",
                      }}
                    >
                      {/* Hidden canvas used for rendering, displayed via CSS transform */}
                      <canvas
                        ref={el => { thumbRefs.current[i] = el; }}
                        style={{
                          width: THUMB_W,
                          height: THUMB_H,
                          transform: "scale(0.5)",
                          transformOrigin: "top left",
                          display: thumbDone[i] ? "block" : "none",
                        }}
                      />
                      {(!thumbDone[i] || regenerating) && (
                        <div
                          className="flex items-center justify-center bg-[hsl(225_14%_12%)]"
                          style={{ width: THUMB_W / 2, height: THUMB_H / 2 }}
                        >
                          <Loader2 className="w-3 h-3 text-white/30 animate-spin" />
                        </div>
                      )}
                    </div>
                    <p
                      className="text-[9px] text-center mt-1 truncate"
                      style={{
                        width: THUMB_W / 2,
                        color: i === activeStyle ? style.accent : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {style.label}
                    </p>
                  </button>
                ))}
              </div>

              {/* Current tagline */}
              {taglines[activeStyle] && (
                <p className="text-[11px] text-white/30 italic text-center leading-relaxed px-2">
                  "{taglines[activeStyle]}"
                </p>
              )}

              {/* Prompt input */}
              <div className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/35 font-medium mb-1.5">Optional: describe your direction</p>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="e.g. coastal and breezy, bold and dramatic, warm tones…"
                  rows={2}
                  className="w-full bg-transparent text-white/75 text-[12px] placeholder:text-white/22 resize-none outline-none leading-relaxed"
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRegenerate(); }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {phase === "ready" && (
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
                  : <><Wand2 className="w-3.5 h-3.5 mr-1.5" />Generate 5 New</>
                }
              </Button>
              <Button
                onClick={handleDownload}
                disabled={!rendered || downloading || regenerating}
                className="flex-1 bg-[hsl(39_52%_61%)] text-[hsl(225_14%_8%)] hover:bg-[hsl(39_52%_52%)] font-semibold"
              >
                {downloading
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
                  : <><Download className="w-3.5 h-3.5 mr-1.5" />Download</>
                }
              </Button>
            </div>
            <p className="text-[10px] text-white/20 text-center">
              1080 × 1920 px · Instagram Stories & Reels
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
