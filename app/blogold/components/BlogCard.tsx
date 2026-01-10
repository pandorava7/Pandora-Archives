'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ASSET_BASE_URL } from '@/config/assets';
import styles from './BlogCard.module.css'; // 建议将对应的样式也提取出来
import { BlogPost } from '../../blog/useBlogData';

interface BlogCardProps {
  post: BlogPost;
  searchQuery: string;
}

const BlogCard: React.FC<BlogCardProps> = ({ post, searchQuery }) => {
  const router = useRouter();

  // --- 高亮文本逻辑 ---
  const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className={styles.highlightText}>{part}</span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // --- 智能摘要逻辑 ---
  const getSearchSnippet = (post: BlogPost, query: string) => {
    if (!query.trim()) return post.summary;

    const lowerQuery = query.toLowerCase();
    const lowerTitle = post.title.toLowerCase();
    const lowerSummary = post.summary.toLowerCase();
    const lowerContent = post.content_plain.toLowerCase();

    // 1. 标题或原摘要匹配
    if (lowerTitle.includes(lowerQuery) || lowerSummary.includes(lowerQuery)) {
      return <HighlightText text={post.summary} highlight={query} />;
    }

    // 2. 正文匹配截取
    const matchIndex = lowerContent.indexOf(lowerQuery);
    if (matchIndex !== -1) {
      const start = Math.max(0, matchIndex - 30);
      const end = Math.min(post.content_plain.length, matchIndex + query.length + 50);
      let snippet = post.content_plain.slice(start, end);
      if (start > 0) snippet = '...' + snippet;
      if (end < post.content_plain.length) snippet = snippet + '...';
      return <HighlightText text={snippet} highlight={query} />;
    }

    return post.summary;
  };

  const coverUrl = post.cover.startsWith('http') 
    ? post.cover 
    : `${ASSET_BASE_URL}/posts/${post.cover}`;

  return (
    <div 
      className={styles.blogCard}
      onClick={() => router.push(`/post/${post.id}`)}
    >
      <div className={styles.cardImageWrapper}>
        <img src={coverUrl} alt={post.title} />
        <span className={styles.postDate}>发布于 {post.date}</span>
        <h2 className={styles.postTitle}>
          <HighlightText text={post.title} highlight={searchQuery} />
        </h2>
      </div>
      <div className={styles.cardInfo}>
        <p className={styles.excerpt}>
          {getSearchSnippet(post, searchQuery)}
        </p>
        <div className={styles.cardTags}>
          {post.tags.map(tag => (
            <span key={tag}># {tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogCard;