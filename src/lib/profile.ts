import { createBrowserClient } from './supabase';

export interface ProfileData {
  username: string;
  display_name: string;
  role: 'creator' | 'listener';
  location: string;
  country: 'UK' | 'Nigeria';
  bio?: string;
}

export async function createProfile(userId: string, profileData: ProfileData) {
  try {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: profileData.username,
        display_name: profileData.display_name,
        role: profileData.role,
        location: profileData.location,
        country: profileData.country,
        bio: profileData.bio || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error creating profile:', error);
    return { data: null, error: error as Error };
  }
}

export async function getProfile(userId: string) {
  try {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting profile:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error getting profile:', error);
    return { data: null, error: error as Error };
  }
}

export async function updateProfile(userId: string, updates: Partial<ProfileData>) {
  try {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error updating profile:', error);
    return { data: null, error: error as Error };
  }
}

export function generateUsername(email: string, firstName: string, lastName: string): string {
  // Remove domain from email
  const emailUsername = email.split('@')[0];
  
  // Create username from name
  const nameUsername = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Combine and ensure uniqueness
  const baseUsername = nameUsername || emailUsername;
  
  // Add random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 6);
  
  return `${baseUsername}${suffix}`;
} 