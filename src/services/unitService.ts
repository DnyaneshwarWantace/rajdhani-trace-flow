import axios from 'axios';
import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

export interface Unit {
  value: string;
  label: string;
  category: 'metric' | 'imperial' | 'specialized' | 'packaging' | 'count';
  type: 'weight' | 'length' | 'width' | 'area' | 'count' | 'volume';
}

export interface UnitsData {
  all: Unit[];
  weight: Unit[];
  length: Unit[];
  width: Unit[];
  area: Unit[];
  count: Unit[];
  volume: Unit[];
}

/**
 * Get all predefined units
 */
export const getAllUnits = async (): Promise<UnitsData> => {
  const token = localStorage.getItem('auth_token');
  const response = await axios.get(`${API_URL}/dropdowns/units`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
};

/**
 * Get units by type
 * @param type - Unit type (weight, length, width, area, count, volume)
 */
export const getUnitsByType = async (type: string): Promise<Unit[]> => {
  const token = localStorage.getItem('auth_token');
  const response = await axios.get(`${API_URL}/dropdowns/units/${type}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
};

/**
 * Convert units array to dropdown options format
 * @param units - Array of units
 */
export const formatUnitsForDropdown = (units: Unit[]): Array<{ value: string; label: string }> => {
  return units.map(unit => ({
    value: unit.value,
    label: unit.label,
  }));
};

/**
 * Group units by category
 * @param units - Array of units
 */
export const groupUnitsByCategory = (units: Unit[]): Record<string, Unit[]> => {
  return units.reduce((acc, unit) => {
    if (!acc[unit.category]) {
      acc[unit.category] = [];
    }
    acc[unit.category].push(unit);
    return acc;
  }, {} as Record<string, Unit[]>);
};

export const UnitService = {
  getAllUnits,
  getUnitsByType,
  formatUnitsForDropdown,
  groupUnitsByCategory,
};

export default UnitService;
