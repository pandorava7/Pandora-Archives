import { NextResponse } from 'next/server';

import { isEditorRequestAuthenticated } from './auth';

export async function requireEditorApiAuth(request: Request) {
  const isAuthenticated = await isEditorRequestAuthenticated(request);
  if (isAuthenticated) {
    return null;
  }

  return NextResponse.json({ message: '未登录。' }, { status: 401 });
}

export function createApiError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}
