import type { ActivityLog } from './socketService';
import { NotificationService, type Notification } from './notificationService';
import { formatActivityMessage } from '@/utils/formatActivityMessage';

/**
 * Convert activity log to notification
 */
export const convertActivityLogToNotification = async (
  activityLog: ActivityLog
): Promise<Notification | null> => {
  try {
    console.log('🔄 Converting activity log to notification:', {
      action: activityLog.action,
      category: activityLog.action_category,
      description: activityLog.description
    });
    
    // Skip certain actions that shouldn't create notifications
    const skipActions = [
      'PRODUCT_VIEW',
      'ORDER_VIEW',
      'ITEM_VIEW',
      'CLIENT_VIEW',
      'USER_VIEW',
      'LOGS_VIEW',
      'SETTINGS_VIEW',
      'LOGIN', // Don't create notification for every login
      'LOGOUT', // Don't create notification for every logout
      'API_CALL', // Skip generic API calls
    ];

    if (skipActions.includes(activityLog.action)) {
      console.log('⏭️ Skipping action:', activityLog.action);
      return null;
    }

    // Skip if it's a generic API_CALL with no meaningful data
    if (activityLog.action === 'API_CALL' || 
        (activityLog.endpoint === '/' || activityLog.endpoint === '/api')) {
      return null;
    }

    // Skip if endpoint is too generic or login/logout
    if (
      activityLog.endpoint === '/' ||
      activityLog.endpoint === '/api' ||
      activityLog.endpoint.includes('/api/auth/login') ||
      activityLog.endpoint.includes('/api/auth/logout') ||
      activityLog.endpoint.includes('/auth/login') ||
      activityLog.endpoint.includes('/auth/logout')
    ) {
      return null; // Always skip these
    }

    // Skip if description is too generic or meaningless
    if (
      activityLog.description &&
      (activityLog.description === 'Action' ||
       activityLog.description.includes('POST /') ||
       activityLog.description.includes('GET /') ||
       activityLog.description === `${activityLog.method} ${activityLog.endpoint}`))
    {
      // Always skip generic descriptions
      return null;
    }

    // Determine notification type based on action
    let notificationType = getNotificationType(activityLog);
    let priority = getPriority(activityLog);
    let module = getModule(activityLog);

    // For recipe actions, ensure they're categorized correctly
    if (activityLog.action_category === 'RECIPE' || 
        activityLog.action?.includes('RECIPE')) {
      // Recipe logs should be in production module
      module = 'production';
    }

    // For recipe actions, ensure they're categorized correctly
    if (activityLog.action_category === 'RECIPE' || 
        activityLog.action?.includes('RECIPE')) {
      // Recipe logs should be in production module
      module = 'production';
    }

    // Build title and message
    const { title, message } = buildNotificationContent(activityLog);

    // Ensure module is valid (must be one of: orders, products, materials, production)
    // The getModule function should already return a valid value, but double-check
    if (!['orders', 'products', 'materials', 'production'].includes(module)) {
      console.warn('Invalid module value from getModule:', module, 'Defaulting to products');
      module = 'products';
    }

    console.log('Creating notification:', {
      action: activityLog.action,
      category: activityLog.action_category,
      module,
      type: notificationType,
      priority
    });

    // Create notification
    const notification = await NotificationService.createNotification({
      type: notificationType,
      title,
      message,
      priority,
      module,
      status: 'unread',
      related_id: activityLog.target_resource,
      related_data: {
        activity_log_id: activityLog._id,
        action: activityLog.action,
        action_category: activityLog.action_category,
        description: activityLog.description,
        user_name: activityLog.user_name,
        user_email: activityLog.user_email,
        user_role: activityLog.user_role,
        method: activityLog.method,
        endpoint: activityLog.endpoint,
        target_resource: activityLog.target_resource,
        target_resource_type: activityLog.target_resource_type,
        metadata: activityLog.metadata,
        changes: activityLog.changes,
        created_at: activityLog.created_at,
      },
    });

    return notification;
  } catch (error) {
    console.error('Error converting activity log to notification:', error);
    return null;
  }
};

/**
 * Get notification type from activity log
 */
const getNotificationType = (log: ActivityLog): Notification['type'] => {
  if (log.status_code >= 400) {
    return 'error';
  }

  switch (log.action) {
    case 'PRODUCT_CREATE':
    case 'MATERIAL_CREATE':
    case 'ORDER_CREATE':
    case 'PURCHASE_ORDER_CREATE':
    case 'USER_CREATE':
      return 'success';
    case 'PRODUCT_DELETE':
    case 'MATERIAL_DELETE':
    case 'ORDER_DELETE':
    case 'PURCHASE_ORDER_DELETE':
    case 'USER_DELETE':
      return 'warning';
    case 'PRODUCT_UPDATE':
    case 'MATERIAL_UPDATE':
    case 'ORDER_UPDATE':
    case 'PURCHASE_ORDER_UPDATE':
    case 'USER_UPDATE':
    case 'PURCHASE_ORDER_STATUS_CHANGE':
    case 'ORDER_STATUS_CHANGE':
      return 'info';
    default:
      return 'info';
  }
};

