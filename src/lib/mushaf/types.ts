export interface MushafWord {
  id: number;
  position: number;
  verse_key: string;
  page_number: number;
  line_number: number;
  code_v2: string;
  text_qpc_hafs?: string;
  text_uthmani?: string;
  char_type_name: "word" | "end" | string;
  translation?: {
    text: string;
    language_name?: string;
  };
}

export interface MushafLine {
  line_number: number;
  type: "text" | "surah_header" | "bismillah";
  words?: MushafWord[];
  surah_number?: number;
  surah_name_arabic?: string;
  surah_name_english?: string;
  ayah_count?: number;
  revelation_place?: string;
}

export interface MushafPageSurahSummary {
  id: number;
  name_arabic: string;
  name_english: string;
  name_simple: string;
  start_page: number;
}

export interface MushafPageData {
  page_number: number;
  juz_number: number;
  lines: MushafLine[];
  surahs: MushafPageSurahSummary[];
  verse_keys: string[];
}

export interface SurahMeta {
  id: number;
  name_arabic: string;
  name_simple: string;
  name_english: string;
  revelation_place: "makkah" | "madinah";
  verses_count: number;
  start_page: number;
  end_page: number;
}

export interface JuzMeta {
  juz_number: number;
  start_page: number;
  name_arabic?: string;
}
