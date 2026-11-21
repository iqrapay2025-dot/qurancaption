# Ayah Studio Performance & Mobile Optimization Guide

## 1. Overview & Mobile-First Budgets

Ayah Studio is designed to run smoothly on small, low-end mobile devices (~2–3GB RAM, slow 3G/4G connections typical in emerging markets like Nigeria).

### Target Budgets
- **First-load JS**: Home (`/`) and Quran (`/quran`, `/quran/[surah]`) <= 150KB gzipped first-load JS.
- **Core Web Vitals**:
  - **LCP** (Largest Contentful Paint) <= 2.5s on throttled 4G.
  - **INP** (Interaction to Next Paint) <= 200ms.
  - **CLS** (Cumulative Layout Shift) <= 0.05.
- **Reader Performance**: Fluid 60fps scrolling on long surahs (e.g. Surah Al-Baqarah with 286 ayahs) with zero audio stutter during playback.
- **Instant Emblems/Badges**: Badge and splash loaders load in < 20ms over 3G (using ~2KB WebP variants instead of 300KB PNGs).

---

## 2. Key Optimizations

### 2.1 Multi-Size Responsive Badges & Image Delivery
- **Problem**: Original `ayah-badge-dark.png` (319KB) and `ayah-badge-light.png` (298KB) caused massive LCP delays on slow connections and blocked the splash loader.
- **Solution**: Generated responsive WebP versions using `sharp`:
  - `ayah-badge-*-48.webp`: **2.0–2.1 KB** (>99% byte reduction).
  - `ayah-badge-*-96.webp`: **4.8–5.1 KB**.
  - `ayah-badge-*-192.webp`: **10.9–11.4 KB**.
- **Implementation**:
  - `BadgeLoader.tsx` and `shared.tsx` (Logo) use `<picture>` elements referencing the 48px and 96px WebP images with `decoding="async"`.
  - Service Worker precaches the 48px and 96px WebP assets instead of 300KB PNGs, saving ~600KB on initial PWA installation.
  - Footers in all routes use lazy-loaded 48px WebP badges.

### 2.2 CSS Parse-Blocking Font Removal
- **Problem**: `src/app/(frontend)/styles.css` had an `@import url('https://fonts.googleapis.com/...')` at line 1, blocking CSS stylesheet parsing until Google Fonts responded.
- **Solution**: Removed the render-blocking `@import` from `styles.css`. Google Fonts are loaded asynchronously via `<link rel="stylesheet">` with preconnect, while self-hosted Arabic fonts (`AmiriQuran-Regular.woff2`, `Amiri-Regular.woff2`, `ScheherazadeNew-Regular.woff2`) are cached locally in `/fonts/` and precached by the service worker for offline/PWA use.

### 2.3 Quran Reader Rendering & Al-Baqarah (286 Ayahs)
- **Problem**: In `Reader.tsx`, all 286 verses were mapped inline without memoization. Any audio time tick or bookmark action triggered re-renders across the entire surah.
- **Solution**:
  - Extracted `AyahRow` as a memoized component (`React.memo`).
  - Wrapped parent action callbacks (`onPractice`, `onPlay`, `onOpenTafsir`, `onCopyLink`, `onToggleReveal`, `setTafsirButtonRef`, `onToggleSelect`) in stable `useCallback` hooks.
  - Applied `contentVisibility: "auto", containIntrinsicSize: "1px 220px"` on each ayah container to skip offscreen DOM layout calculations while preserving smooth scrollbar geometry.
  - Result: When audio advances from verse 5 to 6, only those 2 rows re-render; the other 284 verses remain untouched.

### 2.4 Audio & Editor Playback Re-render Throttling
- **Problem**:
  1. `GlobalAudioProvider.tsx` had `currentTime` in the dependency array of its 5-second persistence effect, destroying and recreating the `setInterval` multiple times per second.
  2. `handleTimeUpdate` updated React state on every raw audio event, triggering frequent re-renders across consumers.
  3. `Editor.tsx` ran `setTime` on every animation frame (60–120 fps) inside its playback `requestAnimationFrame`.
- **Solution**:
  - `GlobalAudioProvider`: Added `currentTimeRef` and throttled React `setCurrentTime` state updates to 4 fps (every 250ms). Decoupled the 5s persistence timer and `beforeunload` listener so timers are not thrashed.
  - `Editor`: Throttled playback `requestAnimationFrame` state updates to ~15 fps (every 66ms).
  - `WordHighlight`: Memoized with `React.memo` to eliminate unnecessary sub-tree re-renders.

### 2.5 Code Splitting & Dynamic Imports
- **Problem**: `App.tsx` statically imported `Editor`, `Pricing`, `Projects`, `Settings`, `AuthDialog`, and `UpgradeDialog`. First-time visitors to the homepage downloaded the entire editor and export suite.
- **Solution**:
  - Converted `Editor`, `Pricing`, `Projects`, `Settings`, `UpgradeDialog`, and `AuthDialog` to `next/dynamic` (`ssr: false` where appropriate).
  - Converted `ExportDialog` (which imports `fflate`) in `Editor.tsx` to `next/dynamic`.
  - Converted `TafsirDrawer`, `QuranSettingsDrawer`, and `PracticeDrawer` in `Reader.tsx` to `next/dynamic`.

### 2.6 Edge Caching & Static Generation
- **Problem**: `/api/quran/verses` used `private, max-age=60` headers, preventing CDN edge caching.
- **Solution**:
  - Enabled `catalog = true` in `/api/quran/verses` to return `public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400`.
  - Added `generateStaticParams` for popular surahs (`1, 2, 18, 36, 55, 56, 67, 112, 113, 114`) in `src/app/(frontend)/quran/[surah]/page.tsx` for instant static rendering.

### 2.7 Lite Mode (Hardware & Network Adaptive)
- **Features**:
  - Automatically activates on slow networks (`saveData: true`, `effectiveType: 2g`) or low-memory devices (`navigator.deviceMemory <= 2GB`).
  - Users can manually configure Lite Mode in Settings ("Auto", "Always On", "Off").
  - Under `.lite-mode`, GPU-heavy `backdrop-filter: blur(...)` and complex multi-layer `box-shadow` styles are disabled.

---

## 3. Running Performance Tests

Run the performance test suite:
```bash
npx vitest run src/lib/performance/
```

Included test suites:
- `throttle.test.ts`: Verifies throttle timing and trailing execution guarantees.
- `windowing.test.ts`: Verifies visible range calculations for large surah lists.
- `lite-mode.test.ts`: Verifies automatic detection and user preference overrides.
- `size-budget.test.ts`: Verifies that WebP badges remain < 15KB and monaco-editor is not imported in client bundles.
