"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Palette, User, X, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { useAuth, ROLE_LABELS, roleHome } from "@/contexts/AuthContext";
import { Role } from "@/data/mockData";
import { notifications } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { clearAdminSessionToken } from "@/lib/auth/admin-session-client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

const ROLE_THEME: Record<Role, { hsl: string; gradient: string }> = {
  "super-admin":    { hsl: "258 52% 32%", gradient: "from-secondary to-secondary/80" },
  "admin":          { hsl: "18 88% 54%",  gradient: "from-primary to-primary/80" },
  "senior-teacher": { hsl: "42 92% 48%",  gradient: "from-accent to-primary/80" },
  "teacher":        { hsl: "158 72% 38%", gradient: "from-success to-info/80" },
  "student":        { hsl: "214 84% 50%", gradient: "from-info to-secondary/80" },
};

export function RoleLayout({ navItems, role, children }: { navItems: NavItem[]; role: Role; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = ROLE_THEME[role];

  const handleLogout = async () => {
    if (role === "student") {
      try {
        await fetch("/api/student/logout", { method: "POST", credentials: "include" });
      } catch {
        /* clear client session anyway */
      }
    }
    if (role === "teacher") {
      try {
        await fetch("/api/teacher/logout", { method: "POST", credentials: "include" });
      } catch {
        /* clear client session anyway */
      }
    }
    if (role === "senior-teacher") {
      try {
        await fetch("/api/senior-teacher/logout", { method: "POST", credentials: "include" });
      } catch {
        /* clear client session anyway */
      }
    }
    if (role === "admin") {
      clearAdminSessionToken();
      try {
        await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
      } catch {
        /* ignore */
      }
    }
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="px-5 h-16 border-b border-sidebar-border flex items-center justify-between">
          <Logo />
          <button onClick={() => setOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mx-3 mt-4 mb-2 rounded-lg px-3 py-2.5 bg-muted/60 border border-border">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Signed in as</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${theme.hsl})` }} />
            <div className="font-display font-semibold text-sm text-foreground">{ROLE_LABELS[role]}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin">
          {navItems.map(item => {
            const isActive = pathname === item.to || (item.end === false && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r"
                    style={{ background: `hsl(${theme.hsl})` }}
                  />
                )}
                <item.icon
                  className="w-4 h-4 shrink-0"
                  strokeWidth={2}
                  style={isActive ? { color: `hsl(${theme.hsl})` } : undefined}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-md text-muted-foreground hover:bg-destructive-soft hover:text-destructive font-medium"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14">
            <button className="lg:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <Palette className="w-4 h-4 text-primary" />
              <span className="font-medium">Little Brushes Art Academy</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${theme.hsl})` }} />
                {ROLE_LABELS[role]}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative p-2 rounded-md hover:bg-muted transition-colors" aria-label="Notifications">
                    <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.map(n => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2.5">
                      <div className="font-semibold text-sm">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{n.desc}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{n.time}</div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-md hover:bg-muted p-1 pr-2 transition-colors">
                    <Avatar name={user?.name ?? "User"} size={28} />
                    <span className="hidden sm:block text-sm font-medium">{user?.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {role === "teacher" ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/teacher/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : role === "senior-teacher" ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/senior-teacher/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : role === "student" ? (
                    <DropdownMenuItem asChild>
                      <Link href="/student/profile">Profile</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href="/login">Switch Role</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => void handleLogout()}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 min-h-0 p-4 sm:p-6 max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

export function RequireRoles({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, hydrated } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!hydrated) return;

    if (!user) {
      console.log("[RequireRoles] no user → /login", { pathname: window.location.pathname, roles });
      router.push("/login");
      return;
    }

    if (!roles.includes(user.role)) {
      const home = roleHome(user.role);
      console.log("[RequireRoles] role mismatch → redirect", {
        userRole: user.role,
        allowed: roles,
        home,
        pathname: window.location.pathname,
      });
      router.push(home);
    }
  }, [user, roles, router, hydrated]);

  if (!mounted || !hydrated || !user) {
    return null;
  }

  if (!roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, hydrated } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!hydrated) return;

    if (!user) {
      console.log("[RequireRole] no user → /login", { required: role, pathname: window.location.pathname });
      router.push("/login");
      return;
    }

    if (user.role !== role) {
      const home = roleHome(user.role);
      console.log("[RequireRole] role mismatch → redirect", {
        userRole: user.role,
        required: role,
        home,
        pathname: window.location.pathname,
      });
      router.push(home);
    }
  }, [user, role, router, hydrated]);

  if (!mounted || !hydrated || !user) {
    return null;
  }

  if (user.role !== role) {
    return null;
  }

  return <>{children}</>;
}
