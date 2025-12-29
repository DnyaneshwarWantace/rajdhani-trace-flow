// Custom hook for dynamic pricing calculations

import { useCallback } from 'react';
import type { PricingUnit, ProductDimensions } from '@/utils/unitConverter';
import {
  calculateTotalPrice,
  formatUnitLabel,
  getAvailablePricingUnits
} from '@/utils/unitConverter';

export interface PricingCalculation {
  unitPrice: number;
  quantity: number;
  unitValue: number;
  totalValue: number;
  subtotal: number; // Base price before GST
  gstAmount: number; // GST amount
  totalPrice: number; // Final price including GST
  pricingUnit: PricingUnit;
  isValid: boolean;
  errorMessage?: string;
}

export interface ExtendedOrderItem {
  id: string;
  order_id?: string;
  product_id?: string;
  raw_material_id?: string;
  product_name: string;
  product_type: 'product' | 'raw_material';
  quantity: number;
  unit: string; // Unit of measurement (kg, piece, roll, sqm, etc.)
  unit_price: number;

  // Per-item GST fields
  gst_rate?: number; // GST rate for this item (default 18%)
  gst_included?: boolean; // Whether GST is included (default true)
  subtotal?: number; // quantity * unit_price
  gst_amount?: number; // Calculated GST amount

  total_price: number;
  quality_grade?: string;
  specifications?: string;
  supplier?: string;
  pricing_unit: PricingUnit;
  unit_value?: number;
  product_dimensions: ProductDimensions;
  isEditing?: boolean;
  isValid?: boolean;
  errorMessage?: string;
  selectedIndividualProducts?: any[];
  needsProduction?: boolean;
  availableStock?: number;
}

export interface UsePricingCalculatorReturn {
  calculateItemPrice: (item: ExtendedOrderItem) => PricingCalculation;
  calculateOrderTotal: (items: ExtendedOrderItem[]) => number;
  validateItem: (item: ExtendedOrderItem) => boolean;
  getAvailablePricingUnits: (dimensions: ProductDimensions) => PricingUnit[];
  formatPrice: (price: number) => string;
  formatUnit: (unit: PricingUnit, quantity?: number) => string;
}

