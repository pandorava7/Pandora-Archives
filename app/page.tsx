"use client"

import Image from "next/image";


export default function Home() {

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">

      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            由于项目迁移，目前只完成了博客页面，你可以点击右上角的三条线菜单跳转到博客
          </p>
        </div>
      </main>
    </div>
  );
}
