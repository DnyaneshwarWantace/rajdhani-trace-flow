import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Package, Factory } from 'lucide-react';
import { formatCurrency, formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import { formatSQMWithSquareFeet } from '@/utils/sqmCalculator';
import type { Recipe } from '@/types/recipe';
import type { Product } from '@/types/product';

interface ProductDetailRecipeProps {
  recipe: Recipe | null;
  product?: Product | null;
  loading?: boolean;
}

export default function ProductDetailRecipe({ recipe, product, loading }: ProductDetailRecipeProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recipe) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">No recipe defined for this product</p>
            <p className="text-gray-500 text-xs mt-1">Add a recipe when editing the product</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const materials = recipe.materials || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Product Recipe</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500 text-white">
              {materials.length} Material{materials.length !== 1 ? 's' : ''}
            </Badge>
            {!recipe.is_active && (
              <Badge variant="outline" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
        </div>
        {recipe.description && (
          <p className="text-sm text-gray-600 mt-2">{recipe.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipe Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600 mb-1">Base Unit</p>
            <p className="text-sm font-semibold text-gray-900">{recipe.base_unit.toUpperCase()}</p>
            <p className="text-xs text-gray-500 mt-0.5">Recipe is for 1 SQM</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Version</p>
            <p className="text-sm font-semibold text-gray-900">v{recipe.version}</p>
          </div>
          {product && product.length && product.width && (
            <div className="col-span-1 sm:col-span-2">
              <p className="text-xs text-gray-600 mb-1">Product Area</p>
              <p className="text-sm font-semibold text-gray-900">
                {(() => {
                  const sqm = product.sqm || 0;
                  return formatSQMWithSquareFeet(sqm);
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {product.length} {product.length_unit} × {product.width} {product.width_unit}
              </p>
            </div>
          )}
          <div className="col-span-1 sm:col-span-2">
            <p className="text-xs text-gray-600 mb-1">Total Cost per {recipe.base_unit}</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(recipe.total_cost_per_sqm)}
            </p>
          </div>
        </div>

        {/* Materials List */}
        {materials.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Materials Required</h4>
            {materials.map((material, index) => (
              <div
                key={material.id || index}
                className="p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-1">
                      {material.material_type === 'product' ? (
                        <Package className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Factory className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 truncate">
                          {material.material_name}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {material.material_type === 'product' ? 'Product' : 'Raw Material'}
                        </Badge>
                        {material.is_optional && (
                          <Badge variant="outline" className="text-xs bg-yellow-50">
                            Optional
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>
                          {formatIndianNumberWithDecimals(material.quantity_per_sqm, 2)} {material.unit}
                        </span>
                        {material.waste_factor > 0 && (
                          <span className="text-orange-600">
                            +{material.waste_factor}% waste
                          </span>
                        )}
                        {material.cost_per_unit > 0 && (
                          <span className="text-green-600">
                            {formatCurrency(material.cost_per_unit)}/{material.unit}
                          </span>
                        )}
                      </div>
                      {material.specifications && (
                        <p className="text-xs text-gray-500 mt-1">{material.specifications}</p>
                      )}
                      {material.quality_requirements && (
                        <p className="text-xs text-orange-600 mt-1">
                          Quality: {material.quality_requirements}
                        </p>
                      )}
                    </div>
                  </div>
                  {material.total_cost_per_sqm > 0 && (
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-gray-600">Cost</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(material.total_cost_per_sqm)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500">
            No materials in recipe
          </div>
        )}
      </CardContent>
    </Card>
  );
}

