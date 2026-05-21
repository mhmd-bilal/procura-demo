"use client";
import { useEffect, useState } from "react";
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
import Aurora from '@/components/Aurora';
import BlurText from '@/components/BlurText';
import ShinyText from '@/components/ShinyText';
import { useTheme } from "next-themes";
import Image from "next/image";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    let lastY = 0;
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 80 && currentY > lastY);
      lastY = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out ${scrolled ? "-translate-y-24 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
          }`}
      >
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl shadow-lg shadow-black/10">
          <div className="flex items-center gap-2 mr-12">
            <div className="w-7 h-7 rounded-sm bg-primary flex items-center justify-center">
              <Image
                src={theme === "dark" ? "/dark.png" : "/light.png"}
                alt="Procura logo"
                width={20}
                height={20}
                className="rounded-sm scale-130"
              />
            </div>
            <span className={`text-sm font-semibold tracking-tight text-${scrolled ? 'white' : 'white/50'}`}>Procura</span>
          </div>
          <div className="w-px h-4 bg-black" />
          <Link href="/login">
            <Button variant="ghost" size="sm" className={`h-8 text-xs px-3 text-${scrolled ? 'white' : 'white/50'} hover:bg-white/10 hover:text-white`}>Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="h-8 text-xs px-3 gap-1">
              Get Started <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-1 px-6 overflow-hidden">
        {/* Aurora - short band at top */}
        <div className="absolute top-0 left-0 right-0 h-64 z-0 pointer-events-none">
          <Aurora
            colorStops={["#1C45C2", "#7e94d6", "#1C45C2"]}
            blend={1}
            amplitude={0.90}
            speed={0.5}
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/50 text-sm text-muted-foreground mb-6 backdrop-blur-sm">
            <Sparkle className="w-3.5 h-3.5 text-primary" />
            <ShinyText
              text="Procurement Operations Platform"
              speed={2}
              delay={0}
              color="#313131"
              shineColor="#ffffff"
              spread={120}
              direction="left"
              disabled={false}
            />
          </div>
          <div className="flex justify-center mb-6">
            <BlurText
              text="Procura"
              delay={200}
              animateBy="words"
              direction="top"
              className="text-5xl md:text-6xl font-bold tracking-tight text-center" animationFrom={undefined} animationTo={undefined} onAnimationComplete={undefined} />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed">
            Modern procurement teams still manage vendor quotations, approvals, and comparisons across spreadsheets, email chains, and disconnected systems.
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed">
            Procura centralizes procurement workflows into a single operational platform - starting with intelligent vendor quotation comparison.
          </p>
          {/* <p className="text-sm font-medium text-muted-foreground max-w-2xl mx-auto mb-10">
            Trusted by growing procurement and operations teams.
          </p> */}
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" passHref>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="gap-2 h-12 px-6 text-base">
                  Start Now <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </Link>
            <Link href="/login" passHref>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="lg" className="h-12 px-6 text-base">
                  Log in
                </Button>
              </motion.div>
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
                  <h3 className="text-sm font-medium text-muted-foreground">Active Procurement Project</h3>
                  <p className="text-xl font-semibold">Q2 Office Supplies Procurement</p>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1 rounded-full bg-emerald/10 text-emerald text-sm font-medium">
                    3 Vendors Compared
                  </div>
                </div>
              </div>

              {/* Mock comparison table */}
              <div className="rounded-xl border overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Item</th>
                      <th className="text-right p-3 font-medium">Vendor A</th>
                      <th className="text-right p-3 font-medium">Vendor B</th>
                      <th className="text-right p-3 font-medium">Vendor C</th>
                      <th className="text-right p-3 font-medium">Best Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { item: "A4 Copier Paper", a: "₹245", b: "₹220", c: "₹235", best: "Vendor B", bestKey: "b" },
                      { item: "Ballpoint Pens", a: "₹380", b: "₹410", c: "₹355", best: "Vendor C", bestKey: "c" },
                      { item: "Laser Toner Cartridge", a: "₹2,800", b: "₹2,650", c: "₹2,900", best: "Vendor B", bestKey: "b" },
                      { item: "Sticky Notes", a: "₹180", b: "₹175", c: "₹190", best: "Vendor B", bestKey: "b" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{row.item}</td>
                        <td className={`p-3 text-right ${row.bestKey === "a" ? "text-emerald font-semibold" : ""}`}>{row.a}</td>
                        <td className={`p-3 text-right ${row.bestKey === "b" ? "text-emerald font-semibold" : ""}`}>{row.b}</td>
                        <td className={`p-3 text-right ${row.bestKey === "c" ? "text-emerald font-semibold" : ""}`}>{row.c}</td>
                        <td className="p-3 text-right text-emerald font-medium">{row.best}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <div className="px-4 py-2 rounded-lg bg-primary/5 border border-primary/10 text-primary font-medium text-sm">
                  Estimated Savings Opportunity: 8–14%
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Built for procurement operations</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 stagger-children">
            {[
              {
                icon: BarChart3,
                title: "Quotation Comparison",
                desc: "Upload vendor quotations and compare pricing, delivery timelines, taxes, and commercial terms in a structured procurement workspace.",
              },
              {
                icon: FileText,
                title: "Document Processing",
                desc: "Extract and organize procurement data from supplier quotations, invoices, and supporting documents across multiple formats.",
              },
              {
                icon: Shield,
                title: "Vendor Analysis",
                desc: "Identify pricing gaps, missing line items, delivery risks, and commercial inconsistencies before purchase decisions are made.",
              },
              {
                icon: Sparkle,
                title: "Procurement Insights",
                desc: "Generate procurement summaries, supplier evaluations, and recommendation reports for internal stakeholders.",
              },
              {
                icon: Zap,
                title: "Negotiation Workflows",
                desc: "Prepare supplier negotiation drafts, pricing discussions, and clarification requests directly from procurement data.",
              },
              {
                icon: Upload,
                title: "Export & Reporting",
                desc: "Export procurement comparisons into shareable reports, spreadsheets, and approval-ready documentation.",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="group relative p-6 rounded-xl border bg-card hover:shadow-lg hover:shadow-primary/5 transition-shadow duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Designed for growing procurement teams</h2>
          <p className="text-muted-foreground mb-4">
            Procura is being developed as a unified procurement operations platform covering sourcing, quotation analysis, approvals, vendor management, procurement intelligence, and purchasing workflows.
          </p>
          <p className="text-muted-foreground mb-8">
            The quotation comparison workspace is the first module in the Procura platform.
          </p>
          <Link href="/signup" passHref>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
              <Button size="lg" className="gap-2 h-12 px-8">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
          <div className="flex items-center gap-2">
            <Sparkle className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">Procura</span>
            <span className="hidden md:inline border-l pl-2 ml-2">Procurement Infrastructure for Modern Businesses</span>
          </div>
          <div className="flex items-center gap-4">
            <p>© 2026 Procura</p>
            <span className="hidden md:inline border-l h-4 border-border"></span>
            <p>
              Built by <a href="https://mhmd-bilal.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors font-medium underline underline-offset-4 decoration-primary/30 hover:decoration-primary">Bilal</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
