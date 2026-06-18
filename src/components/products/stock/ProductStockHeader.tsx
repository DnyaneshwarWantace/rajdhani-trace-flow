import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '@/types/product';
import { ArrowLeft, FileDown, FileSpreadsheet, FileText, QrCode, Loader2, ExternalLink, X } from 'lucide-react';
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

export default function ProductStockHeader({
  product,
  productId,
  onExportCSV,
  onExportExcel,
  onDownloadAllQrPdf,
  onDownloadQrPdf,
  onClearSelection,
  downloadingQrPdf = false,
  individualProductCount = 0,
  selectedCount = 0,
}: ProductStockHeaderProps) {
  const navigate = useNavigate();
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [showQRSheet, setShowQRSheet] = useState(false);

  return (
    <>
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 pt-4 pb-3">
        {/* Top row: back + icon actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>

          {/* Right icon buttons */}
          <div className="flex items-center gap-2">
            {/* Export */}
            {(onExportCSV || onExportExcel) && (
              <button
                onClick={() => setShowExportSheet(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white"
              >
                <FileDown className="w-4 h-4 text-gray-600" />
              </button>
            )}

            {/* QR */}
            {(onDownloadQrPdf || onDownloadAllQrPdf) && (
              <button
                disabled={downloadingQrPdf || individualProductCount === 0}
                onClick={() => setShowQRSheet(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white disabled:opacity-40"
              >
                {downloadingQrPdf
                  ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  : <QrCode className="w-4 h-4 text-gray-600" />
                }
              </button>
            )}

            {/* View product details */}
            <button
              onClick={() => navigate(`/products/${productId}`)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white"
            >
              <ExternalLink className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Product info below */}
        <div className="mt-3">
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Individual Stock</h1>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{product.name}</p>
          <ProductAttributePreview
            color={product.color}
            pattern={product.pattern}
            length={product.length}
            width={product.width}
            lengthUnit={product.length_unit}
            widthUnit={product.width_unit}
            size="large"
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Export bottom sheet */}
      {showExportSheet && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowExportSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5 pb-9" style={{ zIndex: 51 }}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <p className="text-base font-bold text-gray-900">Export Stock</p>
                <p className="text-xs text-gray-400 mt-0.5">Export {individualProductCount} individual products</p>
              </div>
              <button onClick={() => setShowExportSheet(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="space-y-3">
              {onExportCSV && (
                <button
                  onClick={() => { onExportCSV(); setShowExportSheet(false); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3.5 active:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Export as CSV</p>
                    <p className="text-xs text-gray-400">Plain text, works with any spreadsheet app</p>
                  </div>
                </button>
              )}
              {onExportExcel && (
                <button
                  onClick={() => { onExportExcel(); setShowExportSheet(false); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3.5 active:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Export as Excel</p>
                    <p className="text-xs text-gray-400">Formatted spreadsheet with headers</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* QR bottom sheet */}
      {showQRSheet && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowQRSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5 pb-9" style={{ zIndex: 51 }}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <p className="text-base font-bold text-gray-900">Download QR Codes</p>
                <p className="text-xs text-gray-400 mt-0.5">{individualProductCount} items with QR codes</p>
              </div>
              <button onClick={() => setShowQRSheet(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="space-y-3">
              {onDownloadQrPdf && selectedCount > 0 && (
                <button
                  disabled={downloadingQrPdf}
                  onClick={() => { onDownloadQrPdf(); setShowQRSheet(false); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 active:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-blue-900">Selected ({selectedCount}) as PDF</p>
                    <p className="text-xs text-blue-400">Download only selected items</p>
                  </div>
                </button>
              )}
              {onDownloadAllQrPdf && (
                <button
                  disabled={downloadingQrPdf || individualProductCount === 0}
                  onClick={() => { onDownloadAllQrPdf(); setShowQRSheet(false); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3.5 active:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">All ({individualProductCount}) as PDF</p>
                    <p className="text-xs text-gray-400">Download all QR codes in one PDF</p>
                  </div>
                </button>
              )}
              {onClearSelection && selectedCount > 0 && (
                <button
                  onClick={() => { onClearSelection(); setShowQRSheet(false); }}
                  className="w-full text-center py-2.5 text-sm text-gray-400 font-medium"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
