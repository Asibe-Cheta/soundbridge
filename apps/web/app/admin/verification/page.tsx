'use client';

import React from 'react';

import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import AdminVerificationDashboard from '@/src/components/admin/verification/AdminVerificationDashboard';

export default function VerificationAdminPage() {
  return (
    <ProtectedRoute>
      <AdminVerificationDashboard />
    </ProtectedRoute>
  );
}


