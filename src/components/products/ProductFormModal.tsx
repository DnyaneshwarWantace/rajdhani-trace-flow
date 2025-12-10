import { useState, useEffect } from 'react';
import type { Product, ProductFormData } from '@/types/product';
import { ProductService } from '@/services/productService';
import { IndividualProductService } from '@/services/individualProductService';
import { MaterialService } from '@/services/materialService';
import { RecipeService } from '@/services/recipeService';
import { uploadImageToR2 } from '@/services/imageService';
import type { RecipeMaterial as BackendRecipeMaterial } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { X, Calculator } from 'lucide-react';
import { calculateSQM } from '@/utils/sqmCalculator';
import { useToast } from '@/hooks/use-toast';
import ProductBasicInfoSection from './form/ProductBasicInfoSection';
import ProductStockSection from './form/ProductStockSection';
import ProductDimensionsSection from './form/ProductDimensionsSection';
import ProductStockLevelsSection from './form/ProductStockLevelsSection';
import ProductNotesSection from './form/ProductNotesSection';
import ImageUploadSection from './ImageUploadSection';
import RecipeMaterialForm from './RecipeMaterialForm';
import RecipeMaterialsList from './RecipeMaterialsList';
import { useProductFormDropdowns } from '@/hooks/useProductFormDropdowns';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
  mode: 'create' | 'edit' | 'duplicate';
}

interface RecipeMaterial {
  materialId: string;
  materialName: string;
  quantity: string;
  unit: string;
  cost?: string;
  materialType?: 'product' | 'raw_material'; // Track the actual type selected
}

