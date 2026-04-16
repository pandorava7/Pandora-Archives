import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { isEditorRequestAuthenticated } from '@/blog-editor/auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/blog/manage/login' || pathname === '/api/admin/session') {
    return NextResponse.next();
  }

  if (!pathname.startsWith('/blog/manage') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  const isAuthenticated = await isEditorRequestAuthenticated(request);
  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ message: '未登录。' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/blog/manage/login';
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/blog/manage/:path*', '/api/admin/:path*'],
};
