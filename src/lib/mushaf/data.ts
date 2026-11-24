import { SurahMeta, JuzMeta } from './types';

export const SURAHS_META: SurahMeta[] = [
  {
    "id": 1,
    "name_arabic": "الفاتحة",
    "name_simple": "Al-Fatihah",
    "name_english": "The Opener",
    "revelation_place": "makkah",
    "verses_count": 7,
    "start_page": 1,
    "end_page": 1
  },
  {
    "id": 2,
    "name_arabic": "البقرة",
    "name_simple": "Al-Baqarah",
    "name_english": "The Cow",
    "revelation_place": "madinah",
    "verses_count": 286,
    "start_page": 2,
    "end_page": 49
  },
  {
    "id": 3,
    "name_arabic": "آل عمران",
    "name_simple": "Ali 'Imran",
    "name_english": "Family of Imran",
    "revelation_place": "madinah",
    "verses_count": 200,
    "start_page": 50,
    "end_page": 76
  },
  {
    "id": 4,
    "name_arabic": "النساء",
    "name_simple": "An-Nisa",
    "name_english": "The Women",
    "revelation_place": "madinah",
    "verses_count": 176,
    "start_page": 77,
    "end_page": 106
  },
  {
    "id": 5,
    "name_arabic": "المائدة",
    "name_simple": "Al-Ma'idah",
    "name_english": "The Table Spread",
    "revelation_place": "madinah",
    "verses_count": 120,
    "start_page": 106,
    "end_page": 127
  },
  {
    "id": 6,
    "name_arabic": "الأنعام",
    "name_simple": "Al-An'am",
    "name_english": "The Cattle",
    "revelation_place": "makkah",
    "verses_count": 165,
    "start_page": 128,
    "end_page": 150
  },
  {
    "id": 7,
    "name_arabic": "الأعراف",
    "name_simple": "Al-A'raf",
    "name_english": "The Heights",
    "revelation_place": "makkah",
    "verses_count": 206,
    "start_page": 151,
    "end_page": 176
  },
  {
    "id": 8,
    "name_arabic": "الأنفال",
    "name_simple": "Al-Anfal",
    "name_english": "The Spoils of War",
    "revelation_place": "madinah",
    "verses_count": 75,
    "start_page": 177,
    "end_page": 186
  },
  {
    "id": 9,
    "name_arabic": "التوبة",
    "name_simple": "At-Tawbah",
    "name_english": "The Repentance",
    "revelation_place": "madinah",
    "verses_count": 129,
    "start_page": 187,
    "end_page": 207
  },
  {
    "id": 10,
    "name_arabic": "يونس",
    "name_simple": "Yunus",
    "name_english": "Jonah",
    "revelation_place": "makkah",
    "verses_count": 109,
    "start_page": 208,
    "end_page": 221
  },
  {
    "id": 11,
    "name_arabic": "هود",
    "name_simple": "Hud",
    "name_english": "Hud",
    "revelation_place": "makkah",
    "verses_count": 123,
    "start_page": 221,
    "end_page": 235
  },
  {
    "id": 12,
    "name_arabic": "يوسف",
    "name_simple": "Yusuf",
    "name_english": "Joseph",
    "revelation_place": "makkah",
    "verses_count": 111,
    "start_page": 235,
    "end_page": 248
  },
  {
    "id": 13,
    "name_arabic": "الرعد",
    "name_simple": "Ar-Ra'd",
    "name_english": "The Thunder",
    "revelation_place": "madinah",
    "verses_count": 43,
    "start_page": 249,
    "end_page": 255
  },
  {
    "id": 14,
    "name_arabic": "ابراهيم",
    "name_simple": "Ibrahim",
    "name_english": "Abraham",
    "revelation_place": "makkah",
    "verses_count": 52,
    "start_page": 255,
    "end_page": 261
  },
  {
    "id": 15,
    "name_arabic": "الحجر",
    "name_simple": "Al-Hijr",
    "name_english": "The Rocky Tract",
    "revelation_place": "makkah",
    "verses_count": 99,
    "start_page": 262,
    "end_page": 267
  },
  {
    "id": 16,
    "name_arabic": "النحل",
    "name_simple": "An-Nahl",
    "name_english": "The Bee",
    "revelation_place": "makkah",
    "verses_count": 128,
    "start_page": 267,
    "end_page": 281
  },
  {
    "id": 17,
    "name_arabic": "الإسراء",
    "name_simple": "Al-Isra",
    "name_english": "The Night Journey",
    "revelation_place": "makkah",
    "verses_count": 111,
    "start_page": 282,
    "end_page": 293
  },
  {
    "id": 18,
    "name_arabic": "الكهف",
    "name_simple": "Al-Kahf",
    "name_english": "The Cave",
    "revelation_place": "makkah",
    "verses_count": 110,
    "start_page": 293,
    "end_page": 304
  },
  {
    "id": 19,
    "name_arabic": "مريم",
    "name_simple": "Maryam",
    "name_english": "Mary",
    "revelation_place": "makkah",
    "verses_count": 98,
    "start_page": 305,
    "end_page": 312
  },
  {
    "id": 20,
    "name_arabic": "طه",
    "name_simple": "Taha",
    "name_english": "Ta-Ha",
    "revelation_place": "makkah",
    "verses_count": 135,
    "start_page": 312,
    "end_page": 321
  },
  {
    "id": 21,
    "name_arabic": "الأنبياء",
    "name_simple": "Al-Anbya",
    "name_english": "The Prophets",
    "revelation_place": "makkah",
    "verses_count": 112,
    "start_page": 322,
    "end_page": 331
  },
  {
    "id": 22,
    "name_arabic": "الحج",
    "name_simple": "Al-Hajj",
    "name_english": "The Pilgrimage",
    "revelation_place": "madinah",
    "verses_count": 78,
    "start_page": 332,
    "end_page": 341
  },
  {
    "id": 23,
    "name_arabic": "المؤمنون",
    "name_simple": "Al-Mu'minun",
    "name_english": "The Believers",
    "revelation_place": "makkah",
    "verses_count": 118,
    "start_page": 342,
    "end_page": 349
  },
  {
    "id": 24,
    "name_arabic": "النور",
    "name_simple": "An-Nur",
    "name_english": "The Light",
    "revelation_place": "madinah",
    "verses_count": 64,
    "start_page": 350,
    "end_page": 359
  },
  {
    "id": 25,
    "name_arabic": "الفرقان",
    "name_simple": "Al-Furqan",
    "name_english": "The Criterion",
    "revelation_place": "makkah",
    "verses_count": 77,
    "start_page": 359,
    "end_page": 366
  },
  {
    "id": 26,
    "name_arabic": "الشعراء",
    "name_simple": "Ash-Shu'ara",
    "name_english": "The Poets",
    "revelation_place": "makkah",
    "verses_count": 227,
    "start_page": 367,
    "end_page": 376
  },
  {
    "id": 27,
    "name_arabic": "النمل",
    "name_simple": "An-Naml",
    "name_english": "The Ant",
    "revelation_place": "makkah",
    "verses_count": 93,
    "start_page": 377,
    "end_page": 385
  },
  {
    "id": 28,
    "name_arabic": "القصص",
    "name_simple": "Al-Qasas",
    "name_english": "The Stories",
    "revelation_place": "makkah",
    "verses_count": 88,
    "start_page": 385,
    "end_page": 396
  },
  {
    "id": 29,
    "name_arabic": "العنكبوت",
    "name_simple": "Al-'Ankabut",
    "name_english": "The Spider",
    "revelation_place": "makkah",
    "verses_count": 69,
    "start_page": 396,
    "end_page": 404
  },
  {
    "id": 30,
    "name_arabic": "الروم",
    "name_simple": "Ar-Rum",
    "name_english": "The Romans",
    "revelation_place": "makkah",
    "verses_count": 60,
    "start_page": 404,
    "end_page": 410
  },
  {
    "id": 31,
    "name_arabic": "لقمان",
    "name_simple": "Luqman",
    "name_english": "Luqman",
    "revelation_place": "makkah",
    "verses_count": 34,
    "start_page": 411,
    "end_page": 414
  },
  {
    "id": 32,
    "name_arabic": "السجدة",
    "name_simple": "As-Sajdah",
    "name_english": "The Prostration",
    "revelation_place": "makkah",
    "verses_count": 30,
    "start_page": 415,
    "end_page": 417
  },
  {
    "id": 33,
    "name_arabic": "الأحزاب",
    "name_simple": "Al-Ahzab",
    "name_english": "The Combined Forces",
    "revelation_place": "madinah",
    "verses_count": 73,
    "start_page": 418,
    "end_page": 427
  },
  {
    "id": 34,
    "name_arabic": "سبإ",
    "name_simple": "Saba",
    "name_english": "Sheba",
    "revelation_place": "makkah",
    "verses_count": 54,
    "start_page": 428,
    "end_page": 434
  },
  {
    "id": 35,
    "name_arabic": "فاطر",
    "name_simple": "Fatir",
    "name_english": "Originator",
    "revelation_place": "makkah",
    "verses_count": 45,
    "start_page": 434,
    "end_page": 440
  },
  {
    "id": 36,
    "name_arabic": "يس",
    "name_simple": "Ya-Sin",
    "name_english": "Ya Sin",
    "revelation_place": "makkah",
    "verses_count": 83,
    "start_page": 440,
    "end_page": 445
  },
  {
    "id": 37,
    "name_arabic": "الصافات",
    "name_simple": "As-Saffat",
    "name_english": "Those who set the Ranks",
    "revelation_place": "makkah",
    "verses_count": 182,
    "start_page": 446,
    "end_page": 452
  },
  {
    "id": 38,
    "name_arabic": "ص",
    "name_simple": "Sad",
    "name_english": "The Letter \"Saad\"",
    "revelation_place": "makkah",
    "verses_count": 88,
    "start_page": 453,
    "end_page": 458
  },
  {
    "id": 39,
    "name_arabic": "الزمر",
    "name_simple": "Az-Zumar",
    "name_english": "The Troops",
    "revelation_place": "makkah",
    "verses_count": 75,
    "start_page": 458,
    "end_page": 467
  },
  {
    "id": 40,
    "name_arabic": "غافر",
    "name_simple": "Ghafir",
    "name_english": "The Forgiver",
    "revelation_place": "makkah",
    "verses_count": 85,
    "start_page": 467,
    "end_page": 476
  },
  {
    "id": 41,
    "name_arabic": "فصلت",
    "name_simple": "Fussilat",
    "name_english": "Explained in Detail",
    "revelation_place": "makkah",
    "verses_count": 54,
    "start_page": 477,
    "end_page": 482
  },
  {
    "id": 42,
    "name_arabic": "الشورى",
    "name_simple": "Ash-Shuraa",
    "name_english": "The Consultation",
    "revelation_place": "makkah",
    "verses_count": 53,
    "start_page": 483,
    "end_page": 489
  },
  {
    "id": 43,
    "name_arabic": "الزخرف",
    "name_simple": "Az-Zukhruf",
    "name_english": "The Ornaments of Gold",
    "revelation_place": "makkah",
    "verses_count": 89,
    "start_page": 489,
    "end_page": 495
  },
  {
    "id": 44,
    "name_arabic": "الدخان",
    "name_simple": "Ad-Dukhan",
    "name_english": "The Smoke",
    "revelation_place": "makkah",
    "verses_count": 59,
    "start_page": 496,
    "end_page": 498
  },
  {
    "id": 45,
    "name_arabic": "الجاثية",
    "name_simple": "Al-Jathiyah",
    "name_english": "The Crouching",
    "revelation_place": "makkah",
    "verses_count": 37,
    "start_page": 499,
    "end_page": 502
  },
  {
    "id": 46,
    "name_arabic": "الأحقاف",
    "name_simple": "Al-Ahqaf",
    "name_english": "The Wind-Curved Sandhills",
    "revelation_place": "makkah",
    "verses_count": 35,
    "start_page": 502,
    "end_page": 506
  },
  {
    "id": 47,
    "name_arabic": "محمد",
    "name_simple": "Muhammad",
    "name_english": "Muhammad",
    "revelation_place": "madinah",
    "verses_count": 38,
    "start_page": 507,
    "end_page": 510
  },
  {
    "id": 48,
    "name_arabic": "الفتح",
    "name_simple": "Al-Fath",
    "name_english": "The Victory",
    "revelation_place": "madinah",
    "verses_count": 29,
    "start_page": 511,
    "end_page": 515
  },
  {
    "id": 49,
    "name_arabic": "الحجرات",
    "name_simple": "Al-Hujurat",
    "name_english": "The Rooms",
    "revelation_place": "madinah",
    "verses_count": 18,
    "start_page": 515,
    "end_page": 517
  },
  {
    "id": 50,
    "name_arabic": "ق",
    "name_simple": "Qaf",
    "name_english": "The Letter \"Qaf\"",
    "revelation_place": "makkah",
    "verses_count": 45,
    "start_page": 518,
    "end_page": 520
  },
  {
    "id": 51,
    "name_arabic": "الذاريات",
    "name_simple": "Adh-Dhariyat",
    "name_english": "The Winnowing Winds",
    "revelation_place": "makkah",
    "verses_count": 60,
    "start_page": 520,
    "end_page": 523
  },
  {
    "id": 52,
    "name_arabic": "الطور",
    "name_simple": "At-Tur",
    "name_english": "The Mount",
    "revelation_place": "makkah",
    "verses_count": 49,
    "start_page": 523,
    "end_page": 525
  },
  {
    "id": 53,
    "name_arabic": "النجم",
    "name_simple": "An-Najm",
    "name_english": "The Star",
    "revelation_place": "makkah",
    "verses_count": 62,
    "start_page": 526,
    "end_page": 528
  },
  {
    "id": 54,
    "name_arabic": "القمر",
    "name_simple": "Al-Qamar",
    "name_english": "The Moon",
    "revelation_place": "makkah",
    "verses_count": 55,
    "start_page": 528,
    "end_page": 531
  },
  {
    "id": 55,
    "name_arabic": "الرحمن",
    "name_simple": "Ar-Rahman",
    "name_english": "The Beneficent",
    "revelation_place": "madinah",
    "verses_count": 78,
    "start_page": 531,
    "end_page": 534
  },
  {
    "id": 56,
    "name_arabic": "الواقعة",
    "name_simple": "Al-Waqi'ah",
    "name_english": "The Inevitable",
    "revelation_place": "makkah",
    "verses_count": 96,
    "start_page": 534,
    "end_page": 537
  },
  {
    "id": 57,
    "name_arabic": "الحديد",
    "name_simple": "Al-Hadid",
    "name_english": "The Iron",
    "revelation_place": "madinah",
    "verses_count": 29,
    "start_page": 537,
    "end_page": 541
  },
  {
    "id": 58,
    "name_arabic": "المجادلة",
    "name_simple": "Al-Mujadila",
    "name_english": "The Pleading Woman",
    "revelation_place": "madinah",
    "verses_count": 22,
    "start_page": 542,
    "end_page": 545
  },
  {
    "id": 59,
    "name_arabic": "الحشر",
    "name_simple": "Al-Hashr",
    "name_english": "The Exile",
    "revelation_place": "madinah",
    "verses_count": 24,
    "start_page": 545,
    "end_page": 548
  },
  {
    "id": 60,
    "name_arabic": "الممتحنة",
    "name_simple": "Al-Mumtahanah",
    "name_english": "She that is to be examined",
    "revelation_place": "madinah",
    "verses_count": 13,
    "start_page": 549,
    "end_page": 551
  },
  {
    "id": 61,
    "name_arabic": "الصف",
    "name_simple": "As-Saf",
    "name_english": "The Ranks",
    "revelation_place": "madinah",
    "verses_count": 14,
    "start_page": 551,
    "end_page": 552
  },
  {
    "id": 62,
    "name_arabic": "الجمعة",
    "name_simple": "Al-Jumu'ah",
    "name_english": "The Congregation, Friday",
    "revelation_place": "madinah",
    "verses_count": 11,
    "start_page": 553,
    "end_page": 554
  },
  {
    "id": 63,
    "name_arabic": "المنافقون",
    "name_simple": "Al-Munafiqun",
    "name_english": "The Hypocrites",
    "revelation_place": "madinah",
    "verses_count": 11,
    "start_page": 554,
    "end_page": 555
  },
  {
    "id": 64,
    "name_arabic": "التغابن",
    "name_simple": "At-Taghabun",
    "name_english": "The Mutual Disillusion",
    "revelation_place": "madinah",
    "verses_count": 18,
    "start_page": 556,
    "end_page": 557
  },
  {
    "id": 65,
    "name_arabic": "الطلاق",
    "name_simple": "At-Talaq",
    "name_english": "The Divorce",
    "revelation_place": "madinah",
    "verses_count": 12,
    "start_page": 558,
    "end_page": 559
  },
  {
    "id": 66,
    "name_arabic": "التحريم",
    "name_simple": "At-Tahrim",
    "name_english": "The Prohibition",
    "revelation_place": "madinah",
    "verses_count": 12,
    "start_page": 560,
    "end_page": 561
  },
  {
    "id": 67,
    "name_arabic": "الملك",
    "name_simple": "Al-Mulk",
    "name_english": "The Sovereignty",
    "revelation_place": "makkah",
    "verses_count": 30,
    "start_page": 562,
    "end_page": 564
  },
  {
    "id": 68,
    "name_arabic": "القلم",
    "name_simple": "Al-Qalam",
    "name_english": "The Pen",
    "revelation_place": "makkah",
    "verses_count": 52,
    "start_page": 564,
    "end_page": 566
  },
  {
    "id": 69,
    "name_arabic": "الحاقة",
    "name_simple": "Al-Haqqah",
    "name_english": "The Reality",
    "revelation_place": "makkah",
    "verses_count": 52,
    "start_page": 566,
    "end_page": 568
  },
  {
    "id": 70,
    "name_arabic": "المعارج",
    "name_simple": "Al-Ma'arij",
    "name_english": "The Ascending Stairways",
    "revelation_place": "makkah",
    "verses_count": 44,
    "start_page": 568,
    "end_page": 570
  },
  {
    "id": 71,
    "name_arabic": "نوح",
    "name_simple": "Nuh",
    "name_english": "Noah",
    "revelation_place": "makkah",
    "verses_count": 28,
    "start_page": 570,
    "end_page": 571
  },
  {
    "id": 72,
    "name_arabic": "الجن",
    "name_simple": "Al-Jinn",
    "name_english": "The Jinn",
    "revelation_place": "makkah",
    "verses_count": 28,
    "start_page": 572,
    "end_page": 573
  },
  {
    "id": 73,
    "name_arabic": "المزمل",
    "name_simple": "Al-Muzzammil",
    "name_english": "The Enshrouded One",
    "revelation_place": "makkah",
    "verses_count": 20,
    "start_page": 574,
    "end_page": 575
  },
  {
    "id": 74,
    "name_arabic": "المدثر",
    "name_simple": "Al-Muddaththir",
    "name_english": "The Cloaked One",
    "revelation_place": "makkah",
    "verses_count": 56,
    "start_page": 575,
    "end_page": 577
  },
  {
    "id": 75,
    "name_arabic": "القيامة",
    "name_simple": "Al-Qiyamah",
    "name_english": "The Resurrection",
    "revelation_place": "makkah",
    "verses_count": 40,
    "start_page": 577,
    "end_page": 578
  },
  {
    "id": 76,
    "name_arabic": "الانسان",
    "name_simple": "Al-Insan",
    "name_english": "The Man",
    "revelation_place": "madinah",
    "verses_count": 31,
    "start_page": 578,
    "end_page": 580
  },
  {
    "id": 77,
    "name_arabic": "المرسلات",
    "name_simple": "Al-Mursalat",
    "name_english": "The Emissaries",
    "revelation_place": "makkah",
    "verses_count": 50,
    "start_page": 580,
    "end_page": 581
  },
  {
    "id": 78,
    "name_arabic": "النبإ",
    "name_simple": "An-Naba",
    "name_english": "The Tidings",
    "revelation_place": "makkah",
    "verses_count": 40,
    "start_page": 582,
    "end_page": 583
  },
  {
    "id": 79,
    "name_arabic": "النازعات",
    "name_simple": "An-Nazi'at",
    "name_english": "Those who drag forth",
    "revelation_place": "makkah",
    "verses_count": 46,
    "start_page": 583,
    "end_page": 584
  },
  {
    "id": 80,
    "name_arabic": "عبس",
    "name_simple": "'Abasa",
    "name_english": "He Frowned",
    "revelation_place": "makkah",
    "verses_count": 42,
    "start_page": 585,
    "end_page": 585
  },
  {
    "id": 81,
    "name_arabic": "التكوير",
    "name_simple": "At-Takwir",
    "name_english": "The Overthrowing",
    "revelation_place": "makkah",
    "verses_count": 29,
    "start_page": 586,
    "end_page": 586
  },
  {
    "id": 82,
    "name_arabic": "الإنفطار",
    "name_simple": "Al-Infitar",
    "name_english": "The Cleaving",
    "revelation_place": "makkah",
    "verses_count": 19,
    "start_page": 587,
    "end_page": 587
  },
  {
    "id": 83,
    "name_arabic": "المطففين",
    "name_simple": "Al-Mutaffifin",
    "name_english": "The Defrauding",
    "revelation_place": "makkah",
    "verses_count": 36,
    "start_page": 587,
    "end_page": 589
  },
  {
    "id": 84,
    "name_arabic": "الإنشقاق",
    "name_simple": "Al-Inshiqaq",
    "name_english": "The Sundering",
    "revelation_place": "makkah",
    "verses_count": 25,
    "start_page": 589,
    "end_page": 589
  },
  {
    "id": 85,
    "name_arabic": "البروج",
    "name_simple": "Al-Buruj",
    "name_english": "The Mansions of the Stars",
    "revelation_place": "makkah",
    "verses_count": 22,
    "start_page": 590,
    "end_page": 590
  },
  {
    "id": 86,
    "name_arabic": "الطارق",
    "name_simple": "At-Tariq",
    "name_english": "The Nightcommer",
    "revelation_place": "makkah",
    "verses_count": 17,
    "start_page": 591,
    "end_page": 591
  },
  {
    "id": 87,
    "name_arabic": "الأعلى",
    "name_simple": "Al-A'la",
    "name_english": "The Most High",
    "revelation_place": "makkah",
    "verses_count": 19,
    "start_page": 591,
    "end_page": 592
  },
  {
    "id": 88,
    "name_arabic": "الغاشية",
    "name_simple": "Al-Ghashiyah",
    "name_english": "The Overwhelming",
    "revelation_place": "makkah",
    "verses_count": 26,
    "start_page": 592,
    "end_page": 592
  },
  {
    "id": 89,
    "name_arabic": "الفجر",
    "name_simple": "Al-Fajr",
    "name_english": "The Dawn",
    "revelation_place": "makkah",
    "verses_count": 30,
    "start_page": 593,
    "end_page": 594
  },
  {
    "id": 90,
    "name_arabic": "البلد",
    "name_simple": "Al-Balad",
    "name_english": "The City",
    "revelation_place": "makkah",
    "verses_count": 20,
    "start_page": 594,
    "end_page": 594
  },
  {
    "id": 91,
    "name_arabic": "الشمس",
    "name_simple": "Ash-Shams",
    "name_english": "The Sun",
    "revelation_place": "makkah",
    "verses_count": 15,
    "start_page": 595,
    "end_page": 595
  },
  {
    "id": 92,
    "name_arabic": "الليل",
    "name_simple": "Al-Layl",
    "name_english": "The Night",
    "revelation_place": "makkah",
    "verses_count": 21,
    "start_page": 595,
    "end_page": 596
  },
  {
    "id": 93,
    "name_arabic": "الضحى",
    "name_simple": "Ad-Duhaa",
    "name_english": "The Morning Hours",
    "revelation_place": "makkah",
    "verses_count": 11,
    "start_page": 596,
    "end_page": 596
  },
  {
    "id": 94,
    "name_arabic": "الشرح",
    "name_simple": "Ash-Sharh",
    "name_english": "The Relief",
    "revelation_place": "makkah",
    "verses_count": 8,
    "start_page": 596,
    "end_page": 596
  },
  {
    "id": 95,
    "name_arabic": "التين",
    "name_simple": "At-Tin",
    "name_english": "The Fig",
    "revelation_place": "makkah",
    "verses_count": 8,
    "start_page": 597,
    "end_page": 597
  },
  {
    "id": 96,
    "name_arabic": "العلق",
    "name_simple": "Al-'Alaq",
    "name_english": "The Clot",
    "revelation_place": "makkah",
    "verses_count": 19,
    "start_page": 597,
    "end_page": 597
  },
  {
    "id": 97,
    "name_arabic": "القدر",
    "name_simple": "Al-Qadr",
    "name_english": "The Power",
    "revelation_place": "makkah",
    "verses_count": 5,
    "start_page": 598,
    "end_page": 598
  },
  {
    "id": 98,
    "name_arabic": "البينة",
    "name_simple": "Al-Bayyinah",
    "name_english": "The Clear Proof",
    "revelation_place": "madinah",
    "verses_count": 8,
    "start_page": 598,
    "end_page": 599
  },
  {
    "id": 99,
    "name_arabic": "الزلزلة",
    "name_simple": "Az-Zalzalah",
    "name_english": "The Earthquake",
    "revelation_place": "madinah",
    "verses_count": 8,
    "start_page": 599,
    "end_page": 599
  },
  {
    "id": 100,
    "name_arabic": "العاديات",
    "name_simple": "Al-'Adiyat",
    "name_english": "The Courser",
    "revelation_place": "makkah",
    "verses_count": 11,
    "start_page": 599,
    "end_page": 600
  },
  {
    "id": 101,
    "name_arabic": "القارعة",
    "name_simple": "Al-Qari'ah",
    "name_english": "The Calamity",
    "revelation_place": "makkah",
    "verses_count": 11,
    "start_page": 600,
    "end_page": 600
  },
  {
    "id": 102,
    "name_arabic": "التكاثر",
    "name_simple": "At-Takathur",
    "name_english": "The Rivalry in world increase",
    "revelation_place": "makkah",
    "verses_count": 8,
    "start_page": 600,
    "end_page": 600
  },
  {
    "id": 103,
    "name_arabic": "العصر",
    "name_simple": "Al-'Asr",
    "name_english": "The Declining Day",
    "revelation_place": "makkah",
    "verses_count": 3,
    "start_page": 601,
    "end_page": 601
  },
  {
    "id": 104,
    "name_arabic": "الهمزة",
    "name_simple": "Al-Humazah",
    "name_english": "The Traducer",
    "revelation_place": "makkah",
    "verses_count": 9,
    "start_page": 601,
    "end_page": 601
  },
  {
    "id": 105,
    "name_arabic": "الفيل",
    "name_simple": "Al-Fil",
    "name_english": "The Elephant",
    "revelation_place": "makkah",
    "verses_count": 5,
    "start_page": 601,
    "end_page": 601
  },
  {
    "id": 106,
    "name_arabic": "قريش",
    "name_simple": "Quraysh",
    "name_english": "Quraysh",
    "revelation_place": "makkah",
    "verses_count": 4,
    "start_page": 602,
    "end_page": 602
  },
  {
    "id": 107,
    "name_arabic": "الماعون",
    "name_simple": "Al-Ma'un",
    "name_english": "The Small kindnesses",
    "revelation_place": "makkah",
    "verses_count": 7,
    "start_page": 602,
    "end_page": 602
  },
  {
    "id": 108,
    "name_arabic": "الكوثر",
    "name_simple": "Al-Kawthar",
    "name_english": "The Abundance",
    "revelation_place": "makkah",
    "verses_count": 3,
    "start_page": 602,
    "end_page": 602
  },
  {
    "id": 109,
    "name_arabic": "الكافرون",
    "name_simple": "Al-Kafirun",
    "name_english": "The Disbelievers",
    "revelation_place": "makkah",
    "verses_count": 6,
    "start_page": 603,
    "end_page": 603
  },
  {
    "id": 110,
    "name_arabic": "النصر",
    "name_simple": "An-Nasr",
    "name_english": "The Divine Support",
    "revelation_place": "madinah",
    "verses_count": 3,
    "start_page": 603,
    "end_page": 603
  },
  {
    "id": 111,
    "name_arabic": "المسد",
    "name_simple": "Al-Masad",
    "name_english": "The Palm Fiber",
    "revelation_place": "makkah",
    "verses_count": 5,
    "start_page": 603,
    "end_page": 603
  },
  {
    "id": 112,
    "name_arabic": "الإخلاص",
    "name_simple": "Al-Ikhlas",
    "name_english": "The Sincerity",
    "revelation_place": "makkah",
    "verses_count": 4,
    "start_page": 604,
    "end_page": 604
  },
  {
    "id": 113,
    "name_arabic": "الفلق",
    "name_simple": "Al-Falaq",
    "name_english": "The Daybreak",
    "revelation_place": "makkah",
    "verses_count": 5,
    "start_page": 604,
    "end_page": 604
  },
  {
    "id": 114,
    "name_arabic": "الناس",
    "name_simple": "An-Nas",
    "name_english": "Mankind",
    "revelation_place": "makkah",
    "verses_count": 6,
    "start_page": 604,
    "end_page": 604
  }
];

export const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182,
  202, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582
];

export const JUZS_META: JuzMeta[] = JUZ_START_PAGES.map((startPage, index) => ({
  juz_number: index + 1,
  start_page: startPage,
}));

export function getSurahByPage(page: number): SurahMeta[] {
  return SURAHS_META.filter(s => page >= s.start_page && page <= s.end_page);
}

export function getJuzByPage(page: number): number {
  for (let i = JUZS_META.length - 1; i >= 0; i--) {
    if (page >= JUZS_META[i].start_page) {
      return JUZS_META[i].juz_number;
    }
  }
  return 1;
}

export function getSurahMeta(id: number): SurahMeta | undefined {
  return SURAHS_META.find(s => s.id === id);
}
