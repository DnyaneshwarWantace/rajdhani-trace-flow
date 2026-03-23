import { ShieldOff } from 'lucide-react';

interface PermissionDeniedProps {
  message?: string;
}

export default function PermissionDenied({ message }: PermissionDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <ShieldOff className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Restricted</h2>
      <p className="text-gray-500 max-w-sm">
        {message ?? "You don't have permission to view this. Please contact your administrator to request access."}
      </p>
    </div>
  );
}
