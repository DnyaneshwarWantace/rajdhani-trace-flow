import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Tag, Ruler, Weight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types/product';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface PlanningProductCardProps {
  product: Product;
  onClear?: () => void;
}

export default function PlanningProductCard({ product, onClear }: PlanningProductCardProps) {
  return (
    <Card className="border-primary-200 bg-primary-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Selected Product</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Product details for planning</p>
            </div>
          </div>
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              <TruncatedText text={product.name} maxLength={60} />
            </p>
          </div>
          
          {(product.category || product.subcategory) && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500">Category</span>
                <p className="text-sm font-medium text-gray-900">
                  <TruncatedText
                    text={`${product.category || ''}${product.subcategory ? ` / ${product.subcategory}` : ''}`}
                    maxLength={50}
                  />
                </p>
              </div>
            </div>
          )}

          {(product.length || product.width) && (
            <div className="flex items-start gap-2">
              <Ruler className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500">Dimensions</span>
                <p className="text-sm font-medium text-gray-900">
                  {product.length}{product.length_unit || ''}
                  {product.length && product.width && ' × '}
                  {product.width}{product.width_unit || ''}
                </p>
              </div>
            </div>
          )}

          {product.weight && product.weight !== 'N/A' && (
            <div className="flex items-start gap-2">
              <Weight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500">Weight</span>
                <p className="text-sm font-medium text-gray-900">
                  {product.weight} {product.weight_unit || ''}
                </p>
              </div>
            </div>
          )}

          {(product.color || product.pattern) && 
           product.color !== 'N/A' && product.color !== 'NA' &&
           product.pattern !== 'N/A' && product.pattern !== 'NA' && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500">Details</span>
                <p className="text-sm font-medium text-gray-900">
                  {product.color && product.color !== 'NA' && product.color !== 'N/A' ? product.color : ''}
                  {product.color && product.color !== 'NA' && product.color !== 'N/A' && product.pattern && product.pattern !== 'NA' && product.pattern !== 'N/A' ? ' • ' : ''}
                  {product.pattern && product.pattern !== 'NA' && product.pattern !== 'N/A' ? product.pattern : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

