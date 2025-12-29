import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RawMaterial } from '@/types/material';

interface ExportMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: RawMaterial[];
}

export default function ExportMaterialsDialog({
  open,
  onOpenChange,
  materials,
}: ExportMaterialsDialogProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<'csv' | 'excel' | null>(null);

  const exportToCSV = () => {
    if (materials.length === 0) {
      toast({
        title: 'No Data',
        description: 'No materials to export',
        variant: 'destructive',
      });
      return;
    }

    setExporting('csv');
    try {
      // Define CSV headers - only basic material creation fields
      const headers = [
        'Name',
        'Supplier',
        'Category',
        'Unit',
        'Current Stock',
        'Min Threshold',
        'Max Capacity',
        'Reorder Point',
        'Cost Per Unit',
        'Type',
        'Color',
      ];

      // Convert materials to CSV rows
      const rows = materials.map((material) => {
        return [
          material.name || '',
          material.supplier_name || '',
          material.category || '',
          material.unit || '',
          (material.current_stock || 0).toString(),
          (material.min_threshold || 0).toString(),
          (material.max_capacity || 0).toString(),
          (material.reorder_point || 0).toString(),
          (material.cost_per_unit || 0).toString(),
          material.type || '',
          material.color || '',
        ];
      });

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          // Escape commas and quotes in cell values
          const cellValue = String(cell || '');
          if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
            return `"${cellValue.replace(/"/g, '""')}"`;
          }
          return cellValue;
        }).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `materials_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `Exported ${materials.length} materials to CSV`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export materials to CSV',
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  };

  const exportToExcel = async () => {
    if (materials.length === 0) {
      toast({
        title: 'No Data',
        description: 'No materials to export',
        variant: 'destructive',
      });
      return;
    }

    setExporting('excel');
    try {
      // Dynamic import of xlsx library - using string literal to avoid build-time resolution
      let XLSX: any;
      try {
        // Use dynamic import with string to avoid Vite build-time resolution
        const xlsxModule = await import(/* @vite-ignore */ 'xlsx');
        XLSX = xlsxModule.default || xlsxModule;
      } catch (importError: any) {
        console.error('Failed to import xlsx:', importError);
        toast({
          title: 'Excel Export Unavailable',
          description: 'Please install xlsx library: npm install xlsx. CSV export is still available.',
          variant: 'destructive',
        });
        setExporting(null);
        return;
      }

      if (!XLSX) {
        toast({
          title: 'Excel Export Unavailable',
          description: 'xlsx library not found. Please install: npm install xlsx',
          variant: 'destructive',
        });
        setExporting(null);
        return;
      }

      // Prepare data for Excel - only basic material creation fields
      const excelData = materials.map((material) => {
        return {
          'Name': material.name || '',
          'Supplier': material.supplier_name || '',
          'Category': material.category || '',
          'Unit': material.unit || '',
          'Current Stock': material.current_stock || 0,
          'Min Threshold': material.min_threshold || 0,
          'Max Capacity': material.max_capacity || 0,
          'Reorder Point': material.reorder_point || 0,
          'Cost Per Unit': material.cost_per_unit || 0,
          'Type': material.type || '',
          'Color': material.color || '',
        };
      });

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Materials');

      // Set column widths
      const columnWidths = [
        { wch: 30 }, // Name
        { wch: 20 }, // Supplier
        { wch: 20 }, // Category
        { wch: 10 }, // Unit
        { wch: 15 }, // Current Stock
        { wch: 15 }, // Min Threshold
        { wch: 15 }, // Max Capacity
        { wch: 15 }, // Reorder Point
        { wch: 15 }, // Cost Per Unit
        { wch: 15 }, // Type
        { wch: 15 }, // Color
      ];
      worksheet['!cols'] = columnWidths;

      // Write file
      XLSX.writeFile(workbook, `materials_export_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: 'Export Successful',
        description: `Exported ${materials.length} materials to Excel`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export materials to Excel. Please ensure xlsx library is installed.',
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Materials
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Export {materials.length} material(s) to your preferred format.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={exportToCSV}
              disabled={exporting !== null || materials.length === 0}
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              {exporting === 'csv' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              <span>Export as CSV</span>
            </Button>

            <Button
              onClick={exportToExcel}
              disabled={exporting !== null || materials.length === 0}
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              {exporting === 'excel' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
              <span>Export as Excel</span>
            </Button>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 mb-1">Exported Fields:</p>
            <p className="text-xs text-blue-800 mb-1">
              <strong>Required:</strong> Name, Supplier, Category, Unit, Cost Per Unit
            </p>
            <p className="text-xs text-blue-800">
              <strong>Optional:</strong> Type, Current Stock, Min Threshold, Max Capacity, Reorder Point, Color
            </p>
            <p className="text-xs text-blue-700 mt-2 italic">
              Note: Optional fields can be skipped in import - defaults will be used (same as form).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting !== null}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

