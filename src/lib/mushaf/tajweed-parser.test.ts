import { describe, it, expect } from 'vitest';
import { parseVerseTajweed } from './tajweed-parser';

describe('parseVerseTajweed', () => {
  it('parses uthmani tajweed html correctly into word segments', () => {
    const raw = 'بِسْمِ <tajweed class=ham_wasl>ٱ</tajweed>للَّهِ <tajweed class=ham_wasl>ٱ</tajweed><tajweed class=laam_shamsiyah>ل</tajweed>رَّحْمَ<tajweed class=madda_normal>ـٰ</tajweed>نِ <tajweed class=ham_wasl>ٱ</tajweed><tajweed class=laam_shamsiyah>ل</tajweed>رَّح<tajweed class=madda_permissible>ِي</tajweed>مِ <span class=end>١</span>';
    const words = parseVerseTajweed(raw);
    expect(words).toHaveLength(4);
    expect(words[0]).toEqual([{ text: 'بِسْمِ' }]);
    expect(words[1][0].rule).toBe('ham_wasl');
    expect(words[1][0].color).toBe('#9ca3af');
    // words[2] has: 0: ham_wasl, 1: laam_shamsiyah, 2: plain "رَّحْمَ", 3: madda_normal, 4: plain "نِ"
    expect(words[2][2].text).toBe('رَّحْمَ');
    expect(words[2][3].rule).toBe('madda_normal');
    expect(words[2][3].color).toBe('#fb923c');
  });

  it('handles words without tajweed marks gracefully', () => {
    const raw = 'قُلْ هُوَ اللَّهُ أَحَدٌ <span class=end>١</span>';
    const words = parseVerseTajweed(raw);
    expect(words).toHaveLength(4);
    expect(words[0]).toEqual([{ text: 'قُلْ' }]);
    expect(words[1]).toEqual([{ text: 'هُوَ' }]);
  });
});
