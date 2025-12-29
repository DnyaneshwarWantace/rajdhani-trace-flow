import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MaterialService } from '@/services/materialService';
import type { RawMaterial } from '@/types/material';

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ImportProgress {
  current: number;
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export default function ImportCSVDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportCSVDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a CSV file',
          variant: 'destructive',
        });
        return;
      }
      
      // Try to read the file immediately to check if it's accessible
      try {
        await selectedFile.text();
        setFile(selectedFile);
        setProgress({
          current: 0,
          total: 0,
          success: 0,
          failed: 0,
          errors: [],
        });
      } catch (error) {
        console.error('Error reading file:', error);
        toast({
          title: 'File Read Error',
          description: 'Cannot read the selected file. Please make sure the file is not open in another program and try again.',
          variant: 'destructive',
        });
        // Reset the input
        e.target.value = '';
      }
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Helper function to parse CSV line handling quoted values
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add last field
      result.push(current.trim());
      return result;
    };

    // Parse header and normalize (remove spaces, convert to lowercase)
    const headerLine = parseCSVLine(lines[0]);
    const headers = headerLine.map(h => {
      const normalized = h.replace(/^"|"$/g, '').trim().toLowerCase().replace(/\s+/g, '');
      return normalized;
    });
    
    // Parse data rows
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
      if (values.length === 0 || values.every(v => !v)) continue; // Skip empty rows
      
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
    
    return rows;
  };

  const mapCSVRowToMaterial = (row: any): Partial<RawMaterial> => {
    // Map CSV columns to material fields
    // Support both snake_case and camelCase
    const name = row.name || row.material_name || '';
    const supplier = row.supplier || row.supplier_name || '';
    const category = row.category || '';
    let unit = row.unit || '';
    
    // Normalize unit values to match system units
    const unitMap: { [key: string]: string } = {
      'liter': 'L',
      'litre': 'L',
      'l': 'L',
      'meter': 'meters',
      'metre': 'meters',
      'm': 'meters',
      'kg': 'kg',
      'kilogram': 'kg',
      'piece': 'kg', // Default to kg if not in valid list
      'spool': 'kg', // Default to kg if not in valid list
    };
    
    unit = unitMap[unit.toLowerCase()] || unit;
    
    const costPerUnit = parseFloat(row.costperunit || row.cost_per_unit || row.cost || '0') || 0;
    
    // Optional fields with defaults (matching form defaults)
    // Headers are normalized (spaces removed, lowercase), so "Current Stock" becomes "currentstock"
    const type = row.type || '';
    
    // Current stock - default to 0 if not provided
    const currentStockValue = row.currentstock || row.current_stock || row.stock || '';
    const currentStock = (currentStockValue !== '' && currentStockValue !== null && currentStockValue !== undefined)
      ? (parseFloat(String(currentStockValue)) || 0)
      : 0;
    
    // Min threshold - default to 10 if not provided
    const minThresholdValue = row.minthreshold || row.min_threshold || row.min || '';
    const minThreshold = (minThresholdValue !== '' && minThresholdValue !== null && minThresholdValue !== undefined)
      ? (parseFloat(String(minThresholdValue)) || 10)
      : 10;
    
    // Max capacity - default to 1000 if not provided
    const maxCapacityValue = row.maxcapacity || row.max_capacity || row.max || '';
    const maxCapacity = (maxCapacityValue !== '' && maxCapacityValue !== null && maxCapacityValue !== undefined)
      ? (parseFloat(String(maxCapacityValue)) || 1000)
      : 1000;
    
    // Reorder point - default to 50 if not provided, or use minThreshold if available
    const reorderPointValue = row.reorderpoint || row.reorder_point || row.reorder || '';
    let reorderPoint: number;
    if (reorderPointValue !== '' && reorderPointValue !== null && reorderPointValue !== undefined && String(reorderPointValue).trim() !== '') {
      const parsed = parseFloat(String(reorderPointValue).trim());
      reorderPoint = (isNaN(parsed) || parsed <= 0) ? (minThreshold || 50) : parsed;
    } else {
      // If empty, use minThreshold if available, otherwise default to 50
      reorderPoint = minThreshold || 50;
    }
    
    const color = row.color || 'NA';

    // Always ensure these required fields have valid numbers
    // Force reorder_point to be a valid positive number
    const finalReorderPoint = (reorderPoint > 0 && !isNaN(reorderPoint)) 
      ? reorderPoint 
      : ((minThreshold > 0) ? minThreshold : 50);
    
    const materialData: any = {
      name: String(name).trim(),
      supplier_name: String(supplier).trim(),
      category: String(category).trim(),
      unit: String(unit).trim(),
      cost_per_unit: Number(costPerUnit),
      current_stock: Number(currentStock) || 0,
      min_threshold: Number(minThreshold) || 10,
      max_capacity: Number(maxCapacity) || 1000,
      reorder_point: Number(finalReorderPoint), // Always a valid positive number
    };
    
    // Add optional fields only if they have values
    if (type && type.trim() !== '') {
      materialData.type = String(type).trim();
    }
    if (color && color.trim() !== '' && color !== 'NA') {
      materialData.color = String(color).trim();
    }

    // Final safety check - should never trigger but just in case
    if (!materialData.reorder_point || isNaN(materialData.reorder_point) || materialData.reorder_point <= 0) {
      console.error('ERROR: reorder_point is invalid!', materialData);
      materialData.reorder_point = materialData.min_threshold || 50;
    }

    return materialData;
  };

  const validateMaterial = (material: Partial<RawMaterial>): string | null => {
    // Required fields (same as form validation)
    if (!material.name || material.name.trim() === '') {
      return 'Name is required';
    }
    if (!material.supplier_name || material.supplier_name.trim() === '') {
      return 'Supplier is required';
    }
    if (!material.category || material.category.trim() === '') {
      return 'Category is required';
    }
    if (!material.unit || material.unit.trim() === '') {
      return 'Unit is required';
    }
    if (material.cost_per_unit === undefined || material.cost_per_unit < 0) {
      return 'Cost per unit is required and must be a valid number';
    }
    return null;
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to import',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    setProgress({
      current: 0,
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
    });

    try {
      // Read file with better error handling
      let text: string;
      try {
        text = await file.text();
      } catch (readError) {
        console.error('Error reading file:', readError);
        toast({
          title: 'File Read Error',
          description: 'Cannot read the CSV file. Please make sure the file is not open in another program, close it, and try again.',
          variant: 'destructive',
        });
        setImporting(false);
        return;
      }
      
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({
          title: 'Empty CSV',
          description: 'The CSV file appears to be empty or has no data rows',
          variant: 'destructive',
        });
        setImporting(false);
        return;
      }

      setProgress(prev => ({ ...prev, total: rows.length }));

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Import materials one by one
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setProgress(prev => ({ ...prev, current: i + 1 }));

        try {
          const materialData = mapCSVRowToMaterial(row);
          
          const validationError = validateMaterial(materialData);

          if (validationError) {
            failedCount++;
            errors.push(`Row ${i + 2}: ${validationError} - ${materialData.name || 'Unknown'}`);
            continue;
          }

          // Final check: Ensure reorder_point is always a valid number before sending
          const reorderPointValue = Number(materialData.reorder_point) || Number(materialData.min_threshold) || 50;
          const finalMaterialData = {
            ...materialData,
            reorder_point: reorderPointValue,
            min_threshold: Number(materialData.min_threshold) || 10,
            max_capacity: Number(materialData.max_capacity) || 1000,
            current_stock: Number(materialData.current_stock) || 0,
            cost_per_unit: Number(materialData.cost_per_unit) || 0,
          };

          // Debug: Log the data being sent
          console.log(`Row ${i + 2} - Sending material data:`, {
            name: finalMaterialData.name,
            reorder_point: finalMaterialData.reorder_point,
            min_threshold: finalMaterialData.min_threshold,
            max_capacity: finalMaterialData.max_capacity,
          });

          // Create material with guaranteed valid numbers
          await MaterialService.createMaterial(finalMaterialData as any);
          successCount++;
        } catch (error) {
          failedCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Row ${i + 2}: ${errorMessage} - ${row.name || 'Unknown'}`);
        }
      }

      setProgress({
        current: rows.length,
        total: rows.length,
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10), // Show first 10 errors
      });

      if (successCount > 0) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${successCount} material(s). ${failedCount > 0 ? `${failedCount} failed.` : ''}`,
        });
        onSuccess();
        handleClose();
      } else {
        toast({
          title: 'Import Failed',
          description: `Failed to import all materials. ${failedCount} error(s).`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        title: 'Import Error',
        description: error instanceof Error ? error.message : 'Failed to import CSV file',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setProgress({
        current: 0,
        total: 0,
        success: 0,
        failed: 0,
        errors: [],
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Materials from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Selection */}
          <div>
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importing}
              className="mt-2"
            />
            {file && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>{file.name}</span>
              </div>
            )}
          </div>

          {/* CSV Format Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 mb-2">Required Columns (must be present):</p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>name</strong> (or material_name)</li>
              <li><strong>supplier</strong> (or supplier_name)</li>
              <li><strong>category</strong></li>
              <li><strong>unit</strong></li>
              <li><strong>costPerUnit</strong> (or cost_per_unit or cost)</li>
            </ul>
            <p className="text-xs font-semibold text-blue-900 mt-2 mb-1">Optional Columns (can be skipped):</p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>type - defaults to empty</li>
              <li>currentStock (or current_stock or stock) - defaults to 0</li>
              <li>minThreshold (or min_threshold or min) - defaults to 10</li>
              <li>maxCapacity (or max_capacity or max) - defaults to 1000</li>
              <li>reorderPoint (or reorder_point or reorder) - defaults to 50</li>
              <li>color - defaults to 'NA'</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2 italic">
              Note: Optional fields will use default values if not provided, just like the form.
            </p>
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing materials...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {!importing && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-700">Success: {progress.success}</span>
              </div>
              {progress.failed > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-700">Failed: {progress.failed}</span>
                </div>
              )}
              {progress.errors.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs max-h-32 overflow-y-auto">
                  <p className="font-semibold text-red-900 mb-1">Errors:</p>
                  {progress.errors.map((error, index) => (
                    <p key={index} className="text-red-700">{error}</p>
                  ))}
                  {progress.failed > 10 && (
                    <p className="text-red-600 mt-1 italic">
                      ... and {progress.failed - 10} more error(s)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Cancel'}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

