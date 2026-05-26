import { useState, useEffect } from 'react';
import { DropdownService } from '@/services/dropdownService';
import { useToast } from '@/hooks/use-toast';
import type { DropdownOption } from '@/types/dropdown';

export function useProductFormDropdowns() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [colorCodeMap, setColorCodeMap] = useState<Record<string, string>>({});
  const [patterns, setPatterns] = useState<string[]>([]);
  const [patternImageMap, setPatternImageMap] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<string[]>([]);
  const [lengthUnits, setLengthUnits] = useState<string[]>([]);
  const [widthUnits, setWidthUnits] = useState<string[]>([]);
  const [weightUnits, setWeightUnits] = useState<string[]>([]);
  const [lengths, setLengths] = useState<string[]>([]);
  const [widths, setWidths] = useState<string[]>([]);
  const [weights, setWeights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Full DropdownOption objects for inline management
  const [categoryOptions, setCategoryOptions] = useState<DropdownOption[]>([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<DropdownOption[]>([]);
  const [colorOptions, setColorOptions] = useState<DropdownOption[]>([]);
  const [patternOptions, setPatternOptions] = useState<DropdownOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<DropdownOption[]>([]);
  const [lengthOptions, setLengthOptions] = useState<DropdownOption[]>([]);
  const [widthOptions, setWidthOptions] = useState<DropdownOption[]>([]);
  const [weightOptions, setWeightOptions] = useState<DropdownOption[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, boolean>>({});

  const loadDropdowns = async () => {
    try {
      setLoading(true);
      const dropdownData = await DropdownService.getProductDropdownData();

      const extractValues = (items: any[] | undefined): string[] => {
        if (!items || !Array.isArray(items)) return [];
        return items
          .map((d) => (typeof d === 'string' ? d : d?.value))
          .filter((val) => val && typeof val === 'string' && val.trim() !== '');
      };

      const extractOptions = (items: any[] | undefined): DropdownOption[] => {
        if (!items || !Array.isArray(items)) return [];
        return items.filter((d) => d && typeof d === 'object' && d.value) as DropdownOption[];
      };

      setCategories(extractValues(dropdownData.categories));
      setCategoryOptions(extractOptions(dropdownData.categories));

      setSubcategories(extractValues(dropdownData.subcategories));
      setSubcategoryOptions(extractOptions(dropdownData.subcategories));

      setColors(extractValues(dropdownData.colors));
      setColorOptions(extractOptions(dropdownData.colors));
      const colorMap: Record<string, string> = {};
      (dropdownData.colors || []).forEach((color: any) => {
        const value = typeof color === 'string' ? color : color?.value;
        const colorCode = typeof color === 'string' ? null : color?.color_code;
        if (value && colorCode) colorMap[value] = colorCode;
      });
      setColorCodeMap(colorMap);

      setPatterns(extractValues(dropdownData.patterns));
      setPatternOptions(extractOptions(dropdownData.patterns));
      const patternMap: Record<string, string> = {};
      (dropdownData.patterns || []).forEach((pattern: any) => {
        const value = typeof pattern === 'string' ? pattern : pattern?.value;
        const imageUrl = typeof pattern === 'string' ? null : pattern?.image_url;
        if (value && imageUrl) patternMap[value] = imageUrl;
      });
      setPatternImageMap(patternMap);

      const unitValues = extractValues(dropdownData.units);
      const unitObjs = extractOptions(dropdownData.units);
      setUnits(unitValues.filter((u) => u.toLowerCase() !== 'roll' && u.toLowerCase() !== 'rolls'));
      setUnitOptions(unitObjs.filter((u) => u.value.toLowerCase() !== 'roll' && u.value.toLowerCase() !== 'rolls'));

      const lengthUnitsPlural = extractValues(dropdownData.length_units);
      const lengthUnitsSingular = await DropdownService.getOptionsByCategory('length_unit');
      const lengthUnitsSingularValues = extractValues(lengthUnitsSingular);
      setLengthUnits(Array.from(new Set([...lengthUnitsPlural, ...lengthUnitsSingularValues])));

      const widthUnitsPlural = extractValues(dropdownData.width_units);
      const widthUnitsSingular = await DropdownService.getOptionsByCategory('width_unit');
      const widthUnitsSingularValues = extractValues(widthUnitsSingular);
      setWidthUnits(Array.from(new Set([...widthUnitsPlural, ...widthUnitsSingularValues])));

      setWeightUnits(extractValues(dropdownData.weight_units));

      setLengths(extractValues(dropdownData.lengths));
      setLengthOptions(extractOptions(dropdownData.lengths));
      setWidths(extractValues(dropdownData.widths));
      setWidthOptions(extractOptions(dropdownData.widths));
      setWeights(extractValues(dropdownData.weights));
      setWeightOptions(extractOptions(dropdownData.weights));

      // Fetch usage map
      const { getApiUrl } = await import('@/utils/apiConfig');
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const usageResponse = await fetch(`${API_URL}/dropdowns/usage`, { method: 'GET', headers });
      if (usageResponse.ok) {
        const usageResult = await usageResponse.json();
        if (usageResult.success && usageResult.data) setUsageMap(usageResult.data);
      }
    } catch (err) {
      console.error('Failed to load dropdowns:', err);
      setCategories([]); setCategoryOptions([]);
      setSubcategories([]); setSubcategoryOptions([]);
      setColors([]); setColorOptions([]);
      setColorCodeMap({});
      setPatterns([]); setPatternOptions([]);
      setPatternImageMap({});
      setUnits([]); setUnitOptions([]);
      setLengthUnits([]); setWidthUnits([]); setWeightUnits([]);
      setLengths([]); setLengthOptions([]);
      setWidths([]); setWidthOptions([]);
      setWeights([]); setWeightOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDropdowns();
  }, []);

  const deleteDropdownOption = async (category: string, value: string) => {
    try {
      const dropdownData = await DropdownService.getProductDropdownData();
      let option: any = undefined;
      switch (category) {
        case 'category': option = dropdownData.categories?.find((opt: any) => opt.value === value); break;
        case 'subcategory': option = dropdownData.subcategories?.find((opt: any) => opt.value === value); break;
        case 'color': option = dropdownData.colors?.find((opt: any) => opt.value === value); break;
        case 'pattern': option = dropdownData.patterns?.find((opt: any) => opt.value === value); break;
        case 'unit': option = dropdownData.units?.find((opt: any) => opt.value === value); break;
        case 'weight': option = dropdownData.weights?.find((opt: any) => opt.value === value); break;
        case 'length': option = dropdownData.lengths?.find((opt: any) => opt.value === value); break;
        case 'width': option = dropdownData.widths?.find((opt: any) => opt.value === value); break;
      }
      if (!option) {
        toast({ title: 'Error', description: `Option "${value}" not found in ${category}`, variant: 'destructive' });
        return;
      }
      await DropdownService.deleteDropdown(option._id || option.id);
      await loadDropdowns();
      toast({ title: 'Success', description: `"${value}" deleted successfully` });
    } catch (err) {
      console.error('Error deleting dropdown option:', err);
      toast({ title: 'Error', description: 'Failed to delete option', variant: 'destructive' });
    }
  };

  return {
    categories,
    subcategories,
    colors,
    colorCodeMap,
    patterns,
    patternImageMap,
    units,
    lengthUnits,
    widthUnits,
    weightUnits,
    lengths,
    widths,
    weights,
    loading,
    reloadDropdowns: loadDropdowns,
    // Full option objects for inline management
    categoryOptions,
    subcategoryOptions,
    colorOptions,
    patternOptions,
    unitOptions,
    lengthOptions,
    widthOptions,
    weightOptions,
    usageMap,
    deleteCategory: (value: string) => deleteDropdownOption('category', value),
    deleteSubcategory: (value: string) => deleteDropdownOption('subcategory', value),
    deleteColor: (value: string) => deleteDropdownOption('color', value),
    deletePattern: (value: string) => deleteDropdownOption('pattern', value),
    deleteUnit: (value: string) => deleteDropdownOption('unit', value),
  };
}
