"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutGrid,
  BookOpen,
  BarChart3,
  Settings,
  Headphones,
  User,
} from "lucide-react";
import { Logo, ThemeToggle, useTheme } from "@/components/shared";

interface PlannerShellProps {
  activeTab: "today" | "progress" | "settings" | "setup";
  children: React.ReactNode;
  sabaqStartPage?: number;
}

export function PlannerShell({
  activeTab,
  children,
  sabaqStartPage = 1,
}: PlannerShellProps) {
  const { dark, toggle, themeMode, setThemeMode } = useTheme();

  const getLinkClasses = (tab: "today" | "progress" | "settings" | "setup") => {
    const isActive = activeTab === tab;
    return isActive
      ? "w-10 h-10 rounded-xl bg-[#e6f4ee] dark:bg-[#1c382e] text-[#0c8a66] dark:text-[#52d3a7] flex items-center justify-center shadow-xs transition-colors"
      : "w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 flex items-center justify-center transition-colors";
  };

  const getMobileLinkClasses = (tab: "today" | "progress" | "settings" | "setup") => {
    const isActive = activeTab === tab;
    return isActive
      ? "flex flex-col items-center gap-0.5 text-xs font-bold text-[#0c8a66] dark:text-[#52d3a7]"
      : "flex flex-col items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
  };

  return (
    <div className="min-h-screen bg-[#bcd5ca] dark:bg-[#101c17] p-2 sm:p-4 md:p-8 flex items-center justify-center overflow-x-hidden transition-colors">
      {/* Outer Dashboard Window Container */}
      <div className="w-full max-w-6xl rounded-2xl sm:rounded-3xl md:rounded-[36px] bg-[#f8faf9] dark:bg-[#121c18] shadow-2xl border border-white/80 dark:border-white/10 overflow-hidden flex flex-col md:flex-row min-h-[640px] md:min-h-[680px]">
        {/* Left Vertical Dock / Icon Rail (Desktop only: md:flex) */}
        <aside className="hidden md:flex w-20 bg-white/95 dark:bg-[#15241f] border-r border-slate-200/70 dark:border-slate-800/80 flex-col items-center justify-between py-7 shrink-0">
          <div className="flex flex-col items-center gap-6">
            {/* Official Brand Logo Mark */}
            <Link
              href="/"
              className="size-10 rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
              title="Aayah Studio Home"
            >
              <Logo iconOnly />
            </Link>

            {/* Vertical Icons Nav */}
            <nav className="flex flex-col items-center gap-3">
              <Link
                href="/planner"
                className={getLinkClasses("today")}
                title="Today's Schedule"
              >
                <LayoutGrid size={18} />
              </Link>

              <Link
                href={`/mushaf/${sabaqStartPage}`}
                className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 flex items-center justify-center transition-colors"
                title="Open Mushaf"
              >
                <BookOpen size={18} />
              </Link>

              <Link
                href="/planner/progress"
                className={getLinkClasses("progress")}
                title="604-Page Progress Grid"
              >
                <BarChart3 size={18} />
              </Link>

              <Link
                href="/planner/settings"
                className={getLinkClasses("settings")}
                title="Planner Settings & Schedule"
              >
                <Settings size={18} />
              </Link>

              <Link
                href="/adhkar"
                className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 flex items-center justify-center transition-colors"
                title="Adhkar & Duas"
              >
                <Headphones size={18} />
              </Link>
            </nav>
          </div>

          {/* Bottom Dock Actions: Theme Toggle & Profile */}
          <div className="flex flex-col items-center gap-2.5">
            <ThemeToggle
              dark={dark}
              toggle={toggle}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
            />

            <Link
              href="/planner"
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Profile"
            >
              <User size={16} />
            </Link>
          </div>
        </aside>

        {/* Mobile Header Bar (md:hidden) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[#15241f] border-b border-slate-200/70 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <Logo compact />
          </Link>
          <ThemeToggle
            dark={dark}
            toggle={toggle}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-7 md:p-9 space-y-6 overflow-y-auto max-w-full pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (md:hidden - fixed bottom for native mobile UX) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#15231e]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 py-2 px-3 flex items-center justify-around shadow-lg"
      >
        <Link href="/planner" className={getMobileLinkClasses("today")}>
          <LayoutGrid size={18} />
          <span className="text-[10px]">Today</span>
        </Link>

        <Link
          href={`/mushaf/${sabaqStartPage}`}
          className="flex flex-col items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <BookOpen size={18} />
          <span className="text-[10px]">Mushaf</span>
        </Link>

        <Link href="/planner/progress" className={getMobileLinkClasses("progress")}>
          <BarChart3 size={18} />
          <span className="text-[10px]">Progress</span>
        </Link>

        <Link href="/planner/settings" className={getMobileLinkClasses("settings")}>
          <Settings size={18} />
          <span className="text-[10px]">Settings</span>
        </Link>

        <Link
          href="/adhkar"
          className="flex flex-col items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <Headphones size={18} />
          <span className="text-[10px]">Adhkar</span>
        </Link>
      </nav>
    </div>
  );
}
