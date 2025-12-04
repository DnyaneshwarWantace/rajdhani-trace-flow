import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DropdownOptionChip from '@/components/dropdowns/DropdownOptionChip';
import DropdownAddForm from '@/components/dropdowns/DropdownAddForm';
import type { DropdownOption } from '@/types/dropdown';
import type { SimpleCategoryConfig } from '@/config/dropdownConfig';

interface SimpleCategoryCardProps {
  category: SimpleCategoryConfig;
  options: DropdownOption[];
  formValue: string;
  onEdit: (option: DropdownOption) => void;
  onDelete: (option: DropdownOption) => void;
  onToggleActive: (option: DropdownOption) => void;
  onAdd: (category: string) => void;
  onFormValueChange: (category: string, value: string) => void;
}

export default function SimpleCategoryCard({
  category,
  options,
  formValue,
  onEdit,
  onDelete,
  onToggleActive,
  onAdd,
  onFormValueChange,
}: SimpleCategoryCardProps) {
  const Icon = category.icon;

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
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">{category.description}</h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {options.map((option) => (
              <DropdownOptionChip
                key={option._id}
                option={option}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
                variant="value"
              />
            ))}
          </div>

          <DropdownAddForm
            value={formValue}
            placeholder={category.placeholder}
            onChange={(val) => onFormValueChange(category.category, val)}
            onSubmit={() => onAdd(category.category)}
            buttonText={category.buttonText}
            variant="value"
            title={`Add New ${category.title}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

