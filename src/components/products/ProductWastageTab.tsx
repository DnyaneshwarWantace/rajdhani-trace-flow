import { formatIndianDateTime } from '@/utils/formatHelpers';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Recycle, Package, Loader2, AlertCircle, LayoutGrid, Table2, Clock } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');

  useEffect(() => {
    loadWasteData();
  }, []);

  const loadWasteData = async () => {
    try {
      setLoading(true);
      const wasteItems = await WasteService.getAllWaste();
      
      // Only product wastage: exclude raw_material, then require product indicators (same logic as WastageManagement)
      const isProductWaste = (item: any) => {
        if (item.material_type === 'raw_material') return false;
        return (
          item.material_type === 'product' ||
          !!item.product_id ||
          (item.material_id && (String(item.material_id).startsWith('PRO-') || String(item.material_id).startsWith('PRD-'))) ||
          (item.individual_products && item.individual_products.length > 0) ||
          (item.individual_product_ids && item.individual_product_ids.length > 0)
        );
      };
      const productWaste = wasteItems.filter(isProductWaste);
      
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
      
      // Filter out invalid: no batch or no quantity. Use summary fields (actual_consumed_quantity, whole_product_count) not quantity_used.
      const validWaste = mappedWaste.filter((item) => {
        const consumption = item.materialConsumption;
        if (!Array.isArray(consumption)) return item.quantity > 0;
        const productConsumption = consumption.filter(
          (cons: any) => cons.material_type === 'product' && (cons.material_id === item.product_id || cons.material_id === item.material_id)
        );
        const totalUsed = productConsumption.reduce(
          (sum: number, cons: any) =>
            sum + (cons.quantity_used ?? cons.actual_consumed_quantity ?? cons.whole_product_count ?? cons.required_quantity ?? 0),
          0
        );
        return totalUsed > 0 || (item.quantity > 0 && (item.product_id || item.material_id));
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

  // Calculate stats
  const stats = {
    total: wasteData.length,
    availableForReuse: wasteData.filter((w) => w.status === 'available_for_reuse').length,
    addedToInventory: wasteData.filter((w) => w.status === 'added_to_inventory').length,
    disposed: wasteData.filter((w) => w.status === 'disposed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'available_for_reuse': return 'bg-green-100 text-green-700';
      case 'added_to_inventory': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available_for_reuse': return 'Reusable';
      case 'added_to_inventory': return 'Added';
      default: return 'Disposed';
    }
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Mobile stats row */}
      <div className="lg:hidden bg-white rounded-2xl border border-gray-100 shadow-sm flex divide-x divide-gray-100">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Reusable', value: stats.availableForReuse, color: 'text-green-600' },
          { label: 'Added', value: stats.addedToInventory, color: 'text-blue-600' },
          { label: 'Disposed', value: stats.disposed, color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="flex-1 flex flex-col items-center py-3 px-1">
            <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Desktop stats */}
      <div className="hidden lg:grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-sm text-gray-600">Total Waste</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p></div>
          <div className="p-3 bg-gray-100 rounded-lg"><Package className="w-6 h-6 text-gray-600" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-sm text-gray-600">Available for Reuse</p><p className="text-2xl font-bold text-green-600 mt-1">{stats.availableForReuse}</p></div>
          <div className="p-3 bg-green-100 rounded-lg"><Recycle className="w-6 h-6 text-green-600" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-sm text-gray-600">Added to Inventory</p><p className="text-2xl font-bold text-blue-600 mt-1">{stats.addedToInventory}</p></div>
          <div className="p-3 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-sm text-gray-600">Disposed</p><p className="text-2xl font-bold text-gray-600 mt-1">{stats.disposed}</p></div>
          <div className="p-3 bg-gray-100 rounded-lg"><AlertCircle className="w-6 h-6 text-gray-600" /></div>
        </CardContent></Card>
      </div>

      {wasteData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-base font-bold text-gray-900 mb-1">No Wastage Found</p>
          <p className="text-sm text-gray-400">Waste items appear when generated during production.</p>
        </div>
      ) : (
        <>
          {/* Mobile waste cards */}
          <div className="lg:hidden space-y-3">
            {wasteData.map((waste) => {
              const productConsumption = waste.materialConsumption?.filter(
                (cons: any) => cons.material_type === 'product' && (cons.material_id === waste.product_id || cons.material_id === waste.material_id)
              ) || [];
              const totalUsed = productConsumption.reduce(
                (sum: number, cons: any) => sum + (cons.quantity_used ?? cons.actual_consumed_quantity ?? cons.whole_product_count ?? cons.required_quantity ?? 0), 0
              );
              const totalWasted = waste.quantity || 0;

              return (
                <div key={waste.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 pt-3.5 pb-3 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <Recycle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-bold text-gray-900 line-clamp-2 flex-1">{waste.product_name || waste.material_name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getStatusBg(waste.status)}`}>
                          {getStatusLabel(waste.status).toUpperCase()}
                        </span>
                      </div>
                      {waste.waste_number && (
                        <p className="text-[11px] text-gray-400 font-mono">{waste.waste_number}</p>
                      )}
                    </div>
                  </div>

                  {/* Chips */}
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    <span className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                      Used: {totalUsed.toFixed(1)} {waste.unit}
                    </span>
                    <span className="text-[11px] bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">
                      Wasted: {totalWasted.toFixed(1)} {waste.unit}
                    </span>
                    {waste.waste_type && (
                      <span className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                        {WasteService.mapWasteTypeToDisplay(waste.waste_type)}
                      </span>
                    )}
                    {waste.production_batch_id && (
                      <span className="text-[11px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-mono">
                        {waste.production_batch_id.slice(-8)}
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  {waste.generation_date && (
                    <div className="px-4 pb-3 flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatIndianDateTime(waste.generation_date)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop card/table view */}
          <Card className="hidden lg:block">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Product Wastage
                </CardTitle>
                <div className="flex items-center gap-1 border rounded-lg p-1 bg-gray-50">
                  <Button variant={viewMode === 'card' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('card')} className="h-8 px-3">
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="h-8 px-3">
                    <Table2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  {wasteData.map((waste) => <ProductWasteCard key={waste.id} waste={waste} />)}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wasted</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {wasteData.map((waste) => {
                          const pc = waste.materialConsumption?.filter(
                            (c: any) => c.material_type === 'product' && (c.material_id === waste.product_id || c.material_id === waste.material_id)
                          ) || [];
                          const used = pc.reduce((s: number, c: any) => s + (c.quantity_used ?? c.actual_consumed_quantity ?? c.whole_product_count ?? c.required_quantity ?? 0), 0);
                          return (
                            <tr key={waste.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <TruncatedText text={waste.product_name || waste.material_name} maxLength={35} className="font-medium text-gray-900 block" as="p" />
                                <p className="text-xs text-gray-400 font-mono mt-0.5">{waste.product_id}</p>
                              </td>
                              <td className="px-4 py-4">
                                <Badge variant="outline" className={`${getStatusBg(waste.status)} border-transparent`}>{getStatusLabel(waste.status)}</Badge>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900">{used.toFixed(2)} {waste.unit}</td>
                              <td className="px-4 py-4 text-sm text-red-600 font-medium">{(waste.quantity || 0).toFixed(2)} {waste.unit}</td>
                              <td className="px-4 py-4 text-sm text-gray-700">{WasteService.mapWasteTypeToDisplay(waste.waste_type)}</td>
                              <td className="px-4 py-4 text-xs font-mono text-gray-600">{waste.production_batch_id || '—'}</td>
                              <td className="px-4 py-4 text-sm text-gray-600">{waste.generation_date ? formatIndianDateTime(waste.generation_date) : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

