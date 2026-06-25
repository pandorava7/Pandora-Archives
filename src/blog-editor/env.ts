export interface BlogEditorEnv {
  adminPassword: string;
  sessionSecret: string;
  assetBaseUrl: string;
  r2Endpoint: string;
  r2Bucket: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  cfAccountId: string;
}

function trimEnv(value: string | undefined) {
  return value?.trim() ?? '';
}

export function getBlogEditorEnv(): BlogEditorEnv {
  const adminPassword = trimEnv(process.env.ADMIN_PASSWORD);
  const cfAccountId = trimEnv(process.env.CF_ACCOUNT_ID);
  const explicitEndpoint = trimEnv(process.env.R2_ENDPOINT);

  return {
    adminPassword,
    sessionSecret: trimEnv(process.env.BLOG_EDITOR_SESSION_SECRET) || adminPassword,
    assetBaseUrl:
      trimEnv(process.env.NEXT_PUBLIC_ASSET_BASE_URL) ||
      trimEnv(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL) ||
      trimEnv(process.env.R2_PUBLIC_BASE_URL),
    r2Endpoint: explicitEndpoint || (cfAccountId ? `https://${cfAccountId}.r2.cloudflarestorage.com` : ''),
    r2Bucket: trimEnv(process.env.R2_BUCKET_NAME) || trimEnv(process.env.R2_BUCKET) || 'sylunae-public-bucket',
    r2AccessKeyId: trimEnv(process.env.R2_ACCESS_KEY_ID),
    r2SecretAccessKey: trimEnv(process.env.R2_SECRET_ACCESS_KEY),
    cfAccountId,
  };
}

export function getBlogEditorWriteConfigErrors() {
  const env = getBlogEditorEnv();
  const errors: string[] = [];

  if (!env.adminPassword) {
    errors.push('缺少 ADMIN_PASSWORD。');
  }

  if (!env.r2Endpoint) {
    errors.push('缺少 CF_ACCOUNT_ID 或 R2_ENDPOINT。');
  }

  if (!env.r2Bucket) {
    errors.push('缺少 R2_BUCKET_NAME。');
  }

  if (!env.r2AccessKeyId) {
    errors.push('缺少 R2_ACCESS_KEY_ID。');
  }

  if (!env.r2SecretAccessKey) {
    errors.push('缺少 R2_SECRET_ACCESS_KEY。');
  }

  return errors;
}

export function isBlogEditorWriteConfigured() {
  return getBlogEditorWriteConfigErrors().length === 0;
}

export function assertBlogEditorWriteConfigured() {
  const errors = getBlogEditorWriteConfigErrors();
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
}
