import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface ActivityLog {
  action: string;
  performed_by: string;
  performed_by_email?: string;
  timestamp: string;
}

interface OrderTimelineCardProps {
  orderDate?: string;
  createdAt?: string;
  createdBy?: string;
  acceptedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  activityLogs?: ActivityLog[];
  currentStatus?: string;
}

export function OrderTimelineCard({ 
  orderDate, 
  createdAt, 
  acceptedAt, 
  dispatchedAt, 
  deliveredAt,
  activityLogs = [],
  currentStatus
}: OrderTimelineCardProps) {
  // Helper function to find who performed an action
  const getPerformedBy = (action: string): string => {
    const log = activityLogs.find(log => log.action === action);
    if (!log) {
      console.log(`⚠️ No activity log found for action: ${action}`);
      console.log(`📋 Available actions:`, activityLogs.map(l => l.action));
      return '';
    }
    return log.performed_by || '';
  };

  // Helper function to format date
  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Build timeline data
  const timelineData = [];

  // Order Created
  const createdLog = activityLogs.find(log => log.action === 'order_created');
  if (orderDate || createdAt || createdLog) {
    timelineData.push({
      stage: 'Order Created',
      date: formatDate(createdLog?.timestamp || orderDate || createdAt),
      performedBy: getPerformedBy('order_created'),
      color: 'gray',
      status: 'completed'
    });
  }

  // Order Accepted
  if (currentStatus === 'accepted' || currentStatus === 'dispatched' || currentStatus === 'delivered') {
    timelineData.push({
      stage: 'Order Accepted',
      date: formatDate(acceptedAt),
      performedBy: getPerformedBy('order_accepted'),
      color: 'blue',
      status: 'completed'
    });
  }

  // Order Dispatched
  if (currentStatus === 'dispatched' || currentStatus === 'delivered') {
    timelineData.push({
      stage: 'Order Dispatched',
      date: formatDate(dispatchedAt),
      performedBy: getPerformedBy('order_dispatched'),
      color: 'orange',
      status: 'completed'
    });
  }

  // Order Delivered
  if (currentStatus === 'delivered') {
    timelineData.push({
      stage: 'Order Delivered',
      date: formatDate(deliveredAt),
      performedBy: getPerformedBy('order_delivered'),
      color: 'green',
      status: 'completed'
    });
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, { dot: string; text: string }> = {
      gray: { dot: 'bg-gray-500', text: 'text-gray-700' },
      blue: { dot: 'bg-blue-500', text: 'text-blue-700' },
      orange: { dot: 'bg-orange-500', text: 'text-orange-700' },
      green: { dot: 'bg-green-500', text: 'text-green-700' }
    };
    return colors[color] || colors.gray;
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Clock className="w-5 h-5" />
          Order Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Performed By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timelineData.map((item, index) => {
                const colors = getColorClasses(item.color);
                return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`}></div>
                        <span className={`font-medium ${colors.text}`}>
                          {item.stage}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.date}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.performedBy}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
