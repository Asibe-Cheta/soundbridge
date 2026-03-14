import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

/**
 * Withdrawal methods API — available to all authenticated users (no creator role required).
 * @see WEB_TEAM_BANK_ACCOUNTS_FOR_ALL_USERS.md
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Get user's withdrawal methods
    const { data: methods, error: methodsError } = await supabase
      .from('wallet_withdrawal_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (methodsError) {
      console.error('Error fetching withdrawal methods:', methodsError);
      return NextResponse.json(
        { error: 'Failed to fetch withdrawal methods' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { methods: methods || [], count: methods?.length || 0 },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('Error fetching withdrawal methods:', error);
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const body = await request.json();
    const {
      method_type,
      method_name,
      country,
      currency,
      account_holder_name: topLevelAccountHolderName, // Top-level required for DB/constraints; see WEB_TEAM_BANK_ACCOUNTS_FOR_ALL.md
      bank_details,
      paypal_email,
      crypto_address,
      card_details
    } = body;

    if (!method_type || !method_name) {
      return NextResponse.json(
        { error: 'Method type and name are required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Encrypt sensitive details based on method type
    let encryptedDetails: Record<string, unknown> = {};

    switch (method_type) {
      case 'bank_transfer':
        if (!bank_details) {
          return NextResponse.json(
            { error: 'Bank details are required for bank transfer' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        // Prefer top-level account_holder_name (required by DB constraints when writing to creator_bank_accounts-style schemas)
        const accountHolderName = topLevelAccountHolderName ?? bank_details.account_holder_name;
        if (!accountHolderName) {
          return NextResponse.json(
            { error: 'Account holder name is required (send as top-level account_holder_name or inside bank_details)' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        encryptedDetails = {
          account_holder_name: accountHolderName,
          bank_name: bank_details.bank_name,
          account_number: bank_details.account_number, // TODO: Encrypt this
          routing_number: bank_details.routing_number, // TODO: Encrypt this
          account_type: bank_details.account_type,
          currency: currency || bank_details.currency || 'USD' // Use currency from request body
        };
        break;
        
      case 'paypal':
        if (!paypal_email) {
          return NextResponse.json(
            { error: 'PayPal email is required' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        encryptedDetails = {
          email: paypal_email
        };
        break;
        
      case 'crypto':
        if (!crypto_address) {
          return NextResponse.json(
            { error: 'Crypto address is required' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        encryptedDetails = {
          address: crypto_address.address,
          currency: crypto_address.currency,
          network: crypto_address.network
        };
        break;
        
      case 'prepaid_card':
        if (!card_details) {
          return NextResponse.json(
            { error: 'Card details are required' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        encryptedDetails = {
          card_number: card_details.card_number, // TODO: Encrypt this
          card_holder_name: card_details.card_holder_name,
          expiry_date: card_details.expiry_date,
          cvv: card_details.cvv // TODO: Encrypt this
        };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid method type' },
          { status: 400, headers: CORS_HEADERS }
        );
    }

    // Create withdrawal method with country information
    const { data: method, error: methodError } = await supabase
      .from('wallet_withdrawal_methods')
      .insert({
        user_id: user.id,
        method_type: method_type,
        method_name: method_name,
        country: country,
        currency: currency,
        banking_system: method_type === 'bank_transfer' ? 'ACH' : null,
        encrypted_details: encryptedDetails,
        is_verified: false,
        is_default: false
      })
      .select()
      .single();

    if (methodError) {
      console.error('Error creating withdrawal method:', methodError);
      return NextResponse.json(
        { error: 'Failed to create withdrawal method' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, method, message: 'Withdrawal method added successfully' },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('Error creating withdrawal method:', error);
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
