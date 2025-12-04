import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, X, Plus } from 'lucide-react';
import type { DropdownOption } from '@/types/dropdown';
import type { ProductionCategoryConfig } from '@/config/dropdownConfig';

interface ProductionCategoryCardProps {
  category: ProductionCategoryConfig;
  options: DropdownOption[];
  formValue: string;
  onEdit: (option: DropdownOption) => void;
  onDelete: (option: DropdownOption) => void;
  onToggleActive: (option: DropdownOption) => void;
  onAdd: (category: string) => void;
  onFormValueChange: (category: string, value: string) => void;
}

export default function ProductionCategoryCard({
  category,
  options,
  formValue,
  onEdit,
  onDelete,
  onToggleActive,
  onAdd,
  onFormValueChange,
}: ProductionCategoryCardProps) {
  const Icon = category.icon;
  const bgColor =
    category.color === 'orange'
      ? 'bg-orange-100'
      : category.color === 'yellow'
      ? 'bg-yellow-100'
      : 'bg-red-100';
  const hoverColor =
    category.color === 'orange'
      ? 'hover:bg-orange-200'
      : category.color === 'yellow'
      ? 'hover:bg-yellow-200'
      : 'hover:bg-red-200';
  const buttonColor =
    category.color === 'orange'
      ? 'bg-orange-600 hover:bg-orange-700'
      : category.color === 'yellow'
      ? 'bg-yellow-600 hover:bg-yellow-700'
      : 'bg-red-600 hover:bg-red-700';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {category.title}
          <Badge variant="secondary" className="ml-auto">
            {options.length} options
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {options.map((option) => (
            <div key={option._id} className={`flex items-center gap-1 ${bgColor} rounded-lg px-3 py-1`}>
              <span className="text-sm font-medium">{option.value}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(option)}
                className={`h-4 w-4 p-0 ${hoverColor}`}
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
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder={category.placeholder}
            value={formValue}
            onChange={(e) => onFormValueChange(category.category, e.target.value)}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={() => onAdd(category.category)}
            disabled={!formValue.trim()}
            className={`${buttonColor} text-white`}
          >
            <Plus className="w-4 h-4 mr-1" /> {category.buttonText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

