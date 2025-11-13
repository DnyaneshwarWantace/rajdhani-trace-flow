// Rajdhani ERP Services - Main exports

// MongoDB Services (Primary)
export { CustomerService, type CreateCustomerData, type UpdateCustomerData } from './customerService';
export { OrderService, type CreateOrderData, type CreateOrderItemData, type UpdateOrderData } from './orderService';
export { RawMaterialService, type CreateRawMaterialData, type UpdateRawMaterialData, type MaterialConsumptionData, type CreateSupplierData } from './rawMaterialService';
export { ProductService, type CreateProductData, type UpdateProductData, type UpdateIndividualProductData } from './ProductService';
export { individualProductService, type CreateIndividualProductData } from './individualProductService';
export { ProductionService, type CreateProductionBatchData, type CreateProductionStepData, type UpdateProductionBatchData, type UpdateProductionStepData } from './productionService';
export { PurchaseOrderService, type CreatePurchaseOrderData, type UpdatePurchaseOrderData } from './purchaseOrderService';
export { NotificationService } from './notificationService';
export { AuditService, logAudit } from './auditService';
export { ProductRecipeService } from './productRecipeService';

// MongoDB API Services
export { ProductService as MongoDBProductService, type Product as MongoDBProduct, type CreateProductData as MongoDBCreateProductData, type UpdateProductData as MongoDBUpdateProductData, type ProductStats } from './api/productService';
export { IndividualProductService, type IndividualProduct as MongoDBIndividualProduct, type CreateIndividualProductData as MongoDBCreateIndividualProductData, type UpdateIndividualProductData as MongoDBUpdateIndividualProductData } from './api/individualProductService';
export { DropdownService } from './api/dropdownService';
export { PurchaseOrderService as MongoDBPurchaseOrderService } from './api/purchaseOrderService';
export { RawMaterialService as MongoDBRawMaterialService } from './api/rawMaterialService';
export { SupplierService } from './api/supplierService';
export { ManageStockService } from './api/manageStockService';

// Re-export types from supabase client
export type {
  Customer,
  Product,
  IndividualProduct,
  RawMaterial,
  Supplier,
  Order,
  OrderItem,
  ProductionBatch,
  ProductionStep,
  MaterialConsumption,
  ProductRecipe,
  RecipeMaterial,
  PurchaseOrder,
  AuditLog,
  Notification
} from '../lib/supabase';

// Export supabase client and utilities
export { supabase, testSupabaseConnection, handleSupabaseError, isSupabaseConfigured } from '../lib/supabase';
export { generateUniqueId, IDGenerator } from '../lib/idGenerator';