/**
 * Daily solvency check (SOUNDBRIDGE_PAYOUTS_REPORT.MD follow-up): compares
 * total wallet liabilities (what SoundBridge owes creators) against actual
 * confirmed funds — live Stripe balance + the manually-entered Fincra
 * funded balance (fincra_funded_balance, updated at each top-up — there is
 * no Fincra balance API wired into this codebase). Alerts all admins
 * in-app if liabilities exceed combined funds. Logs every run to
 * solvency_check_log regardless of outcome.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';
import { currencyService } from '@/src/lib/currency-service';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  return !process.env.CRON_SECRET || authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();

  try {
    // 1. Total wallet liabilities, converted to USD. Each row is already a
    // single currency balance (user_wallets has one row per user per
    // currency) — 16 rows total as of this writing, so fetching all and
    // summing here is simpler than a dedicated SQL aggregate function.
    const { data: wallets, error: walletsError } = await service
      .from('user_wallets')
      .select('balance, currency');
    if (walletsError) throw new Error(`user_wallets query failed: ${walletsError.message}`);

    let walletLiabilitiesUsd = 0;
    const byCurrency: Record<string, number> = {};
    for (const w of wallets ?? []) {
      const amount = Number(w.balance) || 0;
      const currency = String(w.currency || 'USD').toUpperCase();
      byCurrency[currency] = (byCurrency[currency] ?? 0) + amount;
      walletLiabilitiesUsd += currency === 'USD' ? amount : await currencyService.convertCurrency(amount, currency, 'USD');
    }

    // 2. Live Stripe balance (available + pending, every currency Stripe
    // reports, converted to USD — Stripe's own balance object already
    // breaks this down by currency, same as the wallet side above).
    let stripeBalanceUsd = 0;
    const stripeByCurrency: Record<string, number> = {};
    if (stripe) {
      const balance = await stripe.balance.retrieve();
      for (const bucket of [...balance.available, ...balance.pending]) {
        const amount = bucket.amount / 100;
        const currency = bucket.currency.toUpperCase();
        stripeByCurrency[currency] = (stripeByCurrency[currency] ?? 0) + amount;
        stripeBalanceUsd += currency === 'USD' ? amount : await currencyService.convertCurrency(amount, currency, 'USD');
      }
    }

    // 3. Manually-entered Fincra funded balance.
    const { data: fincraRow } = await service
      .from('fincra_funded_balance')
      .select('amount, currency, updated_at')
      .eq('id', 1)
      .maybeSingle();
    const fincraAmount = Number(fincraRow?.amount ?? 0);
    const fincraCurrency = String(fincraRow?.currency ?? 'NGN').toUpperCase();
    const fincraFundedUsd = fincraRow
      ? fincraCurrency === 'USD'
        ? fincraAmount
        : await currencyService.convertCurrency(fincraAmount, fincraCurrency, 'USD')
      : 0;

    const totalFundsUsd = stripeBalanceUsd + fincraFundedUsd;
    const isSolvent = walletLiabilitiesUsd <= totalFundsUsd;

    const details = {
      wallet_liabilities_by_currency: byCurrency,
      stripe_balance_by_currency: stripeByCurrency,
      fincra_funded: fincraRow ? { amount: fincraAmount, currency: fincraCurrency, updated_at: fincraRow.updated_at } : null,
    };

    await service.from('solvency_check_log').insert({
      wallet_liabilities_usd: walletLiabilitiesUsd,
      stripe_balance_usd: stripeBalanceUsd,
      fincra_funded_usd: fincraFundedUsd,
      is_solvent: isSolvent,
      details,
    });

    if (!isSolvent) {
      const { data: admins } = await service
        .from('profiles')
        .select('id')
        .or('is_admin.eq.true,role.eq.admin,role.eq.super_admin')
        .limit(20);

      const message = `Wallet liabilities ($${walletLiabilitiesUsd.toFixed(2)}) exceed combined Stripe + Fincra funds ($${totalFundsUsd.toFixed(2)}). Shortfall: $${(walletLiabilitiesUsd - totalFundsUsd).toFixed(2)}.`;
      const rows = (admins ?? []).map((a) => ({
        user_id: a.id,
        type: 'admin_solvency_alert',
        title: '⚠️ Solvency check failed',
        message,
        link: '/admin/payouts',
        read: false,
        created_at: new Date().toISOString(),
      }));
      if (rows.length) await service.from('notifications').insert(rows);
    }

    return NextResponse.json({
      success: true,
      is_solvent: isSolvent,
      wallet_liabilities_usd: walletLiabilitiesUsd,
      stripe_balance_usd: stripeBalanceUsd,
      fincra_funded_usd: fincraFundedUsd,
      total_funds_usd: totalFundsUsd,
    });
  } catch (error) {
    console.error('[cron/solvency-check] error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
