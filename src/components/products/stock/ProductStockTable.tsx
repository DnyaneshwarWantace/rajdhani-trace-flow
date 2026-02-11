import { QrCode, Hash, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { IndividualProduct, Product } from '@/types/product';

interface ProductStockTableProps {
  products: IndividualProduct[];
  product: Product;
  onView: (product: IndividualProduct) => void;
  onEdit: (product: IndividualProduct) => void;
  onQRCodeClick: (product: IndividualProduct) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAllOnPage?: () => void;
  onSelectAll?: () => void;
  allSelected?: boolean;
}

export default function ProductStockTable({
  products,
  product,
  onView,
  onEdit,
  onQRCodeClick,
  selectedIds,
  onToggleSelect,
  onSelectAllOnPage,
  onSelectAll,
  allSelected = false,
}: ProductStockTableProps) {
  const allSelectedOnPage = products.length > 0 && products.every((p) => selectedIds?.has(p.id));
  const headerSelectAll = onSelectAll ?? onSelectAllOnPage;
  const headerChecked = onSelectAll ? allSelected : allSelectedOnPage;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'sold':
        return 'secondary';
      case 'damaged':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {onToggleSelect && headerSelectAll && (
              <th className="w-10 p-3">
                <Checkbox
                  checked={headerChecked}
                  onCheckedChange={() => headerSelectAll()}
                  aria-label={onSelectAll ? 'Select all' : 'Select all on page'}
                />
              </th>
            )}
            <th className="text-left p-3 font-medium text-gray-600">ID</th>
            <th className="text-left p-3 font-medium text-gray-600">QR Code</th>
            <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">
              Production Date
            </th>
            <th className="text-left p-3 font-medium text-gray-600">Final Length</th>
            <th className="text-left p-3 font-medium text-gray-600">Final Width</th>
            <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Inspector</th>
            <th className="text-left p-3 font-medium text-gray-600">Status</th>
            <th className="text-right p-3 font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((item) => (
            <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
              {onToggleSelect && (
                <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds?.has(item.id) ?? false}
                    onCheckedChange={() => onToggleSelect(item.id)}
                    aria-label={`Select ${item.qr_code || item.id}`}
                  />
                </td>
              )}
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="font-mono text-sm">{item.id}</span>
                </div>
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  {item.qr_code ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQRCodeClick(item)}
                        title={`View QR Code: ${item.qr_code}`}
                        className="h-8 w-8 p-0"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                      <span className="font-mono text-xs text-gray-600 max-w-[100px] truncate" title={item.qr_code}>
                        {item.qr_code}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400 text-sm">No QR Code</span>
                  )}
                </div>
              </td>
              <td className="p-3 text-sm hidden md:table-cell">
                {item.production_date && item.production_date !== 'null'
                  ? new Date(item.production_date).toLocaleDateString()
                  : item.completion_date && item.completion_date !== 'null'
                  ? new Date(item.completion_date).toLocaleDateString()
                  : 'N/A'}
              </td>
              <td className="p-3 text-sm">
                {item.final_length
                  ? item.final_length.includes(' ')
                    ? item.final_length
                    : `${item.final_length} ${product.length_unit || 'feet'}`
                  : 'N/A'}
              </td>
              <td className="p-3 text-sm">
                {item.final_width
                  ? item.final_width.includes(' ')
                    ? item.final_width
                    : `${item.final_width} ${product.width_unit || 'feet'}`
                  : 'N/A'}
              </td>
              <td className="p-3 text-sm hidden lg:table-cell">{item.inspector || 'N/A'}</td>
              <td className="p-3">
                {item.status === 'available' ? (
                  <Badge variant="outline" className="bg-blue-600 text-white border-blue-600">
                    {item.status}
                  </Badge>
                ) : (
                  <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                )}
              </td>
              <td className="p-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onView(item)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

