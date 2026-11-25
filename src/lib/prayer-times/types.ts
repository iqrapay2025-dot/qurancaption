export type PrayerName = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export interface PrayerTimings {
  Fajr: string; // e.g. "05:14"
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  [key: string]: string;
}

export interface CalculationMethod {
  id: number;
  name: string;
  description: string;
}

export const CALCULATION_METHODS: CalculationMethod[] = [
  { id: 3, name: "Muslim World League (MWL)", description: "Europe, Far East, parts of America" },
  { id: 2, name: "Islamic Society of North America (ISNA)", description: "North America (US & Canada)" },
  { id: 4, name: "Umm Al-Qura University, Makkah", description: "Saudi Arabia and Arabian Peninsula" },
  { id: 5, name: "Egyptian General Authority of Survey", description: "Africa, Syria, Lebanon, Iraq" },
  { id: 1, name: "University of Islamic Sciences, Karachi", description: "Pakistan, India, Bangladesh, Afghanistan" },
  { id: 8, name: "Gulf Region", description: "United Arab Emirates, Oman, Qatar" },
  { id: 9, name: "Kuwait", description: "State of Kuwait" },
  { id: 10, name: "Qatar", description: "State of Qatar" },
  { id: 11, name: "Majlis Ugama Islam Singapura (MUIS)", description: "Singapore, Malaysia, Brunei" },
  { id: 12, name: "Union des Organisations Islamiques de France (UOIF)", description: "France & Western Europe" },
  { id: 13, name: "Diyanet İşleri Başkanlığı", description: "Turkey" },
  { id: 14, name: "Spiritual Administration of Muslims of Russia", description: "Russia and CIS" },
  { id: 15, name: "Moonsighting Committee Worldwide", description: "Global moonsighting standard" },
];

export interface PrayerLocation {
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isCustomCoords?: boolean;
  timezone?: string;
  isSaved?: boolean;
}

export const PRESET_CITIES: PrayerLocation[] = [
  { city: "Makkah", country: "Saudi Arabia", latitude: 21.42, longitude: 39.83 },
  { city: "Madinah", country: "Saudi Arabia", latitude: 24.47, longitude: 39.61 },
  { city: "Cairo", country: "Egypt", latitude: 30.04, longitude: 31.24 },
  { city: "London", country: "United Kingdom", latitude: 51.51, longitude: -0.13 },
  { city: "New York", country: "United States", latitude: 40.71, longitude: -74.01 },
  { city: "Istanbul", country: "Turkey", latitude: 41.01, longitude: 28.98 },
  { city: "Karachi", country: "Pakistan", latitude: 24.86, longitude: 67.01 },
  { city: "Jakarta", country: "Indonesia", latitude: -6.21, longitude: 106.85 },
  { city: "Lagos", country: "Nigeria", latitude: 6.52, longitude: 3.38 },
  { city: "Dubai", country: "United Arab Emirates", latitude: 25.20, longitude: 55.27 },
  { city: "Kuala Lumpur", country: "Malaysia", latitude: 3.14, longitude: 101.69 },
  { city: "Toronto", country: "Canada", latitude: 43.65, longitude: -79.38 },
  { city: "Sydney", country: "Australia", latitude: -33.87, longitude: 151.21 },
  { city: "Paris", country: "France", latitude: 48.86, longitude: 2.35 },
];

export interface PrayerSettings {
  methodId: number;
  asrSchool: 0 | 1; // 0 = Standard (Shafi, Maliki, Hanbali), 1 = Hanafi
  highLatitudeMethod: number; // 1 = MidNight, 2 = OneSeventh, 3 = AngleBased
  adjustments: Record<PrayerName, number>; // -30 to +30 min
  useCustomTimes: boolean;
  customTimes: Record<PrayerName, string>;
  afterSalahOffsetMinutes: number; // default 10 min
  location: PrayerLocation;
  morningWindowExtendedToDhuhr: boolean; // Fajr to Dhuhr instead of Sunrise
  eveningWindowExtendedToIsha: boolean; // Asr to Isha instead of Maghrib
}

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  methodId: 3, // Muslim World League
  asrSchool: 0, // Standard
  highLatitudeMethod: 3, // Angle Based
  adjustments: {
    Fajr: 0,
    Sunrise: 0,
    Dhuhr: 0,
    Asr: 0,
    Maghrib: 0,
    Isha: 0,
  },
  useCustomTimes: false,
  customTimes: {
    Fajr: "05:15",
    Sunrise: "06:35",
    Dhuhr: "12:30",
    Asr: "15:45",
    Maghrib: "18:15",
    Isha: "19:35",
  },
  afterSalahOffsetMinutes: 10,
  location: {
    city: "Makkah",
    country: "Saudi Arabia",
    latitude: 21.42,
    longitude: 39.83,
    isSaved: false,
  },
  morningWindowExtendedToDhuhr: false,
  eveningWindowExtendedToIsha: false,
};

export interface NextPrayerInfo {
  currentPrayer: PrayerName | "Night";
  nextPrayer: PrayerName;
  nextPrayerTime: string; // "15:45"
  nextPrayerDate: Date;
  minutesRemaining: number;
  formattedCountdown: string; // "42m" or "2h 15m"
}
