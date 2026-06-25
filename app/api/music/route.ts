import { NextResponse } from 'next/server';
import { existsSync, readdirSync } from 'fs';
import path from 'path';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.ogg', '.wav', '.m4a']);

const toPublicUrl = (relativePath: string) =>
  `/${relativePath.split(path.sep).map(encodeURIComponent).join('/')}`;

const toTrackTitle = (filename: string) =>
  path
    .basename(filename, path.extname(filename))
    .replace(/[-_]+/g, ' ')
    .trim();

export async function GET() {
  const publicDir = path.join(process.cwd(), 'public');
  const musicDir = path.join(publicDir, 'r2', 'media', 'music');
  const tracks = [];

  if (existsSync(musicDir)) {
    for (const filename of readdirSync(musicDir)) {
      const ext = path.extname(filename).toLowerCase();

      if (!AUDIO_EXTENSIONS.has(ext)) continue;

      tracks.push({
        title: toTrackTitle(filename),
        src: toPublicUrl(path.join('r2', 'media', 'music', filename)),
      });
    }
  }

  const fallbackTrack = path.join(publicDir, 'r2', 'media', 'story_full.ogg');
  if (existsSync(fallbackTrack)) {
    tracks.unshift({
      title: 'Story Full',
      src: '/r2/media/story_full.ogg',
    });
  }

  return NextResponse.json({
    tracks: tracks.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN')),
  });
}
