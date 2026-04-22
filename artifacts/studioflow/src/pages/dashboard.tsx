import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import Layout from "@/components/Layout";
import { useGetDashboardSummary, useGetRecentActivity, useGetStorageUsage } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen, ImageIcon, Cpu, Share2, Users, HardDrive,
  Plus, ArrowRight, Upload, Zap, TrendingUp
} from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: storage } = useGetStorageUsage();

  const stats = [
    { label: "Total Projects", value: summary?.totalProjects ?? 0, icon: FolderOpen, color: "text-primary", sub: `${summary?.activeProjects ?? 0} active` },
    { label: "Media Assets", value: summary?.totalMediaAssets ?? 0, icon: ImageIcon, color: "text-accent", sub: "photos & videos" },
    { label: "AI Jobs", value: summary?.aiJobsThisMonth ?? 0, icon: Cpu, color: "text-violet-500", sub: "this month" },
    { label: "Active Galleries", value: summary?.activeGalleries ?? 0, icon: Share2, color: "text-emerald-500", sub: "shared links" },
    { label: "Clients", value: summary?.totalClients ?? 0, icon: Users, color: "text-blue-500", sub: "total contacts" },
    { label: "Storage Used", value: summary ? `${summary.storageUsedMb < 1024 ? `${summary.storageUsedMb.toFixed(0)} MB` : `${(summary.storageUsedMb / 1024).toFixed(1)} GB`}` : "–", icon: HardDrive, color: "text-orange-500", sub: "of plan limit" },
  ];

  const storagePercent = storage ? Math.min(100, (storage.totalUsedMb / storage.limitMb) * 100) : 0;

  return (
    <Layout title="Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="p-6 space-y-6">
        {/* Welcome header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Good morning, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Here's what's happening in your studio</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/projects")} data-testid="button-view-projects">
              <FolderOpen className="w-4 h-4 mr-2" />
              Projects
            </Button>
            <Button size="sm" onClick={() => setLocation("/projects/new")} data-testid="button-new-project">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="relative overflow-hidden" data-testid={`stat-${stat.label.toLowerCase().replace(/ /g, '-')}`}>
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg bg-current/10 flex items-center justify-center mb-3 ${stat.color}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                {summaryLoading ? (
                  <Skeleton className="h-7 w-16 mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                )}
                <p className="text-xs font-medium text-foreground/70">{stat.label}</p>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex gap-3 items-center">
                        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activity && activity.length > 0 ? (
                  <div className="space-y-3">
                    {activity.slice(0, 8).map(item => (
                      <div key={item.id} className="flex gap-3 items-center py-1.5" data-testid={`activity-item-${item.id}`}>
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Upload className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {item.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No recent activity. Start by uploading photos to a project.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Storage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Storage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">
                    {storage ? `${(storage.totalUsedMb / 1024).toFixed(1)} GB of ${(storage.limitMb / 1024).toFixed(0)} GB` : "–"}
                  </span>
                </div>
                <Progress value={storagePercent} className="h-2" data-testid="storage-progress" />
                <div className="space-y-1.5">
                  {storage?.byProject.slice(0, 3).map(p => (
                    <div key={p.projectId} className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate mr-2">{p.projectName}</span>
                      <span>{p.usedMb.toFixed(0)} MB</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "New Project", icon: Plus, href: "/projects/new" },
                  { label: "AI Tools", icon: Zap, href: "/projects" },
                  { label: "View Clients", icon: Users, href: "/clients" },
                ].map(a => (
                  <Link key={a.href} href={a.href}>
                    <div
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors cursor-pointer group"
                      data-testid={`quick-action-${a.label.toLowerCase().replace(/ /g, '-')}`}
                    >
                      <div className="flex items-center gap-2.5 text-sm font-medium">
                        <a.icon className="w-4 h-4 text-primary" />
                        {a.label}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
