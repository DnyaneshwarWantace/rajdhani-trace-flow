import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCircle, Clock, Factory, AlertCircle, Info, ChevronDown, ChevronUp,
  Loader2, Activity, AlertTriangle, Filter, X, Package,
} from 'lucide-react';
import { formatIndianDateTime } from '@/utils/formatHelpers';
import { NotificationService, type Notification } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';

interface NotificationsTabProps {
  products: any[];
}

type ViewMode = 'notifications' | 'logs';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';
type StatusFilter = 'all' | 'unread' | 'read';

const PRIORITY_DOT: Record<string, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-400', urgent: 'bg-purple-500' };
const PRIORITY_LABEL: Record<string, string> = { high: 'HIGH', medium: 'MED', low: 'LOW', urgent: 'URGENT' };
const PRIORITY_BG: Record<string, string> = { high: 'bg-red-50 border-red-100', medium: 'bg-amber-50 border-amber-100', low: 'bg-blue-50 border-blue-100' };

function getTypeIcon(type: string) {
  switch (type) {
    case 'low_stock':
    case 'out_of_stock':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'production_request':
      return <Factory className="w-4 h-4 text-blue-500" />;
    case 'order_alert':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'activity_log':
      return <Activity className="w-4 h-4 text-purple-500" />;
    default:
      return <Info className="w-4 h-4 text-gray-400" />;
  }
}

