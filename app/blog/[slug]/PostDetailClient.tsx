'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { ChevronLeft, Home } from 'lucide-react';
import styles from './PostDetail.module.css';
import 'highlight.js/styles/atom-one-dark.css';
import { ASSET_BASE_URL } from '@/config/assets';
import Link from 'next/link';
import matter from 'gray-matter';
import type { PublishedBlogPost } from '@/blog-editor/types';

interface PostDetailClientProps {
  postId: string;
}

function resolveAssetUrl(value: unknown) {
  const source = typeof value === 'string' ? value.trim() : '';
  if (!source) {
    return '';
  }

  if (/^(https?:|data:|blob:|#)/i.test(source) || source.startsWith('/')) {
    return source;
  }

  const normalizedPath = source.replace(/^\/+/, '');
  return ASSET_BASE_URL ? `${ASSET_BASE_URL.replace(/\/$/, '')}/${normalizedPath}` : `/${normalizedPath}`;
}

function buildPostAssetUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return resolveAssetUrl(value.startsWith('posts/') ? value : `posts/${value}`);
}

const PostDetailClient: React.FC<PostDetailClientProps> = ({ postId }) => {
  const [content, setContent] = useState('');
  const [metadata, setMetadata] = useState<PublishedBlogPost | null>(null);
  const [readingTime, setReadingTime] = useState(0);

  useEffect(() => {
  const decodedPostId = decodeURIComponent(postId); // <- 关键
  fetch(`${ASSET_BASE_URL}/posts.json`)
    .then(res => res.json())
    .then((data: PublishedBlogPost[]) => {
      const post = data.find((p) => p.id === decodedPostId);
      if (!post) {
        console.error('找不到对应文章:', decodedPostId);
        return;
      }
      setMetadata(post);
      return fetch(`${ASSET_BASE_URL}/posts/${post.link}`);
    })
    .then(res => res?.text())
    .then(text => {
      if (text) {
        const { content: pureContent } = matter(text);
        setContent(pureContent);
        setReadingTime(Math.ceil(pureContent.length / 400));
      }
    });
}, [postId]);


  if (!metadata) return <div className={styles.loading}>加载中...</div>;

  return (
    <div className={styles.container}>
      {/* Hero 背景 */}
      <div className={styles.heroSection}>
        <img
          src={buildPostAssetUrl(metadata.cover)}
          className={styles.heroBg}
          alt=""
        />
        <div className={styles.heroOverlay}></div>
        <nav className={styles.navBar}>
          <Link href="/blog" className={styles.backBtn}>
            <ChevronLeft /> 返回博客
          </Link>
          <Link href="/" className={styles.backBtn}>
            <Home /> 返回首页
          </Link>
        </nav>
      </div>

      {/* 主要内容卡片 */}
      <div className={styles.mainLayout}>
        <article className={styles.articleCard}>
          {/* 标题区 */}
          <header className={styles.articleHeader}>
            <h1 className={styles.title}>{metadata.title}</h1>
            <div className={styles.metaRow}>
              <span className={styles.categoryTag}>{metadata.category}</span>
              <span>{metadata.date}</span>
              <span>· 阅读约 {readingTime} 分钟</span>
            </div>
          </header>

          {/* Markdown 正文 */}
          <div className={styles.markdownContent}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeHighlight]}
              components={{
                a: (props) => (
                  <a {...props} href={resolveAssetUrl(props.href)} target="_blank" rel="noopener noreferrer" />
                ),
                img: ({ src, ...props }) => <img {...props} src={resolveAssetUrl(src)} alt={props.alt ?? ''} />,
                audio: ({ src, ...props }) => <audio {...props} src={resolveAssetUrl(src)} controls />,
                video: ({ src, ...props }) => <video {...props} src={resolveAssetUrl(src)} controls />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </div>
  );
};

export default PostDetailClient;
