import { Package, ShoppingCart, DollarSign, Factory, Users, Building2, FileText, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';

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
  };
  loading: boolean;
}

export default function DashboardStatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Products',
      value: loading ? '...' : stats.totalProducts.toLocaleString(),
      icon: Package,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      subtext: stats.lowStockProducts > 0 ? `${stats.lowStockProducts} low stock` : 'All in stock',
      subtextColor: stats.lowStockProducts > 0 ? 'text-orange-600' : 'text-gray-500',
    },
    {
      title: 'Total Orders',
      value: loading ? '...' : stats.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      subtext: stats.pendingOrders > 0 ? `${stats.pendingOrders} pending` : 'All processed',
      subtextColor: stats.pendingOrders > 0 ? 'text-orange-600' : 'text-gray-500',
    },
    {
      title: 'Total Revenue',
      value: loading ? '...' : formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      subtext: stats.outstandingAmount > 0 ? `${formatCurrency(stats.outstandingAmount)} pending` : 'All collected',
      subtextColor: stats.outstandingAmount > 0 ? 'text-red-600' : 'text-gray-500',
    },
    {
      title: 'Production Batches',
      value: loading ? '...' : stats.activeProduction.toLocaleString(),
      icon: Factory,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      subtext: stats.activeProduction > 0 ? `${stats.activeProduction} active` : 'No active batches',
      subtextColor: 'text-gray-500',
    },
    {
      title: 'Total Recipes',
      value: loading ? '...' : stats.totalRecipes.toLocaleString(),
      icon: FileText,
      bgColor: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
      subtext: 'Products with recipes',
      subtextColor: 'text-gray-500',
    },
    {
      title: 'Total Wastage',
      value: loading ? '...' : stats.totalWastage.toLocaleString(),
      icon: Trash2,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      subtext: 'Wastage records',
      subtextColor: 'text-gray-500',
    },
    {
      title: 'Raw Materials',
      value: loading ? '...' : stats.totalMaterials.toLocaleString(),
      icon: Package,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      subtext: 'Total materials',
      subtextColor: 'text-gray-500',
    },
    {
      title: 'Customers',
      value: loading ? '...' : stats.totalCustomers.toLocaleString(),
      icon: Users,
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      subtext: 'Total registered',
      subtextColor: 'text-gray-500',
    },
    {
      title: 'Suppliers',
      value: loading ? '...' : stats.totalSuppliers.toLocaleString(),
      icon: Building2,
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-600',
      subtext: 'Total partners',
      subtextColor: 'text-gray-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow min-h-[120px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-1">{card.title}</p>
            <p className="text-xl font-bold text-gray-900 mb-1">{card.value}</p>
            <p className={`text-xs ${card.subtextColor} font-medium mt-auto`}>{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}
