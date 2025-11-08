import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCQkdBXkub0ZJlMFJaS95niWeNjV_3cktY",
  authDomain: "calmanager-9c498.firebaseapp.com",
  projectId: "calmanager-9c498",
  storageBucket: "calmanager-9c498.firebasestorage.app",
  messagingSenderId: "72228768609",
  appId: "1:72228768609:web:78ec356b3e65d6ef035320",
  measurementId: "G-CV101LSH21"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Set persistence to LOCAL (persists even when browser window is closed)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set auth persistence:', error);
});

export const db = getFirestore(app);
export const storage = getStorage(app);
