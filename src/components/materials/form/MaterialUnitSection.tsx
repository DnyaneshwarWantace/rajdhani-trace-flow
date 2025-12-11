import { useState, forwardRef } from 'react';
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
import { Plus, Trash2 } from 'lucide-react';
import { DropdownService } from '@/services/dropdownService';
import { useToast } from '@/hooks/use-toast';

interface MaterialUnitSectionProps {
  unit: string;
  units: string[];
  onUnitChange: (value: string) => void;
  onUnitsReload: () => void;
  hasError?: boolean;
}

const MaterialUnitSection = forwardRef<HTMLButtonElement, MaterialUnitSectionProps>(
  ({ unit, units, onUnitChange, onUnitsReload, hasError = false }, ref) => {
  const { toast } = useToast();
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  // Handler for unit name (max 2 words, max 10 chars per word)
  const handleUnitNameChange = (value: string) => {
    let inputValue = value;

    // Split by spaces to get words
    const words = inputValue.split(/\s+/).filter(w => w.length > 0);

    // Limit to 2 words
    if (words.length > 2) {
      let wordCount = 0;
      let pos = inputValue.length;
      for (let i = 0; i < inputValue.length; i++) {
        if (inputValue[i] !== ' ' && (i === 0 || inputValue[i - 1] === ' ')) {
          wordCount++;
          if (wordCount === 2) {
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

    // Limit each word to 10 characters
    const parts = inputValue.split(/(\s+)/);
    const processedParts = parts.map(part => {
      if (/^\s+$/.test(part)) {
        return part;
      } else if (part.trim().length > 0) {
        return part.length > 10 ? part.slice(0, 10) : part;
      }
      return part;
    });

    inputValue = processedParts.join('');
    setNewUnitName(inputValue);
  };

  // Count words for display
  const wordCount = newUnitName.trim().split(/\s+/).filter(w => w.length > 0).length;

  const handleAddUnit = async () => {
    if (!newUnitName.trim() || units.includes(newUnitName.trim())) {
      return;
    }

    try {
      const result = await DropdownService.addOption(
        'material_unit',
        newUnitName.trim(),
        units.length + 1
      );

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add unit',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Unit Added',
        description: `"${newUnitName.trim()}" has been added.`,
      });

      onUnitChange(newUnitName.trim());
      setNewUnitName('');
      setShowAddUnit(false);
      onUnitsReload();
    } catch (error) {
      console.error('Error adding unit:', error);
      toast({
        title: 'Error',
        description: 'Failed to add unit',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUnit = async (unitToDelete: string) => {
    try {
      const { getApiUrl } = await import('@/utils/apiConfig');
      const API_URL = getApiUrl();
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
      const allDropdowns = result.success && Array.isArray(result.data) ? result.data : (Array.isArray(result.data) ? result.data : []);
      const option = allDropdowns.find((opt: any) => opt.category === 'material_unit' && opt.value === unitToDelete);
      
      if (option && option._id) {
        await DropdownService.deleteDropdown(option._id);
        toast({
          title: 'Unit Deleted',
          description: `"${unitToDelete}" has been deleted.`,
        });
        if (unit === unitToDelete) {
          onUnitChange('');
        }
        onUnitsReload();
      } else {
        toast({
          title: 'Error',
          description: 'Unit option not found',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete unit',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <Label htmlFor="unit">Unit *</Label>
      <div className="space-y-2">
        <Select
          value={unit || ''}
          onValueChange={(value) => {
            if (value === 'add_new') {
              setShowAddUnit(true);
            } else {
              onUnitChange(value);
            }
          }}
        >
          <SelectTrigger 
            ref={ref}
            id="unit"
            className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          >
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            {units.length > 0 ? (
              units
                .filter((u) => u && u.trim() !== '')
                .map((u) => (
                  <div key={u} className="relative flex items-center">
                    <SelectItem value={u} className="flex-1">
                      {u}
                    </SelectItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDeleteUnit(u);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
            ) : (
              <SelectItem value="no_units" disabled>
                No units available
              </SelectItem>
            )}
            <SelectItem value="add_new" className="text-primary-600 font-medium">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New Unit
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {showAddUnit && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={newUnitName}
                  onChange={(e) => handleUnitNameChange(e.target.value)}
                  placeholder="Enter new unit"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {wordCount}/2 words • Max 10 characters per word
                </p>
              </div>
              <Button type="button" size="sm" onClick={handleAddUnit}>
                Add
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
          </div>
        )}
      </div>
    </div>
  );
});

MaterialUnitSection.displayName = 'MaterialUnitSection';

export default MaterialUnitSection;

