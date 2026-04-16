import { NextResponse } from 'next/server';

import { unpublishBlogEditorPost } from '@/blog-editor/service';
import { createApiError, requireEditorApiAuth } from '@/blog-editor/http';

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
    const response = await unpublishBlogEditorPost(decodeURIComponent(id));
    return NextResponse.json(response);
  } catch (error) {
    return createApiError(error instanceof Error ? error.message : '撤回发布失败。');
  }
}
