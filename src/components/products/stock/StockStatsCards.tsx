import type { StockStats } from '@/types/product';

const STATS = [
  { key: 'total'       as keyof StockStats, label: 'Total',     color: 'text-gray-900'   },
  { key: 'available'   as keyof StockStats, label: 'Available', color: 'text-green-600'  },
  { key: 'in_production' as keyof StockStats, label: 'In Prod', color: 'text-orange-500' },
  { key: 'reserved'   as keyof StockStats, label: 'Reserved',   color: 'text-purple-600' },
  { key: 'sold'       as keyof StockStats, label: 'Sold',       color: 'text-blue-600'   },
  { key: 'used'       as keyof StockStats, label: 'Used',       color: 'text-violet-600' },
  { key: 'damaged'    as keyof StockStats, label: 'Damaged',    color: 'text-red-600'    },
];

const DESKTOP_CONFIG = [
  { key: 'total'        as keyof StockStats, label: 'Total',       color: '#374151', bg: '#F3F4F6' },
  { key: 'available'    as keyof StockStats, label: 'Available',   color: '#16A34A', bg: '#DCFCE7' },
  { key: 'in_production'as keyof StockStats, label: 'In Prod',     color: '#EA580C', bg: '#FFF4ED' },
  { key: 'reserved'     as keyof StockStats, label: 'Reserved',    color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'sold'         as keyof StockStats, label: 'Sold',        color: '#2563EB', bg: '#EFF4FF' },
  { key: 'used'         as keyof StockStats, label: 'Used',        color: '#9333EA', bg: '#FAF5FF' },
  { key: 'damaged'      as keyof StockStats, label: 'Damaged',     color: '#DC2626', bg: '#FEF2F2' },
];

interface StockStatsCardsProps {
  stats: StockStats;
}

export default function StockStatsCards({ stats }: StockStatsCardsProps) {
  return (
    <>
      {/* Mobile: single horizontal strip with dividers — same style as product list page */}
      <div className="lg:hidden flex border border-gray-200 rounded-xl overflow-hidden bg-white text-center">
        {STATS.map((s, i) => (
          <div
            key={s.key}
            className={`flex-1 flex flex-col items-center py-2.5 ${i > 0 ? 'border-l border-gray-200' : ''}`}
          >
            <span className={`text-sm font-extrabold tracking-tight ${s.color}`}>
              {stats[s.key]}
            </span>
            <span className="text-[8.5px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide leading-none">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden lg:grid grid-cols-4 xl:grid-cols-7 gap-3">
        {DESKTOP_CONFIG.map((s) => (
          <div key={s.key} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-extrabold leading-none mt-0.5" style={{ color: s.color }}>{stats[s.key]}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
