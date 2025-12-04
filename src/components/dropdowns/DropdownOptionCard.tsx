import { Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { DropdownOption } from '@/types/dropdown';

interface DropdownOptionCardProps {
  option: DropdownOption;
  onEdit: (option: DropdownOption) => void;
  onDelete: (option: DropdownOption) => void;
  onToggleActive: (option: DropdownOption) => void;
}

export default function DropdownOptionCard({
  option,
  onEdit,
  onDelete,
  onToggleActive,
}: DropdownOptionCardProps) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-gray-900 truncate">{option.value}</p>
            <Badge
              variant={option.is_active ? 'default' : 'secondary'}
              className="text-xs shrink-0"
            >
              {option.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Order: {option.display_order}</span>
            {option.updated_at && (
              <span>
                Updated: {new Date(option.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(option)}
            className="h-8 w-8 p-0"
            title={option.is_active ? 'Deactivate' : 'Activate'}
          >
            {option.is_active ? (
              <Power className="w-4 h-4 text-green-600" />
            ) : (
              <PowerOff className="w-4 h-4 text-gray-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(option)}
            className="h-8 w-8 p-0"
            title="Edit"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(option)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

