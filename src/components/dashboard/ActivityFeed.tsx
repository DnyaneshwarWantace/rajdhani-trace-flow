import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Package, 
  Factory, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  User
} from "lucide-react";

interface ActivityFeedProps {
  orders?: any[];
  products?: any[];
  loading?: boolean;
}

export function ActivityFeed({ orders = [], products = [], loading }: ActivityFeedProps) {
  // Create activity items from orders and products
  const activities = [
    ...orders.slice(0, 5).map(order => ({
      id: `order-${order.id}`,
      type: 'order',
      title: `Order ${order.order_number || order.id}`,
      description: `Customer: ${order.customer_name}`,
      status: order.status,
      amount: order.total_amount,
      paid: order.paid_amount,
      outstanding: (order.total_amount || 0) - (order.paid_amount || 0),
      timestamp: order.order_date || order.created_at,
      icon: ShoppingCart
    })),
    ...products.slice(0, 3).map(product => ({
      id: `product-${product.id}`,
      type: 'product',
      title: product.name,
      description: `${product.category} - ${product.quantity} pieces`,
      status: product.status,
      timestamp: product.created_at,
      icon: Package
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
      case 'in-stock':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'in_production':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready':
      case 'dispatched':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
      case 'out-of-stock':
        return 'bg-red-100 text-red-800';
      case 'low-stock':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
      case 'in_production':
        return <Clock className="w-4 h-4" />;
      case 'ready':
      case 'dispatched':
        return <Factory className="w-4 h-4" />;
      case 'cancelled':
      case 'out-of-stock':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  variants={itemVariants}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <activity.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-black truncate">
                        {activity.title}
                      </h4>
                      <Badge className={`text-xs ${getStatusColor(activity.status)}`}>
                        {activity.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {activity.description}
                    </p>
                    
                    {activity.type === 'order' && activity.amount && (
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>Total: {formatAmount(activity.amount)}</span>
                        </div>
                        {activity.paid > 0 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>Paid: {formatAmount(activity.paid)}</span>
                          </div>
                        )}
                        {activity.outstanding > 0 && (
                          <div className="flex items-center gap-1 text-orange-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Outstanding: {formatAmount(activity.outstanding)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(activity.timestamp)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
              <p className="text-sm text-gray-500">
                Activity will appear here as orders and products are created.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

