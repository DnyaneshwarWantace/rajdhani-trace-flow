import type { Supplier } from '@/services/supplierService';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye } from 'lucide-react';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface SupplierTableProps {
  suppliers: Supplier[];
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  canDelete: boolean;
}

export default function SupplierTable({
  suppliers,
  onView,
  onEdit,
  onDelete,
  canDelete,
}: SupplierTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[13%]">
                Contact Person
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                City
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                GST Number
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {suppliers.map((supplier) => (
              <tr
                key={supplier.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onView(supplier)}
              >
                <td className="px-4 py-4">
                  <div className="line-clamp-2 text-sm font-medium text-gray-900" title={supplier.name}>
                    {supplier.name}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <TruncatedText text={supplier.contact_person || '-'} className="text-sm text-gray-900" />
                </td>
                <td className="px-4 py-4">
                  <TruncatedText text={supplier.phone || '-'} className="text-sm text-gray-900" />
                </td>
                <td className="px-4 py-4">
                  <TruncatedText text={supplier.email || '-'} className="text-sm text-gray-500" />
                </td>
                <td className="px-4 py-4">
                  <TruncatedText text={supplier.city || '-'} className="text-sm text-gray-500" />
                </td>
                <td className="px-4 py-4">
                  <TruncatedText text={supplier.gst_number || '-'} className="text-sm text-gray-500 font-mono" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(supplier)}
                      className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(supplier)}
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(supplier)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {suppliers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No suppliers found
        </div>
      )}
    </div>
  );
}