export default function ProductFormModal({ isOpen, onClose, onSuccess, product, mode }: ProductFormModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: '',
    subcategory: '',
    color: '',
    pattern: '',
    base_quantity: 0, // Will be converted to empty string for display
    unit: '',
    individual_stock_tracking: true, // DEFAULT: YES - track individual pieces with QR codes
    length: '',
    width: '',
    length_unit: 'feet',
    width_unit: 'feet',
    weight: '',
    weight_unit: '',
    min_stock_level: 10,
    max_stock_level: 100,
    reorder_point: 20,
    notes: '',
    image_url: '',
    status: 'active',
  });

  // Image state
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Recipe state
  const [recipeMaterials, setRecipeMaterials] = useState<RecipeMaterial[]>([]);
  const [newMaterial, setNewMaterial] = useState<RecipeMaterial>({
    materialId: '',
    materialName: '',
    quantity: '',
    unit: '',
    cost: '',
  });

  // Dropdowns hook
  const {
    categories,
    subcategories,
    colors,
    patterns,
    units,
    lengthUnits,
    widthUnits,
    weightUnits,
    lengths, // Combined values
    widths, // Combined values
    weights, // Combined values
    reloadDropdowns,
    deleteCategory,
    deleteSubcategory,
    deleteColor,
    deletePattern,
    deleteUnit,
  } = useProductFormDropdowns();

  useEffect(() => {
    if (isOpen) {
      reloadDropdowns();
      loadMaterials();
      loadProducts();

      if (product && (mode === 'edit' || mode === 'duplicate')) {
        setFormData({
          name: mode === 'duplicate' ? `${product.name} (Copy)` : product.name,
          category: product.category,
          subcategory: product.subcategory || '',
          color: product.color || '',
          pattern: product.pattern || '',
          base_quantity: mode === 'duplicate' ? 0 : (product.base_quantity || 0),
          unit: product.unit,
          individual_stock_tracking: product.individual_stock_tracking,
          length: product.length,
          width: product.width,
          length_unit: product.length_unit,
          width_unit: product.width_unit,
          weight: product.weight || '',
          weight_unit: product.weight_unit || '',
          min_stock_level: product.min_stock_level,
          max_stock_level: product.max_stock_level || 100,
          reorder_point: product.reorder_point || 20,
          notes: product.notes || '',
          image_url: product.image_url || '',
          status: product.status,
        });
        if (product.image_url) {
          setImagePreview(product.image_url);
        }
        // Load recipe for this product
        loadRecipe(product.id);
      } else {
        resetForm();
      }
    }
  }, [isOpen, product, mode]);

  const loadRecipe = async (productId: string) => {
    try {
      const recipe = await RecipeService.getRecipeByProductId(productId);
      if (recipe && recipe.materials) {
        // Convert recipe materials to form format
        const materials: RecipeMaterial[] = recipe.materials.map((mat: BackendRecipeMaterial) => ({
          materialId: mat.material_id,
          materialName: mat.material_name,
          quantity: mat.quantity_per_sqm.toString(),
          unit: mat.unit,
          cost: mat.cost_per_unit?.toString() || '',
        }));
        setRecipeMaterials(materials);
      } else {
        setRecipeMaterials([]);
      }
    } catch (err) {
      console.error('Failed to load recipe:', err);
      setRecipeMaterials([]);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      subcategory: '',
      color: '',
      pattern: '',
      base_quantity: 0,
      unit: '',
      individual_stock_tracking: true, // DEFAULT: YES
      length: '',
      width: '',
      length_unit: 'feet',
      width_unit: 'feet',
      weight: '',
      weight_unit: '',
      min_stock_level: 10,
      max_stock_level: 100,
      reorder_point: 20,
      notes: '',
      image_url: '',
      status: 'active',
    });
    setImagePreview('');
    setImageFile(null);
    setRecipeMaterials([]);
    setNewMaterial({
      materialId: '',
      materialName: '',
      quantity: '',
      unit: '',
      cost: '',
    });
  };

  const loadMaterials = async () => {
    try {
      await MaterialService.getMaterials({ limit: 1000 });
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  };

  const loadProducts = async () => {
    try {
      await ProductService.getProducts({ limit: 1000 });
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview('');
    setImageFile(null);
    setFormData({ ...formData, image_url: '' });
  };

  const addProductMaterial = () => {
    // Allow adding materials even if quantity is empty (for raw materials, user can fill later)
    // Only materialId and unit are required - validation happens on form submit
    if (!newMaterial.materialId || !newMaterial.unit) return;
    setRecipeMaterials([...recipeMaterials, newMaterial]);
    setNewMaterial({
      materialId: '',
      materialName: '',
      quantity: '',
      unit: '',
      cost: '',
    });
  };

  const addMaterialDirectly = (material: RecipeMaterial) => {
    // Direct add function that bypasses newMaterial state
    // This is used when materials are selected from the dialog
    if (!material.materialId || !material.unit) return;
    setRecipeMaterials([...recipeMaterials, material]);
  };

  const removeProductMaterial = (index: number) => {
    setRecipeMaterials(recipeMaterials.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      const missingFields: string[] = [];
      
      if (!formData.name || formData.name.trim() === '') {
        missingFields.push('Product Name');
      } else {
        const trimmedName = formData.name.trim();
        const words = trimmedName.split(/\s+/).filter(w => w.length > 0);
        
        // Allow ALL characters - only check word count and character limits
        // Check word count (max 50 words)
        if (words.length > 50) {
          missingFields.push('Product Name (max 50 words)');
          toast({
            title: 'Validation Error',
            description: 'Product name can have maximum 50 words',
            variant: 'destructive',
          });
        }
        // Check each word length (max 20 characters per word)
        else {
          const longWords = words.filter(word => word.length > 20);
          if (longWords.length > 0) {
            missingFields.push('Product Name (max 20 chars per word)');
            toast({
              title: 'Validation Error',
              description: `Each word can be maximum 20 characters. Words exceeding limit: ${longWords.join(', ')}`,
              variant: 'destructive',
            });
          }
        }
      }
      if (!formData.category || formData.category.trim() === '') {
        missingFields.push('Category');
      }
      if (!formData.subcategory || formData.subcategory.trim() === '') {
        missingFields.push('Subcategory');
      }
      if (!formData.unit || formData.unit.trim() === '') {
        missingFields.push('Unit');
      }
      
      // Check length - must have both value AND unit
      const lengthValue = formData.length ? String(formData.length).trim() : '';
      const lengthUnitValue = formData.length_unit ? String(formData.length_unit).trim() : '';
      console.log('VALIDATION - Length:', { lengthValue, lengthUnitValue, raw: { length: formData.length, length_unit: formData.length_unit } });
      if (!lengthValue || !lengthUnitValue) {
        missingFields.push('Length');
      }

      // Check width - must have both value AND unit
      const widthValue = formData.width ? String(formData.width).trim() : '';
      const widthUnitValue = formData.width_unit ? String(formData.width_unit).trim() : '';
      console.log('VALIDATION - Width:', { widthValue, widthUnitValue, raw: { width: formData.width, width_unit: formData.width_unit } });
      if (!widthValue || !widthUnitValue) {
        missingFields.push('Width');
      }

      // Check weight - must have both value AND unit
      // Weight is OPTIONAL - only validate if one is provided but not the other
      const weightValue = formData.weight ? String(formData.weight).trim() : '';
      const weightUnitValue = formData.weight_unit ? String(formData.weight_unit).trim() : '';
      console.log('VALIDATION - Weight:', { weightValue, weightUnitValue, raw: { weight: formData.weight, weight_unit: formData.weight_unit } });
      if ((weightValue && !weightUnitValue) || (!weightValue && weightUnitValue)) {
        missingFields.push('Weight (both value and unit required if provided)');
      }
      
      // base_quantity can be 0, so we only check if it's a valid number (not negative)
      if (formData.base_quantity < 0 || isNaN(formData.base_quantity)) {
        missingFields.push('Base Quantity (must be >= 0)');
      }

      if (missingFields.length > 0) {
        toast({
          title: 'Validation Error',
          description: `Please fill in: ${missingFields.join(', ')}`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Upload image to Cloudflare R2 if provided
      let imageUrl = formData.image_url || '';
      if (imageFile) {
        try {
          const uploadResult = await uploadImageToR2(imageFile, 'products');
          if (uploadResult.error) {
            toast({
              title: 'Image Upload Failed',
              description: uploadResult.error,
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
          imageUrl = uploadResult.url;
        } catch (error: any) {
          console.error('Error uploading image:', error);
          toast({
            title: 'Image Upload Failed',
            description: error.message || 'Failed to upload image',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      } else if (mode === 'edit' && product?.image_url) {
        // Keep existing image URL if no new image is uploaded
        imageUrl = product.image_url;
      }

      const finalFormData = { ...formData, image_url: imageUrl };

      let createdProduct;
      if (mode === 'edit' && product) {
        createdProduct = await ProductService.updateProduct(product.id, finalFormData);
      } else {
        createdProduct = await ProductService.createProduct(finalFormData);
      }

      // Save or update recipe if materials are provided
      if (createdProduct && recipeMaterials.length > 0) {
        try {
          const existingRecipe = await RecipeService.getRecipeByProductId(createdProduct.id);
          
          // Get user info for created_by
          const userInfo = localStorage.getItem('user');
          let createdBy = 'system';
          if (userInfo) {
            try {
              const user = JSON.parse(userInfo);
              createdBy = user.email || user.full_name || 'system';
            } catch (e) {
              // Ignore parse errors
            }
          }

          // Determine material type - use stored type if available, otherwise guess from unit
          const getMaterialType = (mat: RecipeMaterial): 'raw_material' | 'product' => {
            // If materialType was stored when selected, use it
            if (mat.materialType) {
              return mat.materialType;
            }
            // Fallback: Check if unit suggests it's a product
            if (mat.unit === 'roll' || mat.unit === 'rolls' || mat.unit === 'sqm' || mat.unit === 'SQM') {
              return 'product';
            }
            // Default to raw_material
            return 'raw_material';
          };

          const recipeData = {
            product_id: createdProduct.id,
            materials: recipeMaterials.map(mat => {
              const materialType = getMaterialType(mat);
              console.log('📦 Creating recipe material:', {
                materialId: mat.materialId,
                materialName: mat.materialName,
                materialType,
                quantity: mat.quantity,
                unit: mat.unit,
              });
              return {
                material_id: mat.materialId,
                material_name: mat.materialName,
                material_type: materialType,
                quantity_per_sqm: parseFloat(mat.quantity) || 0,
                unit: mat.unit,
                cost_per_unit: parseFloat(mat.cost || '0') || 0,
              };
            }),
            description: `Recipe for ${createdProduct.name}`,
            version: '1.0',
            created_by: createdBy,
          };

          console.log('📋 Recipe data to send:', recipeData);

          // Delete existing recipe if editing (not duplicating)
          if (existingRecipe && mode === 'edit') {
            await RecipeService.deleteRecipe(existingRecipe.id);
          }
          
          // Create new recipe via API (or recreate if editing)
          const { getApiUrl } = await import('@/utils/apiConfig');
          const response = await fetch(`${getApiUrl()}/recipes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            },
            body: JSON.stringify(recipeData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to save recipe:', errorData);
            // Show warning but don't fail the product save
            toast({
              title: 'Recipe Warning',
              description: errorData.error || 'Recipe could not be saved, but product was created successfully',
              variant: 'destructive',
            });
          }
        } catch (recipeError) {
          console.error('Error saving recipe:', recipeError);
          // Don't fail the entire operation if recipe save fails
        }
      } else if (createdProduct && mode === 'edit' && recipeMaterials.length === 0) {
        // If editing and recipe is removed, delete the recipe
        try {
          const existingRecipe = await RecipeService.getRecipeByProductId(createdProduct.id);
          if (existingRecipe) {
            await RecipeService.deleteRecipe(existingRecipe.id);
          }
        } catch (recipeError) {
          console.error('Error deleting recipe:', recipeError);
        }
      }

      // If this is a new product creation and has base_quantity > 0 with individual tracking enabled
      if (mode === 'create' && createdProduct && finalFormData.base_quantity > 0 && finalFormData.individual_stock_tracking) {
        try {
          // Get user info from localStorage if available
          const userInfo = localStorage.getItem('user');
          let inspectorName = '';
          if (userInfo) {
            try {
              const user = JSON.parse(userInfo);
              inspectorName = user.full_name || user.name || user.email || '';
            } catch (e) {
              // Ignore parse errors
            }
          }

          await IndividualProductService.createIndividualProducts(
            createdProduct.id,
            finalFormData.base_quantity,
            {
              batch_number: `BATCH-${Date.now()}`,
              quality_grade: 'A',
              inspector: inspectorName,
              notes: `Auto-created ${finalFormData.base_quantity} individual products for ${createdProduct.name}`,
            }
          );
        } catch (individualProductError) {
          // Log error but don't fail the entire product creation
          console.error('Failed to create individual products:', individualProductError);
          // You could show a warning toast here if needed
        }
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const title = mode === 'create' ? 'Add Product' : mode === 'edit' ? 'Edit Product' : 'Duplicate Product';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">Fill in the product details below</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Basic Info Section */}
              <ProductBasicInfoSection
                formData={formData}
                categories={categories}
                subcategories={subcategories}
                colors={colors}
                patterns={patterns}
                onFormDataChange={(data) => setFormData({ ...formData, ...data })}
                onDeleteCategory={deleteCategory}
                onDeleteSubcategory={deleteSubcategory}
                onDeleteColor={deleteColor}
                onDeletePattern={deletePattern}
                reloadDropdowns={reloadDropdowns}
              />

              {/* Stock Section */}
              <ProductStockSection
                formData={formData}
                units={units}
                onFormDataChange={(data) => setFormData({ ...formData, ...data })}
                onDeleteUnit={deleteUnit}
                reloadDropdowns={reloadDropdowns}
                mode={mode}
              />

              {/* Dimensions Section */}
              <ProductDimensionsSection
                formData={formData}
                lengthUnits={lengthUnits}
                widthUnits={widthUnits}
                weightUnits={weightUnits}
                lengths={lengths}
                widths={widths}
                weights={weights}
                onFormDataChange={(data) => setFormData({ ...formData, ...data })}
                onReload={reloadDropdowns}
              />

              {/* Stock Levels Section */}
              <ProductStockLevelsSection
                formData={formData}
                onFormDataChange={(data) => setFormData({ ...formData, ...data })}
              />

              {/* Notes Section */}
              <ProductNotesSection
                formData={formData}
                onFormDataChange={(data) => setFormData({ ...formData, ...data })}
              />

              {/* Image Upload */}
              <ImageUploadSection
                imagePreview={imagePreview}
                onImageUpload={handleImageUpload}
                onImageRemove={removeImage}
              />

              {/* Recipe Section */}
              <div className="border-t pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <h3 className="text-lg font-medium">Product Recipe (Materials Used)</h3>
                  <div className="text-xs sm:text-sm text-gray-600 bg-primary-50 px-3 py-1.5 rounded-lg">
                    Recipe is based on <strong>1 SQM</strong> (1 square meter) of this product
                  </div>
                </div>

                {/* SQM Calculation Display */}
                {formData.length && formData.width && formData.length_unit && formData.width_unit && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">Product Area Calculation</span>
                    </div>
                    <div className="text-xs sm:text-sm text-blue-800 space-y-1">
                      <p>
                        <span className="font-medium">Dimensions:</span> {formData.length} {formData.length_unit} × {formData.width} {formData.width_unit}
                      </p>
                      <p>
                        <span className="font-medium">Area:</span> {(() => {
                          const sqm = calculateSQM(formData.length, formData.width, formData.length_unit, formData.width_unit);
                          const sqft = sqm * 10.7639;
                          return `${sqm.toFixed(4)} sqm (${sqft.toFixed(4)} sqft)`;
                        })()}
                      </p>
                      <p className="text-xs text-blue-700 mt-2">
                        Recipe materials are calculated for <strong>1 SQM</strong> of this product. When producing, the system will automatically scale materials based on the production quantity and product dimensions.
                      </p>
                    </div>
                  </div>
                )}

                {mode === 'duplicate' && recipeMaterials.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium mb-1">
                      Recipe from original product loaded
                    </p>
                    <p className="text-xs text-blue-700">
                      You can modify the recipe materials below or keep them as is. The recipe will be created for the new product.
                    </p>
                  </div>
                )}

                {mode === 'edit' && recipeMaterials.length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium mb-1">
                      Existing recipe loaded
                    </p>
                    <p className="text-xs text-green-700">
                      Modify the recipe materials below. Changes will update the recipe for this product.
                    </p>
                  </div>
                )}

                {recipeMaterials.length === 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500">
                      You can add materials (raw materials or products) to create the recipe now, or add it later when editing the product
                    </p>
                  </div>
                )}

                <RecipeMaterialForm
                  newMaterial={newMaterial}
                  onMaterialChange={setNewMaterial}
                  onAdd={addProductMaterial}
                  onAddMaterial={addMaterialDirectly}
                  targetProduct={{
                    length: formData.length,
                    width: formData.width,
                    length_unit: formData.length_unit,
                    width_unit: formData.width_unit,
                  }}
                />

                <RecipeMaterialsList materials={recipeMaterials} onRemove={removeProductMaterial} />
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0 bg-white">
            <Button 
              type="button" 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-primary-600 hover:bg-primary-700"
              onClick={(e) => {
                // Ensure this is the only way to submit
                e.stopPropagation();
              }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {mode === 'create' ? 'Creating Product...' : 'Saving Changes...'}
                </>
              ) : (
                mode === 'create' ? 'Add Product' : 'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
