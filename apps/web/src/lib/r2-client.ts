import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const requiredEnv = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_ACCESS_KEY_ID',
  'CLOUDFLARE_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;

type RequiredEnvKey = (typeof requiredEnv)[number];

function getEnv(key: RequiredEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const r2Config = {
  accountId: getEnv('CLOUDFLARE_ACCOUNT_ID'),
  accessKeyId: getEnv('CLOUDFLARE_ACCESS_KEY_ID'),
  secretAccessKey: getEnv('CLOUDFLARE_SECRET_ACCESS_KEY'),
  bucketName: getEnv('R2_BUCKET_NAME'),
  publicBaseUrl: getEnv('R2_PUBLIC_URL').replace(/\/$/, ''),
};

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey,
  },
});

export function buildR2PublicUrl(objectKey: string): string {
  const cleanKey = objectKey.replace(/^\/+/, '');
  return `${r2Config.publicBaseUrl}/${r2Config.bucketName}/${cleanKey}`;
}

export function createR2PutObjectCommand(args: {
  objectKey: string;
  body: Buffer;
  contentType: string;
  contentLength: number;
}): PutObjectCommand {
  return new PutObjectCommand({
    Bucket: r2Config.bucketName,
    Key: args.objectKey,
    Body: args.body,
    ContentType: args.contentType,
    ContentLength: args.contentLength,
    CacheControl: 'public, max-age=31536000, immutable',
  });
}
