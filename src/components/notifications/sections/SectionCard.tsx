import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  notificationsCount: number;
  logsCount: number;
  unreadCount: number;
  route: string;
  color: string;
}

export default function SectionCard({
  title,
  description,
  icon,
  notificationsCount,
  logsCount,
  unreadCount,
  route,
  color,
}: SectionCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(route)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${color}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-1">Notifications</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-gray-900">{notificationsCount}</p>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Activity Logs</p>
            <p className="text-lg font-bold text-gray-900">{logsCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

