'use client';

import { useState, useEffect, useMemo } from 'react';
// 假设你的 config 路径在 Next.js 项目结构中需要调整，请根据实际情况修改
import { ASSET_BASE_URL } from '@/config/assets'; 

// 定义接口
export interface BlogPost {
  id: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  cover: string;
  summary: string;
  content_plain: string; // 用于搜索
}

export const useBlogData = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4; // 每页显示数量

  // 1. 获取数据
  useEffect(() => {
    // 确保 ASSET_BASE_URL 在 Next.js 环境变量中正确配置
    fetch(`${ASSET_BASE_URL}/posts.json`)
      .then(res => res.json())
      .then(data => {
        // 按日期降序排列 (最新的在前)
        const sorted = data.sort((a: BlogPost, b: BlogPost) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setPosts(sorted);
        setLoading(false);
      })
      .catch(err => console.error("加载博客数据失败:", err));
  }, []);

  // 2. 核心筛选逻辑 (使用 useMemo 优化性能)
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // A. 搜索逻辑 (匹配标题 或 内容)
      const matchSearch = searchQuery === '' || 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content_plain.toLowerCase().includes(searchQuery.toLowerCase());

      // B. 分类逻辑 (单选)
      const matchCategory = selectedCategory === null || post.category === selectedCategory;

      // C. 标签逻辑 (多选，交集逻辑：必须包含所有选中的标签)
      // 如果想要并集逻辑(包含任意一个)，把 every 改为 some
      const matchTags = selectedTags.length === 0 || 
        selectedTags.every(tag => post.tags.includes(tag));

      return matchSearch && matchCategory && matchTags;
    });
  }, [posts, searchQuery, selectedCategory, selectedTags]);

  // 3. 分页逻辑
  // 计算总页数
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  // 核心：计算当前页显示的帖子
  const currentPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredPosts.slice(start, end);
  }, [filteredPosts, currentPage, pageSize]);

  // 4. 最近发布 (永远显示总列表中最新的2个，不受筛选影响)
  const recentPosts = posts.slice(0, 2);

  // 当筛选条件改变时，重置回第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedTags]);

  return {
    loading,
    currentPosts,    // 当前页显示的帖子
    recentPosts,     // 侧边栏最近帖子
    totalPages,
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedTags,
    setSelectedTags,
    allTags: Array.from(new Set(posts.flatMap(p => p.tags))), // 自动提取所有标签
    allCategories: Array.from(new Set(posts.flatMap(p => p.category)))
  };
};