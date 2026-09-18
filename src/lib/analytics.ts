 import { doc, getDoc, setDoc, increment, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db, getFirestoreQuotaExceeded, setFirestoreQuotaExceeded, isQuotaExceededError } from "./firebase";

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
  isQuotaExceeded?: boolean;
}

/**
 * Returns date string YYYY-MM-DD strictly based on Asia/Jerusalem time zone.
 * If offsetDays > 0, returns the date corresponding to N days before today in Jerusalem time.
 */
export function getTodayDateString(offsetDays = 0): string {
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(now);
  const yearStr = (parts.find(p => p.type === "year")?.value || "1970").replace(/\D/g, "");
  const monthStr = (parts.find(p => p.type === "month")?.value || "01").replace(/\D/g, "");
  const dayStr = (parts.find(p => p.type === "day")?.value || "01").replace(/\D/g, "");

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (offsetDays !== 0) {
    d.setUTCDate(d.getUTCDate() - offsetDays);
  }

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

// In-memory guard to prevent double-counting on React 18 StrictMode duplicate mounts
let hasTrackedThisPageLoad = false;

/**
 * Tracks a page visit / view.
 * Guarantees that every unique session is accurately counted in Firestore
 * without exceeding daily free tier write quotas.
 */
export async function trackPageVisit(force = false): Promise<void> {
  try {
    if (getFirestoreQuotaExceeded()) {
      return;
    }

    if (hasTrackedThisPageLoad && !force) {
      return;
    }
    hasTrackedThisPageLoad = true;

    // Throttle per day & session: One visit per device per day in Firestore
    const today = getTodayDateString(0);
    const todayDeviceKey = `codejr_visit_${today}`;
    const sessionVisitKey = "codejr_visit_synced_session";

    // Forward real-time pageview to Google Analytics (100% free, unlimited)
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "page_view");
    }

    if (!force && (sessionStorage.getItem(sessionVisitKey) || localStorage.getItem(todayDeviceKey))) {
      sessionStorage.setItem(sessionVisitKey, "true");
      return;
    }
    let isNewUnique = false;
    let deviceId = localStorage.getItem("codejr_device_id");
    if (!deviceId) {
      deviceId = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      localStorage.setItem("codejr_device_id", deviceId);
      isNewUnique = true;
    }

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

    try {
      await Promise.all([
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
      sessionStorage.setItem(sessionVisitKey, "true");
      localStorage.setItem(todayDeviceKey, "true");
    } catch (writeErr) {
      if (isQuotaExceededError(writeErr)) {
        setFirestoreQuotaExceeded(true);
        return;
      }
      console.warn("Notice: Firestore analytics write skipped:", writeErr);
    }

    // Location detection (in background, non-blocking)
    // Only write location if this device hasn't registered location yet
    if (!localStorage.getItem("codejr_geo_synced") && !getFirestoreQuotaExceeded()) {
      detectUserLocation().then(async (loc) => {
        if (loc && loc.city) {
          try {
            if (getFirestoreQuotaExceeded()) return;
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
            localStorage.setItem("codejr_geo_synced", "true");
          } catch (locErr) {
            if (isQuotaExceededError(locErr)) {
              setFirestoreQuotaExceeded(true);
            }
          }
        }
      }).catch(() => {});
    }
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true);
    }
  }
}

let lastRunTrackedTime = 0;
/**
 * Tracks when the user presses the green flag to run code.
 * Sends event to Google Analytics (unlimited free tier),
 * and syncs to Firestore at most once per session.
 */
export async function trackGreenFlagRun(): Promise<void> {
  const now = Date.now();
  if (now - lastRunTrackedTime < 1000) {
    return;
  }
  lastRunTrackedTime = now;

  // Always log to Google Analytics (unlimited & free)
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "run_code", { event_category: "coding" });
  }

  try {
    const cur = parseInt(sessionStorage.getItem("codejr_session_runs") || "0", 10);
    sessionStorage.setItem("codejr_session_runs", String(cur + 1));
  } catch {}

  // Prevent repeated Firestore writes in the same session to stay strictly within free tier
  const sessionRunSynced = "codejr_session_run_synced";
  if (sessionStorage.getItem(sessionRunSynced) || getFirestoreQuotaExceeded()) {
    return;
  }

  try {
    const today = getTodayDateString(0);
    const summaryRef = doc(db, "site_analytics", "summary");
    const dailyRef = doc(db, "site_analytics", `daily_${today}`);

    await Promise.all([
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
    sessionStorage.setItem(sessionRunSynced, "true");
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true);
    }
  }
}

/**
 * Tracks when a project is saved/downloaded (.sjr file).
 * Sends event to Google Analytics (unlimited free tier),
 * and syncs to Firestore at most once per session.
 */
