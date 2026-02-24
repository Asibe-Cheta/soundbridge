import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-08-27.basil' });
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    let supabase;
    let user;
    let authError;

    // Check for Authorization header (mobile app) - try ALL mobile app headers
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
      // Mobile app authentication
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      user = userData.user;
      authError = userError;
    } else {
      // Web app authentication
      const cookieStore = cookies();
      supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      user = userData;
      authError = userError;
    }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { transaction_id, withdrawal_method_id } = body;

    if (!transaction_id || !withdrawal_method_id) {
      return NextResponse.json(
        { error: 'Transaction ID and withdrawal method ID are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', transaction_id as any)
      .eq('user_id', user.id as any)
      .single() as { data: any; error: any };

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { error: 'Transaction is not pending' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get withdrawal method details
    const { data: withdrawalMethod, error: methodError } = await supabase
      .from('wallet_withdrawal_methods')
      .select('*')
      .eq('id', withdrawal_method_id as any)
      .eq('user_id', user.id as any)
      .single() as { data: any; error: any };

    if (methodError || !withdrawalMethod) {
      return NextResponse.json(
        { error: 'Withdrawal method not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!withdrawalMethod.is_verified) {
      return NextResponse.json(
        { error: 'Withdrawal method is not verified' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Process withdrawal based on method type
    let transferResult;
    
    try {
      switch (withdrawalMethod.method_type) {
        case 'bank_transfer':
          transferResult = await processBankTransfer(transaction, withdrawalMethod);
          break;
        case 'paypal':
          transferResult = await processPayPalTransfer(transaction, withdrawalMethod);
          break;
        case 'crypto':
          transferResult = await processCryptoTransfer(transaction, withdrawalMethod);
          break;
        case 'prepaid_card':
          transferResult = await processCardTransfer(transaction, withdrawalMethod);
          break;
        default:
          return NextResponse.json(
            { error: 'Unsupported withdrawal method' },
            { status: 400, headers: corsHeaders }
          );
      }
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      
      // Update transaction status to failed
      await (supabase
        .from('wallet_transactions') as any)
        .update({ 
          status: 'failed',
          metadata: { 
            ...transaction.metadata,
            error: error.message,
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', transaction_id);

      return NextResponse.json(
        { error: 'Failed to process withdrawal', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (transferResult.success) {
      // Update transaction status to completed
      await (supabase
        .from('wallet_transactions') as any)
        .update({ 
          status: 'completed',
          metadata: { 
            ...transaction.metadata,
            transfer_id: transferResult.transferId,
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', transaction_id);

      return NextResponse.json(
        { 
          success: true,
          transferId: transferResult.transferId,
          message: 'Withdrawal processed successfully'
        },
        { status: 200, headers: corsHeaders }
      );
    } else {
      // Update transaction status to failed
      await (supabase
        .from('wallet_transactions') as any)
        .update({ 
          status: 'failed',
          metadata: { 
            ...transaction.metadata,
            error: transferResult.error,
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', transaction_id);

      return NextResponse.json(
        { error: transferResult.error },
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error: any) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Unknown error'}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Bank Transfer Processing
async function processBankTransfer(transaction: any, method: any) {
  try {
    const details = method.encrypted_details;
    
    // Create Stripe transfer to connected account
    const transfer = await getStripe().transfers.create({
      amount: Math.abs(transaction.amount) * 100, // Convert to cents
      currency: transaction.currency.toLowerCase(),
      destination: method.stripe_account_id, // User's Stripe Connect account
      transfer_group: `withdrawal_${transaction.id}`,
      metadata: {
        transaction_id: transaction.id,
        user_id: transaction.user_id,
        withdrawal_method: 'bank_transfer'
      }
    });

    return {
      success: true,
      transferId: transfer.id
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

// PayPal Transfer Processing
async function processPayPalTransfer(transaction: any, method: any) {
  try {
    const details = method.encrypted_details;
    
    // TODO: Implement PayPal API integration
    // This would involve calling PayPal's Payout API
    // For now, we'll simulate the process
    
    return {
      success: true,
      transferId: `paypal_${Date.now()}`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Crypto Transfer Processing
async function processCryptoTransfer(transaction: any, method: any) {
  try {
    const details = method.encrypted_details;
    
    // TODO: Implement crypto wallet integration
    // This would involve calling crypto exchange APIs
    // For now, we'll simulate the process
    
    return {
      success: true,
      transferId: `crypto_${Date.now()}`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Prepaid Card Transfer Processing
async function processCardTransfer(transaction: any, method: any) {
  try {
    const details = method.encrypted_details;
    
    // TODO: Implement prepaid card transfer
    // This would involve calling card processor APIs
    // For now, we'll simulate the process
    
    return {
      success: true,
      transferId: `card_${Date.now()}`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Handle preflight CORS requests
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    { message: 'CORS preflight' },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
      }
    }
  );
}
