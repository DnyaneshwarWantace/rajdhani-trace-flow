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
import { uploadImageToR2 } from '@/services/imageService';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import ColorSwatch from '@/components/ui/ColorSwatch';

interface ProductDropdownFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  options: string[];
  optionImages?: Record<string, string>;
  optionColors?: Record<string, string>;
  searchable?: boolean;
  allowNA?: boolean;
  required?: boolean;
  category: string;
  onValueChange: (value: string) => void;
  onDelete?: (value: string) => void;
  onAdd?: (value: string) => Promise<void>;
  reloadDropdowns?: () => Promise<void>;
  touchedFields?: Set<string>;
  markFieldTouched?: (fieldName: string) => void;
  fieldName?: string;
}

export default function ProductDropdownField({
  label,
  value,
  placeholder,
  options,
  optionImages = {},
  optionColors = {},
  searchable = true,
  allowNA = false,
  required = false,
  category,
  onValueChange,
  onDelete,
  onAdd,
  reloadDropdowns,
  markFieldTouched,
  fieldName,
}: ProductDropdownFieldProps) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newInput, setNewInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [patternImageFile, setPatternImageFile] = useState<File | null>(null);
  const [patternImagePreview, setPatternImagePreview] = useState('');
  const [uploadingPatternImage, setUploadingPatternImage] = useState(false);
  const [newColorCode, setNewColorCode] = useState('#2563eb');

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
      let imageUrl: string | undefined = undefined;
      if (category.toLowerCase() === 'pattern' && patternImageFile) {
        setUploadingPatternImage(true);
        const uploadResult = await uploadImageToR2(patternImageFile, 'dropdowns');
        if (uploadResult.error || !uploadResult.url) {
          toast({
            title: 'Error',
            description: uploadResult.error || 'Failed to upload pattern image',
            variant: 'destructive',
          });
          setUploadingPatternImage(false);
          return;
        }
        imageUrl = uploadResult.url;
      }
      const colorCodeToSave = category.toLowerCase() === 'color' ? newColorCode : undefined;

      if (onAdd) {
        await onAdd(newInput.trim());
      } else {
        const result = await DropdownService.addOption(
          category,
          newInput.trim(),
          undefined,
          imageUrl,
          colorCodeToSave
        );
        if (result.success && reloadDropdowns) {
          await reloadDropdowns();
        }
      }
      onValueChange(newInput.trim());
      setNewInput('');
      setPatternImageFile(null);
      setPatternImagePreview('');
      setNewColorCode('#2563eb');
      setShowAdd(false);
      setUploadingPatternImage(false);

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
      setUploadingPatternImage(false);
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
    const isPatternCategory = category.toLowerCase() === 'pattern';
    const isColorCategory = category.toLowerCase() === 'color';

    return (
      <div>
        <Label>{label} {required && '*'}</Label>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
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
            <Button size="sm" onClick={handleAdd} disabled={uploadingPatternImage} className="bg-primary-600 hover:bg-primary-700 text-white shrink-0">
            {uploadingPatternImage ? 'Uploading...' : 'Add'}
          </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="shrink-0">
            Cancel
          </Button>
        </div>
          {isPatternCategory && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <p className="text-xs font-medium text-slate-700 mb-1">Pattern Image (optional)</p>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  className="bg-white"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPatternImageFile(file);
                    if (!file) {
                      setPatternImagePreview('');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setPatternImagePreview((event.target?.result as string) || '');
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {patternImagePreview ? (
                  <img
                    src={patternImagePreview}
                    alt="Pattern preview"
                    className="w-10 h-10 rounded object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded border border-dashed border-slate-300 text-[10px] text-slate-400 flex items-center justify-center shrink-0">
                    Preview
                  </div>
                )}
              </div>
            </div>
          )}
          {isColorCategory && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <p className="text-xs font-medium text-slate-700 mb-1">Color Palette</p>
              <div className="space-y-2">
                <div className="rounded-md border border-slate-200 bg-white p-2">
                  <HexColorPicker color={newColorCode} onChange={setNewColorCode} className="!w-full" />
                </div>
                <div className="flex items-center gap-2">
                  <ColorSwatch colorCode={newColorCode} className="w-5 h-5 rounded-full" />
                  <HexColorInput
                    color={newColorCode}
                    onChange={setNewColorCode}
                    prefixed
                    className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-2 text-sm uppercase"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Check if current value exists in options
  const valueExistsInOptions = value && options.includes(value);
  
  // Check if value is N/A (either from options or as a special value)
  const isNAValue = value === 'N/A' || value === 'NA';

  // Use value only if it exists in options, otherwise use N/A for empty if allowNA
  const selectValue = valueExistsInOptions || isNAValue ? value : (value === '' && allowNA ? 'N/A' : '');

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
          } else {
            // Keep N/A as the value so it displays properly
            onValueChange(selectedValue);
            setSearchTerm('');
          }
        }}
        onOpenChange={(open) => {
          // When dropdown closes (open = false), mark field as touched
          if (!open && markFieldTouched && fieldName) {
            markFieldTouched(fieldName);
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
              <div key={option} className="relative flex items-center">
                <SelectItem value={option} className="flex-1 pr-8">
                  <div className="flex items-center gap-2">
                    {category.toLowerCase() === 'pattern' && optionImages[option] && (
                      <img
                        src={optionImages[option]}
                        alt={option}
                        className="w-8 h-8 rounded-md object-cover border border-gray-300"
                      />
                    )}
                    {category.toLowerCase() === 'color' && optionColors[option] && (
                      <ColorSwatch colorCode={optionColors[option]} />
                    )}
                    <span className="truncate block max-w-[200px] text-sm">{option}</span>
                  </div>
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

          {searchable && filteredOptions.filter(o => o && o.trim() !== '' && o !== 'NA' && o !== 'N/A').length === 0 && searchTerm && (
            <div
              className="px-3 py-2 text-sm text-primary-600 font-medium cursor-pointer hover:bg-primary-50 flex items-center gap-1.5"
              onClick={() => { setNewInput(searchTerm); setShowAdd(true); setSearchTerm(''); }}
            >
              + Add "{searchTerm}" as new {label.toLowerCase()}
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

