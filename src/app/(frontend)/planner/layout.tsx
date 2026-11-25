import React from "react";
import { SiteHeader } from "@/components/SiteHeader";

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background">
        {children}
      </main>
    </>
  );
}
