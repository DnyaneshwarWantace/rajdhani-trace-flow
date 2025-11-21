// Customer Service for MongoDB Backend
// Handles customer CRUD operations and GST integration

import AuthService from './api/authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  customer_type: 'individual' | 'business';
  status: 'active' | 'inactive' | 'suspended' | 'new';
  company_name?: string;
  gst_number?: string;
  permanent_address?: string; // JSON string
  delivery_address?: string; // JSON string
  credit_limit: string;
  outstanding_amount: string;
  total_orders: number;
  total_value: string;
  last_order_date?: string;
  registration_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerData {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  customer_type: 'individual' | 'business';
  company_name?: string;
  gst_number?: string;
  permanent_address?: string; // JSON string
  delivery_address?: string; // JSON string
  credit_limit?: string;
  notes?: string;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  status?: 'active' | 'inactive' | 'suspended' | 'new';
}

export class CustomerService {
  // Create a new customer
  static async createCustomer(customerData: CreateCustomerData): Promise<{ data: Customer | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(customerData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create customer' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createCustomer:', error);
      return { data: null, error: 'Failed to create customer' };
    }
  }

  // Get all customers
  static async getCustomers(filters?: {
    search?: string;
    status?: string;
    customer_type?: string;
  }): Promise<{ data: Customer[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams();

      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.customer_type) params.append('customer_type', filters.customer_type);

      const response = await fetch(`${API_BASE_URL}/customers?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch customers' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getCustomers:', error);
      return { data: null, error: 'Failed to fetch customers' };
    }
  }

  // Get customer by ID
  static async getCustomerById(customerId: string): Promise<{ data: Customer | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Customer not found' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getCustomerById:', error);
      return { data: null, error: 'Failed to fetch customer' };
    }
  }

  // Update customer
  static async updateCustomer(customerId: string, updateData: UpdateCustomerData): Promise<{ data: Customer | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update customer' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in updateCustomer:', error);
      return { data: null, error: 'Failed to update customer' };
    }
  }

  // Delete customer
  static async deleteCustomer(customerId: string): Promise<{ data: boolean | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to delete customer' };
      }

      return { data: result.success, error: null };
    } catch (error) {
      console.error('Error in deleteCustomer:', error);
      return { data: null, error: 'Failed to delete customer' };
    }
  }

  // Get all customer statistics
  static async getAllCustomerStats(): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/stats`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch customer stats' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getAllCustomerStats:', error);
      return { data: null, error: 'Failed to fetch customer stats' };
    }
  }

  // Get customer statistics for specific customer
  static async getCustomerStats(customerId: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/stats`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch customer stats' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getCustomerStats:', error);
      return { data: null, error: 'Failed to fetch customer stats' };
    }
  }

  // Get customer orders
  static async getCustomerOrders(customerId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/orders`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch customer orders' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getCustomerOrders:', error);
      return { data: null, error: 'Failed to fetch customer orders' };
    }
  }

  // Update credit limit
  static async updateCreditLimit(customerId: string, creditLimit: string): Promise<{ data: Customer | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/credit-limit`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ credit_limit: creditLimit }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update credit limit' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in updateCreditLimit:', error);
      return { data: null, error: 'Failed to update credit limit' };
    }
  }
}