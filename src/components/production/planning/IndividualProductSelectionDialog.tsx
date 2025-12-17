import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Package, CheckCircle, AlertCircle } from 'lucide-react';
import { IndividualProductService } from '@/services/individualProductService';
import type { IndividualProduct } from '@/types/product';

interface IndividualProductSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialName: string;
  requiredQuantity: number;
  preSelectedProductIds?: string[];
  onSelect: (selectedProducts: IndividualProduct[]) => void;
}

export default function IndividualProductSelectionDialog({
  isOpen,
  onClose,
  materialId,
  materialName,
  requiredQuantity,
  preSelectedProductIds = [],
  onSelect,
}: IndividualProductSelectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<IndividualProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && materialId) {
      loadIndividualProducts();
      // Set pre-selected products
      setSelectedProducts(new Set(preSelectedProductIds));
    }
  }, [isOpen, materialId, preSelectedProductIds]);

  const loadIndividualProducts = async () => {
    try {
      setLoading(true);
      const { products: fetchedProducts } = await IndividualProductService.getIndividualProductsByProductId(
        materialId,
        { status: 'available', limit: 1000 }
      );
      setProducts(fetchedProducts || []);
    } catch (error) {
      console.error('Error loading individual products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      // Only allow selection up to required quantity
      if (newSelected.size >= requiredCount) {
        return; // Don't allow more selections
      }
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    const filtered = getFilteredProducts();
    if (selectedProducts.size === filtered.length) {
      setSelectedProducts(new Set());
    } else {
      // Only select up to required quantity
      const toSelect = filtered.slice(0, requiredCount).map(p => p.id);
      setSelectedProducts(new Set(toSelect));
    }
  };

  const handleConfirm = () => {
    const selected = products.filter(p => selectedProducts.has(p.id));
    onSelect(selected);
    onClose();
  };

  const getFilteredProducts = () => {
    if (!searchTerm.trim()) return products;

    return products.filter(p =>
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.qr_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.batch_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredProducts = getFilteredProducts();
  const selectedCount = selectedProducts.size;
  const requiredCount = Math.ceil(requiredQuantity);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Select Individual Products
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Product: <span className="font-medium">{materialName}</span>
          </p>
        </DialogHeader>

        {/* Selection Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-600">Required</p>
                <p className="text-lg font-bold text-gray-900">{requiredCount} rolls</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Selected</p>
                <p className={`text-lg font-bold ${
                  selectedCount >= requiredCount ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {selectedCount} rolls
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Available</p>
                <p className="text-lg font-bold text-gray-900">{products.length} rolls</p>
              </div>
            </div>
            {selectedCount >= requiredCount ? (
              <Badge className="bg-green-100 text-green-700 border-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Sufficient
              </Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                Need {requiredCount - selectedCount} more
              </Badge>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by ID, QR code, serial number, or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Select All */}
        <div className="flex items-center justify-between py-2 border-b">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              Select All ({filteredProducts.length} products)
            </span>
          </label>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No available products found</p>
              {searchTerm && (
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.has(product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => handleToggleProduct(product.id)}
                    className={`
                      border rounded-lg p-3 cursor-pointer transition-all
                      ${isSelected
                        ? 'bg-blue-50 border-blue-300 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleProduct(product.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{product.id}</p>
                            {product.serial_number && (
                              <p className="text-sm text-gray-600">SN: {product.serial_number}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 flex-shrink-0">
                            Available
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                          {product.qr_code && (
                            <div>
                              <span className="text-gray-500">QR Code:</span>
                              <span className="ml-1 font-medium">{product.qr_code}</span>
                            </div>
                          )}
                          {product.batch_number && (
                            <div>
                              <span className="text-gray-500">Batch:</span>
                              <span className="ml-1 font-medium">{product.batch_number}</span>
                            </div>
                          )}
                          {product.quality_grade && (
                            <div>
                              <span className="text-gray-500">Grade:</span>
                              <span className="ml-1 font-medium">{product.quality_grade}</span>
                            </div>
                          )}
                          {product.location && (
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <span className="ml-1 font-medium">{product.location}</span>
                            </div>
                          )}
                          {product.production_date && (
                            <div>
                              <span className="text-gray-500">Production:</span>
                              <span className="ml-1 font-medium">
                                {new Date(product.production_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {product.final_length && product.final_width && (
                            <div>
                              <span className="text-gray-500">Size:</span>
                              <span className="ml-1 font-medium">
                                {product.final_length} × {product.final_width}
                              </span>
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

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="bg-primary-600 hover:bg-primary-700"
          >
            Confirm Selection ({selectedCount} products)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
