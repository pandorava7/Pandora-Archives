
import React from 'react';
import BlogPageClient from './client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "我自己的页面标题",
  description: "我自己的页面描述"
};

const BlogPage: React.FC = () => {
  return <BlogPageClient></BlogPageClient>;
};

export default BlogPage;