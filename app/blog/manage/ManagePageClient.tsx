'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import {
  AlertTriangle,
  BookText,
  Eye,
  FilePlus2,
  ImagePlus,
  ListTodo,
  LoaderCircle,
  LogOut,
  Paperclip,
  PencilLine,
  RefreshCw,
  Save,
  Search,
  Send,
  SquarePen,
  Trash2,
  Undo2,
} from 'lucide-react';

import { slugifyBlogTitle } from '@/blog-editor/slug';
import type {
  BlogEditorPostDetail,
  BlogEditorPostListResponse,
  BlogEditorPostSummary,
} from '@/blog-editor/types';
import { ASSET_BASE_URL } from '@/config/assets';

import 'highlight.js/styles/atom-one-dark.css';
import styles from './ManagePage.module.css';

type PreviewMode = 'split' | 'editor' | 'preview';
type StatusFilter = 'all' | 'draft' | 'published' | 'draft-and-published';

type UploadedAsset = {
  path: string;
  fileName: string;
  contentType: string;
};

type SignedUploadTarget = UploadedAsset & {
  uploadUrl: string;
};

type EditorState = {
  previousId: string | null;
  title: string;
  slug: string;
  date: string;
  category: string;
  tags: string[];
  cover: string;
  summary: string;
  markdown: string;
};

const NEW_POST_STORAGE_KEY = 'blog-editor-local:draft-new';
const CUSTOM_CATEGORY_VALUE = '__custom__';

function createEmptyEditorState(): EditorState {
  return {
    previousId: null,
    title: '',
    slug: '',
    date: new Date().toISOString().slice(0, 10),
    category: '',
    tags: [],
    cover: '',
    summary: '',
    markdown: '',
  };
}

function getStorageKey(previousId: string | null) {
  return previousId ? `blog-editor-local:${previousId}` : NEW_POST_STORAGE_KEY;
}

async function apiRequest<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const result = (await response.json().catch(() => null)) as T & { message?: string } | null;

  if (!response.ok) {
    throw new Error(result?.message || '请求失败。');
  }

  return (result ?? ({} as T)) as T;
}

function normalizeTagsInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,，]/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function buildEditorStateFromDetail(detail: BlogEditorPostDetail): EditorState {
  return {
    previousId: detail.draft.id,
    title: detail.draft.title,
    slug: detail.draft.id,
    date: detail.draft.date,
    category: detail.draft.category,
    tags: detail.draft.tags,
    cover: detail.draft.cover,
    summary: detail.draft.summary,
    markdown: detail.draft.markdown,
  };
}

function buildCoverPreviewUrl(cover: string) {
  if (!cover) {
    return '';
  }

  if (cover.startsWith('http://') || cover.startsWith('https://')) {
    return cover;
  }

  return `${ASSET_BASE_URL}/posts/${cover}`;
}

