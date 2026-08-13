"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Save, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

export default function WorkspacePage() {
  const router = useRouter();
  const auth = useAuth();

  // This chooser only makes sense for someone who hasn't decided
  // guest-vs-account yet. If they're already authenticated (e.g. they
  // landed here via a bookmark, the back button, or clicking "Get
  // Started" on the landing page while already signed in), there's no
  // decision left to make -- take them straight to the editor instead
  // of showing "Create Account" (they have one) and "Continue as
  // Guest" (they're not a guest). See /auth/page.tsx for the other
  // half of this fix -- the sign-in/sign-up success redirect.
  useEffect(() => {
    if (!auth.isLoading && auth.user) {
      router.replace("/editor");
    }
  }, [auth.isLoading, auth.user, router]);

  if (auth.isLoading || auth.user) {
    return null;
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800/60 px-6 py-3">
        <div className="flex items-center gap-2.5">
          <Image src="/branding/astra-icon.png" alt="Astra" width={28} height={28} className="h-[28px] w-[28px] rounded-md" />
          <span className="font-semibold">ASTRA</span>
        </div>
        <Link
          href="/"
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Home
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div
          className="mb-5 h-14 w-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#38BDF8]"
          style={{ boxShadow: "0 0 40px rgba(99,102,241,0.5)" }}
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-[#38BDF8]">
          Welcome to Astra
        </span>
        <h1 className="mt-2 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Let&apos;s Create Something Amazing
        </h1>
        <p className="mt-3 max-w-md text-center text-slate-400">
          Choose how you want to continue with the Astra editor.
        </p>

        <div className="mt-10 grid w-full max-w-3xl gap-5 sm:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#6366F1]/15">
              <Zap size={20} className="text-[#6366F1]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Continue as Guest</h2>
            <p className="mt-1.5 flex-1 text-sm text-slate-400">
              Start editing immediately without creating an account.
            </p>
            <span className="mt-3 text-xs text-slate-500">Fast &amp; seamless editing</span>
            <Link
              href="/editor"
              className="mt-5 flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#6366F1] to-[#38BDF8] py-2.5 text-sm font-medium text-white"
            >
              Continue as Sonam <ArrowRight size={15} />
            </Link>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#38BDF8]/15">
              <Save size={20} className="text-[#38BDF8]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Create Account</h2>
            <p className="mt-1.5 flex-1 text-sm text-slate-400">
              Create an Astra account to save projects and access your work anytime.
            </p>
            <span className="mt-3 text-xs text-slate-500">Save your projects</span>
            <Link
              href="/auth"
              className="mt-5 flex items-center justify-center gap-2 rounded-md border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Create Account
            </Link>
          </div>
        </div>

        <p className="mt-8 text-xs text-slate-600">Your images stay in your browser until you export them.</p>
      </main>
    </div>
  );
}
