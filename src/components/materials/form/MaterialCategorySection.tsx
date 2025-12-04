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

interface MaterialCategorySectionProps {
  category: string;
  categories: string[];
  onCategoryChange: (value: string) => void;
  onCategoriesReload: () => void;
}

export default function MaterialCategorySection({
  category,
  categories,
  onCategoryChange,
  onCategoriesReload,
}: MaterialCategorySectionProps) {
  const { toast } = useToast();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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
      const API_URL = import.meta.env.VITE_API_URL || '/api';
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
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.length > 0 ? (
              categories
                .filter((cat) => cat && cat.trim() !== '')
                .map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex items-center justify-between w-full">
                      <span>{cat}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeleteCategory(cat);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </SelectItem>
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
          <div className="flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter new category"
              className="flex-1"
            />
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
        )}
      </div>
    </div>
  );
}

