import matter from 'gray-matter';
import { remark } from 'remark';
import strip from 'strip-markdown';

import type { BlogEditorDraft } from './types';

function quoteYaml(value: string) {
  return JSON.stringify(value ?? '');
}

function getDateYear(date: string) {
  const year = date.trim().slice(0, 4);
  return /^\d{4}$/.test(year) ? year : String(new Date().getUTCFullYear());
}

export function buildPublishedLink(date: string, id: string) {
  return `${getDateYear(date)}/${id}.md`;
}

export function buildCoverUploadKey(date: string, slug: string, fileName: string) {
  return `posts/${getDateYear(date)}/${slug || 'untitled'}/cover/${fileName}`;
}

export function buildPostResourceUploadKey(date: string, slug: string, resourceFolder: string, fileName: string) {
  return `posts/${getDateYear(date)}/${slug || 'untitled'}/assets/${resourceFolder || 'other'}/${fileName}`;
}

export async function extractPlainText(markdown: string) {
  const processed = await remark().use(strip).process(markdown);
  return processed.toString().replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
}

export function estimateReadingMinutes(markdown: string) {
  return Math.max(1, Math.ceil(markdown.length / 400));
}

export function serializeDraftToMarkdown(draft: BlogEditorDraft) {
  const coverFrontmatterValue =
    draft.cover.includes('/') && !draft.cover.startsWith('http')
      ? draft.cover.split('/').pop() ?? draft.cover
      : draft.cover;

  return [
    '---',
    `id: ${quoteYaml(draft.id)}`,
    `title: ${quoteYaml(draft.title)}`,
    `date: ${quoteYaml(draft.date)}`,
    `category: ${quoteYaml(draft.category)}`,
    `tags: [${draft.tags.map((tag) => quoteYaml(tag)).join(', ')}]`,
    `cover: ${quoteYaml(coverFrontmatterValue)}`,
    `summary: ${quoteYaml(draft.summary)}`,
    '---',
    '',
    draft.markdown.trimEnd(),
    '',
  ].join('\n');
}

export function parseFrontmatterDocument(source: string) {
  return matter(source);
}
