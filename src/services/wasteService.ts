import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

export interface WasteItem {
  id: string;
  waste_number?: string;
  material_id?: string;
  material_name: string;
  material_type?: 'raw_material' | 'product';
  quantity: number;
  unit: string;
  waste_type: string;
  waste_category?: string;
  can_be_reused: boolean;
  production_batch_id?: string;
  production_id?: string;
  batch_id?: string;
  product_id?: string;
  product_name?: string;
  status: 'generated' | 'disposed' | 'reused' | 'added_to_inventory' | 'available_for_reuse'; // 'available_for_reuse' is frontend display only
  generation_date?: string;
  created_at?: string;
  added_at?: string;
  updated_at?: string;
}

export class WasteService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Map backend enum values back to user-friendly display names
  static mapWasteTypeToDisplay(wasteType: string): string {
    const mapping: Record<string, string> = {
      'cutting_waste': 'Scrap',
      'defective_products': 'Defective',
      'excess_material': 'Excess',
      'contamination': 'Contamination',
      'expired_material': 'Expired Material',
      'other': 'Other',
    };
    return mapping[wasteType] || wasteType;
  }

  // Get all waste items
  static async getAllWaste(): Promise<WasteItem[]> {
    try {
      const response = await fetch(`${API_URL}/production/waste`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch waste items');
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching waste items:', error);
      return [];
    }
  }

  // Return waste to inventory
  static async returnWasteToInventory(wasteId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/production/waste/${wasteId}/return-to-inventory`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const result = await response.json();
        return { success: false, error: result.error || 'Failed to return waste to inventory' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error returning waste to inventory:', error);
      return { success: false, error: 'Failed to return waste to inventory' };
    }
  }

  // Get waste count (for badge)
  static async getWasteCount(): Promise<number> {
    try {
      const wasteItems = await this.getAllWaste();
      // Count items that are available for reuse
      return wasteItems.filter(
        (item) =>
          (item.can_be_reused && !item.added_at && item.status !== 'added_to_inventory' && item.status !== 'reused') ||
          item.status === 'available_for_reuse'
      ).length;
    } catch (error) {
      console.error('Error getting waste count:', error);
      return 0;
    }
  }
}

