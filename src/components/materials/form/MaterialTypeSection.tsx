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

interface MaterialTypeSectionProps {
  type: string;
  color: string;
  types: string[];
  colors: string[];
  onTypeChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onTypesReload?: () => void;
}

export default function MaterialTypeSection({
  type,
  color,
  types,
  colors,
  onTypeChange,
  onColorChange,
  onTypesReload,
}: MaterialTypeSectionProps) {
  const { toast } = useToast();
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

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

  return (
    <>
      <div>
        <Label htmlFor="type">Material Type *</Label>
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
        <div>
          <Label htmlFor="color">Color *</Label>
          <Select value={color || ''} onValueChange={onColorChange}>
            <SelectTrigger id="color">
              <SelectValue placeholder="Select color" />
            </SelectTrigger>
            <SelectContent>
              {colors.length > 0 ? (
                colors.map((colorOption) => (
                  <SelectItem key={colorOption} value={colorOption}>
                    {colorOption}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no_colors" disabled>
                  No colors available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}
