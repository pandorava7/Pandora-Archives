
import React from 'react';
import BlogPageClient from './BlogPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "潘多拉 | 博客",
  description: "潘多拉个人档案馆网站内的博客，分享个人见解和知识"
};

const BlogPage: React.FC = () => {
  return <BlogPageClient></BlogPageClient>;
};

export default BlogPage;