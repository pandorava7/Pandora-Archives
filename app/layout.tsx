import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import Navbar from 'components/Navbar/Navbar';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pandorava7.com'),
  title: '潘多拉 | 档案馆',
  description: '潘多拉个人档案馆网站，用于收藏、记录和分享',
  openGraph: {
    title: '潘多拉 | 档案馆',
    description: '潘多拉个人档案馆网站，用于收藏、记录和分享',
    url: 'https://pandorava7.com',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/og-image.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Navbar user={{ name: 'Guest User', avatarUrl: '' }} />
        {children}
      </body>
    </html>
  );
}
