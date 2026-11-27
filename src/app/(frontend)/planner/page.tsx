import { Metadata } from "next";
import { PlannerToday } from "@/components/planner/PlannerToday";

export const metadata: Metadata = {
  title: "Today's Hifz & Muraja'ah Schedule — Aayah Studio",
  description: "Daily Quran memorization and revision planner with Sabaq, Sabqi, and Manzil tasks.",
};

export default function PlannerPage() {
  return <PlannerToday />;
}
