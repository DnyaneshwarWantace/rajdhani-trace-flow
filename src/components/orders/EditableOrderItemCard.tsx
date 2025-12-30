import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Edit, Check, X, QrCode } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';
import { calculateSQM } from '@/utils/sqmCalculator';

interface ProductDetails {
  color?: string;
  pattern?: string;
  category?: string;
  subcategory?: string;
  weight?: string;
  width?: string;
  length?: string;
  sqm_per_piece?: string;
  width_unit?: string;
  length_unit?: string;
  weight_unit?: string;
  supplier?: string;
}

interface EditableOrderItemCardProps {
  item: {
    id: string;
    product_id?: string;
    product_name: string;
    product_type: 'product' | 'raw_material';
    quantity: number;
    unit: string;
    unit_price: string;
    gst_rate: string;
    gst_amount: string;
    gst_included: boolean;
    subtotal: string;
    total_price: string;
    quality_grade?: string;
    specifications?: string;
    product_details?: ProductDetails | null;
    selected_individual_products?: any[];
  };
  index: number;
  orderStatus: string;
  onUpdateQuantity?: (itemId: string, newQuantity: number) => Promise<void>;
  onSelectIndividualProducts?: (item: any) => void;
}

export function EditableOrderItemCard({
  item,
  orderStatus,
  onUpdateQuantity,
  onSelectIndividualProducts,
}: EditableOrderItemCardProps) {
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [editedQuantity, setEditedQuantity] = useState(item.quantity);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveQuantity = async () => {
    if (onUpdateQuantity) {
      setIsSaving(true);
      try {
        await onUpdateQuantity(item.id, editedQuantity);
        setIsEditingQty(false);
      } catch (error) {
        console.error('Error updating quantity:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditedQuantity(item.quantity);
    setIsEditingQty(false);
  };

  const productDetails = item.product_details;
  const needsIndividualProductSelection =
    item.product_type === 'product' &&
    orderStatus === 'accepted' &&
    (!item.selected_individual_products || item.selected_individual_products.length === 0);

  // Calculate SQM if dimensions available
  let sqm = 0;
  if (productDetails?.length && productDetails?.width && productDetails?.length_unit && productDetails?.width_unit) {
    const length = parseFloat(productDetails.length);
    const width = parseFloat(productDetails.width);
    if (length > 0 && width > 0) {
      sqm = calculateSQM(length, width, productDetails.length_unit, productDetails.width_unit);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-base">{item.product_name}</h3>
            <Badge variant="outline" className="text-xs">
              {item.product_type === 'raw_material' ? 'Raw Material' : 'Product'}
            </Badge>
          </div>

          {/* Product Details */}
          {productDetails && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
              {productDetails.length && productDetails.width && (
                <div>
                  <span className="font-medium">Size:</span> {productDetails.length}{productDetails.length_unit} × {productDetails.width}{productDetails.width_unit}
                  {sqm > 0 && <span className="text-blue-600 ml-1">({sqm.toFixed(2)} SQM)</span>}
                </div>
              )}
              {productDetails.weight && (
                <div>
                  <span className="font-medium">Weight:</span> {productDetails.weight}{productDetails.weight_unit || ''}
                </div>
              )}
              {productDetails.color && (
                <div>
                  <span className="font-medium">Color:</span> {productDetails.color}
                </div>
              )}
              {productDetails.pattern && (
                <div>
                  <span className="font-medium">Pattern:</span> {productDetails.pattern}
                </div>
              )}
              {productDetails.category && (
                <div>
                  <span className="font-medium">Category:</span> {productDetails.category}
                </div>
              )}
              {item.quality_grade && (
                <div>
                  <span className="font-medium">Grade:</span> {item.quality_grade}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-right ml-4">
          <p className="text-xl font-bold">{formatCurrency(parseFloat(item.total_price))}</p>
          <p className="text-xs text-gray-500">@ {formatCurrency(parseFloat(item.unit_price))} / {item.unit}</p>
        </div>
      </div>

      {/* Quantity Section */}
      <div className="flex items-center justify-between pt-3 border-t">
        {isEditingQty ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number"
              value={editedQuantity}
              onChange={(e) => setEditedQuantity(parseInt(e.target.value) || 1)}
              min="1"
              className="w-24"
              disabled={isSaving}
            />
            <span className="text-sm text-gray-600">{item.unit}</span>
            <Button
              size="sm"
              onClick={handleSaveQuantity}
              disabled={isSaving}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium">Quantity: {Number(item.quantity).toFixed(2)} {item.unit}</span>
            {orderStatus === 'accepted' && onUpdateQuantity && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingQty(true)}
              >
                <Edit className="w-3 h-3" />
              </Button>
            )}
            {/* Show reservation status for raw materials */}
            {item.product_type === 'raw_material' && (
              <Badge
                variant="outline"
                className={`text-xs ml-auto ${
                  orderStatus === 'dispatched' || orderStatus === 'delivered'
                    ? 'bg-orange-50 text-orange-700 border-orange-300'
                    : orderStatus === 'accepted'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-gray-50 text-gray-700 border-gray-300'
                }`}
              >
                {orderStatus === 'dispatched' || orderStatus === 'delivered'
                  ? 'Sold'
                  : orderStatus === 'accepted'
                  ? 'Reserved'
                  : 'Pending'}
              </Badge>
            )}
          </div>
        )}

        {/* Individual Product Selection */}
        {item.product_type === 'product' && orderStatus === 'accepted' && onSelectIndividualProducts && (
          <Button
            size="sm"
            variant={needsIndividualProductSelection ? 'default' : 'outline'}
            onClick={() => {
              console.log('🔵 Select Products clicked for item:', item);
              console.log('🔵 Item product_id:', item.product_id);
              console.log('🔵 Item product_name:', item.product_name);
              onSelectIndividualProducts(item);
            }}
            className={needsIndividualProductSelection ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            <QrCode className="w-4 h-4 mr-1" />
            {item.selected_individual_products && item.selected_individual_products.length > 0
              ? `Selected: ${item.selected_individual_products.length}/${item.quantity}`
              : 'Select Products'}
          </Button>
        )}
      </div>

      {/* Individual Products Selected - Table View */}
      {item.selected_individual_products && item.selected_individual_products.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-sm font-medium text-gray-900 mb-3">
            Individual Products Selected: {item.selected_individual_products.length}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-2 text-left text-xs font-medium">#</th>
                  <th className="border border-gray-200 p-2 text-left text-xs font-medium">Product ID</th>
                  <th className="border border-gray-200 p-2 text-left text-xs font-medium">QR Code</th>
                  <th className="border border-gray-200 p-2 text-left text-xs font-medium">Serial Number</th>
                  <th className="border border-gray-200 p-2 text-left text-xs font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {item.selected_individual_products.map((ip: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-2 text-xs text-gray-600">{idx + 1}</td>
                    <td className="border border-gray-200 p-2 font-mono text-xs text-gray-900">
                      {ip.individual_product_id || ip.id || '—'}
                    </td>
                    <td className="border border-gray-200 p-2 font-mono text-xs text-gray-900">
                      {ip.qr_code || ip.qrCode || '—'}
                    </td>
                    <td className="border border-gray-200 p-2 text-xs text-gray-900">
                      {ip.serial_number || ip.serialNumber || '—'}
                    </td>
                    <td className="border border-gray-200 p-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          orderStatus === 'dispatched' || orderStatus === 'delivered'
                            ? 'bg-orange-50 text-orange-700 border-orange-300'
                            : 'bg-green-50 text-green-700 border-green-300'
                        }`}
                      >
                        {orderStatus === 'dispatched' || orderStatus === 'delivered' ? 'Dispatched' : 'Reserved'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warning if individual products not selected */}
      {needsIndividualProductSelection && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          ⚠️ Please select individual products before dispatch
        </div>
      )}
    </div>
  );
}
