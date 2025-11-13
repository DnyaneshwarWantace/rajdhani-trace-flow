import type { Product as MongoDBProduct } from '@/services/api/productService';
import type { IndividualProduct as MongoDBIndividualProduct } from '@/services/api/individualProductService';

// Frontend Product interface (existing)
export interface Product {
  id: string;
  qrCode: string;
  name: string;
  category: string;
  subcategory?: string;
  color: string; // Required in frontend
  pattern: string; // Required in frontend
  unit: string;
  quantity: number;
  baseQuantity: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired' | 'in-production';
  individualStockTracking: boolean;
  minStockLevel: number;
  maxStockLevel: number;
  weight: string; // Required in frontend
  width: string;
  length: string;
  weightUnit: string; // Required in frontend
  widthUnit: string; // Required in frontend
  lengthUnit: string; // Required in frontend
  materialsUsed: any[]; // Required in frontend
  notes: string; // Required in frontend
  qualityGrade?: string; // Quality grade for individual products
  imageUrl?: string;
  manufacturingDate?: string;
  hasRecipe: boolean;
  individualProductsCount?: number;
  actual_quantity?: number;
  actual_status?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired' | 'in-production';
  individual_products?: any[];
  createdAt: string;
  updatedAt: string;
}

// Frontend IndividualProduct interface (existing)
export interface IndividualProduct {
  id: string;
  productId: string;
  qrCode: string;
  serialNumber: string;
  productName: string;
  color?: string;
  pattern?: string;
  length: string;
  width: string;
  weight?: string;
  finalLength?: string;
  finalWidth?: string;
  finalWeight?: string;
  qualityGrade: string;
  status: 'available' | 'sold' | 'damaged' | 'returned' | 'in-production' | 'completed';
  location?: string;
  productionDate?: string;
  completionDate?: string;
  inspector?: string;
  notes: string; // Required in frontend
  materialsUsed: any[]; // Required in frontend
  soldDate?: string;
  customerId?: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
}

// Convert MongoDB Product to Frontend Product
export function mapMongoDBProductToFrontend(mongoProduct: MongoDBProduct): Product {
  return {
    id: mongoProduct.id,
    qrCode: mongoProduct.qr_code,
    name: mongoProduct.name,
    category: mongoProduct.category,
    subcategory: mongoProduct.subcategory || '',
    color: mongoProduct.color || '', // Default empty string
    pattern: mongoProduct.pattern || '', // Default empty string
    unit: mongoProduct.unit,
    quantity: mongoProduct.base_quantity,
    baseQuantity: mongoProduct.base_quantity,
    status: mongoProduct.status as any, // Allow all status types
    individualStockTracking: mongoProduct.individual_stock_tracking,
    minStockLevel: mongoProduct.min_stock_level,
    maxStockLevel: mongoProduct.max_stock_level,
    weight: mongoProduct.weight || '', // Default empty string
    width: mongoProduct.width,
    length: mongoProduct.length,
    weightUnit: 'GSM', // Default unit
    widthUnit: mongoProduct.width_unit,
    lengthUnit: mongoProduct.length_unit,
    materialsUsed: [], // Default empty array
    notes: mongoProduct.notes || '', // Default empty string
    imageUrl: mongoProduct.image_url,
    manufacturingDate: mongoProduct.manufacturing_date,
    hasRecipe: mongoProduct.has_recipe,
    individualProductsCount: mongoProduct.individual_products_count,
    actual_quantity: mongoProduct.base_quantity,
    actual_status: mongoProduct.status as any,
    individual_products: [],
    createdAt: mongoProduct.created_at,
    updatedAt: mongoProduct.updated_at,
  };
}

