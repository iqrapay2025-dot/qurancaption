"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { loadPlan } from "@/lib/planner/storage";
import { PlannerPlan } from "@/lib/planner/types";

export function TodayPlanChip({ className = "" }: { className?: string }) {
  const [plan, setPlan] = useState<PlannerPlan | null>(null);

  useEffect(() => {
    setPlan(loadPlan());
  }, []);

  if (!plan || plan.paused) return null;

  return (
    <Link
      href="/planner"
      title="View today's Hifz & Muraja'ah tasks"
      className={`items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-all shadow-2xs ${
        className || "inline-flex"
      }`}
    >
      <Calendar size={13} className="text-emerald-600 dark:text-emerald-400" />
      <span>Today&apos;s Plan</span>
      <ChevronRight size={12} className="opacity-70" />
    </Link>
  );
}
