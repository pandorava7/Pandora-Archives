import { NextResponse } from 'next/server';

import {
  applyAdminSessionCookie,
  clearAdminSessionCookie,
  createAdminSessionToken,
  isEditorRequestAuthenticated,
} from '@/blog-editor/auth';
import { getBlogEditorEnv } from '@/blog-editor/env';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const authenticated = await isEditorRequestAuthenticated(request);
  return NextResponse.json({ authenticated });
}

export async function POST(request: Request) {
  const { adminPassword } = getBlogEditorEnv();
  const body = (await request.json()) as { password?: string };

  if (!adminPassword) {
    return NextResponse.json({ message: '缺少 ADMIN_PASSWORD。' }, { status: 500 });
  }

  if (!body.password || body.password !== adminPassword) {
    return NextResponse.json({ message: '密码错误。' }, { status: 401 });
  }

  const token = await createAdminSessionToken();
  const response = NextResponse.json({ ok: true });
  applyAdminSessionCookie(response, token);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  return response;
}
