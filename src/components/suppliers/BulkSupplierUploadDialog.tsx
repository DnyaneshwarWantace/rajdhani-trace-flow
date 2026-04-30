import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, FileText, Loader2, Upload } from 'lucide-react';
import { SupplierService, type CreateSupplierData } from '@/services/supplierService';
import { useToast } from '@/hooks/use-toast';

interface BulkSupplierUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ImportResult = {
  row: number;
  name: string;
  status: 'success' | 'failed';
  message: string;
};

const FIELD_META: Array<{ key: string; required: boolean }> = [
  { key: 'name', required: true },
  { key: 'phone', required: true },
  { key: 'contact_person', required: false },
  { key: 'email', required: false },
  { key: 'address', required: false },
  { key: 'city', required: false },
  { key: 'state', required: false },
  { key: 'pincode', required: false },
  { key: 'gst_number', required: false },
];

const TEMPLATE_HEADERS = FIELD_META.map((f) => `${f.key} (${f.required ? 'required' : 'optional'})`);
const TEMPLATE_EXAMPLE: Record<string, string> = {
  name: 'Goodvalue Chemicals Pvt Ltd',
  phone: '+919900001111',
  contact_person: 'Rahul Sharma',
  email: 'sales@goodvalue.com',
  address: 'Plot 42, Industrial Area',
  city: 'Surat',
  state: 'Gujarat',
  pincode: '395003',
  gst_number: '24ABCDE1234F1Z9',
};

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

function getValue(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

function mapRowToSupplier(row: Record<string, unknown>): CreateSupplierData {
  const name = getValue(row, ['name', 'supplier_name']);
  const phone = getValue(row, ['phone', 'phone_number', 'mobile']);
  if (!name || !phone) {
    throw new Error('Missing required fields. Required: name, phone');
  }
  return {
    name,
    phone,
    contact_person: getValue(row, ['contact_person']) || undefined,
    email: getValue(row, ['email']) || undefined,
    address: getValue(row, ['address']) || undefined,
    city: getValue(row, ['city']) || undefined,
    state: getValue(row, ['state']) || undefined,
    pincode: getValue(row, ['pincode']) || undefined,
    gst_number: getValue(row, ['gst_number']) || undefined,
  };
}

export default function BulkSupplierUploadDialog({ open, onOpenChange, onSuccess }: BulkSupplierUploadDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState({ total: 0, success: 0, failed: 0 });
  const failedResults = useMemo(() => results.filter((r) => r.status === 'failed'), [results]);

  const resetState = () => {
    setFile(null);
    setImporting(false);
    setResults([]);
    setSummary({ total: 0, success: 0, failed: 0 });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetState();
  };

  const downloadTemplateCsv = () => {
    const row = FIELD_META.map((f) => `"${(TEMPLATE_EXAMPLE[f.key] || '').replace(/"/g, '""')}"`).join(',');
    const csv = `${TEMPLATE_HEADERS.join(',')}\n${row}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'suppliers_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const downloadTemplateExcel = () => {
    const exampleRow: Record<string, string> = {};
    FIELD_META.forEach((f) => {
      exampleRow[`${f.key} (${f.required ? 'required' : 'optional'})`] = TEMPLATE_EXAMPLE[f.key] || '';
    });
    const worksheet = XLSX.utils.json_to_sheet([exampleRow], { header: TEMPLATE_HEADERS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers Template');
    XLSX.writeFile(workbook, 'suppliers_import_template.xlsx');
  };

  const parseRows = async (inputFile: File): Promise<Record<string, unknown>[]> => {
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
      toast({ title: 'File required', description: 'Please select a CSV or Excel file first.', variant: 'destructive' });
      return;
    }
    setImporting(true);
    setResults([]);

    try {
      const rows = await parseRows(file);
      if (!rows.length) throw new Error('File is empty. Add at least one supplier row.');

      const importResults: ImportResult[] = [];
      let successCount = 0;
      for (let index = 0; index < rows.length; index += 1) {
        const rowNumber = index + 2;
        const row = rows[index];
        const rowName = getValue(row, ['name', 'supplier_name']) || `Row ${rowNumber}`;
        try {
          const payload = mapRowToSupplier(row);
          const { error } = await SupplierService.createSupplier(payload);
          if (error) throw new Error(error);
          importResults.push({ row: rowNumber, name: rowName, status: 'success', message: 'Imported successfully' });
          successCount += 1;
        } catch (error) {
          importResults.push({
            row: rowNumber,
            name: rowName,
            status: 'failed',
            message: error instanceof Error ? error.message : 'Import failed',
          });
        }
      }

      const failedCount = importResults.filter((r) => r.status === 'failed').length;
      setResults(importResults);
      setSummary({ total: importResults.length, success: successCount, failed: failedCount });

      if (successCount > 0) {
        toast({ title: 'Bulk import completed', description: `${successCount} suppliers imported, ${failedCount} failed.` });
        onSuccess?.();
      } else {
        toast({ title: 'Import failed', description: 'No suppliers were imported.', variant: 'destructive' });
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
          <DialogTitle>Bulk Upload Suppliers</DialogTitle>
          <DialogDescription>Upload suppliers using CSV or Excel. Download sample format before import.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-900">Download Sample Format</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={downloadTemplateCsv} className="gap-2">
                <FileText className="w-4 h-4" />
                CSV Sample
              </Button>
              <Button type="button" variant="outline" onClick={downloadTemplateExcel} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Excel Sample
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Template headers clearly include <span className="font-medium">(required)</span> and{' '}
              <span className="font-medium">(optional)</span>.
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
              <p className="text-xs font-medium text-gray-700 mt-3 mb-2">Optional fields:</p>
              <div className="flex flex-wrap gap-2">
                {FIELD_META.filter((f) => !f.required).map((f) => (
                  <Badge key={f.key} variant="outline" className="text-xs">
                    {f.key}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-900">Upload File</p>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={importing} />
            <p className="text-xs text-gray-500">
              Import runs row by row. If any row is invalid or missing required data, only that row fails. Other valid rows are still added.
            </p>
            <Button type="button" onClick={handleImport} disabled={!file || importing} className="bg-primary-600 hover:bg-primary-700 text-white gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'Importing...' : 'Start Import'}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Total: {summary.total}</Badge>
                <Badge className="bg-green-100 text-green-700 border border-green-300">Imported: {summary.success}</Badge>
                <Badge className="bg-red-100 text-red-700 border border-red-300">Failed: {summary.failed}</Badge>
              </div>
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
                  Imported {summary.success} supplier(s) successfully.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
