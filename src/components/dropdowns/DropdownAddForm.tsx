import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DropdownAddFormProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  buttonText: string;
  variant?: 'value' | 'unit';
  title?: string;
}

export default function DropdownAddForm({
  value,
  placeholder,
  onChange,
  onSubmit,
  disabled = false,
  buttonText,
  variant = 'unit',
  title,
}: DropdownAddFormProps) {
  const bgGradient =
    variant === 'value'
      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
      : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
  const textColor = variant === 'value' ? 'text-blue-800' : 'text-green-700';
  const buttonColor = variant === 'value' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';

  return (
    <div className={`${bgGradient} p-3 rounded-lg border`}>
      <h5 className={`text-xs font-semibold mb-2 ${textColor} flex items-center gap-1`}>
        <Plus className="w-3 h-3" />
        {title || `Add New ${variant === 'value' ? 'Option' : 'Unit'}`}
      </h5>
      <div className="flex items-center gap-2">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-sm"
        />
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className={`${buttonColor} text-white px-3 py-1 h-8 text-xs`}
        >
          <Plus className="w-3 h-3 mr-1" /> {buttonText}
        </Button>
      </div>
    </div>
  );
}

