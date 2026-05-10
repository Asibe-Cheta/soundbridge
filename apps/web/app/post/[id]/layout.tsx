import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildPostShareMetadata } from '@/src/lib/post-share-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return buildPostShareMetadata(id);
}

export default function PostIdLayout({ children }: { children: ReactNode }) {
  return children;
}
