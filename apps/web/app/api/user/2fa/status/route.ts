/**
 * GET /api/user/2fa/status
 * 
 * Get 2FA status for the authenticated user
 * Returns whether 2FA is enabled and backup code count
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 2FA Status: Starting...');
    
    // ================================================
    // 1. Authenticate user
    // ================================================
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // ================================================
    // 2. Check if 2FA is enabled
    // ================================================
    const { data: secret, error: secretError } = await supabase
      .from('two_factor_secrets')
      .select('id, method, created_at')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (secretError) {
      console.error('❌ Error checking 2FA status:', secretError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to check 2FA status',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    const isEnabled = !!secret;
    console.log('✅ 2FA enabled:', isEnabled);
    
    // ================================================
    // 3. Count backup codes (if 2FA is enabled)
    // ================================================
    let backupCodesCount = 0;
    let unusedBackupCodesCount = 0;
    
    if (isEnabled) {
      // Total backup codes
      const { count: totalCount } = await supabase
        .from('two_factor_backup_codes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      backupCodesCount = totalCount || 0;
      
      // Unused backup codes (not used and not expired)
      const { count: unusedCount } = await supabase
        .from('two_factor_backup_codes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString());
      
      unusedBackupCodesCount = unusedCount || 0;
      
      console.log('✅ Backup codes:', backupCodesCount, 'total,', unusedBackupCodesCount, 'unused');
    }
    
    // ================================================
    // 4. Get recent audit logs (last 10)
    // ================================================
    const { data: recentActivity, error: activityError } = await supabase
      .from('two_factor_audit_log')
      .select('action, method, success, created_at, ip_address')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (activityError) {
      console.error('⚠️ Failed to retrieve activity log:', activityError);
      // Continue without activity log
    }
    
    // ================================================
    // 5. Return response
    // ================================================
    return NextResponse.json({
      success: true,
      data: {
        enabled: isEnabled,
        method: secret?.method || null,
        enabledAt: secret?.created_at || null,
        backupCodes: {
          total: backupCodesCount,
          unused: unusedBackupCodesCount,
          needsRegeneration: unusedBackupCodesCount <= 2,
        },
        recentActivity: recentActivity || [],
      },
    });
    
  } catch (error: any) {
    console.error('❌ Unexpected error in status:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// Method not allowed for other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}

