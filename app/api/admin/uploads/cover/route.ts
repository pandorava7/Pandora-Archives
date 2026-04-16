import { NextResponse } from 'next/server';

import { uploadBlogCover } from '@/blog-editor/service';
import { createApiError, requireEditorApiAuth } from '@/blog-editor/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const unauthorizedResponse = await requireEditorApiAuth(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const slug = String(formData.get('slug') ?? '');
    const date = String(formData.get('date') ?? '');

    if (!(file instanceof File)) {
      return createApiError('缺少封面文件。');
    }

    const uploaded = await uploadBlogCover(
      file.name,
      file.type || 'application/octet-stream',
      new Uint8Array(await file.arrayBuffer()),
      slug,
      date,
    );

    return NextResponse.json(uploaded);
  } catch (error) {
    return createApiError(error instanceof Error ? error.message : '上传封面失败。');
  }
}
