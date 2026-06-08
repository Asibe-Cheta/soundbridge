'use client';

import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import { AdminBulkEmailPanel } from '@/src/components/admin/AdminBulkEmailPanel';

export default function AdminBulkEmailPage() {
  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h1 className="text-2xl font-semibold text-white">Bulk Email</h1>
          <p className="mt-1 text-sm text-gray-400">
            Send custom branded emails to a list of addresses. Logo and founder footer are included on
            every send.
          </p>
        </div>
        <AdminBulkEmailPanel />
      </div>
    </ProtectedRoute>
  );
}
