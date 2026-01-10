"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react';
// CSS Modules 在 Next.js 中开箱即用，路径根据你的实际位置调整
import styles from './BlogPage.module.css';
import { Folder, Clock, Hash, X, Coffee, BookOpen, Tag } from 'lucide-react';
import { ASSET_BASE_URL } from '@/config/assets'; // 注意路径别名通常是 @
import { useBlogData, BlogPost } from './useBlogData'; // 引用上面的 Hook
import { useRouter } from 'next/navigation'; // [修改] 替换 react-router-dom

// [修改] Next.js 导入 SVG 通常不需要 ?react 后缀，但需要在 next.config.js 配置 SVGR
// 如果你没有配置 SVGR，请看代码底部的“注意事项”
import Image from 'next/image';
import BilibiliIcon from './icons/bilibili.svg';
import XIcon from './icons/x.svg';
import BlogCard from './components/BlogCard';

const BlogPageClient: React.FC = () => {

    const router = useRouter();

    const {
        loading,
        currentPosts,
        recentPosts,
        totalPages,
        currentPage,
        setCurrentPage,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedTags,
        setSelectedTags,
        allTags,
        allCategories
    } = useBlogData();

    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭下拉
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCategoryOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const CATEGORY_ICONS: Record<string, React.ReactNode> = {
        '游戏人生': <Folder size={16} />,
        '技术分享': <Clock size={16} />,
        '见解看法': <Hash size={16} />,
        '生活记录': <Coffee size={16} />,
        '开发日志': <BookOpen size={16} />,
    };

    const FALLBACK_ICON = <Tag size={16} />;

    const displayCategories = useMemo(() => {
        return allCategories.map(catName => ({
            name: catName,
            icon: CATEGORY_ICONS[catName] || FALLBACK_ICON
        }));
    }, [allCategories]);

    // if (loading) return <div className={styles.loading}>加载中...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerBgImage} />
                <div className={styles.headerOverlay}></div>
                <div className={styles.headerContent}>
                    <h1 className='brand-gradient-text'>个人博客</h1>
                    <p>记录与分享我的见解</p>
                </div>
            </header>

            <div className={styles.mainContentContainer}>
                <main className={styles.mainContent}>
                    {/* 功能区 */}
                    <section className={styles.functionArea}>
                        <div className={styles.functionTop}>
                            <div className={styles.searchWrapper}>
                                <input
                                    type="text"
                                    placeholder="搜索标题或内容..."
                                    className={styles.searchInput}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className={styles.dropdownWrapper} ref={dropdownRef}>
                                <button
                                    className={`${styles.categoryBtn} ${isCategoryOpen ? styles.btnActive : ''}`}
                                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                >
                                    {selectedCategory ? selectedCategory : '全部分类'}
                                </button>

                                <div className={`${styles.dropdownMenu} ${isCategoryOpen ? styles.show : ''}`}>
                                    <div
                                        className={styles.dropdownItem}
                                        onClick={() => { setSelectedCategory(null); setIsCategoryOpen(false); }}
                                    >
                                        <span>📂</span> 全部
                                    </div>
                                    {displayCategories.map((cat, index) => (
                                        <div
                                            key={index}
                                            className={styles.dropdownItem}
                                            onClick={() => { setSelectedCategory(cat.name); setIsCategoryOpen(false); }}
                                        >
                                            <span className={styles.icon}>{cat.icon}</span>
                                            {cat.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 标签列表 */}
                        <div className={styles.tagList}>
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    className={`${styles.tagItem} ${selectedTags.includes(tag) ? styles.tagActive : ''}`}
                                    onClick={() => toggleTag(tag)}
                                >
                                    {tag}
                                </button>
                            ))}
                            {selectedTags.length > 0 && (
                                <button className={styles.clearTags} onClick={() => setSelectedTags([])}>
                                    <X size={14} /> 清除
                                </button>
                            )}
                        </div>
                    </section>

                    <div className={styles.contentGrid}>
                        {/* 左侧列表 */}
                        <div className={styles.leftColumn}>
                            {(selectedCategory || searchQuery || selectedTags.length > 0) && (
                                <div className={styles.statusText}>
                                    正在显示:
                                    {selectedCategory && <span> [{selectedCategory}] </span>}
                                    {searchQuery && <span> 包含"{searchQuery}" </span>}
                                    {selectedTags.length > 0 && <span> 标签: {selectedTags.join('+')} </span>}
                                    <span className={styles.resultCount}> (共 {currentPosts.length} 篇)</span>
                                </div>
                            )}

                            <div className={styles.blogCardGrid}>
                                {currentPosts.length > 0 ? (
                                    currentPosts.map(post => (
                                        <BlogCard
                                            key={post.id}
                                            post={post}
                                            searchQuery={searchQuery}
                                        />
                                    ))
                                ) : (
                                    <div className={styles.noData}>没有找到相关文章...</div>
                                )}
                            </div>
                        </div>

                        {/* 右侧：最近发布 */}
                        <aside className={styles.rightColumn}>
                            <div className={styles.recentPanel}>
                                <h3 className='text-shadow-sm'>最近发布</h3>
                                {recentPosts.map(post => (
                                    <div key={post.id} className={styles.recentItem}
                                        // [修改] 使用 router.push
                                        onClick={() => router.push(`/post/${post.id}`)}>
                                        <img
                                            src={post.cover.startsWith('http') ? post.cover : `${ASSET_BASE_URL}/posts/${post.cover}`}
                                            alt="thumb"
                                        />
                                        <div className={styles.recentText}>
                                            <span className={styles.recentDate}>{post.date}</span>
                                            <p>{post.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <h2 className='text-shadow-sm'>社交媒体</h2>
                            {/* 社交媒体面板 */}
                            <div className={styles.socialPanel}>

                                {/* B站链接 */}
                                <a href="https://space.bilibili.com/1754165806" target="_blank" rel="noreferrer" className={`${styles.socialItem} ${styles.bilibili}`}>
                                    <div className={styles.avatarWrapper}>
                                        <img src={`${ASSET_BASE_URL}/media/avatar/columbina.avif`} alt="Bilibili Avatar" className={styles.userAvatar} />
                                        <div className={styles.platformIcon}>
                                            <Image src={BilibiliIcon} alt="Bilibili" width={16} height={16} />
                                        </div>
                                    </div>
                                    <div className={styles.socialInfo}>
                                        <span className={styles.platformName}>Bilibili</span>
                                        <p className={styles.socialStatus}>点击关注动态</p>
                                    </div>
                                </a>

                                {/* X 链接 */}
                                <a href="https://x.com/sylunae" target="_blank" rel="noreferrer" className={`${styles.socialItem} ${styles.xPlatform}`}>
                                    <div className={styles.avatarWrapper}>
                                        <img src={`${ASSET_BASE_URL}/media/avatar/pandora.avif`} alt="X Avatar" className={styles.userAvatar} />
                                        <div className={styles.platformIcon}>
                                            <Image src={XIcon} alt="X" width={16} height={16} />
                                        </div>
                                    </div>
                                    <div className={styles.socialInfo}>
                                        <span className={styles.platformName}>X (Twitter)</span>
                                        <p className={styles.socialStatus}>关注最新推文</p>
                                    </div>
                                </a>
                            </div>
                        </aside>
                    </div>
                </main>
            </div>
        </div>

    );
};

export default BlogPageClient;