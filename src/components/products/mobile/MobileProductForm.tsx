import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, X, Calculator, Plus, Minus, Package, Search, Trash2, Settings } from 'lucide-react';
import { MobileOptionSheet, MobileSelector } from './MobileOptionSheet';
import type { SheetOption } from './MobileOptionSheet';
import { useProductFormDropdowns } from '@/hooks/useProductFormDropdowns';
import { ProductService } from '@/services/productService';
import { IndividualProductService } from '@/services/individualProductService';
import { RecipeService } from '@/services/recipeService';
import { MaterialService } from '@/services/materialService';
import { uploadImageToR2 } from '@/services/imageService';
import { calculateSQM } from '@/utils/sqmCalculator';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductFormData } from '@/types/product';
import { calculateProductRatio } from '@/utils/productRatioCalculator';
import type { RecipeMaterial as BackendRecipeMaterial } from '@/types/recipe';

type SheetKey = 'category' | 'subcategory' | 'color' | 'pattern' | 'unit' | 'length' | 'width' | 'weight' | null;

const STEPS = ['Basics', 'Dimensions', 'Recipe'];

interface RecipeMaterial {
  materialId: string;
  materialName: string;
  quantity: string;
  unit: string;
  cost?: string;
  materialType?: 'product' | 'raw_material';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
  mode: 'create' | 'edit' | 'duplicate';
}

