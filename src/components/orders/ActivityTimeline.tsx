import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Package, CheckCircle, DollarSign, Edit, AlertCircle } from 'lucide-react';

interface ActivityLog {
  action: string;
  description: string;
  performed_by: string;
  performed_by_email: string;
  timestamp: string;
  details?: any;
}

interface ActivityTimelineProps {
  activities: ActivityLog[];
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'order_created':
      return <Package className="w-4 h-4 text-blue-600" />;
    case 'order_accepted':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'order_dispatched':
      return <Package className="w-4 h-4 text-orange-600" />;
    case 'order_delivered':
      return <CheckCircle className="w-4 h-4 text-green-700" />;
    case 'order_cancelled':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    case 'payment_updated':
      return <DollarSign className="w-4 h-4 text-green-600" />;
    case 'individual_products_selected':
    case 'individual_products_changed':
      return <Package className="w-4 h-4 text-purple-600" />;
    case 'quantity_updated':
    case 'order_edited':
      return <Edit className="w-4 h-4 text-gray-600" />;
    default:
      return <History className="w-4 h-4 text-gray-600" />;
  }
};

const getActivityColor = (action: string) => {
  switch (action) {
    case 'order_created':
      return 'border-blue-200 bg-blue-50';
    case 'order_accepted':
      return 'border-green-200 bg-green-50';
    case 'order_dispatched':
      return 'border-orange-200 bg-orange-50';
    case 'order_delivered':
      return 'border-green-300 bg-green-100';
    case 'order_cancelled':
      return 'border-red-200 bg-red-50';
    case 'payment_updated':
      return 'border-green-200 bg-green-50';
    case 'individual_products_selected':
    case 'individual_products_changed':
      return 'border-purple-200 bg-purple-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="w-5 h-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No activity recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  // Sort activities by timestamp (newest first)
  const sortedActivities = [...activities].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-5 h-5" />
          Activity Timeline ({activities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedActivities.map((activity, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getActivityColor(activity.action)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getActivityIcon(activity.action)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                    <span className="font-medium">{activity.performed_by}</span>
                    <span>•</span>
                    <span>{new Date(activity.timestamp).toLocaleString()}</span>
                  </div>

                  {/* Show additional details if available */}
                  {activity.details && Object.keys(activity.details).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer hover:text-gray-900">
                          View details
                        </summary>
                        <div className="mt-2 space-y-1 pl-2">
                          {Object.entries(activity.details).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-medium capitalize">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
