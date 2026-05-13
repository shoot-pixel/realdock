import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, FolderOpen, Users, Settings, LogOut, Sun, Moon,
  Menu, X, ChevronRight,
} from "lucide-react";
import RealDockLogo from "@/components/RealDockLogo";
import { cn } from "@/lib/utils";
import { useGetStorageUsage } from "@workspace/api-client-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface LayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function Layout({ children, title, breadcrumbs }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const { data: storage } = useGetStorageUsage();

  const storagePercent = storage ? Math.min(100, (storage.totalUsedMb / storage.limitMb) * 100) : 0;
  const storageLabel = storage
    ? `${storage.totalUsedMb < 1024 ? `${storage.totalUsedMb.toFixed(0)} MB` : `${(storage.totalUsedMb / 1024).toFixed(1)} GB`} of ${(storage.limitMb / 1024).toFixed(0)} GB`
    : "–";

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark(d => !d);
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase() ?? "U";

  const Sidebar = () => (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:relative lg:translate-x-0",
      "w-[200px]",
      sidebarOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Logo */}
      <div className="px-5 pt-8 pb-7">
        <RealDockLogo size="md" className="mb-1" />
        <div className="flex items-center gap-2 pl-[38px]">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em]">Media Dashboard</p>
          <span className="text-[9px] font-bold tracking-wider uppercase bg-primary/15 text-primary border border-primary/25 rounded px-1.5 py-0.5 leading-none">Beta</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`nav-${item.label.toLowerCase()}`}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13.5px] font-medium transition-all cursor-pointer border-l-2",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Storage */}
      <div className="px-4 mb-3">
        <div className="rounded-lg p-3 bg-muted/50 border border-border/60">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.08em] font-medium">
              {user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : "Free"} Plan
            </span>
            <span className="text-[11px] text-muted-foreground">{Math.round(storagePercent)}%</span>
          </div>
          <div className="h-[3px] bg-border rounded-full mb-2">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">{storageLabel}</p>
        </div>
      </div>

      {/* User */}
      <div className="px-4 pb-6 border-t border-sidebar-border pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="user-menu-trigger"
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[11px] font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-sidebar-accent-foreground truncate">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-52 mb-2">
            <DropdownMenuItem onClick={() => setLocation("/settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleDark}>
              {dark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {dark ? "Light Mode" : "Dark Mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive" data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
          <button
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex-1 min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="w-3 h-3" />}
                    {crumb.href ? (
                      <Link href={crumb.href}>
                        <span className="hover:text-foreground cursor-pointer transition-colors text-[13px]">{crumb.label}</span>
                      </Link>
                    ) : (
                      <span className="text-foreground font-medium text-[13px]">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
            {title && !breadcrumbs && (
              <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
            )}
          </div>

          <button
            onClick={toggleDark}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            data-testid="button-toggle-theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
