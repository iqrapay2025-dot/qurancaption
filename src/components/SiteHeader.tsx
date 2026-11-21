"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, BookOpen, Headphones, Compass, Bookmark, HelpCircle } from "lucide-react";
import { Logo, ThemeToggle, useTheme } from "./shared";
import AccountMenu from "./AccountMenu";
import type { AppUser } from "@/lib/app/client";
import { NAV_ITEMS, isActive } from "@/lib/nav";
import { getActiveDonateUrl } from "@/lib/donate";

type SiteHeaderProps = {
  onStart?: () => void;
  user?: AppUser | null;
  onLogin?: () => void;
  onSignup?: () => void;
  onProjects?: () => void;
  onPricing?: () => void;
  onSettings?: () => void;
  onSignOut?: () => void;
  dark?: boolean;
  toggleTheme?: () => void;
};

function renderNavIcon(icon?: string) {
  switch (icon) {
    case "BookOpen":
      return <BookOpen size={16} aria-hidden="true" />;
    case "Headphones":
      return <Headphones size={16} aria-hidden="true" />;
    case "Compass":
      return <Compass size={16} aria-hidden="true" />;
    case "Bookmark":
      return <Bookmark size={16} aria-hidden="true" />;
    default:
      return <HelpCircle size={16} aria-hidden="true" />;
  }
}

