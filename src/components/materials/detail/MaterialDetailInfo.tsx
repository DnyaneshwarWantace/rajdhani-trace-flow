import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { Hash, Palette, Calendar, Package, User, Building2 } from 'lucide-react';
import { formatIndianDate, formatIndianDateTime } from '@/utils/formatHelpers';
import type { RawMaterial } from '@/types/material';

interface MaterialDetailInfoProps {
  material: RawMaterial;
}

export default function MaterialDetailInfo({ material }: MaterialDetailInfoProps) {
  const infoItems = [
    {
      label: 'Material ID',
      value: material.id || 'N/A',
      icon: Hash,
      color: 'text-gray-600',
      truncate: false,
    },
    {
      label: 'Category',
      value: material.category || 'N/A',
      icon: Package,
      color: 'text-purple-600',
      truncate: false,
    },
    {
      label: 'Color',
      value: material.color && material.color !== 'NA' ? material.color : 'N/A',
      icon: Palette,
      color: 'text-purple-600',
      truncate: false,
    },
    {
      label: 'Supplier',
      value: material.supplier_name || 'N/A',
      icon: Building2,
      color: 'text-indigo-600',
      truncate: true,
      maxLength: 40,
    },
    {
      label: 'Last Restocked',
      value: material.last_restocked 
        ? formatIndianDate(material.last_restocked)
        : 'Never',
      icon: Calendar,
      color: 'text-green-600',
      truncate: false,
    },
    {
      label: 'Created By',
      value: material.created_by || 'System',
      icon: User,
      color: 'text-blue-600',
      truncate: false,
    },
    {
      label: 'Created On',
      value: material.created_at || material.createdAt
        ? formatIndianDateTime(material.created_at || material.createdAt)
        : 'N/A',
      icon: Calendar,
      color: 'text-indigo-600',
      truncate: false,
    },
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Material Information</CardTitle>
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
      </CardContent>
    </Card>
  );
}

