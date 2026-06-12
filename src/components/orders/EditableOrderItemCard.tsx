import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Edit, Check, X, QrCode, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';
import { calculateSQM } from '@/utils/sqmCalculator';
import { validateNumberInput, ValidationPresets, preventInvalidNumberKeys } from '@/utils/numberValidation';
import ProductAttributePreview from '@/components/ui/ProductAttributePreview';
import { IndividualProductService } from '@/services/individualProductService';
import { getApiUrl } from '@/utils/apiConfig';

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

// Display label for price-per-X (e.g. "sqm", "roll", "rolls")
function getPriceUnitLabel(pricingUnit?: string, unit?: string): string {
  if (!pricingUnit || pricingUnit === 'unit') return unit || 'roll';
  return pricingUnit; // sqm, sqft, gsm, kg
}

interface EditableOrderItemCardProps {
  item: {
    id: string;
    product_id?: string;
    product_name: string;
    product_type: 'product' | 'raw_material';
    quantity: number;
    unit: string;
    pricing_unit?: string;
    unit_price: string;
    gst_rate: string;
    gst_amount: string;
    gst_included: boolean;
    subtotal: string;
    total_price: string;
    specifications?: string;
    product_details?: ProductDetails | null;
    selected_individual_products?: any[];
  };
  index: number;
  orderStatus: string;
  onUpdateQuantity?: (itemId: string, newQuantity: number) => Promise<void>;
  onSelectIndividualProducts?: (item: any) => void;
  onDeleteItem?: (itemId: string, productName: string) => Promise<void>;
}

