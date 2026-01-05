import type { Customer } from '@/services/customerService';
import { Button } from '@/components/ui/button';
import { Edit, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  canDelete: boolean;
}

export default function CustomerTable({
  customers,
  onView,
  onEdit,
  onDelete,
  canDelete,
}: CustomerTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                Type
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                Total Orders
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                Revenue
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[13%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onView(customer)}
              >
                <td className="px-4 py-4">
                  <div className="line-clamp-2 text-sm font-medium text-gray-900 uppercase" title={customer.name}>
                    {customer.name}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    customer.customer_type === 'business'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {customer.customer_type === 'business' ? 'Business' : 'Individual'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <TruncatedText text={customer.phone} className="text-sm text-gray-900" />
                </td>
                <td className="px-4 py-4">
                  <TruncatedText text={customer.email || '-'} className="text-sm text-gray-500" />
                </td>
                <td className="px-4 py-4">
                  <TruncatedText text={customer.city || '-'} className="text-sm text-gray-500" />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {customer.total_orders || 0}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(parseFloat(customer.total_value || '0'))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(customer)}
                      className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(customer)}
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {customers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No customers found
        </div>
      )}
    </div>
  );
}
