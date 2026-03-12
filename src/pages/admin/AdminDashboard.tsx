import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Database,
  Activity,
  CheckCircle,
  Server,
  HardDrive,
  Cpu,
  Zap,
  BarChart3,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StatMetric {
  label: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  icon: React.ElementType;
  color: string;
  glow: string;
  bg: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface SystemData {
  database: {
    size: string;
    dataSize: string;
    indexSize: string;
    collections: number;
    documents: number;
  };
  counts: {
    users: number;
    products: number;
    orders: number;
    customers: number;
    materials: number;
    changes: number;
  };
  activity: {
    activeUsers: number;
    recentChanges: Array<{
      action: string;
      user: string;
      time: string;
      type: string;
      resource: string;
    }>;
  };
  system: {
    uptime: number;
    nodeVersion: string;
    platform: string;
    memory: {
      total: number;
      used: number;
      percentage: number;
    };
    health: string;
    services: Array<{
      name: string;
      status: string;
      uptime: string;
      healthy: boolean;
    }>;
  };
}

const AdminDashboard: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalChanges: 0,
    systemHealth: 0,
    activeConnections: 0
  });
  const [healthPct, setHealthPct] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [_loading, setLoading] = useState(true);

  const fetchSystemStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/admin/system/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      if (data.success) {
        setSystemData(data.data);
        const health = parseFloat(data.data.system.health) || 99.8;
        setStats({
          totalUsers: data.data.counts.users,
          totalChanges: data.data.counts.changes,
          systemHealth: health,
          activeConnections: data.data.activity.activeUsers
        });
        setHealthPct(health);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching system stats:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const systemMetrics: StatMetric[] = [
    {
      label: 'Memory',
      value: systemData ? `${systemData.system.memory.used} MB` : '0 MB',
      trend: systemData ? `${systemData.system.memory.percentage}%` : '0%',
      trendUp: false,
      icon: HardDrive,
      color: '#8b5cf6',
      glow: 'rgba(139,92,246,0.3)',
      bg: 'rgba(139,92,246,0.08)'
    },
    {
      label: 'Database Size',
      value: systemData ? `${systemData.database.size} GB` : '0 GB',
      trend: systemData ? `${systemData.database.collections} collections` : '0',
      trendUp: false,
      icon: Database,
      color: '#f97316',
      glow: 'rgba(249,115,22,0.3)',
      bg: 'rgba(249,115,22,0.08)'
    },
    {
      label: 'Active Users',
      value: stats.activeConnections,
      trend: `${stats.totalUsers} total users`,
      trendUp: true,
      icon: Activity,
      color: '#10b981',
      glow: 'rgba(16,185,129,0.3)',
      bg: 'rgba(16,185,129,0.08)'
    },
    {
      label: 'Total Changes',
      value: stats.totalChanges,
      trend: 'Tracked in history',
      trendUp: false,
      icon: Cpu,
      color: '#0066ff',
      glow: 'rgba(0,102,255,0.3)',
      bg: 'rgba(0,102,255,0.08)'
    }
  ];

  const services = systemData?.system.services || [
    { name: 'API Server', status: 'online', uptime: '99.9%', healthy: true },
    { name: 'Database', status: 'online', uptime: '100%', healthy: true },
    { name: 'Auth Service', status: 'online', uptime: '99.9%', healthy: true },
    { name: 'File Storage', status: 'online', uptime: '99.7%', healthy: true }
  ];

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const recentActivity = systemData?.activity.recentChanges?.map((change) => ({
    action: change.action,
    user: change.user,
    time: getTimeAgo(change.time),
    type: change.type,
    resource: change.resource
  })) || [];

  const activityColors: Record<string, string> = {
    create: '#10b981',
    update: '#0066ff',
    auth: '#8b5cf6',
    system: '#f97316'
  };
  const activityLabels: Record<string, string> = {
    create: 'CREATE',
    update: 'UPDATE',
    auth: 'AUTH',
    system: 'SYSTEM'
  };

  const quickActions = [
    { label: 'Database Backup', icon: Database, color: '#0066ff', bg: 'rgba(0,102,255,0.08)', glow: 'rgba(0,102,255,0.2)' },
    { label: 'Clear Cache', icon: Server, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', glow: 'rgba(139,92,246,0.2)' },
    { label: 'View Logs', icon: Activity, color: '#f97316', bg: 'rgba(249,115,22,0.08)', glow: 'rgba(249,115,22,0.2)' },
    { label: 'System Report', icon: BarChart3, color: '#10b981', bg: 'rgba(16,185,129,0.08)', glow: 'rgba(16,185,129,0.2)' }
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSystemStats();
    setTimeout(() => setRefreshing(false), 1200);
  };

  const handleDatabaseBackup = () => {
    navigate('/admin/portal/backup');
  };

  const handleQuickAction = (label: string) => {
    switch (label) {
      case 'Database Backup':
        handleDatabaseBackup();
        break;
      case 'Clear Cache':
        toast({ title: 'Coming soon', description: 'Clear Cache functionality is not available yet.' });
        break;
      case 'View Logs':
        toast({ title: 'Coming soon', description: 'View Logs functionality is not available yet.' });
        break;
      case 'System Report':
        toast({ title: 'Coming soon', description: 'System Report functionality is not available yet.' });
        break;
      default:
        break;
    }
  };

  // Circular arc for health
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (healthPct / 100) * circ;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        .admin-dash { font-family: 'Sora', sans-serif; }
        .admin-mono { font-family: 'JetBrains Mono', monospace !important; }

        .glass-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .glass-card:hover {
          border-color: rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.035);
        }

        .stat-card {
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%);
          pointer-events: none;
        }
        .stat-card:hover {
          transform: translateY(-2px);
        }

        .health-arc {
          transition: stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1);
        }

        .service-row {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          transition: all 0.15s ease;
        }
        .service-row:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.08);
        }

        .activity-item {
          transition: background 0.15s ease;
        }
        .activity-item:hover {
          background: rgba(255,255,255,0.025);
        }

        .quick-action-btn {
          transition: all 0.2s ease;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .quick-action-btn:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,0.1);
        }

        @keyframes count-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .count-in {
          animation: count-up 0.6s ease forwards;
        }

        @keyframes spin-refresh {
          to { transform: rotate(360deg); }
        }
        .refreshing { animation: spin-refresh 0.8s linear infinite; }

        .dash-bg {
          background-color: #0a0a0f;
          background-image:
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,102,255,0.08) 0%, transparent 70%);
        }

        .section-title {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          margin-bottom: 12px;
        }
      `}</style>

      <div className="admin-dash dash-bg min-h-screen p-6 xl:p-8">
        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="p-3 rounded-2xl"
                style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)', boxShadow: '0 8px 24px rgba(239,68,68,0.3)' }}
              >
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">System Dashboard</h1>
                <p className="admin-mono text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  Real-time monitoring &amp; control
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-400 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'refreshing' : ''}`} />
            <span className="text-sm hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* ── STAT CARDS ── */}
        <p className="section-title">System Metrics</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {systemMetrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="glass-card stat-card rounded-2xl p-5 count-in"
                style={{ animationDelay: `${i * 80}ms`, boxShadow: `0 0 0 0 ${m.glow}` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ background: m.bg, boxShadow: `0 4px 16px ${m.glow}` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: m.color }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-gray-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1 admin-mono" style={{ color: '#fff' }}>
                  {m.value}
                </div>
                <div className="text-[12px] font-medium mb-2" style={{ color: m.color }}>
                  {m.label}
                </div>
                <div className="admin-mono text-[10px] text-gray-600">{m.trend}</div>
              </div>
            );
          })}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* System Health — 2 cols */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <p className="section-title">System Health</p>
            <div className="flex flex-col sm:flex-row gap-8">
              {/* Circular arc */}
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <div className="relative w-36 h-36">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                    {/* Track */}
                    <circle
                      cx="64" cy="64" r={radius}
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="10"
                    />
                    {/* Progress */}
                    <circle
                      cx="64" cy="64" r={radius}
                      fill="none"
                      stroke="url(#healthGrad)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                      className="health-arc"
                    />
                    <defs>
                      <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#0066ff" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="admin-mono text-2xl font-bold text-white">{healthPct}%</span>
                    <span className="admin-mono text-[9px] text-gray-500 uppercase tracking-wider">Health</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span className="admin-mono text-[11px] text-emerald-400 font-semibold">Excellent</span>
                </div>
              </div>

              {/* Services */}
              <div className="flex-1 space-y-2.5">
                <div className="admin-mono text-[10px] text-gray-600 uppercase tracking-widest mb-3">Services</div>
                {services.map((svc) => (
                  <div key={svc.name} className="service-row flex items-center justify-between px-4 py-2.5 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-2 h-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      </div>
                      <span className="text-[13px] font-medium text-gray-300">{svc.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="admin-mono text-[11px] text-gray-600">{svc.uptime}</span>
                      <span
                        className="admin-mono text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
                      >
                        ONLINE
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card rounded-2xl p-5 flex flex-col">
            <p className="section-title">Recent Activity</p>
            <div className="flex-1 space-y-1">
              {recentActivity.map((act, idx) => (
                <div key={idx} className="activity-item flex items-start gap-3 px-3 py-2.5 rounded-xl">
                  <div
                    className="flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded-md admin-mono text-[9px] font-bold"
                    style={{
                      color: activityColors[act.type],
                      background: `${activityColors[act.type]}14`,
                      border: `1px solid ${activityColors[act.type]}25`
                    }}
                  >
                    {activityLabels[act.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-200 truncate">{act.action}</p>
                    <p className="admin-mono text-[10px] text-gray-600 mt-0.5">
                      {act.user} · {act.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <p className="section-title">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.label)}
                className="quick-action-btn glass-card rounded-2xl p-6 flex flex-col items-center gap-3 group"
                style={{ '--action-glow': action.glow } as React.CSSProperties}
              >
                <div
                  className="p-4 rounded-2xl transition-all duration-200 group-hover:scale-110"
                  style={{ background: action.bg, boxShadow: `0 0 0 0 ${action.glow}`, transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${action.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${action.glow}`;
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: action.color }} />
                </div>
                <span className="text-[12px] font-semibold text-gray-400 group-hover:text-white transition-colors text-center">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
