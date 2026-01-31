'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';

type RatingRecord = {
  id: string;
  rating: number;
  comment: string | null;
  context: string;
  created_at: string;
  rated_user: {
    id: string;
    username: string;
    display_name: string;
  } | null;
  rater: {
    id: string;
    username: string;
    display_name: string;
  } | null;
};

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export default function RatingsAdminPage() {
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratedUserId, setRatedUserId] = useState('');
  const [context, setContext] = useState('');

  const loadRatings = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (ratedUserId) params.set('userId', ratedUserId);
      if (context) params.set('context', context);

      const response = await fetch(`/api/admin/ratings?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load ratings');
      }
      setRatings(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRatings();
  }, []);

  const handleDelete = async (ratingId: string) => {
    try {
      const response = await fetch(`/api/admin/ratings/${ratingId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete rating');
      }
      await loadRatings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rating');
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Ratings Moderation</h1>
            <p className="text-sm text-gray-500">Review and remove creator ratings.</p>
          </div>
          <button
            className="px-3 py-2 text-sm rounded bg-gray-900 text-white"
            onClick={loadRatings}
          >
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rated user ID</label>
            <input
              value={ratedUserId}
              onChange={(event) => setRatedUserId(event.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="uuid"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Context</label>
            <select
              value={context}
              onChange={(event) => setContext(event.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="event">Event</option>
              <option value="service">Service</option>
              <option value="collaboration">Collaboration</option>
              <option value="general">General</option>
            </select>
          </div>
          <button
            className="px-3 py-2 text-sm rounded bg-blue-600 text-white"
            onClick={loadRatings}
          >
            Apply filters
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        {loading ? (
          <div className="text-sm text-gray-500">Loading ratings...</div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Rated user</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Rater</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Rating</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Context</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Comment</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ratings.map((rating) => (
                  <tr key={rating.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {rating.rated_user?.display_name || rating.rated_user?.username || rating.rated_user?.id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {rating.rater?.display_name || rating.rater?.username || rating.rater?.id}
                      </div>
                    </td>
                    <td className="px-4 py-3">{rating.rating}</td>
                    <td className="px-4 py-3">{rating.context}</td>
                    <td className="px-4 py-3 text-gray-600">{rating.comment || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(rating.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        className="px-2 py-1 text-xs rounded bg-red-600 text-white"
                        onClick={() => handleDelete(rating.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ratings.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500">No ratings found.</div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
