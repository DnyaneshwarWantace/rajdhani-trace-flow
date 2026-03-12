import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Database,
  History,
  RotateCcw,
  Search,
  Filter,
  User,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Package,
  ShoppingCart,
  Box,
  Users,
  ChevronRight,
  Eye,
  Download,
  Calendar,
  Zap,
  GitBranch,
  X,
  AlertTriangle,
  Layers,
  Cpu
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ChangeRecord {
  id: string;
  module: string;
  resource_id: string;
  resource_type: string;
  resource_name: string;
  version_number: number;
  action_type: string;
  action_description: string;
  changed_by: string;
  changed_by_email: string;
  changed_fields: string[];
  can_rollback: boolean;
  rollback_blocked_reason?: string;
  is_snapshot: boolean;
  created_at: string;
  changes: Record<string, { old: any; new: any }>;
  stock_impact?: Array<{
    resource_name: string;
    field: string;
    change: number;
  }>;
}

interface RollbackStats {
  total_changes: Array<{ count: number }>;
  changes_by_module: Array<{ _id: string; count: number }>;
  changes_by_action: Array<{ _id: string; count: number }>;
  changes_by_user: Array<{ _id: string; count: number }>;
  recent_changes: ChangeRecord[];
}

/* ── Design tokens ──────────────────────────────────────────────── */
const MODULE_STYLES: Record<string, { color: string; glow: string; bg: string; label: string }> = {
  products: { color: '#0066ff', glow: 'rgba(0,102,255,0.25)', bg: 'rgba(0,102,255,0.1)', label: 'Products' },
  orders: { color: '#10b981', glow: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.1)', label: 'Orders' },
  materials: { color: '#f97316', glow: 'rgba(249,115,22,0.25)', bg: 'rgba(249,115,22,0.1)', label: 'Materials' },
  customers: { color: '#ec4899', glow: 'rgba(236,72,153,0.25)', bg: 'rgba(236,72,153,0.1)', label: 'Customers' },
};
const DEFAULT_MOD = { color: '#6b7280', glow: 'rgba(107,114,128,0.25)', bg: 'rgba(107,114,128,0.1)', label: 'Other' };

