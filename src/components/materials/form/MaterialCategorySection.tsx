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

interface MaterialCategorySectionProps {
  category: string;
  categories: string[];
  onCategoryChange: (value: string) => void;
  onCategoriesReload: () => void;
  hasError?: boolean;
  touchedFields?: Set<string>;
  markFieldTouched?: (fieldName: string) => void;
  fullOptions?: DropdownOption[];
  usageMap?: Record<string, boolean>;
}

const MaterialCategorySection = forwardRef<HTMLButtonElement, MaterialCategorySectionProps>(
  ({ category, categories, onCategoryChange, onCategoriesReload, hasError = false, touchedFields = new Set(), markFieldTouched = () => {}, fullOptions, usageMap }, ref) => {
  const { toast } = useToast();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectOpen, setSelectOpen] = useState(false);
  const [togglingOption, setTogglingOption] = useState<DropdownOption | null>(null);
  const [deletingOption, setDeletingOption] = useState<DropdownOption | null>(null);

  const findFullOption = (val: string): DropdownOption | undefined =>
    fullOptions?.find((o) => o.value === val);
  const isUsed = (val: string): boolean =>
    usageMap?.[`material_category:${val}`] === true;
  const hasManagement = !!fullOptions && fullOptions.length > 0;

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
      onCategoriesReload();
      toast({ title: 'Success', description: `"${togglingOption.value}" ${togglingOption.is_active ? 'deactivated' : 'activated'}` });
    } catch { toast({ title: 'Error', description: 'Failed to toggle', variant: 'destructive' }); }
    setTogglingOption(null);
  };
  const confirmDelete = async () => {
    if (!deletingOption) return;
    try {
      await DropdownService.deleteDropdown(deletingOption.id || deletingOption._id);
      onCategoriesReload();
      toast({ title: 'Success', description: `"${deletingOption.value}" deleted` });
    } catch { toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' }); }
    setDeletingOption(null);
  };

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

  return (
    <div>
      <Label htmlFor="category">Category *</Label>
      <div className="space-y-2">
        <Select
          open={selectOpen}
          onOpenChange={(open) => {
            setSelectOpen(open);
            if (!open) markFieldTouched('category');
          }}
          value={category || ''}
          onValueChange={(value) => {
            if (value === 'add_new') { setShowAddCategory(true); setSelectOpen(false); }
            else { onCategoryChange(value); markFieldTouched('category'); setSelectOpen(false); }
          }}
        >
          <SelectTrigger
            ref={ref}
            id="category"
            className={(hasError || (touchedFields.has('category') && !category.trim())) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          >
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.length > 0 ? (
              categories.filter((cat) => cat && cat.trim() !== '').map((cat) => {
                const fullOpt = findFullOption(cat);
                const used = isUsed(cat);
                return (
                  <div key={cat} className="relative flex items-center group">
                    <SelectItem value={cat} className={`flex-1 ${hasManagement ? 'pr-14' : ''}`}>{cat}</SelectItem>
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
              <SelectItem value="no_categories" disabled>No categories available</SelectItem>
            )}
            <SelectItem value="add_new" className="text-primary-600 font-medium">
              <div className="flex items-center gap-2"><Plus className="w-4 h-4" />Add New Category</div>
            </SelectItem>
          </SelectContent>
        </Select>
        {touchedFields.has('category') && !category.trim() && (
          <p className="text-xs text-red-500 mt-1">
            Category is required
          </p>
        )}
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

MaterialCategorySection.displayName = 'MaterialCategorySection';

export default MaterialCategorySection;

