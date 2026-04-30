import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Product } from '@/types/product';
import { ArrowLeft, FileDown, FileSpreadsheet, QrCode, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ProductStockHeaderProps {
  product: Product;
  productId: string;
  onExportCSV?: () => void;
  onExportExcel?: () => void;
  onDownloadQrPdf?: () => void;
  onDownloadAllQrPdf?: () => void;
  onClearSelection?: () => void;
  downloadingQrPdf?: boolean;
  individualProductCount?: number;
  selectedCount?: number;
}

export default function ProductStockHeader({
  product,
  productId,
  onExportCSV,
  onExportExcel,
  onDownloadQrPdf,
  onDownloadAllQrPdf,
  onClearSelection,
  downloadingQrPdf = false,
  individualProductCount = 0,
  selectedCount = 0,
}: ProductStockHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [downloadQROpen, setDownloadQROpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportTriggerRef = useRef<HTMLDivElement>(null);
  const downloadQRTriggerRef = useRef<HTMLDivElement>(null);
  const [exportTriggerWidth, setExportTriggerWidth] = useState<number | null>(null);
  const [downloadQRTriggerWidth, setDownloadQRTriggerWidth] = useState<number | null>(null);

  useEffect(() => {
    const measure = () => {
      if (exportTriggerRef.current) setExportTriggerWidth(exportTriggerRef.current.offsetWidth);
      if (downloadQRTriggerRef.current) setDownloadQRTriggerWidth(downloadQRTriggerRef.current.offsetWidth);
    };
    if (exportOpen || downloadQROpen) {
      measure();
      const ro = new ResizeObserver(measure);
      if (exportTriggerRef.current) ro.observe(exportTriggerRef.current);
      if (downloadQRTriggerRef.current) ro.observe(downloadQRTriggerRef.current);
      return () => ro.disconnect();
    }
  }, [exportOpen, downloadQROpen]);

  const handleBack = () => {
    const fromPage = location.state?.from;
    if (fromPage === 'product-detail') {
      navigate(`/products/${productId}`, { state: { from: 'stock-page' } });
    } else {
      navigate('/products');
    }
  };

  const handleDownloadAll = () => {
    onDownloadAllQrPdf?.();
    setDownloadQROpen(false);
  };

  const handleDownloadSelected = () => {
    onDownloadQrPdf?.();
    setDownloadQROpen(false);
  };

  const handleClearSelection = () => {
    onClearSelection?.();
    setDownloadQROpen(false);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Individual Stock</h1>
            <div className="mt-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 break-words line-clamp-2">
                {product.name}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {(onExportCSV || onExportExcel) && (
            <Popover open={exportOpen} onOpenChange={setExportOpen}>
              <PopoverTrigger asChild>
                <div ref={exportTriggerRef} className="inline-flex flex-1 sm:flex-initial">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 w-full"
                  >
                    <FileDown className="w-4 h-4" />
                    <span className="hidden sm:inline">Export details</span>
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="p-2"
                align="end"
                style={exportTriggerWidth != null ? { width: exportTriggerWidth } : undefined}
              >
                <div className="flex flex-col gap-0.5">
                  {onExportCSV && (
                    <button
                      type="button"
                      onClick={() => { onExportCSV(); setExportOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4" />
                      Export as CSV
                    </button>
                  )}
                  {onExportExcel && (
                    <button
                      type="button"
                      onClick={() => { onExportExcel(); setExportOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export as Excel
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {(onDownloadQrPdf || onDownloadAllQrPdf) && (
            <Popover open={downloadQROpen} onOpenChange={setDownloadQROpen}>
              <PopoverTrigger asChild>
                <div ref={downloadQRTriggerRef} className="inline-flex flex-1 sm:flex-initial">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={downloadingQrPdf || individualProductCount === 0}
                    className="gap-2 w-full"
                  >
                    {downloadingQrPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Download QR</span>
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="p-2"
                align="end"
                style={downloadQRTriggerWidth != null ? { width: downloadQRTriggerWidth } : undefined}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={handleDownloadSelected}
                    disabled={downloadingQrPdf || selectedCount === 0}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4 text-red-500" />
                    PDF
                  </button>
                  {onDownloadAllQrPdf && (
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={downloadingQrPdf || individualProductCount === 0}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4 text-red-500" />
                      All
                    </button>
                  )}
                  {onClearSelection && selectedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-gray-600"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/products/${productId}`, { state: { from: 'stock-page' } })}
            className="flex-1 sm:flex-initial"
          >
            View Product Details
          </Button>
        </div>
      </div>
    </div>
  );
}

