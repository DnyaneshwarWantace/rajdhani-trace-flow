import { useState, useEffect } from 'react';
import type { Product, ProductFormData } from '@/types/product';
import { ProductService } from '@/services/productService';
import { IndividualProductService } from '@/services/individualProductService';
import { MaterialService } from '@/services/materialService';
import { RecipeService } from '@/services/recipeService';
import { uploadImageToR2 } from '@/services/imageService';
import type { RecipeMaterial as BackendRecipeMaterial } from '@/types/recipe';
import { X, Calculator, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { calculateSQM } from '@/utils/sqmCalculator';
import { useToast } from '@/hooks/use-toast';
import ProductBasicInfoSection from './form/ProductBasicInfoSection';
import ProductStockSection from './form/ProductStockSection';
import ProductDimensionsSection from './form/ProductDimensionsSection';
import ProductNotesSection from './form/ProductNotesSection';
import ImageUploadSection from './ImageUploadSection';
import RecipeMaterialForm from './RecipeMaterialForm';
import RecipeMaterialsList from './RecipeMaterialsList';
import { useProductFormDropdowns } from '@/hooks/useProductFormDropdowns';

const WIZARD_STEPS = [
  { label: 'Basic Info' },
  { label: 'Dimensions' },
  { label: 'Recipe' },
];

function WizardStepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {WIZARD_STEPS.map((s, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={idx} className="flex items-center gap-1">
            <div
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg whitespace-nowrap text-[12px] font-semibold transition-all"
              style={{
                background: done ? '#16a34a' : active ? '#2563eb' : 'transparent',
                color: done || active ? '#fff' : '#94a3b8',
                border: !done && !active ? '1px solid #e2e8f0' : 'none',
              }}
            >
              {done
                ? <Check size={12} strokeWidth={3} />
                : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
              }
              {s.label}
            </div>
            {idx < WIZARD_STEPS.length - 1 && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  // Track which fields have been touched for validation messages
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const markFieldTouched = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  };

  const validateStep0 = () => {
    const errs: string[] = [];
    if (!formData.name?.trim()) errs.push('Product Name');
    if (!formData.category?.trim()) errs.push('Category');
    if (!formData.subcategory?.trim()) errs.push('Subcategory');
    if (!formData.unit?.trim()) errs.push('Unit');
    return errs;
  };

  const validateStep1 = () => {
    const errs: string[] = [];
    if (!formData.length || !formData.length_unit) errs.push('Length');
    if (!formData.width || !formData.width_unit) errs.push('Width');
    if (!formData.weight || !formData.weight_unit) errs.push('GSM');
    return errs;
  };

  const handleWizardNext = () => {
    if (wizardStep === 0) {
      const errs = validateStep0();
      if (errs.length) { toast({ title: 'Fill required fields', description: errs.join(', '), variant: 'destructive' }); return; }
    }
    if (wizardStep === 1) {
      const errs = validateStep1();
      if (errs.length) { toast({ title: 'Fill required fields', description: errs.join(', '), variant: 'destructive' }); return; }
    }
    setWizardStep(s => s + 1);
  };

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: '',
    subcategory: '',
    color: '',
    pattern: '',
    base_quantity: '' as any, // Start empty, will be converted to 0 on submit
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
    colorCodeMap,
    patterns,
    patternImageMap,
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

  // Load dropdowns when dialog opens
  useEffect(() => {
    if (isOpen) {
      reloadDropdowns();
      loadMaterials();
      loadProducts();
    }
  }, [isOpen]);

  // Populate form when product data changes - ensure dropdowns are loaded first
  useEffect(() => {
    if (isOpen && product && (mode === 'edit' || mode === 'duplicate')) {
      // Ensure values match dropdown options (trim and handle empty strings)
      // Find matching values in dropdowns to ensure exact match
      const findMatchingValue = (value: string | null | undefined, options: string[]): string => {
        if (!value) return '';
        const trimmed = String(value).trim();
        // Try exact match first
        if (options.includes(trimmed)) return trimmed;
        // Try case-insensitive match
        const found = options.find(opt => opt.toLowerCase() === trimmed.toLowerCase());
        return found || trimmed; // Return original if not found (will be added to dropdown)
      };
      
      const unitValue = findMatchingValue(product.unit, units);
      const patternValue = findMatchingValue(product.pattern, patterns);
      const colorValue = findMatchingValue(product.color, colors);
      const categoryValue = findMatchingValue(product.category, categories);
      const subcategoryValue = findMatchingValue(product.subcategory, subcategories);
      
      setFormData({
        name: product.name || '',
        category: categoryValue,
        subcategory: subcategoryValue,
        color: colorValue,
        pattern: patternValue,
        base_quantity: mode === 'duplicate' ? '' as any : (product.base_quantity || 0),
        unit: unitValue,
        individual_stock_tracking: product.individual_stock_tracking !== undefined ? product.individual_stock_tracking : true,
        length: product.length !== null && product.length !== undefined && product.length !== '' ? String(product.length) : '',
        width: product.width !== null && product.width !== undefined && product.width !== '' ? String(product.width) : '',
        length_unit: product.length_unit || '',
        width_unit: product.width_unit || '',
        weight: product.weight !== null && product.weight !== undefined && product.weight !== '' ? String(product.weight) : '',
        weight_unit: product.weight_unit || '',
        min_stock_level: product.min_stock_level || 10,
        max_stock_level: product.max_stock_level || 100,
        reorder_point: product.reorder_point || 20,
        notes: product.notes || '',
        image_url: product.image_url || '',
        status: product.status || 'active',
      });
      
      if (product.image_url) {
        setImagePreview(product.image_url);
      } else {
        setImagePreview('');
      }
      setImageFile(null);
      // Load recipe for this product
      loadRecipe(product.id);
    } else if (isOpen && !product && mode === 'create') {
      resetForm();
    }
  }, [isOpen, product, mode, categories, units, patterns, colors, subcategories]);

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
      base_quantity: '' as any,
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
    // Reset touched fields when form is reset
    setTouchedFields(new Set());
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
    // Require materialId, unit, and quantity > 0
    if (!newMaterial.materialId || !newMaterial.unit) return;
    const quantity = parseFloat(newMaterial.quantity) || 0;
    if (quantity <= 0 || newMaterial.quantity.trim() === '') {
      toast({
        title: 'Validation Error',
        description: 'Please enter a quantity greater than 0 for the material',
        variant: 'destructive',
      });
      return;
    }
    setRecipeMaterials([...recipeMaterials, newMaterial]);
    setNewMaterial({
      materialId: '',
      materialName: '',
      quantity: '',
      unit: '',
      cost: '',
    });
  };

  const removeProductMaterial = (index: number) => {
    setRecipeMaterials(recipeMaterials.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only proceed if this is an intentional submit (user clicked the submit button)
    if (!isSubmitting) {
      return;
    }

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

      // Check weight - must have both value AND unit (NOW MANDATORY)
      const weightValue = formData.weight ? String(formData.weight).trim() : '';
      const weightUnitValue = formData.weight_unit ? String(formData.weight_unit).trim() : '';
      console.log('VALIDATION - Weight:', { weightValue, weightUnitValue, raw: { weight: formData.weight, weight_unit: formData.weight_unit } });
      if (!weightValue || !weightUnitValue) {
        missingFields.push('GSM');
      }
      
      // base_quantity defaults to 0 if blank — never required
      {
        const quantity = (formData.base_quantity === null || formData.base_quantity === undefined || formData.base_quantity === '' as any || isNaN(Number(formData.base_quantity))) ? 0 : Number(formData.base_quantity);
        if (quantity < 0) {
          missingFields.push('Base Quantity (must be >= 0)');
        }
      }

      // Validate recipe materials - if materials are added, all must have quantity > 0
      if (recipeMaterials.length > 0) {
        const invalidMaterials: string[] = [];
        recipeMaterials.forEach((mat, index) => {
          const quantity = parseFloat(mat.quantity) || 0;
          if (quantity <= 0 || mat.quantity.trim() === '') {
            invalidMaterials.push(mat.materialName || `Material ${index + 1}`);
          }
        });
        
        if (invalidMaterials.length > 0) {
          toast({
            title: 'Recipe Validation Error',
            description: `Please enter a quantity greater than 0 for: ${invalidMaterials.join(', ')}`,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
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
      } else if (mode === 'edit' && product?.image_url && !imagePreview) {
        // If user removed the image (no preview), clear the URL
        imageUrl = '';
      } else if (mode === 'edit' && product?.image_url && imagePreview === product.image_url) {
        // Keep existing image URL if user didn't change it
        imageUrl = product.image_url;
      }

      const finalFormData = {
        ...formData,
        image_url: imageUrl,
        base_quantity: Number(formData.base_quantity) || 0
      };

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
          
          // Create new recipe via RecipeService (or recreate if editing)
          try {
            await RecipeService.createRecipe(createdProduct.id, {
              materials: recipeData.materials,
              description: recipeData.description,
              version: recipeData.version,
              created_by: recipeData.created_by,
            });
          } catch (recipeError: any) {
            console.error('Failed to save recipe:', recipeError);
            // Show warning but don't fail the product save
            toast({
              title: 'Recipe Warning',
              description: recipeError?.message || 'Recipe could not be saved, but product was created successfully',
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

      // If this is a new product creation/duplication and has base_quantity > 0 with individual tracking enabled
      if ((mode === 'create' || mode === 'duplicate') && createdProduct && finalFormData.base_quantity > 0 && finalFormData.individual_stock_tracking) {
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
              inspector: inspectorName,
              notes: '',
            }
          );
        } catch (individualProductError) {
          // Log error but don't fail the entire product creation
          console.error('Failed to create individual products:', individualProductError);
          // You could show a warning toast here if needed
        }
      }

      // Show success toast
      toast({
        title: 'Success',
        description: mode === 'create' 
          ? 'Product created successfully' 
          : mode === 'edit' 
          ? 'Product updated successfully' 
          : 'Product duplicated successfully',
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Lock body scroll when dialog is open and reset touched fields + wizard step
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      setTouchedFields(new Set());
      setWizardStep(0);
    } else {
      document.body.classList.remove('modal-open');
      setTouchedFields(new Set());
    }
    return () => { document.body.classList.remove('modal-open'); };
  }, [isOpen]);

  if (!isOpen) return null;

  const title = mode === 'create' ? 'Add Product' : mode === 'edit' ? 'Edit Product' : 'Duplicate Product';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full flex flex-col shadow-xl overflow-hidden" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
          </div>
          <WizardStepper current={wizardStep} total={WIZARD_STEPS.length} />
          <button onClick={onClose} type="button" className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>}

            {/* ── Step 0: Basic Info + Stock ── */}
            {wizardStep === 0 && (
              <div className="space-y-4">
                <ProductBasicInfoSection
                  formData={formData}
                  categories={categories}
                  subcategories={subcategories}
                  colors={colors}
                  colorCodeMap={colorCodeMap}
                  patterns={patterns}
                  patternImageMap={patternImageMap}
                  onFormDataChange={(data) => setFormData({ ...formData, ...data })}
                  onDeleteCategory={deleteCategory}
                  onDeleteSubcategory={deleteSubcategory}
                  onDeleteColor={deleteColor}
                  onDeletePattern={deletePattern}
                  reloadDropdowns={reloadDropdowns}
                  touchedFields={touchedFields}
                  markFieldTouched={markFieldTouched}
                />
                <ProductStockSection
                  formData={formData}
                  units={units}
                  onFormDataChange={(data) => setFormData({ ...formData, ...data })}
                  onDeleteUnit={deleteUnit}
                  reloadDropdowns={reloadDropdowns}
                  mode={mode}
                  touchedFields={touchedFields}
                  markFieldTouched={markFieldTouched}
                />
              </div>
            )}

            {/* ── Step 1: Dimensions + Image + Notes ── */}
            {wizardStep === 1 && (
              <div className="space-y-4">
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
                  touchedFields={touchedFields}
                  markFieldTouched={markFieldTouched}
                />
                <ProductNotesSection
                  formData={formData}
                  onFormDataChange={(data) => setFormData({ ...formData, ...data })}
                />
                <ImageUploadSection
                  imagePreview={imagePreview}
                  onImageUpload={handleImageUpload}
                  onImageRemove={removeImage}
                />
              </div>
            )}

            {/* ── Step 2: Recipe ── */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Product Recipe <span className="font-normal text-slate-400">(optional)</span></h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">Based on 1 SQM</span>
                </div>

                {formData.length && formData.width && formData.length_unit && formData.width_unit && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-800">
                    <Calculator className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>
                      {formData.length} {formData.length_unit} × {formData.width} {formData.width_unit} = <strong>{(() => { const s = calculateSQM(formData.length, formData.width, formData.length_unit, formData.width_unit); return `${s.toFixed(3)} sqm`; })()}</strong>
                    </span>
                  </div>
                )}

                <RecipeMaterialForm
                  newMaterial={newMaterial}
                  onMaterialChange={setNewMaterial}
                  onAdd={addProductMaterial}
                  onAddMultiple={(materials) => {
                    const existing = new Set(recipeMaterials.map(m => m.materialId));
                    const toAdd = materials.filter(m => !existing.has(m.materialId));
                    if (toAdd.length > 0) setRecipeMaterials([...recipeMaterials, ...toAdd]);
                  }}
                  targetProduct={{ length: formData.length, width: formData.width, length_unit: formData.length_unit, width_unit: formData.width_unit }}
                />
                <RecipeMaterialsList materials={recipeMaterials} onRemove={removeProductMaterial} />

                {/* Summary */}
                <div className="border border-slate-200 rounded-lg overflow-hidden mt-2">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product summary</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-100">
                    <div className="px-4 py-3">
                      <p className="text-xs text-slate-500 mb-0.5">Product name</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{formData.name || '—'}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs text-slate-500 mb-0.5">Category</p>
                      <p className="text-sm font-semibold text-slate-800">{[formData.category, formData.subcategory].filter(Boolean).join(' / ') || '—'}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs text-slate-500 mb-0.5">Dimensions</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {formData.length && formData.width ? `${formData.length}${formData.length_unit} × ${formData.width}${formData.width_unit}` : '—'}
                        {formData.weight ? ` · ${formData.weight} ${formData.weight_unit}` : ''}
                      </p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs text-slate-500 mb-0.5">Stock</p>
                      <p className="text-sm font-semibold text-slate-800">{formData.base_quantity || 0} {formData.unit || 'units'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={() => wizardStep === 0 ? onClose() : setWizardStep(s => s - 1)}
              className="h-9 px-4 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {wizardStep === 0 ? 'Cancel' : 'Back'}
            </button>

            <span className="text-xs text-slate-400">Step {wizardStep + 1} of {WIZARD_STEPS.length}</span>

            {wizardStep < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleWizardNext}
                className="h-9 px-5 rounded-lg bg-primary-600 hover:bg-primary-700 text-sm font-semibold text-white flex items-center gap-2 transition-colors"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="h-9 px-5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-2 transition-colors"
                onClick={() => setIsSubmitting(true)}
              >
                {loading
                  ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />{mode === 'create' ? 'Creating…' : 'Saving…'}</>
                  : <><Check className="w-4 h-4" />{mode === 'create' ? 'Create product' : 'Save changes'}</>
                }
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
