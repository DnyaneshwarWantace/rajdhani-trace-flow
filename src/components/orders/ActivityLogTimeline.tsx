import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, Package, DollarSign, QrCode, Edit, ChevronDown, ChevronUp } from 'lucide-react';

interface ActivityLog {
  action: string;
  description: string;
  performed_by: string;
  performed_by_email: string;
  timestamp: string;
  details?: any;
}

interface ActivityLogTimelineProps {
  logs: ActivityLog[];
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'order_created':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'order_accepted':
      return <CheckCircle className="w-4 h-4 text-blue-600" />;
    case 'order_dispatched':
      return <Package className="w-4 h-4 text-orange-600" />;
    case 'order_delivered':
      return <Package className="w-4 h-4 text-green-600" />;
    case 'payment_updated':
      return <DollarSign className="w-4 h-4 text-purple-600" />;
    case 'individual_products_selected':
    case 'individual_products_changed':
      return <QrCode className="w-4 h-4 text-indigo-600" />;
    case 'quantity_updated':
    case 'order_edited':
      return <Edit className="w-4 h-4 text-gray-600" />;
    default:
      return <Clock className="w-4 h-4 text-gray-600" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'order_created':
    case 'order_accepted':
      return 'bg-green-50 border-green-200';
    case 'order_dispatched':
      return 'bg-orange-50 border-orange-200';
    case 'order_delivered':
      return 'bg-green-50 border-green-200';
    case 'payment_updated':
      return 'bg-purple-50 border-purple-200';
    case 'individual_products_selected':
    case 'individual_products_changed':
      return 'bg-indigo-50 border-indigo-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

export function ActivityLogTimeline({ logs }: ActivityLogTimelineProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  if (!logs || logs.length === 0) {
    return null;
  }

  // Sort logs by timestamp descending (newest first)
  const sortedLogs = [...logs].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const toggleExpanded = (index: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-5 h-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedLogs.map((log, index) => (
            <div
              key={index}
              className={`border rounded-lg p-3 ${getActionColor(log.action)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {log.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                    <span className="font-medium">{log.performed_by}</span>
                    <span>•</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 text-xs text-gray-600 bg-white bg-opacity-50 p-2 rounded">
                      {log.details.old_status && log.details.new_status && (
                        <div className="font-medium">Status: <span className="text-orange-600">{log.details.old_status}</span> → <span className="text-green-600">{log.details.new_status}</span></div>
                      )}
                      {log.details.product_name && (
                        <div className="font-medium">Product: {log.details.product_name}</div>
                      )}
                      {log.details.selected_count !== undefined && (
                        <div>
                          <span className="font-medium">Selected:</span> {log.details.selected_count}/{log.details.required_count} products
                          {log.details.previously_selected_count > 0 && (
                            <span className="ml-2 text-orange-600">
                              (Previously: {log.details.previously_selected_count})
                            </span>
                          )}
                        </div>
                      )}
                      {log.details.previous_amount !== undefined && log.details.new_amount !== undefined && (
                        <div>
                          <span className="font-medium">Payment:</span> ₹{log.details.previous_amount?.toLocaleString()} → ₹{log.details.new_amount?.toLocaleString()}
                          <span className="ml-2 text-green-600">(+₹{log.details.difference?.toLocaleString()})</span>
                        </div>
                      )}
                      {log.details.outstanding !== undefined && (
                        <div>
                          <span className="font-medium">Outstanding:</span> ₹{log.details.outstanding?.toLocaleString()}
                        </div>
                      )}

                      {/* Individual Products Details */}
                      {log.details.individual_products && log.details.individual_products.length > 0 && (
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(index)}
                            className="h-6 px-2 text-xs"
                          >
                            {expandedLogs.has(index) ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Hide Products
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Show {log.details.individual_products.length} Products
                              </>
                            )}
                          </Button>

                          {expandedLogs.has(index) && (
                            <div className="mt-2 overflow-x-auto">
                              <table className="w-full border-collapse border border-gray-300">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="border border-gray-300 p-1 text-left text-xs">#</th>
                                    <th className="border border-gray-300 p-1 text-left text-xs">Product ID</th>
                                    <th className="border border-gray-300 p-1 text-left text-xs">QR Code</th>
                                    <th className="border border-gray-300 p-1 text-left text-xs">Serial Number</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {log.details.individual_products.map((product: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      <td className="border border-gray-300 p-1 text-xs">{idx + 1}</td>
                                      <td className="border border-gray-300 p-1 text-xs font-mono">{product.id}</td>
                                      <td className="border border-gray-300 p-1 text-xs font-mono">{product.qr_code}</td>
                                      <td className="border border-gray-300 p-1 text-xs">{product.serial_number}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
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
