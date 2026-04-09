import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, CheckCircle, Copy, ArrowDown, Layers } from 'lucide-react';
import { IndividualProductService } from '@/services/individualProductService';
import { DropdownService } from '@/services/dropdownService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { IndividualProduct } from '@/types/product';

interface IndividualProductsTableProps {
  individualProducts: IndividualProduct[];
  onUpdate: () => void;
  product?: {
    weight_unit?: string;
    width_unit?: string;
    length_unit?: string;
    weight?: string;
    width?: string;
    length?: string;
  };
  plannedQuantity?: number;
  batchId?: string;
  productId?: string;
  onComplete?: () => void;
  canComplete?: boolean;
  onCanCompleteChange?: (canComplete: boolean) => void;
  onCreatedProductsCountChange?: (count: number) => void;
  /** Button label when onComplete is provided. Default: "Complete Production" */
  actionLabel?: string;
}

export default function IndividualProductsTable({
  individualProducts,
  onUpdate,
  product,
  plannedQuantity = 0,
  batchId,
  productId,
  onComplete,
  canComplete = false,
  onCanCompleteChange,
  onCreatedProductsCountChange,
  actionLabel = 'Complete Production',
}: IndividualProductsTableProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [localProducts, setLocalProducts] = useState<IndividualProduct[]>(individualProducts);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedRowData, setCopiedRowData] = useState<{final_length?: string; final_width?: string; final_weight?: string; roll_number?: string} | null>(null);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationValue, setNewLocationValue] = useState('');

  // Load storage locations from dropdown service
  useEffect(() => {
    loadStorageLocations();
  }, []);

  const loadStorageLocations = async () => {
    try {
      const locations = await DropdownService.getDropdownsByCategory('storage_location');
      setLocationOptions(locations.map(loc => loc.value));
    } catch (error) {
      console.error('Error loading storage locations:', error);
      // Fallback to default locations if API fails
      setLocationOptions([
        'First Floor - Zone A - Section 1',
        'First Floor - Zone B - Section 1',
        'First Floor - Zone C - Section 1',
        'Second Floor - Zone A',
        'Second Floor - Zone B',
        'Ground Floor - Zone A',
        'Ground Floor - Zone B',
      ]);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationValue.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a location name',
        variant: 'destructive',
      });
      return;
    }

    try {
      await DropdownService.createDropdown({
        category: 'storage_location',
        value: newLocationValue.trim(),
        display_order: locationOptions.length + 1,
        is_active: true,
      });

      toast({
        title: 'Success',
        description: 'Location added successfully',
      });

      setNewLocationValue('');
      setIsAddingLocation(false);
      await loadStorageLocations();
    } catch (error: any) {
      console.error('Error adding location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add location',
        variant: 'destructive',
      });
    }
  };

  // Sync from backend without reordering: preserve local row order, update by id, append only new rows
  useEffect(() => {
    if (!productId || plannedQuantity <= 0) return;

    const backendProducts = individualProducts.filter(p => !p.id.startsWith('temp-'));
    const backendById = new Map(backendProducts.map(p => [p.id, p]));

    let merged: IndividualProduct[];

    if (localProducts.length === 0) {
      // Initial load: use backend order, then fill to plannedQuantity with temp rows
      merged = [...backendProducts];
    } else {
      // Preserve local order: for each local row, use backend data if same id, else keep local
      merged = localProducts.map(localP => backendById.get(localP.id) ?? localP);
      // Append any backend products that aren't in local (e.g. created in another tab)
      backendProducts.forEach(b => {
        if (!localProducts.some(l => l.id === b.id)) merged.push(b);
      });
    }

    // Only append temp rows at the end if we're under plannedQuantity (never insert in middle)
    if (merged.length < plannedQuantity) {
      const toAdd = plannedQuantity - merged.length;
      for (let i = 0; i < toAdd; i++) {
        merged.push({
          _id: `temp-${Date.now()}-${i}`,
          id: `temp-${Date.now()}-${i}`,
          product_id: productId,
          qr_code: '',
          serial_number: '',
          status: 'available',
          production_date: new Date().toISOString().split('T')[0],
          batch_number: batchId || '',
          final_weight: '',
          final_width: '',
          final_length: '',
          inspector: '',
          location: '',
          notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as IndividualProduct);
      }
    }

    const localIds = localProducts.map(p => p.id).join(',');
    const mergedIds = merged.map(p => p.id).join(',');
    if (localIds !== mergedIds || merged.length !== localProducts.length) {
      setLocalProducts(merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [individualProducts, plannedQuantity, productId, batchId]);

  // Calculate canComplete: all existing rows must have required fields filled
  // If there are empty rows, user must delete them before completing
  useEffect(() => {
    if (!onCanCompleteChange) return;

    const requiredFields = ['final_weight', 'final_width', 'final_length', 'location', 'roll_number'];
    const allRowsComplete = localProducts.length > 0 && localProducts.every(product => 
      requiredFields.every(field => {
        const value = product[field as keyof IndividualProduct];
        return value && typeof value === 'string' && value.trim() !== '';
      })
    );

    onCanCompleteChange(allRowsComplete);
  }, [localProducts, onCanCompleteChange]);

  // Update parent with current created products count (real-time)
  useEffect(() => {
    if (!onCreatedProductsCountChange) return;
    
    const createdCount = localProducts.filter(p => 
      p.id && !p.id.startsWith('temp-')
    ).length;
    
    onCreatedProductsCountChange(createdCount);
  }, [localProducts, onCreatedProductsCountChange]);

  const handleCellClick = (row: number, col: string) => {
    const productItem = localProducts[row];
    let value = '';
    
    // Clear validation error when starting to edit
    setValidationError(null);
    
    switch (col) {
      case 'final_weight': {
        // GSM only input (no kg conversion input).
        value = (productItem.final_weight || '').replace(/[^\d.]/g, '');
        break;
      }
      case 'final_width':
        const widthValue = productItem.final_width || '';
        value = widthValue.replace(/[^\d.]/g, '');
        break;
      case 'final_length':
        const lengthValue = productItem.final_length || '';
        value = lengthValue.replace(/[^\d.]/g, '');
        break;
      case 'location':
        value = productItem.location || 'Warehouse A - General Storage';
        break;
      case 'roll_number':
        value = productItem.roll_number || '';
        break;
      case 'notes':
        value = productItem.notes || '';
        break;
      default:
        value = '';
    }
    
    setEditValue(value);
    setEditingCell({ row, col });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    
    const { row, col } = editingCell;
    const productItem = localProducts[row];
    
    try {
      setSaving(productItem.id);
      
      let valueToSave = editValue.trim();
      
      // Validate numeric input only (no expected-range restrictions).
      if (col === 'final_weight' || col === 'final_length' || col === 'final_width') {
        if (!valueToSave) {
          setSaving(null);
          setEditingCell(null);
          return;
        }

        // Extract numeric value from entered value
        const enteredNumeric = parseFloat(valueToSave.replace(/[^\d.]/g, ''));
        if (isNaN(enteredNumeric)) {
          toast({
            title: 'Invalid Value',
            description: 'Please enter a valid number',
            variant: 'destructive',
          });
          setSaving(null);
          return;
        }

        setValidationError(null);
      }

      // Location is mandatory
      if (col === 'location') {
        if (!valueToSave) {
          toast({
            title: 'Location required',
            description: 'Please select a storage location.',
            variant: 'destructive',
          });
          setSaving(null);
          return;
        }
      }

      // Clear validation error for non-dimension fields
      if (col !== 'final_weight' && col !== 'final_length' && col !== 'final_width') {
        setValidationError(null);
      }

      // For final_weight: GSM-only input.
      if (col === 'final_weight' && valueToSave && !valueToSave.match(/[a-zA-Z]/)) {
        const gsmValue = parseFloat(valueToSave.replace(/[^\d.]/g, ''));
        if (!isNaN(gsmValue)) valueToSave = gsmValue.toString();
        if (!valueToSave.includes('GSM')) {
          const weightUnit = product?.weight_unit || (product?.weight?.includes('GSM') ? 'GSM' : 'GSM');
          valueToSave = `${valueToSave} ${weightUnit}`;
        }
      } else if (col === 'final_width' && valueToSave && !valueToSave.match(/[a-zA-Z]/)) {
        const widthUnit = product?.width_unit || 
          (product?.width?.includes('feet') ? 'feet' : 
           product?.width?.includes('m') ? 'm' : 'm');
        valueToSave = `${valueToSave} ${widthUnit}`;
      } else if (col === 'final_length' && valueToSave && !valueToSave.match(/[a-zA-Z]/)) {
        const lengthUnit = product?.length_unit || 
          (product?.length?.includes('feet') ? 'feet' : 
           product?.length?.includes('m') ? 'm' : 'm');
        valueToSave = `${valueToSave} ${lengthUnit}`;
      }
      
      const updateData: any = {};
      updateData[col] = valueToSave;
      
      // Update local state first
      const updated = [...localProducts];
      updated[row] = { ...updated[row], ...updateData };
      setLocalProducts(updated);
      
      // If product has a real ID (not temp ID), update it
      if (productItem.id && !productItem.id.startsWith('temp-')) {
        await IndividualProductService.updateIndividualProduct(productItem.id, updateData);
        onUpdate?.();
        toast({
          title: 'Saved',
          description: 'Product details saved successfully',
        });
        setEditingCell(null);
        setEditValue('');
        setValidationError(null);
      } else if (productItem.id && productItem.id.startsWith('temp-')) {
        // For temp products, check if we have enough data to create it
        const tempProduct = updated[row];
        const hasRequiredFields = tempProduct.final_weight &&
                                  tempProduct.final_width &&
                                  tempProduct.final_length &&
                                  tempProduct.location &&
                                  tempProduct.roll_number &&
                                  productId;
        
        // Only create if this is the last required field being filled
        if (hasRequiredFields && (col === 'final_weight' || col === 'final_width' || col === 'final_length' || col === 'roll_number' || col === 'location')) {
          // Check for duplicate roll_number within this batch
          const duplicate = localProducts.find(
            (p, i) => i !== row && !p.id.startsWith('temp-') && p.roll_number === tempProduct.roll_number
          );
          if (duplicate) {
            toast({
              title: 'Duplicate Roll Number',
              description: `Roll number "${tempProduct.roll_number}" is already used in this batch. Please use a unique roll number.`,
              variant: 'destructive',
            });
            setSaving(null);
            setEditingCell(null);
            setEditValue('');
            return;
          }
          try {
            // Create the individual product — always available immediately
            const newProduct = await IndividualProductService.createIndividualProduct({
              product_id: productId,
              qr_code: tempProduct.qr_code || '',
              serial_number: tempProduct.serial_number || '',
              roll_number: tempProduct.roll_number || '',
              status: 'available',
              final_length: tempProduct.final_length || '',
              final_width: tempProduct.final_width || '',
              final_weight: tempProduct.final_weight || '',
              inspector: user?.full_name || user?.email || 'System',
              location: tempProduct.location || 'Warehouse A - General Storage',
              notes: tempProduct.notes || '',
              production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
              batch_number: batchId || '',
            });

            // Update local state with the real product
            updated[row] = newProduct;
            setLocalProducts(updated);

            toast({
              title: 'Saved to Stock',
              description: `Roll ${newProduct.roll_number || newProduct.id} added to stock and available immediately`,
            });
            onUpdate?.();
          } catch (error) {
            console.error('Error creating individual product:', error);
            toast({
              title: 'Error',
              description: error instanceof Error ? error.message : 'Failed to create individual product',
              variant: 'destructive',
            });
          }
        }
      }
      
      setEditingCell(null);
      setEditValue('');
      setValidationError(null);
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update product details',
        variant: 'destructive',
      });
      // Revert local state on error
      const reverted = [...localProducts];
      reverted[row] = productItem;
      setLocalProducts(reverted);
    } finally {
      setSaving(null);
    }
  };

  const handleSelectChange = async (row: number, field: string, value: string) => {
    const productItem = localProducts[row];
    
    try {
      setSaving(productItem.id);
      
      const updateData: any = {};
      updateData[field] = value;
      
      // Update local state first
      const updated = [...localProducts];
      updated[row] = { ...updated[row], ...updateData };
      setLocalProducts(updated);
      
      // If product has a real ID (not temp ID), update it
      if (productItem.id && !productItem.id.startsWith('temp-')) {
        await IndividualProductService.updateIndividualProduct(productItem.id, updateData);
        onUpdate?.();
      } else if (productItem.id && productItem.id.startsWith('temp-')) {
        // For temp products, check if we have enough data to create it
        const tempProduct = updated[row];
        const hasRequiredFields = tempProduct.final_weight &&
                                  tempProduct.final_width &&
                                  tempProduct.final_length &&
                                  tempProduct.roll_number &&
                                  tempProduct.location &&
                                  productId;

        // Only create if all required fields are now filled
        if (hasRequiredFields) {
          // Check for duplicate roll_number within this batch
          const duplicate = localProducts.find(
            (p, i) => i !== row && !p.id.startsWith('temp-') && p.roll_number === tempProduct.roll_number
          );
          if (duplicate) {
            toast({
              title: 'Duplicate Roll Number',
              description: `Roll number "${tempProduct.roll_number}" is already used by another product in this batch. Please use a unique roll number.`,
              variant: 'destructive',
            });
            setSaving(null);
            return;
          }
          try {
            // Create the individual product
            const newProduct = await IndividualProductService.createIndividualProduct({
              product_id: productId,
              qr_code: tempProduct.qr_code || '',
              serial_number: tempProduct.serial_number || '',
              roll_number: tempProduct.roll_number || '',
              status: 'available',
              final_length: tempProduct.final_length || '',
              final_width: tempProduct.final_width || '',
              final_weight: tempProduct.final_weight || '',
              inspector: user?.full_name || user?.email || 'System',
              location: tempProduct.location || 'Warehouse A - General Storage',
              notes: tempProduct.notes || '',
              production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
              batch_number: batchId || '',
            });

            // Update local state with the real product
            updated[row] = newProduct;
            setLocalProducts(updated);

            toast({
              title: 'Saved to Stock',
              description: `Roll ${newProduct.roll_number || newProduct.id} added to stock and available immediately`,
            });
            onUpdate?.();
          } catch (error) {
            console.error('Error creating individual product:', error);
            toast({
              title: 'Error',
              description: error instanceof Error ? error.message : 'Failed to create individual product',
              variant: 'destructive',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update product details',
        variant: 'destructive',
      });
      // Revert local state on error
      const reverted = [...localProducts];
      reverted[row] = productItem;
      setLocalProducts(reverted);
    } finally {
      setSaving(null);
    }
  };

  const handleAddRow = () => {
    const newProduct: IndividualProduct = {
      _id: `temp-${Date.now()}`,
      id: `temp-${Date.now()}`,
      product_id: productId || '',
      qr_code: '',
      serial_number: '',
      status: 'available', // Default to available
      production_date: new Date().toISOString().split('T')[0],
      batch_number: batchId || '',
      final_weight: '',
      final_width: '',
      final_length: '',
  
      inspector: '',
      location: '',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLocalProducts([...localProducts, newProduct]);
  };

  const handleCopyRow = (index: number) => {
    const productToCopy = localProducts[index];
    
    // Ensure clean string values
    const final_length = productToCopy.final_length ? String(productToCopy.final_length).trim() : '';
    const final_width = productToCopy.final_width ? String(productToCopy.final_width).trim() : '';
    const final_weight = productToCopy.final_weight ? String(productToCopy.final_weight).trim() : '';
    
    setCopiedRowData({
      final_length,
      final_width,
      final_weight,
    });
    toast({
      title: 'Copied',
      description: 'Row values copied. Click "Paste" on another row or use "Fill Down" to copy to rows below.',
    });
  };

  const handleFillDownField = async (index: number, field: 'final_length' | 'final_width' | 'final_weight') => {
    const sourceRow = localProducts[index];
    const sourceValue = sourceRow[field];
    
    // Ensure value is a clean string
    const cleanValue = sourceValue ? String(sourceValue).trim() : '';
    if (!cleanValue) {
      toast({
        title: 'No Value',
        description: `This row has no ${field.replace('final_', '')} value to copy.`,
        variant: 'destructive',
      });
      return;
    }

    // Copy to the next row only
    if (index + 1 >= localProducts.length) {
      toast({
        title: 'No Rows Below',
        description: 'This is the last row. Nothing to fill down.',
        variant: 'destructive',
      });
      return;
    }

    const targetIndex = index + 1;
    const targetRow = localProducts[targetIndex];
    const updated = [...localProducts];

    // Copy only the specific field with clean value
    updated[targetIndex] = {
      ...targetRow,
      [field]: cleanValue,
    };

    setLocalProducts(updated);

    // Check if all required fields are now filled after this update
    const tempProduct = updated[targetIndex];
    const hasRequiredFields = tempProduct.final_weight && 
                              tempProduct.final_width && 
                              tempProduct.final_length &&
                              productId;

    // Auto-save if it's a real product
    if (targetRow.id && !targetRow.id.startsWith('temp-')) {
      try {
        await IndividualProductService.updateIndividualProduct(targetRow.id, {
          [field]: cleanValue,
        });
        onUpdate?.();
        toast({
          title: 'Filled Down',
          description: `${field.replace('final_', '').charAt(0).toUpperCase() + field.replace('final_', '').slice(1)} (${cleanValue}) copied to next row and saved.`,
        });
      } catch (error) {
        console.error('Error updating product:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save value',
          variant: 'destructive',
        });
        // Revert on error
        setLocalProducts(localProducts);
      }
    } else if (targetRow.id && targetRow.id.startsWith('temp-') && hasRequiredFields) {
      // For temp products, if all required fields are now filled, create the product
      try {
        const newProduct = await IndividualProductService.createIndividualProduct({
          product_id: productId!,
          qr_code: tempProduct.qr_code || '',
          serial_number: tempProduct.serial_number || '',
          status: tempProduct.status || 'available',
          final_length: tempProduct.final_length || '',
          final_width: tempProduct.final_width || '',
          final_weight: tempProduct.final_weight || '',
          inspector: user?.full_name || user?.email || 'System',
          location: tempProduct.location || 'Warehouse A - General Storage',
          notes: tempProduct.notes || '',
          production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
          batch_number: batchId || '',
        });
        
        // Update local state with the real product
        updated[targetIndex] = newProduct;
        setLocalProducts(updated);
        
        toast({
          title: 'Filled Down & Created',
          description: `${field.replace('final_', '').charAt(0).toUpperCase() + field.replace('final_', '').slice(1)} copied and product created successfully.`,
        });
        onUpdate?.();
      } catch (error) {
        console.error('Error creating individual product:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to create individual product',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Filled Down',
        description: `${field.replace('final_', '').charAt(0).toUpperCase() + field.replace('final_', '').slice(1)} (${cleanValue}) copied to next row.`,
      });
    }
  };

  // Copy location from this row to the next row
  const handleFillDownLocation = async (index: number) => {
    const sourceRow = localProducts[index];
    const cleanLocation = (sourceRow.location || '').trim();

    if (!cleanLocation) {
      toast({
        title: 'No Location',
        description: 'This row has no location to copy.',
        variant: 'destructive',
      });
      return;
    }

    if (index + 1 >= localProducts.length) {
      toast({
        title: 'No Rows Below',
        description: 'This is the last row. Nothing to fill down.',
        variant: 'destructive',
      });
      return;
    }

    const targetIndex = index + 1;
    const targetRow = localProducts[targetIndex];
    const updated = [...localProducts];

    updated[targetIndex] = {
      ...targetRow,
      location: cleanLocation,
    };

    setLocalProducts(updated);

    const tempProduct = updated[targetIndex];
    const hasRequiredFields =
      tempProduct.final_weight &&
      tempProduct.final_width &&
      tempProduct.final_length &&
      tempProduct.location &&
      productId;

    // Save for existing product row
    if (targetRow.id && !targetRow.id.startsWith('temp-')) {
      try {
        await IndividualProductService.updateIndividualProduct(targetRow.id, {
          location: cleanLocation,
        });
        onUpdate?.();
        toast({
          title: 'Location Filled Down',
          description: `Location (${cleanLocation}) copied to next row and saved.`,
        });
      } catch (error) {
        console.error('Error updating product location:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save location',
          variant: 'destructive',
        });
        // Revert on error
        setLocalProducts(localProducts);
      }
    } else if (targetRow.id && targetRow.id.startsWith('temp-') && hasRequiredFields) {
      // For temp products, if all required fields are now filled (including location), create the product
      try {
        const newProduct = await IndividualProductService.createIndividualProduct({
          product_id: productId!,
          qr_code: tempProduct.qr_code || '',
          serial_number: tempProduct.serial_number || '',
          status: tempProduct.status || 'available',
          final_length: tempProduct.final_length || '',
          final_width: tempProduct.final_width || '',
          final_weight: tempProduct.final_weight || '',
          inspector: user?.full_name || user?.email || 'System',
          location: tempProduct.location || 'Warehouse A - General Storage',
          notes: tempProduct.notes || '',
          production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
          batch_number: batchId || '',
        });

        updated[targetIndex] = newProduct;
        setLocalProducts(updated);

        toast({
          title: 'Location Filled Down & Created',
          description: `Location copied and product created successfully.`,
        });
        onUpdate?.();
      } catch (error) {
        console.error('Error creating individual product:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to create individual product',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Location Filled Down',
        description: `Location (${cleanLocation}) copied to next row.`,
      });
    }
  };

  const handleFillDown = async (index: number) => {
    const sourceRow = localProducts[index];
    
    // Get actual values from source row (don't use empty string fallback)
    const sourceData: {final_length?: string; final_width?: string; final_weight?: string} = {};
    
    if (sourceRow.final_length) sourceData.final_length = sourceRow.final_length;
    if (sourceRow.final_width) sourceData.final_width = sourceRow.final_width;
    if (sourceRow.final_weight) sourceData.final_weight = sourceRow.final_weight;

    if (!sourceData.final_length && !sourceData.final_width && !sourceData.final_weight) {
      toast({
        title: 'No Data',
        description: 'This row has no values to copy. Please fill in at least one field first.',
        variant: 'destructive',
      });
      return;
    }

    // Copy to the next row only (one row at a time for better control)
    if (index + 1 >= localProducts.length) {
      toast({
        title: 'No Rows Below',
        description: 'This is the last row. Nothing to fill down.',
        variant: 'destructive',
      });
      return;
    }

    const targetIndex = index + 1;
    const targetRow = localProducts[targetIndex];
    const updated = [...localProducts];

    // Copy only the fields that have values in source row
    const updateData: {final_length?: string; final_width?: string; final_weight?: string} = {};
    if (sourceData.final_length) updateData.final_length = sourceData.final_length;
    if (sourceData.final_width) updateData.final_width = sourceData.final_width;
    if (sourceData.final_weight) updateData.final_weight = sourceData.final_weight;

    // Copy values from source row to next row (only overwrite fields that exist in source)
    updated[targetIndex] = {
      ...targetRow,
      ...updateData,
    };

    setLocalProducts(updated);

    // Check if target row (temp) now has all required fields for auto-create
    const tempProduct = updated[targetIndex];
    const hasRequiredFields = tempProduct.final_weight &&
      tempProduct.final_width &&
      tempProduct.final_length &&
      productId;

    // Auto-save if it's a real product
    if (targetRow.id && !targetRow.id.startsWith('temp-') && Object.keys(updateData).length > 0) {
      try {
        await IndividualProductService.updateIndividualProduct(targetRow.id, updateData);
        onUpdate?.();
        toast({
          title: 'Filled Down',
          description: `Copied ${Object.keys(updateData).length} field(s) to next row and saved.`,
        });
      } catch (error) {
        console.error('Error updating product:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save values',
          variant: 'destructive',
        });
      }
    } else if (targetRow.id && targetRow.id.startsWith('temp-') && hasRequiredFields) {
      // For temp row: full-row fill down filled all required fields → create product so QR code is generated
      try {
        const newProduct = await IndividualProductService.createIndividualProduct({
          product_id: productId!,
          qr_code: tempProduct.qr_code || '',
          serial_number: tempProduct.serial_number || '',
          status: tempProduct.status || 'available',
          final_length: tempProduct.final_length || '',
          final_width: tempProduct.final_width || '',
          final_weight: tempProduct.final_weight || '',
          inspector: user?.full_name || user?.email || 'System',
          location: tempProduct.location || 'Warehouse A - General Storage',
          notes: tempProduct.notes || '',
          production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
          batch_number: batchId || '',
        });
        updated[targetIndex] = newProduct;
        setLocalProducts(updated);
        toast({
          title: 'Filled Down & Created',
          description: 'Row copied to next row and product created successfully. QR code generated.',
        });
        onUpdate?.();
      } catch (error) {
        console.error('Error creating individual product:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to create individual product',
          variant: 'destructive',
        });
      }
    } else if (Object.keys(updateData).length > 0) {
      toast({
        title: 'Filled Down',
        description: `Copied ${Object.keys(updateData).length} field(s) to next row.`,
      });
    }
  };

  // Apply location from a given row to ALL rows in the table
  const handleApplyLocationToAll = async (index: number) => {
    const sourceRow = localProducts[index];
    const cleanLocation = (sourceRow.location || '').trim();

    if (!cleanLocation) {
      toast({
        title: 'No Location',
        description: 'This row has no location to apply.',
        variant: 'destructive',
      });
      return;
    }

    if (localProducts.length <= 1) {
      toast({
        title: 'Only One Row',
        description: 'There is only one row. Location is already applied.',
      });
      return;
    }

    const updated = localProducts.map((row) => ({
      ...row,
      location: cleanLocation,
    }));

    setLocalProducts(updated);

    // Save location for all existing (non-temp) rows
    try {
      const savePromises = updated
        .filter((row) => row.id && !row.id.startsWith('temp-'))
        .map((row) =>
          IndividualProductService.updateIndividualProduct(row.id!, {
            location: cleanLocation,
          })
        );

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
        onUpdate?.();
      }

      toast({
        title: 'Location Applied',
        description: `Location (${cleanLocation}) applied to all ${updated.length} row(s).`,
      });
    } catch (error) {
      console.error('Error applying location to all products:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save location for some rows',
        variant: 'destructive',
      });
    }
  };

  const handlePasteRow = async (index: number) => {
    if (!copiedRowData) {
      toast({
        title: 'Nothing to Paste',
        description: 'Please copy a row first by clicking the "Copy" button.',
        variant: 'destructive',
      });
      return;
    }

    const productItem = localProducts[index];
    const updateData: {final_length?: string; final_width?: string; final_weight?: string} = {};
    
    // Only include fields that have values, ensure they're clean strings
    if (copiedRowData.final_length) {
      const val = String(copiedRowData.final_length).trim();
      if (val) updateData.final_length = val;
    }
    if (copiedRowData.final_width) {
      const val = String(copiedRowData.final_width).trim();
      if (val) updateData.final_width = val;
    }
    if (copiedRowData.final_weight) {
      const val = String(copiedRowData.final_weight).trim();
      if (val) updateData.final_weight = val;
    }

    const updated = [...localProducts];
    updated[index] = {
      ...updated[index],
      ...updateData,
    };
    setLocalProducts(updated);

    // Check if all required fields are now filled
    const tempProduct = updated[index];
    const hasRequiredFields = tempProduct.final_weight && 
                              tempProduct.final_width && 
                              tempProduct.final_length &&
                              productId;

    // Auto-save if it's a real product
    if (productItem.id && !productItem.id.startsWith('temp-')) {
      try {
        await IndividualProductService.updateIndividualProduct(productItem.id, updateData);
        onUpdate?.();
        toast({
          title: 'Pasted',
          description: 'Values pasted and saved successfully.',
        });
      } catch (error) {
        console.error('Error updating product:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save pasted values',
          variant: 'destructive',
        });
        // Revert on error
        setLocalProducts(localProducts);
      }
    } else if (productItem.id && productItem.id.startsWith('temp-') && hasRequiredFields) {
      // For temp products, if all required fields are now filled, create the product
      try {
        const newProduct = await IndividualProductService.createIndividualProduct({
          product_id: productId!,
          qr_code: tempProduct.qr_code || '',
          serial_number: tempProduct.serial_number || '',
          status: tempProduct.status || 'available',
          final_length: tempProduct.final_length || '',
          final_width: tempProduct.final_width || '',
          final_weight: tempProduct.final_weight || '',
          inspector: user?.full_name || user?.email || 'System',
          location: tempProduct.location || 'Warehouse A - General Storage',
          notes: tempProduct.notes || '',
          production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
          batch_number: batchId || '',
        });
        
        // Update local state with the real product
        updated[index] = newProduct;
        setLocalProducts(updated);
        
        toast({
          title: 'Pasted & Created',
          description: 'Values pasted and individual product created successfully.',
        });
        onUpdate?.();
      } catch (error) {
        console.error('Error creating individual product:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to create individual product',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Pasted',
        description: 'Values pasted. Fill other required fields to auto-save.',
      });
    }
  };

  // Apply one row's details (final_weight, final_width, final_length, location) to all other rows
  const handleApplySameToAll = () => {
    const required = ['final_weight', 'final_width', 'final_length', 'location'] as const;
    const sourceIndex = localProducts.findIndex(p =>
      required.every(f => p[f] && String(p[f]).trim() !== '')
    );
    if (sourceIndex < 0) {
      toast({
        title: 'No complete row',
        description: 'Fill at least one row with Final Weight, Width, Length and Location first.',
        variant: 'destructive',
      });
      return;
    }
    const source = localProducts[sourceIndex];
    const template = {
      final_weight: source.final_weight ? String(source.final_weight).trim() : '',
      final_width: source.final_width ? String(source.final_width).trim() : '',
      final_length: source.final_length ? String(source.final_length).trim() : '',
      location: source.location ? String(source.location).trim() : '',
    };
    const updated = localProducts.map((row, i) =>
      i === sourceIndex ? row : { ...row, ...template }
    );
    setLocalProducts(updated);
    toast({
      title: 'Applied to all rows',
      description: `Same Weight, Width, Length and Location applied to all ${localProducts.length} row(s). Save or edit as needed.`,
    });
  };

  const hasOneRowFilled = localProducts.some(p =>
    p.final_weight && p.final_width && p.final_length && p.location &&
    String(p.final_weight).trim() !== '' &&
    String(p.final_width).trim() !== '' &&
    String(p.final_length).trim() !== '' &&
    String(p.location).trim() !== ''
  );

  const handleRemoveRow = (index: number) => {
    // Prevent deleting if there's only one row left
    if (localProducts.length <= 1) {
      toast({
        title: 'Cannot Delete',
        description: 'At least one row must remain in the table',
        variant: 'destructive',
      });
      return;
    }

    // Allow deletion of any row - user can delete below planned quantity if needed
    // (e.g., due to defects or measurement variations)
    const productToRemove = localProducts[index];
    const updated = localProducts.filter((_, i) => i !== index);
    setLocalProducts(updated);
    
    // If it's a real product (not temp), delete from backend
    // Local state is already updated above, no need to refresh
    if (productToRemove.id && !productToRemove.id.startsWith('temp-')) {
      IndividualProductService.deleteIndividualProduct(productToRemove.id)
        .then(() => {
          toast({
            title: 'Success',
            description: 'Product removed successfully',
          });
          onUpdate?.();
        })
        .catch((error) => {
          console.error('Error deleting product:', error);
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to remove product',
            variant: 'destructive',
          });
          // Revert local state on error
          setLocalProducts(localProducts);
        });
    }
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Only allow numbers and decimal point
    let numericValue = value.replace(/[^\d.]/g, '');
    setEditValue(numericValue);
    setValidationError(null);
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Individual Products ({localProducts.length})</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Click on any cell to edit. Type numbers only - units are added automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasOneRowFilled && (
              <Button
                onClick={handleApplySameToAll}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 border-green-600 text-green-700 hover:bg-green-50"
              >
                <Layers className="w-4 h-4" />
                Apply same details to all
              </Button>
            )}
            <Button
              onClick={handleAddRow}
              size="sm"
              className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </Button>
            {onComplete && (
              <Button
                onClick={() => {
                  if (canComplete) {
                    onComplete();
                    return;
                  }
                  // Show exactly what's blocking completion
                  const tempRows = localProducts.filter(p => p.id?.startsWith('temp-'));
                  if (tempRows.length > 0) {
                    toast({
                      title: 'Unsaved rows',
                      description: `${tempRows.length} row(s) are not saved yet. Fill in all required fields (Roll No, Weight, Width, Length, Location) to auto-save them first.`,
                      variant: 'destructive',
                    });
                    return;
                  }
                  const requiredFields: { key: string; label: string }[] = [
                    { key: 'roll_number', label: 'Roll Number' },
                    { key: 'final_weight', label: 'Weight/GSM' },
                    { key: 'final_width', label: 'Width' },
                    { key: 'final_length', label: 'Length' },
                    { key: 'location', label: 'Location' },
                  ];
                  const missingMap: Record<string, string[]> = {};
                  localProducts.forEach((p, i) => {
                    requiredFields.forEach(({ key, label }) => {
                      const val = p[key as keyof IndividualProduct];
                      if (!val || (typeof val === 'string' && val.trim() === '')) {
                        if (!missingMap[`Row ${i + 1}`]) missingMap[`Row ${i + 1}`] = [];
                        missingMap[`Row ${i + 1}`].push(label);
                      }
                    });
                  });
                  const missing = Object.entries(missingMap).map(([row, fields]) => `${row}: ${fields.join(', ')}`).join(' | ');
                  if (missing) {
                    toast({
                      title: 'Missing required fields',
                      description: missing,
                      variant: 'destructive',
                    });
                  } else if (localProducts.length === 0) {
                    toast({
                      title: 'No products added',
                      description: 'Add at least one individual product before proceeding.',
                      variant: 'destructive',
                    });
                  }
                }}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Product Reference Details */}
        {product && (product.length || product.width || product.weight) && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="text-blue-600">📋</span>
              Product Reference Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {product.length && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">Expected Length</p>
                  <p className="text-gray-900 font-semibold">{product.length} {product.length_unit || ''}</p>
                </div>
              )}
              {product.width && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">Expected Width</p>
                  <p className="text-gray-900 font-semibold">{product.width} {product.width_unit || ''}</p>
                </div>
              )}
              {product.weight && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">Expected GSM</p>
                  <p className="text-gray-900 font-semibold">{product.weight} {product.weight_unit || ''}</p>
                </div>
              )}
              {plannedQuantity > 0 && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">Planned Quantity</p>
                  <p className="text-gray-900 font-semibold">{plannedQuantity} units</p>
                </div>
              )}
            </div>
            <p className="text-xs text-blue-700 mt-3 italic">
              Enter Final GSM directly in the Final GSM column.
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-2 text-left text-sm font-medium w-32 max-w-[140px]">
                  Serial Number
                </th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">QR Code</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Roll No</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Length</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Width</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final GSM</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Location</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Status</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Notes</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {localProducts.map((productItem, index) => (
                <tr key={productItem.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-2 font-mono text-sm w-32 max-w-[140px] truncate">
                    {productItem.serial_number || `#${index + 1}`}
                  </td>
                  <td className="border border-gray-200 p-2 font-mono text-sm">
                    {productItem.qr_code || '-'}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {editingCell?.row === index && editingCell?.col === 'roll_number' ? (
                      <div>
                        <Input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          placeholder="Enter roll no"
                          disabled={saving === productItem.id}
                        />
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex items-center"
                        onClick={() => handleCellClick(index, 'roll_number')}
                      >
                        {productItem.roll_number || <span className="text-gray-400">Enter roll no</span>}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {editingCell?.row === index && editingCell?.col === 'final_length' ? (
                      <div>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={editValue}
                          onChange={handleNumberInput}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          placeholder={`e.g., 2.74 (${product?.length_unit || 'm'} auto-added)`}
                          disabled={saving === productItem.id}
                          className={validationError && editingCell?.col === 'final_length' ? 'border-red-500 focus:border-red-500' : ''}
                        />
                        {validationError && editingCell?.col === 'final_length' && (
                          <p className="text-xs text-red-600 mt-1">{validationError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex-1 flex items-center"
                          onClick={() => handleCellClick(index, 'final_length')}
                        >
                          {productItem.final_length || <span className="text-gray-400">Click to edit</span>}
                        </div>
                        {productItem.final_length && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFillDownField(index, 'final_length');
                            }}
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={index === localProducts.length - 1}
                            title="Fill down length"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {editingCell?.row === index && editingCell?.col === 'final_width' ? (
                      <div>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={editValue}
                          onChange={handleNumberInput}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          placeholder={`e.g., 1.83 (${product?.width_unit || 'm'} auto-added)`}
                          disabled={saving === productItem.id}
                          className={validationError && editingCell?.col === 'final_width' ? 'border-red-500 focus:border-red-500' : ''}
                        />
                        {validationError && editingCell?.col === 'final_width' && (
                          <p className="text-xs text-red-600 mt-1">{validationError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex-1 flex items-center"
                          onClick={() => handleCellClick(index, 'final_width')}
                        >
                          {productItem.final_width || <span className="text-gray-400">Click to edit</span>}
                        </div>
                        {productItem.final_width && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFillDownField(index, 'final_width');
                            }}
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={index === localProducts.length - 1}
                            title="Fill down width"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {editingCell?.row === index && editingCell?.col === 'final_weight' ? (
                      <div>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={editValue}
                          onChange={handleNumberInput}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          placeholder={`e.g., 350 (${product?.weight_unit || 'GSM'})`}
                          disabled={saving === productItem.id}
                          className={validationError && editingCell?.col === 'final_weight' ? 'border-red-500 focus:border-red-500' : ''}
                        />
                        {validationError && editingCell?.col === 'final_weight' && (
                          <p className="text-xs text-red-600 mt-1">{validationError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex-1 flex items-start flex-col"
                          onClick={() => handleCellClick(index, 'final_weight')}
                        >
                          {productItem.final_weight ? (
                            <span className="text-sm text-gray-900">{productItem.final_weight}</span>
                          ) : (
                            <span className="text-gray-400">Click to edit</span>
                          )}
                        </div>
                        {productItem.final_weight && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFillDownField(index, 'final_weight');
                            }}
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={index === localProducts.length - 1}
                            title="Fill down weight"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                <td className="border border-gray-200 p-2">
                  <div className="flex items-center gap-1">
                    <Select
                      value={productItem.location || (locationOptions[0] || '')}
                      onValueChange={(value) => {
                        if (value === '__add_new__') {
                          setIsAddingLocation(true);
                        } else {
                          handleSelectChange(index, 'location', value);
                        }
                      }}
                      disabled={saving === productItem.id}
                    >
                      <SelectTrigger
                        className="w-40 max-w-[160px] truncate"
                        title={productItem.location || (locationOptions[0] || '')}
                      >
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationOptions.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                        <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                          <Plus className="w-3 h-3 inline mr-1" />
                          Add New Location
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {productItem.location && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFillDownLocation(index);
                          }}
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          disabled={index === localProducts.length - 1}
                          title="Fill down location"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyLocationToAll(index);
                          }}
                          className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Apply this location to all rows"
                        >
                          All
                        </Button>
                      </>
                    )}
                  </div>
                </td>
                  <td className="border border-gray-200 p-2">
                    <Select
                      value={productItem.status === 'used' || productItem.status === 'in_production' ? 'available' : (productItem.status || 'available')}
                      onValueChange={(value) => handleSelectChange(index, 'status', value)}
                      disabled={saving === productItem.id}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Show actual status if it's "used" or "in_production" */}
                    {(productItem.status === 'used' || productItem.status === 'in_production') && (
                      <p className="text-xs text-gray-500 mt-1">Status: {productItem.status}</p>
                    )}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {editingCell?.row === index && editingCell?.col === 'notes' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          const words = value.trim().split(/\s+/).filter(w => w.length > 0);

                          // HARD LIMIT: 10 words max
                          if (words.length > 10) {
                            const allowed = words.slice(0, 10).join(' ');
                            setEditValue(allowed);
                            return;
                          }

                          // HARD LIMIT: 15 chars per word
                          const hasLongWord = words.some(w => w.length > 15);
                          if (hasLongWord) {
                            const trimmedWords = words.map(w => w.slice(0, 15));
                            setEditValue(trimmedWords.join(' '));
                            return;
                          }

                          setEditValue(value);
                        }}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        autoFocus
                        placeholder="Max 10 words, 15 chars/word"
                        disabled={saving === productItem.id}
                      />
                    ) : (
                      <div
                        className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex items-center"
                        onClick={() => handleCellClick(index, 'notes')}
                      >
                        {productItem.notes || <span className="text-gray-400">Click to edit</span>}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-200 p-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyRow(index)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Copy row values"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFillDown(index)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        disabled={index === localProducts.length - 1}
                        title="Fill down to rows below"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      {copiedRowData && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePasteRow(index)}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="Paste copied values"
                        >
                          Paste
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveRow(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saving === productItem.id || localProducts.length <= 1}
                        title={localProducts.length <= 1 ? 'At least one row must remain' : 'Delete row'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    {/* Add New Location Dialog */}
    <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Storage Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newLocation">Location Name</Label>
            <Input
              id="newLocation"
              placeholder="e.g., First Floor - Zone A - Section 1"
              value={newLocationValue}
              onChange={(e) => setNewLocationValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddLocation();
                }
              }}
            />
            <p className="text-xs text-gray-500">
              Examples: First Floor - Zone A, Second Floor - Zone B - Section 1, Ground Floor - Zone C
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsAddingLocation(false);
              setNewLocationValue('');
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleAddLocation}>
            <Plus className="w-4 h-4 mr-1" />
            Add Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}

