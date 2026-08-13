"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  forgotPassword,
  resetPassword,
} from "@/lib/api/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type AuthMode = "signin" | "signup" | "forgot" | "reset";

export default function AuthPage() {
  const router = useRouter();
  const auth = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [resetToken, setResetToken] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const emailValid = EMAIL_PATTERN.test(email);

  const passwordValid =
    mode === "signin"
      ? password.length > 0
      : mode === "signup" || mode === "reset"
        ? password.length >= MIN_PASSWORD_LENGTH
        : true;

  const nameValid =
    mode !== "signup" || name.trim().length > 0;

  const passwordsMatch =
    mode !== "signup" && mode !== "reset"
      ? true
      : password === confirmPassword;

  const formValid =
    mode === "forgot"
      ? emailValid
      : mode === "reset"
        ? passwordValid && passwordsMatch
        : emailValid && passwordValid && nameValid && passwordsMatch;

  function switchMode(next: AuthMode) {
    setMode(next);
    setServerError(null);
    setResetMessage("");
    setTouched(false);
    setPassword("");
    setConfirmPassword("");

    if (next !== "reset") {
      setResetToken("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setTouched(true);
    setServerError(null);
    setResetMessage("");

    if (!formValid) return;

    setSubmitting(true);

    try {
      if (mode === "forgot") {
        const result = await forgotPassword(email);

        if (!result.reset_token) {
          setResetMessage(
            result.message ||
              "If an account exists for this email, a reset request has been created."
          );
          setSubmitting(false);
          return;
        }

        setResetToken(result.reset_token);
        setMode("reset");
        setTouched(false);
        setResetMessage(
          "Reset request created. Enter your new password below."
        );
        setSubmitting(false);
        return;
      }

      if (mode === "reset") {
        const result = await resetPassword(resetToken, password);

        setResetMessage(
          result.message || "Password reset successfully."
        );

        setPassword("");
        setConfirmPassword("");
        setResetToken("");
        setTouched(false);
        setMode("signin");
        setSubmitting(false);
        return;
      }

      const result =
        mode === "signin"
          ? await auth.login(email, password)
          : await auth.signup(email, password, name);

      if (result.success) {
        router.push("/editor");
      } else {
        setServerError(
          result.error ?? "Something went wrong. Please try again."
        );
      }
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getTitle() {
    if (mode === "forgot") return "Forgot Password?";
    if (mode === "reset") return "Reset Password";
    return "Welcome to Astra";
  }

  function getDescription() {
    if (mode === "forgot") {
      return "Enter your email address to reset your password.";
    }

    if (mode === "reset") {
      return "Create a new password for your Astra account.";
    }

    return "Sign in or create an account to unlock the full potential of Astra.";
  }

  return (
    <div className="flex min-h-dvh w-full bg-slate-950 text-slate-100">
      {/* Left: brand panel */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a1f3a] to-slate-950 px-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(500px circle at 30% 30%, #6366F1, transparent 70%)",
          }}
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
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/branding/astra-icon.png"
                alt="Astra"
                width={28}
                height={28}
                className="h-[28px] w-[28px] rounded-md"
              />
              <span className="font-semibold">ASTRA</span>
            </Link>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">
            {getTitle()}
          </h2>

          <p className="mt-1.5 text-sm text-slate-400">
            {getDescription()}
          </p>

          {/* Sign in / Sign up tabs */}
          {(mode === "signin" || mode === "signup") && (
            <div className="mt-6 flex gap-2 rounded-lg bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                  mode === "signin"
                    ? "bg-[#6366F1] text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-[#6366F1] text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-6 flex flex-col gap-4"
          >
            {/* Name */}
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

                {touched && !nameValid && (
                  <span className="text-xs text-red-400">
                    Enter your name.
                  </span>
                )}
              </label>
            )}

            {/* Email */}
            {(mode === "signin" ||
              mode === "signup" ||
              mode === "forgot") && (
              <label className="flex flex-col gap-1.5 text-sm">
                Email Address

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-[#6366F1]"
                />

                {touched && !emailValid && (
                  <span className="text-xs text-red-400">
                    Enter a valid email address.
                  </span>
                )}
              </label>
            )}

            {/* Password */}
            {(mode === "signin" ||
              mode === "signup" ||
              mode === "reset") && (
              <label className="flex flex-col gap-1.5 text-sm">
                {mode === "reset" ? "New Password" : "Password"}

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "reset"
                      ? "Enter new password"
                      : "Password"
                  }
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-[#6366F1]"
                />

                {touched && !passwordValid && (
                  <span className="text-xs text-red-400">
                    At least {MIN_PASSWORD_LENGTH} characters.
                  </span>
                )}
              </label>
            )}

            {/* Confirm password */}
            {(mode === "signup" || mode === "reset") && (
              <label className="flex flex-col gap-1.5 text-sm">
                Confirm Password

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm password"
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-[#6366F1]"
                />

                {touched && !passwordsMatch && (
                  <span className="text-xs text-red-400">
                    Passwords don&apos;t match.
                  </span>
                )}
              </label>
            )}

            {/* Reset token for local development */}
            {mode === "reset" && resetToken && (
              <div className="rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
                Reset request verified. You can now create your new
                password.
              </div>
            )}

            {/* Success message */}
            {resetMessage && (
              <p
                className="rounded-md bg-emerald-950/60 px-3 py-2 text-xs text-emerald-300"
                role="status"
              >
                {resetMessage}
              </p>
            )}

            {/* Error */}
            {serverError && (
              <p
                className="rounded-md bg-red-950/60 px-3 py-2 text-xs text-red-300"
                role="alert"
              >
                {serverError}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-1 rounded-md bg-[#6366F1] py-2.5 text-sm font-medium text-white transition hover:bg-[#5457e0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign In"
                  : mode === "signup"
                    ? "Create Account"
                    : mode === "forgot"
                      ? "Send Reset Request"
                      : "Reset Password"}
            </button>
          </form>

          {/* Bottom actions */}
          <div className="mt-5 flex items-center justify-between text-sm">
            {(mode === "signin" || mode === "signup") && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-slate-400 hover:text-slate-200"
              >
                Forgot Password?
              </button>
            )}

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-slate-400 hover:text-slate-200"
              >
                ← Back to Sign In
              </button>
            )}

            {mode === "reset" && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-slate-400 hover:text-slate-200"
              >
                ← Back to Sign In
              </button>
            )}

            {(mode === "signin" || mode === "signup") && (
              <Link
                href="/workspace"
                className="font-medium text-[#38BDF8] hover:text-[#5cc9f5]"
              >
                Continue as Sonam
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}