import { NextResponse } from 'next/server';

import { deleteBlogEditorPost, getBlogEditorPost } from '@/blog-editor/service';
import { createApiError, requireEditorApiAuth } from '@/blog-editor/http';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorizedResponse = await requireEditorApiAuth(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { id } = await context.params;
    const response = await getBlogEditorPost(decodeURIComponent(id));
    return NextResponse.json(response);
  } catch (error) {
    return createApiError(error instanceof Error ? error.message : '加载文章失败。', 404);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorizedResponse = await requireEditorApiAuth(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { id } = await context.params;
    await deleteBlogEditorPost(decodeURIComponent(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createApiError(error instanceof Error ? error.message : '删除文章失败。');
  }
}
