"use client";

import React, { useState } from "react";
import AppSidebar from "@/components/navigation/AppSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F8F5] text-[#202821] flex">
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
  );
}
