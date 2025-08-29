// Manual profile creation script
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aunxdbqukbxyyiusaeqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NzQ5NzQsImV4cCI6MjA1MTA1MDk3NH0.aunxdbqukbxyyiusaeqi';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createProfile() {
  try {
    console.log('🔧 Creating profile manually...\n');
    
    // First, let's check if the user exists in auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }
    
    console.log(`📊 Found ${users.length} users in auth system`);
    
    // Find the user with email asibechetachukwu@gmail.com
    const user = users.find(u => u.email === 'asibechetachukwu@gmail.com');
    
    if (!user) {
      console.error('❌ User not found in auth system');
      return;
    }
    
    console.log('✅ Found user:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });
    
    // Check if profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', profileCheckError);
      return;
    }
    
    if (existingProfile) {
      console.log('✅ Profile already exists:', existingProfile);
      return;
    }
    
    // Create profile data
    const email = user.email;
    const firstName = user.user_metadata?.first_name || email.split('@')[0];
    const lastName = user.user_metadata?.last_name || '';
    const role = user.user_metadata?.role || 'creator';
    const location = user.user_metadata?.location || 'london';
    
    const profileData = {
      id: user.id,
      username: `${firstName}${lastName}${Math.random().toString(36).substring(2, 6)}`.toLowerCase().replace(/[^a-z0-9]/g, ''),
      display_name: `${firstName} ${lastName}`.trim() || email.split('@')[0],
      role: role,
      location: location,
      country: location.includes('Nigeria') ? 'Nigeria' : 'UK',
      bio: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📝 Creating profile with data:', profileData);
    
    // Create the profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Profile creation error:', createError);
      return;
    }
    
    console.log('✅ Profile created successfully:', newProfile);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createProfile();
