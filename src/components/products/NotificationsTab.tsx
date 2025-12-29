import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatIndianDateTime } from '@/utils/formatHelpers';
import { Bell, CheckCircle, X, ArrowRight, RefreshCw, Clock, Factory, AlertCircle, Info, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { NotificationService, type Notification } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';

interface NotificationsTabProps {
  products: any[]; // Product list to check individual stock tracking
}

export default function NotificationsTab({ products }: NotificationsTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingToProduction, setIsAddingToProduction] = useState<string | null>(null);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  const toggleNotification = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);

      // Load ALL stock-related notifications (low_stock, production_request, restock_request)
      // Production planning low stock alerts can have module: 'materials' or 'products'
      // Order-related stock alerts have type: 'production_request' or 'restock_request'
      const { data: allLowStockNotifications } = await NotificationService.getNotifications({
        type: 'low_stock',
        limit: 1000,
        offset: 0
      });

      // Also fetch production_request and restock_request from orders
      const { data: productionRequests } = await NotificationService.getNotifications({
        type: 'production_request',
        limit: 1000,
        offset: 0
      });

      const { data: restockRequests } = await NotificationService.getNotifications({
        type: 'restock_request',
        limit: 1000,
        offset: 0
      });

      console.log('🔍 Total low_stock notifications found:', allLowStockNotifications?.length || 0);
      console.log('🔍 Total production_request notifications found:', productionRequests?.length || 0);
      console.log('🔍 Total restock_request notifications found:', restockRequests?.length || 0);
      
      // Also load from all modules to ensure we don't miss any
      const productionNotifications = await NotificationService.getNotificationsByModule('production');
      const productNotifications = await NotificationService.getNotificationsByModule('products');
      const materialNotifications = await NotificationService.getNotificationsByModule('materials');
      
      console.log('🔍 Raw production notifications:', productionNotifications?.length || 0);
      console.log('🔍 Raw product notifications:', productNotifications?.length || 0);
      console.log('🔍 Raw material notifications:', materialNotifications?.length || 0);
      
      // Combine all notifications: low_stock, production_request, restock_request, and module-based
      const allNotifications = [
        ...(allLowStockNotifications || []),
        ...(productionRequests || []),
        ...(restockRequests || []),
        ...(productionNotifications || []),
        ...(productNotifications || []),
        ...(materialNotifications || [])
      ];
      
      // Remove duplicates by id
      const uniqueNotifications = Array.from(
        new Map(allNotifications.map(n => [n.id, n])).values()
      );
      
      console.log('🔍 Total unique notifications before filtering:', uniqueNotifications.length);
      
      // Filter notifications: ONLY show low stock notifications from production planning
      // Production planning notifications have:
      // - type === 'low_stock'
      // - title includes "Production Planning" (this is the key indicator from PlanningStage.tsx)
      // OR has batch_id in related_data (from production planning)
      
      // Debug: Log all low_stock notifications to see what we have
      const lowStockNotifications = uniqueNotifications.filter(n => {
        if (n.related_data?.activity_log_id) return false;
        return n.type === 'low_stock';
      });
      
      console.log('🔍 Found low_stock notifications (after removing activity logs):', lowStockNotifications.length);
      if (lowStockNotifications.length > 0) {
        console.log('🔍 Sample low_stock notifications:', lowStockNotifications.slice(0, 10).map(n => ({
          title: n.title,
          type: n.type,
          module: n.module,
          status: n.status,
          has_batch_id: !!n.related_data?.batch_id,
          has_product_id: !!n.related_data?.product_id,
          has_batch_number: !!n.related_data?.batch_number,
          title_lower: (n.title || '').toLowerCase()
        })));
      }
      
      // Filter notifications: Show ONLY product-related notifications
      // Use the same logic as ProductNotifications page
      const filteredNotifications = uniqueNotifications.filter(n => {
        // Exclude activity logs
        if (n.related_data?.activity_log_id) {
          return false;
        }
        
        // Check if it's product-related (same logic as ProductNotifications page)
        const isProductRelated = 
          n.module === 'products' || 
          n.related_data?.action_category === 'PRODUCT' ||
          n.related_data?.action?.includes('PRODUCT_');
        
        // Check if it's a production-related notification (production module or production_request type)
        const isProductionRelated = 
          n.module === 'production' ||
          n.type === 'production_request';
        
        // Check if it's a low stock notification from production planning
        // Only show if it's about a PRODUCT shortage, not a MATERIAL shortage
        const isProductLowStockFromProductionPlanning = () => {
          if (n.type !== 'low_stock') {
            return false;
          }
          
          const title = (n.title || '').toLowerCase();
          const hasProductionPlanningInTitle = title.includes('production planning');
          
          // Check material_type in related_data
          // If material_type === 'raw_material', it's a material shortage (exclude)
          // If material_type === 'product', it's a product shortage (include)
          const materialType = n.related_data?.material_type;
          
          // Exclude material-related low stock notifications
          if (materialType === 'raw_material') {
            return false;
          }
          
          // Show if:
          // 1. Title includes "Production Planning" AND material_type is 'product' (product shortage)
          // 2. Has batch_id/batch_number (from production) AND material_type is 'product'
          const hasBatchId = !!n.related_data?.batch_id;
          const hasBatchNumber = !!n.related_data?.batch_number;
          const isProductMaterial = materialType === 'product';
          
          return (hasProductionPlanningInTitle && isProductMaterial) || 
                 ((hasBatchId || hasBatchNumber) && isProductMaterial);
        };
        
        // Include if:
        // 1. It's product-related (module === 'products' or action_category === 'PRODUCT')
        // 2. It's production-related (module === 'production' or type === 'production_request')
        // 3. It's a product low stock notification from production planning
        const shouldInclude = isProductRelated || isProductionRelated || isProductLowStockFromProductionPlanning();
        
        if (shouldInclude) {
          console.log('✅ Included notification:', {
            title: n.title,
            type: n.type,
            status: n.status,
            module: n.module,
            material_type: n.related_data?.material_type,
            isProductRelated,
            isProductionRelated,
            isProductLowStock: isProductLowStockFromProductionPlanning()
          });
        } else {
          console.log('❌ Filtered out:', {
            title: n.title,
            type: n.type,
            module: n.module,
            material_type: n.related_data?.material_type,
            action_category: n.related_data?.action_category,
            isProductRelated,
            isProductionRelated,
            reason: !isProductRelated && !isProductionRelated ? 'Not product or production related' : 'Other'
          });
        }
        
        return shouldInclude;
      });
      
      // Log what we found
      console.log('✅ Production and stock notifications:', filteredNotifications.length);
      if (filteredNotifications.length > 0) {
        console.log('✅ Sample notification:', {
          id: filteredNotifications[0].id,
          title: filteredNotifications[0].title,
          type: filteredNotifications[0].type,
          status: filteredNotifications[0].status,
          has_batch_id: !!filteredNotifications[0].related_data?.batch_id,
          has_product_id: !!filteredNotifications[0].related_data?.product_id
        });
      }
      
      console.log('✅ Filtered notifications count:', filteredNotifications.length);
      
      // Sort by created_at descending (newest first)
      filteredNotifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setNotifications(filteredNotifications);
      console.log('📢 Loaded production and stock notifications:', filteredNotifications.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.updateNotificationStatus(notificationId, 'read');
      // Update the notification status to 'read' instead of removing it
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'read' as const } : n)
      );
      toast({
        title: 'Success',
        description: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const handleResolveNotification = async (notificationId: string) => {
    try {
      await NotificationService.updateNotificationStatus(notificationId, 'dismissed');
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({
        title: 'Success',
        description: 'Notification dismissed',
      });
    } catch (error) {
      console.error('Error resolving notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to dismiss notification',
        variant: 'destructive',
      });
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      const notificationPromises = notifications.map(notification =>
        NotificationService.updateNotificationStatus(notification.id, 'dismissed')
      );
      await Promise.all(notificationPromises);
      setNotifications([]);
      toast({
        title: 'Success',
        description: 'All notifications cleared',
      });
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear notifications',
        variant: 'destructive',
      });
    }
  };

  const handleAddToProductionFromNotification = async (notification: Notification) => {
    if (!notification.related_data?.productId) return;

    const productId = notification.related_data.productId;
    setIsAddingToProduction(productId);

    try {
      // Navigate to new batch page with the product data
      navigate('/production/new-batch', {
        state: {
          selectedProduct: {
            id: productId,
            name: notification.related_data.productName,
            category: notification.related_data.category,
          },
        },
      });

      // Mark notification as read
      await NotificationService.updateNotificationStatus(notification.id, 'read');

      // Reload notifications
      await loadNotifications();

      toast({
        title: 'Success',
        description: `Product "${notification.related_data.productName}" added to production`,
      });
    } catch (error) {
      console.error('Error adding product to production:', error);
      toast({
        title: 'Error',
        description: 'Failed to add product to production',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToProduction(null);
    }
  };

  // Check if product has individual stock tracking
  const hasIndividualStock = (productId: string) => {
    const product = products.find(p => (p.id || p._id) === productId);
    return product?.individual_stock_tracking === true;
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />;
      case 'production_request':
        return <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {notifications.length > 0 ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-primary-50 rounded-lg flex-shrink-0">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Product Notifications</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''} 
                  ({notifications.filter(n => n.status === 'unread').length} unread)
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllNotifications}
              className="text-gray-600 hover:text-gray-900 text-xs sm:text-sm w-full sm:w-auto"
            >
              Clear All
            </Button>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isExpanded = expandedNotifications.has(notification.id);

              return (
                <Card key={notification.id} className={`border transition-colors ${
                  notification.status === 'unread' 
                    ? 'border-gray-200 hover:border-gray-300 bg-white' 
                    : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                }`}>
                  <CardContent className="p-3 sm:p-4">
                    {/* Header - Always visible */}
                    <div
                      className="flex items-start gap-2 sm:gap-3 cursor-pointer"
                      onClick={() => toggleNotification(notification.id)}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-4 h-4 sm:w-5 sm:h-5">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Collapsed Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1 sm:gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-[11px] sm:text-sm text-gray-900 line-clamp-1 break-all">{notification.title}</h4>
                            {!isExpanded && (
                              <>
                                <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-1 break-all">{notification.message}</p>
                                {notification.related_data?.created_by_user && (
                                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                                    By: <span className="font-semibold text-gray-700">{notification.related_data.created_by_user}</span>
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-[9px] sm:text-[10px] font-medium px-1 py-0 ${getPriorityColor(notification.priority)}`}
                            >
                              {notification.priority}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-3 ml-8 sm:ml-9">
                        <p className="text-xs sm:text-sm text-gray-600 mb-3 break-words">{notification.message}</p>

                        {/* Related Data */}
                        {notification.related_data && (
                          <div className="bg-gray-50 rounded-lg p-2 sm:p-3 mb-3 space-y-1.5 overflow-hidden">
                            {/* Order-Related Stock Alert Details */}
                            {(notification.type === 'production_request' || notification.type === 'restock_request') && notification.related_data.order_number && (
                              <div className="border-b border-gray-200 pb-2 mb-2">
                                <p className="text-xs font-semibold text-gray-700 mb-1.5">Order Details</p>
                                <div className="space-y-1">
                                  {notification.related_data.order_number && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-500 font-medium">Order Number:</span>
                                      <span className="text-gray-900 font-mono">{notification.related_data.order_number}</span>
                                    </div>
                                  )}
                                  {notification.related_data.customer_name && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-500 font-medium">Customer:</span>
                                      <span className="text-gray-900">{notification.related_data.customer_name}</span>
                                    </div>
                                  )}
                                  {notification.related_data.expected_delivery && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-500 font-medium">Delivery:</span>
                                      <span className="text-red-700 font-semibold">
                                        {new Date(notification.related_data.expected_delivery).toLocaleDateString('en-IN')}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 text-xs mt-2 pt-2 border-t border-gray-200">
                                    <div>
                                      <span className="text-gray-500 font-medium">Required:</span>
                                      <span className="text-blue-700 font-semibold ml-1">{notification.related_data.quantity_ordered} {notification.related_data.unit}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 font-medium">Available:</span>
                                      <span className="text-green-700 font-semibold ml-1">{notification.related_data.available_stock} {notification.related_data.unit}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 font-medium">Need:</span>
                                      <span className="text-red-700 font-semibold ml-1">{notification.related_data.shortfall} {notification.related_data.unit}</span>
                                    </div>
                                  </div>

                                  {/* Product/Material Details */}
                                  {(notification.related_data.product_details || notification.related_data.material_details) && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <p className="text-xs font-semibold text-gray-700 mb-1">Product Details</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        {notification.related_data.product_details?.color && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Color:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.product_details.color}</span>
                                          </div>
                                        )}
                                        {notification.related_data.product_details?.pattern && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Pattern:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.product_details.pattern}</span>
                                          </div>
                                        )}
                                        {notification.related_data.product_details?.width && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Width:</span>
                                            <span className="text-gray-900 ml-1">
                                              {notification.related_data.product_details.width}{notification.related_data.product_details.width_unit || ''}
                                            </span>
                                          </div>
                                        )}
                                        {notification.related_data.product_details?.length && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Length:</span>
                                            <span className="text-gray-900 ml-1">
                                              {notification.related_data.product_details.length}{notification.related_data.product_details.length_unit || ''}
                                            </span>
                                          </div>
                                        )}
                                        {notification.related_data.product_details?.weight && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Weight/GSM:</span>
                                            <span className="text-gray-900 ml-1">
                                              {notification.related_data.product_details.weight}{notification.related_data.product_details.weight_unit || ''}
                                            </span>
                                          </div>
                                        )}
                                        {notification.related_data.product_details?.category && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Category:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.product_details.category}</span>
                                          </div>
                                        )}
                                        {notification.related_data.material_details?.color && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Color:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.material_details.color}</span>
                                          </div>
                                        )}
                                        {notification.related_data.material_details?.supplier && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Supplier:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.material_details.supplier}</span>
                                          </div>
                                        )}
                                        {notification.related_data.material_details?.category && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Category:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.material_details.category}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Production Batch Details */}
                            {(notification.related_data.batch_number || notification.related_data.batch_id) && (
                              <div className="border-b border-gray-200 pb-2 mb-2">
                                <p className="text-xs font-semibold text-gray-700 mb-1.5">Production Batch Details</p>
                                {notification.related_data.batch_number && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-gray-500 font-medium">Batch Number:</span>
                                    <span className="text-gray-900 font-mono">{notification.related_data.batch_number}</span>
                                  </div>
                                )}
                                {notification.related_data.product_name && (
                                  <div className="flex items-start gap-2 text-xs mt-1">
                                    <span className="text-gray-500 font-medium flex-shrink-0">For Product:</span>
                                    <div className="flex-1">
                                      <span className="text-gray-900 break-words">{notification.related_data.product_name}</span>
                                      {notification.related_data.product_id && (
                                        <span className="text-gray-500 ml-1">({notification.related_data.product_id})</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {(notification.related_data.product_category || notification.related_data.product_subcategory) && (
                                  <div className="flex items-center gap-2 text-xs mt-1">
                                    <span className="text-gray-500 font-medium">Category:</span>
                                    <span className="text-gray-900">
                                      {notification.related_data.product_category || ''}
                                      {notification.related_data.product_subcategory ? ` > ${notification.related_data.product_subcategory}` : ''}
                                    </span>
                                  </div>
                                )}
                                {notification.related_data.planned_quantity && (
                                  <div className="flex items-center gap-2 text-xs mt-1">
                                    <span className="text-gray-500 font-medium">Planned Quantity:</span>
                                    <span className="text-gray-900">{notification.related_data.planned_quantity} units</span>
                                  </div>
                                )}
                                {notification.related_data.product_image && (
                                  <div className="mt-2">
                                    <img 
                                      src={notification.related_data.product_image} 
                                      alt={notification.related_data.product_name || 'Product'} 
                                      className="w-16 h-16 object-cover rounded border border-gray-200"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Product/Material Details */}
                            {(notification.related_data.productName || notification.related_data.material_name) && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">
                                  {notification.related_data.material_name ? 'Material' : 'Product'}:
                                </span>
                                <span className="text-gray-900 break-words">
                                  {notification.related_data.productName || notification.related_data.material_name}
                                </span>
                              </div>
                            )}
                            {(notification.related_data.requiredQuantity || notification.related_data.required_quantity !== undefined) && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Required:</span>
                                <span className="text-gray-900 font-semibold">
                                  {notification.related_data.requiredQuantity 
                                    ? `${notification.related_data.requiredQuantity} products`
                                    : `${notification.related_data.required_quantity?.toFixed(2)} ${notification.related_data.unit || ''}`
                                  }
                                </span>
                              </div>
                            )}
                            {(notification.related_data.availableStock !== undefined || notification.related_data.available_quantity !== undefined) && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Available:</span>
                                <span className="text-gray-900">
                                  {notification.related_data.availableStock !== undefined
                                    ? `${notification.related_data.availableStock} products`
                                    : `${notification.related_data.available_quantity} ${notification.related_data.unit || ''}`
                                  }
                                </span>
                              </div>
                            )}
                            {(notification.related_data.shortfall || notification.related_data.shortage !== undefined) && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Shortage:</span>
                                <span className="text-red-600 font-semibold">
                                  {notification.related_data.shortfall 
                                    ? `${notification.related_data.shortfall} products`
                                    : `${notification.related_data.shortage?.toFixed(2)} ${notification.related_data.unit || ''}`
                                  }
                                </span>
                              </div>
                            )}
                            {notification.related_data.threshold && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Threshold:</span>
                                <span className="text-gray-900">{notification.related_data.threshold} units</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                              <span className="truncate">
                                {notification.created_at
                                  ? (formatIndianDateTime(notification.created_at) !== 'N/A'
                                      ? formatIndianDateTime(notification.created_at)
                                      : new Date(notification.created_at).toLocaleString('en-IN'))
                                  : 'Just now'}
                              </span>
                            </div>
                            {notification.related_data?.created_by_user && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <span className="font-medium">By:</span>
                                <span className="text-gray-900 font-semibold">{notification.related_data.created_by_user}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                            {/* Product Low Stock - Go to Production Button */}
                            {notification.type === 'production_request' && notification.related_data?.product_id && (
                              <Button
                                size="sm"
                                className="bg-blue-600 text-white hover:bg-blue-700 h-7 sm:h-8 text-xs flex-1 sm:flex-initial"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/production/new-batch', {
                                    state: {
                                      selectedProduct: {
                                        id: notification.related_data.product_id,
                                        name: notification.related_data.product_name,
                                        ...notification.related_data.product_details
                                      },
                                      fromNotification: true,
                                      requiredQuantity: notification.related_data.shortfall,
                                      orderNumber: notification.related_data.order_number,
                                      customerName: notification.related_data.customer_name,
                                      expectedDelivery: notification.related_data.expected_delivery
                                    }
                                  });
                                }}
                              >
                                <Factory className="w-3 h-3 mr-1" />
                                <span className="truncate">Go to Production</span>
                              </Button>
                            )}

                            {/* Material Low Stock - Order Material Button */}
                            {notification.type === 'restock_request' && notification.related_data?.material_id && (
                              <Button
                                size="sm"
                                className="bg-green-600 text-white hover:bg-green-700 h-7 sm:h-8 text-xs flex-1 sm:flex-initial"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/materials/manage-stock', {
                                    state: {
                                      selectedMaterial: {
                                        id: notification.related_data.material_id,
                                        name: notification.related_data.material_name,
                                        ...notification.related_data.material_details
                                      },
                                      fromNotification: true,
                                      requiredQuantity: notification.related_data.shortfall,
                                      orderNumber: notification.related_data.order_number
                                    }
                                  });
                                }}
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                <span className="truncate">Order Material</span>
                              </Button>
                            )}

                            {/* Production Planning Low Stock - Original Add to Production */}
                            {notification.type === 'low_stock' && notification.related_data && hasIndividualStock(notification.related_data.productId) && (
                              <Button
                                size="sm"
                                className="bg-primary-600 text-white hover:bg-primary-700 h-7 sm:h-8 text-xs flex-1 sm:flex-initial"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToProductionFromNotification(notification);
                                }}
                                disabled={isAddingToProduction === notification.related_data?.productId}
                              >
                                {isAddingToProduction === notification.related_data?.productId ? (
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <ArrowRight className="w-3 h-3 mr-1" />
                                )}
                                <span className="truncate">{isAddingToProduction === notification.related_data?.productId ? 'Adding...' : 'Add to Production'}</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 sm:h-8 text-xs text-gray-600 hover:text-gray-900"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                            >
                              Mark Read
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 sm:h-8 text-xs text-gray-600 hover:text-red-600 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolveNotification(notification.id);
                              }}
                            >
                              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="p-3 bg-green-50 rounded-full w-fit mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-sm text-gray-500">No pending product notifications or alerts.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

