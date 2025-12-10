import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Edit, Trash2, Save } from 'lucide-react';
import { RecipeService } from '@/services/recipeService';
import type { Product } from '@/types/product';
import type { RawMaterial } from '@/types/material';
import type { Recipe } from '@/types/recipe';

interface RecipeManagementCardProps {
  recipes: Recipe[];
  products: Product[];
  rawMaterials: RawMaterial[];
  onRefresh: () => void;
}

export default function RecipeManagementCard({
  recipes,
  products,
  rawMaterials,
  onRefresh,
}: RecipeManagementCardProps) {
  const { toast } = useToast();
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);

  const handleAddMaterial = (recipe: Recipe) => {
    setEditingMaterial({
      recipe_id: recipe.id,
      material_id: '',
      material_name: '',
      material_type: 'raw_material',
      quantity_per_sqm: 1,
      unit: 'kg',
    });
    setIsMaterialDialogOpen(true);
  };

  const handleEditMaterial = (material: any, recipe: Recipe) => {
    setEditingMaterial({
      ...material,
      recipe_id: recipe.id,
    });
    setIsMaterialDialogOpen(true);
  };

  const handleRemoveMaterial = async (recipeId: string, materialId: string) => {
    try {
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe || recipe.materials.length <= 1) {
        toast({
          title: 'Cannot Remove',
          description: 'Recipe must have at least one material',
          variant: 'destructive',
        });
        return;
      }

      // Update recipe by removing the material
      const updatedMaterials = recipe.materials.filter((m: any) => m.id !== materialId);
      await RecipeService.updateRecipe(recipeId, {
        materials: updatedMaterials.map((m: any) => ({
          material_id: m.material_id,
          material_name: m.material_name,
          material_type: m.material_type,
          quantity_per_sqm: m.quantity_per_sqm,
          unit: m.unit,
        })),
      });

      toast({
        title: 'Success',
        description: 'Material removed from recipe',
      });
      onRefresh();
    } catch (error) {
      console.error('Error removing material:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove material from recipe',
        variant: 'destructive',
      });
    }
  };

  const handleSaveMaterial = async () => {
    try {
      if (!editingMaterial) return;

      const recipe = recipes.find((r) => r.id === editingMaterial.recipe_id);
      if (!recipe) return;

      let updatedMaterials = [...recipe.materials];

      if (editingMaterial.id) {
        // Update existing material
        const index = updatedMaterials.findIndex((m: any) => m.id === editingMaterial.id);
        if (index !== -1) {
          updatedMaterials[index] = { ...updatedMaterials[index], ...editingMaterial };
        }
      } else {
        // Add new material
        updatedMaterials.push({
          id: `temp_${Date.now()}`,
          ...editingMaterial,
          quantity_per_sqm: editingMaterial.quantity || editingMaterial.quantity_per_sqm || 1,
        });
      }

      await RecipeService.updateRecipe(editingMaterial.recipe_id, {
        materials: updatedMaterials.map((m: any) => ({
          material_id: m.material_id,
          material_name: m.material_name,
          material_type: m.material_type,
          quantity_per_sqm: m.quantity_per_sqm,
          unit: m.unit,
        })),
      });

      toast({
        title: 'Success',
        description: editingMaterial.id ? 'Material updated' : 'Material added',
      });

      setIsMaterialDialogOpen(false);
      setEditingMaterial(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving material:', error);
      toast({
        title: 'Error',
        description: 'Failed to save material',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Package className="w-5 h-5" />
            Product Recipes
          </CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            View and edit product recipes. All recipes are based on 1 square meter (sqm) and automatically calculate
            materials based on product dimensions.
          </p>
        </CardHeader>
        <CardContent>
          {recipes.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recipes found</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-2">
                Recipes are created when you add products. All recipes use 1 sqm as base unit and work for all
                products.
              </p>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {recipes.map((recipe) => (
                <Card key={recipe.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <CardTitle className="text-base md:text-lg">{recipe.product_name}</CardTitle>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Recipe ID: {recipe.id} | Base: 1 sqm (1 square meter)
                        </p>
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">
                          💡 This recipe works for all products - system calculates total materials based on product
                          dimensions
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleAddMaterial(recipe)} className="w-full md:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Material
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recipe.materials && recipe.materials.length > 0 ? (
                      <div className="space-y-2 md:space-y-3">
                        {recipe.materials.map((material: any) => (
                          <div
                            key={material.id}
                            className="border rounded-lg p-3 md:p-4 hover:bg-muted/50 flex flex-col md:flex-row md:items-center gap-3 md:gap-4"
                          >
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 text-sm">
                              <div>
                                <Badge
                                  variant={material.material_type === 'product' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {material.material_type === 'product' ? 'Product' : 'Raw Material'}
                                </Badge>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Material Name</div>
                                <div className="font-medium">{material.material_name}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Quantity (for 1 sqm)</div>
                                <div className="font-medium">{material.quantity_per_sqm}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Unit</div>
                                <div className="font-medium">{material.unit}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditMaterial(material, recipe)}
                                className="flex-1 md:flex-none"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveMaterial(recipe.id, material.id)}
                                disabled={recipe.materials.length <= 1}
                                className="flex-1 md:flex-none text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-8 h-8 mx-auto mb-2" />
                        <p>No materials in this recipe</p>
                        <Button variant="outline" size="sm" onClick={() => handleAddMaterial(recipe)} className="mt-2">
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Material
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Material Dialog */}
      <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMaterial?.id ? 'Edit Material (for 1 sqm)' : 'Add Material (for 1 sqm)'}</DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="material-type">Material Type</Label>
                <Select
                  value={editingMaterial.material_type}
                  onValueChange={(value) => setEditingMaterial({ ...editingMaterial, material_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw_material">Raw Material</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="material-select">Material</Label>
                <Select
                  value={editingMaterial.material_id}
                  onValueChange={(value) => {
                    const selected =
                      editingMaterial.material_type === 'raw_material'
                        ? rawMaterials.find((m) => m.id === value)
                        : products.find((p) => p.id === value);
                    if (selected) {
                      setEditingMaterial({
                        ...editingMaterial,
                        material_id: value,
                        material_name: selected.name,
                        unit: selected.unit || 'kg',
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {editingMaterial.material_type === 'raw_material'
                      ? rawMaterials.map((material) => (
                          <SelectItem key={material.id} value={material.id}>
                            {material.name} ({material.unit})
                          </SelectItem>
                        ))
                      : products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.unit})
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity (for 1 sqm)</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={editingMaterial.quantity_per_sqm || editingMaterial.quantity || 0}
                  onChange={(e) =>
                    setEditingMaterial({
                      ...editingMaterial,
                      quantity_per_sqm: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="0.1"
                  placeholder="e.g., 2.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Amount needed for 1 square meter (sqm) - this recipe works for all products
                </p>
              </div>

              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={editingMaterial.unit}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, unit: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsMaterialDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMaterial}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

