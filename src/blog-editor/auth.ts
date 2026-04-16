import type { NextRequest, NextResponse } from 'next/server';

import {
  BLOG_EDITOR_SESSION_COOKIE,
  BLOG_EDITOR_SESSION_TTL_SECONDS,
} from './constants';
import { getBlogEditorEnv } from './env';

const encoder = new TextEncoder();

function hexEncode(input: ArrayBuffer) {
  return Array.from(new Uint8Array(input))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function signSessionValue(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return hexEncode(signature);
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(/;\s*/g);
  for (const part of parts) {
    const [cookieName, ...rest] = part.split('=');
    if (cookieName === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
}

export async function createAdminSessionToken() {
  const { sessionSecret } = getBlogEditorEnv();

  if (!sessionSecret) {
    throw new Error('缺少 BLOG_EDITOR_SESSION_SECRET 或 ADMIN_PASSWORD。');
  }

  const expiresAt = String(Math.floor(Date.now() / 1000) + BLOG_EDITOR_SESSION_TTL_SECONDS);
  const signature = await signSessionValue(expiresAt, sessionSecret);
  return `${expiresAt}.${signature}`;
}

export async function verifyAdminSessionToken(token: string | null | undefined) {
  const { sessionSecret } = getBlogEditorEnv();

  if (!token || !sessionSecret) {
    return false;
  }

  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature) {
    return false;
  }

  const expiresAtNumber = Number(expiresAt);
  if (!Number.isFinite(expiresAtNumber) || expiresAtNumber < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = await signSessionValue(expiresAt, sessionSecret);
  return expectedSignature === signature;
}

export async function isEditorRequestAuthenticated(request: Request | NextRequest) {
  const token = getCookieValue(request.headers.get('cookie'), BLOG_EDITOR_SESSION_COOKIE);
  return verifyAdminSessionToken(token);
}

export function applyAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(BLOG_EDITOR_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: BLOG_EDITOR_SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(BLOG_EDITOR_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
