'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { MbgSonicsDistributionClient } from '@/src/components/distribution/MbgSonicsDistributionClient';

export default function MBGSonicsDistributionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-pink-400" />
          </div>
        }
      >
        <MbgSonicsDistributionClient />
      </Suspense>
    </div>
  );
}
