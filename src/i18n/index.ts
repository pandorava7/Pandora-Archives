// src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import zh from "./zh.json";
import en from "./en.json";
import jp from "./jp.json";

const resources = {
  zh: { translation: zh },
  en: { translation: en },
  jp: { translation: jp }
};

// 先初始化，不依赖浏览器 API
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // 默认语言，服务端安全
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

// 客户端修改语言
export const initLanguage = () => {
  if (typeof window === "undefined") return; // 只在浏览器执行

  const getBrowserLang = () => {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("jp")) return "jp";
    return "en";
  };

  const lang = localStorage.getItem("lang") || getBrowserLang();
  i18n.changeLanguage(lang);
};
