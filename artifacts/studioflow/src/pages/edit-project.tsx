import { useRoute, useLocation } from "wouter";
import Layout from "@/components/Layout";
import {
  useGetProject,
  useUpdateProject,
  useListClients,
  getListProjectsQueryKey,
  getGetProjectQueryKey,
  Project,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ImageIcon, DollarSign, Home, Camera, MapPin } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(2, "Project name is required"),
  address: z.string().min(5, "Full address is required"),
  propertyType: z.enum(["residential", "commercial", "luxury", "vacation", "land"]),
  status: z.enum(["draft", "active", "delivered", "archived", "completed", "paid"]),
  clientId: z.number().nullable().optional(),
  listingPrice: z.string().optional().or(z.literal("")),
  shootFee: z.string().optional().or(z.literal("")),
  coverImageUrl: z.string().optional().or(z.literal("")),
  shootDate: z.string().optional().or(z.literal("")),
  deliveryDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const PROPERTY_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial" },
  { value: "luxury",      label: "Luxury" },
  { value: "vacation",    label: "Vacation" },
  { value: "land",        label: "Land" },
] as const;

const STATUSES = [
  { value: "draft",     label: "Draft" },
  { value: "active",    label: "Active" },
  { value: "delivered", label: "Delivered" },
  { value: "archived",  label: "Archived" },
  { value: "completed", label: "Completed" },
  { value: "paid",      label: "Paid" },
] as const;

function EditForm({ project, clients, projectId }: {
  project: Project;
  clients: { id: number; name: string }[] | undefined;
  projectId: number;
}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project.name,
      address: project.address,
      propertyType: project.propertyType,
      status: project.status,
      clientId: project.clientId ?? null,
      listingPrice: project.listingPrice ?? "",
      shootFee: project.shootFee ?? "",
      coverImageUrl: project.coverImageUrl ?? "",
      shootDate: project.shootDate ?? "",
      deliveryDate: project.deliveryDate ?? "",
      notes: project.notes ?? "",
    },
  });

  const coverImageUrl = watch("coverImageUrl");

  const onSubmit = (values: FormValues) => {
    updateProject.mutate(
      {
        id: projectId,
        data: {
          name: values.name,
          address: values.address,
          propertyType: values.propertyType,
          status: values.status,
          clientId: values.clientId ?? null,
          listingPrice: values.listingPrice || null,
          shootFee: values.shootFee || null,
          coverImageUrl: values.coverImageUrl || null,
          shootDate: values.shootDate || null,
          deliveryDate: values.deliveryDate || null,
          notes: values.notes || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({ title: "Project saved" });
          setLocation(`/projects/${projectId}`);
        },
        onError: () => {
          toast({ title: "Failed to save project", variant: "destructive" });
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* ── Cover photo preview ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" /> Cover Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative h-44 rounded-lg overflow-hidden bg-muted border border-border">
            {coverImageUrl ? (
              <>
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white font-semibold text-sm leading-tight truncate">{watch("name") || project.name}</p>
                  <p className="text-white/70 text-xs truncate mt-0.5">{watch("address") || project.address}</p>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No cover image set</p>
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Image URL</Label>
            <Input
              {...register("coverImageUrl")}
              placeholder="https://images.unsplash.com/..."
              className="mt-1.5 text-sm font-mono"
              data-testid="input-cover-image-url"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Paste any public image URL. This will appear as the project tile cover and project header.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Property details ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Home className="w-4 h-4 text-primary" /> Property Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Project Name *</Label>
            <Input
              {...register("name")}
              placeholder="Pacific Heights Mansion"
              className="mt-1.5"
              data-testid="input-project-name"
            />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Full Address *
            </Label>
            <Input
              {...register("address")}
              placeholder="2847 Pacific Heights Blvd, San Francisco, CA 94115"
              className="mt-1.5"
              data-testid="input-project-address"
            />
            {errors.address && <p className="text-destructive text-xs mt-1">{errors.address.message}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Property Type</Label>
              <Controller
                control={control}
                name="propertyType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1.5" data-testid="select-property-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1.5" data-testid="select-project-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div>
            <Label>Client</Label>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : "none"}
                  onValueChange={v => field.onChange(v === "none" ? null : Number(v))}
                >
                  <SelectTrigger className="mt-1.5" data-testid="select-client">
                    <SelectValue placeholder="No client assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client assigned</SelectItem>
                    {clients?.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Expected Listing Price</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                {...register("listingPrice")}
                placeholder="2,500,000"
                className="pl-7"
                data-testid="input-listing-price"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Expected property sale price</p>
          </div>
          <div>
            <Label>Shoot Fee (Client Price)</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                {...register("shootFee")}
                placeholder="1,200"
                className="pl-7"
                data-testid="input-shoot-fee"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Price charged to your client</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Schedule ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Shoot Date</Label>
            <Input
              {...register("shootDate")}
              type="date"
              className="mt-1.5"
              data-testid="input-shoot-date"
            />
          </div>
          <div>
            <Label>Delivery Date</Label>
            <Input
              {...register("deliveryDate")}
              type="date"
              className="mt-1.5"
              data-testid="input-delivery-date"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Notes ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <Label>Notes</Label>
          <Textarea
            {...register("notes")}
            placeholder="Client prefers twilight shots, focus on kitchen and master suite. Gate code is #1234..."
            rows={4}
            className="mt-1.5"
            data-testid="input-notes"
          />
        </CardContent>
      </Card>

      {/* ── Actions ─────────────────────────────────────────── */}
      <div className="flex gap-3 pb-8">
        <Button
          type="submit"
          disabled={updateProject.isPending}
          data-testid="button-save-project"
        >
          {updateProject.isPending ? "Saving…" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setLocation(`/projects/${projectId}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function EditProjectPage() {
  const [, params] = useRoute("/projects/:id/edit");
  const [, setLocation] = useLocation();
  const projectId = Number(params?.id);

  const { data: project, isLoading } = useGetProject(projectId);
  const { data: clients } = useListClients();

  const breadcrumbs = project
    ? [
        { label: "Projects", href: "/projects" },
        { label: project.name, href: `/projects/${projectId}` },
        { label: "Edit" },
      ]
    : [{ label: "Projects", href: "/projects" }, { label: "Edit Project" }];

  if (isLoading) {
    return (
      <Layout breadcrumbs={breadcrumbs}>
        <div className="p-6 max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout breadcrumbs={breadcrumbs}>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Project not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/projects")}>
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={breadcrumbs}>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/projects/${projectId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Edit Project</h1>
            <p className="text-muted-foreground text-sm truncate">{project.name}</p>
          </div>
        </div>

        <EditForm project={project} clients={clients} projectId={projectId} />
      </div>
    </Layout>
  );
}
