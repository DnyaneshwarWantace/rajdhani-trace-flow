import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, FileText, Upload, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ProductService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import type { ProductFormData } from '@/types/product';

interface BulkProductUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ImportResult = {
  row: number;
  name: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
};

const FIELD_META: Array<{ key: string; required: boolean; note: string }> = [
  { key: 'name', required: true, note: 'Product name' },
  { key: 'category', required: true, note: 'Main category' },
  { key: 'subcategory', required: false, note: 'Optional subcategory' },
  { key: 'length', required: true, note: 'Numeric/string value (e.g. 50)' },
  { key: 'width', required: true, note: 'Numeric/string value (e.g. 2)' },
  { key: 'length_unit', required: true, note: 'e.g. m, ft, cm' },
  { key: 'width_unit', required: true, note: 'e.g. m, ft, cm' },
  { key: 'weight', required: false, note: 'GSM/weight value' },
  { key: 'weight_unit', required: false, note: 'e.g. GSM' },
  { key: 'color', required: false, note: 'Optional color' },
  { key: 'pattern', required: false, note: 'Optional pattern' },
  { key: 'unit', required: true, note: 'Base measuring unit (e.g. sqm)' },
  { key: 'base_quantity', required: false, note: 'Defaults to 0 if blank' },
  { key: 'min_stock_level', required: false, note: 'Defaults to 0 if blank' },
  { key: 'max_stock_level', required: false, note: 'Defaults to 0 if blank' },
  { key: 'reorder_point', required: false, note: 'Defaults to 0 if blank' },
  { key: 'individual_stock_tracking', required: false, note: 'true/false (defaults true)' },
  { key: 'notes', required: false, note: 'Optional notes' },
  { key: 'manufacturing_date', required: false, note: 'YYYY-MM-DD' },
  { key: 'status', required: false, note: 'active/inactive (defaults active)' },
];

const TEMPLATE_HEADERS = FIELD_META.map((f) => `${f.key} (${f.required ? 'required' : 'optional'})`);

const TEMPLATE_EXAMPLE = {
  name: 'PRINT FELT SH 67',
  category: 'Carpet',
  subcategory: 'Printed',
  length: '50',
  width: '2',
  length_unit: 'm',
  width_unit: 'm',
  weight: '350',
  weight_unit: 'GSM',
  color: 'White',
  pattern: 'Plain',
  unit: 'sqm',
  base_quantity: '10',
  min_stock_level: '2',
  max_stock_level: '100',
  reorder_point: '5',
  individual_stock_tracking: 'true',
  notes: 'Initial bulk import',
  manufacturing_date: '2026-04-01',
  status: 'active',
};

function parseNumber(value: unknown, fallback: number): number {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: unknown, fallback = true): boolean {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return fallback;
  return ['true', 'yes', '1', 'y'].includes(normalized);
}

function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+$/g, '')
    .trim();
}

function getValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
  }
  return '';
}

function mapRowToProduct(row: Record<string, unknown>): ProductFormData {
  const name = String(getValue(row, ['name', 'product_name']) || '').trim();
  const category = String(getValue(row, ['category']) || '').trim();
  const length = String(getValue(row, ['length']) || '').trim();
  const width = String(getValue(row, ['width']) || '').trim();
  const length_unit = String(getValue(row, ['length_unit']) || '').trim() || 'm';
  const width_unit = String(getValue(row, ['width_unit']) || '').trim() || 'm';
  const unit = String(getValue(row, ['unit']) || '').trim() || 'sqm';

  if (!name || !category || !length || !width || !length_unit || !width_unit || !unit) {
    throw new Error('Missing required fields. Required: name, category, length, width, length_unit, width_unit, unit');
  }

  return {
    name,
    category,
    subcategory: String(getValue(row, ['subcategory']) || '').trim() || undefined,
    length,
    width,
    length_unit,
    width_unit,
    weight: String(getValue(row, ['weight']) || '').trim() || undefined,
    weight_unit: String(getValue(row, ['weight_unit']) || '').trim() || undefined,
    color: String(getValue(row, ['color']) || '').trim() || undefined,
    pattern: String(getValue(row, ['pattern']) || '').trim() || undefined,
    unit,
    base_quantity: parseNumber(getValue(row, ['base_quantity', 'current_stock']), 0),
    min_stock_level: parseNumber(getValue(row, ['min_stock_level']), 0),
    max_stock_level: parseNumber(getValue(row, ['max_stock_level']), 0),
    reorder_point: parseNumber(getValue(row, ['reorder_point']), 0),
    individual_stock_tracking: parseBoolean(getValue(row, ['individual_stock_tracking']), true),
    notes: String(getValue(row, ['notes']) || '').trim() || undefined,
    manufacturing_date: String(getValue(row, ['manufacturing_date']) || '').trim() || undefined,
    status: String(getValue(row, ['status']) || 'active').trim() || 'active',
  };
}

