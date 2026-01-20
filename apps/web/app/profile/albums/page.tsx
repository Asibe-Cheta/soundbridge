'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { Music, Loader2 } from 'lucide-react';

type Album = {
  id: string;
  title: string;
  created_at: string;
};

export default function ProfileAlbumsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user?.id) {
      router.push('/login?redirect=/profile/albums');
    }
  }, [loading, user?.id, router]);

  useEffect(() => {
    if (!user?.id) return;

    const loadAlbums = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/creators/${user.id}/albums?limit=50`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to fetch albums');
        }
        setAlbums(data.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch albums');
      } finally {
        setIsLoading(false);
      }
    };

    loadAlbums();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <main className="main-container px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">My Albums</h1>
          <Link href="/profile" className="btn-secondary">
            Back to Profile
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-pink-400" />
            <span className="ml-2 text-gray-300">Loading albums...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}</div>
        ) : albums.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Music size={48} className="mx-auto mb-4 opacity-50" />
            <p>No albums yet</p>
            <p className="text-sm">Your albums will appear here once created.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {albums.map((album) => (
              <Link
                key={album.id}
                href={`/album/${album.id}`}
                className="card hover:bg-gray-800/70 transition-colors"
              >
                <div className="card-content">
                  <div className="text-lg font-semibold text-white">{album.title}</div>
                  <div className="text-sm text-gray-400">
                    {new Date(album.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
