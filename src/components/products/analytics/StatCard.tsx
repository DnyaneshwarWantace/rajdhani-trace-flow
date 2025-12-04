import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatCard({ title, value, icon, trend, className = '' }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs sm:text-sm text-gray-600">{title}</p>
          {icon && <div className="text-primary-600">{icon}</div>}
        </div>
        <div className="flex items-baseline justify-between">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                trend.isPositive
                  ? 'text-green-600 bg-green-50'
                  : 'text-red-600 bg-red-50'
              }`}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

