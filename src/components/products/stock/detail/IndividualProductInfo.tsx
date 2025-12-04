import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIndianDate } from '@/utils/formatHelpers';
import { Calendar, User, MapPin, FileText } from 'lucide-react';
import type { IndividualProduct } from '@/types/product';

interface IndividualProductInfoProps {
  individualProduct: IndividualProduct;
}

export default function IndividualProductInfo({ individualProduct }: IndividualProductInfoProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === 'null') return 'N/A';
    try {
      return formatIndianDate(dateString);
    } catch {
      return 'N/A';
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" />
          Basic Information
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        {individualProduct.inspector && (
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-gray-600">Inspector</p>
              <p className="font-medium text-gray-900">{individualProduct.inspector}</p>
            </div>
          </div>
        )}

        {individualProduct.location && (
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-gray-600">Location</p>
              <p className="font-medium text-gray-900">{individualProduct.location}</p>
            </div>
          </div>
        )}

        {individualProduct.production_date && (
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-gray-600">Production Date</p>
              <p className="font-medium text-gray-900">{formatDate(individualProduct.production_date)}</p>
            </div>
          </div>
        )}

        {individualProduct.completion_date && (
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-gray-600">Completion Date</p>
              <p className="font-medium text-gray-900">{formatDate(individualProduct.completion_date)}</p>
            </div>
          </div>
        )}

        {individualProduct.notes && (
          <div className="sm:col-span-2">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-gray-600 mb-2">Notes</p>
                <p className="font-medium text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap">
                  {individualProduct.notes}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

