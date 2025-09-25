import { supabase, handleSupabaseError, Order, OrderItem } from '@/lib/supabase';
import { generateUniqueId } from '@/lib/idGenerator';
import { logAudit } from './auditService';
import { CustomerService } from './customerService';
import { NotificationService } from './notificationService';

export interface CreateOrderData {
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  expected_delivery?: string;
  items: CreateOrderItemData[];
  gst_rate?: number;
  discount_amount?: number;
  paid_amount?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  special_instructions?: string;
}

export interface CreateOrderItemData {
  product_id?: string;
  product_name: string;
  product_type: 'product' | 'raw_material';
  quantity: number;
  unit_price: number;
  quality_grade?: string;
  specifications?: string;
  selected_individual_products?: string[]; // Array of individual product IDs
}

export interface UpdateOrderData {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  expected_delivery?: string;
  status?: 'pending' | 'accepted' | 'in_production' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
  workflow_step?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  special_instructions?: string;
  paid_amount?: number;
  total_amount?: number;
  outstanding_amount?: number;
  subtotal?: number;
  gst_amount?: number;
  items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    selected_individual_products?: string[];
  }>;
}

export class OrderService {
  // Generate unique order number
  private static generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `ORD${year}${month}${day}${random}`;
  }

  // Create a new order
  static async createOrder(orderData: CreateOrderData): Promise<{ data: Order | null; error: string | null }> {
    try {
      // Validate required fields
      if (!orderData.customer_name?.trim()) {
        return { data: null, error: 'Customer name is required' };
      }
      if (!orderData.items || orderData.items.length === 0) {
        return { data: null, error: 'Order must have at least one item' };
      }

      // Validate all order items
      for (const item of orderData.items) {
        if (!item.product_name?.trim()) {
          return { data: null, error: 'All items must have a product name' };
        }
        if (item.quantity <= 0) {
          return { data: null, error: 'All items must have quantity greater than 0' };
        }
        if (item.unit_price < 0) {
          return { data: null, error: 'Unit price cannot be negative' };
        }
      }

      // Calculate order totals
      const subtotal = orderData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const gstRate = orderData.gst_rate || 18;
      const discountAmount = orderData.discount_amount || 0;
      const gstAmount = ((subtotal - discountAmount) * gstRate) / 100;
      const totalAmount = subtotal + gstAmount - discountAmount;

      // Generate order number
      const orderNumber = this.generateOrderNumber();

      // Generate unique order ID
      const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Prepare order data
      const newOrder = {
        id: orderId,
        order_number: orderNumber,
        customer_id: orderData.customer_id || null,
        customer_name: orderData.customer_name.trim(),
        customer_email: orderData.customer_email?.trim() || null,
        customer_phone: orderData.customer_phone?.trim() || null,
        order_date: new Date().toISOString(),
        expected_delivery: orderData.expected_delivery || null,
        subtotal,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        paid_amount: orderData.paid_amount || 0,
        outstanding_amount: totalAmount - (orderData.paid_amount || 0),
        status: 'accepted' as const,
        workflow_step: 'accept',
        priority: orderData.priority || 'medium',
        special_instructions: orderData.special_instructions?.trim() || null,
        created_by: 'admin'
      };

      // Create order in database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(newOrder)
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        return { data: null, error: handleSupabaseError(orderError) };
      }

      // Create order items
      const orderItems = orderData.items.map(item => ({
        id: `ORDITEM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        order_id: order.id,
        product_id: item.product_type === 'raw_material' ? null : (item.product_id || null),
        product_name: item.product_name.trim(),
        product_type: item.product_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        quality_grade: item.quality_grade?.trim() || null,
        specifications: item.specifications?.trim() || null
      }));

      const { data: createdItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select();

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // Cleanup: delete the order if items creation failed
        await supabase.from('orders').delete().eq('id', order.id);
        return { data: null, error: handleSupabaseError(itemsError) };
      }

      // Handle individual product assignments and workflow advancement
      let hasIndividualProducts = false;
      if (createdItems) {
        for (let i = 0; i < createdItems.length; i++) {
          const item = createdItems[i];
          const originalItem = orderData.items[i];

          if (originalItem.selected_individual_products && originalItem.selected_individual_products.length > 0) {
            hasIndividualProducts = true;
            
            // Mark individual products as reserved
            await supabase
              .from('individual_products')
              .update({
                status: 'reserved',
                order_id: order.id,
                customer_id: order.customer_id
              })
              .in('id', originalItem.selected_individual_products);
          }
        }
      }

      // If individual products are selected, advance workflow to skip individual product details step
      if (hasIndividualProducts) {
        await supabase
          .from('orders')
          .update({
            workflow_step: 'ready', // Skip individual product details step
            status: 'ready' // Mark as ready since products are already selected
          })
          .eq('id', order.id);
        
        console.log('✅ Order workflow advanced to "ready" - individual products already selected');
      }

      // Update customer order statistics if customer exists
      if (order.customer_id) {
        await CustomerService.updateCustomerOrderStats(order.customer_id);
      }

      // Create notification
      await NotificationService.createNotification({
        type: 'info',
        title: 'New Order Created',
        message: `Order ${orderNumber} has been created for customer ${order.customer_name}`,
        priority: 'medium',
        status: 'unread',
        module: 'orders',
        related_id: order.id,
        related_data: { order_number: orderNumber, customer_name: order.customer_name, total_amount: totalAmount },
        created_by: 'system'
      });

      // Log audit
      await logAudit('order_created', 'orders', order.id, orderNumber, {
        order_data: order,
        items_count: createdItems?.length || 0,
        total_amount: totalAmount
      });

      console.log('✅ Order created successfully:', orderNumber);
      return { data: order, error: null };

    } catch (error) {
      console.error('Error in createOrder:', error);
      return { data: null, error: 'Failed to create order' };
    }
  }

  // Get all orders with optional filtering
  static async getOrders(filters?: {
    search?: string;
    status?: string;
    customer_id?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[] | null; error: string | null; count?: number }> {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        query = query.or(`order_number.ilike.${searchTerm},customer_name.ilike.${searchTerm},customer_email.ilike.${searchTerm}`);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      if (filters?.date_from) {
        query = query.gte('order_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('order_date', filters.date_to);
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
        console.error('Error fetching orders:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null, count: count || 0 };

    } catch (error) {
      console.error('Error in getOrders:', error);
      return { data: null, error: 'Failed to fetch orders' };
    }
  }

  // Get a single order by ID with full details
  static async getOrderById(orderId: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          customers (
            name,
            email,
            phone,
            address,
            city,
            state,
            pincode
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data, error: null };

    } catch (error) {
      console.error('Error in getOrderById:', error);
      return { data: null, error: 'Failed to fetch order' };
    }
  }

  // Update an order
  static async updateOrder(orderId: string, updateData: UpdateOrderData): Promise<{ data: Order | null; error: string | null }> {
    try {
      // Get current order data for audit
      const { data: currentOrder } = await this.getOrderById(orderId);
      if (!currentOrder) {
        return { data: null, error: 'Order not found' };
      }

      // Prepare update data
      const cleanUpdateData: any = {
        updated_at: new Date().toISOString(), // Always update the timestamp
        ...(updateData.customer_name && { customer_name: updateData.customer_name.trim() }),
        ...(updateData.customer_email !== undefined && { customer_email: updateData.customer_email?.trim() || null }),
        ...(updateData.customer_phone !== undefined && { customer_phone: updateData.customer_phone?.trim() || null }),
        ...(updateData.expected_delivery !== undefined && { expected_delivery: updateData.expected_delivery || null }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.workflow_step !== undefined && { workflow_step: updateData.workflow_step?.trim() || null }),
        ...(updateData.priority && { priority: updateData.priority }),
        ...(updateData.special_instructions !== undefined && { special_instructions: updateData.special_instructions?.trim() || null }),
        ...(updateData.paid_amount !== undefined && {
          paid_amount: updateData.paid_amount,
          outstanding_amount: currentOrder.total_amount - updateData.paid_amount
        }),
        ...(updateData.total_amount !== undefined && { total_amount: updateData.total_amount }),
        ...(updateData.outstanding_amount !== undefined && { outstanding_amount: updateData.outstanding_amount }),
        ...(updateData.subtotal !== undefined && { subtotal: updateData.subtotal }),
        ...(updateData.gst_amount !== undefined && { gst_amount: updateData.gst_amount })
      };

      // Handle status change timestamps
      if (updateData.status) {
        const now = new Date().toISOString();
        if (updateData.status === 'accepted' && !currentOrder.accepted_at) {
          cleanUpdateData.accepted_at = now;
        } else if (updateData.status === 'dispatched' && !currentOrder.dispatched_at) {
          cleanUpdateData.dispatched_at = now;
          // Mark individual products as sold when order is dispatched
          await this.markIndividualProductsAsSold(orderId);
        } else if (updateData.status === 'delivered' && !currentOrder.delivered_at) {
          cleanUpdateData.delivered_at = now;
          // Mark individual products as sold when order is delivered
          await this.markIndividualProductsAsSold(orderId);
        }
      }

      const { data, error } = await supabase
        .from('orders')
        .update(cleanUpdateData)
        .eq('id', orderId)
        .select();

      if (error) {
        console.error('Error updating order:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      if (!data || data.length === 0) {
        return { data: null, error: 'Order not found or update failed' };
      }

      // Update order items if provided
      if (updateData.items && updateData.items.length > 0) {
        for (const item of updateData.items) {
          // Update the order item
          const { error: itemError } = await supabase
            .from('order_items')
            .update({
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price
            })
            .eq('id', item.id);

          if (itemError) {
            console.error('Error updating order item:', itemError);
            return { data: null, error: `Failed to update order item: ${handleSupabaseError(itemError)}` };
          }

          // Handle individual product selections
          if (item.selected_individual_products !== undefined) {
            // Get current individual products for this order to release them
            const { data: currentIndividualProducts } = await supabase
              .from('individual_products')
              .select('id')
              .eq('order_id', orderId);

            // Release any previously selected individual products for this order
            if (currentIndividualProducts && currentIndividualProducts.length > 0) {
              await supabase
                .from('individual_products')
                .update({
                  status: 'available',
                  order_id: null,
                  customer_id: null
                })
                .eq('order_id', orderId);
            }

            // Then, mark the newly selected individual products as reserved
            if (item.selected_individual_products.length > 0) {
              const { error: individualProductError } = await supabase
                .from('individual_products')
                .update({
                  status: 'reserved',
                  order_id: orderId,
                  customer_id: currentOrder.customer_id
                })
                .in('id', item.selected_individual_products);

              if (individualProductError) {
                console.error('Error updating individual products:', individualProductError);
                return { data: null, error: `Failed to update individual products: ${handleSupabaseError(individualProductError)}` };
              }
            }
          }
        }

        // Recalculate order totals after updating items
        const { data: updatedOrderItems } = await supabase
          .from('order_items')
          .select('total_price')
          .eq('order_id', orderId);

        if (updatedOrderItems) {
          const newSubtotal = updatedOrderItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
          const gstRate = currentOrder.gst_rate || 18;
          const discountAmount = currentOrder.discount_amount || 0;
          const gstAmount = ((newSubtotal - discountAmount) * gstRate) / 100;
          const newTotalAmount = newSubtotal + gstAmount - discountAmount;
          const newOutstandingAmount = newTotalAmount - (currentOrder.paid_amount || 0);

          // Update order totals
          await supabase
            .from('orders')
            .update({
              subtotal: newSubtotal,
              gst_amount: gstAmount,
              total_amount: newTotalAmount,
              outstanding_amount: newOutstandingAmount
            })
            .eq('id', orderId);

          console.log(`✅ Updated order totals: subtotal=${newSubtotal}, total=${newTotalAmount}, outstanding=${newOutstandingAmount}`);
        }
      }

      // Update customer order statistics if customer exists
      if (data[0]?.customer_id) {
        await CustomerService.updateCustomerOrderStats(data[0].customer_id);
      }

      // Create notifications for status changes
      if (updateData.status && updateData.status !== currentOrder.status) {
        await NotificationService.createNotification({
          type: 'info',
          title: `Order Status Updated`,
          message: `Order ${currentOrder.order_number} status changed from ${currentOrder.status} to ${updateData.status}`,
          priority: 'medium',
          status: 'unread',
          module: 'orders',
          related_id: orderId,
          related_data: {
            order_number: currentOrder.order_number,
            old_status: currentOrder.status,
            new_status: updateData.status
          },
          created_by: 'system'
        });
      }

      const updatedOrder = data[0];

      // Log audit
      await logAudit('order_updated', 'orders', updatedOrder.id, updatedOrder.order_number, {
        updated_fields: Object.keys(cleanUpdateData),
        previous_state: currentOrder,
        new_state: updatedOrder
      });

      console.log('✅ Order updated successfully:', updatedOrder.order_number);
      return { data: updatedOrder, error: null };

    } catch (error) {
      console.error('Error in updateOrder:', error);
      return { data: null, error: 'Failed to update order' };
    }
  }

  // Mark individual products as sold and deduct raw material stock when order is dispatched/delivered
  private static async markIndividualProductsAsSold(orderId: string): Promise<void> {
    try {
      // Get all individual products associated with this order with product_id
      const { data: individualProducts } = await supabase
        .from('individual_products')
        .select('id, product_id')
        .eq('order_id', orderId);

      if (individualProducts && individualProducts.length > 0) {
        const productIds = individualProducts.map(ip => ip.id);

        // Mark individual products as sold
        await supabase
          .from('individual_products')
          .update({
            status: 'sold',
            sold_date: new Date().toISOString()
          })
          .in('id', productIds);

        // Update product inventory counts
        const productCounts = individualProducts.reduce((acc, ip) => {
          acc[ip.product_id] = (acc[ip.product_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Update each product's inventory
        for (const [productId, soldCount] of Object.entries(productCounts)) {
          // Get current product data
          const { data: product } = await supabase
            .from('products')
            .select('quantity, individual_stock_tracking')
            .eq('id', productId)
            .single();

          if (product) {
            // Only update inventory if the product uses individual stock tracking
            if (product.individual_stock_tracking !== false) {
              const newQuantity = Math.max(0, (product.quantity || 0) - soldCount);
              
              await supabase
                .from('products')
                .update({
                  quantity: newQuantity,
                  status: newQuantity <= 0 ? 'out-of-stock' : 
                         newQuantity <= 5 ? 'low-stock' : 'in-stock'
                })
                .eq('id', productId);

              console.log(`✅ Updated product ${productId} inventory: -${soldCount} units (new quantity: ${newQuantity})`);
            }
          }
        }

        console.log(`✅ Marked ${productIds.length} individual products as sold for order ${orderId}`);
      }

      // Handle raw material stock deduction for raw material orders
      await this.deductRawMaterialStock(orderId);

    } catch (error) {
      console.error('Error marking individual products as sold:', error);
    }
  }

  // Deduct raw material stock when raw materials are sold in orders
  private static async deductRawMaterialStock(orderId: string): Promise<void> {
    try {
      // Get all order items that are raw materials
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .eq('product_type', 'raw_material');

      if (orderItems && orderItems.length > 0) {
        console.log(`🔍 Found ${orderItems.length} raw material items in order ${orderId}`);

        for (const item of orderItems) {
          console.log(`🔍 Processing raw material order item:`, {
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price
          });

          // Find ALL raw materials with this name (not just the most recent)
          const { data: rawMaterials } = await supabase
            .from('raw_materials')
            .select('*')
            .eq('name', item.product_name)
            .order('current_stock', { ascending: false }); // Get materials with highest stock first

          if (rawMaterials && rawMaterials.length > 0) {
            console.log(`🔍 Found ${rawMaterials.length} raw materials with name "${item.product_name}"`);
            
            let remainingQuantity = item.quantity || 0;
            
            // Deduct from materials with stock, starting with highest stock
            for (const material of rawMaterials) {
              if (remainingQuantity <= 0) break;
              
              const currentStock = material.current_stock || 0;
              if (currentStock <= 0) continue; // Skip materials with no stock
              
              const deductAmount = Math.min(remainingQuantity, currentStock);
              const newStock = currentStock - deductAmount;
              remainingQuantity -= deductAmount;

              console.log(`🔍 Deducting ${deductAmount} units from material ${material.name} (ID: ${material.id}) - Stock: ${currentStock} → ${newStock}`);

              // Update the raw material stock
              const { error: updateError } = await supabase
                .from('raw_materials')
                .update({
                  current_stock: newStock,
                  status: newStock <= 0 ? 'out-of-stock' : 
                         newStock <= (material.min_threshold || 10) ? 'low-stock' : 'in-stock',
                  updated_at: new Date().toISOString()
                })
                .eq('id', material.id);

              if (updateError) {
                console.error(`❌ Error updating raw material ${material.name} stock:`, updateError);
              } else {
                console.log(`✅ Successfully deducted ${deductAmount} units from ${material.name} (${currentStock} → ${newStock})`);
              }
            }
            
            if (remainingQuantity > 0) {
              console.warn(`⚠️ Could not fully fulfill order for "${item.product_name}". Remaining quantity: ${remainingQuantity} units`);
            }
          } else {
            console.warn(`⚠️ Raw material "${item.product_name}" not found in inventory`);
          }
        }
      } else {
        console.log(`🔍 No raw material items found in order ${orderId}`);
      }
    } catch (error) {
      console.error('Error deducting raw material stock:', error);
    }
  }

  // Deliver an order
  static async deliverOrder(orderId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get current order
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !currentOrder) {
        return { success: false, error: 'Order not found' };
      }

      if (currentOrder.status !== 'dispatched') {
        return { success: false, error: 'Order must be dispatched before delivery' };
      }

      // Update order status to delivered
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          workflow_step: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error delivering order:', error);
        return { success: false, error: handleSupabaseError(error) };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error in deliverOrder:', error);
      return { success: false, error: 'Failed to deliver order' };
    }
  }

  // Cancel an order
  static async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: currentOrder } = await this.getOrderById(orderId);
      if (!currentOrder) {
        return { success: false, error: 'Order not found' };
      }

      if (['delivered', 'cancelled'].includes(currentOrder.status)) {
        return { success: false, error: 'Cannot cancel a delivered or already cancelled order' };
      }

      // Update order status
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          workflow_step: reason || 'Order cancelled',
          outstanding_amount: 0
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error cancelling order:', error);
        return { success: false, error: handleSupabaseError(error) };
      }

      // Release reserved individual products
      await supabase
        .from('individual_products')
        .update({
          status: 'available',
          order_id: null,
          customer_id: null
        })
        .eq('order_id', orderId);

      // Update customer statistics
      if (currentOrder.customer_id) {
        await CustomerService.updateCustomerOrderStats(currentOrder.customer_id);
      }

      // Create notification
      await NotificationService.createNotification({
        type: 'warning',
        title: 'Order Cancelled',
        message: `Order ${currentOrder.order_number} has been cancelled. ${reason || ''}`,
        priority: 'high',
        status: 'unread',
        module: 'orders',
        related_id: orderId,
        related_data: {
          order_number: currentOrder.order_number,
          reason: reason || 'No reason specified'
        },
        created_by: 'system'
      });

      // Log audit
      await logAudit('order_cancelled', 'orders', orderId, currentOrder.order_number, {
        reason: reason || 'No reason specified',
        order_data: currentOrder
      });

      console.log('✅ Order cancelled successfully:', currentOrder.order_number);
      return { success: true, error: null };

    } catch (error) {
      console.error('Error in cancelOrder:', error);
      return { success: false, error: 'Failed to cancel order' };
    }
  }

  // Get order statistics
  static async getOrderStats(dateFrom?: string, dateTo?: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    inProduction: number;
    ready: number;
    dispatched: number;
    delivered: number;
    cancelled: number;
    totalRevenue: number;
    paidAmount: number;
    outstandingAmount: number;
    averageOrderValue: number;
  }> {
    try {
      let query = supabase
        .from('orders')
        .select('status, total_amount, paid_amount');

      if (dateFrom) {
        query = query.gte('order_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('order_date', dateTo);
      }

      const { data: orders } = await query;

      if (!orders) return {
        total: 0,
        pending: 0,
        accepted: 0,
        inProduction: 0,
        ready: 0,
        dispatched: 0,
        delivered: 0,
        cancelled: 0,
        totalRevenue: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        averageOrderValue: 0
      };

      const stats = orders.reduce((acc, order) => {
        acc.total++;
        acc[order.status as keyof typeof acc]++;
        
        // Revenue calculations
        const totalAmount = order.total_amount || 0;
        const paidAmount = order.paid_amount || 0;
        const outstandingAmount = totalAmount - paidAmount;
        
        acc.totalRevenue += totalAmount;
        acc.paidAmount += paidAmount;
        acc.outstandingAmount += outstandingAmount;
        
        return acc;
      }, {
        total: 0,
        pending: 0,
        accepted: 0,
        inProduction: 0,
        ready: 0,
        dispatched: 0,
        delivered: 0,
        cancelled: 0,
        totalRevenue: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        averageOrderValue: 0
      });

      // Calculate average order value
      stats.averageOrderValue = stats.total > 0 ? stats.totalRevenue / stats.total : 0;

      return stats;

    } catch (error) {
      console.error('Error getting order stats:', error);
      return {
        total: 0,
        pending: 0,
        accepted: 0,
        inProduction: 0,
        ready: 0,
        dispatched: 0,
        delivered: 0,
        cancelled: 0,
        totalRevenue: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        averageOrderValue: 0
      };
    }
  }
}

export default OrderService;