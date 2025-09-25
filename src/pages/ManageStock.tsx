import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { IDGenerator } from "@/lib/idGenerator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Search,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
  Building2,
  History,
  Plus
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { PurchaseOrderService, RawMaterialService } from "@/services";

interface StockOrder {
  id: string;
  order_number: string;
  materialName: string;
  materialBrand?: string;
  materialCategory?: string;
  materialBatchNumber?: string;
  supplier: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  orderDate: string;
  expectedDelivery: string;
  status: "ordered" | "pending" | "approved" | "shipped" | "in-transit" | "delivered" | "cancelled";
  notes?: string;
  actualDelivery?: string;
  minThreshold?: number;
  maxCapacity?: number;
  qualityGrade?: string;
  isRestock?: boolean;
}

// All orders are now loaded from Supabase database

const statusConfig = {
  "ordered": { label: "Ordered", icon: Clock, color: "bg-gray-100 text-gray-800" },
  "pending": { label: "Pending", icon: Clock, color: "bg-gray-100 text-gray-800" },
  "approved": { label: "Approved", icon: CheckCircle, color: "bg-blue-100 text-blue-800" },
  "shipped": { label: "Shipped", icon: Truck, color: "bg-yellow-100 text-yellow-800" },
  "in-transit": { label: "In Transit", icon: Truck, color: "bg-yellow-100 text-yellow-800" },
  "delivered": { label: "Delivered", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  "cancelled": { label: "Cancelled", icon: AlertTriangle, color: "bg-red-100 text-red-800" }
};

export default function ManageStock() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<StockOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref to track processed prefillOrders to prevent duplicates
  const processedPrefillOrders = useRef<Set<string>>(new Set());

  // Function to remove duplicate orders
  const removeDuplicateOrders = (orders: StockOrder[]) => {
    const seen = new Set<string>();
    return orders.filter(order => {
      const key = `${order.materialName}-${order.supplier}-${order.quantity}-${order.unit}-${order.costPerUnit}-${order.status}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Load orders from Supabase on component mount
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Map database fields to interface format
        const loadedOrders = (data || []).map((order: any) => {
          // Try to get material details from material_details column first, then fallback to notes
          let materialDetails: any = {};
          
          if (order.material_details) {
            // Use material_details column if available
            materialDetails = order.material_details;
          } else if (order.notes) {
            // Fallback to parsing notes field
            try {
              materialDetails = JSON.parse(order.notes);
          } catch (e) {
            // If parsing fails, use the notes as-is (for old orders)
            console.log('Could not parse material details from notes:', order.notes);
              materialDetails = {
                materialName: 'Unknown Material',
                quantity: 0,
                unit: 'units',
                costPerUnit: 0,
                userNotes: order.notes
              };
            }
          }

          // Ensure quantity is a valid number, not 0
          const quantity = materialDetails.quantity || materialDetails.quantity === 0 ? materialDetails.quantity : 1;

          return {
            id: order.id,
            order_number: order.order_number,
            materialName: materialDetails.materialName || materialDetails.material_name || 'Material Order',
            materialBrand: materialDetails.materialBrand || materialDetails.material_brand || 'Unknown',
            materialCategory: materialDetails.materialCategory || materialDetails.material_category || 'Other',
            materialBatchNumber: materialDetails.materialBatchNumber || materialDetails.material_batch_number || `BATCH-${order.id}`,
            supplier: order.supplier_name,
            quantity: quantity,
            unit: materialDetails.unit || 'units',
            costPerUnit: materialDetails.costPerUnit || materialDetails.cost_per_unit || 0,
            totalCost: order.total_amount,
            orderDate: order.order_date,
            expectedDelivery: order.expected_delivery,
            status: order.status === 'pending' ? 'ordered' : order.status,
            notes: materialDetails.userNotes || materialDetails.user_notes || '',
            actualDelivery: order.actual_delivery,
            minThreshold: materialDetails.minThreshold || materialDetails.min_threshold || 100,
            maxCapacity: materialDetails.maxCapacity || materialDetails.max_capacity || 1000,
            qualityGrade: materialDetails.qualityGrade || materialDetails.quality_grade || 'A',
            isRestock: materialDetails.isRestock || materialDetails.is_restock || false
          };
        });

    
        // Remove any duplicate orders that might exist
        const uniqueOrders = removeDuplicateOrders(loadedOrders);
    
        setOrders(uniqueOrders);
      } catch (error) {
        console.error('Error loading orders:', error);
        toast({
          title: "Error",
          description: "Failed to load orders",
          variant: "destructive",
        });
      }
    };

    loadOrders();
    
    // Cleanup function to clear processed prefillOrders when component unmounts
    return () => {
      processedPrefillOrders.current.clear();
    };
  }, [toast]);

  // Handle pre-filled order data from Materials page
  useEffect(() => {
    const handlePrefillOrder = async () => {
      if (location.state?.prefillOrder) {
      const prefillData = location.state.prefillOrder;
      
      // Create a unique key for this prefillOrder to prevent duplicates
      const prefillKey = `${prefillData.materialName}-${prefillData.supplier}-${prefillData.quantity}-${prefillData.unit}-${prefillData.costPerUnit}`;
      

      
      // Check if we've already processed this exact prefillOrder
      if (processedPrefillOrders.current.has(prefillKey)) {
        console.log('PrefillOrder already processed, skipping duplicate');
        // Clear the state to prevent re-opening on refresh
        window.history.replaceState({}, document.title);
        return;
      }
      
      // Check for recent orders (within last 5 minutes) to prevent rapid duplicates
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentOrders, error: recentError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('supplier_name', prefillData.supplier)
        .eq('status', 'pending')
        .gte('created_at', fiveMinutesAgo);

      if (recentError) {
        console.error('Error checking for recent orders:', recentError);
      }

      if (recentOrders && recentOrders.length > 0) {
        console.log('Duplicate order detected, skipping creation');
        toast({
          title: "⚠️ Duplicate Order Detected",
          description: `An order for ${prefillData.materialName} from ${prefillData.supplier} was created recently.`,
          variant: "destructive",
        });

        // Clear the state to prevent re-opening on refresh
        window.history.replaceState({}, document.title);
        return;
      }
      
      // Create the new order since no duplicates found
      const timestamp = Date.now();
      const newOrder: StockOrder = {
          id: `PO_${timestamp}`,
          order_number: `PO-${timestamp}`,
          materialName: prefillData.materialName,
          materialBrand: prefillData.materialBrand || "Unknown",
          materialCategory: prefillData.materialCategory || "Other",
          materialBatchNumber: prefillData.materialBatchNumber || `BATCH-${Date.now()}`,
          supplier: prefillData.supplier,
          quantity: parseInt(prefillData.quantity),
          unit: prefillData.unit,
          costPerUnit: parseFloat(prefillData.costPerUnit),
          totalCost: parseInt(prefillData.quantity) * parseFloat(prefillData.costPerUnit),
          orderDate: new Date().toISOString().split('T')[0],
          expectedDelivery: prefillData.expectedDelivery || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "ordered",
          notes: prefillData.notes || `${prefillData.isRestock ? 'Restock' : 'New material procurement'} order for ${prefillData.materialName}`,
          minThreshold: prefillData.minThreshold || 100,
          maxCapacity: prefillData.maxCapacity || 1000,
          qualityGrade: prefillData.qualityGrade || "A",
          isRestock: prefillData.isRestock || false
        };

        // Store material details in notes as JSON for now
        const materialDetails = {
          materialName: newOrder.materialName,
          materialBrand: newOrder.materialBrand,
          materialCategory: newOrder.materialCategory,
          materialBatchNumber: newOrder.materialBatchNumber,
          quantity: newOrder.quantity,
          unit: newOrder.unit,
          costPerUnit: newOrder.costPerUnit,
          minThreshold: newOrder.minThreshold,
          maxCapacity: newOrder.maxCapacity,
          qualityGrade: newOrder.qualityGrade,
          isRestock: newOrder.isRestock
        };

        // Add to Supabase and update state
        const { data, error } = await supabase
          .from('purchase_orders')
          .insert({
            id: newOrder.id,
            order_number: newOrder.order_number,
            supplier_name: newOrder.supplier,
            order_date: newOrder.orderDate,
            expected_delivery: newOrder.expectedDelivery,
            status: newOrder.status === 'ordered' ? 'pending' : newOrder.status,
            total_amount: newOrder.totalCost,
            notes: JSON.stringify(materialDetails)
          })
          .select()
          .single();

        if (error) throw error;
        
        setOrders(prev => [newOrder, ...prev]);
        
        // Don't update raw material status immediately - wait for order approval
        console.log(`📋 Order created with status: ${newOrder.status}. Material status will be updated when order is approved.`);
        
        // Mark this prefillOrder as processed
        processedPrefillOrders.current.add(prefillKey);
        
        // Show success message
        toast({
          title: "✅ Material Order Created!",
          description: `${prefillData.materialName} order has been created successfully.`,
          variant: "default",
        });
        
      }
      
      // Clear the state to prevent re-opening on refresh
      window.history.replaceState({}, document.title);
      
      // Also clear the location state to prevent any re-triggering
      if (location.state?.prefillOrder) {
        navigate(location.pathname, { replace: true });
      }
    };

    handlePrefillOrder();
  }, [location.state, navigate, toast]); // Added navigate to dependencies

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = async (orderId: string, newStatus: StockOrder["status"]) => {
    const updatedOrders = orders.map(order => 
      order.id === orderId 
        ? { 
            ...order, 
            status: newStatus,
            actualDelivery: newStatus === "delivered" ? new Date().toISOString().split('T')[0] : order.actualDelivery
          }
        : order
    );
    
    // Update local state
    setOrders(updatedOrders);
    
    const orderToUpdate = updatedOrders.find(order => order.id === orderId);
    
    // Handle material status changes based on order status
    if (orderToUpdate) {
      if (newStatus === "approved") {
        // When order is approved, set material to "in-transit"
        await updateRawMaterialStatusToInTransit(orderToUpdate);
      } else if (newStatus === "cancelled") {
        // When order is cancelled, revert material back to original status
        await revertRawMaterialStatus(orderToUpdate);
      } else if (newStatus === "delivered") {
        // When order is delivered, update the raw material inventory
        await updateRawMaterialStock(orderToUpdate);
      }
    }
    
    // Update the order in Supabase
    if (orderToUpdate) {
      // Map frontend status to database status
      const dbStatus = orderToUpdate.status === 'ordered' ? 'pending' : orderToUpdate.status;
      
      // Recreate material details JSON to preserve all data
      const materialDetails = {
        materialName: orderToUpdate.materialName,
        materialBrand: orderToUpdate.materialBrand,
        materialCategory: orderToUpdate.materialCategory,
        materialBatchNumber: orderToUpdate.materialBatchNumber,
        quantity: orderToUpdate.quantity,
        unit: orderToUpdate.unit,
        costPerUnit: orderToUpdate.costPerUnit,
        minThreshold: orderToUpdate.minThreshold,
        maxCapacity: orderToUpdate.maxCapacity,
        qualityGrade: orderToUpdate.qualityGrade,
        isRestock: orderToUpdate.isRestock,
        userNotes: orderToUpdate.notes || '' // Preserve user notes
      };
      
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: dbStatus,
          notes: JSON.stringify(materialDetails)
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order:', error);
        toast({
          title: "Error",
          description: "Failed to update order",
          variant: "destructive",
        });
      }
    }
  };

  // Function to revert raw material status when order is cancelled
  const revertRawMaterialStatus = async (order: StockOrder) => {
    try {
      // Find matching material in Supabase
      const { data: materials, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('name', order.materialName)
        .eq('supplier_name', order.supplier)
        .eq('unit', order.unit);

      if (error) throw error;

      if (materials && materials.length > 0) {
        const material = materials[0];
        console.log(`🔄 Reverting ${order.materialName} status from "in-transit" back to original status`);
        
        // Determine the appropriate status based on current stock
        let newStatus = 'in-stock';
        if (material.current_stock === 0) {
          newStatus = 'out-of-stock';
        } else if (material.current_stock <= material.min_threshold) {
          newStatus = 'low-stock';
        }
        
        // Update status back to appropriate status
        const { error: updateError } = await supabase
          .from('raw_materials')
          .update({ status: newStatus })
          .eq('id', material.id);

        if (updateError) throw updateError;
        
        console.log(`✅ Reverted ${order.materialName} status to "${newStatus}"`);
      } else {
        console.log(`❌ No matching material found to revert status for order:`, {
          name: order.materialName,
          supplier: order.supplier,
          unit: order.unit
        });
      }
    } catch (error) {
      console.error('Error reverting material status:', error);
    }
  };

  // Function to update raw material status to "in-transit" when order is approved
  const updateRawMaterialStatusToInTransit = async (order: StockOrder) => {
    try {
      // Find matching material in Supabase
      const { data: materials, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('name', order.materialName)
        .eq('supplier_name', order.supplier)
        .eq('unit', order.unit);

      if (error) throw error;

      if (materials && materials.length > 0) {
        const material = materials[0];
        console.log(`✅ Found matching material: ${material.name} (${material.supplier_name})`);
        
        // Update status to in-transit
        const { error: updateError } = await supabase
          .from('raw_materials')
          .update({ status: 'in-transit' })
          .eq('id', material.id);

        if (updateError) throw updateError;
        
        console.log(`📦 Updated ${order.materialName} status to "in-transit" (order approved)`);
      } else {
        console.log(`❌ No matching material found for order:`, {
          name: order.materialName,
          supplier: order.supplier,
          unit: order.unit
        });
      }
    } catch (error) {
      console.error('Error updating material status:', error);
    }
  };

      // Function to update raw material stock when order is delivered
      // SMART LOGIC: Automatically detects when to restock vs create new material
      // 
      // RESTOCK SCENARIO: Same name + same supplier + same brand + same quality (price can vary)
      // NEW MATERIAL SCENARIO: Different supplier OR different brand OR different quality
      // 
      // This means:
      // - Same material + same supplier + same brand + same quality = RESTOCK (update existing)
      // - Same material + different supplier = NEW MATERIAL (create new entry)
      // - Same material + same supplier + price change = RESTOCK (update existing, new price)
      // - Same material + same supplier + different quality = NEW MATERIAL (create new entry)
      const updateRawMaterialStock = async (deliveredOrder: StockOrder) => {
    try {
      console.log('📦 Processing delivered order:', deliveredOrder);
      
      // Validate required fields
      if (!deliveredOrder.materialName) {
        toast({
          title: "❌ Missing Material Name",
          description: "Material name is required for delivery.",
          variant: "destructive",
        });
        return;
      }
      
      if (!deliveredOrder.supplier) {
        toast({
          title: "❌ Missing Supplier",
          description: "Supplier information is required for delivery.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate quantity before processing
      if (!deliveredOrder.quantity || deliveredOrder.quantity <= 0) {
        toast({
          title: "❌ Invalid Quantity",
          description: `Cannot deliver order with quantity ${deliveredOrder.quantity}. Please check the order details.`,
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ All validations passed, proceeding with stock update...');
      
              // Check if this is EXACTLY the same material (ALL fields must match for restock)
        // SMART RESTOCK LOGIC: Only supplier, brand, and quality matter for restock
        // Price changes are allowed and don't create new materials
        // 
        // Example scenarios:
        // 1. RESTOCK: Cotton Yarn + ABC Textiles + Premium + Rolls (price can vary) = RESTOCK existing
        // 2. NEW MATERIAL: Cotton Yarn + XYZ Textiles + Premium + Rolls = NEW MATERIAL (different supplier)
        // 3. RESTOCK: Cotton Yarn + ABC Textiles + Premium + Rolls (price changed) = RESTOCK existing
        // 4. NEW MATERIAL: Cotton Yarn + ABC Textiles + Standard + Rolls = NEW MATERIAL (different quality)
        // 5. NEW MATERIAL: Cotton Yarn + ABC Textiles + Premium + Kg = NEW MATERIAL (different unit)
        
        // SMART RESTOCK LOGIC: Prioritize restock orders marked with isRestock flag
        // For restock orders: Match by name + supplier (most important fields)
        // For new orders: Match by all fields (name, brand, category, supplier, quality, unit)
        let existingMaterial;
        
        // AGGRESSIVE MATCHING: Find the material that was created when this order was placed
        console.log('🔍 Looking for the material created with this order...');
        
        // Strategy 1: Look for in-transit materials with same name and supplier
        let { data: inTransitMaterials, error: inTransitError } = await supabase
            .from('raw_materials')
            .select('*')
            .eq('name', deliveredOrder.materialName)
            .eq('supplier_name', deliveredOrder.supplier)
          .eq('status', 'in-transit');
        
        if (inTransitError) {
          console.error('❌ Error searching for in-transit materials:', inTransitError);
        } else if (inTransitMaterials && inTransitMaterials.length > 0) {
          existingMaterial = inTransitMaterials[0];
          console.log('✅ Found in-transit material:', existingMaterial);
        } else {
          console.log('❌ No in-transit material found, trying broader search...');
          
          // Strategy 2: Look for any material with same name and supplier (regardless of status)
          const { data: sameNameSupplier, error: sameNameError } = await supabase
            .from('raw_materials')
            .select('*')
            .eq('name', deliveredOrder.materialName)
            .eq('supplier_name', deliveredOrder.supplier);
          
          if (sameNameError) {
            console.error('❌ Error searching for same name/supplier materials:', sameNameError);
          } else if (sameNameSupplier && sameNameSupplier.length > 0) {
            // If multiple found, prefer the one with 0 stock (likely the order material)
            const zeroStockMaterial = sameNameSupplier.find(m => m.current_stock === 0);
            existingMaterial = zeroStockMaterial || sameNameSupplier[0];
            console.log('✅ Found material with same name/supplier:', existingMaterial);
          } else {
            console.log('❌ No material found with same name/supplier, trying name only...');
            
            // Strategy 3: Look for any material with same name (last resort)
            const { data: sameName, error: sameNameOnlyError } = await supabase
              .from('raw_materials')
              .select('*')
              .eq('name', deliveredOrder.materialName);
            
            if (sameNameOnlyError) {
              console.error('❌ Error searching for same name materials:', sameNameOnlyError);
            } else if (sameName && sameName.length > 0) {
              // Prefer in-transit or 0 stock materials
              const preferredMaterial = sameName.find(m => 
                m.status === 'in-transit' || m.current_stock === 0
              );
              existingMaterial = preferredMaterial || sameName[0];
              console.log('✅ Found material with same name:', existingMaterial);
            }
          }
        }
        
        console.log('🔍 Searching for existing material with criteria:');
        console.log('  - Name:', deliveredOrder.materialName);
        console.log('  - Brand:', deliveredOrder.materialBrand);
        console.log('  - Category:', deliveredOrder.materialCategory);
        console.log('  - Supplier:', deliveredOrder.supplier);
        console.log('  - Quality Grade:', deliveredOrder.qualityGrade);
        console.log('  - Unit:', deliveredOrder.unit);
        console.log('  - Is Restock Order:', deliveredOrder.isRestock);
        console.log('🎯 Match found:', !!existingMaterial);
        if (existingMaterial) {
          console.log('✅ Existing material found:', existingMaterial);
        } else {
          console.log('❌ No existing material found - will create new one');
          
          // Let's also try a broader search to see what materials exist
          const { data: allMaterials, error: allError } = await supabase
            .from('raw_materials')
            .select('id, name, brand, category, supplier_name, status, current_stock, unit, quality_grade')
            .eq('name', deliveredOrder.materialName);
          
          if (!allError && allMaterials) {
            console.log('🔍 All materials with same name:', allMaterials);
            
            // Check if any of these materials match our criteria
            const potentialMatches = allMaterials.filter(material => 
              material.supplier_name === deliveredOrder.supplier
            );
            
            if (potentialMatches.length > 0) {
              console.log('🎯 Potential matches found:', potentialMatches);
              console.log('❌ Why they didn\'t match:');
              potentialMatches.forEach(match => {
                console.log(`  Material ${match.id}:`);
                console.log(`    - Brand: "${match.brand}" vs "${deliveredOrder.materialBrand || 'Unknown'}"`);
                console.log(`    - Category: "${match.category}" vs "${deliveredOrder.materialCategory || 'Other'}"`);
                console.log(`    - Unit: "${match.unit}" vs "${deliveredOrder.unit}"`);
                console.log(`    - Quality: "${match.quality_grade}" vs "${deliveredOrder.qualityGrade || 'A'}"`);
                console.log(`    - Status: "${match.status}"`);
              });
            }
          }
        }
      
      // CRITICAL: We should ALWAYS find an existing material for delivery
      // If we don't find one, something is wrong with the order data
      if (!existingMaterial) {
        console.error('❌ CRITICAL ERROR: No existing material found for delivery!');
        console.error('This should never happen - every order should have a corresponding material.');
        console.error('Order details:', deliveredOrder);
        
        toast({
          title: "❌ Delivery Error",
          description: `Cannot deliver order: No existing material found for "${deliveredOrder.materialName}" from "${deliveredOrder.supplier}". Please check the order data.`,
          variant: "destructive",
        });
        return; // Stop processing - don't create new material
        }
      
      if (existingMaterial) {
        // This is an EXACT match - automatically treat as RESTOCK
        const newStock = existingMaterial.current_stock + deliveredOrder.quantity;
        const newStatus = newStock === 0 ? 'out-of-stock' : 
                         newStock <= existingMaterial.min_threshold ? 'low-stock' : 'in-stock';
        
        // Update material in Supabase
        console.log('🔄 Updating existing material in database...');
        const { error: updateError } = await supabase
          .from('raw_materials')
          .update({
            current_stock: newStock,
            last_restocked: new Date().toISOString(),
            status: newStatus,
            cost_per_unit: deliveredOrder.costPerUnit,
            total_value: newStock * deliveredOrder.costPerUnit
          })
          .eq('id', existingMaterial.id);

        if (updateError) {
          console.error('❌ Error updating material:', updateError);
          throw updateError;
        }
        
        console.log(`✅ Updated existing material ${deliveredOrder.materialName} from ${existingMaterial.current_stock} to ${newStock}`);
        
        toast({
          title: "✅ Order Delivered Successfully!",
          description: `${deliveredOrder.materialName} (${deliveredOrder.supplier}): ${existingMaterial.current_stock} + ${deliveredOrder.quantity} = ${newStock} ${deliveredOrder.unit}`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('❌ Error updating raw material stock:', error);
      
      let errorMessage = "There was an error updating the stock.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      
      toast({
        title: "❌ Error Updating Stock",
        description: `Failed to update stock: ${errorMessage}`,
        variant: "destructive",
        });
    }
  };

  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum, order) => sum + order.totalCost, 0);
  const pendingOrders = orders.filter(order => 
    order.status === "ordered" || 
    order.status === "pending" || 
    order.status === "approved" || 
    order.status === "shipped" || 
    order.status === "in-transit"
  ).length;
  const deliveredOrders = orders.filter(order => order.status === "delivered").length;

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header 
        title="Manage Stock" 
        subtitle="Track raw material orders, quantities, and delivery status"
      />



      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Orders</span>
            </div>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-muted-foreground">Total Value</span>
            </div>
            <div className="text-2xl font-bold">₹{(totalValue / 100000).toFixed(1)}L</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-warning" />
              <span className="text-sm font-medium text-muted-foreground">Pending</span>
            </div>
            <div className="text-2xl font-bold">{pendingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-muted-foreground">Delivered</span>
            </div>
            <div className="text-2xl font-bold">{deliveredOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search materials or suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="in-transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <History className="w-4 h-4" />
              <span>Orders from Materials page only</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Material Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const status = statusConfig[order.status];
              const StatusIcon = status.icon;
              
              return (
                <div key={order.id} className="p-6 border rounded-lg space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-muted-foreground" />
                        <h3 className="font-semibold text-lg">{order.materialName}</h3>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {order.supplier}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Ordered: {new Date(order.orderDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">₹{(order.totalCost / 1000).toFixed(1)}K</div>
                      <div className="text-sm text-muted-foreground">
                        {order.quantity} {order.unit} × ₹{order.costPerUnit}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <div className="font-medium">{order.quantity} {order.unit}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expected Delivery:</span>
                      <div className="font-medium">{new Date(order.expectedDelivery).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="font-medium">{status.label}</div>
                    </div>
                    {order.actualDelivery && (
                      <div>
                        <span className="text-muted-foreground">Delivered:</span>
                        <div className="font-medium">{new Date(order.actualDelivery).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                  
                  {order.notes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {order.notes}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {(order.status === "ordered" || order.status === "pending") && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => await updateOrderStatus(order.id, "approved")}
                      >
                        Approve
                      </Button>
                    )}
                    {order.status === "approved" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => await updateOrderStatus(order.id, "shipped")}
                      >
                        Mark Shipped
                      </Button>
                    )}
                    {order.status === "shipped" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => await updateOrderStatus(order.id, "delivered")}
                      >
                        Mark Delivered
                      </Button>
                    )}
                    {(order.status === "ordered" || order.status === "pending" || order.status === "approved" || order.status === "shipped") && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={async () => await updateOrderStatus(order.id, "cancelled")}
                      >
                        Cancel Order
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsDetailsDialogOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No orders found matching your criteria</p>
                <p className="text-sm mt-2">Orders are created from the Materials page</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Details: {selectedOrder?.materialName}
            </DialogTitle>
            <DialogDescription>
              Complete information about this material order
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Material Name</Label>
                      <p className="text-xl font-bold">{selectedOrder.materialName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Order ID</Label>
                      <p className="font-mono text-sm">{selectedOrder.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Order Date</Label>
                      <p className="font-medium">{new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Order Status</Label>
                      <Badge className={statusConfig[selectedOrder.status]?.color || "bg-gray-100 text-gray-800"}>
                        {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Material Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Material Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                      <p className="text-xl font-bold text-blue-600">{selectedOrder.quantity} {selectedOrder.unit}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cost per Unit</Label>
                      <p className="text-xl font-bold text-green-600">₹{selectedOrder.costPerUnit.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Cost</Label>
                      <p className="text-2xl font-bold text-primary">₹{selectedOrder.totalCost.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Supplier Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Supplier Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Supplier Name</Label>
                      <p className="font-medium">{selectedOrder.supplier}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Delivery Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Expected Delivery</Label>
                      <p className="font-medium">
                        {selectedOrder.expectedDelivery ? 
                          new Date(selectedOrder.expectedDelivery).toLocaleDateString() : 
                          "Not specified"
                        }
                      </p>
                    </div>
                    {selectedOrder.actualDelivery && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Actual Delivery Date</Label>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{new Date(selectedOrder.actualDelivery).toLocaleDateString()}</p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={async () => {
                              const newDate = prompt("Enter new delivery date (YYYY-MM-DD):", selectedOrder.actualDelivery);
                              if (newDate && newDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                const updatedOrder = { ...selectedOrder, actualDelivery: newDate };
                                setSelectedOrder(updatedOrder);
                                await updateOrderStatus(selectedOrder.id, selectedOrder.status);
                                setIsDetailsDialogOpen(false);
                              }
                            }}
                          >
                            Edit Date
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedOrder.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{selectedOrder.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
