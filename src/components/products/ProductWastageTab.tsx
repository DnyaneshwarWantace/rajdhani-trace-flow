import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { Recycle, Package, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { WasteService, type WasteItem } from '@/services/wasteService';
import { IndividualProductService } from '@/services/individualProductService';
import { ProductionService } from '@/services/productionService';
import { useToast } from '@/hooks/use-toast';
import ProductWasteCard from './wastage/ProductWasteCard';
import type { IndividualProduct } from '@/types/product';

interface ExtendedWasteItem extends WasteItem {
  individualProducts?: IndividualProduct[];
  materialConsumption?: any[];
  batchInfo?: any;
}

export default function ProductWastageTab() {
  const { toast } = useToast();
  const [wasteData, setWasteData] = useState<ExtendedWasteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [returningIds, setReturningIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadWasteData();
  }, []);

  const loadWasteData = async () => {
    try {
      setLoading(true);
      const wasteItems = await WasteService.getAllWaste();
      
      // Filter only product waste items
      const productWaste = wasteItems.filter((item: any) => item.material_type === 'product');
      
      // Map waste data to display format and fetch additional details
      const mappedWastePromises = productWaste.map(async (item: any) => {
        // Use backend status directly, but map 'generated' to display status based on can_be_reused
        let status: 'available_for_reuse' | 'added_to_inventory' | 'disposed' | 'reused';
        
        // If backend status is already set, use it
        if (item.status === 'added_to_inventory' || item.added_at) {
          status = 'added_to_inventory';
        } else if (item.status === 'disposed') {
          status = 'disposed';
        } else if (item.status === 'reused') {
          status = 'reused';
        } else {
          // For 'generated' status, determine display status based on can_be_reused
          const canBeReused = item.can_be_reused === true || item.can_be_reused === 'true' || item.waste_category === 'reusable';
          status = canBeReused ? 'available_for_reuse' : 'disposed';
        }
        
        const batchId = item.production_batch_id || item.batch_id;
        const productId = item.product_id;
        
        // Fetch additional data in parallel
        const [batchInfoResult, materialConsumptionResult] = await Promise.all([
          // Fetch batch info
          batchId ? ProductionService.getBatchById(batchId).catch(() => ({ data: null, error: null })) : Promise.resolve({ data: null, error: null }),
          // Fetch material consumption for this batch
          batchId ? ProductionService.getMaterialConsumption(batchId).catch(() => ({ data: [], error: null })) : Promise.resolve({ data: [], error: null })
        ]);
        
        const batchInfo = batchInfoResult.data;
        const materialConsumption = materialConsumptionResult.data || [];
        
        // Get individual product IDs from material consumption
        const individualProductIds = new Set<string>();
        materialConsumption.forEach((cons: any) => {
          if (cons.individual_product_ids && Array.isArray(cons.individual_product_ids)) {
            cons.individual_product_ids.forEach((id: string) => individualProductIds.add(id));
          }
        });
        
        // Fetch individual products by their IDs
        const individualProductsPromises = Array.from(individualProductIds).map(id =>
          IndividualProductService.getIndividualProductById(id).catch(() => null)
        );
        const individualProductsResults = await Promise.all(individualProductsPromises);
        const individualProducts = individualProductsResults.filter(p => p !== null) as IndividualProduct[];
        
        // Also try to fetch by product_id and batch_number if batchInfo has batch_number
        let additionalProducts: IndividualProduct[] = [];
        if (productId && batchInfo?.batch_number) {
          try {
            const result = await IndividualProductService.getIndividualProductsByProductId(productId, {
              batch_number: batchInfo.batch_number,
              limit: 100
            });
            additionalProducts = result.products || [];
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Combine and deduplicate individual products
        const allIndividualProducts = [...individualProducts, ...additionalProducts];
        const uniqueProducts = Array.from(
          new Map(allIndividualProducts.map(p => [p.id, p])).values()
        );
        
        return {
          id: item.id,
          waste_number: item.waste_number,
          material_id: item.material_id,
          material_name: item.product_name || item.material_name || '',
          material_type: 'product' as const,
          quantity: item.quantity || 0,
          unit: item.unit || '',
          waste_type: item.waste_type || '',
          waste_category: item.waste_category,
          can_be_reused: item.can_be_reused || false,
          production_batch_id: batchId,
          batch_id: item.batch_id,
          product_id: productId,
          product_name: item.product_name,
          status: status,
          generation_date: item.generation_date || item.created_at,
          created_at: item.created_at,
          added_at: item.added_at,
          updated_at: item.updated_at,
          individualProducts: uniqueProducts,
          materialConsumption: materialConsumption,
          batchInfo: batchInfo,
        } as ExtendedWasteItem;
      });
      
      const mappedWaste = await Promise.all(mappedWastePromises);
      setWasteData(mappedWaste);
    } catch (error) {
      console.error('Error loading product waste data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product waste data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToInventory = async (waste: WasteItem) => {
    if (returningIds.has(waste.id)) return;

    try {
      setReturningIds((prev) => new Set(prev).add(waste.id));
      
      const result = await WasteService.returnWasteToInventory(waste.id);
      
      if (result.success) {
        toast({
          title: '✅ Product Returned to Inventory',
          description: `${waste.quantity} ${waste.unit} of ${waste.product_name || waste.material_name} has been returned to inventory.`,
        });
        
        // Reload waste data
        await loadWasteData();
        
        // Call onRefresh if provided
        // onRefresh?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to return product to inventory',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error returning product to inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to return product to inventory',
        variant: 'destructive',
      });
    } finally {
      setReturningIds((prev) => {
        const next = new Set(prev);
        next.delete(waste.id);
        return next;
      });
    }
  };

  // Calculate stats
  const stats = {
    total: wasteData.length,
    availableForReuse: wasteData.filter((w) => w.status === 'available_for_reuse').length,
    addedToInventory: wasteData.filter((w) => w.status === 'added_to_inventory').length,
    disposed: wasteData.filter((w) => w.status === 'disposed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Waste</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <Package className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available for Reuse</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.availableForReuse}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Recycle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Added to Inventory</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.addedToInventory}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Disposed</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">{stats.disposed}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Product Wastage</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage product waste from production
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadWasteData}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Waste Items Grid */}
      {wasteData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Product Waste Found</h3>
            <p className="text-sm text-gray-600">
              Product waste items will appear here when they are generated during production.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wasteData.map((waste) => (
            <ProductWasteCard
              key={waste.id}
              waste={waste}
              onReturn={handleReturnToInventory}
              isReturning={returningIds.has(waste.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

