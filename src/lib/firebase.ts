 import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  deleteDoc, 
  doc,
  disableNetwork,
  enableNetwork,
  setLogLevel
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const QUOTA_STORAGE_KEY = "codejr_firestore_quota_exceeded";

// Recorded Google Cloud Free Tier quota reset window: 
// Google Cloud Firestore Free Tier resets at 00:00 Pacific Time (07:00 UTC).
// September 18, 2026 07:15:00 UTC includes a 15-minute margin after midnight PT.
const KNOWN_CURRENT_QUOTA_RESET_UTC = Date.UTC(2026, 8, 18, 7, 15, 0);

/**
 * Calculates next Pacific Midnight (00:00 AM America/Los_Angeles) in UTC milliseconds.
 */
export function getNextPacificMidnight(): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
    const parts = formatter.formatToParts(now);
    const y = parseInt(parts.find(p => p.type === "year")?.value || "2026", 10);
    const m = parseInt(parts.find(p => p.type === "month")?.value || "9", 10);
    const d = parseInt(parts.find(p => p.type === "day")?.value || "18", 10);

    // Next day 07:15 UTC (Pacific Time midnight + 15m margin)
    const nextUtc = Date.UTC(y, m - 1, d + 1, 7, 15, 0);
    return Math.max(nextUtc, Date.now() + 2 * 60 * 60 * 1000);
  } catch {
    return Date.now() + 6 * 60 * 60 * 1000;
  }
}

/**
 * Checks if a given error corresponds to Firestore quota exhaustion (code=resource-exhausted).
 */
export function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false;
  const str = String(err).toLowerCase();
  const msg = (err as any)?.message ? String((err as any).message).toLowerCase() : "";
  const code = (err as any)?.code ? String((err as any).code).toLowerCase() : "";
  return (
    code.includes("resource-exhausted") ||
    str.includes("resource-exhausted") ||
    str.includes("quota exceeded") ||
    str.includes("quota limit exceeded") ||
    msg.includes("quota exceeded") ||
    msg.includes("free daily write units")
  );
}

/**
 * Persists quota state to prevent continuous backend retries during quota exhaustion.
 */
export function setFirestoreQuotaExceeded(exceeded: boolean) {
  try {
    if (exceeded) {
      const expiry = getNextPacificMidnight();
      sessionStorage.setItem(QUOTA_STORAGE_KEY, String(expiry));
      localStorage.setItem(QUOTA_STORAGE_KEY, String(expiry));
      // Immediately sever network connection to stop internal Firestore retry loops & backoff delays
      disableNetwork(db).catch(() => {});
    } else {
      sessionStorage.removeItem(QUOTA_STORAGE_KEY);
      localStorage.removeItem(QUOTA_STORAGE_KEY);
      enableNetwork(db).catch(() => {});
    }
  } catch {
    // ignore
  }
}

/**
 * Returns whether Firestore quota is currently known to be exhausted.
 */
export function getFirestoreQuotaExceeded(): boolean {
  try {
    // Check known current exhaustion window
    if (Date.now() < KNOWN_CURRENT_QUOTA_RESET_UTC) {
      return true;
    }

    const val = sessionStorage.getItem(QUOTA_STORAGE_KEY) || localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!val) return false;
    const exp = parseInt(val, 10);
    if (isNaN(exp) || Date.now() > exp) {
      sessionStorage.removeItem(QUOTA_STORAGE_KEY);
      localStorage.removeItem(QUOTA_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Silence noisy internal SDK error logs and backoff delays
try {
  setLogLevel("silent");
} catch {
  // ignore
}

// Suppress unhandled quota rejections and disconnect network if quota is exceeded
if (typeof window !== "undefined") {
  if (getFirestoreQuotaExceeded()) {
    disableNetwork(db).catch(() => {});
  }

  window.addEventListener("unhandledrejection", (event) => {
    if (isQuotaExceededError(event?.reason)) {
      setFirestoreQuotaExceeded(true);
      event.preventDefault();
    }
  });
}

export interface ContactMessage {
  id?: string;
  name: string;
  contact: string;
  subject: string;
  message: string;
  createdAt?: any;
}

export async function sendContactMessage(data: {
  name: string;
  contact: string;
  subject: string;
  message: string;
}) {
  if (getFirestoreQuotaExceeded()) {
    throw new Error("QUOTA_EXCEEDED");
  }

  try {
    const colRef = collection(db, "contact_messages");
    await addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      throw new Error("QUOTA_EXCEEDED");
    }
    throw error;
  }
}

export async function fetchContactMessages(): Promise<ContactMessage[]> {
  if (getFirestoreQuotaExceeded()) {
    return [];
  }
  try {
    const colRef = collection(db, "contact_messages");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ContactMessage[];
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
    }
    return [];
  }
}

export async function deleteContactMessage(id: string) {
  if (getFirestoreQuotaExceeded()) {
    return;
  }
  try {
    const docRef = doc(db, "contact_messages", id);
    await deleteDoc(docRef);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
    }
  }
}

// Tutorial Videos Persistence
export async function saveTutorialVideosToFirestore(videos: any[]) {
  localStorage.setItem("codejr_tutorial_videos", JSON.stringify(videos));
  if (getFirestoreQuotaExceeded()) {
    return;
  }
  try {
    const docRef = doc(db, "app_settings", "tutorial_videos");
    const { setDoc } = await import("firebase/firestore");
    await setDoc(docRef, { videos, updatedAt: serverTimestamp() });
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true);
    }
  }
}

export async function fetchTutorialVideosFromFirestore(defaultVideos: any[]): Promise<any[]> {
  if (getFirestoreQuotaExceeded()) {
    const localData = localStorage.getItem("codejr_tutorial_videos");
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch {
        // ignore
      }
    }
    return defaultVideos;
  }

  try {
    const docRef = doc(db, "app_settings", "tutorial_videos");
    const { getDoc } = await import("firebase/firestore");
    const snapshot = await getDoc(docRef);
    if (snapshot.exists() && snapshot.data()?.videos) {
      const videos = snapshot.data().videos;
      localStorage.setItem("codejr_tutorial_videos", JSON.stringify(videos));
      return videos;
    }
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true);
    }
  }

  // Fallback to localStorage
  const localData = localStorage.getItem("codejr_tutorial_videos");
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch {
      // ignore
    }
  }

  return defaultVideos;
}
