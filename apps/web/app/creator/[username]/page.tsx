import { notFound } from 'next/navigation';
import { createServiceClient } from '@/src/lib/supabase';
import { getCreatorByUsername } from '@/src/lib/creator';
import { CreatorProfileClient } from './CreatorProfileClient';

interface CreatorPageProps {
  params: {
    username: string;
  };
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { username } = params;
  
  try {
    // Get the creator data
    const { data: creator, error } = await getCreatorByUsername(username);
    
    if (error || !creator) {
      console.error('Error fetching creator:', error);
      notFound();
    }

    return (
      <CreatorProfileClient 
        username={username}
        initialCreator={creator}
      />
    );
  } catch (error) {
    console.error('Error in CreatorPage:', error);
    notFound();
  }
}