/**
 * Get priority from activity log
 */
const getPriority = (log: ActivityLog): Notification['priority'] => {
  if (log.status_code >= 400) {
    return 'urgent';
  }

  switch (log.action) {
    case 'PRODUCT_DELETE':
    case 'MATERIAL_DELETE':
    case 'ORDER_DELETE':
    case 'USER_DELETE':
      return 'high';
    case 'PRODUCT_CREATE':
    case 'MATERIAL_CREATE':
    case 'ORDER_CREATE':
    case 'PURCHASE_ORDER_CREATE':
      return 'medium';
    case 'PURCHASE_ORDER_STATUS_CHANGE':
    case 'ORDER_STATUS_CHANGE':
      return 'high';
    default:
      return 'low';
  }
};

/**
 * Get module from activity log
 */
const getModule = (log: ActivityLog): Notification['module'] => {
  // Purchase order actions go to materials module (stock management)
  if (log.action_category === 'PURCHASE_ORDER' || 
      log.action?.includes('PURCHASE_ORDER')) {
    return 'materials';
  }
  
  switch (log.action_category) {
    case 'PRODUCT':
      return 'products';
    case 'MATERIAL':
      return 'materials';
    case 'ORDER':
      return 'orders';
    case 'RECIPE':
    case 'PRODUCTION':
      return 'production';
    default:
      return 'products';
  }
};

/**
 * Build notification title and message from activity log
 */
