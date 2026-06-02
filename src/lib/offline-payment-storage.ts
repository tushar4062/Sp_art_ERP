import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const SECRET = process.env.EVIDENCE_PATH_SECRET || process.env.ADMIN_SESSION_SECRET;
if (!SECRET) {
  console.warn('[offline-payment-storage] EVIDENCE_PATH_SECRET is not set. Path encryption will fail if used.');
}

const KEY = SECRET ? crypto.createHash('sha256').update(SECRET, 'utf8').digest() : null;
const STORAGE_ROOT = process.env.EVIDENCE_UPLOAD_DIR
  ? path.resolve(process.env.EVIDENCE_UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads', 'offline-payments');

export function getEvidenceStorageRoot() {
  return STORAGE_ROOT;
}

export async function ensureDirectory(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .slice(0, 180);
}

export function encryptPath(plainPath: string) {
  if (!KEY) {
    throw new Error('Missing EVIDENCE_PATH_SECRET for path encryption');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plainPath, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

export function decryptPath(encrypted: string) {
  if (!KEY) {
    throw new Error('Missing EVIDENCE_PATH_SECRET for path decryption');
  }
  const parts = encrypted.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted path format');
  }
  const [ivB64, tagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}

export async function saveEvidenceFile(
  paymentId: string,
  file: Blob & { name?: string; type?: string; arrayBuffer: () => Promise<ArrayBuffer> },
) {
  const fileName = sanitizeFileName(file.name || 'evidence');
  const relativePath = path.posix.join('evidence', paymentId, `${Date.now()}_${fileName}`);
  const absolutePath = path.join(STORAGE_ROOT, ...relativePath.split('/'));
  await ensureDirectory(path.dirname(absolutePath));
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);
  return {
    relativePath,
    encryptedPath: encryptPath(relativePath),
  };
}

export function sanitizeText(value: string) {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n/g, '\n')
    .slice(0, 2000);
}
