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

  const imgSize = isInline ? 40 : 96;
  const lightWebp = isInline ? "/brand/ayah-badge-light-48.webp" : "/brand/ayah-badge-light-96.webp";
  const darkWebp = isInline ? "/brand/ayah-badge-dark-48.webp" : "/brand/ayah-badge-dark-96.webp";
  const lightFallback = isInline ? "/brand/ayah-badge-light-48.png" : "/brand/ayah-badge-light.png";
  const darkFallback = isInline ? "/brand/ayah-badge-dark-48.png" : "/brand/ayah-badge-dark.png";

  const content = (
    <div
      role="status"
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div className={`relative ${sizeClasses} animate-pulse-gentle`}>
        {/* Light theme optimized WebP picture */}
        <picture className="dark:hidden w-full h-full block">
          <source srcSet={lightWebp} type="image/webp" />
          <img
            src={lightFallback}
            alt="Ayah Studio"
            width={imgSize}
            height={imgSize}
            loading="eager"
            decoding="async"
            className="w-full h-full object-contain"
          />
        </picture>
        {/* Dark theme optimized WebP picture */}
        <picture className="hidden dark:block w-full h-full">
          <source srcSet={darkWebp} type="image/webp" />
          <img
            src={darkFallback}
            alt="Ayah Studio"
            width={imgSize}
            height={imgSize}
            loading="eager"
            decoding="async"
            className="w-full h-full object-contain"
          />
        </picture>
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
