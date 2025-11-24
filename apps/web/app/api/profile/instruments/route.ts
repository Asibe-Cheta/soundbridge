/**
 * GET /api/profile/instruments - Get user's instruments
 * POST /api/profile/instruments - Add an instrument
 * DELETE /api/profile/instruments - Remove an instrument
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎹 Get Instruments API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user's instruments
    const { data: instruments, error: instrumentsError } = await supabase
      .from('profile_instruments')
      .select('id, instrument, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (instrumentsError) {
      console.error('❌ Error fetching instruments:', instrumentsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch instruments', details: instrumentsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          instruments: instruments || [],
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error fetching instruments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('➕ Add Instrument API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { instrument } = body;

    // Validation
    if (!instrument || instrument.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instrument is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const instrumentName = instrument.trim();

    // Check if instrument already exists (UNIQUE constraint will handle this, but we can check first)
    const { data: existingInstrument } = await supabase
      .from('profile_instruments')
      .select('id')
      .eq('user_id', user.id)
      .eq('instrument', instrumentName)
      .maybeSingle();

    if (existingInstrument) {
      return NextResponse.json(
        { success: false, error: 'Instrument already exists' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Add instrument
    const { data: newInstrument, error: insertError } = await supabase
      .from('profile_instruments')
      .insert({
        user_id: user.id,
        instrument: instrumentName,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error adding instrument:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to add instrument', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Instrument added successfully:', newInstrument.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          instrument: newInstrument,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error adding instrument:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Remove Instrument API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { instrument } = body;

    // Validation
    if (!instrument || instrument.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instrument is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Remove instrument
    const { error: deleteError } = await supabase
      .from('profile_instruments')
      .delete()
      .eq('user_id', user.id)
      .eq('instrument', instrument.trim());

    if (deleteError) {
      console.error('❌ Error removing instrument:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to remove instrument', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Instrument removed successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Instrument removed successfully',
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error removing instrument:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