const buildNotificationContent = (
  log: ActivityLog
): { title: string; message: string } => {
  const userName = log.user_name || 'User';
  
  // Handle individual product generation (show count, not all IDs)
  if (log.action === 'ITEM_CREATE' && log.metadata?.quantity_generated) {
    const quantity = log.metadata.quantity_generated;
    const productName = log.metadata.product_name || log.target_resource || 'Product';
    return {
      title: `${userName} created ${quantity} individual product${quantity > 1 ? 's' : ''}`,
      message: `Generated ${quantity} individual product${quantity > 1 ? 's' : ''} for "${productName}" (${log.target_resource || 'N/A'})`,
    };
  }

  // Handle product creation
  if (log.action === 'PRODUCT_CREATE') {
    const productName = log.metadata?.product_name || log.target_resource || 'Product';
    const productId = log.target_resource || 'N/A';
    return {
      title: `${userName} created a product`,
      message: `Created product "${productName}" (ID: ${productId})`,
    };
  }

  // Handle material creation
  if (log.action === 'MATERIAL_CREATE') {
    const formattedMessage = formatActivityMessage(log);
    return {
      title: formattedMessage,
      message: formattedMessage,
    };
  }

  // Handle material update
  if (log.action === 'MATERIAL_UPDATE') {
    const formattedMessage = formatActivityMessage(log);
    return {
      title: formattedMessage,
      message: formattedMessage,
    };
  }

  // Handle material delete
  if (log.action === 'MATERIAL_DELETE') {
    const formattedMessage = formatActivityMessage(log);
    return {
      title: formattedMessage,
      message: formattedMessage,
    };
  }

  // Handle purchase order creation
  if (log.action === 'PURCHASE_ORDER_CREATE') {
    const formattedMessage = formatActivityMessage(log);
    return {
      title: formattedMessage,
      message: formattedMessage,
    };
  }

  // Handle purchase order status change
  if (log.action === 'PURCHASE_ORDER_STATUS_CHANGE') {
    const formattedMessage = formatActivityMessage(log);
    return {
      title: formattedMessage,
      message: formattedMessage,
    };
  }

  // Handle purchase order update
  if (log.action === 'PURCHASE_ORDER_UPDATE') {
    const formattedMessage = formatActivityMessage(log);
    return {
      title: formattedMessage,
      message: formattedMessage,
    };
  }

  // Handle purchase order delete
  if (log.action === 'PURCHASE_ORDER_DELETE') {
    const formattedMessage = formatActivityMessage(log);
    return {
      title: formattedMessage,
      message: formattedMessage,
    };
  }

  // Handle product update - show what was changed
  if (log.action === 'PRODUCT_UPDATE') {
    const productName = log.metadata?.product_name || log.target_resource || 'Product';
    const changes = log.changes || {};
    const changedFields = Object.keys(changes);
    
    if (changedFields.length > 0) {
      const changeDescriptions = changedFields.slice(0, 3).map(field => {
        const change = changes[field];
        if (change?.old !== undefined && change?.new !== undefined) {
          return `${field}: "${change.old}" → "${change.new}"`;
        } else if (change?.new !== undefined) {
          return `${field}: "${change.new}"`;
        }
        return field;
      });
      const moreFields = changedFields.length > 3 ? ` and ${changedFields.length - 3} more fields` : '';
      return {
        title: `${userName} updated product "${productName}"`,
        message: `Changed: ${changeDescriptions.join(', ')}${moreFields}`,
      };
    }
    
    return {
      title: `${userName} updated a product`,
      message: log.description || `Updated product "${productName}"`,
    };
  }

  // Handle product delete
  if (log.action === 'PRODUCT_DELETE') {
    const productName = log.metadata?.product_name || log.target_resource || 'Product';
    return {
      title: `${userName} deleted a product`,
      message: `Deleted product "${productName}" (ID: ${log.target_resource || 'N/A'})`,
    };
  }

  // Handle recipe create
  if (log.action === 'RECIPE_CREATE') {
    const productName = log.metadata?.product_name || log.target_resource_type || 'Product';
    const productId = log.metadata?.product_id || log.target_resource || 'N/A';
    const materialCount = log.metadata?.material_count || 0;
    const recipeId = log.metadata?.recipe_id || log.target_resource || 'N/A';
    return {
      title: `${userName} created a recipe`,
      message: `Created recipe (${recipeId}) for product "${productName}" (${productId}) with ${materialCount} material${materialCount !== 1 ? 's' : ''}`,
    };
  }

  // Handle recipe update
  if (log.action === 'RECIPE_UPDATE') {
    const productName = log.metadata?.product_name || log.target_resource_type || 'Product';
    const productId = log.metadata?.product_id || log.target_resource || 'N/A';
    const materialCount = log.metadata?.material_count || 0;
    const recipeId = log.metadata?.recipe_id || log.target_resource || 'N/A';
    return {
      title: `${userName} updated a recipe`,
      message: `Updated recipe (${recipeId}) for product "${productName}" (${productId}) - now has ${materialCount} material${materialCount !== 1 ? 's' : ''}`,
    };
  }

  // Handle recipe delete
  if (log.action === 'RECIPE_DELETE') {
    const productName = log.metadata?.product_name || log.target_resource_type || 'Product';
    const productId = log.metadata?.product_id || log.target_resource || 'N/A';
    const recipeId = log.metadata?.recipe_id || log.target_resource || 'N/A';
    return {
      title: `${userName} deleted a recipe`,
      message: `Deleted recipe (${recipeId}) for product "${productName}" (${productId})`,
    };
  }

  // Handle recipe material add
  if (log.action === 'RECIPE_MATERIAL_ADD') {
    const productName = log.metadata?.product_name || log.target_resource_type || 'Product';
    const productId = log.metadata?.product_id || log.target_resource || 'N/A';
    const materialName = log.metadata?.material_name || 'Material';
    const quantity = log.metadata?.quantity_per_sqm || 0;
    const unit = log.metadata?.unit || '';
    const materialType = log.metadata?.material_type === 'product' ? 'Product' : 'Raw Material';
    return {
      title: `${userName} added material to recipe`,
      message: `Added ${materialType} "${materialName}" (${quantity} ${unit}/SQM) to recipe for product "${productName}" (${productId})`,
    };
  }

  // Handle recipe material remove
  if (log.action === 'RECIPE_MATERIAL_REMOVE') {
    const productName = log.metadata?.product_name || log.target_resource_type || 'Product';
    const productId = log.metadata?.product_id || log.target_resource || 'N/A';
    const materialName = log.metadata?.material_name || 'Material';
    const materialType = log.metadata?.material_type === 'product' ? 'Product' : 'Raw Material';
    return {
      title: `${userName} removed material from recipe`,
      message: `Removed ${materialType} "${materialName}" from recipe for product "${productName}" (${productId})`,
    };
  }

  // Handle dropdown changes
  if (log.action_category === 'SETTINGS' && log.metadata?.category) {
    const category = log.metadata.category;
    const value = log.metadata.value || 'option';
    if (log.action.includes('CREATE')) {
      return {
        title: `${userName} added a dropdown option`,
        message: `Added "${value}" to ${category} category`,
      };
    } else if (log.action.includes('UPDATE')) {
      return {
        title: `${userName} updated a dropdown option`,
        message: `Updated "${value}" in ${category} category`,
      };
    } else if (log.action.includes('DELETE')) {
      return {
        title: `${userName} deleted a dropdown option`,
        message: `Deleted "${value}" from ${category} category`,
      };
    }
  }

  // Handle order operations
  if (log.action_category === 'ORDER') {
    const orderNumber = log.metadata?.order_number || log.target_resource || 'Order';
    if (log.action === 'ORDER_CREATE') {
      return {
        title: `${userName} created an order`,
        message: `Created order ${orderNumber}`,
      };
    } else if (log.action === 'ORDER_UPDATE') {
      const changes = log.changes || {};
      const changedFields = Object.keys(changes);
      
      if (changedFields.length > 0) {
        const changeDescriptions = changedFields.slice(0, 3).map(field => {
          const change = changes[field];
          if (change?.old !== undefined && change?.new !== undefined) {
            return `${field}: "${change.old}" → "${change.new}"`;
          } else if (change?.new !== undefined) {
            return `${field}: "${change.new}"`;
          }
          return field;
        });
        const moreFields = changedFields.length > 3 ? ` and ${changedFields.length - 3} more fields` : '';
        return {
          title: `${userName} updated order ${orderNumber}`,
          message: `Changed: ${changeDescriptions.join(', ')}${moreFields}`,
        };
      }
      
      return {
        title: `${userName} updated an order`,
        message: `Updated order ${orderNumber}`,
      };
    } else if (log.action === 'ORDER_DELETE') {
      return {
        title: `${userName} deleted an order`,
        message: `Deleted order ${orderNumber}`,
      };
    }
  }

  // Handle login/logout
  if (log.action === 'LOGIN') {
    return {
      title: `${userName} logged in`,
      message: `User logged in successfully`,
    };
  }

  if (log.action === 'LOGOUT') {
    return {
      title: `${userName} logged out`,
      message: `User logged out`,
    };
  }

  // Handle user management
  if (log.action_category === 'USER') {
    if (log.action === 'USER_CREATE') {
      return {
        title: `${userName} created a user`,
        message: log.description || `Created new user`,
      };
    } else if (log.action === 'USER_UPDATE') {
      return {
        title: `${userName} updated a user`,
        message: log.description || `Updated user`,
      };
    } else if (log.action === 'USER_DELETE') {
      return {
        title: `${userName} deleted a user`,
        message: log.description || `Deleted user`,
      };
    }
  }

  // Handle authentication actions
  if (log.action_category === 'AUTH') {
    if (log.action === 'PASSWORD_CHANGE') {
      return {
        title: `${userName} changed password`,
        message: `Password changed successfully`,
      };
    } else if (log.action === 'PROFILE_UPDATE') {
      return {
        title: `${userName} updated profile`,
        message: `Profile updated`,
      };
    }
  }

  // Use the description from activity log if available and meaningful
  let message = log.description;
  
  // Check if description is meaningful
  const isGenericDescription = 
    !message ||
    message === 'Action' ||
    message.includes('POST /') ||
    message.includes('GET /') ||
    message.trim() === '';

  // Build message from action and resource if description is generic
  if (isGenericDescription) {
    const actionVerb = log.action.includes('CREATE') ? 'created' :
                       log.action.includes('UPDATE') ? 'updated' :
                       log.action.includes('DELETE') ? 'deleted' : 
                       log.action.includes('VIEW') ? 'viewed' : 'performed action on';
    
    const resourceType = log.target_resource_type || 
                        (log.action_category === 'PRODUCT' ? 'product' :
                         log.action_category === 'MATERIAL' ? 'material' :
                         log.action_category === 'ORDER' ? 'order' :
                         log.action_category === 'USER' ? 'user' :
                         log.action_category?.toLowerCase() || 'item');
    
    const resourceName = log.target_resource || 
                        log.metadata?.product_name ||
                        log.metadata?.material_name ||
                        log.metadata?.order_number ||
                        log.metadata?.name ||
                        '';

    // Build message from action and resource
    if (resourceName && resourceName !== 'N/A') {
      message = `${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)} ${resourceType} "${resourceName}"`;
    } else {
      message = `${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)} ${resourceType}`;
    }
    
    // Add meaningful endpoint info
    if (log.endpoint && 
        log.endpoint !== '/' && 
        !log.endpoint.includes('/api/') &&
        !log.endpoint.includes('/auth/login') &&
        !log.endpoint.includes('/auth/logout')) {
      message += ` via ${log.method} ${log.endpoint}`;
    }
  }

  // Build title
  const actionVerb = log.action.includes('CREATE') ? 'created' :
                     log.action.includes('UPDATE') ? 'updated' :
                     log.action.includes('DELETE') ? 'deleted' : 
                     log.action.includes('VIEW') ? 'viewed' : 'performed action';
  
  const resourceType = log.target_resource_type || 
                      (log.action_category === 'PRODUCT' ? 'product' :
                       log.action_category === 'MATERIAL' ? 'material' :
                       log.action_category === 'ORDER' ? 'order' :
                       log.action_category === 'USER' ? 'user' :
                       log.action_category?.toLowerCase() || 'item');

  return {
    title: `${userName} ${actionVerb} ${resourceType}`,
    message: message,
  };
};

