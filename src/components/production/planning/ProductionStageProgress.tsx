import { Package, Factory, Trash2, FileText, Check } from 'lucide-react';

interface ProductionStageProgressProps {
  currentStage: 'planning' | 'machine' | 'wastage' | 'individual';
}

export default function ProductionStageProgress({ currentStage }: ProductionStageProgressProps) {
  const stages = [
    { id: 'planning',    name: 'Material Selection',  icon: Package  },
    { id: 'machine',     name: 'Machine Operations',  icon: Factory  },
    { id: 'individual',  name: 'Individual Details',  icon: FileText },
    { id: 'wastage',     name: 'Waste Generation',    icon: Trash2   },
  ];

  const order = ['planning', 'machine', 'individual', 'wastage'];
  const currentIdx = order.indexOf(currentStage);

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 mb-4 flex items-center justify-between">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const stageIdx = order.indexOf(stage.id);
        const isActive = stage.id === currentStage;
        const isCompleted = stageIdx < currentIdx;

        return (
          <div key={stage.id} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                isActive ? 'bg-primary-600 text-white' :
                isCompleted ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${
                isActive ? 'text-primary-600' :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`}>
                {stage.name}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div className={`h-px w-6 mx-2 flex-shrink-0 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
