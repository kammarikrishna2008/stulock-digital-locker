import { LockerDocument, ProfileVaultField, UserAccount, ShareLink, AccessLog, DocumentCategoryItem } from '../types';
import { db as firestoreDb } from './firebase';
import { doc, setDoc, getDoc, getDocs, collection, query, where, deleteDoc } from 'firebase/firestore';

export const DEFAULT_CATEGORIES: DocumentCategoryItem[] = [
  { id: 'id', name: 'Identity', label: 'Identity Documents', description: 'Student ID, Passport, Driver License, Government ID', color: '#2563eb', isCustom: false },
  { id: 'academic', name: 'Academic', label: 'Academic Records', description: 'Transcripts, Syllabus, Grade Cards, Enrollment Letters', color: '#0f766e', isCustom: false },
  { id: 'marksheet', name: 'Marksheet', label: 'Marksheets & Grades', description: 'Semester grade sheets, Board marksheets', color: '#0891b2', isCustom: false },
  { id: 'certificate', name: 'Certificate', label: 'Certifications & Honors', description: 'Internship certificates, hackathons, course completions', color: '#7c3aed', isCustom: false },
  { id: 'financial', name: 'Financial', label: 'Financial & Fee Receipts', description: 'Tuition receipts, scholarships, bank statements, tax records', color: '#16a34a', isCustom: false },
  { id: 'project', name: 'Project', label: 'Projects & Publications', description: 'Capstone reports, research papers, presentations', color: '#d97706', isCustom: false },
  { id: 'other', name: 'Other', label: 'General / Other Records', description: 'Uncategorized documents and utility records', color: '#64748b', isCustom: false },
];

