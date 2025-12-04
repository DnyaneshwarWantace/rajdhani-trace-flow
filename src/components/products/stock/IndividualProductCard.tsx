import type { IndividualProduct } from '@/types/product';

interface IndividualProductCardProps {
  individualProduct: IndividualProduct;
  onClick: () => void;
}

export default function IndividualProductCard({
  individualProduct,
  onClick,
}: IndividualProductCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sold':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'damaged':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'returned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getQualityColor = (grade: string) => {
    switch (grade) {
      case 'A+':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'A':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'B':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-600 hover:shadow-md transition-all cursor-pointer"
    >
      {/* QR Code Section */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500">QR Code</p>
            <p className="text-sm font-mono font-semibold text-gray-900">
              {individualProduct.qr_code || individualProduct.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
            individualProduct.status
          )}`}
        >
          {individualProduct.status}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {/* Quality Grade */}
        {individualProduct.quality_grade && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Quality</span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded border ${getQualityColor(
                individualProduct.quality_grade
              )}`}
            >
              {individualProduct.quality_grade}
            </span>
          </div>
        )}

        {/* Dimensions */}
        {(individualProduct.final_length || individualProduct.final_width) && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Dimensions</span>
            <span className="text-xs font-medium text-gray-900">
              {individualProduct.final_width || 'N/A'} x {individualProduct.final_length || 'N/A'}
            </span>
          </div>
        )}

        {/* Weight */}
        {individualProduct.final_weight && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Weight</span>
            <span className="text-xs font-medium text-gray-900">
              {individualProduct.final_weight}
            </span>
          </div>
        )}

        {/* Inspector */}
        {individualProduct.inspector && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Inspector</span>
            <span className="text-xs font-medium text-gray-900">
              {individualProduct.inspector}
            </span>
          </div>
        )}

        {/* Location */}
        {individualProduct.location && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Location</span>
            <span className="text-xs font-medium text-gray-900">
              {individualProduct.location}
            </span>
          </div>
        )}
      </div>

      {/* View Details Button */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button className="w-full text-center text-xs font-medium text-primary-600 hover:text-primary-700">
          View Details
        </button>
      </div>
    </div>
  );
}
