import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Plus, Trash2, Check, EyeOff } from 'lucide-react';
import { DropdownService } from '@/services/dropdownService';
import { useToast } from '@/hooks/use-toast';
import { validateNumberInput, ValidationPresets, preventInvalidNumberKeys } from '@/utils/numberValidation';
import { normalizeUnit, displayUnit } from '@/utils/unitConverter';
import type { DropdownOption } from '@/types/dropdown';

interface ValueUnitDropdownFieldProps {
  label: string;
  value: string; // The numeric value (e.g., "5")
  unit: string; // The unit (e.g., "m")
  combinedValues: string[]; // Combined values from dropdown (e.g., ["5 m", "10 feet"])
  unitOptions: string[]; // Available units (e.g., ["m", "feet", "cm"])
  category: 'length' | 'width' | 'weight'; // Category for dropdown
  placeholder?: string;
  required?: boolean;
  description?: string;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  onCombinedChange?: (value: string, unit: string) => void;
  onReload: () => Promise<void>;
  markFieldTouched?: (fieldName: string) => void;
  fieldName?: string;
  // Inline management
  fullOptions?: DropdownOption[];
  usageMap?: Record<string, boolean>;
}

// Display a combined value with human label, e.g. "5 m" → "5 Meter"
const displayCombined = (combinedValue: string): string => {
  if (!combinedValue) return combinedValue;
  const match = combinedValue.trim().match(/^([\d.]+)\s+(.+)$/);
  if (match) return `${match[1]} ${displayUnit(match[2].trim())}`;
  return combinedValue;
};

// Parse combined value like "5 m" into { value: "5", unit: "m" }
const parseValueWithUnit = (combinedValue: string): { value: string; unit: string } => {
  if (!combinedValue) return { value: '', unit: '' };
  
  // Try to match pattern like "5 m" or "10 feet"
  const match = combinedValue.trim().match(/^([\d.]+)\s+(.+)$/);
  if (match) {
    return {
      value: match[1],
      unit: match[2].trim(),
    };
  }
  
  // If no match, return as value only
  return { value: combinedValue, unit: '' };
};

