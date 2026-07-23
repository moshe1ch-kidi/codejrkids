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
