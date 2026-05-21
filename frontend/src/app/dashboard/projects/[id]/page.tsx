"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { projectsApi, comparisonApi, quotationsApi, vendorsApi } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BarChart3, Download, FileText, Loader2, Mail,
  Sparkle, AlertTriangle, CheckCircle2, TrendingDown,
  Users, Copy, Shield, Clock, Trash2, Globe, Search,
  ExternalLink, ThumbsUp, Flag, ChevronRight, Package,
  TrendingUp, Zap, ChevronDown, X
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
};

const slideRight = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

// ─── Custom Select ────────────────────────────────────────────────────────────

function CustomSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`flex h-10 w-full items-center justify-between rounded-xl border px-3 px-1 text-sm transition-all duration-200 ${open
          ? "border-primary/50 ring-2 ring-primary/15 bg-background"
          : "border-border/60 bg-background hover:border-border"
          }`}
      >
        <span className={selected ? "text-foreground font-medium" : "text-muted-foreground"}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full rounded-xl border border-border/60 bg-popover shadow-lg overflow-hidden"
          >
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-1 text-sm text-left transition-colors hover:bg-muted/50 ${value === opt.value ? "bg-primary/8 text-primary font-medium" : "text-foreground"
                  }`}
              >
                {opt.label}
                {value === opt.value && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, colorClass, bgClass, trend, index, gradient
}: {
  label: string; value: string | number; icon: any;
  colorClass: string; bgClass: string; trend?: string; index: number; gradient: string;
}) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="relative overflow-hidden group">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} to-transparent opacity-0 group-hover:opacity-80 transition-opacity`} />
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase truncate">
            {label}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-2xl font-bold tracking-tight leading-none mt-2">{value}</p>
              {trend && (
                <p className="text-[11px] text-muted-foreground/70 mt-1.5 leading-tight truncate" title={trend}>
                  {trend}
                </p>
              )}
            </div>
            <div className={`${bgClass} p-2.5 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110`}>
              <Icon className={`w-4 h-4 ${colorClass}`} />
            </div>
          </div>
          {/* hover accent line */}
          {/* <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ${colorClass.replace("text-", "bg-")}`} /> */}
        </CardContent>
      </Card>
    </motion.div >
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase mb-3">
      {label}
    </p>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: any; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show">
      <Card className="border-dashed border-2 border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          </div>
          {action}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Severity Badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    high: "bg-rose/10 text-rose border-rose/20",
    medium: "bg-amber/10 text-amber border-amber/20",
    low: "bg-muted/60 text-muted-foreground border-border/40",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${map[severity] || map.low}`}>
      {severity}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [comparison, setComparison] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("comparison");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<any>(null);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [emailType, setEmailType] = useState("revised_pricing");
  const [processingProject, setProcessingProject] = useState(false);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [summaryNotFound, setSummaryNotFound] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [intelligenceVendorId, setIntelligenceVendorId] = useState("");
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [intelligenceData, setIntelligenceData] = useState<any>(null);
  const [dismissedError, setDismissedError] = useState(false);

  // PDF Management State
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [reprocessingPdfId, setReprocessingPdfId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProject(); }, [projectId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (project?.status === "processing") {
      interval = setInterval(() => loadProject(true), 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [project?.status, projectId]);

  const loadProject = async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await projectsApi.get(projectId);
      setProject(res.data);
      if (res.data.vendors) setVendors(res.data.vendors);

      if (res.data.status === "draft" && res.data.quotations?.length > 0) {
        const failed = res.data.quotations?.filter((q: any) => q.status === "failed");
        if (failed?.length > 0) {
          setProcessingError(failed[0].error_message || "Processing failed");
          setDismissedError(false);
        }
      } else { setProcessingError(null); }

      const compRes = await comparisonApi.get(projectId);
      if (compRes.data.results?.length) setComparison(compRes.data.results);
      if (compRes.data.vendors?.length) setVendors(compRes.data.vendors);

      try {
        const sumRes = await comparisonApi.getSummary(projectId);
        if (sumRes.data?.content) { setSummary(sumRes.data.content); setSummaryNotFound(false); }
      } catch { setSummary(null); setSummaryNotFound(true); }
    } catch (e: any) {
      toast.error(e.message || "Failed to load project");
    } finally { setLoading(false); }
  };

  const handleStartProcessing = async () => {
    setProcessingProject(true);
    try {
      await quotationsApi.processAll(projectId);
      toast.success("Processing started!");
      await loadProject(true);
    } catch (e: any) { toast.error(e.message || "Failed to start processing"); }
    finally { setProcessingProject(false); }
  };

  const handleGenerateSummary = async () => {
    setSummaryGenerating(true);
    try {
      const res = await comparisonApi.generateSummary(projectId);
      if (res.data) { setSummary(res.data); setSummaryNotFound(false); toast.success("Summary generated!"); }
    } catch (e: any) { toast.error(e.message || "Failed"); setSummaryNotFound(true); }
    finally { setSummaryGenerating(false); }
  };

  const handleExport = async (format: "pdf" | "xlsx") => {
    try { await comparisonApi.export(projectId, format); toast.success(`Exported as ${format.toUpperCase()}`); }
    catch { toast.error("Export failed"); }
  };

  const handleGenerateEmail = async () => {
    if (!selectedVendor) { toast.error("Select a vendor"); return; }
    setGeneratingEmail(true);
    try {
      const res = await comparisonApi.generateNegotiationEmail({ vendor_id: selectedVendor, email_type: emailType });
      setEmailResult(res.data);
    } catch {
      setEmailResult({
        subject: `Re: Quotation Review – ${emailType === "revised_pricing" ? "Request for Revised Pricing" : emailType === "missing_details" ? "Request for Additional Details" : "Delivery Timeline Discussion"}`,
        body: `Dear ${vendors.find(v => v.id === selectedVendor)?.name || "Vendor"} Team,\n\nThank you for submitting your quotation.\n\nAfter careful evaluation, we would like to discuss ${emailType === "revised_pricing" ? "more competitive pricing on several line items" : emailType === "missing_details" ? "some missing information in your quotation" : "your proposed delivery timelines"}.\n\nWe look forward to your response.\n\nBest regards,\nProcurement Team`,
        key_points: ["Price competitiveness", "Complete documentation", "Delivery commitments"],
      });
    } finally { setGeneratingEmail(false); }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    try {
      await projectsApi.delete(projectId);
      toast.success("Project deleted");
      router.push("/dashboard");
    } catch (e: any) { toast.error(e.message || "Failed to delete"); }
  };

  const handleFetchIntelligence = async () => {
    if (!intelligenceVendorId) { toast.error("Select a vendor first"); return; }
    setIntelligenceLoading(true);
    setIntelligenceData(null);
    try {
      const res = await vendorsApi.getIntelligence(intelligenceVendorId);
      setIntelligenceData(res.data);
      toast.success("Intelligence retrieved!");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setIntelligenceLoading(false); }
  };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setUploadingPdf(true);
    try {
      toast.loading("Uploading and extracting PDF...");
      // Upload
      const uploadRes = await quotationsApi.upload(projectId, file);
      const quotationId = uploadRes.data.quotation.id;

      // Process
      await quotationsApi.process(quotationId);
      toast.dismiss();
      toast.success("PDF extracted! Please click Regenerate Comparison to update the project.");

      // Reload project to show new quotation
      loadProject();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to upload and process PDF");
    } finally {
      setUploadingPdf(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const handleReprocessPdf = async (quotationId: string) => {
    setReprocessingPdfId(quotationId);
    try {
      toast.loading("Reprocessing PDF...");
      await quotationsApi.process(quotationId);
      toast.dismiss();
      toast.success("PDF re-extracted! Please click Regenerate Comparison to update the project.");
      loadProject();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to reprocess PDF");
    } finally {
      setReprocessingPdfId(null);
    }
  };

  const handleRegenerateProject = async () => {
    setRegenerating(true);
    try {
      toast.loading("Regenerating comparison...");
      await comparisonApi.generate(projectId);
      toast.dismiss();
      toast.loading("Regenerating summary...");
      await comparisonApi.generateSummary(projectId);
      toast.dismiss();
      toast.success("Project fully updated!");
      loadProject();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to regenerate project");
    } finally {
      setRegenerating(false);
    }
  };

  const allVendorNames = [
    ...new Set(comparison.flatMap(r =>
      Object.values(r.vendor_prices || {}).map((v: any) => v.vendor_name)
    )),
  ] as string[];

  const avgSavings = comparison.length
    ? Math.round(comparison.reduce((s, r) => s + (r.price_difference_pct || 0), 0) / comparison.length)
    : 0;

  const anomalyCount = comparison.filter(r => r.anomaly_flags?.length).length;

  const vendorSelectOptions = vendors.map(v => ({ value: v.id, label: v.name }));

  const emailTypeOptions = [
    { value: "revised_pricing", label: "Request Revised Pricing" },
    { value: "missing_details", label: "Request Missing Details" },
    { value: "delivery_negotiation", label: "Negotiate Delivery Timeline" },
  ];

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
        </div>
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  // ── Page ──────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-5"
      initial="hidden"
      animate="show"
      variants={stagger}
    >

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link href="/dashboard" className="shrink-0">
          <Button variant="outline" size="icon"
            className="h-9 w-9 rounded-xl border-border/50 hover:bg-muted/60">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">{project?.name || "Project"}</h1>

            <AnimatePresence mode="wait">
              {project?.status === "processing" && (
                <motion.div key="processing"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}>
                  <Badge className="bg-primary/10 text-primary border-primary/20 gap-1.5 text-[11px] font-semibold animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing
                  </Badge>
                </motion.div>
              )}
              {project?.status === "completed" && (
                <motion.div key="completed"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}>
                  <Badge className="bg-emerald/10 text-emerald border-emerald/20 gap-1.5 text-[11px] font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </Badge>
                </motion.div>
              )}
              {project?.status === "draft" && (
                <motion.div key="draft"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}>
                  <Badge className="bg-muted text-muted-foreground border-border/40 text-[11px] font-semibold">
                    Draft
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {project?.description || `${vendors.length} vendors · ${comparison.length} line items`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {project?.quotations?.length > 0 && comparison.length === 0 && project?.status !== "processing" && (
            <Button size="sm" onClick={handleStartProcessing} disabled={processingProject}
              className="gap-1.5 h-9 text-xs font-semibold">
              {processingProject
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkle className="w-3.5 h-3.5" />}
              Process Quotations
            </Button>
          )}

          {comparison.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleRegenerateProject} disabled={regenerating}
              className="gap-1.5 h-9 text-xs font-semibold border-border/50">
              {regenerating
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <BarChart3 className="w-3.5 h-3.5" />}
              Regenerate Comparison
            </Button>
          )}

          <div className="flex items-center gap-1.5 bg-muted/50 border border-border/50 rounded-xl p-1">
            <Button variant="ghost" size="sm" onClick={() => handleExport("xlsx")}
              className="h-7 px-3 text-xs font-medium rounded-lg hover:bg-background gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Excel
            </Button>
            <div className="w-px h-4 bg-border/60" />
            <Button variant="ghost" size="sm" onClick={() => handleExport("pdf")}
              className="h-7 px-3 text-xs font-medium rounded-lg hover:bg-background gap-1.5">
              <Download className="w-3.5 h-3.5" />
              PDF
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={handleDeleteProject}
            className="h-9 px-3 text-xs font-medium rounded-xl bg-destructive/5 text-destructive/80 hover:text-destructive hover:bg-destructive/8 gap-1.5 border border-border/40">
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
      </motion.div>

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {processingError && !dismissedError && (
          <motion.div
            key="error-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-destructive">Processing Error</p>
                <p className="text-xs text-destructive/70 mt-0.5">{processingError}</p>
              </div>
              <button onClick={() => setDismissedError(true)}
                className="text-destructive/50 hover:text-destructive transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <motion.div
        variants={stagger}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard index={0} label="Items Compared" value={comparison.length}
          icon={BarChart3} colorClass="text-primary" bgClass="bg-primary/10" gradient="from-primary/10"
          trend="Across all vendors" />
        <StatCard index={1} label="Vendors" value={allVendorNames.length}
          icon={Users} colorClass="text-cyan" bgClass="bg-cyan/10" gradient="from-cyan/10"
          trend={allVendorNames.length > 0
            ? allVendorNames.slice(0, 2).join(", ") + (allVendorNames.length > 2 ? `…` : "")
            : "None yet"} />
        <StatCard index={2} label="Avg. Price Spread" value={comparison.length ? `${avgSavings}%` : "-"}
          icon={TrendingDown} colorClass="text-emerald" bgClass="bg-emerald/10" gradient="from-emerald/10"
          trend="Between lowest & highest" />
        <StatCard index={3} label="Anomalies"
          value={anomalyCount}
          icon={AlertTriangle}
          colorClass={anomalyCount > 0 ? "text-amber" : "text-muted-foreground"}
          bgClass={anomalyCount > 0 ? "bg-amber/10" : "bg-muted/40"}
          gradient={anomalyCount > 0 ? "from-amber/10" : "from-muted/10"}
          trend="Flagged line items" />
      </motion.div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-11 w-full sm:w-auto bg-transparent border-0 border-border/50 rounded-xl p-1 flex overflow-x-auto gap-0.5">
            {[
              { value: "pdfs", icon: FileText, label: "PDFs" },
              { value: "comparison", icon: BarChart3, label: "Comparison" },
              { value: "summary", icon: Sparkle, label: "Summary" },
              { value: "negotiate", icon: Mail, label: "Negotiate" },
              { value: "intelligence", icon: Globe, label: "Intelligence" },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative flex-1 sm:flex-none gap-1.5 text-xs font-semibold rounded-lg px-4
                  data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary
                  text-muted-foreground transition-all duration-200"
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.value === "summary" && summaryNotFound && comparison.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ════════════════════════════════════════════════════════════
              TAB - COMPARISON
          ════════════════════════════════════════════════════════════ */}
          <TabsContent value="comparison" className="mt-4 space-y-4 outline-none">



            {/* Processing */}
            {project?.status === "processing" ? (
              <motion.div variants={fadeUp} initial="hidden" animate="show">
                <Card className="border-dashed border-2 border-primary/20">
                  <CardContent className="flex flex-col items-center justify-center py-20 gap-5 text-center">
                    <div className="relative w-14 h-14">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Sparkle className="w-6 h-6 text-primary" />
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
                        <Loader2 className="w-3 h-3 text-primary animate-spin" />
                      </span>
                    </div>
                    <div className="space-y-1.5 max-w-xs">
                      <p className="font-semibold text-sm">Analysing documents…</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Extracting line items, normalising descriptions and running cross-vendor price analysis.
                      </p>
                    </div>
                    <div className="w-40 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/50 rounded-full animate-shimmer w-full" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

            ) : comparison.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No comparison data yet"
                description="Upload quotations and process them to generate a side-by-side vendor comparison."
                action={
                  project?.quotations?.length > 0 ? (
                    <Button size="sm" onClick={handleStartProcessing} disabled={processingProject} className="gap-2 ">
                      {processingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkle className="w-3.5 h-3.5" />}
                      Process Now
                    </Button>
                  ) : null
                }
              />

            ) : (
              /* ── Table ── */
              <motion.div variants={fadeUp} initial="hidden" animate="show">
                <Card className="border-border/50 overflow-hidden shadow-sm p-0 gap-0">
                  {/* Table header bar */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {comparison.length} items · {allVendorNames.length} vendors
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald/70 inline-block" />
                        Lowest price
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber/70 inline-block" />
                        Anomaly
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/40 bg-muted/10">
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/10 z-10 min-w-[200px]">
                            Item
                          </th>
                          <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide w-14">
                            Qty
                          </th>
                          {allVendorNames.map(v => (
                            <th key={v} className="text-right px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide min-w-[120px]">
                              {v}
                            </th>
                          ))}
                          <th className="text-right px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide min-w-[80px]">
                            Spread
                          </th>
                          <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide w-14">
                            Flag
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {comparison.map((row, i) => {
                          const prices = Object.values(row.vendor_prices || {}) as any[];
                          const lowestPrice = Math.min(...prices.map((p: any) => p.unit_price || Infinity));
                          const spread = row.price_difference_pct || 0;
                          const hasAnomaly = row.anomaly_flags?.length > 0;

                          return (
                            <motion.tr
                              key={row.id || i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.03 }}
                              className="hover:bg-muted/20 transition-colors group"
                            >
                              <td className="px-4 py-3 font-medium sticky left-0 bg-card group-hover:bg-muted/20 transition-colors z-10">
                                <span className="line-clamp-1">{row.normalized_item_name}</span>
                              </td>
                              <td className="px-4 py-3 text-center text-muted-foreground">
                                {prices[0]?.quantity || "-"}
                              </td>

                              {allVendorNames.map(vn => {
                                const vp = prices.find((p: any) => p.vendor_name === vn);
                                const isLowest = vp?.unit_price === lowestPrice;
                                const baseQty = prices[0]?.quantity || 1;
                                const hasDiffQty = vp && vp.quantity && vp.quantity !== baseQty;

                                return (
                                  <td key={vn} className="px-4 py-3 text-right">
                                    {vp ? (
                                      <div>
                                        <span className={`font-mono font-semibold ${isLowest ? "text-emerald" : ""}`}>
                                          {isLowest && (
                                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald/15 text-[8px] mr-1">✓</span>
                                          )}
                                          ₹{vp.unit_price?.toLocaleString()}
                                        </span>
                                        {hasDiffQty && (
                                          <p className="text-[10px] text-amber mt-0.5">
                                            Qty {vp.quantity}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground/30 font-mono">-</span>
                                    )}
                                  </td>
                                );
                              })}

                              <td className="px-4 py-3 text-right">
                                {spread ? (
                                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${spread > 15
                                    ? "bg-rose/10 text-rose"
                                    : "bg-emerald/10 text-emerald"
                                    }`}>
                                    {spread > 15
                                      ? <TrendingUp className="w-2.5 h-2.5" />
                                      : <TrendingDown className="w-2.5 h-2.5" />
                                    }
                                    {spread}%
                                  </span>
                                ) : <span className="text-muted-foreground/30">-</span>}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {hasAnomaly ? (
                                  <span
                                    title={row.anomaly_flags.map((f: any) => f.message).join("\n")}
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber/10 cursor-help"
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber" />
                                  </span>
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald/30 mx-auto" />
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* AI Banner */}
            <AnimatePresence>
              {summary && project?.status === "completed" && (
                <motion.div
                  key="ai-banner"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col sm:flex-row gap-3 items-start sm:items-center px-4 py-3.5 rounded-xl bg-primary/5 border border-primary/15"
                >
                  <Zap className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-0.5">More Insight</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed max-w-xl">
                      {summary.overall_assessment}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("summary")}
                    className="shrink-0 gap-1 text-xs font-semibold text-primary hover:bg-primary/10 h-7 px-3 rounded-lg">
                    View Summary
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════
              TAB - AI SUMMARY
          ════════════════════════════════════════════════════════════ */}
          <TabsContent value="summary" className="mt-4 space-y-4 outline-none">

            {/* Generate CTA */}
            <AnimatePresence>
              {!summary && summaryNotFound && comparison.length > 0 && project?.status !== "processing" && (
                <motion.div
                  key="gen-cta"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="border-dashed border-2 border-primary/20">
                    <CardContent className="flex flex-col items-center py-14 gap-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Sparkle className="w-5 h-5 text-primary" />
                      </div>
                      <div className="space-y-1 max-w-xs">
                        <p className="font-semibold text-sm">Ready to generate</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          The system will produce a structured procurement report with vendor rankings, risk flags, and recommendations.
                        </p>
                      </div>
                      <Button onClick={handleGenerateSummary} disabled={summaryGenerating} className="gap-2 mt-1">
                        {summaryGenerating
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
                          : <><Sparkle className="w-3.5 h-3.5" />Generate Summary</>
                        }
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {summary && (
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

                {/* Overall Assessment */}
                <motion.div variants={fadeUp}>
                  <Card className="border-border/50 shadow-sm">
                    <CardContent className="px-5 py-1">
                      <SectionLabel label="Overall Assessment" />
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {summary.overall_assessment}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Cheapest + Best Delivery */}
                <motion.div variants={fadeUp} className="grid md:grid-cols-2 gap-3">
                  <Card className="border-border/50 hover:border-emerald/30 transition-colors">
                    <CardContent className="px-5 py-1">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="p-2 rounded-lg bg-emerald/10">
                          <TrendingDown className="w-3.5 h-3.5 text-emerald" />
                        </div>
                        <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Cheapest Vendor
                        </p>
                      </div>
                      <p className="text-xl font-bold">{summary?.cheapest_vendor?.vendor_name || "-"}</p>
                      {summary?.cheapest_vendor?.savings_pct && (
                        <p className="text-xs text-emerald font-semibold mt-1">
                          {summary.cheapest_vendor.savings_pct}% savings vs average
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 hover:border-cyan/30 transition-colors">
                    <CardContent className="px-5 py-1">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="p-2 rounded-lg bg-cyan/10">
                          <Clock className="w-3.5 h-3.5 text-cyan" />
                        </div>
                        <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Best Delivery
                        </p>
                      </div>
                      <p className="text-xl font-bold">{summary?.best_delivery_vendor?.vendor_name || "-"}</p>
                      {summary?.best_delivery_vendor?.avg_delivery_days && (
                        <p className="text-xs text-cyan font-semibold mt-1">
                          {summary.best_delivery_vendor.avg_delivery_days} days average
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Risk Flags */}
                {summary?.risk_flags?.length > 0 && (
                  <motion.div variants={fadeUp}>
                    <Card className="border-border/50 shadow-sm">
                      <CardContent className="px-5 py-1">
                        <SectionLabel label="Risk Flags" />
                        <div className="space-y-2">
                          {summary.risk_flags.map((f: any, i: number) => (
                            <motion.div
                              key={i}
                              variants={slideRight}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border ${f.severity === "high"
                                ? "bg-rose/5 border-rose/20"
                                : f.severity === "medium"
                                  ? "bg-amber/5 border-amber/20"
                                  : "bg-muted/30 border-border/40"
                                }`}
                            >
                              <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${f.severity === "high" ? "text-rose" : "text-amber"
                                }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold">{f.vendor_name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.description}</p>
                              </div>
                              <SeverityBadge severity={f.severity} />
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Vendor Rankings */}
                {summary?.vendor_rankings?.length > 0 && (
                  <motion.div variants={fadeUp}>
                    <Card className="border-border/50 shadow-sm">
                      <CardContent className="px-5 py-1">
                        <SectionLabel label="Vendor Rankings" />
                        <div className="space-y-3">
                          {summary.vendor_rankings.map((v: any, idx: number) => (
                            <motion.div
                              key={v.rank}
                              variants={fadeUp}
                              className={`p-4 rounded-xl border ${v.rank === 1
                                ? "bg-primary/5 border-primary/20"
                                : "bg-muted/20 border-border/40"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${v.rank === 1
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "bg-muted text-muted-foreground"
                                  }`}>
                                  #{v.rank}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm">{v.vendor_name}</p>
                                  {v.strengths?.length > 0 && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                      {v.strengths.join(" · ")}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xl font-black text-primary leading-none">
                                    {v.score}
                                    <span className="text-xs font-medium text-muted-foreground">/{v.max_score || 100}</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Score</p>
                                </div>
                              </div>

                              {v.score_breakdown?.length > 0 && (
                                <div
                                  style={{ display: 'grid', gridTemplateColumns: `repeat(${v.score_breakdown.length}, 1fr)` }}
                                  className="gap-3 mt-3.5 pt-3.5 border-t border-border/40"
                                >
                                  {v.score_breakdown.map((cat: any, ci: number) => {
                                    const pct = Math.min(100, Math.max(0, (cat.score / cat.max_score) * 100));
                                    return (
                                      <div key={ci} className="space-y-1.5">
                                        <div className="flex justify-between text-[11px]">
                                          <span className="text-muted-foreground">{cat.category}</span>
                                          <span className="font-bold">{cat.score}/{cat.max_score}</span>
                                        </div>
                                        <Progress value={pct} className="h-1" />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Recommendations */}
                {summary?.recommendations?.length > 0 && (
                  <motion.div variants={fadeUp}>
                    <Card className="border-border/50 shadow-sm">
                      <CardContent className="px-5 py-1">
                        <SectionLabel label="Recommendations" />
                        <div className="space-y-2">
                          {summary.recommendations.map((r: any, i: number) => (
                            <motion.div
                              key={i}
                              variants={slideRight}
                              className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/30 transition-colors"
                            >
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0 mt-0.5">
                                {r.priority || i + 1}
                              </div>
                              <div>
                                <p className="text-xs font-semibold leading-snug">{r.recommendation}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{r.rationale}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            )}
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════
              TAB - NEGOTIATE
          ════════════════════════════════════════════════════════════ */}
          <TabsContent value="negotiate" className="mt-4 space-y-4 outline-none">
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

              <motion.div variants={fadeUp}>
                <Card className="border-border/50 shadow-sm overflow-visible">
                  <CardContent className="px-5 py-1">
                    <SectionLabel label="Negotiation Email Generator" />
                    <p className="text-xs text-muted-foreground mb-5 -mt-1 leading-relaxed">
                      Generate a professional, context-aware email tailored to the selected vendor and scenario.
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4 mb-5">
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                          Vendor
                        </label>
                        <CustomSelect
                          value={selectedVendor}
                          onChange={setSelectedVendor}
                          options={vendorSelectOptions}
                          placeholder="Select a vendor…"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                          Email Type
                        </label>
                        <CustomSelect
                          value={emailType}
                          onChange={setEmailType}
                          options={emailTypeOptions}
                          placeholder="Select type…"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleGenerateEmail}
                      disabled={generatingEmail || !selectedVendor}
                      className="gap-2 font-semibold"
                    >
                      {generatingEmail
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
                        : <><Sparkle className="w-3.5 h-3.5" />Generate Email</>
                      }
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              <AnimatePresence>
                {emailResult && (
                  <motion.div
                    key="email-result"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-border/50 shadow-sm">
                      <CardContent className="px-5 py-1">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                              Subject
                            </p>
                            <p className="text-sm font-semibold leading-snug">{emailResult.subject}</p>
                          </div>
                          <Button variant="outline" size="sm"
                            onClick={() => { navigator.clipboard.writeText(emailResult.body); toast.success("Copied!"); }}
                            className="shrink-0 gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border-border/50">
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </Button>
                        </div>

                        <div className="bg-muted/20 border border-border/40 rounded-xl p-4 mb-4">
                          <pre className="text-xs whitespace-pre-wrap leading-relaxed font-sans text-foreground/90">
                            {emailResult.body}
                          </pre>
                        </div>

                        {emailResult.key_points?.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                              Key Points
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {emailResult.key_points.map((p: string, i: number) => (
                                <span key={i}
                                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/8 text-primary text-[11px] font-semibold border border-primary/15">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════
              TAB - INTELLIGENCE
          ════════════════════════════════════════════════════════════ */}
          <TabsContent value="intelligence" className="mt-4 space-y-4 outline-none">
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

              <motion.div variants={fadeUp}>
                <Card className="border-border/50 shadow-sm overflow-visible">
                  <CardContent className="px-5 py-1">
                    <SectionLabel label="Online Vendor Intelligence" />
                    <p className="text-xs text-muted-foreground mb-5 -mt-1 leading-relaxed">
                      Run an automated web sweep to surface public reviews, reputation signals, and market red flags.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="w-full sm:max-w-xs">
                        <CustomSelect
                          value={intelligenceVendorId}
                          onChange={setIntelligenceVendorId}
                          options={vendorSelectOptions}
                          placeholder="Select a vendor to research…"
                        />
                      </div>
                      <Button
                        onClick={handleFetchIntelligence}
                        disabled={intelligenceLoading || !intelligenceVendorId}
                        className="gap-2 font-semibold bg-indigo hover:bg-indigo/90 text-white"
                      >
                        {intelligenceLoading
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Searching…</>
                          : <><Search className="w-3.5 h-3.5" />Research Vendor</>
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Loading skeletons */}
              <AnimatePresence>
                {intelligenceLoading && (
                  <motion.div
                    key="intel-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid lg:grid-cols-3 gap-4"
                  >
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-48 rounded-xl" />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results */}
              <AnimatePresence>
                {intelligenceData && !intelligenceLoading && (
                  <motion.div
                    key="intel-data"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-4"
                  >
                    {/* Row 1: Vendor Profile, Market Presence, Public Sentiment */}
                    <div className="grid lg:grid-cols-3 gap-4">
                      {/* Vendor Profile */}
                      <Card className="border-border/50 shadow-sm h-full flex flex-col">
                        <CardContent className="px-5 py-1 flex flex-col h-full">
                          <div className="flex items-start justify-between gap-2 mb-4">
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">
                                Vendor Profile
                              </p>
                              <p className="font-bold text-base leading-tight">{intelligenceData.vendor_name}</p>
                            </div>
                            {intelligenceData.online_rating && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber/10 text-amber border border-amber/20 text-xs font-bold shrink-0">
                                ★ {intelligenceData.online_rating}/5
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed p-3 bg-muted/20 rounded-xl border border-border/40 flex-1">
                            {intelligenceData.research_summary}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Market Presence */}
                      <Card className="border-border/50 shadow-sm h-full flex flex-col">
                        <CardContent className="px-5 py-1 flex flex-col h-full">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                            Market Presence
                          </p>
                          <p className="text-xs leading-relaxed flex-1">{intelligenceData.market_presence}</p>
                        </CardContent>
                      </Card>

                      {/* Public Sentiment */}
                      <Card className="border-border/50 shadow-sm h-full flex flex-col">
                        <CardContent className="px-5 py-1 flex flex-col h-full">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                            Public Sentiment
                          </p>
                          <p className="text-xs leading-relaxed flex-1">{intelligenceData.public_sentiment}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Row 2: Reviews + Flags */}
                    <div className="space-y-4">
                      <Card className="border-border/50 shadow-sm">
                        <CardContent className="px-5 py-1">
                          <SectionLabel label="Key Reviews & Findings" />

                          {(() => {
                            const reviews = Array.isArray(intelligenceData.key_reviews)
                              ? intelligenceData.key_reviews
                              : typeof intelligenceData.key_reviews === 'string'
                                ? [intelligenceData.key_reviews]
                                : [];

                            if (reviews.length === 0) {
                              return (
                                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/10 rounded-xl border border-border/40">
                                  No key reviews or findings available for this vendor.
                                </div>
                              );
                            }

                            return (
                              <ul className="space-y-2">
                                {reviews.map((review: string, i: number) => (
                                  <motion.li
                                    key={i}
                                    variants={slideRight}
                                    className="flex gap-2.5 text-xs p-3 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                    <span className="leading-relaxed">{review}</span>
                                  </motion.li>
                                ))}
                              </ul>
                            );
                          })()}
                        </CardContent>
                      </Card>

                      {intelligenceData.red_flags_found?.length > 0 ? (
                        <Card className="border-rose/20 overflow-hidden shadow-sm p-0">
                          <div className="px-5 py-3 bg-rose/5 border-b border-rose/20 flex items-center gap-2">
                            <Flag className="w-3.5 h-3.5 text-rose" />
                            <p className="text-[11px] font-bold text-rose uppercase tracking-widest">
                              Risk Indicators
                            </p>
                          </div>
                          <CardContent className="p-4 space-y-2">
                            {(Array.isArray(intelligenceData.red_flags_found)
                              ? intelligenceData.red_flags_found
                              : typeof intelligenceData.red_flags_found === 'string'
                                ? [intelligenceData.red_flags_found]
                                : []
                            ).map((flag: string, i: number) => (
                              <motion.div
                                key={i}
                                variants={slideRight}
                                className="flex items-start gap-2.5 p-3 rounded-lg bg-rose/5 border border-rose/10"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose mt-0.5 shrink-0" />
                                <span className="text-xs text-rose leading-relaxed">{flag}</span>
                              </motion.div>
                            ))}
                          </CardContent>
                        </Card>
                      ) : (
                        <motion.div variants={fadeIn}>
                          <Card className="border-emerald/20 bg-emerald/5 shadow-sm">
                            <CardContent className="px-4 py-0 flex items-center gap-3">
                              <div className="p-2 bg-emerald/10 rounded-xl shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-emerald">No red flags detected</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Our web sweep did not surface any major warnings.
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════
              TAB - PDF MANAGEMENT
          ════════════════════════════════════════════════════════════ */}
          <TabsContent value="pdfs" className="mt-4 outline-none">
            <Card className="gap-0 pb-0">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 ">
                <div>
                  <h3 className="font-semibold text-lg">Quotation PDFs</h3>
                  <p className="text-xs text-muted-foreground mt-1">Manage vendor quotations for this project.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    disabled={uploadingPdf}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 h-9"
                  >
                    {uploadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Add New PDF
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="application/pdf"
                    onChange={handleUploadPdf}
                    disabled={uploadingPdf}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {project?.quotations?.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No PDFs uploaded yet.
                    </div>
                  )}
                  {project?.quotations?.map((q: any) => (
                    <div key={q.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{q.file_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {(q.file_size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <span className="text-muted-foreground/30">•</span>
                            {q.status === "processing" ? (
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0 text-[10px] uppercase gap-1 px-1.5 h-4">
                                <Loader2 className="w-3 h-3 animate-spin" /> Processing
                              </Badge>
                            ) : q.status === "extracted" ? (
                              <Badge className="bg-emerald/10 text-emerald hover:bg-emerald/10 border-0 text-[10px] uppercase px-1.5 h-4">
                                Extracted
                              </Badge>
                            ) : q.status === "failed" ? (
                              <Badge className="bg-rose/10 text-rose hover:bg-rose/10 border-0 text-[10px] uppercase px-1.5 h-4">
                                Failed
                              </Badge>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground hover:bg-muted border-0 text-[10px] uppercase px-1.5 h-4">
                                Uploaded
                              </Badge>
                            )}
                          </div>
                          {q.status === "failed" && q.error_message && (
                            <p className="text-xs text-rose mt-1 max-w-md truncate" title={q.error_message}>
                              {q.error_message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReprocessPdf(q.id)}
                          disabled={reprocessingPdfId === q.id || uploadingPdf}
                          className="h-8 gap-1.5 text-xs font-medium"
                        >
                          {reprocessingPdfId === q.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkle className="w-3.5 h-3.5 text-primary" />
                          )}
                          Reprocess
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </motion.div>
    </motion.div>
  );
}