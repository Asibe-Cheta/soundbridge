import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { BankAccountFormData } from '../../../../../src/lib/types/revenue';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get bank account information - use RPC function to avoid PostgREST issues
    const { data, error } = await supabase
      .rpc('get_user_bank_account', { user_uuid: user.id });

    if (error) {
      console.error('Error fetching bank account:', error);
      // Fallback to direct query if RPC fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('creator_bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return NextResponse.json(
          { error: 'Failed to fetch bank account information' },
          { status: 500 }
        );
      }

      // Handle empty result (no bank account found)
      if (!fallbackData || fallbackData.length === 0) {
        return NextResponse.json({
          has_account: false,
          is_verified: false,
          verification_status: 'pending'
        });
      }

      // Don't return sensitive information like account numbers
      const bankAccount = fallbackData[0];
      const { account_number_encrypted, routing_number_encrypted, ...safeData } = bankAccount;
      return NextResponse.json({
        ...safeData,
        has_account: true,
        // Only show last 4 digits of account number
        account_number_masked: account_number_encrypted ? 
          `****${account_number_encrypted.slice(-4)}` : null
      });
    }

    // Handle RPC result
    if (!data || data.length === 0) {
      return NextResponse.json({
        has_account: false,
        is_verified: false,
        verification_status: 'pending'
      });
    }

    // Don't return sensitive information like account numbers
    const bankAccount = data[0];
    const { account_number_encrypted, routing_number_encrypted, ...safeData } = bankAccount;
    return NextResponse.json({
      ...safeData,
      has_account: true,
      // Only show last 4 digits of account number
      account_number_masked: account_number_encrypted ? 
        `****${account_number_encrypted.slice(-4)}` : null
    });
    
  } catch (error) {
    console.error('Error in bank account GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const bankData: any = await request.json();
    
    // Validate required fields - handle country-specific field structures
    if (!bankData.account_holder_name || !bankData.bank_name || !bankData.account_number) {
      return NextResponse.json(
        { error: 'Account holder name, bank name, and account number are required' },
        { status: 400 }
      );
    }

    // Country-specific validation
    const country = bankData.country || 'US';
    const currency = bankData.currency || 'USD';

    // For African countries and other non-US countries, validate based on country
    if (country === 'NG') {
      // Nigeria: bank_code (3 digits) instead of routing_number
      if (!bankData.bank_code || !/^\d{3}$/.test(bankData.bank_code)) {
        return NextResponse.json(
          { error: 'Nigerian bank code must be 3 digits' },
          { status: 400 }
        );
      }
      if (!/^\d{10}$/.test(bankData.account_number)) {
        return NextResponse.json(
          { error: 'Nigerian account number must be 10 digits' },
          { status: 400 }
        );
      }
    } else if (country === 'GH') {
      // Ghana: swift_code instead of routing_number
      if (!bankData.swift_code || !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}$/.test(bankData.swift_code)) {
        return NextResponse.json(
          { error: 'Ghanaian SWIFT/BIC code must be 8 characters (e.g., GTBIGHAC)' },
          { status: 400 }
        );
      }
      if (!/^\d{10,15}$/.test(bankData.account_number)) {
        return NextResponse.json(
          { error: 'Ghanaian account number must be 10-15 digits' },
          { status: 400 }
        );
      }
    } else if (country === 'KE') {
      // Kenya: swift_code instead of routing_number
      if (!bankData.swift_code || !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}$/.test(bankData.swift_code)) {
        return NextResponse.json(
          { error: 'Kenyan SWIFT/BIC code must be 8 characters (e.g., KCBKENX)' },
          { status: 400 }
        );
      }
      if (!/^\d{10,15}$/.test(bankData.account_number)) {
        return NextResponse.json(
          { error: 'Kenyan account number must be 10-15 digits' },
          { status: 400 }
        );
      }
    } else if (country === 'ZA') {
      // South Africa: branch_code (6 digits) instead of routing_number
      if (!bankData.branch_code || !/^\d{6}$/.test(bankData.branch_code)) {
        return NextResponse.json(
          { error: 'South African branch code must be 6 digits' },
          { status: 400 }
        );
      }
      if (!/^\d{9,12}$/.test(bankData.account_number)) {
        return NextResponse.json(
          { error: 'South African account number must be 9-12 digits' },
          { status: 400 }
        );
      }
    } else {
      // Default: US-style routing number (9 digits)
      // Check if routing_number exists (for backward compatibility)
      if (bankData.routing_number) {
        if (!/^\d{9}$/.test(bankData.routing_number)) {
          return NextResponse.json(
            { error: 'Routing number must be 9 digits' },
            { status: 400 }
          );
        }
      }
      
      // Validate account number (should be at least 4 digits)
      if (!/^\d{4,}$/.test(bankData.account_number)) {
        return NextResponse.json(
          { error: 'Account number must be at least 4 digits' },
          { status: 400 }
        );
      }
    }

    // TODO: In production, encrypt the account details
    // For now, we'll store them as-is (you should implement encryption)
    
    // Prepare routing/bank identifier based on country
    // Store country-specific identifier in routing_number_encrypted field
    // (This field is used generically for routing_number, bank_code, swift_code, branch_code, etc.)
    let routingIdentifier = '';
    if (country === 'NG' && bankData.bank_code) {
      routingIdentifier = bankData.bank_code;
    } else if ((country === 'GH' || country === 'KE') && bankData.swift_code) {
      routingIdentifier = bankData.swift_code;
    } else if (country === 'ZA' && bankData.branch_code) {
      routingIdentifier = bankData.branch_code;
    } else if (bankData.routing_number) {
      routingIdentifier = bankData.routing_number;
    } else if (bankData.sort_code) {
      routingIdentifier = bankData.sort_code;
    } else if (bankData.bsb_code) {
      routingIdentifier = bankData.bsb_code;
    } else if (bankData.iban) {
      routingIdentifier = bankData.iban;
    }
    
    // Save bank account information
    const { data, error } = await supabase
      .from('creator_bank_accounts')
      .upsert({
        user_id: user.id,
        account_holder_name: bankData.account_holder_name,
        bank_name: bankData.bank_name,
        account_number_encrypted: bankData.account_number, // TODO: Encrypt this
        routing_number_encrypted: routingIdentifier || bankData.routing_number || '', // TODO: Encrypt this
        account_type: bankData.account_type || 'checking',
        currency: currency,
        verification_status: 'pending',
        is_verified: false,
        verification_attempts: 0
      });

    if (error) {
      console.error('Error saving bank account:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to save bank account information' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bank account information saved successfully. Verification pending.' 
    });
    
  } catch (error) {
    console.error('Error in bank account POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
