import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DropdownAddCombinedFormProps {
  value: string;
  unit: string;
  unitOptions: Array<{ id: string; value: string }>;
  valuePlaceholder: string;
  unitPlaceholder: string;
  onChangeValue: (value: string) => void;
  onChangeUnit: (unit: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  buttonText: string;
}

export default function DropdownAddCombinedForm({
  value,
  unit,
  unitOptions,
  valuePlaceholder,
  unitPlaceholder,
  onChangeValue,
  onChangeUnit,
  onSubmit,
  disabled = false,
  buttonText,
}: DropdownAddCombinedFormProps) {
  const isDisabled = disabled || !value.trim() || !unit.trim();

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
      <h5 className="text-sm font-semibold mb-3 text-blue-800 flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add New Option
      </h5>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Value</label>
          <Input
            placeholder={valuePlaceholder}
            value={value}
            onChange={(e) => onChangeValue(e.target.value)}
            className="w-full text-center font-medium"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Unit</label>
          <Select value={unit || undefined} onValueChange={onChangeUnit}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={unitPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {unitOptions
                .filter((opt) => opt.value && opt.value.trim() !== '')
                .map((opt) => (
                  <SelectItem key={opt.id} value={opt.value}>
                    {opt.value}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="pt-5">
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isDisabled}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 h-9"
          >
            <Plus className="w-4 h-4 mr-1" /> {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
}

