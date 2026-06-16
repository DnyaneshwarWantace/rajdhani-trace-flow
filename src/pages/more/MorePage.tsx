import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessPage } from '@/utils/permissions';

const ALL_ITEMS = [
  {
    label: 'Products',
    desc: 'Catalog, recipes & SKUs',
    path: '/products',
    pageKey: 'products',
    iconBg: '#EFF4FF',
    iconColor: '#2563EB',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'Manage Stock',
    desc: 'Purchase orders & receiving',
    path: '/manage-stock',
    pageKey: 'materials',
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Ink Management',
    desc: 'Periodic ink usage & stock',
    path: '/ink',
    pageKey: 'materials',
    iconBg: '#E0F2FE',
    iconColor: '#0891B2',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12" />
      </svg>
    ),
  },
  {
    label: 'Suppliers',
    desc: 'Vendors & purchase history',
    path: '/suppliers',
    pageKey: 'suppliers',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    label: 'Customers',
    desc: 'Clients & revenue',
    path: '/customers',
    pageKey: 'customers',
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Recipes',
    desc: 'Production formulas & calculator',
    path: '/recipes',
    pageKey: 'production',
    iconBg: '#FEF9C3',
    iconColor: '#CA8A04',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Notifications',
    desc: 'Alerts & system messages',
    path: '/notifications',
    pageKey: 'reports',
    iconBg: '#FFE4E6',
    iconColor: '#E11D48',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    label: 'Transport',
    desc: 'Manage trucks & vehicle fleet',
    path: '/transport',
    pageKey: null,
    iconBg: '#FFF4ED',
    iconColor: '#EA580C',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17H5a2 2 0 01-2-2V5a2 2 0 012-2h11a1 1 0 011 1v3m0 0h3l2 4v4h-2m-3-7H9m9 0v7m0 0h-5m5 0a2 2 0 11-4 0m4 0a2 2 0 01-4 0M9 17a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    desc: 'Profile, security & users',
    path: '/settings',
    pageKey: 'settings',
    iconBg: '#F1F5F9',
    iconColor: '#64748B',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function MorePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.full_name
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const visibleItems = ALL_ITEMS.filter(item =>
    item.pageKey === null || item.pageKey === 'settings' || canAccessPage(item.pageKey)
  );

  return (
    <Layout>
      {/* Desktop: redirect notice */}
      <div className="hidden lg:flex items-center justify-center min-h-[60vh] text-gray-400 text-sm">
        This page is for mobile navigation only.
      </div>

      {/* Mobile: full More page */}
      <div className="lg:hidden -m-2 sm:-m-3">
        {/* Blue header — matches app */}
        <div className="bg-blue-600 px-5 pt-6 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-extrabold text-lg">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base leading-tight">{user?.full_name}</p>
              <p className="text-blue-200 text-xs capitalize">{user?.role} · Rajdhani Textiles</p>
            </div>
          </div>
        </div>

        {/* Module list */}
        <div className="px-4 pt-5 pb-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Modules</p>
          <div className="space-y-2">
            {visibleItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-[0.98] transition-all text-left"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}

            {/* Sign out */}
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 p-3.5 bg-red-50 border border-red-100 rounded-2xl active:scale-[0.98] transition-all text-left mt-1"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-600">Sign Out</p>
                <p className="text-xs text-red-400 mt-0.5">{user?.email || ''}</p>
              </div>
            </button>
          </div>

          <p className="text-center text-gray-300 text-xs mt-6">Rajdhani ERP · v1.0</p>
        </div>
      </div>
    </Layout>
  );
}
