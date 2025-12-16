import type { Product } from '@/types/product';
import { formatStockRolls } from '@/utils/stockFormatter';
import { calculateStockStatus } from '@/utils/stockStatus';
import { formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import { QrCode, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onView: (product: Product) => void;
  onStock: (product: Product) => void;
  onProduction: (product: Product) => void;
  onQRCode?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  canDelete?: boolean;
}

export default function ProductTable({ products, onEdit, onDuplicate, onView, onStock, onProduction, onQRCode, onDelete, canDelete = false }: ProductTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock':
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'low-stock':
        return 'bg-orange-100 text-orange-700';
      case 'out-of-stock':
        return 'bg-red-100 text-red-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'discontinued':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-500">Get started by creating your first product.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category / Details</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1 max-w-[200px]">
                      <TruncatedText
                        text={product.name}
                        maxLength={25}
                        className="font-medium text-gray-900"
                        as="p"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500 truncate">{product.id}</p>
                        {product.has_recipe && (
                          <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Recipe
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {product.qr_code ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQRCode && onQRCode(product)}
                        className="h-8 w-8 p-0"
                        title={`QR Code: ${product.qr_code}`}
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                    ) : (
                      <span className="text-gray-400 text-sm">No QR Code</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="min-w-0 max-w-[180px] space-y-0.5">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1 break-words">
                      {product.category}
                    </p>
                    {product.subcategory && (
                      <p className="text-xs text-gray-500 line-clamp-1 break-words">
                        {product.subcategory}
                      </p>
                    )}
                    {/* Color - only if present and not N/A */}
                    {product.color &&
                      product.color.trim() !== '' &&
                      product.color.toLowerCase() !== 'n/a' && (
                        <p className="text-xs text-gray-500 line-clamp-1 break-words">
                          Color: {product.color}
                        </p>
                      )}
                    {/* Pattern - only if present and not N/A */}
                    {product.pattern &&
                      product.pattern.trim() !== '' &&
                      product.pattern.toLowerCase() !== 'n/a' && (
                        <p className="text-xs text-gray-500 line-clamp-1 break-words">
                          Pattern: {product.pattern}
                        </p>
                      )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900">
                      {product.dimensions_display || `${product.length}${product.length_unit} × ${product.width}${product.width_unit}`}
                    </p>
                    {product.sqm && (
                      <p className="text-xs text-gray-500">
                        SQM: {formatIndianNumberWithDecimals(product.sqm, 2)}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatStockRolls(product.current_stock)}
                    </p>
                    {product.individual_stock_tracking && (
                      <p className="text-xs text-gray-500">
                        {product.individual_products_count} items
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {(() => {
                    const calculatedStatus = calculateStockStatus(product);
                    return (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(calculatedStatus)}`}>
                        {calculatedStatus}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onView(product)}
                      className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onEdit(product)}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDuplicate(product)}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onStock(product)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Stock"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onProduction(product)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Set to Production"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </button>
                    {canDelete && onDelete && (
                      <button
                        onClick={() => onDelete(product)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
