import type { RawMaterial } from '@/types/material';
import { formatCurrency, formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import { ShoppingCart, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface MaterialCardProps {
  material: RawMaterial;
  onView?: (material: RawMaterial) => void;
  onEdit?: (material: RawMaterial) => void;
  onDelete?: (material: RawMaterial) => void;
  onOrder?: (material: RawMaterial) => void;
  showActions?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function MaterialCard({
  material,
  onView,
  onEdit,
  onDelete,
  onOrder,
  showActions = true,
  isSelected = false,
  onClick,
}: MaterialCardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock':
      case 'active':
        return 'bg-green-500';
      case 'low-stock':
        return 'bg-orange-500';
      case 'out-of-stock':
        return 'bg-red-500';
      case 'inactive':
        return 'bg-gray-400';
      case 'discontinued':
        return 'bg-red-500';
      case 'overstock':
        return 'bg-blue-500';
      case 'in-transit':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border transition-all duration-200 overflow-hidden group hover:shadow-lg ${
        isSelected
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-300 shadow-lg'
          : 'border-gray-200'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Image Section */}
      {material.image_url ? (
        <div className="w-full h-48 bg-gray-100 overflow-hidden">
          <img
            src={material.image_url}
            alt={material.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg
              className="w-16 h-16 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs">No Image</p>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Header Section */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-1 text-gray-900">
            <TruncatedText text={material.name} maxLength={60} as="span" />
          </h3>
          <p className="text-sm text-gray-500 mb-2">{material.type || material.category}</p>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(material.status)}`} />
            <span className="text-xs text-gray-600 capitalize">
              {material.status.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Stock:</span>
            <span className="font-medium text-gray-900">
              {formatIndianNumberWithDecimals(Number(material.current_stock || 0), 2)} {material.unit}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Category:</span>
            <span className="text-gray-900">{material.category}</span>
          </div>
          {material.supplier_name && (
            <div className="flex justify-between">
              <span className="text-gray-600">Supplier:</span>
              <span className="text-gray-900 max-w-[60%]">
                <TruncatedText text={material.supplier_name} maxLength={25} />
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Cost/Unit:</span>
            <span className="text-gray-900">
              {formatCurrency(material.cost_per_unit || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Reorder Point:</span>
            <span className="text-gray-900">
              {formatIndianNumberWithDecimals(Number(material.reorder_point || 0), 2)} {material.unit}
            </span>
          </div>
          {material.min_threshold && (
            <div className="flex justify-between">
              <span className="text-gray-600">Min Threshold:</span>
              <span className="text-gray-900">
                {formatIndianNumberWithDecimals(Number(material.min_threshold || 0), 2)} {material.unit}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(material);
                }}
                className="flex-1 text-xs py-1.5 h-auto"
              >
                Details
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(material);
                }}
                className="flex-1 text-xs py-1.5 h-auto"
              >
                <Edit className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(material);
                }}
                className="flex-1 text-xs py-1.5 h-auto text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete
              </Button>
            )}
            {onOrder && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOrder(material);
                }}
                className="flex-1 text-xs py-1.5 h-auto"
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                Order
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


