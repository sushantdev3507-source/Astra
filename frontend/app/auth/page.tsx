"use client";

/**
 * Sign in / create account -- now wired to REAL backend auth (bcrypt-
 * hashed passwords, JWT session tokens), not the earlier visual-only
 * mockup. See backend/app/services/auth/repository.py for the current
 * storage caveat: accounts live in-memory on the backend and are lost
 * on restart -- a deliberate, discussed placeholder until a real
 * database is confirmed with the team.
 */

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export default function AuthPage() {
  const router = useRouter();
  const auth = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const emailValid = EMAIL_PATTERN.test(email);
  const passwordValid = mode === "signin" ? password.length > 0 : password.length >= MIN_PASSWORD_LENGTH;
  const nameValid = mode === "signin" || name.trim().length > 0;
  const passwordsMatch = mode === "signin" || password === confirmPassword;
  const formValid = emailValid && passwordValid && nameValid && passwordsMatch;

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setServerError(null);
    setTouched(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (!formValid) return;

    setSubmitting(true);
    const result = mode === "signin" ? await auth.login(email, password) : await auth.signup(email, password, name);
    setSubmitting(false);

    if (result.success) {
      // Straight to the editor, not /workspace -- that chooser page
      // exists for someone who HASN'T decided guest vs. account yet.
      // By the time login/signup succeeds, that decision is already
      // made; sending them back to "continue as guest or create
      // account" is redundant and confusing (exactly the bug reported:
      // signing in successfully just looped back to the chooser).
      router.push("/editor");
    } else {
      setServerError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex min-h-dvh w-full bg-slate-950 text-slate-100">
      {/* Left: brand panel */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a1f3a] to-slate-950 px-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ background: "radial-gradient(500px circle at 30% 30%, #6366F1, transparent 70%)" }}
        />
        <Image
          src="/branding/astra-logo.jpeg"
          alt="Astra"
          width={140}
          height={140}
          className="relative h-[140px] w-[140px] rounded-2xl shadow-2xl"
        />
        <h1 className="relative mt-8 text-center text-3xl font-bold tracking-tight">
          Inspired by the Stars
        </h1>
        <p className="relative mt-3 max-w-sm text-center text-slate-400">
          Create stunning images using one powerful editor.
        </p>
      </div>

      {/* Right: form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/branding/astra-icon.png" alt="Astra" width={28} height={28} className="h-[28px] w-[28px] rounded-md" />
              <span className="font-semibold">ASTRA</span>
            </Link>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Welcome to Astra</h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Sign in or create an account to unlock the full potential of Astra.
          </p>

          <div className="mt-6 flex gap-2 rounded-lg bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "signin" ? "bg-[#6366F1] text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "signup" ? "bg-[#6366F1] text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            {mode === "signup" && (
              <label className="flex flex-col gap-1.5 text-sm">
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-[#6366F1]"
                />
                {touched && !nameValid && <span className="text-xs text-red-400">Enter your name.</span>}
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm">
              Email Address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-[#6366F1]"
              />
              {touched && !emailValid && <span className="text-xs text-red-400">Enter a valid email address.</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-[#6366F1]"
              />
              {touched && !passwordValid && (
                <span className="text-xs text-red-400">
                  {mode === "signup" ? `At least ${MIN_PASSWORD_LENGTH} characters.` : "Enter your password."}
                </span>
              )}
            </label>
            {mode === "signup" && (
              <label className="flex flex-col gap-1.5 text-sm">
                Confirm Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-[#6366F1]"
                />
                {touched && !passwordsMatch && <span className="text-xs text-red-400">Passwords don&apos;t match.</span>}
              </label>
            )}

            {serverError && (
              <p className="rounded-md bg-red-950/60 px-3 py-2 text-xs text-red-300" role="alert">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 rounded-md bg-[#6366F1] py-2.5 text-sm font-medium text-white transition hover:bg-[#5457e0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <button type="button" className="text-slate-400 hover:text-slate-200">
              Forgot Password?
            </button>
            <Link href="/workspace" className="font-medium text-[#38BDF8] hover:text-[#5cc9f5]">
              Continue as Guest
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
