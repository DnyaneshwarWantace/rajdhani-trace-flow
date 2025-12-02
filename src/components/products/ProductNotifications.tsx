import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Factory, Clock, CheckCircle, RefreshCw, ArrowRight } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  createdAt: string;
  relatedData?: {
    productId?: string;
    productName?: string;
    requiredQuantity?: number;
    availableStock?: number;
    shortfall?: number;
    threshold?: number;
  };
}

interface ProductNotificationsProps {
  notifications: Notification[];
  handleClearAllNotifications: () => void;
  handleMarkAsRead: (id: string) => void;
  handleResolveNotification: (id: string) => void;
  handleAddToProductionFromNotification: (notification: Notification) => Promise<void>;
  hasIndividualStock: (productId: string) => boolean;
  isAddingToProduction: string | null;
}

export function ProductNotifications({
  notifications,
  handleClearAllNotifications,
  handleMarkAsRead,
  handleResolveNotification,
  handleAddToProductionFromNotification,
  hasIndividualStock,
  isAddingToProduction
}: ProductNotificationsProps) {
  return (
    <div className="space-y-6">
      {notifications.length > 0 ? (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-orange-800">Production Requests & Alerts</CardTitle>
                <Badge variant="destructive" className="ml-2">
                  {notifications.length}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllNotifications}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-4 bg-white rounded-lg border border-orange-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Factory className="w-4 h-4 text-orange-600" />
                      <h4 className="font-semibold text-orange-800">{notification.title}</h4>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        {notification.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                    {notification.relatedData && (
                      <div className="text-xs text-gray-500">
                        {notification.relatedData.productName && (
                          <div>Product: {notification.relatedData.productName}</div>
                        )}
                        {notification.relatedData.requiredQuantity && (
                          <div>Required: {notification.relatedData.requiredQuantity} products</div>
                        )}
                        {notification.relatedData.availableStock !== undefined && (
                          <div>Available: {notification.relatedData.availableStock} products</div>
                        )}
                        {notification.relatedData.shortfall && (
                          <div>Shortfall: {notification.relatedData.shortfall} products</div>
                        )}
                        {notification.relatedData.threshold && (
                          <div>Threshold: {notification.relatedData.threshold} units</div>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    {notification.type === 'production_request' || notification.type === 'low_stock' || notification.type === 'order_alert' ? (
                      notification.relatedData && hasIndividualStock(notification.relatedData.productId || '') ? (
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700"
                          onClick={async () => await handleAddToProductionFromNotification(notification)}
                          disabled={isAddingToProduction === notification.relatedData?.productId}
                        >
                          {isAddingToProduction === notification.relatedData?.productId ? (
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <ArrowRight className="w-3 h-3 mr-1" />
                          )}
                          {isAddingToProduction === notification.relatedData?.productId ? 'Adding...' : 'Add to Production'}
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Bulk Product</span>
                      )
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Mark as Read
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleResolveNotification(notification.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">No pending notifications or production requests.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

