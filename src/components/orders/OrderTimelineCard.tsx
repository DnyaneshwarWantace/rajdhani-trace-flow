import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface OrderTimelineCardProps {
  acceptedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
}

export function OrderTimelineCard({ acceptedAt, dispatchedAt, deliveredAt }: OrderTimelineCardProps) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Clock className="w-5 h-5" />
          Order Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <div className="font-medium text-green-800">Order Accepted</div>
              <div className="text-sm text-green-600">
                {acceptedAt ? new Date(acceptedAt).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <div>
              <div className="font-medium text-orange-800">Order Dispatched</div>
              <div className="text-sm text-orange-600">
                {dispatchedAt ? new Date(dispatchedAt).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <div className="font-medium text-green-800">Order Delivered</div>
              <div className="text-sm text-green-600">
                {deliveredAt ? new Date(deliveredAt).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