function resolveAssetUrl(value: unknown) {
  const source = typeof value === 'string' ? value.trim() : '';
  if (!source) {
    return '';
  }

  if (/^(https?:|data:|blob:|#)/i.test(source) || source.startsWith('/')) {
    return source;
  }

  const normalizedPath = source.replace(/^\/+/, '');
  return ASSET_BASE_URL ? `${ASSET_BASE_URL.replace(/\/$/, '')}/${normalizedPath}` : `/${normalizedPath}`;
}

function createAssetMarkdown(asset: UploadedAsset) {
  const assetPath = asset.path.replace(/^\/+/, '');
  const label = asset.fileName.replace(/\.[^.]+$/, '') || '资源';

  if (asset.contentType.startsWith('image/')) {
    return `\n![${label}](${assetPath})\n`;
  }

  if (asset.contentType.startsWith('audio/')) {
    return `\n<audio controls src="${assetPath}"></audio>\n`;
  }

  if (asset.contentType.startsWith('video/')) {
    return `\n<video controls src="${assetPath}"></video>\n`;
  }

  return `\n[${asset.fileName}](${assetPath})\n`;
}

export default function ManagePageClient() {
  const markdownRef = useRef<HTMLTextAreaElement | null>(null);

  const [posts, setPosts] = useState<BlogEditorPostSummary[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(createEmptyEditorState);
  const [tagsText, setTagsText] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('split');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);
  const [configErrors, setConfigErrors] = useState<string[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const deferredQuery = useDeferredValue(searchQuery);
  const readingMinutes = Math.max(1, Math.ceil(editor.markdown.length / 400));
  const wordCount = editor.markdown.replace(/\s+/g, '').length;

  const filteredPosts = posts.filter((post) => {
    if (statusFilter !== 'all' && post.status !== statusFilter) {
      return false;
    }

    if (!deferredQuery.trim()) {
      return true;
    }

    const query = deferredQuery.toLocaleLowerCase();
    return [post.title, post.summary, post.category, post.tags.join(' ')].some((value) =>
      value.toLocaleLowerCase().includes(query),
    );
  });
  const existingCategories = useMemo(
    () =>
      Array.from(new Set(posts.map((post) => post.category.trim()).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right, 'zh-CN'),
      ),
    [posts],
  );
  const existingTags = useMemo(
    () =>
      Array.from(new Set(posts.flatMap((post) => post.tags.map((tag) => tag.trim())).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right, 'zh-CN'),
      ),
    [posts],
  );
  const categoryUsesCustomInput = Boolean(editor.category) && !existingCategories.includes(editor.category);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(getStorageKey(editor.previousId), JSON.stringify(editor));
      setMessage('已自动保存到本地草稿。');
    }, 700);

    return () => window.clearTimeout(timer);
  }, [editor, isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoadingList(true);

      try {
        const result = await apiRequest<BlogEditorPostListResponse>('/api/admin/posts');
        if (cancelled) {
          return;
        }

        setPosts(result.items);
        setConfigErrors(result.configErrors);
        setCanWrite(result.canWrite);

        const initialId = result.items[0]?.id ?? null;
        if (!initialId) {
          const localDraft = window.localStorage.getItem(NEW_POST_STORAGE_KEY);
          const nextState = localDraft ? (JSON.parse(localDraft) as EditorState) : createEmptyEditorState();

          setSelectedPostId(null);
          applyEditorState(nextState);
          setSlugTouched(nextState.slug !== slugifyBlogTitle(nextState.title));
          setIsDirty(Boolean(localDraft));
          setError(null);
          return;
        }

        const detail = await apiRequest<BlogEditorPostDetail>(`/api/admin/posts/${encodeURIComponent(initialId)}`);
        if (cancelled) {
          return;
        }

        const nextState = buildEditorStateFromDetail(detail);
        const localDraft = window.localStorage.getItem(getStorageKey(nextState.previousId));
        const restoredState = localDraft ? (JSON.parse(localDraft) as EditorState) : nextState;

        setSelectedPostId(initialId);
        applyEditorState(restoredState);
        setSlugTouched(restoredState.slug !== slugifyBlogTitle(restoredState.title));
        setConfigErrors(detail.configErrors);
        setIsDirty(Boolean(localDraft));

        if (localDraft) {
          setMessage('已恢复本地未提交草稿。');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '加载文章列表失败。');
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshPosts(nextSelectedId?: string | null) {
    setLoadingList(true);

    try {
      const result = await apiRequest<BlogEditorPostListResponse>('/api/admin/posts');
      setPosts(result.items);
      setConfigErrors(result.configErrors);
      setCanWrite(result.canWrite);

      const targetId = nextSelectedId ?? selectedPostId ?? result.items[0]?.id ?? null;
      if (targetId) {
        await loadPost(targetId);
      } else {
        startNewPost();
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载文章列表失败。');
    } finally {
      setLoadingList(false);
    }
  }

  async function loadPost(id: string) {
    setLoadingDetail(true);
    setError(null);

    try {
      const detail = await apiRequest<BlogEditorPostDetail>(`/api/admin/posts/${encodeURIComponent(id)}`);
      const nextState = buildEditorStateFromDetail(detail);
      const localDraft = window.localStorage.getItem(getStorageKey(nextState.previousId));
      const restoredState = localDraft ? (JSON.parse(localDraft) as EditorState) : nextState;

      setSelectedPostId(id);
      applyEditorState(restoredState);
      setSlugTouched(restoredState.slug !== slugifyBlogTitle(restoredState.title));
      setConfigErrors(detail.configErrors);
      setIsDirty(Boolean(localDraft));

      if (localDraft) {
        setMessage('已恢复本地未提交草稿。');
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载文章详情失败。');
    } finally {
      setLoadingDetail(false);
    }
  }

  function startNewPost() {
    setSelectedPostId(null);
    const localDraft = window.localStorage.getItem(NEW_POST_STORAGE_KEY);
    const nextState = localDraft ? (JSON.parse(localDraft) as EditorState) : createEmptyEditorState();

    applyEditorState(nextState);
    setSlugTouched(nextState.slug !== slugifyBlogTitle(nextState.title));
    setIsDirty(Boolean(localDraft));
    setError(null);
  }

  function updateEditor<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setEditor((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
  }

  function applyEditorState(nextState: EditorState) {
    setEditor(nextState);
    setTagsText(nextState.tags.join(', '));
  }

  function handleTitleChange(value: string) {
    setEditor((current) => {
      const nextSlug = slugTouched ? current.slug : slugifyBlogTitle(value);
      return {
        ...current,
        title: value,
        slug: nextSlug,
      };
    });
    setIsDirty(true);
  }

  function insertMarkdown(snippet: string) {
    const textarea = markdownRef.current;
    if (!textarea) {
      updateEditor('markdown', `${editor.markdown}${snippet}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextMarkdown = `${editor.markdown.slice(0, start)}${snippet}${editor.markdown.slice(end)}`;

    setEditor((current) => ({
      ...current,
      markdown: nextMarkdown,
    }));
    setIsDirty(true);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function handleCoverUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('slug', editor.slug || editor.title || file.name);
    formData.append('date', editor.date);

    setSubmitting(true);
    setError(null);

    try {
      const result = await apiRequest<{ cover: string }>('/api/admin/uploads/cover', {
        method: 'POST',
        body: formData,
      });

      updateEditor('cover', result.cover);
      setMessage('封面上传成功。');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '上传封面失败。');
    } finally {
      setSubmitting(false);
      event.target.value = '';
    }
  }

  function toggleTag(tag: string) {
    const nextTags = editor.tags.includes(tag)
      ? editor.tags.filter((item) => item !== tag)
      : Array.from(new Set([...editor.tags, tag]));

    setTagsText(nextTags.join(', '));
    updateEditor('tags', nextTags);
  }

  async function handleAssetUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAssetUploading(true);
    setError(null);

    try {
      const target = await apiRequest<SignedUploadTarget>('/api/admin/uploads/asset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          slug: editor.slug || editor.title || file.name,
          date: editor.date,
        }),
      });

      setMessage(`正在上传 ${file.name}...`);
      const uploadResponse = await fetch(target.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`资源直传失败：${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      insertMarkdown(createAssetMarkdown(target));
      setMessage('资源已上传并插入正文。');
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? `${uploadError.message} 如果是浏览器 CORS 报错，请在 Cloudflare R2 为 sylunae-public-bucket 允许当前站点的 PUT 请求。`
          : '上传资源失败。',
      );
    } finally {
      setAssetUploading(false);
      event.target.value = '';
    }
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);

    try {
      const detail = await apiRequest<BlogEditorPostDetail>('/api/admin/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          previousId: editor.previousId,
          title: editor.title,
          slug: editor.slug,
          date: editor.date,
          category: editor.category,
          tags: editor.tags,
          cover: editor.cover,
          summary: editor.summary,
          markdown: editor.markdown,
        }),
      });

      const previousStorageKey = getStorageKey(editor.previousId);
      const nextState = buildEditorStateFromDetail(detail);

      window.localStorage.removeItem(previousStorageKey);
      applyEditorState(nextState);
      setSelectedPostId(nextState.previousId);
      setSlugTouched(nextState.slug !== slugifyBlogTitle(nextState.title));
      setIsDirty(false);
      setMessage('草稿已保存到对象存储。');

      await refreshPosts(nextState.previousId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存草稿失败。');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish() {
    setSubmitting(true);
    setError(null);

    try {
      const routeId = editor.previousId || editor.slug || slugifyBlogTitle(editor.title);
      const detail = await apiRequest<BlogEditorPostDetail>(
        `/api/admin/posts/${encodeURIComponent(routeId)}/publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            previousId: editor.previousId,
            title: editor.title,
            slug: editor.slug,
            date: editor.date,
            category: editor.category,
            tags: editor.tags,
            cover: editor.cover,
            summary: editor.summary,
            markdown: editor.markdown,
          }),
        },
      );

      const previousStorageKey = getStorageKey(editor.previousId);
      const nextState = buildEditorStateFromDetail(detail);

      window.localStorage.removeItem(previousStorageKey);
      applyEditorState(nextState);
      setSelectedPostId(nextState.previousId);
      setSlugTouched(nextState.slug !== slugifyBlogTitle(nextState.title));
      setIsDirty(false);
      setMessage('文章已发布并同步公开索引。');

      await refreshPosts(nextState.previousId);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : '发布文章失败。');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnpublish(id: string) {
    setSubmitting(true);
    setError(null);

    try {
      const detail = await apiRequest<BlogEditorPostDetail>(
        `/api/admin/posts/${encodeURIComponent(id)}/unpublish`,
        {
          method: 'POST',
        },
      );

      applyEditorState(buildEditorStateFromDetail(detail));
      setSelectedPostId(detail.draft.id);
      setIsDirty(false);
      setMessage('文章已撤回发布，公开页将不再显示。');
      await refreshPosts(detail.draft.id);
    } catch (unpublishError) {
      setError(unpublishError instanceof Error ? unpublishError.message : '撤回发布失败。');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('确认删除这篇文章及其草稿吗？');
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiRequest(`/api/admin/posts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      window.localStorage.removeItem(getStorageKey(id));
      setMessage('文章已删除。');
      setSelectedPostId(null);
      startNewPost();
      await refreshPosts(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除文章失败。');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/session', { method: 'DELETE' });
    window.location.href = '/blog/manage/login';
  }

  const activePost = posts.find((post) => post.id === selectedPostId) ?? null;

  return (
    <div className={styles.pageShell}>
      <header className={styles.heroHeader}>
        <div className={styles.heroBackdrop} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div>
            <p className={styles.heroEyebrow}>Blog Editor</p>
            <h1 className="brand-gradient-text">博客编辑后台</h1>
            <p className={styles.heroSubtitle}>统一管理草稿、封面、实时预览和公开发布。</p>
          </div>

          <div className={styles.heroActions}>
            <Link href="/blog" className={styles.secondaryButton}>
              返回博客页
            </Link>
            <button type="button" className={styles.ghostButton} onClick={handleLogout}>
              <LogOut size={16} /> 退出登录
            </button>
          </div>
        </div>
      </header>

      <main className={styles.manageLayout}>
        <aside className={styles.sidebarPanel}>
          <div className={styles.sidebarTopBar}>
            <div>
              <h2>文章管理</h2>
              <p>草稿与已发布内容统一检索。</p>
            </div>

            <button type="button" className={styles.primaryButton} onClick={startNewPost}>
              <FilePlus2 size={16} /> 新文章
            </button>
          </div>

          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索标题、摘要或分类"
            />
          </div>

          <div className={styles.filterRow}>
            {(['all', 'draft', 'published', 'draft-and-published'] as StatusFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                className={statusFilter === value ? styles.filterChipActive : styles.filterChip}
                onClick={() => setStatusFilter(value)}
              >
                {value === 'all'
                  ? '全部'
                  : value === 'draft'
                    ? '草稿'
                    : value === 'published'
                      ? '已发布'
                      : '草稿 + 已发布'}
              </button>
            ))}
          </div>

          {loadingList ? (
            <div className={styles.loadingState}>
              <LoaderCircle className={styles.spinIcon} size={18} /> 正在加载文章列表...
            </div>
          ) : (
            <div className={styles.postList}>
              {filteredPosts.length === 0 ? (
                <div className={styles.emptyState}>还没有符合筛选条件的文章。</div>
              ) : null}

              {filteredPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className={post.id === selectedPostId ? styles.postCardActive : styles.postCard}
                  onClick={() => void loadPost(post.id)}
                >
                  <div className={styles.postCardHeader}>
                    <span className={styles.postStatus}>{post.status}</span>
                    <span className={styles.postDate}>{post.date}</span>
                  </div>
                  <strong>{post.title}</strong>
                  <p>{post.summary || '暂无摘要。'}</p>
                  <div className={styles.postMetaRow}>
                    <span>{post.category || '未分类'}</span>
                    <span>{post.tags.join(' / ') || '无标签'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className={styles.editorPanel}>
          {configErrors.length > 0 ? (
            <div className={styles.warningBanner}>
              <AlertTriangle size={18} />
              <div>
                <strong>后台写入尚未完整配置</strong>
                <p>{configErrors.join(' ')}</p>
              </div>
            </div>
          ) : null}

          {error ? <div className={styles.errorBanner}>{error}</div> : null}
          {message ? <div className={styles.successBanner}>{message}</div> : null}

          <div className={styles.editorToolbar}>
            <div>
              <h2>{selectedPostId ? '编辑文章' : '撰写新文章'}</h2>
              <p>
                当前路由标识: <code>{editor.slug || '未生成'}</code>
              </p>
            </div>

            <div className={styles.toolbarActions}>
              <button type="button" className={styles.ghostButton} onClick={() => void refreshPosts(selectedPostId)}>
                <RefreshCw size={16} /> 刷新
              </button>
              {activePost?.hasPublished ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={submitting}
                  onClick={() => void handleUnpublish(activePost.id)}
                >
                  <Undo2 size={16} /> 撤回发布
                </button>
              ) : null}
              {selectedPostId ? (
                <button
                  type="button"
                  className={styles.dangerButton}
                  disabled={submitting}
                  onClick={() => void handleDelete(selectedPostId)}
                >
                  <Trash2 size={16} /> 删除
                </button>
              ) : null}
              <button type="button" className={styles.secondaryButton} disabled={submitting || !canWrite} onClick={() => void handleSave()}>
                <Save size={16} /> 保存草稿
              </button>
              <button type="button" className={styles.primaryButton} disabled={submitting || !canWrite} onClick={() => void handlePublish()}>
                <Send size={16} /> 发布文章
              </button>
            </div>
          </div>

          <div className={styles.metaGrid}>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>标题</span>
              <input
                className={styles.textInput}
                value={editor.title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="例如：我的年度游戏清单"
              />
            </label>

            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>Slug / 路由标识</span>
              <input
                className={styles.textInput}
                value={editor.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  updateEditor('slug', slugifyBlogTitle(event.target.value));
                }}
                placeholder="自动生成，可手动覆盖"
              />
            </label>

            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>发布日期</span>
              <input
                type="date"
                className={styles.textInput}
                value={editor.date}
                onChange={(event) => updateEditor('date', event.target.value)}
              />
            </label>

            <div className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>分类</span>
              {existingCategories.length > 0 ? (
                <select
                  className={styles.textInput}
                  value={categoryUsesCustomInput ? CUSTOM_CATEGORY_VALUE : editor.category}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    updateEditor('category', nextValue === CUSTOM_CATEGORY_VALUE ? '' : nextValue);
                  }}
                >
                  <option value="">选择已有分类</option>
                  {existingCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value={CUSTOM_CATEGORY_VALUE}>新分类...</option>
                </select>
              ) : null}
              {existingCategories.length === 0 || categoryUsesCustomInput || !editor.category ? (
                <input
                  className={styles.textInput}
                  value={editor.category}
                  onChange={(event) => updateEditor('category', event.target.value)}
                  placeholder={existingCategories.length > 0 ? '输入新分类' : '例如：技术分享'}
                />
              ) : null}
            </div>

            <div className={styles.fieldBlockWide}>
              <span className={styles.fieldLabel}>标签</span>
              <input
                className={styles.textInput}
                value={tagsText}
                onChange={(event) => {
                  setTagsText(event.target.value);
                  updateEditor('tags', normalizeTagsInput(event.target.value));
                }}
                placeholder="点选已有标签，或用逗号新增标签"
              />
              {existingTags.length > 0 ? (
                <div className={styles.tagPicker} aria-label="已有标签">
                  {existingTags.map((tag) => {
                    const isSelected = editor.tags.includes(tag);

                    return (
                      <button
                        key={tag}
                        type="button"
                        className={isSelected ? styles.tagChipActive : styles.tagChip}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.fieldHint}>发布过文章后，这里会显示可点选的已有标签。</p>
              )}
            </div>

            <label className={styles.fieldBlockWide}>
              <span className={styles.fieldLabel}>摘要</span>
              <textarea
                className={styles.textAreaCompact}
                value={editor.summary}
                onChange={(event) => updateEditor('summary', event.target.value)}
                placeholder="博客卡片和搜索结果里展示的简介"
              />
            </label>

            <div className={styles.fieldBlockWide}>
              <div className={styles.fieldLabelRow}>
                <span className={styles.fieldLabel}>封面</span>
                <label
                  className={canWrite && !submitting ? styles.inlineButton : styles.inlineButtonDisabled}
                  title={canWrite ? '上传封面图片' : '请先填写 R2 环境变量'}
                >
                  <ImagePlus size={16} /> {canWrite ? '上传封面' : '先配置环境变量'}
                  <input type="file" accept="image/*" hidden onChange={handleCoverUpload} disabled={!canWrite || submitting} />
                </label>
              </div>

              <input
                className={styles.textInput}
                value={editor.cover}
                onChange={(event) => updateEditor('cover', event.target.value)}
                placeholder="上传后会自动填充对象路径"
              />

              {editor.cover ? (
                <div className={styles.coverPreviewCard}>
                  <img src={buildCoverPreviewUrl(editor.cover)} alt="cover preview" className={styles.coverPreviewImage} />
                  <div>
                    <strong>封面预览</strong>
                    <p>{editor.cover}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.editorStats}>
            <span><SquarePen size={15} /> {wordCount} 字</span>
            <span><BookText size={15} /> 阅读约 {readingMinutes} 分钟</span>
            <span><ListTodo size={15} /> 本地自动保存已开启</span>
          </div>

          <div className={styles.quickInsertRow}>
            <button type="button" className={styles.inlineButton} onClick={() => insertMarkdown('\n## 小节标题\n')}>
              <PencilLine size={15} /> H2
            </button>
            <button type="button" className={styles.inlineButton} onClick={() => insertMarkdown('\n> 引用内容\n')}>
              <PencilLine size={15} /> 引用
            </button>
            <button type="button" className={styles.inlineButton} onClick={() => insertMarkdown('\n```ts\nconsole.log(\'hello\')\n```\n')}>
              <PencilLine size={15} /> 代码块
            </button>
            <button type="button" className={styles.inlineButton} onClick={() => insertMarkdown('\n- 列表项\n')}>
              <PencilLine size={15} /> 列表
            </button>
            <button type="button" className={styles.inlineButton} onClick={() => insertMarkdown('\n[链接文字](https://example.com)\n')}>
              <PencilLine size={15} /> 链接
            </button>
            <button type="button" className={styles.inlineButton} onClick={() => insertMarkdown('\n![图片描述](https://example.com/image.png)\n')}>
              <PencilLine size={15} /> 图片
            </button>
            <label
              className={canWrite && !assetUploading ? styles.inlineButton : styles.inlineButtonDisabled}
              title={canWrite ? '上传图片、音频、视频或附件，并插入到正文' : '请先填写 R2 环境变量'}
            >
              {assetUploading ? <LoaderCircle className={styles.spinIcon} size={15} /> : <Paperclip size={15} />}
              {assetUploading ? '上传中' : '上传资源'}
              <input
                type="file"
                accept="image/*,audio/*,video/*,.pdf,.zip,.txt,.md"
                hidden
                onChange={handleAssetUpload}
                disabled={!canWrite || assetUploading}
              />
            </label>
          </div>

          <div className={styles.previewModeTabs}>
            {(['split', 'editor', 'preview'] as PreviewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={previewMode === mode ? styles.filterChipActive : styles.filterChip}
                onClick={() => setPreviewMode(mode)}
              >
                {mode === 'split' ? '分栏' : mode === 'editor' ? '仅编辑' : '仅预览'}
              </button>
            ))}
          </div>

          <div className={previewMode === 'split' ? styles.workspaceSplit : styles.workspaceSingle}>
            {previewMode !== 'preview' ? (
              <section className={styles.workspacePanel}>
                <div className={styles.panelHeader}>
                  <h3><SquarePen size={16} /> Markdown 编辑</h3>
                </div>

                {loadingDetail ? (
                  <div className={styles.loadingState}>
                    <LoaderCircle className={styles.spinIcon} size={18} /> 正在加载文章内容...
                  </div>
                ) : (
                  <textarea
                    ref={markdownRef}
                    className={styles.editorTextArea}
                    value={editor.markdown}
                    onChange={(event) => updateEditor('markdown', event.target.value)}
                    placeholder="从这里开始写正文，支持 GFM、代码高亮和内嵌 HTML。"
                  />
                )}
              </section>
            ) : null}

            {previewMode !== 'editor' ? (
              <section className={styles.workspacePanel}>
                <div className={styles.panelHeader}>
                  <h3><Eye size={16} /> 实时预览</h3>
                </div>

                <article className={styles.previewArticle}>
                  <header className={styles.previewHeader}>
                    <span className={styles.previewCategory}>{editor.category || '未分类'}</span>
                    <h2>{editor.title || '未命名文章'}</h2>
                    <p>
                      {editor.date || '未设置日期'} · 阅读约 {readingMinutes} 分钟
                    </p>
                  </header>

                  <div className={styles.previewMarkdown}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeHighlight]}
                      components={{
                        a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
                        img: ({ src, ...props }) => <img {...props} src={resolveAssetUrl(src)} alt={props.alt ?? ''} />,
                        audio: ({ src, ...props }) => <audio {...props} src={resolveAssetUrl(src)} controls />,
                        video: ({ src, ...props }) => <video {...props} src={resolveAssetUrl(src)} controls />,
                      }}
                    >
                      {editor.markdown || '### 预览区\n\n开始输入正文后，这里会实时显示渲染效果。'}
                    </ReactMarkdown>
                  </div>
                </article>
              </section>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
