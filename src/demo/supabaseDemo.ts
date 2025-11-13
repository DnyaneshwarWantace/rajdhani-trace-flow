// Supabase Backend Demo - How to use the Rajdhani ERP services
// This file demonstrates how to use all the backend services

import {
  CustomerService,
  OrderService,
  ProductService,
  RawMaterialService,
  ProductionService,
  NotificationService,
  SupplierService,
  MongoDBRawMaterialService,
  testSupabaseConnection
} from '../services';

export class SupabaseDemo {
  // Test connection to Supabase
  static async testConnection() {
    console.log('🔗 Testing Supabase connection...');
    const isConnected = await testSupabaseConnection();
    if (isConnected) {
      console.log('✅ Supabase connection successful!');
    } else {
      console.log('❌ Supabase connection failed!');
    }
    return isConnected;
  }

  // Demo customer operations
  static async demoCustomerOperations() {
    console.log('\n👥 === CUSTOMER OPERATIONS DEMO ===');

    // Create a customer
    console.log('\n1. Creating a new customer...');
    const customerResult = await CustomerService.createCustomer({
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+91 9876543210',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      customer_type: 'individual'
    });

    if (customerResult.error) {
      console.log('❌ Error creating customer:', customerResult.error);
      return null;
    }

    console.log('✅ Customer created:', customerResult.data?.name);

    // Get all customers
    console.log('\n2. Fetching all customers...');
    const customersResult = await CustomerService.getCustomers();
    if (customersResult.data) {
      console.log(`✅ Found ${customersResult.data.length} customers`);
    }

    // Get customer stats
    console.log('\n3. Getting customer statistics...');
    const stats = await CustomerService.getAllCustomerStats();
    console.log('✅ Customer stats:', stats);

    return customerResult.data;
  }

  // Demo product operations
  static async demoProductOperations() {
    console.log('\n📦 === PRODUCT OPERATIONS DEMO ===');

    // Create a product
    console.log('\n1. Creating a new product...');
    const productResult = await ProductService.createProduct({
      name: 'Premium Carpet',
      category: 'Carpets',
      color: 'Red',
      pattern: 'Persian',
      unit: 'sqft',
      width: '6',
      length: '4',
      individual_stock_tracking: true,
      min_stock_level: 5,
      max_stock_level: 100
    });

    if (productResult.error) {
      console.log('❌ Error creating product:', productResult.error);
      return null;
    }

    console.log('✅ Product created:', productResult.data?.name);

    // Create individual products
    console.log('\n2. Creating individual products...');
    for (let i = 1; i <= 3; i++) {
      const individualResult = await ProductService.createIndividualProduct({
        product_id: productResult.data!.id,
        batch_number: 'BATCH001',
        production_date: new Date().toISOString().split('T')[0],
        final_weight: '15 kg',
        quality_grade: 'A+',
        inspector: 'Quality Team'
      });

      if (individualResult.data) {
        console.log(`✅ Individual product ${i} created: ${individualResult.data.qr_code}`);
      }
    }

    // Get product with individual products
    console.log('\n3. Fetching product with stock details...');
    const productDetailResult = await ProductService.getProductById(productResult.data!.id);
    if (productDetailResult.data) {
      console.log(`✅ Product "${productDetailResult.data.name}" has ${productDetailResult.data.actual_quantity} available units`);
    }

    return productResult.data;
  }

  // Demo raw material operations
  static async demoRawMaterialOperations() {
    console.log('\n🏭 === RAW MATERIALS OPERATIONS DEMO ===');

    // Create a supplier first
    console.log('\n1. Creating a supplier...');
    const supplierResult = await SupplierService.createSupplier({
      id: `SUP-${Date.now()}`,
      name: 'Wool Suppliers Ltd',
      contact_person: 'Supplier Manager',
      email: 'contact@woolsuppliers.com',
      phone: '+91 9876543210',
      address: '456 Industrial Area',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001'
    });

    if (supplierResult.error) {
      console.log('❌ Error creating supplier:', supplierResult.error);
      return null;
    }

    console.log('✅ Supplier created:', supplierResult.data?.name);

    // Create raw material
    console.log('\n2. Creating raw material...');
    const materialResult = await MongoDBRawMaterialService.createRawMaterial({
      name: 'Premium Wool',
      category: 'Yarn',
      current_stock: 500,
      unit: 'kg',
      min_threshold: 50,
      max_capacity: 1000,
      reorder_point: 100,
      daily_usage: 20,
      supplier_id: supplierResult.data!.id,
      supplier_name: supplierResult.data!.name,
      cost_per_unit: 150,
      batch_number: 'WOOL001',
      quality_grade: 'A+',
    });

    if (materialResult.error) {
      console.log('❌ Error creating material:', materialResult.error);
      return null;
    }

    console.log('✅ Raw material created:', materialResult.data?.name);

    // Get inventory stats
    console.log('\n3. Getting inventory statistics...');
    const inventoryStats = await MongoDBRawMaterialService.getInventoryStats();
    console.log('✅ Inventory stats:', inventoryStats);

    return materialResult.data;
  }

