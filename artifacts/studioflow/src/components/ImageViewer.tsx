import { useState, useEffect, useCallback } from "react";
import { useCreateAiJob, useGetAiJob } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  X, ChevronLeft, ChevronRight, Download, Zap, RotateCcw,
  RefreshCw, Home, SunMedium, Layers, Sparkles, ImageIcon,
  Loader2, Check, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface MediaItem {
  id: number;
  filename: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  processedUrl?: string | null;
  mediaType: string;
}

interface ImageViewerProps {
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: "virtual_staging",
    label: "Virtual Staging",
    icon: Home,
    credits: 5,
    description: "Digitally furnish empty rooms with your choice of style.",
  },
  {
    id: "sky_replacement",
    label: "Sky Replacement",
    icon: SunMedium,
    credits: 2,
    description: "Replace overcast skies with vivid blue skies or dramatic sunsets.",
  },
  {
    id: "day_to_dusk",
    label: "Day to Dusk",
    icon: Layers,
    credits: 3,
    description: "Transform daylight exteriors into stunning twilight scenes.",
  },
  {
    id: "declutter",
    label: "Declutter",
    icon: Sparkles,
    credits: 3,
    description: "Remove clutter and distracting objects for clean, magazine-ready shots.",
  },
  {
    id: "object_removal",
    label: "Object Removal",
    icon: ImageIcon,
    credits: 2,
    description: "Remove specific unwanted objects like bins, cars, or signage.",
  },
] as const;

type ToolId = typeof TOOLS[number]["id"];

const STAGING_STYLES = [
  { id: "modern", label: "Modern", desc: "Clean lines, neutral palette" },
  { id: "scandinavian", label: "Scandinavian", desc: "Light woods, minimalist" },
  { id: "luxury", label: "Luxury", desc: "Rich textures, statement pieces" },
  { id: "coastal", label: "Coastal", desc: "Relaxed, light and airy" },
  { id: "mid_century", label: "Mid-Century", desc: "Retro geometry, warm tones" },
  { id: "industrial", label: "Industrial", desc: "Raw materials, bold contrasts" },
  { id: "custom", label: "Custom Prompt", desc: "Describe your own style" },
];

type PanelState = "picker" | "configuring" | "processing" | "done";

// ── Progress bar ───────────────────────────────────────────────────────────

