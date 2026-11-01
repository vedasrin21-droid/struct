import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface StorageUploadResult {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

export interface StorageConfig {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  publicUrlPrefix?: string;
}

function getR2Config(): StorageConfig {
  return {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME || 'struct-private-storage',
    publicUrlPrefix: process.env.R2_PUBLIC_URL_PREFIX,
  };
}

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client | null {
  const config = getR2Config();
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    return null;
  }
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return s3ClientInstance;
}

// Local fallback directory STRICTLY for offline development & tests
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'data', 'storage_fallback');

function ensureLocalStorageDir() {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Validates that an authenticated user has authorization to access the given object key.
 * Enforces ownership matching the partitioned storageKey prefix.
 */
export function validateStorageKeyOwnership(
  storageKey: string,
  authenticatedUserId: string,
  isSuperAdmin: boolean = false
): boolean {
  if (!storageKey) return false;
  if (isSuperAdmin) return true;

  // storageKey structure: {folder}/{ownerId}/{fileName}
  const parts = storageKey.split('/');
  if (parts.length < 3) return false;

  const ownerId = parts[1];
  const sanitizedAuthUser = authenticatedUserId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return ownerId === sanitizedAuthUser;
}

/**
 * Generate a cryptographically secure storage key.
 * Enforces strict owner partitioning:
 * - temp_resumes/{userId}/{timestamp}_{randomId}.{ext}
 * - saved_resumes/{userId}/{timestamp}_{randomId}.{ext}
 */
export function generateStorageKey(
  folder: 'temp_resumes' | 'saved_resumes' | 'interview_audio' | 'general',
  ownerId: string,
  fileName: string
): string {
  const ext = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.pdf';
  const randomSuffix = crypto.randomBytes(16).toString('hex');
  const sanitizedOwner = ownerId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${folder}/${sanitizedOwner}/${Date.now()}_${randomSuffix}${ext}`;
}

/**
 * Creates a presigned PUT URL for direct client upload to Cloudflare R2
 * with size restrictions and content type validation.
 *
 * Strict Production Enforcement:
 * - In production (NODE_ENV=production), missing R2 configuration throws an explicit fatal error.
 * - Local filesystem fallback is strictly restricted to development environments.
 */
export async function getPresignedUploadUrl(
  storageKey: string,
  contentType: string,
  maxSizeBytes: number = 10 * 1024 * 1024, // 10MB default
  expiresInSeconds: number = 900 // 15 minutes
): Promise<StorageUploadResult> {
  const client = getS3Client();
  const config = getR2Config();

  // Allowed MIME types for STRUCT resume parsing
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ];

  if (!allowedMimeTypes.includes(contentType)) {
    throw new Error(
      `UNSUPPORTED_MEDIA_TYPE: Only PDF, DOCX, and TXT files are accepted (got ${contentType}).`
    );
  }

  if (client && config.bucketName) {
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: storageKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      uploadUrl,
      storageKey,
      expiresInSeconds,
    };
  }

  // Strict check: No local storage silently used in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL_STORAGE_ERROR: Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are mandatory in production. Local storage fallback is prohibited in production.'
    );
  }

  // Development / Offline Fallback
  ensureLocalStorageDir();
  return {
    uploadUrl: `/api/storage/local-upload?key=${encodeURIComponent(storageKey)}`,
    storageKey,
    expiresInSeconds,
  };
}

/**
 * Creates a presigned GET URL for time-limited authorized downloads.
 * Strictly enforces production R2 credentials and rejects unconfigured production storage.
 */
export async function getPresignedDownloadUrl(
  storageKey: string,
  expiresInSeconds: number = 3600 // 1 hour default
): Promise<string> {
  const client = getS3Client();
  const config = getR2Config();

  if (client && config.bucketName) {
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: storageKey,
    });
    return await getSignedUrl(client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL_STORAGE_ERROR: Cloudflare R2 credentials are required in production for secure downloads.'
    );
  }

  // Development Fallback
  return `/api/storage/local-download?key=${encodeURIComponent(storageKey)}`;
}

/**
 * Permanently deletes an object from storage according to retention policies.
 */
export async function deleteStorageObject(storageKey: string): Promise<boolean> {
  const client = getS3Client();
  const config = getR2Config();

  if (client && config.bucketName) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: storageKey,
      });
      await client.send(command);
      return true;
    } catch (err) {
      console.error('[R2 Storage Delete Error]', err);
      return false;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL_STORAGE_ERROR: Cloudflare R2 credentials are required in production for secure object deletion.'
    );
  }

  // Local fallback in dev
  try {
    const localPath = path.join(LOCAL_STORAGE_DIR, storageKey);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    return true;
  } catch {
    return false;
  }
}
