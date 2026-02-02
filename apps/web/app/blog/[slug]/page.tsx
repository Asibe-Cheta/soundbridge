import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { blogPosts, getBlogPost, type BlogBlock } from '@/src/content/blog/posts';

const renderBlock = (block: BlogBlock, index: number) => {
  switch (block.type) {
    case 'h2':
      return (
        <h2 key={index} className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">
          {block.text}
        </h2>
      );
    case 'h3':
      return (
        <h3 key={index} className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-2">
          {block.text}
        </h3>
      );
    case 'ul':
      return (
        <ul key={index} className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-200">
          {block.items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <div
          key={index}
          className="overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 backdrop-blur"
        >
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100/80 dark:bg-slate-800/80">
              <tr>
                {block.headers.map((header) => (
                  <th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-t border-gray-200/70 dark:border-white/10">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-3 py-2 text-gray-600 dark:text-gray-200">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return (
        <p key={index} className="text-gray-700 dark:text-gray-200 leading-relaxed">
          {block.text}
        </p>
      );
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

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getBlogPost(params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `/blog/${post.slug}`
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://soundbridge.live/blog/${post.slug}`,
      type: 'article'
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description
    }
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) return notFound();

  const relatedPosts = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const readMinutes = readingTime(post.content);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    author: {
      '@type': 'Person',
      name: post.author
    },
    publisher: {
      '@type': 'Organization',
      name: 'SoundBridge Live',
      logo: {
        '@type': 'ImageObject',
        url: 'https://soundbridge.live/images/logos/logo-white-lockup.png'
      }
    },
    datePublished: post.date,
    description: post.description
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <Script id="blog-structured-data" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl bg-white/80 dark:bg-white/5 backdrop-blur p-6 sm:p-10 shadow-sm">
          <div className="mb-6 text-sm text-gray-500 dark:text-gray-300">
            <span>{new Date(post.date).toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span>{readMinutes} min read</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">{post.description}</p>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-pink-500 text-white flex items-center justify-center font-semibold">
              {post.author.split(' ').map((s) => s[0]).join('')}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{post.author}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Founder & CEO, SoundBridge Live</p>
            </div>
          </div>

          <article className="space-y-5 text-base leading-relaxed">
            {post.content.map((block, index) => renderBlock(block, index))}
          </article>
        </div>

        <div className="mt-10 p-6 rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Start your SoundBridge journey
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Join the waitlist to connect professionally, promote events for free, and keep 90% of your revenue.
          </p>
          <Link
            href="/waitlist"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-pink-500 text-white font-semibold hover:from-red-700 hover:to-pink-600 transition-colors"
          >
            Join Waitlist
          </Link>
        </div>

        <div className="mt-10">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Related posts</h3>
          <div className="grid gap-4">
            {relatedPosts.map((rel) => (
              <Link
                key={rel.slug}
                href={`/blog/${rel.slug}`}
                className="block rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur p-4 shadow-sm hover:shadow-md transition"
              >
                <p className="text-sm text-gray-500 dark:text-gray-300 mb-1">
                  {new Date(rel.date).toLocaleDateString()}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{rel.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