export function usePricingCalculator(): UsePricingCalculatorReturn {
  
  const calculateItemPrice = useCallback((item: ExtendedOrderItem): PricingCalculation => {
    const { unit_price, quantity, pricing_unit, product_dimensions, gst_rate = 18, gst_included = true } = item;

    // For count_unit (unit): simple price * quantity
    if (pricing_unit === 'unit' || !pricing_unit) {
      const basePrice = unit_price * quantity;
      const gstAmount = gst_included ? (basePrice * gst_rate) / (100 + gst_rate) : (basePrice * gst_rate) / 100;
      const subtotal = gst_included ? basePrice - gstAmount : basePrice;
      const totalPrice = gst_included ? basePrice : basePrice + gstAmount;

      return {
        unitPrice: unit_price,
        quantity,
        unitValue: unit_price,
        totalValue: unit_price * quantity,
        subtotal,
        gstAmount,
        totalPrice,
        pricingUnit: pricing_unit || 'unit' as PricingUnit,
        isValid: unit_price > 0 && quantity > 0,
        errorMessage: unit_price <= 0 ? 'Please enter a price' : ''
      };
    }
    
    // If unit_price is 0, return simple calculation
    if (unit_price <= 0) {
      return {
        unitPrice: unit_price,
        quantity,
        unitValue: unit_price,
        totalValue: unit_price * quantity,
        subtotal: 0,
        gstAmount: 0,
        totalPrice: unit_price * quantity,
        pricingUnit: pricing_unit,
        isValid: false,
        errorMessage: 'Please enter a price'
      };
    }
    
    // Get length_unit and width_unit from product_dimensions or item
    const lengthUnit = (item as any).length_unit || (product_dimensions as any).length_unit;
    const widthUnit = (item as any).width_unit || (product_dimensions as any).width_unit;
    
    // Calculate unit value based on pricing unit
    let unitValue = 0;
    if (pricing_unit === 'sqm' && product_dimensions.length && product_dimensions.width) {
      const lengthInM = convertToMeters(product_dimensions.length, lengthUnit || 'm');
      const widthInM = convertToMeters(product_dimensions.width, widthUnit || 'm');
      unitValue = lengthInM * widthInM;
    } else if (pricing_unit === 'sqft' && product_dimensions.length && product_dimensions.width) {
      const lengthInFt = convertToFeet(product_dimensions.length, lengthUnit || 'm');
      const widthInFt = convertToFeet(product_dimensions.width, widthUnit || 'm');
      unitValue = lengthInFt * widthInFt;
    } else if (pricing_unit === 'gsm') {
      const gsm = product_dimensions.gsm || parseFloat(String(product_dimensions.weight || '0').replace(/[^\d.-]/g, '')) || 0;
      if (product_dimensions.length && product_dimensions.width) {
        const lengthInM = convertToMeters(product_dimensions.length, lengthUnit || 'm');
        const widthInM = convertToMeters(product_dimensions.width, widthUnit || 'm');
        const sqmPerProduct = lengthInM * widthInM;
        unitValue = gsm * sqmPerProduct; // Total GSM for one product
      } else {
        unitValue = gsm;
      }
    } else if (pricing_unit === 'kg') {
      const gsm = product_dimensions.gsm || parseFloat(String(product_dimensions.weight || '0').replace(/[^\d.-]/g, '')) || 0;
      if (product_dimensions.length && product_dimensions.width && gsm > 0) {
        const lengthInM = convertToMeters(product_dimensions.length, lengthUnit || 'm');
        const widthInM = convertToMeters(product_dimensions.width, widthUnit || 'm');
        const sqmPerProduct = lengthInM * widthInM;
        unitValue = (gsm * sqmPerProduct) / 1000; // Weight in kg per product
      } else {
        unitValue = product_dimensions.weight || 0;
      }
    }
    
    // Calculate base price with unit conversion support
    const basePrice = calculateTotalPrice(
      unit_price,
      quantity,
      pricing_unit,
      product_dimensions,
      lengthUnit,
      widthUnit
    );

    // Calculate GST
    const gstAmount = gst_included ? (basePrice * gst_rate) / (100 + gst_rate) : (basePrice * gst_rate) / 100;
    const subtotal = gst_included ? basePrice - gstAmount : basePrice;
    const totalPrice = gst_included ? basePrice : basePrice + gstAmount;

    return {
      unitPrice: unit_price,
      quantity,
      unitValue,
      totalValue: unitValue * quantity,
      subtotal,
      gstAmount,
      totalPrice,
      pricingUnit: pricing_unit,
      isValid: unit_price > 0 && quantity > 0
    };
  }, []);
  
  // Helper functions for unit conversion
  function convertToMeters(value: number, unit: string): number {
    const unitLower = unit.toLowerCase();
    switch (unitLower) {
      case 'mm': return value / 1000;
      case 'cm': case 'centimeters': return value / 100;
      case 'feet': case 'ft': return value * 0.3048;
      case 'inches': case 'in': return value * 0.0254;
      case 'yards': case 'yd': return value * 0.9144;
      case 'm': case 'meter': case 'meters': return value;
      default: return value;
    }
  }
  
  function convertToFeet(value: number, unit: string): number {
    const unitLower = unit.toLowerCase();
    switch (unitLower) {
      case 'mm': return value / 304.8;
      case 'cm': case 'centimeters': return value / 30.48;
      case 'm': case 'meter': case 'meters': return value * 3.28084;
      case 'inches': case 'in': return value / 12;
      case 'yards': case 'yd': return value * 3;
      case 'feet': case 'ft': return value;
      default: return value;
    }
  }
  
  const calculateOrderTotal = useCallback((items: ExtendedOrderItem[]): number => {
    return items.reduce((total, item) => {
      const calculation = calculateItemPrice(item);
      return total + (calculation.totalPrice || 0);
    }, 0);
  }, [calculateItemPrice]);
  
  const validateItem = useCallback((item: ExtendedOrderItem): boolean => {
    const calculation = calculateItemPrice(item);
    return calculation.isValid;
  }, [calculateItemPrice]);
  
  const getAvailablePricingUnitsForDimensions = useCallback((dimensions: ProductDimensions): PricingUnit[] => {
    return getAvailablePricingUnits(dimensions);
  }, []);
  
  const formatPrice = useCallback((price: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }, []);
  
  const formatUnit = useCallback((unit: PricingUnit, quantity: number = 1): string => {
    return formatUnitLabel(unit, quantity);
  }, []);
  
  return {
    calculateItemPrice,
    calculateOrderTotal,
    validateItem,
    getAvailablePricingUnits: getAvailablePricingUnitsForDimensions,
    formatPrice,
    formatUnit
  };
}


