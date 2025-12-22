import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { UnitService, type Unit } from '@/services/unitService';

interface UnitDropdownProps {
  unitType: 'weight' | 'length' | 'width' | 'area' | 'count' | 'volume';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  groupByCategory?: boolean;
}

export function UnitDropdown({
  unitType,
  value,
  onChange,
  placeholder = 'Select unit',
  disabled = false,
  className = '',
  required = false,
  groupByCategory = true,
}: UnitDropdownProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnits();
  }, [unitType]);

  const loadUnits = async () => {
    try {
      setLoading(true);
      const unitsData = await UnitService.getUnitsByType(unitType);
      setUnits(unitsData);
    } catch (error) {
      console.error(`Error loading ${unitType} units:`, error);
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  // Group units by category
  const groupedUnits = groupByCategory
    ? UnitService.groupUnitsByCategory(units)
    : null;

  // Category display names
  const categoryLabels: Record<string, string> = {
    metric: 'Metric',
    imperial: 'Imperial',
    specialized: 'Specialized',
    packaging: 'Packaging',
    count: 'Count',
  };

  if (loading) {
    return (
      <Select disabled={true} value="">
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled} required={required}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {groupByCategory && groupedUnits ? (
          // Render grouped units
          Object.entries(groupedUnits).map(([category, categoryUnits]) => (
            <SelectGroup key={category}>
              <SelectLabel className="font-semibold text-gray-700">
                {categoryLabels[category] || category}
              </SelectLabel>
              {categoryUnits.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))
        ) : (
          // Render flat list
          units.map((unit) => (
            <SelectItem key={unit.value} value={unit.value}>
              {unit.label}
            </SelectItem>
          ))
        )}
        {units.length === 0 && (
          <SelectItem value="" disabled>
            No units available
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

export default UnitDropdown;
