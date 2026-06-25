import fs from 'fs/promises';
import path from 'path';

import { BLOG_EDITOR_DRAFT_PREFIX, BLOG_EDITOR_PUBLISHED_INDEX_KEY } from './constants';
import {
  buildCoverUploadKey,
  buildPublishedLink,
  buildPostResourceUploadKey,
  extractPlainText,
  parseFrontmatterDocument,
  serializeDraftToMarkdown,
} from './content';
import { getBlogEditorWriteConfigErrors, getBlogEditorEnv, isBlogEditorWriteConfigured } from './env';
import { createR2PutSignedUrl, deleteR2Object, getR2Json, listR2Keys, putR2Json, putR2Object } from './r2';
import { slugifyBlogTitle } from './slug';
import {
  type BlogEditorDraft,
  type BlogEditorPostDetail,
  type BlogEditorPostListResponse,
  type BlogEditorPostSummary,
  type BlogEditorSavePayload,
  type PublishedBlogPost,
  normalizeTagList,
} from './types';

function getDraftObjectKey(id: string) {
  return `${BLOG_EDITOR_DRAFT_PREFIX}/${id}.json`;
}

function normalizeDateInput(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  return new Date().toISOString().slice(0, 10);
}

function sanitizeSavePayload(payload: BlogEditorSavePayload, existingDraft?: BlogEditorDraft | null) {
  const title = payload.title.trim();
  if (!title) {
    throw new Error('标题不能为空。');
  }

  const id = slugifyBlogTitle(payload.slug?.trim() || title);
  if (!id) {
    throw new Error('Slug 不能为空，请检查标题或手动设置。');
  }

  const now = new Date().toISOString();

  return {
    id,
    title,
    date: normalizeDateInput(payload.date),
    category: payload.category.trim() || '未分类',
    tags: normalizeTagList(payload.tags),
    cover: payload.cover.trim(),
    summary: payload.summary.trim(),
    markdown: payload.markdown.replace(/\r\n/g, '\n'),
    createdAt: existingDraft?.createdAt ?? now,
    updatedAt: now,
    publishedAt: existingDraft?.publishedAt ?? null,
  } satisfies BlogEditorDraft;
}

function compareIsoLikeDates(left: string | null, right: string | null) {
  const leftValue = left ? new Date(left).getTime() : 0;
  const rightValue = right ? new Date(right).getTime() : 0;
  return rightValue - leftValue;
}

async function readLocalJson<T>(relativePath: string) {
  const filePath = path.join(process.cwd(), relativePath);
  const source = await fs.readFile(filePath, 'utf8');
  return JSON.parse(source) as T;
}

async function readPublishedPostsIndex() {
  const { assetBaseUrl } = getBlogEditorEnv();

  if (assetBaseUrl) {
    try {
      const response = await fetch(`${assetBaseUrl}/posts.json`, { cache: 'no-store' });
      if (response.ok) {
        const posts = (await response.json()) as PublishedBlogPost[];
        return Array.isArray(posts) ? posts : [];
      }
    } catch {
      // Fall through to local fallback.
    }
  }

  try {
    return await readLocalJson<PublishedBlogPost[]>('public/r2/posts.json');
  } catch {
    return [] as PublishedBlogPost[];
  }
}

async function readPublishedMarkdown(link: string) {
  const { assetBaseUrl } = getBlogEditorEnv();

  if (assetBaseUrl) {
    const response = await fetch(`${assetBaseUrl}/posts/${link}`, { cache: 'no-store' });
    if (response.ok) {
      return response.text();
    }
  }

  try {
    return await fs.readFile(path.join(process.cwd(), 'public', 'r2', 'posts', link), 'utf8');
  } catch {
    return null;
  }
}

