import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, MapPin, Truck, Edit2, StickyNote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CustomerService, type Customer } from '@/services/customerService';
import { OrderService } from '@/services/orderService';
import { ProductService } from '@/services/productService';
import { MaterialService } from '@/services/materialService';
import { usePricingCalculator, type ExtendedOrderItem } from '@/hooks/usePricingCalculator';
import { type ProductDimensions } from '@/utils/unitConverter';
import { formatCurrency, formatErrorMessage } from '@/utils/formatHelpers';
import { validateNumberInput, ValidationPresets, preventInvalidNumberKeys } from '@/utils/numberValidation';
import CustomerSelection from '@/components/orders/CustomerSelection';
import CustomerForm from '@/components/orders/CustomerForm';
import OrderItemsList from '@/components/orders/OrderItemsList';
import ProductMaterialSelectionDialog from '@/components/orders/ProductMaterialSelectionDialog';
import DeliveryAddressDialog from '@/components/orders/DeliveryAddressDialog';

const DRAFT_KEY = 'newOrderDraft';

function generateUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ── Custom step icons (carpet/textile product themed) ──
const StepIconCustomer = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8.5" r="3.2" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </svg>
);
const StepIconItems = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="14" height="12" rx="2" />
    <path d="M7 6v12M11 6v12" opacity=".5" />
    <ellipse cx="17" cy="12" rx="4" ry="6" />
    <path d="M17 8c1.5 0 2 1.6 2 4s-.5 4-2 4" />
  </svg>
);
const StepIconDetails = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="17" rx="2" />
    <path d="M9 4h6v3H9z" fill={color} stroke="none" opacity=".25" />
    <path d="M9 4h6v3H9z" />
    <path d="M8 12h6M8 16h4" />
  </svg>
);
const StepIconReview = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v5h5" />
    <path d="M9 14l2.5 2.5L16 12" />
  </svg>
);
const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const STEPS = [
  { label: 'Customer', Icon: StepIconCustomer },
  { label: 'Items', Icon: StepIconItems },
  { label: 'Details', Icon: StepIconDetails },
  { label: 'Review', Icon: StepIconReview },
];

