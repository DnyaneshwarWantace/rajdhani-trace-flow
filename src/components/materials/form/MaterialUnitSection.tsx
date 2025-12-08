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
                  <SelectItem key={u} value={u}>
                    <div className="flex items-center justify-between w-full">
                      <span>{u}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeleteUnit(u);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </SelectItem>
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
          <div className="flex gap-2">
            <Input
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder="Enter new unit"
              className="flex-1"
            />
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
        )}
      </div>
    </div>
  );
});

MaterialUnitSection.displayName = 'MaterialUnitSection';

export default MaterialUnitSection;

