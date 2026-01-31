export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-700">
            <a className="hover:text-gray-900" href="/admin/dashboard">Dashboard</a>
            <a className="hover:text-gray-900" href="/admin/moderation">Moderation</a>
            <a className="hover:text-gray-900" href="/admin/verification">Provider Verification</a>
            <a className="hover:text-gray-900" href="/admin/verification-users">User Badges</a>
            <a className="hover:text-gray-900" href="/admin/account-deletions">Account Deletions</a>
            <a className="hover:text-gray-900" href="/admin/ratings">Ratings</a>
            <a className="hover:text-gray-900" href="/admin/copyright">Copyright</a>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
