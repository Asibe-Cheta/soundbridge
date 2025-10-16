import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { eventNotificationService } from '@/src/services/EventNotificationService';

/**
 * POST /api/notifications/test-send
 * Send a test push notification to the authenticated user
 * Useful for testing push notification setup
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      title = 'Test Notification',
      body: notificationBody = 'This is a test event notification from SoundBridge',
      event_id,
    } = body;

    console.log(`📧 Sending test notification to user: ${user.id}`);

    // Send test notification using the service
    const result = await eventNotificationService.sendTestNotification(
      user.id,
      title,
      notificationBody,
      event_id
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to send test notification',
          details: result.error,
        },
        { status: 500 }
      );
    }

    console.log(`✅ Test notification sent successfully to user: ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully',
      user_id: user.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in POST /api/notifications/test-send:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

