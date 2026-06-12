import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
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
import { Loader2, Upload, FileText, AlertCircle, CheckCircle, FileSpreadsheet, Download, X } from 'lucide-react';
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
  skipped: number;
  errors: string[];
  skippedNames: string[];
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
    skipped: 0,
    errors: [],
    skippedNames: [],
  });

  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [open]);

  const TEMPLATE_HEADERS = ['name', 'supplier', 'category', 'unit', 'costPerUnit', 'type', 'currentStock', 'minThreshold', 'maxCapacity', 'reorderPoint', 'color'];
  const TEMPLATE_EXAMPLE = ['Polypropylene Fibre', 'ABC Supplier', 'Fibre', 'kg', '50', '', '100', '10', '1000', '50', 'NA'];

  const downloadTemplateCsv = () => {
    const csv = `${TEMPLATE_HEADERS.join(',')}\n${TEMPLATE_EXAMPLE.map(v => `"${v}"`).join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'materials_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const downloadTemplateExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]);
    // Style header row
    TEMPLATE_HEADERS.forEach((_, i) => {
      const cell = XLSX.utils.encode_cell({ r: 0, c: i });
      if (ws[cell]) ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E5F0FF' } } };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materials');
    // Guide sheet
    const guide = XLSX.utils.aoa_to_sheet([
      ['Column', 'Required', 'Notes'],
      ['name', 'YES', 'Material name (also accepted: material_name)'],
      ['supplier', 'YES', 'Supplier name (also accepted: supplier_name)'],
      ['category', 'YES', 'e.g. Fibre, Chemical, Gas and Fuel, Packaging, Paper'],
      ['unit', 'YES', 'e.g. kg, L, meters'],
      ['costPerUnit', 'YES', 'Cost per unit (also: cost_per_unit, cost)'],
      ['type', 'no', 'Optional type'],
      ['currentStock', 'no', 'Current stock qty — defaults 0'],
      ['minThreshold', 'no', 'Min threshold — defaults 10'],
      ['maxCapacity', 'no', 'Max capacity — defaults 1000'],
      ['reorderPoint', 'no', 'Reorder point — defaults 50'],
      ['color', 'no', 'Color — defaults NA'],
    ]);
    XLSX.utils.book_append_sheet(wb, guide, 'Guide');
    XLSX.writeFile(wb, 'materials_import_template.xlsx');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isCSV  = selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv');
      const isXLSX = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
      if (!isCSV && !isXLSX) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a CSV or Excel (.xlsx/.xls) file',
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
          skipped: 0,
          skippedNames: [],
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
    if (material.cost_per_unit !== undefined && material.cost_per_unit < 0) {
      return 'Cost per unit must be a valid number (>= 0)';
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
    setProgress({ current: 0, total: 0, success: 0, failed: 0, skipped: 0, errors: [], skippedNames: [] });

    try {
      // Read file — support both CSV and Excel
      let rows: any[];
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      try {
        if (isExcel) {
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
          // Normalize keys (remove spaces, lowercase)
          rows = jsonRows.map(row => {
            const normalized: Record<string, string> = {};
            Object.keys(row).forEach(key => {
              normalized[key.toLowerCase().replace(/\s+/g, '')] = String(row[key] ?? '').trim();
            });
            return normalized;
          });
        } else {
          const text = await file.text();
          rows = parseCSV(text);
        }
      } catch (readError) {
        toast({
          title: 'File Read Error',
          description: 'Cannot read the file. Make sure it is not open in another program.',
          variant: 'destructive',
        });
        setImporting(false);
        return;
      }

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
      let skippedCount = 0;
      const errors: string[] = [];
      const skippedNames: string[] = [];

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

          const reorderPointValue = Number(materialData.reorder_point) || Number(materialData.min_threshold) || 50;
          const finalMaterialData = {
            ...materialData,
            reorder_point: reorderPointValue,
            min_threshold: Number(materialData.min_threshold) || 10,
            max_capacity: Number(materialData.max_capacity) || 1000,
            current_stock: Number(materialData.current_stock) || 0,
            cost_per_unit: Number(materialData.cost_per_unit) || 0,
          };

          await MaterialService.createMaterial(finalMaterialData as any);
          successCount++;
        } catch (error) {
          if ((error as any).isDuplicate) {
            skippedCount++;
            skippedNames.push(row.name || row.material_name || `Row ${i + 2}`);
          } else {
            failedCount++;
            errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'} - ${row.name || 'Unknown'}`);
          }
        }
      }

      setProgress({
        current: rows.length,
        total: rows.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        errors: errors.slice(0, 10),
        skippedNames,
      });

      if (successCount > 0 || skippedCount > 0) {
        toast({
          title: 'Import Complete',
          description: [
            successCount > 0 && `${successCount} imported`,
            skippedCount > 0 && `${skippedCount} skipped (already exist)`,
            failedCount > 0 && `${failedCount} failed`,
          ].filter(Boolean).join(', ') + '.',
        });
        if (successCount > 0) { onSuccess(); handleClose(); }
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
      setProgress({ current: 0, total: 0, success: 0, failed: 0, skipped: 0, errors: [], skippedNames: [] });
      onOpenChange(false);
    }
  };

  if (!open) return null;

  const submitBtn = (
    <Button
      onClick={handleImport}
      disabled={!file || importing}
      className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
    >
      {importing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Importing...
        </>
      ) : (
        <>
          <Upload className="w-4 h-4" />
          Import Materials
        </>
      )}
    </Button>
  );

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Mobile: full-screen page */}
      <div
        className="lg:hidden absolute inset-0 flex flex-col"
        style={{ backgroundColor: '#F4F5F7' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 bg-white border-b border-gray-200 px-2 py-3 flex-shrink-0">
          <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center text-gray-800">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="text-[17px] font-bold text-gray-900">Import Materials</span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-4">
          <div className="px-4 py-4 space-y-4">
            
            {/* Template Download */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Download Template First
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={downloadTemplateCsv} className="h-11 rounded-xl gap-1.5 text-xs font-semibold">
                  <FileText className="w-4 h-4" /> CSV Template
                </Button>
                <Button type="button" variant="outline" onClick={downloadTemplateExcel} className="h-11 rounded-xl gap-1.5 text-xs font-semibold">
                  <FileSpreadsheet className="w-4 h-4" /> Excel Template
                </Button>
              </div>
            </div>

            {/* File Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
              <Label htmlFor="csv-file-m" className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Select CSV or Excel File
              </Label>
              <div className="relative">
                <Input
                  id="csv-file-m"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={importing}
                  className="h-11 rounded-xl flex items-center"
                />
              </div>
              {file && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate font-medium">{file.name}</span>
                </div>
              )}
            </div>

            {/* CSV Format Info */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Required Columns:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['name', 'supplier', 'category', 'unit', 'costPerUnit'].map(col => (
                    <span key={col} className="text-[11px] bg-blue-100/80 border border-blue-200/50 text-blue-800 px-2 py-0.5 rounded font-mono font-medium">{col}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Optional Columns:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['type', 'currentStock', 'minThreshold', 'maxCapacity', 'reorderPoint', 'color'].map(col => (
                    <span key={col} className="text-[11px] bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded font-mono">{col}</span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-blue-700 italic pt-1">
                Note: Optional fields will use default values if not provided, just like the form.
              </p>
            </div>

            {/* Progress */}
            {importing && (
              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">Importing materials...</span>
                  <span className="font-mono text-gray-500">{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results */}
            {!importing && progress.total > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1 font-medium shadow-sm">
                    <CheckCircle className="w-4 h-4 text-green-650" /> Imported: {progress.success}
                  </span>
                  {progress.skipped > 0 && (
                    <span className="flex items-center gap-1.5 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1 font-medium shadow-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-650" /> Skipped: {progress.skipped}
                    </span>
                  )}
                  {progress.failed > 0 && (
                    <span className="flex items-center gap-1.5 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1 font-medium shadow-sm">
                      <AlertCircle className="w-4 h-4 text-red-650" /> Failed: {progress.failed}
                    </span>
                  )}
                </div>
                {progress.skippedNames.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800 leading-relaxed">
                    Already existed — skipped: {progress.skippedNames.join(', ')}
                  </div>
                )}
                {progress.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs max-h-40 overflow-y-auto space-y-1">
                    <p className="font-bold text-red-900 mb-1.5">Errors:</p>
                    {progress.errors.map((error, index) => (
                      <p key={index} className="text-red-700 leading-relaxed">{error}</p>
                    ))}
                    {progress.failed > 10 && (
                      <p className="text-red-600 mt-1 italic">... and {progress.failed - 10} more error(s)</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 bg-white border-t border-gray-200 flex gap-3 flex-shrink-0">
          <button onClick={handleClose} className="flex-1 h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white">
            Cancel
          </button>
          {submitBtn}
        </div>
      </div>

      {/* Desktop: centered modal with backdrop */}
      <div
        className="hidden lg:block absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      <div
        className="hidden lg:flex absolute inset-0 items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-gray-500" />
              Import Materials from CSV / Excel
            </h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {/* Template Download */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Download Template First
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={downloadTemplateCsv} className="gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5" /> CSV Template
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={downloadTemplateExcel} className="gap-1.5 text-xs">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel Template
                </Button>
              </div>
            </div>

            {/* File Selection */}
            <div>
              <Label htmlFor="csv-file">Select CSV or Excel File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,.xlsx,.xls"
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
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Imported: {progress.success}
                  </span>
                  {progress.skipped > 0 && (
                    <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-0.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Skipped: {progress.skipped}
                    </span>
                  )}
                  {progress.failed > 0 && (
                    <span className="flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Failed: {progress.failed}
                    </span>
                  )}
                </div>
                {progress.skippedNames.length > 0 && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    Already existed — skipped: {progress.skippedNames.join(', ')}
                  </div>
                )}
                {progress.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs max-h-32 overflow-y-auto">
                    <p className="font-semibold text-red-900 mb-1">Errors:</p>
                    {progress.errors.map((error, index) => (
                      <p key={index} className="text-red-700">{error}</p>
                    ))}
                    {progress.failed > 10 && (
                      <p className="text-red-600 mt-1 italic">... and {progress.failed - 10} more error(s)</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0 bg-white">
            <Button variant="outline" onClick={handleClose} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-primary-600 text-white hover:bg-primary-700 font-bold"
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

