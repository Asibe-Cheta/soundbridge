import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

// CORS headers for mobile app compatibility
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

// Helper function to create JSON response with CORS headers
function jsonResponse(data: any, status: number) {
  return NextResponse.json(data, {
    status,
    headers: CORS_HEADERS
  });
}

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
      console.error('❌ [TOKEN API] Agora credentials not configured');
      return jsonResponse(
        { 
          success: false,
          error: 'Agora credentials not configured. Please contact support.' 
        },
        500
      );
    }

    // 2. Verify user is authenticated (supports both Bearer tokens and cookies)
    const { supabase, user, error: authError, mode } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      console.error('❌ [TOKEN API] Authentication failed:', authError, 'Auth mode:', mode);
      console.error('❌ [TOKEN API] Request headers:', {
        hasAuth: !!request.headers.get('authorization'),
        hasXAuth: !!request.headers.get('x-authorization'),
        hasXToken: !!request.headers.get('x-supabase-token'),
      });
      return jsonResponse(
        { 
          success: false,
          error: 'Authentication required' 
        },
        401
      );
    }

    console.log(`✅ [TOKEN API] User authenticated via ${mode}:`, user.id);

    // 3. Parse request body
    const body = await request.json();
    const { sessionId, role } = body;

    console.log(`🔍 [TOKEN API] Request:`, { sessionId, role, userId: user.id });

    // 4. Validate request
    if (!sessionId) {
      return jsonResponse(
        { 
          success: false,
          error: 'sessionId is required' 
        },
        400
      );
    }

    if (!role || !['audience', 'broadcaster'].includes(role)) {
      return jsonResponse(
        { 
          success: false,
          error: 'role must be "audience" or "broadcaster"' 
        },
        400
      );
    }

    // 5. Verify session exists and user has permission
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('id, creator_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('❌ [TOKEN API] Session not found:', sessionError);
      return jsonResponse(
        { 
          success: false,
          error: 'Session not found' 
        },
        404
      );
    }

    console.log(`✅ [TOKEN API] Session found:`, { 
      sessionId, 
      status: session.status, 
      creatorId: session.creator_id,
      isCreator: session.creator_id === user.id 
    });

    // 6. Check if session is live or scheduled
    if (session.status !== 'live' && session.status !== 'scheduled') {
      console.error(`❌ [TOKEN API] Session not active. Status: ${session.status}`);
      return jsonResponse(
        { 
          success: false,
          error: 'Session is not active' 
        },
        400
      );
    }

    // 7. Verify user can be broadcaster (only creator can broadcast)
    if (role === 'broadcaster' && session.creator_id !== user.id) {
      console.error(`❌ [TOKEN API] User ${user.id} tried to broadcast session owned by ${session.creator_id}`);
      return jsonResponse(
        { 
          success: false,
          error: 'Only the session creator can broadcast' 
        },
        403
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

    console.log(`🔑 [TOKEN API] Generating token:`, { channelName, uid, role: agoraRole, expiresIn: '24h' });

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

    // 10. Return token with CORS headers
    console.log(`✅ [TOKEN API] Token generated successfully for user ${user.id} in session ${sessionId} (role: ${role})`);
    
    return jsonResponse({
      success: true,
      token,
      channelName,
      uid,
      expiresAt: new Date(privilegeExpiredTs * 1000).toISOString()
    }, 200);

  } catch (error) {
    console.error('❌ [TOKEN API] Unexpected error:', error);
    return jsonResponse(
      { 
        success: false,
        error: 'Failed to generate token. Please try again.' 
      },
      500
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
