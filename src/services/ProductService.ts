import { supabase, supabaseAdmin, handleSupabaseError, Product, IndividualProduct } from '@/lib/supabase';
import { IDGenerator } from '@/lib/idGenerator';
import { logAudit } from './auditService';
import { NotificationService } from './notificationService';
import { QRCodeService, IndividualProductQRData, MainProductQRData } from '@/lib/qrCode';

export interface CreateProductData {
  id?: string;
  name: string;
  category: string;
  color?: string;
  pattern?: string;
  unit?: string;
  individual_stock_tracking?: boolean;
  min_stock_level?: number;
  max_stock_level?: number;
  base_quantity?: number;
  qr_code?: string;
  weight?: string;
  thickness?: string;
  width?: string;
  height?: string;
  image_url?: string;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  status?: 'in-stock' | 'low-stock' | 'out-of-stock';
  base_quantity?: number;
}

export interface CreateIndividualProductData {
  product_id: string;
  batch_number?: string;
  production_date: string;
  final_weight?: string;
  final_thickness?: string;
  quality_grade?: 'A+' | 'A' | 'B' | 'C';
  inspector?: string;
  production_notes?: string;
  location?: string;
}

export interface UpdateIndividualProductData extends Partial<CreateIndividualProductData> {
  status?: 'available' | 'sold' | 'damaged' | 'reserved';
  sold_date?: string;
  customer_id?: string;
  order_id?: string;
}

