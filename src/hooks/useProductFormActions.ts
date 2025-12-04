import { DropdownService } from '@/services/dropdownService';
import type { ProductFormData } from '@/types/product';

interface UseProductFormActionsProps {
  formData: ProductFormData;
  weightUnits: string[];
  lengthUnits: string[];
  widthUnits: string[];
  reloadDropdowns: () => Promise<void>;
}

export function useProductFormActions({
  formData,
  weightUnits,
  lengthUnits,
  widthUnits,
  reloadDropdowns,
}: UseProductFormActionsProps) {
  const addNewWeight = async () => {
    if (!formData.weight?.trim() || !formData.weight_unit) {
      alert('Please enter a weight value and select a unit');
      return;
    }

    try {
      const combinedValue = `${formData.weight.trim()} ${formData.weight_unit.trim()}`;

      if (!weightUnits.includes(formData.weight_unit)) {
        await DropdownService.addOption('weight_units', formData.weight_unit);
        await reloadDropdowns();
      }

      const result = await DropdownService.addOption('weight', combinedValue);
      if (result.success) {
        await reloadDropdowns();
        alert('Weight added to dropdown successfully');
      } else {
        alert(result.error || 'Failed to add weight');
      }
    } catch (err) {
      console.error('Failed to add weight:', err);
      alert('Failed to add weight');
    }
  };

  const addNewLength = async () => {
    if (!formData.length?.trim() || !formData.length_unit) {
      alert('Please enter a length value and select a unit');
      return;
    }

    try {
      const combinedValue = `${formData.length.trim()} ${formData.length_unit.trim()}`;

      if (!lengthUnits.includes(formData.length_unit)) {
        await DropdownService.addOption('length_units', formData.length_unit);
        await DropdownService.addOption('length_unit', formData.length_unit);
        await reloadDropdowns();
      }

      const result = await DropdownService.addOption('length', combinedValue);
      if (result.success) {
        await reloadDropdowns();
        alert('Length added to dropdown successfully');
      } else {
        alert(result.error || 'Failed to add length');
      }
    } catch (err) {
      console.error('Failed to add length:', err);
      alert('Failed to add length');
    }
  };

  const addNewWidth = async () => {
    if (!formData.width?.trim() || !formData.width_unit) {
      alert('Please enter a width value and select a unit');
      return;
    }

    try {
      const combinedValue = `${formData.width.trim()} ${formData.width_unit.trim()}`;

      if (!widthUnits.includes(formData.width_unit)) {
        await DropdownService.addOption('width_units', formData.width_unit);
        await DropdownService.addOption('width_unit', formData.width_unit);
        await reloadDropdowns();
      }

      const result = await DropdownService.addOption('width', combinedValue);
      if (result.success) {
        await reloadDropdowns();
        alert('Width added to dropdown successfully');
      } else {
        alert(result.error || 'Failed to add width');
      }
    } catch (err) {
      console.error('Failed to add width:', err);
      alert('Failed to add width');
    }
  };

  return {
    addNewWeight,
    addNewLength,
    addNewWidth,
  };
}

