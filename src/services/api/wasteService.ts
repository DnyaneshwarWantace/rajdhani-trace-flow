import AuthService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Valid backend enum values for waste_type
export type WasteType = 'cutting_waste' | 'defective_products' | 'excess_material' | 'contamination' | 'expired_material' | 'other';

export interface CreateWastePayload {
  material_id?: string;
  material_name: string;
  material_type?: 'raw_material' | 'product'; // Track if it's a raw material or product
  quantity: number;
  unit: string;
  waste_type: string;
  can_be_reused?: boolean;
  production_batch_id?: string;
  production_product_id?: string;
  product_id?: string;
  product_name?: string;
  waste_category?: string;
  waste_percentage?: number;
  generation_date?: string;
  generation_stage?: string;
  reason?: string;
  notes?: string;
}

export default class WasteService {
  // Map frontend waste types to backend enum values
  private static mapWasteType(wasteType: string): WasteType {
    // Normalize to lowercase for comparison
    const normalized = wasteType.toLowerCase().trim();
    const mapping: Record<string, WasteType> = {
      'scrap': 'cutting_waste',
      'defective': 'defective_products',
      'excess': 'excess_material',
      'cutting_waste': 'cutting_waste',
      'defective_products': 'defective_products',
      'excess_material': 'excess_material',
      'contamination': 'contamination',
      'expired_material': 'expired_material',
      'other': 'other'
    };
    return mapping[normalized] || 'other';
  }

  // Map backend enum values back to user-friendly display names
  static mapWasteTypeToDisplay(wasteType: string): string {
    const mapping: Record<string, string> = {
      'cutting_waste': 'Scrap',
      'defective_products': 'Defective',
      'excess_material': 'Excess',
      'contamination': 'Contamination',
      'expired_material': 'Expired Material',
      'other': 'Other'
    };
    return mapping[wasteType] || wasteType;
  }

  static async createWaste(payload: CreateWastePayload): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/waste`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          // Backend expects ProductionWaste fields
          material_id: payload.material_id,
          material_name: payload.material_name,
          material_type: payload.material_type || 'raw_material', // Include material type
          quantity: payload.quantity,
          unit: payload.unit,
          waste_type: this.mapWasteType(payload.waste_type), // Map Scrap/Defective/Excess to backend enum
          can_be_reused: payload.can_be_reused ?? false,
          batch_id: payload.production_batch_id,
          production_id: payload.production_product_id,
          product_id: payload.product_id || payload.production_product_id,
          product_name: payload.product_name || 'Unknown Product',
          waste_category: payload.can_be_reused ? 'reusable' : 'disposable', // Valid: recyclable, reusable, disposable, hazardous, organic
          waste_percentage: payload.waste_percentage || 0,
          generation_date: payload.generation_date || new Date().toISOString(),
          generation_stage: 'weaving', // Valid: raw_material, cutting, weaving, finishing, packaging, quality_check
          reason: payload.reason || payload.notes || 'Waste generated during production',
          notes: payload.notes || ''
        })
      });
      const result = await response.json();
      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create waste' };
      }
      return { data: result.data, error: null };
    } catch (err) {
      console.error('Error in WasteService.createWaste:', err);
      return { data: null, error: 'Failed to create waste' };
    }
  }

  static async getWasteByBatch(batchId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams({ batch_id: batchId });
      const response = await fetch(`${API_BASE_URL}/production/waste?${params.toString()}`, {
        headers: getHeaders()
      });
      const result = await response.json();
      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch waste' };
      }
      return { data: result.data, error: null };
    } catch (err) {
      console.error('Error in WasteService.getWasteByBatch:', err);
      return { data: null, error: 'Failed to fetch waste' };
    }
  }

  static async getAllWaste(): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/waste`, {
        headers: getHeaders()
      });
      const result = await response.json();
      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch waste' };
      }
      return { data: result.data, error: null };
    } catch (err) {
      console.error('Error in WasteService.getAllWaste:', err);
      return { data: null, error: 'Failed to fetch waste' };
    }
  }

  static async returnWasteToInventory(wasteId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/waste/${wasteId}/return-to-inventory`, {
        method: 'POST',
        headers: getHeaders()
      });
      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to return waste to inventory' };
      }
      return { success: true, error: null };
    } catch (err) {
      console.error('Error in WasteService.returnWasteToInventory:', err);
      return { success: false, error: 'Failed to return waste to inventory' };
    }
  }
}
