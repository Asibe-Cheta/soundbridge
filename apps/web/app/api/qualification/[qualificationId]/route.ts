import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function PUT(
  request: NextRequest,
  { params }: { params: { qualificationId: string } }
) {
  try {
    console.log('📝 Update Qualification API called for ID:', params.qualificationId);
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin (only admins can update qualifications)
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
    const { isMet, evidenceUrl, notes } = body;

    // Validate required fields
    if (typeof isMet !== 'boolean') {
      return NextResponse.json(
        { error: 'isMet field is required and must be boolean' },
        { status: 400 }
      );
    }

    // Update qualification
    const updateData: any = {
      is_met: isMet,
      updated_at: new Date().toISOString()
    };

    if (evidenceUrl) {
      updateData.evidence_url = evidenceUrl;
    }

    if (notes) {
      updateData.description = notes;
    }

    if (isMet) {
      updateData.verified_at = new Date().toISOString();
      updateData.verified_by = user.id;
    }

    const { data: qualification, error: updateError } = await supabase
      .from('platform_qualifications')
      .update(updateData)
      .eq('id', params.qualificationId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating qualification:', updateError);
      return NextResponse.json(
        { error: 'Failed to update qualification' },
        { status: 500 }
      );
    }

    if (!qualification) {
      return NextResponse.json(
        { error: 'Qualification not found' },
        { status: 404 }
      );
    }

    console.log('✅ Qualification updated successfully:', qualification.id);

    return NextResponse.json({
      success: true,
      qualification: {
        id: qualification.id,
        platformName: qualification.platform_name,
        requirementType: qualification.requirement_type,
        requirementName: qualification.requirement_name,
        description: qualification.description,
        isMet: qualification.is_met,
        evidenceUrl: qualification.evidence_url,
        verifiedAt: qualification.verified_at,
        verifiedBy: qualification.verified_by,
        priority: qualification.priority,
        estimatedEffortHours: qualification.estimated_effort_hours,
        dependencies: qualification.dependencies,
        createdAt: qualification.created_at,
        updatedAt: qualification.updated_at
      },
      updatedAt: qualification.updated_at
    });

  } catch (error) {
    console.error('❌ Error in update qualification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { qualificationId: string } }
) {
  try {
    console.log('📋 Get Qualification API called for ID:', params.qualificationId);
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get qualification details
    const { data: qualification, error: fetchError } = await supabase
      .from('platform_qualifications')
      .select(`
        *,
        verified_by_profile:profiles!verified_by(display_name, email)
      `)
      .eq('id', params.qualificationId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching qualification:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch qualification' },
        { status: 500 }
      );
    }

    if (!qualification) {
      return NextResponse.json(
        { error: 'Qualification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      qualification: {
        id: qualification.id,
        platformName: qualification.platform_name,
        requirementType: qualification.requirement_type,
        requirementName: qualification.requirement_name,
        description: qualification.description,
        isMet: qualification.is_met,
        evidenceUrl: qualification.evidence_url,
        verifiedAt: qualification.verified_at,
        verifiedBy: qualification.verified_by,
        verifiedByName: qualification.verified_by_profile?.display_name || 'Unknown',
        verifiedByEmail: qualification.verified_by_profile?.email || 'Unknown',
        priority: qualification.priority,
        estimatedEffortHours: qualification.estimated_effort_hours,
        dependencies: qualification.dependencies,
        createdAt: qualification.created_at,
        updatedAt: qualification.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error in get qualification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
