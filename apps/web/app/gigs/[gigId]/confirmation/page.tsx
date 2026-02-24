'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, MessageCircle } from 'lucide-react';
import { Button, Card, CardContent } from '@/src/components/ui';
import { getUrgentGig, getGigResponses } from '@/src/services/urgentGigService';

export default function GigConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const gigId = params.gigId as string;
  const projectId = searchParams.get('projectId');

  const [providerName, setProviderName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gigId || !projectId) return;
    (async () => {
      try {
        const [gig, responses] = await Promise.all([getUrgentGig(gigId), getGigResponses(gigId)]);
        const selected = responses.find((r) => r.status === 'accepted');
        setProviderName(selected?.provider?.display_name ?? 'Your provider');
      } catch {
        setProviderName('Your provider');
      } finally {
        setLoading(false);
      }
    })();
  }, [gigId, projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-8 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold">You&apos;ve selected {providerName}!</h1>
      </div>

      <Card variant="glass" className="mb-6">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-2">Payment held in escrow until the gig is complete.</p>
          <p className="text-sm mt-2">
            {providerName} will receive a confirmation notification. You&apos;ll both receive a reminder 1 hour before the gig.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {projectId && (
          <Button asChild>
            <Link href={`/projects/${projectId}`}>View Gig Project →</Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/feed">Back to Feed</Link>
        </Button>
      </div>
    </div>
  );
}
