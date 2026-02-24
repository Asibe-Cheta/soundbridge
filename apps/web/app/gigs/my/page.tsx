'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Flame, Plus, Briefcase } from 'lucide-react';
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

export default function MyGigsPage() {
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
        <p className="text-muted-foreground">Sign in to view your gigs.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back */}
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Header: title + subtitle + primary CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My gigs</h1>
            <p className="mt-2 text-muted-foreground max-w-xl">
              Gigs include both urgent (last-minute) and planned opportunities. All are listed here.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button asChild size="lg" className="w-full sm:w-auto gap-2">
              <Link href="/gigs/new">
                <Plus className="w-5 h-5" />
                Post a gig
              </Link>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {(['all', 'active', 'urgent', 'completed'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {t === 'urgent' && <Flame className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
              {t === 'all' && <Briefcase className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
            Loading your gigs...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-xl border bg-card">
            <CardContent className="py-12 px-6 text-center">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/60 mb-4" />
              <p className="text-lg font-medium text-foreground mb-1">
                {tab === 'urgent' ? 'No urgent gigs yet' : 'No gigs yet'}
              </p>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Post a gig to find musicians or get hired. Choose urgent (last-minute) or planned when you create.
              </p>
              <Button asChild size="lg" className="gap-2">
                <Link href="/gigs/new">
                  <Plus className="w-5 h-5" />
                  Post a gig
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <Card key={item.id} className="rounded-xl border bg-card overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {item.gig_type === 'urgent' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 mb-2">
                          <Flame className="w-3.5 h-3.5" /> Urgent
                        </span>
                      )}
                      <h3 className="font-semibold text-lg text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.gig_type === 'urgent'
                          ? `Status: ${item.urgent_status ?? '—'}${item.date_needed ? ` · ${new Date(item.date_needed).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}` : ''}`
                          : `Planned · ${item.type}`}
                      </p>
                      {item.gig_type === 'urgent' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {(item.response_count ?? 0) > 0 && `${item.response_count} responses · ${item.accepted_count ?? 0} accepted`}
                          {item.expires_at && ` · Expires ${formatCountdown(item.expires_at)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {item.gig_type === 'urgent' && item.urgent_status === 'searching' && (
                        <Button size="default" asChild>
                          <Link href={`/gigs/${item.id}/responses`}>View responses</Link>
                        </Button>
                      )}
                      {item.gig_type === 'urgent' && (item.urgent_status === 'confirmed' || item.urgent_status === 'completed') && item.project_id && (
                        <Button size="default" asChild>
                          <Link href={`/projects/${item.project_id}`}>View project</Link>
                        </Button>
                      )}
                      {item.gig_type !== 'urgent' && (
                        <Button size="default" variant="outline" asChild>
                          <Link href={`/opportunities/${item.id}`}>View</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
