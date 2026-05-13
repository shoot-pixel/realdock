import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useEffect, lazy, Suspense } from "react";

const NotFound       = lazy(() => import("@/pages/not-found"));
const Landing        = lazy(() => import("@/pages/landing"));
const LoginPage      = lazy(() => import("@/pages/login"));
const RegisterPage   = lazy(() => import("@/pages/register"));
const DashboardPage  = lazy(() => import("@/pages/dashboard"));
const ProjectsPage   = lazy(() => import("@/pages/projects"));
const EditProjectPage = lazy(() => import("@/pages/edit-project"));
const ProjectDetailPage = lazy(() => import("@/pages/project-detail"));
const NewProjectPage = lazy(() => import("@/pages/new-project"));
const GalleryManagePage = lazy(() => import("@/pages/gallery-manage"));
const GalleryPortalPage = lazy(() => import("@/pages/gallery-portal"));
const InvoicePortalPage = lazy(() => import("@/pages/invoice-portal"));
const ClientsPage    = lazy(() => import("@/pages/clients"));
const SettingsPage   = lazy(() => import("@/pages/settings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
    },
  },
});

function PageSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function AuthTokenSync() {
  const { token } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);
  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  return <Component />;
}

function Router() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/gallery/:token" component={GalleryPortalPage} />
        <Route path="/invoice/:token" component={InvoicePortalPage} />
        <Route path="/dashboard">
          {() => <ProtectedRoute component={DashboardPage} />}
        </Route>
        <Route path="/projects/new">
          {() => <ProtectedRoute component={NewProjectPage} />}
        </Route>
        <Route path="/projects/:id/edit">
          {() => <ProtectedRoute component={EditProjectPage} />}
        </Route>
        <Route path="/projects/:id/gallery/:galleryId">
          {() => <ProtectedRoute component={GalleryManagePage} />}
        </Route>
        <Route path="/projects/:id">
          {() => <ProtectedRoute component={ProjectDetailPage} />}
        </Route>
        <Route path="/projects">
          {() => <ProtectedRoute component={ProjectsPage} />}
        </Route>
        <Route path="/clients">
          {() => <ProtectedRoute component={ClientsPage} />}
        </Route>
        <Route path="/settings">
          {() => <ProtectedRoute component={SettingsPage} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppInner() {
  return (
    <>
      <AuthTokenSync />
      <Router />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppInner />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
