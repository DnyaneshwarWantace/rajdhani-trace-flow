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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { QrCode, Package, Loader2, CheckCircle } from 'lucide-react';
import { IndividualProductService } from '@/services/individualProductService';
import { formatIndianDate } from '@/utils/formatHelpers';

interface IndividualProductSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderItem: {
    id: string;
    product_id?: string;
    product_name: string;
    quantity: number;
    selected_individual_products?: any[];
  } | null;
  onSave: (selectedProducts: any[]) => Promise<void>;
}

export function IndividualProductSelectionDialog({
  isOpen,
  onClose,
  orderItem,
  onSave,
}: IndividualProductSelectionDialogProps) {
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('🟢 Dialog useEffect - isOpen:', isOpen, 'product_id:', orderItem?.product_id);
    if (isOpen && orderItem?.product_id) {
      console.log('🟢 Calling loadAvailableProducts');
      loadAvailableProducts();
    } else if (isOpen) {
      console.log('🔴 Dialog opened but NO product_id!');
      console.log('🔴 orderItem:', orderItem);
    }
  }, [isOpen, orderItem?.product_id]);

  useEffect(() => {
    if (orderItem?.selected_individual_products) {
      setSelectedProducts(orderItem.selected_individual_products);
    } else {
      setSelectedProducts([]);
    }
  }, [orderItem]);

  const loadAvailableProducts = async () => {
    if (!orderItem?.product_id) {
      console.log('No product_id in orderItem:', orderItem);
      return;
    }

    console.log('Loading individual products for product_id:', orderItem.product_id);
    setLoading(true);
    try {
      const { products } = await IndividualProductService.getIndividualProductsByProductId(
        orderItem.product_id,
        { status: 'available' }
      );
      console.log('Loaded individual products:', products?.length || 0, products);
      setAvailableProducts(products || []);
    } catch (error) {
      console.error('Error loading individual products:', error);
      setAvailableProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProduct = (product: any) => {
    const isSelected = selectedProducts.some(p => p.id === product.id);
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      if (selectedProducts.length < (orderItem?.quantity || 0)) {
        setSelectedProducts([...selectedProducts, product]);
      }
    }
  };

  const handleAutoSelect = () => {
    const productsToSelect = availableProducts.slice(0, orderItem?.quantity || 0);
    setSelectedProducts(productsToSelect);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedProducts);
      onClose();
    } catch (error) {
      console.error('Error saving selection:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!orderItem) return null;

  const requiredQuantity = orderItem.quantity;
  const selectionComplete = selectedProducts.length === requiredQuantity;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Select Individual Products
          </DialogTitle>
          <DialogDescription>
            {orderItem.product_name} • Required: {requiredQuantity} • Selected: {selectedProducts.length}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : availableProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No individual products available
            </div>
          ) : (
            <div className="space-y-2">
              {availableProducts.map((product) => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                const isDisabled = !isSelected && selectedProducts.length >= requiredQuantity;

                return (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-3 ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    } ${isDisabled ? 'opacity-50' : 'cursor-pointer hover:border-blue-300'}`}
                    onClick={() => !isDisabled && handleToggleProduct(product)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <QrCode className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold">{product.qr_code || product.id}</span>
                          <Badge variant={isSelected ? 'default' : 'secondary'} className="text-xs">
                            {product.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
                          {product.length && product.width && (
                            <div>
                              <span className="font-medium">Size:</span> {product.length} × {product.width}
                            </div>
                          )}
                          {product.weight && (
                            <div>
                              <span className="font-medium">Weight:</span> {product.weight}
                            </div>
                          )}
                          {product.quality_grade && (
                            <div>
                              <span className="font-medium">Grade:</span> {product.quality_grade}
                            </div>
                          )}
                          {product.added_date && (
                            <div>
                              <span className="font-medium">Added:</span> {formatIndianDate(product.added_date)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectionComplete && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Selection Complete
              </Badge>
            )}
            {!selectionComplete && (
              <span className="text-sm text-gray-600">
                {requiredQuantity - selectedProducts.length} more needed
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAutoSelect} disabled={loading || saving}>
              Auto Select
            </Button>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectionComplete || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Selection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
