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
    body: "Pick the surah, Start ayah and End ayah. On the Free plan, a single export can include up to 20 verses. You can also select multiple ranges if you need a longer passage.",
  },
  {
    title: "Choose a reciter",
    body: "Pick a reciter in the Recitation section and press Play to preview the audio. If you have Pro, you can also upload your own recitation and time it to each verse.",
  },
  {
    title: "Choose what appears",
    body: "Keep Arabic text on, then add a Translation, Transliteration, and verse number layer. You can also turn on Tajweed colors and word highlighting (estimated), which shows emphasis while the timing is not exact word-by-word.",
  },
  {
    title: "Choose a video shape",
    body: "In Canvas size, pick a platform preset such as TikTok, Instagram Reels, YouTube Shorts, YouTube (16:9) or Instagram Square. Turn on Show safe area guide to keep captions clear of on-screen controls.",
  },
  {
    title: "Style your captions",
    body: "In Style, choose the Arabic font, Arabic size, Translation size, text colour, background, shadow or outline, alignment, and position. If you have Pro, save your favorite settings as a preset for reuse later.",
  },
  {
    title: "Export captions, audio or overlay",
    body: "Choose SRT (recommended) or VTT. You can export captions separately or as one combined file, add a timing offset, and download the recitation as a WAV. Pro users can also render a transparent video overlay for use above their own footage.",
  },
  {
    title: "Import into your video editor",
    body: "Follow the import steps for your editor. If you are using an app like CapCut, Premiere, DaVinci or KineMaster, the export format you choose will depend on the editor's subtitle support.",
    link: { href: "/editors", label: "See editor instructions" },
  },
  {
    title: "Save projects and revisit them",
    body: "You can make your first export without signing up. Create a free account to save projects, return to a draft later, and keep your favorite caption setups without losing progress.",
  },
];

export const GUIDE_FREE_LIMITS =
  "The Free plan includes up to 3 saved projects, up to 20 verses per export, 40 unique verses exported per month, and SRT/VTT subtitle exports. Own recitation uploads, custom style presets, and transparent video overlays are Pro features.";

export const GUIDE_PRO_FEATURES =
  "Pro adds unlimited projects and verses, custom style presets, uploading your own recitation audio, transparent video overlays, and priority support. It also removes the Free plan limits on saved projects and verse usage.";

export const GUIDE_TROUBLESHOOTING: GuideIssue[] = [
  {
    problem: "Captions appear slightly early or late.",
    solution: "Adjust the Timing offset in the Export dialog, or refine the verse timings when using your own recitation.",
  },
  {
    problem: "My own audio does not line up with the ayahs.",
    solution: "Use the waveform timing controls in Verses & timing to set or adjust each ayah timing, then preview again before exporting.",
  },
  {
    problem: "Verses will not load.",
    solution: "Press Try again, or choose a smaller range and make sure the surah is supported by the current data connection.",
  },
  {
    problem: "Arabic appears as boxes in a video editor.",
    solution: "Choose a font that supports Arabic in the video editor, or use the transparent overlay export if your editor handles alpha channels better.",
  },
  {
    problem: "VTT will not import.",
    solution: "Export SRT instead, or use the combined caption file in editors that struggle with VTT timing or styling.",
  },
  {
    problem: "In CapCut, imported caption tracks may move or style together.",
    solution:
      "Use the combined file, or convert captions to text if your CapCut version offers it. This may vary by version, so preview the imported result before finalizing.",
  },
];

export const GUIDE_FAQ = [
  {
    question: "Can I try the editor without an account?",
    answer: "Yes. You can make your first export without signing up, but a free account lets you save projects and return to them later.",
  },
  {
    question: "Can I use my own recitation audio?",
    answer:
      "Yes, with Pro. Upload your own mp3, m4a or wav file, then time each ayah to your recording before exporting or previewing.",
  },
  {
    question: "Can I download the recitation too?",
    answer:
      "Yes. Choose Recitation audio in Export to download a WAV for the selected range. It can also be included in the ZIP when you export multiple caption files.",
  },
  {
    question: "Can I save my favourite caption style?",
    answer:
      "Yes, with Pro. Custom style presets let you reuse a font, colour, background, and layout setup across projects.",
  },
  {
    question: "Are the caption colors included in SRT or VTT?",
    answer:
      "No. SRT and VTT do not carry the editor's text colors. Tajweed colors and word highlighting appear in the preview only.",
  },
] as const;
