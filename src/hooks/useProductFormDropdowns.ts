import { useState, useEffect } from 'react';
import { DropdownService } from '@/services/dropdownService';

export function useProductFormDropdowns() {
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [lengthUnits, setLengthUnits] = useState<string[]>([]);
  const [widthUnits, setWidthUnits] = useState<string[]>([]);
  const [weightUnits, setWeightUnits] = useState<string[]>([]);
  const [lengths, setLengths] = useState<string[]>([]); // Combined values like "5 m"
  const [widths, setWidths] = useState<string[]>([]); // Combined values like "10 feet"
  const [weights, setWeights] = useState<string[]>([]); // Combined values like "600 GSM"
  const [loading, setLoading] = useState(true);

  const loadDropdowns = async () => {
    try {
      setLoading(true);
      // Load product dropdown data from backend
      const dropdownData = await DropdownService.getProductDropdownData();

      // Helper to safely extract values and filter empty ones
      const extractValues = (items: any[] | undefined): string[] => {
        if (!items || !Array.isArray(items)) return [];
        return items
          .map((d) => (typeof d === 'string' ? d : d?.value))
          .filter((val) => val && typeof val === 'string' && val.trim() !== '');
      };

      // Load all dropdowns from backend, filter out empty values
      setCategories(extractValues(dropdownData.categories));
      setSubcategories(extractValues(dropdownData.subcategories));
      setColors(extractValues(dropdownData.colors));
      setPatterns(extractValues(dropdownData.patterns));
      
      // Filter out "roll" and "rolls" from units - roll is for counting, not a unit
      const unitValues = extractValues(dropdownData.units);
      setUnits(
        unitValues.filter(
          (unit) => unit.toLowerCase() !== 'roll' && unit.toLowerCase() !== 'rolls'
        )
      );

      // Load length units - database has both 'length_units' (plural) and 'length_unit' (singular)
      const lengthUnitsPlural = extractValues(dropdownData.length_units);
      const lengthUnitsSingular = await DropdownService.getOptionsByCategory('length_unit');
      const lengthUnitsSingularValues = extractValues(lengthUnitsSingular);
      // Combine both and remove duplicates
      const allLengthUnits = [...lengthUnitsPlural, ...lengthUnitsSingularValues];
      setLengthUnits(Array.from(new Set(allLengthUnits)));

      // Load width units - database has both 'width_units' (plural) and 'width_unit' (singular)
      const widthUnitsPlural = extractValues(dropdownData.width_units);
      const widthUnitsSingular = await DropdownService.getOptionsByCategory('width_unit');
      const widthUnitsSingularValues = extractValues(widthUnitsSingular);
      // Combine both and remove duplicates
      const allWidthUnits = [...widthUnitsPlural, ...widthUnitsSingularValues];
      setWidthUnits(Array.from(new Set(allWidthUnits)));

      // Load weight units - only from backend, no hardcoded fallbacks
      setWeightUnits(extractValues(dropdownData.weight_units));

      // Load combined values (lengths, widths, weights) - these are stored as combined "value unit" strings
      setLengths(extractValues(dropdownData.lengths));
      setWidths(extractValues(dropdownData.widths));
      setWeights(extractValues(dropdownData.weights));
    } catch (err) {
      console.error('Failed to load dropdowns:', err);
      // Set empty arrays on error to prevent showing hardcoded options
      setCategories([]);
      setSubcategories([]);
      setColors([]);
      setPatterns([]);
      setUnits([]);
      setLengthUnits([]);
      setWidthUnits([]);
      setWeightUnits([]);
      setLengths([]);
      setWidths([]);
      setWeights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDropdowns();
  }, []);

  const deleteDropdownOption = async (category: string, value: string) => {
    try {
      // Get all dropdowns to find the option
      const dropdownData = await DropdownService.getProductDropdownData();

      let option: any = undefined;

      switch (category) {
        case 'category':
          option = dropdownData.categories?.find((opt: any) => opt.value === value);
          break;
        case 'subcategory':
          option = dropdownData.subcategories?.find((opt: any) => opt.value === value);
          break;
        case 'color':
          option = dropdownData.colors?.find((opt: any) => opt.value === value);
          break;
        case 'pattern':
          option = dropdownData.patterns?.find((opt: any) => opt.value === value);
          break;
        case 'unit':
          option = dropdownData.units?.find((opt: any) => opt.value === value);
          break;
        case 'weight':
          option = dropdownData.weights?.find((opt: any) => opt.value === value);
          break;
        case 'length':
          option = dropdownData.lengths?.find((opt: any) => opt.value === value);
          break;
        case 'width':
          option = dropdownData.widths?.find((opt: any) => opt.value === value);
          break;
      }

      if (!option) {
        alert(`Option "${value}" not found in ${category}`);
        return;
      }

      await DropdownService.deleteDropdown(option._id || option.id);
      await loadDropdowns();
      alert(`"${value}" deleted successfully`);
    } catch (err) {
      console.error('Error deleting dropdown option:', err);
      alert('Failed to delete option');
    }
  };

  return {
    categories,
    subcategories,
    colors,
    patterns,
    units,
    lengthUnits,
    widthUnits,
    weightUnits,
    lengths, // Combined values
    widths, // Combined values
    weights, // Combined values
    loading,
    reloadDropdowns: loadDropdowns,
    deleteCategory: (value: string) => deleteDropdownOption('category', value),
    deleteSubcategory: (value: string) => deleteDropdownOption('subcategory', value),
    deleteColor: (value: string) => deleteDropdownOption('color', value),
    deletePattern: (value: string) => deleteDropdownOption('pattern', value),
    deleteUnit: (value: string) => deleteDropdownOption('unit', value),
  };
}

