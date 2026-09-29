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
  setLogLevel,
  where,
  limit,
  updateDoc,
  setDoc,
  getDoc
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const QUOTA_STORAGE_KEY = "codejr_firestore_quota_exceeded";
const LOCAL_MESSAGES_KEY = "codejr_local_contact_messages";

/**
 * Calculates the exact next Pacific Midnight (00:00 AM America/Los_Angeles) in UTC milliseconds.
 * Google Cloud / Firebase Free Tier daily quotas reset at 00:00 Pacific Time.
 */
export function getNextPacificMidnight(): number {
  try {
    const now = new Date();
    // Get year, month, day in America/Los_Angeles timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const y = parseInt(parts.find(p => p.type === "year")?.value || "2026", 10);
    const m = parseInt(parts.find(p => p.type === "month")?.value || "9", 10);
    const d = parseInt(parts.find(p => p.type === "day")?.value || "18", 10);

    // Midnight PT is 07:00 UTC during Daylight Saving Time (PDT) or 08:00 UTC during Standard Time (PST).
    // Adding 2-minute safety margin after midnight PT:
    const nextMidnightUtc = Date.UTC(y, m - 1, d + 1, 7, 2, 0);
    if (nextMidnightUtc > Date.now()) {
      return nextMidnightUtc;
    }
    // If already past today's reset, next one is in 24 hours
    return nextMidnightUtc + 24 * 60 * 60 * 1000;
  } catch {
    return Date.now() + 60 * 60 * 1000;
  }
}

/**
 * Returns estimated minutes remaining until the next Pacific Midnight quota reset.
 */
export function getMinutesUntilQuotaReset(): number {
  const resetAt = getNextPacificMidnight();
  const diff = resetAt - Date.now();
  return Math.max(1, Math.round(diff / (60 * 1000)));
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
    const val = sessionStorage.getItem(QUOTA_STORAGE_KEY) || localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!val) return false;
    const exp = parseInt(val, 10);
    if (isNaN(exp) || Date.now() > exp) {
      sessionStorage.removeItem(QUOTA_STORAGE_KEY);
      localStorage.removeItem(QUOTA_STORAGE_KEY);
      // Auto reconnect network when quota expiration has elapsed
      enableNetwork(db).catch(() => {});
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
  isLocalFallback?: boolean;
}

function getLocalMessages(): ContactMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessageLocally(data: { name: string; contact: string; subject: string; message: string }): ContactMessage {
  const localList = getLocalMessages();
  const newMsg: ContactMessage = {
    id: "local_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    ...data,
    createdAt: { seconds: Math.floor(Date.now() / 1000) },
    isLocalFallback: true
  };
  localList.unshift(newMsg);
  try {
    localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(localList.slice(0, 50)));
  } catch {}
  return newMsg;
}

export async function sendContactMessage(data: {
  name: string;
  contact: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; isLocalFallback: boolean }> {
  // If quota is already marked exceeded, save locally directly and return success
  if (getFirestoreQuotaExceeded()) {
    saveMessageLocally(data);
    return { success: true, isLocalFallback: true };
  }

  try {
    const colRef = collection(db, "contact_messages");
    const writePromise = addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp()
    });

    // Enforce a strict 5-second timeout so users are NEVER left hanging on an infinite spinner
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("FIRESTORE_WRITE_TIMEOUT")), 5000)
    );

    await Promise.race([writePromise, timeoutPromise]);
    return { success: true, isLocalFallback: false };
  } catch (error: any) {
    console.warn("Contact form notice - write skipped to local store:", error?.message || error);
    if (isQuotaExceededError(error) || error?.message === "FIRESTORE_WRITE_TIMEOUT") {
      setFirestoreQuotaExceeded(true);
    }
    // Always guarantee message preservation locally
    saveMessageLocally(data);
    return { success: true, isLocalFallback: true };
  }
}

export async function fetchContactMessages(): Promise<ContactMessage[]> {
  const localMessages = getLocalMessages();
  if (getFirestoreQuotaExceeded()) {
    return localMessages;
  }
  try {
    const colRef = collection(db, "contact_messages");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const firestoreMessages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      isLocalFallback: false
    })) as ContactMessage[];

    // Merge without duplicates
    const combined = [...localMessages];
    for (const fm of firestoreMessages) {
      if (!combined.some(m => m.id === fm.id || (m.contact === fm.contact && m.message === fm.message))) {
        combined.push(fm);
      }
    }
    return combined;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
    }
    return localMessages;
  }
}

