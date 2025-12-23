import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function SectionHeader({ title, description, icon, onRefresh, isRefreshing }: SectionHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/notifications')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

