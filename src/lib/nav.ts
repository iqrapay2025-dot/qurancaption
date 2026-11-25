export type NavChild = {
  label: string;
  description: string;
  href: string;
  icon?: string;
};

export type NavItem = {
  label: string;
  href?: string;
  children?: NavChild[];
};

export const QURAN_CHILDREN: NavChild[] = [
  {
    label: "Read Quran",
    description: "Surahs, translation and tafsir",
    href: "/quran",
    icon: "BookOpen",
  },
  {
    label: "Mushaf View",
    description: "Page-by-page Madani Mushaf reading",
    href: "/mushaf",
    icon: "BookOpen",
  },
  {
    label: "Listen to Quran",
    description: "Full recitations by surah",
    href: "/listen",
    icon: "Headphones",
  },
  {
    label: "Offline Downloads",
    description: "Read and listen offline with zero data",
    href: "/offline",
    icon: "HardDrive",
  },
  {
    label: "Memorization Planner",
    description: "Plan your memorization and revision",
    href: "/planner",
    icon: "Calendar",
  },
  {
    label: "Bookmarks",
    description: "Your saved ayahs",
    href: "/quran/bookmarks",
    icon: "Bookmark",
  },
];

export const ADHKAR_CHILDREN: NavChild[] = [
  {
    label: "All Adhkar & Du'as",
    description: "Categories, counter, virtues & daily progress",
    href: "/adhkar",
    icon: "DuaHands",
  },
  {
    label: "Morning Adhkar",
    description: "Remembrance from Fajr to sunrise",
    href: "/adhkar/morning",
    icon: "Sunrise",
  },
  {
    label: "Evening Adhkar",
    description: "Remembrance from Asr to sunset",
    href: "/adhkar/evening",
    icon: "Sunset",
  },
  {
    label: "After Salah",
    description: "Authentic supplications post prayer",
    href: "/adhkar/after-salah",
    icon: "Clock",
  },
  {
    label: "Before Sleep",
    description: "Night protection and Sunnah adhkar",
    href: "/adhkar/sleep",
    icon: "Moon",
  },
];

export const LEARN_CHILDREN: NavChild[] = [
  {
    label: "How it works",
    description: "Overview of Aayah Studio & the editor",
    href: "/how-it-works",
    icon: "Compass",
  },
  {
    label: "Guide",
    description: "Formatting tips, shortcuts and styling",
    href: "/guide",
    icon: "BookOpen",
  },
];

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Quran", children: QURAN_CHILDREN },
  { label: "Adhkar", children: ADHKAR_CHILDREN },
  { label: "Learn", children: LEARN_CHILDREN },
  { label: "Pricing", href: "/pricing" },
];

export function isActive(pathname: string | null | undefined, target: string): boolean {
  if (!pathname) return false;
  const cleanPath = pathname.replace(/\/$/, "") || "/";
  const cleanTarget = target.replace(/\/$/, "") || "/";

  // Home matches only exactly
  if (cleanTarget === "/" || cleanTarget === "/home") {
    return cleanPath === "/" || cleanPath === "/home";
  }

  // "Quran" dropdown parent active for /quran, /quran/[surah], /listen, /mushaf, /offline, and /planner
  if (cleanTarget === "Quran" || cleanTarget === "quran" || cleanTarget === "/quran") {
    return (
      cleanPath === "/quran" ||
      cleanPath.startsWith("/quran/") ||
      cleanPath === "/listen" ||
      cleanPath.startsWith("/listen/") ||
      cleanPath === "/mushaf" ||
      cleanPath.startsWith("/mushaf/") ||
      cleanPath === "/offline" ||
      cleanPath.startsWith("/offline/") ||
      cleanPath === "/planner" ||
      cleanPath.startsWith("/planner/")
    );
  }

  // "Learn" dropdown parent active for /how-it-works, /guide
  if (cleanTarget === "Learn" || cleanTarget === "learn") {
    return (
      cleanPath === "/how-it-works" ||
      cleanPath.startsWith("/how-it-works/") ||
      cleanPath === "/guide" ||
      cleanPath.startsWith("/guide/")
    );
  }

  // "Adhkar" top-level link active for /adhkar and its sub-routes
  if (cleanTarget === "Adhkar" || cleanTarget === "adhkar" || cleanTarget === "/adhkar") {
    return cleanPath === "/adhkar" || cleanPath.startsWith("/adhkar/");
  }

  // /listen matches only listen
  if (cleanTarget === "/listen") {
    return cleanPath === "/listen" || cleanPath.startsWith("/listen/");
  }

  // /how-it-works highlights "How it works"
  if (cleanTarget === "/how-it-works" || cleanTarget === "How it works" || cleanTarget === "Create") {
    return cleanPath === "/how-it-works" || cleanPath.startsWith("/how-it-works/");
  }

  // /guide highlights "Guide"
  if (cleanTarget === "/guide" || cleanTarget === "Guide") {
    return cleanPath === "/guide" || cleanPath.startsWith("/guide/");
  }

  return cleanPath === cleanTarget || cleanPath.startsWith(`${cleanTarget}/`);
}
