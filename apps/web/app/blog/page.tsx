import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts, type BlogBlock } from '@/src/content/blog/posts';

export const metadata: Metadata = {
  title: 'SoundBridge Blog - Insights for Audio Creators',
  description:
    'Actionable guides for musicians, podcasters, and producers: networking, event promotion, monetization, and creator tools.',
  openGraph: {
    title: 'SoundBridge Blog - Insights for Audio Creators',
    description:
      'Actionable guides for musicians, podcasters, and producers: networking, event promotion, monetization, and creator tools.',
    url: 'https://soundbridge.live/blog',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoundBridge Blog',
    description: 'Professional networking and growth tips for audio creators.'
  },
  alternates: {
    canonical: '/blog'
  }
};

const countWords = (blocks: BlogBlock[]) =>
  blocks.reduce((count, block) => {
    if (block.type === 'p' || block.type === 'h2' || block.type === 'h3') {
      return count + block.text.split(/\s+/).filter(Boolean).length;
    }
    if (block.type === 'ul') {
      return count + block.items.join(' ').split(/\s+/).filter(Boolean).length;
    }
    if (block.type === 'table') {
      return count + block.headers.join(' ').split(/\s+/).filter(Boolean).length +
        block.rows.flat().join(' ').split(/\s+/).filter(Boolean).length;
    }
    return count;
  }, 0);

const readingTime = (blocks: BlogBlock[]) => Math.max(3, Math.ceil(countWords(blocks) / 200));

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 rounded-3xl bg-white/70 dark:bg-white/5 backdrop-blur px-6 py-10 text-center shadow-sm">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            SoundBridge Blog
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Practical growth, networking, and monetization guides for audio creators.
          </p>
        </div>

        <div className="grid gap-6">
          {[...blogPosts]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur p-6 shadow-sm hover:shadow-lg transition"
            >
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-300 mb-2">
                <span>{new Date(post.date).toLocaleDateString()}</span>
                <span>•</span>
                <span>{readingTime(post.content)} min read</span>
                <span>•</span>
                <span className="text-gray-600 dark:text-gray-300">{post.author}</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {post.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">{post.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Start your SoundBridge journey
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Join the waitlist to connect professionally, promote events for free, and keep 90% of your revenue.
          </p>
          <Link
            href="/waitlist"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 text-white font-semibold hover:from-red-700 hover:to-pink-600 transition-colors"
          >
            Join Waitlist
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/about" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            About SoundBridge
          </Link>
          <Link
            href="/how-it-works"
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            How it works
          </Link>
        </div>
      </main>
    </div>
  );
}
