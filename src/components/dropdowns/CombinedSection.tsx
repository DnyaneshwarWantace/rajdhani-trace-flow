import DropdownSectionCard from '@/components/dropdowns/DropdownSectionCard';
import DropdownOptionChip from '@/components/dropdowns/DropdownOptionChip';
import DropdownAddCombinedForm from '@/components/dropdowns/DropdownAddCombinedForm';
import DropdownAddForm from '@/components/dropdowns/DropdownAddForm';
import type { DropdownOption } from '@/types/dropdown';
import type { SectionConfig } from '@/config/dropdownConfig';

interface CombinedSectionProps {
  section: SectionConfig;
  values: DropdownOption[];
  units: DropdownOption[];
  formData: { value: string; unit: string };
  simpleFormData: string;
  onEdit: (option: DropdownOption) => void;
  onDelete: (option: DropdownOption) => void;
  onToggleActive: (option: DropdownOption) => void;
  onAddCombined: (valueCategory: string) => void;
  onAddSimple: (category: string) => void;
  onFormDataChange: (valueCategory: string, data: { value: string; unit: string }) => void;
  onSimpleFormDataChange: (category: string, value: string) => void;
}

export default function CombinedSection({
  section,
  values,
  units,
  formData,
  simpleFormData,
  onEdit,
  onDelete,
  onToggleActive,
  onAddCombined,
  onAddSimple,
  onFormDataChange,
  onSimpleFormDataChange,
}: CombinedSectionProps) {
  const Icon = section.icon;

  return (
    <DropdownSectionCard
      title={section.title}
      icon={Icon}
      valueCount={values.length}
      unitCount={units.length}
    >
      {/* Values Section */}
      <div>
        <h4 className="text-sm font-medium mb-2">{section.valueDescription}</h4>
        <div className="flex flex-wrap gap-2 mb-4">
          {values.map((option) => (
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

        {/* Add Combined Form */}
        <DropdownAddCombinedForm
          value={formData.value}
          unit={formData.unit}
          unitOptions={units.map((u) => ({ id: u._id, value: u.value }))}
          valuePlaceholder={section.valuePlaceholder}
          unitPlaceholder="Select unit"
          onChangeValue={(val) =>
            onFormDataChange(section.valueCategory, { ...formData, value: val })
          }
          onChangeUnit={(unit) =>
            onFormDataChange(section.valueCategory, { ...formData, unit })
          }
          onSubmit={() => onAddCombined(section.valueCategory)}
          buttonText={section.combinedButtonText}
        />
      </div>

      {/* Units Section */}
      <div>
        <h4 className="text-sm font-medium mb-2">{section.unitDescription}</h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {units.map((option) => (
            <DropdownOptionChip
              key={option._id}
              option={option}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              variant="unit"
            />
          ))}
        </div>

        {/* Add Unit Form */}
        <DropdownAddForm
          value={simpleFormData}
          placeholder={section.unitPlaceholder}
          onChange={(val) => onSimpleFormDataChange(section.unitCategory, val)}
          onSubmit={() => onAddSimple(section.unitCategory)}
          buttonText={section.unitButtonText}
          variant="unit"
          title={`Add New ${section.title.split(' ')[0]} Unit`}
        />
      </div>
    </DropdownSectionCard>
  );
}

