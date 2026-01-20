import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Factory, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { formatIndianDate } from '@/utils/formatHelpers';
import type { Order } from '@/services/orderService';

interface OrderProductionInfoProps {
  order: Order;
  compact?: boolean;
}

export default function OrderProductionInfo({ order, compact = false }: OrderProductionInfoProps) {
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order && (order.status === 'pending' || order.status === 'accepted')) {
      loadProductionInfo();
    }
  }, [order]);

  const loadProductionInfo = async () => {
    setLoading(true);
    try {
      // Get product IDs from order items
      const productIds = order.items
        ?.filter(item => item.productType === 'product' && item.productId)
        .map(item => item.productId!)
        .filter((id, index, self) => self.indexOf(id) === index) || [];

      if (productIds.length === 0) {
        setProductionBatches([]);
        return;
      }

      // Fetch production batches for each product
      const allBatches: ProductionBatch[] = [];
      for (const productId of productIds) {
        const { data } = await ProductionService.getBatches({ 
          product_id: productId,
          status: 'all' // Get all statuses to show if production has started
        });
        if (data) {
          // Filter to only show active batches (not cancelled or completed)
          const activeBatches = data.filter(batch => 
            batch.status !== 'cancelled' && batch.status !== 'completed'
          );
          allBatches.push(...activeBatches);
        }
      }

      // Also check for batches linked to this order
      const { data: orderBatches } = await ProductionService.getBatches({ 
        order_id: order.id 
      });
      if (orderBatches) {
        const activeOrderBatches = orderBatches.filter(batch => 
          batch.status !== 'cancelled' && batch.status !== 'completed'
        );
        allBatches.push(...activeOrderBatches);
      }

      // Remove duplicates and sort by completion date
      const uniqueBatches = allBatches.filter((batch, index, self) =>
        index === self.findIndex(b => b.id === batch.id)
      );
      uniqueBatches.sort((a, b) => {
        const dateA = a.completion_date ? new Date(a.completion_date).getTime() : 0;
        const dateB = b.completion_date ? new Date(b.completion_date).getTime() : 0;
        return dateA - dateB;
      });

      setProductionBatches(uniqueBatches);
    } catch (error) {
      console.error('Error loading production info:', error);
      setProductionBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'in_production':
        return 'bg-blue-100 text-blue-800';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
      case 'in_production':
        return 'In Production';
      case 'planned':
        return 'Planned';
      case 'completed':
        return 'Completed';
      default:
        return status.replace('_', ' ');
    }
  };

  if (order.status !== 'pending' && order.status !== 'accepted') {
    return null;
  }

  if (loading) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Clock className="w-3 h-3 animate-spin" />
          <span>Loading...</span>
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Loading production info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (productionBatches.length === 0) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 text-xs">
          <AlertCircle className="w-3 h-3 text-gray-500" />
          <span className="text-gray-600">Production not started</span>
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Production not started</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    // Compact view for cards/tables
    const earliestBatch = productionBatches[0];
    return (
      <div className="flex items-center gap-2 text-xs">
        <Factory className="w-3 h-3 text-blue-600" />
        <span className="text-gray-700 font-medium">Production Started</span>
        {earliestBatch.completion_date && (
          <>
            <span className="text-gray-500">•</span>
            <Calendar className="w-3 h-3 text-gray-500" />
            <span className="text-gray-600">
              Complete: {formatIndianDate(earliestBatch.completion_date)}
            </span>
          </>
        )}
      </div>
    );
  }

  // Full view for details page
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Factory className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-base">Production Information</h3>
        </div>
        <div className="space-y-3">
          {productionBatches.map((batch) => (
            <div key={batch.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-sm text-gray-900">{batch.batch_number}</div>
                  {batch.product_name && (
                    <div className="text-xs text-gray-600 mt-1">{batch.product_name}</div>
                  )}
                </div>
                <Badge className={getStatusColor(batch.status)}>
                  {getStatusLabel(batch.status)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div>
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium ml-1">{batch.planned_quantity}</span>
                </div>
                {batch.completion_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-600">Complete:</span>
                    <span className="font-medium ml-1">{formatIndianDate(batch.completion_date)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
