/**
 * Admin Payout API Endpoint
 * 
 * POST /api/admin/payouts/initiate
 * 
 * Allows admins to initiate payouts to creators via Wise.
 * Supports both single and batch payouts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { payoutToCreator } from '@/src/lib/wise/payout';
import { batchPayout, type BatchPayoutItem } from '@/src/lib/wise/batch-payout';
import type { PayoutToCreatorParams } from '@/src/lib/wise/payout';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Check if user is admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  
  // Check profiles.role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'admin') {
    return true;
  }

  // Check user_roles table
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();

  return !!userRole;
}

/**
 * POST /api/admin/payouts/initiate
 * 
 * Initiate payout(s) to creator(s)
 * 
 * Body (single payout):
 * {
 *   "creatorId": "user-123",
 *   "amount": 50000,
 *   "currency": "NGN",
 *   "bankAccountNumber": "1234567890",
 *   "bankCode": "044",
 *   "accountHolderName": "John Doe",
 *   "reason": "Revenue share payout"
 * }
 * 
 * Body (batch payout):
 * {
 *   "batch": true,
 *   "payouts": [
 *     {
 *       "creatorId": "user-123",
 *       "amount": 50000,
 *       "currency": "NGN",
 *       "bankDetails": {
 *         "accountNumber": "1234567890",
 *         "bankCode": "044",
 *         "accountHolderName": "John Doe"
 *       },
 *       "reason": "Revenue share"
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServiceClient();
    const authHeader = request.headers.get('authorization');
    
    let userId: string | null = null;

    // Try to get user from Bearer token
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // If no user from token, try to get from session (for web requests)
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { batch, payouts, ...singlePayoutParams } = body;

    // Handle batch payout
    if (batch && Array.isArray(payouts)) {
      console.log(`📦 Admin ${userId} initiating batch payout: ${payouts.length} creators`);

      // Validate batch structure
      if (payouts.length === 0) {
        return NextResponse.json(
          { error: 'Payouts array cannot be empty' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate each payout item
      for (const payout of payouts) {
        if (!payout.creatorId || !payout.amount || !payout.currency || !payout.bankDetails) {
          return NextResponse.json(
            { error: 'Invalid payout item: missing required fields' },
            { status: 400, headers: corsHeaders }
          );
        }
      }

      try {
        const batchPayoutItems: BatchPayoutItem[] = payouts.map((p: any) => ({
          creatorId: p.creatorId,
          amount: p.amount,
          currency: p.currency,
          bankDetails: {
            accountNumber: p.bankDetails.accountNumber,
            bankCode: p.bankDetails.bankCode,
            accountHolderName: p.bankDetails.accountHolderName,
          },
          reason: p.reason,
        }));

        const results = await batchPayout(batchPayoutItems, {
          continueOnError: true, // Continue processing even if some fail
          maxConcurrent: 5, // Process 5 payouts concurrently
        });

        return NextResponse.json(
          {
            success: true,
            message: `Batch payout processed: ${results.successful} successful, ${results.failedCount} failed`,
            results,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error: any) {
        console.error('❌ Batch payout error:', error);
        return NextResponse.json(
          {
            error: 'Batch payout failed',
            message: error.message,
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Handle single payout
    else {
      console.log(`💰 Admin ${userId} initiating single payout to creator ${singlePayoutParams.creatorId}`);

      // Validate single payout params
      if (!singlePayoutParams.creatorId || 
          !singlePayoutParams.amount || 
          !singlePayoutParams.currency ||
          !singlePayoutParams.bankAccountNumber ||
          !singlePayoutParams.bankCode ||
          !singlePayoutParams.accountHolderName) {
        return NextResponse.json(
          { error: 'Missing required fields: creatorId, amount, currency, bankAccountNumber, bankCode, accountHolderName' },
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        const payoutParams: PayoutToCreatorParams = {
          creatorId: singlePayoutParams.creatorId,
          amount: singlePayoutParams.amount,
          currency: singlePayoutParams.currency,
          bankAccountNumber: singlePayoutParams.bankAccountNumber,
          bankCode: singlePayoutParams.bankCode,
          accountHolderName: singlePayoutParams.accountHolderName,
          reason: singlePayoutParams.reason,
          sourceCurrency: singlePayoutParams.sourceCurrency || 'GBP',
        };

        const payout = await payoutToCreator(payoutParams);

        return NextResponse.json(
          {
            success: true,
            message: 'Payout initiated successfully',
            payout,
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (error: any) {
        console.error('❌ Payout error:', error);
        return NextResponse.json(
          {
            error: 'Payout failed',
            message: error.message,
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }
  } catch (error: any) {
    console.error('❌ Admin payout API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/admin/payouts
 * 
 * Get payout history (optional - for admin dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServiceClient();
    const authHeader = request.headers.get('authorization');
    
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const creatorId = searchParams.get('creatorId');

    // Build query
    let query = supabase
      .from('wise_payouts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    const { data: payouts, error } = await query;

    if (error) {
      console.error('Error fetching payouts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payouts' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        payouts: payouts || [],
        limit,
        offset,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Admin payout GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

