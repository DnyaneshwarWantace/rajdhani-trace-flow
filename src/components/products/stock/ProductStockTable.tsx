import { QrCode, Hash, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { IndividualProduct, Product } from '@/types/product';

interface ProductStockTableProps {
  products: IndividualProduct[];
  product: Product;
  onView: (product: IndividualProduct) => void;
  onEdit: (product: IndividualProduct) => void;
  onQRCodeClick: (product: IndividualProduct) => void;
}

export default function ProductStockTable({
  products,
  product,
  onView,
  onEdit,
  onQRCodeClick,
}: ProductStockTableProps) {
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

  const getQualityVariant = (grade: string) => {
    return grade === 'A+' ? 'default' : 'secondary';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-medium text-gray-600">ID</th>
            <th className="text-left p-3 font-medium text-gray-600">QR Code</th>
            <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">
              Production Date
            </th>
            <th className="text-left p-3 font-medium text-gray-600">Final Length</th>
            <th className="text-left p-3 font-medium text-gray-600">Final Width</th>
            <th className="text-left p-3 font-medium text-gray-600">Quality Grade</th>
            <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Inspector</th>
            <th className="text-left p-3 font-medium text-gray-600">Status</th>
            <th className="text-left p-3 font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((item) => (
            <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
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
              <td className="p-3">
                <Badge variant={getQualityVariant(item.quality_grade || 'N/A')}>
                  {item.quality_grade || 'N/A'}
                </Badge>
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
              <td className="p-3">
                <div className="flex gap-2">
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

