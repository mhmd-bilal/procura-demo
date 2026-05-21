"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { projectsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, FolderOpen, ArrowRight } from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const hasProcessing = projects.some(p => p.status === "processing");
    let interval: NodeJS.Timeout;
    
    if (hasProcessing) {
      interval = setInterval(() => {
        loadProjects(true);
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [projects]);

  const loadProjects = async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await projectsApi.list();
      setProjects(res.data || []);
    } catch (error) {
      console.error("Failed to load projects", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your procurement analysis projects
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FolderOpen className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Create your first project to start analyzing vendor quotations and finding the best deals.
          </p>
          <Link href="/dashboard/projects/new">
            <Button>Create Project</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="hover:border-primary/50 transition-colors h-full flex flex-col cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {project.description || "No description provided"}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                    {project.status === "processing" ? (
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-md flex items-center animate-pulse">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing
                      </span>
                    ) : project.status === "completed" ? (
                      <span className="text-xs font-medium bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md">
                        Completed
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-secondary px-2 py-1 rounded-md capitalize">
                        {project.status || "active"}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
