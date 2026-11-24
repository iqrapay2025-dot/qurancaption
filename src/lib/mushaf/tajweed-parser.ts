import { tajweedGroup } from "@/lib/quran/tajweed";

export function parseVerseTajweed(textUthmaniTajweed: string) {
  const clean = textUthmaniTajweed.replace(/<span class=end>[^<]*<\/span>/g, '').trim();
  let inTag = false;
  const wordStrings: string[] = [];
  let cur = '';
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === '<') inTag = true;
    if (c === '>') { inTag = false; cur += c; continue; }
    if (!inTag && /\s/.test(c)) {
      if (cur.trim()) wordStrings.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.trim()) wordStrings.push(cur.trim());

  return wordStrings.map(wStr => {
    const segs: Array<{ text: string; rule?: string; color?: string }> = [];
    let last = 0;
    const re = /<tajweed class=["']?([a-z0-9_-]+)["']?>([^<]*)<\/tajweed>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(wStr)) !== null) {
      if (m.index > last) {
        const plain = wStr.slice(last, m.index).replace(/<[^>]*>/g, '');
        if (plain) segs.push({ text: plain });
      }
      const rule = m[1];
      const text = m[2];
      const g = tajweedGroup(rule);
      segs.push({ text, rule, color: g?.color });
      last = m.index + m[0].length;
    }
    if (last < wStr.length) {
      const plain = wStr.slice(last).replace(/<[^>]*>/g, '');
      if (plain) segs.push({ text: plain });
    }
    return segs;
  });
}
