import { Package, ShoppingCart, DollarSign, Factory, ClipboardList } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';
import { useNavigate } from 'react-router-dom';

interface StatsCardsProps {
  stats: {
    totalProducts: number;
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    outstandingAmount: number;
    activeProduction: number;
    totalCustomers: number;
    totalSuppliers: number;
    lowStockProducts: number;
    totalRecipes: number;
    totalWastage: number;
    totalMaterials: number;
    inStockMaterials: number;
    lowStockMaterials: number;
    outOfStockMaterials: number;
    manageStockPending: number;
    manageStockApproved: number;
    manageStockShipped: number;
    manageStockDelivered: number;
    manageStockTotalValue: number;
    ordersPending: number;
    ordersAccepted: number;
    ordersDispatched: number;
    ordersDelivered: number;
    productionPlanned: number;
    productionInProgress: number;
    productionCompleted: number;
    productionCancelled: number;
  };
  loading: boolean;
}

export default function DashboardStatsCards({ stats, loading }: StatsCardsProps) {
  const navigate = useNavigate();
  const pending = stats.manageStockPending ?? 0;
  const approved = stats.manageStockApproved ?? 0;
  const shipped = stats.manageStockShipped ?? 0;
  const delivered = stats.manageStockDelivered ?? 0;

  const productionTotal = (stats.productionPlanned ?? 0) + (stats.productionInProgress ?? 0) + (stats.productionCompleted ?? 0) + (stats.productionCancelled ?? 0);

  const cards = [
    {
      title: 'Total Orders',
      value: loading ? '...' : formatCurrency(stats.totalRevenue),
      icon: ShoppingCart,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      subtext: loading
        ? 'Loading...'
        : `Pending: ${stats.ordersPending ?? 0} · Accepted: ${stats.ordersAccepted ?? 0} · Dispatched: ${stats.ordersDispatched ?? 0} · Delivered: ${stats.ordersDelivered ?? 0}`,
      subtextColor: 'text-gray-500',
      onClick: undefined as (() => void) | undefined,
    },
    {
      title: 'Total Revenue',
      value: loading ? '...' : formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      subtext: stats.outstandingAmount > 0 ? `${formatCurrency(stats.outstandingAmount)} pending` : 'All collected',
      subtextColor: stats.outstandingAmount > 0 ? 'text-red-600' : 'text-gray-500',
      onClick: undefined as (() => void) | undefined,
    },
    {
      title: 'Production Batches',
      value: loading ? '...' : (productionTotal > 0 ? productionTotal : stats.activeProduction).toLocaleString(),
      icon: Factory,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      subtext: loading
        ? 'Loading...'
        : `Planned: ${stats.productionPlanned ?? 0} · In progress: ${stats.productionInProgress ?? 0} · Completed: ${stats.productionCompleted ?? 0} · Cancelled: ${stats.productionCancelled ?? 0}`,
      subtextColor: 'text-gray-500',
      onClick: undefined as (() => void) | undefined,
    },
    {
      title: 'Raw Materials',
      value: loading ? '...' : stats.totalMaterials.toLocaleString(),
      icon: Package,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      subtext: loading
        ? 'Loading material stats...'
        : `In stock: ${(stats.inStockMaterials ?? 0).toLocaleString()} • Low: ${(stats.lowStockMaterials ?? 0).toLocaleString()} • Out: ${(stats.outOfStockMaterials ?? 0).toLocaleString()}`,
      subtextColor: 'text-gray-500',
      onClick: () => navigate('/materials'),
    },
    {
      title: 'Manage Stock',
      value: loading ? '...' : formatCurrency(stats.manageStockTotalValue ?? 0),
      icon: ClipboardList,
      bgColor: 'bg-slate-50',
      iconColor: 'text-slate-600',
      subtext: loading
        ? 'Loading...'
        : `Pending: ${pending} · Approved: ${approved} · Shipped: ${shipped} · Delivered: ${delivered}`,
      subtextColor: 'text-gray-500',
      onClick: () => navigate('/manage-stock'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const Wrapper = card.onClick ? 'button' : 'div';
        return (
          <Wrapper
            key={idx}
            type={card.onClick ? 'button' : undefined}
            onClick={card.onClick}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow min-h-[120px] flex flex-col text-left w-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${card.onClick ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left side: Icon, Title, Value - stacked vertically */}
              <div className="flex flex-col gap-2">
                <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <p className="text-xs text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>

              {/* Right side: Status - stacked vertically */}
              <div className="text-right space-y-1">
                {card.subtext.split(/[·•]/).map((item, i) => (
                  <p key={i} className={`text-xs ${card.subtextColor} font-medium whitespace-nowrap`}>
                    {item.trim()}
                  </p>
                ))}
              </div>
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}
