// app/blog/[slug]/page.tsx
import PostDetailClient from './PostDetailClient';
import { Metadata } from 'next';

// metadata 可以直接写
export const metadata: Metadata = {
    title: '文章详情',
    description: '查看单篇博客文章',
};

// Server Component 必须加 async
const PostDetailPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const blogTitle = (await params).slug;
    console.log('slug:', blogTitle); // 终端可见
    return <PostDetailClient postId={blogTitle} />;
};

export default PostDetailPage;
