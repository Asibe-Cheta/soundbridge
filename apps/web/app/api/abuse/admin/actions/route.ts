import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('⚡ Admin Abuse Action API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      targetUserId, 
      actionType, 
      reason, 
      severity = 'medium',
      expiresAt,
      details = {}
    } = body;

    // Validate required fields
    if (!targetUserId || !actionType || !reason) {
      return NextResponse.json(
        { error: 'targetUserId, actionType, and reason are required' },
        { status: 400 }
      );
    }

    // Validate action type
    const validActionTypes = [
      'account_flagged', 'upload_blocked', 'account_suspended',
      'account_banned', 'content_removed', 'limits_reduced',
      'verification_required', 'manual_review', 'warning_sent'
    ];

    if (!validActionTypes.includes(actionType)) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity level' },
        { status: 400 }
      );
    }

    // Create abuse prevention action
    const { data: action, error: actionError } = await supabase
      .from('abuse_prevention_actions')
      .insert({
        user_id: targetUserId,
        action_type: actionType,
        action_reason: reason,
        action_details: details,
        severity: severity,
        is_active: true,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_by: user.id
      })
      .select()
      .single();

    if (actionError) {
      console.error('❌ Error creating abuse action:', actionError);
      return NextResponse.json(
        { error: 'Failed to create abuse action' },
        { status: 500 }
      );
    }

    // If account is being suspended or banned, update user status
    if (actionType === 'account_suspended' || actionType === 'account_banned') {
      const { error: statusError } = await supabase
        .from('profiles')
        .update({
          status: actionType === 'account_banned' ? 'banned' : 'suspended',
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId);

      if (statusError) {
        console.error('❌ Error updating user status:', statusError);
        // Don't fail the request, just log the error
      }
    }

    // If account is being flagged, update risk score
    if (actionType === 'account_flagged') {
      const { error: riskError } = await supabase
        .from('user_risk_scores')
        .update({
          is_flagged: true,
          flag_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', targetUserId);

      if (riskError) {
        console.error('❌ Error updating risk score:', riskError);
        // Don't fail the request, just log the error
      }
    }

    console.log('✅ Abuse action created:', actionType, 'for user:', targetUserId);

    return NextResponse.json({
      success: true,
      action: action,
      message: `Action ${actionType} applied successfully`
    });

  } catch (error) {
    console.error('❌ Error in admin abuse action API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('✏️ Admin Abuse Action Update API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      actionId, 
      isActive, 
      expiresAt,
      notes
    } = body;

    // Validate required fields
    if (!actionId) {
      return NextResponse.json(
        { error: 'actionId is required' },
        { status: 400 }
      );
    }

    // Update abuse prevention action
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    if (expiresAt !== undefined) {
      updateData.expires_at = expiresAt ? new Date(expiresAt).toISOString() : null;
    }

    if (notes) {
      updateData.action_details = { ...updateData.action_details, notes };
    }

    const { data: action, error: actionError } = await supabase
      .from('abuse_prevention_actions')
      .update(updateData)
      .eq('id', actionId)
      .select()
      .single();

    if (actionError) {
      console.error('❌ Error updating abuse action:', actionError);
      return NextResponse.json(
        { error: 'Failed to update abuse action' },
        { status: 500 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      );
    }

    console.log('✅ Abuse action updated:', actionId);

    return NextResponse.json({
      success: true,
      action: action,
      message: 'Action updated successfully'
    });

  } catch (error) {
    console.error('❌ Error in admin abuse action update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Admin Abuse Action Delete API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('actionId');

    if (!actionId) {
      return NextResponse.json(
        { error: 'actionId is required' },
        { status: 400 }
      );
    }

    // Delete abuse prevention action
    const { error: actionError } = await supabase
      .from('abuse_prevention_actions')
      .delete()
      .eq('id', actionId);

    if (actionError) {
      console.error('❌ Error deleting abuse action:', actionError);
      return NextResponse.json(
        { error: 'Failed to delete abuse action' },
        { status: 500 }
      );
    }

    console.log('✅ Abuse action deleted:', actionId);

    return NextResponse.json({
      success: true,
      message: 'Action deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in admin abuse action delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
