import type { SupabaseClient } from '@supabase/supabase-js';

function tipperThankYouName(params: {
  isAnonymous: boolean;
  displayName?: string | null;
  email?: string | null;
}): string {
  if (params.isAnonymous) return 'there';
  const display = params.displayName?.trim();
  if (display) return display;
  const local = params.email?.split('@')[0]?.trim();
  if (local) return local;
  return 'friend';
}

/** Post-tip thank-you body shared by confirm-tip flow and live_session_tips trigger SQL. */
export function buildTipThankYouMessageContent(
  tipperName: string,
  creatorUsername: string | null | undefined,
): string {
  const base = `Thank you so much ${tipperName}, you are amazing!`;
  const username = creatorUsername?.trim().replace(/^@/, '');
  if (!username) return base;
  return `${base}\n\nYou are now part of my SoundBridge community. Stay connected and listen to my music here:\nsoundbridge.live/${username}/home`;
}

/**
 * Auto thank-you DM from creator → tipper after tip settles.
 * Never throws; does not block tip confirmation.
 */
export async function sendTipThankYouDm(
  supabase: SupabaseClient,
  params: {
    creatorId: string;
    tipperId: string;
    paymentIntentId: string;
    isAnonymous: boolean;
    tipRowId?: string | null;
  },
): Promise<void> {
  try {
    if (!params.creatorId || !params.tipperId || params.creatorId === params.tipperId) {
      return;
    }

    if (params.tipRowId) {
      const { data: tipRow } = await supabase
        .from('tips')
        .select('thank_you_message_id')
        .eq('id', params.tipRowId)
        .maybeSingle();
      if (tipRow?.thank_you_message_id) {
        return;
      }
    }

    const [{ data: tipperProfile }, { data: creatorProfile }] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', params.tipperId)
        .maybeSingle(),
      supabase.from('profiles').select('username').eq('id', params.creatorId).maybeSingle(),
    ]);

    const name = tipperThankYouName({
      isAnonymous: params.isAnonymous,
      displayName: tipperProfile?.display_name,
      email: tipperProfile?.email,
    });
    const content = buildTipThankYouMessageContent(name, creatorProfile?.username);

    const { data: message, error: insertErr } = await supabase
      .from('messages')
      .insert({
        sender_id: params.creatorId,
        recipient_id: params.tipperId,
        content,
        message_type: 'text',
        is_read: false,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[tip-thank-you-dm] insert failed:', insertErr);
      return;
    }

    if (params.tipRowId && message?.id) {
      const { error: updErr } = await supabase
        .from('tips')
        .update({ thank_you_message_id: message.id })
        .eq('id', params.tipRowId)
        .is('thank_you_message_id', null);
      if (updErr) {
        console.warn('[tip-thank-you-dm] could not mark tip row:', updErr);
      }
    }
  } catch (err) {
    console.error('[tip-thank-you-dm] unexpected:', err);
  }
}
