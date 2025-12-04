import { Edit, Trash2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DropdownOption } from '@/types/dropdown';

interface DropdownOptionChipProps {
  option: DropdownOption;
  onEdit: (option: DropdownOption) => void;
  onDelete: (option: DropdownOption) => void;
  onToggleActive: (option: DropdownOption) => void;
  variant?: 'value' | 'unit';
}

export default function DropdownOptionChip({
  option,
  onEdit,
  onDelete,
  onToggleActive,
  variant = 'value',
}: DropdownOptionChipProps) {
  const bgColor = variant === 'value' ? 'bg-blue-100' : 'bg-green-100';

  return (
    <div className={`flex items-center gap-1 ${bgColor} rounded-lg px-3 py-1`}>
      <span className="text-sm font-medium">{option.value}</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onEdit(option)}
        className={`h-4 w-4 p-0 hover:${variant === 'value' ? 'bg-blue-200' : 'bg-green-200'}`}
        title="Edit"
      >
        <Edit className="w-3 h-3" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onToggleActive(option)}
        className={`h-4 w-4 p-0 ${
          option.is_active
            ? 'text-green-600 hover:bg-green-100'
            : 'text-gray-400 hover:bg-gray-200'
        }`}
        title={option.is_active ? 'Deactivate' : 'Activate'}
      >
        {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDelete(option)}
        className="h-4 w-4 p-0 text-red-600 hover:bg-red-100"
        title="Delete"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

