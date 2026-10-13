"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import AppSidebar from "@/components/navigation/AppSidebar";
import { DatasetProvider } from "@/lib/context/DatasetContext";
import { useAuth } from "@/lib/context/AuthContext";
import { Loader2 } from "lucide-react";

function AuthGuardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      const queryString = searchParams?.toString();
      const returnUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }
  }, [user, loading, router, pathname, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F5F1] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#172033] flex items-center justify-center text-white font-bold text-sm shadow-sm animate-pulse">
          IF
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#727B86]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3656C8]" />
          <span>Verifying workspace session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F6F5F1] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#172033] flex items-center justify-center text-white font-bold text-sm shadow-sm">
          IF
        </div>
        <div className="text-xs text-[#727B86]">Redirecting to authentication...</div>
      </div>
    );
  }

  return (
    <DatasetProvider>
      <div className="min-h-screen bg-[#F6F5F1] text-[#202821] flex">
        {/* Sidebar Navigation */}
        <AppSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          <main className="flex-1 pb-16">{children}</main>
        </div>
      </div>
    </DatasetProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F5F1] flex items-center justify-center text-xs text-[#727B86]">
          Loading workspace...
        </div>
      }
    >
      <AuthGuardLayout>{children}</AuthGuardLayout>
    </Suspense>
  );
}
