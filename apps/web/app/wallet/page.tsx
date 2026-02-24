'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/contexts/AuthContext';
import { WalletDashboard } from '@/src/components/wallet/WalletDashboard';
import { ArrowLeft } from 'lucide-react';

export default function WalletPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Sign in to view your wallet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-8 max-w-2xl mx-auto">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-semibold mb-4">Wallet</h1>
      <WalletDashboard userId={user.id} />
    </div>
  );
}
