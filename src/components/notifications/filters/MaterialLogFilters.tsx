import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface MaterialLogFiltersProps {
  filterAction: string;
  filterStatus: string;
  onActionChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export default function MaterialLogFilters({
  filterAction,
  filterStatus,
  onActionChange,
  onStatusChange,
}: MaterialLogFiltersProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="filter-action" className="mb-2 block text-xs font-medium text-gray-700">
              Action Type
            </Label>
            <Select value={filterAction} onValueChange={onActionChange}>
              <SelectTrigger id="filter-action">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="MATERIAL_CREATE">Created</SelectItem>
                <SelectItem value="MATERIAL_UPDATE">Updated</SelectItem>
                <SelectItem value="MATERIAL_DELETE">Deleted</SelectItem>
                <SelectItem value="PURCHASE_ORDER_CREATE">Purchase Order Created</SelectItem>
                <SelectItem value="PURCHASE_ORDER_STATUS_CHANGE">Status Changed</SelectItem>
                <SelectItem value="PURCHASE_ORDER_UPDATE">Purchase Order Updated</SelectItem>
                <SelectItem value="PURCHASE_ORDER_DELETE">Purchase Order Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filter-status" className="mb-2 block text-xs font-medium text-gray-700">
              Notification Status
            </Label>
            <Select value={filterStatus} onValueChange={onStatusChange}>
              <SelectTrigger id="filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

