import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import {
  Camera, FolderOpen, Share2, Zap, Eye, Shield, ArrowRight,
  Check, ImageIcon, Home, SunMedium, Layers, Sparkles, Star,
  ChevronRight, Play, Images, BarChart3, Globe, Menu, X
} from "lucide-react";

// ── Responsive styles ───────────────────────────────────────────────────────

const LANDING_STYLES = `
  .landing-header { padding: 0 40px; }
  .landing-nav-links { display: flex; }
  .landing-section-pad { padding: 80px 40px; }
  .landing-section-pad-alt { padding: 80px 40px; }
  .landing-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
  .landing-grid-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
  .landing-grid-3col-lg { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
  .landing-footer { display: flex; justify-content: space-between; align-items: center; padding: 28px 40px; }
  .landing-footer-links { display: flex; gap: 24px; }
  .landing-cta-row { display: flex; gap: 12px; align-items: center; }
  .landing-hero-h1 { font-size: 50px; }
  .landing-hero-badges { display: flex; gap: 24px; }
  .landing-ai-tools-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .landing-mobile-menu-btn { display: none; }
  .landing-nav-cta { display: flex; }
  .landing-hero-section { max-width: 1200px; margin: 0 auto; }

  @media (max-width: 768px) {
    .landing-header { padding: 0 16px; }
    .landing-nav-links { display: none !important; }
    .landing-nav-cta { display: none !important; }
    .landing-mobile-menu-btn { display: flex !important; }
    .landing-section-pad { padding: 48px 20px; }
    .landing-section-pad-alt { padding: 48px 20px; }
    .landing-grid-2col { grid-template-columns: 1fr !important; gap: 36px !important; }
    .landing-grid-3col { grid-template-columns: 1fr !important; gap: 16px !important; }
    .landing-grid-3col-lg { grid-template-columns: 1fr !important; gap: 28px !important; }
    .landing-footer { flex-direction: column !important; gap: 16px !important; text-align: center; padding: 24px 20px !important; }
    .landing-footer-links { flex-wrap: wrap; justify-content: center; gap: 16px !important; }
    .landing-cta-row { flex-direction: column; align-items: stretch; }
    .landing-cta-row a, .landing-cta-row span { text-align: center; justify-content: center; }
    .landing-hero-h1 { font-size: 32px !important; }
    .landing-hero-badges { flex-wrap: wrap; gap: 12px !important; }
    .landing-ai-tools-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
    .landing-mobile-nav { display: flex; flex-direction: column; gap: 8px; padding: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
  }

  @media (min-width: 769px) {
    .landing-mobile-nav { display: none !important; }
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function GoldDivider() {
  return <div style={{ width: 40, height: 2, background: "#C9A96E", borderRadius: 1, margin: "0 auto 28px" }} />;
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#C9A96E", marginBottom: 12 }}>
      {children}
    </p>
  );
}

// ── Property card mock (hero app preview) ─────────────────────────────────

function AppPreviewMock() {
  return (
    <div style={{
      background: "#111316", borderRadius: 10, overflow: "hidden",
      border: "1px solid #222429", boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
      fontFamily: "Inter, sans-serif", maxWidth: "100%",
    }}>
      {/* Mock header */}
      <div style={{ background: "#0C0E13", borderBottom: "1px solid #1A1D24", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, background: "#1C1F28", borderRadius: 4, height: 22, display: "flex", alignItems: "center", paddingLeft: 8 }}>
          <span style={{ fontSize: 10, color: "#5A5C62" }}>realdock.co/dashboard</span>
        </div>
      </div>

      {/* Mock app shell */}
      <div style={{ display: "flex", height: 340 }}>
        {/* Sidebar */}
        <div style={{ width: 130, background: "#0C0E13", borderRight: "1px solid #1A1D24", padding: "16px 10px", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E6E3DE", marginBottom: 20, paddingLeft: 4 }}>RealDock</div>
          {["Dashboard", "Projects", "Galleries", "Clients", "AI Tools"].map((item, i) => (
            <div key={item} style={{
              padding: "7px 10px", borderRadius: 4, marginBottom: 2, fontSize: 11,
              background: i === 0 ? "rgba(201,169,110,0.12)" : "transparent",
              color: i === 0 ? "#C9A96E" : "#5A6070",
              borderLeft: i === 0 ? "2px solid #C9A96E" : "2px solid transparent",
              fontWeight: i === 0 ? 500 : 400,
            }}>{item}</div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "16px 18px", overflow: "hidden" }}>
          <div style={{ fontSize: 10, color: "#5A5C62", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#E6E3DE", marginBottom: 14 }}>Alex Rivera</div>

          {/* Featured project panel */}
          <div style={{ background: "#18191C", borderRadius: 7, border: "1px solid #1E2229", marginBottom: 12, display: "flex", overflow: "hidden", height: 90 }}>
            <div style={{ width: 100, background: "linear-gradient(145deg, #2A2D35, #1C1F28)", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(12,14,19,0.8) 100%)" }} />
              <div style={{ position: "absolute", bottom: 8, left: 8 }}>
                <div style={{ fontSize: 7.5, color: "#C9A96E", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>Active</div>
                <div style={{ fontSize: 10, color: "#E6E3DE", fontFamily: "'Playfair Display', serif" }}>147 Maple Dr</div>
              </div>
            </div>
            <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: "#C9A96E", background: "rgba(201,169,110,0.15)", borderRadius: 3, padding: "2px 6px" }}>In Progress</span>
                </div>
                <div style={{ fontSize: 9.5, color: "#5A5C62" }}>48 photos · 12 edited · Sonoma, CA</div>
              </div>
              <div style={{ height: 2, background: "#1E2229", borderRadius: 99 }}>
                <div style={{ width: "65%", height: "100%", background: "#C9A96E", borderRadius: 99 }} />
              </div>
            </div>
          </div>

          {/* Project rows */}
          {[
            { name: "218 Ocean Blvd, Malibu", s: "Delivered", sc: "#3E8C6A" },
            { name: "73 Vista Peak, Sedona", s: "Editing", sc: "#D4A828" },
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#18191C", borderRadius: 5, marginBottom: 4, border: "1px solid #1E2229" }}>
              <div style={{ width: 28, height: 28, borderRadius: 4, background: `hsl(${210 + i * 30}, 15%, ${22 + i * 4}%)`, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#D0CEC9", fontWeight: 500 }}>{p.name}</div>
              </div>
              <span style={{ fontSize: 9, color: p.sc, background: p.sc + "18", borderRadius: 3, padding: "2px 6px" }}>{p.s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI Tools preview ───────────────────────────────────────────────────────

function AIToolsMock() {
  const tools = [
    { label: "Virtual Staging", before: "linear-gradient(135deg,#1a1d24,#2a2d36)", after: "linear-gradient(135deg,#2d3520,#4a5530)", tag: "Staged" },
    { label: "Sky Replace", before: "linear-gradient(180deg,#2a3040 0%,#3a4555 60%,#5a6a80 100%)", after: "linear-gradient(180deg,#1a2535 0%,#2a4a80 30%,#6aadff 100%)", tag: "Enhanced" },
    { label: "Day to Dusk", before: "linear-gradient(180deg,#6a9acc 0%,#c9d4de 80%,#b8a090 100%)", after: "linear-gradient(180deg,#0a0e1a 0%,#1a2040 30%,#c9803020 100%)", tag: "Dusk" },
  ];
  return (
    <div className="landing-ai-tools-grid">
      {tools.map((t, i) => (
        <div key={i} style={{ background: "#18191C", borderRadius: 8, overflow: "hidden", border: "1px solid #1E2229" }}>
          <div style={{ display: "flex", height: 90 }}>
            <div style={{ flex: 1, background: t.before }} />
            <div style={{ width: 1, background: "#C9A96E40" }} />
            <div style={{ flex: 1, background: t.after }} />
          </div>
          <div style={{ padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#A8A6A2", fontWeight: 500 }}>{t.label}</span>
            <span style={{ fontSize: 10, color: "#C9A96E", background: "rgba(201,169,110,0.12)", borderRadius: 3, padding: "2px 6px" }}>{t.tag}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Gallery portal mock ────────────────────────────────────────────────────

function GalleryMock() {
  const photos = [
    "linear-gradient(135deg,#2a3540,#3d4a55)",
    "linear-gradient(145deg,#352a30,#4a3840)",
    "linear-gradient(135deg,#2a3528,#3d4a38)",
    "linear-gradient(145deg,#353028,#4a4035)",
    "linear-gradient(135deg,#283540,#384a55)",
    "linear-gradient(145deg,#302835,#40384a)",
  ];
  return (
    <div style={{ background: "#F8F6F2", borderRadius: 10, overflow: "hidden", border: "1px solid #E4E0D8", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
      {/* Portal header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #E4E0D8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: "#1C1C1E", fontWeight: 600 }}>Oakwood Residence</div>
          <div style={{ fontSize: 11, color: "#8C8881", marginTop: 2 }}>6 photos · by Alex Rivera</div>
        </div>
        <div style={{ background: "#1C1C1E", color: "#F8F6F2", borderRadius: 5, padding: "6px 12px", fontSize: 11, fontWeight: 500 }}>Listing Preview</div>
      </div>
      {/* Photo grid */}
      <div style={{ padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {photos.map((bg, i) => (
          <div key={i} style={{ height: 60, borderRadius: 5, background: bg, position: "relative" }}>
            {i === 1 && (
              <div style={{ position: "absolute", top: 5, right: 5, width: 16, height: 16, borderRadius: "50%", background: "rgba(201,169,110,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pricing ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    storage: "2 GB",
    credits: "No AI credits",
    description: "For photographers just getting started.",
    features: ["5 active projects", "Public galleries", "Standard support"],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    storage: "100 GB",
    credits: "100 AI credits/mo",
    description: "For working professionals delivering weekly.",
    features: ["20 active projects", "Public galleries", "Custom gallery domains", "Priority support"],
    cta: "Start Pro",
    highlight: true,
  },
  {
    name: "Studio",
    price: "$129",
    period: "/month",
    storage: "500 GB",
    credits: "2,000 AI credits/mo",
    description: "For high-volume studios and teams.",
    features: ["Everything in Pro", "Team members", "API access", "Dedicated support", "AI tools in client galleries"],
    cta: "Start Studio",
    highlight: false,
  },
];

// ── Main component ─────────────────────────────────────────────────────────

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#111316", color: "#E6E3DE", overflowX: "hidden" }}>
      <style>{LANDING_STYLES}</style>

      {/* ── NAV ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(17,19,22,0.95)", backdropFilter: "blur(16px)",
      }}>
        <div className="landing-header" style={{ display: "flex", alignItems: "center", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(201,169,110,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={13} color="#C9A96E" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, color: "#E6E3DE" }}>RealDock</span>
          </div>

          {/* Desktop nav links */}
          <nav className="landing-nav-links" style={{ alignItems: "center", gap: 8 }}>
            <a href="#features" style={{ fontSize: 13, color: "#6A6C72", textDecoration: "none", padding: "6px 12px" }}>Features</a>
            <a href="#how-it-works" style={{ fontSize: 13, color: "#6A6C72", textDecoration: "none", padding: "6px 12px" }}>How It Works</a>
            <a href="#pricing" style={{ fontSize: 13, color: "#6A6C72", textDecoration: "none", padding: "6px 12px" }}>Pricing</a>
            <Link href="/gallery/demo-gallery-001">
              <span style={{ fontSize: 13, color: "#C9A96E", padding: "6px 12px", cursor: "pointer", textDecoration: "none" }}>Live Demo</span>
            </Link>
          </nav>

          {/* Desktop CTA buttons */}
          <div className="landing-nav-cta" style={{ alignItems: "center", gap: 8, marginLeft: 8 }}>
            <Link href="/login">
              <span style={{ fontSize: 13, color: "#A8A6A2", padding: "7px 14px", cursor: "pointer", background: "rgba(255,255,255,0.06)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)" }} data-testid="link-login">
                Log In
              </span>
            </Link>
            <Link href="/register">
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111316", background: "#C9A96E", padding: "7px 16px", borderRadius: 6, cursor: "pointer" }} data-testid="link-register">
                Get Started Free
              </span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="landing-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(o => !o)}
            style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: "#A8A6A2" }}
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <div className="landing-mobile-nav">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 14, color: "#A8A6A2", textDecoration: "none", padding: "8px 4px" }}>Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 14, color: "#A8A6A2", textDecoration: "none", padding: "8px 4px" }}>How It Works</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 14, color: "#A8A6A2", textDecoration: "none", padding: "8px 4px" }}>Pricing</a>
            <Link href="/gallery/demo-gallery-001">
              <span onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 14, color: "#C9A96E", padding: "8px 4px", display: "block", cursor: "pointer" }}>Live Demo</span>
            </Link>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Link href="/login">
                <span style={{ flex: 1, display: "block", textAlign: "center", fontSize: 13, color: "#A8A6A2", padding: "9px 16px", background: "rgba(255,255,255,0.06)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }} data-testid="link-login">
                  Log In
                </span>
              </Link>
              <Link href="/register">
                <span style={{ flex: 1, display: "block", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#111316", background: "#C9A96E", padding: "9px 16px", borderRadius: 6, cursor: "pointer" }} data-testid="link-register">
                  Get Started Free
                </span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="landing-section-pad">
        <div className="landing-hero-section">
          <div className="landing-grid-2col" style={{ alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.25)", borderRadius: 99, padding: "5px 14px", marginBottom: 24 }}>
                <Zap size={11} color="#C9A96E" />
                <span style={{ fontSize: 11.5, color: "#C9A96E", fontWeight: 500, letterSpacing: "0.04em" }}>AI-powered real estate media platform</span>
              </div>
              <h1 className="landing-hero-h1" style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 600, lineHeight: 1.1,
                color: "#F0EDE7", marginBottom: 20, letterSpacing: "-0.02em",
              }}>
                The Command Center for Real Estate Media
              </h1>
              <p style={{ fontSize: 16, color: "#7A7C84", lineHeight: 1.7, marginBottom: 32, maxWidth: 440 }}>
                Manage shoots, automate editing with AI, and deliver breathtaking property galleries that win clients and close listings.
              </p>
              <div className="landing-cta-row" style={{ gap: 12 }}>
                <Link href="/register">
                  <span data-testid="button-cta" style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: "#C9A96E", color: "#111316", fontWeight: 600,
                    padding: "12px 24px", borderRadius: 7, fontSize: 14, cursor: "pointer",
                  }}>
                    Get Started Free <ArrowRight size={15} />
                  </span>
                </Link>
                <Link href="/gallery/demo-gallery-001">
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                    color: "#A8A6A2", fontSize: 14, cursor: "pointer",
                    padding: "12px 20px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                    <Play size={13} /> View Live Gallery
                  </span>
                </Link>
              </div>
              <div className="landing-hero-badges" style={{ marginTop: 28 }}>
                {["No credit card required", "Setup in 2 minutes", "Cancel anytime"].map(t => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#5A5C62" }}>
                    <Check size={12} color="#C9A96E" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: -30, background: "radial-gradient(ellipse at center, rgba(201,169,110,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
              <AppPreviewMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="landing-section-pad" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <SectionTag>Everything You Need</SectionTag>
            <GoldDivider />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 600, color: "#F0EDE7", letterSpacing: "-0.01em", marginBottom: 14 }}>
              Built for Real Estate Media Professionals
            </h2>
            <p style={{ fontSize: 15, color: "#6A6C72", maxWidth: 520, margin: "0 auto" }}>
              Every feature is purpose-built for photographers and videographers who work in luxury real estate.
            </p>
          </div>
        </Reveal>

        <div className="landing-grid-3col">
          {[
            {
              icon: FolderOpen, title: "Property Project Management",
              desc: "Organize every shoot by property address and client. Track delivery status, shoot dates, and assets all in one place.",
              delay: 0,
            },
            {
              icon: Share2, title: "Polished Client Galleries",
              desc: "Share stunning delivery portals with your agents. Clients can favorite, comment, and download — all branded to your studio.",
              delay: 60,
            },
            {
              icon: Zap, title: "AI Post-Processing",
              desc: "Virtual staging, sky replacement, day-to-dusk, object removal, and more — powered by AI and delivered in minutes.",
              delay: 120,
            },
            {
              icon: Shield, title: "Visibility Controls",
              desc: "Set each gallery to private, link-only, or public. Control exactly who sees your work and when.",
              delay: 0,
            },
            {
              icon: BarChart3, title: "AI Listing Preview",
              desc: "Generate luxury property listing copy and see how it looks across Zillow, Redfin, Realtor.com, and Compass — from one click.",
              delay: 60,
            },
            {
              icon: ImageIcon, title: "Media Asset Library",
              desc: "Store, organize, and access all your edited photos and videos by project. Works great on mobile for on-site review.",
              delay: 120,
            },
          ].map((f, i) => (
            <Reveal key={i} delay={f.delay}>
              <div style={{
                background: "#18191C", border: "1px solid #1E2229", borderRadius: 10,
                padding: "24px", height: "100%", boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(201,169,110,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <f.icon size={16} color="#C9A96E" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#E0DDD8", marginBottom: 8, lineHeight: 1.3 }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: "#5A5C62", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="landing-section-pad-alt" style={{ background: "#0D0F14", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionTag>Workflow</SectionTag>
              <GoldDivider />
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 600, color: "#F0EDE7", letterSpacing: "-0.01em" }}>
                From Shoot to Delivered — in Hours
              </h2>
            </div>
          </Reveal>

          <div className="landing-grid-3col-lg" style={{ position: "relative" }}>
            {[
              {
                step: "01", icon: Camera, title: "Create Your Project",
                desc: "Add the property address, client, and shoot date. Upload your RAW photos and videos directly from the field.",
              },
              {
                step: "02", icon: Zap, title: "Edit with AI Tools",
                desc: "Run virtual staging, sky replacements, or day-to-dusk transformations on your best shots — no Photoshop required.",
              },
              {
                step: "03", icon: Share2, title: "Share the Gallery",
                desc: "Deliver a polished client gallery with one link. Clients review, favorite, and approve. You close the job.",
              },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div style={{ textAlign: "center", padding: "0 16px" }}>
                  <div style={{ fontSize: 11, color: "#C9A96E", letterSpacing: "0.15em", fontWeight: 600, marginBottom: 16 }}>STEP {s.step}</div>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                    <s.icon size={20} color="#C9A96E" />
                  </div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: "#E0DDD8", marginBottom: 10 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: "#5A5C62", lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE SPOTLIGHT 1: AI Tools ── */}
      <section className="landing-section-pad" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="landing-grid-2col" style={{ alignItems: "center" }}>
          <Reveal>
            <div>
              <SectionTag>AI Post-Processing</SectionTag>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 600, color: "#F0EDE7", letterSpacing: "-0.01em", marginBottom: 16, lineHeight: 1.2 }}>
                Professional-Grade AI Editing at Your Fingertips
              </h2>
              <p style={{ fontSize: 14.5, color: "#6A6C72", lineHeight: 1.75, marginBottom: 24 }}>
                Stop spending hours in Lightroom or Photoshop. RealDock's AI tools transform your property photos in minutes — virtual staging, sky replacement, day-to-dusk conversions, and more.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { icon: Home, label: "Virtual Staging", desc: "Digitally furnish empty rooms" },
                  { icon: SunMedium, label: "Sky Replacement", desc: "Perfect blue skies every time" },
                  { icon: Layers, label: "Day to Dusk", desc: "Cinematic twilight conversions" },
                  { icon: Sparkles, label: "Declutter & Object Removal", desc: "Clean, distraction-free shots" },
                ].map(t => (
                  <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: "rgba(201,169,110,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <t.icon size={14} color="#C9A96E" />
                    </div>
                    <div>
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: "#D0CEC9" }}>{t.label}</span>
                      <span style={{ fontSize: 12.5, color: "#5A5C62", marginLeft: 8 }}>— {t.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <AIToolsMock />
          </Reveal>
        </div>
      </section>

      {/* ── FEATURE SPOTLIGHT 2: Gallery Portal ── */}
      <section className="landing-section-pad-alt" style={{ background: "#0D0F14", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="landing-grid-2col" style={{ alignItems: "center" }}>
            <Reveal delay={100}>
              <GalleryMock />
            </Reveal>
            <Reveal>
              <div>
                <SectionTag>Client Delivery</SectionTag>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 600, color: "#F0EDE7", letterSpacing: "-0.01em", marginBottom: 16, lineHeight: 1.2 }}>
                  Galleries That Impress Even the Most Discerning Clients
                </h2>
                <p style={{ fontSize: 14.5, color: "#6A6C72", lineHeight: 1.75, marginBottom: 24 }}>
                  Your clients get a beautiful, branded portal — not a messy Dropbox link. They can review selects, mark favorites, leave comments, and download finals. All from any device.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                  {[
                    { icon: Shield, label: "Visibility controls — private, link-only, or public" },
                    { icon: Eye, label: "See when clients view and interact with your gallery" },
                    { icon: Globe, label: "AI Listing Preview — generate luxury listing copy instantly" },
                    { icon: Images, label: "Full-resolution download with optional watermarking" },
                  ].map(f => (
                    <div key={f.label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ marginTop: 2, flexShrink: 0 }}>
                        <f.icon size={13} color="#C9A96E" />
                      </div>
                      <span style={{ fontSize: 13.5, color: "#7A7C84", lineHeight: 1.5 }}>{f.label}</span>
                    </div>
                  ))}
                </div>
                <Link href="/gallery/demo-gallery-001">
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    color: "#C9A96E", fontSize: 13.5, fontWeight: 500, cursor: "pointer",
                    border: "1px solid rgba(201,169,110,0.3)", borderRadius: 6, padding: "9px 16px",
                  }}>
                    View Live Gallery Demo <ChevronRight size={14} />
                  </span>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="landing-section-pad" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <SectionTag>Pricing</SectionTag>
            <GoldDivider />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 600, color: "#F0EDE7", letterSpacing: "-0.01em", marginBottom: 12 }}>
              Simple, Transparent Pricing
            </h2>
            <p style={{ fontSize: 15, color: "#6A6C72" }}>Start free. Scale when you're ready. No surprise fees.</p>
          </div>
        </Reveal>

        <div className="landing-grid-3col">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 70}>
              <div style={{
                background: plan.highlight ? "rgba(201,169,110,0.06)" : "#18191C",
                border: plan.highlight ? "1px solid rgba(201,169,110,0.4)" : "1px solid #1E2229",
                borderRadius: 10, padding: "28px 24px",
                position: "relative", overflow: "hidden",
              }}>
                {plan.highlight && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #C9A96E, transparent)" }} />
                )}
                {plan.highlight && (
                  <div style={{ position: "absolute", top: 14, right: 14, background: "#C9A96E", color: "#111316", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 99, padding: "3px 9px" }}>
                    Most Popular
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: 600, color: "#E0DDD8", marginBottom: 6 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 600, color: "#F0EDE7" }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: "#5A5C62" }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: 12.5, color: "#5A5C62", marginBottom: 20, lineHeight: 1.5 }}>{plan.description}</p>
                <div style={{ fontSize: 12, color: "#6A6C72", marginBottom: 4 }}>
                  {plan.storage} storage · {plan.credits}
                </div>
                <div style={{ height: 1, background: "#1E2229", margin: "16px 0" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Check size={12} color="#C9A96E" />
                      <span style={{ fontSize: 13, color: "#8A8C92" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/register">
                  <span style={{
                    display: "block", textAlign: "center",
                    background: plan.highlight ? "#C9A96E" : "transparent",
                    color: plan.highlight ? "#111316" : "#A8A6A2",
                    border: plan.highlight ? "none" : "1px solid #2E3140",
                    borderRadius: 6, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                  }}>
                    {plan.cta}
                  </span>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="landing-section-pad-alt" style={{ background: "#0D0F14", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 20 }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#C9A96E" color="#C9A96E" />)}
            </div>
            <blockquote style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: "italic", color: "#D8D5D0", lineHeight: 1.65, marginBottom: 28 }}>
              "RealDock gave my clients a premium experience from start to finish. They loved the galleries, listing previews, and social content tools, and the platform is incredibly easy to organize and navigate compared to anything else I’ve used."
            </blockquote>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #C9A96E, #9A7A48)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#111316" }}>E</div>
              <div style={{ textAlign: "left" }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "#D0CEC9" }}>Elena Vasquez</p>
                <p style={{ fontSize: 12, color: "#5A5C62" }}>Principal Photographer · Los Angeles</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="landing-section-pad" style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 600, color: "#F0EDE7", letterSpacing: "-0.01em", marginBottom: 16, lineHeight: 1.15 }}>
              Ready to Elevate Your Real Estate Media Business?
            </h2>
            <p style={{ fontSize: 15, color: "#6A6C72", marginBottom: 32, lineHeight: 1.6 }}>
              Join photographers and videographers who are delivering faster, looking more professional, and growing their studio with RealDock.
            </p>
            <div className="landing-cta-row" style={{ justifyContent: "center", gap: 12 }}>
              <Link href="/register">
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: "#C9A96E", color: "#111316", fontWeight: 600,
                  padding: "13px 28px", borderRadius: 7, fontSize: 14.5, cursor: "pointer",
                }}>
                  Get Started Free <ArrowRight size={15} />
                </span>
              </Link>
              <Link href="/login">
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: "#6A6C72", fontSize: 14.5, cursor: "pointer",
                  padding: "13px 24px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  Sign In
                </span>
              </Link>
            </div>
            <p style={{ marginTop: 18, fontSize: 12.5, color: "#3E4048" }}>Free plan available · No credit card required · Cancel anytime</p>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Camera size={13} color="#C9A96E" />
          <span style={{ fontSize: 15, fontWeight: 600, color: "#4A4C52" }}>RealDock</span>
        </div>
        <div className="landing-footer-links">
          {["Features", "Pricing", "Log In", "Sign Up"].map(l => (
            <span key={l} style={{ fontSize: 12.5, color: "#3E4048", cursor: "pointer" }}>{l}</span>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#3E4048" }}>© 2026 RealDock. Built for real estate media professionals.</p>
      </footer>

    </div>
  );
}
