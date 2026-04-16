import type { Metadata } from 'next';

import ManagePageClient from './ManagePageClient';

export const metadata: Metadata = {
  title: '潘多拉 | 博客管理',
  description: '用于撰写、预览、发布和管理博客文章的后台。',
};

export default function BlogManagePage() {
  return <ManagePageClient />;
}
