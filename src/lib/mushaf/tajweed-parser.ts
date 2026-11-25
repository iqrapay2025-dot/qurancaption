import { tajweedGroup } from "@/lib/quran/tajweed";

const COMBINING_MARKS_REGEX = /^[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]+/;

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

    // Normalization to prevent Arabic cursive disconnection and dotted circles:
    // 1. Replace legacy dagger alif glyph \u0672 with tatweel + superscript alef (\u0640\u0670)
    for (let i = 0; i < segs.length; i++) {
      segs[i].text = segs[i].text.replace(/\u0672/g, '\u0640\u0670');
    }

    // 2. Move leading combining marks (fatha, kasra, damma, etc.) to the preceding segment
    // so the vowel attaches to its consonant and the colored segment does not begin with an orphaned mark
    for (let i = 1; i < segs.length; i++) {
      const match = segs[i].text.match(COMBINING_MARKS_REGEX);
      if (match) {
        segs[i - 1].text += match[0];
        segs[i].text = segs[i].text.slice(match[0].length);
      }
    }

    // 3. Move maddah mark (\u0653) to preceding alif/waw/ya if split by tags
    for (let i = 1; i < segs.length; i++) {
      if (segs[i].text.startsWith('\u0653') && /[\u0627\u0649\u0648\u064A]$/.test(segs[i - 1].text)) {
        segs[i - 1].text += '\u0653';
        segs[i].text = segs[i].text.slice(1);
      }
    }

    return segs.filter(s => s.text.length > 0);
  });
}
