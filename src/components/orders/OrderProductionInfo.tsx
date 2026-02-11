import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Factory, Calendar, Clock, AlertCircle } from 'lucide-react';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { formatIndianDate } from '@/utils/formatHelpers';
import type { Order } from '@/services/orderService';

interface OrderProductionInfoProps {
  order: Order;
  compact?: boolean;
}

export default function OrderProductionInfo({ order, compact = false }: OrderProductionInfoProps) {
  const navigate = useNavigate();
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(false);

  // First order item that is a product (for "Go to Production" pre-fill)
  const firstProductItem = order.items?.find(item => item.productType === 'product' && item.productId);

  // Reserve fixed height for compact block so "Go to Production" button never causes layout shift
  const compactMinHeight = 'min-h-[3.5rem]';

  // Depend only on order id and status so we don't refetch when parent re-renders with new object reference
  const orderId = order?.id;
  const orderStatus = order?.status;
  const shouldLoad = order && (orderStatus === 'pending' || orderStatus === 'accepted');

  useEffect(() => {
    if (orderId && shouldLoad) {
      loadProductionInfo();
    }
  }, [orderId, shouldLoad]);

  const loadProductionInfo = async () => {
    setLoading(true);
    try {
      const productIds = order.items
        ?.filter(item => item.productType === 'product' && item.productId)
        .map(item => item.productId!)
        .filter((id, index, self) => self.indexOf(id) === index) || [];

      if (productIds.length === 0) {
        setProductionBatches([]);
        return;
      }

      // Fetch batches for all products and for order in parallel (not sequential)
      const [productBatchesResults, orderBatchesResult] = await Promise.all([
        Promise.all(productIds.map(productId =>
          ProductionService.getBatches({ product_id: productId, status: 'all' })
        )),
        ProductionService.getBatches({ order_id: order.id })
      ]);

      const allBatches: ProductionBatch[] = [];
      productBatchesResults.forEach(({ data }) => {
        if (data) {
          const active = data.filter(b => b.status !== 'cancelled' && b.status !== 'completed');
          allBatches.push(...active);
        }
      });
      const { data: orderBatches } = orderBatchesResult;
      if (orderBatches) {
        const active = orderBatches.filter(b => b.status !== 'cancelled' && b.status !== 'completed');
        allBatches.push(...active);
      }

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
        <div className={`${compactMinHeight} flex flex-col justify-center`}>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-3 h-3 animate-spin shrink-0" />
            <span>Loading production…</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>Complete: —</span>
          </div>
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

  const handleGoToProduction = () => {
    if (!firstProductItem) return;
    navigate('/production/create', {
      state: {
        fromOrder: true,
        orderId: order.id,
        productId: firstProductItem.productId,
        productName: firstProductItem.productName,
        planned_quantity: firstProductItem.quantity ?? 0,
        expected_delivery: order.expectedDelivery,
        order_number: order.orderNumber || order.id,
        customer_name: order.customerName || '',
      },
    });
  };

  if (productionBatches.length === 0) {
    if (compact) {
      return (
        <div className={`${compactMinHeight} flex flex-col justify-center`}>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <AlertCircle className="w-3 h-3 text-gray-500 shrink-0" />
            <span className="text-gray-600">Production not started</span>
            {firstProductItem && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs ml-1 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGoToProduction();
                }}
              >
                <Factory className="w-3 h-3 mr-1" />
                Go to Production
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>Complete: —</span>
          </div>
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Production not started</span>
            </div>
            {firstProductItem && (
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleGoToProduction}
              >
                <Factory className="w-4 h-4 mr-2" />
                Go to Production
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    // Compact view for cards/tables - fixed layout so completion date and "Go to Production" never cause shift
    const earliestBatch = productionBatches[0];
    const completionDate = earliestBatch?.completion_date
      ? formatIndianDate(earliestBatch.completion_date)
      : '—';
    return (
      <div className={`${compactMinHeight} flex flex-col justify-center`}>
        <div className="flex items-center gap-2 text-xs">
          <Factory className="w-3 h-3 text-blue-600 shrink-0" />
          <span className="text-gray-700 font-medium">Production Started</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
          <Calendar className="w-3 h-3 text-gray-500 shrink-0" />
          <span>Complete: {completionDate}</span>
        </div>
      </div>
    );
  }

  // Full view for details page
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-base">Production Information</h3>
          </div>
          {firstProductItem && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={handleGoToProduction}
            >
              <Factory className="w-4 h-4 mr-2" />
              New batch
            </Button>
          )}
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
