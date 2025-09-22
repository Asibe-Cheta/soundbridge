import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tip rewards using the database function
    const { data: rewards, error: rewardsError } = await supabase
      .rpc('get_creator_tip_rewards', {
        creator_uuid: user.id
      });

    if (rewardsError) {
      console.error('Error fetching tip rewards:', rewardsError);
      return NextResponse.json(
        { error: 'Failed to fetch tip rewards' },
        { status: 500 }
      );
    }

    return NextResponse.json({ rewards: rewards || [] });

  } catch (error) {
    console.error('Error in tip rewards API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      reward_name, 
      reward_description, 
      minimum_tip_amount, 
      reward_type = 'exclusive_content',
      reward_content,
      max_redemptions 
    } = body;

    // Validate required fields
    if (!reward_name || !minimum_tip_amount || minimum_tip_amount <= 0) {
      return NextResponse.json(
        { error: 'Reward name and valid minimum tip amount are required' },
        { status: 400 }
      );
    }

    // Check if user has Enterprise subscription for tip rewards
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const userTier = subscription?.tier || 'free';
    if (userTier !== 'enterprise') {
      return NextResponse.json(
        { error: 'Tip rewards are available for Enterprise users only' },
        { status: 403 }
      );
    }

    // Create the tip reward
    const { data: reward, error: createError } = await supabase
      .from('tip_rewards')
      .insert({
        creator_id: user.id,
        reward_name: reward_name.trim(),
        reward_description: reward_description?.trim() || null,
        minimum_tip_amount: minimum_tip_amount,
        reward_type: reward_type,
        reward_content: reward_content || null,
        max_redemptions: max_redemptions || null
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating tip reward:', createError);
      return NextResponse.json(
        { error: 'Failed to create tip reward' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reward }, { status: 201 });

  } catch (error) {
    console.error('Error in tip rewards POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      reward_id,
      reward_name, 
      reward_description, 
      minimum_tip_amount, 
      reward_type,
      reward_content,
      max_redemptions,
      is_active 
    } = body;

    if (!reward_id) {
      return NextResponse.json(
        { error: 'Reward ID is required' },
        { status: 400 }
      );
    }

    // Update the tip reward
    const updateData: any = {};
    if (reward_name !== undefined) updateData.reward_name = reward_name.trim();
    if (reward_description !== undefined) updateData.reward_description = reward_description?.trim() || null;
    if (minimum_tip_amount !== undefined) updateData.minimum_tip_amount = minimum_tip_amount;
    if (reward_type !== undefined) updateData.reward_type = reward_type;
    if (reward_content !== undefined) updateData.reward_content = reward_content;
    if (max_redemptions !== undefined) updateData.max_redemptions = max_redemptions;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: reward, error: updateError } = await supabase
      .from('tip_rewards')
      .update(updateData)
      .eq('id', reward_id)
      .eq('creator_id', user.id) // Ensure user can only update their own rewards
      .select()
      .single();

    if (updateError) {
      console.error('Error updating tip reward:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tip reward' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reward });

  } catch (error) {
    console.error('Error in tip rewards PUT API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rewardId = searchParams.get('reward_id');

    if (!rewardId) {
      return NextResponse.json(
        { error: 'Reward ID is required' },
        { status: 400 }
      );
    }

    // Delete the tip reward
    const { error: deleteError } = await supabase
      .from('tip_rewards')
      .delete()
      .eq('id', rewardId)
      .eq('creator_id', user.id); // Ensure user can only delete their own rewards

    if (deleteError) {
      console.error('Error deleting tip reward:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete tip reward' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Tip reward deleted successfully' });

  } catch (error) {
    console.error('Error in tip rewards DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
