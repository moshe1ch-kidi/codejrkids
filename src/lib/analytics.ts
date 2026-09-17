 import { doc, getDoc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface AnalyticsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  totalRuns: number;
  totalSaves: number;
  lastVisitAt?: any;
  updatedAt?: any;
  resetAt?: any;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  visits: number;
  runs: number;
  saves: number;
  updatedAt?: any;
}

export interface GeoLocationStats {
  city: string;
  country: string;
  visits: number;
}

export interface CountryStats {
  country: string;
  visits: number;
}

export interface AnalyticsDashboardData {
  summary: AnalyticsSummary;
  todayStats: DailyStats;
  recentDays: DailyStats[];
  topCities: GeoLocationStats[];
  topCountries: CountryStats[];
}

/**
 * Returns date string YYYY-MM-DD strictly based on Asia/Jerusalem time zone.
 * If offsetDays > 0, returns the date corresponding to N days before today in Jerusalem time.
 */
export function getTodayDateString(offsetDays = 0): string {
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  if (offsetDays === 0) {
    return formatter.format(now);
  }

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "1970", 10);
  const month = parseInt(parts.find(p => p.type === "month")?.value || "1", 10);
  const day = parseInt(parts.find(p => p.type === "day")?.value || "1", 10);

  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() - offsetDays);

  const targetYear = d.getUTCFullYear();
  const targetMonth = String(d.getUTCMonth() + 1).padStart(2, "0");
  const targetDay = String(d.getUTCDate()).padStart(2, "0");

  return `${targetYear}-${targetMonth}-${targetDay}`;
}

/**
 * Attempts to detect visitor's approximate city & country using free, privacy-friendly IP geolocation.
 * Timeout set to 3.5 seconds; does not ask for GPS permission.
 */