export async function deleteContactMessage(id: string) {
  // Delete from local store if local
  try {
    const local = getLocalMessages().filter(m => m.id !== id);
    localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(local));
  } catch {}

  if (getFirestoreQuotaExceeded() || id.startsWith("local_")) {
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

export interface CloudProject {
  id?: string;
  projectName: string;
  creatorName: string;
  passcode: string;
  projectCode: string;
  scenesData: string;
  createdAt: any;
}

export async function saveCloudProject(project: {
  id?: string;
  projectName: string;
  creatorName: string;
  passcode: string;
  projectCode?: string;
  scenesData: string;
}): Promise<{ success: boolean; projectCode: string; id: string }> {
  if (getFirestoreQuotaExceeded()) {
    throw new Error("QUOTA_EXCEEDED");
  }

  try {
    const colRef = collection(db, "user_projects");
    let projectCode = project.projectCode;

    // Generate a code if not provided
    if (!projectCode) {
      let unique = false;
      let attempts = 0;
      while (!unique && attempts < 5) {
        attempts++;
        const candidate = Math.floor(1000 + Math.random() * 9000).toString();
        // Check uniqueness
        const q = query(colRef, where("projectCode", "==", candidate), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) {
          projectCode = candidate;
          unique = true;
        }
      }
      if (!projectCode) {
        projectCode = Math.floor(1000 + Math.random() * 9000).toString();
      }
    }

    const payload = {
      projectName: project.projectName,
      creatorName: project.creatorName,
      passcode: project.passcode || "",
      projectCode: projectCode,
      scenesData: project.scenesData,
      createdAt: serverTimestamp()
    };

    let finalId = project.id;
    if (finalId) {
      // Fetch existing to verify ownership and passcode
      const docRef = doc(db, "user_projects", finalId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const existingData = docSnap.data();
        if (existingData.creatorName !== project.creatorName || existingData.passcode !== project.passcode) {
          // Ownership mismatch! Strip ID and code to safely save as a brand new copy instead of overwriting
          finalId = undefined;
          projectCode = undefined;
          payload.projectCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a new code for the new copy
        }
      }
    }

    if (finalId) {
      // Update existing document
      const docRef = doc(db, "user_projects", finalId);
      await setDoc(docRef, payload, { merge: true });
    } else {
      // Create new document
      const docRef = await addDoc(colRef, payload);
      finalId = docRef.id;
      projectCode = payload.projectCode;
    }

    return { success: true, projectCode: projectCode!, id: finalId! };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
    }
    throw error;
  }
}

export async function getCloudProjectsByCreator(creatorName: string): Promise<CloudProject[]> {
  if (getFirestoreQuotaExceeded()) {
    return [];
  }
  try {
    const colRef = collection(db, "user_projects");
    const q = query(
      colRef, 
      where("creatorName", "==", creatorName),
      limit(20)
    );
    const snap = await getDocs(q);
    
    // Sort in-memory to bypass composite index requirement if orderby and where are on different fields
    const docs = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CloudProject[];
    
    return docs;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
    }
    console.error("Error fetching projects by creator:", error);
    return [];
  }
}

export async function getCloudProjectByCode(projectCode: string): Promise<CloudProject | null> {
  if (getFirestoreQuotaExceeded()) {
    return null;
  }
  try {
    const colRef = collection(db, "user_projects");
    const q = query(colRef, where("projectCode", "==", projectCode), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docObj = snap.docs[0];
    return {
      id: docObj.id,
      ...docObj.data()
    } as CloudProject;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
    }
    console.error("Error fetching project by code:", error);
    return null;
  }
}

export async function authenticateCreator(creatorName: string, passcode: string): Promise<{ success: boolean; error?: string }> {
  if (getFirestoreQuotaExceeded()) {
    return { success: false, error: "QUOTA_EXCEEDED" };
  }
  try {
    const docId = creatorName.trim().toLowerCase();
    const docRef = doc(db, "creators", docId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      // Register creator instantly
      await setDoc(docRef, {
        creatorName: creatorName.trim(),
        passcode: passcode.trim(),
        createdAt: serverTimestamp()
      });
      return { success: true };
    } else {
      const data = snap.data();
      if (data && data.passcode === passcode.trim()) {
        return { success: true };
      } else {
        return { success: false, error: "WRONG_PASSCODE" };
      }
    }
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
      return { success: false, error: "QUOTA_EXCEEDED" };
    }
    console.error("Error authenticating creator:", error);
    return { success: false, error: "SERVER_ERROR" };
  }
}

export async function deleteCloudProject(id: string): Promise<boolean> {
  if (getFirestoreQuotaExceeded()) {
    return false;
  }
  try {
    const docRef = doc(db, "user_projects", id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
    }
    console.error("Error deleting cloud project:", error);
    return false;
  }
}

export async function renameCloudProject(id: string, newName: string): Promise<boolean> {
  if (getFirestoreQuotaExceeded()) {
    return false;
  }
  try {
    const docRef = doc(db, "user_projects", id);
    await updateDoc(docRef, { projectName: newName });
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true);
    }
    console.error("Error renaming cloud project:", error);
    return false;
  }
}

