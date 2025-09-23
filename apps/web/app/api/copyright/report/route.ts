import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { copyrightService } from '../../../../src/lib/copyright-service';
import type { CopyrightViolationReport } from '../../../../src/lib/types/upload';

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
    const { trackId, violationType, description, evidenceUrls } = body;

    if (!trackId || !violationType || !description) {
      return NextResponse.json(
        { error: 'Track ID, violation type, and description are required' },
        { status: 400 }
      );
    }

    // Validate violation type
    const validViolationTypes = ['copyright_infringement', 'trademark', 'rights_holder_complaint'];
    if (!validViolationTypes.includes(violationType)) {
      return NextResponse.json(
        { error: 'Invalid violation type' },
        { status: 400 }
      );
    }

    // Create violation report
    const report: CopyrightViolationReport = {
      trackId,
      reporterId: session.user.id,
      violationType,
      description,
      evidenceUrls: evidenceUrls || []
    };

    const result = await copyrightService.reportViolation(report);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to report violation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Copyright violation reported successfully'
    });

  } catch (error) {
    console.error('Copyright report API error:', error);
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

    // Get violation reports for the track
    const { data, error } = await supabase
      .from('copyright_violations')
      .select(`
        *,
        reporter:profiles!copyright_violations_reporter_id_fkey(display_name, username)
      `)
      .eq('track_id', trackId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch violation reports' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Copyright violations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
