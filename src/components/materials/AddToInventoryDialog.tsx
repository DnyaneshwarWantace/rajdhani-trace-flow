import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { MaterialService } from '@/services/materialService';
import { uploadImageToR2 } from '@/services/imageService';
import { SupplierService } from '@/services/supplierService';
import type { RawMaterialFormData } from '@/types/material';
import type { DropdownOption } from '@/types/dropdown';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
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
      const { getApiUrl } = await import('@/utils/apiConfig');
      const API_URL = getApiUrl();
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
  // IMPORTANT: Keep "L" as "L" if that's what's in the dropdown - don't normalize to "liters"
  const normalizeUnit = (unit: string): string => {
    if (!unit) return 'pieces'; // Default fallback
    
    const normalized = unit.trim();
    
    // First, check if the unit is already in the dropdown list - if so, use it as-is
    // This prevents normalizing valid units like "L" to "liters" when "L" is a valid option
    if (units.length > 0) {
      // Check exact match
      if (units.includes(normalized)) {
        return normalized; // Use as-is if it's in the dropdown
      }
      // Check case-insensitive match
      const unitLower = normalized.toLowerCase();
      const matchingUnit = units.find(u => u.toLowerCase() === unitLower);
      if (matchingUnit) {
        return matchingUnit; // Return the exact case from the dropdown
      }
    }
    
    // If not in dropdown, use normalization mapping
    const unitMap: Record<string, string> = {
      // Keep "L" as "L" - don't normalize to "liters" if it's uppercase L
      // Only normalize lowercase "l" and other variations
      'L': 'L', // Keep uppercase L as-is
      'l': 'L', // lowercase l -> uppercase L (to match dropdown)
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
    if (lower === 'l') {
      return 'L'; // lowercase l -> uppercase L (to match dropdown)
    }
    if (lower.includes('liter') || lower.includes('litre')) {
      return 'liters'; // Only normalize full words like "liter" or "litre" to "liters"
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
      const missingFields: string[] = [];
      
      if (!formData.name || formData.name.trim() === '') {
        missingFields.push('Material Name');
      }
      if (!formData.supplier || formData.supplier.trim() === '') {
        missingFields.push('Supplier');
      }
      if (!formData.category || formData.category.trim() === '') {
        missingFields.push('Category');
      }
      if (!formData.unit || formData.unit.trim() === '') {
        missingFields.push('Unit');
      }
      if (!formData.costPerUnit || formData.costPerUnit.trim() === '' || formData.costPerUnit === '0') {
        missingFields.push('Cost per Unit');
      }
      // Validate cost per unit must be greater than 0
      const costPerUnit = parseFloat(formData.costPerUnit);
      if (isNaN(costPerUnit) || costPerUnit <= 0) {
        if (!missingFields.includes('Cost per Unit')) {
          missingFields.push('Cost per Unit (must be > 0)');
        }
      }
      
      // Validate current stock if admin (can be 0, but must be a valid number)
      if (isAdmin) {
        if (formData.currentStock === '' || formData.currentStock.trim() === '') {
          missingFields.push('Current Stock');
        } else {
          const currentStock = parseFloat(formData.currentStock);
          if (isNaN(currentStock) || currentStock < 0) {
            if (!missingFields.includes('Current Stock')) {
              missingFields.push('Current Stock (must be >= 0)');
            }
          }
        }
      }

      if (missingFields.length > 0) {
        toast({
          title: 'Validation Error',
          description: `Please fill in: ${missingFields.join(', ')}`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Upload image if provided
      let imageUrl = '';
      if (imageFile) {
        try {
          const uploadResult = await uploadImageToR2(imageFile, 'materials');
          if (uploadResult.error) {
            toast({
              title: 'Image Upload Failed',
              description: uploadResult.error,
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
          imageUrl = uploadResult.url;
        } catch (error: any) {
          console.error('Error uploading image:', error);
          toast({
            title: 'Image Upload Failed',
            description: error?.message || 'Failed to upload image',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
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

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on body
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      // Prevent touch move on iOS
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      loadDropdowns();
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        // Close dialog if clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
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

          {/* Material Type and Unit on same line */}
          <div className="grid grid-cols-2 gap-4">
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
              onTypesReload={loadDropdowns}
            />

            <MaterialUnitSection
              unit={formData.unit}
              units={units}
              onUnitChange={(value) => setFormData({ ...formData, unit: value })}
              onUnitsReload={loadDropdowns}
            />
          </div>

          <MaterialStockSection
            currentStock={formData.currentStock}
            minThreshold={formData.minThreshold}
            maxCapacity={formData.maxCapacity}
            showCurrentStock={true}
            isCurrentStockEditable={isAdmin}
            onCurrentStockChange={(value: string) => setFormData({ ...formData, currentStock: value })}
            onMinThresholdChange={(value: string) => setFormData({ ...formData, minThreshold: value })}
            onMaxCapacityChange={(value: string) => setFormData({ ...formData, maxCapacity: value })}
          />

          {/* Reorder Point and Cost/Unit on same line */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reorderPoint">Reorder Point *</Label>
              <Input
                id="reorderPoint"
                type="text"
                value={formData.reorderPoint}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setFormData({ ...formData, reorderPoint: value });
                  }
                }}
                placeholder="50"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Quantity at which a new order should be placed</p>
            </div>

            <MaterialCostSection
              costPerUnit={formData.costPerUnit}
              onCostPerUnitChange={(value: string) => setFormData({ ...formData, costPerUnit: value })}
            />
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={
              loading ||
              !formData.name ||
              !formData.supplier ||
              !formData.category ||
              !formData.unit ||
              !formData.costPerUnit ||
              formData.costPerUnit === '0' ||
              parseFloat(formData.costPerUnit || '0') <= 0 ||
              isNaN(parseFloat(formData.costPerUnit || '0')) ||
              (isAdmin && (
                formData.currentStock === '' ||
                parseFloat(formData.currentStock || '0') < 0 ||
                isNaN(parseFloat(formData.currentStock || '0'))
              ))
            } 
            className="bg-primary-600 text-white hover:bg-primary-700"
          >
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

