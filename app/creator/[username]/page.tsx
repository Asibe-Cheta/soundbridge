import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/src/lib/supabase';
import { CreatorProfileClient } from './CreatorProfileClient';
import { StructuredData, personStructuredData } from '@/src/components/seo/StructuredData';

interface CreatorProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: CreatorProfilePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { username } = resolvedParams;

  try {
    const supabase = createServiceClient();
    const { data: creator } = await supabase
      .from('profiles')
      .select('username, display_name, bio, avatar_url, location, social_links')
      .eq('username', username)
      .eq('is_public', true)
      .single();

    if (!creator) {
      return {
        title: 'Creator Not Found',
        description: 'The requested creator profile could not be found.',
      };
    }

    const title = `${creator.display_name || creator.username} | SoundBridge`;
    const description = creator.bio || `Discover music and events by ${creator.display_name || creator.username} on SoundBridge.`;
    const image = creator.avatar_url || '/images/default-avatar.jpg';

    return {
      title,
      description,
      keywords: [
        creator.display_name || creator.username,
        'music creator',
        'artist',
        'music',
        'SoundBridge',
        creator.location || '',
        ...(creator.bio ? creator.bio.split(' ').slice(0, 5) : [])
      ],
      openGraph: {
        title,
        description,
        url: `https://soundbridge.com/creator/${username}`,
        siteName: 'SoundBridge',
        images: [
          {
            url: image,
            width: 400,
            height: 400,
            alt: `${creator.display_name || creator.username} - SoundBridge Creator`,
          },
        ],
        locale: 'en_US',
        type: 'profile',
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: [image],
        creator: '@soundbridge',
        site: '@soundbridge',
      },
      alternates: {
        canonical: `/creator/${username}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata for creator profile:', error);
    return {
      title: 'Creator Profile | SoundBridge',
      description: 'Discover music creators on SoundBridge.',
    };
  }
}

export default async function CreatorProfilePage({ params }: CreatorProfilePageProps) {
  const resolvedParams = await params;
  const { username } = resolvedParams;

  try {
    const supabase = createServiceClient();
    const { data: creator } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .eq('is_public', true)
      .single();

    if (!creator) {
      notFound();
    }

    // Generate structured data for the creator
    const creatorStructuredData = personStructuredData({
      name: creator.display_name || creator.username,
      description: creator.bio,
      image: creator.avatar_url,
      url: `https://soundbridge.com/creator/${username}`,
      sameAs: creator.social_links ? Object.values(creator.social_links).filter(Boolean) as string[] : undefined,
      jobTitle: 'Music Creator',
      worksFor: 'SoundBridge',
    });

    return (
      <>
        <StructuredData type="person" data={creatorStructuredData} />
        <CreatorProfileClient username={username} initialCreator={creator} />
      </>
    );
  } catch (error) {
    console.error('Error loading creator profile:', error);
    notFound();
  }
}