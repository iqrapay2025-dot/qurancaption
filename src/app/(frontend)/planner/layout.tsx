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
      <div className="min-h-screen bg-[#bcd5ca] dark:bg-[#101c17] transition-colors">
        {children}
      </div>
    </>
  );
}
