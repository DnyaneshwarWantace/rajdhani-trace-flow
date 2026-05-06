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
import { Plus, Trash2 } from 'lucide-react';
import { DropdownService } from '@/services/dropdownService';
import { useToast } from '@/hooks/use-toast';
import ColorSwatch from '@/components/ui/ColorSwatch';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';

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
}: MaterialTypeSectionProps) {
  const { toast } = useToast();
  const { colorCodeMap } = useDropdownVisualMaps();
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
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

  const handleDeleteType = async (typeToDelete: string) => {
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
      const option = allDropdowns.find((opt: any) => opt.category === 'material_type' && opt.value === typeToDelete);

      if (option && option._id) {
        await DropdownService.deleteDropdown(option._id);
        toast({
          title: 'Type Deleted',
          description: `"${typeToDelete}" has been deleted.`,
        });
        if (type === typeToDelete) {
          onTypeChange('');
        }
        if (onTypesReload) onTypesReload();
      } else {
        toast({
          title: 'Error',
          description: 'Type option not found',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting type:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete type',
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
    <>
      <div>
        <Label htmlFor="type">Material Type</Label>
        <div className="space-y-2">
          <Select
            value={type || ''}
            onValueChange={(value) => {
              if (value === 'add_new') {
                setShowAddType(true);
              } else {
                onTypeChange(value);
              }
            }}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {types.length > 0 ? (
                types.map((typeOption) => (
                  <div key={typeOption} className="relative flex items-center">
                    <SelectItem value={typeOption} className="flex-1">
                      {typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
                    </SelectItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDeleteType(typeOption);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              ) : (
                <SelectItem value="no_types" disabled>
                  No types available
                </SelectItem>
              )}
              <SelectItem value="add_new" className="text-primary-600 font-medium">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Type
                </div>
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
    </>
  );
}
