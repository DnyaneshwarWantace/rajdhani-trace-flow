import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

export interface MonthlyDemand {
  _id: {
    product_id: string;
    product_name: string;
    year: number;
    month: number;
  };
  count: number;
}

export interface ProducedProduct {
  _id: {
    product_id: string;
    product_name: string;
  };
  total_quantity: number;
  batch_count: number;
  available?: number;
  in_production?: number;
  sold?: number;
  used?: number;
  damaged?: number;
  product_details?: {
    category?: string;
    subcategory?: string;
    length?: string;
    length_unit?: string;
    width?: string;
    width_unit?: string;
    weight?: string;
    weight_unit?: string;
    color?: string;
    pattern?: string;
    unit?: string;
  };
}

export interface MonthlySales {
  year: number;
  month: number;
  month_name: string;
  label: string;
  total_sold: number;
  unique_products: number;
}

export interface MonthlyProduction {
  year: number;
  month: number;
  month_name: string;
  label: string;
  total_batches: number;
  total_quantity: number;
  completed_batches: number;
  unique_products: number;
}

export class AnalyticsService {
  private static getHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async getProductDemandByMonth(months: number = 6): Promise<MonthlyDemand[]> {
    const response = await fetch(`${API_URL}/analytics/product-demand-monthly?months=${months}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch product demand data');
    }

    const data = await response.json();
    return data.data;
  }

  static async getMostProducedProducts(limit: number = 10, months?: number): Promise<ProducedProduct[]> {
    const url = new URL(`${API_URL}/analytics/most-produced`);
    url.searchParams.append('limit', limit.toString());
    if (months) {
      url.searchParams.append('months', months.toString());
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch most produced products');
    }

    const data = await response.json();
    return data.data;
  }

  static async getMonthlySalesAnalytics(months: number = 12): Promise<MonthlySales[]> {
    const response = await fetch(`${API_URL}/analytics/sales-monthly?months=${months}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch monthly sales analytics');
    }

    const data = await response.json();
    return data.data;
  }

  static async getMonthlyProductionAnalytics(months: number = 12): Promise<MonthlyProduction[]> {
    const response = await fetch(`${API_URL}/analytics/production-monthly?months=${months}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch monthly production analytics');
    }

    const data = await response.json();
    return data.data;
  }
}
