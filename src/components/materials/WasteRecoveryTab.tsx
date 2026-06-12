import { formatIndianDate, formatIndianDateTime } from '@/utils/formatHelpers';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { Recycle, Package, Loader2, RefreshCw, LayoutGrid, Table2 } from 'lucide-react';
import { WasteService, type WasteItem } from '@/services/wasteService';
import { useToast } from '@/hooks/use-toast';
import WasteCard from './waste/WasteCard';

interface WasteRecoveryTabProps {
  onRefresh?: () => void;
}

export default function WasteRecoveryTab({ onRefresh }: WasteRecoveryTabProps) {
  const { toast } = useToast();
  const [wasteData, setWasteData] = useState<WasteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [returningIds, setReturningIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');

  useEffect(() => {
    loadWasteData();
  }, []);

  const loadWasteData = async () => {
    try {
      setLoading(true);
      const wasteItems = await WasteService.getAllWaste();
      
      // Filter to only raw materials (exclude products that were wasted as final products)
      const rawMaterialWaste = wasteItems.filter((item: any) => {
        // ONLY exclude if the waste itself is a product (material_type === 'product')
        // Do NOT exclude based on product_id (that's just which product was being made)
        return item.material_type !== 'product';
      });

      // Map waste data to display format
      const mappedWaste: WasteItem[] = rawMaterialWaste.map((item: any) => {
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

        return {
          id: item.id,
          waste_number: item.waste_number,
          material_id: item.material_id,
          material_name: item.material_name || '',
          material_type: item.material_type || 'raw_material',
          quantity: item.quantity || 0,
          unit: item.unit || '',
          waste_type: item.waste_type || '',
          waste_category: item.waste_category,
          can_be_reused: item.can_be_reused || false,
          production_batch_id: item.production_batch_id || item.batch_id,
          batch_id: item.batch_id,
          product_id: item.product_id,
          product_name: item.product_name,
          status: status,
          generation_date: item.generation_date || item.created_at,
          created_at: item.created_at,
          added_at: item.added_at,
          updated_at: item.updated_at,
        };
      });

      setWasteData(mappedWaste);
      console.log(`✅ Loaded ${mappedWaste.length} raw material waste items`);
    } catch (error) {
      console.error('Error loading waste data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load waste data',
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
          title: '✅ Material Returned to Inventory',
          description: `${waste.quantity} ${waste.unit} of ${waste.material_name} has been returned to inventory.`,
        });
        
        // Reload waste data
        await loadWasteData();
        
        // Trigger parent refresh if provided
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast({
          title: '❌ Error',
          description: result.error || 'Failed to return material to inventory',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error returning waste to inventory:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to return material to inventory',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // const availableWaste = wasteData.filter((w) => w.status === 'available_for_reuse');

  return (
    <div className="space-y-6">
      <Card className="border border-gray-150 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden bg-white">
        <CardHeader className="border-b border-gray-100 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-tr from-emerald-50 to-teal-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-inner">
                <Recycle className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <CardTitle className="text-xl font-extrabold text-gray-900 tracking-tight">
                  Waste Recovery Management
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 mt-0.5">
                  Recover reusable materials from production waste and return them to inventory
                </CardDescription>
              </div>
            </div>
            {wasteData.length > 0 && (
              <div className="hidden lg:flex items-center gap-1 border border-gray-200 rounded-xl p-1 bg-gray-50/80 self-end sm:self-auto">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'card'
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-150 hover:bg-white'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 mr-1" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-150 hover:bg-white'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5 mr-1" />
                  Table
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {wasteData.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-4 border border-gray-100">
                <Recycle className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No waste data found</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Waste materials from production will appear here for recovery.
              </p>
            </div>
          ) : (
            <>
              {/* Card view for small/medium screens */}
              <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                {wasteData.map((waste) => (
                  <WasteCard
                    key={waste.id}
                    waste={waste}
                    onReturn={handleReturnToInventory}
                    isReturning={returningIds.has(waste.id)}
                  />
                ))}
              </div>

              {/* Card or Table view for large screens based on viewMode */}
              {viewMode === 'card' ? (
                <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {wasteData.map((waste) => (
                    <WasteCard
                      key={waste.id}
                      waste={waste}
                      onReturn={handleReturnToInventory}
                      isReturning={returningIds.has(waste.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="hidden lg:block bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50/75 border-b border-gray-150">
                          <th className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Material / Details</th>
                          <th className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Waste Type</th>
                          <th className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Batch ID</th>
                          <th className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Generated</th>
                          <th className="px-6 py-3.5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {wasteData.map((waste) => (
                          <tr key={waste.id} className="hover:bg-gray-50/65 transition-colors group">
                            <td className="px-6 py-4.5">
                              <div className="min-w-0 max-w-[250px]">
                                <TruncatedText
                                  text={waste.material_name}
                                  maxLength={35}
                                  className="font-bold text-gray-900 block group-hover:text-primary-600 transition-colors"
                                  as="p"
                                />
                                <p className="text-[11px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">
                                  {waste.material_type === 'product' ? '📦 Product' : '🔧 Raw Material'}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  waste.status === 'available_for_reuse'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : waste.status === 'added_to_inventory'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-gray-50 text-gray-600 border-gray-250'
                                }`}
                              >
                                {waste.status === 'available_for_reuse'
                                  ? 'Reusable'
                                  : waste.status === 'added_to_inventory'
                                  ? 'Added'
                                  : 'Disposed'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="font-bold text-gray-900 text-sm">{Number(waste.quantity).toFixed(4)}</div>
                              <p className="text-xs text-gray-400 font-medium mt-0.5">{waste.unit}</p>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="text-sm font-semibold text-gray-700">
                                {WasteService.mapWasteTypeToDisplay(waste.waste_type)}
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              {waste.production_batch_id ? (
                                <div className="text-xs font-mono font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block">
                                  <TruncatedText text={waste.production_batch_id} maxLength={20} className="block" />
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 font-mono">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4.5">
                              {waste.generation_date && (
                                <div className="text-xs font-medium text-gray-600">{formatIndianDateTime(waste.generation_date)}</div>
                              )}
                              {waste.added_at && (
                                <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Added: {formatIndianDate(waste.added_at)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              {waste.status === 'available_for_reuse' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReturnToInventory(waste)}
                                  disabled={returningIds.has(waste.id)}
                                  className="h-9 rounded-xl text-xs font-bold text-emerald-600 hover:text-white border-emerald-200 hover:border-emerald-600 hover:bg-emerald-600 active:bg-emerald-700 transition-all duration-200 flex items-center justify-center gap-1.5 ml-auto"
                                >
                                  {returningIds.has(waste.id) ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      Returning...
                                    </>
                                  ) : (
                                    <>
                                      <Package className="w-3.5 h-3.5" />
                                      Return to Inventory
                                    </>
                                  )}
                                </Button>
                              )}
                              {waste.status === 'added_to_inventory' && (
                                <div className="text-xs text-emerald-600 font-bold flex items-center justify-end gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  ✓ Added
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

