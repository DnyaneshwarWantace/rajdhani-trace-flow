import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Edit, Trash2, Save } from 'lucide-react';
import { RecipeService } from '@/services/recipeService';
import RecipeMaterialSelectionDialog from './RecipeMaterialSelectionDialog';
import type { Recipe } from '@/types/recipe';

interface RecipeManagementCardProps {
  recipes: Recipe[];
  onRefresh: () => void;
}

export default function RecipeManagementCard({
  recipes,
  onRefresh,
}: RecipeManagementCardProps) {
  const { toast } = useToast();
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [isMaterialSelectorOpen, setIsMaterialSelectorOpen] = useState(false);
  const [selectedMaterialType, setSelectedMaterialType] = useState<'raw_material' | 'product'>('raw_material');
  const [currentRecipeId, setCurrentRecipeId] = useState<string>('');
  const [editingMaterial, setEditingMaterial] = useState<any>(null);

  const handleAddMaterial = (recipe: Recipe) => {
    setCurrentRecipeId(recipe.id);
    setSelectedMaterialType('raw_material');
    setIsMaterialDialogOpen(true);
  };

  const handleMaterialTypeSelect = () => {
    setIsMaterialDialogOpen(false);
    setIsMaterialSelectorOpen(true);
  };

  const handleMaterialSelect = (materials: any[]) => {
    // Set the first material or multiple materials for quantity entry
    if (materials.length > 0) {
      setEditingMaterial({
        recipe_id: currentRecipeId,
        materials: materials.map(m => {
          // For products, auto-calculate quantity based on SQM
          let quantityPerSqm = 1;
          let unit = m.unit || 'kg';

          if (selectedMaterialType === 'product') {
            // For products, use count_unit (rolls, count, etc)
            unit = m.count_unit || 'count';
            // Auto-calculate: if product is X sqm, then you need 1/X products per sqm
            if (m.sqm && m.sqm > 0) {
              quantityPerSqm = 1 / m.sqm;
            }
          }

          return {
            material_id: m.id,
            material_name: m.name,
            material_type: selectedMaterialType,
            quantity_per_sqm: quantityPerSqm,
            unit: unit,
          };
        }),
      });
    }
    setIsMaterialSelectorOpen(false);
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
      if (!recipe || !recipe.materials || recipe.materials.length <= 1) {
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

      // Validate quantity for multiple materials
      if (editingMaterial.materials) {
        const invalidMaterials = editingMaterial.materials.filter((m: any) =>
          !m.quantity_per_sqm || m.quantity_per_sqm <= 0
        );
        if (invalidMaterials.length > 0) {
          toast({
            title: 'Invalid Quantity',
            description: 'Please enter a valid quantity greater than 0 for all materials',
            variant: 'destructive',
          });
          return;
        }
      } else {
        // Validate quantity for single material
        const quantity = editingMaterial.quantity_per_sqm || editingMaterial.quantity || 0;
        if (!quantity || quantity <= 0) {
          toast({
            title: 'Invalid Quantity',
            description: 'Please enter a valid quantity greater than 0',
            variant: 'destructive',
          });
          return;
        }
      }

      const recipe = recipes.find((r) => r.id === editingMaterial.recipe_id);
      if (!recipe || !recipe.materials) return;

      let updatedMaterials = [...recipe.materials];

      if (editingMaterial.id) {
        // Update existing material
        const index = updatedMaterials.findIndex((m: any) => m.id === editingMaterial.id);
        if (index !== -1) {
          updatedMaterials[index] = { ...updatedMaterials[index], ...editingMaterial };
        }
      } else if (editingMaterial.materials) {
        // Add multiple new materials
        editingMaterial.materials.forEach((mat: any) => {
          updatedMaterials.push({
            id: `temp_${Date.now()}_${Math.random()}`,
            ...mat,
          });
        });
      } else {
        // Add single new material
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
        description: editingMaterial.id ? 'Material updated' : `${editingMaterial.materials?.length || 1} material(s) added`,
      });

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
                <Card key={recipe.id}>
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
                                  className={`text-xs ${material.material_type === 'product' ? 'text-white' : ''}`}
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
                                disabled={!recipe.materials || recipe.materials.length <= 1}
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

      {/* Material Type Selection Dialog */}
      <Dialog open={isMaterialDialogOpen && !editingMaterial} onOpenChange={setIsMaterialDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Material Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={`p-6 cursor-pointer transition-all hover:border-blue-500 hover:shadow-md ${
                  selectedMaterialType === 'raw_material' ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setSelectedMaterialType('raw_material')}
              >
                <div className="text-center space-y-2">
                  <Package className="w-8 h-8 mx-auto" />
                  <div className="font-semibold">Raw Material</div>
                  <div className="text-xs text-gray-600">Select from raw materials</div>
                </div>
              </Card>
              <Card
                className={`p-6 cursor-pointer transition-all hover:border-blue-500 hover:shadow-md ${
                  selectedMaterialType === 'product' ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setSelectedMaterialType('product')}
              >
                <div className="text-center space-y-2">
                  <Package className="w-8 h-8 mx-auto" />
                  <div className="font-semibold">Product</div>
                  <div className="text-xs text-gray-600">Select from products</div>
                </div>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMaterialDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMaterialTypeSelect} className="text-white">
              Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Selection Dialog */}
      <RecipeMaterialSelectionDialog
        isOpen={isMaterialSelectorOpen}
        onClose={() => setIsMaterialSelectorOpen(false)}
        materialType={selectedMaterialType}
        onSelect={handleMaterialSelect}
      />

      {/* Quantity Entry Dialog (after material selected) */}
      <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial?.id ? 'Edit' : 'Add'} Material{editingMaterial?.materials?.length > 1 ? 's' : ''} (for 1 sqm)
            </DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <div className="space-y-4 flex-1 overflow-auto">
              {editingMaterial.materials ? (
                // Multiple materials
                <div className="space-y-4">
                  {editingMaterial.materials.map((material: any, index: number) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold">{material.material_name}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {material.material_type === 'product' ? 'Product' : 'Raw Material'} • {material.unit}
                            </div>
                          </div>
                          <Badge variant="secondary">{index + 1}</Badge>
                        </div>
                        <div>
                          <Label htmlFor={`quantity-${index}`}>Quantity (for 1 sqm)</Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            value={material.quantity_per_sqm ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const updated = [...editingMaterial.materials];
                              updated[index] = {
                                ...updated[index],
                                quantity_per_sqm: value === '' ? '' : parseFloat(value),
                              };
                              setEditingMaterial({ ...editingMaterial, materials: updated });
                            }}
                            min="0"
                            step="0.1"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Amount needed for 1 square meter (sqm) - this recipe works for all products
                  </p>
                </div>
              ) : (
                // Single material (edit mode)
                <>
                  <div>
                    <Label>Material Type</Label>
                    <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm">
                      {editingMaterial.material_type === 'product' ? 'Product' : 'Raw Material'}
                    </div>
                  </div>

                  <div>
                    <Label>Material</Label>
                    <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm">
                      {editingMaterial.material_name}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity (for 1 sqm)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={editingMaterial.quantity_per_sqm ?? editingMaterial.quantity ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditingMaterial({
                          ...editingMaterial,
                          quantity_per_sqm: value === '' ? '' : parseFloat(value),
                        });
                      }}
                      min="0"
                      step="0.1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Amount needed for 1 square meter (sqm) - this recipe works for all products
                    </p>
                  </div>

                  <div>
                    <Label>Unit</Label>
                    <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm">
                      {editingMaterial.unit}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMaterial(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMaterial} className="text-white">
              <Save className="w-4 h-4 mr-2" />
              Save {editingMaterial?.materials?.length > 1 && `(${editingMaterial.materials.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

