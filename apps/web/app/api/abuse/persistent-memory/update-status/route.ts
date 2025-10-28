import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Persistent Memory Status Update API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      action,
      subscriptionTier,
      subscriptionStatus,
      uploadCount,
      storageUsed,
      abuseType,
      abuseScore,
      details = {}
    } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Get user's persistent ID
    const { data: persistentIdData, error: persistentIdError } = await supabase
      .from('persistent_user_identifiers')
      .select('persistent_id')
      .eq('user_id', user.id)
      .single();

    if (persistentIdError) {
      console.error('❌ Error fetching persistent ID:', persistentIdError);
      return NextResponse.json(
        { error: 'Failed to find user persistent record' },
        { status: 500 }
      );
    }

    const persistentId = persistentIdData?.persistent_id;
    if (!persistentId) {
      return NextResponse.json(
        { error: 'No persistent record found for user' },
        { status: 404 }
      );
    }

    let result = {};

    // Handle different actions
    switch (action) {
      case 'subscription_update':
        if (!subscriptionTier || !subscriptionStatus) {
          return NextResponse.json(
            { error: 'Subscription tier and status are required' },
            { status: 400 }
          );
        }

        // Update subscription history
        const { data: subData, error: subError } = await supabase
          .from('persistent_subscription_history')
          .insert({
            persistent_id: persistentId,
            subscription_tier: subscriptionTier,
            subscription_status: subscriptionStatus,
            start_date: new Date().toISOString(),
            amount_paid: details.amountPaid || 0,
            billing_cycle: details.billingCycle || 'monthly',
            payment_method: details.paymentMethod || 'unknown'
          })
          .select()
          .single();

        if (subError) {
          console.error('❌ Error updating subscription history:', subError);
          return NextResponse.json(
            { error: 'Failed to update subscription history' },
            { status: 500 }
          );
        }

        // Update persistent status
        const { error: statusError } = await supabase
          .from('persistent_user_status')
          .update({
            last_subscription_tier: subscriptionTier,
            last_subscription_end_date: subscriptionStatus === 'active' ? null : new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('persistent_id', persistentId);

        if (statusError) {
          console.error('❌ Error updating persistent status:', statusError);
        }

        result = { subscription: subData };
        break;

      case 'upload_update':
        if (uploadCount === undefined || storageUsed === undefined) {
          return NextResponse.json(
            { error: 'Upload count and storage used are required' },
            { status: 400 }
          );
        }

        // Update upload history
        const { data: uploadData, error: uploadError } = await supabase
          .from('persistent_upload_history')
          .upsert({
            persistent_id: persistentId,
            upload_type: details.uploadType || 'audio',
            upload_count: uploadCount,
            total_storage_used: storageUsed,
            last_upload_date: new Date().toISOString(),
            free_tier_exhausted: uploadCount >= 3,
            free_tier_exhausted_date: uploadCount >= 3 ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'persistent_id,upload_type'
          })
          .select()
          .single();

        if (uploadError) {
          console.error('❌ Error updating upload history:', uploadError);
          return NextResponse.json(
            { error: 'Failed to update upload history' },
            { status: 500 }
          );
        }

        // Update persistent status
        const { error: uploadStatusError } = await supabase
          .from('persistent_user_status')
          .update({
            free_tier_used: uploadCount >= 3,
            free_tier_exhausted_date: uploadCount >= 3 ? new Date().toISOString() : null,
            last_activity: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('persistent_id', persistentId);

        if (uploadStatusError) {
          console.error('❌ Error updating upload status:', uploadStatusError);
        }

        result = { upload: uploadData };
        break;

      case 'abuse_record':
        if (!abuseType || abuseScore === undefined) {
          return NextResponse.json(
            { error: 'Abuse type and score are required' },
            { status: 400 }
          );
        }

        // Record abuse
        const { data: abuseData, error: abuseError } = await supabase
          .from('persistent_abuse_history')
          .insert({
            persistent_id: persistentId,
            abuse_type: abuseType,
            abuse_score: abuseScore,
            abuse_details: details,
            action_taken: details.actionTaken || 'flagged',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (abuseError) {
          console.error('❌ Error recording abuse:', abuseError);
          return NextResponse.json(
            { error: 'Failed to record abuse' },
            { status: 500 }
          );
        }

        // Update persistent status
        const { error: abuseStatusError } = await supabase
          .from('persistent_user_status')
          .update({
            total_abuse_score: abuseScore,
            is_high_risk: abuseScore >= 0.7,
            verification_required: abuseScore >= 0.6,
            updated_at: new Date().toISOString()
          })
          .eq('persistent_id', persistentId);

        if (abuseStatusError) {
          console.error('❌ Error updating abuse status:', abuseStatusError);
        }

        result = { abuse: abuseData };
        break;

      case 'status_update':
        // Update persistent status
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if (details.currentStatus) updateData.current_status = details.currentStatus;
        if (details.isHighRisk !== undefined) updateData.is_high_risk = details.isHighRisk;
        if (details.verificationRequired !== undefined) updateData.verification_required = details.verificationRequired;
        if (details.lastActivity) updateData.last_activity = details.lastActivity;

        const { data: statusData, error: statusUpdateError } = await supabase
          .from('persistent_user_status')
          .update(updateData)
          .eq('persistent_id', persistentId)
          .select()
          .single();

        if (statusUpdateError) {
          console.error('❌ Error updating status:', statusUpdateError);
          return NextResponse.json(
            { error: 'Failed to update status' },
            { status: 500 }
          );
        }

        result = { status: statusData };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        );
    }

    console.log('✅ Persistent memory status updated for user:', user.id, 'Action:', action);

    return NextResponse.json({
      success: true,
      action: action,
      persistentId: persistentId,
      result: result,
      message: `Status updated successfully for action: ${action}`
    });

  } catch (error) {
    console.error('❌ Error in persistent memory status update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
