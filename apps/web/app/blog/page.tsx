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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            SoundBridge Blog
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Practical growth, networking, and monetization guides for audio creators.
          </p>
        </div>

        <div className="grid gap-6">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <span>{new Date(post.date).toLocaleDateString()}</span>
                <span>•</span>
                <span>{readingTime(post.content)} min read</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {post.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">{post.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/waitlist"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 text-white font-semibold hover:from-red-700 hover:to-pink-600 transition-colors"
          >
            Start your SoundBridge journey
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
