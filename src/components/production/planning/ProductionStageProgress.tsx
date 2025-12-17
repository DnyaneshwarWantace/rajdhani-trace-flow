import { Package, Factory, Trash2, FileText } from 'lucide-react';

interface Stage {
  id: string;
  name: string;
  icon: typeof Package;
  status: 'active' | 'pending' | 'completed';
}

interface ProductionStageProgressProps {
  currentStage: 'planning' | 'machine' | 'wastage' | 'individual';
}

export default function ProductionStageProgress({ currentStage }: ProductionStageProgressProps) {
  const stages: Stage[] = [
    {
      id: 'planning',
      name: 'Material Selection',
      icon: Package,
      status: currentStage === 'planning' ? 'active' : currentStage === 'machine' || currentStage === 'wastage' || currentStage === 'individual' ? 'completed' : 'pending',
    },
    {
      id: 'machine',
      name: 'Machine Operations',
      icon: Factory,
      status: currentStage === 'machine' ? 'active' : currentStage === 'planning' ? 'pending' : currentStage === 'wastage' || currentStage === 'individual' ? 'completed' : 'pending',
    },
    {
      id: 'wastage',
      name: 'Waste Generation',
      icon: Trash2,
      status: currentStage === 'wastage' ? 'active' : currentStage === 'planning' || currentStage === 'machine' ? 'pending' : currentStage === 'individual' ? 'completed' : 'pending',
    },
    {
      id: 'individual',
      name: 'Individual Details',
      icon: FileText,
      status: currentStage === 'individual' ? 'active' : 'pending',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = stage.status === 'active';
          const isCompleted = stage.status === 'completed';

          return (
            <div key={stage.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                {/* Stage Name */}
                <div className="text-center">
                  <p
                    className={`text-sm font-medium ${
                      isActive ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {stage.name}
                  </p>
                  <p
                    className={`text-xs mt-1 px-3 py-1 rounded-full inline-block ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : isCompleted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isActive ? 'Active' : isCompleted ? 'Completed' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 mb-8 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Overall Progress */}
      <div className="mt-6 text-center">
        {(() => {
          const completedCount = stages.filter(s => s.status === 'completed').length;
          const activeCount = stages.filter(s => s.status === 'active').length;
          const progress = ((completedCount + (activeCount * 0.5)) / stages.length) * 100;
          const currentStageName = stages.find(s => s.status === 'active')?.name || 'Material Selection';
          
          return (
            <>
              <p className="text-sm text-gray-600 mb-2">
                Overall Progress: <span className="font-semibold">{Math.round(progress)}% Complete</span>
              </p>
              <p className="text-xs text-gray-500">Current: {currentStageName}</p>
            </>
          );
        })()}
      </div>
    </div>
  );
}
