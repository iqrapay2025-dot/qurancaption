# Interactive Guided Tour System — Ayah Studio

This document explains how the interactive tour system is structured, how to add new tours or steps, how to trigger tours, and how to write tests for them.

---

## 1. Overview & Architecture

Ayah Studio uses **[driver.js](https://driverjs.com)** to spotlight elements with animated overlays, progress indicators, popovers, and keyboard navigation.

- **Dynamic Lazy Loading**: `driver.js` is only dynamically imported when a user starts a tour. It adds **0 KB** to initial page load.
- **CSP Compliant**: The site stylesheet (`src/app/(frontend)/styles.css`) bundles `driver.css` and custom brand theme overrides directly, ensuring no unsafe inline style violations.
- **Theme & Motion Aware**: Automatically integrates with dark/light themes (`--card`, `--primary`, `--gold-text`) and respects `prefers-reduced-motion` (turns off animated transitions and smooth scrolling).
- **Session Fatigue Protection**: Stores completion in `localStorage` (`qcs-tour-<id>-done`) and limits automatic starts to at most **one tour per browser session** (`qcs-tour-session-started`), unless explicitly triggered by the user.

---

## 2. Directory Structure

```
src/lib/tours/
├── types.ts                  # Type definitions for TourId, TourStep, TourDefinition
├── storage.ts                # LocalStorage / SessionStorage completed-state & decision helpers
├── filter.ts                 # Missing-target filtering (skips missing UI elements cleanly)
├── runner.ts                 # driver.js loader, step adapter, analytics & event handlers
├── tours.test.ts             # Vitest unit tests for pure tour logic
└── definitions/
    ├── index.ts              # TOURS registry & lookup helpers
    ├── welcome.ts            # "welcome" tour (home page overview)
    ├── quran.ts              # "quran-reader" tour (reading, tajweed, practice, tafsir)
    ├── listen.ts             # "listen" tour (reciters, playback controls, mini player)
    ├── editor.ts             # "editor" tour (8-step caption creation guide)
    └── bookmarks.ts          # "bookmarks" tour (saved ayahs, notes, offline mode)

src/components/tour/
├── TourProvider.tsx          # React Context, auto-start orchestration, and ?tour=<id> handler
├── ToursMenu.tsx             # Dropdown menu listing all tours
└── TourReplayButton.tsx      # Replay tour button used across headers and toolbars
```

---

## 3. How to Add a New Tour

1. **Add the TourId**:
   In `src/lib/tours/types.ts`, add your new identifier:
   ```ts
   export type TourId = "welcome" | "quran-reader" | "listen" | "editor" | "bookmarks" | "your-tour";
   ```

2. **Define the Steps**:
   Create `src/lib/tours/definitions/your-tour.ts`:
   ```ts
   import type { TourDefinition } from "../types";

   export const yourTour: TourDefinition = {
     id: "your-tour",
     name: "Your Feature Tour",
     description: "Quick walkthrough of your feature.",
     route: "/your-route",
     steps: [
       {
         id: "your-step-1",
         // Leave target undefined for a centered intro modal:
         title: "Welcome to this feature",
         body: "Short explanation of the feature.",
       },
       {
         id: "your-step-2",
         target: '[data-tour="your-element"]',
         title: "Inspect this control",
         body: "Here is how to use this control.",
         side: "bottom",
         align: "start",
       },
     ],
   };
   ```

3. **Register the Tour**:
   In `src/lib/tours/definitions/index.ts`, add it to `TOURS` and `TOUR_LIST`.

4. **Tag Your Elements**:
   Add the attribute to the JSX element:
   ```tsx
   <button data-tour="your-element" onClick={...}>
     Action
   </button>
   ```

---

## 4. How to Trigger and Replay Tours

- **Automatic Start**:
  On the first visit to a page, `TourProvider` checks `shouldAutoStartTour(...)`. If not completed and no session tour has run, it starts automatically once the page is interactive.
- **Direct Query Parameter**:
  Navigating to any page with `?tour=<id>` (e.g. `/quran?tour=quran-reader` or `/#/editor?tour=editor`) will immediately launch that tour, bypassing completion checks.
- **Replay Buttons**:
  Drop `<TourReplayButton tourId="quran-reader" />` anywhere in your component.
- **Tours Menu**:
  Use `<ToursMenu />` to render a dropdown picker listing all tours.
- **Programmatic Control**:
  Use the hook inside any React client component:
  ```tsx
  import { useTour } from "@/components/tour/TourProvider";

  export function MyComponent() {
    const { startTour, stopTour, isTourActive } = useTour();
    return <button onClick={() => startTour("quran-reader")}>Start Tour</button>;
  }
  ```

---

## 5. Testing Tours

Unit tests run with **Vitest**:
```bash
pnpm test
```

Key test areas covered in `src/lib/tours/tours.test.ts`:
1. **Definition validation**: Ensures all tours have unique step IDs, non-empty text, valid target selectors or centered popovers.
2. **Storage resilience**: Verifies safe reads, writes, and corrupted-data fallbacks without throwing even if `localStorage` is disabled or throws quota errors.
3. **DOM Filtering**: Verifies elements missing from the DOM are filtered out without breaking the tour.
4. **Auto-start decisions**: Verifies cookie consent, modal dialogs, splash loaders, session counters, and `?tour` URL query overrides.
