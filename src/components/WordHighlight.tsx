import { useMemo } from "react";

export type Piece = [text: string, color?: string];

type Node = { ws: string } | { idx: number; parts: Piece[] };

const weightOf = (parts: Piece[]) => {
  let n = 0;
  for (const ch of parts.map((p) => p[0]).join("")) if (/\p{L}/u.test(ch) && ch !== "ـ") n++;
  return n;
};

export function splitWords(pieces: Piece[]) {
  const nodes: Node[] = [];
  const weights: number[] = [];
  let acc: Piece[] = [];
  const flush = () => {
    if (!acc.length) return;
    nodes.push({ idx: weights.length, parts: acc });
    weights.push(weightOf(acc));
    acc = [];
  };
  for (const [text, color] of pieces) {
    for (const tok of text.split(/(\s+)/)) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) { flush(); nodes.push({ ws: tok }); }
      else acc.push([tok, color]);
    }
  }
  flush();
  return { nodes, weights };
}

// Estimated: each word's share of the verse is proportional to its letter count; the real recitation timing per word is not available.
export default function WordHighlight({ pieces, progress, color, tinted }: { pieces: Piece[]; progress: number; color: string; tinted: boolean }) {
  const { nodes, weights } = useMemo(() => splitWords(pieces), [pieces]);
  const total = weights.reduce((a, b) => a + b, 0);
  let active = -1, frac = 0;
  if (total > 0 && progress > 0) {
    const target = Math.min(1, progress) * total;
    let cum = 0;
    for (let i = 0; i < weights.length; i++) {
      if (weights[i] === 0) continue;
      if (target < cum + weights[i] || i === weights.length - 1) { active = i; frac = Math.min(1, Math.max(0, (target - cum) / weights[i])); break; }
      cum += weights[i];
    }
  }
  const fill = `color-mix(in srgb, ${color} 38%, transparent)`;
  return (
    <>
      {nodes.map((n, k) => {
        if ("ws" in n) return n.ws;
        const done = active >= 0 && n.idx <= active && weights[n.idx] > 0;
        const style: React.CSSProperties = { transition: "color 160ms ease-out" };
        if (done && !tinted) style.color = color;
        if (n.idx === active) {
          const pct = (frac * 100).toFixed(1);
          style.backgroundImage = `linear-gradient(to left, ${fill} ${pct}%, transparent ${pct}%)`;
          style.borderRadius = "0.15em";
        }
        return (
          <span key={k} style={style}>
            {n.parts.map(([t, c], j) => (c ? <span key={j} style={{ color: c }}>{t}</span> : t))}
          </span>
        );
      })}
    </>
  );
}
