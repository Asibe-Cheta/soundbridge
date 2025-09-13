import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/src/lib/supabase';
import { CreatorProfileClient } from './CreatorProfileClient';
import Link from 'next/link';

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
    // Return fallback metadata instead of throwing
    return {
      title: `${username} | SoundBridge`,
      description: `Discover music and events by ${username} on SoundBridge.`,
    };
  }
}

export default async function CreatorProfilePage({ params }: { params: { username: string } }) {
  const resolvedParams = await params;
  const { username } = resolvedParams;

  try {
    const supabase = createServiceClient();
    const { data: creator } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (!creator) {
      notFound();
    }

    return (
      <>
        <CreatorProfileClient username={username} initialCreator={creator} />
      </>
    );
  } catch (error) {
    console.error('Error loading creator profile:', error);
    
    // Return a fallback UI instead of crashing
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Unable to Load Profile</h1>
              <p className="text-gray-400 mb-4">
                We&apos;re experiencing technical difficulties. Please try again later.
              </p>
              <Link href="/" className="text-red-500 hover:text-red-400">
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }
}