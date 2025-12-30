import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, CheckCircle, XCircle, AlertCircle, Package, Factory } from 'lucide-react';
import { WasteService, type WasteItem } from '@/services/wasteService';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import AddWasteDialog from './AddWasteDialog';
import ProductWastageAutoDialog from './ProductWastageAutoDialog';

interface WastageManagementProps {
  batchId: string;
  consumedMaterials: any[];
  onRefresh?: () => void;
  productId?: string;
  productName?: string;
}

export default function WastageManagement({
  batchId,
  consumedMaterials,
  onRefresh,
  productId,
  productName,
}: WastageManagementProps) {
  const { toast } = useToast();
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showProductWastageDialog, setShowProductWastageDialog] = useState(false);
  const [selectedMaterialForWastage, setSelectedMaterialForWastage] = useState<any>(null);

  useEffect(() => {
    if (batchId) {
      loadWasteItems();
    }
  }, [batchId]);

  const loadWasteItems = async () => {
    try {
      setLoading(true);
      const allWaste = await WasteService.getAllWaste();
      // Filter waste items for this batch
      const batchWaste = allWaste.filter(
        (item) => item.production_batch_id === batchId || item.batch_id === batchId
      );
      setWasteItems(batchWaste);
    } catch (error) {
      console.error('Error loading waste items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load waste items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate potential wastage for products
  const getProductWastagePotential = (material: any) => {
    // Check if it's a product by type or ID format
    const isProduct = material.material_type === 'product' || 
                     (material.material_id && material.material_id.startsWith('PRO-'));
    
    console.log('🔍 Checking wastage potential for material:', material.material_name, {
      material_id: material.material_id,
      material_type: material.material_type,
      isProduct,
      whole_product_count: material.whole_product_count,
      actual_consumed_quantity: material.actual_consumed_quantity,
      required_quantity: material.required_quantity,
      quantity_used: material.quantity_used,
      individual_product_ids: material.individual_product_ids?.length || 0,
    });
    
    if (!isProduct) {
      console.log('❌ Not a product material');
      return null;
    }
    
    // For products: whole_product_count is the number of whole products used
    // actual_consumed_quantity is the fractional amount consumed
    // If whole_product_count exists, use it; otherwise calculate from required_quantity
    let wholeCount = material.whole_product_count;
    let consumed = material.actual_consumed_quantity || material.required_quantity || 0;
    
    // If we don't have whole_product_count, calculate it from required_quantity (round up)
    if (!wholeCount && consumed > 0) {
      wholeCount = Math.ceil(consumed);
      console.log('📊 Calculated wholeCount from consumed:', wholeCount);
    }
    
    // Also check quantity_used as fallback
    if (!wholeCount && material.quantity_used) {
      wholeCount = material.quantity_used;
      console.log('📊 Using quantity_used as wholeCount:', wholeCount);
    }
    
    if (!wholeCount || !consumed) {
      console.log('❌ Missing data for wastage calculation');
      return null;
    }
    
    const wastage = wholeCount - consumed;
    console.log('✅ Wastage calculation:', { wholeCount, consumed, wastage });
    
    if (wastage <= 0) {
      console.log('❌ No wastage (wholeCount <= consumed)');
      return null;
    }
    
    return {
      quantity: wastage,
      wholeCount: Math.ceil(wastage),
      hasWastage: true,
    };
  };

  // Check if wastage already exists for a material
  const hasWastageForMaterial = (materialId: string) => {
    return wasteItems.some((waste) => waste.material_id === materialId);
  };

  const handleAutoGenerateWastage = (material: any) => {
    setSelectedMaterialForWastage(material);
    setShowProductWastageDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'generated':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            Generated
          </Badge>
        );
      case 'disposed':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            Disposed
          </Badge>
        );
      case 'reused':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            Reused
          </Badge>
        );
      case 'added_to_inventory':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
            Added to Inventory
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
            {status}
          </Badge>
        );
    }
  };

  // Check if there are any raw materials in consumed materials
  const hasRawMaterials = consumedMaterials.some((m) => {
    const isRawMaterial = m.material_type === 'raw_material' ||
                         (m.material_id && m.material_id.startsWith('RM-'));
    return isRawMaterial;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Waste Management ({wasteItems.length})
            </CardTitle>
            <Button
              onClick={() => setShowAddDialog(true)}
              disabled={!hasRawMaterials}
              className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              title={!hasRawMaterials ? 'No raw materials consumed. Only product wastage can be auto-generated.' : 'Add waste for raw materials'}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Waste (Raw Material)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Auto-Generate Wastage for Products */}
          {consumedMaterials.length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Auto-Generate Product Wastage</h3>
              {(() => {
                // Filter products - also check by material_id format (PRO-* indicates product)
                const productMaterials = consumedMaterials.filter((m) => {
                  const isProduct = m.material_type === 'product' || 
                                   (m.material_id && m.material_id.startsWith('PRO-'));
                  console.log('🔍 Material check:', {
                    name: m.material_name,
                    material_id: m.material_id,
                    material_type: m.material_type,
                    isProduct,
                  });
                  return isProduct;
                });
                
                console.log('📦 Product materials found:', productMaterials.length);
                console.log('📦 All consumed materials:', consumedMaterials.map(m => ({
                  name: m.material_name,
                  material_id: m.material_id,
                  type: m.material_type,
                  whole_product_count: m.whole_product_count,
                  actual_consumed_quantity: m.actual_consumed_quantity,
                  required_quantity: m.required_quantity,
                  quantity_used: m.quantity_used,
                })));
                
                if (productMaterials.length === 0) {
                  return (
                    <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
                      No product materials found. Product wastage is auto-calculated based on whole products used vs consumed quantity.
                    </div>
                  );
                }
                
                return productMaterials.map((material) => {
                  // Ensure material_type is set to 'product' if detected by ID
                  const normalizedMaterial = {
                    ...material,
                    material_type: material.material_type === 'product' || 
                                  (material.material_id && material.material_id.startsWith('PRO-'))
                                    ? 'product' 
                                    : material.material_type,
                  };
                  
                  const wastagePotential = getProductWastagePotential(normalizedMaterial);
                  const hasWastage = hasWastageForMaterial(normalizedMaterial.material_id);
                  
                  console.log('Material:', normalizedMaterial.material_name, {
                    wastagePotential,
                    hasWastage,
                    whole_product_count: normalizedMaterial.whole_product_count,
                    actual_consumed_quantity: normalizedMaterial.actual_consumed_quantity,
                    required_quantity: normalizedMaterial.required_quantity,
                    quantity_used: normalizedMaterial.quantity_used,
                    individual_product_ids: normalizedMaterial.individual_product_ids?.length || 0,
                  });
                  
                  // Show all product materials, even if no wastage potential yet
                  if (hasWastage) {
                    return (
                      <div
                        key={normalizedMaterial.material_id}
                        className="bg-green-50 border border-green-200 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <h4 className="font-semibold text-gray-900">{normalizedMaterial.material_name}</h4>
                          <Badge variant="outline" className="text-xs bg-green-100">Wastage Recorded</Badge>
                        </div>
                      </div>
                    );
                  }
                  
                  if (!wastagePotential) {
                    // Still show the product, but indicate no wastage or missing data
                    const wholeCount = normalizedMaterial.whole_product_count || 
                                      normalizedMaterial.quantity_used || 
                                      Math.ceil(normalizedMaterial.actual_consumed_quantity || normalizedMaterial.required_quantity || 0);
                    const consumed = normalizedMaterial.actual_consumed_quantity || normalizedMaterial.required_quantity || 0;
                    
                    return (
                      <div
                        key={normalizedMaterial.material_id}
                        className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-lg">{normalizedMaterial.material_name}</h4>
                            <Badge variant="outline" className="text-xs bg-blue-100">Product</Badge>
                          </div>
                          {wholeCount > consumed && (
                            <Button
                              onClick={() => handleAutoGenerateWastage(normalizedMaterial)}
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Auto-Generate
                            </Button>
                          )}
                        </div>

                        {/* Wastage Summary Table */}
                        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden mb-4">
                          <table className="w-full text-sm">
                            <thead className="bg-gradient-to-r from-orange-100 to-yellow-100">
                              <tr>
                                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Metric</th>
                                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-gray-50">
                                <td className="border border-gray-200 px-4 py-2 font-medium text-gray-700">Consumed Quantity</td>
                                <td className="border border-gray-200 px-4 py-2 text-gray-900">{consumed.toFixed(4)} {normalizedMaterial.unit}</td>
                              </tr>
                              <tr className="hover:bg-gray-50">
                                <td className="border border-gray-200 px-4 py-2 font-medium text-gray-700">Whole Products Used</td>
                                <td className="border border-gray-200 px-4 py-2 text-gray-900">{wholeCount} {normalizedMaterial.unit}</td>
                              </tr>
                              <tr className={wholeCount > consumed ? 'bg-orange-50' : 'bg-green-50'}>
                                <td className="border border-gray-200 px-4 py-2 font-bold text-gray-900">
                                  {wholeCount > consumed ? '⚠️ Potential Wastage' : '✅ Status'}
                                </td>
                                <td className="border border-gray-200 px-4 py-2">
                                  {wholeCount > consumed ? (
                                    <span className="font-bold text-orange-700">
                                      {(wholeCount - consumed).toFixed(2)} {normalizedMaterial.unit}
                                      <span className="text-xs ml-2">({wholeCount - Math.floor(consumed)} whole {normalizedMaterial.unit})</span>
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <span className="font-semibold text-green-700">No wastage detected - Automatically handled</span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                            {/* Individual Products Table */}
                            {normalizedMaterial.individual_products && normalizedMaterial.individual_products.length > 0 && (
                              <div className="mt-4 bg-white border border-gray-300 rounded-lg p-3">
                                <h5 className="text-xs font-semibold text-gray-900 mb-2">
                                  Individual Products Used ({normalizedMaterial.individual_products.length})
                                </h5>
                                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead className="bg-gray-100 sticky top-0">
                                      <tr>
                                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-900">#</th>
                                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-900">Product ID</th>
                                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-900">QR Code</th>
                                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-900">Serial Number</th>
                                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-900">Size (L × W)</th>
                                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-900">Weight</th>
                                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-900">Color</th>
                                        <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-900">Pattern</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                      {normalizedMaterial.individual_products.map((product: any, idx: number) => (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                          <td className="border border-gray-200 px-2 py-2 text-gray-600">{idx + 1}</td>
                                          <td className="border border-gray-200 px-2 py-2 font-medium text-gray-900">{product.id}</td>
                                          <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.qr_code || '—'}</td>
                                          <td className="border border-gray-200 px-2 py-2 text-gray-900 text-[10px] break-all max-w-[200px]">{product.serial_number || '—'}</td>
                                          <td className="border border-gray-200 px-2 py-2 text-gray-900">
                                            {product.length && product.width ? (
                                              <>
                                                {product.length.includes(' ') ? product.length : `${product.length} ${product.length_unit || ''}`} × {product.width.includes(' ') ? product.width : `${product.width} ${product.width_unit || ''}`}
                                              </>
                                            ) : '—'}
                                          </td>
                                          <td className="border border-gray-200 px-2 py-2 text-gray-900">
                                            {product.weight ? (
                                              product.weight.includes(' ') ? product.weight : `${product.weight} ${product.weight_unit || ''}`
                                            ) : '—'}
                                          </td>
                                          <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.color || '—'}</td>
                                          <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.pattern || '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                      </div>
                    );
                  }
                  
                  return (
                    <div
                      key={normalizedMaterial.material_id}
                      className="bg-orange-50 border border-orange-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                            <h4 className="font-semibold text-gray-900">{normalizedMaterial.material_name}</h4>
                            <Badge variant="outline" className="text-xs">Product</Badge>
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            <p>
                              <span className="font-medium">Consumed:</span> {normalizedMaterial.actual_consumed_quantity?.toFixed(2) || normalizedMaterial.required_quantity?.toFixed(2) || '0.00'} {normalizedMaterial.unit}
                            </p>
                            <p>
                              <span className="font-medium">Whole Products Used:</span> {normalizedMaterial.whole_product_count || normalizedMaterial.quantity_used || Math.ceil(normalizedMaterial.required_quantity || 0)} {normalizedMaterial.unit}
                            </p>
                            <p className="font-semibold text-orange-700">
                              <span className="font-medium">Potential Wastage:</span> {wastagePotential.quantity.toFixed(2)} {normalizedMaterial.unit} ({wastagePotential.wholeCount} whole {normalizedMaterial.unit})
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAutoGenerateWastage(normalizedMaterial)}
                          className="bg-orange-600 hover:bg-orange-700 text-white ml-4"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Auto-Generate
                        </Button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

        {/* Separate wastage by type */}
        {(() => {
          const rawMaterialWaste = wasteItems.filter(w => w.material_type === 'raw_material');
          const productWaste = wasteItems.filter(w => w.material_type === 'product');

          if (wasteItems.length === 0 && !consumedMaterials.some((m) => {
            const potential = getProductWastagePotential(m);
            return potential && !hasWastageForMaterial(m.material_id);
          })) {
            return (
              <div className="text-center py-12">
                <Trash2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 mb-1">No waste items recorded yet</p>
                <p className="text-sm text-gray-500">
                  Click "Add Waste" to record waste generated during production
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {/* Raw Material Wastage Section */}
              {rawMaterialWaste.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Factory className="w-4 h-4 text-blue-600" />
                    Raw Material Wastage ({rawMaterialWaste.length})
                  </h3>
                  <div className="space-y-3">
                    {rawMaterialWaste.map((waste) => (
              <div
                key={waste.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {waste.material_name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {waste.material_type === 'product' ? 'Product' : 'Raw Material'}
                      </Badge>
                      {getStatusBadge(waste.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Waste Type</p>
                        <p className="font-medium text-gray-900">{waste.waste_type}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Quantity</p>
                        <p className="font-medium text-gray-900">
                          {Number(waste.quantity).toFixed(4)} {waste.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Category</p>
                        <p className="font-medium text-gray-900">
                          {waste.waste_category || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Can Be Reused</p>
                        <p className="font-medium text-gray-900">
                          {waste.can_be_reused ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              No
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {waste.generation_date && (
                      <p className="text-xs text-gray-500 mt-2">
                        Generated: {new Date(waste.generation_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Individual Products Display for Product Wastage */}
                {waste.material_type === 'product' && waste.individual_products && waste.individual_products.length > 0 && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="mb-2">
                      <h5 className="text-xs font-semibold text-red-900 mb-1">
                        Wasted Individual Products ({waste.individual_products.length})
                      </h5>
                      {waste.product_name && (
                        <p className="text-xs text-gray-600">
                          Product: <span className="font-medium">{waste.product_name}</span>
                          {waste.product_id && <span className="ml-2 text-gray-500">({waste.product_id})</span>}
                        </p>
                      )}
                    </div>
                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-red-100 sticky top-0">
                          <tr>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">#</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Product ID</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">QR Code</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Serial Number</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Dimensions</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Weight</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Color</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Pattern</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {waste.individual_products.map((product: any, idx: number) => (
                            <tr key={product.id || idx} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-2 py-2 text-gray-600">{idx + 1}</td>
                              <td className="border border-gray-200 px-2 py-2 font-medium text-gray-900">{product.id || '—'}</td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.qr_code || '—'}</td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900 text-[10px] break-all max-w-[200px]">{product.serial_number || '—'}</td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900">
                                {product.length && product.width ? `${product.length} × ${product.width}` : '—'}
                              </td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.weight || '—'}</td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.color || '—'}</td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.pattern || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
                  </div>
                </div>
              )}

              {/* Product Wastage Section */}
              {productWaste.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-600" />
                    Product Wastage ({productWaste.length})
                  </h3>
                  <div className="space-y-3">
                    {productWaste.map((waste) => (
              <div
                key={waste.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {waste.material_name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {waste.material_type === 'product' ? 'Product' : 'Raw Material'}
                      </Badge>
                      {getStatusBadge(waste.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Waste Type</p>
                        <p className="font-medium text-gray-900">{waste.waste_type}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Quantity</p>
                        <p className="font-medium text-gray-900">
                          {Number(waste.quantity).toFixed(4)} {waste.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Category</p>
                        <p className="font-medium text-gray-900">
                          {waste.waste_category || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Can Be Reused</p>
                        <p className="font-medium text-gray-900">
                          {waste.can_be_reused ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              No
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {waste.generation_date && (
                      <p className="text-xs text-gray-500 mt-2">
                        Generated: {new Date(waste.generation_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Individual Products Display for Product Wastage */}
                {waste.material_type === 'product' && waste.individual_products && waste.individual_products.length > 0 && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="mb-2">
                      <h5 className="text-xs font-semibold text-red-900 mb-1">
                        Wasted Individual Products ({waste.individual_products.length})
                      </h5>
                      {waste.product_name && (
                        <p className="text-xs text-gray-600">
                          Product: <span className="font-medium">{waste.product_name}</span>
                          {waste.product_id && <span className="ml-2 text-gray-500">({waste.product_id})</span>}
                        </p>
                      )}
                    </div>
                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-red-100 sticky top-0">
                          <tr>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">#</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Product ID</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">QR Code</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Serial Number</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Dimensions</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Weight</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Color</th>
                            <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Pattern</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {waste.individual_products.map((product: any, idx: number) => (
                            <tr key={product.id || idx} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-2 py-2 text-gray-600">{idx + 1}</td>
                              <td className="border border-gray-200 px-2 py-2 font-medium text-gray-900">{product.id || '—'}</td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.qr_code || '—'}</td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900 text-[10px] break-all max-w-[200px]">{product.serial_number || '—'}</td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900">
                                {product.length && product.width ? (
                                  <>
                                    {product.length.includes(' ') ? product.length : `${product.length} ${product.length_unit || ''}`} × {product.width.includes(' ') ? product.width : `${product.width} ${product.width_unit || ''}`}
                                  </>
                                ) : '—'}
                              </td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900">
                                {product.weight ? (
                                  product.weight.includes(' ') ? product.weight : `${product.weight} ${product.weight_unit || ''}`
                                ) : '—'}
                              </td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.color || '—'}</td>
                              <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.pattern || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </CardContent>
    </Card>

    <AddWasteDialog
      isOpen={showAddDialog}
      onClose={() => setShowAddDialog(false)}
      onSuccess={() => {
        loadWasteItems();
        setShowAddDialog(false);
        // Call onRefresh to update parent component's wasteItems state
        // This is needed for the "Individual Products" button to enable
        if (onRefresh) {
          onRefresh();
        }
      }}
      batchId={batchId}
      consumedMaterials={consumedMaterials}
      productId={productId}
      productName={productName}
    />

    {selectedMaterialForWastage && (
      <ProductWastageAutoDialog
        isOpen={showProductWastageDialog}
        onClose={() => {
          setShowProductWastageDialog(false);
          setSelectedMaterialForWastage(null);
        }}
        onSuccess={() => {
          loadWasteItems();
          setShowProductWastageDialog(false);
          setSelectedMaterialForWastage(null);
          // Call onRefresh to update parent component's wasteItems state
          // This is needed for the "Individual Products" button to enable
          if (onRefresh) {
            onRefresh();
          }
        }}
        batchId={batchId}
        material={selectedMaterialForWastage}
      />
    )}
    </>
  );
}

