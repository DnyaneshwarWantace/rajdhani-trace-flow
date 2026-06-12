import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trash2,
  Plus,
  CheckCircle,
  Copy,
  ArrowDown,
  Layers,
  FileDown,
  ArrowLeft,
  Info,
  RefreshCw,
  Hash,
  Save,
  Grid,
  Download,
  X,
  MapPin,
  ChevronRight,
  Clipboard,
  Package,
  Loader2,
  Check,
} from 'lucide-react';
import { IndividualProductService } from '@/services/individualProductService';
import { DropdownService } from '@/services/dropdownService';
import { downloadQRsAsPdf, type ProductInfo } from '@/utils/qrPdfExport';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { IndividualProduct } from '@/types/product';
import { useNavigate } from 'react-router-dom';

function weightKgFromRow(item: IndividualProduct): number | null {
  const gsm = parseFloat((item.final_weight || '').toString().replace(/[^\d.]/g, ''));
  const lengthStr = (item.final_length || '').toString();
  const widthStr = (item.final_width || '').toString();
  let lengthM = parseFloat(lengthStr.replace(/[^\d.]/g, ''));
  let widthM = parseFloat(widthStr.replace(/[^\d.]/g, ''));
  if (lengthStr.toLowerCase().includes('feet')) lengthM *= 0.3048;
  if (widthStr.toLowerCase().includes('feet')) widthM *= 0.3048;
  if (!isNaN(gsm) && !isNaN(lengthM) && !isNaN(widthM) && gsm > 0 && lengthM > 0 && widthM > 0) {
    return (gsm * lengthM * widthM) / 1000;
  }
  return null;
}

function getRollNumberDatePrefix(dateInput?: string): string {
  const source = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(source.getTime())) {
    const fallback = new Date();
    const mm = String(fallback.getMonth() + 1).padStart(2, '0');
    const yy = fallback.getFullYear().toString().slice(-2);
    return `${mm}-${yy}-`;
  }
  const mm = String(source.getMonth() + 1).padStart(2, '0');
  const yy = source.getFullYear().toString().slice(-2);
  return `${mm}-${yy}-`;
}

function normalizeRollNumberInput(rawValue: string, productionDate?: string): string {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return '';
  const prefix = getRollNumberDatePrefix(productionDate);
  if (trimmed.startsWith(prefix)) return trimmed;
  if (/^\d+$/.test(trimmed)) return `${prefix}${trimmed}`;
  return trimmed;
}

interface IndividualProductsTableProps {
  individualProducts: IndividualProduct[];
  onUpdate: () => void;
  product?: {
    name?: string;
    category?: string;
    color?: string;
    pattern?: string;
    weight_unit?: string;
    width_unit?: string;
    length_unit?: string;
    weight?: string;
    width?: string;
    length?: string;
  };
  plannedQuantity?: number;
  batchId?: string;
  productId?: string;
  onComplete?: () => void;
  canComplete?: boolean;
  onCanCompleteChange?: (canComplete: boolean) => void;
  onCreatedProductsCountChange?: (count: number) => void;
  /** Button label when onComplete is provided. Default: "Complete Production" */
  actionLabel?: string;
  /** Set to true when another user has completed this stage — disables Add Row and editing */
  stageCompleted?: boolean;
  /** Live count of saved rows from DB (updated by polling) */
  dbSavedCount?: number;
  /** Called when backend confirms stage is already completed (409 response) */
  onStageCompleted?: () => void;
  mobileBatch?: any;
  mobileConsumedMaterials?: any[];
}

