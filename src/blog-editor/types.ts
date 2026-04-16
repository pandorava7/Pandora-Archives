export interface PublishedBlogPost {
  id: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  cover: string;
  summary: string;
  link: string;
  content_plain: string;
}

export interface BlogEditorDraft {
  id: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  cover: string;
  summary: string;
  markdown: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface BlogEditorSavePayload {
  previousId?: string | null;
  title: string;
  slug?: string;
  date: string;
  category: string;
  tags: string[] | string;
  cover: string;
  summary: string;
  markdown: string;
}

export interface BlogEditorPostSummary {
  id: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  cover: string;
  summary: string;
  updatedAt: string | null;
  publishedAt: string | null;
  hasDraft: boolean;
  hasPublished: boolean;
  link: string | null;
  status: 'draft' | 'published' | 'draft-and-published';
}

export interface BlogEditorPostDetail {
  draft: BlogEditorDraft;
  hasDraft: boolean;
  hasPublished: boolean;
  link: string | null;
  configErrors: string[];
}

export interface BlogEditorPostListResponse {
  items: BlogEditorPostSummary[];
  configErrors: string[];
  canWrite: boolean;
}

export function normalizeTagList(value: string[] | string | undefined | null) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => item.trim()).filter(Boolean)));
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(/[\n,，]/g)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  return [] as string[];
}
