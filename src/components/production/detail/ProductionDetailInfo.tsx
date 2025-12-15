import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { Hash, Package, Calendar, User, Building2, Tag, Ruler, Weight } from 'lucide-react';
import { formatIndianDate, formatIndianDateTime } from '@/utils/formatHelpers';
import type { ProductionBatch } from '@/services/productionService';

interface ProductionDetailInfoProps {
  batch: ProductionBatch;
}

export default function ProductionDetailInfo({ batch }: ProductionDetailInfoProps) {
  const infoItems = [
    {
      label: 'Batch Number',
      value: batch.batch_number || 'N/A',
      icon: Hash,
      color: 'text-gray-600',
      truncate: false,
      show: true,
    },
    {
      label: 'Product Name',
      value: batch.product_name || 'N/A',
      icon: Package,
      color: 'text-primary-600',
      truncate: true,
      maxLength: 40,
      show: true,
    },
    {
      label: 'Planned Quantity',
      value: `${batch.planned_quantity}${batch.actual_quantity && batch.actual_quantity !== batch.planned_quantity ? ` (${batch.actual_quantity} actual)` : ''}`,
      icon: Package,
      color: 'text-blue-600',
      truncate: false,
      show: true,
    },
    {
      label: 'Product Category',
      value: batch.category && batch.category !== 'N/A'
        ? `${batch.category}${batch.subcategory && batch.subcategory !== 'N/A' ? ` / ${batch.subcategory}` : ''}`
        : 'N/A',
      icon: Tag,
      color: 'text-purple-600',
      truncate: true,
      maxLength: 40,
      show: batch.category && batch.category !== 'N/A',
    },
    {
      label: 'Dimensions',
      value: batch.length && batch.width && batch.length !== 'N/A' && batch.width !== 'N/A'
        ? `${batch.length}${batch.length_unit || ''} × ${batch.width}${batch.width_unit || ''}`
        : 'N/A',
      icon: Ruler,
      color: 'text-indigo-600',
      truncate: false,
      show: batch.length && batch.width && batch.length !== 'N/A' && batch.width !== 'N/A',
    },
    {
      label: 'Weight',
      value: batch.weight && batch.weight !== 'N/A'
        ? `${batch.weight} ${batch.weight_unit || ''}`
        : 'N/A',
      icon: Weight,
      color: 'text-green-600',
      truncate: false,
      show: batch.weight && batch.weight !== 'N/A',
    },
    {
      label: 'Color',
      value: batch.color && batch.color !== 'NA' && batch.color !== 'N/A' ? batch.color : 'N/A',
      icon: Tag,
      color: 'text-purple-600',
      truncate: false,
      show: !!(batch.color && batch.color !== 'NA' && batch.color !== 'N/A' && String(batch.color).trim() !== ''),
    },
    {
      label: 'Pattern',
      value: batch.pattern && batch.pattern !== 'NA' && batch.pattern !== 'N/A' ? batch.pattern : 'N/A',
      icon: Tag,
      color: 'text-purple-600',
      truncate: false,
      show: !!(batch.pattern && batch.pattern !== 'NA' && batch.pattern !== 'N/A' && String(batch.pattern).trim() !== ''),
    },
    {
      label: 'Operator',
      value: batch.operator || 'N/A',
      icon: User,
      color: 'text-blue-600',
      truncate: false,
      show: !!(batch.operator && String(batch.operator).trim() !== ''),
    },
    {
      label: 'Supervisor',
      value: batch.supervisor || 'N/A',
      icon: Building2,
      color: 'text-indigo-600',
      truncate: false,
      show: !!(batch.supervisor && String(batch.supervisor).trim() !== ''),
    },
    {
      label: 'Start Date',
      value: batch.start_date ? formatIndianDate(batch.start_date) : 'Not Started',
      icon: Calendar,
      color: 'text-green-600',
      truncate: false,
      show: !!batch.start_date && String(batch.start_date).trim() !== '',
    },
    {
      label: 'Completion Date',
      value: batch.completion_date ? formatIndianDate(batch.completion_date) : 'Not Completed',
      icon: Calendar,
      color: 'text-green-600',
      truncate: false,
      show: !!batch.completion_date && String(batch.completion_date).trim() !== '',
    },
    {
      label: 'Created On',
      value: batch.created_at ? formatIndianDateTime(batch.created_at) : 'N/A',
      icon: Calendar,
      color: 'text-indigo-600',
      truncate: false,
      show: !!batch.created_at && String(batch.created_at).trim() !== '',
    },
  ].filter(item => item.show);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Batch Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {infoItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className={`flex-shrink-0 mt-0.5 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-900 break-words">
                    {item.truncate && item.value !== 'N/A' ? (
                      <TruncatedText text={item.value} maxLength={item.maxLength || 40} as="span" />
                    ) : (
                      item.value
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {batch.notes && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-medium text-blue-900 mb-1">Notes</p>
            <p className="text-sm text-blue-800 break-words">{batch.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

