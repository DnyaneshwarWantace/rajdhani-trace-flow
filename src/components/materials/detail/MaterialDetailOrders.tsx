import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Package, CheckCircle, Clock } from 'lucide-react';
import { formatIndianDate, formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import type { RawMaterial } from '@/types/material';

interface MaterialDetailOrdersProps {
  material: RawMaterial;
}

interface OrderItem {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  quantity: number;
  unit: string;
  status: string;
  created_at: string;
  accepted_at?: string;
  dispatched_at?: string;
  delivered_at?: string;
}

export default function MaterialDetailOrders({ material }: MaterialDetailOrdersProps) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [material.id]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:8000/api/raw-materials/${material.id}/orders`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const reservedOrders = orders.filter(o => o.status === 'pending' || o.status === 'accepted');
  const soldOrders = orders.filter(o => o.status === 'dispatched' || o.status === 'delivered');

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      accepted: { label: 'Reserved', className: 'bg-blue-100 text-blue-800 border-blue-300', icon: Package },
      dispatched: { label: 'Dispatched', className: 'bg-orange-100 text-orange-800 border-orange-300', icon: ShoppingCart },
      delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders Using This Material</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading orders...</p>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders Using This Material</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No orders found for this material.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Orders Using This Material
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reserved Orders */}
        {reservedOrders.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Reserved Orders ({reservedOrders.length})
            </h4>
            <div className="space-y-3">
              {reservedOrders.map((order) => (
                <div
                  key={order.order_id}
                  className="p-4 border border-blue-200 rounded-lg bg-blue-50/50 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{order.order_number}</p>
                      <p className="text-sm text-gray-600">{order.customer_name}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-3">
                    <div>
                      <span className="font-medium">Quantity:</span>{' '}
                      {formatIndianNumberWithDecimals(order.quantity, 2)} {order.unit}
                    </div>
                    <div>
                      <span className="font-medium">Order Date:</span>{' '}
                      {formatIndianDate(order.created_at)}
                    </div>
                    {order.customer_phone && (
                      <div className="col-span-2">
                        <span className="font-medium">Phone:</span> {order.customer_phone}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sold Orders */}
        {soldOrders.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Sold/Dispatched Orders ({soldOrders.length})
            </h4>
            <div className="space-y-3">
              {soldOrders.map((order) => (
                <div
                  key={order.order_id}
                  className="p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{order.order_number}</p>
                      <p className="text-sm text-gray-600">{order.customer_name}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-3">
                    <div>
                      <span className="font-medium">Quantity:</span>{' '}
                      {formatIndianNumberWithDecimals(order.quantity, 2)} {order.unit}
                    </div>
                    {order.dispatched_at && (
                      <div>
                        <span className="font-medium">Dispatched:</span>{' '}
                        {formatIndianDate(order.dispatched_at)}
                      </div>
                    )}
                    {order.delivered_at && (
                      <div>
                        <span className="font-medium">Delivered:</span>{' '}
                        {formatIndianDate(order.delivered_at)}
                      </div>
                    )}
                    {order.customer_phone && (
                      <div className="col-span-2">
                        <span className="font-medium">Phone:</span> {order.customer_phone}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
