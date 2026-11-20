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
    label: "Listen to Quran",
    description: "Full recitations by surah",
    href: "/listen",
    icon: "Headphones",
  },
  {
    label: "Bookmarks",
    description: "Your saved ayahs",
    href: "/quran/bookmarks",
    icon: "Bookmark",
  },
];

export const LEARN_CHILDREN: NavChild[] = [
  {
    label: "How it works",
    description: "Overview of Ayah Studio & the editor",
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

  // "Quran" dropdown parent active for /quran, /quran/[surah], and /listen
  if (cleanTarget === "Quran" || cleanTarget === "quran" || cleanTarget === "/quran") {
    return (
      cleanPath === "/quran" ||
      cleanPath.startsWith("/quran/") ||
      cleanPath === "/listen" ||
      cleanPath.startsWith("/listen/")
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
