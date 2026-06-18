import type { StockStats } from '@/types/product';

const STAT_CONFIG = [
  {
    key: 'total' as keyof StockStats,
    label: 'Total',
    color: '#374151', bg: '#F3F4F6',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: 'available' as keyof StockStats,
    label: 'Available',
    color: '#16A34A', bg: '#DCFCE7',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    key: 'in_production' as keyof StockStats,
    label: 'In Prod',
    color: '#EA580C', bg: '#FFF4ED',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    key: 'reserved' as keyof StockStats,
    label: 'Reserved',
    color: '#7C3AED', bg: '#F5F3FF',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    key: 'sold' as keyof StockStats,
    label: 'Sold',
    color: '#2563EB', bg: '#EFF4FF',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    key: 'used' as keyof StockStats,
    label: 'Used',
    color: '#9333EA', bg: '#FAF5FF',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'damaged' as keyof StockStats,
    label: 'Damaged',
    color: '#DC2626', bg: '#FEF2F2',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
];

interface StockStatsCardsProps {
  stats: StockStats;
}

export default function StockStatsCards({ stats }: StockStatsCardsProps) {
  return (
    <>
      {/* Mobile: horizontal scroll strip */}
      <div className="lg:hidden -mx-3 sm:-mx-4 px-3 sm:px-4">
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
          {STAT_CONFIG.map((s) => (
            <div key={s.key}
              className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-2xl px-3.5 py-2.5 shadow-sm shrink-0 min-w-[120px]">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <div>
                <p className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-0.5">{s.label}</p>
                <p className="text-lg font-extrabold leading-none" style={{ color: s.color }}>{stats[s.key]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: grid */}
      <div className="hidden lg:grid grid-cols-4 xl:grid-cols-7 gap-3">
        {STAT_CONFIG.map((s) => (
          <div key={s.key} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: s.bg, color: s.color }}>
              {s.icon}
            </div>
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
