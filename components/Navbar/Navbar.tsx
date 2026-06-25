"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react';
import "@/i18n";
import { playHover, playClick } from "@/utils/sfx";
import { useTranslation } from "react-i18next";
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

import MoonIcon from "./icons/moon.svg";
import SunIcon from "./icons/sun.svg";
import MusicIcon from "./icons/music.svg";
import MenuIcon from "./icons/menu.svg";
import ThreeLineIcon from "./icons/three-line.svg";
import CNIcon from "./icons/cn.svg";
import USIcon from "./icons/us.svg";
import JPIcon from "./icons/jp.svg";
import LanguageIcon from "./icons/language-svgrepo-com.svg";

interface NavbarProps {
  user: {
    name: string;
    avatarUrl: string;
  };
}

type MusicTrack = {
  title: string;
  src: string;
};

const MUSIC_TRACK_KEY = 'pandora:selectedMusicTrack';
const MUSIC_AUTOPLAY_KEY = 'pandora:autoPlayMusic';
const BLOG_ENTER_EVENT = 'pandora:blog-enter';
const DEFAULT_TRACK = { title: 'Story Full', src: '/r2/media/story_full.ogg' };

const getInitialTrack = () => {
  if (typeof window === 'undefined') return DEFAULT_TRACK;

  const savedTrackSrc = localStorage.getItem(MUSIC_TRACK_KEY);
  return savedTrackSrc ? { title: 'Selected Music', src: savedTrackSrc } : DEFAULT_TRACK;
};

