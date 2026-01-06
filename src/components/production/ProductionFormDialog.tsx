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
    operator: '',
    supervisor: '',
    notes: '',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productName, setProductName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      if (selectedBatch) {
        setFormData({
          product_id: selectedBatch.product_id,
          planned_quantity: selectedBatch.planned_quantity,
          priority: selectedBatch.priority,
          operator: selectedBatch.operator || '',
          supervisor: selectedBatch.supervisor || '',
          notes: selectedBatch.notes || '',
        });
        // Load product name
        loadProductName(selectedBatch.product_id, selectedBatch.product_name);
      } else {
        setFormData({
          product_id: '',
          planned_quantity: 0,
          priority: 'medium',
          operator: '',
          supervisor: '',
          notes: '',
        });
        setProductName('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || formData.planned_quantity <= 0) {
      return;
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="operator">Operator</Label>
                <Input
                  id="operator"
                  value={formData.operator}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                  placeholder="Operator name"
                />
              </div>
              <div>
                <Label htmlFor="supervisor">Supervisor</Label>
                <Input
                  id="supervisor"
                  value={formData.supervisor}
                  onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                  placeholder="Supervisor name"
                />
              </div>
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
            <Button type="submit" disabled={submitting || !formData.product_id || formData.planned_quantity <= 0}>
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


