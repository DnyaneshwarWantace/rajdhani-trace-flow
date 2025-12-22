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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { IndividualProductService } from '@/services/individualProductService';
import { ProductService } from '@/services/productService';
import { getApiUrl } from '@/utils/apiConfig';
import type { IndividualProduct } from '@/types/product';

const API_URL = getApiUrl();

interface ProductWastageAutoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: string;
  material: {
    material_id: string;
    material_name: string;
    whole_product_count: number;
    actual_consumed_quantity: number;
    required_quantity: number;
    unit: string;
    individual_product_ids: string[];
  };
}

export default function ProductWastageAutoDialog({
  isOpen,
  onClose,
  onSuccess,
  batchId,
  material,
}: ProductWastageAutoDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [wasteTypes, setWasteTypes] = useState<string[]>([]);
  const [wasteType, setWasteType] = useState('');
  const [wasteCategory, setWasteCategory] = useState('disposable');
  const [canBeReused, setCanBeReused] = useState(false);
  const [notes, setNotes] = useState('');

  // Calculate wastage quantity
  const wastageQuantity = material.whole_product_count - material.actual_consumed_quantity;
  const expectedWastageCount = Math.ceil(wastageQuantity);

  useEffect(() => {
    if (isOpen && material.individual_product_ids?.length > 0) {
      loadIndividualProducts();
      loadWasteTypes();
      // Don't auto-select - let user choose
      setSelectedProductIds(new Set());
    }
  }, [isOpen, material]);

  const loadIndividualProducts = async () => {
    try {
      setLoading(true);
      // Load individual products by their IDs
      const productPromises = material.individual_product_ids.map(async (id) => {
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

  const loadWasteTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/dropdowns/category/waste_type`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Waste types response:', result);
        
        // Backend returns { success: true, data: [{ value: 'scrap', ... }, ...] }
        if (result.success && Array.isArray(result.data)) {
          const types = result.data
            .filter((opt: any) => opt.is_active !== false)
            .map((opt: any) => opt.value)
            .filter((val: string) => val && typeof val === 'string');
          console.log('✅ Loaded waste types:', types);
          setWasteTypes(types);
        } else {
          console.warn('⚠️ Unexpected waste types response format:', result);
          setWasteTypes([]);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load waste types:', response.status, errorText);
        setWasteTypes([]);
      }
    } catch (error) {
      console.error('❌ Error loading waste types:', error);
      setWasteTypes([]);
    }
  };

  const handleToggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      // Allow selecting any number - user decides
      newSelected.add(productId);
    }
    setSelectedProductIds(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wasteType) {
      toast({
        title: 'Error',
        description: 'Please select a waste type',
        variant: 'destructive',
      });
      return;
    }

    if (selectedProductIds.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one individual product for wastage',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Calculate waste percentage
      const wastePercentage = material.whole_product_count > 0
        ? ((selectedProductIds.size / material.whole_product_count) * 100)
        : 0;

      // Fetch base product to get unit information
      let lengthUnit = '';
      let widthUnit = '';
      let weightUnit = '';
      try {
        const baseProduct = await ProductService.getProductById(material.material_id);
        lengthUnit = baseProduct.length_unit || '';
        widthUnit = baseProduct.width_unit || '';
        weightUnit = baseProduct.weight_unit || '';
      } catch (error) {
        console.error('Error fetching base product for units:', error);
      }

      // Get full details of selected individual products
      const selectedProductsDetails = individualProducts.filter(p => 
        selectedProductIds.has(p.id || '')
      ).map(p => ({
        id: p.id,
        qr_code: p.qr_code || '',
        serial_number: p.serial_number || '',
        product_name: p.product_name || material.material_name,
        product_id: p.product_id || material.material_id,
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
        quality_grade: p.quality_grade || 'C',
        color: (p as any).color || '',
        pattern: (p as any).pattern || '',
        batch_number: p.batch_number || batchId,
        production_date: p.production_date || '',
        inspector: p.inspector || '',
        location: p.location || '',
        notes: p.notes || '',
      }));

      const wasteData = {
        production_id: batchId,
        production_batch_id: batchId,
        batch_id: batchId,
        product_id: material.material_id, // This is a product, so material_id is the product_id
        product_name: material.material_name,
        material_id: material.material_id,
        material_name: material.material_name,
        material_type: 'product',
        waste_type: wasteType,
        quantity: selectedProductIds.size,
        unit: material.unit,
        waste_category: wasteCategory,
        waste_percentage: parseFloat(wastePercentage.toFixed(2)),
        can_be_reused: canBeReused,
        reason: `Product wastage from ${material.material_name}`,
        notes: notes || `Auto-generated wastage: ${selectedProductIds.size} ${material.unit} from ${material.material_name}`,
        status: 'generated',
        individual_product_ids: Array.from(selectedProductIds), // Array of individual product IDs
        individual_products: selectedProductsDetails, // Full individual product details with all information
      };

      const response = await fetch(`${API_URL}/production/waste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(wasteData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create waste item');
      }

      toast({
        title: 'Success',
        description: `Wastage recorded: ${selectedProductIds.size} ${material.unit} of ${material.material_name}`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating waste:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create waste item',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Auto-Generate Product Wastage</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Wastage Calculation Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-2">Wastage Calculation</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>
                    <span className="font-medium">Consumed:</span> {material.actual_consumed_quantity.toFixed(2)} {material.unit}
                  </p>
                  <p>
                    <span className="font-medium">Whole Products Used:</span> {material.whole_product_count} {material.unit}
                  </p>
                  <p className="font-semibold text-blue-900">
                    <span className="font-medium">Expected Wastage:</span> {wastageQuantity.toFixed(2)} {material.unit} ({expectedWastageCount} whole {material.unit})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Waste Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="waste_type">Waste Type *</Label>
              <Select value={wasteType} onValueChange={setWasteType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select waste type" />
                </SelectTrigger>
                <SelectContent>
                  {wasteTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waste_category">Waste Category</Label>
              <Select
                value={wasteCategory}
                onValueChange={(value) => {
                  setWasteCategory(value);
                  setCanBeReused(value === 'reusable');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reusable">Reusable</SelectItem>
                  <SelectItem value="disposable">Disposable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Individual Products Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Individual Products for Wastage *</Label>
              <Badge variant="outline" className="text-xs">
                Expected: {expectedWastageCount} {material.unit} • Selected: {selectedProductIds.size} {material.unit}
              </Badge>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : individualProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No individual products found</p>
              ) : (
                <div className="space-y-2">
                  {individualProducts.map((product) => {
                    const isSelected = selectedProductIds.has(product.id);
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
                          onCheckedChange={() => handleToggleProduct(product.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 font-mono text-sm">
                            {product.id}
                          </p>
                          {product.serial_number && (
                            <p className="text-xs text-gray-600">SN: {product.serial_number}</p>
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the waste..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedProductIds.size === 0}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create Wastage (${selectedProductIds.size} ${material.unit})`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