export async function trackProjectSave(): Promise<void> {
  // Always log to Google Analytics (unlimited & free)
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "save_project", { event_category: "project" });
  }

  const sessionSaveSynced = "codejr_session_save_synced";
  if (sessionStorage.getItem(sessionSaveSynced) || getFirestoreQuotaExceeded()) {
    return;
  }

  try {
    const today = getTodayDateString(0);
    const summaryRef = doc(db, "site_analytics", "summary");
    const dailyRef = doc(db, "site_analytics", `daily_${today}`);

    await Promise.all([
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
    sessionStorage.setItem(sessionSaveSynced, "true");
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true);
    }
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
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true);
    }
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
        .catch((err) => {
          if (isQuotaExceededError(err)) {
            setFirestoreQuotaExceeded(true);
          }
          return {
            date: dayStr,
            visits: 0,
            runs: 0,
            saves: 0
          };
        })
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
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true);
    }
  }

  return {
    summary,
    todayStats,
    recentDays,
    topCities,
    topCountries,
    isQuotaExceeded: getFirestoreQuotaExceeded()
  };
}

/**
 * Subscribes to real-time summary changes in Firestore.
 * Updates immediately whenever a visit, run, or save occurs.
 */
export function subscribeToAnalyticsSummary(callback: (summary: AnalyticsSummary) => void) {
  const summaryRef = doc(db, "site_analytics", "summary");
  return onSnapshot(
    summaryRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          totalVisits: Number(data.totalVisits || 0),
          uniqueVisitors: Number(data.uniqueVisitors || 0),
          totalRuns: Number(data.totalRuns || 0),
          totalSaves: Number(data.totalSaves || 0),
          lastVisitAt: data.lastVisitAt,
          updatedAt: data.updatedAt,
          resetAt: data.resetAt
        });
      }
    },
    (err) => {
      if (isQuotaExceededError(err)) {
        setFirestoreQuotaExceeded(true);
      }
      console.warn("Real-time analytics subscription notice:", err?.message || err);
    }
  );
}

/**
 * Subscribes to real-time changes for today's daily stats.
 */
export function subscribeToTodayStats(callback: (todayStats: DailyStats) => void) {
  const todayStr = getTodayDateString(0);
  const todayRef = doc(db, "site_analytics", `daily_${todayStr}`);
  return onSnapshot(
    todayRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          date: todayStr,
          visits: Number(data.visits || 0),
          runs: Number(data.runs || 0),
          saves: Number(data.saves || 0),
          updatedAt: data.updatedAt
        });
      }
    },
    (err) => {
      if (isQuotaExceededError(err)) {
        setFirestoreQuotaExceeded(true);
      }
      console.warn("Real-time today stats subscription notice:", err?.message || err);
    }
  );
}

/**
 * Resets summary & cities counters (Admin only).
 */
export async function resetAnalyticsData(): Promise<void> {
  if (getFirestoreQuotaExceeded()) {
    throw new Error("QUOTA_EXCEEDED");
  }

  try {
    const summaryRef = doc(db, "site_analytics", "summary");
    const citiesRef = doc(db, "site_analytics", "cities_summary");

    await Promise.all([
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
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true);
      throw new Error("QUOTA_EXCEEDED");
    }
    throw err;
  }
}

/**
 * Calibrates or sets custom base analytics counts (Admin only),
 * allowing alignment with existing Google Analytics baseline numbers.
 */
export async function calibrateAnalyticsData(params: {
  totalVisits?: number;
  uniqueVisitors?: number;
  todayVisits?: number;
  totalRuns?: number;
  totalSaves?: number;
}): Promise<void> {
  if (getFirestoreQuotaExceeded()) {
    throw new Error("QUOTA_EXCEEDED");
  }

  try {
    const summaryRef = doc(db, "site_analytics", "summary");
    const today = getTodayDateString(0);
    const dailyRef = doc(db, "site_analytics", `daily_${today}`);

    const summaryUpdates: Record<string, any> = {
      updatedAt: serverTimestamp()
    };
    if (params.totalVisits !== undefined) summaryUpdates.totalVisits = Number(params.totalVisits);
    if (params.uniqueVisitors !== undefined) summaryUpdates.uniqueVisitors = Number(params.uniqueVisitors);
    if (params.totalRuns !== undefined) summaryUpdates.totalRuns = Number(params.totalRuns);
    if (params.totalSaves !== undefined) summaryUpdates.totalSaves = Number(params.totalSaves);

    const promises: Promise<any>[] = [setDoc(summaryRef, summaryUpdates, { merge: true })];

    if (params.todayVisits !== undefined) {
      promises.push(
        setDoc(
          dailyRef,
          {
            date: today,
            visits: Number(params.todayVisits),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        )
      );
    }

    await Promise.all(promises);
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true);
      throw new Error("QUOTA_EXCEEDED");
    }
    throw err;
  }
}

