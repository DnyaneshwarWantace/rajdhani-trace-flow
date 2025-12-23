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
import { Trash2, Plus, CheckCircle } from 'lucide-react';
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
}: IndividualProductsTableProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [localProducts, setLocalProducts] = useState<IndividualProduct[]>(individualProducts);

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

  // Auto-populate rows based on planned quantity if no products exist
  useEffect(() => {
    if (individualProducts.length === 0 && plannedQuantity > 0 && productId) {
      // Create empty rows for planned quantity only if localProducts is also empty
      if (localProducts.length === 0) {
        const newProducts: IndividualProduct[] = Array.from({ length: plannedQuantity }).map((_, index) => ({
          _id: `temp-${Date.now()}-${index}`,
          id: `temp-${Date.now()}-${index}`,
          product_id: productId,
          qr_code: '',
          serial_number: '',
          status: 'available', // Default to available (not in_production)
          production_date: new Date().toISOString().split('T')[0],
          batch_number: batchId || '',
          final_weight: '',
          final_width: '',
          final_length: '',
          quality_grade: 'A',
          inspector: '',
          location: '',
          notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setLocalProducts(newProducts);
      }
    } else {
      // Merge backend products with local temporary products
      // Keep temporary products that haven't been saved yet
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
      
      // Only update if there are actual changes
      const localIds = localProducts.map(p => p.id).sort().join(',');
      const mergedIds = mergedProducts.map(p => p.id).sort().join(',');
      
      if (localIds !== mergedIds || mergedProducts.length !== localProducts.length) {
        setLocalProducts(mergedProducts);
      }
    }
  }, [individualProducts, plannedQuantity, productId, batchId]);

  const handleCellClick = (row: number, col: string) => {
    const productItem = localProducts[row];
    let value = '';
    
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
        toast({
          title: 'Success',
          description: 'Product details updated successfully',
        });
        onUpdate();
      } else if (productItem.id && productItem.id.startsWith('temp-')) {
        // For temp products, check if we have enough data to create it
        const tempProduct = updated[row];
        const hasRequiredFields = tempProduct.final_weight && 
                                  tempProduct.final_width && 
                                  tempProduct.final_length && 
                                  tempProduct.quality_grade &&
                                  productId;
        
        // Only create if this is the last required field being filled
        if (hasRequiredFields && (col === 'final_weight' || col === 'final_width' || col === 'final_length' || col === 'quality_grade')) {
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
              quality_grade: tempProduct.quality_grade || 'A',
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
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product details',
        variant: 'destructive',
      });
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
        toast({
          title: 'Success',
          description: 'Product details updated successfully',
        });
        onUpdate();
      } else if (productItem.id && productItem.id.startsWith('temp-')) {
        // For temp products, check if we have enough data to create it
        const tempProduct = updated[row];
        const hasRequiredFields = tempProduct.final_weight && 
                                  tempProduct.final_width && 
                                  tempProduct.final_length && 
                                  tempProduct.quality_grade &&
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
              quality_grade: tempProduct.quality_grade || 'A',
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
      quality_grade: 'A',
      inspector: '',
      location: '',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLocalProducts([...localProducts, newProduct]);
  };

  const handleRemoveRow = (index: number) => {
    const productToRemove = localProducts[index];
    const updated = localProducts.filter((_, i) => i !== index);
    setLocalProducts(updated);
    
    // If it's a real product (not temp), delete from backend
    if (productToRemove.id && !productToRemove.id.startsWith('temp-')) {
      IndividualProductService.deleteIndividualProduct(productToRemove.id)
        .then(() => {
          toast({
            title: 'Success',
            description: 'Product removed successfully',
          });
          onUpdate();
        })
        .catch((error) => {
          console.error('Error deleting product:', error);
          toast({
            title: 'Error',
            description: 'Failed to remove product',
            variant: 'destructive',
          });
        });
    }
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, _col: string) => {
    // Only allow numbers and decimal point
    const value = e.target.value.replace(/[^\d.]/g, '');
    setEditValue(value);
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
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </Button>
            {onComplete && (
              <Button
                onClick={onComplete}
                size="sm"
                disabled={!canComplete}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Complete Production
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Serial Number</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">QR Code</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Weight</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Width</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Length</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Quality Grade</th>
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
                    {editingCell?.row === index && editingCell?.col === 'final_weight' ? (
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
                      />
                    ) : (
                      <div
                        className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex items-center"
                        onClick={() => handleCellClick(index, 'final_weight')}
                      >
                        {productItem.final_weight || <span className="text-gray-400">Click to edit</span>}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {editingCell?.row === index && editingCell?.col === 'final_width' ? (
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
                      />
                    ) : (
                      <div
                        className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex items-center"
                        onClick={() => handleCellClick(index, 'final_width')}
                      >
                        {productItem.final_width || <span className="text-gray-400">Click to edit</span>}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {editingCell?.row === index && editingCell?.col === 'final_length' ? (
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
                      />
                    ) : (
                      <div
                        className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex items-center"
                        onClick={() => handleCellClick(index, 'final_length')}
                      >
                        {productItem.final_length || <span className="text-gray-400">Click to edit</span>}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-200 p-2">
                    <Select
                      value={productItem.quality_grade || 'A'}
                      onValueChange={(value) => handleSelectChange(index, 'quality_grade', value)}
                      disabled={saving === productItem.id}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={saving === productItem.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

