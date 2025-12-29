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
import { QrCode, Package, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
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
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  const [selectedQrProduct, setSelectedQrProduct] = useState<any>(null);

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
    console.log('Currently selected products:', orderItem.selected_individual_products);

    setLoading(true);
    try {
      // Get currently selected product IDs
      const currentlySelectedIds = orderItem.selected_individual_products?.map(p =>
        p.individual_product_id || p.id || p
      ) || [];

      console.log('Currently selected IDs:', currentlySelectedIds);

      // Load available products
      const availableResponse = await IndividualProductService.getIndividualProductsByProductId(
        orderItem.product_id,
        { status: 'available' }
      );

      // If there are selected products, fetch their full details directly
      let currentlySelectedFullProducts: any[] = [];
      if (currentlySelectedIds.length > 0) {
        try {
          // Fetch full details of currently selected/reserved products
          const selectedProductsPromises = currentlySelectedIds.map(id =>
            IndividualProductService.getIndividualProductById(id).catch(err => {
              console.error(`Error loading product ${id}:`, err);
              return null;
            })
          );
          const selectedProductsResults = await Promise.all(selectedProductsPromises);
          currentlySelectedFullProducts = selectedProductsResults.filter(p => p !== null);

          console.log('Loaded full details for selected products:', currentlySelectedFullProducts.length);
        } catch (error) {
          console.error('Error loading selected products:', error);
        }
      }

      // Combine available and currently selected products
      const allProducts = [
        ...(availableResponse.products || []),
        ...currentlySelectedFullProducts
      ];

      // Remove duplicates based on ID
      const uniqueProducts = Array.from(
        new Map(allProducts.map(p => [p.id, p])).values()
      );

      // Sort: currently selected products first, then available products
      const sortedProducts = uniqueProducts.sort((a, b) => {
        const aIsSelected = currentlySelectedIds.includes(a.id);
        const bIsSelected = currentlySelectedIds.includes(b.id);

        if (aIsSelected && !bIsSelected) return -1;
        if (!aIsSelected && bIsSelected) return 1;
        return 0;
      });

      console.log('Loaded available products:', availableResponse.products?.length || 0);
      console.log('Loaded currently selected products:', currentlySelectedFullProducts.length);
      console.log('Total unique products:', sortedProducts.length);

      setAvailableProducts(sortedProducts);

      // Set selected products to full objects
      setSelectedProducts(currentlySelectedFullProducts);
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
      // Always allow deselection
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      // Allow selection even if at limit (user can swap products)
      setSelectedProducts([...selectedProducts, product]);
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

                return (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-3 cursor-pointer hover:border-blue-300 ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleToggleProduct(product)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 hover:bg-blue-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedQrProduct(product);
                              setQrCodeDialogOpen(true);
                            }}
                          >
                            <QrCode className="w-4 h-4 text-blue-600" />
                          </Button>
                          <span className="font-semibold">{product.id}</span>
                          <Badge
                            variant={isSelected ? 'default' : 'secondary'}
                            className={`text-xs ${product.status === 'reserved' ? 'bg-blue-600 text-white' : ''}`}
                          >
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
              <Badge variant="default" className="bg-green-600 text-white">
                <CheckCircle className="w-3 h-3 mr-1" />
                Selection Complete
              </Badge>
            )}
            {selectedProducts.length > requiredQuantity && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {selectedProducts.length - requiredQuantity} too many selected
              </Badge>
            )}
            {selectedProducts.length < requiredQuantity && (
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
            <Button onClick={handleSave} disabled={selectedProducts.length !== requiredQuantity || saving} className="text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Selection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* QR Code Display Dialog */}
      <Dialog open={qrCodeDialogOpen} onOpenChange={setQrCodeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code
            </DialogTitle>
            <DialogDescription>
              Scan this QR code to view product details
            </DialogDescription>
          </DialogHeader>

          {selectedQrProduct && (
            <div className="flex flex-col items-center gap-4 py-4">
              {/* QR Code Image */}
              <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedQrProduct.qr_code || selectedQrProduct.id}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>

              {/* Product Details */}
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Product ID:</span>
                  <span className="font-medium">{selectedQrProduct.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">QR Code:</span>
                  <span className="font-medium">{selectedQrProduct.qr_code}</span>
                </div>
                {selectedQrProduct.serial_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Serial Number:</span>
                    <span className="font-medium">{selectedQrProduct.serial_number}</span>
                  </div>
                )}
                {selectedQrProduct.status && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant={selectedQrProduct.status === 'available' ? 'default' : 'secondary'}>
                      {selectedQrProduct.status}
                    </Badge>
                  </div>
                )}
              </div>

              <Button onClick={() => setQrCodeDialogOpen(false)} className="w-full">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
