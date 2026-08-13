import Image from "next/image";
import Link from "next/link";
import { ImageIcon, PenTool, SlidersHorizontal, Layers, Sparkles, Download, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: ImageIcon,
    title: "Image Editing",
    body: "Upload, replace, duplicate, crop, and adjust any image on the canvas.",
  },
  {
    icon: PenTool,
    title: "Creative Tools",
    body: "Add text, shapes, brush strokes, gradients, shadows, and glow effects.",
  },
  {
    icon: SlidersHorizontal,
    title: "Smart Properties",
    body: "Select any object and edit its relevant controls instantly on the right.",
  },
  {
    icon: Layers,
    title: "Pages & Layers",
    body: "Build multi-page designs, reorder objects, and duplicate work quickly.",
  },
  {
    icon: Sparkles,
    title: "AI Edit",
    body: "Describe an edit in plain language, with or without selecting a region.",
  },
  {
    icon: Download,
    title: "Export Anywhere",
    body: "Export PNG or JPEG, with your project autosaved as you work.",
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh w-full bg-slate-950 text-slate-100">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <Image src="/branding/astra-icon.png" alt="Astra" width={30} height={30} className="h-[30px] w-[30px] rounded-md" priority />
            <span className="text-base font-semibold tracking-wide">ASTRA</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-slate-400 sm:flex">
            <a href="#features" className="hover:text-slate-100">Features</a>
            <a href="#workflow" className="hover:text-slate-100">5onam.ai Flow</a>
          </nav>
          <Link
            href="/auth"
            className="rounded-md bg-[#6366F1] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5457e0]"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] opacity-40"
          style={{ background: "radial-gradient(600px circle at 50% 0%, #6366F1, transparent 70%)" }}
        />
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#6366F1]/40 bg-[#6366F1]/10 px-3 py-1 text-xs font-medium text-[#38BDF8]">
            <Sparkles size={12} /> AI-powered editing
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Edit images with{" "}
            <span className="bg-gradient-to-r from-[#6366F1] to-[#38BDF8] bg-clip-text text-transparent">
              natural language
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-400">
            Draw, add text and shapes, or just describe the edit you want. No experience required.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/workspace"
              className="flex items-center justify-center gap-2 rounded-md bg-[#6366F1] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#5457e0]"
            >
              Get Started <ArrowRight size={16} />
            </Link>
            <Link
              href="/editor"
              className="flex items-center justify-center gap-2 rounded-md border border-slate-700 px-6 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Continue as Sonam
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-slate-800/60 bg-slate-900/40 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#38BDF8]">
              Everything in one workspace
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Tools that stay out of your way</h2>
            <p className="mt-3 text-slate-400">Upload, design, refine, and export from one clean editor.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-[#6366F1]/40"
              >
                <f.icon size={20} className="text-[#38BDF8]" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5onam.ai workflow */}
      <section id="workflow" className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-[#38BDF8]">
              5onam.ai → Astra
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Keep the creative flow connected</h2>
            <p className="mt-3 text-slate-400">
              When 5onam.ai generates an image, its Edit action can hand that image directly to
              Astra — the user lands in the editor with the image already loaded, ready to
              continue refining it.
            </p>
            <Link
              href="/dev/launch-astra"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#6366F1] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#5457e0]"
            >
              See the launch flow <ArrowRight size={16} />
            </Link>
          </div>
          <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            {[
              { n: "01", t: "Generate", d: "5onam.ai creates an image" },
              { n: "02", t: "Continue", d: "Hand off to Astra" },
              { n: "03", t: "Edit", d: "Refine in the workspace" },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center gap-3">
                <div className="text-center">
                  <span className="block text-xs text-slate-500">{step.n}</span>
                  <strong className="mt-1 block text-sm">{step.t}</strong>
                  <span className="mt-0.5 block text-xs text-slate-500">{step.d}</span>
                </div>
                {i < 2 && <ArrowRight size={14} className="shrink-0 text-slate-700" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800/60 px-6 py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 rounded-2xl border border-[#6366F1]/30 bg-[#6366F1]/[0.06] px-8 py-10 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Start with a blank canvas</h2>
            <p className="mt-1.5 text-slate-400">No setup needed. Open the editor and create.</p>
          </div>
          <Link
            href="/workspace"
            className="flex shrink-0 items-center gap-2 rounded-md bg-[#6366F1] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#5457e0]"
          >
            Open Astra <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800/60 px-6 py-8 text-center text-xs text-slate-600">
        Astra — Image editor for 5onam.ai
      </footer>
    </div>
  );
}
