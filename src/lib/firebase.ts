import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

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
  const colRef = collection(db, "contact_messages");
  await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp()
  });
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
    console.error("Error fetching messages:", error);
    // Fallback without ordering if index is not ready yet
    const colRef = collection(db, "contact_messages");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ContactMessage[];
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
