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
import ColorSwatch from '@/components/ui/ColorSwatch';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';
import type { DropdownOption } from '@/types/dropdown';

const CUSTOM_COLOR_VALUE = '__material_color_custom__';
const ADD_COLOR_VALUE = '__material_color_add_new__';

interface MaterialTypeSectionProps {
  type: string;
  color: string;
  types: string[];
  colors: string[];
  onTypeChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onTypesReload?: () => void;
  colorFallbackWhenBlank?: string;
  typeFullOptions?: DropdownOption[];
  usageMap?: Record<string, boolean>;
}

export default function MaterialTypeSection({
  type,
  color,
  types,
  colors,
  onTypeChange,
  onColorChange,
  onTypesReload,
  colorFallbackWhenBlank,
  typeFullOptions,
  usageMap,
}: MaterialTypeSectionProps) {
  const { toast } = useToast();
  const { colorCodeMap } = useDropdownVisualMaps();
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [selectOpen, setSelectOpen] = useState(false);
  const [togglingOption, setTogglingOption] = useState<DropdownOption | null>(null);
  const [deletingOption, setDeletingOption] = useState<DropdownOption | null>(null);

  const findFullOption = (val: string): DropdownOption | undefined =>
    typeFullOptions?.find((o) => o.value === val);
  const isUsed = (val: string): boolean =>
    usageMap?.[`material_type:${val}`] === true;
  const hasManagement = !!typeFullOptions && typeFullOptions.length > 0;

  const handleToggleClick = (e: React.MouseEvent, opt: DropdownOption) => {
    e.stopPropagation(); e.preventDefault();
    setSelectOpen(false); setTogglingOption(opt);
  };
  const handleDeleteClick = (e: React.MouseEvent, opt: DropdownOption) => {
    e.stopPropagation(); e.preventDefault();
    setSelectOpen(false); setDeletingOption(opt);
  };
  const confirmToggle = async () => {
    if (!togglingOption) return;
    try {
      await DropdownService.toggleActive(togglingOption.id || togglingOption._id);
      if (onTypesReload) onTypesReload();
      toast({ title: 'Success', description: `"${togglingOption.value}" ${togglingOption.is_active ? 'deactivated' : 'activated'}` });
    } catch { toast({ title: 'Error', description: 'Failed to toggle', variant: 'destructive' }); }
    setTogglingOption(null);
  };
  const confirmDelete = async () => {
    if (!deletingOption) return;
    try {
      await DropdownService.deleteDropdown(deletingOption.id || deletingOption._id);
      if (onTypesReload) onTypesReload();
      toast({ title: 'Success', description: `"${deletingOption.value}" deleted` });
    } catch { toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' }); }
    setDeletingOption(null);
  };
  const [showAddColor, setShowAddColor] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorCode, setNewColorCode] = useState('#2563eb');
  const [attachColorCode, setAttachColorCode] = useState(true);

  // Handler for type name (max 4 words, max 15 chars per word)
  const handleTypeNameChange = (value: string) => {
    let inputValue = value;
    const words = inputValue.split(/\s+/).filter(w => w.length > 0);

    // Limit to 4 words
    if (words.length > 4) {
      let wordCount = 0;
      let pos = inputValue.length;
      for (let i = 0; i < inputValue.length; i++) {
        if (inputValue[i] !== ' ' && (i === 0 || inputValue[i - 1] === ' ')) {
          wordCount++;
          if (wordCount === 4) {
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

    // Limit each word to 15 characters
    const parts = inputValue.split(/(\s+)/);
    const processedParts = parts.map(part => {
      if (/^\s+$/.test(part)) {
        return part;
      } else if (part.trim().length > 0) {
        return part.length > 15 ? part.slice(0, 15) : part;
      }
      return part;
    });

    inputValue = processedParts.join('');
    setNewTypeName(inputValue);
  };

  const wordCount = newTypeName.trim().split(/\s+/).filter(w => w.length > 0).length;

  const handleAddType = async () => {
    if (!newTypeName.trim() || types.includes(newTypeName.trim())) {
      return;
    }

    try {
      const result = await DropdownService.addOption(
        'material_type',
        newTypeName.trim(),
        types.length + 1
      );

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add type',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Type Added',
        description: `"${newTypeName.trim()}" has been added.`,
      });

      onTypeChange(newTypeName.trim());
      setNewTypeName('');
      setShowAddType(false);
      if (onTypesReload) onTypesReload();
    } catch (error) {
      console.error('Error adding type:', error);
      toast({
        title: 'Error',
        description: 'Failed to add type',
        variant: 'destructive',
      });
    }
  };

  const handleAddColor = async () => {
    const colorName = newColorName.trim();
    if (!colorName || colors.includes(colorName)) return;

    try {
      const result = await DropdownService.addOption(
        'material_color',
        colorName,
        colors.length + 1,
        undefined,
        attachColorCode ? newColorCode : null
      );

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add color',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Color Added',
        description: `"${colorName}" has been added.`,
      });

      onColorChange(colorName);
      setShowAddColor(false);
      setNewColorName('');
      setNewColorCode('#2563eb');
      setAttachColorCode(true);
      if (onTypesReload) onTypesReload();
    } catch (error) {
      console.error('Error adding color:', error);
      toast({
        title: 'Error',
        description: 'Failed to add color',
        variant: 'destructive',
      });
    }
  };

  const inPalette = Boolean(color && colors.includes(color));
  const selectColorValue =
    type !== 'color'
      ? ''
      : colors.length === 0
        ? CUSTOM_COLOR_VALUE
        : inPalette
          ? color
          : CUSTOM_COLOR_VALUE;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="type">Material Type</Label>
        <div className="space-y-2">
          <Select
            open={selectOpen}
            onOpenChange={setSelectOpen}
            value={type || ''}
            onValueChange={(value) => {
              if (value === 'add_new') { setShowAddType(true); setSelectOpen(false); }
              else { onTypeChange(value); setSelectOpen(false); }
            }}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {types.length > 0 ? (
                types.map((typeOption) => {
                  const fullOpt = findFullOption(typeOption);
                  const used = isUsed(typeOption);
                  return (
                    <div key={typeOption} className="relative flex items-center group">
                      <SelectItem value={typeOption} className={`flex-1 ${hasManagement ? 'pr-14' : ''}`}>
                        {typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
                      </SelectItem>
                      {hasManagement && fullOpt && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10 transition-opacity">
                          <button type="button" title={fullOpt.is_active ? 'Deactivate' : 'Activate'} className="p-1 rounded hover:bg-gray-100" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => handleToggleClick(e, fullOpt)}>
                            {fullOpt.is_active ? <Check className="w-3 h-3 text-green-600" /> : <EyeOff className="w-3 h-3 text-gray-400" />}
                          </button>
                          {!used && (
                            <button type="button" title="Delete" className="p-1 rounded hover:bg-red-50" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => handleDeleteClick(e, fullOpt)}>
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <SelectItem value="no_types" disabled>No types available</SelectItem>
              )}
              <SelectItem value="add_new" className="text-primary-600 font-medium">
                <div className="flex items-center gap-2"><Plus className="w-4 h-4" />Add New Type</div>
              </SelectItem>
            </SelectContent>
          </Select>
          {showAddType && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={newTypeName}
                    onChange={(e) => handleTypeNameChange(e.target.value)}
                    placeholder="Enter new type"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {wordCount}/4 words • Max 15 characters per word
                  </p>
                </div>
                <Button type="button" size="sm" onClick={handleAddType}>
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAddType(false);
                    setNewTypeName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {type === 'color' && (
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          {colors.length > 0 ? (
            <>
              <Select
                value={selectColorValue}
                onValueChange={(value) => {
                  if (value === ADD_COLOR_VALUE) {
                    setShowAddColor(true);
                    return;
                  }
                  setShowAddColor(false);
                  if (value === CUSTOM_COLOR_VALUE) {
                    onColorChange('');
                  } else {
                    onColorChange(value);
                  }
                }}
              >
                <SelectTrigger id="color" className="h-auto min-h-10 py-2">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ADD_COLOR_VALUE} textValue="Add new color">
                    <span className="flex items-center gap-2 text-primary-600 font-medium">
                      <Plus className="w-4 h-4" />
                      Add New Color
                    </span>
                  </SelectItem>
                  {colors.map((colorOption) => (
                    <SelectItem key={colorOption} value={colorOption} textValue={colorOption}>
                      <span className="flex items-center gap-2 py-0.5">
                        {colorCodeMap[colorOption] ? (
                          <ColorSwatch colorCode={colorCodeMap[colorOption]} className="w-7 h-7 rounded-md shrink-0" />
                        ) : null}
                        <span>{colorOption}</span>
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_COLOR_VALUE} textValue="Other custom color">
                    Other (type a custom name)…
                  </SelectItem>
                </SelectContent>
              </Select>
              {showAddColor && (
                <div className="space-y-2 rounded-md border p-3">
                  <div className="space-y-1">
                    <Label htmlFor="material-new-color-name" className="text-xs text-muted-foreground">
                      Color name
                    </Label>
                    <Input
                      id="material-new-color-name"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      placeholder="e.g. Coffee Brown"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={attachColorCode}
                      onChange={(e) => setAttachColorCode(e.target.checked)}
                    />
                    Add color code (optional)
                  </label>
                  {attachColorCode && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newColorCode}
                        onChange={(e) => setNewColorCode(e.target.value)}
                        placeholder="#2563eb"
                        className="max-w-[140px] uppercase"
                      />
                      <ColorSwatch colorCode={newColorCode} className="w-7 h-7 rounded-md" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleAddColor}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddColor(false);
                        setNewColorName('');
                        setNewColorCode('#2563eb');
                        setAttachColorCode(true);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {selectColorValue === CUSTOM_COLOR_VALUE && (
                <div className="space-y-1">
                  <Label htmlFor="material-custom-color" className="text-xs text-muted-foreground">
                    Custom color name
                  </Label>
                  <Input
                    id="material-custom-color"
                    value={color}
                    onChange={(e) => onColorChange(e.target.value)}
                    placeholder="e.g. Solvent Blue 38"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-1">
              <Input
                id="color-free"
                value={colorFallbackWhenBlank === 'NA' && color === 'NA' ? '' : color}
                onChange={(e) => {
                  const v = e.target.value;
                  if (colorFallbackWhenBlank !== undefined) {
                    onColorChange(v.trim() === '' ? colorFallbackWhenBlank : v);
                  } else {
                    onColorChange(v);
                  }
                }}
                placeholder="No palette options — type color name"
              />
            </div>
          )}
        </div>
      )}

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
}
