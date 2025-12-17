import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Recycle, Package, Loader2, RefreshCw, AlertCircle, LayoutGrid, Table2 } from 'lucide-react';
import { WasteService, type WasteItem } from '@/services/wasteService';
import { IndividualProductService } from '@/services/individualProductService';
import { ProductionService } from '@/services/productionService';
import { useToast } from '@/hooks/use-toast';
import ProductWasteCard from './wastage/ProductWasteCard';
import { TruncatedText } from '@/components/ui/TruncatedText';
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
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

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
        
        // Combine and deduplicate individual products
        const uniqueProducts = Array.from(
          new Map(individualProducts.map(p => [p.id, p])).values()
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
      
      // Filter out fake data: items with 0.00 used in production (no material consumption)
      const validWaste = mappedWaste.filter((item) => {
        const productConsumption = item.materialConsumption?.filter(
          (cons: any) => cons.material_type === 'product' && cons.material_id === item.product_id
        ) || [];
        const totalUsed = productConsumption.reduce((sum: number, cons: any) => sum + (cons.quantity_used || 0), 0);
        // Only show items that have actual consumption records (totalUsed > 0)
        return totalUsed > 0;
      });
      
      setWasteData(validWaste);
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

      {/* Header with Refresh and View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Product Wastage</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage product waste from production
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-gray-50">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="h-8 px-3"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
            >
              <Table2 className="w-4 h-4" />
            </Button>
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
      </div>

      {/* Waste Items - Card or Table View */}
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
      ) : viewMode === 'card' ? (
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
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-700">Status</th>
                <th className="text-left p-4 font-medium text-gray-700">Product</th>
                <th className="text-left p-4 font-medium text-gray-700">Used</th>
                <th className="text-left p-4 font-medium text-gray-700">Wasted</th>
                <th className="text-left p-4 font-medium text-gray-700">Waste Type</th>
                <th className="text-left p-4 font-medium text-gray-700">Batch</th>
                <th className="text-left p-4 font-medium text-gray-700">Generated</th>
                <th className="text-left p-4 font-medium text-gray-700">Individual Products</th>
                <th className="text-left p-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {wasteData.map((waste) => {
                const productConsumption = waste.materialConsumption?.filter(
                  (cons: any) => cons.material_type === 'product' && cons.material_id === waste.product_id
                ) || [];
                const totalUsed = productConsumption.reduce((sum: number, cons: any) => sum + (cons.quantity_used || 0), 0);
                const totalWasted = waste.quantity || 0;

                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'available_for_reuse':
                      return 'bg-green-100 text-green-700 border-green-200';
                    case 'added_to_inventory':
                      return 'bg-blue-100 text-blue-700 border-blue-200';
                    default:
                      return 'bg-gray-100 text-gray-700 border-gray-200';
                  }
                };

                const getStatusLabel = (status: string) => {
                  switch (status) {
                    case 'available_for_reuse':
                      return 'Reusable';
                    case 'added_to_inventory':
                      return 'Added';
                    default:
                      return 'Disposed';
                  }
                };

                return (
                  <tr key={waste.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <Badge variant="outline" className={getStatusColor(waste.status)}>
                        {getStatusLabel(waste.status)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900 min-w-0">
                        <TruncatedText text={waste.product_name || waste.material_name} maxLength={40} className="block" />
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        {waste.product_id}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{totalUsed.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">{waste.unit}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-red-600">{totalWasted.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">{waste.unit}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-700">
                        {WasteService.mapWasteTypeToDisplay(waste.waste_type)}
                      </div>
                    </td>
                    <td className="p-4">
                      {waste.production_batch_id ? (
                        <div className="text-sm font-mono text-gray-700">
                          <TruncatedText text={waste.production_batch_id} maxLength={20} className="block" />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {waste.generation_date && (
                        <>
                          <div>{new Date(waste.generation_date).toLocaleDateString()}</div>
                          <div className="text-xs">{new Date(waste.generation_date).toLocaleTimeString()}</div>
                        </>
                      )}
                    </td>
                    <td className="p-4">
                      {waste.individualProducts && waste.individualProducts.length > 0 ? (
                        <div className="text-sm text-gray-700">
                          {waste.individualProducts.length} product{waste.individualProducts.length !== 1 ? 's' : ''}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {waste.status === 'available_for_reuse' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReturnToInventory(waste)}
                          disabled={returningIds.has(waste.id)}
                          className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300 hover:bg-green-50"
                        >
                          {returningIds.has(waste.id) ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                              Returning...
                            </>
                          ) : (
                            <>
                              <Package className="w-4 h-4 mr-1" />
                              Return
                            </>
                          )}
                        </Button>
                      )}
                      {waste.status === 'added_to_inventory' && (
                        <span className="text-sm text-green-600 font-medium">✓ Added</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

