import { LockerDocument, DocumentCategoryItem } from '../../../types';
import { db as firestoreDb } from '../../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getDB, getActiveDocuments, calculateFileHash } from '../../../services/db';

export async function saveDocument(documentItem: LockerDocument): Promise<void> {
  // Sync to Firestore backend
  try {
    const docRef = doc(firestoreDb, 'documents', documentItem.id);
    await setDoc(docRef, documentItem, { merge: true });
  } catch (err) {
    console.warn('Firestore document sync note:', err);
  }

  // Local IndexedDB persistence
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    const req = tx.objectStore('documents').put(documentItem);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function checkForDuplicates(
  userId: string,
  fileName: string,
  fileSize: number,
  fileHash?: string
): Promise<LockerDocument | null> {
  const docs = await getActiveDocuments(userId);
  for (const doc of docs) {
    if (fileHash && doc.fileHash && doc.fileHash === fileHash) {
      return doc;
    }
    if (doc.fileName.toLowerCase() === fileName.toLowerCase() && Math.abs(doc.fileSize - fileSize) < 100) {
      return doc;
    }
  }
  return null;
}

export { calculateFileHash };