function StepperBars({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, idx) => {
        const done = idx < current;
        const active = idx === current;
        const pending = !done && !active;
        return (
          <div key={idx} className="flex items-center gap-1">
            <div
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg transition-all duration-200 whitespace-nowrap"
              style={{
                background: done ? '#16a34a' : active ? '#2563eb' : 'transparent',
                color: done || active ? '#fff' : '#94a3b8',
                border: pending ? '1px solid #e2e8f0' : 'none',
              }}
            >
              <span className="flex items-center justify-center w-4 h-4 flex-shrink-0">
                {done ? <CheckIcon size={12} /> : <s.Icon size={14} color={done || active ? '#fff' : '#94a3b8'} />}
              </span>
              <span className="text-[13px] font-semibold tracking-tight">{s.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DraftBanner({ step, onDismiss }: { step: number; onDismiss: () => void }) {
  const labels = ['Customer', 'Items', 'Details', 'Review'];
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200 flex-shrink-0">
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <span className="text-amber-800 font-medium text-xs">
          Draft restored — you left off at <span className="font-bold">{labels[step] ?? 'last step'}</span>. Your customer, items and details are all saved.
        </span>
      </div>
      <button onClick={onDismiss} className="text-amber-600 hover:text-amber-800 text-xs font-medium ml-4 flex-shrink-0">✕ Dismiss</button>
    </div>
  );
}

function FooterNav({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  hint,
}: {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex-shrink-0 border-t border-slate-200 bg-white px-5 py-3 flex items-center gap-3">
      <button
        onClick={onBack}
        className="h-10 px-5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      {hint && <span className="text-xs text-slate-400 italic flex-1 text-center">{hint}</span>}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="ml-auto h-10 px-6 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity bg-primary-600 hover:bg-primary-700"
        >
          {nextLabel} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function NewOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricingCalculator = usePricingCalculator();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const draftRestoredRef = useRef(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  const [orderItems, setOrderItems] = useState<ExtendedOrderItem[]>([]);
  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);

  const [showProductSearch, setShowProductSearch] = useState(false);
  const [currentOrderItem, setCurrentOrderItem] = useState<ExtendedOrderItem | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productColorFilter, setProductColorFilter] = useState('all');
  const [productPage, setProductPage] = useState(1);
  const [productItemsPerPage] = useState(500);
  const [materialPage, setMaterialPage] = useState(1);
  const [materialItemsPerPage] = useState(500);
  const [productSortBy, setProductSortBy] = useState<'name' | 'stock' | 'category' | 'recent'>('name');
  const [productSortOrder, setProductSortOrder] = useState<'asc' | 'desc'>('asc');
  const [materialSortBy, setMaterialSortBy] = useState<'name' | 'stock' | 'category' | 'recent'>('name');
  const [materialSortOrder, setMaterialSortOrder] = useState<'asc' | 'desc'>('asc');

  const [orderDetails, setOrderDetails] = useState({ expectedDelivery: '', notes: '', remarks: '', paidAmount: 0 });
  const [transportType, setTransportType] = useState<'own' | 'outside' | ''>('');
  const [transportVehicleNo, setTransportVehicleNo] = useState('');
  const [transportRemark, setTransportRemark] = useState('');
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState<{ address: string; city: string; state: string; pincode: string } | null>(null);
  const [showAddressEditor, setShowAddressEditor] = useState(false);

  const saveDraft = useCallback(() => {
    if (!draftRestoredRef.current) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        step, selectedCustomer, orderItems, orderDetails,
        transportType, transportVehicleNo, transportRemark, orderDeliveryAddress,
      }));
      setDraftSavedAt(new Date());
    } catch { }
  }, [step, selectedCustomer, orderItems, orderDetails, transportType, transportVehicleNo, transportRemark, orderDeliveryAddress]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const hasMeaningfulData = d.selectedCustomer || d.orderItems?.length;
        if (hasMeaningfulData) {
          if (d.selectedCustomer) setSelectedCustomer(d.selectedCustomer);
          if (d.orderItems?.length) setOrderItems(d.orderItems);
          if (d.orderDetails) setOrderDetails(d.orderDetails);
          if (d.transportType) setTransportType(d.transportType);
          if (d.transportVehicleNo) setTransportVehicleNo(d.transportVehicleNo);
          if (d.transportRemark) setTransportRemark(d.transportRemark);
          if (d.orderDeliveryAddress) setOrderDeliveryAddress(d.orderDeliveryAddress);
          if (typeof d.step === 'number') setStep(d.step);
          setShowDraftBanner(true);
        }
      }
    } catch { }
    // Allow saveDraft to run only after restore is complete
    draftRestoredRef.current = true;
  }, []);

  const clearDraft = () => { sessionStorage.removeItem(DRAFT_KEY); };

  useEffect(() => {
    loadCustomers();
    loadProductsWithFilters();
    loadRawMaterialsWithFilters();
  }, []);

  useEffect(() => { loadProductsWithFilters(); }, [productSearchTerm, productCategoryFilter, productColorFilter, productSortBy, productSortOrder]);
  useEffect(() => { loadRawMaterialsWithFilters(); }, [materialSortBy, materialSortOrder]);

  const loadCustomers = async () => {
    const { data } = await CustomerService.getCustomers().catch(() => ({ data: [] }));
    setCustomers(data || []);
  };

  const loadProductsWithFilters = async () => {
    try {
      const filters: any = { page: 1, limit: productItemsPerPage, sortBy: productSortBy === 'recent' ? 'created_at' : productSortBy, sortOrder: productSortOrder };
      if (productSearchTerm) filters.search = productSearchTerm;
      if (productCategoryFilter !== 'all') filters.category = [productCategoryFilter];
      if (productColorFilter !== 'all') filters.color = [productColorFilter];
      const { products: data } = await ProductService.getProducts(filters);
      setRealProducts((data || []).map((p: any) => ({
        id: p.id || p._id, name: p.name, price: p.price || 0,
        current_stock: p.current_stock || p.base_quantity || 0, stock: p.current_stock || p.base_quantity || 0,
        category: p.category, subcategory: p.subcategory || '', color: p.color, pattern: p.pattern,
        width: p.width, length: p.length, weight: p.weight,
        width_unit: p.width_unit, length_unit: p.length_unit, weight_unit: p.weight_unit,
        gsm: parseFloat(String(p.weight || '0').replace(/[^\d.-]/g, '')) || 0,
        unit: p.unit || 'units', count_unit: p.count_unit || 'rolls',
        individual_stock_tracking: p.individual_stock_tracking !== false,
        individualStockTracking: p.individual_stock_tracking !== false,
        imageUrl: p.image_url || '',
      })));
    } catch (e) { console.error(e); }
  };

  const loadRawMaterialsWithFilters = async () => {
    try {
      const filters: any = { page: 1, limit: materialItemsPerPage, sortBy: materialSortBy === 'recent' ? 'created_at' : materialSortBy, sortOrder: materialSortOrder };
      const result = await MaterialService.getMaterials(filters);
      setRawMaterials((result.materials || []).map((m: any) => ({
        id: m.id || m._id, name: m.name, price: m.cost_per_unit || 0,
        current_stock: m.current_stock || 0, stock: m.current_stock || 0,
        available_stock: m.available_stock, reserved: m.reserved, in_production: m.in_production,
        sold: m.sold, used: m.used, category: m.category, type: m.type, color: m.color,
        brand: m.supplier_name || 'Unknown', unit: m.unit,
        supplier: m.supplier_name || 'Unknown', supplier_name: m.supplier_name || 'Unknown',
        batch_number: m.batch_number, status: m.status || 'in-stock', location: 'Warehouse',
      })));
    } catch (e) { console.error(e); }
  };

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, {
      id: generateUniqueId('ORDITEM'), product_id: '', product_name: '', product_type: 'product',
      quantity: 1, unit: '', unit_price: 0, gst_rate: 5, gst_included: true,
      subtotal: 0, gst_amount: 0, total_price: 0, pricing_unit: 'sqm',
      product_dimensions: { productType: 'carpet' }, isEditing: true, isValid: false,
    }]);
  };

  const updateOrderItem = (id: string, field: keyof ExtendedOrderItem, value: any) => {
    setOrderItems(items => items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'product_type' && item.product_type !== value) {
        updated.product_id = ''; updated.product_name = ''; updated.unit_price = 0;
        updated.unit = ''; updated.pricing_unit = 'unit';
        updated.product_dimensions = { productType: value === 'raw_material' ? 'raw_material' : 'carpet' };
        updated.subtotal = 0; updated.gst_amount = 0; updated.total_price = 0;
        updated.unit_value = 0; updated.isValid = false; updated.errorMessage = undefined;
        (updated as any).length_unit = undefined; (updated as any).width_unit = undefined; (updated as any).weight_unit = undefined;
      }
      if (field === 'product_id') {
        const product = updated.product_type === 'raw_material' ? rawMaterials.find(p => p.id === value) : realProducts.find(p => p.id === value);
        if (product) {
          updated.product_name = product.name; updated.unit_price = product.price || 0;
          updated.unit = updated.product_type === 'raw_material' ? (product.unit || 'units') : (product.count_unit || 'rolls');
          const productDimensions: ProductDimensions = { productType: updated.product_type === 'raw_material' ? 'raw_material' : 'carpet', width: product.width, length: product.length, weight: product.weight, gsm: product.gsm };
          (updated as any).length_unit = product.length_unit; (updated as any).width_unit = product.width_unit; (updated as any).weight_unit = product.weight_unit;
          updated.product_dimensions = productDimensions; updated.pricing_unit = 'unit';
          const calc = pricingCalculator.calculateItemPrice(updated);
          updated.subtotal = calc.subtotal; updated.gst_amount = calc.gstAmount; updated.total_price = calc.totalPrice; updated.unit_value = calc.unitValue; updated.isValid = calc.isValid; updated.errorMessage = calc.errorMessage;
        }
      }
      if (['quantity', 'unit_price', 'pricing_unit', 'product_dimensions', 'gst_rate', 'gst_included'].includes(field)) {
        if (field === 'gst_included' && value === false) updated.gst_rate = 0;
        else if (field === 'gst_included' && value === true && (!updated.gst_rate || updated.gst_rate === 0)) updated.gst_rate = 5;
        else if (field === 'gst_rate') { if (value === 0) updated.gst_included = false; else if (value > 0 && !updated.gst_included) updated.gst_included = true; }
        const calc = pricingCalculator.calculateItemPrice(updated);
        updated.subtotal = calc.subtotal; updated.gst_amount = calc.gstAmount; updated.total_price = calc.totalPrice; updated.unit_value = calc.unitValue; updated.isValid = calc.isValid; updated.errorMessage = calc.errorMessage;
      }
      return updated;
    }));
  };

  const removeOrderItem = (id: string) => setOrderItems(items => items.filter(i => i.id !== id));

  const calculateOrderBreakdown = () => ({
    subtotal: orderItems.reduce((s, i) => s + (i.subtotal || 0), 0),
    gstAmount: orderItems.reduce((s, i) => s + (i.gst_amount || 0), 0),
    total: orderItems.reduce((s, i) => s + (i.total_price || 0), 0),
  });

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!orderDetails.expectedDelivery) {
      toast({ title: 'Missing delivery date', description: 'Please set an expected delivery date in step 3.', variant: 'destructive' });
      return;
    }
    const { total } = calculateOrderBreakdown();
    if ((orderDetails.paidAmount || 0) > total) {
      toast({ title: 'Validation error', description: `Paid amount cannot exceed ${formatCurrency(total, { full: true })}`, variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await OrderService.createOrder({
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name || '',
        customer_email: selectedCustomer?.email || '',
        customer_phone: selectedCustomer?.phone || '',
        expected_delivery: orderDetails.expectedDelivery,
        items: orderItems.map(item => ({
          product_id: item.product_id, raw_material_id: item.raw_material_id,
          product_name: item.product_name, product_type: item.product_type,
          quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
          gst_rate: (item.gst_included === false || item.gst_rate === 0) ? 0 : (item.gst_rate || 5),
          gst_included: item.gst_included === true,
          subtotal: typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : (item.subtotal || 0),
          gst_amount: typeof item.gst_amount === 'string' ? parseFloat(item.gst_amount) : (item.gst_amount || 0),
          total_price: typeof item.total_price === 'string' ? parseFloat(item.total_price) : item.total_price,
          pricing_unit: item.pricing_unit, unit_value: item.unit_value,
          product_dimensions: item.product_dimensions, specifications: item.specifications || '',
          selected_individual_products: item.selectedIndividualProducts?.map((p: any) => p.id) || [],
        })),
        discount_amount: 0, paid_amount: orderDetails.paidAmount || 0,
        priority: 'medium' as const,
        special_instructions: orderDetails.notes || undefined,
        delivery_address: orderDeliveryAddress || undefined,
        transport_type: transportType || undefined,
        transport_vehicle_no: transportVehicleNo || undefined,
        transport_remark: transportRemark || undefined,
      } as any);
      if (error) { toast({ title: 'Error', description: error, variant: 'destructive' }); setIsSubmitting(false); return; }
      clearDraft();
      toast({ title: 'Order created', description: `Total: ${formatCurrency(total, { full: true })}` });
      setTimeout(() => navigate('/orders'), 1200);
    } catch (err) {
      toast({ title: 'Error', description: formatErrorMessage(err instanceof Error ? err.message : 'Failed to create order'), variant: 'destructive' });
      setIsSubmitting(false);
    }
  };

  const handleCustomerCreated = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
    setSelectedCustomer(customer);
    setShowNewCustomerForm(false);
    setStep(1);
  };

  const handleCustomerSelected = (customer: Customer) => {
    setSelectedCustomer(customer);
    setStep(1);
  };

  const handleUseCustomerAddress = () => {
    if (!selectedCustomer) return;
    if (selectedCustomer.delivery_address) {
      try { setOrderDeliveryAddress(JSON.parse(selectedCustomer.delivery_address)); } catch { }
    } else {
      setOrderDeliveryAddress({ address: selectedCustomer.address || '', city: selectedCustomer.city || '', state: selectedCustomer.state || '', pincode: selectedCustomer.pincode || '' });
    }
  };

  const handleBack = () => {
    if (step === 0) { clearDraft(); navigate('/orders'); }
    else setStep(s => s - 1);
  };

  const { subtotal, gstAmount, total } = calculateOrderBreakdown();
  const canGoNextFromItems = orderItems.length > 0 && orderItems.every(i => i.isValid);

  return (
    <Layout>
      {/* ── Wizard shell — fills the layout main area, centered on wide screens ── */}
      <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-5xl mx-auto" style={{ height: 'calc(100dvh - 100px)' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 0 ? 'Orders' : 'Back'}
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">New Order</h1>
          </div>

          <StepperBars current={step} />

          <div className="flex items-center gap-2 justify-end">
            {draftSavedAt && (
              <div className="flex items-center gap-1 text-[10.5px] text-slate-400">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Draft saved
              </div>
            )}
            {selectedCustomer ? (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="truncate max-w-[130px]">{selectedCustomer.name}</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">No customer</span>
            )}
          </div>
        </div>

        {/* Draft banner */}
        {showDraftBanner && <DraftBanner step={step} onDismiss={() => setShowDraftBanner(false)} />}

        {/* ══════════════════════════════════════════
            STEP 0 — Customer
        ══════════════════════════════════════════ */}
        {step === 0 && (
          <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
            {/* Tab toggle + search inline */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setShowNewCustomerForm(false)}
                  className="px-3 h-8 rounded-md text-[12px] font-semibold transition-all"
                  style={!showNewCustomerForm
                    ? { background: '#fff', color: '#1d4ed8', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }
                    : { color: '#64748b' }}
                >
                  Existing customer
                </button>
                <button
                  onClick={() => setShowNewCustomerForm(true)}
                  className="px-3 h-8 rounded-md text-[12px] font-semibold transition-all"
                  style={showNewCustomerForm
                    ? { background: '#fff', color: '#1d4ed8', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }
                    : { color: '#64748b' }}
                >
                  New customer
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {!showNewCustomerForm ? (
                <CustomerSelection
                  customers={customers}
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={handleCustomerSelected}
                  showToggleButtons={false}
                />
              ) : (
                <CustomerForm
                  onCustomerCreated={handleCustomerCreated}
                  onCancel={() => setShowNewCustomerForm(false)}
                  showCard={false}
                  autoSave
                />
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 1 — Items
        ══════════════════════════════════════════ */}
        {step === 1 && (
          <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <OrderItemsList
                items={orderItems}
                onAddItem={addOrderItem}
                onUpdateItem={updateOrderItem}
                onRemoveItem={removeOrderItem}
                onSelectProduct={(item) => { setCurrentOrderItem(item); setShowProductSearch(true); }}
                products={realProducts}
                rawMaterials={rawMaterials}
              />
            </div>
            <FooterNav
              onBack={handleBack}
              onNext={() => setStep(2)}
              nextLabel="Next: Details"
              nextDisabled={!canGoNextFromItems}
              hint={!canGoNextFromItems ? (orderItems.length === 0 ? 'Add at least one item to continue' : 'Complete all item details to continue') : undefined}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 2 — Details + Address + Transport
        ══════════════════════════════════════════ */}
        {step === 2 && (
          <div className="flex-1 min-h-0 flex flex-col">

            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              {/* 2-column layout: left = order details + address, right = transport */}
              <div className="grid grid-cols-2 gap-4 h-full min-h-0">

                {/* LEFT column */}
                <div className="flex flex-col gap-4">
                  {/* Order details card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 pb-1 border-b border-slate-100">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></svg>
                      <span className="text-sm font-semibold text-slate-700">Order details</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">Delivery date <span className="text-red-500">*</span></Label>
                        <Input
                          type="date"
                          value={orderDetails.expectedDelivery}
                          onChange={e => setOrderDetails(p => ({ ...p, expectedDelivery: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                          className="h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">Advance paid (₹)</Label>
                        <Input
                          type="number"
                          value={orderDetails.paidAmount > 0 ? orderDetails.paidAmount : ''}
                          placeholder="0"
                          onChange={e => {
                            const v = validateNumberInput(e.target.value, ValidationPresets.PRICE);
                            const n = parseFloat(v.value) || 0;
                            if (total && n > total) { toast({ title: 'Invalid amount', description: `Cannot exceed ${formatCurrency(total, { full: true })}`, variant: 'destructive' }); return; }
                            setOrderDetails(p => ({ ...p, paidAmount: n }));
                          }}
                          onKeyDown={preventInvalidNumberKeys}
                          min="0" step="0.01"
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5 text-gray-400" /> Notes
                      </Label>
                      <Textarea
                        value={orderDetails.notes}
                        onChange={e => setOrderDetails(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Special instructions, notes for delivery…"
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Invoice remarks</Label>
                      <Textarea
                        value={orderDetails.remarks}
                        onChange={e => setOrderDetails(p => ({ ...p, remarks: e.target.value }))}
                        placeholder="Will appear on the invoice…"
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Delivery address card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-sm font-semibold text-slate-700">Delivery address</span>
                      </div>
                      {!orderDeliveryAddress && selectedCustomer && (
                        <button onClick={handleUseCustomerAddress} className="text-sm font-medium text-primary-600 hover:underline">
                          Use customer's address
                        </button>
                      )}
                    </div>
                    {orderDeliveryAddress ? (
                      <div className="flex items-start justify-between gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 leading-relaxed">
                          {[orderDeliveryAddress.address, orderDeliveryAddress.city, orderDeliveryAddress.state, orderDeliveryAddress.pincode].filter(Boolean).join(', ')}
                        </p>
                        <button onClick={() => setShowAddressEditor(true)} className="flex-shrink-0 text-green-700 hover:text-green-900 mt-0.5">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddressEditor(true)}
                        className="w-full h-10 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Set custom delivery address
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT column — Transport */}
                <div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 pb-1 border-b border-slate-100">
                      <Truck className="w-3.5 h-3.5" />
                      <span className="text-sm font-semibold text-slate-700">Transport info</span>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Type</Label>
                      <Select value={transportType} onValueChange={v => setTransportType(v as 'own' | 'outside' | '')}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Select transport type…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="own">Own</SelectItem>
                          <SelectItem value="outside">Outside</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Vehicle no.</Label>
                      <Input placeholder="MH-12-AB-1234" value={transportVehicleNo} onChange={e => setTransportVehicleNo(e.target.value)} className="h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Remark</Label>
                      <Input placeholder="Optional note about transport" value={transportRemark} onChange={e => setTransportRemark(e.target.value)} className="h-10 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <FooterNav
              onBack={handleBack}
              onNext={() => setStep(3)}
              nextLabel="Review order"
              nextDisabled={!orderDetails.expectedDelivery}
              hint={!orderDetails.expectedDelivery ? 'Set delivery date to continue' : undefined}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 3 — Review & Submit
        ══════════════════════════════════════════ */}
        {step === 3 && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">

              {/* ── Customer row ── */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 h-8 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</span>
                  <button onClick={() => setStep(0)} className="text-xs font-medium text-primary-600 hover:underline">Change</button>
                </div>
                <div className="grid grid-cols-[minmax(0,1.5fr)_1fr_1fr_1fr] gap-3 px-3 h-8 items-center bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">City</span>
                </div>
                <div className="grid grid-cols-[minmax(0,1.5fr)_1fr_1fr_1fr] gap-3 px-3 py-2.5 items-center">
                  <span className="text-sm font-semibold text-slate-900 truncate">{selectedCustomer?.name || '—'}</span>
                  <span className="text-sm text-slate-700 tabular-nums">{selectedCustomer?.phone || '—'}</span>
                  <span className="text-sm text-slate-600 font-mono truncate">{selectedCustomer?.gst_number || '—'}</span>
                  <span className="text-sm text-slate-700 truncate">{[selectedCustomer?.city, selectedCustomer?.state].filter(Boolean).join(', ') || '—'}</span>
                </div>
              </div>

              {/* ── Items table ── */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 h-8 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{orderItems.length} item{orderItems.length !== 1 ? 's' : ''}</span>
                  <button onClick={() => setStep(1)} className="text-xs font-medium text-primary-600 hover:underline">Edit</button>
                </div>
                <div className="grid grid-cols-[24px_minmax(0,1fr)_80px_96px_90px] gap-3 items-center px-3 h-8 border-b border-slate-200">
                  <span />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Qty</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Rate</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</span>
                </div>
                {orderItems.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-[24px_minmax(0,1fr)_80px_96px_90px] gap-3 items-center px-3 py-2 border-b border-slate-100 last:border-0">
                    <span className="text-xs font-bold text-slate-500 w-5 h-5 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                    <span className="text-sm font-medium text-slate-800 truncate">{item.product_name || '—'}</span>
                    <span className="text-sm text-slate-700 text-right tabular-nums">{item.quantity} {item.unit}</span>
                    <span className="text-sm text-slate-700 text-right tabular-nums">{formatCurrency(item.unit_price || 0, { full: true })}</span>
                    <span className="text-sm font-semibold text-primary-600 text-right tabular-nums">{formatCurrency(item.total_price || 0, { full: true })}</span>
                  </div>
                ))}
              </div>

              {/* ── Order details row ── */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 h-8 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Order details</span>
                  <button onClick={() => setStep(2)} className="text-xs font-medium text-primary-600 hover:underline">Edit</button>
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-100">
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Delivery date</p>
                    <p className="text-sm text-slate-800 font-medium">{orderDetails.expectedDelivery || '—'}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Transport</p>
                    <p className="text-sm text-slate-800 font-medium capitalize">{transportType ? `${transportType}${transportVehicleNo ? ` · ${transportVehicleNo}` : ''}` : '—'}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ship to</p>
                    <p className="text-sm text-slate-800 font-medium truncate">{orderDeliveryAddress?.city ? `${orderDeliveryAddress.city}, ${orderDeliveryAddress.state}` : '—'}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-slate-800 font-medium truncate">{orderDetails.notes || '—'}</p>
                  </div>
                </div>
              </div>

              {/* ── Totals + Paid ── */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr] divide-x divide-slate-100 border-b border-slate-100">
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subtotal</p>
                    <p className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(subtotal, { full: true })}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">GST</p>
                    <p className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(gstAmount, { full: true })}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Advance paid</p>
                    <p className="text-sm font-semibold text-emerald-700 tabular-nums">{formatCurrency(orderDetails.paidAmount || 0, { full: true })}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Balance due</p>
                    <p className="text-sm font-semibold text-amber-700 tabular-nums">{formatCurrency(Math.max(0, total - (orderDetails.paidAmount || 0)), { full: true })}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-primary-50">
                  <span className="text-sm font-semibold text-primary-700 uppercase tracking-wide">Order Total</span>
                  <span className="text-xl font-bold text-primary-700 tabular-nums">{formatCurrency(total, { full: true })}</span>
                </div>
              </div>

            </div>

            <FooterNav
              onBack={handleBack}
              onNext={handleSubmit}
              nextLabel={isSubmitting ? 'Placing order…' : 'Place order'}
              nextDisabled={isSubmitting || orderItems.length === 0}
            />
          </div>
        )}

        {/* Dialogs */}
        <ProductMaterialSelectionDialog
          isOpen={showProductSearch}
          onClose={() => { setShowProductSearch(false); setProductSearchTerm(''); setProductPage(1); setMaterialPage(1); }}
          currentItem={currentOrderItem}
          products={realProducts}
          materials={rawMaterials}
          productSearchTerm={productSearchTerm}
          onSearchChange={setProductSearchTerm}
          onSelectProduct={(productId) => {
            if (currentOrderItem) {
              updateOrderItem(currentOrderItem.id, 'product_id', productId);
              setShowProductSearch(false); setProductSearchTerm(''); setProductCategoryFilter('all'); setProductColorFilter('all');
            }
          }}
          productPage={productPage}
          materialPage={materialPage}
          productItemsPerPage={productItemsPerPage}
          materialItemsPerPage={materialItemsPerPage}
          onProductPageChange={setProductPage}
          onMaterialPageChange={setMaterialPage}
          productSortBy={productSortBy}
          productSortOrder={productSortOrder}
          materialSortBy={materialSortBy}
          materialSortOrder={materialSortOrder}
          onProductSortChange={(s, o) => { setProductSortBy(s); setProductSortOrder(o); setProductPage(1); }}
          onMaterialSortChange={(s, o) => { setMaterialSortBy(s); setMaterialSortOrder(o); setMaterialPage(1); }}
        />

        <DeliveryAddressDialog
          isOpen={showAddressEditor}
          onClose={() => setShowAddressEditor(false)}
          address={orderDeliveryAddress}
          onSave={addr => { setOrderDeliveryAddress(addr); setShowAddressEditor(false); }}
        />
      </div>
    </Layout>
  );
}
