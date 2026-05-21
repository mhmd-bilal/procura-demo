"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Shield,
  Sparkle,
  Upload,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Procura</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-1.5">
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/50 text-sm text-muted-foreground mb-6">
            <Sparkle className="w-3.5 h-3.5 text-primary" />
            AI-Powered Procurement Intelligence
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Compare vendor quotes{" "}
            <span className="gradient-text">intelligently</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload quotation PDFs from multiple vendors. Our AI extracts, normalizes,
            and compares pricing automatically - giving you procurement insights in minutes, not hours.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2 h-12 px-6 text-base">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="h-12 px-6 text-base">
                View Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="max-w-5xl mx-auto mt-16 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="relative rounded-2xl border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
            <div className="p-8">
              {/* Mock dashboard header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Active Project</h3>
                  <p className="text-xl font-semibold">Q2 Office Supplies Procurement</p>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1 rounded-full bg-emerald/10 text-emerald text-sm font-medium">
                    3 Vendors Compared
                  </div>
                </div>
              </div>

              {/* Mock comparison table */}
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Item</th>
                      <th className="text-right p-3 font-medium">Vendor A</th>
                      <th className="text-right p-3 font-medium">Vendor B</th>
                      <th className="text-right p-3 font-medium">Vendor C</th>
                      <th className="text-right p-3 font-medium">Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { item: "A4 Copier Paper (500 sheets)", a: "₹245", b: "₹220", c: "₹235", savings: "10.2%", lowest: "b" },
                      { item: "Ballpoint Pens (Box/50)", a: "₹380", b: "₹410", c: "₹355", savings: "13.4%", lowest: "c" },
                      { item: "Laser Toner Cartridge", a: "₹2,800", b: "₹2,650", c: "₹2,900", savings: "8.6%", lowest: "b" },
                      { item: "Sticky Notes (Pack/12)", a: "₹180", b: "₹175", c: "₹190", savings: "7.9%", lowest: "b" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{row.item}</td>
                        <td className={`p-3 text-right ${row.lowest === "a" ? "text-emerald font-semibold" : ""}`}>{row.a}</td>
                        <td className={`p-3 text-right ${row.lowest === "b" ? "text-emerald font-semibold" : ""}`}>{row.b}</td>
                        <td className={`p-3 text-right ${row.lowest === "c" ? "text-emerald font-semibold" : ""}`}>{row.c}</td>
                        <td className="p-3 text-right text-emerald font-medium">↓ {row.savings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything you need for smarter procurement</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From PDF upload to negotiation emails - Procura automates your entire vendor comparison workflow.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 stagger-children">
            {[
              {
                icon: Upload,
                title: "Smart PDF Upload",
                desc: "Drag-and-drop multiple vendor quotation PDFs. Our AI handles scanned docs, inconsistent layouts, and multi-page files.",
              },
              {
                icon: Sparkle,
                title: "AI Data Extraction",
                desc: "Gemini AI extracts item names, pricing, taxes, delivery terms, and warranty details - even from messy PDFs.",
              },
              {
                icon: BarChart3,
                title: "Intelligent Comparison",
                desc: "Auto-normalized item matching across vendors. Highlights cheapest options, detects anomalies, and flags missing items.",
              },
              {
                icon: FileText,
                title: "Procurement Insights",
                desc: "Get AI-generated procurement summaries with vendor rankings, risk flags, and actionable recommendations.",
              },
              {
                icon: Zap,
                title: "Negotiation Assistant",
                desc: "Generate professional negotiation emails to request revised pricing, missing details, or better delivery terms.",
              },
              {
                icon: Shield,
                title: "Export & Share",
                desc: "Export comparison tables to PDF or Excel. Generate shareable report links for stakeholder review.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative p-6 rounded-xl border bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to streamline procurement?</h2>
          <p className="text-muted-foreground mb-8">
            Join companies saving 15-30% on procurement costs with AI-powered vendor analysis.
          </p>
          <Link href="/signup">
            <Button size="lg" className="gap-2 h-12 px-8">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkle className="w-4 h-4 text-primary" />
            <span>Procura</span>
          </div>
          <p>© 2026 Procura. Built for modern procurement teams.</p>
        </div>
      </footer>
    </div>
  );
}
