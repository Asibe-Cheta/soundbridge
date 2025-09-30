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
    console.log('🔥 Creator page loading for username:', username);
    
    // Get the creator data
    let { data: creator, error } = await getCreatorByUsername(username);
    
    // If not found and username starts with 'user', try to find by ID
    if ((error || !creator) && username.startsWith('user')) {
      const userId = username.replace('user', '');
      console.log('🔥 Trying to find creator by ID:', userId);
      
      const supabase = createServiceClient();
      const { data: creatorById, error: idError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('role', 'creator')
        .single();
      
      if (!idError && creatorById) {
        creator = creatorById;
        error = null;
        console.log('🔥 Found creator by ID:', creatorById.display_name);
      }
    }
    
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
