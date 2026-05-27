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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Check, EyeOff } from 'lucide-react';
import { DropdownService } from '@/services/dropdownService';
import { useToast } from '@/hooks/use-toast';
import { uploadImageToR2 } from '@/services/imageService';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import ColorSwatch from '@/components/ui/ColorSwatch';
import type { DropdownOption } from '@/types/dropdown';

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
  onAdd?: (value: string) => Promise<void>;
  reloadDropdowns?: () => Promise<void>;
  touchedFields?: Set<string>;
  markFieldTouched?: (fieldName: string) => void;
  fieldName?: string;
  // Inline management
  fullOptions?: DropdownOption[];
  usageMap?: Record<string, boolean>;
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
  onAdd,
  reloadDropdowns,
  markFieldTouched,
  fieldName,
  fullOptions,
  usageMap,
}: ProductDropdownFieldProps) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newInput, setNewInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [patternImageFile, setPatternImageFile] = useState<File | null>(null);
  const [patternImagePreview, setPatternImagePreview] = useState('');
  const [uploadingPatternImage, setUploadingPatternImage] = useState(false);
  const [newColorCode, setNewColorCode] = useState('#2563eb');
  const [selectOpen, setSelectOpen] = useState(false);
  const [togglingOption, setTogglingOption] = useState<DropdownOption | null>(null);
  const [deletingOption, setDeletingOption] = useState<DropdownOption | null>(null);

  const filteredOptions = searchable
    ? options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

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

  const findFullOption = (val: string): DropdownOption | undefined =>
    fullOptions?.find((o) => o.value === val);

  const isUsed = (val: string): boolean =>
    usageMap?.[`${category}:${val}`] === true;

  const handleToggleClick = (e: React.MouseEvent, opt: DropdownOption) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectOpen(false);
    setTogglingOption(opt);
  };

  const handleDeleteClick = (e: React.MouseEvent, opt: DropdownOption) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectOpen(false);
    setDeletingOption(opt);
  };

  const confirmToggle = async () => {
    if (!togglingOption) return;
    try {
      await DropdownService.toggleActive(togglingOption.id || togglingOption._id);
      if (reloadDropdowns) await reloadDropdowns();
      toast({ title: 'Success', description: `"${togglingOption.value}" ${togglingOption.is_active ? 'deactivated' : 'activated'}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle option', variant: 'destructive' });
    }
    setTogglingOption(null);
  };

  const confirmDelete = async () => {
    if (!deletingOption) return;
    try {
      await DropdownService.deleteDropdown(deletingOption.id || deletingOption._id);
      if (reloadDropdowns) await reloadDropdowns();
      toast({ title: 'Success', description: `"${deletingOption.value}" deleted` });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete option', variant: 'destructive' });
    }
    setDeletingOption(null);
  };

  const handleAdd = async () => {
    if (!newInput.trim()) return;
    try {
      let imageUrl: string | undefined = undefined;
      if (category.toLowerCase() === 'pattern' && patternImageFile) {
        setUploadingPatternImage(true);
        const uploadResult = await uploadImageToR2(patternImageFile, 'dropdowns');
        if (uploadResult.error || !uploadResult.url) {
          toast({ title: 'Error', description: uploadResult.error || 'Failed to upload pattern image', variant: 'destructive' });
          setUploadingPatternImage(false);
          return;
        }
        imageUrl = uploadResult.url;
      }
      const colorCodeToSave = category.toLowerCase() === 'color' ? newColorCode : undefined;

      if (onAdd) {
        await onAdd(newInput.trim());
      } else {
        const result = await DropdownService.addOption(category, newInput.trim(), undefined, imageUrl, colorCodeToSave);
        if (result.success && reloadDropdowns) await reloadDropdowns();
      }
      onValueChange(newInput.trim());
      setNewInput('');
      setPatternImageFile(null);
      setPatternImagePreview('');
      setNewColorCode('#2563eb');
      setShowAdd(false);
      setUploadingPatternImage(false);
      toast({ title: 'Success', description: `New ${label.toLowerCase()} "${newInput.trim()}" added successfully` });
    } catch (err) {
      console.error(`Failed to add ${category}:`, err);
      toast({ title: 'Error', description: `Failed to add ${label.toLowerCase()}`, variant: 'destructive' });
      setUploadingPatternImage(false);
    }
  };

  const validationRules = getValidationRules(category);

  const handleInputChange = (inputValue: string) => {
    let val = inputValue;
    const words = val.split(/\s+/).filter(w => w.length > 0);
    if (words.length > validationRules.maxWords) {
      let wordCount = 0;
      let pos = val.length;
      for (let i = 0; i < val.length; i++) {
        if (val[i] !== ' ' && (i === 0 || val[i - 1] === ' ')) {
          wordCount++;
          if (wordCount === validationRules.maxWords) {
            let endPos = i;
            while (endPos < val.length && val[endPos] !== ' ') endPos++;
            pos = endPos;
            break;
          }
        }
      }
      val = val.substring(0, pos);
    }
    const parts = val.split(/(\s+)/);
    val = parts.map(part => {
      if (/^\s+$/.test(part)) return part;
      if (part.trim().length > 0) return part.length > validationRules.maxCharsPerWord ? part.slice(0, validationRules.maxCharsPerWord) : part;
      return part;
    }).join('');
    setNewInput(val);
  };

  const hasManagement = !!fullOptions && fullOptions.length > 0;

  // Check if current value exists in options
  const valueExistsInOptions = value && options.includes(value);
  const isNAValue = value === 'N/A' || value === 'NA';
  const selectValue = valueExistsInOptions || isNAValue ? value : (value === '' && allowNA ? 'N/A' : '');

  const dialogs = (
    <>
      <AlertDialog open={!!togglingOption} onOpenChange={(open) => !open && setTogglingOption(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{togglingOption?.is_active ? 'Deactivate Option' : 'Activate Option'}</AlertDialogTitle>
            <AlertDialogDescription>
              {togglingOption?.is_active
                ? `Deactivate "${togglingOption?.value}"? It will be hidden from dropdowns but existing records keep it.`
                : `Activate "${togglingOption?.value}"? It will become available in dropdowns again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggle}
              className={togglingOption?.is_active ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
            >
              {togglingOption?.is_active ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingOption} onOpenChange={(open) => !open && setDeletingOption(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Option</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deletingOption?.value}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

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
                    if (!file) { setPatternImagePreview(''); return; }
                    const reader = new FileReader();
                    reader.onload = (event) => setPatternImagePreview((event.target?.result as string) || '');
                    reader.readAsDataURL(file);
                  }}
                />
                {patternImagePreview ? (
                  <img src={patternImagePreview} alt="Pattern preview" className="w-10 h-10 rounded object-cover border border-gray-200 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded border border-dashed border-slate-300 text-[10px] text-slate-400 flex items-center justify-center shrink-0">Preview</div>
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
                  <HexColorInput color={newColorCode} onChange={setNewColorCode} prefixed className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-2 text-sm uppercase" />
                </div>
              </div>
            </div>
          )}
        </div>
        {dialogs}
      </div>
    );
  }

  return (
    <div>
      <Label>{label} {required && '*'}</Label>

      {value && !valueExistsInOptions && !isNAValue && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <span className="text-blue-700">Current: {value}</span>
          <span className="text-blue-500 ml-2">(Not in dropdown)</span>
        </div>
      )}

      <Select
        open={selectOpen}
        onOpenChange={(open) => {
          setSelectOpen(open);
          if (!open && markFieldTouched && fieldName) markFieldTouched(fieldName);
        }}
        value={selectValue}
        onValueChange={(selectedValue) => {
          if (selectedValue === 'add_new') {
            setShowAdd(true);
            setSelectOpen(false);
          } else {
            onValueChange(selectedValue);
            setSearchTerm('');
            setSelectOpen(false);
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
            .map((option) => {
              const fullOpt = findFullOption(option);
              const used = isUsed(option);
              return (
                <div key={option} className="relative flex items-center group">
                  <SelectItem value={option} className={`flex-1 ${hasManagement ? 'pr-14' : 'pr-8'}`}>
                    <div className="flex items-center gap-2">
                      {category.toLowerCase() === 'pattern' && optionImages[option] && (
                        <img src={optionImages[option]} alt={option} className="w-8 h-8 rounded-md object-cover border border-gray-300" />
                      )}
                      {category.toLowerCase() === 'color' && optionColors[option] && (
                        <ColorSwatch colorCode={optionColors[option]} />
                      )}
                      <span className="truncate block max-w-[200px] text-sm">{option}</span>
                    </div>
                  </SelectItem>
                  {hasManagement && fullOpt && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10 transition-opacity">
                      <button
                        type="button"
                        title={fullOpt.is_active ? 'Deactivate' : 'Activate'}
                        className="p-1 rounded hover:bg-gray-100"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleToggleClick(e, fullOpt)}
                      >
                        {fullOpt.is_active
                          ? <Check className="w-3 h-3 text-green-600" />
                          : <EyeOff className="w-3 h-3 text-gray-400" />}
                      </button>
                      {!used && (
                        <button
                          type="button"
                          title="Delete"
                          className="p-1 rounded hover:bg-red-50"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => handleDeleteClick(e, fullOpt)}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          {searchable && filteredOptions.filter(o => o && o.trim() !== '' && o !== 'NA' && o !== 'N/A').length === 0 && searchTerm && (
            <div
              className="px-3 py-2 text-sm text-primary-600 font-medium cursor-pointer hover:bg-primary-50 flex items-center gap-1.5"
              onClick={() => { setNewInput(searchTerm); setShowAdd(true); setSearchTerm(''); setSelectOpen(false); }}
            >
              + Add &quot;{searchTerm}&quot; as new {label.toLowerCase()}
            </div>
          )}
        </SelectContent>
      </Select>
      {dialogs}
    </div>
  );
}
