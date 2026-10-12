"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          <h2 className="text-xl font-extrabold text-[#20252D]">Create your workspace</h2>
          <p className="text-xs text-[#7B8491]">
            Get started with customer feedback intelligence and deduplication
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4D5765] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-4 py-2.5 bg-[#F6F5F1] border border-[#E2E3DD] rounded-xl text-xs text-[#20252D] focus:outline-none focus:border-[#3656C8] focus:ring-1 focus:ring-[#3656C8]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4D5765] mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              className="w-full px-4 py-2.5 bg-[#F6F5F1] border border-[#E2E3DD] rounded-xl text-xs text-[#20252D] focus:outline-none focus:border-[#3656C8] focus:ring-1 focus:ring-[#3656C8]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4D5765] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 bg-[#F6F5F1] border border-[#E2E3DD] rounded-xl text-xs text-[#20252D] focus:outline-none focus:border-[#3656C8] focus:ring-1 focus:ring-[#3656C8]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 focus-visible-ring"
          >
            {loading ? "Creating..." : "Create Workspace →"}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-[#7B8491]">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-bold text-[#3656C8] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
