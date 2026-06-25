import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash, createHmac } from 'crypto';

import { assertBlogEditorWriteConfigured, getBlogEditorEnv } from './env';

let client: S3Client | null = null;

function getR2Client() {
  if (client) {
    return client;
  }

  assertBlogEditorWriteConfigured();
  const env = getBlogEditorEnv();

  client = new S3Client({
    region: 'auto',
    endpoint: env.r2Endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });

  return client;
}

async function streamToString(body: unknown) {
  if (!body) {
    return null;
  }

  if (typeof body === 'string') {
    return body;
  }

  if (typeof body === 'object' && body && 'transformToString' in body) {
    return (body as { transformToString: () => Promise<string> }).transformToString();
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

function isMissingObjectError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'NoSuchKey' || error.name === 'NotFound';
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeObjectKey(key: string) {
  return key
    .split('/')
    .map((part) => encodeRfc3986(part))
    .join('/');
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function getSigningKey(secretAccessKey: string, dateStamp: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, 'auto');
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

export async function getR2ObjectText(key: string) {
  const env = getBlogEditorEnv();
  const r2 = getR2Client();

  try {
    const response = await r2.send(
      new GetObjectCommand({
        Bucket: env.r2Bucket,
        Key: key,
      }),
    );

    return streamToString(response.Body);
  } catch (error) {
    if (isMissingObjectError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getR2Json<T>(key: string) {
  const source = await getR2ObjectText(key);
  if (!source) {
    return null;
  }

  return JSON.parse(source) as T;
}

export async function putR2Object(
  key: string,
  body: string | Uint8Array | Buffer,
  contentType: string,
  cacheControl?: string,
) {
  const env = getBlogEditorEnv();
  const r2 = getR2Client();

  await r2.send(
    new PutObjectCommand({
      Bucket: env.r2Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
}

export function createR2PutSignedUrl(key: string, expiresIn = 900) {
  assertBlogEditorWriteConfigured();
  const env = getBlogEditorEnv();
  const endpoint = new URL(env.r2Endpoint.replace(/\/$/, ''));
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = `/${encodeRfc3986(env.r2Bucket)}/${encodeObjectKey(key)}`;
  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${env.r2AccessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });
  const canonicalQueryString = Array.from(query.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${encodeRfc3986(name)}=${encodeRfc3986(value)}`)
    .join('&');
  const canonicalHeaders = `host:${endpoint.host}\n`;
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest, 'utf8').digest('hex'),
  ].join('\n');
  const signature = createHmac('sha256', getSigningKey(env.r2SecretAccessKey, dateStamp))
    .update(stringToSign, 'utf8')
    .digest('hex');

  return `${endpoint.origin}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

export async function putR2Json(key: string, value: unknown) {
  await putR2Object(key, JSON.stringify(value, null, 2), 'application/json; charset=utf-8', 'no-cache');
}

export async function deleteR2Object(key: string) {
  const env = getBlogEditorEnv();
  const r2 = getR2Client();

  await r2.send(
    new DeleteObjectCommand({
      Bucket: env.r2Bucket,
      Key: key,
    }),
  );
}

export async function listR2Keys(prefix: string) {
  const env = getBlogEditorEnv();
  const r2 = getR2Client();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await r2.send(
      new ListObjectsV2Command({
        Bucket: env.r2Bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const item of response.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}
