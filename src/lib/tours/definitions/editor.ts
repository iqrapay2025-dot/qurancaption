import type { TourDefinition, TourStep } from "../types";
import { GUIDE_STEPS } from "../../guide";

function makeEditorStep(index: number, overrides: Partial<TourStep> = {}): TourStep {
  const guide = GUIDE_STEPS[index];
  return {
    id: `editor-step-${index + 1}`,
    target: guide?.tourTarget,
    title: guide?.title ?? "",
    body: guide?.short ?? guide?.body ?? "",
    link: guide?.link,
    ...overrides,
  };
}

function openSection(selector: string) {
  if (typeof document === "undefined") return;
  const btn = document.querySelector(`${selector} button`);
  if (btn && btn.getAttribute("aria-expanded") === "false") {
    (btn as HTMLButtonElement).click();
  }
}

export const editorTour: TourDefinition = {
  id: "editor",
  name: "Caption Editor Tour",
  description: "Step-by-step walkthrough to create beautifully timed Quran captions and video overlays.",
  route: "/#/editor",
  steps: [
    makeEditorStep(0, {
      id: "editor-verses",
      side: "right",
      align: "start",
      beforeShow: () => openSection('[data-tour="editor-verses-section"]'),
    }),
    makeEditorStep(1, {
      id: "editor-reciter",
      side: "right",
      align: "start",
      isPro: false,
      beforeShow: () => openSection('[data-tour="editor-recitation-section"]'),
    }),
    makeEditorStep(2, {
      id: "editor-layers",
      side: "right",
      align: "start",
      beforeShow: () => openSection('[data-tour="editor-layers-section"]'),
    }),
    makeEditorStep(3, {
      id: "editor-canvas",
      side: "right",
      align: "start",
      beforeShow: () => openSection('[data-tour="editor-canvas-section"]'),
    }),
    makeEditorStep(4, {
      id: "editor-style",
      side: "right",
      align: "start",
      beforeShow: () => openSection('[data-tour="editor-style-section"]'),
    }),
    makeEditorStep(5, {
      id: "editor-export",
      side: "bottom",
      align: "end",
    }),
    makeEditorStep(6, {
      id: "editor-import",
      side: "left",
      align: "center",
      link: { href: "/editors", label: "See editor instructions" },
    }),
    makeEditorStep(7, {
      id: "editor-save",
      side: "bottom",
      align: "end",
    }),
  ],
};
