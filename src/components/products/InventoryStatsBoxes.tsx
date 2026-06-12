import { Card, CardContent } from '@/components/ui/card';
import { Package, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface InventoryStatsBoxesProps {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  loading: boolean;
}

const StatRow = ({ label, value, color, icon, loading }: {
  label: string; value: number; color: string; icon: React.ReactNode; loading: boolean;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      {loading
        ? <span className="inline-block w-10 h-6 bg-gray-200 animate-pulse rounded mt-0.5" />
        : <p className={`text-xl font-bold ${color}`}>{value.toLocaleString()}</p>
      }
    </div>
    {icon}
  </div>
);

export default function InventoryStatsBoxes({
  totalProducts, inStock, lowStock, outOfStock, loading,
}: InventoryStatsBoxesProps) {
  return (
    <>
      {/* Mobile — single horizontal row with dividers (matches Order page stats strip) */}
      <div className="lg:hidden mb-3 flex border border-gray-200 rounded-xl overflow-hidden bg-white text-center">
        {[
          { label: 'Total', value: totalProducts, color: 'text-gray-900' },
          { label: 'In Stock', value: inStock, color: 'text-green-600' },
          { label: 'Low Stock', value: lowStock, color: 'text-orange-500' },
          { label: 'Out of Stock', value: outOfStock, color: 'text-red-600' },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`flex-1 flex flex-col items-center py-2 ${i > 0 ? 'border-l border-gray-200' : ''}`}
          >
            <span className={`text-sm font-extrabold tracking-tight ${s.color}`}>
              {loading ? (
                <span className="inline-block w-5 h-4 bg-gray-200 animate-pulse rounded" />
              ) : (
                s.value.toLocaleString()
              )}
            </span>
            <span className="text-[9px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide leading-none">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Desktop — 4-col grid */}
      <div className="hidden lg:grid grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total Products</p><p className="text-2xl font-bold text-gray-900">{loading ? <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" /> : totalProducts.toLocaleString()}</p></div><Package className="w-8 h-8 text-blue-600 opacity-50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">In Stock</p><p className="text-2xl font-bold text-green-600">{loading ? <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" /> : inStock.toLocaleString()}</p></div><CheckCircle className="w-8 h-8 text-green-600 opacity-50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Low Stock</p><p className="text-2xl font-bold text-orange-600">{loading ? <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" /> : lowStock.toLocaleString()}</p></div><AlertTriangle className="w-8 h-8 text-orange-600 opacity-50" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Out of Stock</p><p className="text-2xl font-bold text-red-600">{loading ? <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" /> : outOfStock.toLocaleString()}</p></div><XCircle className="w-8 h-8 text-red-600 opacity-50" /></div></CardContent></Card>
      </div>
    </>
  );
}

