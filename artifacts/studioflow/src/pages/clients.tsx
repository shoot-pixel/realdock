import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useListClients, useCreateClient, useDeleteClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MoreVertical, Trash2, Users, Mail, Phone, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export default function ClientsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: clients, isLoading } = useListClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", company: "", notes: "" },
  });

  const filtered = clients?.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    (c.company?.toLowerCase().includes(search.toLowerCase()) ?? false)
  ) ?? [];

  const handleCreate = (values: z.infer<typeof schema>) => {
    createClient.mutate({
      data: {
        name: values.name,
        email: values.email ?? "",
        phone: values.phone || null,
        company: values.company || null,
        notes: values.notes || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setDialogOpen(false);
        form.reset();
        toast({ title: "Client added" });
      },
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    deleteClient.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast({ title: "Client removed" });
      },
    });
  };

  return (
    <Layout title="Clients" breadcrumbs={[{ label: "Clients" }]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-muted-foreground text-sm">{filtered.length} contacts</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-client">
                <Plus className="w-4 h-4 mr-2" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Client</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-3 py-2">
                <div>
                  <Label>Name *</Label>
                  <Input {...form.register("name")} placeholder="Sarah Chen" className="mt-1.5" data-testid="input-client-name" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input {...form.register("email")} type="email" placeholder="sarah@example.com" className="mt-1.5" data-testid="input-client-email" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input {...form.register("phone")} placeholder="+1 (555) 123-4567" className="mt-1.5" />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input {...form.register("company")} placeholder="Premier Living Properties" className="mt-1.5" />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input {...form.register("notes")} placeholder="Prefers high-res RAW files..." className="mt-1.5" />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={createClient.isPending} className="w-full" data-testid="button-submit-client">
                    {createClient.isPending ? "Adding..." : "Add Client"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-clients"
          />
        </div>

        {/* Client grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Add your first client to get started</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Client
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(client => (
              <Card key={client.id} className="hover:shadow-md transition-shadow" data-testid={`card-client-${client.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                        {client.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{client.name}</h3>
                        {client.company && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" /> {client.company}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDelete(client.id, client.name)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    {client.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </p>
                    )}
                    {client.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Phone className="w-3 h-3 shrink-0" /> {client.phone}
                      </p>
                    )}
                    {client.notes && (
                      <p className="text-xs text-muted-foreground truncate mt-2 italic">"{client.notes}"</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
