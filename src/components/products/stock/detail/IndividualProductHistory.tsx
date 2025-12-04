import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIndianDateTime } from '@/utils/formatHelpers';
import { Clock, CheckCircle, Package } from 'lucide-react';
import type { IndividualProduct } from '@/types/product';

interface IndividualProductHistoryProps {
  individualProduct: IndividualProduct;
}

export default function IndividualProductHistory({ individualProduct }: IndividualProductHistoryProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === 'null') return 'N/A';
    try {
      return formatIndianDateTime(dateString);
    } catch {
      return 'N/A';
    }
  };

  const historyItems = [
    {
      icon: CheckCircle,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      title: 'Product Created',
      date: individualProduct.created_at,
    },
    ...(individualProduct.production_date
      ? [
          {
            icon: Package,
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-100',
            title: 'Production Started',
            date: individualProduct.production_date,
          },
        ]
      : []),
    ...(individualProduct.completion_date
      ? [
          {
            icon: CheckCircle,
            iconColor: 'text-purple-600',
            bgColor: 'bg-purple-100',
            title: 'Production Completed',
            date: individualProduct.completion_date,
          },
        ]
      : []),
    {
      icon: Clock,
      iconColor: 'text-gray-600',
      bgColor: 'bg-gray-100',
      title: 'Last Updated',
      date: individualProduct.updated_at,
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-600" />
          History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {historyItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-10 h-10 ${item.bgColor} rounded-full flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(item.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

