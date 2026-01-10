// app/sitemap.ts
import { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://pandorava7.com'

  // 1. 获取 posts.json 的绝对路径
  // process.cwd() 返回项目根目录
  const filePath = path.join(process.cwd(), 'public', 'r2', 'posts.json')
  
  let dynamicEntries: MetadataRoute.Sitemap = []

  try {
    // 2. 读取并解析 JSON 文件
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const posts = JSON.parse(fileContent)
    console.log('读取到的 posts:', posts) // 这会在你的终端（终端终端，不是浏览器）里显示
    
    // 3. 遍历对象生成 /blog/{id} 路径
    // 假设你的 JSON 格式是 [{ "id": "post-1" }, { "id": "post-2" }]
    dynamicEntries = posts.map((post: { id: string }) => ({
      url: `${baseUrl}/blog/${post.id}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  } catch (error) {
    console.error('读取 posts.json 失败:', error)
  }

  // 4. 合并静态路径和动态路径
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