export function SiteHeader({
  onStart,
  user = null,
  onLogin,
  onSignup,
  onProjects,
  onPricing,
  onSettings,
  onSignOut,
  dark: propDark,
  toggleTheme: propToggle,
}: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileOpenSections, setMobileOpenSections] = useState<Record<string, boolean>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navContainerRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const itemRefs = useRef<Record<string, (HTMLAnchorElement | null)[]>>({});

  const pathname = usePathname();
  const themeHook = useTheme();
  const hasDonateUrl = !!getActiveDonateUrl();

  const dark = propDark !== undefined ? propDark : themeHook.dark;
  const toggleTheme = propToggle !== undefined ? propToggle : themeHook.toggle;

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileOpenSections({});
  };

  const isQuranOrListen =
    pathname === "/quran" ||
    pathname?.startsWith("/quran/") ||
    pathname === "/listen" ||
    pathname?.startsWith("/listen/");

  // Close dropdown on pathname change
  useEffect(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Click outside to close desktop dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  // Handle keyboard events inside a dropdown
  const handleDropdownKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
    sectionLabel: string
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpenDropdown(null);
      triggerRefs.current[sectionLabel]?.focus();
      return;
    }

    const items = itemRefs.current[sectionLabel] ?? [];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const currentIdx = items.findIndex((el) => el === document.activeElement);
      const nextIdx = currentIdx === -1 || currentIdx >= items.length - 1 ? 0 : currentIdx + 1;
      items[nextIdx]?.focus();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const currentIdx = items.findIndex((el) => el === document.activeElement);
      const prevIdx = currentIdx <= 0 ? items.length - 1 : currentIdx - 1;
      items[prevIdx]?.focus();
      return;
    }
  };

  const toggleMobileSection = (label: string) => {
    setMobileOpenSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleStart = () => {
    if (onStart) onStart();
    else window.location.href = "/#/editor";
  };

  const handlePricing = () => {
    if (onPricing) onPricing();
    else window.location.href = "/pricing";
  };

  const handleLogin = () => {
    if (onLogin) onLogin();
    else window.location.href = "/#/editor";
  };

  const handleSignup = () => {
    if (onSignup) onSignup();
    else window.location.href = "/#/editor";
  };

  return (
    <header className="border-b border-border bg-card sticky top-0 z-30">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 md:h-18 gap-2 lg:gap-4">
        {/* Logo */}
        <div className="shrink-0">
          <Link
            href="/"
            className="hover:opacity-90 inline-block focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
          >
            <Logo compact />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav
          ref={navContainerRef}
          aria-label="Main navigation"
          className="hidden items-center justify-center gap-3 md:gap-4 lg:gap-8 text-xs lg:text-sm font-medium md:flex"
        >
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              const active = isActive(pathname, item.label);
              const isOpen = openDropdown === item.label;

              return (
                <div
                  key={item.label}
                  className="relative"
                  onKeyDown={(e) => handleDropdownKeyDown(e, item.label)}
                >
                  <button
                    ref={(el) => {
                      triggerRefs.current[item.label] = el;
                    }}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenDropdown((prev) => (prev === item.label ? null : item.label))
                    }
                    className={`inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-ring rounded-sm ${
                      active ? "text-primary font-semibold" : "text-foreground/80"
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {isOpen && (
                    <div
                      role="menu"
                      aria-label={`${item.label} navigation`}
                      className="absolute top-full left-0 mt-2 w-72 rounded-sm border border-border bg-card p-1.5 shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      {item.children.map((child, idx) => {
                        const childActive = isActive(pathname, child.href);

                        return (
                          <Link
                            key={child.href}
                            ref={(el) => {
                              if (!itemRefs.current[item.label]) {
                                itemRefs.current[item.label] = [];
                              }
                              itemRefs.current[item.label][idx] = el;
                            }}
                            href={child.href}
                            role="menuitem"
                            aria-current={childActive ? "page" : undefined}
                            onClick={() => setOpenDropdown(null)}
                            className={`flex items-start gap-3 rounded-sm p-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                              childActive
                                ? "bg-muted text-primary font-semibold"
                                : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <span className="mt-0.5 text-muted-foreground shrink-0">
                              {renderNavIcon(child.icon)}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-xs lg:text-sm font-medium leading-none">
                                {child.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground mt-1 font-normal">
                                {child.description}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = isActive(pathname, item.href || "/");
            if (item.label === "Pricing" && onPricing) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={handlePricing}
                  className={`whitespace-nowrap transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-ring rounded-sm ${
                    active ? "text-primary font-semibold" : "text-foreground/80"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href || "/"}
                className={`whitespace-nowrap transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-ring rounded-sm ${
                  active ? "text-primary font-semibold" : "text-foreground/80"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls & Theme Toggle */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
          {/* Create captions outline button (shown on /quran and /listen pages on desktop) */}
          {isQuranOrListen && (
            <button
              type="button"
              onClick={handleStart}
              className="hidden md:inline-flex whitespace-nowrap shrink-0 rounded-sm border border-foreground/80 bg-card px-2.5 lg:px-3.5 py-1 lg:py-1.5 text-xs lg:text-sm font-semibold transition hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-ring"
            >
              Create captions
            </button>
          )}

          {hasDonateUrl && (
            <Link
              href="/donate"
              className="inline-flex items-center justify-center whitespace-nowrap shrink-0 rounded-sm border border-border bg-card px-2.5 lg:px-3 py-1 lg:py-1.5 text-xs lg:text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring transition-colors"
            >
              Donate
            </Link>
          )}

          <div className="shrink-0">
            <ThemeToggle dark={dark} toggle={toggleTheme} />
          </div>

          {/* Auth buttons / Account menu */}
          {!user && (
            <button
              type="button"
              onClick={handleLogin}
              className="hidden whitespace-nowrap shrink-0 text-xs lg:text-sm font-semibold hover:text-gold sm:block focus-visible:outline-2 focus-visible:outline-ring rounded-sm px-1.5 lg:px-2 py-1"
            >
              Log in
            </button>
          )}

          <button
            type="button"
            onClick={user ? handleStart : handleSignup}
            className="hidden whitespace-nowrap shrink-0 rounded-sm border border-foreground/80 px-2.5 lg:px-3.5 py-1 lg:py-1.5 text-xs lg:text-sm font-semibold hover:bg-foreground hover:text-background sm:inline-flex focus-visible:outline-2 focus-visible:outline-ring"
          >
            {user ? "Open editor" : "Sign up"}
          </button>

          {user && onProjects && onSettings && onSignOut && (
            <AccountMenu
              user={user}
              onLogin={handleLogin}
              onProjects={onProjects}
              onSettings={onSettings}
              onSignOut={onSignOut}
            />
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            className="grid size-9 place-items-center rounded-sm border border-border hover:bg-muted md:hidden focus-visible:outline-2 focus-visible:outline-ring"
          >
            {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Main navigation"
          className="border-t border-border bg-card px-5 py-3 md:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col">
            {NAV_ITEMS.map((item) => {
              if (item.children) {
                const active = isActive(pathname, item.label);
                const isOpen = !!mobileOpenSections[item.label];

                return (
                  <div key={item.label} className="flex flex-col border-b border-border/50 py-1">
                    <button
                      type="button"
                      onClick={() => toggleMobileSection(item.label)}
                      className={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm font-medium hover:bg-muted ${
                        active ? "text-primary font-semibold" : ""
                      }`}
                      aria-expanded={isOpen}
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {isOpen && (
                      <div className="flex flex-col pl-4 pr-1 py-1 space-y-1">
                        {item.children.map((child) => {
                          const childActive = isActive(pathname, child.href);

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={closeMobileMenu}
                              aria-current={childActive ? "page" : undefined}
                              className={`flex items-start gap-2.5 rounded-sm px-3 py-2 text-sm hover:bg-muted ${
                                childActive ? "text-primary font-semibold bg-muted" : "text-foreground"
                              }`}
                            >
                              <span className="mt-0.5 text-muted-foreground shrink-0">
                                {renderNavIcon(child.icon)}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-medium text-xs sm:text-sm">{child.label}</span>
                                <span className="text-[11px] text-muted-foreground font-normal">
                                  {child.description}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const active = isActive(pathname, item.href || "/");
              if (item.label === "Pricing" && onPricing) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      handlePricing();
                    }}
                    className={`rounded-sm px-3 py-3 text-left text-sm font-medium hover:bg-muted ${
                      active ? "text-primary font-semibold" : ""
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </button>
                );
              }
              return (
                <Link
                  key={item.label}
                  href={item.href || "/"}
                  onClick={closeMobileMenu}
                  className={`rounded-sm px-3 py-3 text-sm font-medium hover:bg-muted ${
                    active ? "text-primary font-semibold" : ""
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}

            {hasDonateUrl && (
              <Link
                href="/donate"
                onClick={closeMobileMenu}
                className="rounded-sm px-3 py-3 text-sm font-medium hover:bg-muted text-foreground flex items-center justify-between"
              >
                <span>Donate</span>
              </Link>
            )}

            {/* Auth Buttons in Mobile Menu */}
            {!user ? (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    handleLogin();
                  }}
                  className="rounded-sm border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted text-center"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    handleSignup();
                  }}
                  className="rounded-sm bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 text-center"
                >
                  Sign up
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  handleStart();
                }}
                className="mt-2 rounded-sm bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 text-center"
              >
                Open editor
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