export default function BulkProductUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkProductUploadDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; success: number; failed: number; skipped: number }>({
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  });

  const hasResults = results.length > 0;
  const failedResults = useMemo(() => results.filter((r) => r.status === 'failed'), [results]);
  const skippedResults = useMemo(() => results.filter((r) => r.status === 'skipped'), [results]);

  const resetState = () => {
    setFile(null);
    setImporting(false);
    setResults([]);
    setSummary({ total: 0, success: 0, failed: 0, skipped: 0 });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetState();
  };

  const downloadTemplateCsv = () => {
    const row = TEMPLATE_HEADERS.map((h) => String((TEMPLATE_EXAMPLE as Record<string, string>)[h] ?? ''));
    const csv = `${TEMPLATE_HEADERS.join(',')}\n${row.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'products_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const downloadTemplateExcel = () => {
    const excelExampleRow: Record<string, unknown> = {};
    FIELD_META.forEach((f) => {
      excelExampleRow[`${f.key} (${f.required ? 'required' : 'optional'})`] =
        (TEMPLATE_EXAMPLE as Record<string, string>)[f.key] ?? '';
    });

    const worksheet = XLSX.utils.json_to_sheet([excelExampleRow], { header: TEMPLATE_HEADERS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products Template');
    const guideSheet = XLSX.utils.json_to_sheet(
      FIELD_META.map((f) => ({
        Field: f.key,
        Required: f.required ? 'Yes' : 'No',
        Description: f.note,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, guideSheet, 'Field Guide');
    XLSX.writeFile(workbook, 'products_import_template.xlsx');
  };

  const parseFileRows = async (inputFile: File): Promise<Record<string, unknown>[]> => {
    const fileBuffer = await inputFile.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('No sheet found in uploaded file');
    const firstSheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

    return rawRows.map((row) => {
      const normalized: Record<string, unknown> = {};
      Object.keys(row).forEach((key) => {
        normalized[normalizeKey(key)] = row[key];
      });
      return normalized;
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: 'File required',
        description: 'Please select a CSV or Excel file first.',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    setResults([]);

    try {
      const rows = await parseFileRows(file);
      if (!rows.length) {
        throw new Error('File is empty. Add at least one product row.');
      }

      const importResults: ImportResult[] = [];
      let successCount = 0;
      let skippedCount = 0;

      for (let index = 0; index < rows.length; index += 1) {
        const rowNumber = index + 2;
        const row = rows[index];
        const rowName = String(getValue(row, ['name', 'product_name']) || '').trim() || `Row ${rowNumber}`;

        try {
          const payload = mapRowToProduct(row);
          await ProductService.createProduct(payload);
          importResults.push({ row: rowNumber, name: rowName, status: 'success', message: 'Imported successfully' });
          successCount += 1;
        } catch (error) {
          if ((error as any).isDuplicate) {
            importResults.push({ row: rowNumber, name: rowName, status: 'skipped', message: 'Already exists — skipped' });
            skippedCount += 1;
          } else {
            importResults.push({
              row: rowNumber,
              name: rowName,
              status: 'failed',
              message: error instanceof Error ? error.message : 'Import failed',
            });
          }
        }
      }

      const failedCount = importResults.filter((r) => r.status === 'failed').length;
      setResults(importResults);
      setSummary({ total: importResults.length, success: successCount, failed: failedCount, skipped: skippedCount });

      if (successCount > 0 || skippedCount > 0) {
        toast({
          title: 'Bulk import completed',
          description: [
            successCount > 0 && `${successCount} imported`,
            skippedCount > 0 && `${skippedCount} skipped (already exist)`,
            failedCount > 0 && `${failedCount} failed`,
          ].filter(Boolean).join(', ') + '.',
        });
        if (successCount > 0) onSuccess?.();
      } else {
        toast({
          title: 'Import failed',
          description: 'No products were imported. Check errors and try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unable to read file',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Products</DialogTitle>
          <DialogDescription>
            Upload products using CSV or Excel file. Download example format before import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-900">Download Example Format</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={downloadTemplateCsv} className="gap-2">
                <FileText className="w-4 h-4" />
                CSV Template
              </Button>
              <Button type="button" variant="outline" onClick={downloadTemplateExcel} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Excel Template
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Template headers include <span className="font-medium">(required)</span> or <span className="font-medium">(optional)</span>. You can upload with only required fields filled.
            </p>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Required fields:</p>
              <div className="flex flex-wrap gap-2">
                {FIELD_META.filter((f) => f.required).map((f) => (
                  <Badge key={f.key} variant="outline" className="text-xs">
                    {f.key}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">All other fields are optional and can be left blank.</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-900">Upload File</p>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={importing}
            />
            {file && (
              <p className="text-xs text-gray-600">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
            )}
            <Button
              type="button"
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-primary-600 hover:bg-primary-700 text-white gap-2"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'Importing...' : 'Start Import'}
            </Button>
          </div>

          {hasResults && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Total: {summary.total}</Badge>
                <Badge className="bg-green-100 text-green-700 border border-green-300">✓ Imported: {summary.success}</Badge>
                {summary.skipped > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300">⟳ Skipped (duplicate): {summary.skipped}</Badge>
                )}
                {summary.failed > 0 && (
                  <Badge className="bg-red-100 text-red-700 border border-red-300">✕ Failed: {summary.failed}</Badge>
                )}
              </div>

              {skippedResults.length > 0 && (
                <div className="text-xs rounded-md border border-yellow-200 bg-yellow-50 p-2 text-yellow-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  {skippedResults.length} product(s) already exist and were skipped. The rest were imported successfully.
                </div>
              )}

              {failedResults.length > 0 && (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {failedResults.map((result) => (
                    <div key={`${result.row}-${result.name}`} className="text-xs rounded-md border border-red-200 bg-red-50 p-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-700">Row {result.row} - {result.name}</p>
                          <p className="text-red-600">{result.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {summary.success > 0 && (
                <div className="text-xs rounded-md border border-green-200 bg-green-50 p-2 text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Imported {summary.success} product(s) successfully.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

