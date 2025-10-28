import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Platform Readiness API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    // Build query for platform readiness checklist
    let query = supabase
      .from('platform_readiness')
      .select(`
        *,
        assigned_to_profile:profiles!assigned_to(display_name, email)
      `)
      .order('priority', { ascending: false })
      .order('category', { ascending: true })
      .order('checklist_item', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: checklist, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching readiness checklist:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch readiness checklist' },
        { status: 500 }
      );
    }

    // Calculate progress statistics
    const totalItems = checklist?.length || 0;
    const completedItems = checklist?.filter(item => item.status === 'completed').length || 0;
    const inProgressItems = checklist?.filter(item => item.status === 'in_progress').length || 0;
    const pendingItems = checklist?.filter(item => item.status === 'pending').length || 0;
    const failedItems = checklist?.filter(item => item.status === 'failed').length || 0;

    const completionPercentage = totalItems > 0 
      ? Math.round((completedItems / totalItems) * 100) 
      : 0;

    // Group by category
    const groupedChecklist = checklist?.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Calculate category-specific progress
    const categoryProgress = Object.entries(groupedChecklist).map(([categoryName, categoryItems]) => {
      const items = categoryItems as any[];
      return {
        category: categoryName,
        total: items.length,
        completed: items.filter(item => item.status === 'completed').length,
        inProgress: items.filter(item => item.status === 'in_progress').length,
        pending: items.filter(item => item.status === 'pending').length,
        failed: items.filter(item => item.status === 'failed').length,
        percentage: items.length > 0 
          ? Math.round((items.filter(item => item.status === 'completed').length / items.length) * 100) 
          : 0
      };
    });

    // Calculate priority-based progress
    const priorityProgress = {
      critical: checklist?.filter(item => item.priority === 'critical').length || 0,
      high: checklist?.filter(item => item.priority === 'high').length || 0,
      medium: checklist?.filter(item => item.priority === 'medium').length || 0,
      low: checklist?.filter(item => item.priority === 'low').length || 0
    };

    const criticalCompleted = checklist?.filter(item => item.priority === 'critical' && item.status === 'completed').length || 0;
    const highCompleted = checklist?.filter(item => item.priority === 'high' && item.status === 'completed').length || 0;

    return NextResponse.json({
      success: true,
      checklist: checklist || [],
      progress: {
        completed: completedItems,
        total: totalItems,
        percentage: completionPercentage,
        inProgress: inProgressItems,
        pending: pendingItems,
        failed: failedItems
      },
      categoryProgress,
      priorityProgress: {
        ...priorityProgress,
        criticalCompleted,
        highCompleted,
        criticalPercentage: priorityProgress.critical > 0 
          ? Math.round((criticalCompleted / priorityProgress.critical) * 100) 
          : 0,
        highPercentage: priorityProgress.high > 0 
          ? Math.round((highCompleted / priorityProgress.high) * 100) 
          : 0
      },
      summary: {
        totalCategories: Object.keys(groupedChecklist).length,
        averageCompletion: categoryProgress.length > 0 
          ? Math.round(categoryProgress.reduce((sum, c) => sum + c.percentage, 0) / categoryProgress.length)
          : 0,
        criticalItemsRemaining: priorityProgress.critical - criticalCompleted,
        highItemsRemaining: priorityProgress.high - highCompleted
      }
    });

  } catch (error) {
    console.error('❌ Error in platform readiness API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('📝 Update Readiness Item API called');
    
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
    const { itemId, status, notes, completionDate } = body;

    if (!itemId || !status) {
      return NextResponse.json(
        { error: 'Item ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Check if user is admin or assigned to this item
    const { data: item, error: itemError } = await supabase
      .from('platform_readiness')
      .select('assigned_to')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Readiness item not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isAssigned = item.assigned_to === user.id;

    if (!isAdmin && !isAssigned) {
      return NextResponse.json(
        { error: 'Access denied. You must be an admin or assigned to this item.' },
        { status: 403 }
      );
    }

    // Update readiness item
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (completionDate) {
      updateData.completion_date = completionDate;
    } else if (status === 'completed') {
      updateData.completion_date = new Date().toISOString();
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('platform_readiness')
      .update(updateData)
      .eq('id', itemId)
      .select(`
        *,
        assigned_to_profile:profiles!assigned_to(display_name, email)
      `)
      .single();

    if (updateError) {
      console.error('❌ Error updating readiness item:', updateError);
      return NextResponse.json(
        { error: 'Failed to update readiness item' },
        { status: 500 }
      );
    }

    console.log('✅ Readiness item updated successfully:', updatedItem.id);

    return NextResponse.json({
      success: true,
      item: {
        id: updatedItem.id,
        checklistItem: updatedItem.checklist_item,
        category: updatedItem.category,
        status: updatedItem.status,
        priority: updatedItem.priority,
        completionDate: updatedItem.completion_date,
        notes: updatedItem.notes,
        assignedTo: updatedItem.assigned_to,
        assignedToName: updatedItem.assigned_to_profile?.display_name || 'Unassigned',
        assignedToEmail: updatedItem.assigned_to_profile?.email || 'N/A',
        estimatedCompletionDate: updatedItem.estimated_completion_date,
        dependencies: updatedItem.dependencies,
        createdAt: updatedItem.created_at,
        updatedAt: updatedItem.updated_at
      },
      updatedAt: updatedItem.updated_at
    });

  } catch (error) {
    console.error('❌ Error in update readiness item API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
