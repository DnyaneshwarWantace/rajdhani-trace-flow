import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, Calendar, User, Box, AlertCircle } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';
import { OrderService } from '@/services/orderService';
import { ProductService } from '@/services/productService';
import { formatIndianDate } from '@/utils/formatHelpers';

interface PendingOrder {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  order_date: string;
  expected_delivery: string;
  status: string;
  priority: string;
  quantity_needed: number;
  product_value: number;
  product_id?: string;
  product_name?: string;
  current_stock?: number;
  shortage?: number;
}

interface ProductionDuplicateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, completionDate: string) => Promise<void>;
  batch: ProductionBatch | null;
  isDuplicating: boolean;
}

export default function ProductionDuplicateDialog({
  isOpen,
  onClose,
  onConfirm,
  batch,
  isDuplicating,
}: ProductionDuplicateDialogProps) {
  const [quantity, setQuantity] = useState<string>('');
  const [completionDate, setCompletionDate] = useState<string>('');
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Set default quantity when batch changes
  useEffect(() => {
    if (batch && isOpen) {
      setQuantity(batch.planned_quantity.toString());
      setCompletionDate('');
      loadPendingOrders();
    }
  }, [batch, isOpen]);

  const loadPendingOrders = async () => {
    if (!batch?.product_id) return;
    
    setLoadingOrders(true);
    try {
      const { data, error } = await OrderService.getPendingOrdersForProduct(batch.product_id);
      if (error) {
        console.error('Error loading pending orders:', error);
        setPendingOrders([]);
        return;
      }

      if (data) {
        // Enrich with stock information
        const ordersWithStock = await Promise.all(
          data.map(async (order) => {
            let currentStock = 0;
            let shortage = 0;

            if (order.product_id) {
              try {
                const product = await ProductService.getProductById(order.product_id);
                currentStock = product.current_stock || 0;
                shortage = Math.max(0, order.quantity_needed - currentStock);
              } catch (error) {
                console.error(`Error fetching product ${order.product_id}:`, error);
              }
            }

            return {
              ...order,
              current_stock: currentStock,
              shortage: shortage,
            };
          })
        );

        // Sort: orders with shortage first, then by delivery date
        ordersWithStock.sort((a, b) => {
          const aHasShortage = (a.shortage ?? 0) > 0;
          const bHasShortage = (b.shortage ?? 0) > 0;
          
          if (aHasShortage && !bHasShortage) return -1;
          if (!aHasShortage && bHasShortage) return 1;
          
          const aDate = new Date(a.expected_delivery).getTime();
          const bDate = new Date(b.expected_delivery).getTime();
          return aDate - bDate;
        });

        setPendingOrders(ordersWithStock);
      }
    } catch (error) {
      console.error('Error loading pending orders:', error);
      setPendingOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSelectOrder = (order: PendingOrder) => {
    setQuantity(order.quantity_needed.toString());
    
    // Set completion date to 2 days before expected delivery
    const deliveryDate = new Date(order.expected_delivery);
    const completionDateObj = new Date(deliveryDate);
    completionDateObj.setDate(completionDateObj.getDate() - 2);
    setCompletionDate(completionDateObj.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return;
    }
    if (!completionDate) {
      return;
    }
    await onConfirm(qty, completionDate);
  };

  const handleClose = () => {
    if (!isDuplicating) {
      setQuantity('');
      setCompletionDate('');
      setPendingOrders([]);
      onClose();
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-blue-500 text-white',
      low: 'bg-gray-500 text-white',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500 text-white',
      accepted: 'bg-blue-500 text-white',
      in_production: 'bg-purple-500 text-white',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  if (!batch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Duplicate Production Batch</DialogTitle>
          <DialogDescription>
            Create a new production batch for <strong>{batch.product_name}</strong> based on batch{' '}
            <strong>{batch.batch_number}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Pending Orders Section */}
        {pendingOrders.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Pending Orders for this Product</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingOrders.map((order, index) => (
                <Card
                  key={`${order.order_id}-${index}`}
                  className="p-3 hover:shadow-md transition-all cursor-pointer border-2 hover:border-green-600 bg-white"
                  onClick={() => handleSelectOrder(order)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm">{order.order_number}</h4>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <Badge className={getStatusColor(order.status)} variant="secondary" style={{ fontSize: '10px', padding: '2px 6px' }}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(order.priority)} variant="secondary" style={{ fontSize: '10px', padding: '2px 6px' }}>
                            {order.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-start gap-2 text-xs">
                        <Box className="h-3 w-3 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="font-bold text-blue-900 break-words">{order.product_name}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{order.customer_name}</span>
                      </div>

                      <div className="space-y-1 pt-1 pb-1 bg-gray-50 rounded p-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Order Qty:</span>
                          <span className="font-bold text-gray-900">{order.quantity_needed}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Current Stock:</span>
                          <span className={`font-bold ${order.current_stock && order.current_stock > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                            {order.current_stock ?? 'N/A'}
                          </span>
                        </div>
                        {order.shortage !== undefined && order.shortage > 0 && (
                          <div className="flex items-center justify-between text-xs pt-0.5 border-t border-red-200">
                            <span className="text-red-600 font-semibold flex items-center gap-1">
                              <AlertCircle className="h-2.5 w-2.5" />
                              Need to Make:
                            </span>
                            <span className="font-bold text-red-600">{order.shortage}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>Deliver: {formatIndianDate(order.expected_delivery)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {loadingOrders && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-gray-600 mr-2" />
            <span className="text-sm text-gray-600">Loading pending orders...</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Planned Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isDuplicating}
                required
              />
              <p className="text-sm text-gray-500">
                Original quantity: {batch.planned_quantity}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="completionDate">Expected Completion Date *</Label>
              <Input
                id="completionDate"
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                disabled={isDuplicating}
                required
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-sm text-gray-500">
                Select a date or click on an order above to auto-fill
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDuplicating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isDuplicating || !quantity || parseInt(quantity, 10) <= 0 || !completionDate}
            >
              {isDuplicating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Duplicating...
                </>
              ) : (
                'Duplicate Batch'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
