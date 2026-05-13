import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import {
  useListProjects, useDeleteProject, getListProjectsQueryKey,
  getGetProjectQueryOptions, getListMediaQueryOptions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreVertical, Pencil, Trash2, ImageIcon, Eye, Calendar } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  draft:     "badge-draft",
  active:    "badge-active",
  delivered: "badge-delivered",
  archived:  "badge-archived",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  luxury: "Luxury",
  vacation: "Vacation",
  land: "Land",
};

const STALE = 1000 * 60 * 5;

export default function ProjectsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteProject();

  const params = statusFilter !== "all" ? { status: statusFilter } : {};
  const { data: projects, isLoading } = useListProjects(params);

  const filtered = projects?.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.address.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Project deleted" });
      },
    });
  };

  const prefetchProject = useCallback((id: number) => {
    void queryClient.prefetchQuery({ ...getGetProjectQueryOptions(id), staleTime: STALE });
    void queryClient.prefetchQuery({ ...getListMediaQueryOptions(id), staleTime: STALE });
  }, [queryClient]);

  return (
    <Layout title="Projects" breadcrumbs={[{ label: "Projects" }]}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground text-sm">{filtered.length} {filtered.length === 1 ? "project" : "projects"}</p>
          </div>
          <Button onClick={() => setLocation("/projects/new")} data-testid="button-new-project">
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-projects"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No projects found</h3>
            <p className="text-muted-foreground text-sm mb-6">Create your first project to get started</p>
            <Button onClick={() => setLocation("/projects/new")}>
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => (
              <Card
                key={project.id}
                className="group overflow-hidden hover:shadow-lg transition-all cursor-pointer border-card-border"
                data-testid={`card-project-${project.id}`}
                onMouseEnter={() => prefetchProject(project.id)}
                onClick={() => setLocation(`/projects/${project.id}`)}
              >
                {/* Cover image with permanent dimmed underlay */}
                <div className="relative h-52 bg-muted overflow-hidden">
                  {project.coverImageUrl ? (
                    <img
                      src={project.coverImageUrl}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Always-visible gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                  {/* Status badge — top left */}
                  <span className={`absolute top-3 left-3 text-[11px] font-semibold rounded px-2 py-0.5 ${STATUS_COLORS[project.status] ?? "badge-draft"}`}>
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </span>

                  {/* Context menu — top right */}
                  <div className="absolute top-2 right-2" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 bg-black/30 hover:bg-black/50 text-white border-0"
                          data-testid={`button-project-menu-${project.id}`}
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocation(`/projects/${project.id}/edit`)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(project.id, project.name)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Project info overlaid on the dimmed bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-semibold text-white text-sm leading-tight truncate">{project.name}</h3>
                    <p className="text-white/70 text-xs truncate mt-0.5">{project.address}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-white/60">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {project.mediaCount} assets
                      </span>
                      <span>{PROPERTY_TYPE_LABELS[project.propertyType] ?? project.propertyType}</span>
                      {project.listingPrice && (
                        <span className="text-primary/90 font-medium">${project.listingPrice}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Minimal footer with quick-view button */}
                <CardContent className="p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {project.shootDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {project.shootDate}
                      </span>
                    )}
                    {project.shootFee && (
                      <span className="text-muted-foreground">Fee: ${project.shootFee}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); setLocation(`/projects/${project.id}`); }}
                  >
                    <Eye className="w-3 h-3 mr-1" /> View
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
