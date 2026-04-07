'use client';

import React from 'react';

import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import AdminPersonaVerificationDashboard from '@/src/components/admin/persona-verification/AdminPersonaVerificationDashboard';

export default function PersonaVerificationAdminPage() {
  return (
    <ProtectedRoute>
      <AdminPersonaVerificationDashboard />
    </ProtectedRoute>
  );
}
