import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LucideProps } from 'lucide-react';

interface DropdownCategoryCardProps {
  icon: React.ComponentType<LucideProps>;
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
  color?: string;
}

export default function DropdownCategoryCard({
  icon: Icon,
  label,
  count,
  isSelected,
  onClick,
  color = 'primary',
}: DropdownCategoryCardProps) {
  const colorClasses = {
    primary: isSelected
      ? 'bg-primary-50 border-primary-500 text-primary-700'
      : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50/50',
    blue: isSelected
      ? 'bg-blue-50 border-blue-500 text-blue-700'
      : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50/50',
    green: isSelected
      ? 'bg-green-50 border-green-500 text-green-700'
      : 'bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50/50',
    purple: isSelected
      ? 'bg-purple-50 border-purple-500 text-purple-700'
      : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50/50',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-xl border-2 transition-all duration-200 text-left',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
        colorClasses[color as keyof typeof colorClasses] || colorClasses.primary
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={cn(
            'p-2 rounded-lg',
            isSelected
              ? color === 'blue'
                ? 'bg-white'
                : color === 'green'
                ? 'bg-white'
                : color === 'purple'
                ? 'bg-white'
                : 'bg-white'
              : 'bg-gray-50'
          )}
        >
          <Icon
            className={cn(
              'w-5 h-5',
              isSelected
                ? color === 'blue'
                  ? 'text-blue-600'
                  : color === 'green'
                  ? 'text-green-600'
                  : color === 'purple'
                  ? 'text-purple-600'
                  : 'text-primary-600'
                : 'text-gray-600'
            )}
          />
        </div>
        <Badge variant={isSelected ? 'default' : 'secondary'} className="text-xs">
          {count}
        </Badge>
      </div>
      <h3 className="font-semibold text-sm leading-tight">{label}</h3>
    </button>
  );
}

