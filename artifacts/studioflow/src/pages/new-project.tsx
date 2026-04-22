import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useCreateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(2, "Project name required"),
  address: z.string().min(5, "Address required"),
  propertyType: z.enum(["residential", "commercial", "luxury", "vacation", "land"]),
  status: z.enum(["draft", "active"]),
  clientName: z.string().optional().or(z.literal("")),
  shootDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
});

export default function NewProjectPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();

  const { register, handleSubmit, control, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      address: "",
      propertyType: "residential",
      status: "draft",
      clientName: "",
      shootDate: "",
      notes: "",
      coverImageUrl: "",
    },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    createProject.mutate({
      data: {
        name: values.name,
        address: values.address,
        propertyType: values.propertyType,
        clientId: null,
        shootDate: values.shootDate || null,
        notes: values.notes || null,
      }
    }, {
      onSuccess: (project) => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Project created" });
        setLocation(`/projects/${project.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create project", variant: "destructive" });
      },
    });
  };

  return (
    <Layout breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "New Project" }]}>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/projects")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Project</h1>
            <p className="text-muted-foreground text-sm">Create a project for a new property shoot</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label>Project Name *</Label>
                <Input {...register("name")} placeholder="Pacific Heights Mansion" className="mt-1.5" data-testid="input-project-name" />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label>Property Address *</Label>
                <Input {...register("address")} placeholder="2847 Pacific Heights Blvd, San Francisco, CA" className="mt-1.5" data-testid="input-project-address" />
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
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="luxury">Luxury</SelectItem>
                          <SelectItem value="vacation">Vacation</SelectItem>
                          <SelectItem value="land">Land</SelectItem>
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
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Client Name</Label>
                  <Input {...register("clientName")} placeholder="Sarah Chen" className="mt-1.5" />
                </div>
                <div>
                  <Label>Shoot Date</Label>
                  <Input {...register("shootDate")} type="date" className="mt-1.5" data-testid="input-shoot-date" />
                </div>
              </div>

              <div>
                <Label>Cover Image URL</Label>
                <Input {...register("coverImageUrl")} placeholder="https://..." className="mt-1.5" />
                <p className="text-xs text-muted-foreground mt-1">Paste a URL for the project cover image</p>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea {...register("notes")} placeholder="Client prefers twilight shots, focus on kitchen and master suite..." rows={3} className="mt-1.5" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createProject.isPending} data-testid="button-create-project">
                  {createProject.isPending ? "Creating..." : "Create Project"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setLocation("/projects")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
