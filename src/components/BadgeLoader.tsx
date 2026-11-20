"use client";

import React from "react";

type Props = {
  size?: "page" | "inline";
  fullScreen?: boolean;
  className?: string;
  label?: string;
};

export default function BadgeLoader({
  size = "page",
  fullScreen = false,
  className = "",
  label = "Loading",
}: Props) {
  const isInline = size === "inline";
  const sizeClasses = isInline
    ? "size-10"
    : "size-[72px] md:size-[96px]";

  const content = (
    <div
      role="status"
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div className={`relative ${sizeClasses} animate-pulse-gentle`}>
        <img
          src="/brand/ayah-badge-light.png"
          alt="Ayah Studio"
          width={isInline ? 40 : 96}
          height={isInline ? 40 : 96}
          className="dark:hidden w-full h-full object-contain"
        />
        <img
          src="/brand/ayah-badge-dark.png"
          alt="Ayah Studio"
          width={isInline ? 40 : 96}
          height={isInline ? 40 : 96}
          className="hidden dark:block w-full h-full object-contain"
        />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        {content}
      </div>
    );
  }

  return content;
}
