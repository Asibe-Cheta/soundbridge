import { createClient } from '@supabase/supabase-js';
import RequestRoomPublicClient from './RequestRoomPublicClient';

export const dynamic = 'force-dynamic';

export default async function RequestRoomPublicPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: session } = await supabase
    .from('request_room_sessions')
    .select('id,creator_id,session_name,minimum_tip_amount,status')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-[#121212] dark:text-white">
        <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-white/10 dark:bg-black/20">
          This session has ended.
        </div>
      </main>
    );
  }

  const { data: creator } = await supabase
    .from('profiles')
    .select('display_name,username,avatar_url')
    .eq('id', session.creator_id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50 p-6 dark:bg-[#121212]">
      <RequestRoomPublicClient sessionId={sessionId} session={{ ...session, creator }} />
    </main>
  );
}

