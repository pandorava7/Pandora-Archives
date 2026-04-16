import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

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
