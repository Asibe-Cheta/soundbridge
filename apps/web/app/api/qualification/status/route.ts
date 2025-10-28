import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Platform Qualification Status API called');
    
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
    const platform = searchParams.get('platform');
    const category = searchParams.get('category');

    // Build query for platform qualifications
    let query = supabase
      .from('platform_qualifications')
      .select('*')
      .order('platform_name', { ascending: true })
      .order('requirement_type', { ascending: true })
      .order('priority', { ascending: false });

    if (platform) {
      query = query.eq('platform_name', platform);
    }

    if (category) {
      query = query.eq('requirement_type', category);
    }

    const { data: qualifications, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching qualifications:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch qualifications' },
        { status: 500 }
      );
    }

    // Calculate overall status
    const totalRequirements = qualifications?.length || 0;
    const completedRequirements = qualifications?.filter(q => q.is_met).length || 0;
    const completionPercentage = totalRequirements > 0 
      ? Math.round((completedRequirements / totalRequirements) * 100) 
      : 0;

    let overallStatus: 'not_qualified' | 'partially_qualified' | 'qualified';
    if (completionPercentage === 100) {
      overallStatus = 'qualified';
    } else if (completionPercentage >= 50) {
      overallStatus = 'partially_qualified';
    } else {
      overallStatus = 'not_qualified';
    }

    // Group by platform and category
    const groupedQualifications = qualifications?.reduce((acc, qual) => {
      if (!acc[qual.platform_name]) {
        acc[qual.platform_name] = {};
      }
      if (!acc[qual.platform_name][qual.requirement_type]) {
        acc[qual.platform_name][qual.requirement_type] = [];
      }
      acc[qual.platform_name][qual.requirement_type].push(qual);
      return acc;
    }, {} as Record<string, Record<string, any[]>>) || {};

    // Calculate platform-specific progress
    const platformProgress = Object.entries(groupedQualifications).map(([platformName, categories]) => {
      const platformTotal = Object.values(categories).flat().length;
      const platformCompleted = Object.values(categories).flat().filter(q => q.is_met).length;
      const platformPercentage = platformTotal > 0 
        ? Math.round((platformCompleted / platformTotal) * 100) 
        : 0;

      return {
        platform: platformName,
        totalRequirements: platformTotal,
        completedRequirements: platformCompleted,
        completionPercentage: platformPercentage,
        status: platformPercentage === 100 ? 'qualified' : 
                platformPercentage >= 50 ? 'partially_qualified' : 'not_qualified',
        categories: Object.entries(categories).map(([categoryName, requirements]) => ({
          category: categoryName,
          total: requirements.length,
          completed: requirements.filter(q => q.is_met).length,
          percentage: requirements.length > 0 
            ? Math.round((requirements.filter(q => q.is_met).length / requirements.length) * 100) 
            : 0
        }))
      };
    });

    return NextResponse.json({
      success: true,
      qualifications: qualifications || [],
      overallStatus,
      completionPercentage,
      totalRequirements,
      completedRequirements,
      platformProgress,
      summary: {
        totalPlatforms: Object.keys(groupedQualifications).length,
        totalCategories: [...new Set(qualifications?.map(q => q.requirement_type) || [])].length,
        averageCompletion: platformProgress.length > 0 
          ? Math.round(platformProgress.reduce((sum, p) => sum + p.completionPercentage, 0) / platformProgress.length)
          : 0
      }
    });

  } catch (error) {
    console.error('❌ Error in qualification status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
