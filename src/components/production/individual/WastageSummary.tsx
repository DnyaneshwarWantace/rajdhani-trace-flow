import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Factory, Package, AlertTriangle, CheckCircle, XCircle, Table, Grid } from 'lucide-react';
import type { WasteItem } from '@/services/wasteService';
import { formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface WastageSummaryProps {
  wasteItems: WasteItem[];
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'generated':
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">Generated</Badge>;
    case 'disposed':
      return <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Disposed</Badge>;
    case 'reused':
      return <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">Reused</Badge>;
    case 'added_to_inventory':
      return <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">Added to Inventory</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs">{status}</Badge>;
  }
};

export default function WastageSummary({ wasteItems }: WastageSummaryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  // Separate waste by type
  const rawMaterialWaste = wasteItems.filter(w => w.material_type === 'raw_material');
  const productWaste = wasteItems.filter(w => w.material_type === 'product');

  // Calculate total wastage quantities
  const totalRawMaterialWaste = rawMaterialWaste.reduce((sum, w) => sum + w.quantity, 0);
  const totalProductWaste = productWaste.reduce((sum, w) => sum + w.quantity, 0);

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <Trash2 className="w-5 h-5" />
            Wastage Details from Previous Stage
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8"
            >
              <Table className="w-4 h-4 mr-1" />
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8"
            >
              <Grid className="w-4 h-4 mr-1" />
              Grid
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'table' ? (
          /* Table View */
          <div className="space-y-6">
            {/* Raw Material Wastage Table */}
            {rawMaterialWaste.length > 0 && (
              <div className="bg-white border border-blue-200 rounded-lg overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Factory className="w-4 h-4 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">Raw Material Wastage ({rawMaterialWaste.length})</h3>
                    </div>
                    <p className="text-sm font-semibold text-blue-900">
                      Total: {formatIndianNumberWithDecimals(totalRawMaterialWaste, 2)} units
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-blue-900 border-b border-blue-200">Waste #</th>
                        <th className="px-4 py-3 text-left font-semibold text-blue-900 border-b border-blue-200">Material Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-blue-900 border-b border-blue-200">Quantity</th>
                        <th className="px-4 py-3 text-left font-semibold text-blue-900 border-b border-blue-200">Unit</th>
                        <th className="px-4 py-3 text-left font-semibold text-blue-900 border-b border-blue-200">Waste Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-blue-900 border-b border-blue-200">Category</th>
                        <th className="px-4 py-3 text-left font-semibold text-blue-900 border-b border-blue-200">Can Be Reused</th>
                        <th className="px-4 py-3 text-left font-semibold text-blue-900 border-b border-blue-200">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-blue-900 border-b border-blue-200">Generated Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rawMaterialWaste.map((waste) => (
                        <tr key={waste.id} className="hover:bg-blue-50">
                          <td className="px-4 py-3 text-gray-900 font-mono text-xs">{waste.waste_number || waste.id}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium max-w-xs">
                            <TruncatedText text={waste.material_name} maxLength={40} className="block" />
                          </td>
                          <td className="px-4 py-3 text-gray-900 font-semibold">{formatIndianNumberWithDecimals(waste.quantity, 2)}</td>
                          <td className="px-4 py-3 text-gray-600">{waste.unit}</td>
                          <td className="px-4 py-3 text-gray-900">{waste.waste_type}</td>
                          <td className="px-4 py-3">
                            <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
                              {waste.waste_category || 'N/A'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
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
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(waste.status)}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {waste.generation_date ? new Date(waste.generation_date).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Product Wastage Table */}
            {productWaste.length > 0 && (
              <div className="bg-white border border-purple-200 rounded-lg overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      <h3 className="font-semibold text-purple-900">Product Wastage ({productWaste.length})</h3>
                    </div>
                    <p className="text-sm font-semibold text-purple-900">
                      Total: {formatIndianNumberWithDecimals(totalProductWaste, 2)} units
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-purple-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-purple-900 border-b border-purple-200">Waste #</th>
                        <th className="px-4 py-3 text-left font-semibold text-purple-900 border-b border-purple-200">Material Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-purple-900 border-b border-purple-200">Quantity</th>
                        <th className="px-4 py-3 text-left font-semibold text-purple-900 border-b border-purple-200">Unit</th>
                        <th className="px-4 py-3 text-left font-semibold text-purple-900 border-b border-purple-200">Waste Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-purple-900 border-b border-purple-200">Category</th>
                        <th className="px-4 py-3 text-left font-semibold text-purple-900 border-b border-purple-200">Can Be Reused</th>
                        <th className="px-4 py-3 text-left font-semibold text-purple-900 border-b border-purple-200">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-purple-900 border-b border-purple-200">Generated Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productWaste.map((waste) => (
                        <tr key={waste.id} className="hover:bg-purple-50">
                          <td className="px-4 py-3 text-gray-900 font-mono text-xs">{waste.waste_number || waste.id}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium max-w-xs">
                            <TruncatedText text={waste.material_name} maxLength={40} className="block" />
                          </td>
                          <td className="px-4 py-3 text-gray-900 font-semibold">{formatIndianNumberWithDecimals(waste.quantity, 2)}</td>
                          <td className="px-4 py-3 text-gray-600">{waste.unit}</td>
                          <td className="px-4 py-3 text-gray-900">{waste.waste_type}</td>
                          <td className="px-4 py-3">
                            <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
                              {waste.waste_category || 'N/A'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
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
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(waste.status)}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {waste.generation_date ? new Date(waste.generation_date).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {wasteItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Trash2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No wastage recorded for this batch</p>
              </div>
            )}

            {/* Overall Wastage Alert */}
            {wasteItems.length > 0 && (
              <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-900">Wastage Information</p>
                  <p className="text-xs text-orange-800 mt-1">
                    Total wastage recorded: {wasteItems.length} item(s). This data was captured in the wastage stage and is shown here for reference when creating individual products.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Grid View (Original) */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Raw Material Wastage */}
            {rawMaterialWaste.length > 0 && (
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Factory className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Raw Material Wastage ({rawMaterialWaste.length})</h3>
              </div>
              <div className="space-y-3">
                {rawMaterialWaste.map((waste) => (
                  <div key={waste.id} className="border border-blue-300 rounded-lg p-3 bg-blue-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{waste.material_name}</h4>
                          {getStatusBadge(waste.status)}
                        </div>
                        <p className="text-xs text-gray-600">Waste #: {waste.waste_number || waste.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-700 text-lg">{Number(waste.quantity).toFixed(4)} {waste.unit}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div>
                        <p className="text-gray-500">Waste Type</p>
                        <p className="font-medium text-gray-900">{waste.waste_type}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Category</p>
                        <p className="font-medium text-gray-900">{waste.waste_category || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Can Be Reused</p>
                        <p className="font-medium">
                          {waste.can_be_reused ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              No
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Generated Date</p>
                        <p className="font-medium text-gray-900">
                          {waste.generation_date ? new Date(waste.generation_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-blue-300 bg-white rounded p-2">
                  <p className="text-sm font-semibold text-blue-900">
                    Total Raw Material Wastage: {totalRawMaterialWaste.toFixed(2)} units
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Product Wastage */}
          {productWaste.length > 0 && (
            <div className="bg-white border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Product Wastage ({productWaste.length})</h3>
              </div>
              <div className="space-y-3">
                {productWaste.map((waste) => (
                  <div key={waste.id} className="border border-purple-300 rounded-lg p-3 bg-purple-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{waste.material_name}</h4>
                          {getStatusBadge(waste.status)}
                        </div>
                        <p className="text-xs text-gray-600">Waste #: {waste.waste_number || waste.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-700 text-lg">{Number(waste.quantity).toFixed(4)} {waste.unit}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div>
                        <p className="text-gray-500">Waste Type</p>
                        <p className="font-medium text-gray-900">{waste.waste_type}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Category</p>
                        <p className="font-medium text-gray-900">{waste.waste_category || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Can Be Reused</p>
                        <p className="font-medium">
                          {waste.can_be_reused ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              No
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Generated Date</p>
                        <p className="font-medium text-gray-900">
                          {waste.generation_date ? new Date(waste.generation_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Individual Products wasted - Detailed Table */}
                    {waste.individual_products && waste.individual_products.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-purple-300 bg-white rounded-lg p-2">
                        <div className="mb-2">
                          <p className="text-xs text-purple-900 font-semibold mb-1 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            Wasted Individual Products ({waste.individual_products.length})
                          </p>
                          {waste.product_name && (
                            <p className="text-xs text-gray-600">
                              Product: <span className="font-medium">{waste.product_name}</span>
                              {waste.product_id && <span className="ml-2 text-gray-500">({waste.product_id})</span>}
                            </p>
                          )}
                        </div>
                        <div className="max-h-48 overflow-y-auto overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead className="bg-purple-100 sticky top-0">
                              <tr>
                                <th className="border border-purple-300 px-2 py-1 text-left font-semibold text-purple-900">#</th>
                                <th className="border border-purple-300 px-2 py-1 text-left font-semibold text-purple-900">Product ID</th>
                                <th className="border border-purple-300 px-2 py-1 text-left font-semibold text-purple-900">QR Code</th>
                                <th className="border border-purple-300 px-2 py-1 text-left font-semibold text-purple-900">Serial Number</th>
                                <th className="border border-purple-300 px-2 py-1 text-left font-semibold text-purple-900">Dimensions</th>
                                <th className="border border-purple-300 px-2 py-1 text-left font-semibold text-purple-900">Weight</th>
                                <th className="border border-purple-300 px-2 py-1 text-left font-semibold text-purple-900">Color</th>
                                <th className="border border-purple-300 px-2 py-1 text-left font-semibold text-purple-900">Pattern</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {waste.individual_products.map((product: any, idx: number) => (
                                <tr key={product.id || idx} className="hover:bg-purple-50">
                                  <td className="border border-gray-200 px-2 py-1 text-gray-600">{idx + 1}</td>
                                  <td className="border border-gray-200 px-2 py-1 font-mono text-gray-900">{product.id || '—'}</td>
                                  <td className="border border-gray-200 px-2 py-1 text-gray-900">{product.qr_code || '—'}</td>
                                  <td className="border border-gray-200 px-2 py-1 text-gray-900 text-[10px] break-all max-w-[200px]">{product.serial_number || '—'}</td>
                                  <td className="border border-gray-200 px-2 py-1 text-gray-900">
                                    {product.length && product.width ? (
                                      <>
                                        {product.length.includes(' ') ? product.length : `${product.length} ${product.length_unit || ''}`} × {product.width.includes(' ') ? product.width : `${product.width} ${product.width_unit || ''}`}
                                      </>
                                    ) : '—'}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-1 text-gray-900">
                                    {product.weight ? (
                                      product.weight.includes(' ') ? product.weight : `${product.weight} ${product.weight_unit || ''}`
                                    ) : '—'}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-1 text-gray-900">{product.color || '—'}</td>
                                  <td className="border border-gray-200 px-2 py-1 text-gray-900">{product.pattern || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-purple-300 bg-white rounded p-2">
                  <p className="text-sm font-semibold text-purple-900">
                    Total Product Wastage: {totalProductWaste.toFixed(2)} units
                  </p>
                </div>
              </div>
            </div>
          )}
            </div>

            {/* Overall Wastage Alert */}
            {wasteItems.length > 0 && (
              <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-900">Wastage Information</p>
                  <p className="text-xs text-orange-800 mt-1">
                    Total wastage recorded: {wasteItems.length} item(s). This data was captured in the wastage stage and is shown here for reference when creating individual products.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
