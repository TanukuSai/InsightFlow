"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("analyst@insightflow.ai");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col justify-center items-center p-6 relative">
      <div className="w-full max-w-md solid-data rounded-3xl border border-[#E2E3DD] shadow-sm p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-[#3656C8] text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
              ✦
            </div>
            <span className="font-extrabold text-lg text-[#20252D]">InsightFlow</span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#7B8491] px-2 py-0.5 rounded-full bg-[#F0F2F5]">
              Observatory
            </span>
          </Link>
          <h2 className="text-xl font-extrabold text-[#20252D]">Sign in to your workspace</h2>
          <p className="text-xs text-[#7B8491]">
            Access customer feedback intelligence, deduplication, and issue dossiers
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4D5765] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#F6F5F1] border border-[#E2E3DD] rounded-xl text-xs text-[#20252D] focus:outline-none focus:border-[#3656C8] focus:ring-1 focus:ring-[#3656C8]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#4D5765]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#3656C8] font-semibold hover:underline"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#F6F5F1] border border-[#E2E3DD] rounded-xl text-xs text-[#20252D] focus:outline-none focus:border-[#3656C8] focus:ring-1 focus:ring-[#3656C8]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 focus-visible-ring"
          >
            {loading ? "Authenticating..." : "Sign In to Workspace →"}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-[#7B8491]">
          Don't have an account?{" "}
          <Link href="/sign-up" className="font-bold text-[#3656C8] hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
