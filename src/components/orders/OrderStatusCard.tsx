import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle, Package } from 'lucide-react';

interface OrderStatusCardProps {
  orderNumber: string;
  customerName: string;
  status: string;
  workflowStep?: string;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    accepted: 'bg-blue-100 text-blue-800 border-blue-200',
    in_production: 'bg-purple-100 text-purple-800 border-purple-200',
    ready: 'bg-green-100 text-green-800 border-green-200',
    dispatched: 'bg-orange-100 text-orange-800 border-orange-200',
    delivered: 'bg-teal-100 text-teal-800 border-teal-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="w-4 h-4" />;
    case 'accepted': return <CheckCircle className="w-4 h-4" />;
    case 'dispatched': return <Package className="w-4 h-4" />;
    case 'delivered': return <CheckCircle className="w-4 h-4" />;
    case 'cancelled': return <AlertTriangle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

export function OrderStatusCard({ orderNumber, customerName, status, workflowStep }: OrderStatusCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">#{orderNumber}</h2>
            <p className="text-muted-foreground mt-1">{customerName}</p>
          </div>
          <div className="text-right">
            <Badge className={`${getStatusColor(status)} flex items-center gap-2 px-3 py-2 border`}>
              {getStatusIcon(status)}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            {workflowStep && (
              <p className="text-sm text-muted-foreground mt-1">{workflowStep}</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Order Progress</span>
            <span>{workflowStep || 'Pending'}</span>
          </div>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                status === 'delivered' ? 'bg-green-500' :
                status === 'dispatched' ? 'bg-orange-500' :
                status === 'accepted' ? 'bg-blue-500' :
                'bg-gray-300'
              }`}
              style={{
                width: status === 'delivered' ? '100%' :
                       status === 'dispatched' ? '66%' :
                       status === 'accepted' ? '33%' : '0%'
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span className={status === 'accepted' ? 'text-blue-600 font-medium' : ''}>Accept</span>
            <span className={status === 'dispatched' ? 'text-orange-600 font-medium' : ''}>Dispatch</span>
            <span className={status === 'delivered' ? 'text-green-600 font-medium' : ''}>Delivered</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
