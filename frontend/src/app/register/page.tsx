"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, AlertCircle, Loader2, Check } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get("returnUrl") || "/dashboard";
  const returnUrl = rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//") ? rawReturnUrl : "/dashboard";

  const { user, loading: authLoading, register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(returnUrl);
    }
  }, [authLoading, user, router, returnUrl]);

  const hasMinLength = password.length >= 12;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter an email address.");
      return;
    }
    if (password.length < 12) {
      setErrorMessage("Password must be at least 12 characters long.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await register({
        email: email.trim(),
        password,
        full_name: fullName.trim() || undefined,
      });
      router.push(returnUrl);
    } catch (err: any) {
      console.error("Registration attempt failed:", err);
      setErrorMessage(
        err?.message || "Registration failed. An account with this email may already exist."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] bg-white rounded-2xl border border-[#E2E3DD] shadow-sm p-8 sm:p-10">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#172033] flex items-center justify-center text-white font-bold text-base shadow-sm mb-4">
          IF
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#20252D] tracking-tight">
          Create Workspace Account
        </h1>
        <p className="text-xs text-[#727B86] mt-1.5 max-w-[340px]">
          Provision an isolated analytics workspace for your customer feedback.
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-3.5 bg-[#FFF1F0] border border-[#FF6B61]/30 rounded-xl flex items-start gap-2.5 text-xs text-[#C6534D]"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#C6534D]" />
          <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="fullName"
            className="block text-xs font-semibold text-[#505966] uppercase tracking-wider mb-1.5"
          >
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#727B86] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              disabled={isSubmitting}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Chen"
              className="w-full pl-10 pr-4 py-2.5 bg-[#F6F5F1]/50 border border-[#E2E3DD] focus:border-[#3656C8] focus:bg-white focus:outline-none rounded-xl text-sm text-[#20252D] placeholder-[#727B86]/60 transition-colors"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-[#505966] uppercase tracking-wider mb-1.5"
          >
            Work Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#727B86] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="alex@company.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[#F6F5F1]/50 border border-[#E2E3DD] focus:border-[#3656C8] focus:bg-white focus:outline-none rounded-xl text-sm text-[#20252D] placeholder-[#727B86]/60 transition-colors"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-[#505966] uppercase tracking-wider"
            >
              Password
            </label>
            <span
              className={`text-[11px] font-medium flex items-center gap-1 ${
                hasMinLength ? "text-[#2E7D68]" : "text-[#727B86]"
              }`}
            >
              {hasMinLength && <Check className="w-3 h-3 text-[#2E7D68]" />}
              Min. 12 characters
            </span>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#727B86] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-11 py-2.5 bg-[#F6F5F1]/50 border border-[#E2E3DD] focus:border-[#3656C8] focus:bg-white focus:outline-none rounded-xl text-sm text-[#20252D] placeholder-[#727B86]/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#727B86] hover:text-[#20252D] transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-6 py-2.5 px-4 bg-[#3656C8] hover:bg-[#2946B2] disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#3656C8]/40"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Workspace...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-8 pt-6 border-t border-[#E2E3DD] text-center text-xs text-[#727B86]">
        Already have a workspace account?{" "}
        <Link
          href={`/login${returnUrl !== "/dashboard" ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
          className="font-semibold text-[#3656C8] hover:text-[#2946B2] transition-colors"
        >
          Sign in
        </Link>
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/"
          className="text-[11px] text-[#727B86] hover:text-[#20252D] transition-colors inline-flex items-center gap-1"
        >
          ← Return to InsightFlow overview
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#F6F5F1] flex flex-col justify-center items-center px-4 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-[460px] bg-white rounded-2xl border border-[#E2E3DD] p-10 flex flex-col items-center justify-center min-h-[420px]">
            <Loader2 className="w-6 h-6 animate-spin text-[#3656C8] mb-2" />
            <span className="text-xs text-[#727B86]">Loading registration...</span>
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
