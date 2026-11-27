import { Metadata } from "next";
import { PlannerProgress } from "@/components/planner/PlannerProgress";

export const metadata: Metadata = {
  title: "Memorization Progress & 604-Page Grid — Aayah Studio",
  description: "View your Quran memorization statistics, juz completion, streak, and interactive 604-page Madani Mushaf grid.",
};

export default function PlannerProgressPage() {
  return <PlannerProgress />;
}
