"use client"

import React, { useState, useEffect, useRef } from 'react';
import "@/i18n";
import { playHover, playClick } from "@/utils/sfx";
import { useTranslation } from "react-i18next";
import styles from './Navbar.module.css';

import Image from 'next/image';
import MoonIcon from "./icons/moon.svg";
import SunIcon from "./icons/sun.svg";
import MusicIcon from "./icons/music.svg";
import MenuIcon from "./icons/menu.svg";
import ThreeLineIcon from "./icons/three-line.svg";
import CNIcon from "./icons/cn.svg";
import USIcon from "./icons/us.svg";
import JPIcon from "./icons/jp.svg";
import LanguageIcon from "./icons/language-svgrepo-com.svg";
import { usePathname, useRouter } from 'next/navigation';

interface NavbarProps {
  user: {
    name: string;
    avatarUrl: string;
  };
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const pathname = usePathname();
  const hiddenRoutes = new Set(["/world", "/example"]);
  const shouldShowNavbar = !hiddenRoutes.has(pathname);

  const { i18n } = useTranslation();
  const [isDark, setIsDark] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLangOptions, setShowLangOptions] = useState(false);
  // 新增：侧边栏状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleNav = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    playClick();
    setIsSidebarOpen(false); // 点击导航后关闭侧边栏
    router.push(path);
  };

  // 点击外部关闭设置下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setShowLangOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLang = (lang: string) => {
    playClick();
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    setShowLangOptions(false);
  };

  const isActive = (lang: string) => i18n.language === lang;

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  // 导航链接数据，方便在 Desktop 和 Mobile 复用
  const navLinks = [
    { name: "首页", path: "/" },
    { name: "博客", path: "/blog" },
    { name: "世界", path: "/world" },
    { name: "友链", path: "/links" },
  ];

  // 如果不显示，直接返回 null
  if (!shouldShowNavbar) return null;

  return (
    <>
      <nav className={`${styles.navbar} ${isDark ? styles.darkNavbar : ''}`}>
        {/* 左侧：用户信息 */}
        <div className={styles.leftSection}>
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt="avatar" className={styles.avatar} />
          )}
          <span className={styles.userName}>{user.name}</span>
        </div>

        {/* 中间：CoolBeans 按钮 (仅在桌面端显示) */}
        <div className={styles.centerMenu}>
          {navLinks.map((link) => (
            <a 
              key={link.path}
              href={link.path} 
              className={styles.navLink} 
              onMouseEnter={playHover} 
              onClick={(e) => handleNav(e, link.path)}
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* 右侧：集成设置 */}
        <div className={styles.rightSection} ref={dropdownRef}>
          
          {/* 新增：移动端侧边栏触发按钮 (只在小屏显示) */}
          <button 
            className={styles.mobileHamburger}
            onClick={() => { playClick(); setIsSidebarOpen(true); }}
          >
            <Image src={ThreeLineIcon} alt="Mobile Menu" className='icon' />
          </button>

          <button
            className={styles.settingsTrigger}
            onClick={() => { playClick(); setIsDropdownOpen(!isDropdownOpen); }}
          >
            {/* 这里如果你想区分图标，可以用别的，暂时复用 MenuIcon */}
            <Image src={MenuIcon} alt="Settings" className='icon' />
          </button>

          {/* 设置下拉菜单 (保持不变) */}
          {isDropdownOpen && (
            <div className={`${styles.dropdown} ${isDark ? styles.darkDropdown : ''}`}>
              <div className={styles.dropItem} onClick={() => { playClick(); setIsDark(!isDark); }}>
                {isDark ? <Image src={SunIcon} alt="Sun" className='icon' /> : <Image src={MoonIcon} alt="Moon" className='icon' />}
                <span>{isDark ? '浅色模式' : '深色模式'}</span>
              </div>
              
              <div className={styles.langWrapper}>
                <div className={styles.dropItem} onClick={() => { playClick(); setShowLangOptions(!showLangOptions); }}>
                  <Image src={LanguageIcon} alt="Lang" className='icon' />
                  <span>切换语言</span>
                </div>
                {showLangOptions && (
                  <div className={styles.langOptionsGrid}>
                    <button className={`${styles.langSubItem} ${isActive('zh') ? styles.activeLang : ''}`} onClick={() => changeLang('zh')}>
                      <Image src={CNIcon} alt="CN" className='icon' />
                    </button>
                    <button className={`${styles.langSubItem} ${isActive('us') ? styles.activeLang : ''}`} onClick={() => changeLang('us')}>
                      <Image src={USIcon} alt="US" className='icon' />
                    </button>
                    <button className={`${styles.langSubItem} ${isActive('jp') ? styles.activeLang : ''}`} onClick={() => changeLang('jp')}>
                      <Image src={JPIcon} alt="JP" className='icon' />
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.dropItem} onClick={playClick}>
                <Image src={MusicIcon} alt="Music" className='icon' />
                <span>背景音乐</span>
              </div>

              <div className={styles.dropItem} onClick={(event) => handleNav(event, '/blog/manage')}>
                <span className={styles.menuGlyph}>✎</span>
                <span>管理博客</span>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* 新增：侧边栏遮罩 (Backdrop) */}
      <div 
        className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.overlayVisible : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* 新增：侧边栏容器 */}
      <div className={`${styles.sidebarDrawer} ${isSidebarOpen ? styles.drawerOpen : ''} ${isDark ? styles.darkDrawer : ''}`}>
         <div className={styles.sidebarHeader}>
            <h3>导航菜单</h3>
            <button className={styles.closeBtn} onClick={() => setIsSidebarOpen(false)}>×</button>
         </div>
         
         {/* 2列网格布局 */}
         <div className={styles.sidebarGrid}>
            {navLinks.map((link) => (
              <a 
                key={link.path}
                href={link.path} 
                className={styles.sidebarLink} // 使用新的样式类名
                onClick={(e) => handleNav(e, link.path)}
              >
                {link.name}
              </a>
            ))}
         </div>
      </div>
    </>
  );
};

export default Navbar;