async function detectUserLocation(): Promise<{ city: string; country: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    // Primary: ipwho.is (HTTPS, CORS-enabled, reliable)
    const response = await fetch("https://ipwho.is/", { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data && data.success !== false && data.city) {
        return {
          city: String(data.city).trim(),
          country: String(data.country || "Unknown").trim()
        };
      }
    }
  } catch {
    // Secondary fallback: ipapi.co
    try {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 3500);
      const res2 = await fetch("https://ipapi.co/json/", { signal: controller2.signal });
      clearTimeout(timeout2);
      if (res2.ok) {
        const d2 = await res2.json();
        if (d2 && d2.city) {
          return {
            city: String(d2.city).trim(),
            country: String(d2.country_name || "Unknown").trim()
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Tracks a page visit. Uses sessionStorage to prevent count inflation on page refreshes.
 * Identifies unique devices via localStorage.
 * Asynchronously detects and logs city/country to cities_summary.
 */
export async function trackPageVisit(): Promise<void> {
  try {
    // 1. Session check: Ensure 1 count per browser session
    const isRecordedInSession = sessionStorage.getItem("codejr_session_recorded");
    if (isRecordedInSession) {
      return;
    }
    sessionStorage.setItem("codejr_session_recorded", "true");

    // 2. Unique device check
    let isNewUnique = false;
    let deviceId = localStorage.getItem("codejr_device_id");
    if (!deviceId) {
      deviceId = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      localStorage.setItem("codejr_device_id", deviceId);
      isNewUnique = true;
    }

    const today = getTodayDateString();
    const summaryRef = doc(db, "site_analytics", "summary");
    const dailyRef = doc(db, "site_analytics", `daily_${today}`);

    const summaryPayload: Record<string, any> = {
      totalVisits: increment(1),
      lastVisitAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (isNewUnique) {
      summaryPayload.uniqueVisitors = increment(1);
    }

    await Promise.allSettled([
      setDoc(summaryRef, summaryPayload, { merge: true }),
      setDoc(
        dailyRef,
        {
          date: today,
          visits: increment(1),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )
    ]);

    // 3. Location detection (in background, non-blocking)
    detectUserLocation().then(async (loc) => {
      if (loc && loc.city) {
        try {
          const citiesRef = doc(db, "site_analytics", "cities_summary");
          const cleanCity = loc.city.replace(/[.#$/[\]]/g, "_").trim();
          const cleanCountry = loc.country.replace(/[.#$/[\]]/g, "_").trim();
          const combinedKey = `${cleanCity}, ${cleanCountry}`;

          await setDoc(
            citiesRef,
            {
              cities: {
                [combinedKey]: increment(1)
              },
              countries: {
                [cleanCountry]: increment(1)
              },
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
        } catch (locErr) {
          console.warn("Notice: Location analytics update skipped:", locErr);
        }
      }
    }).catch(() => {});
  } catch (err) {
    console.warn("Notice: Internal analytics page visit skipped:", err);
  }
}

let lastRunTrackedTime = 0;
/**
 * Tracks when the user presses the green flag to run code.
 * Throttled to prevent spamming Firestore on fast repeated clicks.
 */
export async function trackGreenFlagRun(): Promise<void> {
  const now = Date.now();
  if (now - lastRunTrackedTime < 3500) {
    return;
  }
  lastRunTrackedTime = now;

  try {
    const today = getTodayDateString();
    const summaryRef = doc(db, "site_analytics", "summary");
    const dailyRef = doc(db, "site_analytics", `daily_${today}`);

    await Promise.allSettled([
      setDoc(
        summaryRef,
        {
          totalRuns: increment(1),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      ),
      setDoc(
        dailyRef,
        {
          date: today,
          runs: increment(1),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )
    ]);
  } catch (err) {
    console.warn("Notice: Internal analytics green flag tracking skipped:", err);
  }
}

/**
 * Tracks when a project is saved/downloaded (.sjr file).
 */
export async function trackProjectSave(): Promise<void> {
  try {
    const today = getTodayDateString();
    const summaryRef = doc(db, "site_analytics", "summary");
    const dailyRef = doc(db, "site_analytics", `daily_${today}`);

    await Promise.allSettled([
      setDoc(
        summaryRef,
        {
          totalSaves: increment(1),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      ),
      setDoc(
        dailyRef,
        {
          date: today,
          saves: increment(1),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )
    ]);
  } catch (err) {
    console.warn("Notice: Internal analytics project save tracking skipped:", err);
  }
}

/**
 * Fetches the complete analytics dataset for the admin dashboard:
 * - Summary totals
 * - Today's metrics
 * - Breakdown of the last 7 days
 * - Top Cities & Top Countries
 */
export async function fetchAnalyticsData(): Promise<AnalyticsDashboardData> {
  const defaultSummary: AnalyticsSummary = {
    totalVisits: 0,
    uniqueVisitors: 0,
    totalRuns: 0,
    totalSaves: 0
  };

  const todayStr = getTodayDateString(0);
  let summary: AnalyticsSummary = { ...defaultSummary };

  try {
    const summaryRef = doc(db, "site_analytics", "summary");
    const summarySnap = await getDoc(summaryRef);
    if (summarySnap.exists()) {
      const data = summarySnap.data();
      summary = {
        totalVisits: Number(data.totalVisits || 0),
        uniqueVisitors: Number(data.uniqueVisitors || 0),
        totalRuns: Number(data.totalRuns || 0),
        totalSaves: Number(data.totalSaves || 0),
        lastVisitAt: data.lastVisitAt,
        updatedAt: data.updatedAt,
        resetAt: data.resetAt
      };
    }
  } catch (err) {
    console.warn("Error fetching analytics summary:", err);
  }

  // Fetch last 7 days
  const recentDays: DailyStats[] = [];
  const dayPromises = [];

  for (let i = 0; i < 7; i++) {
    const dayStr = getTodayDateString(i);
    const dayRef = doc(db, "site_analytics", `daily_${dayStr}`);
    dayPromises.push(
      getDoc(dayRef)
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            return {
              date: dayStr,
              visits: Number(data.visits || 0),
              runs: Number(data.runs || 0),
              saves: Number(data.saves || 0),
              updatedAt: data.updatedAt
            };
          }
          return {
            date: dayStr,
            visits: 0,
            runs: 0,
            saves: 0
          };
        })
        .catch(() => ({
          date: dayStr,
          visits: 0,
          runs: 0,
          saves: 0
        }))
    );
  }

  const daysResults = await Promise.all(dayPromises);
  recentDays.push(...daysResults);

  const todayStats = recentDays.find((d) => d.date === todayStr) || {
    date: todayStr,
    visits: 0,
    runs: 0,
    saves: 0
  };

  // Fetch cities & countries
  let topCities: GeoLocationStats[] = [];
  let topCountries: CountryStats[] = [];

  try {
    const citiesRef = doc(db, "site_analytics", "cities_summary");
    const citiesSnap = await getDoc(citiesRef);
    if (citiesSnap.exists()) {
      const data = citiesSnap.data();
      const rawCities = (data.cities || {}) as Record<string, number>;
      const rawCountries = (data.countries || {}) as Record<string, number>;

      topCities = Object.entries(rawCities)
        .map(([key, count]) => {
          const parts = key.split(", ");
          return {
            city: parts[0] || key,
            country: parts[1] || "",
            visits: Number(count || 0)
          };
        })
        .filter((c) => c.visits > 0)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 15);

      topCountries = Object.entries(rawCountries)
        .map(([country, count]) => ({
          country,
          visits: Number(count || 0)
        }))
        .filter((c) => c.visits > 0)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);
    }
  } catch (err) {
    console.warn("Error fetching cities analytics:", err);
  }

  return {
    summary,
    todayStats,
    recentDays,
    topCities,
    topCountries
  };
}

/**
 * Resets summary & cities counters (Admin only).
 */
export async function resetAnalyticsData(): Promise<void> {
  const summaryRef = doc(db, "site_analytics", "summary");
  const citiesRef = doc(db, "site_analytics", "cities_summary");

  await Promise.allSettled([
    setDoc(summaryRef, {
      totalVisits: 0,
      uniqueVisitors: 0,
      totalRuns: 0,
      totalSaves: 0,
      resetAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }),
    setDoc(citiesRef, {
      cities: {},
      countries: {},
      resetAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  ]);
}
