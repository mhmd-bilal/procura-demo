"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { projectsApi } from "@/lib/api";
import { Project, ProjectStatus } from "@/types";
import {
  Plus,
  Search,
  FolderOpen,
  TrendingDown,
  Clock,
  BarChart3,
  ArrowUpRight,
  FileText,
  Users,
  IndianRupee,
  Sparkle,
} from "lucide-react";
import { stat } from "fs/promises";

// Demo data for seeding
const demoProjects: Project[] = [
  
];

const statusConfig: Record<ProjectStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }> = {
  draft: { label: "Draft", variant: "outline", className: "border-muted-foreground/30 text-muted-foreground" },
  processing: { label: "Processing", variant: "default", className: "bg-amber/15 text-amber border-amber/30 animate-pulse-soft" },
  compared: { label: "Compared", variant: "default", className: "bg-cyan/15 text-cyan border-cyan/30" },
  completed: { label: "Completed", variant: "default", className: "bg-emerald/15 text-emerald border-emerald/30" },
  archived: { label: "Archived", variant: "secondary", className: "bg-muted text-muted-foreground" },
};

const formatCurrency = (amount: number, currency = "INR") => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.list();
      setProjects(response.data.length > 0 ? response.data : demoProjects);
    } catch {
      // Use demo data as fallback
      setProjects(demoProjects);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Stats from projects
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const totalVendors = projects.reduce((sum, p) => sum + (p.vendor_count || 0), 0);
  const totalSpend = projects.reduce((sum, p) => sum + (p.total_estimated_spend || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your vendor quotation comparisons
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Comparison
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {[
          {
            title: "Total Projects",
            value: totalProjects,
            icon: FolderOpen,
            trend: "+3 this month",
            color: "text-primary",
            bg: "bg-primary/10",
            gradient: "from-primary/10",
          },
          {
            title: "Completed",
            value: completedProjects,
            icon: BarChart3,
            trend: `${Math.round((completedProjects / totalProjects) * 100)}% completion`,
            color: "text-emerald",
            bg: "bg-emerald/10",
            gradient: "from-emerald/10",
          },
          {
            title: "Vendors Analyzed",
            value: totalVendors,
            icon: Users,
            trend: "Across all projects",
            color: "text-cyan",
            bg: "bg-cyan/10",
            gradient: "from-cyan/10",
          },
          {
            title: "Est. Savings",
            value: formatCurrency(totalSpend * 0.18),
            icon: TrendingDown,
            trend: "~18% avg savings",
            color: "text-amber",
            bg: "bg-amber/10",
            gradient: "from-amber/10",
          },
        ].map((stat, i) => (
          <Card className="relative overflow-hidden group">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} to-transparent opacity-0 group-hover:opacity-80 transition-opacity`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <p className="text-md text-muted-foreground mb-1">{stat.title}</p>
            </CardHeader>
            <CardContent className="px-5 py-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{stat.trend}</p>
                </div>
                <div className={`${stat.bg} p-2.5 rounded-lg`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projects List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-80" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No projects found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first vendor quotation comparison
            </p>
            <Link href="/dashboard/projects/new">
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                New Comparison
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="flex flex-col gap-4  mt-4 stagger-children">
            {filteredProjects.map((project) => {
              const status = statusConfig[project.status];
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                >
                  <Card className="group hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
                    <CardContent className="px-5 py-1">
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                              {project.name}
                            </h3>
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {project.description || "No description"}
                          </p>
                        </div>

                        {/* Meta */}
                        <div className="hidden md:flex items-center gap-6 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-medium">{project.vendor_count || 0}</p>
                            <p className="text-xs text-muted-foreground">Vendors</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {project.total_estimated_spend
                                ? formatCurrency(project.total_estimated_spend)
                                : "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">Est. Spend</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatDate(project.created_at)}</p>
                            <p className="text-xs text-muted-foreground">Created</p>
                          </div>
                        </div>

                        {/* Status */}
                        <Badge variant={status.variant} className={`${status.className} flex-shrink-0`}>
                          {status.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