export default function NotificationsTab({ products }: NotificationsTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [logs, setLogs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, unread: 0, high: 0, logs: 0 });
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [notifRes, logsRes] = await Promise.all([
        NotificationService.getNotifications({ module: 'products', include_logs: 'false', limit: 200 }),
        NotificationService.getNotifications({ module: 'products', include_logs: 'true', limit: 200 }),
      ]);
      const notifs = notifRes.data.filter(n => n.type !== 'activity_log');
      const allWithLogs = logsRes.data;
      const logsOnly = allWithLogs.filter(n => n.type === 'activity_log');

      setNotifications(notifs);
      setLogs(logsOnly);
      setStats({
        total: notifs.length,
        unread: notifs.filter(n => n.status === 'unread').length,
        high: notifs.filter(n => n.priority === 'high' || n.priority === 'urgent').length,
        logs: logsOnly.length,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to load notifications', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => setExpandedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleMarkRead = async (id: string) => {
    await NotificationService.updateNotificationStatus(id, 'read');
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n));
    setStats(s => ({ ...s, unread: Math.max(0, s.unread - 1) }));
    toast({ title: 'Marked as read' });
  };

  const handleDismiss = async (id: string) => {
    await NotificationService.updateNotificationStatus(id, 'dismissed');
    setNotifications(prev => prev.filter(n => n.id !== id));
    setStats(s => ({ ...s, total: s.total - 1 }));
    toast({ title: 'Dismissed' });
  };

  const handleClearAll = async () => {
    await Promise.all(notifications.map(n => NotificationService.updateNotificationStatus(n.id, 'dismissed')));
    setNotifications([]);
    setStats(s => ({ ...s, total: 0, unread: 0, high: 0 }));
    toast({ title: 'All notifications cleared' });
  };

  const displayed = (viewMode === 'notifications' ? notifications : logs).filter(n => {
    if (viewMode === 'logs') return true;
    if (priorityFilter !== 'all' && n.priority?.toLowerCase() !== priorityFilter) return false;
    if (statusFilter !== 'all' && n.status !== statusFilter) return false;
    return true;
  });

  const activeFilters = (priorityFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  if (loading) {
    return (
      <div className="space-y-3 pb-24">
        {/* Stats skeleton */}
        <div className="flex border border-gray-100 rounded-2xl overflow-hidden bg-white mb-3">
          {[1,2,3,4].map((_, i) => (
            <div key={i} className={`flex-1 flex flex-col items-center py-3 ${i > 0 ? 'border-l border-gray-100' : ''}`}>
              <div className="h-5 w-8 bg-gray-100 rounded animate-pulse mb-1" />
              <div className="h-3 w-10 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {/* Stats strip */}
      <div className="flex border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
        {[
          { val: stats.total, label: 'Total', color: 'text-gray-800' },
          { val: stats.unread, label: 'Unread', color: 'text-blue-600' },
          { val: stats.high, label: 'High', color: 'text-red-500' },
          { val: stats.logs, label: 'Logs', color: 'text-purple-600' },
        ].map((item, i) => (
          <div key={item.label} className={`flex-1 flex flex-col items-center py-3 ${i > 0 ? 'border-l border-gray-100' : ''}`}>
            <span className={`text-base font-extrabold ${item.color}`}>{item.val}</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Toggle: Notifications / Logs */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
        <button
          onClick={() => setViewMode('notifications')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            viewMode === 'notifications'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          Notifications
          {stats.unread > 0 && (
            <span className="ml-0.5 bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {stats.unread}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode('logs')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            viewMode === 'logs'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Activity Log
          {stats.logs > 0 && (
            <span className="ml-0.5 bg-purple-100 text-purple-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {stats.logs}
            </span>
          )}
        </button>
      </div>

      {/* Filter row — only show for notifications */}
      {viewMode === 'notifications' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {/* Status pills */}
          {(['all', 'unread', 'read'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                statusFilter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          {/* Priority pills */}
          {(['all', 'high', 'medium', 'low'] as PriorityFilter[]).map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                priorityFilter === p
                  ? p === 'high' ? 'bg-red-500 text-white border-red-500'
                    : p === 'medium' ? 'bg-amber-500 text-white border-amber-500'
                    : p === 'low' ? 'bg-blue-400 text-white border-blue-400'
                    : 'bg-gray-700 text-white border-gray-700'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              {p !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${priorityFilter === p ? 'bg-white/70' : PRIORITY_DOT[p]}`} />}
              {p === 'all' ? 'All Priority' : PRIORITY_LABEL[p]}
            </button>
          ))}
          {activeFilters > 0 && (
            <button
              onClick={() => { setPriorityFilter('all'); setStatusFilter('all'); }}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border bg-white text-red-500 border-red-200"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Header row */}
      {displayed.length > 0 && viewMode === 'notifications' && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 font-medium">
            {displayed.length} {activeFilters > 0 ? 'filtered' : 'total'}
          </p>
          <button
            onClick={handleClearAll}
            className="text-xs font-bold text-red-500 border border-red-100 rounded-xl px-3 py-1.5 bg-red-50"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Cards */}
      {displayed.length > 0 ? (
        <div className="space-y-2.5">
          {displayed.map(n => {
            const isExpanded = expandedIds.has(n.id);
            const dot = PRIORITY_DOT[n.priority?.toLowerCase()] || 'bg-gray-400';
            const badge = PRIORITY_LABEL[n.priority?.toLowerCase()] || n.priority?.toUpperCase();
            const rd = n.related_data || {};
            const isUnread = n.status === 'unread';

            return (
              <div
                key={n.id}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isUnread ? 'bg-white border-blue-100 shadow-sm' : 'bg-white border-gray-100'
                }`}
              >
                {isUnread && <div className="h-0.5 bg-gradient-to-r from-blue-500 to-blue-300" />}

                <button
                  className="w-full text-left px-4 pt-3.5 pb-3 flex items-start gap-3"
                  onClick={() => toggle(n.id)}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    n.type === 'low_stock' || n.type === 'out_of_stock' ? 'bg-amber-50' :
                    n.type === 'production_request' ? 'bg-blue-50' :
                    n.type === 'activity_log' ? 'bg-purple-50' : 'bg-gray-50'
                  }`}>
                    {getTypeIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className={`text-sm font-bold line-clamp-1 flex-1 ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        {viewMode === 'notifications' && badge && (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full text-white ${dot}`}>
                            <span className="w-1 h-1 rounded-full bg-white/60 inline-block" />
                            {badge}
                          </span>
                        )}
                        {isExpanded
                          ? <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
                          : <ChevronDown className="w-3.5 h-3.5 text-gray-300" />}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{n.message}</p>
                    {n.created_at && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-2.5 h-2.5 text-gray-300" />
                        <span className="text-[10px] text-gray-300">{formatIndianDateTime(n.created_at)}</span>
                      </div>
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-50 bg-gray-50/70 px-4 py-3 space-y-2">
                    {rd.order_number && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Order</span>
                        <span className="font-bold text-gray-800">{rd.order_number}</span>
                      </div>
                    )}
                    {rd.customer_name && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Customer</span>
                        <span className="font-bold text-gray-800">{rd.customer_name}</span>
                      </div>
                    )}
                    {rd.product_name && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Product</span>
                        <span className="font-bold text-gray-800">{rd.product_name}</span>
                      </div>
                    )}
                    {rd.required_quantity !== undefined && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Required</span>
                        <span className="font-bold text-gray-800">{rd.required_quantity} {rd.unit || ''}</span>
                      </div>
                    )}
                    {(rd.available_quantity !== undefined || rd.currentStock !== undefined) && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Available</span>
                        <span className="font-bold text-gray-800">{rd.available_quantity ?? rd.currentStock} {rd.unit || ''}</span>
                      </div>
                    )}
                    {(rd.shortfall ?? rd.shortage) !== undefined && (rd.shortfall ?? rd.shortage) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Shortage</span>
                        <span className="font-bold text-red-500">{rd.shortfall ?? rd.shortage} {rd.unit || ''}</span>
                      </div>
                    )}
                    {rd.created_by_user && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">By</span>
                        <span className="font-bold text-gray-800">{rd.created_by_user}</span>
                      </div>
                    )}

                    {viewMode === 'notifications' && (
                      <div className="flex gap-2 pt-1.5">
                        {n.status !== 'read' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleMarkRead(n.id); }}
                            className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 bg-white active:bg-gray-50"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleDismiss(n.id); }}
                          className="flex-1 py-2 rounded-xl border border-red-100 text-xs font-bold text-red-500 bg-red-50 active:bg-red-100"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {viewMode === 'notifications' ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-sm font-bold text-gray-800 mb-1">All Caught Up!</p>
              <p className="text-xs text-gray-400">
                {activeFilters > 0 ? 'No notifications match your filters' : 'No pending product alerts'}
              </p>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setPriorityFilter('all'); setStatusFilter('all'); }}
                  className="mt-3 text-xs font-bold text-blue-600 border border-blue-200 rounded-xl px-4 py-2 bg-blue-50"
                >
                  Clear Filters
                </button>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-sm font-bold text-gray-800 mb-1">No Activity Yet</p>
              <p className="text-xs text-gray-400">Product activity logs will appear here</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
