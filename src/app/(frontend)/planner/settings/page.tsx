import { Metadata } from "next";
import { PlannerSettings } from "@/components/planner/PlannerSettings";

export const metadata: Metadata = {
  title: "Planner Settings & Backup — Aayah Studio",
  description: "Configure your daily pace, revision cycle, reminders, and export or restore your memorization backup.",
};

export default function PlannerSettingsPage() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <PlannerSettings />
    </div>
  );
}
