
import React from 'react';
import BlogPageClient from './BlogPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "潘多拉 | 博客",
  description: "潘多拉个人档案馆网站内的博客，分享个人见解和知识",
  openGraph: {
    title: "潘多拉 | 博客 openGraph测试",
    description: "openGraph测试的描述",
    url: "https://pandorava7.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
}

const BlogPage: React.FC = () => {
  return <BlogPageClient></BlogPageClient>;
};

export default BlogPage;