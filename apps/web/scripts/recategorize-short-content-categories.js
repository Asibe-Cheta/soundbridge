/**
 * One-time recategorisation: short podcast/audiobook uploads → music.
 * Usage: node apps/web/scripts/recategorize-short-content-categories.js
 * Requires: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */
const { createClient } = require('@supabase/supabase-js');

const PODCAST_MIN = 480;
const AUDIOBOOK_MIN = 900;

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const { count: podcastBefore } = await supabase
    .from('audio_tracks')
    .select('id', { count: 'exact', head: true })
    .eq('content_type', 'podcast')
    .gt('duration', 0)
    .lt('duration', PODCAST_MIN);

  const { count: audiobookBefore } = await supabase
    .from('audio_tracks')
    .select('id', { count: 'exact', head: true })
    .eq('content_type', 'audio_book')
    .gt('duration', 0)
    .lt('duration', AUDIOBOOK_MIN);

  const { error: podcastErr } = await supabase
    .from('audio_tracks')
    .update({ content_type: 'music' })
    .eq('content_type', 'podcast')
    .gt('duration', 0)
    .lt('duration', PODCAST_MIN);

  if (podcastErr) {
    console.error('Podcast recategorisation failed:', podcastErr.message);
    process.exit(1);
  }

  const { error: audiobookErr } = await supabase
    .from('audio_tracks')
    .update({ content_type: 'music' })
    .eq('content_type', 'audio_book')
    .gt('duration', 0)
    .lt('duration', AUDIOBOOK_MIN);

  if (audiobookErr) {
    console.error('Audiobook recategorisation failed:', audiobookErr.message);
    process.exit(1);
  }

  console.log('Content category duration moderation — summary');
  console.log(`  Podcast → Music:   ${podcastBefore ?? 0} track(s) moved`);
  console.log(`  Audiobook → Music: ${audiobookBefore ?? 0} track(s) moved`);

  const { count: podcastRemaining } = await supabase
    .from('audio_tracks')
    .select('id', { count: 'exact', head: true })
    .eq('content_type', 'podcast')
    .gt('duration', 0)
    .lt('duration', PODCAST_MIN);

  const { count: audiobookRemaining } = await supabase
    .from('audio_tracks')
    .select('id', { count: 'exact', head: true })
    .eq('content_type', 'audio_book')
    .gt('duration', 0)
    .lt('duration', AUDIOBOOK_MIN);

  console.log(`  Remaining miscategorised podcast:    ${podcastRemaining ?? 0}`);
  console.log(`  Remaining miscategorised audiobook:  ${audiobookRemaining ?? 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