export class ProductService {
  // Create a new product
  static async createProduct(productData: CreateProductData): Promise<{ data: Product | null; error: string | null }> {
    try {
      // Validate required fields
      if (!productData.name?.trim()) {
        return { data: null, error: 'Product name is required' };
      }
      if (!productData.category?.trim()) {
        return { data: null, error: 'Product category is required' };
      }

      // Check if product with same name and specifications exists
      // Use admin client to bypass RLS for duplicate checking
      const client = supabaseAdmin || supabase;
      if (!client) {
        return { data: null, error: 'Supabase not configured' };
      }

      const { data: existingProducts } = await client
        .from('products')
        .select('name, category, color, pattern')
        .eq('name', productData.name.trim())
        .eq('category', productData.category.trim());
      
      // Filter in JavaScript to avoid URL encoding issues with special characters
      const existingProduct = existingProducts?.find(p => 
        p.name === productData.name.trim() &&
        p.category === productData.category.trim() &&
        (p.color || '') === (productData.color?.trim() || '') &&
        (p.pattern || '') === (productData.pattern?.trim() || '')
      );

      if (existingProduct) {
        return { data: null, error: 'A product with the same name and specifications already exists' };
      }

      // Generate meaningful ID if not provided
      const productId = productData.id || IDGenerator.generateProductId();

      // Prepare product data
      const newProduct = {
        id: productId,
        name: productData.name.trim(),
        category: productData.category.trim(),
        color: productData.color?.trim() || null,
        pattern: productData.pattern?.trim() || null,
        unit: productData.unit?.trim() || 'units',
        base_quantity: productData.base_quantity || 0,
        status: 'in-stock' as const, // Initially in stock
        individual_stock_tracking: productData.individual_stock_tracking ?? true,
        min_stock_level: productData.min_stock_level || 10,
        max_stock_level: productData.max_stock_level || 1000,
        weight: productData.weight?.trim() || null,
        thickness: productData.thickness?.trim() || null,
        width: productData.width?.trim() || null,
        height: productData.height?.trim() || null,
        image_url: productData.image_url || null
      };

      const { data, error } = await client
        .from('products')
        .insert(newProduct)
        .select()
        .single();

      if (error) {
        console.error('Error creating product:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Log audit
      await logAudit('product_created', 'products', data.id, null, {
        product_data: data
      });

      console.log('✅ Product created successfully:', data.name);
      return { data, error: null };

    } catch (error) {
      console.error('Error in createProduct:', error);
      return { data: null, error: 'Failed to create product' };
    }
  }

  // Get all products with optional filtering
  static async getProducts(filters?: {
    search?: string;
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[] | null; error: string | null; count?: number }> {
    try {
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      if (!client) {
        return { data: null, error: 'Supabase not configured' };
      }

      // Try to get products with individual_products first, fallback to products only if it fails
      let query = client
        .from('products')
        .select(`
          *,
          individual_products (
            id,
            qr_code,
            status,
            quality_grade,
            production_date,
            inspector,
            final_weight,
            final_thickness,
            final_width,
            final_height,
            notes,
            location
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        query = query.or(`name.ilike.${searchTerm},category.ilike.${searchTerm},color.ilike.${searchTerm}`);
      }

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      let { data, error, count } = await query;

      // If the query fails due to RLS or missing individual_products table, try fallback
      if (error && (error.code === 'PGRST301' || error.code === '42P01' || error.message?.includes('individual_products'))) {
        console.warn('individual_products table query failed, trying fallback:', error);

        // Fallback query without individual_products
        let fallbackQuery = client
          .from('products')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        // Re-apply filters to fallback query
        if (filters?.search) {
          const searchTerm = `%${filters.search.toLowerCase()}%`;
          fallbackQuery = fallbackQuery.or(`name.ilike.${searchTerm},category.ilike.${searchTerm},color.ilike.${searchTerm}`);
        }

        if (filters?.category && filters.category !== 'all') {
          fallbackQuery = fallbackQuery.eq('category', filters.category);
        }

        if (filters?.status && filters.status !== 'all') {
          fallbackQuery = fallbackQuery.eq('status', filters.status);
        }

        if (filters?.limit) {
          fallbackQuery = fallbackQuery.limit(filters.limit);
        }
        if (filters?.offset) {
          fallbackQuery = fallbackQuery.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
        }

        const fallbackResult = await fallbackQuery;
        data = fallbackResult.data;
        error = fallbackResult.error;
        count = fallbackResult.count;

        if (data) {
          // Add empty individual_products array to each product for compatibility
          data = data.map(product => ({ ...product, individual_products: [] }));
        }
      }

      if (error) {
        console.error('Error fetching products:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Calculate actual quantities and status for each product
      const processedData = data?.map(product => {
        console.log(`Processing product ${product.name}:`, {
          individual_products: product.individual_products,
          individual_products_count: product.individual_products?.length || 0
        });
        
        const availableProducts = product.individual_products?.filter(ip => ip.status === 'available') || [];
        const soldProducts = product.individual_products?.filter(ip => ip.status === 'sold') || [];
        const reservedProducts = product.individual_products?.filter(ip => ip.status === 'reserved') || [];
        const damagedProducts = product.individual_products?.filter(ip => ip.status === 'damaged') || [];

        console.log(`Product ${product.name} status breakdown:`, {
          available: availableProducts.length,
          sold: soldProducts.length,
          reserved: reservedProducts.length,
          damaged: damagedProducts.length
        });

        // For products with individual tracking, use individual products count
        // For bulk products (like raw materials), use base quantity
        const actualQuantity = availableProducts.length > 0 ? availableProducts.length : (parseFloat(product.base_quantity) || 0);
        
        const actualStatus = this.calculateProductStatus(actualQuantity, product.min_stock_level);

        // Generate QR code if not exists
        const productQRCode = product.qr_code || this.generateQRCode(product.id);

        // Map database fields to UI expected format
        return {
          id: product.id,
          qrCode: productQRCode,
          name: product.name,
          category: product.category,
          color: product.color || '',
          pattern: product.pattern || '',
          quantity: actualQuantity, // Use calculated quantity from individual products
          actual_quantity: actualQuantity, // Also set actual_quantity for compatibility
          unit: product.unit || 'units', // Use actual product unit, default to units
          status: product.status,
          notes: product.notes || '',
          imageUrl: product.image_url,
          weight: product.weight || '',
          thickness: product.thickness || '',
          width: product.width || '',
          height: product.height || '',
          manufacturingDate: product.manufacturing_date,
          individualStockTracking: product.individual_stock_tracking || false,
          minStockLevel: product.min_stock_level || 10,
          maxStockLevel: product.max_stock_level || 1000,
          createdAt: product.created_at,
          updatedAt: product.updated_at,
          // Additional calculated fields
          individual_products: (product.individual_products || []).map((ind: any) => {
            return {
            id: ind.id,
            qrCode: ind.qr_code,
            productId: ind.product_id || product.id, // Use product.id as fallback
            productName: ind.product_name || product.name, // Use product.name as fallback
            manufacturingDate: ind.production_date || ind.completion_date || ind.added_date || new Date().toISOString().split('T')[0],
            productionDate: ind.production_date,
            addedDate: ind.added_date,
            completionDate: ind.completion_date,
            materialsUsed: [], // Materials used would need separate query
            finalWeight: ind.final_weight || ind.weight || product.weight || '',
            finalThickness: ind.final_thickness || ind.thickness || product.thickness || '',
            finalWidth: ind.final_width || ind.width || product.width || '',
            finalHeight: ind.final_height || ind.height || product.height || '',
            width: ind.width || product.width || '',
            height: ind.height || product.height || '',
            thickness: ind.thickness || product.thickness || '',
            weight: ind.weight || product.weight || '',
            color: ind.color || product.color || '',
            pattern: ind.pattern || product.pattern || '',
            qualityGrade: ind.quality_grade || 'A',
            inspector: ind.inspector || 'Not Assigned',
            notes: ind.notes || '',
            status: ind.status || 'available',
            location: ind.location || ''
            };
          }), // Map individual products to UI format
          sold_quantity: soldProducts.length,
          reserved_quantity: reservedProducts.length,
          damaged_quantity: damagedProducts.length,
          total_produced: product.individual_products?.length || 0,
          actual_status: actualStatus
        };
      });

      return { data: processedData || [], error: null, count: count || 0 };

    } catch (error) {
      console.error('Error in getProducts:', error);
      return { data: null, error: 'Failed to fetch products' };
    }
  }

  // Calculate product status based on actual quantity
  private static calculateProductStatus(actualQuantity: number, minStockLevel: number): 'in-stock' | 'low-stock' | 'out-of-stock' {
    if (actualQuantity <= 0) return 'out-of-stock';
    if (actualQuantity <= minStockLevel) return 'low-stock';
    return 'in-stock';
  }

  // Get product by ID with individual products
  static async getProductById(productId: string): Promise<{ data: any | null; error: string | null }> {
    try {
      // Try to find by ID (works for both UUID and old string IDs)
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          individual_products (*)
        `)
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Calculate actual quantities
      const availableProducts = data.individual_products?.filter(ip => ip.status === 'available') || [];
      const soldProducts = data.individual_products?.filter(ip => ip.status === 'sold') || [];
      const reservedProducts = data.individual_products?.filter(ip => ip.status === 'reserved') || [];
      const damagedProducts = data.individual_products?.filter(ip => ip.status === 'damaged') || [];

      // For products with individual tracking, use individual products count
      // For bulk products (like raw materials), use base quantity
      const actualQuantity = availableProducts.length > 0 ? availableProducts.length : (parseFloat(data.base_quantity) || 0);
      const actualStatus = this.calculateProductStatus(actualQuantity, data.min_stock_level);

      // Generate QR code if not exists
      const productQRCode = data.qr_code || this.generateQRCode(data.id);

      const processedData = {
        id: data.id,
        qrCode: productQRCode,
        name: data.name,
        category: data.category,
        color: data.color || '',
        pattern: data.pattern || '',
        quantity: actualQuantity,
        actual_quantity: actualQuantity,
        unit: data.unit || 'units',
        status: data.status,
        notes: data.notes || '',
        imageUrl: data.image_url,
        weight: data.weight || '',
        thickness: data.thickness || '',
        width: data.width || '',
        height: data.height || '',
        manufacturingDate: data.manufacturing_date,
        individualStockTracking: data.individual_stock_tracking || false,
        materialsUsed: [], // Empty array for now since recipe system isn't set up
        sold_quantity: soldProducts.length,
        reserved_quantity: reservedProducts.length,
        damaged_quantity: damagedProducts.length,
        total_produced: data.individual_products?.length || 0,
        actual_status: actualStatus
      };

      return { data: processedData, error: null };

    } catch (error) {
      console.error('Error in getProductById:', error);
      return { data: null, error: 'Failed to fetch product' };
    }
  }

  // Update a product
  static async updateProduct(productId: string, updateData: UpdateProductData): Promise<{ data: Product | null; error: string | null }> {
    try {
      // Get current product data for audit
      const { data: currentProduct } = await this.getProductById(productId);
      if (!currentProduct) {
        return { data: null, error: 'Product not found' };
      }

      // Prepare update data
      const cleanUpdateData = {
        ...(updateData.name && { name: updateData.name.trim() }),
        ...(updateData.category && { category: updateData.category.trim() }),
        ...(updateData.color !== undefined && { color: updateData.color?.trim() || null }),
        ...(updateData.pattern !== undefined && { pattern: updateData.pattern?.trim() || null }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.individual_stock_tracking !== undefined && { individual_stock_tracking: updateData.individual_stock_tracking }),
        ...(updateData.min_stock_level !== undefined && { min_stock_level: updateData.min_stock_level }),
        ...(updateData.max_stock_level !== undefined && { max_stock_level: updateData.max_stock_level }),
        ...(updateData.base_quantity !== undefined && { base_quantity: updateData.base_quantity })
      };

      const { data, error } = await supabase
        .from('products')
        .update(cleanUpdateData)
        .eq('id', productId)
        .select()
        .single();

      if (error) {
        console.error('Error updating product:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Log audit
      await logAudit('product_updated', 'products', data.id, currentProduct, data);

      console.log('✅ Product updated successfully:', data.name);
      return { data, error: null };

    } catch (error) {
      console.error('Error in updateProduct:', error);
      return { data: null, error: 'Failed to update product' };
    }
  }

  // Create individual product
  static async createIndividualProduct(productData: CreateIndividualProductData): Promise<{ data: IndividualProduct | null; error: string | null }> {
    try {
      // Validate required fields
      if (!productData.product_id) {
        return { data: null, error: 'Product ID is required' };
      }
      if (!productData.production_date) {
        return { data: null, error: 'Production date is required' };
      }

      // Verify product exists
      const { data: product } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', productData.product_id)
        .single();

      if (!product) {
        return { data: null, error: 'Product not found' };
      }

      // Generate unique QR code
      const qrCode = this.generateQRCode(productData.product_id, productData.batch_number);

      // Prepare individual product data
      const newIndividualProduct = {
        qr_code: qrCode,
        product_id: productData.product_id,
        batch_number: productData.batch_number?.trim() || null,
        production_date: productData.production_date,
        final_weight: productData.final_weight?.trim() || null,
        final_thickness: productData.final_thickness?.trim() || null,
        quality_grade: productData.quality_grade || 'A',
        inspector: productData.inspector?.trim() || null,
        status: 'available' as const,
        location: productData.location?.trim() || 'Warehouse A - General Storage',
        production_notes: productData.production_notes?.trim() || null
      };

      const { data, error } = await supabase
        .from('individual_products')
        .insert(newIndividualProduct)
        .select()
        .single();

      if (error) {
        console.error('Error creating individual product:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Update product status after adding new individual product
      await this.updateProductStockStatus(productData.product_id);

      // Log audit
      await logAudit('individual_product_created', 'individual_products', data.id, null, {
        product_id: productData.product_id,
        product_name: product.name,
        individual_product_data: data
      });

      console.log('✅ Individual product created successfully:', data.qr_code);
      return { data, error: null };

    } catch (error) {
      console.error('Error in createIndividualProduct:', error);
      return { data: null, error: 'Failed to create individual product' };
    }
  }

  // Generate QR code for individual product
  static async generateIndividualProductQRCode(individualProductId: string): Promise<{ qrCodeURL: string | null; error: string | null }> {
    try {
      // Get individual product with full details (without product_recipes to avoid 406 errors)
      const { data: individualProduct } = await supabase
        .from('individual_products')
        .select(`
          *,
          products (
            name,
            category,
            color,
            width,
            height,
            pattern,
            product_recipes (
              *,
              recipe_materials (
                quantity,
                unit,
                raw_materials (name)
              )
            )
          ),
          production_batches (
            batch_number,
            production_steps (
              step_name,
              completed_at,
              operator,
              quality_check_passed
            )
          )
        `)
        .eq('id', individualProductId)
        .single();

      if (!individualProduct) {
        return { qrCodeURL: null, error: 'Individual product not found' };
      }

      // Prepare QR data for individual product
      const qrData: IndividualProductQRData = {
        id: individualProduct.id,
        product_id: individualProduct.product_id,
        product_name: individualProduct.products.name,
        batch_id: individualProduct.production_batches?.id || '',
        serial_number: individualProduct.qr_code,
        production_date: individualProduct.production_date,
        quality_grade: individualProduct.quality_grade || 'A',
        dimensions: {
          length: parseFloat(individualProduct.final_width || '0'),
          width: parseFloat(individualProduct.final_height || '0'),
          thickness: parseFloat(individualProduct.final_thickness || '0')
        },
        weight: parseFloat(individualProduct.final_weight || '0'),
        color: individualProduct.products.color || '',
        pattern: individualProduct.products.pattern || '',
        material_composition: individualProduct.products.product_recipes?.[0]?.recipe_materials?.map(
          rm => rm.raw_materials.name
        ) || [],
        production_steps: individualProduct.production_batches?.production_steps?.map(ps => ({
          step_name: ps.step_name,
          completed_at: ps.completed_at,
          operator: ps.operator || '',
          quality_check: ps.quality_check_passed || false
        })) || [],
        machine_used: ['Loom Machine', 'Cutting Machine'], // Default machines - can be enhanced
        inspector: individualProduct.inspector || '',
        status: individualProduct.status as 'active' | 'sold' | 'damaged' | 'returned',
        created_at: individualProduct.created_at
      };

      const qrCodeURL = await QRCodeService.generateIndividualProductQR(qrData);
      return { qrCodeURL, error: null };

    } catch (error) {
      console.error('Error generating individual product QR code:', error);
      return { qrCodeURL: null, error: 'Failed to generate QR code' };
    }
  }

  // Generate QR code for main product
  static async generateMainProductQRCode(productId: string): Promise<{ qrCodeURL: string | null; error: string | null }> {
    try {
      // Get product with full details
      const { data: product } = await supabase
        .from('products')
        .select(`
          *,
          individual_products (status),
          product_recipes (
            production_time,
            difficulty_level,
            recipe_materials (
              quantity,
              unit,
              raw_materials (id, name)
            )
          )
        `)
        .eq('id', productId)
        .single();

      if (!product) {
        return { qrCodeURL: null, error: 'Product not found' };
      }

      const availableQuantity = product.individual_products?.filter(ip => ip.status === 'available').length || 0;
      const totalQuantity = product.individual_products?.length || 0;

      // Prepare QR data for main product
      const qrData: MainProductQRData = {
        product_id: product.id,
        product_name: product.name,
        description: `${product.category} carpet - ${product.color || 'Various colors'} - ${product.pattern || 'Various patterns'}`,
        category: product.category,
        total_quantity: totalQuantity,
        available_quantity: availableQuantity,
        recipe: {
          materials: product.product_recipes?.[0]?.recipe_materials?.map(rm => ({
            material_id: rm.raw_materials.id,
            material_name: rm.raw_materials.name,
            quantity: rm.quantity,
            unit: rm.unit
          })) || [],
          production_time: product.product_recipes?.[0]?.production_time || 0,
          difficulty_level: product.product_recipes?.[0]?.difficulty_level || 'Medium'
        },
        machines_required: ['Loom Machine', 'Cutting Machine', 'Binding Machine'], // Default machines
        production_steps: ['Warping', 'Weaving', 'Cutting', 'Binding', 'Quality Check'], // Default steps
        quality_standards: {
          min_weight: 2.0,
          max_weight: 15.0,
          dimensions_tolerance: 0.05,
          quality_criteria: ['Color consistency', 'Pattern alignment', 'Edge finishing', 'Pile height uniformity']
        },
        created_at: product.created_at,
        updated_at: product.updated_at
      };

      const qrCodeURL = await QRCodeService.generateMainProductQR(qrData);
      return { qrCodeURL, error: null };

    } catch (error) {
      console.error('Error generating main product QR code:', error);
      return { qrCodeURL: null, error: 'Failed to generate QR code' };
    }
  }

  // Generate QR code for individual products
  private static generateQRCode(productId: string, batchNumber?: string): string {
    return IDGenerator.generateQRCode();
  }

  // Update product stock status based on individual products
  static async updateProductStockStatus(productId: string): Promise<void> {
    try {
      // Get product and its individual products
      const { data: productData } = await this.getProductById(productId);
      if (!productData) return;

      const actualStatus = this.calculateProductStatus(productData.actual_quantity, productData.min_stock_level);

      // Update product status if changed
      if (actualStatus !== productData.status) {
        await supabase
          .from('products')
          .update({ status: actualStatus })
          .eq('id', productId);

        // Create low stock notification if needed
        if (actualStatus === 'low-stock') {
          await NotificationService.createNotification({
            type: 'warning',
            title: 'Product Low Stock Alert',
            message: `Product "${productData.name}" is running low. Available: ${productData.actual_quantity} units`,
            priority: 'high',
            status: 'unread',
            module: 'products',
            related_id: productId,
            related_data: {
              product_name: productData.name,
              available_quantity: productData.actual_quantity,
              min_stock_level: productData.min_stock_level
            },
            created_by: 'system'
          });
        } else if (actualStatus === 'out-of-stock') {
          await NotificationService.createNotification({
            type: 'error',
            title: 'Product Out of Stock',
            message: `Product "${productData.name}" is now out of stock!`,
            priority: 'urgent',
            status: 'unread',
            module: 'products',
            related_id: productId,
            related_data: {
              product_name: productData.name,
              available_quantity: 0
            },
            created_by: 'system'
          });
        }

        console.log(`✅ Updated product status to ${actualStatus} for product ${productId}`);
      }

    } catch (error) {
      console.error('Error updating product stock status:', error);
    }
  }

  // Get individual products with optional filtering
  static async getIndividualProducts(filters?: {
    product_id?: string;
    batch_number?: string;
    status?: string;
    quality_grade?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[] | null; error: string | null; count?: number }> {
    try {
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      if (!client) {
        return { data: null, error: 'Supabase not configured' };
      }

      let query = client
        .from('individual_products')
        .select(`
          *,
          products (name, category, color, pattern)
        `, { count: 'exact' })
        .order('production_date', { ascending: false });

      // Apply filters
      if (filters?.product_id) {
        query = query.eq('product_id', filters.product_id);
      }

      if (filters?.batch_number) {
        query = query.eq('batch_number', filters.batch_number);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.quality_grade && filters.quality_grade !== 'all') {
        query = query.eq('quality_grade', filters.quality_grade);
      }

      if (filters?.search && typeof filters.search === 'string' && filters.search.trim()) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        query = query.or(`qr_code.ilike.${searchTerm},batch_number.ilike.${searchTerm},inspector.ilike.${searchTerm}`);
      }

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching individual products:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null, count: count || 0 };

    } catch (error) {
      console.error('Error in getIndividualProducts:', error);
      return { data: null, error: 'Failed to fetch individual products' };
    }
  }

  // Update individual product
  static async updateIndividualProduct(individualProductId: string, updateData: UpdateIndividualProductData): Promise<{ data: IndividualProduct | null; error: string | null }> {
    try {
      // Get current individual product data for audit
      const { data: currentProduct } = await supabase
        .from('individual_products')
        .select('*')
        .eq('id', individualProductId)
        .single();

      if (!currentProduct) {
        return { data: null, error: 'Individual product not found' };
      }

      // Prepare update data
      const cleanUpdateData = {
        ...(updateData.batch_number !== undefined && { batch_number: updateData.batch_number?.trim() || null }),
        ...(updateData.production_date && { production_date: updateData.production_date }),
        ...(updateData.final_weight !== undefined && { final_weight: updateData.final_weight?.trim() || null }),
        ...(updateData.final_thickness !== undefined && { final_thickness: updateData.final_thickness?.trim() || null }),
        ...(updateData.quality_grade && { quality_grade: updateData.quality_grade }),
        ...(updateData.inspector !== undefined && { inspector: updateData.inspector?.trim() || null }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.sold_date !== undefined && { sold_date: updateData.sold_date }),
        ...(updateData.customer_id !== undefined && { customer_id: updateData.customer_id }),
        ...(updateData.order_id !== undefined && { order_id: updateData.order_id }),
        ...(updateData.production_notes !== undefined && { production_notes: updateData.production_notes?.trim() || null })
      };

      const { data, error } = await supabase
        .from('individual_products')
        .update(cleanUpdateData)
        .eq('id', individualProductId)
        .select()
        .single();

      if (error) {
        console.error('Error updating individual product:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Update parent product stock status if status changed
      if (updateData.status && updateData.status !== currentProduct.status) {
        await this.updateProductStockStatus(data.product_id);
      }

      // Log audit
      await logAudit('individual_product_updated', 'individual_products', data.id, currentProduct, data);

      console.log('✅ Individual product updated successfully:', data.qr_code);
      return { data, error: null };

    } catch (error) {
      console.error('Error in updateIndividualProduct:', error);
      return { data: null, error: 'Failed to update individual product' };
    }
  }

  // Get product statistics
  static async getProductStats(): Promise<{
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    totalProduced: number;
    totalSold: number;
    availableUnits: number;
  }> {
    try {
      const { data: products } = await supabase
        .from('products')
        .select(`
          status,
          category,
          individual_products (status)
        `);

      if (!products) return {
        totalProducts: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalProduced: 0,
        totalSold: 0,
        availableUnits: 0
      };

      const stats = products.reduce((acc, product) => {
        acc.totalProducts++;
 
        // Product status counts
        if (product.status === 'in-stock') acc.inStock++;
        else if (product.status === 'low-stock') acc.lowStock++;
        else if (product.status === 'out-of-stock') acc.outOfStock++;
 
        // Individual product counts
        const individualProducts = product.individual_products || [];
        acc.totalProduced += individualProducts.length;
        acc.totalSold += individualProducts.filter(ip => ip.status === 'sold').length;
        acc.availableUnits += individualProducts.filter(ip => ip.status === 'available').length;
 
        // Carpet-specific counts (filter out raw materials)
        const isCarpet = product.category && 
          !product.category.toLowerCase().includes('raw') && 
          !product.category.toLowerCase().includes('material') &&
          !product.category.toLowerCase().includes('yarn') &&
          !product.category.toLowerCase().includes('fiber');
        
        if (isCarpet) {
          acc.carpetProducts++;
          if (product.status === 'low-stock' || product.status === 'out-of-stock') {
            acc.carpetLowStock++;
          }
        }
 
        return acc;
      }, {
        totalProducts: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalProduced: 0,
        totalSold: 0,
        availableUnits: 0,
        carpetProducts: 0,
        carpetLowStock: 0
      });

      return stats;

    } catch (error) {
      console.error('Error getting product stats:', error);
      return {
        totalProducts: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalProduced: 0,
        totalSold: 0,
        availableUnits: 0
      };
    }
  }

  // Get available individual products for a specific product
  static async getAvailableIndividualProducts(productId: string, qualityGrade?: string): Promise<{ data: IndividualProduct[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('individual_products')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'available')
        .order('production_date', { ascending: true });

      if (qualityGrade && qualityGrade !== 'all') {
        query = query.eq('quality_grade', qualityGrade);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching available individual products:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null };

    } catch (error) {
      console.error('Error in getAvailableIndividualProducts:', error);
      return { data: null, error: 'Failed to fetch available individual products' };
    }
  }
}

export default ProductService;