export interface NetworkSidebarStats {
  connections: number;
  pendingRequests: number;
}

const DEFAULT_STATS: NetworkSidebarStats = {
  connections: 0,
  pendingRequests: 0,
};

async function fetchJson(url: string) {
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  });

  const json = await res.json().catch(() => null);
  return { ok: res.ok, json };
}

export async function fetchNetworkSidebarStats(): Promise<NetworkSidebarStats> {
  try {
    const [connections, pending] = await Promise.all([
      fetchJson('/api/connections?page=1&limit=1'),
      fetchJson('/api/connections/requests/pending?page=1&limit=50'),
    ]);

    return {
      connections:
        connections.ok && connections.json?.success
          ? connections.json?.data?.pagination?.total || 0
          : 0,
      pendingRequests:
        pending.ok && pending.json?.success
          ? pending.json?.data?.requests?.length || 0
          : 0,
    };
  } catch (error) {
    console.error('Failed to fetch network sidebar stats:', error);
    return DEFAULT_STATS;
  }
}
