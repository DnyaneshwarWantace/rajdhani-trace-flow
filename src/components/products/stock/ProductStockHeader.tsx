import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '@/types/product';
import { ArrowLeft, FileDown, FileSpreadsheet, QrCode, Loader2, ChevronDown } from 'lucide-react';
import ProductAttributePreview from '@/components/ui/ProductAttributePreview';

export interface ProductStockHeaderProps {
  product: Product;
  productId: string;
  onExportCSV?: () => void;
  onExportExcel?: () => void;
  onDownloadAllQrPdf?: () => void;
  onDownloadSelectedQrPdf?: () => void;
  onDownloadQrPdf?: () => void;
  onClearSelection?: () => void;
  downloadingQrPdf?: boolean;
  individualProductCount?: number;
  selectedCount?: number;
}

function DropdownMenu({
  trigger,
  children,
  disabled,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 h-9 px-3.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        {trigger}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 min-w-[160px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div onClick={() => setOpen(false)}>
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ onClick, icon, label, disabled }: {
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
    >
      {icon}
      {label}
    </button>
  );
}

export default function ProductStockHeader({
  product,
  productId,
  onExportCSV,
  onExportExcel,
  onDownloadAllQrPdf,
  onDownloadSelectedQrPdf,
  onDownloadQrPdf,
  onClearSelection,
  downloadingQrPdf = false,
  individualProductCount = 0,
  selectedCount = 0,
}: ProductStockHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Individual Stock</h1>
            <p className="text-xs text-gray-500 truncate mt-0.5">{product.name}</p>
            <ProductAttributePreview
              color={product.color}
              pattern={product.pattern}
              length={product.length}
              width={product.width}
              lengthUnit={product.length_unit}
              widthUnit={product.width_unit}
              size="large"
              className="mt-1"
            />
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export dropdown */}
          {(onExportCSV || onExportExcel) && (
            <DropdownMenu
              trigger={
                <>
                  <FileDown className="w-4 h-4 text-gray-500" />
                  <span>Export</span>
                </>
              }
            >
              {onExportCSV && (
                <MenuItem
                  onClick={onExportCSV}
                  icon={<FileDown className="w-4 h-4 text-gray-400" />}
                  label="Export as CSV"
                />
              )}
              {onExportExcel && (
                <MenuItem
                  onClick={onExportExcel}
                  icon={<FileSpreadsheet className="w-4 h-4 text-gray-400" />}
                  label="Export as Excel"
                />
              )}
            </DropdownMenu>
          )}

          {/* QR dropdown */}
          {(onDownloadQrPdf || onDownloadAllQrPdf) && (
            <DropdownMenu
              disabled={downloadingQrPdf || individualProductCount === 0}
              trigger={
                downloadingQrPdf
                  ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating…</span></>
                  : <><QrCode className="w-4 h-4 text-gray-500" /><span>QR Codes</span></>
              }
            >
              {onDownloadQrPdf && (
                <MenuItem
                  onClick={onDownloadQrPdf}
                  icon={<FileDown className="w-4 h-4 text-red-400" />}
                  label={selectedCount > 0 ? `Selected (${selectedCount})` : 'Download PDF'}
                  disabled={downloadingQrPdf || individualProductCount === 0}
                />
              )}
              {onDownloadAllQrPdf && (
                <MenuItem
                  onClick={onDownloadAllQrPdf}
                  icon={<FileDown className="w-4 h-4 text-red-400" />}
                  label={`All (${individualProductCount})`}
                  disabled={downloadingQrPdf || individualProductCount === 0}
                />
              )}
              {onClearSelection && selectedCount > 0 && (
                <MenuItem
                  onClick={onClearSelection}
                  icon={<span className="w-4 h-4" />}
                  label="Clear selection"
                />
              )}
            </DropdownMenu>
          )}

          {/* View product */}
          <button
            type="button"
            onClick={() => navigate(`/products/${productId}`)}
            className="h-9 px-3.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
          >
            View Product Details
          </button>
        </div>
      </div>
    </div>
  );
}