function ProgressRing({ percent }: { percent: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto 12px" }}>
        <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle
            cx="36" cy="36" r="30" fill="none"
            stroke="#C9A96E" strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 30}`}
            strokeDashoffset={`${2 * Math.PI * 30 * (1 - percent / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#C9A96E" }}>
          {Math.round(percent)}%
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "#7A7C84" }}>Processing…</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ImageViewer({ media, initialIndex, onClose }: ImageViewerProps) {
  const { toast } = useToast();

  // Navigation
  const [index, setIndex] = useState(initialIndex);
  const item = media[index];

  // AI panel state
  const [panelState, setPanelState] = useState<PanelState>("picker");
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  const [stagingStyle, setStagingStyle] = useState("modern");
  const [customPrompt, setCustomPrompt] = useState("");
  const [jobId, setJobId] = useState<number | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [showingOriginal, setShowingOriginal] = useState(false);

  const createAiJob = useCreateAiJob();

  // Poll the job while processing
  const isPolling = jobId !== null && panelState === "processing";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = useGetAiJob(jobId ?? 0, {
    query: {
      enabled: isPolling,
      refetchInterval: isPolling ? 2500 : false,
    } as any,
  });

  // Transition to done when job completes
  useEffect(() => {
    if (job?.status === "completed" && job.resultUrl) {
      setResultUrl(job.resultUrl);
      setPanelState("done");
      setShowingOriginal(false);
    } else if (job?.status === "failed") {
      toast({ title: "AI processing failed", variant: "destructive" });
      setPanelState("configuring");
    }
  }, [job?.status, job?.resultUrl]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, media.length]);

  // Reset AI state when navigating to another image
  const navigate = useCallback((dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= media.length) return;
    setIndex(next);
    setPanelState("picker");
    setSelectedTool(null);
    setJobId(null);
    setResultUrl(null);
    setShowingOriginal(false);
  }, [index, media.length]);

  const selectTool = (id: ToolId) => {
    setSelectedTool(id);
    setPanelState("configuring");
  };

  const runJob = () => {
    if (!item) return;
    const settings: Record<string, string> = {};
    if (selectedTool === "virtual_staging") {
      if (stagingStyle === "custom") {
        settings.customPrompt = customPrompt;
      } else {
        settings.style = stagingStyle;
      }
    }
    createAiJob.mutate({
      mediaId: item.id,
      data: {
        jobType: selectedTool as "sky_replacement" | "virtual_staging" | "declutter" | "day_to_dusk" | "hdr_enhancement" | "object_removal" | "color_grading" | "furniture_replacement",
        settings,
      },
    }, {
      onSuccess: (newJob) => {
        setJobId(newJob.id);
        setPanelState("processing");
      },
      onError: () => {
        toast({ title: "Failed to start AI job", variant: "destructive" });
      },
    });
  };

  const handleUndo = () => {
    setShowingOriginal(true);
  };

  const handleRestore = () => {
    setShowingOriginal(false);
  };

  const handleRegenerate = () => {
    if (!item || !selectedTool) return;
    setJobId(null);
    setResultUrl(null);
    setShowingOriginal(false);
    setPanelState("configuring");
  };

  const handleDownload = () => {
    const url = displayUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = item?.filename ?? "image";
    a.target = "_blank";
    a.click();
  };

  const toolInfo = TOOLS.find(t => t.id === selectedTool);
  const displayUrl = showingOriginal
    ? (item?.originalUrl ?? item?.thumbnailUrl)
    : (resultUrl ?? item?.originalUrl ?? item?.thumbnailUrl);
  const progress = job?.progressPercent ?? 0;

  // ── Overlay backdrop ────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(8, 9, 12, 0.97)",
        display: "flex", flexDirection: "column",
        fontFamily: "Inter, sans-serif",
      }}
      data-testid="image-viewer"
    >
      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#6A6C72", cursor: "pointer", display: "flex", padding: 4, borderRadius: 6, marginRight: 4 }}
          data-testid="viewer-close">
          <X size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: "#D0CEC9" }}>{item?.filename}</p>
          <p style={{ fontSize: 11, color: "#4A4C52", marginTop: 1 }}>{index + 1} of {media.length}</p>
        </div>
        {panelState === "done" && !showingOriginal && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "#C9A96E", background: "rgba(201,169,110,0.12)", border: "1px solid rgba(201,169,110,0.3)", borderRadius: 99, padding: "3px 10px", letterSpacing: "0.05em" }}>
            AI Enhanced
          </span>
        )}
        <button onClick={handleDownload} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "#A8A6A2", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, fontSize: 12.5 }}
          data-testid="viewer-download">
          <Download size={13} /> Download
        </button>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── Image area ── */}
        <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>

          {/* Prev / Next */}
          {index > 0 && (
            <button
              onClick={() => navigate(-1)}
              data-testid="viewer-prev"
              style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", color: "#E6E3DE", zIndex: 10,
              }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {index < media.length - 1 && (
            <button
              onClick={() => navigate(1)}
              data-testid="viewer-next"
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", color: "#E6E3DE", zIndex: 10,
              }}
            >
              <ChevronRight size={20} />
            </button>
          )}

          {/* Image */}
          <img
            key={`${item?.id}-${displayUrl}`}
            src={displayUrl ?? ""}
            alt={item?.filename}
            style={{
              maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
              borderRadius: 6, boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              transition: "opacity 0.3s ease",
            }}
          />

          {/* Original label when viewing original */}
          {showingOriginal && panelState === "done" && (
            <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", color: "#A8A6A2", fontSize: 12, padding: "5px 14px", borderRadius: 99, backdropFilter: "blur(8px)" }}>
              Original — not enhanced
            </div>
          )}
        </div>

        {/* ── AI Tools Panel ── */}
        <div style={{
          width: 300, borderLeft: "1px solid rgba(255,255,255,0.07)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          background: "#0D0F14", flexShrink: 0,
        }}>

          {/* Panel header */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Zap size={14} color="#C9A96E" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#D0CEC9" }}>AI Tools</span>
            {(panelState === "configuring" || panelState === "processing" || panelState === "done") && (
              <button
                onClick={() => { setPanelState("picker"); setSelectedTool(null); setJobId(null); setResultUrl(null); setShowingOriginal(false); }}
                style={{ marginLeft: "auto", background: "none", border: "none", color: "#5A5C62", cursor: "pointer", fontSize: 11.5 }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>

            {/* ── TOOL PICKER ── */}
            {panelState === "picker" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ fontSize: 11, color: "#4A4C52", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                  Select Enhancement
                </p>
                {TOOLS.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => selectTool(tool.id)}
                    data-testid={`ai-tool-btn-${tool.id}`}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 7, padding: "10px 12px", cursor: "pointer", textAlign: "left",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,169,110,0.3)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,169,110,0.05)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(201,169,110,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <tool.icon size={13} color="#C9A96E" />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#D0CEC9", marginBottom: 2 }}>{tool.label}</p>
                      <p style={{ fontSize: 11.5, color: "#5A5C62", lineHeight: 1.4 }}>{tool.description}</p>
                      <p style={{ fontSize: 10.5, color: "#C9A96E", marginTop: 4 }}>{tool.credits} credits</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── CONFIGURING ── */}
            {panelState === "configuring" && toolInfo && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(201,169,110,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <toolInfo.icon size={13} color="#C9A96E" />
                  </div>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: "#E0DDD8" }}>{toolInfo.label}</p>
                    <p style={{ fontSize: 10.5, color: "#C9A96E" }}>{toolInfo.credits} credits</p>
                  </div>
                </div>
                <p style={{ fontSize: 12.5, color: "#5A5C62", lineHeight: 1.55, marginBottom: 16 }}>{toolInfo.description}</p>

                {/* Virtual staging options */}
                {selectedTool === "virtual_staging" && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#6A6C72", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                      Furniture Style
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {STAGING_STYLES.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setStagingStyle(s.id)}
                          data-testid={`staging-style-${s.id}`}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 10px", borderRadius: 6, cursor: "pointer", textAlign: "left",
                            background: stagingStyle === s.id ? "rgba(201,169,110,0.1)" : "rgba(255,255,255,0.03)",
                            border: stagingStyle === s.id ? "1px solid rgba(201,169,110,0.4)" : "1px solid rgba(255,255,255,0.07)",
                            transition: "all 0.15s",
                          }}
                        >
                          <div>
                            <p style={{ fontSize: 12.5, fontWeight: 500, color: stagingStyle === s.id ? "#C9A96E" : "#C0BDB8" }}>{s.label}</p>
                            {s.id !== "custom" && <p style={{ fontSize: 11, color: "#4A4C52", marginTop: 1 }}>{s.desc}</p>}
                          </div>
                          {stagingStyle === s.id && <Check size={12} color="#C9A96E" />}
                        </button>
                      ))}
                    </div>

                    {stagingStyle === "custom" && (
                      <div style={{ marginTop: 10 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#6A6C72", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                          Describe the style
                        </p>
                        <textarea
                          value={customPrompt}
                          onChange={e => setCustomPrompt(e.target.value)}
                          placeholder="e.g. Bohemian living room with rattan furniture, warm earth tones and lots of plants…"
                          data-testid="staging-custom-prompt"
                          style={{
                            width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6, color: "#D0CEC9", fontSize: 12.5, padding: "9px 10px",
                            resize: "vertical", minHeight: 72, fontFamily: "Inter, sans-serif", outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={runJob}
                  disabled={createAiJob.isPending || (selectedTool === "virtual_staging" && stagingStyle === "custom" && !customPrompt.trim())}
                  data-testid="viewer-run-ai"
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 6, border: "none",
                    background: "#C9A96E", color: "#111316", fontSize: 13.5, fontWeight: 600,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    opacity: createAiJob.isPending ? 0.7 : 1,
                  }}
                >
                  {createAiJob.isPending
                    ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Starting…</>
                    : <><Zap size={14} /> Run Enhancement</>
                  }
                </button>
              </div>
            )}

            {/* ── PROCESSING ── */}
            {panelState === "processing" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 32 }}>
                <ProgressRing percent={progress} />
                <p style={{ marginTop: 16, fontSize: 13, fontWeight: 500, color: "#D0CEC9", textAlign: "center" }}>
                  {toolInfo?.label ?? "AI Enhancement"}
                </p>
                <p style={{ fontSize: 12, color: "#4A4C52", marginTop: 4, textAlign: "center" }}>
                  This takes about 15–30 seconds
                </p>
                <div style={{ marginTop: 20, width: "100%", height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "linear-gradient(90deg, #C9A96E, #E8C88A)", borderRadius: 99, width: `${progress}%`, transition: "width 0.5s ease" }} />
                </div>
              </div>
            )}

            {/* ── DONE ── */}
            {panelState === "done" && (
              <div>
                <div style={{ background: "rgba(62,140,106,0.1)", border: "1px solid rgba(62,140,106,0.3)", borderRadius: 7, padding: "10px 12px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Check size={13} color="#3E8C6A" />
                  <span style={{ fontSize: 12.5, color: "#3E8C6A", fontWeight: 500 }}>Enhancement applied</span>
                </div>

                <p style={{ fontSize: 12, color: "#4A4C52", marginBottom: 14, lineHeight: 1.5 }}>
                  Your image has been enhanced with {toolInfo?.label}. Download it or undo to revert.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {!showingOriginal ? (
                    <button
                      onClick={handleUndo}
                      data-testid="viewer-undo"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "9px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent", color: "#A8A6A2", cursor: "pointer", fontSize: 13, fontWeight: 500,
                      }}
                    >
                      <RotateCcw size={13} /> Show Original
                    </button>
                  ) : (
                    <button
                      onClick={handleRestore}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "9px", borderRadius: 6, border: "1px solid rgba(201,169,110,0.3)",
                        background: "rgba(201,169,110,0.08)", color: "#C9A96E", cursor: "pointer", fontSize: 13, fontWeight: 500,
                      }}
                    >
                      <Check size={13} /> Show Enhanced
                    </button>
                  )}

                  <button
                    onClick={handleRegenerate}
                    data-testid="viewer-regenerate"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "9px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
                      background: "transparent", color: "#A8A6A2", cursor: "pointer", fontSize: 13, fontWeight: 500,
                    }}
                  >
                    <RefreshCw size={13} /> Regenerate
                  </button>

                  <button
                    onClick={handleDownload}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "10px", borderRadius: 6, border: "none",
                      background: "#C9A96E", color: "#111316", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
                    }}
                  >
                    <Download size={13} /> Download Enhanced
                  </button>
                </div>

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: 11, color: "#3A3C42", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Try Another Tool</p>
                  <button
                    onClick={() => { setPanelState("picker"); setSelectedTool(null); setJobId(null); setResultUrl(null); setShowingOriginal(false); }}
                    style={{ fontSize: 12.5, color: "#5A5C62", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    ← Back to all tools
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom filmstrip ── */}
      {media.length > 1 && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "8px 16px", display: "flex", gap: 6, overflowX: "auto", flexShrink: 0,
          background: "#09090C",
        }}>
          {media.map((m, i) => (
            <button
              key={m.id}
              onClick={() => { setIndex(i); setPanelState("picker"); setSelectedTool(null); setJobId(null); setResultUrl(null); setShowingOriginal(false); }}
              style={{
                width: 52, height: 38, borderRadius: 4, overflow: "hidden", flexShrink: 0, cursor: "pointer",
                border: i === index ? "2px solid #C9A96E" : "2px solid transparent",
                padding: 0, background: "none",
                transition: "border-color 0.15s",
              }}
            >
              <img
                src={m.thumbnailUrl ?? m.originalUrl}
                alt={m.filename}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
