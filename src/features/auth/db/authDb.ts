import { UserAccount } from '../../../types';
import { db as firestoreDb } from '../../../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getDB, INITIAL_USER } from '../../../services/db';

export async function getUserById(id: string): Promise<UserAccount | null> {
  // Check Firestore first if online
  try {
    const userDocRef = doc(firestoreDb, 'users', id);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserAccount;
    }
  } catch (err) {
    console.warn('Firestore user fetch note:', err);
  }

  // Fallback to local IndexedDB
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const req = tx.objectStore('users').get(id);
    req.onsuccess = () => {
      const user = req.result as UserAccount | undefined;
      if (user) {
        resolve(user);
      } else if (id === INITIAL_USER.id) {
        resolve(INITIAL_USER);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getUserByEmail(email: string): Promise<UserAccount | null> {
  const cleanEmail = email.toLowerCase().trim();
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const req = tx.objectStore('users').getAll();
    req.onsuccess = () => {
      const all: UserAccount[] = req.result || [];
      const found = all.find(u => u.email.toLowerCase() === cleanEmail);
      if (found) {
        resolve(found);
      } else if (INITIAL_USER.email.toLowerCase() === cleanEmail) {
        resolve(INITIAL_USER);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getUserByPhone(phone: string): Promise<UserAccount | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const clean = phone.replace(/[^0-9]/g, '');
    const req = tx.objectStore('users').getAll();
    req.onsuccess = () => {
      const all: UserAccount[] = req.result || [];
      const found = all.find(u => u.phone && u.phone.replace(/[^0-9]/g, '').includes(clean));
      if (found) {
        resolve(found);
      } else if (INITIAL_USER.phone.replace(/[^0-9]/g, '').includes(clean)) {
        resolve(INITIAL_USER);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function findUserByIdentifier(query: string): Promise<UserAccount | null> {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return await getUserByEmail(trimmed);
  }
  const cleanDigits = query.replace(/[^0-9]/g, '');
  if (cleanDigits.length >= 6) {
    const byPhone = await getUserByPhone(cleanDigits);
    if (byPhone) return byPhone;
  }
  // Try roll number match
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('users', 'readonly');
    const req = tx.objectStore('users').getAll();
    req.onsuccess = () => {
      const all: UserAccount[] = req.result || [];
      const found = all.find(u => 
        (u.rollNumber && u.rollNumber.toLowerCase() === trimmed) ||
        (u.email && u.email.toLowerCase() === trimmed)
      );
      if (found) resolve(found);
      else if (INITIAL_USER.rollNumber.toLowerCase() === trimmed) resolve(INITIAL_USER);
      else resolve(null);
    };
    req.onerror = () => resolve(null);
  });
}

export async function saveUser(user: UserAccount): Promise<void> {
  // Sync to Firestore backend
  try {
    const userDocRef = doc(firestoreDb, 'users', user.id);
    await setDoc(userDocRef, user, { merge: true });
  } catch (err) {
    console.warn('Firestore user sync note:', err);
  }

  // Local IndexedDB persistence
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readwrite');
    const req = tx.objectStore('users').put(user);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