export default function IndividualProductsTable({
  individualProducts,
  onUpdate,
  product,
  plannedQuantity = 0,
  batchId,
  productId,
  onComplete,
  canComplete = false,
  onCanCompleteChange,
  onCreatedProductsCountChange,
  actionLabel = 'Complete Production',
  stageCompleted = false,
  dbSavedCount = 0,
  onStageCompleted,
  mobileBatch,
  mobileConsumedMaterials = [],
}: IndividualProductsTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { patternImageMap, colorCodeMap } = useDropdownVisualMaps();
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [localProducts, setLocalProducts] = useState<IndividualProduct[]>(individualProducts);
  // Ref stays in sync with localProducts so async handlers always read the latest value
  // even when React state hasn't re-rendered yet (e.g. onBlur + onValueChange racing)
  const localProductsRef = useRef<IndividualProduct[]>(individualProducts);
  const setLocalProductsSync = (products: IndividualProduct[]) => {
    localProductsRef.current = products;
    setLocalProducts(products);
  };

  // After any save, merge backend's full batch product list so other users' rows appear immediately.
  // Keeps the current user's local ordering; appends any new rows from other users at the end.
  const mergeFromBatch = (current: IndividualProduct[], batchProducts: IndividualProduct[]): IndividualProduct[] => {
    const byId = new Map(current.map(p => [p.id, p]));
    const merged = current.map(p => {
      const fresh = batchProducts.find(b => b.id === p.id);
      return fresh ?? p;
    });
    batchProducts.forEach(b => {
      if (!byId.has(b.id)) {
        byId.set(b.id, b);
        merged.push(b);
      }
    });
    return merged;
  };
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedRowData, setCopiedRowData] = useState<{final_length?: string; final_width?: string; final_weight?: string; roll_number?: string; location?: string} | null>(null);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationValue, setNewLocationValue] = useState('');
  const [mobileLocationPicker, setMobileLocationPicker] = useState<{ index: number } | null>(null);
  const [creatingTempRowId, setCreatingTempRowId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Mobile UI States
  const [showGenModal, setShowGenModal] = useState(false);
  const [genStartNo, setGenStartNo] = useState('');
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [infoTab, setInfoTab] = useState<'product' | 'materials'>('product');
  const [qrMode, setQrMode] = useState(false);
  const [selectedQrIds, setSelectedQrIds] = useState<Set<string>>(new Set());
  const [showQrSheet, setShowQrSheet] = useState(false);

  // Load storage locations from dropdown service
  useEffect(() => {
    loadStorageLocations();
  }, []);

  const loadStorageLocations = async () => {
    try {
      const locations = await DropdownService.getDropdownsByCategory('storage_location');
      setLocationOptions(locations.map(loc => loc.value));
    } catch (error) {
      console.error('Error loading storage locations:', error);
      // Fallback to default locations if API fails
      setLocationOptions([
        'First Floor - Zone A - Section 1',
        'First Floor - Zone B - Section 1',
        'First Floor - Zone C - Section 1',
        'Second Floor - Zone A',
        'Second Floor - Zone B',
        'Ground Floor - Zone A',
        'Ground Floor - Zone B',
      ]);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationValue.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a location name',
        variant: 'destructive',
      });
      return;
    }

    try {
      await DropdownService.createDropdown({
        category: 'storage_location',
        value: newLocationValue.trim(),
        display_order: locationOptions.length + 1,
        is_active: true,
      });

      toast({
        title: 'Success',
        description: 'Location added successfully',
      });

      setNewLocationValue('');
      setIsAddingLocation(false);
      await loadStorageLocations();
    } catch (error: any) {
      console.error('Error adding location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add location',
        variant: 'destructive',
      });
    }
  };

  // Sync from backend without reordering: preserve local row order, update by id, append only new rows
  useEffect(() => {
    if (!productId || plannedQuantity <= 0) return;

    const backendProducts = individualProducts.filter(p => !p.id.startsWith('temp-'));
    const backendById = new Map(backendProducts.map(p => [p.id, p]));

    let merged: IndividualProduct[];

    if (localProducts.length === 0) {
      // Initial load: use backend order, then fill to plannedQuantity with temp rows
      merged = [...backendProducts];
    } else {
      // Preserve local order: for each local row, use backend data if same id, else keep local
      merged = localProducts.map(localP => backendById.get(localP.id) ?? localP);
      // Append any backend products that aren't in local (e.g. created in another tab)
      backendProducts.forEach(b => {
        if (!localProducts.some(l => l.id === b.id)) merged.push(b);
      });
    }

    // Only append temp rows at the end if we're under plannedQuantity (never insert in middle)
    if (merged.length < plannedQuantity) {
      const toAdd = plannedQuantity - merged.length;
      for (let i = 0; i < toAdd; i++) {
        merged.push({
          _id: `temp-${Date.now()}-${i}`,
          id: `temp-${Date.now()}-${i}`,
          product_id: productId,
          qr_code: '',
          serial_number: '',
          status: 'available',
          production_date: new Date().toISOString().split('T')[0],
          batch_number: batchId || '',
          final_weight: '',
          final_width: '',
          final_length: '',
          inspector: '',
          location: '',
          notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as IndividualProduct);
      }
    }

    // Deduplicate by id before committing (guards against location-filter subset + full batchProducts merge)
    const seen = new Set<string>();
    const deduped = merged.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const localIds = localProducts.map(p => p.id).join(',');
    const mergedIds = deduped.map(p => p.id).join(',');
    if (localIds !== mergedIds || deduped.length !== localProducts.length) {
      setLocalProductsSync(deduped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [individualProducts, plannedQuantity, productId, batchId]);

  // Calculate canComplete: all existing rows must have required fields filled
  // If there are empty rows, user must delete them before completing
  useEffect(() => {
    if (!onCanCompleteChange) return;

    const requiredFields = ['final_weight', 'final_width', 'final_length', 'location', 'roll_number'];
    const allRowsComplete = localProducts.length > 0 && localProducts.every(product => 
      requiredFields.every(field => {
        const value = product[field as keyof IndividualProduct];
        return value && typeof value === 'string' && value.trim() !== '';
      })
    );

    onCanCompleteChange(allRowsComplete);
  }, [localProducts, onCanCompleteChange]);

  // Update parent with current created products count (real-time)
  useEffect(() => {
    if (!onCreatedProductsCountChange) return;
    
    const createdCount = localProducts.filter(p => 
      p.id && !p.id.startsWith('temp-')
    ).length;
    
    onCreatedProductsCountChange(createdCount);
  }, [localProducts, onCreatedProductsCountChange]);

  const isTempRowReady = (row: IndividualProduct): boolean => {
    if (!row?.id?.startsWith('temp-')) return false;
    return Boolean(
      row.final_weight &&
      row.final_width &&
      row.final_length &&
      row.location &&
      row.roll_number &&
      productId
    );
  };

  const createTempRowIfReady = async (rowIndex: number) => {
    const tempProduct = localProductsRef.current[rowIndex];
    if (!tempProduct || !isTempRowReady(tempProduct)) return;

    const candidateRoll = normalizeRollNumberInput(tempProduct.roll_number || '', tempProduct.production_date);
    const duplicate = localProductsRef.current.find((p, i) => {
      if (i === rowIndex || p.id.startsWith('temp-')) return false;
      const existingRoll = normalizeRollNumberInput(p.roll_number || '', p.production_date);
      return existingRoll === candidateRoll;
    });
    if (duplicate) {
      toast({
        title: 'Duplicate Roll Number',
        description: `Roll number "${candidateRoll}" is already used in this product. Please use a unique roll number.`,
        variant: 'destructive',
      });
      return;
    }

    setCreatingTempRowId(tempProduct.id);
    try {
      const { product: newProduct, batchProducts } = await IndividualProductService.createIndividualProduct({
        product_id: productId || '',
        qr_code: tempProduct.qr_code || '',
        serial_number: tempProduct.serial_number || '',
        roll_number: candidateRoll,
        status: 'available',
        final_length: tempProduct.final_length || '',
        final_width: tempProduct.final_width || '',
        final_weight: tempProduct.final_weight || '',
        inspector: user?.full_name || user?.email || 'System',
        location: tempProduct.location || 'Warehouse A - General Storage',
        notes: tempProduct.notes || '',
        production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
        batch_number: batchId || '',
      });

      const updated = [...localProductsRef.current];
      updated[rowIndex] = newProduct;
      setLocalProductsSync(mergeFromBatch(updated, batchProducts));

      if (newProduct._batchCount?.over) {
        toast({
          title: 'Extra Roll Saved',
          description: `Roll saved. You now have ${newProduct._batchCount.saved} rolls — ${newProduct._batchCount.saved - newProduct._batchCount.planned} more than planned (${newProduct._batchCount.planned}).`,
        });
      } else {
        toast({
          title: 'Saved to Stock',
          description: `Roll ${newProduct.roll_number || newProduct.id} added and QR generated.`,
        });
      }
      onUpdate?.();
    } catch (error) {
      console.error('Error creating individual product:', error);
      const msg = error instanceof Error ? error.message : 'Failed to create individual product';
      if (msg.toLowerCase().includes('already completed')) {
        onStageCompleted?.();
        toast({ title: 'Stage Completed', description: msg, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    } finally {
      setCreatingTempRowId(null);
    }
  };

  // Auto-create temp row as soon as all required fields are filled.
  useEffect(() => {
    if (creatingTempRowId || saving || editingCell) return;
    const readyIndex = localProducts.findIndex((row) => isTempRowReady(row));
    if (readyIndex >= 0) {
      void createTempRowIfReady(readyIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localProducts, creatingTempRowId, saving, editingCell]);

  const handleBulkDownloadQrs = async () => {
    const rowsWithQr = localProducts.filter((item) => !item.id.startsWith('temp-') && item.qr_code);
    if (rowsWithQr.length === 0) {
      toast({ title: 'No QR codes', description: 'No generated rows available for QR PDF download.', variant: 'destructive' });
      return;
    }
    setDownloadingPdf(true);
    toast({ title: 'Generating PDF…', description: `Preparing ${rowsWithQr.length} QR codes, please wait.` });
    try {
      const productName = product?.name || rowsWithQr[0]?.product_name || 'Production Batch';
      const productInfo: ProductInfo = {
        name: productName,
        color: product?.color,
        pattern: product?.pattern,
        patternImageUrl: product?.pattern ? patternImageMap[product.pattern] : undefined,
        length: product?.length,
        length_unit: product?.length_unit,
        width: product?.width,
        width_unit: product?.width_unit,
        weight: product?.weight,
        weight_unit: product?.weight_unit,
      };
      await downloadQRsAsPdf(
        rowsWithQr,
        `QR Codes — ${productName}`,
        `production-qr-codes.pdf`,
        undefined,
        productInfo
      );
      toast({ title: 'PDF Downloaded', description: `${rowsWithQr.length} QR codes saved as PDF.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCellClick = (row: number, col: string) => {
    const productItem = localProducts[row];
    let value = '';
    
    // Clear validation error when starting to edit
    setValidationError(null);
    
    switch (col) {
      case 'final_weight': {
        // GSM only input (no kg conversion input).
        value = (productItem.final_weight || '').replace(/[^\d.]/g, '');
        break;
      }
      case 'final_width':
        const widthValue = productItem.final_width || '';
        value = widthValue.replace(/[^\d.]/g, '');
        break;
      case 'final_length':
        const lengthValue = productItem.final_length || '';
        value = lengthValue.replace(/[^\d.]/g, '');
        break;
      case 'location':
        value = productItem.location || 'Warehouse A - General Storage';
        break;
      case 'roll_number':
        value = productItem.roll_number || getRollNumberDatePrefix(productItem.production_date);
        break;
      case 'notes':
        value = productItem.notes || '';
        break;
      default:
        value = '';
    }
    
    setEditValue(value);
    setEditingCell({ row, col });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    const { row, col } = editingCell;
    // Use ref so we always get the latest state even if a select change fired just before blur
    const productItem = localProductsRef.current[row];
    
    try {
      setSaving(productItem.id);
      
      let valueToSave = editValue.trim();
      
      // Validate numeric input only (no expected-range restrictions).
      if (col === 'final_weight' || col === 'final_length' || col === 'final_width') {
        if (!valueToSave) {
          setSaving(null);
          setEditingCell(null);
          return;
        }

        // Extract numeric value from entered value
        const enteredNumeric = parseFloat(valueToSave.replace(/[^\d.]/g, ''));
        if (isNaN(enteredNumeric)) {
          toast({
            title: 'Invalid Value',
            description: 'Please enter a valid number',
            variant: 'destructive',
          });
          setSaving(null);
          return;
        }

        setValidationError(null);
      }

      // Location is mandatory
      if (col === 'location') {
        if (!valueToSave) {
          toast({
            title: 'Location required',
            description: 'Please select a storage location.',
            variant: 'destructive',
          });
          setSaving(null);
          return;
        }
      }

      if (col === 'roll_number') {
        valueToSave = normalizeRollNumberInput(valueToSave, productItem.production_date);
        const expectedPrefix = getRollNumberDatePrefix(productItem.production_date);
        if (!valueToSave || valueToSave === expectedPrefix) {
          toast({
            title: 'Roll number required',
            description: `Enter serial after prefix ${expectedPrefix} (example: ${expectedPrefix}1).`,
            variant: 'destructive',
          });
          setSaving(null);
          return;
        }
      }

      // Clear validation error for non-dimension fields
      if (col !== 'final_weight' && col !== 'final_length' && col !== 'final_width') {
        setValidationError(null);
      }

      // For final_weight: GSM-only input.
      if (col === 'final_weight' && valueToSave && !valueToSave.match(/[a-zA-Z]/)) {
        const gsmValue = parseFloat(valueToSave.replace(/[^\d.]/g, ''));
        if (!isNaN(gsmValue)) valueToSave = gsmValue.toString();
        if (!valueToSave.includes('GSM')) {
          const weightUnit = product?.weight_unit || (product?.weight?.includes('GSM') ? 'GSM' : 'GSM');
          valueToSave = `${valueToSave} ${weightUnit}`;
        }
      } else if (col === 'final_width' && valueToSave && !valueToSave.match(/[a-zA-Z]/)) {
        const widthUnit = product?.width_unit || 
          (product?.width?.includes('feet') ? 'feet' : 
           product?.width?.includes('m') ? 'm' : 'm');
        valueToSave = `${valueToSave} ${widthUnit}`;
      } else if (col === 'final_length' && valueToSave && !valueToSave.match(/[a-zA-Z]/)) {
        const lengthUnit = product?.length_unit || 
          (product?.length?.includes('feet') ? 'feet' : 
           product?.length?.includes('m') ? 'm' : 'm');
        valueToSave = `${valueToSave} ${lengthUnit}`;
      }
      
      const updateData: any = {};
      updateData[col] = valueToSave;

      // Update local state first — use ref to avoid stale state from concurrent saves
      const updated = [...localProductsRef.current];
      updated[row] = { ...updated[row], ...updateData };
      setLocalProductsSync(updated);

      // If product has a real ID (not temp ID), update it
      if (productItem.id && !productItem.id.startsWith('temp-')) {
        await IndividualProductService.updateIndividualProduct(productItem.id, updateData);
        onUpdate?.();
        toast({
          title: 'Saved',
          description: 'Product details saved successfully',
        });
        setEditingCell(null);
        setEditValue('');
        setValidationError(null);
      } else if (productItem.id && productItem.id.startsWith('temp-')) {
        // For temp products, check if we have enough data to create it
        const tempProduct = updated[row];
        const hasRequiredFields = tempProduct.final_weight &&
                                  tempProduct.final_width &&
                                  tempProduct.final_length &&
                                  tempProduct.location &&
                                  tempProduct.roll_number &&
                                  productId;
        
        // Only create if this is the last required field being filled
        if (hasRequiredFields && (col === 'final_weight' || col === 'final_width' || col === 'final_length' || col === 'roll_number' || col === 'location')) {
          // Check for duplicate roll_number within this batch
          const candidateRoll = normalizeRollNumberInput(tempProduct.roll_number || '', tempProduct.production_date);
          const duplicate = localProductsRef.current.find((p, i) => {
            if (i === row || p.id.startsWith('temp-')) return false;
            const existingRoll = normalizeRollNumberInput(p.roll_number || '', p.production_date);
            return existingRoll === candidateRoll;
          });
          if (duplicate) {
            toast({
              title: 'Duplicate Roll Number',
              description: `Roll number "${tempProduct.roll_number}" is already used in this batch. Please use a unique roll number.`,
              variant: 'destructive',
            });
            setSaving(null);
            setEditingCell(null);
            setEditValue('');
            return;
          }
          try {
            // Create the individual product — always available immediately
            const { product: newProduct, batchProducts } = await IndividualProductService.createIndividualProduct({
              product_id: productId,
              qr_code: tempProduct.qr_code || '',
              serial_number: tempProduct.serial_number || '',
              roll_number: candidateRoll,
              status: 'available',
              final_length: tempProduct.final_length || '',
              final_width: tempProduct.final_width || '',
              final_weight: tempProduct.final_weight || '',
              inspector: user?.full_name || user?.email || 'System',
              location: tempProduct.location || 'Warehouse A - General Storage',
              notes: tempProduct.notes || '',
              production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
              batch_number: batchId || '',
            });

            // Update local state with the real product, then merge any rows other users saved
            updated[row] = newProduct;
            setLocalProductsSync(mergeFromBatch(updated, batchProducts));

            toast({
              title: 'Saved to Stock',
              description: `Roll ${newProduct.roll_number || newProduct.id} added to stock and available immediately`,
            });
            onUpdate?.();
          } catch (error) {
            console.error('Error creating individual product:', error);
            const msg = error instanceof Error ? error.message : 'Failed to create individual product';
            if (msg.toLowerCase().includes('already completed')) {
              onStageCompleted?.();
              toast({ title: 'Stage Completed', description: msg, variant: 'destructive' });
            } else {
              toast({ title: 'Error', description: msg, variant: 'destructive' });
            }
          }
        }
      }
      
      setEditingCell(null);
      setEditValue('');
      setValidationError(null);
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update product details',
        variant: 'destructive',
      });
      // Revert local state on error
      const reverted = [...localProducts];
      reverted[row] = productItem;
      setLocalProductsSync(reverted);
    } finally {
      setSaving(null);
    }
  };

  const handleSelectChange = async (row: number, field: string, value: string) => {
    // Use ref to get latest state — cell input blur may have updated state just before this fires
    const productItem = localProductsRef.current[row];

    try {
      setSaving(productItem.id);

      const updateData: any = {};
      updateData[field] = value;

      // Update local state first — use ref to avoid stale state from concurrent saves
      const updated = [...localProductsRef.current];
      updated[row] = { ...updated[row], ...updateData };
      setLocalProductsSync(updated);
      
      // If product has a real ID (not temp ID), update it
      if (productItem.id && !productItem.id.startsWith('temp-')) {
        await IndividualProductService.updateIndividualProduct(productItem.id, updateData);
        onUpdate?.();
      } else if (productItem.id && productItem.id.startsWith('temp-')) {
        // For temp products, check if we have enough data to create it
        const tempProduct = updated[row];
        const hasRequiredFields = tempProduct.final_weight &&
                                  tempProduct.final_width &&
                                  tempProduct.final_length &&
                                  tempProduct.roll_number &&
                                  tempProduct.location &&
                                  productId;

        // Only create if all required fields are now filled
        if (hasRequiredFields) {
          // Check for duplicate roll_number within this batch
          const candidateRoll = normalizeRollNumberInput(tempProduct.roll_number || '', tempProduct.production_date);
          const duplicate = localProductsRef.current.find((p, i) => {
            if (i === row || p.id.startsWith('temp-')) return false;
            const existingRoll = normalizeRollNumberInput(p.roll_number || '', p.production_date);
            return existingRoll === candidateRoll;
          });
          if (duplicate) {
            toast({
              title: 'Duplicate Roll Number',
              description: `Roll number "${tempProduct.roll_number}" is already used by another product in this batch. Please use a unique roll number.`,
              variant: 'destructive',
            });
            setSaving(null);
            return;
          }
          try {
            // Create the individual product
            const { product: newProduct, batchProducts } = await IndividualProductService.createIndividualProduct({
              product_id: productId,
              qr_code: tempProduct.qr_code || '',
              serial_number: tempProduct.serial_number || '',
              roll_number: candidateRoll,
              status: 'available',
              final_length: tempProduct.final_length || '',
              final_width: tempProduct.final_width || '',
              final_weight: tempProduct.final_weight || '',
              inspector: user?.full_name || user?.email || 'System',
              location: tempProduct.location || 'Warehouse A - General Storage',
              notes: tempProduct.notes || '',
              production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
              batch_number: batchId || '',
            });

            // Update local state with the real product, then merge any rows other users saved
            updated[row] = newProduct;
            setLocalProductsSync(mergeFromBatch(updated, batchProducts));

            toast({
              title: 'Saved to Stock',
              description: `Roll ${newProduct.roll_number || newProduct.id} added to stock and available immediately`,
            });
            onUpdate?.();
          } catch (error) {
            console.error('Error creating individual product:', error);
            const msg = error instanceof Error ? error.message : 'Failed to create individual product';
            if (msg.toLowerCase().includes('already completed')) {
              onStageCompleted?.();
              toast({ title: 'Stage Completed', description: msg, variant: 'destructive' });
            } else {
              toast({ title: 'Error', description: msg, variant: 'destructive' });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update product details',
        variant: 'destructive',
      });
      // Revert local state on error
      const reverted = [...localProducts];
      reverted[row] = productItem;
      setLocalProductsSync(reverted);
    } finally {
      setSaving(null);
    }
  };

  const handleAddRow = () => {
    const newProduct: IndividualProduct = {
      _id: `temp-${Date.now()}`,
      id: `temp-${Date.now()}`,
      product_id: productId || '',
      qr_code: '',
      serial_number: '',
      roll_number: '',
      status: 'available', // Default to available
      production_date: new Date().toISOString().split('T')[0],
      batch_number: batchId || '',
      final_weight: '',
      final_width: '',
      final_length: '',
      inspector: '',
      location: '',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLocalProductsSync([...localProducts, newProduct]);
  };

  const handleCopyRow = (index: number) => {
    const productToCopy = localProducts[index];
    
    // Ensure clean string values
    const final_length = productToCopy.final_length ? String(productToCopy.final_length).trim() : '';
    const final_width = productToCopy.final_width ? String(productToCopy.final_width).trim() : '';
    const final_weight = productToCopy.final_weight ? String(productToCopy.final_weight).trim() : '';
    
    const location = productToCopy.location ? String(productToCopy.location).trim() : '';
    setCopiedRowData({
      final_length,
      final_width,
      final_weight,
      location,
    });
    toast({
      title: 'Copied',
      description: 'Row values copied. Click "Paste" on another row or use "Fill Down" to copy to rows below.',
    });
  };

  const handleFillDownField = async (index: number, field: 'final_length' | 'final_width' | 'final_weight') => {
    const sourceRow = localProducts[index];
    const sourceValue = sourceRow[field];
    
    // Ensure value is a clean string
    const cleanValue = sourceValue ? String(sourceValue).trim() : '';
    if (!cleanValue) {
      toast({
        title: 'No Value',
        description: `This row has no ${field.replace('final_', '')} value to copy.`,
        variant: 'destructive',
      });
      return;
    }

    // Copy to the next row only
    if (index + 1 >= localProducts.length) {
      toast({
        title: 'No Rows Below',
        description: 'This is the last row. Nothing to fill down.',
        variant: 'destructive',
      });
      return;
    }

    const targetIndex = index + 1;
    const targetRow = localProducts[targetIndex];
    const updated = [...localProducts];

    // Copy only the specific field with clean value
    updated[targetIndex] = {
      ...targetRow,
      [field]: cleanValue,
    };

    setLocalProductsSync(updated);

    // Check if all required fields are now filled after this update
    const tempProduct = updated[targetIndex];
    const hasRequiredFields = tempProduct.final_weight && 
                              tempProduct.final_width && 
                              tempProduct.final_length &&
                              productId;

    // Auto-save if it's a real product
    if (targetRow.id && !targetRow.id.startsWith('temp-')) {
      try {
        await IndividualProductService.updateIndividualProduct(targetRow.id, {
          [field]: cleanValue,
        });
        onUpdate?.();
        toast({
          title: 'Filled Down',
          description: `${field.replace('final_', '').charAt(0).toUpperCase() + field.replace('final_', '').slice(1)} (${cleanValue}) copied to next row and saved.`,
        });
      } catch (error) {
        console.error('Error updating product:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save value',
          variant: 'destructive',
        });
        // Revert on error
        setLocalProductsSync(localProducts);
      }
    } else if (targetRow.id && targetRow.id.startsWith('temp-') && hasRequiredFields) {
      // For temp products, if all required fields are now filled, create the product
      try {
        const { product: newProduct, batchProducts } = await IndividualProductService.createIndividualProduct({
          product_id: productId!,
          qr_code: tempProduct.qr_code || '',
          serial_number: tempProduct.serial_number || '',
          status: tempProduct.status || 'available',
          final_length: tempProduct.final_length || '',
          final_width: tempProduct.final_width || '',
          final_weight: tempProduct.final_weight || '',
          inspector: user?.full_name || user?.email || 'System',
          location: tempProduct.location || 'Warehouse A - General Storage',
          notes: tempProduct.notes || '',
          production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
          batch_number: batchId || '',
        });
        
        updated[targetIndex] = newProduct;
        setLocalProductsSync(mergeFromBatch(updated, batchProducts));
        
        toast({
          title: 'Filled Down & Created',
          description: `${field.replace('final_', '').charAt(0).toUpperCase() + field.replace('final_', '').slice(1)} copied and product created successfully.`,
        });
        onUpdate?.();
      } catch (error) {
        console.error('Error creating individual product:', error);
        const msg = error instanceof Error ? error.message : 'Failed to create individual product';
        if (msg.toLowerCase().includes('already completed')) {
          onStageCompleted?.();
          toast({ title: 'Stage Completed', description: msg, variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: msg, variant: 'destructive' });
        }
      }
    } else {
      toast({
        title: 'Filled Down',
        description: `${field.replace('final_', '').charAt(0).toUpperCase() + field.replace('final_', '').slice(1)} (${cleanValue}) copied to next row.`,
      });
    }
  };

  // Copy location from this row to the next row
  const handleFillDownLocation = async (index: number) => {
    const sourceRow = localProducts[index];
    const cleanLocation = (sourceRow.location || '').trim();

    if (!cleanLocation) {
      toast({
        title: 'No Location',
        description: 'This row has no location to copy.',
        variant: 'destructive',
      });
      return;
    }

    if (index + 1 >= localProducts.length) {
      toast({
        title: 'No Rows Below',
        description: 'This is the last row. Nothing to fill down.',
        variant: 'destructive',
      });
      return;
    }

    const targetIndex = index + 1;
    const targetRow = localProducts[targetIndex];
    const updated = [...localProducts];

    updated[targetIndex] = {
      ...targetRow,
      location: cleanLocation,
    };

    setLocalProductsSync(updated);

    const tempProduct = updated[targetIndex];
    const hasRequiredFields =
      tempProduct.final_weight &&
      tempProduct.final_width &&
      tempProduct.final_length &&
      tempProduct.location &&
      productId;

    // Save for existing product row
    if (targetRow.id && !targetRow.id.startsWith('temp-')) {
      try {
        await IndividualProductService.updateIndividualProduct(targetRow.id, {
          location: cleanLocation,
        });
        onUpdate?.();
        toast({
          title: 'Location Filled Down',
          description: `Location (${cleanLocation}) copied to next row and saved.`,
        });
      } catch (error) {
        console.error('Error updating product location:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save location',
          variant: 'destructive',
        });
        // Revert on error
        setLocalProductsSync(localProducts);
      }
    } else if (targetRow.id && targetRow.id.startsWith('temp-') && hasRequiredFields) {
      // For temp products, if all required fields are now filled (including location), create the product
      try {
        const { product: newProduct, batchProducts } = await IndividualProductService.createIndividualProduct({
          product_id: productId!,
          qr_code: tempProduct.qr_code || '',
          serial_number: tempProduct.serial_number || '',
          status: tempProduct.status || 'available',
          final_length: tempProduct.final_length || '',
          final_width: tempProduct.final_width || '',
          final_weight: tempProduct.final_weight || '',
          inspector: user?.full_name || user?.email || 'System',
          location: tempProduct.location || 'Warehouse A - General Storage',
          notes: tempProduct.notes || '',
          production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
          batch_number: batchId || '',
        });

        updated[targetIndex] = newProduct;
        setLocalProductsSync(mergeFromBatch(updated, batchProducts));

        toast({
          title: 'Location Filled Down & Created',
          description: `Location copied and product created successfully.`,
        });
        onUpdate?.();
      } catch (error) {
        console.error('Error creating individual product:', error);
        const msg = error instanceof Error ? error.message : 'Failed to create individual product';
        if (msg.toLowerCase().includes('already completed')) {
          onStageCompleted?.();
          toast({ title: 'Stage Completed', description: msg, variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: msg, variant: 'destructive' });
        }
      }
    } else {
      toast({
        title: 'Location Filled Down',
        description: `Location (${cleanLocation}) copied to next row.`,
      });
    }
  };

  const handleFillDown = async (index: number) => {
    const sourceRow = localProducts[index];
    
    // Get actual values from source row (don't use empty string fallback)
    const sourceData: {final_length?: string; final_width?: string; final_weight?: string} = {};
    
    if (sourceRow.final_length) sourceData.final_length = sourceRow.final_length;
    if (sourceRow.final_width) sourceData.final_width = sourceRow.final_width;
    if (sourceRow.final_weight) sourceData.final_weight = sourceRow.final_weight;

    if (!sourceData.final_length && !sourceData.final_width && !sourceData.final_weight) {
      toast({
        title: 'No Data',
        description: 'This row has no values to copy. Please fill in at least one field first.',
        variant: 'destructive',
      });
      return;
    }

    // Copy to the next row only (one row at a time for better control)
    if (index + 1 >= localProducts.length) {
      toast({
        title: 'No Rows Below',
        description: 'This is the last row. Nothing to fill down.',
        variant: 'destructive',
      });
      return;
    }

    const targetIndex = index + 1;
    const targetRow = localProducts[targetIndex];
    const updated = [...localProducts];

    // Copy only the fields that have values in source row
    const updateData: {final_length?: string; final_width?: string; final_weight?: string} = {};
    if (sourceData.final_length) updateData.final_length = sourceData.final_length;
    if (sourceData.final_width) updateData.final_width = sourceData.final_width;
    if (sourceData.final_weight) updateData.final_weight = sourceData.final_weight;

    // Copy values from source row to next row (only overwrite fields that exist in source)
    updated[targetIndex] = {
      ...targetRow,
      ...updateData,
    };

    setLocalProductsSync(updated);

    // Check if target row (temp) now has all required fields for auto-create
    const tempProduct = updated[targetIndex];
    const hasRequiredFields = tempProduct.final_weight &&
      tempProduct.final_width &&
      tempProduct.final_length &&
      productId;

    // Auto-save if it's a real product
    if (targetRow.id && !targetRow.id.startsWith('temp-') && Object.keys(updateData).length > 0) {
      try {
        await IndividualProductService.updateIndividualProduct(targetRow.id, updateData);
        onUpdate?.();
        toast({
          title: 'Filled Down',
          description: `Copied ${Object.keys(updateData).length} field(s) to next row and saved.`,
        });
      } catch (error) {
        console.error('Error updating product:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save values',
          variant: 'destructive',
        });
      }
    } else if (targetRow.id && targetRow.id.startsWith('temp-') && hasRequiredFields) {
      // For temp row: full-row fill down filled all required fields → create product so QR code is generated
      try {
        const { product: newProduct, batchProducts } = await IndividualProductService.createIndividualProduct({
          product_id: productId!,
          qr_code: tempProduct.qr_code || '',
          serial_number: tempProduct.serial_number || '',
          status: tempProduct.status || 'available',
          final_length: tempProduct.final_length || '',
          final_width: tempProduct.final_width || '',
          final_weight: tempProduct.final_weight || '',
          inspector: user?.full_name || user?.email || 'System',
          location: tempProduct.location || 'Warehouse A - General Storage',
          notes: tempProduct.notes || '',
          production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
          batch_number: batchId || '',
        });
        updated[targetIndex] = newProduct;
        setLocalProductsSync(mergeFromBatch(updated, batchProducts));
        toast({
          title: 'Filled Down & Created',
          description: 'Row copied to next row and product created successfully. QR code generated.',
        });
        onUpdate?.();
      } catch (error) {
        console.error('Error creating individual product:', error);
        const msg = error instanceof Error ? error.message : 'Failed to create individual product';
        if (msg.toLowerCase().includes('already completed')) {
          onStageCompleted?.();
          toast({ title: 'Stage Completed', description: msg, variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: msg, variant: 'destructive' });
        }
      }
    } else if (Object.keys(updateData).length > 0) {
      toast({
        title: 'Filled Down',
        description: `Copied ${Object.keys(updateData).length} field(s) to next row.`,
      });
    }
  };

  // Apply location from a given row to ALL rows in the table
  const handleApplyLocationToAll = async (index: number) => {
    const sourceRow = localProducts[index];
    const cleanLocation = (sourceRow.location || '').trim();

    if (!cleanLocation) {
      toast({
        title: 'No Location',
        description: 'This row has no location to apply.',
        variant: 'destructive',
      });
      return;
    }

    if (localProducts.length <= 1) {
      toast({
        title: 'Only One Row',
        description: 'There is only one row. Location is already applied.',
      });
      return;
    }

    const updated = localProducts.map((row) => ({
      ...row,
      location: cleanLocation,
    }));

    setLocalProductsSync(updated);

    // Save location for all existing (non-temp) rows
    try {
      const savePromises = updated
        .filter((row) => row.id && !row.id.startsWith('temp-'))
        .map((row) =>
          IndividualProductService.updateIndividualProduct(row.id!, {
            location: cleanLocation,
          })
        );

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
        onUpdate?.();
      }

      toast({
        title: 'Location Applied',
        description: `Location (${cleanLocation}) applied to all ${updated.length} row(s).`,
      });
    } catch (error) {
      console.error('Error applying location to all products:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save location for some rows',
        variant: 'destructive',
      });
    }
  };

  const handlePasteRow = async (index: number) => {
    if (!copiedRowData) {
      toast({
        title: 'Nothing to Paste',
        description: 'Please copy a row first by clicking the "Copy" button.',
        variant: 'destructive',
      });
      return;
    }

    const productItem = localProducts[index];
    const updateData: {final_length?: string; final_width?: string; final_weight?: string; location?: string} = {};

    // Only include fields that have values, ensure they're clean strings
    if (copiedRowData.final_length) {
      const val = String(copiedRowData.final_length).trim();
      if (val) updateData.final_length = val;
    }
    if (copiedRowData.final_width) {
      const val = String(copiedRowData.final_width).trim();
      if (val) updateData.final_width = val;
    }
    if (copiedRowData.final_weight) {
      const val = String(copiedRowData.final_weight).trim();
      if (val) updateData.final_weight = val;
    }
    if (copiedRowData.location) {
      const val = String(copiedRowData.location).trim();
      if (val) updateData.location = val;
    }

    const updated = [...localProducts];
    updated[index] = {
      ...updated[index],
      ...updateData,
    };
    setLocalProductsSync(updated);

    // Check if all required fields are now filled
    const tempProduct = updated[index];
    const hasRequiredFields = tempProduct.final_weight && 
                              tempProduct.final_width && 
                              tempProduct.final_length &&
                              productId;

    // Auto-save if it's a real product
    if (productItem.id && !productItem.id.startsWith('temp-')) {
      try {
        await IndividualProductService.updateIndividualProduct(productItem.id, updateData);
        onUpdate?.();
        toast({
          title: 'Pasted',
          description: 'Values pasted and saved successfully.',
        });
      } catch (error) {
        console.error('Error updating product:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save pasted values',
          variant: 'destructive',
        });
        // Revert on error
        setLocalProductsSync(localProducts);
      }
    } else if (productItem.id && productItem.id.startsWith('temp-') && hasRequiredFields) {
      // For temp products, if all required fields are now filled, create the product
      try {
        const { product: newProduct, batchProducts } = await IndividualProductService.createIndividualProduct({
          product_id: productId!,
          qr_code: tempProduct.qr_code || '',
          serial_number: tempProduct.serial_number || '',
          status: tempProduct.status || 'available',
          final_length: tempProduct.final_length || '',
          final_width: tempProduct.final_width || '',
          final_weight: tempProduct.final_weight || '',
          inspector: user?.full_name || user?.email || 'System',
          location: tempProduct.location || 'Warehouse A - General Storage',
          notes: tempProduct.notes || '',
          production_date: tempProduct.production_date || new Date().toISOString().split('T')[0],
          batch_number: batchId || '',
        });
        
        updated[index] = newProduct;
        setLocalProductsSync(mergeFromBatch(updated, batchProducts));
        
        toast({
          title: 'Pasted & Created',
          description: 'Values pasted and individual product created successfully.',
        });
        onUpdate?.();
      } catch (error) {
        console.error('Error creating individual product:', error);
        const msg = error instanceof Error ? error.message : 'Failed to create individual product';
        if (msg.toLowerCase().includes('already completed')) {
          onStageCompleted?.();
          toast({ title: 'Stage Completed', description: msg, variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: msg, variant: 'destructive' });
        }
      }
    } else {
      toast({
        title: 'Pasted',
        description: 'Values pasted. Fill other required fields to auto-save.',
      });
    }
  };

  // Apply one row's details (final_weight, final_width, final_length, location) to all other rows
  const handleApplySameToAll = () => {
    const required = ['final_weight', 'final_width', 'final_length', 'location'] as const;
    const sourceIndex = localProducts.findIndex(p =>
      required.every(f => p[f] && String(p[f]).trim() !== '')
    );
    if (sourceIndex < 0) {
      toast({
        title: 'No complete row',
        description: 'Fill at least one row with Final Weight, Width, Length and Location first.',
        variant: 'destructive',
      });
      return;
    }
    const source = localProducts[sourceIndex];
    const template = {
      final_weight: source.final_weight ? String(source.final_weight).trim() : '',
      final_width: source.final_width ? String(source.final_width).trim() : '',
      final_length: source.final_length ? String(source.final_length).trim() : '',
      location: source.location ? String(source.location).trim() : '',
    };
    const updated = localProducts.map((row, i) =>
      i === sourceIndex ? row : { ...row, ...template }
    );
    setLocalProductsSync(updated);
    toast({
      title: 'Applied to all rows',
      description: `Same Weight, Width, Length and Location applied to all ${localProducts.length} row(s). Save or edit as needed.`,
    });
  };

  const getAutoStartNo = () => {
    for (let i = localProducts.length - 1; i >= 0; i--) {
      const num = localProducts[i].roll_number;
      if (num && num.trim() !== '') {
        const match = num.match(/^(.*?)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const serial = parseInt(match[2], 10);
          const padLen = match[2].length;
          return `${prefix}${String(serial + 1).padStart(padLen, '0')}`;
        }
        return num;
      }
    }
    const prefix = getRollNumberDatePrefix(localProducts[0]?.production_date);
    return `${prefix}01`;
  };

  const handleGenerateRollNumbers = () => {
    const sourceIndex = localProducts.findIndex(
      (row) => row.roll_number && String(row.roll_number).trim() !== ''
    );
    if (sourceIndex < 0) {
      toast({
        title: 'Starting roll number required',
        description: 'Enter one roll number first (example: 101), then click Generate Roll Nos.',
        variant: 'destructive',
      });
      return;
    }

    const sourceRow = localProducts[sourceIndex];
    const normalizedSource = normalizeRollNumberInput(
      String(sourceRow.roll_number || ''),
      sourceRow.production_date
    );
    const match = normalizedSource.match(/^(.*?)(\d+)$/);
    if (!match) {
      toast({
        title: 'Invalid starting roll number',
        description: 'Use numeric ending (example: 24-03-101 or just 101).',
        variant: 'destructive',
      });
      return;
    }

    const prefix = match[1];
    const startSerial = Number(match[2]);
    if (!Number.isFinite(startSerial)) {
      toast({
        title: 'Invalid starting serial',
        description: 'Starting serial must be a valid number.',
        variant: 'destructive',
      });
      return;
    }

    const updated = [...localProducts];
    let serial = startSerial;
    for (let i = sourceIndex; i < updated.length; i += 1) {
      updated[i] = {
        ...updated[i],
        roll_number: `${prefix}${serial}`,
      };
      serial += 1;
    }

    setLocalProductsSync(updated);
    toast({
      title: 'Roll numbers generated',
      description: `Generated sequential roll numbers from ${prefix}${startSerial} onward.`,
    });
  };

  const handleGenerateRollNumbersMobile = async () => {
    const raw = genStartNo.trim();
    if (!raw) {
      toast({ title: 'Required', description: 'Enter a starting roll number, e.g. 70', variant: 'destructive' });
      return;
    }
    const prefix = getRollNumberDatePrefix(localProducts[0]?.production_date);
    const normalized = /^\d+$/.test(raw) ? `${prefix}${raw}` : raw;
    const match = normalized.match(/^(.*?)(\d+)$/);
    if (!match) {
      toast({ title: 'Invalid', description: 'Must end with digits, e.g. 70 or 06-26-70', variant: 'destructive' });
      return;
    }
    const rollPrefix = match[1];
    const startSerial = parseInt(match[2], 10);
    const padLen = match[2].length;
    
    const updated = localProducts.map((r, i) => ({
      ...r,
      roll_number: `${rollPrefix}${String(startSerial + i).padStart(padLen, '0')}`,
    }));
    
    setLocalProductsSync(updated);
    setShowGenModal(false);
    setGenStartNo('');
    
    toast({ title: 'Success', description: 'Roll numbers generated. Auto-saving completed rows...' });
    
    // Save all completed rows
    for (let i = 0; i < updated.length; i++) {
      const tempProduct = updated[i];
      if (isTempRowReady(tempProduct)) {
        await createTempRowIfReady(i);
      } else if (tempProduct.id && !tempProduct.id.startsWith('temp-')) {
        await IndividualProductService.updateIndividualProduct(tempProduct.id, {
          roll_number: tempProduct.roll_number,
        });
      }
    }
    onUpdate?.();
  };

  const hasOneRowFilled = localProducts.some(p =>
    p.final_weight && p.final_width && p.final_length && p.location &&
    String(p.final_weight).trim() !== '' &&
    String(p.final_width).trim() !== '' &&
    String(p.final_length).trim() !== '' &&
    String(p.location).trim() !== ''
  );

  const handleRemoveRow = (index: number) => {
    // Prevent deleting if there's only one row left
    if (localProducts.length <= 1) {
      toast({
        title: 'Cannot Delete',
        description: 'At least one row must remain in the table',
        variant: 'destructive',
      });
      return;
    }

    // Allow deletion of any row - user can delete below planned quantity if needed
    // (e.g., due to defects or measurement variations)
    const productToRemove = localProducts[index];
    const updated = localProducts.filter((_, i) => i !== index);
    setLocalProductsSync(updated);
    
    // If it's a real product (not temp), delete from backend
    // Local state is already updated above, no need to refresh
    if (productToRemove.id && !productToRemove.id.startsWith('temp-')) {
      IndividualProductService.deleteIndividualProduct(productToRemove.id)
        .then(() => {
          toast({
            title: 'Success',
            description: 'Product removed successfully',
          });
          onUpdate?.();
        })
        .catch((error) => {
          console.error('Error deleting product:', error);
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to remove product',
            variant: 'destructive',
          });
          // Revert local state on error
          setLocalProductsSync(localProducts);
        });
    }
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Only allow numbers and decimal point
    let numericValue = value.replace(/[^\d.]/g, '');
    setEditValue(numericValue);
    setValidationError(null);
  };

  const savedCount = localProducts.filter(p => !p.id?.startsWith('temp-')).length;
  const liveCount = Math.max(savedCount, dbSavedCount);

  return (
    <>
      {/* Desktop View */}
      <div className="hidden lg:block space-y-4">
        {stageCompleted && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-medium">
            This stage has been completed by another user. No more rows can be added.
          </div>
        )}
        {!stageCompleted && plannedQuantity > 0 && liveCount > 0 && (
          <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${liveCount > plannedQuantity ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
            <span className="font-semibold">{liveCount}</span> of <span className="font-semibold">{plannedQuantity}</span> planned rolls saved
            {liveCount > plannedQuantity && (
              <span className="ml-2 text-amber-700 font-semibold">— {liveCount - plannedQuantity} extra beyond target (final qty: {liveCount})</span>
            )}
            {liveCount === plannedQuantity && <span className="ml-2 text-green-700 font-semibold">— target reached! Final qty: {liveCount}</span>}
          </div>
        )}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Individual Products ({localProducts.length})</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Click on any cell to edit. Type numbers only - units are added automatically.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {hasOneRowFilled && (
                  <Button
                    onClick={handleApplySameToAll}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 border-green-600 text-green-700 hover:bg-green-50"
                  >
                    <Layers className="w-4 h-4" />
                    Apply same details to all
                  </Button>
                )}
                <Button
                  onClick={handleGenerateRollNumbers}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50"
                >
                  Generate Roll Nos
                </Button>
                <Button
                  onClick={handleAddRow}
                  size="sm"
                  disabled={stageCompleted}
                  className={`flex items-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${localProducts.length >= plannedQuantity && plannedQuantity > 0 ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                  title={localProducts.length >= plannedQuantity && plannedQuantity > 0 ? `Add extra row beyond planned ${plannedQuantity}` : 'Add row'}
                >
                  <Plus className="w-4 h-4" />
                  {localProducts.length >= plannedQuantity && plannedQuantity > 0 ? 'Add Extra Row' : 'Add Row'}
                </Button>
                <Button
                  onClick={handleBulkDownloadQrs}
                  size="sm"
                  variant="outline"
                  disabled={downloadingPdf}
                  className="flex items-center gap-2 border-blue-600 text-blue-700 hover:bg-blue-50"
                >
                  {downloadingPdf
                    ? <><span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Generating…</>
                    : <><FileDown className="w-4 h-4" />Download QR PDF</>
                  }
                </Button>
                {onComplete && (
                  <Button
                    onClick={() => {
                      if (canComplete) {
                        onComplete();
                        return;
                      }
                      // Show exactly what's blocking completion
                      const tempRows = localProducts.filter(p => p.id?.startsWith('temp-'));
                      if (tempRows.length > 0) {
                        toast({
                          title: 'Unsaved rows',
                          description: `${tempRows.length} row(s) are not saved yet. Fill in all required fields (Roll No, Weight, Width, Length, Location) to auto-save them first.`,
                          variant: 'destructive',
                        });
                        return;
                      }
                      const requiredFields: { key: string; label: string }[] = [
                        { key: 'roll_number', label: 'Roll Number' },
                        { key: 'final_weight', label: 'Weight/GSM' },
                        { key: 'final_width', label: 'Width' },
                        { key: 'final_length', label: 'Length' },
                        { key: 'location', label: 'Location' },
                      ];
                      const missingMap: Record<string, string[]> = {};
                      localProducts.forEach((p, i) => {
                        requiredFields.forEach(({ key, label }) => {
                          const val = p[key as keyof IndividualProduct];
                          if (!val || (typeof val === 'string' && val.trim() === '')) {
                            if (!missingMap[`Row ${i + 1}`]) missingMap[`Row ${i + 1}`] = [];
                            missingMap[`Row ${i + 1}`].push(label);
                          }
                        });
                      });
                      const missing = Object.entries(missingMap).map(([row, fields]) => `${row}: ${fields.join(', ')}`).join(' | ');
                      if (missing) {
                        toast({
                          title: 'Missing required fields',
                          description: missing,
                          variant: 'destructive',
                        });
                      } else if (localProducts.length === 0) {
                        toast({
                          title: 'No products added',
                          description: 'Add at least one individual product before proceeding.',
                          variant: 'destructive',
                        });
                      }
                    }}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {actionLabel}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Product Reference Details */}
            {product && (product.length || product.width || product.weight) && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-blue-600">📋</span>
                  Product Reference Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  {product.length && (
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Expected Length</p>
                      <p className="text-gray-900 font-semibold">{product.length} {product.length_unit || ''}</p>
                    </div>
                  )}
                  {product.width && (
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Expected Width</p>
                      <p className="text-gray-900 font-semibold">{product.width} {product.width_unit || ''}</p>
                    </div>
                  )}
                  {product.weight && (
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Expected GSM</p>
                      <p className="text-gray-900 font-semibold">{product.weight.replace(/[^\d.]/g, '')} {product.weight_unit || 'GSM'}</p>
                    </div>
                  )}
                  {(() => {
                    const gsm = parseFloat((product.weight || '').replace(/[^\d.]/g, ''));
                    let l = parseFloat((product.length || '').replace(/[^\d.]/g, ''));
                    let w = parseFloat((product.width || '').replace(/[^\d.]/g, ''));
                    if ((product.length || '').toLowerCase().includes('feet')) l *= 0.3048;
                    if ((product.width || '').toLowerCase().includes('feet')) w *= 0.3048;
                    if (!isNaN(gsm) && !isNaN(l) && !isNaN(w) && gsm > 0 && l > 0 && w > 0) {
                      return (
                        <div>
                          <p className="text-gray-600 font-medium mb-1">Expected Weight</p>
                          <p className="text-gray-900 font-semibold">{((gsm * l * w) / 1000).toFixed(3)} kg/roll</p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {product.color && product.color !== 'N/A' && (
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Color</p>
                      <p className="text-gray-900 font-semibold flex items-center gap-1.5">
                        {colorCodeMap[product.color] && (
                          <span className="w-4 h-4 rounded-full border border-black/10 shrink-0 inline-block" style={{ backgroundColor: colorCodeMap[product.color] }} />
                        )}
                        {product.color}
                      </p>
                    </div>
                  )}
                  {product.pattern && product.pattern !== 'N/A' && (
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Pattern</p>
                      <p className="text-gray-900 font-semibold flex items-center gap-1.5">
                        {patternImageMap[product.pattern] && (
                          <img src={patternImageMap[product.pattern]} alt="" className="w-6 h-6 rounded object-cover border border-black/10 shrink-0" />
                        )}
                        {product.pattern}
                      </p>
                    </div>
                  )}
                  {plannedQuantity > 0 && (
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Planned Quantity</p>
                      <p className="text-gray-900 font-semibold">{plannedQuantity} units</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2 text-left text-sm font-medium w-32 max-w-[140px]">
                      Serial Number
                    </th>
                    <th className="border border-gray-200 p-2 text-left text-sm font-medium">QR Code</th>
                    <th className="border border-gray-200 p-2 text-left text-sm font-medium">Roll No</th>
                    <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Length</th>
                    <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Width</th>
                    <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final GSM</th>
                    <th className="border border-gray-200 p-2 text-left text-sm font-medium">Location</th>
                    <th className="border border-gray-200 p-2 text-left text-sm font-medium">Status</th>
                    <th className="border border-gray-200 p-2 text-left text-sm font-medium">Notes</th>
                    <th className="border border-gray-200 p-2 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {localProducts.map((productItem, index) => (
                    <tr key={productItem.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 p-2 font-mono text-sm w-32 max-w-[140px] truncate">
                        {productItem.serial_number || `#${index + 1}`}
                      </td>
                      <td className="border border-gray-200 p-2 font-mono text-sm">
                        {productItem.qr_code || '-'}
                      </td>
                      <td className="border border-gray-200 p-2">
                        {editingCell?.row === index && editingCell?.col === 'roll_number' ? (
                          <div>
                            <Input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                              autoFocus
                              placeholder={`${getRollNumberDatePrefix(productItem.production_date)}1`}
                              disabled={saving === productItem.id}
                            />
                            <p className="mt-1 text-[11px] text-gray-500">
                              Prefix auto: <span className="font-mono">{getRollNumberDatePrefix(productItem.production_date)}</span> (month-year + serial, enter serial like 101)
                            </p>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex items-center"
                            onClick={() => handleCellClick(index, 'roll_number')}
                          >
                            {productItem.roll_number || <span className="text-gray-400">Enter roll no</span>}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-200 p-2">
                        {editingCell?.row === index && editingCell?.col === 'final_length' ? (
                          <div>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={editValue}
                              onChange={handleNumberInput}
                              onBlur={handleCellSave}
                              onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                              autoFocus
                              placeholder={`e.g., 2.74 (${product?.length_unit || 'm'} auto-added)`}
                              disabled={saving === productItem.id}
                              className={validationError && editingCell?.col === 'final_length' ? 'border-red-500 focus:border-red-500' : ''}
                            />
                            {validationError && editingCell?.col === 'final_length' && (
                              <p className="text-xs text-red-650 mt-1">{validationError}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div
                              className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex-1 flex items-center"
                              onClick={() => handleCellClick(index, 'final_length')}
                            >
                              {productItem.final_length || <span className="text-gray-400">Click to edit</span>}
                            </div>
                            {productItem.final_length && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFillDownField(index, 'final_length');
                                }}
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                disabled={index === localProducts.length - 1}
                                title="Fill down length"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-200 p-2">
                        {editingCell?.row === index && editingCell?.col === 'final_width' ? (
                          <div>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={editValue}
                              onChange={handleNumberInput}
                              onBlur={handleCellSave}
                              onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                              autoFocus
                              placeholder={`e.g., 1.83 (${product?.width_unit || 'm'} auto-added)`}
                              disabled={saving === productItem.id}
                              className={validationError && editingCell?.col === 'final_width' ? 'border-red-500 focus:border-red-500' : ''}
                            />
                            {validationError && editingCell?.col === 'final_width' && (
                              <p className="text-xs text-red-650 mt-1">{validationError}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div
                              className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex-1 flex items-center"
                              onClick={() => handleCellClick(index, 'final_width')}
                            >
                              {productItem.final_width || <span className="text-gray-400">Click to edit</span>}
                            </div>
                            {productItem.final_width && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFillDownField(index, 'final_width');
                                }}
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                disabled={index === localProducts.length - 1}
                                title="Fill down width"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-200 p-2">
                        {editingCell?.row === index && editingCell?.col === 'final_weight' ? (
                          <div>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={editValue}
                              onChange={handleNumberInput}
                              onBlur={handleCellSave}
                              onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                              autoFocus
                              placeholder={`e.g., 350 (${product?.weight_unit || 'GSM'})`}
                              disabled={saving === productItem.id}
                              className={validationError && editingCell?.col === 'final_weight' ? 'border-red-500 focus:border-red-500' : ''}
                            />
                            {validationError && editingCell?.col === 'final_weight' && (
                              <p className="text-xs text-red-650 mt-1">{validationError}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div
                              className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex-1 flex items-start flex-col"
                              onClick={() => handleCellClick(index, 'final_weight')}
                            >
                              {productItem.final_weight ? (
                                <>
                                  <span className="text-sm text-gray-900">{productItem.final_weight}</span>
                                  {(() => {
                                    const kg = weightKgFromRow(productItem);
                                    return kg !== null ? (
                                      <span className="text-xs text-gray-500 mt-0.5">{kg.toFixed(3)} kg</span>
                                    ) : null;
                                  })()}
                                </>
                              ) : (
                                <span className="text-gray-400">Click to edit</span>
                              )}
                            </div>
                            {productItem.final_weight && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFillDownField(index, 'final_weight');
                                }}
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                disabled={index === localProducts.length - 1}
                                title="Fill down weight"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-200 p-2">
                        <div className="flex items-center gap-1">
                          <Select
                            value={productItem.location || ''}
                            onValueChange={(value) => {
                              if (value === '__add_new__') {
                                setIsAddingLocation(true);
                              } else {
                                handleSelectChange(index, 'location', value);
                              }
                            }}
                            disabled={saving === productItem.id}
                          >
                            <SelectTrigger
                              className={`w-40 max-w-[160px] truncate ${!productItem.location ? 'text-gray-400' : ''}`}
                              title={productItem.location || ''}
                            >
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locationOptions.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                              <SelectItem value="__add_new__" className="text-blue-650 font-medium">
                                <Plus className="w-3 h-3 inline mr-1" />
                                Add New Location
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {productItem.location && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFillDownLocation(index);
                                }}
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                disabled={index === localProducts.length - 1}
                                title="Fill down location"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyLocationToAll(index);
                                }}
                                className="h-6 px-2 text-blue-605 hover:text-blue-700 hover:bg-blue-50"
                                title="Apply this location to all rows"
                              >
                                All
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-200 p-2">
                        <Select
                          value={productItem.status === 'used' || productItem.status === 'in_production' ? 'available' : (productItem.status || 'available')}
                          onValueChange={(value) => handleSelectChange(index, 'status', value)}
                          disabled={saving === productItem.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                          </SelectContent>
                        </Select>
                        {(productItem.status === 'used' || productItem.status === 'in_production') && (
                          <p className="text-xs text-gray-500 mt-1">Status: {productItem.status}</p>
                        )}
                      </td>
                      <td className="border border-gray-200 p-2">
                        {editingCell?.row === index && editingCell?.col === 'notes' ? (
                          <Input
                            value={editValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              const words = value.trim().split(/\s+/).filter(w => w.length > 0);
                              if (words.length > 10) {
                                const allowed = words.slice(0, 10).join(' ');
                                setEditValue(allowed);
                                return;
                              }
                              const hasLongWord = words.some(w => w.length > 15);
                              if (hasLongWord) {
                                const trimmedWords = words.map(w => w.slice(0, 15));
                                setEditValue(trimmedWords.join(' '));
                                return;
                              }
                              setEditValue(value);
                            }}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                            autoFocus
                            placeholder="Max 10 words, 15 chars/word"
                            disabled={saving === productItem.id}
                          />
                        ) : (
                          <div
                            className="cursor-pointer p-1 hover:bg-blue-50 rounded min-h-[32px] flex items-center"
                            onClick={() => handleCellClick(index, 'notes')}
                          >
                            {productItem.notes || <span className="text-gray-400">Click to edit</span>}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-200 p-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyRow(index)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Copy row values"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFillDown(index)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={index === localProducts.length - 1}
                            title="Fill down to rows below"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                          {copiedRowData && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePasteRow(index)}
                              className="text-purple-650 hover:text-purple-700 hover:bg-purple-50"
                              title="Paste copied values"
                            >
                              Paste
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveRow(index)}
                            className="text-red-650 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving === productItem.id || localProducts.length <= 1}
                            title={localProducts.length <= 1 ? 'At least one row must remain' : 'Delete row'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden space-y-4 pb-24 bg-gray-50 min-h-screen -mx-4 -my-6 p-4">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm -mx-4 -mt-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/production', { state: { section: 'assigned' } })}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">
                Individual Stage
              </h1>
              <p className="text-[10px] text-gray-500 font-semibold truncate max-w-[150px]">
                {mobileBatch?.batch_number} · {product?.name || mobileBatch?.product_name || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowInfoSheet(true)}
              className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-750 rounded-xl transition-colors border border-gray-200"
              title="Batch Information"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={onUpdate}
              className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-770 rounded-xl transition-colors border border-gray-200"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs text-gray-550 font-medium">Stage Progress</span>
            <span className="text-xs text-purple-650 font-bold bg-purple-50 px-2.5 py-0.5 rounded-full">
              3. Individual Products
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="bg-purple-500 rounded-full" />
            <div className="bg-purple-500 rounded-full" />
            <div className="bg-purple-500 rounded-full animate-pulse" />
            <div className="bg-gray-200 rounded-full" />
          </div>
          <div className="flex justify-between text-[9px] text-gray-400 mt-2 font-semibold">
            <span className="text-purple-600 font-medium">Planning</span>
            <span className="text-purple-600 font-medium">Machine</span>
            <span className="text-purple-650 font-bold">Details</span>
            <span>Wastage</span>
          </div>
        </div>

        {/* Roll Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-gray-650 font-semibold px-0.5">
            <span>Rolls Progress</span>
            <span>{localProducts.filter(r => !r.id.startsWith('temp-') && r.final_weight && r.final_width && r.final_length && r.location).length} / {localProducts.length} Complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-150">
            <div
              className="h-full bg-green-500 transition-all duration-300 rounded-full"
              style={{
                width: `${localProducts.length > 0 
                  ? (localProducts.filter(r => !r.id.startsWith('temp-') && r.final_weight && r.final_width && r.final_length && r.location).length / localProducts.length) * 100 
                  : 0}%`
              }}
            />
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-4 gap-2 bg-white rounded-xl border border-gray-150 p-3 shadow-sm">
          <div className="text-center">
            <p className="text-sm font-extrabold text-gray-800 leading-tight">{localProducts.length}</p>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Total</p>
          </div>
          <div className="text-center border-l border-gray-100">
            <p className="text-sm font-extrabold text-purple-650 leading-tight">{savedCount}</p>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Saved</p>
          </div>
          <div className="text-center border-l border-gray-100">
            <p className="text-sm font-extrabold text-green-600 leading-tight">
              {localProducts.filter(r => !r.id.startsWith('temp-') && r.final_weight && r.final_width && r.final_length && r.location).length}
            </p>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Done</p>
          </div>
          <div className="text-center border-l border-gray-100">
            <p className="text-sm font-extrabold text-orange-600 leading-tight">{localProducts.length - savedCount}</p>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Left</p>
          </div>
        </div>

        {/* Product Info Strip */}
        {product && (
          <div
            onClick={() => { setInfoTab('product'); setShowInfoSheet(true); }}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-xs text-sky-700 font-bold shadow-sm cursor-pointer animate-fadeIn"
          >
            <Package className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="text-sky-900 truncate max-w-[130px]">{product.name}</span>
            {product.weight && <span>· GSM: {product.weight.replace(/[^\d.]/g, '')} {product.weight_unit || 'GSM'}</span>}
            {product.width && <span>· W: {product.width.replace(/[^\d.]/g, '')} {product.width_unit || 'm'}</span>}
            {product.length && <span>· L: {product.length.replace(/[^\d.]/g, '')} {product.length_unit || 'm'}</span>}
            {product.color && product.color !== 'N/A' && (
              <span className="flex items-center gap-1">
                ·
                {colorCodeMap[product.color] && (
                  <span className="w-3 h-3 rounded-full border border-black/10 shrink-0 inline-block" style={{ backgroundColor: colorCodeMap[product.color] }} />
                )}
                {product.color}
              </span>
            )}
            {product.pattern && product.pattern !== 'N/A' && (
              <span className="flex items-center gap-1">
                ·
                {patternImageMap[product.pattern] && (
                  <img src={patternImageMap[product.pattern]} alt="" className="w-4 h-4 rounded object-cover border border-black/10 shrink-0 inline-block" />
                )}
                {product.pattern}
              </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-sky-600 ml-auto" />
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 py-1">
          <button
            onClick={() => { setGenStartNo(getAutoStartNo()); setShowGenModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-xs font-bold transition-colors shadow-sm"
          >
            <Hash className="w-3.5 h-3.5" />
            Gen Roll Nos
          </button>
          
          {hasOneRowFilled && (
            <button
              onClick={handleApplySameToAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 text-xs font-bold transition-colors shadow-sm"
            >
              <Copy className="w-3.5 h-3.5" />
              Apply to All
            </button>
          )}

          <button
            onClick={() => { setInfoTab('materials'); setShowInfoSheet(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold transition-colors shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" />
            Materials
          </button>

          {localProducts.some(r => isTempRowReady(r)) && (
            <button
              onClick={async () => {
                const updated = [...localProductsRef.current];
                for (let i = 0; i < updated.length; i++) {
                  if (isTempRowReady(updated[i])) {
                    await createTempRowIfReady(i);
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 text-xs font-bold transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              Save All
            </button>
          )}

          {localProducts.some(p => !p.id.startsWith('temp-')) && (
            <button
              onClick={() => { setQrMode(!qrMode); setSelectedQrIds(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors shadow-sm ${
                qrMode 
                  ? 'border-purple-600 bg-purple-600 text-white' 
                  : 'border-purple-250 bg-purple-50 text-purple-700'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              QR Codes
            </button>
          )}

          <button
            disabled={stageCompleted}
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-600 bg-blue-600 text-white text-xs font-bold disabled:opacity-40 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Roll
          </button>
        </div>

        {/* QR Mode Action Bar */}
        {qrMode && (
          <div className="flex items-center justify-between bg-purple-100 border border-purple-250 rounded-xl px-3 py-2 text-xs text-purple-800 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localProducts.filter(r => !r.id.startsWith('temp-')).every(r => selectedQrIds.has(r.id))}
                onChange={() => {
                  const savedIds = localProducts.filter(r => !r.id.startsWith('temp-')).map(r => r.id);
                  const allSelected = savedIds.every(id => selectedQrIds.has(id));
                  if (allSelected) setSelectedQrIds(new Set());
                  else setSelectedQrIds(new Set(savedIds));
                }}
                className="w-4 h-4 rounded text-purple-650 focus:ring-purple-500 border-gray-300"
              />
              <span className="font-bold">Select All</span>
            </div>
            <span className="font-semibold">{selectedQrIds.size} selected</span>
            {selectedQrIds.size > 0 && (
              <button
                onClick={() => setShowQrSheet(true)}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                View QRs
              </button>
            )}
            <button
              onClick={() => { setQrMode(false); setSelectedQrIds(new Set()); }}
              className="p-1 hover:bg-purple-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Roll Cards List */}
        <div className="space-y-3.5">
          {localProducts.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-10 bg-white border border-gray-150 rounded-xl">No rolls yet. Click "Add Roll" to start.</p>
          ) : (
            localProducts.map((roll, index) => {
              const saved = !roll.id.startsWith('temp-');
              const requiredFields = ['final_weight', 'final_width', 'final_length', 'location', 'roll_number'];
              const complete = requiredFields.every(field => {
                const val = roll[field as keyof IndividualProduct];
                return val && typeof val === 'string' && val.trim() !== '';
              });

              const borderColor = complete && saved 
                ? 'border-green-200 bg-white' 
                : saved 
                ? 'border-blue-200 bg-white' 
                : 'border-gray-200 bg-white';

              const qrSelected = selectedQrIds.has(roll.id);
              const highlightBorder = qrMode && saved && qrSelected 
                ? 'border-purple-600 border-2 bg-purple-50/10' 
                : '';

              return (
                <div key={roll.id} className={`border rounded-xl p-3.5 space-y-3 shadow-sm transition-all ${borderColor} ${highlightBorder}`}>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {qrMode && saved && (
                        <input
                          type="checkbox"
                          checked={qrSelected}
                          onChange={() => {
                            setSelectedQrIds(prev => {
                              const next = new Set(prev);
                              next.has(roll.id) ? next.delete(roll.id) : next.add(roll.id);
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded text-purple-650 focus:ring-purple-500 border-gray-300"
                        />
                      )}
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold ${saved ? (complete ? 'bg-green-100 text-green-800' : 'bg-blue-150 text-blue-800') : 'bg-amber-100 text-amber-800'}`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      {/* Roll Number Field */}
                      {editingCell?.row === index && editingCell?.col === 'roll_number' ? (
                        <Input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          className="h-8 py-0 px-2 text-xs w-36"
                          placeholder={`${getRollNumberDatePrefix(roll.production_date)}001`}
                        />
                      ) : (
                        <div
                          onClick={() => handleCellClick(index, 'roll_number')}
                          className="cursor-pointer font-bold text-gray-800 text-sm hover:bg-gray-50 px-2 py-1 rounded border border-dashed border-gray-200 min-w-[100px] text-center"
                        >
                          {roll.roll_number || <span className="text-gray-400 text-xs font-normal">Enter roll #</span>}
                        </div>
                      )}
                    </div>

                    {/* OK / DMG status chip toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newStatus = roll.status === 'available' ? 'damaged' : 'available';
                          handleSelectChange(index, 'status', newStatus);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${
                          roll.status === 'available' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {roll.status === 'available' ? 'OK' : 'DMG'}
                      </button>

                      {/* Spinner / Checkmark */}
                      <div className="w-5 flex items-center justify-center">
                        {saving === roll.id || creatingTempRowId === roll.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-650" />
                        ) : saved ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Dimensions Inputs Row */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* GSM Column */}
                    <div className="space-y-1">
                      <span className="block text-[9px] font-bold text-gray-400 uppercase text-center truncate">
                        GSM {product?.weight_unit ? `(${product.weight_unit})` : ''}
                      </span>
                      <div className="flex flex-col gap-1 items-center">
                        {editingCell?.row === index && editingCell?.col === 'final_weight' ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={editValue}
                            onChange={handleNumberInput}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                            autoFocus
                            className="h-8 text-center text-xs py-0 px-1"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(index, 'final_weight')}
                            className="w-full text-center py-1 text-xs text-gray-800 font-bold bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 min-h-[32px] flex items-center justify-center"
                          >
                            {roll.final_weight ? (
                              <span className="flex flex-col items-center">
                                <span>{roll.final_weight.replace(/[a-zA-Z\s]/g, '')}</span>
                                {weightKgFromRow(roll) !== null && (
                                  <span className="text-[8px] text-gray-400 font-semibold">{weightKgFromRow(roll)?.toFixed(1)} kg</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-normal">—</span>
                            )}
                          </div>
                        )}
                        <button
                          disabled={index === localProducts.length - 1}
                          onClick={() => handleFillDownField(index, 'final_weight')}
                          className="p-1 bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 rounded"
                        >
                          <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Width Column */}
                    <div className="space-y-1">
                      <span className="block text-[9px] font-bold text-gray-400 uppercase text-center truncate">
                        Width {product?.width_unit ? `(${product.width_unit})` : ''}
                      </span>
                      <div className="flex flex-col gap-1 items-center">
                        {editingCell?.row === index && editingCell?.col === 'final_width' ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={editValue}
                            onChange={handleNumberInput}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                            autoFocus
                            className="h-8 text-center text-xs py-0 px-1"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(index, 'final_width')}
                            className="w-full text-center py-1 text-xs text-gray-800 font-bold bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 min-h-[32px] flex items-center justify-center"
                          >
                            {roll.final_width ? roll.final_width.replace(/[a-zA-Z\s]/g, '') : <span className="text-gray-400 font-normal">—</span>}
                          </div>
                        )}
                        <button
                          disabled={index === localProducts.length - 1}
                          onClick={() => handleFillDownField(index, 'final_width')}
                          className="p-1 bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 rounded"
                        >
                          <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Length Column */}
                    <div className="space-y-1">
                      <span className="block text-[9px] font-bold text-gray-400 uppercase text-center truncate">
                        Length {product?.length_unit ? `(${product.length_unit})` : ''}
                      </span>
                      <div className="flex flex-col gap-1 items-center">
                        {editingCell?.row === index && editingCell?.col === 'final_length' ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={editValue}
                            onChange={handleNumberInput}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                            autoFocus
                            className="h-8 text-center text-xs py-0 px-1"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(index, 'final_length')}
                            className="w-full text-center py-1 text-xs text-gray-800 font-bold bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 min-h-[32px] flex items-center justify-center"
                          >
                            {roll.final_length ? roll.final_length.replace(/[a-zA-Z\s]/g, '') : <span className="text-gray-400 font-normal">—</span>}
                          </div>
                        )}
                        <button
                          disabled={index === localProducts.length - 1}
                          onClick={() => handleFillDownField(index, 'final_length')}
                          className="p-1 bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 rounded"
                        >
                          <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Location Row — mobile bottom sheet picker */}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <button
                      onClick={() => setMobileLocationPicker({ index })}
                      disabled={saving === roll.id}
                      className={`h-8 flex-1 flex items-center px-2.5 rounded-lg border text-xs text-left truncate transition-colors ${roll.location ? 'border-blue-200 bg-blue-50 text-blue-800 font-semibold' : 'border-gray-200 bg-gray-50 text-gray-400'}`}
                    >
                      <span className="truncate">{roll.location || 'Select location…'}</span>
                    </button>
                    {roll.location && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleApplyLocationToAll(index)}
                          className="px-2 py-1 text-[9px] font-extrabold text-blue-650 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg"
                        >
                          ALL
                        </button>
                        <button
                          disabled={index === localProducts.length - 1}
                          onClick={() => handleFillDownLocation(index)}
                          className="p-1 bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 rounded"
                        >
                          <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notes Field */}
                  {editingCell?.row === index && editingCell?.col === 'notes' ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleCellSave}
                      onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                      autoFocus
                      placeholder="Notes (optional)..."
                      className="h-8 py-0 px-2 text-xs"
                    />
                  ) : (
                    <div
                      onClick={() => handleCellClick(index, 'notes')}
                      className="cursor-pointer text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-2 min-h-[30px] flex items-center"
                    >
                      {roll.notes || <span className="text-gray-400">Notes (optional)...</span>}
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyRow(index)}
                        className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 text-[10px] font-bold flex items-center gap-1 shadow-sm"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                      {copiedRowData && (
                        <button
                          onClick={() => handlePasteRow(index)}
                          className="px-2.5 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 text-[10px] font-bold flex items-center gap-1 shadow-sm"
                        >
                          <Clipboard className="w-3 h-3" />
                          Paste
                        </button>
                      )}
                      {saved && roll.qr_code && (
                        <button
                          onClick={() => {
                            const text = `Roll: ${roll.roll_number}\nGSM: ${roll.final_weight} · W: ${roll.final_width} · L: ${roll.final_length}\nLocation: ${roll.location}\nQR: ${roll.qr_code}`;
                            navigator.clipboard.writeText(text);
                            toast({ title: 'Copied Roll', description: 'Roll details copied!' });
                          }}
                          className="px-2.5 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 text-[10px] font-bold flex items-center gap-1 shadow-sm"
                        >
                          <Grid className="w-3 h-3" />
                          Share QR
                        </button>
                      )}
                    </div>

                    <button
                      disabled={saving === roll.id || localProducts.length <= 1}
                      onClick={() => handleRemoveRow(index)}
                      className="p-1.5 border border-red-200 text-red-650 hover:bg-red-50 disabled:opacity-40 rounded-lg shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Bottom Footer CTA — sits above bottom nav (h-16) */}
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-4 z-20 shadow-lg space-y-1.5">
          {!canComplete && localProducts.filter(p => !p.id?.startsWith('temp-')).length > 0 && (
            <p className="text-center text-[11px] text-amber-600 font-semibold">
              Fill all required fields on each roll to proceed
            </p>
          )}
          <button
            onClick={() => {
              if (canComplete) {
                onComplete?.();
                return;
              }
              const tempRows = localProducts.filter(p => p.id?.startsWith('temp-'));
              if (tempRows.length > 0) {
                toast({ title: 'Unsaved rows', description: `${tempRows.length} row(s) not saved yet. Fill all fields first.`, variant: 'destructive' });
                return;
              }
              toast({ title: 'Incomplete rolls', description: 'Fill Roll No, GSM, Width, Length and Location on every row.', variant: 'destructive' });
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-bold text-white transition-colors"
            style={{ backgroundColor: canComplete ? '#7C3AED' : '#9CA3AF' }}
          >
            <CheckCircle className="w-4 h-4" />
            Proceed to Wastage Stage
          </button>
        </div>
      </div>

      {/* Bulk Serial Generation Modal */}
      <Dialog open={showGenModal} onOpenChange={setShowGenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Roll Numbers</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-gray-500">
            <p className="leading-relaxed">
              Type a starting roll number sequence (e.g. <strong className="text-gray-800">70</strong> or <strong className="text-gray-800">{getRollNumberDatePrefix(localProducts[0]?.production_date)}70</strong>).
              <br />
              This will sequentialize roll numbers from that value onward.
            </p>
            <Input
              type="text"
              value={genStartNo}
              onChange={(e) => setGenStartNo(e.target.value)}
              placeholder={`e.g., ${getRollNumberDatePrefix(localProducts[0]?.production_date)}70`}
              autoFocus
              className="font-bold text-base text-gray-900"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowGenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateRollNumbersMobile} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Hash className="w-4 h-4 mr-1" />
              Generate Serials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code sharing — mobile bottom sheet */}
      {createPortal(
        showQrSheet ? (
          <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowQrSheet(false); }}>
            <div className="bg-white rounded-t-[22px] flex flex-col min-h-0" style={{ maxHeight: '90vh' }}
              onClick={(e) => e.stopPropagation()}>
              {/* Drag handle */}
              <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-9 h-1 rounded-full bg-gray-300" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
                <p className="text-[15px] font-extrabold text-gray-900">QR Codes ({selectedQrIds.size})</p>
                <button onClick={() => setShowQrSheet(false)} className="p-1"><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              {/* Scrollable list */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
                {localProducts.filter(r => selectedQrIds.has(r.id) && !r.id.startsWith('temp-')).map((roll) => {
                  const qrData = roll.qr_code || roll.id;
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}`;
                  return (
                    <div key={roll.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                      {/* QR Code */}
                      <div className="flex justify-center bg-gray-50 p-5 border-b border-gray-100">
                        <img src={qrUrl} alt="QR Code" className="w-52 h-52 object-contain" />
                      </div>
                      {/* Product info */}
                      <div className="px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[15px] font-extrabold text-gray-900">{roll.roll_number || '—'}</p>
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Roll</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {roll.final_weight && (
                            <div className="bg-gray-50 rounded-lg px-2.5 py-2 text-center">
                              <p className="text-[9px] text-gray-400 font-semibold uppercase mb-0.5">GSM</p>
                              <p className="text-[12px] font-bold text-gray-800">{roll.final_weight.replace(/[^\d.]/g, '')}</p>
                            </div>
                          )}
                          {roll.final_width && (
                            <div className="bg-gray-50 rounded-lg px-2.5 py-2 text-center">
                              <p className="text-[9px] text-gray-400 font-semibold uppercase mb-0.5">Width</p>
                              <p className="text-[12px] font-bold text-gray-800">{roll.final_width.replace(/[^\d.]/g, '')} m</p>
                            </div>
                          )}
                          {roll.final_length && (
                            <div className="bg-gray-50 rounded-lg px-2.5 py-2 text-center">
                              <p className="text-[9px] text-gray-400 font-semibold uppercase mb-0.5">Length</p>
                              <p className="text-[12px] font-bold text-gray-800">{roll.final_length.replace(/[^\d.]/g, '')} m</p>
                            </div>
                          )}
                        </div>
                        {roll.location && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{roll.location}</span>
                          </div>
                        )}
                        <p className="font-mono text-[10px] text-gray-400 select-all break-all">{qrData}</p>
                        <button
                          onClick={() => {
                            const text = `Roll: ${roll.roll_number}\nGSM: ${roll.final_weight} · W: ${roll.final_width} · L: ${roll.final_length}\nLocation: ${roll.location}\nQR: ${qrData}`;
                            navigator.clipboard.writeText(text);
                            toast({ title: 'Copied', description: `Details of ${roll.roll_number} copied.` });
                          }}
                          className="w-full py-2.5 rounded-xl border border-purple-200 text-[13px] font-bold text-purple-600 flex items-center justify-center gap-1.5 active:bg-purple-50"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy Info
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Footer */}
              <div className="px-4 pt-2 pb-8 border-t border-gray-100 shrink-0">
                <button onClick={() => setShowQrSheet(false)}
                  className="w-full py-3.5 rounded-xl border border-gray-200 text-[13.5px] font-bold text-gray-500">
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null,
        document.body
      )}

      {/* QR Code sharing — desktop dialog */}
      <Dialog open={showQrSheet} onOpenChange={setShowQrSheet}>
        <DialogContent className="hidden lg:block max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader className="border-b pb-2 flex flex-row items-center justify-between">
            <DialogTitle>QR Codes ({selectedQrIds.size} rolls)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {localProducts.filter(r => selectedQrIds.has(r.id) && !r.id.startsWith('temp-')).map((roll) => {
              const qrData = roll.qr_code || roll.id;
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}`;
              return (
                <div key={roll.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center shadow-sm">
                  <img src={qrUrl} alt="QR Code" className="w-44 h-44 mb-3 object-contain" />
                  <h4 className="font-extrabold text-sm text-gray-900 mb-1">{roll.roll_number}</h4>
                  <p className="text-xs text-gray-500 mb-2">GSM: {(roll.final_weight || '').replace(/[^\d.]/g, '')} · W: {(roll.final_width || '').replace(/[^\d.]/g, '')} · L: {(roll.final_length || '').replace(/[^\d.]/g, '')}</p>
                  {roll.location && <p className="text-xs text-gray-400 mb-2">{roll.location}</p>}
                  <p className="font-mono text-[10px] text-gray-400 select-all mb-3">{qrData}</p>
                  <Button variant="outline" size="sm"
                    onClick={() => { navigator.clipboard.writeText(`Roll: ${roll.roll_number}\nQR: ${qrData}`); toast({ title: 'Copied' }); }}
                    className="flex items-center gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50">
                    <Copy className="w-3.5 h-3.5" />Copy Info
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setShowQrSheet(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info bottom sheet — mobile portal */}
      {createPortal(
        showInfoSheet ? (
          <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowInfoSheet(false); }}>
            <div className="bg-white rounded-t-[22px] flex flex-col" style={{ maxHeight: '85vh' }}
              onClick={(e) => e.stopPropagation()}>
              {/* Drag handle */}
              <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-9 h-1 rounded-full bg-gray-300" />
              </div>
              {/* Tabs */}
              <div className="flex border-b border-gray-200 shrink-0 px-4">
                <button onClick={() => setInfoTab('product')}
                  className={`flex-1 py-2.5 text-center text-[13.5px] font-bold border-b-2 transition-colors ${infoTab === 'product' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400'}`}>
                  Product Info
                </button>
                <button onClick={() => setInfoTab('materials')}
                  className={`flex-1 py-2.5 text-center text-[13.5px] font-bold border-b-2 transition-colors ${infoTab === 'materials' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400'}`}>
                  Materials ({mobileConsumedMaterials.length})
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {infoTab === 'product' ? (
                  <div className="divide-y divide-gray-100">
                    {[
                      { label: 'Product Name', value: product?.name || mobileBatch?.product_name },
                      { label: 'Category', value: product?.category },
                      { label: 'GSM', value: product?.weight ? `${product.weight.replace(/[^\d.]/g, '')} ${product.weight_unit || 'GSM'}` : undefined },
                      { label: 'Width', value: product?.width ? `${product.width.replace(/[^\d.]/g, '')} ${product.width_unit || 'm'}` : undefined },
                      { label: 'Length', value: product?.length ? `${product.length.replace(/[^\d.]/g, '')} ${product.length_unit || 'm'}` : undefined },
                      { label: 'Planned Qty', value: mobileBatch?.planned_quantity ? `${mobileBatch.planned_quantity} rolls` : undefined },
                    ].filter(r => r.value).map((r) => (
                      <div key={r!.label} className="flex justify-between items-center py-3">
                        <span className="text-[13px] text-gray-500">{r!.label}</span>
                        <span className="text-[13.5px] font-bold text-gray-900">{r!.value}</span>
                      </div>
                    ))}
                    {product?.color && product.color !== 'N/A' && (
                      <div className="flex justify-between items-center py-3">
                        <span className="text-[13px] text-gray-500">Color</span>
                        <span className="flex items-center gap-2">
                          {colorCodeMap[product.color] && (
                            <span className="w-5 h-5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colorCodeMap[product.color] }} />
                          )}
                          <span className="text-[13.5px] font-bold text-gray-900">{product.color}</span>
                        </span>
                      </div>
                    )}
                    {product?.pattern && product.pattern !== 'N/A' && (
                      <div className="flex justify-between items-center py-3">
                        <span className="text-[13px] text-gray-500">Pattern</span>
                        <span className="flex items-center gap-2">
                          {patternImageMap[product.pattern] && (
                            <img src={patternImageMap[product.pattern]} alt="" className="w-8 h-8 rounded-lg object-cover border border-black/10 shrink-0" />
                          )}
                          <span className="text-[13.5px] font-bold text-gray-900">{product.pattern}</span>
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 py-1">
                    {mobileConsumedMaterials.length === 0 ? (
                      <p className="text-gray-400 text-center py-8 text-sm">No materials consumed.</p>
                    ) : (
                      mobileConsumedMaterials.map((m, i) => {
                        const isProduct = m.material_type === 'product';
                        return (
                          <div key={m.material_id || i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-[13.5px] text-gray-900 truncate max-w-[200px]">{m.material_name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isProduct ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {isProduct ? 'Product' : 'Raw'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-white rounded-lg p-2 border border-gray-100">
                                <p className="text-[9px] text-gray-400 font-semibold uppercase mb-0.5">Required</p>
                                <p className="text-[12px] font-bold text-gray-800">{Number(m.required_quantity || 0).toFixed(2)} <span className="text-gray-400 font-normal">{m.unit}</span></p>
                              </div>
                              <div className="bg-white rounded-lg p-2 border border-green-100">
                                <p className="text-[9px] text-gray-400 font-semibold uppercase mb-0.5">Used</p>
                                <p className="text-[12px] font-bold text-green-700">{Number(m.actual_consumed_quantity || m.quantity_used || 0).toFixed(2)} <span className="text-gray-400 font-normal">{m.unit}</span></p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 pt-2 pb-8 border-t border-gray-100 shrink-0">
                <button onClick={() => setShowInfoSheet(false)}
                  className="w-full py-3.5 rounded-xl border border-gray-200 text-[13.5px] font-bold text-gray-500">
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null,
        document.body
      )}

      {/* Info sheet — desktop dialog */}
      <Dialog open={showInfoSheet && typeof window !== 'undefined' && window.innerWidth >= 1024} onOpenChange={setShowInfoSheet}>
        <DialogContent className="max-w-md max-h-[75vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex border-b border-gray-200 w-full mb-2">
              <button onClick={() => setInfoTab('product')}
                className={`flex-1 py-2 text-center text-sm font-bold border-b-2 ${infoTab === 'product' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500'}`}>
                Product Info
              </button>
              <button onClick={() => setInfoTab('materials')}
                className={`flex-1 py-2 text-center text-sm font-bold border-b-2 ${infoTab === 'materials' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500'}`}>
                Materials ({mobileConsumedMaterials.length})
              </button>
            </div>
          </DialogHeader>
          <div className="py-2">
            {infoTab === 'product' ? (
              <div className="divide-y divide-gray-100">
                {[
                  { label: 'Product Name', value: product?.name || mobileBatch?.product_name },
                  { label: 'Category', value: product?.category },
                  { label: 'GSM', value: product?.weight ? `${product.weight.replace(/[^\d.]/g, '')} ${product.weight_unit || 'GSM'}` : undefined },
                  { label: 'Width', value: product?.width ? `${product.width.replace(/[^\d.]/g, '')} ${product.width_unit || 'm'}` : undefined },
                  { label: 'Length', value: product?.length ? `${product.length.replace(/[^\d.]/g, '')} ${product.length_unit || 'm'}` : undefined },
                  { label: 'Planned Qty', value: mobileBatch?.planned_quantity ? String(mobileBatch.planned_quantity) : undefined },
                ].filter(r => r.value).map((r) => (
                  <div key={r!.label} className="flex justify-between items-center py-2 text-sm">
                    <span className="text-gray-500">{r!.label}</span>
                    <span className="font-bold text-gray-800">{r!.value}</span>
                  </div>
                ))}
                {product?.color && product.color !== 'N/A' && (
                  <div className="flex justify-between items-center py-2 text-sm">
                    <span className="text-gray-500">Color</span>
                    <span className="flex items-center gap-1.5 font-bold text-gray-800">
                      {colorCodeMap[product.color] && <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: colorCodeMap[product.color] }} />}
                      {product.color}
                    </span>
                  </div>
                )}
                {product?.pattern && product.pattern !== 'N/A' && (
                  <div className="flex justify-between items-center py-2 text-sm">
                    <span className="text-gray-500">Pattern</span>
                    <span className="flex items-center gap-1.5 font-bold text-gray-800">
                      {patternImageMap[product.pattern] && <img src={patternImageMap[product.pattern]} alt="" className="w-6 h-6 rounded object-cover border border-black/10" />}
                      {product.pattern}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {mobileConsumedMaterials.length === 0 ? (
                  <p className="text-gray-400 text-center py-6 text-sm">No materials consumed.</p>
                ) : mobileConsumedMaterials.map((m, i) => (
                  <div key={m.material_id || i} className="py-2.5 border-b border-gray-100 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-800 text-sm truncate max-w-[200px]">{m.material_name}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold uppercase">{m.material_type === 'product' ? 'Product' : 'Raw'}</span>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span>Req: <strong className="text-gray-700">{Number(m.required_quantity || 0).toFixed(2)} {m.unit}</strong></span>
                      <span>Used: <strong className="text-green-700">{Number(m.actual_consumed_quantity || m.quantity_used || 0).toFixed(2)} {m.unit}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" className="w-full" onClick={() => setShowInfoSheet(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Location Dialog — desktop */}
      <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Storage Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newLocation">Location Name</Label>
              <Input
                id="newLocation"
                placeholder="e.g., First Floor - Zone A - Section 1"
                value={newLocationValue}
                onChange={(e) => setNewLocationValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddLocation(); }}
              />
              <p className="text-xs text-gray-500">
                Examples: First Floor - Zone A, Second Floor - Zone B - Section 1
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddingLocation(false); setNewLocationValue(''); }}>Cancel</Button>
            <Button onClick={handleAddLocation}>
              <Plus className="w-4 h-4 mr-1" />Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Location Picker Bottom Sheet */}
      {createPortal(
        mobileLocationPicker !== null ? (
          <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setMobileLocationPicker(null); }}>
            <div className="bg-white rounded-t-[22px] flex flex-col" style={{ maxHeight: '80vh' }}
              onClick={(e) => e.stopPropagation()}>
              {/* Drag handle */}
              <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-9 h-1 rounded-full bg-gray-300" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
                <p className="text-[15px] font-extrabold text-gray-900">Select Location</p>
                <button onClick={() => setMobileLocationPicker(null)} className="p-1">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              {/* Location list */}
              <div className="flex-1 overflow-y-auto py-1">
                {locationOptions.map((loc) => {
                  const isSelected = localProducts[mobileLocationPicker.index]?.location === loc;
                  return (
                    <button key={loc}
                      onClick={() => {
                        handleSelectChange(mobileLocationPicker.index, 'location', loc);
                        setMobileLocationPicker(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 text-left active:bg-gray-50">
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: isSelected ? '#2563EB' : '#D1D5DB', backgroundColor: isSelected ? '#2563EB' : 'transparent' }}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-[13.5px] flex-1 ${isSelected ? 'font-bold text-blue-700' : 'text-gray-800'}`}>{loc}</span>
                    </button>
                  );
                })}
                {/* Add new */}
                <button
                  onClick={() => { setMobileLocationPicker(null); setIsAddingLocation(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-blue-50">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Plus className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-[13.5px] font-bold text-blue-600">Add New Location</span>
                </button>
              </div>
              {/* Safe area */}
              <div className="h-6 shrink-0" />
            </div>
          </div>
        ) : null,
        document.body
      )}
    </>
  );
}