const ACTION_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  created: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label: 'CREATED' },
  updated: { color: '#0066ff', bg: 'rgba(0,102,255,0.08)', border: 'rgba(0,102,255,0.2)', label: 'UPDATED' },
  deleted: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'DELETED' },
  restored: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'RESTORED' },
  stock_updated: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', label: 'STOCK' },
};
const DEFAULT_ACT = { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', label: 'ACTION' };

/* ── Main component ─────────────────────────────────────────────── */
const RollbackDashboard: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<RollbackStats | null>(null);
  const [recentChanges, setRecentChanges] = useState<ChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedChange, setSelectedChange] = useState<ChangeRecord | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'info' | 'changes' | 'stock'>('info');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    fetchStats();
    fetchRecentChanges();
  }, [moduleFilter, actionFilter]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE_URL}/admin/rollback/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data.data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load statistics', variant: 'destructive' });
    }
  };

  const fetchRecentChanges = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (moduleFilter !== 'all') params.append('module', moduleFilter);
      if (actionFilter !== 'all') params.append('action_type', actionFilter);
      const res = await fetch(`${API_BASE_URL}/admin/rollback/changes/recent?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch changes');
      const data = await res.json();
      setRecentChanges(data.data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load changes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedChange) return;
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(
        `${API_BASE_URL}/admin/rollback/history/${selectedChange.resource_id}/version/${selectedChange.version_number}/restore`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ notes: 'Restored from admin dashboard' }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to restore');
      }
      toast({ title: '✅ Restore Successful', description: `${selectedChange.resource_name} restored to v${selectedChange.version_number}` });
      setShowRestoreModal(false);
      setSelectedChange(null);
      fetchRecentChanges();
      fetchStats();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to restore', variant: 'destructive' });
    }
  };

  const filteredChanges = recentChanges.filter((c) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      c.resource_name.toLowerCase().includes(s) ||
      c.action_description.toLowerCase().includes(s) ||
      c.changed_by.toLowerCase().includes(s)
    );
  });

  const totalChanges = stats?.total_changes[0]?.count || 0;

  const getModStyle = (mod: string) => MODULE_STYLES[mod] || DEFAULT_MOD;
  const getActStyle = (act: string) => ACTION_STYLES[act] || DEFAULT_ACT;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        .rb-dash { font-family: 'Sora', sans-serif; }
        .rb-mono { font-family: 'JetBrains Mono', monospace !important; }

        .rb-bg {
          background-color: #0a0a0f;
          background-image: radial-gradient(ellipse 80% 40% at 50% -5%, rgba(0,102,255,0.07) 0%, transparent 70%);
        }
        .rb-glass {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
        }
        .rb-glass:hover { border-color: rgba(255,255,255,0.09); }

        .stat-mod-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.2s ease;
        }
        .stat-mod-card:hover { transform: translateY(-3px); }

        /* Timeline item */
        .tl-item {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.2s ease;
        }
        .tl-item:hover {
          background: rgba(255,255,255,0.035);
          border-color: rgba(0,102,255,0.2);
          transform: translateX(2px);
        }

        /* Filter bar */
        .rb-input {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          color: white !important;
          transition: all 0.2s ease;
        }
        .rb-input:focus-within, .rb-input:focus {
          border-color: rgba(0,102,255,0.4) !important;
          box-shadow: 0 0 0 3px rgba(0,102,255,0.08) !important;
          background: rgba(0,102,255,0.05) !important;
        }

        /* Modal overlay */
        .rb-modal-overlay {
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
        }
        .rb-modal {
          background: #0f0f18;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,102,255,0.1);
        }

        /* Section label */
        .sec-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.28);
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        /* Code diff */
        .code-old { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15); color: #fca5a5; }
        .code-new  { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.15); color: #6ee7b7; }

        /* Tab */
        .rb-tab { border-bottom: 2px solid transparent; transition: all 0.15s ease; }
        .rb-tab.active { border-color: #0066ff; color: white; }
        .rb-tab:not(.active) { color: rgba(255,255,255,0.35); }
        .rb-tab:not(.active):hover { color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.1); }

        @keyframes slide-up {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .anim-in { animation: slide-up 0.4s ease forwards; }

        @keyframes modal-in {
          from { opacity:0; transform:scale(0.95) translateY(16px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        .modal-in { animation: modal-in 0.25s cubic-bezier(0.4,0,0.2,1) forwards; }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        /* Restore warning */
        .warning-box {
          background: linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.04));
          border: 1px solid rgba(245,158,11,0.2);
        }
        .restore-btn {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          box-shadow: 0 4px 16px rgba(220,38,38,0.3);
          transition: all 0.2s ease;
        }
        .restore-btn:hover { box-shadow: 0 6px 24px rgba(220,38,38,0.45); transform: translateY(-1px); }

        /* Scrollbar in modals */
        .rb-scroll::-webkit-scrollbar { width: 4px; }
        .rb-scroll::-webkit-scrollbar-track { background: transparent; }
        .rb-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
      `}</style>

      <div className="rb-dash rb-bg min-h-screen p-6 xl:p-8">

        {/* ── HEADER ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div
              className="p-3.5 rounded-2xl"
              style={{ background: 'linear-gradient(135deg,#0066ff,#6633ff)', boxShadow: '0 8px 32px rgba(0,102,255,0.35)' }}
            >
              <Database className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
                Rollback Manager
              </h1>
              <p className="rb-mono text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-yellow-500" />
                Database history, version control &amp; restore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="px-5 py-3 rounded-xl flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg,rgba(0,102,255,0.15),rgba(102,51,255,0.1))', border: '1px solid rgba(0,102,255,0.25)' }}
            >
              <History className="w-5 h-5 text-blue-400" />
              <div>
                <div className="rb-mono text-2xl font-bold text-white leading-none">
                  {totalChanges.toLocaleString()}
                </div>
                <div className="rb-mono text-[9px] text-gray-500 uppercase tracking-wider">Total Changes</div>
              </div>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-gray-400 hover:text-white transition-all rb-glass"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* ── MODULE STATS ─────────────────────────────────── */}
        {stats?.changes_by_module && stats.changes_by_module.length > 0 && (
          <>
            <p className="sec-label">Changes by Module</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {stats.changes_by_module.map((item, i) => {
                const s = getModStyle(item._id);
                return (
                  <div
                    key={item._id}
                    className="stat-mod-card rounded-2xl p-5 anim-in"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-xl" style={{ background: s.bg, boxShadow: `0 4px 16px ${s.glow}` }}>
                        {item._id === 'products' && <Package className="w-4 h-4" style={{ color: s.color }} />}
                        {item._id === 'orders' && <ShoppingCart className="w-4 h-4" style={{ color: s.color }} />}
                        {item._id === 'materials' && <Box className="w-4 h-4" style={{ color: s.color }} />}
                        {item._id === 'customers' && <Users className="w-4 h-4" style={{ color: s.color }} />}
                        {!['products', 'orders', 'materials', 'customers'].includes(item._id) &&
                          <Database className="w-4 h-4" style={{ color: s.color }} />
                        }
                      </div>
                      <TrendingUp className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <div className="rb-mono text-2xl font-bold text-white mb-1">
                      {item.count.toLocaleString()}
                    </div>
                    <div className="text-[12px] font-semibold capitalize" style={{ color: s.color }}>
                      {s.label}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="rb-mono text-[9px] text-gray-600 flex items-center justify-between">
                        <span>Last 30 days</span>
                        <GitBranch className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── FILTERS ──────────────────────────────────────── */}
        <div className="rb-glass rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-blue-400" />
            <span className="text-[13px] font-semibold text-gray-200">Smart Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-gray-500 pointer-events-none z-10" />
              <Input
                placeholder="Search name, action, user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rb-input pl-10 h-11 rounded-xl"
              />
            </div>
            {/* Module */}
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="rb-input h-11 rounded-xl">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌐 All Modules</SelectItem>
                <SelectItem value="products">📦 Products</SelectItem>
                <SelectItem value="orders">🛒 Orders</SelectItem>
                <SelectItem value="materials">🔧 Materials</SelectItem>
                <SelectItem value="customers">👥 Customers</SelectItem>
              </SelectContent>
            </Select>
            {/* Action */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="rb-input h-11 rounded-xl">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">⚡ All Actions</SelectItem>
                <SelectItem value="created">✅ Created</SelectItem>
                <SelectItem value="updated">🔄 Updated</SelectItem>
                <SelectItem value="deleted">❌ Deleted</SelectItem>
                <SelectItem value="stock_updated">📊 Stock Updated</SelectItem>
                <SelectItem value="restored">🔁 Restored</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── TIMELINE ─────────────────────────────────────── */}
        <div className="rb-glass rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(0,102,255,0.12)', boxShadow: '0 4px 16px rgba(0,102,255,0.15)' }}>
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Change History</h2>
              </div>
              <p className="rb-mono text-[11px] text-gray-600 ml-11">
                {filteredChanges.length} entries &nbsp;·&nbsp; Real-time tracking
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="rb-mono text-[10px] text-emerald-400 font-semibold">LIVE</span>
            </div>
          </div>

          {/* Body */}
          <div className="p-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full spin" />
                <span className="rb-mono text-[12px] text-gray-600">Loading timeline...</span>
              </div>
            ) : filteredChanges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <History className="w-10 h-10 text-gray-700" />
                </div>
                <p className="text-[14px] font-semibold text-gray-500">No changes found</p>
                <p className="rb-mono text-[11px] text-gray-700">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="relative space-y-3">
                {/* Vertical connecting line */}
                <div
                  className="absolute left-[2.35rem] top-5 bottom-5 w-px"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,102,255,0.2), rgba(0,102,255,0.02))' }}
                />

                {filteredChanges.map((change, idx) => {
                  const modS = getModStyle(change.module);
                  const actS = getActStyle(change.action_type);
                  return (
                    <div
                      key={change.id}
                      className="tl-item relative rounded-2xl p-4 anim-in"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Module icon */}
                        <div
                          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl z-10"
                          style={{ background: modS.bg, boxShadow: `0 4px 16px ${modS.glow}`, border: `1px solid ${modS.color}20` }}
                        >
                          {change.module === 'products' && <Package className="w-4 h-4" style={{ color: modS.color }} />}
                          {change.module === 'orders' && <ShoppingCart className="w-4 h-4" style={{ color: modS.color }} />}
                          {change.module === 'materials' && <Box className="w-4 h-4" style={{ color: modS.color }} />}
                          {change.module === 'customers' && <Users className="w-4 h-4" style={{ color: modS.color }} />}
                          {!['products', 'orders', 'materials', 'customers'].includes(change.module) &&
                            <Database className="w-4 h-4" style={{ color: modS.color }} />
                          }
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Badges row */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {/* Module badge */}
                            <span
                              className="rb-mono text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{ color: modS.color, background: modS.bg, border: `1px solid ${modS.color}25` }}
                            >
                              {modS.label.toUpperCase()}
                            </span>
                            {/* Action badge */}
                            <span
                              className="rb-mono text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{ color: actS.color, background: actS.bg, border: `1px solid ${actS.border}` }}
                            >
                              {actS.label}
                            </span>
                            {/* Snapshot */}
                            {change.is_snapshot && (
                              <span
                                className="rb-mono text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                                style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
                              >
                                <Layers className="w-2.5 h-2.5" />
                                SNAPSHOT
                              </span>
                            )}
                            {/* Version */}
                            <span
                              className="rb-mono text-[10px] px-2 py-0.5 rounded-md"
                              style={{ color: '#6b7280', background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.12)' }}
                            >
                              v{change.version_number}
                            </span>
                          </div>

                          {/* Description */}
                          <h4 className="text-[14px] font-semibold text-gray-100 mb-2 leading-tight">
                            {change.action_description}
                          </h4>

                          {/* Meta */}
                          <div className="flex items-center gap-4 mb-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-blue-400" />
                              <span className="rb-mono text-[11px] text-gray-400">{change.changed_by}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-purple-400" />
                              <span className="rb-mono text-[11px] text-gray-500">
                                {format(new Date(change.created_at), 'MMM dd, yyyy · HH:mm')}
                              </span>
                            </div>
                          </div>

                          {/* Fields + Stock Impact */}
                          {(change.changed_fields?.length ?? 0) > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="rb-mono text-[10px] text-gray-600">Modified:</span>
                              {change.changed_fields.slice(0, 4).map((f) => (
                                <span
                                  key={f}
                                  className="rb-mono text-[10px] px-1.5 py-0.5 rounded-md"
                                  style={{ color: '#94a3b8', background: 'rgba(148,163,184,0.07)', border: '1px solid rgba(148,163,184,0.1)' }}
                                >
                                  {f}
                                </span>
                              ))}
                              {(change.changed_fields?.length ?? 0) > 4 && (
                                <span className="rb-mono text-[10px] text-gray-600">+{change.changed_fields.length - 4}</span>
                              )}
                            </div>
                          )}
                          {(change.stock_impact?.length ?? 0) > 0 && (
                            <div className="mt-1">
                              <span
                                className="rb-mono text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit"
                                style={{ color: '#f97316', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}
                              >
                                <AlertCircle className="w-2.5 h-2.5" />
                                {change.stock_impact?.length} STOCK IMPACT
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-shrink-0 flex-col sm:flex-row">
                          <button
                            onClick={() => { setSelectedChange(change); setShowDetailsModal(true); setDetailsTab('info'); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-gray-400 hover:text-white transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Details
                          </button>
                          {change.can_rollback && change.is_snapshot ? (
                            <button
                              onClick={() => { setSelectedChange(change); setShowRestoreModal(true); }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white transition-all"
                              style={{ background: 'linear-gradient(135deg,#0066ff,#6633ff)', boxShadow: '0 4px 12px rgba(0,102,255,0.3)' }}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          ) : (
                            <button
                              disabled
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-gray-700 cursor-not-allowed"
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              No Restore
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ RESTORE MODAL ══════════════════════════════════════════ */}
      {showRestoreModal && selectedChange && (
        <div
          className="rb-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => { setShowRestoreModal(false); setSelectedChange(null); }}
        >
          <div
            className="rb-modal modal-in rounded-3xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-white/6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)' }}
                >
                  <RotateCcw className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirm Restore</h3>
                  <p className="rb-mono text-[10px] text-gray-600">This action cannot be undone easily</p>
                </div>
              </div>
              <button
                onClick={() => { setShowRestoreModal(false); setSelectedChange(null); }}
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Warning */}
              <div className="warning-box rounded-2xl p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-bold text-amber-300 mb-2">Important Notice</p>
                    <ul className="rb-mono text-[11px] text-amber-200/70 space-y-1.5 ml-1 list-disc list-inside">
                      <li>Restores <strong className="text-white">{selectedChange.resource_name}</strong> → version {selectedChange.version_number}</li>
                      <li>Current data will be overwritten with this snapshot</li>
                      <li>A new history entry will be created</li>
                      {(selectedChange.stock_impact?.length ?? 0) > 0 && (
                        <li className="text-orange-400">⚠ {selectedChange.stock_impact?.length} stock item(s) will be affected</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Version details */}
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: 'rgba(0,102,255,0.05)', border: '1px solid rgba(0,102,255,0.12)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="w-4 h-4 text-blue-400" />
                  <span className="text-[12px] font-semibold text-gray-200">Version Details</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Resource', val: selectedChange.resource_name },
                    { label: 'Version', val: `#${selectedChange.version_number}` },
                    { label: 'Module', val: selectedChange.module },
                    { label: 'Action', val: selectedChange.action_type },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div className="rb-mono text-[9px] text-gray-600 uppercase mb-1">{label}</div>
                      <div className="rb-mono text-[12px] text-white font-medium">{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowRestoreModal(false); setSelectedChange(null); }}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-gray-400 hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRestore}
                  className="restore-btn flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirm Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DETAILS MODAL ══════════════════════════════════════════ */}
      {showDetailsModal && selectedChange && (
        <div
          className="rb-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => { setShowDetailsModal(false); setSelectedChange(null); }}
        >
          <div
            className="rb-modal modal-in rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-0 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.2)' }}
                >
                  <Eye className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Change Details</h3>
                  <p className="rb-mono text-[10px] text-gray-600">
                    {selectedChange.resource_name} — v{selectedChange.version_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowDetailsModal(false); setSelectedChange(null); }}
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 pb-0 border-b border-white/5 flex-shrink-0">
              {[
                { id: 'info', label: 'Info' },
                { id: 'changes', label: `Changes${Object.keys(selectedChange.changes || {}).length > 0 ? ` (${Object.keys(selectedChange.changes).length})` : ''}` },
                { id: 'stock', label: `Stock Impact${selectedChange.stock_impact?.length ? ` (${selectedChange.stock_impact.length})` : ''}` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDetailsTab(tab.id as any)}
                  className={`rb-tab rb-mono text-[11px] font-semibold px-4 pb-3 ${detailsTab === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto rb-scroll p-6 space-y-4">
              {detailsTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Resource Name', val: selectedChange.resource_name },
                      { label: 'Version', val: `#${selectedChange.version_number}` },
                      { label: 'Module', val: selectedChange.module },
                      { label: 'Action', val: selectedChange.action_type },
                      { label: 'Changed By', val: selectedChange.changed_by },
                      { label: 'Email', val: selectedChange.changed_by_email },
                    ].map(({ label, val }) => (
                      <div
                        key={label}
                        className="rounded-xl p-3"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div className="rb-mono text-[9px] text-gray-600 uppercase mb-1">{label}</div>
                        <div className="rb-mono text-[12px] text-white font-medium truncate">{val || '—'}</div>
                      </div>
                    ))}
                  </div>
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="rb-mono text-[9px] text-gray-600 uppercase mb-2">Description</div>
                    <p className="text-[13px] text-gray-200">{selectedChange.action_description}</p>
                  </div>
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="rb-mono text-[9px] text-gray-600 uppercase mb-2">Timestamp</div>
                    <div className="rb-mono text-[13px] text-white">
                      {format(new Date(selectedChange.created_at), 'PPpp')}
                    </div>
                  </div>
                </div>
              )}

              {detailsTab === 'changes' && (
                <div className="space-y-3">
                  {Object.keys(selectedChange.changes || {}).length === 0 ? (
                    <div className="text-center py-12">
                      <p className="rb-mono text-[12px] text-gray-600">No field changes recorded</p>
                    </div>
                  ) : (
                    Object.entries(selectedChange.changes).map(([field, vals]) => (
                      <div
                        key={field}
                        className="rounded-2xl p-4"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div className="rb-mono text-[11px] font-bold text-gray-300 mb-3">{field}</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="rb-mono text-[9px] text-red-400 uppercase mb-1.5">Old Value</div>
                            <pre className="code-old rb-mono text-[10px] px-3 py-2.5 rounded-xl overflow-x-auto leading-relaxed">
                              {JSON.stringify(vals.old, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <div className="rb-mono text-[9px] text-emerald-400 uppercase mb-1.5">New Value</div>
                            <pre className="code-new rb-mono text-[10px] px-3 py-2.5 rounded-xl overflow-x-auto leading-relaxed">
                              {JSON.stringify(vals.new, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailsTab === 'stock' && (
                <div className="space-y-3">
                  {!selectedChange.stock_impact?.length ? (
                    <div className="text-center py-12">
                      <p className="rb-mono text-[12px] text-gray-600">No stock impact recorded</p>
                    </div>
                  ) : (
                    selectedChange.stock_impact.map((impact, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-2xl p-4"
                        style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.12)' }}
                      >
                        <div>
                          <div className="text-[13px] font-semibold text-gray-200">{impact.resource_name}</div>
                          <div className="rb-mono text-[11px] text-gray-600 mt-0.5">{impact.field}</div>
                        </div>
                        <span
                          className="rb-mono text-[13px] font-bold px-3 py-1.5 rounded-xl"
                          style={
                            impact.change >= 0
                              ? { color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }
                              : { color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }
                          }
                        >
                          {impact.change >= 0 ? '+' : ''}{impact.change}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RollbackDashboard;