async function listAdminDrafts() {
  if (!isBlogEditorWriteConfigured()) {
    return [] as BlogEditorDraft[];
  }

  const keys = await listR2Keys(`${BLOG_EDITOR_DRAFT_PREFIX}/`);
  const drafts = await Promise.all(
    keys
      .filter((key) => key.endsWith('.json'))
      .map((key) => getR2Json<BlogEditorDraft>(key)),
  );

  return drafts.filter((draft): draft is BlogEditorDraft => Boolean(draft));
}

async function readAdminDraft(id: string) {
  if (!isBlogEditorWriteConfigured()) {
    return null;
  }

  return getR2Json<BlogEditorDraft>(getDraftObjectKey(id));
}

async function writeAdminDraft(draft: BlogEditorDraft) {
  await putR2Json(getDraftObjectKey(draft.id), draft);
}

async function deleteAdminDraft(id: string) {
  if (!isBlogEditorWriteConfigured()) {
    return;
  }

  await deleteR2Object(getDraftObjectKey(id));
}

async function readPublishedDetail(id: string) {
  const posts = await readPublishedPostsIndex();
  const published = posts.find((post) => post.id === id);

  if (!published) {
    return null;
  }

  const source = await readPublishedMarkdown(published.link);
  if (!source) {
    return {
      draft: {
        id: published.id,
        title: published.title,
        date: published.date,
        category: published.category,
        tags: published.tags,
        cover: published.cover,
        summary: published.summary,
        markdown: '',
        createdAt: published.date,
        updatedAt: published.date,
        publishedAt: published.date,
      } satisfies BlogEditorDraft,
      link: published.link,
    };
  }

  const { data, content } = parseFrontmatterDocument(source);

  return {
    draft: {
      id: published.id,
      title: typeof data.title === 'string' ? data.title : published.title,
      date: typeof data.date === 'string' ? data.date : published.date,
      category: typeof data.category === 'string' ? data.category : published.category,
      tags: normalizeTagList(Array.isArray(data.tags) ? data.tags : published.tags),
      cover: published.cover,
      summary: typeof data.summary === 'string' ? data.summary : published.summary,
      markdown: content,
      createdAt: published.date,
      updatedAt: published.date,
      publishedAt: published.date,
    } satisfies BlogEditorDraft,
    link: published.link,
  };
}

function buildSummaryFromDraft(draft: BlogEditorDraft, link: string | null, hasPublished: boolean) {
  return {
    id: draft.id,
    title: draft.title,
    date: draft.date,
    category: draft.category,
    tags: draft.tags,
    cover: draft.cover,
    summary: draft.summary,
    updatedAt: draft.updatedAt,
    publishedAt: hasPublished ? draft.publishedAt ?? draft.date : null,
    hasDraft: true,
    hasPublished,
    link,
    status: hasPublished ? 'draft-and-published' : 'draft',
  } satisfies BlogEditorPostSummary;
}

function buildSummaryFromPublished(post: PublishedBlogPost) {
  return {
    id: post.id,
    title: post.title,
    date: post.date,
    category: post.category,
    tags: post.tags,
    cover: post.cover,
    summary: post.summary,
    updatedAt: post.date,
    publishedAt: post.date,
    hasDraft: false,
    hasPublished: true,
    link: post.link,
    status: 'published',
  } satisfies BlogEditorPostSummary;
}

export async function listBlogEditorPosts(): Promise<BlogEditorPostListResponse> {
  const [publishedPosts, drafts] = await Promise.all([readPublishedPostsIndex(), listAdminDrafts()]);

  const merged = new Map<string, BlogEditorPostSummary>();

  for (const post of publishedPosts) {
    merged.set(post.id, buildSummaryFromPublished(post));
  }

  for (const draft of drafts) {
    const published = merged.get(draft.id);
    merged.set(draft.id, buildSummaryFromDraft(draft, published?.link ?? null, Boolean(published)));
  }

  const items = Array.from(merged.values()).sort((left, right) =>
    compareIsoLikeDates(left.updatedAt ?? left.publishedAt, right.updatedAt ?? right.publishedAt),
  );

  return {
    items,
    configErrors: getBlogEditorWriteConfigErrors(),
    canWrite: isBlogEditorWriteConfigured(),
  };
}

