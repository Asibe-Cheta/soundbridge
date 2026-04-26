import RequestRoomProjectionClient from './projection-client';

export const dynamic = 'force-dynamic';

export default async function RequestRoomProjectionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <RequestRoomProjectionClient sessionId={sessionId} />;
}

