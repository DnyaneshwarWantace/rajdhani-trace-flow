import { ShoppingCart, Clock, CheckSquare, Truck, CheckCircle, Loader2 } from 'lucide-react';

interface OrderStatsBoxesProps {
  stats: {
    total: number;
    pending: number;
    accepted: number;
    dispatched: number;
    delivered: number;
  };
  loading?: boolean;
}

export default function OrderStatsBoxes({ stats, loading }: OrderStatsBoxesProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: 'Total Orders',
      value: stats.total,
      icon: ShoppingCart,
      color: 'bg-blue-100 text-blue-700',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-700',
      iconColor: 'text-yellow-600',
    },
    {
      label: 'Accepted',
      value: stats.accepted,
      icon: CheckSquare,
      color: 'bg-blue-100 text-blue-700',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Dispatched',
      value: stats.dispatched,
      icon: Truck,
      color: 'bg-orange-100 text-orange-700',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Delivered',
      value: stats.delivered,
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700',
      iconColor: 'text-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${item.color}`}>
                <Icon className={`w-6 h-6 ${item.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


