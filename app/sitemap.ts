import { MetadataRoute } from 'next'

import { listBlogEditorPosts } from '@/blog-editor/service'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.pandorava7.com'

  let dynamicEntries: MetadataRoute.Sitemap = []

  try {
    const { items } = await listBlogEditorPosts()
    dynamicEntries = items
      .filter((post) => post.hasPublished)
      .map((post) => ({
      url: `${baseUrl}/blog/${post.id}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      }))
  } catch (error) {
    console.error('读取 posts.json 失败:', error)
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...dynamicEntries,
  ]
}