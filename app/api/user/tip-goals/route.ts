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

    // Get tip goals using the database function
    const { data: goals, error: goalsError } = await supabase
      .rpc('get_creator_tip_goals', {
        creator_uuid: user.id
      });

    if (goalsError) {
      console.error('Error fetching tip goals:', goalsError);
      return NextResponse.json(
        { error: 'Failed to fetch tip goals' },
        { status: 500 }
      );
    }

    return NextResponse.json({ goals: goals || [] });

  } catch (error) {
    console.error('Error in tip goals API:', error);
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
      goal_name, 
      goal_description, 
      target_amount, 
      goal_type = 'monthly',
      end_date 
    } = body;

    // Validate required fields
    if (!goal_name || !target_amount || target_amount <= 0) {
      return NextResponse.json(
        { error: 'Goal name and valid target amount are required' },
        { status: 400 }
      );
    }

    // Check if user has Pro+ subscription for tip goals
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const userTier = subscription?.tier || 'free';
    if (userTier === 'free') {
      return NextResponse.json(
        { error: 'Tip goals are available for Pro and Enterprise users only' },
        { status: 403 }
      );
    }

    // Create the tip goal
    const { data: goal, error: createError } = await supabase
      .from('tip_goals')
      .insert({
        creator_id: user.id,
        goal_name: goal_name.trim(),
        goal_description: goal_description?.trim() || null,
        target_amount: target_amount,
        goal_type: goal_type,
        end_date: end_date ? new Date(end_date).toISOString() : null
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating tip goal:', createError);
      return NextResponse.json(
        { error: 'Failed to create tip goal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ goal }, { status: 201 });

  } catch (error) {
    console.error('Error in tip goals POST API:', error);
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
      goal_id,
      goal_name, 
      goal_description, 
      target_amount, 
      goal_type,
      end_date,
      is_active 
    } = body;

    if (!goal_id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    // Update the tip goal
    const updateData: any = {};
    if (goal_name !== undefined) updateData.goal_name = goal_name.trim();
    if (goal_description !== undefined) updateData.goal_description = goal_description?.trim() || null;
    if (target_amount !== undefined) updateData.target_amount = target_amount;
    if (goal_type !== undefined) updateData.goal_type = goal_type;
    if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date).toISOString() : null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: goal, error: updateError } = await supabase
      .from('tip_goals')
      .update(updateData)
      .eq('id', goal_id)
      .eq('creator_id', user.id) // Ensure user can only update their own goals
      .select()
      .single();

    if (updateError) {
      console.error('Error updating tip goal:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tip goal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ goal });

  } catch (error) {
    console.error('Error in tip goals PUT API:', error);
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
    const goalId = searchParams.get('goal_id');

    if (!goalId) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    // Delete the tip goal
    const { error: deleteError } = await supabase
      .from('tip_goals')
      .delete()
      .eq('id', goalId)
      .eq('creator_id', user.id); // Ensure user can only delete their own goals

    if (deleteError) {
      console.error('Error deleting tip goal:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete tip goal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Tip goal deleted successfully' });

  } catch (error) {
    console.error('Error in tip goals DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
