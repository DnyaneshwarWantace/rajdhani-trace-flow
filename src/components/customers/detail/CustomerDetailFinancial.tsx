import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';
import type { Customer } from '@/services/customerService';
import type { Order } from '@/services/orderService';

interface CustomerDetailFinancialProps {
  customer: Customer;
  orders: Order[];
}

export default function CustomerDetailFinancial({ customer, orders }: CustomerDetailFinancialProps) {
  const getCustomerOrders = () => {
    const customerName = customer.name || '';
    return orders.filter(order => {
      if (order.customerId && order.customerId === customer.id) {
        return true;
      }
      if (!order.customerId && customerName && order.customerName && 
          order.customerName.toLowerCase().trim() === customerName.toLowerCase().trim()) {
        return true;
      }
      return false;
    });
  };

  const getCustomerPaymentSummary = () => {
    const customerOrders = getCustomerOrders();
    const totalPaid = customerOrders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
    const totalOutstanding = customerOrders.reduce((sum, order) => sum + (order.outstandingAmount || 0), 0);
    const totalValue = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    return {
      totalPaid,
      totalOutstanding,
      totalValue,
      paymentPercentage: totalValue > 0 ? Math.round((totalPaid / totalValue) * 100) : 0
    };
  };

  const paymentSummary = getCustomerPaymentSummary();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Value</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(paymentSummary.totalValue)}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paymentSummary.totalPaid)}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(paymentSummary.totalOutstanding)}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Payment %</p>
            <p className="text-2xl font-bold text-purple-600">{paymentSummary.paymentPercentage}%</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Credit Limit</span>
            <span className="text-sm font-medium text-gray-900">{formatCurrency(parseFloat(customer.credit_limit || '0'))}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

