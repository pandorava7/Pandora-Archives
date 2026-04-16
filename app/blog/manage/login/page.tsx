import { Suspense } from 'react';
import type { Metadata } from 'next';

import LoginPageClient from './LoginPageClient';

export const metadata: Metadata = {
  title: '潘多拉 | 后台登录',
  description: '博客编辑后台登录页。',
};

type BlogManageLoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default function BlogManageLoginPage({ searchParams }: BlogManageLoginPageProps) {
  return (
    <Suspense fallback={<LoginPageClient searchParams={Promise.resolve({})} />}>
      <LoginPageClient searchParams={searchParams} />
    </Suspense>
  );
}
