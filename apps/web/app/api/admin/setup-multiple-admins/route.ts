import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env not configured');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    // Define the admin emails
    const adminEmails = [
      'asibechetachukwu@gmail.com',
      'dmca@soundbridge.live', 
      'contact@soundbridge.live'
    ];

    console.log('🔐 Setting up admin access for:', adminEmails);

    // Update all roles to admin
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .in('email', adminEmails)
      .select('id, email, display_name, role');

    if (error) {
      console.error('Error updating user roles:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update user roles',
        details: error.message
      }, { status: 500 });
    }

    // Check if any users were found
    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No users found with the specified emails',
        message: 'Make sure these users have accounts on SoundBridge'
      }, { status: 404 });
    }

    console.log('✅ Admin access granted to:', data.map(user => user.email));

    return NextResponse.json({
      success: true,
      message: `Admin access granted to ${data.length} users`,
      users: data,
      totalGranted: data.length,
      requestedEmails: adminEmails
    });

  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
