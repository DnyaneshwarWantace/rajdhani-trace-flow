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

  // Material-related actions
  if (category === 'MATERIAL' || action.includes('MATERIAL_')) {
    const materialName = metadata.material_name || log.target_resource || 'Material';

    if (action === 'MATERIAL_CREATE') {
      return `${userName} added new material "${materialName}" to inventory`;
    }

    if (action === 'MATERIAL_UPDATE') {
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

    if (action === 'MATERIAL_DELETE') {
      return `${userName} removed material "${materialName}" from inventory`;
    }
  }

  // Purchase Order actions - check category, action, or description
  const isPurchaseOrder = category === 'PURCHASE_ORDER' || 
                         action.includes('PURCHASE_ORDER') || 
                         action === 'PurchaseOrder' ||
                         (log.description && log.description.toLowerCase().includes('purchase order'));
  
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