const DB_NAME = 'aegislock_student_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('documents')) {
        const docStore = db.createObjectStore('documents', { keyPath: 'id' });
        docStore.createIndex('userId', 'userId', { unique: false });
        docStore.createIndex('category', 'category', { unique: false });
        docStore.createIndex('deletedAt', 'deletedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('email', 'email', { unique: true });
        userStore.createIndex('phone', 'phone', { unique: false });
      }

      if (!db.objectStoreNames.contains('profile_fields')) {
        const profileStore = db.createObjectStore('profile_fields', { keyPath: 'id' });
        profileStore.createIndex('userId', 'userId', { unique: false });
      }

      if (!db.objectStoreNames.contains('share_links')) {
        const shareStore = db.createObjectStore('share_links', { keyPath: 'id' });
        shareStore.createIndex('token', 'token', { unique: true });
        shareStore.createIndex('userId', 'userId', { unique: false });
        shareStore.createIndex('documentId', 'documentId', { unique: false });
      }

      if (!db.objectStoreNames.contains('access_logs')) {
        const logStore = db.createObjectStore('access_logs', { keyPath: 'id' });
        logStore.createIndex('linkId', 'linkId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Simple deterministic hash for duplicate detection
export async function calculateFileHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate base64 sample SVG/Canvas documents for initial seed
function createSampleDocDataUrl(title: string, category: string, color: string, details: string[]): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
      <defs>
        <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${color}" />
          <stop offset="100%" stop-color="${color}dd" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff" />
      <rect x="0" y="0" width="800" height="140" fill="url(#headerGrad)" />
      <text x="50" y="65" font-family="'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="bold" fill="#ffffff">AEGISLOCK VERIFIED DOCUMENT</text>
      <text x="50" y="100" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" fill="#ffffff" opacity="0.9">CATEGORY: ${category.toUpperCase()} · OFFICIAL ACADEMIC RECORD</text>
      
      <circle cx="720" cy="70" r="35" fill="#ffffff" opacity="0.2" />
      <text x="720" y="77" font-family="'Plus Jakarta Sans', sans-serif" font-size="24" text-anchor="middle" fill="#ffffff">✓</text>
      
      <g transform="translate(60, 200)">
        <text x="0" y="30" font-family="'Plus Jakarta Sans', sans-serif" font-size="24" font-weight="bold" fill="#1e293b">${title}</text>
        <line x1="0" y1="50" x2="680" y2="50" stroke="#e2e8f0" stroke-width="2" />
        
        ${details.map((detail, idx) => `
          <g transform="translate(0, ${90 + idx * 60})">
            <rect x="0" y="-20" width="680" height="48" rx="6" fill="${idx % 2 === 0 ? '#f8fafc' : '#ffffff'}" stroke="#f1f5f9" />
            <text x="20" y="12" font-family="'Plus Jakarta Sans', sans-serif" font-size="15" fill="#334155">${detail}</text>
          </g>
        `).join('')}
      </g>
      
      <g transform="translate(60, 920)">
        <line x1="0" y1="0" x2="680" y2="0" stroke="#cbd5e1" stroke-dasharray="4,4" />
        <text x="0" y="40" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" fill="#64748b">Student Digital Locker Security Hash: SHA-256 Verified · Encrypted Storage</text>
        <text x="0" y="60" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" fill="#94a3b8">This document is certified authentic and securely managed in the student's personal vault.</text>
        
        <rect x="520" y="15" width="160" height="70" rx="4" fill="none" stroke="#94a3b8" stroke-width="1.5" />
        <text x="600" y="42" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" text-anchor="middle" font-weight="bold" fill="#475569">DIGITALLY SEALED</text>
        <text x="600" y="62" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" text-anchor="middle" fill="#64748b">ISSUED ON PORTAL</text>
      </g>
    </svg>
  `;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
}

export const INITIAL_USER: UserAccount = {
  id: 'usr_student_01',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@campus.edu',
  phone: '+91 98765 43210',
  college: 'National Institute of Technology',
  rollNumber: '21CS084',
  hasPasskey: true,
  passkeyPin: '123456',
  passkeyCredentialId: 'credential_passkey_aarav_01',
  createdAt: '2026-01-15T09:00:00Z',
  lastLoginAt: new Date().toISOString(),
  storageQuotaBytes: 100 * 1024 * 1024, // 100 MB
};

export const INITIAL_PROFILE_FIELDS: ProfileVaultField[] = [
  { id: 'f1', label: 'Full Legal Name', value: 'Aarav Sharma', category: 'personal' },
  { id: 'f2', label: 'Date of Birth', value: '2003-08-14', category: 'personal' },
  { id: 'f3', label: 'Blood Group', value: 'O Positive (O+)', category: 'personal' },
  { id: 'f4', label: 'Roll Number / Student ID', value: '21CS084', category: 'academic' },
  { id: 'f5', label: 'College / Institute', value: 'National Institute of Technology', category: 'academic' },
  { id: 'f6', label: 'Degree & Branch', value: 'B.Tech in Computer Science & Engineering', category: 'academic' },
  { id: 'f7', label: 'Current CGPA', value: '8.92 / 10.00', category: 'academic' },
  { id: 'f8', label: 'Graduation Year', value: '2027', category: 'academic' },
  { id: 'f9', label: 'Primary Email', value: 'aarav.sharma@campus.edu', category: 'contact' },
  { id: 'f10', label: 'Secondary Email', value: 'aarav.dev.sharma@gmail.com', category: 'contact' },
  { id: 'f11', label: 'Mobile Number', value: '+91 98765 43210', category: 'contact' },
  { id: 'f12', label: 'Permanent Address', value: 'Flat 402, Green Meadows, MG Road, Bengaluru, Karnataka 560001', category: 'contact' },
  { id: 'f13', label: 'Current Campus Address', value: 'Room 312, Hostel Block C, NIT Campus, 560098', category: 'contact' },
  { id: 'f14', label: 'Emergency Contact', value: 'Rajesh Sharma (Father) · +91 98450 11223', category: 'contact' },
  { id: 'f15', label: 'Passport Number', value: 'Z7829104', category: 'identification', isSensitive: true },
  { id: 'f16', label: 'Driving License No', value: 'KA-04-2023-009817', category: 'identification', isSensitive: true },
];

export async function initStorage(user: UserAccount = INITIAL_USER): Promise<void> {
  const db = await getDB();
  
  // Check if user exists
  const existingUser = await getUserById(user.id);
  if (!existingUser) {
    const tx = db.transaction(['users', 'profile_fields', 'documents'], 'readwrite');
    tx.objectStore('users').put(user);
    
    // Seed profile fields
    const profileStore = tx.objectStore('profile_fields');
    for (const field of INITIAL_PROFILE_FIELDS) {
      profileStore.put({ ...field, userId: user.id });
    }

    // Seed realistic documents
    const docStore = tx.objectStore('documents');
    const today = new Date();
    
    // Expiry date calculation for testing reminders: one expiring in 18 days, one expiring in 2028
    const expiringSoonDate = new Date(today);
    expiringSoonDate.setDate(today.getDate() + 18);
    const expiringSoonStr = expiringSoonDate.toISOString().split('T')[0];

    const sampleDocs: LockerDocument[] = [
      {
        id: 'doc_nit_id_card',
        userId: user.id,
        title: 'College Identity Card 2026',
        category: 'id',
        fileName: 'College_ID_Card_2026.png',
        fileType: 'image/png',
        fileSize: 420500, // ~420 KB
        dataUrl: createSampleDocDataUrl('National Institute of Technology - Student Identity Card', 'id', '#2563eb', [
          'Student Name: Aarav Sharma',
          'Roll Number: 21CS084 · Dept: Computer Science',
          'Validity: 2023 - 2027 Academic Session',
          'Card Serial: NITK-ID-2023-884920'
        ]),
        issueDate: '2023-08-01',
        expiryDate: expiringSoonStr, // Expires soon to test reminder banner!
        tags: ['college', 'id', 'student_pass', 'campus'],
        uploadedAt: '2026-01-16T10:30:00Z',
        deletedAt: null,
        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      },
      {
        id: 'doc_sem5_marksheet',
        userId: user.id,
        title: 'Semester 5 Official Grade Sheet',
        category: 'marksheet',
        fileName: 'Semester_5_Transcript.pdf',
        fileType: 'application/pdf',
        fileSize: 840200, // ~840 KB
        dataUrl: createSampleDocDataUrl('Department of Computer Science - Semester 5 Grade Card', 'marksheet', '#0f766e', [
          'Student: Aarav Sharma (21CS084)',
          'Operating Systems: Grade A (10/10)',
          'Database Management Systems: Grade A+ (10/10)',
          'Design & Analysis of Algorithms: Grade A (9/10)',
          'Semester GPA: 9.35 · Cumulative CGPA: 8.92'
        ]),
        issueDate: '2025-12-20',
        tags: ['marksheet', 'transcript', 'semester5', 'grades'],
        uploadedAt: '2026-01-16T11:00:00Z',
        deletedAt: null,
        fileHash: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945'
      },
      {
        id: 'doc_internship_cert',
        userId: user.id,
        title: 'Systems Engineering Internship Certificate',
        category: 'certificate',
        fileName: 'Acme_Internship_Certificate.pdf',
        fileType: 'application/pdf',
        fileSize: 615000,
        dataUrl: createSampleDocDataUrl('Acme Cloud Labs - Internship Completion Award', 'certificate', '#7c3aed', [
          'Awarded to: Aarav Sharma',
          'Role: Distributed Systems Research Intern',
          'Duration: May 2025 – July 2025 (10 Weeks)',
          'Performance Rating: Outstanding · Recommended for PPO'
        ]),
        issueDate: '2025-07-31',
        tags: ['internship', 'acme', 'experience', 'certificate'],
        uploadedAt: '2026-01-18T14:15:00Z',
        deletedAt: null,
        fileHash: '8a36c1e55ec840b2e840a7cf528828b49520fb079b7b9f8749bc1c3a64790382'
      },
      {
        id: 'doc_distributed_cache_paper',
        userId: user.id,
        title: 'Distributed In-Memory Cache Project Report',
        category: 'project',
        fileName: 'Distributed_Cache_Capstone_Report.pdf',
        fileType: 'application/pdf',
        fileSize: 1250000,
        dataUrl: createSampleDocDataUrl('Capstone Project: High-Throughput Distributed Cache', 'project', '#d97706', [
          'Author: Aarav Sharma (21CS084)',
          'Tech Stack: Go, Raft Consensus, gRPC, Redis Protocol',
          'Benchmark: 180,000 req/sec with P99 < 1.4ms',
          'Evaluated by: Faculty Academic Review Committee'
        ]),
        issueDate: '2025-11-15',
        tags: ['project', 'capstone', 'golang', 'systems'],
        uploadedAt: '2026-01-20T16:40:00Z',
        deletedAt: null,
        fileHash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
      }
    ];

    for (const doc of sampleDocs) {
      docStore.put(doc);
    }

    await new Promise((res, rej) => {
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  }
}

// User methods
export async function getUserById(id: string): Promise<UserAccount | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const req = tx.objectStore('users').get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getUserByEmail(email: string): Promise<UserAccount | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const index = tx.objectStore('users').index('email');
    const req = index.get(email.toLowerCase().trim());
    req.onsuccess = () => {
      if (req.result) {
        resolve(req.result);
      } else if (email.toLowerCase().trim() === INITIAL_USER.email.toLowerCase()) {
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

// Document methods
export async function getActiveDocuments(userId: string): Promise<LockerDocument[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const index = tx.objectStore('documents').index('userId');
    const req = index.getAll(userId);
    req.onsuccess = () => {
      const all: LockerDocument[] = req.result || [];
      // Only return documents that are NOT deleted
      resolve(all.filter(doc => !doc.deletedAt));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getRecycleBinDocuments(userId: string): Promise<LockerDocument[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const index = tx.objectStore('documents').index('userId');
    const req = index.getAll(userId);
    req.onsuccess = () => {
      const all: LockerDocument[] = req.result || [];
      // Return documents that are soft deleted
      resolve(all.filter(doc => !!doc.deletedAt));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getDocumentById(id: string, userId?: string): Promise<LockerDocument | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const req = tx.objectStore('documents').get(id);
    req.onsuccess = () => {
      const doc = req.result as LockerDocument | undefined;
      if (!doc) {
        resolve(null);
        return;
      }
      // Security check: if userId is provided, ensure ownership
      if (userId && doc.userId !== userId) {
        resolve(null);
        return;
      }
      resolve(doc);
    };
    req.onerror = () => reject(req.error);
  });
}

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

export async function moveToRecycleBin(docId: string, userId: string): Promise<boolean> {
  const doc = await getDocumentById(docId, userId);
  if (!doc) return false;
  doc.deletedAt = new Date().toISOString();
  await saveDocument(doc);
  return true;
}

export async function restoreFromRecycleBin(docId: string, userId: string): Promise<boolean> {
  const doc = await getDocumentById(docId, userId);
  if (!doc) return false;
  doc.deletedAt = null;
  await saveDocument(doc);
  return true;
}

export async function deletePermanently(docId: string, userId: string): Promise<boolean> {
  const doc = await getDocumentById(docId, userId);
  if (!doc) return false;

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    const req = tx.objectStore('documents').delete(docId);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function emptyRecycleBin(userId: string): Promise<number> {
  const binDocs = await getRecycleBinDocuments(userId);
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    let count = 0;
    for (const doc of binDocs) {
      store.delete(doc.id);
      count++;
    }
    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error);
  });
}

// Duplicate detection check
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

// Profile Vault methods
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

// Share Links & Access Logs
export async function createShareLink(link: ShareLink): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('share_links', 'readwrite');
    const req = tx.objectStore('share_links').put(link);
    req.onsuccess = () => resolve();
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

// PANIC BUTTON: Revoke ALL active share links for user immediately!
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

// Access Logs
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

// Storage Meter Calculation
export async function getStorageUsage(userId: string): Promise<{ usedBytes: number; quotaBytes: number; percentage: number; docCount: number }> {
  const user = await getUserById(userId);
  const quotaBytes = user?.storageQuotaBytes || 100 * 1024 * 1024;
  
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

// Category Management
export async function getCategories(userId: string): Promise<DocumentCategoryItem[]> {
  const activeDocs = await getActiveDocuments(userId);
  let customList: DocumentCategoryItem[] = [];
  try {
    const raw = localStorage.getItem(`aegislock_categories_${userId}`);
    if (raw) {
      customList = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed reading custom categories', e);
  }

  const all = [...DEFAULT_CATEGORIES, ...customList];

  // Calculate document counts for each category
  return all.map(cat => ({
    ...cat,
    documentCount: activeDocs.filter(d => d.category.toLowerCase() === cat.id.toLowerCase() || d.category.toLowerCase() === cat.name.toLowerCase()).length,
  }));
}

export async function saveCategory(category: DocumentCategoryItem, userId: string): Promise<void> {
  let customList: DocumentCategoryItem[] = [];
  try {
    const raw = localStorage.getItem(`aegislock_categories_${userId}`);
    if (raw) customList = JSON.parse(raw);
  } catch (e) {
    customList = [];
  }

  const existingIdx = customList.findIndex(c => c.id === category.id);
  if (existingIdx >= 0) {
    customList[existingIdx] = category;
  } else {
    customList.push(category);
  }
  localStorage.setItem(`aegislock_categories_${userId}`, JSON.stringify(customList));
}

export async function deleteCategory(categoryId: string, userId: string): Promise<boolean> {
  let customList: DocumentCategoryItem[] = [];
  try {
    const raw = localStorage.getItem(`aegislock_categories_${userId}`);
    if (raw) customList = JSON.parse(raw);
  } catch (e) {
    return false;
  }

  const filtered = customList.filter(c => c.id !== categoryId);
  localStorage.setItem(`aegislock_categories_${userId}`, JSON.stringify(filtered));
  return true;
}

