import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductValueUnitFieldProps {
  label: string;
  value: string;
  unit: string;
  unitOptions: string[];
  placeholder?: string;
  required?: boolean;
  description?: string;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  onAddToDropdown?: () => void;
}

export default function ProductValueUnitField({
  label,
  value,
  unit,
  unitOptions,
  placeholder,
  required = false,
  description,
  onValueChange,
  onUnitChange,
  onAddToDropdown,
}: ProductValueUnitFieldProps) {
  const canAddToDropdown = value?.trim() && unit;

  return (
    <div>
      <Label>
        {label} {required && '*'}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder || `e.g., 5`}
          required={required}
        />
        <div className="flex gap-2">
          <Select value={unit} onValueChange={onUnitChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={`Unit ${required ? '*' : ''}`} />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.length > 0 ? (
                unitOptions
                  .filter((opt) => opt && opt.trim() !== '')
                  .map((unitOption) => (
                    <SelectItem key={unitOption} value={unitOption}>
                      {unitOption}
                    </SelectItem>
                  ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-gray-500">
                  No units available. Add units in Dropdown Master.
                </div>
              )}
            </SelectContent>
          </Select>
          {canAddToDropdown && onAddToDropdown && (
            <Button type="button" size="sm" onClick={onAddToDropdown} className="whitespace-nowrap">
              Add to Dropdown
            </Button>
          )}
        </div>
      </div>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

