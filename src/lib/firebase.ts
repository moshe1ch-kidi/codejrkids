 import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const QUOTA_STORAGE_KEY = "codejr_firestore_quota_exceeded";

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
      // Store flag for 6 hours
      const expiry = Date.now() + 6 * 60 * 60 * 1000;
      sessionStorage.setItem(QUOTA_STORAGE_KEY, String(expiry));
      localStorage.setItem(QUOTA_STORAGE_KEY, String(expiry));
    } else {
      sessionStorage.removeItem(QUOTA_STORAGE_KEY);
      localStorage.removeItem(QUOTA_STORAGE_KEY);
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

// Listen for unhandled quota rejections gracefully
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    if (isQuotaExceededError(event?.reason)) {
      setFirestoreQuotaExceeded(true);
      // Suppress unhandled rejection noise in console
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
    console.warn("Notice: Fetching contact messages fallback:", error);
    try {
      const colRef = collection(db, "contact_messages");
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContactMessage[];
    } catch {
      return [];
    }
  }
}

export async function deleteContactMessage(id: string) {
  const docRef = doc(db, "contact_messages", id);
  await deleteDoc(docRef);
}

// Tutorial Videos Persistence
export async function saveTutorialVideosToFirestore(videos: any[]) {
  try {
    const docRef = doc(db, "app_settings", "tutorial_videos");
    const { setDoc } = await import("firebase/firestore");
    await setDoc(docRef, { videos, updatedAt: serverTimestamp() });
    localStorage.setItem("codejr_tutorial_videos", JSON.stringify(videos));
  } catch (err) {
    console.warn("Notice: Storing tutorial videos locally (Firestore offline/restricted):", err);
    localStorage.setItem("codejr_tutorial_videos", JSON.stringify(videos));
  }
}

export async function fetchTutorialVideosFromFirestore(defaultVideos: any[]): Promise<any[]> {
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
    console.warn("Notice: Using local tutorial videos (Firestore offline/restricted):", err);
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