export function EditableOrderItemCard({
  item,
  orderStatus,
  onUpdateQuantity,
  onSelectIndividualProducts,
  onDeleteItem,
}: EditableOrderItemCardProps) {
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [editedQuantity, setEditedQuantity] = useState<number | string>(item.quantity);
  const [isSaving, setIsSaving] = useState(false);
  const [fullIndividualProducts, setFullIndividualProducts] = useState<any[]>([]);
  const [qrProduct, setQrProduct] = useState<any>(null);

  useEffect(() => {
    const selected = item.selected_individual_products;
    if (!selected || selected.length === 0) { setFullIndividualProducts([]); return; }

    // Always fetch fresh from backend by QR code to get accurate roll_number and dimensions
    const token = localStorage.getItem('auth_token');
    Promise.all(
      selected.map(async (ip: any) => {
        const qrCode = ip.qr_code || ip.qrCode;
        if (!qrCode) return ip;
        try {
          const res = await fetch(
            `${getApiUrl()}/individual-products/qr/${encodeURIComponent(qrCode)}`,
            { headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) } }
          );
          if (!res.ok) return ip;
          const data = await res.json();
          return data.data ? { ...ip, ...data.data } : ip;
        } catch {
          return ip;
        }
      })
    ).then(setFullIndividualProducts);
  }, [item.selected_individual_products]);

  const handleSaveQuantity = async () => {
    const qty = typeof editedQuantity === 'string' ? parseFloat(editedQuantity) : editedQuantity;

    if (onUpdateQuantity && qty > 0) {
      setIsSaving(true);
      try {
        await onUpdateQuantity(item.id, qty);
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

  const handleStartEdit = () => {
    setEditedQuantity(''); // Clear the field so user can type freely
    setIsEditingQty(true);
  };

  // Check if the entered quantity is valid
  const isValidQuantity = () => {
    const qty = typeof editedQuantity === 'string' ? parseFloat(editedQuantity) : editedQuantity;
    return !isNaN(qty) && qty > 0;
  };

  // Use direct item properties (same as order table) - backend spreads product details directly on item
  const productDetails = item.product_details || {};
  const needsIndividualProductSelection =
    item.product_type === 'product' &&
    orderStatus === 'accepted' &&
    (!item.selected_individual_products || item.selected_individual_products.length === 0);

  // Get product details from direct item properties (preferred) or product_details fallback
  const length = (item as any).length || productDetails.length;
  const width = (item as any).width || productDetails.width;
  const length_unit = (item as any).length_unit || productDetails.length_unit;
  const width_unit = (item as any).width_unit || productDetails.width_unit;
  const weight = (item as any).weight || productDetails.weight;
  const weight_unit = (item as any).weight_unit || productDetails.weight_unit;
  const color = (item as any).color || productDetails.color;
  const pattern = (item as any).pattern || productDetails.pattern;
  const category = (item as any).category || productDetails.category;

  // Calculate SQM if dimensions available
  let sqm = 0;
  if (length && width && length_unit && width_unit) {
    const lengthNum = parseFloat(String(length));
    const widthNum = parseFloat(String(width));
    if (lengthNum > 0 && widthNum > 0) {
      sqm = calculateSQM(lengthNum, widthNum, length_unit, width_unit);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-gray-400 shrink-0" />
            <h3 className="font-semibold text-base break-words min-w-0 flex-1">{item.product_name}</h3>
            <Badge variant="outline" className="text-xs shrink-0">
              {item.product_type === 'raw_material' ? 'Raw Material' : 'Product'}
            </Badge>
          </div>

          {/* Product Details */}
          {(length || width || weight || category) && (
            <div className="mt-2 flex flex-col xs:flex-row xs:flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
              {length && width && (
                <div className="min-w-0 break-words">
                  <span className="font-medium">Size:</span> {length}{length_unit} × {width}{width_unit}
                  {sqm > 0 && <span className="text-blue-600 ml-1 block xs:inline">({sqm.toFixed(2)} SQM)</span>}
                </div>
              )}
              {weight && (
                <div className="min-w-0">
                  <span className="font-medium">GSM:</span> {weight}{weight_unit || ''}
                </div>
              )}
              {category && (
                <div className="min-w-0">
                  <span className="font-medium">Category:</span> {category}
                </div>
              )}
            </div>
          )}
          {(color || (item.product_type === 'product' && pattern)) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Color & pattern</span>
              <ProductAttributePreview
                color={color}
                pattern={pattern}
                showPattern={item.product_type === 'product'}
                size="large"
              />
            </div>
          )}
        </div>
        <div className="text-left md:text-right md:ml-4 md:min-w-[190px] border-t pt-3 md:border-t-0 md:pt-0 border-gray-100 flex flex-col md:block gap-1 shrink-0">
          <div>
            <p className="text-xs text-gray-500">Unit Price</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(parseFloat(item.unit_price || '0'), { full: true })} / {getPriceUnitLabel(item.pricing_unit, item.unit)}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center md:justify-end gap-x-3 gap-y-1 text-xs">
            <span className="text-gray-600">
              GST: <span className="font-semibold text-gray-900">{formatCurrency(parseFloat(item.gst_amount || '0'), { full: true })}</span>
            </span>
            <span className="text-gray-600">
              Subtotal: <span className="font-semibold text-gray-900">{formatCurrency(parseFloat(item.subtotal || '0'), { full: true })}</span>
            </span>
          </div>
          <p className="mt-1 text-lg font-bold text-blue-600 md:text-primary-700">{formatCurrency(parseFloat(item.total_price || '0'), { full: true })}</p>
        </div>
      </div>

      {/* Quantity Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t">
        {isEditingQty ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number"
              value={editedQuantity}
              onChange={(e) => {
                const validation = validateNumberInput(e.target.value, ValidationPresets.PRODUCT_QUANTITY);
                setEditedQuantity(validation.value);
              }}
              onKeyDown={(e) => preventInvalidNumberKeys(e)}
              min="1"
              max="99999"
              step="1"
              className="w-24 h-8"
              disabled={isSaving}
              autoFocus
            />
            <span className="text-sm text-gray-600">{item.unit}</span>
            <Button
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleSaveQuantity}
              disabled={isSaving || !isValidQuantity()}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-sm font-medium">Quantity: {Number(item.quantity).toFixed(2)} {item.unit}</span>
            {orderStatus !== 'dispatched' && orderStatus !== 'delivered' && orderStatus?.toLowerCase() !== 'cancelled' && onUpdateQuantity && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                onClick={handleStartEdit}
                title="Edit quantity"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
            )}
            {orderStatus !== 'dispatched' && orderStatus !== 'delivered' && orderStatus?.toLowerCase() !== 'cancelled' && onDeleteItem && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDeleteItem(item.id, item.product_name)}
                title="Remove item from order"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {/* Show reservation status for raw materials */}
            {item.product_type === 'raw_material' && (
              <Badge
                variant="outline"
                className={`text-xs sm:ml-auto ${
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

        {/* Individual Product Selection - only when order is accepted */}
        {item.product_type === 'product' && orderStatus === 'accepted' && onSelectIndividualProducts && (
          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
            <Button
              size="sm"
              variant={needsIndividualProductSelection ? 'default' : 'outline'}
              onClick={() => {
                console.log('🔵 Select Products clicked for item:', item);
                onSelectIndividualProducts(item);
              }}
              className={`h-8 text-xs px-2.5 ${needsIndividualProductSelection ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            >
              <QrCode className="w-3.5 h-3.5 mr-1.5" />
              <span>
                {item.selected_individual_products && item.selected_individual_products.length > 0
                  ? `Selected: ${item.selected_individual_products.length}/${item.quantity}`
                  : 'Select Rolls/Pcs'}
              </span>
            </Button>
            {item.selected_individual_products && item.selected_individual_products.length > 0 && item.selected_individual_products.length < item.quantity && (
              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300 px-2 py-0.5">
                {item.quantity - item.selected_individual_products.length} more needed
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Individual Products Selected */}
      {item.selected_individual_products && item.selected_individual_products.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reserved Rolls</span>
            <span className="text-xs font-bold text-gray-900 bg-gray-100 rounded-full px-2 py-0.5">{item.selected_individual_products.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {fullIndividualProducts.map((ip: any, idx: number) => {
              const rawRoll = ip.roll_number || ip.rollNumber || '';
              // Old format: "PRO-040626-001-ROLL-TIMESTAMP-SEQ" → extract last segment
              // New format: "06-26-132" → show as-is
              const rollNo = rawRoll
                ? (rawRoll.includes('ROLL-') ? rawRoll.split('-').pop() : rawRoll)
                : null;
              const qrCode = ip.qr_code || ip.qrCode;
              const isDispatched = orderStatus === 'dispatched';
              const isSold = orderStatus === 'delivered';
              const sizeStr = ip.length && ip.width
                ? `${ip.length}${ip.length_unit || 'm'} × ${ip.width}${ip.width_unit || 'm'}`
                : null;
              const gsmStr = ip.weight ? `${ip.weight} GSM` : null;
              return (
                <div
                  key={idx}
                  className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-bold text-gray-900 leading-tight">
                      {rollNo ? `#${rollNo}` : `#${idx + 1}`}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${isSold ? 'bg-red-100 text-red-700' : isDispatched ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {isSold ? 'Sold' : isDispatched ? 'Shipped' : 'Reserved'}
                    </span>
                  </div>
                  {sizeStr && <p className="text-[11px] text-gray-500 leading-tight">{sizeStr}</p>}
                  {gsmStr && <p className="text-[11px] text-gray-400">{gsmStr}</p>}
                  {qrCode && (
                    <button
                      onClick={() => setQrProduct(ip)}
                      className="mt-0.5 flex items-center gap-1 text-[11px] text-blue-600 font-medium"
                    >
                      <QrCode className="w-3 h-3" />
                      View QR
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QR bottom sheet */}
      {qrProduct && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/40" onClick={() => setQrProduct(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-3xl shadow-2xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="px-5 pt-2 pb-2 flex items-center justify-between">
              <p className="text-lg font-bold text-gray-900">Roll Info</p>
              <button onClick={() => setQrProduct(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="px-5 pb-10 space-y-4">
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrProduct.qr_code || qrProduct.qrCode)}`}
                  alt="QR Code"
                  className="w-44 h-44 rounded-2xl border border-gray-200"
                />
              </div>
              <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-2">
                {(qrProduct.roll_number || qrProduct.rollNumber) && (() => {
                  const raw = qrProduct.roll_number || qrProduct.rollNumber || '';
                  const display = raw.includes('ROLL-') ? raw.split('-').pop() : raw;
                  return (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Roll No</span>
                      <span className="font-bold text-gray-900">#{display}</span>
                    </div>
                  );
                })()}
                {(qrProduct.length && qrProduct.width) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Size</span>
                    <span className="font-semibold text-gray-900">{qrProduct.length}{qrProduct.length_unit || 'm'} × {qrProduct.width}{qrProduct.width_unit || 'm'}</span>
                  </div>
                )}
                {qrProduct.weight && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">GSM</span>
                    <span className="font-semibold text-gray-900">{qrProduct.weight}</span>
                  </div>
                )}
                {(qrProduct.added_date || qrProduct.production_date || qrProduct.created_at) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date</span>
                    <span className="font-semibold text-gray-900">{new Date(qrProduct.added_date || qrProduct.production_date || qrProduct.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className="font-semibold text-green-600">Reserved</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Warning if individual products not selected or partially selected */}
      {item.product_type === 'product' && orderStatus === 'accepted' && (
        <>
          {needsIndividualProductSelection && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ Please select individual products before shipping
            </div>
          )}
          {item.selected_individual_products && item.selected_individual_products.length > 0 && item.selected_individual_products.length < item.quantity && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              ℹ️ Partial selection: {item.selected_individual_products.length} of {item.quantity} products reserved. Select {item.quantity - item.selected_individual_products.length} more to ship.
            </div>
          )}
        </>
      )}
    </div>
  );
}
