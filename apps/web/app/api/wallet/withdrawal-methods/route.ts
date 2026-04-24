import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { syncFincraWalletWithdrawalMethodsFromCreatorBank } from '@/src/lib/payouts/sync-fincra-withdrawal-method-from-creator-bank';

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

    await syncFincraWalletWithdrawalMethodsFromCreatorBank(supabase, user.id);

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
      account_holder_name: topLevelAccountHolderName,
      bank_name: topLevelBankName,
      account_number: topLevelAccountNumber,
      account_type: topLevelAccountType,
      bank_code: topLevelBankCode,
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
    let insertCountry: string | undefined = country;
    let insertCurrency: string | undefined = currency;

    switch (method_type) {
      case 'bank_transfer': {
        // Defensive extraction: try top level then bank_details (WEB_TEAM_BANK_ACCOUNTS_NULL_FIELDS_FIX.md)
        const bd = bank_details || {};
        const accountHolderName =
          topLevelAccountHolderName ?? bd.account_holder_name ?? null;
        const bankName =
          topLevelBankName ?? bd.bank_name ?? null;
        const accountNumber =
          topLevelAccountNumber ?? bd.account_number ?? bd.iban ?? null;
        const accountType =
          topLevelAccountType ?? bd.account_type ?? 'checking';
        const bankCode =
          topLevelBankCode ?? bd.bank_code ?? bd.swift_code ?? bd.routing_number ?? bd.branch_code ?? bd.sort_code ?? '';
        const curr = currency ?? bd.currency ?? null;
        const ctry = country ?? bd.country ?? null;

        if (!accountHolderName || !String(accountHolderName).trim()) {
          return NextResponse.json(
            { error: 'Account holder name is required' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        if (!bankName || !String(bankName).trim()) {
          return NextResponse.json(
            { error: 'Bank name is required' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        if (!accountNumber || !String(accountNumber).trim()) {
          return NextResponse.json(
            { error: 'Account number (or IBAN) is required' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        if (!curr || !String(curr).trim()) {
          return NextResponse.json(
            { error: 'Currency is required' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        if (!ctry || !String(ctry).trim()) {
          return NextResponse.json(
            { error: 'Country is required' },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        insertCountry = ctry;
        insertCurrency = curr;
        encryptedDetails = {
          account_holder_name: String(accountHolderName).trim(),
          bank_name: String(bankName).trim(),
          account_number: String(accountNumber).trim(),
          routing_number: String(bankCode).trim(),
          account_type: accountType,
          currency: String(curr).trim()
        };
        break;
      }
        
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

    // Create withdrawal method with country information.
    // Auto-verify on creation so Withdrawal screen does not show "Pending" (WEB_TEAM_ACCOUNT_VERIFICATION_STATUS.md).
    const { data: method, error: methodError } = await supabase
      .from('wallet_withdrawal_methods')
      .insert({
        user_id: user.id,
        method_type: method_type,
        method_name: method_name,
        country: insertCountry ?? null,
        currency: insertCurrency ?? null,
        banking_system: method_type === 'bank_transfer' ? 'ACH' : null,
        encrypted_details: encryptedDetails,
        is_verified: true,
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
