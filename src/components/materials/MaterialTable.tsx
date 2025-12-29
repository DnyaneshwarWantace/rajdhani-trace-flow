import type { RawMaterial } from '@/types/material';
import { formatCurrency, formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import { Eye, ShoppingCart, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface MaterialTableProps {
  materials: RawMaterial[];
  onView?: (material: RawMaterial) => void;
  onEdit?: (material: RawMaterial) => void;
  onDelete?: (material: RawMaterial) => void;
  onOrder?: (material: RawMaterial) => void;
}

export default function MaterialTable({
  materials,
  onView,
  onEdit,
  onDelete,
  onOrder,
}: MaterialTableProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock':
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'low-stock':
        return 'bg-orange-100 text-orange-700';
      case 'out-of-stock':
      case 'discontinued':
        return 'bg-red-100 text-red-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {materials.map((material) => (
              <tr key={material._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {material.image_url ? (
                      <img
                        src={material.image_url}
                        alt={material.name}
                        loading="lazy"
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate" title={material.name}>
                        {material.name.split(' ').slice(0, 4).join(' ')}
                        {material.name.split(' ').length > 4 && '...'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{material.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="min-w-0 max-w-xs">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 break-words">{material.category}</p>
                    {material.type && (
                      <p className="text-xs text-gray-500 line-clamp-1">{material.type}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatIndianNumberWithDecimals(Number(material.available_stock ?? material.current_stock ?? 0), 2)} {material.unit}
                    </p>
                    <p className="text-xs text-gray-500">Min: {formatIndianNumberWithDecimals(Number(material.min_threshold || 0), 2)}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm text-gray-900">
                    {formatCurrency(material.cost_per_unit || 0)}/{material.unit}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm text-gray-900 break-words min-w-0">
                    {material.supplier_name ? (
                      <TruncatedText text={material.supplier_name} maxLength={20} as="span" />
                    ) : (
                      'N/A'
                    )}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(material.status)}`}>
                    {material.status.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <button
                        onClick={() => onView(material)}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(material)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Material"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && isAdmin && (
                      <button
                        onClick={() => onDelete(material)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {onOrder && (
                      <button
                        onClick={() => onOrder(material)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Order/Restock"
                      >
                        <ShoppingCart className="w-4 h-4" />
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

