import { Metadata } from "next";
import { PlannerSetup } from "@/components/planner/PlannerSetup";

export const metadata: Metadata = {
  title: "Setup Your Hifz Plan — Aayah Studio",
  description: "Configure your personal Quran memorization and revision schedule with custom pace and study days.",
};

export default function PlannerSetupPage() {
  return (
    <div className="min-h-screen bg-background">
      <PlannerSetup />
    </div>
  );
}
