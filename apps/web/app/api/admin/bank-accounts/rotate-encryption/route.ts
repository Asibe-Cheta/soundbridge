import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminAccessDenied } from '@/src/lib/admin-auth';
import { encryptSecret, looksEncrypted } from '@/src/lib/encryption';

/**
 * POST /api/admin/bank-accounts/rotate-encryption
 * One-time (idempotent, safe to re-run) migration: encrypts any creator_bank_accounts
 * row still storing plaintext account_number_encrypted/routing_number_encrypted, and
 * backfills account_last4 for display. See WEB_TEAM_WITHDRAWAL_VERIFICATION_BUG_RESPONSE.MD
 * — encryption was scaffolded (read paths already handle encrypted-or-plaintext) but the
 * write side never actually encrypted, so every existing row is still plaintext today.
 *
 * Admin-only, and defaults to a dry run — pass { "dryRun": false } to actually write.
 * Safe to re-run: rows already encrypted (looksEncrypted) are skipped every time.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isAdminAccessDenied(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false; // default true — must explicitly opt into writing

  const supabase = admin.serviceClient;

  const { data: rows, error } = await supabase
    .from('creator_bank_accounts')
    .select('id, account_number_encrypted, routing_number_encrypted, account_last4');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let scanned = 0;
  let alreadyEncrypted = 0;
  let rotated = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const row of rows ?? []) {
    scanned++;
    const accountNumber = String(row.account_number_encrypted ?? '');
    const routingNumber = String(row.routing_number_encrypted ?? '');

    // A row only needs rotation if either field is still plaintext.
    const accountAlreadyEncrypted = !accountNumber || looksEncrypted(accountNumber);
    const routingAlreadyEncrypted = !routingNumber || looksEncrypted(routingNumber);
    if (accountAlreadyEncrypted && routingAlreadyEncrypted) {
      alreadyEncrypted++;
      continue;
    }

    if (dryRun) {
      rotated++;
      continue;
    }

    try {
      const update: Record<string, string> = {};
      if (!accountAlreadyEncrypted) {
        update.account_number_encrypted = encryptSecret(accountNumber);
        if (!row.account_last4) update.account_last4 = accountNumber.slice(-4);
      }
      if (!routingAlreadyEncrypted) {
        update.routing_number_encrypted = encryptSecret(routingNumber);
      }

      const { error: updateError } = await supabase
        .from('creator_bank_accounts')
        .update(update)
        .eq('id', row.id);

      if (updateError) {
        errors.push({ id: row.id, error: updateError.message });
      } else {
        rotated++;
      }
    } catch (e: unknown) {
      errors.push({ id: row.id, error: e instanceof Error ? e.message : 'Unknown error' });
    }
  }

  return NextResponse.json({
    dryRun,
    scanned,
    alreadyEncrypted,
    rotated,
    errors,
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
