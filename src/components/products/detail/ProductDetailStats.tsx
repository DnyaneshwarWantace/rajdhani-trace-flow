import type { Product } from '@/types/product';
import { formatStockRolls } from '@/utils/stockFormatter';
import { calculateStockStatus } from '@/utils/stockStatus';
import { Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ProductDetailStatsProps {
  product: Product;
}

export default function ProductDetailStats({ product }: ProductDetailStatsProps) {
  const status = calculateStockStatus(product);
  const stock = product.current_stock || 0;
  const minLevel = product.min_stock_level || 0;
  const maxLevel = product.max_stock_level || 0;

  const stats = [
    {
      label: 'Current Stock',
      value: formatStockRolls(stock),
      icon: Package,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      label: 'Status',
      value: status.replace('-', ' '),
      icon: status === 'out-of-stock' ? XCircle : status === 'low-stock' ? AlertTriangle : CheckCircle,
      color: status === 'out-of-stock' 
        ? 'text-red-600' 
        : status === 'low-stock' 
        ? 'text-orange-600' 
        : 'text-green-600',
      bgColor: status === 'out-of-stock' 
        ? 'bg-red-50' 
        : status === 'low-stock' 
        ? 'bg-orange-50' 
        : 'bg-green-50',
    },
    {
      label: 'Min Level',
      value: `${minLevel} rolls`,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Max Level',
      value: `${maxLevel} rolls`,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`${stat.bgColor} rounded-lg p-3 sm:p-4 border border-gray-200`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`${stat.color} p-1.5 sm:p-2 rounded-lg bg-white flex-shrink-0`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 mb-1 truncate">{stat.label}</p>
                <p className={`text-sm font-bold ${stat.color} truncate`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

