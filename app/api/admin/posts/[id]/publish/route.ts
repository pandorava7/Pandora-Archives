import { NextResponse } from 'next/server';

import { publishBlogEditorDraft } from '@/blog-editor/service';
import { createApiError, requireEditorApiAuth } from '@/blog-editor/http';
import type { BlogEditorSavePayload } from '@/blog-editor/types';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorizedResponse = await requireEditorApiAuth(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as BlogEditorSavePayload;
    payload.previousId = payload.previousId ?? decodeURIComponent(id);

    const response = await publishBlogEditorDraft(payload);
    return NextResponse.json(response);
  } catch (error) {
    return createApiError(error instanceof Error ? error.message : '发布文章失败。');
  }
}
