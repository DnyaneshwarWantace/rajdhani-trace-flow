import { useState } from 'react';
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
import { Trash2 } from 'lucide-react';
import { DropdownService } from '@/services/dropdownService';

interface ProductDropdownFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  options: string[];
  searchable?: boolean;
  allowNA?: boolean;
  required?: boolean;
  category: string;
  onValueChange: (value: string) => void;
  onDelete?: (value: string) => void;
  onAdd?: (value: string) => Promise<void>;
  reloadDropdowns?: () => Promise<void>;
}

export default function ProductDropdownField({
  label,
  value,
  placeholder,
  options,
  searchable = false,
  allowNA = false,
  required = false,
  category,
  onValueChange,
  onDelete,
  onAdd,
  reloadDropdowns,
}: ProductDropdownFieldProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newInput, setNewInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = searchable
    ? options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const handleAdd = async () => {
    if (!newInput.trim()) return;
    try {
      if (onAdd) {
        await onAdd(newInput.trim());
      } else {
        const result = await DropdownService.addOption(category, newInput.trim());
        if (result.success && reloadDropdowns) {
          await reloadDropdowns();
        }
      }
      onValueChange(newInput.trim());
      setNewInput('');
      setShowAdd(false);
    } catch (err) {
      console.error(`Failed to add ${category}:`, err);
      alert(`Failed to add ${category}`);
    }
  };

  const handleDelete = async (optionValue: string) => {
    if (onDelete) {
      await onDelete(optionValue);
    }
  };

  if (showAdd) {
    return (
      <div>
        <Label>{label} {required && '*'}</Label>
        <div className="flex gap-2">
          <Input
            placeholder={`Enter new ${label.toLowerCase()}`}
            value={newInput}
            onChange={(e) => setNewInput(e.target.value)}
            autoFocus
          />
          <Button size="sm" onClick={handleAdd} className="bg-primary-600 hover:bg-primary-700 text-white">
            Add
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label>{label} {required && '*'}</Label>
      <Select
        value={value || (allowNA ? 'N/A' : '')}
        onValueChange={(selectedValue) => {
          if (selectedValue === 'add_new') {
            setShowAdd(true);
          } else {
            onValueChange(selectedValue === 'N/A' ? '' : selectedValue);
            setSearchTerm('');
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {searchable && (
            <div className="p-2 border-b">
              <Input
                placeholder={`Search ${label.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8"
              />
            </div>
          )}

          <SelectItem value="add_new" className="text-primary-600 font-medium">
            + Add New {label}
          </SelectItem>

          {allowNA && (
            <SelectItem value="N/A" className="text-gray-500 italic">
              N/A (No {label})
            </SelectItem>
          )}

          {filteredOptions
            .filter((opt) => opt && opt.trim() !== '' && opt !== 'NA' && opt !== 'N/A')
            .map((option) => (
              <div
                key={option}
                className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm"
              >
                <SelectItem value={option} className="flex-1 p-0 h-auto">
                  {option}
                </SelectItem>
                {option && onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(option);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}

          {searchable && filteredOptions.length === 0 && (
            <div className="p-2 text-sm text-gray-500 text-center">
              No {label.toLowerCase()} found matching "{searchTerm}"
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

