"use client"

// 1. React 核心
import React, { useState, useEffect, useRef, useMemo } from 'react';

// 2. Next.js 核心与内置组件
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 3. 第三方库
import { Folder, Clock, Hash, X, Coffee, BookOpen, Tag } from 'lucide-react';

// 4. 常量
import { ASSET_BASE_URL } from '@/config/assets';

// 5. 项目内资源文件
import BilibiliIcon from './icons/bilibili.svg';
import XIcon from './icons/x.svg';
import GithubIcon from './icons/github.svg';

// 6. 样式和组件
import styles from './BlogPage.module.css';
import { useBlogData } from './useBlogData';
import BlogCard from './components/BlogCard';
import waveStyles from '@/assets/css/Waves.module.css'



const BlogPage: React.FC = () => {

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
                    <h1 className={`brand-gradient-text`}>个人博客</h1>
                    <p className={styles.typingText}>记录与分享我的见解</p>
                </div>
            </header>

            <div className={styles.mainContentContainer}>
                <div className={styles.waveWrapper}>
                    <svg
                        className={waveStyles.waves}
                        xmlns="http://www.w3.org/2000/svg"
                        xmlnsXlink="http://www.w3.org/1999/xlink"
                        viewBox="0 24 150 28"
                        preserveAspectRatio="none"
                        shapeRendering="auto"
                    >
                        <defs>
                            <path
                                id="gentle-wave"
                                d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
                            />
                        </defs>
                        <g className={waveStyles.parallax}>
                            <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(165 199 255 / 0.7)" />
                            <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(165 199 255 / 0.5)" />
                            <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(165 199 255 / 0.3)" />
                            <use xlinkHref="#gentle-wave" x="48" y="7" fill="rgba(165 199 255)" />
                        </g>
                    </svg>
                </div>
                <div className={styles.mainContentWrapper}>
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

                                {/* 分页按钮 */}
                                {totalPages > 1 && (
                                    <nav className={styles.pagination}>
                                        <button
                                            className={styles.pageArrow}
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        >
                                            上一页
                                        </button>
                                        <div className={styles.pageNumbers}>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                                <span
                                                    key={pageNum}
                                                    className={`${styles.pageNum} ${currentPage === pageNum ? styles.activePage : ''}`}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </span>
                                            ))}
                                        </div>
                                        <button
                                            className={styles.pageArrow}
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        >
                                            下一页
                                        </button>
                                    </nav>
                                )}
                            </div>

                            {/* 右侧：最近发布 */}
                            <div className={styles.rightColumn}>
                                <aside>
                                    <div className={styles.recentPanel}>
                                        <h3>最近发布</h3>
                                        {recentPosts.map(post => (
                                            <Link key={post.id} href={`/blog/${post.id}`} className={styles.recentItem}>
                                                <img
                                                    src={post.cover.startsWith('http') ? post.cover : `${ASSET_BASE_URL}/posts/${post.cover}`}
                                                    alt="thumb"
                                                />
                                                <div className={styles.recentText}>
                                                    <span className={styles.recentDate}>{post.date}</span>
                                                    <p>{post.title}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                    <div className={styles.socialPanelWrapper}>
                                        <h2>社交媒体</h2>
                                        {/* 社交媒体面板 */}
                                        <div className={styles.socialPanel}>

                                            {/* B站链接 */}
                                            <Link href="https://space.bilibili.com/1754165806" target="_blank" rel="noreferrer" className={`${styles.socialItem} ${styles.bilibili}`}>
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
                                            </Link>

                                            {/* X 链接 */}
                                            <Link href="https://x.com/sylunae" target="_blank" rel="noreferrer" className={`${styles.socialItem} ${styles.xPlatform}`}>
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
                                            </Link>

                                            {/* B站链接 */}
                                            <Link href="https://github.com/pandorava7/" target="_blank" rel="noreferrer" className={`${styles.socialItem} ${styles.github}`}>
                                                <div className={styles.avatarWrapper}>
                                                    <img src={`${ASSET_BASE_URL}/media/avatar/pandora.avif`} alt="Github Avatar" className={styles.userAvatar} />
                                                    <div className={styles.platformIcon}>
                                                        <Image src={GithubIcon} alt="Github" width={16} height={16} />
                                                    </div>
                                                </div>
                                                <div className={styles.socialInfo}>
                                                    <span className={styles.platformName}>Github</span>
                                                    <p className={styles.socialStatus}>我的Github主页</p>
                                                </div>
                                            </Link>
                                        </div>
                                    </div>

                                </aside>
                            </div>
                        </div>
                    </main>
                </div>

            </div>
        </div >

    );
};

export default BlogPage;