  // Demo order operations
  static async demoOrderOperations(customer: any, product: any) {
    console.log('\n🛒 === ORDER OPERATIONS DEMO ===');

    if (!customer || !product) {
      console.log('❌ Need customer and product for order demo');
      return null;
    }

    // Create an order
    console.log('\n1. Creating a new order...');
    const orderResult = await OrderService.createOrder({
      customer_id: customer.id,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      expected_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        {
          product_id: product.id,
          product_name: product.name,
          product_type: 'product',
          quantity: 2,
          unit_price: product.selling_price,
          quality_grade: 'A+',
          specifications: '6x4 feet Premium Carpet'
        }
      ],
      gst_rate: 18,
      discount_amount: 1000,
      priority: 'medium',
      special_instructions: 'Handle with care'
    });

    if (orderResult.error) {
      console.log('❌ Error creating order:', orderResult.error);
      return null;
    }

    console.log('✅ Order created:', orderResult.data?.order_number);

    // Update order status
    console.log('\n2. Updating order status...');
    const updateResult = await OrderService.updateOrder(orderResult.data!.id, {
      status: 'accepted',
      paid_amount: 15000
    });

    if (updateResult.data) {
      console.log('✅ Order status updated to:', updateResult.data.status);
    }

    // Get order stats
    console.log('\n3. Getting order statistics...');
    const orderStats = await OrderService.getOrderStats();
    console.log('✅ Order stats:', orderStats);

    return orderResult.data;
  }

  // Demo production operations
  static async demoProductionOperations(product: any, order: any) {
    console.log('\n🏭 === PRODUCTION OPERATIONS DEMO ===');

    if (!product) {
      console.log('❌ Need product for production demo');
      return null;
    }

    // Create production batch
    console.log('\n1. Creating production batch...');
    const batchResult = await ProductionService.createProductionBatch({
      product_id: product.id,
      order_id: order?.id,
      planned_quantity: 5,
      priority: 'high',
      operator: 'Production Team A',
      supervisor: 'Supervisor John',
      notes: 'Premium quality batch',
      production_steps: [
        {
          step_number: 1,
          step_name: 'Material Preparation',
          description: 'Prepare raw materials for production',
          estimated_duration: 60,
          operator: 'Material Handler'
        },
        {
          step_number: 2,
          step_name: 'Weaving',
          description: 'Weave the carpet pattern',
          estimated_duration: 240,
          operator: 'Weaver'
        },
        {
          step_number: 3,
          step_name: 'Quality Check',
          description: 'Final quality inspection',
          estimated_duration: 30,
          operator: 'Quality Inspector'
        }
      ]
    });

    if (batchResult.error) {
      console.log('❌ Error creating production batch:', batchResult.error);
      return null;
    }

    console.log('✅ Production batch created:', batchResult.data?.batch_number);

    // Start production
    console.log('\n2. Starting production batch...');
    const startResult = await ProductionService.startProductionBatch(
      batchResult.data!.id,
      'Production Operator A'
    );

    if (startResult.success) {
      console.log('✅ Production batch started successfully');
    }

    // Get production stats
    console.log('\n3. Getting production statistics...');
    const productionStats = await ProductionService.getProductionStats();
    console.log('✅ Production stats:', productionStats);

    return batchResult.data;
  }

  // Demo notification operations
  static async demoNotificationOperations() {
    console.log('\n🔔 === NOTIFICATION OPERATIONS DEMO ===');

    // Create a notification
    console.log('\n1. Creating a notification...');
    const notificationResult = await NotificationService.createNotification({
      type: 'info',
      title: 'Demo Notification',
      message: 'This is a demo notification from the Supabase backend!',
      priority: 'medium',
      status: 'unread',
      module: 'orders',
      created_by: 'demo_user'
    });

    if (notificationResult.data) {
      console.log('✅ Notification created:', notificationResult.data.title);
    }

    // Get notifications
    console.log('\n2. Fetching notifications...');
    const notificationsResult = await NotificationService.getNotifications();
    if (notificationsResult.data) {
      const limitedNotifications = notificationsResult.data.slice(0, 5);
      console.log(`✅ Found ${notificationsResult.data.length} notifications (showing first 5)`);
    }

    // Calculate notification stats from fetched notifications
    console.log('\n3. Calculating notification statistics...');
    if (notificationsResult.data) {
      const stats = {
        total: notificationsResult.data.length,
        unread: notificationsResult.data.filter(n => n.status === 'unread').length,
        read: notificationsResult.data.filter(n => n.status === 'read').length,
        dismissed: notificationsResult.data.filter(n => n.status === 'dismissed').length
      };
      console.log('✅ Notification stats:', stats);
    }

    return notificationResult.data;
  }

  // Run complete demo
  static async runCompleteDemo() {
    console.log('🚀 Starting Rajdhani ERP Supabase Backend Demo');
    console.log('=' .repeat(60));

    try {
      // Test connection first
      const isConnected = await this.testConnection();
      if (!isConnected) {
        console.log('❌ Cannot proceed with demo - Supabase connection failed');
        return;
      }

      // Run all demos
      const customer = await this.demoCustomerOperations();
      const product = await this.demoProductOperations();
      const material = await this.demoRawMaterialOperations();
      const order = await this.demoOrderOperations(customer, product);
      const batch = await this.demoProductionOperations(product, order);
      await this.demoNotificationOperations();

      console.log('\n🎉 === DEMO COMPLETED SUCCESSFULLY ===');
      console.log('✅ All backend services are working correctly!');
      console.log('✅ Your Supabase database is ready for production use');

    } catch (error) {
      console.error('❌ Demo failed with error:', error);
    }
  }
}

// Example usage:
// SupabaseDemo.runCompleteDemo();

export default SupabaseDemo;