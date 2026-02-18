"use client";

import { type ReactNode } from "react";
import { HeaderProvider } from "@/components/header-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <HeaderProvider>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </HeaderProvider>
  );
}
