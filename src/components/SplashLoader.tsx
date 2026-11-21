"use client";

import { useEffect, useState } from "react";
import BadgeLoader from "./BadgeLoader";

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
      aria-label="Loading Ayah Studio"
      onAnimationEnd={(e) => {
        if (e.animationName === "ql-exit") setShow(false);
      }}
    >
      <div className="flex items-center justify-center p-4">
        <BadgeLoader size="page" label="Loading Ayah Studio" />
      </div>
    </div>
  );
}
