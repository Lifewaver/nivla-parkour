import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, setPersistence,
  indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// iOS Safari can lose IndexedDB under storage pressure / ITP / standalone PWA
// mode. Walk down to weaker persistence levels so we never end up unable to
// store auth state at all (which manifests as "must sign out and back in"
// every visit). Order: IndexedDB → localStorage → in-memory.
(async () => {
  for (const p of [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence]) {
    try {
      await setPersistence(auth, p);
      return;
    } catch (e) {
      console.warn('Auth persistence unavailable, falling back', p, e);
    }
  }
})();
// Force account chooser on every sign-in. Family device → multiple accounts;
// without this Google silently signs in to whichever was last used.
googleProvider.setCustomParameters({ prompt: 'select_account' });

// List of allowed email addresses
export const ALLOWED_EMAILS = [
'fredrik.aasberg@gmail.com',
  'asberg.alvin@gmail.com',
  'asberg.tilda@gmail.com',
  'charlotta.asberg@gmail.com'
];

// List of admin emails (must also be in ALLOWED_EMAILS)
export const ADMIN_EMAILS = [
  'fredrik.aasberg@gmail.com',
];

export const isAdmin = (email) => ADMIN_EMAILS.includes(email);