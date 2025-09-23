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
    const bankData: BankAccountFormData = await request.json();
    
    // Validate required fields
    if (!bankData.account_holder_name || !bankData.bank_name || 
        !bankData.account_number || !bankData.routing_number) {
      return NextResponse.json(
        { error: 'All bank account fields are required' },
        { status: 400 }
      );
    }

    // Validate routing number (should be 9 digits)
    if (!/^\d{9}$/.test(bankData.routing_number)) {
      return NextResponse.json(
        { error: 'Routing number must be 9 digits' },
        { status: 400 }
      );
    }

    // Validate account number (should be at least 4 digits)
    if (!/^\d{4,}$/.test(bankData.account_number)) {
      return NextResponse.json(
        { error: 'Account number must be at least 4 digits' },
        { status: 400 }
      );
    }

    // TODO: In production, encrypt the account details
    // For now, we'll store them as-is (you should implement encryption)
    
    // Save bank account information
    const { data, error } = await supabase
      .from('creator_bank_accounts')
      .upsert({
        user_id: user.id,
        account_holder_name: bankData.account_holder_name,
        bank_name: bankData.bank_name,
        account_number_encrypted: bankData.account_number, // TODO: Encrypt this
        routing_number_encrypted: bankData.routing_number, // TODO: Encrypt this
        account_type: bankData.account_type,
        currency: bankData.currency || 'USD',
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
