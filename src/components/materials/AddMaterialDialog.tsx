import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { MaterialService } from '@/services/materialService';
import { SupplierService } from '@/services/supplierService';
import { ManageStockService } from '@/services/manageStockService';
import type { RawMaterial, RawMaterialFormData } from '@/types/material';
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

interface AddMaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  material?: RawMaterial | null; // For edit mode
  mode?: 'create' | 'edit';
}

interface Supplier {
  id: string;
  name: string;
}

export default function AddMaterialDialog({ isOpen, onClose, onSuccess, material, mode = 'create' }: AddMaterialDialogProps) {
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
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  // Refs for form fields to focus on validation errors
  const nameRef = useRef<HTMLInputElement>(null);
  const supplierRef = useRef<HTMLButtonElement>(null);
  const categoryRef = useRef<HTMLButtonElement>(null);
  const unitRef = useRef<HTMLButtonElement>(null);
  const costPerUnitRef = useRef<HTMLInputElement>(null);
  const expectedDeliveryRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: '',
    unit: '',
    quantity: '1',
    currentStock: '', // Only used in edit mode
    minThreshold: '10',
    maxCapacity: '1000',
    reorderPoint: '50',
    supplier: '',
    costPerUnit: '',
    expectedDelivery: '',
    color: 'NA',
  });

  useEffect(() => {
    if (isOpen) {
      loadDropdowns();
      if (mode === 'create') {
        // Reset form for create mode
        setFormData({
          name: '',
          type: '',
          category: '',
          unit: '',
          quantity: '1',
          currentStock: '', // Not used in create mode (orders start with 0 stock)
          minThreshold: '10',
          maxCapacity: '1000',
          reorderPoint: '50',
          supplier: '',
          costPerUnit: '',
          expectedDelivery: '',
          color: 'NA',
        });
        setImagePreview('');
        setImageFile(null);
      }
    }
  }, [isOpen, mode]);

  // Set form data for edit mode after units are loaded
  useEffect(() => {
    if (isOpen && mode === 'edit' && material && units.length > 0) {
      // Find matching unit in the loaded units (case-insensitive)
      const materialUnit = material.unit || '';
      const matchingUnit = units.find(u => 
        u.toLowerCase() === materialUnit.toLowerCase() || 
        u === materialUnit
      ) || materialUnit;
      
      // Populate form with material data for edit mode
      setFormData({
        name: material.name || '',
        type: material.type || '',
        category: material.category || '',
        unit: matchingUnit,
        quantity: '1',
        currentStock: String(material.current_stock || 0),
        minThreshold: String(material.min_threshold || 10),
        maxCapacity: String(material.max_capacity || 1000),
        reorderPoint: String(material.reorder_point || 50),
        supplier: material.supplier_name || '',
        costPerUnit: String(material.cost_per_unit || 0),
        expectedDelivery: '',
        color: material.color || 'NA',
      });
      if (material.image_url) {
        setImagePreview(material.image_url);
      }
    }
  }, [isOpen, mode, material, units]);

  const loadDropdowns = async () => {
    try {
      // Load suppliers
      const suppliersResponse = await SupplierService.getSuppliers();
      if (suppliersResponse.data && Array.isArray(suppliersResponse.data)) {
        setSuppliers(suppliersResponse.data.map((s) => ({ id: s.id, name: s.name })));
      } else {
        setSuppliers([]);
        console.warn('Suppliers data is not an array:', suppliersResponse);
      }

      // Load all dropdowns from backend (same approach as dropdown master)
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
    
    // FIRST: Check if unit is already in the valid units list (from dropdown)
    // This prevents normalizing valid units like "L" to "liters" when "L" is a valid option
    if (units.length > 0) {
      // Check exact match
      if (units.includes(normalized)) {
        return normalized;
      }
      // Check case-insensitive match
      const unitLower = normalized.toLowerCase();
      const matchingUnit = units.find(u => u.toLowerCase() === unitLower);
      if (matchingUnit) {
        return matchingUnit; // Return the exact case from the dropdown
      }
    }
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
      // Clear previous invalid fields
      setInvalidFields(new Set());

      // Validate required fields and collect invalid ones
      // Check in order of appearance in the form
      const missingFields: string[] = [];
      const fieldRefs: { [key: string]: React.RefObject<any> } = {
        name: nameRef,
        supplier: supplierRef,
        category: categoryRef,
        unit: unitRef,
        costPerUnit: costPerUnitRef,
        expectedDelivery: expectedDeliveryRef,
      };

      // Check each field - use trim() for strings and check for empty strings
      if (!formData.name || formData.name.trim() === '') {
        missingFields.push('name');
      }
      if (!formData.supplier || formData.supplier.trim() === '') {
        missingFields.push('supplier');
      }
      if (!formData.category || formData.category.trim() === '') {
        missingFields.push('category');
      }
      if (!formData.unit || formData.unit.trim() === '') {
        missingFields.push('unit');
      }
      if (!formData.costPerUnit || formData.costPerUnit.trim() === '') {
        missingFields.push('costPerUnit');
      }
      if (mode === 'create' && (!formData.expectedDelivery || formData.expectedDelivery.trim() === '')) {
        missingFields.push('expectedDelivery');
      }

      if (missingFields.length > 0) {
        setInvalidFields(new Set(missingFields));
        
        // Focus on first missing field (in order of form appearance)
        const firstMissingField = missingFields[0];
        const fieldRef = fieldRefs[firstMissingField];
        
        // Create a more specific error message
        const fieldNames: { [key: string]: string } = {
          name: 'Material Name',
          supplier: 'Supplier',
          category: 'Category',
          unit: 'Unit',
          costPerUnit: 'Cost per Unit',
          expectedDelivery: 'Expected Delivery Date',
        };
        
        const missingFieldNames = missingFields.map(f => fieldNames[f] || f).join(', ');
        
        if (fieldRef?.current) {
          // Scroll to field
          fieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Focus on field
          setTimeout(() => {
            fieldRef.current?.focus();
          }, 100);
        }

        toast({
          title: 'Validation Error',
          description: `Please fill in: ${missingFieldNames}`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Validate expected delivery date is in the future (only for create mode)
      // Only validate if the date is actually filled (already checked above, but double-check)
      if (mode === 'create' && formData.expectedDelivery && formData.expectedDelivery.trim() !== '') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expectedDate = new Date(formData.expectedDelivery);
        
        // Check if date is valid
        if (isNaN(expectedDate.getTime())) {
          setInvalidFields(new Set(['expectedDelivery']));
          if (expectedDeliveryRef.current) {
            expectedDeliveryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              expectedDeliveryRef.current?.focus();
            }, 100);
          }
          toast({
            title: 'Validation Error',
            description: 'Please enter a valid expected delivery date',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        
        expectedDate.setHours(0, 0, 0, 0);
        
        // Only show error if date is today or in the past
        if (expectedDate <= today) {
          setInvalidFields(new Set(['expectedDelivery']));
          if (expectedDeliveryRef.current) {
            expectedDeliveryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              expectedDeliveryRef.current?.focus();
            }, 100);
          }
          toast({
            title: 'Validation Error',
            description: 'Expected delivery date must be a future date',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      // Upload image if provided
      let imageUrl = '';
      if (imageFile) {
        // TODO: Implement image upload to backend
        imageUrl = imagePreview;
      }

      // Use unit exactly as selected from dropdown - don't normalize if it's in valid units
      let normalizedUnit = formData.unit?.trim() || '';
      
      // Check if unit is in valid units list first (case-insensitive)
      if (units.length > 0 && normalizedUnit) {
        const unitLower = normalizedUnit.toLowerCase();
        const matchingUnit = units.find(u => u.toLowerCase() === unitLower);
        if (matchingUnit) {
          normalizedUnit = matchingUnit; // Use exact case from dropdown
        } else {
          // Only normalize if not in valid units
          normalizedUnit = normalizeUnit(formData.unit);
        }
      } else if (normalizedUnit) {
        // Fallback to normalization if units not loaded yet
        normalizedUnit = normalizeUnit(formData.unit);
      } else {
        normalizedUnit = 'pieces'; // Default fallback
      }

      console.log('Unit normalization:', { original: formData.unit, normalized: normalizedUnit, validUnits: units });

      if (mode === 'edit' && material) {
        // Update existing material
        const materialData: Partial<RawMaterialFormData> = {
          name: formData.name,
          type: formData.type,
          category: formData.category,
          unit: normalizedUnit,
          current_stock: isAdmin ? parseFloat(formData.currentStock) || 0 : undefined, // Only update stock if admin
          min_threshold: parseFloat(formData.minThreshold) || 10,
          max_capacity: parseFloat(formData.maxCapacity) || 1000,
          reorder_point: parseFloat(formData.reorderPoint) || 50,
          supplier_name: formData.supplier,
          cost_per_unit: parseFloat(formData.costPerUnit) || 0,
          color: formData.type === 'color' ? formData.color : 'NA',
          image_url: imageUrl || material.image_url,
        };

        await MaterialService.updateMaterial(material._id || material.id, materialData);
        
        toast({
          title: 'Success',
          description: 'Material updated successfully',
        });
        
        onSuccess();
        onClose();
        setLoading(false);
        return;
      }

      // Create material data (with 0 stock for orders)
      const materialData: RawMaterialFormData = {
        name: formData.name,
        type: formData.type,
        category: formData.category,
        current_stock: 0, // Orders start with 0 stock
        unit: normalizedUnit,
        min_threshold: parseFloat(formData.minThreshold) || 10,
        max_capacity: parseFloat(formData.maxCapacity) || 1000,
        reorder_point: parseFloat(formData.reorderPoint) || 50,
        supplier_name: formData.supplier,
        cost_per_unit: parseFloat(formData.costPerUnit) || 0,
        color: formData.type === 'color' ? formData.color : 'NA',
        image_url: imageUrl,
      };

      // Create the material first
      const createdMaterial = await MaterialService.createMaterial(materialData);

      // Get supplier ID
      const supplierData = suppliers.find(s => s.name === formData.supplier);
      const supplierId = supplierData?.id;

      // Get quantity from form and validate
      const orderQuantity = parseFloat(formData.quantity);
      const costPerUnit = parseFloat(formData.costPerUnit);

      // Validate quantity and cost per unit must be greater than 0 for orders
      if (isNaN(orderQuantity) || orderQuantity <= 0) {
        toast({
          title: 'Invalid Quantity',
          description: 'Order quantity must be greater than 0.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (isNaN(costPerUnit) || costPerUnit <= 0) {
        toast({
          title: 'Invalid Price',
          description: 'Cost per unit must be greater than 0.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const totalCost = orderQuantity * costPerUnit;

      // Create purchase order
      const timestamp = Date.now();
      const orderData = {
        supplier_name: formData.supplier,
        supplier_id: supplierId,
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: formData.expectedDelivery,
        total_amount: totalCost,
        status: 'pending' as const,
        material_details: {
          materialName: formData.name,
          materialCategory: formData.category,
          materialBatchNumber: `BATCH-${timestamp}`,
          quantity: orderQuantity,
          unit: normalizedUnit,
          costPerUnit: costPerUnit,
          minThreshold: parseFloat(formData.minThreshold) || 10,
          maxCapacity: parseFloat(formData.maxCapacity) || 1000,
          qualityGrade: 'A',
          isRestock: false,
          userNotes: `Material procurement order for ${formData.name}`,
        },
        // Also include items array for backend compatibility
        items: [{
          material_id: createdMaterial.id,
          material_name: formData.name,
          quantity: orderQuantity,
          unit: formData.unit,
          unit_price: costPerUnit,
          total_price: totalCost,
        }],
      };

      const orderResult = await ManageStockService.createOrder(orderData);

      if (!orderResult.success) {
        console.error('Failed to create purchase order:', orderResult.error);
        toast({
          title: 'Warning',
          description: 'Material created but purchase order creation failed. Please create the order manually in Manage Stock.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Material order created successfully. Check Manage Stock page to view the order.',
        });
      }

      // Reset form
      const defaultType = types.length > 0 ? types[0] : '';
      setFormData({
        name: '',
        type: defaultType,
        category: '',
        unit: '',
        quantity: '1',
        currentStock: '', // Not used in create mode
        minThreshold: '10',
        maxCapacity: '1000',
        reorderPoint: '50',
        supplier: '',
        costPerUnit: '',
        expectedDelivery: '',
        color: 'NA',
      });
      setImageFile(null);
      setImagePreview('');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating material:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create material order',
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
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'edit' ? 'Edit Material' : 'Create Material Procurement Order'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'edit' 
                ? 'Update material information' 
                : 'Create a new material order that will be sent to Manage Stock for procurement'}
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
            ref={nameRef}
            name={formData.name}
            onNameChange={(value) => {
              setFormData({ ...formData, name: value });
              setInvalidFields(prev => {
                const next = new Set(prev);
                next.delete('name');
                return next;
              });
            }}
            hasError={invalidFields.has('name')}
          />

          <div className="grid grid-cols-2 gap-4">
            <MaterialSupplierSection
              ref={supplierRef}
              supplier={formData.supplier}
              suppliers={suppliers}
              onSupplierChange={(value) => {
                setFormData({ ...formData, supplier: value });
                setInvalidFields(prev => {
                  const next = new Set(prev);
                  next.delete('supplier');
                  return next;
                });
              }}
              hasError={invalidFields.has('supplier')}
            />
            <MaterialCategorySection
              ref={categoryRef}
              category={formData.category}
              categories={categories}
              onCategoryChange={(value: string) => {
                setFormData({ ...formData, category: value });
                setInvalidFields(prev => {
                  const next = new Set(prev);
                  next.delete('category');
                  return next;
                });
              }}
              onCategoriesReload={loadDropdowns}
              hasError={invalidFields.has('category')}
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
            ref={unitRef}
            unit={formData.unit}
            units={units}
            onUnitChange={(value) => {
              setFormData({ ...formData, unit: value });
              setInvalidFields(prev => {
                const next = new Set(prev);
                next.delete('unit');
                return next;
              });
            }}
            onUnitsReload={loadDropdowns}
            hasError={invalidFields.has('unit')}
          />

          {/* Quantity and Expected Delivery (only for create mode) */}
          {mode === 'create' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Quantity to order</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Delivery Date *
                </label>
                <input
                  ref={expectedDeliveryRef}
                  type="date"
                  value={formData.expectedDelivery}
                  onChange={(e) => {
                    setFormData({ ...formData, expectedDelivery: e.target.value });
                    setInvalidFields(prev => {
                      const next = new Set(prev);
                      next.delete('expectedDelivery');
                      return next;
                    });
                  }}
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-primary-500 outline-none ${
                    invalidFields.has('expectedDelivery')
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-primary-500'
                  }`}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Expected delivery date (must be a future date)</p>
              </div>
            </div>
          )}

          <MaterialStockSection
            currentStock={formData.currentStock}
            minThreshold={formData.minThreshold}
            maxCapacity={formData.maxCapacity}
            reorderPoint={formData.reorderPoint}
            showCurrentStock={mode === 'edit'}
            isCurrentStockEditable={isAdmin}
            onCurrentStockChange={(value) => {
              if (isAdmin) {
                setFormData({ ...formData, currentStock: value });
              }
            }}
            onMinThresholdChange={(value) => setFormData({ ...formData, minThreshold: value })}
            onMaxCapacityChange={(value) => setFormData({ ...formData, maxCapacity: value })}
            onReorderPointChange={(value) => setFormData({ ...formData, reorderPoint: value })}
          />

          <MaterialCostSection
            ref={costPerUnitRef}
            costPerUnit={formData.costPerUnit}
            onCostPerUnitChange={(value) => {
              setFormData({ ...formData, costPerUnit: value });
              setInvalidFields(prev => {
                const next = new Set(prev);
                next.delete('costPerUnit');
                return next;
              });
            }}
            hasError={invalidFields.has('costPerUnit')}
          />
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
              (mode === 'create' && (
                !formData.quantity ||
                !formData.expectedDelivery ||
                formData.quantity === '0' ||
                formData.costPerUnit === '0' ||
                parseFloat(formData.quantity || '0') <= 0 ||
                parseFloat(formData.costPerUnit || '0') <= 0 ||
                isNaN(parseFloat(formData.quantity || '0')) ||
                isNaN(parseFloat(formData.costPerUnit || '0'))
              )) ||
              (mode === 'edit' && (
                formData.costPerUnit === '0' ||
                parseFloat(formData.costPerUnit || '0') <= 0 ||
                isNaN(parseFloat(formData.costPerUnit || '0'))
              ))
            } 
            className="bg-primary-600 text-white hover:bg-primary-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {mode === 'edit' ? 'Updating...' : 'Creating Order...'}
              </>
            ) : (
              mode === 'edit' ? 'Update Material' : 'Create Order'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