const navLinks = [
  { name: "首页", path: "/" },
  { name: "博客", path: "/blog" },
  { name: "世界", path: "/world" },
  { name: "友链", path: "/links" },
];

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { i18n } = useTranslation();
  const shouldShowNavbar = !new Set(["/world", "/example"]).has(pathname);

  const [isDark, setIsDark] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLangOptions, setShowLangOptions] = useState(false);
  const [showMusicOptions, setShowMusicOptions] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(getInitialTrack);
  const [autoPlayMusic, setAutoPlayMusic] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(MUSIC_AUTOPLAY_KEY) === 'true'
  );
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleNav = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    playClick();
    setIsSidebarOpen(false);
    router.push(path);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setShowLangOptions(false);
        setShowMusicOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  useEffect(() => {
    const savedTrackSrc = localStorage.getItem(MUSIC_TRACK_KEY);

    fetch('/api/music')
      .then((response) => response.json())
      .then((data: { tracks?: MusicTrack[] }) => {
        const nextTracks = data.tracks ?? [];
        const nextSelected =
          nextTracks.find((track) => track.src === savedTrackSrc) ??
          nextTracks[0] ??
          DEFAULT_TRACK;

        setTracks(nextTracks);
        setSelectedTrack(nextSelected);
      })
      .catch(() => {
        setTracks([DEFAULT_TRACK]);
        setSelectedTrack((current) => current ?? DEFAULT_TRACK);
      });
  }, []);

  const startTrack = useCallback(async (track = selectedTrack) => {
    if (!track || !audioRef.current) return false;

    audioRef.current.src = track.src;
    audioRef.current.loop = true;

    try {
      await audioRef.current.play();
      setIsMusicPlaying(true);
      return true;
    } catch {
      setIsMusicPlaying(false);
      return false;
    }
  }, [selectedTrack]);

  const pauseMusic = () => {
    audioRef.current?.pause();
    setIsMusicPlaying(false);
  };

  const selectTrack = (track: MusicTrack) => {
    playClick();
    setSelectedTrack(track);
    localStorage.setItem(MUSIC_TRACK_KEY, track.src);
    startTrack(track);
  };

  const toggleMusicPlayback = () => {
    playClick();
    if (isMusicPlaying) pauseMusic();
    else startTrack();
  };

  const toggleAutoPlayMusic = () => {
    playClick();
    setAutoPlayMusic((current) => {
      const next = !current;
      localStorage.setItem(MUSIC_AUTOPLAY_KEY, String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleBlogEnter = () => {
      if (autoPlayMusic) {
        startTrack();
      }
    };

    window.addEventListener(BLOG_ENTER_EVENT, handleBlogEnter);
    return () => window.removeEventListener(BLOG_ENTER_EVENT, handleBlogEnter);
  }, [autoPlayMusic, selectedTrack, startTrack]);

  const changeLang = (lang: string) => {
    playClick();
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    setShowLangOptions(false);
  };

  const isActive = (lang: string) => i18n.language === lang;

  if (!shouldShowNavbar) return null;

  return (
    <>
      <nav className={`${styles.navbar} ${isDark ? styles.darkNavbar : ''}`}>
        <audio
          ref={audioRef}
          src={selectedTrack?.src}
          onPause={() => setIsMusicPlaying(false)}
          onPlay={() => setIsMusicPlaying(true)}
        />

        <div className={styles.leftSection}>
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt="avatar" className={styles.avatar} />
          )}
          <span className={styles.userName}>{user.name}</span>
        </div>

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

        <div className={styles.rightSection} ref={dropdownRef}>
          <button
            type="button"
            className={styles.mobileHamburger}
            onClick={() => { playClick(); setIsSidebarOpen(true); }}
            aria-label="打开导航菜单"
          >
            <Image src={ThreeLineIcon} alt="" className='icon' />
          </button>

          <button
            type="button"
            className={styles.settingsTrigger}
            onClick={() => { playClick(); setIsDropdownOpen(!isDropdownOpen); }}
            aria-label="打开设置菜单"
          >
            <Image src={MenuIcon} alt="" className='icon' />
          </button>

          {isDropdownOpen && (
            <div className={`${styles.dropdown} ${isDark ? styles.darkDropdown : ''}`}>
              <div className={styles.dropItem} onClick={() => { playClick(); setIsDark(!isDark); }}>
                {isDark ? <Image src={SunIcon} alt="" className='icon' /> : <Image src={MoonIcon} alt="" className='icon' />}
                <span>{isDark ? '浅色模式' : '深色模式'}</span>
              </div>

              <div className={styles.langWrapper}>
                <div className={styles.dropItem} onClick={() => { playClick(); setShowLangOptions(!showLangOptions); }}>
                  <Image src={LanguageIcon} alt="" className='icon' />
                  <span>切换语言</span>
                </div>
                {showLangOptions && (
                  <div className={styles.langOptionsGrid}>
                    <button className={`${styles.langSubItem} ${isActive('zh') ? styles.activeLang : ''}`} onClick={() => changeLang('zh')} type="button">
                      <Image src={CNIcon} alt="CN" className='icon' />
                    </button>
                    <button className={`${styles.langSubItem} ${isActive('us') ? styles.activeLang : ''}`} onClick={() => changeLang('us')} type="button">
                      <Image src={USIcon} alt="US" className='icon' />
                    </button>
                    <button className={`${styles.langSubItem} ${isActive('jp') ? styles.activeLang : ''}`} onClick={() => changeLang('jp')} type="button">
                      <Image src={JPIcon} alt="JP" className='icon' />
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.musicWrapper}>
                <div className={styles.dropItem} onClick={() => { playClick(); setShowMusicOptions(!showMusicOptions); }}>
                  <Image src={MusicIcon} alt="" className='icon' />
                  <span>背景音乐</span>
                  <span className={styles.itemStatus}>{isMusicPlaying ? '播放中' : '选择'}</span>
                </div>
                {showMusicOptions && (
                  <div className={styles.musicPanel}>
                    <div className={styles.musicNow}>
                      <span>{selectedTrack?.title ?? '暂无音乐'}</span>
                      <button type="button" className={styles.playButton} onClick={toggleMusicPlayback}>
                        {isMusicPlaying ? '暂停' : '播放'}
                      </button>
                    </div>
                    <button type="button" className={styles.autoPlayRow} onClick={toggleAutoPlayMusic}>
                      <span>进入网站自动播放音乐</span>
                      <span className={`${styles.switch} ${autoPlayMusic ? styles.switchOn : ''}`}>
                        <span />
                      </span>
                    </button>
                    <div className={styles.trackList}>
                      {tracks.length > 0 ? tracks.map((track) => (
                        <button
                          type="button"
                          key={track.src}
                          className={`${styles.trackItem} ${selectedTrack?.src === track.src ? styles.trackActive : ''}`}
                          onClick={() => selectTrack(track)}
                        >
                          <span className={styles.trackMark} />
                          <span>{track.title}</span>
                        </button>
                      )) : (
                        <div className={styles.emptyMusic}>把 mp3 放到 public/r2/media/music 后会显示在这里</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.dropItem} onClick={(event) => handleNav(event, '/blog/manage')}>
                <span className={styles.menuGlyph}>✎</span>
                <span>管理博客</span>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div
        className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.overlayVisible : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className={`${styles.sidebarDrawer} ${isSidebarOpen ? styles.drawerOpen : ''} ${isDark ? styles.darkDrawer : ''}`}>
        <div className={styles.sidebarHeader}>
          <h3>导航菜单</h3>
          <button type="button" className={styles.closeBtn} onClick={() => setIsSidebarOpen(false)}>×</button>
        </div>

        <div className={styles.sidebarGrid}>
          {navLinks.map((link) => (
            <a
              key={link.path}
              href={link.path}
              className={styles.sidebarLink}
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
