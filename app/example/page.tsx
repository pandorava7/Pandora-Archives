// 1. React 核心
import React from 'react';

// 2. Next.js 核心与内置组件
import { Metadata } from 'next';

// 3. 第三方库

// 4. 常量

// 5. 项目内资源文件

// 6. 样式和组件
import ExampleClient from './client';



export const metadata: Metadata = {
  title: "Example Title",
  description: "This is a Example Page Description"
};

const BlogPage: React.FC = () => {
  return <ExampleClient></ExampleClient>;
};

export default BlogPage;