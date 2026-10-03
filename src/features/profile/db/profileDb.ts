import { ProfileVaultField } from '../../../types';
import { getDB } from '../../../services/db';

export async function getProfileFields(userId: string): Promise<ProfileVaultField[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profile_fields', 'readonly');
    const index = tx.objectStore('profile_fields').index('userId');
    const req = index.getAll(userId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProfileField(field: ProfileVaultField, userId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profile_fields', 'readwrite');
    const req = tx.objectStore('profile_fields').put({ ...field, userId });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProfileField(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profile_fields', 'readwrite');
    const req = tx.objectStore('profile_fields').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
