import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QrCode, Package, Loader2, CheckCircle, Search } from 'lucide-react';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  const [selectedQrProduct, setSelectedQrProduct] = useState<any>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('newest');
  const pageSize = 50;

  useEffect(() => {
    console.log('🟢 Dialog useEffect - isOpen:', isOpen, 'product_id:', orderItem?.product_id);
    if (isOpen && orderItem?.product_id) {
      console.log('🟢 Calling loadAvailableProducts');
      // Reset pagination when dialog opens
      setCurrentOffset(0);
      setHasMore(true);
      setAvailableProducts([]);
      loadAvailableProducts(0, true);
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

  const loadAvailableProducts = async (offset: number = 0, isInitialLoad: boolean = false) => {
    if (!orderItem?.product_id) {
      console.log('No product_id in orderItem:', orderItem);
      return;
    }

    console.log('Loading individual products for product_id:', orderItem.product_id, 'offset:', offset);
    console.log('Currently selected products:', orderItem.selected_individual_products);

    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Get currently selected product IDs
      const currentlySelectedIds = orderItem.selected_individual_products?.map(p =>
        p.individual_product_id || p.id || p
      ) || [];

      console.log('Currently selected IDs:', currentlySelectedIds);

      // Load available products with pagination
      const availableResponse = await IndividualProductService.getIndividualProductsByProductId(
        orderItem.product_id,
        {
          status: 'available',
          limit: pageSize,
          offset: offset
        }
      );

      console.log('Fetched products:', availableResponse.products?.length || 0, 'Total:', availableResponse.total);
      setTotalCount(availableResponse.total);

      // Check if there are more products to load
      const loadedCount = offset + (availableResponse.products?.length || 0);
      setHasMore(loadedCount < availableResponse.total);

      // If this is the initial load, also fetch selected/reserved products
      let currentlySelectedFullProducts: any[] = [];
      if (isInitialLoad && currentlySelectedIds.length > 0) {
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

      if (isInitialLoad) {
        // Initial load: combine available and selected products
        const allProducts = [
          ...currentlySelectedFullProducts,
          ...(availableResponse.products || [])
        ];

        // Remove duplicates based on ID
        const uniqueProducts = Array.from(
          new Map(allProducts.map(p => [p.id, p])).values()
        );

        setAvailableProducts(uniqueProducts);
        setSelectedProducts(currentlySelectedFullProducts);
      } else {
        // Load more: append new products to existing list
        const newProducts = availableResponse.products || [];

        // Filter out products that are already in the list
        const existingIds = new Set(availableProducts.map(p => p.id));
        const uniqueNewProducts = newProducts.filter(p => !existingIds.has(p.id));

        setAvailableProducts(prev => [...prev, ...uniqueNewProducts]);
      }

      console.log('Total products loaded:', isInitialLoad ? availableResponse.products?.length || 0 : availableProducts.length + (availableResponse.products?.length || 0));
    } catch (error) {
      console.error('Error loading individual products:', error);
      if (isInitialLoad) {
        setAvailableProducts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleToggleProduct = (product: any) => {
    const isSelected = selectedProducts.some(p => p.id === product.id);
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      // Block selecting more than required quantity
      if (selectedProducts.length >= (orderItem?.quantity || 0)) return;
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const handleAutoSelect = async () => {
    const requiredQty = orderItem?.quantity || 0;

    // If we have enough products loaded, just select them
    if (availableProducts.length >= requiredQty) {
      const productsToSelect = availableProducts.slice(0, requiredQty);
      setSelectedProducts(productsToSelect);
      return;
    }

    // Otherwise, load all products first, then select
    setLoading(true);
    try {
      const allProductsResponse = await IndividualProductService.getIndividualProductsByProductId(
        orderItem?.product_id || '',
        {
          status: 'available',
          limit: requiredQty,
          offset: 0
        }
      );

      const productsToSelect = (allProductsResponse.products || []).slice(0, requiredQty);
      setSelectedProducts(productsToSelect);

      // Update available products list
      const existingIds = new Set(availableProducts.map(p => p.id));
      const uniqueNewProducts = productsToSelect.filter(p => !existingIds.has(p.id));
      setAvailableProducts(prev => [...prev, ...uniqueNewProducts]);
    } catch (error) {
      console.error('Error auto-selecting products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextOffset = currentOffset + pageSize;
    setCurrentOffset(nextOffset);
    loadAvailableProducts(nextOffset, false);
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

  // Filter and sort products based on search and date
  const filteredProducts = availableProducts
    .filter(product => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        product.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.qr_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.roll_number?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    })
    .sort((a, b) => {
      // Sort by date
      const dateA = new Date(a.added_date || a.created_at || a.production_date || 0).getTime();
      const dateB = new Date(b.added_date || b.created_at || b.production_date || 0).getTime();

      if (sortOrder === 'oldest') {
        return dateA - dateB; // Oldest first
      } else if (sortOrder === 'newest') {
        return dateB - dateA; // Newest first
      }
      return 0;
    });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Sticky Header */}
        <div className="px-6 pt-5 pb-3 border-b bg-white shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Select Individual Products
            </DialogTitle>
            <DialogDescription>
              {orderItem.product_name} • Required: <strong>{requiredQuantity}</strong> • Selected: <strong>{selectedProducts.length}</strong>
              {totalCount > 0 && <> • Available: <span className="text-green-600 font-medium">{totalCount}</span></>}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Search and Sort */}
        <div className="flex gap-2 px-6 py-3 border-b bg-white shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by roll no, ID, QR code, or serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'No products match your search' : 'No individual products available'}
            </div>
          ) : (
            <>
              {searchQuery ? (
                <div className="text-sm text-gray-600 mb-2">
                  Showing {filteredProducts.length} of {availableProducts.length} products
                </div>
              ) : null}
              <div className="space-y-2">
                {filteredProducts.map((product) => {
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
                              variant="secondary"
                              className={`text-xs ${
                                product.status === 'available' ? 'bg-green-100 text-green-700 border-green-300' :
                                product.status === 'reserved' ? 'bg-blue-100 text-blue-700' : ''
                              }`}
                            >
                              {product.status}
                            </Badge>
                          </div>
                          {product.roll_number && (
                            <div className="mb-1 text-xs">
                              <span className="font-medium text-gray-700">Roll No:</span>{' '}
                              <span className="font-mono text-gray-900">{product.roll_number}</span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
                            {product.length && product.width && (
                              <div>
                                <span className="font-medium">Size:</span> {product.length} × {product.width}
                              </div>
                            )}
                            {product.weight && (
                              <div>
                                <span className="font-medium">GSM:</span> {product.weight}
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

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center mt-4 pb-2">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full max-w-md"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${availableProducts.length} of ${totalCount})`
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t bg-white px-6 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">Required: <strong>{requiredQuantity}</strong></span>
            <span className={`font-semibold ${selectionComplete ? 'text-green-600' : selectedProducts.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
              Selected: {selectedProducts.length}
            </span>
            {selectionComplete && <Badge className="bg-green-600 text-white text-xs"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>}
            {selectedProducts.length > 0 && selectedProducts.length < requiredQuantity && (
              <span className="text-amber-600 text-xs">{requiredQuantity - selectedProducts.length} more needed</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleAutoSelect} disabled={loading || saving}>Auto Select</Button>
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={selectedProducts.length === 0 || selectedProducts.length > requiredQuantity || saving} className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Confirm ({selectedProducts.length}/{requiredQuantity})
            </Button>
          </div>
        </div>
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
                {selectedQrProduct.roll_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Roll No:</span>
                    <span className="font-medium font-mono">{selectedQrProduct.roll_number}</span>
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
