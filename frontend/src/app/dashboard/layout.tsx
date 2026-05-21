"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderOpen },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Image
                src={mounted && theme === "dark" ? "/dark.png" : "/light.png"}
                alt="Procura logo"
                width={20}
                height={20}
                className="rounded-sm"
              />            </div>
            <span className="text-base font-semibold tracking-tight">Procura</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 space-y-3 border-t border-sidebar-border">
          {/* Theme toggle */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {mounted ? (theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />) : <Sun className="w-4 h-4" />}
              Dark Mode
            </div>
            <Switch
              checked={mounted && theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>

          {/* User */}
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer transition-colors"
            onClick={handleLogout}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {user?.user_metadata?.full_name?.substring(0, 2)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Image
              src={mounted && theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
              alt="Procura logo"
              width={20}
              height={20}
              className="rounded-sm"
            />
            <span className="font-semibold text-sm">Procura</span>
          </div>
        </header>

        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
