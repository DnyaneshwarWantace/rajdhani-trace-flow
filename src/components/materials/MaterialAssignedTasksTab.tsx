import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MaterialAssignedTasksTabProps {
  tasks: any[];
  loading: boolean;
  onCreateOrder: (task: any) => void;
}

export default function MaterialAssignedTasksTab({ tasks, loading, onCreateOrder }: MaterialAssignedTasksTabProps) {
  if (loading) {
    return <div className="py-10 text-center text-sm text-gray-500">Loading assigned tasks...</div>;
  }

  if (tasks.length === 0) {
    return <div className="py-10 text-center text-sm text-gray-500">No assigned material tasks.</div>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const shortages = task?.related_data?.shortages || [];
        return (
          <Card key={task.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{task.title}</div>
                  <div className="text-xs text-gray-600">{task.related_data?.order_number} · {task.related_data?.customer_name}</div>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">Assigned</Badge>
              </div>
              <div className="space-y-1">
                {shortages.length > 0 ? (
                  shortages.map((s: any, idx: number) => (
                    <div key={`${task.id}-${idx}`} className="text-xs text-gray-700">
                      {s.material_name}: stock {s.current_stock} {s.unit} · ordered {s.order_quantity} {s.unit} · need {s.need_to_add} {s.unit}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-700">
                    {task?.related_data?.material_name}: stock {task?.related_data?.current_stock} {task?.related_data?.unit} ·
                    {' '}ordered {task?.related_data?.order_quantity} {task?.related_data?.unit} ·
                    {' '}need {task?.related_data?.need_to_add} {task?.related_data?.unit}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                  onClick={() => onCreateOrder(task)}
                >
                  Create Order
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

