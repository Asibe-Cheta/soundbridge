import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSoundAcademyModule } from '@/src/content/pro-resources/data';
import { CourseDetailClient } from './CourseDetailClient';

type PageProps = { params: { id: string } };

export function generateMetadata({ params }: PageProps): Metadata {
  const mod = getSoundAcademyModule(params.id);
  if (!mod) return {};
  return {
    title: `${mod.title} — Sound Academy UK`,
    description: mod.description,
  };
}

export default function CourseDetailPage({ params }: PageProps) {
  const mod = getSoundAcademyModule(params.id);
  if (!mod) notFound();
  return <CourseDetailClient mod={mod} />;
}
