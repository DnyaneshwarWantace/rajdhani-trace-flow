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
import { Trash2, Plus } from 'lucide-react';
import { DropdownService } from '@/services/dropdownService';
import { useToast } from '@/hooks/use-toast';

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
  onReload: () => Promise<void>;
}

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
  onReload,
}: ValueUnitDropdownFieldProps) {
  const { toast } = useToast();
  const [showAddNew, setShowAddNew] = useState(false);
  const [newValueInput, setNewValueInput] = useState('');
  const [newUnitInput, setNewUnitInput] = useState('');
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Get current combined value for display
  const currentCombinedValue = value && unit ? `${value} ${unit}`.trim() : '';

  // Filter combined values based on search
  const filteredValues = combinedValues.filter((val) =>
    val.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle selecting from dropdown
  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === 'add_new') {
      setShowAddNew(true);
      setNewValueInput('');
      setNewUnitInput('');
    } else if (selectedValue === 'N/A') {
      onValueChange('');
      onUnitChange('');
      setSearchTerm('');
    } else {
      const parsed = parseValueWithUnit(selectedValue);
      onValueChange(parsed.value);
      onUnitChange(parsed.unit);
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
      const combinedValue = `${newValueInput.trim()} ${newUnitInput.trim()}`;

      // If unit is new, add it to unit dropdown first
      if (!unitOptions.includes(newUnitInput.trim())) {
        const unitCategory = category === 'length' ? 'length_units' : category === 'width' ? 'width_units' : 'weight_units';
        const result = await DropdownService.addOption(unitCategory, newUnitInput.trim());
        
        if (category === 'length' || category === 'width') {
          // Also add to singular category for backend validation
          const singularCategory = category === 'length' ? 'length_unit' : 'width_unit';
          await DropdownService.addOption(singularCategory, newUnitInput.trim());
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
        onUnitChange(newUnitInput.trim());
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
      const unitCategory = category === 'length' ? 'length_units' : category === 'width' ? 'width_units' : 'weight_units';
      const result = await DropdownService.addOption(unitCategory, newUnitName.trim());
      
      if (category === 'length' || category === 'width') {
        // Also add to singular category for backend validation
        const singularCategory = category === 'length' ? 'length_unit' : 'width_unit';
        await DropdownService.addOption(singularCategory, newUnitName.trim());
      }

      if (result.success) {
        await onReload();
        setNewUnitInput(newUnitName.trim());
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

  // Delete combined value from dropdown
  const handleDelete = async (combinedValue: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_URL}/dropdowns`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dropdowns');
      }

      const result = await response.json();
      const allDropdowns = result.success && Array.isArray(result.data) 
        ? result.data 
        : (Array.isArray(result.data) ? result.data : []);
      
      const option = allDropdowns.find((opt: any) => opt.category === category && opt.value === combinedValue);
      
      if (option && option._id) {
        await DropdownService.deleteDropdown(option._id);
        await onReload();
        
        // If deleted value was selected, clear the form
        if (currentCombinedValue === combinedValue) {
          onValueChange('');
          onUnitChange('');
        }
        
        toast({
          title: 'Success',
          description: 'Value deleted successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Value not found',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting value:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete value',
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
              type="text"
              value={newValueInput}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) {
                  setNewValueInput(val);
                }
              }}
              placeholder={placeholder || 'e.g., 5'}
              className="flex-1"
            />
            <div className="flex gap-2 flex-1">
              <Select
                value={newUnitInput}
                onValueChange={(selectedUnit) => {
                  if (selectedUnit === 'add_new_unit') {
                    setShowAddUnit(true);
                  } else {
                    setNewUnitInput(selectedUnit);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select unit *" />
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
                          {unitOption}
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
                placeholder="Enter new unit (e.g., feet, m, cm)"
                className="flex-1"
              />
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
              Add {newValueInput || 'value'} {newUnitInput || 'unit'}
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

  return (
    <div>
      <Label>
        {label} {required && '*'}
      </Label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      <Select
        value={currentCombinedValue || undefined}
        onValueChange={handleSelectChange}
      >
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {/* Search Input */}
          <div className="p-2 border-b">
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Add New Option */}
          <SelectItem value="add_new" className="text-primary-600 font-medium">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New {label}
            </div>
          </SelectItem>

          {/* N/A Option */}
          <SelectItem value="N/A" className="text-gray-500 italic">
            N/A (No {label})
          </SelectItem>

          {/* Combined Values with Delete */}
          {filteredValues.length > 0 ? (
            filteredValues.map((combinedValue) => (
              <SelectItem key={combinedValue} value={combinedValue}>
                <div className="flex items-center justify-between w-full">
                  <span className="flex-1">{combinedValue}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDelete(combinedValue);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </SelectItem>
            ))
          ) : (
            <div className="p-2 text-sm text-gray-500 text-center">
              {searchTerm
                ? `No ${label.toLowerCase()} found matching "${searchTerm}"`
                : `No ${label.toLowerCase()} available`}
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

