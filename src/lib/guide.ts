export type GuideStep = {
  title: string;
  body: string;
  link?: { href: string; label: string };
};

export type GuideIssue = {
  problem: string;
  solution: string;
};

export const GUIDE_STEPS: GuideStep[] = [
  {
    title: "Choose your verses",
    body: "Pick the surah, Start ayah and End ayah. The Free plan allows up to 20 verses in one export.",
  },
  {
    title: "Choose a reciter",
    body: "Choose a reciter in the Recitation section, then press Play to preview the audio.",
  },
  {
    title: "Choose what appears",
    body: "Keep Arabic text on, then add a translation or Transliteration. You can also turn on Tajweed colors and Word highlighting (Estimated). Tajweed is a set of reading rules shown with colors.",
  },
  {
    title: "Choose a video shape",
    body: "In Canvas size, pick a Platform preset such as TikTok, Instagram Reels, YouTube Shorts, YouTube (16:9) or Instagram Square. Turn on Show safe area guide to keep captions clear of app controls.",
  },
  {
    title: "Style your captions",
    body: "In Style, choose Arabic font, Arabic size, Translation size, Text colour, Background, Shadow / outline, Alignment and Position. Preview changes as you make them.",
  },
  {
    title: "Export captions or audio",
    body: "Choose SRT (recommended) or VTT. SRT and VTT are subtitle file formats. Choose Combined file or Separate files, then set an optional Timing offset. You can also download Recitation audio as a WAV that matches the selected range. When exporting multiple caption files, Download all as .zip can bundle them with the audio.",
  },
  {
    title: "Import into your video editor",
    body: "Follow the import steps for your editor.",
    link: { href: "/editors", label: "See editor instructions" },
  },
  {
    title: "Save projects with a free account",
    body: "You can make your first export without signing up. Create a free account to save projects and return to them later.",
  },
];

export const GUIDE_FREE_LIMITS =
  "The Free plan includes up to 3 saved projects, up to 20 verses per export, and 40 unique verses exported per month.";

export const GUIDE_PRO_FEATURES =
  "Pro adds your own recitation audio, saved style presets and transparent video overlays, and removes the Free plan limits.";

export const GUIDE_TROUBLESHOOTING: GuideIssue[] = [
  {
    problem: "Captions appear slightly early or late.",
    solution: "Adjust Timing offset in the Export dialog.",
  },
  {
    problem: "Verses will not load.",
    solution: "Press Try again, or choose a smaller range.",
  },
  {
    problem: "Arabic appears as boxes in a video editor.",
    solution: "Choose a font that supports Arabic in the video editor.",
  },
  {
    problem: "VTT will not import.",
    solution: "Export SRT instead.",
  },
  {
    problem: "In CapCut, imported caption tracks may move or style together.",
    solution:
      "Use the combined file, or convert captions to text if your CapCut version offers it. This may vary by version.",
  },
];

export const GUIDE_FAQ = [
  {
    question: "Can I try the editor without an account?",
    answer: "Yes. You can make your first export without signing up.",
  },
  {
    question: "Can I download the recitation too?",
    answer:
      "Yes. Choose Recitation audio in Export to download a WAV for the selected range. It can also be included in the ZIP when you export multiple caption files.",
  },
  {
    question: "Are the caption colors included in SRT or VTT?",
    answer:
      "No. SRT and VTT do not carry the editor's text colors. Tajweed colors appear in the preview only.",
  },
] as const;
