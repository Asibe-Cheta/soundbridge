import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create notification preferences for the user
    const { data, error } = await supabase.rpc('get_or_create_notification_preferences', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Error fetching notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences' },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend interface
    const preferences = {
      locationRadius: data.location_radius,
      eventCategories: data.event_categories,
      notificationTiming: data.notification_timing,
      deliveryMethods: data.delivery_methods,
      quietHours: {
        enabled: data.quiet_hours_enabled,
        start: data.quiet_hours_start,
        end: data.quiet_hours_end
      },
      creatorActivity: data.creator_activity_enabled,
      socialNotifications: data.social_notifications,
      collaborationRequests: data.collaboration_requests
    };

    return NextResponse.json({
      success: true,
      data: preferences
    });

  } catch (error) {
    console.error('Error in notification preferences GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      locationRadius,
      eventCategories,
      notificationTiming,
      deliveryMethods,
      quietHours,
      creatorActivity,
      socialNotifications,
      collaborationRequests
    } = body;

    // Validate the data
    if (locationRadius && (locationRadius < 1 || locationRadius > 100)) {
      return NextResponse.json(
        { error: 'Location radius must be between 1 and 100 km' },
        { status: 400 }
      );
    }

    if (notificationTiming && !['immediate', '1-day', '3-days', '1-week'].includes(notificationTiming)) {
      return NextResponse.json(
        { error: 'Invalid notification timing' },
        { status: 400 }
      );
    }

    // Update notification preferences
    const { data, error } = await supabase.rpc('update_notification_preferences', {
      p_user_id: user.id,
      p_location_radius: locationRadius || null,
      p_event_categories: eventCategories ? JSON.stringify(eventCategories) : null,
      p_notification_timing: notificationTiming || null,
      p_delivery_methods: deliveryMethods ? JSON.stringify(deliveryMethods) : null,
      p_quiet_hours_enabled: quietHours?.enabled !== undefined ? quietHours.enabled : null,
      p_quiet_hours_start: quietHours?.start || null,
      p_quiet_hours_end: quietHours?.end || null,
      p_creator_activity_enabled: creatorActivity !== undefined ? creatorActivity : null,
      p_social_notifications: socialNotifications ? JSON.stringify(socialNotifications) : null,
      p_collaboration_requests: collaborationRequests ? JSON.stringify(collaborationRequests) : null
    });

    if (error) {
      console.error('Error updating notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    // Transform the response data
    const updatedPreferences = {
      locationRadius: data.location_radius,
      eventCategories: data.event_categories,
      notificationTiming: data.notification_timing,
      deliveryMethods: data.delivery_methods,
      quietHours: {
        enabled: data.quiet_hours_enabled,
        start: data.quiet_hours_start,
        end: data.quiet_hours_end
      },
      creatorActivity: data.creator_activity_enabled,
      socialNotifications: data.social_notifications,
      collaborationRequests: data.collaboration_requests
    };

    return NextResponse.json({
      success: true,
      data: updatedPreferences,
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    console.error('Error in notification preferences POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { section, data: sectionData } = body;

    if (!section) {
      return NextResponse.json(
        { error: 'Section is required' },
        { status: 400 }
      );
    }

    let updateParams: any = { p_user_id: user.id };

    // Map section-specific data to database parameters
    switch (section) {
      case 'location':
        if (sectionData.locationRadius !== undefined) {
          updateParams.p_location_radius = sectionData.locationRadius;
        }
        break;
      
      case 'categories':
        if (sectionData.eventCategories) {
          updateParams.p_event_categories = JSON.stringify(sectionData.eventCategories);
        }
        break;
      
      case 'timing':
        if (sectionData.notificationTiming) {
          updateParams.p_notification_timing = sectionData.notificationTiming;
        }
        break;
      
      case 'delivery':
        if (sectionData.deliveryMethods) {
          updateParams.p_delivery_methods = JSON.stringify(sectionData.deliveryMethods);
        }
        break;
      
      case 'quiet-hours':
        if (sectionData.quietHours) {
          updateParams.p_quiet_hours_enabled = sectionData.quietHours.enabled;
          updateParams.p_quiet_hours_start = sectionData.quietHours.start;
          updateParams.p_quiet_hours_end = sectionData.quietHours.end;
        }
        break;
      
      case 'creator-activity':
        if (sectionData.creatorActivity !== undefined) {
          updateParams.p_creator_activity_enabled = sectionData.creatorActivity;
        }
        break;
      
      case 'social':
        if (sectionData.socialNotifications) {
          updateParams.p_social_notifications = JSON.stringify(sectionData.socialNotifications);
        }
        break;
      
      case 'collaboration-requests':
        if (sectionData.collaborationRequests) {
          updateParams.p_collaboration_requests = JSON.stringify(sectionData.collaborationRequests);
        }
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid section' },
          { status: 400 }
        );
    }

    // Update notification preferences
    const { data, error } = await supabase.rpc('update_notification_preferences', updateParams);

    if (error) {
      console.error('Error updating notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    // Transform the response data
    const updatedPreferences = {
      locationRadius: data.location_radius,
      eventCategories: data.event_categories,
      notificationTiming: data.notification_timing,
      deliveryMethods: data.delivery_methods,
      quietHours: {
        enabled: data.quiet_hours_enabled,
        start: data.quiet_hours_start,
        end: data.quiet_hours_end
      },
      creatorActivity: data.creator_activity_enabled,
      socialNotifications: data.social_notifications,
      collaborationRequests: data.collaboration_requests
    };

    return NextResponse.json({
      success: true,
      data: updatedPreferences,
      message: `${section} preferences updated successfully`
    });

  } catch (error) {
    console.error('Error in notification preferences PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
