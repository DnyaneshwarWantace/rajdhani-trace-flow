import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { ProductionBatch, CreateProductionBatchData } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { OrderService } from '@/services/orderService';
import type { Product } from '@/types/product';

interface ProductionFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductionBatchData) => Promise<void>;
  selectedBatch: ProductionBatch | null;
  submitting: boolean;
}

export default function ProductionFormDialog({
  isOpen,
  onClose,
  onSubmit,
  selectedBatch,
  submitting,
}: ProductionFormDialogProps) {
  const [formData, setFormData] = useState<CreateProductionBatchData>({
    product_id: '',
    planned_quantity: 0,
    priority: 'medium',
    notes: '',
    completion_date: '',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productName, setProductName] = useState<string>('');
  // When editing: earliest order delivery date for this product (completion must be 2 days before)
  const [orderEarliestDelivery, setOrderEarliestDelivery] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      if (selectedBatch) {
        const completionDate = selectedBatch.completion_date
          ? selectedBatch.completion_date.split('T')[0]
          : '';

        setFormData({
          product_id: selectedBatch.product_id,
          planned_quantity: selectedBatch.planned_quantity,
          priority: selectedBatch.priority,
          notes: selectedBatch.notes || '',
          completion_date: completionDate,
        });
        // Load product name
        loadProductName(selectedBatch.product_id, selectedBatch.product_name);
        // Load pending orders for this product to enforce completion date ≤ (order delivery - 2 days)
        (async () => {
          const { data: pendingOrders } = await OrderService.getPendingOrdersForProduct(selectedBatch.product_id);
          if (pendingOrders && pendingOrders.length > 0) {
            const dates = pendingOrders.map((o) => o.expected_delivery).filter(Boolean);
            if (dates.length > 0) {
              const earliest = dates.reduce((a, b) => (a <= b ? a : b));
              setOrderEarliestDelivery(earliest);
            } else {
              setOrderEarliestDelivery(null);
            }
          } else {
            setOrderEarliestDelivery(null);
          }
        })();
      } else {
        setFormData({
          product_id: '',
          planned_quantity: 0,
          priority: 'medium',
          notes: '',
          completion_date: '',
        });
        setProductName('');
        setOrderEarliestDelivery(null);
      }
    }
  }, [isOpen, selectedBatch]);

  const loadProductName = async (productId: string, existingName?: string) => {
    // First try to use existing name from batch
    if (existingName) {
      setProductName(existingName);
      return;
    }
    
    // If products are loaded, find it in the list
    if (products.length > 0) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setProductName(product.name);
        return;
      }
    }
    
    // Otherwise, fetch it directly
    try {
      const product = await ProductService.getProductById(productId);
      if (product) {
        setProductName(product.name);
      }
    } catch (error) {
      console.error('Error loading product name:', error);
      setProductName('Product');
    }
  };

  useEffect(() => {
    // Update product name when products list loads
    if (selectedBatch && products.length > 0 && !productName) {
      const product = products.find(p => p.id === selectedBatch.product_id);
      if (product) {
        setProductName(product.name);
      }
    }
  }, [products, selectedBatch, productName]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const { products: productsList } = await ProductService.getProducts({ limit: 1000 });
      setProducts(productsList.filter(p => p.status === 'active'));
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // When editing and there are pending orders: completion must be at least 2 days before order delivery
  const maxCompletionDate = orderEarliestDelivery
    ? (() => {
        const d = new Date(orderEarliestDelivery);
        d.setDate(d.getDate() - 2);
        return d.toISOString().split('T')[0];
      })()
    : undefined;
  const isCompletionAfterOrderConstraint =
    selectedBatch && maxCompletionDate && formData.completion_date
      ? formData.completion_date > maxCompletionDate
      : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || formData.planned_quantity <= 0) {
      return;
    }
    if (selectedBatch && maxCompletionDate && formData.completion_date && formData.completion_date > maxCompletionDate) {
      return; // Blocked by validation below (button disabled + toast if they bypass)
    }
    await onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedBatch ? 'Edit Production Batch' : 'Create Production Batch'}</DialogTitle>
          <DialogDescription>
            {selectedBatch 
              ? `Update the production batch details${productName ? ` - ${productName}` : ''}` 
              : 'Create a new production batch for a product'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="product_id">Product *</Label>
              {loadingProducts && !productName ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                </div>
              ) : selectedBatch ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={productName || 'Loading...'}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Product cannot be changed after batch creation</p>
                </div>
              ) : (
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="planned_quantity">Planned Quantity *</Label>
              <Input
                id="planned_quantity"
                type="number"
                min="1"
                value={formData.planned_quantity || ''}
                onChange={(e) => setFormData({ ...formData, planned_quantity: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="completion_date">
                Expected Completion Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="completion_date"
                type="date"
                value={formData.completion_date || ''}
                onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                max={maxCompletionDate}
                required
                className={isCompletionAfterOrderConstraint ? 'border-red-500 focus:border-red-500' : ''}
              />
              {selectedBatch && orderEarliestDelivery ? (
                isCompletionAfterOrderConstraint ? (
                  <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                    ⚠️ Production must complete at least 2 days before order delivery date ({new Date(orderEarliestDelivery).toLocaleDateString()})
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mt-1">
                    Order delivery: {new Date(orderEarliestDelivery).toLocaleDateString()} — completion must be 2 days before this date.
                  </p>
                )
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Target date for completing this production batch
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="text-white" disabled={submitting || !formData.product_id || formData.planned_quantity <= 0 || !formData.completion_date || isCompletionAfterOrderConstraint}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {selectedBatch ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                selectedBatch ? 'Update Batch' : 'Create Batch'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


