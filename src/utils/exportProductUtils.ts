import * as XLSX from 'xlsx';
import type { Product } from '@/types/product';

const EXPORT_DATE = new Date().toISOString().split('T')[0];

function escapeCsvCell(value: unknown): string {
  const cellValue = String(value ?? '');
  if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
    return `"${cellValue.replace(/"/g, '""')}"`;
  }
  return cellValue;
}

/** Build CSV string from products and trigger download */
export function exportProductsToCSV(products: Product[]): void {
  const headers = [
    'Name',
    'Category',
    'Subcategory',
    'Length',
    'Width',
    'Length Unit',
    'Width Unit',
    'Weight',
    'Weight Unit',
    'Color',
    'Pattern',
    'Unit',
    'Count Unit',
    'Current Stock',
    'Available Stock',
    'Min Stock',
    'Max Stock',
    'Reorder Point',
    'Individual Tracking',
    'Individual Count',
    'Status',
    'Notes',
    'Created',
    'Updated',
  ];

  const rows = products.map((p) => [
    escapeCsvCell(p.name),
    escapeCsvCell(p.category),
    escapeCsvCell(p.subcategory),
    escapeCsvCell(p.length),
    escapeCsvCell(p.width),
    escapeCsvCell(p.length_unit),
    escapeCsvCell(p.width_unit),
    escapeCsvCell(p.weight),
    escapeCsvCell(p.weight_unit),
    escapeCsvCell(p.color),
    escapeCsvCell(p.pattern),
    escapeCsvCell(p.unit),
    escapeCsvCell(p.count_unit),
    escapeCsvCell(p.current_stock ?? 0),
    escapeCsvCell(p.available_stock ?? ''),
    escapeCsvCell(p.min_stock_level ?? 0),
    escapeCsvCell(p.max_stock_level ?? 0),
    escapeCsvCell(p.reorder_point ?? 0),
    escapeCsvCell(p.individual_stock_tracking ? 'Yes' : 'No'),
    escapeCsvCell(p.individual_products_count ?? 0),
    escapeCsvCell(p.status),
    escapeCsvCell(p.notes),
    escapeCsvCell(p.created_at ?? ''),
    escapeCsvCell(p.updated_at ?? ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `products_export_${EXPORT_DATE}.csv`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/** Build Excel file from products and trigger download */
export function exportProductsToExcel(products: Product[]): void {
  const excelData = products.map((p) => ({
    'Name': p.name ?? '',
    'Category': p.category ?? '',
    'Subcategory': p.subcategory ?? '',
    'Length': p.length ?? '',
    'Width': p.width ?? '',
    'Length Unit': p.length_unit ?? '',
    'Width Unit': p.width_unit ?? '',
    'Weight': p.weight ?? '',
    'Weight Unit': p.weight_unit ?? '',
    'Color': p.color ?? '',
    'Pattern': p.pattern ?? '',
    'Unit': p.unit ?? '',
    'Count Unit': p.count_unit ?? '',
    'Current Stock': p.current_stock ?? 0,
    'Available Stock': p.available_stock ?? '',
    'Min Stock': p.min_stock_level ?? 0,
    'Max Stock': p.max_stock_level ?? 0,
    'Reorder Point': p.reorder_point ?? 0,
    'Individual Tracking': p.individual_stock_tracking ? 'Yes' : 'No',
    'Individual Count': p.individual_products_count ?? 0,
    'Status': p.status ?? '',
    'Notes': p.notes ?? '',
    'Created': p.created_at ?? '',
    'Updated': p.updated_at ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  worksheet['!cols'] = [
    { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
  ];
  XLSX.writeFile(workbook, `products_export_${EXPORT_DATE}.xlsx`);
}
