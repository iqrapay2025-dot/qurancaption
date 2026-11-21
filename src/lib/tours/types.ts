export type TourId =
  | "welcome"
  | "quran-reader"
  | "listen"
  | "editor"
  | "bookmarks";

export type TourStep = {
  id: string;
  /**
   * CSS selector for the target element (e.g. '[data-tour="..."]').
   * If omitted or undefined, step is treated as a centered popover.
   */
  target?: string;
  title: string;
  body: string;
  side?: "top" | "bottom" | "left" | "right" | "over";
  align?: "start" | "center" | "end";
  isPro?: boolean;
  link?: { href: string; label: string };
  /**
   * Action to run before highlighting the element (e.g. open a drawer or accordion)
   */
  beforeShow?: () => Promise<void> | void;
  /**
   * Action to run after the step moves away (e.g. close temporary drawer)
   */
  afterStep?: () => Promise<void> | void;
  /**
   * Route required for this step, if needed
   */
  requiresRoute?: string;
};

export type TourDefinition = {
  id: TourId;
  name: string;
  description: string;
  route: string;
  steps: TourStep[];
};
