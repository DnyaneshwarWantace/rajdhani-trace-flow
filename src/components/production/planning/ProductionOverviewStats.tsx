import { Package, Boxes, Ruler, Weight } from 'lucide-react';

interface ProductionOverviewStatsProps {
  targetQuantity: number;
  unit: string;
  materialsUsed: number;
  expectedLength?: number;
  expectedWidth?: number;
  expectedWeight?: number;
}

export default function ProductionOverviewStats({
  targetQuantity,
  unit,
  materialsUsed,
  expectedLength,
  expectedWidth,
  expectedWeight,
}: ProductionOverviewStatsProps) {
  const stats = [
    { icon: Package, color: 'text-blue-600 bg-blue-50', value: `${targetQuantity} ${unit}`, label: 'Target Qty' },
    { icon: Boxes,   color: 'text-green-600 bg-green-50', value: `${materialsUsed} Selected`, label: 'Materials' },
    ...(expectedLength ? [{ icon: Ruler, color: 'text-purple-600 bg-purple-50', value: `${expectedLength}M × ${expectedWidth || 0}M`, label: 'Length × Width' }] : []),
    ...(expectedWeight ? [{ icon: Weight, color: 'text-orange-600 bg-orange-50', value: `${expectedWeight} GSM`, label: 'Expected GSM' }] : []),
  ];

  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${s.color.split(' ')[1]} border border-gray-100`}>
            <Icon className={`w-4 h-4 ${s.color.split(' ')[0]}`} />
            <div>
              <p className={`text-sm font-semibold ${s.color.split(' ')[0]}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
