import { Link, useLocation } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';
import { canAccessPage } from '@/utils/permissions';

// ── Icons ──────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function IconOrders() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function IconProduction() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  );
}
function IconMaterials() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

// ── Primary tabs ───────────────────────────────────────────────────

const PRIMARY_TABS = [
  { name: 'Home',       path: '/dashboard',  pageKey: 'dashboard',  icon: <IconDashboard /> },
  { name: 'Orders',     path: '/orders',     pageKey: 'orders',     icon: <IconOrders /> },
  { name: 'Production', path: '/production', pageKey: 'production', icon: <IconProduction /> },
  { name: 'Materials',  path: '/materials',  pageKey: 'materials',  icon: <IconMaterials /> },
];

const MORE_PATH = '/more';

export default function MobileNav() {
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const visibleTabs = PRIMARY_TABS.filter(tab => canAccessPage(tab.pageKey));

  const isMoreActive = location.pathname === MORE_PATH ||
    !visibleTabs.some(tab =>
      location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
    );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch h-16">
        {visibleTabs.map(tab => {
          const active = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <span className={`transition-transform ${active ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] font-semibold ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                {tab.name}
              </span>
              {active && (
                <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-blue-600" />
              )}
            </Link>
          );
        })}

        {/* More tab — navigates to /more page */}
        <Link
          to={MORE_PATH}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
            isMoreActive ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <span className={`relative transition-transform ${isMoreActive ? 'scale-110' : ''}`}>
            <IconGrid />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </span>
            )}
          </span>
          <span className={`text-[10px] font-semibold ${isMoreActive ? 'text-blue-600' : 'text-gray-400'}`}>
            More
          </span>
          {isMoreActive && (
            <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-blue-600" />
          )}
        </Link>
      </div>
    </nav>
  );
}
