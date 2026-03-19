import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { getMinPayoutForCurrency } from '@/src/lib/payout-minimum';
import { SendGridService } from '@/src/lib/sendgrid-service';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const { amount, currency = 'USD' } = await request.json();
    const minPayout = getMinPayoutForCurrency(currency);

    // Validate required fields (currency-aware minimum: $30 Wise, $20 others)
    if (!amount || typeof amount !== 'number' || amount < minPayout) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is $${minPayout}.00 for ${currency || 'your account'}.` },
        { status: 400 }
      );
    }

    // Use service-role RPC that accepts creator_id so we don't depend on auth.uid() in RPC context
    const service = createServiceClient();
    const { data, error } = await service.rpc('create_payout_request_for_user', {
      p_creator_id: user.id,
      p_amount: amount,
      p_currency: currency
    });

    if (error) {
      console.error('create_payout_request_for_user RPC error:', {
        message: error.message,
        code: (error as { code?: string })?.code,
        details: (error as { details?: string })?.details,
        hint: (error as { hint?: string })?.hint,
      });
      return NextResponse.json(
        { error: 'Failed to create payout request', details: error.message },
        { status: 500 }
      );
    }

    if (!data.success) {
      const rpcError = (data as { error?: string })?.error ?? 'Unknown error';
      const eligibility = (data as { eligibility?: unknown })?.eligibility;
      console.error('create_payout_request_for_user rejected:', {
        error: rpcError,
        creator_id: user.id,
        amount,
        currency,
        eligibility,
      });
      return NextResponse.json(
        { error: rpcError, eligibility: eligibility ?? undefined },
        { status: 400 }
      );
    }

    // MVP admin alert: notify admin immediately about the new payout request.
    // Never fail the payout request if email sending fails.
    try {
      const { data: profile } = await service
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

      const { data: bank } = await service
        .from('creator_bank_accounts')
        .select('currency, bank_name')
        .eq('user_id', user.id)
        .eq('is_verified', true)
        .maybeSingle();

      const bankCurrency = (bank?.currency ?? 'USD').toUpperCase();
      const bankCountry =
        bankCurrency === 'NGN' ? 'Nigeria' :
        bankCurrency === 'GHS' ? 'Ghana' :
        bankCurrency === 'KES' ? 'Kenya' :
        bankCurrency;

      const symbol =
        currency === 'GBP' ? '£' :
        currency === 'EUR' ? '€' :
        currency === 'NGN' ? '₦' :
        currency === 'GHS' ? '₵' :
        currency === 'KES' ? 'KSh' :
        '$';

      const displayName = profile?.display_name || 'Creator';
      const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/admin/payouts`;

      const requestId = (data as { request_id?: string }).request_id;

      const html = `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.4;">
          <h2 style="margin: 0 0 10px;">New payout request</h2>
          <p style="margin: 0 0 8px;">Creator: <b>${displayName}</b></p>
          <p style="margin: 0 0 8px;">Amount: <b>${symbol}${Number(amount).toFixed(2)}</b> (${currency.toUpperCase()})</p>
          <p style="margin: 0 0 8px;">Bank: <b>${bankCountry}</b></p>
          <p style="margin: 0 0 16px; color: #444;">Payout request ID: <code>${requestId || ''}</code></p>
          <a href="${adminUrl}" style="display:inline-block; padding: 10px 14px; background: #2563eb; color: white; text-decoration:none; border-radius: 6px;">
            Review & approve in Admin Dashboard
          </a>
          <p style="margin-top: 16px; color: #666; font-size: 12px;">Support: contact@soundbridge.live</p>
        </div>
      `;

      await SendGridService.sendHtmlEmail(
        'contact@soundbridge.live',
        `New payout request — ${symbol}${Number(amount).toFixed(2)} from ${displayName}`,
        html
      );
    } catch (e) {
      console.error('Admin payout alert email failed:', e);
    }

    return NextResponse.json({
      success: true,
      request_id: data.request_id,
      message: data.message
    });
    
  } catch (error) {
    console.error('Error in payout request endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
