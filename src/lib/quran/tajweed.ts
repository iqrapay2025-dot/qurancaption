export type TajweedSeg = [text: string, rule?: string];

export type TajweedGroup = { id: string; label: string; hint: string; color: string; classes: string[] };

export const TAJWEED_GROUPS: TajweedGroup[] = [
  { id: "ghunnah", label: "Ghunnah", hint: "nasal sound", color: "#22c55e", classes: ["ghunnah"] },
  { id: "ikhfa", label: "Ikhfa", hint: "concealment", color: "#f472b6", classes: ["ikhafa", "ikhafa_shafawi"] },
  { id: "idgham", label: "Idgham", hint: "merging", color: "#a78bfa", classes: ["idgham_ghunnah", "idgham_wo_ghunnah", "idgham_shafawi", "idgham_mutajanisayn", "idgham_mutaqaribayn"] },
  { id: "iqlab", label: "Iqlab", hint: "turning into meem", color: "#22d3ee", classes: ["iqlab"] },
  { id: "qalqalah", label: "Qalqalah", hint: "echoing sound", color: "#60a5fa", classes: ["qalaqah"] },
  { id: "madd2", label: "Madd (normal)", hint: "2 counts", color: "#fb923c", classes: ["madda_normal"] },
  { id: "madd246", label: "Madd (permissible)", hint: "2, 4 or 6 counts", color: "#facc15", classes: ["madda_permissible"] },
  { id: "madd45", label: "Madd (obligatory)", hint: "4 to 5 counts", color: "#f87171", classes: ["madda_obligatory"] },
  { id: "madd6", label: "Madd (necessary)", hint: "6 counts", color: "#dc2626", classes: ["madda_necessary"] },
  { id: "silent", label: "Silent", hint: "hamzat al-wasl, silent letters, lam shamsiyah", color: "#9ca3af", classes: ["ham_wasl", "slnt", "laam_shamsiyah"] },
];

const BY_CLASS = new Map(TAJWEED_GROUPS.flatMap((g) => g.classes.map((c) => [c, g] as const)));
export const tajweedGroup = (rule?: string) => (rule ? BY_CLASS.get(rule) : undefined);
export const isTajweedClass = (c: string) => BY_CLASS.has(c);
