import { BLOG_EDITOR_SLUG_MAX_LENGTH } from './constants';

const CONTROL_OR_FORMAT = /[\p{Cc}\p{Cf}]+/gu;
const APOSTROPHES = /['’`´]+/gu;
const DASH_VARIANTS = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]+/gu;
const SEPARATORS = /[\s_./\\|&+#·•‧・･﹒]+/gu;
const INVALID_SLUG_CHARS = /[^\p{L}\p{N}\p{M}-]+/gu;

function truncateByCodePoint(value: string, maxLength: number) {
  return Array.from(value).slice(0, maxLength).join('');
}

export function slugifyBlogTitle(value: string, maxLength = BLOG_EDITOR_SLUG_MAX_LENGTH) {
  const normalized = value
    .normalize('NFKC')
    .replace(CONTROL_OR_FORMAT, '')
    .trim();

  if (!normalized) {
    return '';
  }

  const slug = normalized
    .replace(/c\+\+/giu, 'cpp')
    .replace(/c#/giu, 'csharp')
    .replace(/\.net/giu, 'dotnet')
    .toLocaleLowerCase('en-US')
    .replace(APOSTROPHES, '')
    .replace(DASH_VARIANTS, '-')
    .replace(SEPARATORS, '-')
    .replace(INVALID_SLUG_CHARS, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    return '';
  }

  return truncateByCodePoint(slug, maxLength)
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
