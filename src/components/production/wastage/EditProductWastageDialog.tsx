import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { IndividualProductService } from '@/services/individualProductService';
import { ProductService } from '@/services/productService';
import { WasteService, type WasteItem } from '@/services/wasteService';
import type { IndividualProduct } from '@/types/product';
import ProductAttributePreview from '@/components/ui/ProductAttributePreview';

interface EditProductWastageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: string;
  waste: WasteItem | null;
  consumedMaterials: any[];
}

export default function EditProductWastageDialog({
  isOpen,
  onClose,
  onSuccess,
  batchId,
  waste,
  consumedMaterials,
}: EditProductWastageDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const material = waste
    ? consumedMaterials.find((m: any) => m.material_id === waste.material_id)
    : null;

  useEffect(() => {
    if (!isOpen || !waste) return;
    setSelectedProductIds(new Set(waste.individual_product_ids || []));
    if (material?.individual_product_ids?.length) {
      loadIndividualProducts();
    } else if (waste.product_id || waste.material_id) {
      loadIndividualProductsByProductId();
    } else if (waste.individual_product_ids?.length) {
      loadIndividualProductsFromWaste();
    }
  }, [isOpen, waste?.id, material?.material_id]);

  const loadIndividualProducts = async () => {
    if (!material?.individual_product_ids?.length) return;
    try {
      setLoading(true);
      const productPromises = material.individual_product_ids.map(async (id: string) => {
        try {
          return await IndividualProductService.getIndividualProductById(id);
        } catch (error) {
          console.error(`Error loading product ${id}:`, error);
          return null;
        }
      });
      const results = await Promise.all(productPromises);
      const products = results.filter((p): p is IndividualProduct => p !== null);
      setIndividualProducts(products);
    } catch (error) {
      console.error('Error loading individual products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load individual products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadIndividualProductsByProductId = async () => {
    const productId = waste?.product_id || waste?.material_id;
    if (!productId) return;
    try {
      setLoading(true);
      const { products } = await IndividualProductService.getIndividualProducts({
        product_id: productId,
      });
      const forBatch = batchId
        ? products.filter((p) => p.batch_number === batchId)
        : products;
      setIndividualProducts(forBatch);
    } catch (error) {
      console.error('Error loading individual products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load individual products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadIndividualProductsFromWaste = async () => {
    if (!waste?.individual_product_ids?.length) return;
    try {
      setLoading(true);
      const productPromises = waste.individual_product_ids.map(async (id: string) => {
        try {
          return await IndividualProductService.getIndividualProductById(id);
        } catch (error) {
          return null;
        }
      });
      const results = await Promise.all(productPromises);
      const products = results.filter((p): p is IndividualProduct => p !== null);
      setIndividualProducts(products);
    } catch (error) {
      console.error('Error loading individual products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProductIds(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waste?.id) return;
    if (selectedProductIds.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one individual product.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const materialId = waste.material_id || waste.product_id;
      const unit = waste.unit || 'units';
      let lengthUnit = '';
      let widthUnit = '';
      let weightUnit = '';
      if (materialId) {
        try {
          const baseProduct = await ProductService.getProductById(materialId);
          lengthUnit = baseProduct.length_unit || '';
          widthUnit = baseProduct.width_unit || '';
          weightUnit = baseProduct.weight_unit || '';
        } catch (_) {}
      }

      const selectedProductsDetails = individualProducts
        .filter((p) => selectedProductIds.has(p.id || ''))
        .map((p) => ({
          id: p.id,
          qr_code: p.qr_code || '',
          serial_number: p.serial_number || '',
          product_name: (p as any).product_name || waste.material_name,
          product_id: p.product_id || materialId,
          status: p.status || 'damaged',
          length: (p as any).length || '',
          width: (p as any).width || '',
          weight: (p as any).weight || '',
          length_unit: lengthUnit,
          width_unit: widthUnit,
          weight_unit: weightUnit,
          final_length: p.final_length || '',
          final_width: p.final_width || '',
          final_weight: p.final_weight || '',
          color: (p as any).color || '',
          pattern: (p as any).pattern || '',
          batch_number: p.batch_number || batchId,
          production_date: p.production_date || '',
          inspector: p.inspector || '',
          location: p.location || '',
          notes: p.notes || '',
        }));

      await WasteService.updateWaste(waste.id, {
        individual_product_ids: Array.from(selectedProductIds),
        quantity: selectedProductIds.size,
        individual_products: selectedProductsDetails,
      });

      toast({
        title: 'Success',
        description: `Wastage updated: ${selectedProductIds.size} ${unit} selected.`,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating product wastage:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update wastage',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!waste) return null;

  const unit = waste.unit || 'units';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden pt-6 p-0 gap-0">
        <DialogHeader className="pt-6 px-6 pb-2 flex-shrink-0">
          <DialogTitle>Edit Product Wastage</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-4">
          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-900">{waste.material_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Change which individual products are included in this wastage record.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Individual Products for Wastage *</Label>
              <Badge variant="outline" className="text-xs">
                Selected: {selectedProductIds.size} {unit}
              </Badge>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              {loading && individualProducts.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : individualProducts.length === 0 && !material ? (
                <p className="text-center text-gray-500 py-8">
                  No individual products list available. Re-open from the wastage page after loading consumed materials.
                </p>
              ) : individualProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No individual products found</p>
              ) : (
                <div className="space-y-2">
                  {individualProducts.map((product) => {
                    const isSelected = selectedProductIds.has(product.id || '');
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-orange-50 border-orange-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleProduct(product.id || '')}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 font-mono text-sm">
                            {product.id}
                          </p>
                          {product.serial_number && (
                            <p className="text-xs text-gray-600">SN: {product.serial_number}</p>
                          )}
                          {((product as any).color || (product as any).pattern) && (
                            <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                              <ProductAttributePreview
                                color={(product as any).color}
                                pattern={(product as any).pattern}
                              />
                            </div>
                          )}
                          {product.created_at && (
                            <p className="text-xs text-gray-500">
                              Created: {new Date(product.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t bg-gray-50 px-6 py-4 mt-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedProductIds.size === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save (${selectedProductIds.size} ${unit})`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
