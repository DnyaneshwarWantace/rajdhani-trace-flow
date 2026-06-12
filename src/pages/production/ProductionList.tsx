import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Grid3x3, List, ArrowLeft, UserRound, ClipboardList, Target, PackageCheck, CalendarClock, ArrowRight, AlignJustify, SlidersHorizontal, X, ChevronDown, ChevronUp, Eye, Trash2, Copy, ShoppingCart, Info, Factory, Cpu, Trash, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { OrderService } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ProductionStatsBoxes from '@/components/production/ProductionStatsBoxes';
import ProductionSectionTabs from '@/components/production/ProductionSectionTabs';
import ProductionFilters from '@/components/production/ProductionFilters';
import ProductionTable from '@/components/production/ProductionTable';
import ProductionGrid from '@/components/production/ProductionGrid';
import ProductionEmptyState from '@/components/production/ProductionEmptyState';
import { canView, canCreate, canDelete } from '@/utils/permissions';
import { useAuth } from '@/contexts/AuthContext';
import AllPendingOrdersSection from '@/components/production/create/AllPendingOrdersSection';
import PermissionDenied from '@/components/ui/PermissionDenied';
import ProductionDeleteDialog from '@/components/production/ProductionDeleteDialog';
import ProductionDuplicateDialog from '@/components/production/ProductionDuplicateDialog';
import { type ProductionTask } from '@/services/productionService';
import { NotificationService } from '@/services/notificationService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination-primitives';
import { formatIndianDateTime, formatDate } from '@/utils/formatHelpers';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';

