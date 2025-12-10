import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { Recycle, Package, Loader2, RefreshCw } from 'lucide-react';
import { WasteService, type WasteItem } from '@/services/wasteService';
import { useToast } from '@/hooks/use-toast';

interface WasteRecoveryTabProps {
  onRefresh?: () => void;
}

export default function WasteRecoveryTab({ onRefresh }: WasteRecoveryTabProps) {
  const { toast } = useToast();
  const [wasteData, setWasteData] = useState<WasteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [returningIds, setReturningIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadWasteData();
  }, []);

  const loadWasteData = async () => {
    try {
      setLoading(true);
      const wasteItems = await WasteService.getAllWaste();
      
      // Map waste data to display format
      const mappedWaste: WasteItem[] = wasteItems.map((item: any) => {
        // Determine status
        const isAdded = item.added_at || item.status === 'added_to_inventory' || item.status === 'reused';
        
        let status: 'available_for_reuse' | 'added_to_inventory' | 'disposed' | 'reused';
        
        if (isAdded) {
          status = 'added_to_inventory';
        } else {
          const canBeReused = item.can_be_reused === true || item.can_be_reused === 'true' || item.waste_category === 'reusable';
          if (canBeReused) {
            status = 'available_for_reuse';
          } else {
            status = 'disposed';
          }
        }
        
        return {
          id: item.id,
          waste_number: item.waste_number,
          material_id: item.material_id,
          material_name: item.material_name || item.product_name || '',
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
      console.log(`✅ Loaded ${mappedWaste.length} waste items`);
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
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading waste recovery data...</p>
        </div>
      </div>
    );
  }

  // const availableWaste = wasteData.filter((w) => w.status === 'available_for_reuse');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Recycle className="w-5 h-5" />
            Waste Recovery Management
          </CardTitle>
          <CardDescription>
            Recover reusable materials from production waste and return them to inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wasteData.length === 0 ? (
            <div className="text-center py-12">
              <Recycle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No waste data found</h3>
              <p className="text-sm text-gray-600">
                Waste materials from production will appear here for recovery.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-gray-700">Status</th>
                    <th className="text-left p-4 font-medium text-gray-700">Material</th>
                    <th className="text-left p-4 font-medium text-gray-700">Quantity</th>
                    <th className="text-left p-4 font-medium text-gray-700">Waste Type</th>
                    <th className="text-left p-4 font-medium text-gray-700">Product Info</th>
                    <th className="text-left p-4 font-medium text-gray-700">Generated</th>
                    <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteData.map((waste) => (
                    <tr key={waste.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <Badge
                          variant={
                            waste.status === 'available_for_reuse'
                              ? 'default'
                              : waste.status === 'added_to_inventory'
                              ? 'outline'
                              : 'secondary'
                          }
                          className={
                            waste.status === 'available_for_reuse'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : waste.status === 'added_to_inventory'
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }
                        >
                          {waste.status === 'available_for_reuse'
                            ? 'Reusable'
                            : waste.status === 'added_to_inventory'
                            ? 'Added'
                            : 'Disposed'}
                        </Badge>
                      </td>
                      <td className="p-4">
                    <div className="font-medium text-gray-900 min-w-0">
                      <TruncatedText text={waste.material_name} maxLength={50} className="block" />
                    </div>
                    <div className="text-sm text-gray-500">
                      {waste.quantity} {waste.unit}
                    </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{waste.quantity}</div>
                        <div className="text-sm text-gray-500">{waste.unit}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-700">
                          {WasteService.mapWasteTypeToDisplay(waste.waste_type)}
                        </div>
                      </td>
                      <td className="p-4">
                    <div className="text-sm font-medium text-gray-900 min-w-0">
                      <TruncatedText text={waste.material_name} maxLength={60} className="block" />
                    </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {waste.material_type === 'product' ? '📦 Product' : '🔧 Raw Material'}
                        </div>
                        {waste.production_batch_id && (
                      <div className="text-xs text-gray-500 min-w-0">
                        <TruncatedText text={`Batch: ${waste.production_batch_id}`} maxLength={50} className="block" />
                      </div>
                        )}
                        <div className="text-xs text-primary-600 mt-1">
                          Type: {WasteService.mapWasteTypeToDisplay(waste.waste_type)}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {waste.generation_date && (
                          <>
                            <div>{new Date(waste.generation_date).toLocaleDateString()}</div>
                            <div className="text-xs">{new Date(waste.generation_date).toLocaleTimeString()}</div>
                          </>
                        )}
                        {waste.added_at && (
                          <div className="text-xs text-green-600 mt-1">
                            Added: {new Date(waste.added_at).toLocaleDateString()}
                          </div>
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
                                Return to Inventory
                              </>
                            )}
                          </Button>
                        )}
                        {waste.status === 'added_to_inventory' && (
                          <div className="text-sm text-green-600 font-medium">✓ Added</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

