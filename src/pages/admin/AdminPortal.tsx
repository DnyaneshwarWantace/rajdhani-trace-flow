import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Database,
  DatabaseBackup,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Lock,
  Bell,
  Search,
  ChevronRight,
  Cpu,
  Wifi
} from 'lucide-react';

const AdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [time, setTime] = useState(new Date());
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    {
      path: '/admin/portal',
      icon: LayoutDashboard,
      label: 'Dashboard',
      description: 'System Overview',
      color: '#0066ff'
    },
    {
      path: '/admin/portal/rollback',
      icon: Database,
      label: 'Rollback Manager',
      description: 'Database Recovery',
      color: '#f97316'
    },
    {
      path: '/admin/portal/backup',
      icon: DatabaseBackup,
      label: 'Backups',
      description: 'Snapshots & History',
      color: '#10b981'
    },
    {
      path: '/admin/portal/users',
      icon: Users,
      label: 'User Management',
      description: 'Access Control',
      color: '#10b981'
    },
    {
      path: '/admin/portal/settings',
      icon: Settings,
      label: 'System Settings',
      description: 'Configuration',
      color: '#8b5cf6'
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const isActive = (path: string) => {
    if (path === '/admin/portal') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600&display=swap');

        .admin-portal * {
          font-family: 'Sora', sans-serif;
        }
        .admin-mono {
          font-family: 'JetBrains Mono', monospace !important;
        }

        /* Sidebar grid mesh background */
        .sidebar-bg {
          background-color: #08080c;
          background-image:
            linear-gradient(rgba(0,102,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,102,255,0.04) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        /* Topbar glass */
        .topbar-glass {
          background: rgba(8,8,14,0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(0,102,255,0.12);
        }

        /* Nav item active glow */
        .nav-active {
          background: linear-gradient(135deg, rgba(0,102,255,0.18) 0%, rgba(0,102,255,0.06) 100%);
          border: 1px solid rgba(0,102,255,0.3);
          box-shadow: 0 0 20px rgba(0,102,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .nav-inactive:hover {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .nav-inactive {
          border: 1px solid transparent;
        }

        /* Active indicator bar */
        .active-bar {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: #0066ff;
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 12px rgba(0,102,255,0.8);
        }

        /* System status card */
        .status-card {
          background: linear-gradient(135deg, rgba(0,255,128,0.04) 0%, rgba(0,102,255,0.04) 100%);
          border: 1px solid rgba(0,255,128,0.1);
        }

        /* Search focused */
        .search-bar {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.2s ease;
        }
        .search-bar:focus-within {
          background: rgba(0,102,255,0.06);
          border-color: rgba(0,102,255,0.4);
          box-shadow: 0 0 0 3px rgba(0,102,255,0.08);
        }

        /* User avatar ring */
        .avatar-ring {
          background: conic-gradient(from 0deg, #0066ff, #6633ff, #ff3366, #0066ff);
          animation: spin-slow 4s linear infinite;
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }

        /* Pulse dot */
        .pulse-dot::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: rgba(16,185,129,0.4);
          animation: pulse-ring 2s ease infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }

        /* Sidebar transition */
        .sidebar-expanded { width: 280px; }
        .sidebar-collapsed { width: 72px; }
        .sidebar-panel {
          transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
        }

        /* Notification badge */
        .notif-badge {
          background: #ef4444;
          box-shadow: 0 0 8px rgba(239,68,68,0.6);
        }

        /* Secure mode badge */
        .secure-badge {
          background: linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(0,102,255,0.1) 100%);
          border: 1px solid rgba(139,92,246,0.2);
        }

        .main-content {
          background: #0a0a0f;
          min-height: calc(100vh - 64px);
        }

        /* Logo pulse */
        @keyframes logo-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        .logo-pulse {
          animation: logo-pulse 3s ease infinite;
        }
      `}</style>

      <div className="admin-portal min-h-screen bg-[#0a0a0f]">
        {/* ─── TOP BAR ─────────────────────────────────────────── */}
        <div className="topbar-glass fixed top-0 left-0 right-0 h-16 z-50 flex items-center">
          <div className="flex items-center justify-between w-full px-4">

            {/* Left: Toggle + Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/4 border border-white/6 text-gray-400 hover:text-white hover:bg-white/8 transition-all"
              >
                {sidebarOpen
                  ? <X className="w-4 h-4" />
                  : <Menu className="w-4 h-4" />}
              </button>

              <div className="flex items-center gap-3">
                <div className="logo-pulse relative p-2 bg-gradient-to-br from-red-600 to-orange-500 rounded-xl shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="admin-mono text-white font-semibold text-base leading-tight tracking-wide">
                    ADMIN PORTAL
                  </div>
                  <div className="admin-mono text-[10px] text-gray-500 leading-none">
                    RAJDHANI CONTROL CENTER
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Search */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <div className={`search-bar relative w-full flex items-center rounded-xl px-4 h-10`}>
                <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search system..."
                  className="admin-mono flex-1 bg-transparent border-0 outline-none text-gray-300 placeholder-gray-600 text-sm pl-3"
                />
                <div className="admin-mono text-[10px] text-gray-600 flex-shrink-0 bg-white/4 px-2 py-1 rounded-md border border-white/6">
                  ⌘K
                </div>
              </div>
            </div>

            {/* Right: Actions + User */}
            <div className="flex items-center gap-2">
              {/* Live clock */}
              <div className="admin-mono hidden md:block text-[11px] text-gray-500 tabular-nums mr-2">
                {formatTime(time)}
              </div>

              {/* System status dot */}
              <div className="hidden md:flex items-center gap-1.5 mr-3 px-3 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/15">
                <div className="relative w-2 h-2">
                  <div className="absolute inset-0 bg-emerald-400 rounded-full pulse-dot" />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                </div>
                <span className="admin-mono text-[10px] text-emerald-400 font-medium">ONLINE</span>
              </div>

              {/* Notifications */}
              <button className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-white/4 border border-white/6 text-gray-400 hover:text-white transition-all">
                <Bell className="w-4 h-4" />
                <span className="notif-badge absolute top-1.5 right-1.5 w-2 h-2 rounded-full" />
              </button>

              <div className="w-px h-6 bg-white/8 mx-1" />

              {/* User */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/4 border border-white/6">
                <div className="relative w-8 h-8">
                  <div className="avatar-ring absolute inset-[-2px] rounded-full" />
                  <div className="relative w-8 h-8 bg-gradient-to-br from-red-600 to-orange-500 rounded-full flex items-center justify-center z-10">
                    <span className="text-white font-bold text-sm">
                      {user.full_name?.charAt(0)?.toUpperCase() || 'A'}
                    </span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-[13px] font-semibold text-white leading-tight">
                    {user.full_name || 'Administrator'}
                  </div>
                  <div className="admin-mono text-[10px] text-gray-500 uppercase leading-none">
                    {user.role || 'ADMIN'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/4 border border-white/6 text-gray-400 hover:text-red-400 hover:bg-red-500/8 hover:border-red-500/20 transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── BODY ────────────────────────────────────────────── */}
        <div className="flex pt-16">
          {/* Sidebar */}
          <aside
            className={`sidebar-bg sidebar-panel fixed left-0 top-16 bottom-0 z-40 overflow-hidden border-r border-white/5 flex flex-col ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'
              }`}
          >
            {/* System Status */}
            <div className={`p-4 border-b border-white/5 ${!sidebarOpen && 'hidden'}`}>
              <div className="status-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative w-2 h-2">
                      <div className="pulse-dot absolute inset-0 bg-emerald-400 rounded-full" />
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    </div>
                    <span className="admin-mono text-[11px] text-emerald-400 font-semibold">SYSTEM ONLINE</span>
                  </div>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500/60" />
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: 'Uptime', value: '99.9%', ok: true },
                    { label: 'Load', value: 'Normal', ok: true },
                    { label: 'Security', value: 'Active', ok: true },
                  ].map(({ label, value, ok }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="admin-mono text-[10px] text-gray-500">{label}</span>
                      <span className={`admin-mono text-[10px] font-medium ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Collapsed: mini logo */}
            {!sidebarOpen && (
              <div className="p-4 flex items-center justify-center border-b border-white/5">
                <div className="p-2 bg-gradient-to-br from-red-600 to-orange-500 rounded-xl">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
            )}

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`relative w-full flex items-center rounded-xl transition-all duration-200 group ${sidebarOpen ? 'gap-3 px-4 py-3' : 'justify-center p-3'
                      } ${active ? 'nav-active' : 'nav-inactive'}`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    {active && <div className="active-bar" />}

                    <div
                      className={`flex-shrink-0 p-2 rounded-lg transition-all ${active
                        ? 'shadow-lg'
                        : 'bg-white/5 group-hover:bg-white/8'
                        }`}
                      style={active ? { background: `${item.color}22`, boxShadow: `0 0 12px ${item.color}30` } : {}}
                    >
                      <Icon
                        className="w-4 h-4 transition-colors"
                        style={{ color: active ? item.color : undefined }}
                        color={active ? item.color : '#6b7280'}
                      />
                    </div>

                    {sidebarOpen && (
                      <div className="flex-1 text-left min-w-0">
                        <div className={`text-[13px] font-semibold truncate ${active ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                          {item.label}
                        </div>
                        <div className={`admin-mono text-[10px] truncate ${active ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.description}
                        </div>
                      </div>
                    )}

                    {sidebarOpen && active && (
                      <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: item.color }} />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Bottom: Secure Mode */}
            <div className={`p-3 border-t border-white/5 ${!sidebarOpen && 'flex justify-center'}`}>
              {sidebarOpen ? (
                <div className="secure-badge rounded-xl px-4 py-3 flex items-center gap-3">
                  <Lock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div>
                    <div className="text-[12px] font-semibold text-white">Secure Mode</div>
                    <div className="admin-mono text-[9px] text-gray-500">AES-256 Encrypted</div>
                  </div>
                  <div className="ml-auto">
                    <Cpu className="w-3 h-3 text-gray-600" />
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <Lock className="w-4 h-4 text-purple-400" />
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main
            className={`flex-1 transition-all duration-300 main-content ${sidebarOpen ? 'ml-[280px]' : 'ml-[72px]'
              }`}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminPortal;