export default function ProductionList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { productId: productIdFromPath } = useParams<{ productId?: string }>();
  const [allBatches, setAllBatches] = useState<ProductionBatch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'assigned' | 'all' | 'planned' | 'active' | 'completed' | 'cancelled'>(
    (location.state?.section as 'assigned' | 'all' | 'planned' | 'active' | 'completed' | 'cancelled') || 'assigned'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [categoryFilter, _setCategoryFilter] = useState<string[]>([]);
  const [subcategoryFilter, _setSubcategoryFilter] = useState<string[]>([]);
  const [colorFilter, _setColorFilter] = useState<string[]>([]);
  const [patternFilter, _setPatternFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'start_date' | 'batch_number' | 'product_name' | 'priority' | 'completion_date'>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalBatches, setTotalBatches] = useState(0);
  const [productNameForTitle, setProductNameForTitle] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [batchToDuplicate, setBatchToDuplicate] = useState<ProductionBatch | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);


  const [stats, setStats] = useState({
    assigned: 0,
    all: 0,
    planned: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  });
  const [assignedTasks, setAssignedTasks] = useState<ProductionTask[]>([]);
  const assignedTaskCount = assignedTasks.filter((t) => t.status === 'assigned' || t.status === 'in_progress').length;

  const [mobileTab, setMobileTab] = useState<'assigned' | 'all' | 'pending'>(
    activeSection === 'assigned' ? 'assigned' : 'all'
  );
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [showMobileSort, setShowMobileSort] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    if (activeSection === 'assigned') {
      setMobileTab('assigned');
    } else {
      setMobileTab('all');
    }
  }, [activeSection]);

  const STATUS_META: Record<string, { color: string; bg: string; label: string; bar: string }> = {
    planned:       { color: '#92400E', bg: '#FEF3C7', label: 'Planned',       bar: '#EAB308' },
    in_progress:   { color: '#1D4ED8', bg: '#DBEAFE', label: 'Active',        bar: '#3B82F6' },
    in_production: { color: '#6D28D9', bg: '#EDE9FE', label: 'In Production', bar: '#8B5CF6' },
    completed:     { color: '#15803D', bg: '#DCFCE7', label: 'Completed',     bar: '#10B981' },
    cancelled:     { color: '#DC2626', bg: '#FEF2F2', label: 'Cancelled',     bar: '#EF4444' },
    on_hold:       { color: '#6B7280', bg: '#F3F4F6', label: 'On Hold',       bar: '#9CA3AF' },
  };

  const PRIORITY_META: Record<string, { color: string; bg: string }> = {
    urgent: { color: '#991B1B', bg: '#FEE2E2' },
    high:   { color: '#C2410C', bg: '#FFEDD5' },
    medium: { color: '#92400E', bg: '#FEF3C7' },
    low:    { color: '#374151', bg: '#F3F4F6' },
  };

  const sm = (status: string) => STATUS_META[status] || STATUS_META.planned;
  const pm = (priority: string) => PRIORITY_META[priority] || PRIORITY_META.medium;

  const isOverdue = (batch: ProductionBatch): boolean => {
    if (!batch.completion_date || batch.status === 'completed' || batch.status === 'cancelled') {
      return false;
    }
    const completionDate = new Date(batch.completion_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    completionDate.setHours(0, 0, 0, 0);
    return completionDate < today;
  };

  // Determine current stage based on batch stage fields
  const getCurrentStage = (batch: ProductionBatch) => {
    if (batch.status === 'cancelled') return 'cancelled';
    if (batch.status === 'completed') return 'completed';
    if (batch.status === 'planned') return 'planning';

    const b = batch as any;
    if (b.status === 'in_progress' || b.status === 'in_production') {
      if (b.final_stage?.status === 'completed' || b.wastage_stage?.status === 'completed') {
        return 'completed';
      }
      if (b.wastage_stage?.status === 'in_progress') {
        return 'wastage';
      }
      if (b.machine_stage?.status === 'completed') {
        return 'individual_products';
      }
      if (b.planning_stage?.status === 'completed') {
        return 'machine';
      }
      return 'machine';
    }
    return 'planning';
  };

  // Helper parser methods for notes
  const getParentBatchFromNotes = (notes?: string): string | null => {
    if (!notes) return null;
    const match = notes.match(/Attached Orders:\s*(.+?)(?:\s*·|$)/i);
    if (!match?.[1]) return null;
    const ids = match[1].match(/[A-Z]{2,}-\d{4,}/g);
    return ids?.[0] || match[1].trim().split(',')[0]?.trim() || null;
  };
  const getAttachedOrderNumbers = (notes?: string): string[] => {
    if (!notes) return [];
    const match = notes.match(/Attached Orders:\s*(.+)$/i);
    if (!match?.[1]) return [];
    const raw = match[1].split('·')[0].trim();
    const idMatches = raw.match(/[A-Z]{2,}-\d{6}-\d{3,}/g) || [];
    const parsed = (idMatches.length > 0 ? idMatches : raw.split(',')).map(s => s.trim()).filter(Boolean);
    return Array.from(new Set(parsed));
  };
  const getAttachedOrderCustomers = (notes?: string): string[] => {
    if (!notes) return [];
    const match = notes.match(/Attached Customers:\s*(.+)$/i);
    if (match?.[1]) {
      const parsed = match[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(entry => entry.split(':').slice(1).join(':').trim())
        .filter(Boolean);
      if (parsed.length > 0) return Array.from(new Set(parsed));
    }
    const fallback = notes.match(/Order\s+[A-Z]{2,}-\d{6}-\d{3,}\s+For\s+(.+?)(?:\s*·|$)/i)?.[1]?.trim();
    return fallback ? [fallback] : [];
  };
  const getAttachedOrderCustomerMap = (notes?: string): Record<string, string> => {
    if (!notes) return {};
    const map: Record<string, string> = {};
    const orderIds = getAttachedOrderNumbers(notes);
    const customersRawMatch = notes.match(/Attached Customers:\s*(.+)$/i);
    const customersRaw = customersRawMatch?.[1] || '';
    if (customersRaw) {
      const entries = customersRaw.split(',').map(s => s.trim()).filter(Boolean);
      entries.forEach((entry, idx) => {
        const [left, ...rightParts] = entry.split(':');
        const possibleOrderId = (left || '').trim();
        const possibleCustomer = rightParts.join(':').trim();
        if (possibleCustomer && /[A-Z]{2,}-\d{6}-\d{3,}/.test(possibleOrderId)) {
          map[possibleOrderId] = possibleCustomer;
          return;
        }
        if (orderIds[idx] && entry) {
          map[orderIds[idx]] = possibleCustomer || entry;
        }
      });
    }
    if (Object.keys(map).length === 0) {
      const fallback = notes.match(/Order\s+([A-Z]{2,}-\d{6}-\d{3,})\s+For\s+(.+?)(?:\s*·|$)/i);
      if (fallback?.[1] && fallback?.[2]) {
        map[fallback[1].trim()] = fallback[2].trim();
      }
    }
    return map;
  };
  
  // Product-scoped page: from path /production/product/:productId or query ?productId=
  const searchParams = new URLSearchParams(location.search);
  const productIdFilter = productIdFromPath || searchParams.get('productId') || '';
  const isProductScoped = Boolean(productIdFilter);

  useEffect(() => {
    loadBatches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdFilter]);

  useEffect(() => {
    loadAssignedTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeSection]);

  // Fetch product name for product-scoped page header
  useEffect(() => {
    if (!productIdFilter) {
      setProductNameForTitle(null);
      return;
    }
    let cancelled = false;
    ProductService.getProductById(productIdFilter)
      .then((p) => {
        if (!cancelled) setProductNameForTitle(p.name);
      })
      .catch(() => {
        if (!cancelled) setProductNameForTitle(null);
      });
    return () => { cancelled = true; };
  }, [productIdFilter]);

  useEffect(() => {
    if (allBatches.length > 0) {
      calculateStats(allBatches);
    }
  }, [allBatches]);

  useEffect(() => {
    filterBatches();
  }, [activeSection, allBatches, searchTerm, priorityFilter, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setPage(1);
  }, [activeSection, searchTerm, priorityFilter, categoryFilter, subcategoryFilter, colorFilter, patternFilter]);

  // Backend now bulk-enriches batches with product details; only fetch when still missing
  const enrichBatchesWithProductNames = async (batches: ProductionBatch[]): Promise<ProductionBatch[]> => {
    const needsEnrichment = batches.filter(
      (b) => b.product_id && (!b.product_name || !b.category || !b.length)
    );
    if (needsEnrichment.length === 0) return batches;

    const enriched = await Promise.all(
      needsEnrichment.map(async (batch) => {
        try {
          const product = await ProductService.getProductById(batch.product_id);
          return {
            ...batch,
            product_name: product.name,
            category: product.category,
            subcategory: product.subcategory,
            length: product.length,
            width: product.width,
            length_unit: product.length_unit,
            width_unit: product.width_unit,
            weight: product.weight,
            weight_unit: product.weight_unit,
            color: product.color,
            pattern: product.pattern,
          };
        } catch (error) {
          console.error(`Error fetching product ${batch.product_id}:`, error);
          return {
            ...batch,
            product_name: batch.product_name || 'Product Not Found',
            category: batch.category ?? 'N/A',
            subcategory: batch.subcategory ?? 'N/A',
            length: batch.length ?? 'N/A',
            width: batch.width ?? 'N/A',
            length_unit: batch.length_unit ?? '',
            width_unit: batch.width_unit ?? '',
            weight: batch.weight ?? 'N/A',
            weight_unit: batch.weight_unit ?? '',
            color: batch.color ?? 'N/A',
            pattern: batch.pattern ?? 'N/A',
          };
        }
      })
    );
    const enrichedIds = new Set(needsEnrichment.map((b) => b.id));
    return batches.map((b) =>
      enrichedIds.has(b.id) ? enriched.find((e) => e.id === b.id)! : b
    );
  };

  const getAttachedOrderNumbersFromNotes = (notes?: string): string[] => {
    if (!notes) return [];
    const match = notes.match(/Attached Orders:\s*(.+)$/i);
    if (!match?.[1]) return [];
    const raw = match[1].split('·')[0].trim();
    const idMatches = raw.match(/[A-Z]{2,}-\d{6}-\d{3,}/g) || [];
    const parsed = (idMatches.length > 0 ? idMatches : raw.split(','))
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(parsed));
  };

  const getAttachedOrderIdsFromNotes = (notes?: string): string[] => {
    if (!notes) return [];
    const match = notes.match(/Attached Order IDs:\s*(.+?)(?:\s*·|$)/i);
    if (!match?.[1]) return [];
    return Array.from(
      new Set(
        match[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  };

  const enrichBatchesWithCustomerNames = async (batches: ProductionBatch[]): Promise<ProductionBatch[]> => {
    try {
      const { data: orders } = await OrderService.getOrders({
        limit: 1000,
        sortBy: 'order_date',
        sortOrder: 'desc',
      });
      const orderCustomerMap: Record<string, string> = {};
      const orderTargetsMap: Record<string, string[]> = {};
      (orders || []).forEach((order) => {
        const orderNo = (order.orderNumber || '').trim();
        const customer = (order.customerName || '').trim();
        if (orderNo && customer) {
          orderCustomerMap[orderNo] = customer;
        }
        if (orderNo) {
          const targets = Array.from(
            new Set(
              (order.items || [])
                .map((item) => (item.productName || '').trim())
                .filter(Boolean)
            )
          );
          orderTargetsMap[orderNo] = targets;
        }
      });

      return batches.map((batch) => {
        const allOrderNos = Array.from(
          new Set([
            ...(batch.order_number ? [batch.order_number] : []),
            ...getAttachedOrderNumbersFromNotes(batch.notes),
          ].filter(Boolean))
        );
        const primaryOrder = allOrderNos[0] || '';
        const mappedCustomer = orderCustomerMap[primaryOrder];

        const finalTargets = allOrderNos.map((orderNo) => ({
          order_number: orderNo,
          product_names: orderTargetsMap[orderNo] || [],
        }));

        const finalTargetDisplay = finalTargets
          .flatMap((t) => t.product_names)
          .filter(Boolean)
          .join(', ');

        return {
          ...batch,
          customer_name: batch.customer_name || mappedCustomer || batch.customer_name,
          final_targets: finalTargets,
          final_target_display: finalTargetDisplay || batch.final_target_display || batch.product_name || 'Product',
        };
      });
    } catch (error) {
      console.error('Error enriching customer names for production batches:', error);
      return batches;
    }
  };

  const loadBatches = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (productIdFilter) params.product_id = productIdFilter;
      const { data, error } = await ProductionService.getBatches(params);

      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        setAllBatches([]);
        return;
      }

      if (data) {
        // Show all batches returned by API for users with production_view permission.
        // "Assigned" section still filters to current user separately.
        const visibleBatches = data;

        const normalizedVisibleBatches = visibleBatches.map((batch) => ({
          ...batch,
          assigned_to_name:
            batch.assigned_to_name ||
            batch.current_stage_assigned_to_name ||
            batch.operator ||
            '',
        }));

        // Fetch product names for batches that don't have them
        const batchesWithProductNames = await enrichBatchesWithProductNames(normalizedVisibleBatches);
        const batchesWithCustomers = await enrichBatchesWithCustomerNames(batchesWithProductNames);
        setAllBatches(batchesWithCustomers);
        // Stats will be calculated in useEffect when allBatches updates
      } else {
        setAllBatches([]);
        setStats({ assigned: 0, all: 0, planned: 0, active: 0, completed: 0, cancelled: 0 });
      }
    } catch (error) {
      console.error('Error loading batches:', error);
      toast({ title: 'Error', description: 'Failed to load production batches', variant: 'destructive' });
      setAllBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const filterBatches = () => {
    let filtered = [...allBatches];

    // Filter by section (status)
    switch (activeSection) {
      case 'assigned':
        filtered = allBatches.filter(b =>
          b.assigned_to === user?.id ||
          b.current_stage_assigned_to === user?.id ||
          (user?.full_name ? (b.assigned_to_name || '').toLowerCase().trim() === user.full_name.toLowerCase().trim() : false) ||
          (user?.full_name ? (b.current_stage_assigned_to_name || '').toLowerCase().trim() === user.full_name.toLowerCase().trim() : false) ||
          (user?.email ? (b.assigned_to_email || '').toLowerCase().trim() === user.email.toLowerCase().trim() : false)
        );
        break;
      case 'planned':
        filtered = allBatches.filter(b => b.status === 'planned');
        break;
      case 'active':
        filtered = allBatches.filter(b => {
          const status = b.status?.toLowerCase();
          return status === 'in_progress' || status === 'in_production';
        });
        break;
      case 'completed':
        filtered = allBatches.filter(b => b.status === 'completed');
        break;
      case 'cancelled':
        filtered = allBatches.filter(b => b.status === 'cancelled');
        break;
      case 'all':
      default:
        filtered = allBatches;
        break;
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(batch => 
        batch.batch_number.toLowerCase().includes(searchLower) ||
        (batch.product_name && batch.product_name.toLowerCase().includes(searchLower))
      );
    }

    // Filter by priority (multi-select)
    if (priorityFilter.length > 0) {
      filtered = filtered.filter(batch => priorityFilter.includes(batch.priority));
    }

    // Filter by category
    if (categoryFilter.length > 0) {
      filtered = filtered.filter(batch => batch.category && categoryFilter.includes(batch.category));
    }

    // Filter by subcategory
    if (subcategoryFilter.length > 0) {
      filtered = filtered.filter(batch => batch.subcategory && subcategoryFilter.includes(batch.subcategory));
    }

    // Filter by color
    if (colorFilter.length > 0) {
      filtered = filtered.filter(batch => batch.color && colorFilter.includes(batch.color));
    }

    // Filter by pattern
    if (patternFilter.length > 0) {
      filtered = filtered.filter(batch => batch.pattern && patternFilter.includes(batch.pattern));
    }

    // Apply sorting
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'batch_number':
          compareValue = (a.batch_number || '').localeCompare(b.batch_number || '');
          break;
        case 'product_name':
          compareValue = (a.product_name || '').localeCompare(b.product_name || '');
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          compareValue = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          break;
        case 'completion_date':
          const dateA = a.completion_date ? new Date(a.completion_date).getTime() : 0;
          const dateB = b.completion_date ? new Date(b.completion_date).getTime() : 0;
          compareValue = dateA - dateB;
          break;
        case 'start_date':
        default:
          const startA = a.start_date ? new Date(a.start_date).getTime() : 0;
          const startB = b.start_date ? new Date(b.start_date).getTime() : 0;
          compareValue = startA - startB; // Sort by start date
          break;
      }

      return sortDirection * compareValue;
    });

    setTotalBatches(filtered.length);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBatches = filtered.slice(startIndex, endIndex);

    setFilteredBatches(paginatedBatches);
  };

  const calculateStats = (batchesList: ProductionBatch[]) => {
    const currentUserName = (user?.full_name || '').toLowerCase().trim();
    const currentUserEmail = (user?.email || '').toLowerCase().trim();
    const all = batchesList.length;
    const assigned = batchesList.filter(b => {
      const status = (b.status || '').toLowerCase();
      // Do not count finished/cancelled work in "Assigned to Me" badge.
      if (status === 'completed' || status === 'cancelled') return false;
      return (
        b.assigned_to === user?.id ||
        b.current_stage_assigned_to === user?.id ||
        (!!currentUserName &&
          (
            (b.assigned_to_name || '').toLowerCase().trim() === currentUserName ||
            (b.current_stage_assigned_to_name || '').toLowerCase().trim() === currentUserName
          )) ||
        (!!currentUserEmail && (b.assigned_to_email || '').toLowerCase().trim() === currentUserEmail)
      );
    }).length;
    const planned = batchesList.filter(b => b.status === 'planned').length;
    const active = batchesList.filter(b => {
      const status = b.status?.toLowerCase();
      return status === 'in_progress' || status === 'in_production';
    }).length;
    const completed = batchesList.filter(b => b.status === 'completed').length;
    const cancelled = batchesList.filter(b => b.status === 'cancelled').length;

    setStats({ assigned, all, planned, active, completed, cancelled });
  };

  const loadAssignedTasks = async () => {
    if (!user?.id) {
      setAssignedTasks([]);
      return;
    }
    try {
      const myId = String(user.id).trim();
      const myName = String(user.full_name || '').toLowerCase().trim();
      const myEmail = String(user.email || '').toLowerCase().trim();

      // Fetch tasks and batches together so assigned work appears without waiting on
      // product/order enrichment used by the batch table.
      const [primary, batchesResult, allTasksResult] = await Promise.all([
        ProductionService.getTasks({ assigned_to: myId, limit: 200 }),
        ProductionService.getBatches({ limit: 500 }),
        ProductionService.getTasks({ limit: 200 }),
      ]);
      let tasks = primary.data || [];

      // Fallback: fetch all and filter client-side — catches ID format mismatches
      if (tasks.length === 0) {
        tasks = (allTasksResult.data || []).filter((t) => {
          const taskAssigneeId = String(t.assigned_to_id || '').trim();
          const taskAssigneeName = String(t.assigned_to_name || '').toLowerCase().trim();
          return (
            (!!myId && taskAssigneeId === myId) ||
            (!!myName && taskAssigneeName === myName) ||
            (!!myEmail && taskAssigneeName.includes(myEmail))
          );
        });
      }

      const allBatchesForTask = batchesResult.data || [];

      const hasAnyBatchForTask = (task: ProductionTask) =>
        allBatchesForTask.some((b) => {
          const attachedOrderIds = getAttachedOrderIdsFromNotes(b.notes);
          const attachedOrderNumbers = getAttachedOrderNumbersFromNotes(b.notes);
          const sameOrder =
            b.order_id === task.order_id ||
            attachedOrderIds.includes(task.order_id || '') ||
            (!!task.order_number && (b.order_number === task.order_number || attachedOrderNumbers.includes(task.order_number)));
          const sameProduct = b.product_id === task.stage_product_id;
          return sameOrder && sameProduct;
        });

      // Also fetch completed sub-product tasks linked to batches owned by this user
      // so the parent batch owner sees "Continue Planning" after worker marks done.
      const myBatchIds = new Set(
        allBatchesForTask
          .filter(b =>
            b.created_by === myId ||
            (b.operator || '').toLowerCase().trim() === myName ||
            (b.supervisor || '').toLowerCase().trim() === myName
          )
          .map(b => b.id)
      );
      const parentNotifications = (allTasksResult.data || []).filter(t =>
        t.status === 'completed' &&
        t.parent_batch_id &&
        myBatchIds.has(t.parent_batch_id) &&
        // Don't show as parent notification if this user is the sub-product worker — they just marked it done
        String(t.assigned_to_id || '').trim() !== myId
      );

      const activeTasks = tasks.filter((t) => {
        if (!['assigned', 'in_progress', 'planning'].includes(t.status)) return false;
        if (t.parent_batch_id) return true;
        return !hasAnyBatchForTask(t);
      });

      // Merge: active tasks + parent notifications (deduplicate by id)
      const seen = new Set(activeTasks.map(t => t.id));
      const merged = [...activeTasks, ...parentNotifications.filter(t => !seen.has(t.id))];
      setAssignedTasks(merged);
    } catch (error) {
      console.error('Error loading assigned production tasks:', error);
      setAssignedTasks([]);
    }
  };

  useLiveSyncRefresh({
    modules: ['production', 'orders', 'products', 'materials'],
    onRefresh: () => {
      loadBatches();
      loadAssignedTasks();
    },
    pollingMs: 6000,
  });

  const handleCreate = () => {
    navigate('/production/create');
  };

  const handleView = (batch: ProductionBatch) => {
    navigate(`/production/${batch.id}`);
  };

  const handleDelete = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (reason: string) => {
    if (!selectedBatch) return;
    setIsDeleting(true);
    try {
      const { data, error } = await ProductionService.deleteBatch(selectedBatch.id, reason);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Production batch cancelled successfully' });
        setIsDeleteDialogOpen(false);
        setSelectedBatch(null);
        loadBatches();
      }
    } catch (error) {
      console.error('Error cancelling batch:', error);
      toast({ title: 'Error', description: 'Failed to cancel batch', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = (batch: ProductionBatch) => {
    setBatchToDuplicate(batch);
    setIsDuplicateDialogOpen(true);
  };

  const handleConfirmDuplicate = async (quantity: number, completionDate: string) => {
    if (!batchToDuplicate) return;
    setIsDuplicating(true);
    try {
      const { data, error } = await ProductionService.duplicateBatch(batchToDuplicate.id, quantity, completionDate);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Production batch duplicated successfully' });
        setIsDuplicateDialogOpen(false);
        setBatchToDuplicate(null);
        loadBatches();
      }
    } catch (error) {
      console.error('Error duplicating batch:', error);
      toast({ title: 'Error', description: 'Failed to duplicate batch', variant: 'destructive' });
    } finally {
      setIsDuplicating(false);
    }
  };

  const renderStageButtonForMobile = (batch: ProductionBatch, stage: string) => {
    const handleStageClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      const state = { section: activeSection };
      if (stage === 'completed' || stage === 'cancelled') {
        handleView(batch);
      } else if (stage === 'planning') {
        navigate(`/production/planning?batchId=${batch.id}`, { state });
      } else if (stage === 'machine') {
        navigate(`/production/${batch.id}/machine`, { state });
      } else if (stage === 'wastage') {
        navigate(`/production/${batch.id}/wastage`, { state });
      } else if (stage === 'individual_products') {
        navigate(`/production/${batch.id}/individual-products`, { state });
      }
    };

    if (stage === 'cancelled') return (
      <button onClick={handleStageClick} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-[11px]">
        <X className="w-3.5 h-3.5" />
        <span>Cancelled</span>
      </button>
    );
    if (stage === 'completed') return (
      <button onClick={handleStageClick} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-green-50 border border-green-200 text-green-700 font-bold text-[11px]">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Completed</span>
      </button>
    );
    if (stage === 'planning') return (
      <button onClick={handleStageClick} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 font-bold text-[11px]">
        <ClipboardList className="w-3.5 h-3.5" />
        <span>Planning</span>
      </button>
    );
    if (stage === 'individual_products') return (
      <button onClick={handleStageClick} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[11px]">
        <PackageCheck className="w-3.5 h-3.5" />
        <span>Individual</span>
      </button>
    );
    if (stage === 'wastage') return (
      <button onClick={handleStageClick} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 font-bold text-[11px]">
        <Trash className="w-3.5 h-3.5" />
        <span>Wastage</span>
      </button>
    );
    // machine stage
    return (
      <button onClick={handleStageClick} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 font-bold text-[11px]">
        <Cpu className="w-3.5 h-3.5" />
        <span>Machine</span>
      </button>
    );
  };

  const renderMobileBatchCard = (batch: ProductionBatch) => {
    const isExpanded = !!expandedCards[batch.id];
    const statusMeta = sm(batch.status);
    const priorityMeta = pm(batch.priority);
    const overdue = isOverdue(batch);
    const isSubProduction = (batch.order_id || '').startsWith('SUB-');
    
    const attachedOrders = getAttachedOrderNumbers(batch.notes);
    const hasOrderInfo = !!(batch.order_number || batch.customer_name || attachedOrders.length > 0);
    const orderDisplay = batch.order_number || attachedOrders[0] || 'Linked Order';
    const customerDisplay = (() => {
      const primaryOrder = batch.order_number || attachedOrders[0] || '';
      const orderCustomerMap = getAttachedOrderCustomerMap(batch.notes);
      return batch.customer_name || orderCustomerMap[primaryOrder] || getAttachedOrderCustomers(batch.notes)[0] || '—';
    })();
    const attachedCount = attachedOrders.length > 1 ? attachedOrders.length - 1 : 0;

    const dimStr = [
      batch.length && `${batch.length}${batch.length_unit || 'm'}`,
      batch.width && `${batch.width}${batch.width_unit || 'm'}`,
    ].filter(Boolean).join(' × ');

    const finalTarget = batch.final_target_display
      ? `${batch.final_target_display} (${batch.planned_quantity})`
      : `${batch.product_name || '—'} (${batch.planned_quantity})`;

    const stage = getCurrentStage(batch);
    const parentBatchDisplay = batch.parent_batch_id || getParentBatchFromNotes(batch.notes) || batch.order_number || null;

    return (
      <div key={batch.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Top color bar */}
        <div className="h-1" style={{ backgroundColor: statusMeta.bar }} />
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-gray-900 tracking-tight font-mono">{batch.batch_number}</span>
              <h4 className="text-sm font-semibold text-gray-700 mt-0.5 line-clamp-2">{batch.product_name || '—'}</h4>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border" style={{ backgroundColor: statusMeta.bg, color: statusMeta.color, borderColor: statusMeta.color + '33' }}>
                {statusMeta.label.toUpperCase()}
              </span>
              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border" style={{ backgroundColor: priorityMeta.bg, color: priorityMeta.color, borderColor: priorityMeta.color + '33' }}>
                {batch.priority.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Quick Info */}
          <div className="space-y-1.5 mb-3 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">Final Target:</span>
              <span className="font-semibold text-gray-800 text-right">{finalTarget}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400">Quantity:</span>
              <span className="font-semibold text-gray-800">{batch.planned_quantity}</span>
            </div>
            {batch.assigned_to_name && (
              <div className="flex items-center gap-2 mt-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                  {batch.assigned_to_name[0].toUpperCase()}
                </span>
                <span className="text-gray-500 text-[11px]">{batch.assigned_to_name}</span>
              </div>
            )}
          </div>

          {/* Collapsible Details Drawer Toggle */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setExpandedCards(prev => ({ ...prev, [batch.id]: !isExpanded }))}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span>{isExpanded ? 'HIDE' : 'DETAILS'}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Collapsible Details Drawer */}
          {isExpanded && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 space-y-1 text-xs mb-3">
              {isSubProduction ? (
                <>
                  <div className="flex justify-between py-1 border-b border-gray-200/50">
                    <span className="text-gray-400">Type:</span>
                    <span className="font-bold text-purple-700">Sub-Production</span>
                  </div>
                  {parentBatchDisplay && (
                    <div className="flex justify-between py-1 border-b border-gray-200/50">
                      <span className="text-gray-400">Parent Batch:</span>
                      <span className="font-semibold text-gray-800">{parentBatchDisplay}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between py-1 border-b border-gray-200/50">
                    <span className="text-gray-400">Type:</span>
                    <span className="font-semibold text-gray-800">Production</span>
                  </div>
                  {hasOrderInfo && (
                    <>
                      <div className="flex justify-between py-1 border-b border-gray-200/50">
                        <span className="text-gray-400">Order:</span>
                        <span className="font-semibold text-gray-800">{orderDisplay}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200/50">
                        <span className="text-gray-400">Customer:</span>
                        <span className="font-semibold text-gray-800">{customerDisplay}</span>
                      </div>
                      {attachedCount > 0 && (
                        <div className="flex justify-between py-1 border-b border-gray-200/50">
                          <span className="text-gray-400">Attached:</span>
                          <span className="font-semibold text-blue-600">+{attachedCount} more order(s)</span>
                        </div>
                      )}
                    </>
                  )}
                  {batch.duplicated_from && (
                    <div className="flex justify-between py-1 border-b border-gray-200/50">
                      <span className="text-gray-400">Duplicate of:</span>
                      <span className="font-semibold text-green-600">{batch.duplicated_from}</span>
                    </div>
                  )}
                </>
              )}
              {batch.category && (
                <div className="flex justify-between py-1 border-b border-gray-200/50">
                  <span className="text-gray-400">Category:</span>
                  <span className="font-semibold text-gray-800">
                    {batch.category}
                    {batch.subcategory && batch.subcategory !== batch.category ? ` / ${batch.subcategory}` : ''}
                  </span>
                </div>
              )}
              {dimStr && (
                <div className="flex justify-between py-1 border-b border-gray-200/50">
                  <span className="text-gray-400">Dimensions:</span>
                  <span className="font-semibold text-gray-800">{dimStr}</span>
                </div>
              )}
              {batch.weight && batch.weight !== 'N/A' && (
                <div className="flex justify-between py-1 border-b border-gray-200/50">
                  <span className="text-gray-400">Expected GSM:</span>
                  <span className="font-semibold text-gray-800">{batch.weight} {batch.weight_unit || 'GSM'}</span>
                </div>
              )}
              {batch.color && batch.color !== 'N/A' && (
                <div className="flex justify-between py-1 border-b border-gray-200/50 items-center">
                  <span className="text-gray-400">Color:</span>
                  <div className="flex items-center gap-1.5">
                    {batch.color.startsWith('#') && (
                      <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: batch.color }} />
                    )}
                    <span className="font-semibold text-gray-800">{batch.color}</span>
                  </div>
                </div>
              )}
              {batch.pattern && batch.pattern !== 'N/A' && (
                <div className="flex justify-between py-1 border-b border-gray-200/50">
                  <span className="text-gray-400">Pattern:</span>
                  <span className="font-semibold text-gray-800">{batch.pattern}</span>
                </div>
              )}
              {batch.start_date && (
                <div className="flex justify-between py-1 border-b border-gray-200/50">
                  <span className="text-gray-400">Started:</span>
                  <span className="font-semibold text-gray-800">{formatDate(batch.start_date)}</span>
                </div>
              )}
              {batch.completion_date && (
                <div className="flex justify-between py-1 border-b border-gray-200/50">
                  <span className="text-gray-400">Expected:</span>
                  <span className={`font-semibold ${overdue ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                    {formatDate(batch.completion_date)} {overdue ? ' ⚠' : ''}
                  </span>
                </div>
              )}
              {batch.status === 'completed' && batch.final_stage?.completed_at && (
                <div className="flex justify-between py-1 border-b border-gray-200/50">
                  <span className="text-gray-400">Actual:</span>
                  <span className="font-semibold text-green-600">{formatDate(batch.final_stage.completed_at)}</span>
                </div>
              )}
              {batch.operator && (
                <div className="flex justify-between py-1 border-b border-gray-200/50">
                  <span className="text-gray-400">Operator:</span>
                  <span className="font-semibold text-gray-800">{batch.operator}</span>
                </div>
              )}
              {batch.supervisor && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Supervisor:</span>
                  <span className="font-semibold text-gray-800">{batch.supervisor}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="flex gap-1.5 text-[11px]">
            <div className="flex-1">
              {renderStageButtonForMobile(batch, stage)}
            </div>

            <button
              onClick={() => handleView(batch)}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-600 active:bg-gray-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
            </button>

            {batch.status !== 'completed' && batch.status !== 'cancelled' && (
              <button
                onClick={() => handleDelete(batch)}
                className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 active:bg-red-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!canView('production')) {
    return <Layout><PermissionDenied /></Layout>;
  }

  return (
    <Layout>
      <div>
        {/* ─── DESKTOP VIEW ─── */}
        <div className="hidden lg:block">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                {isProductScoped ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-2 -ml-2 text-gray-600 hover:text-gray-900"
                      onClick={() => navigate('/production')}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back to Production
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                      Production history for {productNameForTitle ?? '…'}
                    </h1>
                    <p className="text-sm text-gray-600">All production batches for this product</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Production</h1>
                    <p className="text-sm text-gray-600">Manage production batches and track progress</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* View Toggle - Hidden on mobile/tablet */}
                <div className="hidden lg:flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={viewMode === 'table' ? 'bg-primary-600 text-white' : ''}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                </div>
                {!isProductScoped && canCreate('production') && (
                  <Button
                    onClick={handleCreate}
                    className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Batch
                  </Button>
                )}
              </div>
            </div>
          </div>

          <ProductionStatsBoxes
            all={stats.all}
            planned={stats.planned}
            active={stats.active}
            completed={stats.completed}
            cancelled={stats.cancelled}
          />

          <ProductionSectionTabs
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            assignedCount={stats.assigned + assignedTaskCount}
            allCount={stats.all}
            plannedCount={stats.planned}
            activeCount={stats.active}
            completedCount={stats.completed}
            cancelledCount={stats.cancelled}
          />

          <ProductionFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(newSortBy, newSortOrder) => {
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
              setPage(1);
            }}
          />

          {/* Assignment-only tasks (no batch created yet) — shown at top so user sees them immediately */}
          {activeSection === 'assigned' && assignedTasks.length > 0 && (
            <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Assigned Tasks (Not Started as Batch)</h3>
              <div className="space-y-2">
                {assignedTasks.map((task) => {
                  const createdAtValue = task.createdAt || task.created_at;
                  const assignedBy = task.created_by_name?.trim();

                  // Sub-product task marked done by worker = task status is completed
                  const workerMarkedDone = task.status === 'completed';

                  // Sub-product batch completed = worker marked done OR a completed batch exists
                  const subBatchCompleted = workerMarkedDone || (task.parent_batch_id
                    ? allBatches.some(
                        (b) =>
                          b.product_id === task.stage_product_id &&
                          (b.order_id === task.order_id || b.order_number === task.order_number) &&
                          b.status === 'completed'
                      )
                    : false);

                  // Sub-product batch started (but not yet completed)
                  const subBatchStarted = task.parent_batch_id
                    ? allBatches.some(
                        (b) =>
                          b.product_id === task.stage_product_id &&
                          (b.order_id === task.order_id || b.order_number === task.order_number) &&
                          b.status !== 'cancelled'
                      )
                    : false;

                  // Parent batch owner — only they see "Continue Planning"
                  const parentBatch = task.parent_batch_id
                    ? allBatches.find((b) => b.id === task.parent_batch_id)
                    : null;
                  const isParentBatchOwner = parentBatch
                    ? parentBatch.created_by === String(user?.id) ||
                      parentBatch.operator === user?.full_name ||
                      parentBatch.supervisor === user?.full_name
                    : false;

                  // This user is the sub-product worker
                  const isSubProductWorker = String(task.assigned_to_id) === String(user?.id);

                  return (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {task.parent_batch_id ? (
                            subBatchCompleted ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                                <ArrowRight className="w-3.5 h-3.5" />
                                Sub-Product Ready
                              </span>
                            ) : subBatchStarted ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                                <ClipboardList className="w-3.5 h-3.5" />
                                Sub-Product In Progress
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold border border-yellow-200">
                                <ClipboardList className="w-3.5 h-3.5" />
                                Sub-Product Not Started
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                              <ClipboardList className="w-3.5 h-3.5" />
                              Task
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
                            <Target className="w-3.5 h-3.5" />
                            {task.stage_product_name}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-700">
                          <div>
                            <span className="font-semibold text-gray-900">Order:</span>{' '}
                            {(task.order_id || '').startsWith('SUB-')
                              ? <span className="text-purple-700 font-medium">Sub-Production</span>
                              : (task.order_number || task.order_id)}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">
                              {(task.order_id || '').startsWith('SUB-') ? 'Parent Batch:' : 'Customer:'}
                            </span>{' '}
                            {(task.order_id || '').startsWith('SUB-')
                              ? (parentBatch?.batch_number || task.order_number || '-')
                              : (task.customer_name || '-')}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <PackageCheck className="w-3.5 h-3.5 text-gray-500" />
                            <span><span className="font-semibold text-gray-900">Final Product:</span> {task.final_product_name || '-'}</span>
                          </div>
                          <div><span className="font-semibold text-gray-900">Qty:</span> {task.planned_quantity ?? 0}</div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                          {assignedBy && (
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="w-3.5 h-3.5" />
                              Assigned by: <span className="font-medium text-gray-700">{assignedBy}</span>
                            </span>
                          )}
                          {createdAtValue && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="w-3.5 h-3.5" />
                              Assigned on: <span className="font-medium text-gray-700">{formatIndianDateTime(createdAtValue)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {task.parent_batch_id ? (
                        <div className="flex flex-col gap-2 sm:shrink-0">
                          {/* Worker role takes priority — they must mark done before parent can continue */}
                          {isSubProductWorker ? (
                            !subBatchStarted ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  navigate('/production/create', {
                                    state: {
                                      fromTask: true,
                                      productId: task.stage_product_id,
                                      productName: task.stage_product_name,
                                      planned_quantity: task.planned_quantity,
                                      orderId: task.order_id,
                                      orderItemId: task.order_item_id,
                                      order_number: task.order_number,
                                      customer_name: task.customer_name,
                                      taskId: task.id,
                                      assigned_to_id: task.assigned_to_id,
                                      assigned_to_name: task.assigned_to_name,
                                    },
                                  })
                                }
                              >
                                Start Sub-Product Batch
                              </Button>
                            ) : subBatchCompleted && !workerMarkedDone ? (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={async () => {
                                  const { error } = await ProductionService.updateTaskStatus(task.id, 'completed');
                                  if (error) {
                                    toast({ title: 'Error', description: error, variant: 'destructive' });
                                    return;
                                  }
                                  await NotificationService.createNotification({
                                    type: 'success',
                                    title: 'Sub-Product Ready',
                                    message: `${task.stage_product_name} has been completed by ${user?.full_name || 'worker'}. You can now continue planning for ${task.final_product_name || 'the parent batch'}.`,
                                    priority: 'high',
                                    status: 'unread',
                                    module: 'production',
                                    related_id: task.parent_batch_id || task.id,
                                    related_data: {
                                      task_id: task.id,
                                      parent_batch_id: task.parent_batch_id,
                                      stage_product_name: task.stage_product_name,
                                      final_product_name: task.final_product_name,
                                      completed_by: user?.full_name || user?.email,
                                    },
                                  });
                                  navigate('/notifications');
                                }}
                              >
                                ✓ Mark Done & Notify
                              </Button>
                            ) : workerMarkedDone ? (
                              <span className="text-xs text-green-700 font-medium text-right">
                                ✓ Done & Notified
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const subBatch = allBatches.find(
                                    (b) => b.product_id === task.stage_product_id &&
                                      (b.order_id === task.order_id || b.order_number === task.order_number)
                                  );
                                  if (subBatch) navigate(`/production/planning?batchId=${subBatch.id}`);
                                }}
                              >
                                Continue Sub-Product Batch
                              </Button>
                            )
                          ) : isParentBatchOwner ? (
                            // Not the worker — show parent batch owner view
                            subBatchCompleted ? (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => navigate(`/production/planning?batchId=${task.parent_batch_id}`)}
                              >
                                <ArrowRight className="w-4 h-4 mr-1" />
                                Continue Planning
                              </Button>
                            ) : (
                              <span className="text-xs text-yellow-700 font-medium text-right">
                                ⏳ Waiting for sub-product…
                              </span>
                            )
                          ) : null}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="sm:shrink-0"
                          onClick={() =>
                            navigate('/production/create', {
                              state: {
                                fromTask: true,
                                productId: task.stage_product_id,
                                productName: task.stage_product_name,
                                planned_quantity: task.planned_quantity,
                                orderId: task.order_id,
                                orderItemId: task.order_item_id,
                                order_number: task.order_number,
                                customer_name: task.customer_name,
                                taskId: task.id,
                                assigned_to_id: task.assigned_to_id,
                                assigned_to_name: task.assigned_to_name,
                              },
                            })
                          }
                        >
                          Start Production
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Production batches */}
          {activeSection === 'assigned' && filteredBatches.length > 0 && (
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Production Batches</h3>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : filteredBatches.length === 0 ? (
            activeSection === 'assigned' ? null : <ProductionEmptyState onCreate={handleCreate} />
          ) : viewMode === 'table' ? (
            <ProductionTable
              batches={filteredBatches}
              onView={handleView}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              canDelete={canDelete('production')}
              allBatches={allBatches}
              activeSection={activeSection}
            />
          ) : (
            <ProductionGrid
              batches={filteredBatches}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              canDelete={canDelete('production')}
              allBatches={allBatches}
            />
          )}

          {/* Pending orders — shown below assigned batches on the Assigned to Me tab */}
          {activeSection === 'assigned' && !isProductScoped && (
            <div className="mt-10 pt-6 border-t border-gray-200"> 
              <div className="mb-4"> 
                <h3 className="text-base font-semibold text-gray-900">Pending Orders</h3>
                <p className="text-xs text-gray-500 mt-1">Create production batches for items waiting to be scheduled.</p>
              </div>
              <AllPendingOrdersSection
                onSelectOrder={(order, productId) => {
                  navigate('/production/create', {
                    state: {
                      fromOrder: true,
                      orderId: order.order_id,
                      orderItemId: order.order_item_id,
                      productId,
                      productName: order.product_name || '',
                      planned_quantity: order.quantity_needed,
                      expected_delivery: order.expected_delivery,
                      order_number: order.order_number,
                      customer_name: order.customer_name,
                    },
                  });
                }}
              />
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredBatches.length > 0 && (() => {
            const totalPages = Math.ceil(totalBatches / limit);
            const pages: (number | 'ellipsis')[] = [];

            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
              }
            } else {
              pages.push(1);
              if (page > 3) pages.push('ellipsis');

              const start = Math.max(2, page - 1);
              const end = Math.min(totalPages - 1, page + 1);

              for (let i = start; i <= end; i++) {
                if (i !== 1 && i !== totalPages) {
                  pages.push(i);
                }
              }

              if (page < totalPages - 2) pages.push('ellipsis');
              if (totalPages > 1) pages.push(totalPages);
            }

            return (
              <div className="mt-6">
                <Pagination className="w-full">
                  <PaginationContent className="w-full justify-center flex-wrap gap-1">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => {
                          if (page > 1) setPage(page - 1);
                        }}
                        className={`${page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                      />
                    </PaginationItem>

                    {pages.map((p, index) => (
                      <PaginationItem key={index} className={p === 'ellipsis' ? 'hidden sm:block' : ''}>
                        {p === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            isActive={p === page}
                            onClick={() => setPage(p as number)}
                            className={`cursor-pointer h-8 w-8 sm:h-10 sm:w-10 text-xs sm:text-sm p-0 ${
                              Math.abs((p as number) - page) > 1 && (p as number) !== 1 && (p as number) !== totalPages
                                ? 'hidden sm:flex'
                                : ''
                            }`}
                          >
                            {p}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => {
                          if (page < totalPages) setPage(page + 1);
                        }}
                        className={`${page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>

                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalBatches)} of {totalBatches} batches
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Per page:</label>
                    <Select
                      value={limit.toString()}
                      onValueChange={(value) => {
                        setLimit(Number(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-16 sm:w-20 h-8 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ─── MOBILE VIEW ─── */}
        <div className="lg:hidden pb-24 space-y-4">
          {/* Mobile Header */}
          <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <h1 className="text-2xl font-bold text-gray-900">Production</h1>
              {!isProductScoped && canCreate('production') && (
                <button
                  onClick={handleCreate}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-3">{allBatches.length} batches</p>
            {/* Stats bar */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white text-center">
              <div className="flex-1 flex flex-col items-center justify-center py-2 border-r border-gray-100">
                <span className="text-sm font-extrabold text-gray-900">{stats.all}</span>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">Total</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center py-2 border-r border-gray-100">
                <span className="text-sm font-extrabold text-blue-600">{stats.assigned + assignedTaskCount}</span>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">Assigned</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center py-2 border-r border-gray-100">
                <span className="text-sm font-extrabold text-indigo-600">{stats.active}</span>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">Active</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center py-2">
                <span className="text-sm font-extrabold text-green-600">{stats.completed}</span>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">Done</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-gray-100 rounded-xl p-1 mx-4 my-2 flex sticky top-16 z-30 shadow-sm border border-gray-200/50">
            {[
              { key: 'assigned', label: 'Assigned', count: stats.assigned + assignedTaskCount },
              { key: 'all', label: 'All', count: stats.all },
              { key: 'pending', label: 'Pending Orders', icon: ShoppingCart },
            ].map((tab) => {
              const active = mobileTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setMobileTab(tab.key as any);
                    if (tab.key === 'assigned') setActiveSection('assigned');
                    else if (tab.key === 'all') setActiveSection('all');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-extrabold rounded-lg transition-all ${
                    active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon && <tab.icon className="w-3 h-3" />}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          {mobileTab !== 'pending' && (
            <div className="px-4 pt-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input
                  className="w-full pl-9 pr-4 h-10 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-blue-400 shadow-sm"
                  placeholder="Search batch # or product…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {mobileTab !== 'pending' && priorityFilter.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-4">
              {priorityFilter.map(p => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(priorityFilter.filter(x => x !== p))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200"
                >
                  <span>{p.toUpperCase()}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}
              <button
                onClick={() => setPriorityFilter([])}
                className="text-xs text-gray-500 font-semibold px-2 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          )}

          {/* Assigned Tasks list (Assigned tab only) */}
          {mobileTab === 'assigned' && assignedTasks.length > 0 && (
            <div className="px-4 space-y-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Assigned Tasks</h3>
              {assignedTasks.map((task) => {
                const createdAtValue = task.createdAt || task.created_at;
                const assignedBy = task.created_by_name?.trim();
                const workerMarkedDone = task.status === 'completed';
                const subBatchCompleted = workerMarkedDone || (task.parent_batch_id
                  ? allBatches.some(
                      (b) =>
                        b.product_id === task.stage_product_id &&
                        (b.order_id === task.order_id || b.order_number === task.order_number) &&
                        b.status === 'completed'
                    )
                  : false);
                const subBatchStarted = task.parent_batch_id
                  ? allBatches.some(
                      (b) =>
                        b.product_id === task.stage_product_id &&
                        (b.order_id === task.order_id || b.order_number === task.order_number) &&
                        b.status !== 'cancelled'
                    )
                  : false;
                const parentBatch = task.parent_batch_id
                  ? allBatches.find((b) => b.id === task.parent_batch_id)
                  : null;
                const isParentBatchOwner = parentBatch
                  ? parentBatch.created_by === String(user?.id) ||
                    parentBatch.operator === user?.full_name ||
                    parentBatch.supervisor === user?.full_name
                  : false;
                const isSubProductWorker = String(task.assigned_to_id) === String(user?.id);

                return (
                  <div key={task.id} className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="h-1 bg-purple-600" />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-extrabold text-gray-900 truncate">{task.stage_product_name || 'Production Task'}</h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {(task.order_id || '').startsWith('SUB-') ? 'Sub-Production' : (task.order_number || task.order_id || 'No order')}
                            {task.customer_name ? ` · ${task.customer_name}` : ''}
                          </p>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] px-1.5 py-0.5 shrink-0">
                          TASK
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <div className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 text-[11px] text-gray-600">
                          <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                          <span>Qty: <strong className="text-gray-900">{task.planned_quantity || 0}</strong></span>
                        </div>
                        {task.final_product_name && task.final_product_name !== task.stage_product_name && (
                          <div className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1 text-[11px] text-blue-700 font-bold">
                            <Target className="w-3.5 h-3.5" />
                            <span className="truncate">For: {task.final_product_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 text-[11px] text-gray-500 mb-3">
                        {assignedBy && (
                          <div className="flex items-center gap-1.5">
                            <UserRound className="w-3.5 h-3.5 text-gray-400" />
                            <span>Assigned by: <strong className="text-gray-700">{assignedBy}</strong></span>
                          </div>
                        )}
                        {createdAtValue && (
                          <div className="flex items-center gap-1.5">
                            <CalendarClock className="w-3.5 h-3.5 text-gray-400" />
                            <span>Assigned on: <strong className="text-gray-700">{formatIndianDateTime(createdAtValue)}</strong></span>
                          </div>
                        )}
                      </div>
                      
                      {task.parent_batch_id ? (
                        <div className="flex flex-col gap-2">
                          {isSubProductWorker ? (
                            !subBatchStarted ? (
                              <Button
                                size="sm"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl py-2 h-9"
                                onClick={() =>
                                  navigate('/production/create', {
                                    state: {
                                      fromTask: true,
                                      productId: task.stage_product_id,
                                      productName: task.stage_product_name,
                                      planned_quantity: task.planned_quantity,
                                      orderId: task.order_id,
                                      orderItemId: task.order_item_id,
                                      order_number: task.order_number,
                                      customer_name: task.customer_name,
                                      taskId: task.id,
                                      assigned_to_id: task.assigned_to_id,
                                      assigned_to_name: task.assigned_to_name,
                                    },
                                  })
                                }
                              >
                                Start Sub-Product Batch
                              </Button>
                            ) : subBatchCompleted && !workerMarkedDone ? (
                              <Button
                                size="sm"
                                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl py-2 h-9"
                                onClick={async () => {
                                  const { error } = await ProductionService.updateTaskStatus(task.id, 'completed');
                                  if (error) {
                                    toast({ title: 'Error', description: error, variant: 'destructive' });
                                    return;
                                  }
                                  await NotificationService.createNotification({
                                    type: 'success',
                                    title: 'Sub-Product Ready',
                                    message: `${task.stage_product_name} has been completed by ${user?.full_name || 'worker'}. You can now continue planning for ${task.final_product_name || 'the parent batch'}.`,
                                    priority: 'high',
                                    status: 'unread',
                                    module: 'production',
                                    related_id: task.parent_batch_id || task.id,
                                    related_data: {
                                      task_id: task.id,
                                      parent_batch_id: task.parent_batch_id,
                                      stage_product_name: task.stage_product_name,
                                      final_product_name: task.final_product_name,
                                      completed_by: user?.full_name || user?.email,
                                    },
                                  });
                                  navigate('/notifications');
                                }}
                              >
                                ✓ Mark Done & Notify
                              </Button>
                            ) : workerMarkedDone ? (
                              <div className="text-center text-xs text-green-700 font-bold bg-green-50 rounded-xl py-2 border border-green-200">
                                ✓ Done & Notified
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl py-2 h-9"
                                onClick={() => {
                                  const subBatch = allBatches.find(
                                    (b) => b.product_id === task.stage_product_id &&
                                      (b.order_id === task.order_id || b.order_number === task.order_number)
                                  );
                                  if (subBatch) navigate(`/production/planning?batchId=${subBatch.id}`);
                                }}
                              >
                                Continue Sub-Product Batch
                              </Button>
                            )
                          ) : isParentBatchOwner ? (
                            subBatchCompleted ? (
                              <Button
                                size="sm"
                                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl py-2 h-9"
                                onClick={() => navigate(`/production/planning?batchId=${task.parent_batch_id}`)}
                              >
                                Continue Planning
                              </Button>
                            ) : (
                              <div className="text-center text-xs text-yellow-700 font-bold bg-yellow-50 rounded-xl py-2 border border-yellow-200">
                                ⏳ Waiting for sub-product…
                              </div>
                            )
                          ) : null}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl py-2 h-9"
                          onClick={() =>
                            navigate('/production/create', {
                              state: {
                                fromTask: true,
                                productId: task.stage_product_id,
                                productName: task.stage_product_name,
                                planned_quantity: task.planned_quantity,
                                orderId: task.order_id,
                                orderItemId: task.order_item_id,
                                order_number: task.order_number,
                                customer_name: task.customer_name,
                                taskId: task.id,
                                assigned_to_id: task.assigned_to_id,
                                assigned_to_name: task.assigned_to_name,
                              },
                            })
                          }
                        >
                          Start Production
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Batches List (Assigned or All tabs) */}
          {mobileTab !== 'pending' && (
            <div className="px-4 space-y-3">
              {mobileTab === 'assigned' && filteredBatches.length > 0 && (
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Production Batches</h3>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : filteredBatches.length === 0 ? (
                mobileTab === 'assigned' && assignedTasks.length > 0 ? null : (
                  <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl">
                    <span className="text-3xl block mb-2">🏭</span>
                    <p className="text-sm font-semibold text-gray-800">No batches found</p>
                    <p className="text-xs text-gray-400 mt-1">Try resetting filters or search query.</p>
                  </div>
                )
              ) : (
                filteredBatches.map(renderMobileBatchCard)
              )}
            </div>
          )}

          {/* Pending Orders tab */}
          {mobileTab === 'pending' && (
            <div className="px-4">
              <AllPendingOrdersSection
                onSelectOrder={(order, productId) => {
                  navigate('/production/create', {
                    state: {
                      fromOrder: true,
                      orderId: order.order_id,
                      orderItemId: order.order_item_id,
                      productId,
                      productName: order.product_name || '',
                      planned_quantity: order.quantity_needed,
                      expected_delivery: order.expected_delivery,
                      order_number: order.order_number,
                      customer_name: order.customer_name,
                    },
                  });
                }}
              />
            </div>
          )}
        </div>

        {/* Mobile bottom SORT | FILTER bar */}
        {mobileTab !== 'pending' && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200 bg-white">
            <button
              onClick={() => { setShowMobileSort(true); setShowMobileFilters(false); }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold text-gray-700 border-r border-gray-200"
            >
              <AlignJustify className="w-4 h-4 text-gray-500" />
              SORT
            </button>
            <button
              onClick={() => { setShowMobileFilters(true); setShowMobileSort(false); }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold text-gray-700"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-500" />
              FILTER {activeSection !== 'assigned' && activeSection !== 'all' ? `(${activeSection.toUpperCase()})` : ''}
            </button>
          </div>
        )}

        {/* Mobile Floating Action Button */}
        {mobileTab !== 'pending' && canCreate('production') && (
          <button
            onClick={handleCreate}
            className="lg:hidden fixed right-5 bottom-16 w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            style={{ zIndex: 45 }}
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* Mobile Sort Sheet */}
        {showMobileSort && (
          <>
            <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowMobileSort(false)} />
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5 pb-9" style={{ zIndex: 51 }}>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-5">
                <p className="text-base font-bold text-gray-900">Sort By</p>
                <button onClick={() => setShowMobileSort(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="space-y-1">
                {[
                  { sortBy: 'start_date',      sortOrder: 'desc', label: 'Newest First' },
                  { sortBy: 'start_date',      sortOrder: 'asc',  label: 'Oldest First' },
                  { sortBy: 'completion_date', sortOrder: 'asc',  label: 'Due Date (Soon)' },
                  { sortBy: 'priority',        sortOrder: 'desc', label: 'Priority: High → Low' },
                  { sortBy: 'batch_number',    sortOrder: 'asc',  label: 'Batch # A → Z' },
                  { sortBy: 'product_name',    sortOrder: 'asc',  label: 'Product A → Z' },
                ].map((opt) => {
                  const active = sortBy === opt.sortBy && sortOrder === opt.sortOrder;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => {
                        setSortBy(opt.sortBy as any);
                        setSortOrder(opt.sortOrder as any);
                        setShowMobileSort(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        active ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 active:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Mobile Filter Sheet */}
        {showMobileFilters && (
          <>
            <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowMobileFilters(false)} />
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5 pb-9" style={{ zIndex: 51 }}>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-5">
                <p className="text-base font-bold text-gray-900">Filter By Status</p>
                <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {[
                  { value: 'planned',       label: 'Planned' },
                  { value: 'in_progress',   label: 'Active' },
                  { value: 'in_production', label: 'In Production' },
                  { value: 'completed',     label: 'Completed' },
                  { value: 'cancelled',     label: 'Cancelled' },
                ].map((opt) => {
                  const active = activeSection === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setActiveSection(opt.value as any);
                        setShowMobileFilters(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        active ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 active:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => {
                    setActiveSection('all');
                    setShowMobileFilters(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </>
        )}

        <ProductionDeleteDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          batch={selectedBatch}
          isDeleting={isDeleting}
          mode={selectedBatch?.status === 'planned' ? 'cancel' : 'delete'}
        />

        <ProductionDuplicateDialog
          isOpen={isDuplicateDialogOpen}
          onClose={() => {
            setIsDuplicateDialogOpen(false);
            setBatchToDuplicate(null);
          }}
          onConfirm={handleConfirmDuplicate}
          batch={batchToDuplicate}
          isDuplicating={isDuplicating}
        />
      </div>
    </Layout>
  );
}
