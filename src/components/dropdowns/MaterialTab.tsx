import SimpleCategoryCard from '@/components/dropdowns/SimpleCategoryCard';
import type { DropdownOption } from '@/types/dropdown';
import { simpleCategories } from '@/config/dropdownConfig';

interface MaterialTabProps {
  getOptionsByCategory: (category: string) => DropdownOption[];
  simpleFormData: Record<string, string>;
  onEdit: (option: DropdownOption) => void;
  onDelete: (option: DropdownOption) => void;
  onToggleActive: (option: DropdownOption) => void;
  onAddSimple: (category: string) => void;
  onSimpleFormDataChange: (category: string, value: string) => void;
}

export default function MaterialTab({
  getOptionsByCategory,
  simpleFormData,
  onEdit,
  onDelete,
  onToggleActive,
  onAddSimple,
  onSimpleFormDataChange,
}: MaterialTabProps) {
  const filteredCategories = simpleCategories.filter((c) => c.tab === 'material');

  return (
    <>
      {filteredCategories.map((category) => (
        <SimpleCategoryCard
          key={category.category}
          category={category}
          options={getOptionsByCategory(category.category) || []}
          formValue={simpleFormData[category.category] || ''}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
          onAdd={onAddSimple}
          onFormValueChange={onSimpleFormDataChange}
        />
      ))}
    </>
  );
}

