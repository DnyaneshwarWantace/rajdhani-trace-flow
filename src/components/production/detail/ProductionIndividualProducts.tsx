import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Loader2 } from 'lucide-react';
import { IndividualProductService } from '@/services/individualProductService';
import type { IndividualProduct } from '@/types/product';
import type { ProductionBatch } from '@/services/productionService';

interface ProductionIndividualProductsProps {
  batch: ProductionBatch;
}

export default function ProductionIndividualProducts({ batch }: ProductionIndividualProductsProps) {
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (batch?.product_id && batch?.batch_number) {
      loadIndividualProducts();
    }
  }, [batch?.product_id, batch?.batch_number]);

  const loadIndividualProducts = async () => {
    try {
      setLoading(true);
      const { products } = await IndividualProductService.getIndividualProducts({
        product_id: batch.product_id,
      });

      // Filter by batch_number to show only products created in this batch
      const batchProducts = products.filter((p: IndividualProduct) => 
        p.batch_number === batch.id || p.batch_number === batch.batch_number
      );

      setIndividualProducts(batchProducts);
    } catch (error) {
      console.error('Error loading individual products:', error);
      setIndividualProducts([]);
    } finally {
      setLoading(false);
    }
  };

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

  if (individualProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            Individual Products Created
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-8">
            No individual products have been created for this production batch yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-600" />
          Individual Products Created ({individualProducts.length})
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          These are the individual products created in this production batch
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">#</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Product ID</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">QR Code</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Serial Number</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Dimensions</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Weight</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Quality Grade</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Status</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Location</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Inspector</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Created Date</th>
              </tr>
            </thead>
            <tbody>
              {individualProducts.map((product, index) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-2 text-gray-600">{index + 1}</td>
                  <td className="border border-gray-200 p-2 font-mono text-sm text-gray-900">{product.id}</td>
                  <td className="border border-gray-200 p-2 font-mono text-sm text-gray-900">{product.qr_code || '—'}</td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900">{product.serial_number || '—'}</td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900">
                    {product.final_length && product.final_width 
                      ? `${product.final_length} × ${product.final_width}`
                      : '—'}
                  </td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900">{product.final_weight || '—'}</td>
                  <td className="border border-gray-200 p-2">
                    <Badge variant="outline" className="text-xs">
                      {product.quality_grade || 'N/A'}
                    </Badge>
                  </td>
                  <td className="border border-gray-200 p-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        product.status === 'available' ? 'bg-green-50 text-green-700 border-green-300' :
                        product.status === 'sold' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                        product.status === 'damaged' ? 'bg-red-50 text-red-700 border-red-300' :
                        'bg-gray-50 text-gray-700 border-gray-300'
                      }`}
                    >
                      {product.status || 'N/A'}
                    </Badge>
                  </td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900 truncate max-w-[150px]" title={product.location || ''}>
                    {product.location || '—'}
                  </td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900">{product.inspector || '—'}</td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900">
                    {product.created_at ? new Date(product.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

