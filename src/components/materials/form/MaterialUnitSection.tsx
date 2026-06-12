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
import { MobileOptionSheet, MobileSelectTrigger } from '@/components/ui/MobileOptionSheet';
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
import type { DropdownOption } from '@/types/dropdown';

interface MaterialUnitSectionProps {
  unit: string;
  units: string[];
  onUnitChange: (value: string) => void;
  onUnitsReload: () => void;
  hasError?: boolean;
  touchedFields?: Set<string>;
  markFieldTouched?: (fieldName: string) => void;
  fullOptions?: DropdownOption[];
  usageMap?: Record<string, boolean>;
}

const MaterialUnitSection = forwardRef<HTMLButtonElement, MaterialUnitSectionProps>(
  ({ unit, units, onUnitChange, onUnitsReload, hasError = false, touchedFields = new Set(), markFieldTouched = () => {}, fullOptions, usageMap }, ref) => {
  const { toast } = useToast();
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [selectOpen, setSelectOpen] = useState(false);
  const [togglingOption, setTogglingOption] = useState<DropdownOption | null>(null);
  const [deletingOption, setDeletingOption] = useState<DropdownOption | null>(null);

  const findFullOption = (val: string): DropdownOption | undefined =>
    fullOptions?.find((o) => o.value === val);
  const isUsed = (val: string): boolean =>
    usageMap?.[`material_unit:${val}`] === true;
  const hasManagement = !!fullOptions && fullOptions.length > 0;

  const handleToggleClick = (e: React.MouseEvent, opt: DropdownOption) => {
    e.stopPropagation(); e.preventDefault();
    setSelectOpen(false); setTogglingOption(opt);
  };
  const handleInstantToggle = async (opt: DropdownOption) => {
    try {
      await DropdownService.toggleActive(opt.id || opt._id);
      onUnitsReload();
    } catch { toast({ title: 'Error', description: 'Failed to toggle', variant: 'destructive' }); }
  };
  const handleDeleteClick = (e: React.MouseEvent, opt: DropdownOption) => {
    e.stopPropagation(); e.preventDefault();
    setSelectOpen(false); setDeletingOption(opt);
  };
  const confirmToggle = async () => {
    if (!togglingOption) return;
    try {
      await DropdownService.toggleActive(togglingOption.id || togglingOption._id);
      onUnitsReload();
      toast({ title: 'Success', description: `"${togglingOption.value}" ${togglingOption.is_active ? 'deactivated' : 'activated'}` });
    } catch { toast({ title: 'Error', description: 'Failed to toggle', variant: 'destructive' }); }
    setTogglingOption(null);
  };
  const confirmDelete = async () => {
    if (!deletingOption) return;
    try {
      await DropdownService.deleteDropdown(deletingOption.id || deletingOption._id);
      onUnitsReload();
      toast({ title: 'Success', description: `"${deletingOption.value}" deleted` });
    } catch { toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' }); }
    setDeletingOption(null);
  };

  // Handler for unit name: letters and spaces only (no numbers/special chars), max 2 words, max 10 chars per word
  const handleUnitNameChange = (value: string) => {
    // Allow only letters (a-z, A-Z) and spaces
    let inputValue = value.replace(/[^a-zA-Z\s]/g, '');

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

  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const hasFieldError = hasError || (touchedFields.has('unit') && !unit.trim());

  return (
    <div>
      <Label htmlFor="unit">Unit *</Label>
      <div className="space-y-2">

        {/* Mobile: bottom sheet */}
        <div className="lg:hidden">
          <MobileSelectTrigger
            value={unit}
            placeholder="Select unit"
            hasError={hasFieldError}
            onClick={() => setMobileSheetOpen(true)}
          />
          <MobileOptionSheet
            open={mobileSheetOpen}
            onClose={() => { setMobileSheetOpen(false); markFieldTouched('unit'); }}
            title="Unit"
            options={(fullOptions && fullOptions.length > 0 ? fullOptions : units.map(u => ({ value: u }))).map(o => {
              const fo = fullOptions?.find(f => f.value === (typeof o === 'string' ? o : o.value));
              const val = typeof o === 'string' ? o : o.value;
              return { value: val, label: val, isActive: fo ? fo.is_active !== false : true, id: fo?.id || fo?._id, isUsed: isUsed(val) };
            })}
            selected={unit}
            onSelect={(val) => { onUnitChange(val); markFieldTouched('unit'); }}
            onAddNew={() => setShowAddUnit(true)}
            onToggleActive={(opt) => {
              const fo = fullOptions?.find(f => f.value === opt.value);
              if (fo) handleInstantToggle(fo);
            }}
            onDelete={(opt) => {
              const fo = fullOptions?.find(f => f.value === opt.value);
              if (fo) { const e = { stopPropagation: () => {}, preventDefault: () => {} } as any; handleDeleteClick(e, fo); }
            }}
          />
          {showAddUnit && (
            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input value={newUnitName} onChange={(e) => handleUnitNameChange(e.target.value)} placeholder="New unit name" className="h-10 rounded-xl" />
                  <p className="text-xs text-gray-400 mt-1">{wordCount}/2 words • Max 10 chars per word</p>
                </div>
                <Button type="button" size="sm" onClick={handleAddUnit}>Add</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddUnit(false); setNewUnitName(''); }}>✕</Button>
              </div>
            </div>
          )}
          {touchedFields.has('unit') && !unit.trim() && <p className="text-xs text-red-500 mt-1">Unit is required</p>}
        </div>

        {/* Desktop: Radix Select */}
        <div className="hidden lg:block">
          <Select
            open={selectOpen}
            onOpenChange={(open) => { setSelectOpen(open); if (!open) markFieldTouched('unit'); }}
            value={unit || ''}
            onValueChange={(value) => {
              if (value === 'add_new') { setShowAddUnit(true); setSelectOpen(false); }
              else { onUnitChange(value); markFieldTouched('unit'); setSelectOpen(false); }
            }}
          >
            <SelectTrigger ref={ref} id="unit" className={hasFieldError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {(fullOptions && fullOptions.length > 0 ? fullOptions : units.filter((u) => u && u.trim() !== '').map((u) => ({ value: u, is_active: true } as DropdownOption))).length > 0 ? (
                (fullOptions && fullOptions.length > 0 ? fullOptions : units.filter((u) => u && u.trim() !== '').map((u) => ({ value: u, is_active: true } as DropdownOption))).map((opt) => {
                  const u = opt.value;
                  const isInactive = opt.is_active === false;
                  const fullOpt = isInactive ? opt : (findFullOption(u) ?? opt);
                  const used = isUsed(u);
                  return (
                    <div key={u} className="relative flex items-center group">
                      <SelectItem
                        value={u}
                        disabled={isInactive}
                        className={`flex-1 ${hasManagement ? 'pr-14' : ''} ${isInactive ? 'text-gray-400' : ''}`}
                      >
                        {isInactive ? `${u} (Inactive)` : u}
                      </SelectItem>
                      {hasManagement && fullOpt && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10">
                          <button type="button" className="p-1 rounded hover:bg-gray-100" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => handleToggleClick(e, fullOpt)}>
                            {fullOpt.is_active ? <Check className="w-3 h-3 text-green-600" /> : <EyeOff className="w-3 h-3 text-gray-400" />}
                          </button>
                          {!used && (
                            <button type="button" className="p-1 rounded hover:bg-red-50" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => handleDeleteClick(e, fullOpt)}>
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <SelectItem value="no_units" disabled>No units available</SelectItem>
              )}
              <SelectItem value="add_new" className="text-primary-600 font-medium">
                <div className="flex items-center gap-2"><Plus className="w-4 h-4" />Add New Unit</div>
              </SelectItem>
            </SelectContent>
          </Select>
          {touchedFields.has('unit') && !unit.trim() && <p className="text-xs text-red-500 mt-1">Unit is required</p>}
          {showAddUnit && (
            <div className="space-y-2 mt-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input value={newUnitName} onChange={(e) => handleUnitNameChange(e.target.value)} placeholder="Enter new unit" />
                  <p className="text-xs text-muted-foreground mt-1">{wordCount}/2 words • Max 10 characters per word</p>
                </div>
                <Button type="button" size="sm" onClick={handleAddUnit}>Add</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddUnit(false); setNewUnitName(''); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!togglingOption} onOpenChange={(open) => !open && setTogglingOption(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{togglingOption?.is_active ? 'Deactivate Option' : 'Activate Option'}</AlertDialogTitle>
            <AlertDialogDescription>
              {togglingOption?.is_active
                ? `Deactivate "${togglingOption?.value}"? It will be hidden from dropdowns but existing records keep it.`
                : `Activate "${togglingOption?.value}"? It will become available again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle} className={togglingOption?.is_active ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}>
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
});

MaterialUnitSection.displayName = 'MaterialUnitSection';

export default MaterialUnitSection;

