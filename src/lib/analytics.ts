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

export interface AnalyticsDashboardData {
  summary: AnalyticsSummary;
  todayStats: DailyStats;
  recentDays: DailyStats[];
}

export function getTodayDateString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() - offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Tracks a page visit. Uses sessionStorage to prevent count inflation on page refreshes.
 * Identifies unique devices via localStorage.
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

  return {
    summary,
    todayStats,
    recentDays
  };
}

/**
 * Resets summary counters (Admin only).
 */
export async function resetAnalyticsData(): Promise<void> {
  const summaryRef = doc(db, "site_analytics", "summary");
  await setDoc(summaryRef, {
    totalVisits: 0,
    uniqueVisitors: 0,
    totalRuns: 0,
    totalSaves: 0,
    resetAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
