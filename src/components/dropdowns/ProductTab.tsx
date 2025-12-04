import CombinedSection from '@/components/dropdowns/CombinedSection';
import SimpleCategoryCard from '@/components/dropdowns/SimpleCategoryCard';
import type { DropdownOption } from '@/types/dropdown';
import { productSections, simpleCategories } from '@/config/dropdownConfig';

interface ProductTabProps {
  getOptionsByCategory: (category: string) => DropdownOption[];
  formData: Record<string, { value: string; unit: string }>;
  simpleFormData: Record<string, string>;
  onEdit: (option: DropdownOption) => void;
  onDelete: (option: DropdownOption) => void;
  onToggleActive: (option: DropdownOption) => void;
  onAddCombined: (valueCategory: string) => void;
  onAddSimple: (category: string) => void;
  onFormDataChange: (valueCategory: string, data: { value: string; unit: string }) => void;
  onSimpleFormDataChange: (category: string, value: string) => void;
}

export default function ProductTab({
  getOptionsByCategory,
  formData,
  simpleFormData,
  onEdit,
  onDelete,
  onToggleActive,
  onAddCombined,
  onAddSimple,
  onFormDataChange,
  onSimpleFormDataChange,
}: ProductTabProps) {
  const filteredSections = productSections.filter((s) => s.tab === 'product');
  const filteredCategories = simpleCategories.filter((c) => c.tab === 'product');

  return (
    <>
      {/* Combined Sections */}
      {filteredSections.map((section) => (
        <CombinedSection
          key={section.valueCategory}
          section={section}
          values={getOptionsByCategory(section.valueCategory) || []}
          units={getOptionsByCategory(section.unitCategory) || []}
          formData={formData[section.valueCategory] || { value: '', unit: '' }}
          simpleFormData={simpleFormData[section.unitCategory] || ''}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
          onAddCombined={onAddCombined}
          onAddSimple={onAddSimple}
          onFormDataChange={onFormDataChange}
          onSimpleFormDataChange={onSimpleFormDataChange}
        />
      ))}

      {/* Simple Categories */}
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

