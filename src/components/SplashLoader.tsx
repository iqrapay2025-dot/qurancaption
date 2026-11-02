"use client";

import { useEffect, useState } from "react";
import { Logo } from "./shared";

const KEY = "qcs-splash";

export default function SplashLoader() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    try {
      if (document.documentElement.dataset.splash === "seen") setShow(false);
      else sessionStorage.setItem(KEY, "1");
    } catch {}
  }, []);

  if (!show) return null;

  return (
    <div
      className="ql-loader"
      role="status"
      aria-label="Loading Quran Caption Studio"
      onAnimationEnd={(e) => {
        if (e.animationName === "ql-exit") setShow(false);
      }}
    >
      <div className="ql-swipe">
        <div className="ql-spinner" />
      </div>
      <div className="ql-brand" aria-hidden="true">
        <div className="ql-write">
          <Logo />
        </div>
      </div>
    </div>
  );
}