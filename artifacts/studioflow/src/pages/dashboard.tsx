import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import Layout from "@/components/Layout";
import {
  useGetDashboardSummary,
  useListProjects,
  useListRecentGalleries,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight, ImageIcon, Zap, Users, Share2,
  FolderOpen, Sparkles, SunMedium, Home, Layers, Settings
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:    { label: "Active",    className: "badge-active" },
  draft:     { label: "Draft",     className: "badge-draft" },
  delivered: { label: "Delivered", className: "badge-delivered" },
  archived:  { label: "Archived",  className: "badge-archived" },
  completed: { label: "Completed", className: "badge-completed" },
  paid:      { label: "Paid",      className: "badge-paid" },
};

const AI_TOOLS = [
  { label: "Virtual Staging",  icon: Home,       href: "/projects", desc: "Add furniture" },
  { label: "Sky Replace",      icon: SunMedium,  href: "/projects", desc: "Brighten exteriors" },
  { label: "Day to Dusk",      icon: Layers,     href: "/projects", desc: "Twilight effect" },
  { label: "Declutter",        icon: Sparkles,   href: "/projects", desc: "Remove objects" },
];

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes} minutes ago`;
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  if (weeks < 5) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-[0.10em] mb-3">
      {children}
    </p>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "badge-draft" };
  return (
    <span className={cn("text-[11px] font-medium rounded px-2 py-0.5", cfg.className)}>
      {cfg.label}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: projects, isLoading: projectsLoading } = useListProjects({});
  const { data: recentGalleries, isLoading: galleriesLoading } = useListRecentGalleries();

  const firstName = user?.name?.split(" ")[0] ?? "there";

  // Featured = most recent active project
  const activeProject = projects?.find(p => p.status === "active") ?? projects?.[0];
  const recentProjects = projects?.slice(0, 5) ?? [];

  // Build a projectId → name lookup from the projects list
  const projectNameMap = new Map<number, string>(
    (projects ?? []).map(p => [p.id, p.name])
  );

  return (
    <Layout title="Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="p-6 max-w-[1120px] mx-auto space-y-6">

        {/* ── Page heading ── */}
        <div className="flex items-end justify-between pb-1">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.10em] font-medium mb-1.5">
              Welcome back
            </p>
            <h1 className="font-serif text-[32px] font-semibold leading-none tracking-tight text-foreground">
              {firstName}
            </h1>
          </div>
          <button
            onClick={() => setLocation("/projects/new")}
            data-testid="button-new-project"
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            <span className="text-base leading-none">+</span> New Project
          </button>
        </div>

        {/* ── Featured active project ── */}
        {projectsLoading ? (
          <Skeleton className="h-44 rounded-lg" />
        ) : activeProject ? (
          <Link href={`/projects/${activeProject.id}`}>
          <div className="rounded-lg border border-border bg-card overflow-hidden flex cursor-pointer hover:border-primary/30 transition-colors">
            {/* Image zone */}
            <div className="w-[210px] shrink-0 relative min-h-[168px] bg-muted overflow-hidden">
              {activeProject.coverImageUrl ? (
                <img src={activeProject.coverImageUrl} alt={activeProject.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-end p-4"
                  style={{ background: "linear-gradient(145deg, hsl(225 15% 14%), hsl(225 15% 10%))" }}>
                  <ImageIcon className="w-6 h-6 text-muted-foreground/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <p className="text-[9.5px] text-primary uppercase tracking-[0.12em] font-semibold mb-1">Active Shoot</p>
                <p className="font-serif text-[15px] text-white font-medium leading-tight">{activeProject.name}</p>
                {activeProject.address && (
                  <p className="text-[11px] text-white/60 mt-0.5">{activeProject.address}</p>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 p-5 flex flex-col justify-between border-r border-border">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge status={activeProject.status} />
                  {activeProject.propertyType && (
                    <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded capitalize">
                      {activeProject.propertyType}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {activeProject.mediaCount ?? 0} media assets
                  {activeProject.shootDate && ` · Shoot: ${activeProject.shootDate}`}
                </p>
              </div>
              <div>
                <div className="flex justify-between text-[11.5px] mb-1.5">
                  <span className="text-muted-foreground">Delivery progress</span>
                  <span className="text-primary font-medium">
                    {activeProject.status === "delivered" ? "100%" : activeProject.status === "active" ? "65%" : "—"}
                  </span>
                </div>
                <div className="h-[3px] bg-border rounded-full">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: activeProject.status === "delivered" ? "100%" : activeProject.status === "active" ? "65%" : "20%" }}
                  />
                </div>
              </div>
            </div>

            {/* Next steps / action column */}
            <div className="w-[155px] shrink-0 p-5 flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.1em] font-semibold mb-3">Next Steps</p>
                {["Edit & color grade", "Run AI tools", "Share gallery"].map((step, i) => (
                  <div key={step} className="flex items-start gap-2 mb-2">
                    <div className={cn(
                      "w-[5px] h-[5px] rounded-full mt-[5px] shrink-0",
                      i === 0 ? "bg-primary" : "bg-border"
                    )} />
                    <span className={cn("text-[11.5px] leading-tight", i === 0 ? "text-foreground" : "text-muted-foreground/60")}>{step}</span>
                  </div>
                ))}
              </div>
              <div className="w-full text-center text-[12px] font-medium text-primary border border-primary/25 rounded-md py-2 hover:bg-primary/10 transition-colors">
                Open Project
              </div>
            </div>
          </div>
          </Link>
        ) : (
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <FolderOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-foreground mb-1">No projects yet</p>
            <p className="text-[13px] text-muted-foreground mb-4">Create your first project to get started</p>
            <button
              onClick={() => setLocation("/projects/new")}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-opacity"
            >
              + New Project
            </button>
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="grid lg:grid-cols-[1fr_296px] gap-5">

          {/* Left — Recent projects */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Recent Projects</SectionLabel>
              <Link href="/projects">
                <span className="text-[12px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors">See all</span>
              </Link>
            </div>

            {projectsLoading ? (
              <div className="space-y-1.5">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <ImageIcon className="w-7 h-7 text-muted-foreground/25 mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">No projects yet</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden bg-card">
                {recentProjects.map((project, i) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div
                      data-testid={`project-row-${project.id}`}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer",
                        i < recentProjects.length - 1 && "border-b border-border/60"
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0">
                        {project.coverImageUrl ? (
                          <img src={project.coverImageUrl} alt={project.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-medium text-foreground truncate">{project.name}</p>
                        <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">
                          {project.mediaCount ?? 0} assets
                        </p>
                      </div>

                      <StatusBadge status={project.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* ── Stats strip ── */}
            <div className="grid grid-cols-4 gap-3 mt-5">
              {[
                { label: "Projects", value: summaryLoading ? "–" : String(summary?.totalProjects ?? 0), icon: FolderOpen },
                { label: "Assets", value: summaryLoading ? "–" : String(summary?.totalMediaAssets ?? 0), icon: ImageIcon },
                { label: "AI Jobs", value: summaryLoading ? "–" : String(summary?.aiJobsThisMonth ?? 0), icon: Zap },
                { label: "Clients", value: summaryLoading ? "–" : String(summary?.totalClients ?? 0), icon: Users },
              ].map(stat => (
                <div key={stat.label} className="rounded-lg border border-border bg-card p-4" data-testid={`stat-${stat.label.toLowerCase()}`}>
                  <stat.icon className="w-3.5 h-3.5 text-primary mb-2.5" />
                  <p className="font-serif text-[22px] font-medium text-foreground leading-none mb-1">
                    {summaryLoading ? <Skeleton className="h-6 w-10 inline-block" /> : stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Client Galleries */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Client Galleries</SectionLabel>
                <Link href="/projects">
                  <span className="text-[12px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Manage</span>
                </Link>
              </div>

              {galleriesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 rounded-md" />
                  <Skeleton className="h-14 rounded-md" />
                </div>
              ) : !recentGalleries || recentGalleries.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-5 text-center">
                  <Share2 className="w-6 h-6 text-muted-foreground/25 mx-auto mb-2" />
                  <p className="text-[12.5px] text-muted-foreground">No galleries shared yet</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden bg-card">
                  {recentGalleries.map((g, i) => (
                    <div
                      key={g.id}
                      onClick={() => setLocation(`/projects/${g.projectId}/gallery/${g.id}`)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer",
                        i > 0 && "border-t border-border/60"
                      )}
                    >
                      <div>
                        <p className="text-[13px] font-medium text-foreground">
                          {projectNameMap.get(g.projectId) ?? g.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Shared {formatRelativeTime(g.createdAt)}
                        </p>
                      </div>
                      <span className="text-[11.5px] font-medium text-primary">
                        {g.viewCount} {g.viewCount === 1 ? "view" : "views"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Tools */}
            <div>
              <SectionLabel>AI Tools</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {AI_TOOLS.map(tool => (
                  <Link key={tool.label} href={tool.href}>
                    <div
                      data-testid={`ai-tool-${tool.label.toLowerCase().replace(/ /g, "-")}`}
                      className="rounded-lg border border-border bg-card p-3.5 hover:bg-muted/40 hover:border-primary/25 transition-all cursor-pointer group"
                    >
                      <tool.icon className="w-4 h-4 text-primary mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-[12.5px] font-medium text-foreground leading-tight">{tool.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{tool.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick nav */}
            <div>
              <SectionLabel>Quick Access</SectionLabel>
              <div className="rounded-lg border border-border overflow-hidden bg-card">
                {[
                  { label: "View All Projects", icon: FolderOpen, href: "/projects" },
                  { label: "Manage Clients", icon: Users, href: "/clients" },
                  { label: "Account & Plan", icon: Settings, href: "/settings" },
                ].map((a, i) => (
                  <Link key={a.href} href={a.href}>
                    <div
                      data-testid={`quick-action-${a.label.toLowerCase().replace(/ /g, "-")}`}
                      className={cn(
                        "flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer group",
                        i < 2 && "border-b border-border/60"
                      )}
                    >
                      <div className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80">
                        <a.icon className="w-3.5 h-3.5 text-primary" />
                        {a.label}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
