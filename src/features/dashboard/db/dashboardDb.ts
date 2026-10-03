import { DocumentCategoryItem, LockerDocument } from '../../../types';
import { getDB, getActiveDocuments, DEFAULT_CATEGORIES } from '../../../services/db';

export async function getCategories(userId: string): Promise<DocumentCategoryItem[]> {
  const db = await getDB();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('custom_categories', 'readonly');
      const req = tx.objectStore('custom_categories').getAll();
      req.onsuccess = () => {
        const custom: DocumentCategoryItem[] = req.result || [];
        resolve([...DEFAULT_CATEGORIES, ...custom]);
      };
      req.onerror = () => resolve(DEFAULT_CATEGORIES);
    } catch {
      resolve(DEFAULT_CATEGORIES);
    }
  });
}

export async function saveCustomCategory(category: DocumentCategoryItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('custom_categories', 'readwrite');
    const req = tx.objectStore('custom_categories').put(category);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCustomCategory(categoryId: string): Promise<boolean> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('custom_categories', 'readwrite');
    const req = tx.objectStore('custom_categories').delete(categoryId);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function getStorageUsage(userId: string, quotaBytes = 100 * 1024 * 1024): Promise<{ usedBytes: number; quotaBytes: number; percentage: number; docCount: number }> {
  const activeDocs = await getActiveDocuments(userId);
  const binDocs = await getRecycleBinDocuments(userId);
  
  const allDocs = [...activeDocs, ...binDocs];
  const usedBytes = allDocs.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);
  const percentage = Math.min(100, Math.round((usedBytes / quotaBytes) * 1000) / 10);
  
  return {
    usedBytes,
    quotaBytes,
    percentage,
    docCount: activeDocs.length,
  };
}

export async function getRecycleBinDocuments(userId: string): Promise<LockerDocument[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const index = tx.objectStore('documents').index('userId');
    const req = index.getAll(userId);
    req.onsuccess = () => {
      const all: LockerDocument[] = req.result || [];
      resolve(all.filter(doc => !!doc.deletedAt));
    };
    req.onerror = () => reject(req.error);
  });
}
