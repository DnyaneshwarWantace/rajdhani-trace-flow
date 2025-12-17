import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Hash } from 'lucide-react';
import { IndividualProductService } from '@/services/individualProductService';
import type { IndividualProduct } from '@/types/product';

interface IndividualProductsSectionProps {
  batchId: string;
  materialConsumption: any[];
}

export default function IndividualProductsSection({
  materialConsumption,
}: IndividualProductsSectionProps) {
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIndividualProducts();
  }, [materialConsumption]);

  const loadIndividualProducts = async () => {
    try {
      setLoading(true);
      
      // Get all individual product IDs from material consumption
      const productIds = new Set<string>();
      materialConsumption.forEach((cons) => {
        if (cons.individual_product_ids && Array.isArray(cons.individual_product_ids)) {
          cons.individual_product_ids.forEach((id: string) => productIds.add(id));
        }
      });

      if (productIds.size === 0) {
        setIndividualProducts([]);
        return;
      }

      // Fetch individual products
      const productPromises = Array.from(productIds).map((id) =>
        IndividualProductService.getIndividualProductById(id).catch(() => null)
      );
      
      const results = await Promise.all(productPromises);
      const products = results.filter((p) => p !== null) as IndividualProduct[];
      
      setIndividualProducts(products);
    } catch (error) {
      console.error('Error loading individual products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-4">
            <Package className="w-5 h-5 animate-pulse text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Individual Products
          {individualProducts.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {individualProducts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {individualProducts.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">
            No individual products selected for this production
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {individualProducts.map((product) => (
              <div
                key={product.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-3 h-3 text-gray-400" />
                      <span className="font-mono text-xs text-gray-700">{product.id}</span>
                    </div>
                    {product.product_name && (
                      <p className="text-sm font-medium text-gray-900">{product.product_name}</p>
                    )}
                    {product.status && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {product.status}
                      </Badge>
                    )}
                  </div>
                </div>
                {product.created_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    Created: {new Date(product.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

