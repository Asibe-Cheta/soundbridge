/**
 * Daily solvency check (SOUNDBRIDGE_PAYOUTS_REPORT.MD follow-up): compares
 * total wallet liabilities (what SoundBridge owes creators) against actual
 * confirmed funds — live Stripe balance + the manually-entered Fincra
 * funded balance (fincra_funded_balance, updated at each top-up — there is
 * no Fincra balance API wired into this codebase). Internal/admin/test
 * account balances are excluded from liabilities (is_internal_team = true,
 * unioned with 7 hardcoded known internal ids — see
 * KNOWN_INTERNAL_ACCOUNT_IDS), and the excluded amount is reported
 * separately rather than silently dropped. Alerts all admins in-app if
 * liabilities exceed combined funds. Logs every run to solvency_check_log
 * regardless of outcome.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';
import { currencyService } from '@/src/lib/currency-service';

/**
 * Known internal/admin/test accounts, confirmed across this session's
 * investigations (the original 3: asibe_cheta, kachi191, ebukaasibe; plus
 * 4 more found during the profile-creation drop-off investigation: 2
 * automated Supabase test accounts, the brand's own account, and one of
 * Justice's own secondary accounts). Hardcoded as a fixed floor — any of
 * these is excluded from solvency liabilities even if its is_internal_team
 * flag is ever unset. Unioned at runtime with every profiles row that
 * currently has is_internal_team = true, so newly-flagged internal accounts
 * are excluded automatically without a code change.
 */
const KNOWN_INTERNAL_ACCOUNT_IDS = [
  'bd8a455d-a54d-45c5-968d-e4cf5e8d928e', // asibe_cheta
  'f02105c6-4ea6-4c05-b106-cd30ac288808', // kachi191
  'd8b347cc-1800-496f-b895-fb489ceff5bd', // ebukaasibe
  '18f4c1af-57b1-4482-8334-9c68beba91e8', // sb-rls-upload-test (automated)
  '751f4518-5d47-4692-8b66-9a1d9a736117', // sb-confirm-test (automated)
  '31b38780-df3e-4ed9-bd1b-51f887f86952', // soundbridgeliveuk (brand account)
  '812c973d-c345-4ce4-9aeb-1ea74e6008f7', // asibejustice (Justice's own)
];

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
    // 0. Build the live internal-account exclusion set: the hardcoded 7
    // known accounts, unioned with every profile currently flagged
    // is_internal_team = true (covers any internal account added since).
    const { data: flaggedInternal, error: internalError } = await service
      .from('profiles')
      .select('id')
      .eq('is_internal_team', true);
    if (internalError) throw new Error(`profiles (is_internal_team) query failed: ${internalError.message}`);

    const internalAccountIds = new Set<string>([
      ...KNOWN_INTERNAL_ACCOUNT_IDS,
      ...(flaggedInternal ?? []).map((p) => p.id),
    ]);

    // 1. Total wallet liabilities, converted to USD. Each row is already a
    // single currency balance (user_wallets has one row per user per
    // currency) — 16 rows total as of this writing, so fetching all and
    // summing here is simpler than a dedicated SQL aggregate function.
    const { data: wallets, error: walletsError } = await service
      .from('user_wallets')
      .select('balance, currency, user_id');
    if (walletsError) throw new Error(`user_wallets query failed: ${walletsError.message}`);

    let walletLiabilitiesUsd = 0;
    let excludedInternalUsd = 0;
    const byCurrency: Record<string, number> = {};
    const excludedByCurrency: Record<string, number> = {};
    for (const w of wallets ?? []) {
      const amount = Number(w.balance) || 0;
      const currency = String(w.currency || 'USD').toUpperCase();
      const amountUsd = currency === 'USD' ? amount : await currencyService.convertCurrency(amount, currency, 'USD');

      if (internalAccountIds.has(w.user_id)) {
        excludedByCurrency[currency] = (excludedByCurrency[currency] ?? 0) + amount;
        excludedInternalUsd += amountUsd;
        continue;
      }

      byCurrency[currency] = (byCurrency[currency] ?? 0) + amount;
      walletLiabilitiesUsd += amountUsd;
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
      excluded_internal_wallet_balance_by_currency: excludedByCurrency,
      excluded_internal_wallet_balance_usd: excludedInternalUsd,
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
      excluded_internal_wallet_balance_usd: excludedInternalUsd,
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