export async function getBlogEditorPost(id: string): Promise<BlogEditorPostDetail> {
  const [draft, published] = await Promise.all([readAdminDraft(id), readPublishedDetail(id)]);

  if (!draft && !published) {
    throw new Error('文章不存在。');
  }

  return {
    draft: draft ?? published!.draft,
    hasDraft: Boolean(draft),
    hasPublished: Boolean(published),
    link: published?.link ?? null,
    configErrors: getBlogEditorWriteConfigErrors(),
  };
}

export async function saveBlogEditorDraft(payload: BlogEditorSavePayload) {
  const existingDraft = payload.previousId ? await readAdminDraft(payload.previousId) : null;
  const draft = sanitizeSavePayload(payload, existingDraft);

  await writeAdminDraft(draft);

  if (payload.previousId && payload.previousId !== draft.id) {
    await deleteAdminDraft(payload.previousId);
  }

  return getBlogEditorPost(draft.id);
}

export async function publishBlogEditorDraft(payload: BlogEditorSavePayload) {
  const previousId = payload.previousId?.trim() || null;
  const existingDraft = previousId ? await readAdminDraft(previousId) : null;
  const nextDraft = sanitizeSavePayload(payload, existingDraft);
  nextDraft.publishedAt = new Date().toISOString();

  const publishedPosts = await readPublishedPostsIndex();
  const candidateIds = new Set([nextDraft.id, previousId].filter(Boolean));
  const existingPublished = publishedPosts.find((post) => candidateIds.has(post.id)) ?? null;
  const nextLink = buildPublishedLink(nextDraft.date, nextDraft.id);

  if (existingPublished?.link && existingPublished.link !== nextLink) {
    await deleteR2Object(`posts/${existingPublished.link}`);
  }

  const markdownDocument = serializeDraftToMarkdown(nextDraft);
  const plainText = await extractPlainText(nextDraft.markdown);

  await putR2Object(`posts/${nextLink}`, markdownDocument, 'text/markdown; charset=utf-8', 'no-cache');

  const nextPublishedPost: PublishedBlogPost = {
    id: nextDraft.id,
    title: nextDraft.title,
    date: nextDraft.date,
    category: nextDraft.category,
    tags: nextDraft.tags,
    cover: nextDraft.cover,
    summary: nextDraft.summary,
    link: nextLink,
    content_plain: plainText,
  };

  const nextPublishedPosts = publishedPosts
    .filter((post) => !candidateIds.has(post.id))
    .concat(nextPublishedPost)
    .sort((left, right) => compareIsoLikeDates(left.date, right.date));

  await putR2Json(BLOG_EDITOR_PUBLISHED_INDEX_KEY, nextPublishedPosts);
  await writeAdminDraft(nextDraft);

  if (previousId && previousId !== nextDraft.id) {
    await deleteAdminDraft(previousId);
  }

  return getBlogEditorPost(nextDraft.id);
}

export async function unpublishBlogEditorPost(id: string) {
  const [publishedPosts, detail] = await Promise.all([readPublishedPostsIndex(), readPublishedDetail(id)]);
  const existingPublished = publishedPosts.find((post) => post.id === id);

  if (!existingPublished) {
    throw new Error('文章尚未发布。');
  }

  await putR2Json(
    BLOG_EDITOR_PUBLISHED_INDEX_KEY,
    publishedPosts.filter((post) => post.id !== id),
  );
  await deleteR2Object(`posts/${existingPublished.link}`);

  const draft = (await readAdminDraft(id)) ?? detail?.draft;
  if (draft) {
    draft.publishedAt = null;
    draft.updatedAt = new Date().toISOString();
    await writeAdminDraft(draft);
  }

  return getBlogEditorPost(id);
}

