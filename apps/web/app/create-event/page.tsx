'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateEventRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the actual create event page
    router.replace('/events/create');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="text-center">
        <p className="text-white">Redirecting to create event...</p>
      </div>
    </div>
  );
}