// Convert MongoDB IndividualProduct to Frontend IndividualProduct
export function mapMongoDBIndividualProductToFrontend(mongoIndividualProduct: MongoDBIndividualProduct): IndividualProduct {
  return {
    id: mongoIndividualProduct.id,
    productId: mongoIndividualProduct.product_id,
    qrCode: mongoIndividualProduct.qr_code,
    serialNumber: mongoIndividualProduct.serial_number,
    productName: mongoIndividualProduct.product_name,
    color: mongoIndividualProduct.color,
    pattern: mongoIndividualProduct.pattern,
    length: mongoIndividualProduct.length,
    width: mongoIndividualProduct.width,
    weight: mongoIndividualProduct.weight,
    finalLength: mongoIndividualProduct.final_length,
    finalWidth: mongoIndividualProduct.final_width,
    finalWeight: mongoIndividualProduct.final_weight,
    qualityGrade: mongoIndividualProduct.quality_grade,
    status: mongoIndividualProduct.status === 'in-production' ? 'in-production' : 
            mongoIndividualProduct.status === 'available' ? 'available' :
            mongoIndividualProduct.status === 'sold' ? 'sold' :
            mongoIndividualProduct.status === 'damaged' ? 'damaged' :
            mongoIndividualProduct.status === 'returned' ? 'returned' : 'available',
    location: mongoIndividualProduct.location,
    productionDate: mongoIndividualProduct.production_date,
    completionDate: mongoIndividualProduct.completion_date,
    inspector: mongoIndividualProduct.inspector,
    notes: mongoIndividualProduct.notes || '', // Default empty string
    materialsUsed: [], // Default empty array
    soldDate: mongoIndividualProduct.sold_date,
    customerId: mongoIndividualProduct.customer_id,
    orderId: mongoIndividualProduct.order_id,
    createdAt: mongoIndividualProduct.created_at,
    updatedAt: mongoIndividualProduct.updated_at,
  };
}

// Convert Frontend Product to MongoDB Product (for creation)
export function mapFrontendProductToMongoDB(frontendProduct: Partial<Product>): any {
  const result: any = {
    name: frontendProduct.name,
    category: frontendProduct.category,
    unit: frontendProduct.unit,
    individual_stock_tracking: frontendProduct.individualStockTracking,
    min_stock_level: frontendProduct.minStockLevel,
    max_stock_level: frontendProduct.maxStockLevel,
    base_quantity: frontendProduct.baseQuantity,
    weight: frontendProduct.weight,
    width: frontendProduct.width,
    length: frontendProduct.length,
    length_unit: frontendProduct.lengthUnit || 'feet',
    width_unit: frontendProduct.widthUnit || 'feet',
    notes: frontendProduct.notes,
    image_url: frontendProduct.imageUrl,
    manufacturing_date: frontendProduct.manufacturingDate,
  };

  // Only include optional fields if they have values
  if (frontendProduct.subcategory && frontendProduct.subcategory.trim() !== '') {
    result.subcategory = frontendProduct.subcategory;
  }
  if (frontendProduct.color && frontendProduct.color.trim() !== '') {
    result.color = frontendProduct.color;
  }
  if (frontendProduct.pattern && frontendProduct.pattern.trim() !== '') {
    result.pattern = frontendProduct.pattern;
  }

  return result;
}

// Convert Frontend IndividualProduct to MongoDB IndividualProduct (for creation)
export function mapFrontendIndividualProductToMongoDB(frontendIndividualProduct: Partial<IndividualProduct>): any {
  return {
    product_name: frontendIndividualProduct.productName,
    color: frontendIndividualProduct.color,
    pattern: frontendIndividualProduct.pattern,
    length: frontendIndividualProduct.length,
    width: frontendIndividualProduct.width,
    weight: frontendIndividualProduct.weight,
    quality_grade: frontendIndividualProduct.qualityGrade,
    status: frontendIndividualProduct.status === 'completed' ? 'available' : frontendIndividualProduct.status,
    location: frontendIndividualProduct.location,
    production_date: frontendIndividualProduct.productionDate,
    completion_date: frontendIndividualProduct.completionDate,
    inspector: frontendIndividualProduct.inspector,
    notes: frontendIndividualProduct.notes,
  };
}
