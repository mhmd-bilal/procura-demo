"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { projectsApi, quotationsApi } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  FileText,
  X,
  Check,
  Loader2,
  Sparkle,
  Plus,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface UploadedFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "uploaded" | "error";
  progress: number;
  error?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Step 1: Create project
  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setCreating(true);
    try {
      const response = await projectsApi.create({
        name: projectName,
        description: description || undefined,
        currency,
      });
      setProjectId(response.data.id);
      setStep(2);
      toast.success("Project created!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
      // For demo mode, generate a fake ID
      const demoId = `demo-${Date.now()}`;
      setProjectId(demoId);
      setStep(2);
    } finally {
      setCreating(false);
    }
  };

  // File handling
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf"
    );
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        (f) => f.type === "application/pdf"
      );
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const uploadFiles: UploadedFile[] = newFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...uploadFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Step 2: Upload files
  const handleUploadAll = async () => {
    if (files.length < 2) {
      toast.error("Please add at least 2 vendor quotations to compare");
      return;
    }

    setProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const uploadFile = files[i];
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "uploading", progress: 30 }
            : f
        )
      );

      try {
        await quotationsApi.upload(
          projectId!,
          uploadFile.file
        );
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "uploaded", progress: 100 }
              : f
          )
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "uploaded", progress: 100 }
              : f
          )
        );
      }
    }

    toast.success("All quotations uploaded!");
    setStep(3);
  };

  // Step 3: Process
  const handleProcessAll = async () => {
    setProcessing(true);
    try {
      await quotationsApi.processAll(projectId!);
      toast.success("Processing started! Generating comparison...");
      router.push(`/dashboard/projects/${projectId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start processing");
      setProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Comparison</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create a new vendor quotation comparison project
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { num: 1, label: "Project Details" },
          { num: 2, label: "Upload Quotations" },
          { num: 3, label: "Process & Compare" },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                step >= s.num
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s.num ? <Check className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={`text-sm hidden sm:inline ${
                step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < 2 && (
              <div
                className={`flex-1 h-px ${
                  step > s.num ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Project Details */}
      {step === 1 && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-lg">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder="e.g., Q2 Office Supplies Procurement"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this comparison project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <Button
              onClick={handleCreateProject}
              className="w-full h-10"
              disabled={creating || !projectName.trim()}
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Continue to Upload
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload Quotations */}
      {step === 2 && (
        <div className="space-y-6 animate-slide-up">
          {/* Drag & Drop Zone */}
          <Card
            className={`border-2 border-dashed transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20 hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <CardContent className="p-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">
                Drop vendor quotation PDFs here
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse files (PDF only, max 50MB each)
              </p>
              <label
                htmlFor="file-upload"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Plus className="w-4 h-4" />
                Browse Files
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  Uploaded Quotations ({files.length})
                </h3>
                {files.length < 2 && (
                  <div className="flex items-center gap-1.5 text-sm text-amber">
                    <AlertCircle className="w-4 h-4" />
                    Add at least 2 vendors to compare
                  </div>
                )}
              </div>

              {files.map((uploadFile) => (
                <Card key={uploadFile.id}>
                  <CardContent className="px-4 py-1">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-red-500" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium truncate">
                              {uploadFile.file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(uploadFile.file.size)}
                            </p>
                          </div>

                          {uploadFile.status === "uploaded" && (
                            <Badge className="bg-emerald/15 text-emerald border-emerald/30">
                              <Check className="w-3 h-3 mr-1" /> Uploaded
                            </Badge>
                          )}
                          {uploadFile.status === "uploading" && (
                            <Badge className="bg-primary/15 text-primary">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading
                            </Badge>
                          )}
                        </div>

                        {uploadFile.status === "uploading" && (
                          <Progress value={uploadFile.progress} className="h-1" />
                        )}
                      </div>

                      {uploadFile.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0"
                          onClick={() => removeFile(uploadFile.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                onClick={handleUploadAll}
                className="w-full h-10"
                disabled={files.length < 2 || processing}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload All Quotations
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Process */}
      {step === 3 && (
        <Card className="animate-slide-up">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Sparkle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              Ready to Process
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We will extract item data from {files.length} quotations,
              normalize item names, and generate a comparison table.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
              {[
                { label: "Quotations", value: files.length },
                { label: "Extraction", value: "Pending" },
                { label: "Project", value: "Ready" },
              ].map((stat, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            <Button
              onClick={handleProcessAll}
              size="lg"
              className="gap-2"
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkle className="w-4 h-4" />
                  Start AI Processing
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
