import type { TourDefinition, TourStep } from "./types";
import { filterAvailableSteps } from "./filter";
import { markTourCompleted } from "./storage";
import { GUIDE_HINT_DISMISSED_KEY } from "../guideHint";

export interface TourRunnerOptions {
  onStart?: (tour: TourDefinition) => void;
  onStepChange?: (stepIndex: number, step: TourStep) => void;
  onComplete?: (tour: TourDefinition) => void;
  onSkip?: (tour: TourDefinition) => void;
  onDestroy?: () => void;
}

let activeDriverInstance: any = null;

export function isTourRunning(): boolean {
  return Boolean(activeDriverInstance && activeDriverInstance.isActive?.());
}

export function stopActiveTour(): void {
  if (activeDriverInstance) {
    try {
      activeDriverInstance.destroy?.();
    } catch {
      // Ignore
    }
    activeDriverInstance = null;
  }
}

/**
 * Dispatch an analytics event if Google Analytics (gtag) is present and consent allows.
 */
function trackTourEvent(eventName: string, params: Record<string, any>) {
  if (typeof window === "undefined") return;
  try {
    const w = window as any;
    if (typeof w.gtag === "function") {
      w.gtag("event", eventName, params);
    }
  } catch {
    // Analytics is strictly optional; fail silently
  }
}

export async function runTour(
  tour: TourDefinition,
  options: TourRunnerOptions = {}
): Promise<any> {
  if (typeof window === "undefined") return null;

  // If another tour is currently running, stop it first
  stopActiveTour();

  // Lazy-load driver.js dynamically
  const { driver } = await import("driver.js");

  // Filter out steps whose targets are missing on this screen size or login state
  const availableSteps = filterAvailableSteps(tour.steps, document);
  if (availableSteps.length === 0) {
    return null;
  }

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let completedNormally = false;

  const driverSteps = availableSteps.map((step, idx) => {
    let desc = step.body;
    if (step.isPro) {
      desc = `<span class="driver-pro-badge">PRO</span> ${desc}`;
    }
    if (step.link) {
      desc = `${desc}<div class="driver-step-link-wrap"><a href="${step.link.href}" class="driver-step-link">${step.link.label} &rarr;</a></div>`;
    }

    const hasTarget = Boolean(step.target && step.target.trim().length > 0);
    const targetEl = hasTarget ? document.querySelector(step.target!) : null;
    const isVisible = targetEl
      ? (targetEl as HTMLElement).offsetWidth > 0 ||
        (targetEl as HTMLElement).offsetHeight > 0 ||
        targetEl.getClientRects().length > 0
      : false;

    const effectiveElement = hasTarget && isVisible ? step.target : undefined;
    const isCentered = !effectiveElement;

    const driveStep: any = {
      element: effectiveElement,
      popover: {
        title: step.title,
        description: desc,
        side: isCentered ? undefined : step.side === "over" ? undefined : step.side,
        align: isCentered ? undefined : step.align,
        popoverClass: isCentered
          ? "ayah-tour-popover ayah-tour-popover-centered"
          : "ayah-tour-popover",
        showButtons: ["next", "previous", "close"],
        nextBtnText: idx === availableSteps.length - 1 ? "Done" : "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        showProgress: true,
        progressText: `Step ${idx + 1} of ${availableSteps.length}`,
      },
      onHighlightStarted: async () => {
        if (isCentered && idx === 0 && typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "instant" });
        }
        if (step.beforeShow) {
          try {
            await step.beforeShow();
          } catch {
            // Ignore
          }
        }
        options.onStepChange?.(idx, step);
        trackTourEvent("tour_step", {
          tour_id: tour.id,
          step_index: idx + 1,
          step_id: step.id,
          total_steps: availableSteps.length,
        });
      },
      onDeselected: async () => {
        if (step.afterStep) {
          try {
            await step.afterStep();
          } catch {
            // Ignore
          }
        }
      },
    };

    return driveStep;
  });

  const driverInstance = driver({
    animate: !prefersReduced,
    smoothScroll: !prefersReduced,
    allowClose: true,
    allowKeyboardControl: true,
    overlayColor: "#050814",
    overlayOpacity: 0.75,
    stagePadding: 6,
    stageRadius: 8,
    popoverClass: "ayah-tour-popover",
    steps: driverSteps,
    onPopoverRender: (popover) => {
      if (popover?.wrapper?.classList.contains("ayah-tour-popover-centered")) {
        if (popover.arrow) {
          popover.arrow.style.display = "none";
        }
      }
      if (popover?.footerButtons && !popover.footerButtons.querySelector(".driver-popover-skip-btn")) {
        const skipBtn = document.createElement("button");
        skipBtn.type = "button";
        skipBtn.className = "driver-popover-footer-btn driver-popover-skip-btn";
        skipBtn.textContent = "Skip";
        skipBtn.setAttribute("aria-label", "Skip tour");
        skipBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          driverInstance.destroy();
        };
        popover.footerButtons.prepend(skipBtn);
      }
    },
    onDestroyStarted: () => {
      const activeIdx = driverInstance.getActiveIndex?.();
      const isLast = activeIdx !== undefined && activeIdx >= availableSteps.length - 1;
      if (isLast) {
        completedNormally = true;
      }
      driverInstance.destroy();
    },
    onDestroyed: () => {
      activeDriverInstance = null;
      markTourCompleted(tour.id);

      // If this was the editor tour, also mark the guide hint as dismissed
      if (tour.id === "editor") {
        try {
          localStorage.setItem(GUIDE_HINT_DISMISSED_KEY, "1");
        } catch {
          // Ignore
        }
      }

      if (completedNormally) {
        trackTourEvent("tour_complete", { tour_id: tour.id });
        options.onComplete?.(tour);
      } else {
        trackTourEvent("tour_skip", { tour_id: tour.id });
        options.onSkip?.(tour);
      }

      options.onDestroy?.();
    },
  });

  activeDriverInstance = driverInstance;
  options.onStart?.(tour);
  trackTourEvent("tour_start", { tour_id: tour.id, step_count: availableSteps.length });

  if (typeof window !== "undefined" && (tour.route === "/" || tour.route === window.location.pathname)) {
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  driverInstance.drive();
  return driverInstance;
}
