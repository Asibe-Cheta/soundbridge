'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Flame } from 'lucide-react';
import { Card, CardContent, Button } from '@/src/components/ui';

export default function GigTypeSelectionPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen p-4 pb-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">What type of gig?</h1>
        <Link href="/gigs/my" className="text-sm text-muted-foreground hover:text-foreground">My gigs</Link>
      </div>

      <div className="space-y-4">
        <Card
          variant="glass"
          className="cursor-pointer transition-all hover:border-primary/50"
          onClick={() => router.push('/opportunities/new')}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-muted p-3">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold mb-1">Planned Opportunity</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Plan a collaboration, event, or job. No rush — set your own timeline.
                </p>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/opportunities/new">Post Opportunity →</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          variant="glass"
          className="cursor-pointer transition-all hover:border-primary/50"
          onClick={() => router.push('/gigs/urgent/create')}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-red-500/20 p-3">
                <Flame className="w-8 h-8 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold mb-1">Urgent Gig</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Need someone today or tonight. Last-minute, location-based matching.
                </p>
                <Button variant="default" className="w-full sm:w-auto" asChild>
                  <Link href="/gigs/urgent/create">Post Urgent Gig →</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
