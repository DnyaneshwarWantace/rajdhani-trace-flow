import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { MaterialService } from '@/services/materialService';
import { SupplierService } from '@/services/supplierService';
import type { RawMaterialFormData } from '@/types/material';
import type { DropdownOption } from '@/types/dropdown';
import { useToast } from '@/hooks/use-toast';
import MaterialBasicInfo from './form/MaterialBasicInfo';
import MaterialSupplierSection from './form/MaterialSupplierSection';
import MaterialCategorySection from './form/MaterialCategorySection';
import MaterialTypeSection from './form/MaterialTypeSection';
import MaterialUnitSection from './form/MaterialUnitSection';
import MaterialStockSection from './form/MaterialStockSection';
import MaterialCostSection from './form/MaterialCostSection';
import MaterialImageUpload from './form/MaterialImageUpload';

interface AddToInventoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Supplier {
  id: string;
  name: string;
}

export default function AddToInventoryDialog({ isOpen, onClose, onSuccess }: AddToInventoryDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: '',
    unit: '',
    currentStock: '0',
    minThreshold: '10',
    maxCapacity: '1000',
    reorderPoint: '50',
    supplier: '',
    costPerUnit: '',
    color: 'NA',
  });

  useEffect(() => {
    if (isOpen) {
      loadDropdowns();
    }
  }, [isOpen]);

  const loadDropdowns = async () => {
    try {
      // Load suppliers
      const suppliersResult = await SupplierService.getSuppliers();
      if (suppliersResult.data) {
        setSuppliers(suppliersResult.data.map((s) => ({ id: s.id, name: s.name })));
      }

      // Load all dropdowns from backend
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_URL}/dropdowns`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dropdowns: ${response.status}`);
      }

      const result = await response.json();
      const allDropdowns = result.success && Array.isArray(result.data) ? result.data : (Array.isArray(result.data) ? result.data : []);

      // Filter by category
      const categoryOptions = allDropdowns.filter((opt: DropdownOption) => opt.category === 'material_category' && opt.is_active !== false);
      const categoryValues = categoryOptions
        .map((opt: DropdownOption) => opt.value)
        .filter((val: string) => val && typeof val === 'string' && val.trim() !== '');
      setCategories(categoryValues);

      // Filter units
      const unitOptions = allDropdowns.filter((opt: DropdownOption) => opt.category === 'material_unit' && opt.is_active !== false);
      const unitValues = unitOptions
        .map((opt: DropdownOption) => opt.value)
        .filter((val: string) => val && typeof val === 'string' && val.trim() !== '');
      setUnits(unitValues);

      // Filter types
      const typeOptions = allDropdowns.filter((opt: DropdownOption) => opt.category === 'material_type' && opt.is_active !== false);
      const typeValues = typeOptions
        .map((opt: DropdownOption) => opt.value)
        .filter((val: string) => val && typeof val === 'string' && val.trim() !== '');
      setTypes(typeValues);
      
      // Filter colors (material_color category)
      const colorOptions = allDropdowns.filter((opt: DropdownOption) => opt.category === 'material_color' && opt.is_active !== false);
      const colorValues = colorOptions
        .map((opt: DropdownOption) => opt.value)
        .filter((val: string) => val && typeof val === 'string' && val.trim() !== '');
      setColors(colorValues);
      
      // Set default type if available
      if (typeValues.length > 0 && !typeValues.includes(formData.type)) {
        setFormData({ ...formData, type: typeValues[0] });
      }
    } catch (error) {
      console.error('Error loading dropdowns:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load form options',
        variant: 'destructive',
      });
    }
  };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview('');
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  // Map frontend unit values to backend enum values
  const normalizeUnit = (unit: string): string => {
    if (!unit) return 'pieces'; // Default fallback
    
    const normalized = unit.trim();
    const unitMap: Record<string, string> = {
      // Liters variations
      'L': 'liters',
      'l': 'liters',
      'Liters': 'liters',
      'liter': 'liters',
      'Liter': 'liters',
      'litre': 'liters',
      'Litre': 'liters',
      // Kilogram variations
      'kg': 'kg',
      'Kg': 'kg',
      'KG': 'kg',
      'Kilogram': 'kg',
      'kilogram': 'kg',
      'Kilograms': 'kg',
      'kilograms': 'kg',
      // Rolls variations
      'rolls': 'rolls',
      'Rolls': 'rolls',
      'Roll': 'rolls',
      'roll': 'rolls',
      // Meters variations
      'meters': 'meters',
      'Meters': 'meters',
      'M': 'meters',
      'm': 'meters',
      'meter': 'meters',
      'Meter': 'meters',
      'metre': 'meters',
      'Metre': 'meters',
      // SQM variations
      'sqm': 'sqm',
      'SQM': 'sqm',
      'Sqm': 'sqm',
      // Pieces variations
      'pieces': 'pieces',
      'Pieces': 'pieces',
      'Piece': 'pieces',
      'piece': 'pieces',
      // Boxes variations
      'boxes': 'boxes',
      'Boxes': 'boxes',
      'Box': 'boxes',
      'box': 'boxes',
      // Map unsupported units to closest match
      'gallons': 'liters',
      'Gallons': 'liters',
      'Gallon': 'liters',
      'pounds': 'kg',
      'Pounds': 'kg',
      'Pound': 'kg',
      'yards': 'meters',
      'Yards': 'meters',
      'Yard': 'meters',
      'tons': 'kg',
      'Tons': 'kg',
      'Ton': 'kg',
    };
    
    // Check exact match first
    if (unitMap[normalized]) {
      return unitMap[normalized];
    }
    
    // Check case-insensitive match
    const lower = normalized.toLowerCase();
    for (const [key, value] of Object.entries(unitMap)) {
      if (key.toLowerCase() === lower) {
        return value;
      }
    }
    
    // If no match found, try to infer from common patterns
    if (lower.includes('liter') || lower.includes('litre') || lower === 'l') {
      return 'liters';
    }
    if (lower.includes('kilo') || lower === 'kg') {
      return 'kg';
    }
    if (lower.includes('meter') || lower.includes('metre') || lower === 'm') {
      return 'meters';
    }
    if (lower.includes('roll')) {
      return 'rolls';
    }
    if (lower.includes('piece')) {
      return 'pieces';
    }
    if (lower.includes('box')) {
      return 'boxes';
    }
    
    // Default fallback
    console.warn(`Unknown unit "${unit}", defaulting to "pieces"`);
    return 'pieces';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (
        !formData.name ||
        !formData.supplier ||
        !formData.category ||
        !formData.unit ||
        !formData.costPerUnit
      ) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Upload image if provided
      let imageUrl = '';
      if (imageFile) {
        // TODO: Implement image upload to backend
        imageUrl = imagePreview;
      }

      // Normalize unit to match backend enum
      const normalizedUnit = normalizeUnit(formData.unit);

      // Create material data (with stock for direct inventory addition)
      const materialData: RawMaterialFormData = {
        name: formData.name,
        type: formData.type,
        category: formData.category,
        current_stock: parseFloat(formData.currentStock) || 0,
        unit: normalizedUnit,
        min_threshold: parseFloat(formData.minThreshold) || 10,
        max_capacity: parseFloat(formData.maxCapacity) || 1000,
        reorder_point: parseFloat(formData.reorderPoint) || 50,
        supplier_name: formData.supplier,
        cost_per_unit: parseFloat(formData.costPerUnit) || 0,
        color: formData.type === 'color' ? formData.color : 'NA',
        image_url: imageUrl,
      };

      await MaterialService.createMaterial(materialData);

      toast({
        title: 'Success',
        description: 'Material added to inventory successfully',
      });

      // Reset form
      const defaultType = types.length > 0 ? types[0] : '';
      setFormData({
        name: '',
        type: defaultType,
        category: '',
        unit: '',
        currentStock: '0',
        minThreshold: '10',
        maxCapacity: '1000',
        reorderPoint: '50',
        supplier: '',
        costPerUnit: '',
        color: 'NA',
      });
      setImageFile(null);
      setImagePreview('');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding material:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add material to inventory',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add Material to Inventory</h2>
            <p className="text-sm text-gray-500 mt-1">
              Add a new material directly to your inventory with stock quantity
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <MaterialImageUpload
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
            onRemove={handleRemoveImage}
          />

          <MaterialBasicInfo
            name={formData.name}
            onNameChange={(value) => setFormData({ ...formData, name: value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <MaterialSupplierSection
              supplier={formData.supplier}
              suppliers={suppliers}
              onSupplierChange={(value) => setFormData({ ...formData, supplier: value })}
            />
            <MaterialCategorySection
              category={formData.category}
              categories={categories}
              onCategoryChange={(value) => setFormData({ ...formData, category: value })}
              onCategoriesReload={loadDropdowns}
            />
          </div>

          <MaterialTypeSection
            type={formData.type}
            color={formData.color}
            types={types}
            colors={colors}
            onTypeChange={(value: string) =>
              setFormData({
                ...formData,
                type: value,
                color: value !== 'color' ? 'NA' : (colors.length > 0 ? colors[0] : 'NA'),
              })
            }
            onColorChange={(value) => setFormData({ ...formData, color: value })}
          />

          <MaterialUnitSection
            unit={formData.unit}
            units={units}
            onUnitChange={(value) => setFormData({ ...formData, unit: value })}
            onUnitsReload={loadDropdowns}
          />

          <MaterialStockSection
            currentStock={formData.currentStock}
            minThreshold={formData.minThreshold}
            maxCapacity={formData.maxCapacity}
            reorderPoint={formData.reorderPoint}
            showCurrentStock={true}
            onCurrentStockChange={(value) => setFormData({ ...formData, currentStock: value })}
            onMinThresholdChange={(value) => setFormData({ ...formData, minThreshold: value })}
            onMaxCapacityChange={(value) => setFormData({ ...formData, maxCapacity: value })}
            onReorderPointChange={(value) => setFormData({ ...formData, reorderPoint: value })}
          />

          <MaterialCostSection
            costPerUnit={formData.costPerUnit}
            onCostPerUnitChange={(value) => setFormData({ ...formData, costPerUnit: value })}
          />
        </form>

        {/* Fixed Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading} className="bg-primary-600 text-white hover:bg-primary-700">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding to Inventory...
              </>
            ) : (
              'Add to Inventory'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

