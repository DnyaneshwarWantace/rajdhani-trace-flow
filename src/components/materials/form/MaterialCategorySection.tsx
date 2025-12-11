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

interface MaterialCategorySectionProps {
  category: string;
  categories: string[];
  onCategoryChange: (value: string) => void;
  onCategoriesReload: () => void;
  hasError?: boolean;
}

const MaterialCategorySection = forwardRef<HTMLButtonElement, MaterialCategorySectionProps>(
  ({ category, categories, onCategoryChange, onCategoriesReload, hasError = false }, ref) => {
  const { toast } = useToast();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Handler for category name (max 5 words, max 20 chars per word)
  const handleCategoryNameChange = (value: string) => {
    let inputValue = value;

    // Split by spaces to get words
    const words = inputValue.split(/\s+/).filter(w => w.length > 0);

    // Limit to 5 words
    if (words.length > 5) {
      let wordCount = 0;
      let pos = inputValue.length;
      for (let i = 0; i < inputValue.length; i++) {
        if (inputValue[i] !== ' ' && (i === 0 || inputValue[i - 1] === ' ')) {
          wordCount++;
          if (wordCount === 5) {
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

    // Limit each word to 20 characters
    const parts = inputValue.split(/(\s+)/);
    const processedParts = parts.map(part => {
      if (/^\s+$/.test(part)) {
        return part;
      } else if (part.trim().length > 0) {
        return part.length > 20 ? part.slice(0, 20) : part;
      }
      return part;
    });

    inputValue = processedParts.join('');
    setNewCategoryName(inputValue);
  };

  // Count words for display
  const wordCount = newCategoryName.trim().split(/\s+/).filter(w => w.length > 0).length;

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || categories.includes(newCategoryName.trim())) {
      return;
    }

    try {
      const result = await DropdownService.addOption(
        'material_category',
        newCategoryName.trim(),
        categories.length + 1
      );

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add category',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Category Added',
        description: `"${newCategoryName.trim()}" has been added.`,
      });

      onCategoryChange(newCategoryName.trim());
      setNewCategoryName('');
      setShowAddCategory(false);
      onCategoriesReload();
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: 'Error',
        description: 'Failed to add category',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
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
      const option = allDropdowns.find((opt: any) => opt.category === 'material_category' && opt.value === categoryToDelete);
      
      if (option && option._id) {
        await DropdownService.deleteDropdown(option._id);
        toast({
          title: 'Category Deleted',
          description: `"${categoryToDelete}" has been deleted.`,
        });
        if (category === categoryToDelete) {
          onCategoryChange('');
        }
        onCategoriesReload();
      } else {
        toast({
          title: 'Error',
          description: 'Category option not found',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete category',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <Label htmlFor="category">Category *</Label>
      <div className="space-y-2">
        <Select
          value={category || ''}
          onValueChange={(value) => {
            if (value === 'add_new') {
              setShowAddCategory(true);
            } else {
              onCategoryChange(value);
            }
          }}
        >
          <SelectTrigger 
            ref={ref}
            id="category"
            className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          >
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.length > 0 ? (
              categories
                .filter((cat) => cat && cat.trim() !== '')
                .map((cat) => (
                  <div key={cat} className="relative flex items-center">
                    <SelectItem value={cat} className="flex-1">
                      {cat}
                    </SelectItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDeleteCategory(cat);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
            ) : (
              <SelectItem value="no_categories" disabled>
                No categories available
              </SelectItem>
            )}
            <SelectItem value="add_new" className="text-primary-600 font-medium">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New Category
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {showAddCategory && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={newCategoryName}
                  onChange={(e) => handleCategoryNameChange(e.target.value)}
                  placeholder="Enter new category"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {wordCount}/5 words • Max 20 characters per word
                </p>
              </div>
              <Button type="button" size="sm" onClick={handleAddCategory}>
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryName('');
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

MaterialCategorySection.displayName = 'MaterialCategorySection';

export default MaterialCategorySection;

