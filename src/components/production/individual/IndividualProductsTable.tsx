import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, CheckCircle, Copy, ArrowDown } from 'lucide-react';
import { IndividualProductService } from '@/services/individualProductService';
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
}: IndividualProductsTableProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [localProducts, setLocalProducts] = useState<IndividualProduct[]>(individualProducts);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedRowData, setCopiedRowData] = useState<{final_length?: string; final_width?: string; final_weight?: string} | null>(null);
  const [copiedField, setCopiedField] = useState<{field: 'final_length' | 'final_width' | 'final_weight'; value: string} | null>(null);

  // Common warehouse locations
  const locationOptions = [
    'Warehouse A - General Storage',
    'Warehouse A - Section 1',
    'Warehouse A - Section 2',
    'Warehouse A - Section 3',
    'Warehouse B - General Storage',
    'Warehouse B - Section 1',
    'Warehouse B - Section 2',
    'Warehouse C - General Storage',
    'Production Floor',
    'Quality Check Area',
    'Shipping Area',
    'Temporary Storage',
  ];

  // Auto-populate rows based on planned quantity - always maintain at least plannedQuantity rows
  useEffect(() => {
    if (!productId || plannedQuantity <= 0) return;

    // Merge backend products with local temporary products
    const tempProducts = localProducts.filter(p => p.id.startsWith('temp-'));
    const backendProducts = individualProducts.filter(p => !p.id.startsWith('temp-'));
    
    // Start with temporary products (preserve them)
    const mergedProducts: IndividualProduct[] = [...tempProducts];
    
    // Add/update backend products
    backendProducts.forEach(backendProduct => {
      const existingIndex = mergedProducts.findIndex(p => p.id === backendProduct.id);
      if (existingIndex >= 0) {
        // Update existing product with backend data
        mergedProducts[existingIndex] = backendProduct;
      } else {
        // Add new backend product
        mergedProducts.push(backendProduct);
      }
    });
    
    // Always ensure we have exactly plannedQuantity rows total
    // If user has saved products, show those + empty rows to fill up to plannedQuantity
    const currentCount = mergedProducts.length;
    
    if (currentCount < plannedQuantity) {
      const rowsToAdd = plannedQuantity - currentCount;
      const newProducts: IndividualProduct[] = Array.from({ length: rowsToAdd }).map((_, index) => ({
        _id: `temp-${Date.now()}-${index}`,
        id: `temp-${Date.now()}-${index}`,
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
      }));
      mergedProducts.push(...newProducts);
    }
    
    // Only update if there are actual changes
    const localIds = localProducts.map(p => p.id).sort().join(',');
    const mergedIds = mergedProducts.map(p => p.id).sort().join(',');
    
    if (localIds !== mergedIds || mergedProducts.length !== localProducts.length) {
      setLocalProducts(mergedProducts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [individualProducts, plannedQuantity, productId, batchId]);

  // Calculate canComplete: all existing rows must have required fields filled
  // If there are empty rows, user must delete them before completing
  useEffect(() => {
    if (!onCanCompleteChange) return;

    const requiredFields = ['final_weight', 'final_width', 'final_length'];
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
      case 'final_weight':
        // Extract number only (remove unit if present)
        const weightValue = productItem.final_weight || '';
        value = weightValue.replace(/[^\d.]/g, '');
        break;
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
      
      // Validate final_weight, final_length, final_width against expected values (±2 range)
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

        // Get expected value and validate range
        let expectedNumeric: number | null = null;
        let fieldName = '';
        
        if (col === 'final_weight' && product?.weight) {
          expectedNumeric = parseFloat(product.weight.toString().replace(/[^\d.]/g, ''));
          fieldName = 'Weight';
        } else if (col === 'final_length' && product?.length) {
          expectedNumeric = parseFloat(product.length.toString().replace(/[^\d.]/g, ''));
          fieldName = 'Length';
        } else if (col === 'final_width' && product?.width) {
          expectedNumeric = parseFloat(product.width.toString().replace(/[^\d.]/g, ''));
          fieldName = 'Width';
        }

        // Validate range: GSM (weight) uses ±10, length and width use ±2
        if (expectedNumeric !== null && !isNaN(expectedNumeric)) {
          const range = col === 'final_weight' ? 10 : 2;
          const minValue = expectedNumeric - range;
          const maxValue = expectedNumeric + range;
          
        if (enteredNumeric < minValue || enteredNumeric > maxValue) {
          toast({
            title: 'Validation Error',
            description: `${fieldName} must be between ${minValue} and ${maxValue} (Expected: ${expectedNumeric} ± ${range})`,
            variant: 'destructive',
          });
          setSaving(null);
          setValidationError(`${fieldName} must be between ${minValue} and ${maxValue} (Expected: ${expectedNumeric} ± ${range})`);
          return;
        }
      }
    }

    // Clear validation error on successful validation
    setValidationError(null);
      
      // Auto-append units for weight, width, length if user only typed numbers
      if (col === 'final_weight' && valueToSave && !valueToSave.match(/[a-zA-Z]/)) {
        const weightUnit = product?.weight_unit || 
          (product?.weight?.includes('GSM') ? 'GSM' : 
           product?.weight?.includes('kg') ? 'kg' : 'kg');
        valueToSave = `${valueToSave} ${weightUnit}`;
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
        // Don't call onUpdate() - local state is already updated, avoid full page refresh
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
                                  productId;
        
        // Only create if this is the last required field being filled
        if (hasRequiredFields && (col === 'final_weight' || col === 'final_width' || col === 'final_length')) {
          try {
            // Create the individual product
            const newProduct = await IndividualProductService.createIndividualProduct({
              product_id: productId,
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
            updated[row] = newProduct;
            setLocalProducts(updated);
            
            toast({
              title: 'Success',
              description: 'Individual product created and added to stock',
            });
            // Don't call onUpdate() here - it would refresh and lose other temp rows
          } catch (error) {
            console.error('Error creating individual product:', error);
            toast({
              title: 'Error',
              description: 'Failed to create individual product',
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
        description: 'Failed to update product details',
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
        // Don't call onUpdate() - local state is already updated, avoid full page refresh
      } else if (productItem.id && productItem.id.startsWith('temp-')) {
        // For temp products, check if we have enough data to create it
        const tempProduct = updated[row];
        const hasRequiredFields = tempProduct.final_weight && 
                                  tempProduct.final_width && 
                                  tempProduct.final_length &&
                                  productId;
        
        // Only create if all required fields are now filled
        if (hasRequiredFields) {
          try {
            // Create the individual product
            const newProduct = await IndividualProductService.createIndividualProduct({
              product_id: productId,
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
            });
            
            // Update the product with batch_number after creation
            if (batchId && newProduct.id) {
              await IndividualProductService.updateIndividualProduct(newProduct.id, {
                batch_number: batchId,
              });
              newProduct.batch_number = batchId;
            }
            
            // Update local state with the real product
            updated[row] = newProduct;
            setLocalProducts(updated);
            
            toast({
              title: 'Success',
              description: 'Individual product created and added to stock',
            });
            // Don't call onUpdate() here - it would refresh and lose other temp rows
          } catch (error) {
            console.error('Error creating individual product:', error);
            toast({
              title: 'Error',
              description: 'Failed to create individual product',
              variant: 'destructive',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product details',
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
    // Prevent adding more rows than planned quantity
    if (plannedQuantity > 0 && localProducts.length >= plannedQuantity) {
      toast({
        title: 'Limit Reached',
        description: `Cannot add more than ${plannedQuantity} product(s). Planned quantity is ${plannedQuantity}.`,
        variant: 'destructive',
      });
      return;
    }

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

  const handleCopyField = (index: number, field: 'final_length' | 'final_width' | 'final_weight') => {
    const productToCopy = localProducts[index];
    const rawValue = productToCopy[field];
    
    // Ensure we get a clean string value
    let value = '';
    if (rawValue) {
      value = String(rawValue).trim();
    }
    
    if (!value || value === '') {
      toast({
        title: 'No Value',
        description: `This row has no ${field.replace('final_', '')} value to copy.`,
        variant: 'destructive',
      });
      return;
    }

    // Store clean value
    setCopiedField({ field, value });
    toast({
      title: 'Copied',
      description: `${field.replace('final_', '').charAt(0).toUpperCase() + field.replace('final_', '').slice(1)} (${value}) copied. Click "Fill Down" arrow to paste to next row.`,
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
        toast({
          title: 'Filled Down',
          description: `${field.replace('final_', '').charAt(0).toUpperCase() + field.replace('final_', '').slice(1)} (${cleanValue}) copied to next row and saved.`,
        });
      } catch (error) {
        console.error('Error updating product:', error);
        toast({
          title: 'Error',
          description: 'Failed to save value',
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
      } catch (error) {
        console.error('Error creating individual product:', error);
        toast({
          title: 'Error',
          description: 'Failed to create individual product',
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

    // Auto-save if it's a real product
    if (targetRow.id && !targetRow.id.startsWith('temp-') && Object.keys(updateData).length > 0) {
      try {
        await IndividualProductService.updateIndividualProduct(targetRow.id, updateData);
        toast({
          title: 'Filled Down',
          description: `Copied ${Object.keys(updateData).length} field(s) to next row and saved.`,
        });
      } catch (error) {
        console.error('Error updating product:', error);
        toast({
          title: 'Error',
          description: 'Failed to save values',
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
        toast({
          title: 'Pasted',
          description: 'Values pasted and saved successfully.',
        });
      } catch (error) {
        console.error('Error updating product:', error);
        toast({
          title: 'Error',
          description: 'Failed to save pasted values',
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
      } catch (error) {
        console.error('Error creating individual product:', error);
        toast({
          title: 'Error',
          description: 'Failed to create individual product',
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
          // Don't call onUpdate() - local state is already updated, avoid full page refresh
        })
        .catch((error) => {
          console.error('Error deleting product:', error);
          toast({
            title: 'Error',
            description: 'Failed to remove product',
            variant: 'destructive',
          });
          // Revert local state on error
          setLocalProducts(localProducts);
        });
    }
  };

  // Calculate actual weight in KG from GSM, length, and width
  const calculateWeightInKg = (): number | null => {
    if (!product?.weight || !product?.length || !product?.width) return null;
    
    const gsm = parseFloat(product.weight.toString().replace(/[^\d.]/g, ''));
    const lengthStr = product.length.toString();
    const widthStr = product.width.toString();
    
    // Extract numeric values
    let lengthM = parseFloat(lengthStr.replace(/[^\d.]/g, ''));
    let widthM = parseFloat(widthStr.replace(/[^\d.]/g, ''));
    
    // Convert to meters if in feet (1 foot = 0.3048 meters)
    if (product.length_unit?.toLowerCase().includes('feet') || lengthStr.toLowerCase().includes('feet')) {
      lengthM = lengthM * 0.3048;
    }
    if (product.width_unit?.toLowerCase().includes('feet') || widthStr.toLowerCase().includes('feet')) {
      widthM = widthM * 0.3048;
    }
    
    // Calculate weight in KG: (GSM × Length (m) × Width (m)) / 1000
    if (!isNaN(gsm) && !isNaN(lengthM) && !isNaN(widthM) && gsm > 0 && lengthM > 0 && widthM > 0) {
      return (gsm * lengthM * widthM) / 1000;
    }
    
    return null;
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, col: string) => {
    const value = e.target.value;
    
    // Only allow numbers and decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    setEditValue(numericValue);
    
    // Clear validation error when user types
    setValidationError(null);

    // Real-time validation for weight, length, width
    if (col === 'final_weight' || col === 'final_length' || col === 'final_width') {
      if (!numericValue.trim()) {
        return;
      }

      const enteredNumeric = parseFloat(numericValue);
      if (isNaN(enteredNumeric)) {
        return;
      }

      let expectedNumeric: number | null = null;
      let fieldName = '';
      
      if (col === 'final_weight' && product?.weight) {
        expectedNumeric = parseFloat(product.weight.toString().replace(/[^\d.]/g, ''));
        fieldName = 'Weight';
      } else if (col === 'final_length' && product?.length) {
        expectedNumeric = parseFloat(product.length.toString().replace(/[^\d.]/g, ''));
        fieldName = 'Length';
      } else if (col === 'final_width' && product?.width) {
        expectedNumeric = parseFloat(product.width.toString().replace(/[^\d.]/g, ''));
        fieldName = 'Width';
      }

      if (expectedNumeric !== null && !isNaN(expectedNumeric)) {
        // GSM (weight) uses ±10 range, length and width use ±2 range
        const range = col === 'final_weight' ? 10 : 2;
        const minValue = expectedNumeric - range;
        const maxValue = expectedNumeric + range;
        
        if (enteredNumeric < minValue || enteredNumeric > maxValue) {
          setValidationError(`${fieldName} must be between ${minValue} and ${maxValue} (Expected: ${expectedNumeric} ± ${range})`);
        } else {
          setValidationError(null);
        }
      }
    }
  };

  return (
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
            <Button
              onClick={handleAddRow}
              size="sm"
              className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:text-white"
              disabled={plannedQuantity > 0 && localProducts.length >= plannedQuantity}
            >
              <Plus className="w-4 h-4" />
              Add Row
            </Button>
            {onComplete && (
              <Button
                onClick={onComplete}
                size="sm"
                disabled={!canComplete}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 disabled:opacity-50 disabled:text-white"
              >
                <CheckCircle className="w-4 h-4" />
                Complete Production
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
                  <p className="text-gray-600 font-medium mb-1">Expected Quality</p>
                  <p className="text-gray-900 font-semibold">{product.weight} {product.weight_unit || ''}</p>
                </div>
              )}
              {(() => {
                const weightKg = calculateWeightInKg();
                if (weightKg !== null) {
                  return (
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Actual Weight (KG)</p>
                      <p className="text-gray-900 font-semibold">{weightKg.toFixed(3)} kg</p>
                    </div>
                  );
                }
                return null;
              })()}
              {plannedQuantity > 0 && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">Planned Quantity</p>
                  <p className="text-gray-900 font-semibold">{plannedQuantity} units</p>
                </div>
              )}
            </div>
            <p className="text-xs text-blue-700 mt-3 italic">
              Fill in the table below according to these reference values. Units are added automatically when you type numbers.
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Serial Number</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">QR Code</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Length</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Width</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Weight</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Location</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Status</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Notes</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {localProducts.map((productItem, index) => (
                <tr key={productItem.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-2 font-mono text-sm">
                    {productItem.serial_number || `#${index + 1}`}
                  </td>
                  <td className="border border-gray-200 p-2 font-mono text-sm">
                    {productItem.qr_code || '-'}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {editingCell?.row === index && editingCell?.col === 'final_length' ? (
                      <div>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={editValue}
                          onChange={(e) => handleNumberInput(e, 'final_length')}
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
                          onChange={(e) => handleNumberInput(e, 'final_width')}
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
                          onChange={(e) => handleNumberInput(e, 'final_weight')}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          placeholder={`e.g., 15 (${product?.weight_unit || 'kg'} auto-added)`}
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
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex-1 flex items-center"
                          onClick={() => handleCellClick(index, 'final_weight')}
                        >
                          {productItem.final_weight || <span className="text-gray-400">Click to edit</span>}
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
                    <Select
                      value={productItem.location || 'Warehouse A - General Storage'}
                      onValueChange={(value) => handleSelectChange(index, 'location', value)}
                      disabled={saving === productItem.id}
                    >
                      <SelectTrigger className="w-40 max-w-[160px] truncate" title={productItem.location || 'Warehouse A - General Storage'}>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationOptions.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
  );
}

