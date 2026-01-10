// utils/sfx.ts
let hoverAudio: HTMLAudioElement;
let clickAudio: HTMLAudioElement;

export const playHover = () => {
  if (typeof window === "undefined") return; // 仅浏览器
  if (!hoverAudio) {
    hoverAudio = new Audio("/sfx/hover.mp3");
    hoverAudio.volume = 0.4;
  }
  hoverAudio.currentTime = 0;
  hoverAudio.play().catch(() => {});
};

export const playClick = () => {
  if (typeof window === "undefined") return; // 仅浏览器
  if (!clickAudio) {
    clickAudio = new Audio("/sfx/click.mp3");
    clickAudio.volume = 0.6;
  }
  clickAudio.currentTime = 0;
  clickAudio.play().catch(() => {});
};
