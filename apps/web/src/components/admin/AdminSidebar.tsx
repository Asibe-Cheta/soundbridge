'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Award,
  BadgeCheck,
  Building2,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Cookie,
  Copyright,
  CreditCard,
  Crown,
  Handshake,
  Landmark,
  LayoutDashboard,
  Mail,
  Menu,
  Music,
  Globe,
  ScanFace,
  Shield,
  ShieldAlert,
  Star,
  TrendingUp,
  UserX,
  Wallet,
  X,
} from 'lucide-react';
import { useTheme } from '@/src/contexts/ThemeContext';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bulk-email', label: 'Bulk Email', icon: Mail },
  { href: '/admin/moderation', label: 'Moderation', icon: Shield },
  { href: '/admin/fraud-review', label: 'Fraud Review', icon: ShieldAlert },
  { href: '/admin/verification', label: 'Provider Verification', icon: BadgeCheck },
  { href: '/admin/persona-verification', label: 'Persona providers', icon: ScanFace },
  { href: '/admin/verification-users', label: 'User Badges', icon: Award },
  { href: '/admin/account-deletions', label: 'Account Deletions', icon: UserX },
  { href: '/admin/ratings', label: 'Ratings', icon: Star },
  { href: '/admin/cookie-consents', label: 'Cookie Consents', icon: Cookie },
  { href: '/admin/copyright', label: 'Copyright', icon: Copyright },
  { href: '/admin/gigs-opportunities', label: 'Gigs & Opportunities', icon: Briefcase },
  { href: '/admin/gig-payments', label: 'Gig Escrow Ops', icon: CreditCard },
  { href: '/admin/distribution-requests', label: 'Distribution', icon: Globe },
  { href: '/admin/payouts', label: 'Payouts', icon: Wallet },
  { href: '/admin/bank-verifications', label: 'Verified Banks', icon: Landmark },
  { href: '/admin/user-subscriptions', label: 'Subscriptions', icon: CircleDollarSign },
  { href: '/admin/platform-revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/admin/music-tips', label: 'Music & Tips', icon: Music },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/partners', label: 'Partners', icon: Handshake },
  { href: '/admin/institutional-access', label: 'Institutional Access', icon: Building2 },
  { href: '/admin/founding-members', label: 'Founding Members', icon: Crown },
] as const;

const STORAGE_KEY = 'admin-sidebar-collapsed';

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin/dashboard') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const border = dark ? 'border-gray-800' : 'border-gray-200';
  const bg = dark ? 'bg-gray-900' : 'bg-white';
  const text = dark ? 'text-gray-300' : 'text-gray-700';
  const muted = dark ? 'text-gray-500' : 'text-gray-500';
  const hover = dark ? 'hover:bg-gray-800 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900';
  const active = dark ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : 'bg-blue-50 text-blue-700 border-blue-200';

  const navContent = (
    <>
      <div className={`flex items-center border-b ${border} px-3 py-4 ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}>
        {!collapsed && (
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Admin</p>
            <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Navigation</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={`hidden lg:flex shrink-0 items-center justify-center rounded-lg p-2 ${hover}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const activeItem = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium transition-colors ${text} ${hover} ${
                activeItem ? active : ''
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <div
        className={`lg:hidden sticky top-0 z-30 border-b ${border} ${bg} px-4 py-3 flex items-center justify-between`}
      >
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Admin</p>
          <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Navigation</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={`rounded-lg p-2 ${hover}`}
          aria-label="Open admin menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          aria-label="Close admin menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 border-r ${border} ${bg} flex flex-col shadow-xl transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`flex items-center justify-between border-b ${border} px-4 py-4`}>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Admin</p>
            <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Navigation</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className={`rounded-lg p-2 ${hover}`}
            aria-label="Close admin menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const activeItem = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium transition-colors ${text} ${hover} ${
                  activeItem ? active : ''
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <aside
        className={`hidden lg:flex shrink-0 flex-col border-r ${border} ${bg} transition-[width] duration-200 ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
