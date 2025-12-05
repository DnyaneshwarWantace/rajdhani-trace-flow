import type { ActivityLog } from '@/services/socketService';

/**
 * Format activity log into a user-friendly, WhatsApp-ready message
 * Focus on material-related actions for now
 */
export function formatActivityMessage(log: ActivityLog): string {
  const action = log.action || '';
  const category = log.action_category || '';
  const metadata = log.metadata || {};
  const changes = log.changes || {};
  const userName = log.user_name || 'User';

  // Material-related actions - MUST check this FIRST before purchase order
  // Check by category, action, or endpoint to catch all material actions
  const isMaterial = category === 'MATERIAL' || 
                    action.includes('MATERIAL_') ||
                    action === 'MATERIAL_CREATE' ||
                    action === 'MATERIAL_UPDATE' ||
                    action === 'MATERIAL_DELETE' ||
                    (log.endpoint && log.endpoint.includes('/raw-materials')) ||
                    (log.endpoint && log.endpoint.includes('/materials'));

  if (isMaterial) {
    const materialName = metadata.material_name || log.target_resource || 'Material';

    if (action === 'MATERIAL_CREATE' || (action.includes('CREATE') && isMaterial)) {
      return `${userName} added new material "${materialName}" to inventory`;
    }

    if (action === 'MATERIAL_UPDATE' || (action.includes('UPDATE') && isMaterial)) {
      const changedFields = Object.keys(changes);
      if (changedFields.length > 0) {
        // Show key changes
        const keyChanges: string[] = [];
        if (changes.name) {
          const nameChange = changes.name;
          keyChanges.push(`name to "${nameChange.new || nameChange}"`);
        }
        if (changes.current_stock) {
          const stockChange = changes.current_stock;
          keyChanges.push(`stock to ${stockChange.new || stockChange}`);
        }
        if (changes.unit_price) {
          const priceChange = changes.unit_price;
          keyChanges.push(`price to ₹${priceChange.new || priceChange}`);
        }
        
        if (keyChanges.length > 0) {
          return `${userName} updated material "${materialName}": ${keyChanges.join(', ')}`;
        }
      }
      return `${userName} updated material "${materialName}"`;
    }

    if (action === 'MATERIAL_DELETE' || (action.includes('DELETE') && isMaterial)) {
      return `${userName} removed material "${materialName}" from inventory`;
    }
  }

  // Product-related actions - check BEFORE purchase order
  const isProduct = category === 'PRODUCT' || 
                   action.includes('PRODUCT_') ||
                   action === 'PRODUCT_CREATE' ||
                   action === 'PRODUCT_UPDATE' ||
                   action === 'PRODUCT_DELETE' ||
                   (log.endpoint && log.endpoint.includes('/products'));

  if (isProduct) {
    const productName = metadata.product_name || log.target_resource || 'Product';

    if (action === 'PRODUCT_CREATE' || (action.includes('CREATE') && isProduct)) {
      // Build detailed message from metadata
      const details: string[] = [];
      if (metadata.category) details.push(metadata.category);
      if (metadata.subcategory) details.push(metadata.subcategory);
      if (metadata.length && metadata.length_unit) {
        details.push(`${metadata.length} ${metadata.length_unit} × ${metadata.width || 'N/A'} ${metadata.width_unit || ''}`);
      }
      if (metadata.base_quantity !== undefined) {
        details.push(`Qty: ${metadata.base_quantity}`);
      }
      if (metadata.unit) {
        details.push(`Unit: ${metadata.unit}`);
      }
      if (metadata.has_recipe) {
        details.push(`Recipe: ${metadata.recipe_count || 0} material(s)`);
      } else {
        details.push('No recipe');
      }

      const detailsText = details.length > 0 ? ` (${details.join(', ')})` : '';
      return `${userName} created product "${productName}"${detailsText}`;
    }

    if (action === 'PRODUCT_UPDATE' || (action.includes('UPDATE') && isProduct)) {
      return `${userName} updated product "${productName}"`;
    }

    if (action === 'PRODUCT_DELETE' || (action.includes('DELETE') && isProduct)) {
      return `${userName} deleted product "${productName}"`;
    }
  }

  // Purchase Order actions - ONLY check if NOT a material or product action
  // Be more strict - don't match just based on description containing "purchase order"
  const isPurchaseOrder = !isMaterial && !isProduct && (
    category === 'PURCHASE_ORDER' || 
    action.includes('PURCHASE_ORDER') || 
    action === 'PurchaseOrder' ||
    (log.endpoint && log.endpoint.includes('/purchase-orders'))
  );
  
  if (isPurchaseOrder) {
    // Extract order number from various sources
    let orderNumber = metadata.order_number || 
                     metadata.orderNumber || 
                     log.target_resource || 
                     (log.description?.match(/ON-\d+-\d+/)?.[0]) ||
                     (log.description?.match(/order\s+([A-Z0-9-]+)/i)?.[1]) ||
                     'Order';
    
    const materialName = metadata.material_name || metadata.materialName || 'Material';

    if (action === 'PURCHASE_ORDER_CREATE' || (action.includes('CREATE') && isPurchaseOrder)) {
      return `${userName} created purchase order ${orderNumber} for ${materialName}`;
    }

    // Check if this is a status change (either explicit action or description indicates status change)
    const isStatusChange = action === 'PURCHASE_ORDER_STATUS_CHANGE' || 
                          action.includes('STATUS_CHANGE') ||
                          (log.description && log.description.toLowerCase().includes('status') && 
                           (log.description.toLowerCase().includes('from') || log.description.toLowerCase().includes('to')));
    
    if (isStatusChange) {
      // Try multiple ways to get the new status
      let newStatus = metadata.new_status || 
                     metadata.status || 
                     changes.status?.new ||
                     changes.new_status?.new ||
                     changes.new_status ||
                     (changes.status && typeof changes.status === 'object' ? changes.status.new : changes.status);
      
      // If still not found, try to extract from description
      if (!newStatus && log.description) {
        // Try pattern: "from X to Y"
        const match = log.description.match(/from\s+"?(\w+)"?\s+to\s+"?(\w+)"?/i);
        if (match && match[2]) {
          newStatus = match[2];
        } else {
          // Try pattern: "status changed to X"
          const statusMatch = log.description.match(/status.*?to\s+"?(\w+)"?/i) || 
                            log.description.match(/to\s+"?(\w+)"?/i);
          if (statusMatch) {
            newStatus = statusMatch[1];
          }
        }
      }
      
      const statusMap: Record<string, string> = {
        'pending': 'pending',
        'approved': 'approved',
        'shipped': 'shipped',
        'delivered': 'delivered',
        'cancelled': 'cancelled',
        'canceled': 'cancelled'
      };
      
      const friendlyStatus = newStatus ? (statusMap[newStatus.toLowerCase()] || newStatus) : 'updated';
      const actionVerb = friendlyStatus === 'approved' ? 'approved' :
                        friendlyStatus === 'shipped' ? 'shipped' :
                        friendlyStatus === 'delivered' ? 'delivered' :
                        friendlyStatus === 'cancelled' ? 'cancelled' :
                        friendlyStatus === 'pending' ? 'set to pending' :
                        `updated status to ${friendlyStatus}`;
      
      return `${userName} ${actionVerb} purchase order ${orderNumber}`;
    }

    if (action === 'PURCHASE_ORDER_UPDATE') {
      return `${userName} updated purchase order ${orderNumber}`;
    }

    if (action === 'PURCHASE_ORDER_DELETE') {
      return `${userName} cancelled purchase order ${orderNumber}`;
    }
  }

  // Fallback to original description if available
  if (log.description && 
      log.description !== 'Action' && 
      !log.description.includes('POST /') && 
      !log.description.includes('GET /')) {
    return log.description;
  }

  // Generic fallback
  const actionVerb = action.includes('CREATE') ? 'created' :
                     action.includes('UPDATE') ? 'updated' :
                     action.includes('DELETE') ? 'deleted' : 'modified';
  
  const resourceType = category === 'MATERIAL' ? 'material' :
                      category === 'PURCHASE_ORDER' ? 'purchase order' :
                      category?.toLowerCase() || 'item';

  return `${resourceType} ${actionVerb}`;
}

