// Extended Order Types for Frontend with Dynamic Pricing

import { PricingUnit, ProductDimensions } from '../utils/unitConverter';

export interface ExtendedOrderItem {
  id: string;
  order_id?: string;
  product_id?: string;
  product_name: string;
  product_type: 'product' | 'raw_material';
  quantity: number;
  unit_price: number;
  total_price: number;
  quality_grade?: string;
  specifications?: string;
  supplier?: string; // Supplier name for raw materials
  
  // New dynamic pricing fields
  pricing_unit: PricingUnit;
  unit_value?: number; // Value of one unit in the pricing unit
  product_dimensions: ProductDimensions;
  
  // UI state fields
  isEditing?: boolean;
  isValid?: boolean;
  errorMessage?: string;
  selectedIndividualProducts?: any[]; // For individual product selection
  needsProduction?: boolean; // Whether this item requires production
  availableStock?: number; // Available stock for this item
}

export interface OrderFormData {
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  order_date: string;
  expected_delivery?: string;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'pending' | 'accepted' | 'in_production' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  special_instructions?: string;
  items: ExtendedOrderItem[];
}

export interface PricingCalculation {
  unitPrice: number;
  quantity: number;
  unitValue: number;
  totalValue: number;
  totalPrice: number;
  pricingUnit: PricingUnit;
  isValid: boolean;
  errorMessage?: string;
}

export interface ProductPricingInfo {
  product_id: string;
  product_name: string;
  dimensions: ProductDimensions;
  suggested_pricing_unit: PricingUnit;
  available_pricing_units: PricingUnit[];
}
