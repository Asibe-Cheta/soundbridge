import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { copyrightService } from '../../../../src/lib/copyright-service';
import type { DMCARequest } from '../../../../src/lib/types/upload';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      trackId,
      requesterName,
      requesterEmail,
      requesterPhone,
      rightsHolder,
      infringementDescription,
      originalWorkDescription,
      goodFaithStatement,
      accuracyStatement,
      authorityStatement,
      contactAddress
    } = body;

    // Validate required fields
    if (!trackId || !requesterName || !requesterEmail || !rightsHolder || 
        !infringementDescription || !originalWorkDescription) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Validate boolean statements
    if (!goodFaithStatement || !accuracyStatement || !authorityStatement) {
      return NextResponse.json(
        { error: 'All required statements must be true' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create DMCA request
    const dmcaRequest: DMCARequest = {
      trackId,
      requesterName,
      requesterEmail,
      requesterPhone,
      rightsHolder,
      infringementDescription,
      originalWorkDescription,
      goodFaithStatement,
      accuracyStatement,
      authorityStatement,
      contactAddress
    };

    const result = await copyrightService.submitDMCARequest(dmcaRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to submit DMCA request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'DMCA request submitted successfully'
    });

  } catch (error) {
    console.error('DMCA request API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      );
    }

    // Get DMCA requests for the track
    const { data, error } = await supabase
      .from('dmca_requests')
      .select('*')
      .eq('track_id', trackId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch DMCA requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('DMCA requests API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
