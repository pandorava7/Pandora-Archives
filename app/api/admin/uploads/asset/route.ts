import { NextResponse } from 'next/server';

import { createApiError, requireEditorApiAuth } from '@/blog-editor/http';
import { createBlogResourceUploadTarget, uploadBlogResource } from '@/blog-editor/service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const unauthorizedResponse = await requireEditorApiAuth(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const requestContentType = request.headers.get('content-type') ?? '';

    if (requestContentType.includes('application/json')) {
      const payload = (await request.json()) as {
        fileName?: string;
        contentType?: string;
        slug?: string;
        date?: string;
      };
      const fileName = payload.fileName?.trim();

      if (!fileName) {
        return createApiError('缺少资源文件名。');
      }

      const uploadTarget = createBlogResourceUploadTarget(
        fileName,
        payload.contentType || 'application/octet-stream',
        payload.slug ?? '',
        payload.date ?? '',
      );

      return NextResponse.json(uploadTarget);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const slug = String(formData.get('slug') ?? '');
    const date = String(formData.get('date') ?? '');

    if (!(file instanceof File)) {
      return createApiError('缺少资源文件。');
    }

    const uploaded = await uploadBlogResource(
      file.name,
      file.type || 'application/octet-stream',
      new Uint8Array(await file.arrayBuffer()),
      slug,
      date,
    );

    return NextResponse.json(uploaded);
  } catch (error) {
    return createApiError(error instanceof Error ? error.message : '上传资源失败。');
  }
}
