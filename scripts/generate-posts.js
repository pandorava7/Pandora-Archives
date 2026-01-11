#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import strip from 'strip-markdown';

// 配置路径
const postsDirectory = path.join(process.cwd(), 'public/r2/posts');
const outputFile = path.join(process.cwd(), 'public/r2/posts.json'); 

async function generatePosts() {
  // 检查目标目录是否存在，不存在则创建
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const folders = fs.readdirSync(postsDirectory);
  let allPosts = [];

  for (const yearFolder of folders) {
    const fullPath = path.join(postsDirectory, yearFolder);
    if (!fs.statSync(fullPath).isDirectory()) continue;

    const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(fullPath, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');

      const { data, content } = matter(fileContents);

      const processedContent = await remark()
        .use(strip)
        .process(content);
      
      const plainText = processedContent.toString()
        .replace(/\r?\n|\r/g, ' ') 
        .replace(/\s+/g, ' ')      
        .trim();

      allPosts.push({
        id: data.id || file.replace('.md', ''),
        title: data.title || '无标题',
        date: data.date || '',
        category: data.category || '未分类',
        tags: data.tags || [],
        cover: `${yearFolder}/${data.cover}`,
        summary: data.summary || '',
        link: `${yearFolder}/${file}`,
        content_plain: plainText
      });
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(allPosts, null, 2));
  console.log('✅ Posts JSON 自动生成成功！');
}

// ESM 环境下可以直接运行
// generatePosts().catch(err => {
//   console.error('❌ 生成失败:', err);
//   process.exit(1);
// });