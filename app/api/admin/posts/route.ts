import { NextResponse } from 'next/server';

import { saveBlogEditorDraft, listBlogEditorPosts } from '@/blog-editor/service';
import { createApiError, requireEditorApiAuth } from '@/blog-editor/http';
import type { BlogEditorSavePayload } from '@/blog-editor/types';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const unauthorizedResponse = await requireEditorApiAuth(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const response = await listBlogEditorPosts();
  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const unauthorizedResponse = await requireEditorApiAuth(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const payload = (await request.json()) as BlogEditorSavePayload;
    const response = await saveBlogEditorDraft(payload);
    return NextResponse.json(response);
  } catch (error) {
    return createApiError(error instanceof Error ? error.message : '保存草稿失败。');
  }
}
