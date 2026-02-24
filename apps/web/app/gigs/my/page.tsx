'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Flame, Plus } from 'lucide-react';
import { Button, Card, CardContent } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { fetchWithAuth } from '@/src/lib/fetchWithAuth';

interface MineItem {
  id: string;
  title: string;
  type: string;
  is_active: boolean;
  interest_count: number;
  created_at: string;
  expires_at?: string | null;
  gig_type?: 'urgent' | 'planned';
  urgent_status?: string;
  skill_required?: string;
  date_needed?: string;
  payment_amount?: number;
  payment_currency?: string;
  selected_provider_id?: string | null;
  response_count?: number;
  accepted_count?: number;
  project_id?: string | null;
}

type Tab = 'all' | 'active' | 'urgent' | 'completed';

function formatCountdown(expiresAt: string | null | undefined): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m`;
}

export default function MyOpportunitiesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('all');
  const [items, setItems] = useState<MineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetchWithAuth('/api/opportunities/mine');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setItems(data.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const urgentOnly = items.filter((i) => i.gig_type === 'urgent');
  const filtered =
    tab === 'urgent'
      ? urgentOnly
      : tab === 'active'
        ? items.filter((i) => i.urgent_status === 'searching' || i.urgent_status === 'confirmed' || (i.gig_type !== 'urgent' && i.is_active))
        : tab === 'completed'
          ? items.filter((i) => i.urgent_status === 'completed' || (i.gig_type !== 'urgent' && !i.is_active))
          : items;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Sign in to view your opportunities.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-8 max-w-xl mx-auto">
      <Link href="/feed" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <h1 className="text-2xl font-semibold mb-4">My opportunities</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['all', 'active', 'urgent', 'completed'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'urgent' && (
        <Button asChild className="w-full mb-6" variant="default">
          <Link href="/gigs/urgent/create">
            <Plus className="w-4 h-4 mr-2 inline" />
            Post Urgent Gig
          </Link>
        </Button>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card variant="glass">
          <CardContent className="pt-6 text-center text-muted-foreground">
            {tab === 'urgent' ? 'No urgent gigs. Post one to get started.' : 'No opportunities yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <Card key={item.id} variant="glass">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {item.gig_type === 'urgent' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                        <Flame className="w-3 h-3" /> URGENT
                      </span>
                    )}
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.gig_type === 'urgent'
                        ? `Status: ${item.urgent_status ?? '—'}${item.date_needed ? ` · ${new Date(item.date_needed).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}` : ''}`
                        : `Type: ${item.type}`}
                    </p>
                    {item.gig_type === 'urgent' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {(item.response_count ?? 0) > 0 && `${item.response_count} responses · ${item.accepted_count ?? 0} accepted`}
                        {item.expires_at && ` · Expires ${formatCountdown(item.expires_at)}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {item.gig_type === 'urgent' && item.urgent_status === 'searching' && (
                    <Button size="sm" asChild>
                      <Link href={`/gigs/${item.id}/responses`}>View Responses →</Link>
                    </Button>
                  )}
                  {item.gig_type === 'urgent' && (item.urgent_status === 'confirmed' || item.urgent_status === 'completed') && item.project_id && (
                    <Button size="sm" asChild>
                      <Link href={`/projects/${item.project_id}`}>View Project →</Link>
                    </Button>
                  )}
                  {item.gig_type !== 'urgent' && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/opportunities/${item.id}`}>View</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