export default function MobileProductForm({ isOpen, onClose, onSuccess, product, mode }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recipeLoadedRef = useRef(false);
  const loadedRecipeIdRef = useRef<string | null>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '', category: '', subcategory: '', color: '', pattern: '',
    base_quantity: '' as any, unit: '', individual_stock_tracking: true,
    length: '', width: '', length_unit: 'feet', width_unit: 'feet',
    weight: '', weight_unit: '', min_stock_level: 10, max_stock_level: 100,
    reorder_point: 20, notes: '', image_url: '', status: 'active',
  });

  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [recipeMaterials, setRecipeMaterials] = useState<RecipeMaterial[]>([]);

  // Mobile recipe picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'raw_materials' | 'products'>('raw_materials');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerMaterials, setPickerMaterials] = useState<any[]>([]);
  const [pickerProducts, setPickerProducts] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const pickerDebounce = useRef<any>(null);
  const [selectedMat, setSelectedMat] = useState<any | null>(null);
  const [qtyValue, setQtyValue] = useState('1');

  const set = (k: keyof ProductFormData, v: any) => setFormData(prev => ({ ...prev, [k]: v }));

  const {
    categories, subcategories, colors, colorCodeMap, patterns, patternImageMap, units,
    lengthUnits, widthUnits, weightUnits, lengths, widths, weights,
    reloadDropdowns,
    categoryOptions, subcategoryOptions, colorOptions, patternOptions, unitOptions,
    lengthOptions, widthOptions, weightOptions,
  } = useProductFormDropdowns();

  // Fetch picker items
  const fetchPickerItems = async (q: string, tab: 'raw_materials' | 'products') => {
    setPickerLoading(true);
    try {
      if (tab === 'raw_materials') {
        const { materials } = await MaterialService.getMaterials({ search: q || undefined, limit: 50 });
        setPickerMaterials(materials || []);
      } else {
        const { products: prods } = await ProductService.getProducts({ search: q || undefined, limit: 50 });
        setPickerProducts((prods || []).filter((p: any) => p.id !== product?.id));
      }
    } catch { /* ignore */ } finally { setPickerLoading(false); }
  };

  useEffect(() => {
    if (!pickerOpen) { setPickerSearch(''); setPickerMaterials([]); setPickerProducts([]); return; }
    fetchPickerItems('', pickerTab);
  }, [pickerOpen, pickerTab]);

  const onPickerSearch = (q: string) => {
    setPickerSearch(q);
    if (pickerDebounce.current) clearTimeout(pickerDebounce.current);
    pickerDebounce.current = setTimeout(() => fetchPickerItems(q, pickerTab), 280);
  };

  useEffect(() => {
    if (isOpen) { reloadDropdowns(); setStep(0); }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && product && (mode === 'edit' || mode === 'duplicate')) {
      setFormData({
        name: product.name || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        color: product.color || '',
        pattern: product.pattern || '',
        base_quantity: mode === 'duplicate' ? '' as any : (product.base_quantity || 0),
        unit: product.unit || '',
        individual_stock_tracking: product.individual_stock_tracking !== undefined ? product.individual_stock_tracking : true,
        length: product.length !== null && product.length !== undefined ? String(product.length) : '',
        width: product.width !== null && product.width !== undefined ? String(product.width) : '',
        length_unit: product.length_unit || 'feet',
        width_unit: product.width_unit || 'feet',
        weight: product.weight !== null && product.weight !== undefined ? String(product.weight) : '',
        weight_unit: product.weight_unit || '',
        min_stock_level: product.min_stock_level || 10,
        max_stock_level: product.max_stock_level || 100,
        reorder_point: product.reorder_point || 20,
        notes: product.notes || '',
        image_url: product.image_url || '',
        status: product.status || 'active',
      });
      if (product.image_url) setImagePreview(product.image_url);
    } else if (isOpen && !product && mode === 'create') {
      resetForm();
    }
  }, [isOpen, product, mode]);

  useEffect(() => {
    if (isOpen && product && (mode === 'edit' || mode === 'duplicate')) {
      recipeLoadedRef.current = false;
      loadRecipe(product.id);
    }
  }, [isOpen, product?.id, mode]);

  const loadRecipe = async (productId: string) => {
    try {
      const recipe = await RecipeService.getRecipeByProductId(productId);
      if (recipe?.materials) {
        loadedRecipeIdRef.current = recipe.id || null;
        setRecipeMaterials(recipe.materials.map((mat: BackendRecipeMaterial) => ({
          materialId: mat.material_id,
          materialName: mat.material_name,
          quantity: mat.quantity_per_sqm.toString(),
          unit: mat.unit,
          cost: mat.cost_per_unit?.toString() || '',
        })));
      } else {
        loadedRecipeIdRef.current = null;
        setRecipeMaterials([]);
      }
    } catch {
      loadedRecipeIdRef.current = null;
      setRecipeMaterials([]);
    } finally {
      recipeLoadedRef.current = true;
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', category: '', subcategory: '', color: '', pattern: '',
      base_quantity: '' as any, unit: '', individual_stock_tracking: true,
      length: '', width: '', length_unit: 'feet', width_unit: 'feet',
      weight: '', weight_unit: '', min_stock_level: 10, max_stock_level: 100,
      reorder_point: 20, notes: '', image_url: '', status: 'active',
    });
    setImagePreview(''); setImageFile(null); setRecipeMaterials([]);
    loadedRecipeIdRef.current = null; recipeLoadedRef.current = false;
  };

  const validateStep = (s: number): string[] => {
    if (s === 0) {
      const errs: string[] = [];
      if (!formData.name?.trim()) errs.push('Product Name');
      if (!formData.category?.trim()) errs.push('Category');
      if (!formData.unit?.trim()) errs.push('Unit');
      return errs;
    }
    if (s === 1) {
      const errs: string[] = [];
      if (!formData.length || !formData.length_unit) errs.push('Length');
      if (!formData.width || !formData.width_unit) errs.push('Width');
      if (!formData.weight || !formData.weight_unit) errs.push('GSM');
      return errs;
    }
    return [];
  };

  const goNext = () => {
    const errs = validateStep(step);
    if (errs.length) { toast({ title: 'Fill required fields', description: errs.join(', '), variant: 'destructive' }); return; }
    setStep(s => s + 1);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview((ev.target?.result as string) || '');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (loading || isSubmitting) return;
    setIsSubmitting(true); setLoading(true);
    try {
      let imageUrl = formData.image_url || '';
      if (imageFile) {
        const res = await uploadImageToR2(imageFile, 'products');
        if (res.error) { toast({ title: 'Image Upload Failed', description: res.error, variant: 'destructive' }); setLoading(false); setIsSubmitting(false); return; }
        imageUrl = res.url;
      } else if (mode === 'edit' && product?.image_url && !imagePreview) {
        imageUrl = '';
      } else if (mode === 'edit' && product?.image_url && imagePreview === product.image_url) {
        imageUrl = product.image_url;
      }

      const finalData = { ...formData, image_url: imageUrl, base_quantity: Number(formData.base_quantity) || 0 };

      let created: any;
      if (mode === 'edit' && product) {
        created = await ProductService.updateProduct(product.id, finalData);
      } else {
        created = await ProductService.createProduct(finalData as any);
      }

      if (created && recipeMaterials.length > 0) {
        try {
          const existingId = mode === 'edit' ? loadedRecipeIdRef.current : null;
          const userInfo = localStorage.getItem('user');
          let createdBy = 'system';
          if (userInfo) { try { const u = JSON.parse(userInfo); createdBy = u.email || u.full_name || 'system'; } catch {} }

          const getMaterialType = (mat: RecipeMaterial): 'raw_material' | 'product' =>
            mat.materialType || (['roll', 'rolls', 'sqm', 'SQM'].includes(mat.unit) ? 'product' : 'raw_material');

          if (existingId) await RecipeService.deleteRecipe(existingId);
          await RecipeService.createRecipe(created.id, {
            materials: recipeMaterials.map(mat => ({
              material_id: mat.materialId, material_name: mat.materialName,
              material_type: getMaterialType(mat), quantity_per_sqm: parseFloat(mat.quantity) || 0,
              unit: mat.unit, cost_per_unit: parseFloat(mat.cost || '0') || 0,
            })),
            description: `Recipe for ${created.name}`, version: '1.0', created_by: createdBy,
          });
        } catch {}
      } else if (created && mode === 'edit' && recipeMaterials.length === 0 && recipeLoadedRef.current && loadedRecipeIdRef.current) {
        try { await RecipeService.deleteRecipe(loadedRecipeIdRef.current); } catch {}
      }

      if ((mode === 'create' || mode === 'duplicate') && created && finalData.base_quantity > 0 && finalData.individual_stock_tracking) {
        try {
          const userInfo = localStorage.getItem('user');
          let inspector = '';
          if (userInfo) { try { const u = JSON.parse(userInfo); inspector = u.full_name || u.name || u.email || ''; } catch {} }
          await IndividualProductService.createIndividualProducts(created.id, finalData.base_quantity, { batch_number: `BATCH-${Date.now()}`, inspector, notes: '' });
        } catch {}
      }

      toast({ title: 'Success', description: mode === 'create' ? 'Product created' : mode === 'edit' ? 'Product updated' : 'Product duplicated' });
      onSuccess(); onClose(); resetForm();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save product', variant: 'destructive' });
    } finally {
      setLoading(false); setIsSubmitting(false);
    }
  };

  // Build sheet options from dropdown data
  const sheetOpts = (raw: string[], optMap?: Record<string, any>[]): SheetOption[] =>
    raw.map(v => ({ value: v }));

  const colorSheetOpts: SheetOption[] = (colorOptions || []).map(o => ({
    value: o.value, color_code: colorCodeMap[o.value] || null, is_active: o.is_active,
    _id: o._id, id: o.id,
  }));

  const patternSheetOpts: SheetOption[] = (patternOptions || []).map(o => ({
    value: o.value, image_url: patternImageMap[o.value] || null, is_active: o.is_active,
    _id: o._id, id: o.id,
  }));

  const title = mode === 'create' ? 'New Product' : mode === 'edit' ? 'Edit Product' : 'Duplicate Product';

  if (!isOpen) return null;

  return (
    <>
      <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col" style={{ height: '100dvh' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-gray-100 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900">{title}</p>
            <p className="text-xs text-gray-400">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
          </div>
          {/* Step dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            {STEPS.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-200 ${i === step ? 'w-5 h-2 bg-blue-600' : i < step ? 'w-2 h-2 bg-green-500' : 'w-2 h-2 bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Step 0: Basics ── */}
          {step === 0 && (
            <div className="px-4 py-5">
              {/* Photo */}
              <div
                onClick={() => document.getElementById('mobile-product-img')?.click()}
                className="relative w-full h-40 rounded-[10px] bg-gray-100 flex flex-col items-center justify-center overflow-hidden cursor-pointer mb-[14px]"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setImagePreview(''); setImageFile(null); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-4xl mb-2">🖼️</span>
                    <p className="text-[13px] text-gray-400">tap to add photo</p>
                  </>
                )}
                <input id="mobile-product-img" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>

              {/* Product Name */}
              <div className="mb-[14px]">
                <p className="text-[13px] font-semibold text-gray-900 mb-1.5">
                  Product Name<span className="text-red-500"> *</span>
                </p>
                <input
                  className="w-full h-[46px] rounded-[10px] border border-gray-200 bg-white px-[13px] text-[15px] outline-none text-gray-900 placeholder-gray-400 focus:border-blue-400"
                  placeholder="e.g. Speaker Grille Cloth — Black"
                  value={formData.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>

              {/* Category */}
              <MobileSelector
                label="Category" required
                value={formData.category}
                placeholder="Select category"
                onPress={() => setOpenSheet('category')}
              />

              {/* Subcategory */}
              <MobileSelector
                label="Subcategory"
                value={formData.subcategory || ''}
                placeholder="Select subcategory"
                onPress={() => setOpenSheet('subcategory')}
              />

              {/* Color + Pattern row */}
              <div className="grid grid-cols-2 gap-3 mb-[14px]">
                <MobileSelector
                  label="Color"
                  value={formData.color || ''}
                  placeholder="Select color"
                  onPress={() => setOpenSheet('color')}
                  colorCode={formData.color ? colorCodeMap[formData.color] : undefined}
                  noMargin
                />
                <MobileSelector
                  label="Pattern"
                  value={formData.pattern || ''}
                  placeholder="Select pattern"
                  onPress={() => setOpenSheet('pattern')}
                  imageUrl={formData.pattern ? patternImageMap[formData.pattern] : undefined}
                  noMargin
                />
              </div>

              {/* Unit */}
              <MobileSelector
                label="Unit" required
                value={formData.unit}
                placeholder="Select unit (e.g. SQM, kg, meters)"
                onPress={() => setOpenSheet('unit')}
              />

              {/* Base Quantity */}
              <div className="mb-[14px]">
                <p className="text-[13px] font-semibold text-gray-900 mb-1.5">Base Quantity</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => set('base_quantity', Math.max(0, (Number(formData.base_quantity) || 0) - 1))}
                    disabled={mode === 'edit'}
                    className={`w-[46px] h-[46px] rounded-[10px] border border-gray-200 flex items-center justify-center shrink-0 transition-opacity ${
                      mode === 'edit' ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-white active:bg-gray-50'
                    }`}
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <input
                    className={`flex-1 h-[46px] rounded-[10px] border border-gray-200 text-center text-[15px] font-bold text-gray-900 outline-none focus:border-blue-400 ${
                      mode === 'edit' ? 'bg-gray-150 opacity-60 cursor-not-allowed text-gray-500' : 'bg-white'
                    }`}
                    type="number"
                    min="0"
                    value={formData.base_quantity ?? ''}
                    onChange={e => set('base_quantity', e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    disabled={mode === 'edit'}
                  />
                  <button
                    type="button"
                    onClick={() => set('base_quantity', (Number(formData.base_quantity) || 0) + 1)}
                    disabled={mode === 'edit'}
                    className={`w-[46px] h-[46px] rounded-[10px] border border-gray-200 flex items-center justify-center shrink-0 transition-opacity ${
                      mode === 'edit' ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-white active:bg-gray-50'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                {mode === 'edit' && <p className="text-[12px] text-red-500 font-medium mt-1">Quantity cannot be edited. Use inventory management to adjust stock.</p>}
                {mode !== 'edit' && <p className="text-[12px] text-gray-400 mt-1">Initial stock in rolls (each gets a QR code)</p>}
              </div>

              {/* Description */}
              <div className="mb-[14px]">
                <p className="text-[13px] font-semibold text-gray-900 mb-1.5">Description</p>
                <textarea
                  className="w-full rounded-[10px] border border-gray-200 bg-white px-[13px] py-3 text-[15px] outline-none text-gray-900 placeholder-gray-400 focus:border-blue-400 resize-none"
                  placeholder="Short description of this product…"
                  rows={3}
                  value={formData.notes || ''}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Step 1: Dimensions ── */}
          {step === 1 && (
            <div className="px-4 py-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-[14px]">Dimensions</p>

              {/* Length */}
              <MobileSelector
                label="Length" required
                value={formData.length ? `${formData.length} ${formData.length_unit}` : ''}
                placeholder="Select length (e.g. 50 ft)"
                onPress={() => setOpenSheet('length')}
              />

              {/* Width */}
              <MobileSelector
                label="Width" required
                value={formData.width ? `${formData.width} ${formData.width_unit}` : ''}
                placeholder="Select width (e.g. 1.83 ft)"
                onPress={() => setOpenSheet('width')}
              />

              {/* GSM */}
              <MobileSelector
                label="GSM (Weight)" required
                value={formData.weight ? `${formData.weight} ${formData.weight_unit}` : ''}
                placeholder="Select GSM (e.g. 220)"
                onPress={() => setOpenSheet('weight')}
              />

              {/* SQM calc */}
              {formData.length && formData.width && formData.length_unit && formData.width_unit && (
                <div className="bg-blue-50 border border-blue-200 rounded-[10px] px-4 py-3 flex items-center gap-3 mb-[14px]">
                  <Calculator className="w-4 h-4 text-blue-600 shrink-0" />
                  <p className="text-[14px] text-blue-800">
                    {formData.length} {formData.length_unit} × {formData.width} {formData.width_unit} = <strong>{calculateSQM(formData.length, formData.width, formData.length_unit, formData.width_unit).toFixed(3)} sqm</strong>
                  </p>
                </div>
              )}

              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-[14px]">Stock levels</p>

              <div className="grid grid-cols-2 gap-3 mb-[14px]">
                <div>
                  <p className="text-[13px] font-semibold text-gray-900 mb-1.5">Min Stock</p>
                  <input
                    className="w-full h-[46px] rounded-[10px] border border-gray-200 bg-white px-[13px] text-[15px] outline-none text-gray-900 focus:border-blue-400"
                    type="number" min="0"
                    value={formData.min_stock_level ?? ''}
                    onChange={e => set('min_stock_level', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900 mb-1.5">Max Stock</p>
                  <input
                    className="w-full h-[46px] rounded-[10px] border border-gray-200 bg-white px-[13px] text-[15px] outline-none text-gray-900 focus:border-blue-400"
                    type="number" min="0"
                    value={formData.max_stock_level ?? ''}
                    onChange={e => set('max_stock_level', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="mb-[14px]">
                <p className="text-[13px] font-semibold text-gray-900 mb-1.5">Reorder Point</p>
                <input
                  className="w-full h-[46px] rounded-[10px] border border-gray-200 bg-white px-[13px] text-[15px] outline-none text-gray-900 focus:border-blue-400"
                  type="number" min="0"
                  value={formData.reorder_point ?? ''}
                  onChange={e => set('reorder_point', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="bg-blue-50 rounded-[10px] px-4 py-3">
                <p className="text-[12px] text-blue-700">Each roll gets its own QR code on creation, so every piece can be tracked and scanned individually.</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Recipe ── */}
          {step === 2 && (
            <div className="px-4 py-5">
              {/* SQM info */}
              {formData.length && formData.width && formData.length_unit && formData.width_unit && (
                <div className="bg-blue-50 border border-blue-200 rounded-[10px] px-4 py-3 flex items-center gap-2 mb-4">
                  <Calculator className="w-4 h-4 text-blue-600 shrink-0" />
                  <p className="text-[13px] text-blue-800">
                    {formData.length} {formData.length_unit} × {formData.width} {formData.width_unit} = <strong>{calculateSQM(formData.length, formData.width, formData.length_unit, formData.width_unit).toFixed(3)} sqm</strong>
                  </p>
                </div>
              )}

              {/* Recipe header */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Recipe ({recipeMaterials.length})</p>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex items-center gap-1 h-[34px] px-[14px] rounded-[10px] border border-blue-200 bg-blue-50 text-blue-600"
                >
                  <Plus className="w-[14px] h-[14px]" />
                  <span className="text-[13px] font-semibold">Add Ingredient</span>
                </button>
              </div>

              {/* Recipe list or empty */}
              {recipeMaterials.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="text-5xl mb-3">📄</div>
                  <p className="text-[16px] font-bold text-gray-900 mb-1">No ingredients yet</p>
                  <p className="text-[13px] text-gray-400">Tap Add Ingredient to build the recipe for this product.</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {recipeMaterials.map((r, i) => (
                    <div key={r.materialId + i} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-[12px]">
                      <div className="w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-900 truncate">{r.materialName}</p>
                        <p className="text-[12px] text-gray-400">{r.quantity} {r.unit} / SQM</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecipeMaterials(prev => prev.filter((_, j) => j !== i))}
                        className="w-[30px] h-[30px] rounded-[8px] bg-red-50 flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="w-[14px] h-[14px] text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[12px] text-gray-400 text-center mt-4">Recipe is optional — you can save without one.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 pb-8 pt-3 border-t border-gray-100 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
            className="flex-1 h-[52px] rounded-[10px] border border-gray-200 bg-white text-[15px] font-semibold text-gray-700"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 h-[52px] rounded-[10px] bg-blue-600 text-[15px] font-semibold text-white"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || isSubmitting}
              onClick={handleSubmit}
              className="flex-1 h-[52px] rounded-[10px] bg-blue-600 disabled:opacity-40 text-[15px] font-semibold text-white flex items-center justify-center gap-2"
            >
              {loading
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />{mode === 'create' ? 'Creating…' : 'Saving…'}</>
                : mode === 'create' ? 'Create Product' : 'Save Changes'
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Option Sheets ── */}
      <MobileOptionSheet
        open={openSheet === 'category'} onClose={() => setOpenSheet(null)}
        title="Category" opts={categories.map(v => ({ value: v }))}
        current={formData.category} onSelect={v => set('category', v)}
        category="category" onAdded={reloadDropdowns}
      />
      <MobileOptionSheet
        open={openSheet === 'subcategory'} onClose={() => setOpenSheet(null)}
        title="Subcategory" opts={subcategories.map(v => ({ value: v }))}
        current={formData.subcategory || ''} onSelect={v => set('subcategory', v)}
        category="subcategory" onAdded={reloadDropdowns}
      />
      <MobileOptionSheet
        open={openSheet === 'color'} onClose={() => setOpenSheet(null)}
        title="Color" opts={colorSheetOpts} kind="color"
        current={formData.color || ''} onSelect={v => set('color', v)}
        category="color" onAdded={reloadDropdowns}
      />
      <MobileOptionSheet
        open={openSheet === 'pattern'} onClose={() => setOpenSheet(null)}
        title="Pattern" opts={patternSheetOpts} kind="pattern"
        current={formData.pattern || ''} onSelect={v => set('pattern', v)}
        category="pattern" onAdded={reloadDropdowns}
      />
      <MobileOptionSheet
        open={openSheet === 'unit'} onClose={() => setOpenSheet(null)}
        title="Unit" opts={units.map(v => ({ value: v }))}
        current={formData.unit} onSelect={v => set('unit', v)}
        category="unit" onAdded={reloadDropdowns}
      />
      <MobileOptionSheet
        open={openSheet === 'length'} onClose={() => setOpenSheet(null)}
        title="Length"
        opts={lengths.map(v => ({ value: v }))}
        current={formData.length && formData.length_unit ? `${formData.length} ${formData.length_unit}` : ''}
        onSelect={v => {
          const parts = v.trim().split(/\s+/);
          if (parts.length >= 2) { set('length', parts[0]); set('length_unit', parts.slice(1).join(' ')); }
        }}
        category="length" onAdded={reloadDropdowns}
      />
      <MobileOptionSheet
        open={openSheet === 'width'} onClose={() => setOpenSheet(null)}
        title="Width"
        opts={widths.map(v => ({ value: v }))}
        current={formData.width && formData.width_unit ? `${formData.width} ${formData.width_unit}` : ''}
        onSelect={v => {
          const parts = v.trim().split(/\s+/);
          if (parts.length >= 2) { set('width', parts[0]); set('width_unit', parts.slice(1).join(' ')); }
        }}
        category="width" onAdded={reloadDropdowns}
      />
      <MobileOptionSheet
        open={openSheet === 'weight'} onClose={() => setOpenSheet(null)}
        title="GSM (Weight)"
        opts={weights.map(v => ({ value: v }))}
        current={formData.weight && formData.weight_unit ? `${formData.weight} ${formData.weight_unit}` : ''}
        onSelect={v => {
          const parts = v.trim().split(/\s+/);
          if (parts.length >= 2) { set('weight', parts[0]); set('weight_unit', parts.slice(1).join(' ')); }
          else if (parts.length === 1) { set('weight', parts[0]); set('weight_unit', 'GSM'); }
        }}
        category="weight" onAdded={reloadDropdowns}
      />

      {/* ── Material Picker (full screen) ── */}
      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-white flex flex-col" style={{ height: '100dvh' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-gray-100 shrink-0 bg-white">
              <button type="button" onClick={() => setPickerOpen(false)} className="w-8 h-8 flex items-center justify-center">
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <p className="flex-1 text-[16px] font-bold text-gray-900">Add Ingredient</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-white shrink-0">
              {(['raw_materials', 'products'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPickerTab(tab)}
                  className={`flex-1 py-3.5 text-[13px] font-bold border-b-2 transition-colors ${pickerTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}
                >
                  {tab === 'raw_materials' ? 'Raw Materials' : 'Products'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-4 py-2.5 bg-white border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2 bg-gray-100 rounded-[10px] px-3 h-[38px]">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  className="flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder-gray-400"
                  placeholder={`Search ${pickerTab === 'raw_materials' ? 'materials' : 'products'}…`}
                  value={pickerSearch}
                  onChange={e => onPickerSearch(e.target.value)}
                />
                {pickerSearch && (
                  <button type="button" onClick={() => { setPickerSearch(''); onPickerSearch(''); }}>
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {pickerLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : (() => {
                const items = pickerTab === 'raw_materials' ? pickerMaterials : pickerProducts;
                if (items.length === 0) return (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="text-4xl mb-3">📦</div>
                    <p className="text-[14px] text-gray-400">No {pickerTab === 'raw_materials' ? 'materials' : 'products'} found</p>
                  </div>
                );
                return (
                  <div className="grid grid-cols-2 gap-3">
                    {items.map((m: any) => {
                      const stockQty = pickerTab === 'products'
                        ? Number(m.individual_product_stats?.available ?? m.current_stock ?? 0)
                        : Number(m.available_stock ?? m.current_stock ?? 0);
                      const stockColor = stockQty <= 0 ? '#EF4444' : stockQty < 10 ? '#EA580C' : '#16A34A';
                      const stockBg = stockQty <= 0 ? '#FEF2F2' : stockQty < 10 ? '#FFF4ED' : '#ECFDF3';
                      return (
                        <button
                          key={m.id || m._id}
                          type="button"
                          onClick={() => {
                            setSelectedMat({ ...m, _pickerTab: pickerTab });
                            if (pickerTab === 'products') {
                              const sourceLengthUnit = m.length_unit || m.lengthUnit || '';
                              const sourceWidthUnit = m.width_unit || m.widthUnit || '';
                              const targetLengthUnit = formData.length_unit || '';
                              const targetWidthUnit = formData.width_unit || '';
                              
                              if (m.length && m.width && sourceLengthUnit && sourceWidthUnit &&
                                  formData.length && formData.width && targetLengthUnit && targetWidthUnit) {
                                const ratio = calculateProductRatio(m, formData);
                                if (ratio > 0 && !isNaN(ratio) && isFinite(ratio)) {
                                  setQtyValue(ratio.toFixed(4));
                                } else {
                                  setQtyValue('1');
                                }
                              } else {
                                setQtyValue('1');
                              }
                            } else {
                              setQtyValue('1');
                            }
                          }}
                          className="text-left bg-white border border-gray-200 rounded-[12px] p-3 active:bg-gray-50 flex flex-col justify-between"
                        >
                          <div className="w-full">
                            {/* Top row: Monospace ID and Image/Icon */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span className="text-[9px] font-mono text-gray-400">
                                #{String(m.id || m._id || '').substring(0, 8)}
                              </span>
                              {m.image_url ? (
                                <img src={m.image_url} alt={m.name} className="w-5 h-5 rounded object-cover border border-gray-100" />
                              ) : (
                                <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center">
                                  <Package className="w-3 h-3 text-blue-600" />
                                </div>
                              )}
                            </div>

                            {/* Name */}
                            <p className="text-[12px] font-bold text-gray-900 leading-4 line-clamp-2 mb-1">
                              {m.name || m.material_name || m.product_name}
                            </p>

                            {/* Details: Specs/Category/Supplier */}
                            {pickerTab === 'products' ? (() => {
                              const len = m.length != null && String(m.length).trim() ? String(m.length).trim() : '';
                              const wid = m.width != null && String(m.width).trim() ? String(m.width).trim() : '';
                              const lenStr = len ? `${len}${m.length_unit || 'M'}`.trim() : '';
                              const widStr = wid ? `${wid}${m.width_unit || 'M'}`.trim() : '';
                              const dim = (lenStr || widStr) ? `${lenStr} × ${widStr}` : null;
                              const w = m.weight != null && String(m.weight).trim() ? String(m.weight).trim() : '';
                              const gsm = w ? `${w} ${m.weight_unit || 'GSM'}`.trim() : null;
                              const specs = (dim && gsm) ? `${dim} · ${gsm}` : dim || gsm;
                              return (
                                <div className="text-[10px] text-gray-500 space-y-0.5">
                                  {specs && <p className="truncate" title={specs}>{specs}</p>}
                                  {m.category && <p className="truncate">{m.category}</p>}
                                </div>
                              );
                            })() : (
                              <div className="text-[10px] text-gray-500 space-y-0.5">
                                {m.category && <p className="truncate">{m.category}</p>}
                                {m.supplier_name && <p className="truncate">Supplier: {m.supplier_name}</p>}
                              </div>
                            )}

                            {/* Color Swatch Dot */}
                            {m.color && m.color !== 'N/A' && (
                              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-600">
                                {colorCodeMap[m.color.toLowerCase()] && (
                                  <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block shrink-0" style={{ backgroundColor: colorCodeMap[m.color.toLowerCase()] }} />
                                )}
                                <span>{m.color}</span>
                              </div>
                            )}

                            {/* Stock status indicator badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold" style={{ backgroundColor: stockBg, color: stockColor }}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: stockColor }} />
                                Avail: {stockQty.toFixed(2)} {m.unit || 'pcs'}
                              </span>

                              {(() => {
                                const inProd = pickerTab === 'products'
                                  ? Number(m.individual_product_stats?.in_production ?? 0)
                                  : Number(m.in_production ?? 0);
                                return inProd > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#FFFBEB] text-[#D97706]">
                                    <Settings className="w-2.5 h-2.5 text-[#D97706] inline" />
                                    In Prod: {inProd.toFixed(2)}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </div>

                          <div className="mt-2.5 w-full h-[28px] rounded-[8px] bg-blue-50 border border-blue-200 flex items-center justify-center">
                            <span className="text-[12px] font-semibold text-blue-600">+ Add</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* ── Quantity Sheet (bottom sheet) ── */}
      {selectedMat && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => setSelectedMat(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[81] bg-gray-50 rounded-t-[22px] p-5 pb-9">
            <div className="w-10 h-1.5 rounded-full bg-gray-300 mx-auto mb-4" />
            <p className="text-[17px] font-bold text-gray-900 mb-1">{selectedMat.name || selectedMat.material_name}</p>
            <p className="text-[13px] text-gray-400 mb-5">Quantity per SQM of finished product</p>

            {(() => {
              if (selectedMat && selectedMat._pickerTab === 'products') {
                const sourceLengthVal = parseFloat(selectedMat.length || '0') || 0;
                const sourceWidthVal = parseFloat(selectedMat.width || '0') || 0;
                const sourceLengthUnit = selectedMat.length_unit || selectedMat.lengthUnit || '';
                const sourceWidthUnit = selectedMat.width_unit || selectedMat.widthUnit || '';

                const convertToMeters = (value: number, unit: string): number => {
                  const u = unit.trim().toLowerCase();
                  if (u === 'mm') return value / 1000;
                  if (u === 'cm') return value / 100;
                  if (u === 'feet' || u === 'ft') return value * 0.3048;
                  if (u === 'inch' || u === 'in') return value * 0.0254;
                  if (u === 'yard' || u === 'yd') return value * 0.9144;
                  return value; // Default/m
                };

                if (sourceLengthVal > 0 && sourceWidthVal > 0 && sourceLengthUnit && sourceWidthUnit) {
                  const sourceSQM = convertToMeters(sourceLengthVal, sourceLengthUnit) * convertToMeters(sourceWidthVal, sourceWidthUnit);
                  if (sourceSQM > 0) {
                    const ratio = 1 / sourceSQM;
                    return (
                      <div className="p-3 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg mb-5 text-[12.5px] leading-relaxed text-gray-700">
                        <p className="font-bold text-blue-750 mb-0.5">Auto-Calculated Ratio Info</p>
                        <p>1 roll = {sourceSQM.toFixed(3)} SQM</p>
                        <p className="text-gray-500 font-mono text-[11.5px] mt-0.5">Calculation: 1 / {sourceSQM.toFixed(3)} = {ratio.toFixed(4)} roll/SQM</p>
                      </div>
                    );
                  }
                }
              }
              return null;
            })()}

            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-[14px] p-2 mb-5">
              <button
                type="button"
                onClick={() => setQtyValue(v => String(Math.max(0.01, Math.round((parseFloat(v) || 1) * 100 - 1) / 100)))}
                className="w-11 h-11 rounded-[12px] border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0"
              >
                <span className="text-[22px] text-gray-700 font-semibold leading-none">−</span>
              </button>
              <div className="flex-1 flex flex-col items-center">
                <input
                  type="number"
                  value={qtyValue}
                  onChange={e => setQtyValue(e.target.value)}
                  className="w-full text-center text-[28px] font-extrabold text-gray-900 outline-none bg-transparent"
                />
                <span className="text-[12px] text-gray-400">{(selectedMat._pickerTab === 'products' && (selectedMat.unit === 'sqm' || selectedMat.unit === 'SQM')) ? 'roll' : (selectedMat.unit || 'unit')} / SQM</span>
              </div>
              <button
                type="button"
                onClick={() => setQtyValue(v => String(Math.round((parseFloat(v) || 1) * 100 + 1) / 100))}
                className="w-11 h-11 rounded-[12px] bg-blue-600 flex items-center justify-center shrink-0"
              >
                <span className="text-[22px] text-white font-semibold leading-none">+</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const qty = parseFloat(qtyValue);
                if (!qty || qty <= 0) { toast({ title: 'Invalid quantity', description: 'Enter a quantity greater than 0', variant: 'destructive' }); return; }
                const isProduct = selectedMat._pickerTab === 'products';
                let unit = selectedMat.unit || (isProduct ? 'pcs' : 'kg');
                if (isProduct && (unit === 'sqm' || unit === 'SQM')) {
                  unit = 'roll';
                }
                const newEntry: RecipeMaterial = {
                  materialId: selectedMat.id || selectedMat._id,
                  materialName: selectedMat.name || selectedMat.material_name || selectedMat.product_name,
                  quantity: String(qty),
                  unit: unit,
                  cost: String(selectedMat.cost_per_unit || 0),
                  materialType: isProduct ? 'product' : 'raw_material',
                };
                const existing = recipeMaterials.findIndex(r => r.materialId === newEntry.materialId);
                if (existing >= 0) {
                  setRecipeMaterials(prev => { const n = [...prev]; n[existing] = newEntry; return n; });
                } else {
                  setRecipeMaterials(prev => [...prev, newEntry]);
                }
                setSelectedMat(null);
                setPickerOpen(false);
              }}
              className="w-full h-[52px] rounded-[10px] bg-blue-600 text-white text-[15px] font-semibold"
            >
              Add to Recipe
            </button>
          </div>
        </>
      )}
    </>
  );
}
