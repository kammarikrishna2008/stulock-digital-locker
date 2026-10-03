import { ShareLink, AccessLog } from '../../../types';
import { getDB } from '../../../services/db';

export async function createShareLink(link: ShareLink): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('share_links', 'readwrite');
    const req = tx.objectStore('share_links').put(link);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getShareLinkByToken(token: string): Promise<ShareLink | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('share_links', 'readonly');
    const index = tx.objectStore('share_links').index('token');
    const req = index.get(token);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getShareLinksForUser(userId: string): Promise<ShareLink[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('share_links', 'readonly');
    const index = tx.objectStore('share_links').index('userId');
    const req = index.getAll(userId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function revokeShareLink(linkId: string, userId: string): Promise<boolean> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('share_links', 'readwrite');
    const store = tx.objectStore('share_links');
    const req = store.get(linkId);
    req.onsuccess = () => {
      const link = req.result as ShareLink | undefined;
      if (!link || link.userId !== userId) {
        resolve(false);
        return;
      }
      link.revoked = true;
      store.put(link);
      resolve(true);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function panicRevokeAllLinks(userId: string): Promise<number> {
  const links = await getShareLinksForUser(userId);
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('share_links', 'readwrite');
    const store = tx.objectStore('share_links');
    let revokedCount = 0;
    for (const link of links) {
      if (!link.revoked) {
        link.revoked = true;
        store.put(link);
        revokedCount++;
      }
    }
    tx.oncomplete = () => resolve(revokedCount);
    tx.onerror = () => reject(tx.error);
  });
}

export async function recordAccessLog(log: AccessLog): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('access_logs', 'readwrite');
    const req = tx.objectStore('access_logs').put(log);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAccessLogsForLink(linkId: string): Promise<AccessLog[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('access_logs', 'readonly');
    const index = tx.objectStore('access_logs').index('linkId');
    const req = index.getAll(linkId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllAccessLogsForUser(userId: string): Promise<AccessLog[]> {
  const userLinks = await getShareLinksForUser(userId);
  const linkIds = new Set(userLinks.map(l => l.id));
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('access_logs', 'readonly');
    const req = tx.objectStore('access_logs').getAll();
    req.onsuccess = () => {
      const all: AccessLog[] = req.result || [];
      resolve(all.filter(log => linkIds.has(log.linkId)));
    };
    req.onerror = () => reject(req.error);
  });
}
