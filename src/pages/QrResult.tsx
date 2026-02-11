import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { ProductService } from '@/services/productService';
import { IndividualProductService } from '@/services/individualProductService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  QrCode,
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  Ruler,
  FileText,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ShoppingCart,
  Factory,
  Clock,
  IndianRupee,
} from 'lucide-react';
import { formatIndianDate } from '@/utils/formatHelpers';
import { OrderService } from '@/services/orderService';
import type { Product, IndividualProduct } from '@/types/product';
import type { Order } from '@/services/orderService';

type QrData = {
  type: string;
  individualProductId?: string;
  productId?: string;
};

export default function QrResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dataParam = searchParams.get('data');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [individualProduct, setIndividualProduct] = useState<IndividualProduct | null>(null);
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);

  // Stay on this page when scanning QR — do not redirect to product/individual product detail.
  // User can click "View full details" to go there.
  useEffect(() => {
    const loadData = async () => {
      if (!dataParam) {
        setError('No QR code data found.');
        setLoading(false);
        return;
      }

      let parsed: QrData;
      try {
        parsed = JSON.parse(decodeURIComponent(dataParam)) as QrData;
      } catch {
        setError('Invalid QR code data.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setProduct(null);
        setIndividualProduct(null);

        if (parsed.type === 'individual' && parsed.productId && parsed.individualProductId) {
          const [indProduct, prod] = await Promise.all([
            IndividualProductService.getIndividualProductById(parsed.individualProductId),
            ProductService.getProductById(parsed.productId),
          ]);
          setIndividualProduct(indProduct);
          setProduct(prod);
          setOrderDetails(null);
          if (indProduct.order_id) {
            const res = await OrderService.getOrderById(indProduct.order_id);
            if (res.data?.order) setOrderDetails(res.data.order);
          }
        } else if (parsed.type === 'main' && parsed.productId) {
          const prod = await ProductService.getProductById(parsed.productId);
          setProduct(prod);
        } else {
          setError('Unsupported QR code type.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product.');
        console.error('QR result load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataParam]);

  const handleBack = () => navigate(-1);

  const handleViewFullDetails = () => {
    if (individualProduct && product) {
      navigate(`/products/${product.id}/stock/${individualProduct.id}`);
    } else if (product) {
      navigate(`/products/${product.id}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading product details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid or expired QR code</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={handleBack} variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go back
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const isIndividual = !!individualProduct;
  const displayName = isIndividual
    ? (individualProduct?.product_name || product?.name)
    : product?.name;
  const displayProduct = product!;

  const formatDate = (d?: string) => {
    if (!d || d === 'null') return 'N/A';
    try {
      return formatIndianDate(d);
    } catch {
      return 'N/A';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'sold':
        return 'secondary';
      case 'reserved':
        return 'secondary';
      case 'in_production':
        return 'outline';
      case 'used':
        return 'outline';
      case 'damaged':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">QR Scan Result</h1>
                <p className="text-sm text-gray-600">{displayName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleViewFullDetails} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                View full details
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Product identity */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary-600" />
                  {isIndividual ? 'Individual product' : 'Product'}
                </CardTitle>
                {isIndividual && individualProduct && (
                  <Badge variant={getStatusVariant(individualProduct.status)}>
                    {individualProduct.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                <span className="text-gray-600">Name</span>
                <span className="font-medium text-gray-900 sm:block">{displayName}</span>
              </div>
              <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                <span className="text-gray-600">Category</span>
                <span className="font-medium text-gray-900 sm:block">{displayProduct.category}</span>
              </div>
              {isIndividual && individualProduct && (
                <>
                  <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                    <span className="text-gray-600">Individual ID</span>
                    <span className="font-mono text-xs text-gray-900 sm:block">{individualProduct.id}</span>
                  </div>
                  <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                    <span className="text-gray-600">QR Code</span>
                    <span className="font-mono text-xs text-gray-900 sm:block">{individualProduct.qr_code || '—'}</span>
                  </div>
                </>
              )}
              {displayProduct.color && (
                <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                  <span className="text-gray-600">Color</span>
                  <span className="font-medium text-gray-900 sm:block">{displayProduct.color}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status & context (when it became this status, sold to / reserved for / in production) */}
          {isIndividual && individualProduct && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-600" />
                  Status & context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-600">Current status</span>
                  <Badge variant={getStatusVariant(individualProduct.status)}>
                    {individualProduct.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100">
                  <span className="text-gray-600">Last updated</span>
                  <span className="font-medium text-gray-900 sm:block">{formatDate(individualProduct.updated_at)}</span>
                </div>

                {individualProduct.status === 'sold' && (
                  <>
                    {individualProduct.sold_date && (
                      <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100">
                        <span className="text-gray-600">Sold on</span>
                        <span className="font-medium text-gray-900 sm:block">{formatDate(individualProduct.sold_date)}</span>
                      </div>
                    )}
                    {orderDetails && (
                      <>
                        <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100">
                          <span className="text-gray-600">Sold to</span>
                          <span className="font-medium text-gray-900 sm:block">{orderDetails.customerName || individualProduct.sold_to || '—'}</span>
                        </div>
                        <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100">
                          <span className="text-gray-600">Order</span>
                          <span className="font-medium text-gray-900 sm:block">{orderDetails.orderNumber || orderDetails.id || individualProduct.order_id || '—'}</span>
                        </div>
                      </>
                    )}
                    {!orderDetails && individualProduct.sold_to && (
                      <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100">
                        <span className="text-gray-600">Sold to</span>
                        <span className="font-medium text-gray-900 sm:block">{individualProduct.sold_to}</span>
                      </div>
                    )}
                    {(individualProduct.sale_price != null && individualProduct.sale_price > 0) && (
                      <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100">
                        <span className="text-gray-600">Sale price</span>
                        <span className="font-medium text-gray-900 sm:block flex items-center gap-1">
                          <IndianRupee className="w-4 h-4" />
                          {Number(individualProduct.sale_price).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {individualProduct.status === 'reserved' && orderDetails && (
                  <>
                    <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100">
                      <span className="text-gray-600">Reserved for</span>
                      <span className="font-medium text-gray-900 sm:block">{orderDetails.customerName || '—'}</span>
                    </div>
                    <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100">
                      <span className="text-gray-600">Order</span>
                      <span className="font-medium text-gray-900 sm:block">{orderDetails.orderNumber || orderDetails.id || '—'}</span>
                    </div>
                  </>
                )}

                {individualProduct.status === 'reserved' && !orderDetails && individualProduct.order_id && (
                  <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100">
                    <span className="text-gray-600">Order ID</span>
                    <span className="font-mono text-xs text-gray-900 sm:block">{individualProduct.order_id}</span>
                  </div>
                )}

                {individualProduct.status === 'reserved' && !orderDetails && !individualProduct.order_id && (
                  <div className="flex items-start gap-3">
                    <ShoppingCart className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-600">Reserved</p>
                      <p className="font-medium text-gray-900">This unit is reserved for an order.</p>
                    </div>
                  </div>
                )}

                {individualProduct.status === 'in_production' && (
                  <>
                    <div className="flex items-start gap-3">
                      <Factory className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-gray-600">In production</p>
                        <p className="font-medium text-gray-900">{individualProduct.batch_number ? `Batch: ${individualProduct.batch_number}` : 'Currently in a production batch'}</p>
                      </div>
                    </div>
                  </>
                )}

                {individualProduct.status === 'used' && (
                  <div className="flex items-start gap-3">
                    <Package className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-600">Used</p>
                      <p className="font-medium text-gray-900">This unit has been used in production or consumption.</p>
                    </div>
                  </div>
                )}

                {individualProduct.status === 'damaged' && (
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-600">Damaged</p>
                      <p className="font-medium text-gray-900">This unit is marked as damaged.</p>
                    </div>
                  </div>
                )}

                {individualProduct.status === 'available' && (
                  <div className="flex items-start gap-3">
                    <ShoppingCart className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-600">Available</p>
                      <p className="font-medium text-gray-900">This unit is available for sale or reservation.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Basic info (individual: inspector, location, dates) */}
          {(isIndividual && individualProduct) && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-600" />
                  Basic information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-600">Inspector</p>
                    <p className="font-medium text-gray-900">{individualProduct.inspector || 'Not assigned'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-600">Location</p>
                    <p className="font-medium text-gray-900">{individualProduct.location || '—'}</p>
                  </div>
                </div>
                {individualProduct.production_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-600">Production date</p>
                      <p className="font-medium text-gray-900">{formatDate(individualProduct.production_date)}</p>
                    </div>
                  </div>
                )}
                {individualProduct.batch_number && (
                  <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                    <span className="text-gray-600">Batch</span>
                    <span className="font-medium text-gray-900 sm:block">{individualProduct.batch_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dimensions */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary-600" />
                Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {isIndividual && individualProduct ? (
                <>
                  {individualProduct.final_length && (
                    <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                      <span className="text-gray-600">Length</span>
                      <span className="font-medium text-gray-900 sm:block">{individualProduct.final_length} {displayProduct.length_unit}</span>
                    </div>
                  )}
                  {individualProduct.final_width && (
                    <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                      <span className="text-gray-600">Width</span>
                      <span className="font-medium text-gray-900 sm:block">{individualProduct.final_width} {displayProduct.width_unit}</span>
                    </div>
                  )}
                  {individualProduct.final_weight && (
                    <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                      <span className="text-gray-600">Weight</span>
                      <span className="font-medium text-gray-900 sm:block">{individualProduct.final_weight} {displayProduct.weight_unit || ''}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                    <span className="text-gray-600">Length</span>
                    <span className="font-medium text-gray-900 sm:block">{displayProduct.length} {displayProduct.length_unit}</span>
                  </div>
                  <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                    <span className="text-gray-600">Width</span>
                    <span className="font-medium text-gray-900 sm:block">{displayProduct.width} {displayProduct.width_unit}</span>
                  </div>
                  {displayProduct.weight && (
                    <div className="flex justify-between sm:block sm:space-y-1 py-2 border-b border-gray-100 sm:border-0">
                      <span className="text-gray-600">Weight</span>
                      <span className="font-medium text-gray-900 sm:block">{displayProduct.weight} {displayProduct.weight_unit || ''}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {individualProduct?.notes && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-gray-900">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{individualProduct.notes}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-3 pt-4">
            <Button onClick={handleViewFullDetails} className="gap-2">
              <ExternalLink className="w-4 h-4" />
              View full details
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
