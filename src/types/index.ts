export type DocumentCategory = string;

export interface DocumentCategoryItem {
  id: string;
  userId?: string;
  name: string;
  label: string;
  description?: string;
  color?: string;
  isCustom?: boolean;
  documentCount?: number;
}

export interface LockerDocument {
  id: string;
  userId: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileType: string;
  fileSize: number; // in bytes
  dataUrl: string; // base64 or object url for preview/download
  issueDate: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  tags: string[];
  createdByTool?: boolean;
  sourceDocumentIds?: string[];
  uploadedAt: string;
  deletedAt?: string | null; // null if active, ISO timestamp if in recycle bin
  fileHash?: string;
  pinCode?: string; // Optional document PIN lock set by student
  isPinProtected?: boolean;
}

export interface ProfileVaultField {
  id: string;
  label: string;
  value: string;
  category: 'academic' | 'contact' | 'identification' | 'personal' | 'custom';
  isSensitive?: boolean;
}

export interface BiometricCredential {
  id: string; // base64url or credential ID
  rawId?: string;
  publicKey?: string;
  algorithm?: number; // e.g. -7 (ES256)
  counter?: number;
  authenticatorAttachment?: 'platform' | 'cross-platform';
  deviceType?: string; // e.g. "Touch ID / Windows Hello / Face ID"
  createdAt: string;
  lastUsedAt?: string;
  isSimulated?: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  rollNumber: string;
  hasPasskey: boolean;
  passkeyPin?: string; // 6-digit passkey PIN for student locker unlock
  passkeyCredentialId?: string;
  hasBiometric?: boolean;
  biometricCredential?: BiometricCredential;
  createdAt: string;
  lastLoginAt: string;
  storageQuotaBytes: number; // default e.g. 100MB (104,857,600 bytes)
}

export interface ShareLink {
  id: string;
  userId: string;
  documentId: string;
  documentTitle: string;
  token: string;
  pinHash?: string; // empty if no pin
  requiresPin: boolean;
  expiresAt: string; // ISO date string
  permission: 'view' | 'download';
  watermarkText?: string;
  revoked: boolean;
  createdAt: string;
}

export interface AccessLog {
  id: string;
  linkId: string;
  documentId: string;
  timestamp: string;
  device: string;
  ipLocation: string;
  action: 'view' | 'download';
  successful: boolean;
}

export type PackType = 'internship' | 'scholarship' | 'placement';

export interface ApplicationPackItem {
  id: string;
  name: string;
  category: DocumentCategory;
  description: string;
  required: boolean;
  matchedDocumentId?: string;
}

export interface ApplicationPack {
  type: PackType;
  title: string;
  description: string;
  targetDeadline?: string;
  items: ApplicationPackItem[];
}

export type ActivePage = 'home' | 'login' | 'dashboard' | 'profile' | 'upload' | 'share';
export type DashboardTab = 'documents' | 'packs' | 'toolkit' | 'categories' | 'recycle';
