import { useState, useEffect, useCallback } from 'react';
import type { DropdownOption } from '@/types/dropdown';
import { DropdownService } from '@/services/dropdownService';

interface UseToast {
  toast: (options: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
}

export function useDropdowns(toast: UseToast['toast']) {
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadDropdowns = useCallback(async () => {
    try {
      setLoading(true);
      // Use DropdownService which has proper headers and error handling
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
        const errorText = await response.text();
        console.error('Dropdown fetch error:', response.status, errorText);
        throw new Error(`Failed to fetch dropdowns: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Backend returns { success: true, data: options[] } where options is a flat array
      if (result.success && Array.isArray(result.data)) {
        setDropdownOptions(result.data);
      } else if (Array.isArray(result.data)) {
        setDropdownOptions(result.data);
      } else {
        console.warn('Unexpected dropdown data format:', result);
        setDropdownOptions([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dropdowns';
      console.error('Error loading dropdowns:', err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setDropdownOptions([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  const getOptionsByCategory = useCallback(
    (category: string): DropdownOption[] => {
      return dropdownOptions.filter((option) => option.category === category);
    },
    [dropdownOptions]
  );

  const addCombined = async (valueCategory: string, value: string, unit: string) => {
    if (!value.trim() || !unit.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both value and unit',
        variant: 'destructive',
      });
      return;
    }

    const categoryMap: { [key: string]: string } = {
      weight_combined: 'weight',
      length_combined: 'length',
      width_combined: 'width',
    };
    const finalCategory = categoryMap[valueCategory] || valueCategory;

    try {
      setSaving(true);
      await DropdownService.createDropdown({
        category: finalCategory as any,
        value: `${value} ${unit}`,
        display_order: (getOptionsByCategory(finalCategory).length || 0) + 1,
      });
      toast({
        title: 'Success',
        description: 'Option added successfully',
      });
      await loadDropdowns();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add option',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addSimple = async (category: string, value: string) => {
    if (!value.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a value',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await DropdownService.createDropdown({
        category: category as any,
        value: value.trim(),
        display_order: (getOptionsByCategory(category).length || 0) + 1,
      });
      toast({
        title: 'Success',
        description: 'Option added successfully',
      });
      await loadDropdowns();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add option',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateOption = async (id: string, value: string, displayOrder: number) => {
    if (!value.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a value',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await DropdownService.updateDropdown(id, {
        value: value.trim(),
        display_order: displayOrder,
      });
      toast({
        title: 'Success',
        description: 'Option updated successfully',
      });
      await loadDropdowns();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update option',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteOption = async (id: string) => {
    try {
      await DropdownService.deleteDropdown(id);
      toast({
        title: 'Success',
        description: 'Option deleted successfully',
      });
      await loadDropdowns();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete option',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (option: DropdownOption) => {
    try {
      // Prefer custom id field, fallback to _id
      const idToToggle = option.id || option._id;
      await DropdownService.toggleActive(idToToggle);
      toast({
        title: 'Success',
        description: `Option ${option.is_active ? 'deactivated' : 'activated'} successfully`,
      });
      await loadDropdowns();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to toggle status',
        variant: 'destructive',
      });
    }
  };

  return {
    dropdownOptions,
    loading,
    saving,
    getOptionsByCategory,
    addCombined,
    addSimple,
    updateOption,
    deleteOption,
    toggleActive,
    reload: loadDropdowns,
  };
}