export default function ValueUnitDropdownField({
  label,
  value,
  unit,
  combinedValues,
  unitOptions,
  category,
  placeholder,
  required = false,
  description,
  onValueChange,
  onUnitChange,
  onCombinedChange,
  onReload,
  markFieldTouched,
  fieldName,
  fullOptions,
  usageMap,
}: ValueUnitDropdownFieldProps) {
  const { toast } = useToast();
  const [showAddNew, setShowAddNew] = useState(false);
  const [newValueInput, setNewValueInput] = useState('');
  const [newUnitInput, setNewUnitInput] = useState('');
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectOpen, setSelectOpen] = useState(false);
  const [togglingOption, setTogglingOption] = useState<DropdownOption | null>(null);
  const [deletingOption, setDeletingOption] = useState<DropdownOption | null>(null);

  // Get current combined value for display
  // Ensure value is properly formatted (convert number to string if needed)
  const displayValue = value !== null && value !== undefined && value !== '' ? String(value) : '';
  const currentCombinedValue = displayValue && unit ? `${displayValue} ${unit}`.trim() : '';

  // Filter combined values based on search and remove N/A values for required fields
  const filteredValues = combinedValues
    .filter((val) => {
      // Remove N/A values if field is required
      if (required) {
        const normalized = val.trim().toLowerCase();
        // Remove any variations of N/A: "N/A", "N/A (No Width)", "n/a", etc.
        if (normalized === 'n/a' || 
            normalized.startsWith('n/a ') || 
            normalized.includes('(no ') ||
            normalized.includes('n/a (no')) {
          return false;
        }
      }
      return val.toLowerCase().includes(searchTerm.toLowerCase());
    });

  // Handle selecting from dropdown
  const handleSelectChange = (selectedValue: string) => {
    // Don't process empty string selections - this happens when value is not in dropdown
    if (!selectedValue || selectedValue === '') {
      return;
    }

    if (selectedValue === 'add_new') {
      setShowAddNew(true);
      setNewValueInput('');
      setNewUnitInput('');
    } else if (selectedValue === 'N/A') {
      if (onCombinedChange) {
        onCombinedChange('', '');
      } else {
        onValueChange('');
        onUnitChange('');
      }
      setSearchTerm('');
    } else {
      const parsed = parseValueWithUnit(selectedValue);
      const normalizedUnit = parsed.unit ? normalizeUnit(parsed.unit) : '';
      if (onCombinedChange) {
        onCombinedChange(parsed.value || '', normalizedUnit);
      } else {
        onValueChange(parsed.value || '');
        onUnitChange(normalizedUnit);
      }
      setSearchTerm('');
    }
  };

  // Add new combined value to dropdown
  const handleAddNew = async () => {
    if (!newValueInput.trim() || !newUnitInput.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both value and unit',
        variant: 'destructive',
      });
      return;
    }

    try {
      const normalizedNewUnit = normalizeUnit(newUnitInput.trim());
      const combinedValue = `${newValueInput.trim()} ${normalizedNewUnit}`;

      // If unit is new, add it to unit dropdown first
      if (!unitOptions.includes(normalizedNewUnit)) {
        const unitCategory = category === 'length' ? 'length_units' : category === 'width' ? 'width_units' : 'weight_units';
        const result = await DropdownService.addOption(unitCategory, normalizedNewUnit);

        if (category === 'length' || category === 'width') {
          // Also add to singular category for backend validation
          const singularCategory = category === 'length' ? 'length_unit' : 'width_unit';
          await DropdownService.addOption(singularCategory, normalizedNewUnit);
        }

        if (!result.success) {
          toast({
            title: 'Error',
            description: result.error || 'Failed to add unit',
            variant: 'destructive',
          });
          return;
        }
      }

      // Add combined value to dropdown
      const result = await DropdownService.addOption(category, combinedValue);
      if (result.success) {
        await onReload();
        // Set the values in the form
        onValueChange(newValueInput.trim());
        onUnitChange(normalizedNewUnit);
        setShowAddNew(false);
        setNewValueInput('');
        setNewUnitInput('');
        toast({
          title: 'Success',
          description: `${label} added successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add value',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding new value:', error);
      toast({
        title: 'Error',
        description: 'Failed to add value',
        variant: 'destructive',
      });
    }
  };

  // Add new unit
  const handleAddUnit = async () => {
    if (!newUnitName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a unit name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const normalizedName = normalizeUnit(newUnitName.trim());
      const unitCategory = category === 'length' ? 'length_units' : category === 'width' ? 'width_units' : 'weight_units';
      const result = await DropdownService.addOption(unitCategory, normalizedName);

      if (category === 'length' || category === 'width') {
        // Also add to singular category for backend validation
        const singularCategory = category === 'length' ? 'length_unit' : 'width_unit';
        await DropdownService.addOption(singularCategory, normalizedName);
      }

      if (result.success) {
        await onReload();
        setNewUnitInput(normalizedName);
        setNewUnitName('');
        setShowAddUnit(false);
        toast({
          title: 'Success',
          description: 'Unit added successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add unit',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding unit:', error);
      toast({
        title: 'Error',
        description: 'Failed to add unit',
        variant: 'destructive',
      });
    }
  };

  if (showAddNew) {
    return (
      <div>
        <Label>
          {label} {required && '*'}
        </Label>
        {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              value={newValueInput}
              onChange={(e) => {
                const validation = validateNumberInput(e.target.value, ValidationPresets.DIMENSION);
                setNewValueInput(validation.value);
              }}
              onKeyDown={(e) => preventInvalidNumberKeys(e)}
              placeholder={placeholder || 'e.g., 5'}
              min="0"
              max="9999.99"
              step="0.01"
              className="flex-1"
            />
            <div className="flex gap-2 flex-1">
              <Select
                value={newUnitInput}
                onValueChange={(selectedUnit) => {
                  if (selectedUnit === 'add_new_unit') {
                    setShowAddUnit(true);
                  } else {
                    setNewUnitInput(normalizeUnit(selectedUnit));
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select unit *">
                    {newUnitInput ? displayUnit(newUnitInput) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add_new_unit" className="text-primary-600 font-medium">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add New Unit
                    </div>
                  </SelectItem>
                  {unitOptions.length > 0 ? (
                    unitOptions
                      .filter((opt) => opt && opt.trim() !== '')
                      .map((unitOption) => (
                        <SelectItem key={unitOption} value={unitOption}>
                          {displayUnit(unitOption)}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="no_units" disabled>
                      No units available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {showAddUnit && (
            <div className="flex gap-2">
              <Input
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                placeholder="e.g., Meter, Feet, cm, Inches, Yards"
                list="unit-suggestions"
                className="flex-1"
              />
              <datalist id="unit-suggestions">
                <option value="Meter" />
                <option value="Feet" />
                <option value="cm" />
                <option value="Inches" />
                <option value="Yards" />
                <option value="mm" />
              </datalist>
              <Button type="button" size="sm" onClick={handleAddUnit} className="bg-primary-600 hover:bg-primary-700 text-white">
                Add Unit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddUnit(false);
                  setNewUnitName('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAddNew}
              disabled={!newValueInput.trim() || !newUnitInput.trim()}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Add {newValueInput || 'value'} {newUnitInput ? displayUnit(newUnitInput) : 'unit'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAddNew(false);
                setNewValueInput('');
                setNewUnitInput('');
                setShowAddUnit(false);
                setNewUnitName('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
      await onReload();
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
      await onReload();
      toast({ title: 'Success', description: `"${deletingOption.value}" deleted` });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete option', variant: 'destructive' });
    }
    setDeletingOption(null);
  };

  const hasManagement = !!fullOptions && fullOptions.length > 0;

  // Match by normalizing both stored value and current value before comparing
  const normalizedCurrentDisplay = displayCombined(currentCombinedValue).trim().toLowerCase();
  const valueExistsInDropdown = currentCombinedValue && combinedValues.some(
    val => displayCombined(val).trim().toLowerCase() === normalizedCurrentDisplay
  );
  const exactMatch = combinedValues.find(
    val => displayCombined(val).trim().toLowerCase() === normalizedCurrentDisplay
  );

  const selectValue = valueExistsInDropdown && exactMatch ? exactMatch : '';

  return (
    <div>
      <Label>
        {label} {required && '*'}
      </Label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}

      {currentCombinedValue && !valueExistsInDropdown && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <span className="text-blue-700">Current: {displayCombined(currentCombinedValue)}</span>
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
          handleSelectChange(selectedValue);
          if (selectedValue !== 'add_new') setSelectOpen(false);
          else setSelectOpen(false);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={displayCombined(currentCombinedValue) || `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 border-b">
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <SelectItem value="add_new" className="text-primary-600 font-medium pr-10 pl-7 text-left">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New {label}
            </div>
          </SelectItem>

          {filteredValues.length > 0 ? (
            filteredValues.map((combinedValue) => {
              const fullOpt = findFullOption(combinedValue);
              const used = isUsed(combinedValue);
              return (
                <div key={combinedValue} className="relative flex items-center group">
                  <SelectItem value={combinedValue} className={`flex-1 ${hasManagement ? 'pr-14' : ''}`}>
                    <span className="truncate block max-w-[200px] text-sm">{displayCombined(combinedValue)}</span>
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
            })
          ) : (
            <div className="p-2 text-sm text-gray-500 text-center">
              {searchTerm ? `No ${label.toLowerCase()} found matching "${searchTerm}"` : `No ${label.toLowerCase()} available`}
            </div>
          )}
        </SelectContent>
      </Select>

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
            <AlertDialogDescription>Delete &quot;{deletingOption?.value}&quot;? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

