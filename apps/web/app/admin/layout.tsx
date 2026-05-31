'use client';

import { AdminSidebar } from '@/src/components/admin/AdminSidebar';
import { useTheme } from '@/src/contexts/ThemeContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