export async function deleteBlogEditorPost(id: string) {
  const publishedPosts = await readPublishedPostsIndex();
  const existingPublished = publishedPosts.find((post) => post.id === id);

  if (existingPublished) {
    await putR2Json(
      BLOG_EDITOR_PUBLISHED_INDEX_KEY,
      publishedPosts.filter((post) => post.id !== id),
    );
    await deleteR2Object(`posts/${existingPublished.link}`);
  }

  await deleteAdminDraft(id);
}

function normalizeUploadExtension(fileName: string, contentType: string) {
  const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? '' : '';
  if (extension) {
    return extension;
  }

  if (contentType === 'image/png') {
    return 'png';
  }

  if (contentType === 'image/webp') {
    return 'webp';
  }

  if (contentType === 'image/jpeg') {
    return 'jpg';
  }

  if (contentType === 'image/avif') {
    return 'avif';
  }

  return 'bin';
}

function getResourceFolder(contentType: string, extension: string) {
  if (contentType.startsWith('image/')) {
    return 'images';
  }

  if (contentType.startsWith('audio/')) {
    return 'audio';
  }

  if (contentType.startsWith('video/')) {
    return 'video';
  }

  if (contentType.startsWith('text/') || ['md', 'txt', 'csv', 'json', 'xml', 'yaml', 'yml'].includes(extension)) {
    return 'text';
  }

  if (contentType === 'application/pdf' || ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
    return 'documents';
  }

  if (
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension) ||
    ['application/zip', 'application/x-7z-compressed', 'application/x-rar-compressed', 'application/gzip'].includes(
      contentType,
    )
  ) {
    return 'archives';
  }

  return 'other';
}

export async function uploadBlogCover(
  fileName: string,
  contentType: string,
  body: Uint8Array,
  slugHint: string,
  dateHint: string,
) {
  const postSlug = slugifyBlogTitle(slugHint) || 'untitled';
  const baseName = slugifyBlogTitle(fileName.replace(/\.[^.]+$/, '')) || 'cover';
  const extension = normalizeUploadExtension(fileName, contentType);
  const uploadedFileName = `${baseName}-${Date.now()}.${extension}`;
  const key = buildCoverUploadKey(dateHint, postSlug, uploadedFileName);

  await putR2Object(key, body, contentType, 'public, max-age=31536000, immutable');

  return {
    cover: key.replace(/^posts\//, ''),
    key,
  };
}

export async function uploadBlogResource(
  fileName: string,
  contentType: string,
  body: Uint8Array,
  slugHint: string,
  dateHint: string,
) {
  const postSlug = slugifyBlogTitle(slugHint) || 'untitled';
  const fileSlug = slugifyBlogTitle(fileName.replace(/\.[^.]+$/, '')) || 'asset';
  const extension = normalizeUploadExtension(fileName, contentType);
  const resourceFolder = getResourceFolder(contentType, extension);
  const uploadedFileName = `${fileSlug}-${Date.now()}.${extension}`;
  const key = buildPostResourceUploadKey(dateHint, postSlug, resourceFolder, uploadedFileName);

  await putR2Object(key, body, contentType, 'public, max-age=31536000, immutable');

  return {
    key,
    path: key,
    fileName,
    contentType,
  };
}

export function createBlogResourceUploadTarget(fileName: string, contentType: string, slugHint: string, dateHint: string) {
  const postSlug = slugifyBlogTitle(slugHint) || 'untitled';
  const fileSlug = slugifyBlogTitle(fileName.replace(/\.[^.]+$/, '')) || 'asset';
  const extension = normalizeUploadExtension(fileName, contentType);
  const resourceFolder = getResourceFolder(contentType, extension);
  const uploadedFileName = `${fileSlug}-${Date.now()}.${extension}`;
  const key = buildPostResourceUploadKey(dateHint, postSlug, resourceFolder, uploadedFileName);

  return {
    uploadUrl: createR2PutSignedUrl(key),
    path: key,
    key,
    fileName,
    contentType,
  };
}
