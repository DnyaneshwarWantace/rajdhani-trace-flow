import ProductionCategoryCard from '@/components/dropdowns/ProductionCategoryCard';
import type { DropdownOption } from '@/types/dropdown';
import { productionCategories } from '@/config/dropdownConfig';

interface ProductionTabProps {
  getOptionsByCategory: (category: string) => DropdownOption[];
  simpleFormData: Record<string, string>;
  onEdit: (option: DropdownOption) => void;
  onDelete: (option: DropdownOption) => void;
  onToggleActive: (option: DropdownOption) => void;
  onAddSimple: (category: string) => void;
  onSimpleFormDataChange: (category: string, value: string) => void;
}

export default function ProductionTab({
  getOptionsByCategory,
  simpleFormData,
  onEdit,
  onDelete,
  onToggleActive,
  onAddSimple,
  onSimpleFormDataChange,
}: ProductionTabProps) {
  return (
    <>
      {productionCategories.map((category) => (
        <ProductionCategoryCard
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

