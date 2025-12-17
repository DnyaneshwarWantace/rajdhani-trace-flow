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
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newInput, setNewInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = searchable
    ? options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  // Get validation rules based on category
  const getValidationRules = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'category':
      case 'subcategory':
        return { maxWords: 5, maxCharsPerWord: 20 };
      case 'color':
        return { maxWords: 3, maxCharsPerWord: 15 };
      case 'pattern':
        return { maxWords: 4, maxCharsPerWord: 15 };
      default:
        return { maxWords: 5, maxCharsPerWord: 20 };
    }
  };

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

      // Show success toast
      toast({
        title: 'Success',
        description: `New ${label.toLowerCase()} "${newInput.trim()}" added successfully`,
      });
    } catch (err) {
      console.error(`Failed to add ${category}:`, err);
      toast({
        title: 'Error',
        description: `Failed to add ${label.toLowerCase()}`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (optionValue: string) => {
    if (onDelete) {
      await onDelete(optionValue);
    }
  };

  const validationRules = getValidationRules(category);

  const handleInputChange = (value: string) => {
    let inputValue = value;
    const words = inputValue.split(/\s+/).filter(w => w.length > 0);

    // Limit to max words
    if (words.length > validationRules.maxWords) {
      let wordCount = 0;
      let pos = inputValue.length;
      for (let i = 0; i < inputValue.length; i++) {
        if (inputValue[i] !== ' ' && (i === 0 || inputValue[i - 1] === ' ')) {
          wordCount++;
          if (wordCount === validationRules.maxWords) {
            let endPos = i;
            while (endPos < inputValue.length && inputValue[endPos] !== ' ') {
              endPos++;
            }
            pos = endPos;
            break;
          }
        }
      }
      inputValue = inputValue.substring(0, pos);
    }

    // Limit each word to max characters
    const parts = inputValue.split(/(\s+)/);
    const processedParts = parts.map(part => {
      if (/^\s+$/.test(part)) {
        return part;
      } else if (part.trim().length > 0) {
        return part.length > validationRules.maxCharsPerWord ? part.slice(0, validationRules.maxCharsPerWord) : part;
      }
      return part;
    });

    inputValue = processedParts.join('');
    setNewInput(inputValue);
  };

  if (showAdd) {
    const wordCount = newInput.trim().split(/\s+/).filter(w => w.length > 0).length;

    return (
      <div>
        <Label>{label} {required && '*'}</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder={`Enter new ${label.toLowerCase()}`}
              value={newInput}
              onChange={(e) => handleInputChange(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              {wordCount}/{validationRules.maxWords} words • Max {validationRules.maxCharsPerWord} characters per word
            </p>
          </div>
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

  // Check if current value exists in options
  const valueExistsInOptions = value && options.includes(value);

  // Use value only if it exists in options, otherwise empty string
  const selectValue = valueExistsInOptions ? value : (allowNA ? 'N/A' : '');

  return (
    <div>
      <Label>{label} {required && '*'}</Label>

      {/* Show current value if it's not in dropdown */}
      {value && !valueExistsInOptions && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <span className="text-blue-700">Current: {value}</span>
          <span className="text-blue-500 ml-2">(Not in dropdown)</span>
        </div>
      )}

      <Select
        value={selectValue}
        onValueChange={(selectedValue) => {
          if (selectedValue === 'add_new') {
            setShowAdd(true);
          } else if (selectedValue && selectedValue !== '') {
            // Only update if we have a real non-empty value
            onValueChange(selectedValue === 'N/A' ? '' : selectedValue);
            setSearchTerm('');
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={value || placeholder || `Select ${label.toLowerCase()}`} />
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
              <div key={option} className="relative flex items-center">
                <SelectItem value={option} className="flex-1 pr-8">
                  <span className="truncate block max-w-[200px] text-sm">{option}</span>
                </SelectItem>
                {option && onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
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

