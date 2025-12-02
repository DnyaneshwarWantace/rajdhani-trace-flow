import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, Factory, CheckCircle, RefreshCw, ArrowRight } from "lucide-react";
import type { Product as FrontendProduct } from "@/utils/typeMapping";

interface ProductAnalyticsProps {
  products: FrontendProduct[];
  getAvailablePieces: (productId: string) => number;
  calculateSQM: (length: string, width: string, lengthUnit: string, widthUnit: string) => number;
  hasIndividualStock: (productId: string) => boolean;
  handleAddToProduction: (product: FrontendProduct) => Promise<void>;
  isAddingToProduction: string | null;
  dynamicCategories: string[];
}

export function ProductAnalytics({
  products,
  getAvailablePieces,
  calculateSQM,
  hasIndividualStock,
  handleAddToProduction,
  isAddingToProduction,
  dynamicCategories
}: ProductAnalyticsProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Analytics Dashboard */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Stock Level Distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Distribution</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>In Stock</span>
                <span className="font-medium">{products.filter(p => getAvailablePieces(p?.id || '') > 5).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Low Stock</span>
                <span className="font-medium text-warning">{products.filter(p => {
                  const stock = getAvailablePieces(p?.id || '');
                  return stock > 0 && stock <= 5;
                }).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Out of Stock</span>
                <span className="font-medium text-destructive">{products.filter(p => getAvailablePieces(p?.id || '') === 0).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Category</CardTitle>
            <Package className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dynamicCategories.slice(0, 3).map(category => {
                const count = products.filter(p => p?.category === category).length;
                return (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="truncate">{category}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
              {dynamicCategories.length > 3 && (
                <div className="text-xs text-muted-foreground">+{dynamicCategories.length - 3} more</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Value Analytics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Value Metrics</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Avg. Price</span>
                <span className="font-medium">On Request</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Highest Value</span>
                <span className="font-medium">On Request</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Pieces</span>
                <span className="font-medium">{products.reduce((sum, p) => sum + getAvailablePieces(p?.id || ''), 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Need Reorder</span>
                <span className="font-medium text-warning">{products.filter(p => {
                  const stock = getAvailablePieces(p?.id || '');
                  return stock > 0 && stock <= 5;
                }).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Critical (≤2)</span>
                <span className="font-medium text-destructive">{products.filter(p => {
                  const stock = getAvailablePieces(p?.id || '');
                  return stock > 0 && stock <= 2;
                }).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Good Stock</span>
                <span className="font-medium text-success">{products.filter(p => getAvailablePieces(p?.id || '') > 5).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Products Requiring Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Available Stock</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Value at Risk</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(product => getAvailablePieces(product?.id || '') <= 5)
                  .sort((a, b) => getAvailablePieces(a?.id || '') - getAvailablePieces(b?.id || ''))
                  .map((product, index) => {
                    const availableStock = getAvailablePieces(product?.id || '');
                    const valueAtRisk = 0; // Pricing removed - will be calculated manually per order
                    return (
                      <tr key={product?.id || `low-stock-${index}`} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{product?.name}</div>
                              <div className="text-sm text-muted-foreground">{product?.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{availableStock} Products</div>
                          <div className="text-xs text-muted-foreground">
                            {(availableStock * calculateSQM(
                              product?.length || '0',
                              product?.width || '0',
                              product?.lengthUnit || 'feet',
                              product?.widthUnit || 'feet'
                            )).toFixed(4)} SQM
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={`${
                            availableStock === 0 ? 'bg-destructive text-destructive-foreground' :
                            availableStock <= 2 ? 'bg-destructive text-destructive-foreground' :
                            'bg-warning text-warning-foreground'
                          }`}>
                            {availableStock === 0 ? 'Out of Stock' :
                             availableStock <= 2 ? 'Critical' : 'Low Stock'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">₹{valueAtRisk.toLocaleString()}</div>
                        </td>
                        <td className="p-4">
                          {hasIndividualStock(product.id) ? (
                            <Button 
                              size="sm" 
                              onClick={async () => await handleAddToProduction(product)}
                              className="bg-orange-600 hover:bg-orange-700"
                              disabled={isAddingToProduction === product.id}
                            >
                              {isAddingToProduction === product.id ? (
                                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Factory className="w-4 h-4 mr-1" />
                              )}
                              {isAddingToProduction === product.id ? 'Adding...' : 'Produce'}
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">Bulk Product</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {products.filter(product => getAvailablePieces(product?.id || '') <= 5).length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                      All products have adequate stock levels
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

