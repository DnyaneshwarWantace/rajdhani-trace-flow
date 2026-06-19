import { useState, useEffect } from 'react';
import { Bell, CheckCircle, Loader2, Clock, ChevronDown, ChevronUp, X } from 'lucide-react';
import { formatIndianDateTime, formatIndianDate } from '@/utils/formatHelpers';
import { NotificationService, type Notification } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';

interface MaterialNotificationsTabProps {
  notifications: Notification[];
  loading?: boolean;
}

export default function MaterialNotificationsTab({ notifications: propNotifications, loading: propLoading = false }: MaterialNotificationsTabProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>(propNotifications);
  const [loading, setLoading] = useState(propLoading);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    setNotifications(propNotifications);
    setLoading(propLoading);
  }, [propNotifications, propLoading]);

  const toggleNotification = (id: string) => {
    setExpandedNotifications(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.updateNotificationStatus(notificationId, 'read');
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, status: 'read' as const } : n));
      toast({ title: 'Success', description: 'Notification marked as read' });
    } catch {
      toast({ title: 'Error', description: 'Failed to mark notification as read', variant: 'destructive' });
    }
  };

  const handleResolveNotification = async (notificationId: string) => {
    try {
      await NotificationService.updateNotificationStatus(notificationId, 'dismissed');
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({ title: 'Success', description: 'Notification dismissed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to dismiss notification', variant: 'destructive' });
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await Promise.all(notifications.map(n => NotificationService.updateNotificationStatus(n.id, 'dismissed')));
      setNotifications([]);
      toast({ title: 'Success', description: 'All notifications cleared' });
    } catch {
      toast({ title: 'Error', description: 'Failed to clear notifications', variant: 'destructive' });
    }
  };

  if (loading || (propLoading && notifications.length === 0)) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const priorityDot: Record<string, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-400' };
  const priorityLabel: Record<string, string> = { high: 'HIGH', medium: 'MED', low: 'LOW' };

  return (
    <div className="space-y-3 pb-24">
      {notifications.length > 0 ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Notifications</p>
                <p className="text-xs text-gray-400">
                  {notifications.length} Total · {notifications.filter(n => n.status === 'unread').length} Unread
                </p>
              </div>
            </div>
            <button
              onClick={handleClearAllNotifications}
              className="text-xs font-semibold text-red-500 border border-red-200 rounded-lg px-3 py-1.5"
            >
              Clear All
            </button>
          </div>

          {/* Notification cards */}
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isExpanded = expandedNotifications.has(notification.id);
              const dot = priorityDot[notification.priority?.toLowerCase()] || 'bg-gray-400';
              const badge = priorityLabel[notification.priority?.toLowerCase()] || notification.priority?.toUpperCase();

              const rd = notification.related_data || {};
              const hasDetails = rd.materialName || rd.order_number || rd.customer_name ||
                rd.required_quantity !== undefined || rd.available_quantity !== undefined ||
                rd.currentStock !== undefined || rd.shortage !== undefined ||
                rd.batch_number || rd.product_name || rd.created_by_user;

              return (
                <div key={notification.id} className={`bg-white rounded-2xl border overflow-hidden ${notification.status === 'unread' ? 'border-gray-200' : 'border-gray-100'}`}>
                  {/* Collapsed row */}
                  <button
                    className="w-full text-left px-4 pt-3.5 pb-3 flex items-start gap-3"
                    onClick={() => hasDetails && toggleNotification(notification.id)}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-bold text-gray-900 line-clamp-1 flex-1">{notification.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${dot}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/60 inline-block" />
                            {badge}
                          </span>
                          {hasDetails && (isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                            : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{notification.message}</p>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && hasDetails && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                      {rd.order_number && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Order</span><span className="font-bold text-gray-900">{rd.order_number}</span></div>
                      )}
                      {rd.customer_name && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Customer</span><span className="font-bold text-gray-900">{rd.customer_name}</span></div>
                      )}
                      {rd.materialName && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Material</span><span className="font-bold text-gray-900">{rd.materialName}</span></div>
                      )}
                      {rd.required_quantity !== undefined && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Required</span><span className="font-bold text-gray-900">{rd.required_quantity} {rd.unit || ''}</span></div>
                      )}
                      {(rd.available_quantity !== undefined || rd.currentStock !== undefined) && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Available</span><span className="font-bold text-gray-900">{rd.available_quantity ?? rd.currentStock} {rd.unit || ''}</span></div>
                      )}
                      {rd.shortage !== undefined && rd.shortage > 0 && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Shortage</span><span className="font-bold text-red-600">{rd.shortage} {rd.unit || ''}</span></div>
                      )}
                      {rd.batch_number && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Batch</span><span className="font-bold text-gray-900">{rd.batch_number}</span></div>
                      )}
                      {rd.product_name && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Product</span><span className="font-bold text-gray-900">{rd.product_name}</span></div>
                      )}
                      {rd.created_by_user && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">By</span><span className="font-bold text-gray-900">{rd.created_by_user}</span></div>
                      )}
                      {notification.created_at && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatIndianDateTime(notification.created_at)}
                        </div>
                      )}
                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                          className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white"
                        >
                          Mark Read
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleResolveNotification(notification.id); }}
                          className="flex-1 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 bg-white"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-base font-bold text-gray-900 mb-1">All Caught Up!</p>
          <p className="text-sm text-gray-400">No pending material alerts.</p>
        </div>
      )}
    </div>
  );
}
