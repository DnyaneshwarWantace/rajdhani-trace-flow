import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { Loader2, X } from 'lucide-react';
import type { ProductionBatch, CreateProductionBatchData } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { OrderService } from '@/services/orderService';
import type { Product } from '@/types/product';
import { formatIndianDate } from '@/utils/formatHelpers';

interface ProductionFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductionBatchData) => Promise<void>;
  selectedBatch: ProductionBatch | null;
  submitting: boolean;
}

function FormFields({
  formData,
  setFormData,
  products,
  loadingProducts,
  productName,
  selectedBatch,
  orderEarliestDelivery,
}: {
  formData: CreateProductionBatchData;
  setFormData: (d: CreateProductionBatchData) => void;
  products: Product[];
  loadingProducts: boolean;
  productName: string;
  selectedBatch: ProductionBatch | null;
  orderEarliestDelivery: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="product_id">Product *</Label>
        {loadingProducts && !productName ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
          </div>
        ) : selectedBatch ? (
          <div className="flex flex-col gap-1">
            <Input value={productName || 'Loading...'} disabled className="bg-gray-50" />
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
          required
        />
        {selectedBatch && orderEarliestDelivery ? (
          <p className="text-xs text-red-600 font-medium mt-1">
            Order delivery: {formatIndianDate(orderEarliestDelivery)}. Suggested: complete before this date.
          </p>
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
  );
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
        loadProductName(selectedBatch.product_id, selectedBatch.product_name);
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
        setFormData({ product_id: '', planned_quantity: 0, priority: 'medium', notes: '', completion_date: '' });
        setProductName('');
        setOrderEarliestDelivery(null);
      }
    }
  }, [isOpen, selectedBatch]);

  const loadProductName = async (productId: string, existingName?: string) => {
    if (existingName) { setProductName(existingName); return; }
    if (products.length > 0) {
      const product = products.find(p => p.id === productId);
      if (product) { setProductName(product.name); return; }
    }
    try {
      const product = await ProductService.getProductById(productId);
      if (product) setProductName(product.name);
    } catch {
      setProductName('Product');
    }
  };

  useEffect(() => {
    if (selectedBatch && products.length > 0 && !productName) {
      const product = products.find(p => p.id === selectedBatch.product_id);
      if (product) setProductName(product.name);
    }
  }, [products, selectedBatch, productName]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const { products: productsList } = await ProductService.getProducts({ limit: 1000 });
      setProducts(productsList.filter(p => p.status === 'active'));
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || formData.planned_quantity <= 0) return;
    await onSubmit(formData);
  };

  const canSubmit = !!formData.product_id && formData.planned_quantity > 0 && !!formData.completion_date;
  const title = selectedBatch ? 'Edit Production Batch' : 'Create Production Batch';
  const subtitle = selectedBatch
    ? `Update the production batch details${productName ? ` — ${productName}` : ''}`
    : 'Create a new production batch for a product';

  // ── MOBILE: bottom sheet via portal ─────────────────────────────────────────
  const mobileSheet = isOpen
    ? createPortal(
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          {/* Sheet */}
          <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">{title}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            {/* Scrollable form body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <FormFields
                  formData={formData}
                  setFormData={setFormData}
                  products={products}
                  loadingProducts={loadingProducts}
                  productName={productName}
                  selectedBatch={selectedBatch}
                  orderEarliestDelivery={orderEarliestDelivery}
                />
              </div>
              {/* Footer */}
              <div className="px-4 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white active:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 active:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {selectedBatch ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    selectedBatch ? 'Update Batch' : 'Create Batch'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;

  // ── DESKTOP: original centered dialog ───────────────────────────────────────
  return (
    <>
      {mobileSheet}

      <div className="hidden lg:block">
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{subtitle}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <FormFields
                  formData={formData}
                  setFormData={setFormData}
                  products={products}
                  loadingProducts={loadingProducts}
                  productName={productName}
                  selectedBatch={selectedBatch}
                  orderEarliestDelivery={orderEarliestDelivery}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="text-white"
                  disabled={submitting || !canSubmit}
                >
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
      </div>
    </>
  );
}
