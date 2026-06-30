"use client";

import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen max-h-screen overflow-scroll">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto bg-[#2b2e33]">
        {children}
      </main>
    </div>
  );
}
