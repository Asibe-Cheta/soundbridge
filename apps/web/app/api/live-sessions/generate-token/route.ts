import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST /api/live-sessions/generate-token
 * 
 * Generates Agora RTC tokens for live audio sessions
 * 
 * Required: User must be authenticated
 * 
 * Request Body:
 * {
 *   sessionId: string,  // UUID of the live session
 *   role: 'audience' | 'broadcaster'  // User's role in the session
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   token: string,      // Agora RTC token (valid for 24 hours)
 *   channelName: string, // Agora channel name
 *   uid: number,        // Numeric user ID for Agora
 *   expiresAt: string   // ISO timestamp when token expires
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get Agora credentials from environment
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      console.error('❌ Agora credentials not configured');
      return NextResponse.json(
        { 
          success: false,
          error: 'Agora credentials not configured. Please contact support.' 
        },
        { status: 500 }
      );
    }

    // 2. Verify user is authenticated
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required' 
        },
        { status: 401 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { sessionId, role } = body;

    // 4. Validate request
    if (!sessionId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'sessionId is required' 
        },
        { status: 400 }
      );
    }

    if (!role || !['audience', 'broadcaster'].includes(role)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'role must be "audience" or "broadcaster"' 
        },
        { status: 400 }
      );
    }

    // 5. Verify session exists and user has permission
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('id, creator_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('❌ Session not found:', sessionError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Session not found' 
        },
        { status: 404 }
      );
    }

    // 6. Check if session is live or scheduled
    if (session.status !== 'live' && session.status !== 'scheduled') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Session is not active' 
        },
        { status: 400 }
      );
    }

    // 7. Verify user can be broadcaster (only creator can broadcast)
    if (role === 'broadcaster' && session.creator_id !== user.id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Only the session creator can broadcast' 
        },
        { status: 403 }
      );
    }

    // 8. Generate Agora token
    const channelName = `session-${sessionId}`;
    
    // Convert UUID to numeric UID (Agora requires integer)
    // Take first 9 digits from UUID (remove hyphens and non-numeric chars)
    const uid = parseInt(user.id.replace(/\D/g, '').slice(0, 9)) || Math.floor(Math.random() * 1000000);
    
    // Set role for Agora
    const agoraRole = role === 'broadcaster' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
    // Token expires in 24 hours
    const expirationTimeInSeconds = 86400;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Build the token
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs
    );

    // 9. Record token generation in database (for audit trail)
    await supabase
      .from('live_session_participants')
      .upsert({
        session_id: sessionId,
        user_id: user.id,
        role: role === 'broadcaster' ? 'host' : 'listener',
        joined_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id'
      });

    // 10. Return token
    console.log(`✅ Token generated for user ${user.id} in session ${sessionId} (role: ${role})`);
    
    return NextResponse.json({
      success: true,
      token,
      channelName,
      uid,
      expiresAt: new Date(privilegeExpiredTs * 1000).toISOString()
    });

  } catch (error) {
    console.error('❌ Token generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate token. Please try again.' 
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

