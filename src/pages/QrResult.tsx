import { useSearchParams, Navigate } from 'react-router-dom';

type QrData = {
  type: string;
  individualProductId?: string;
  productId?: string;
};

export default function QrResult() {
  const [searchParams] = useSearchParams();
  const dataParam = searchParams.get('data');

  if (!dataParam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center text-gray-600">
          <p className="font-medium">Invalid QR code</p>
          <p className="text-sm mt-1">No data found in the link.</p>
        </div>
      </div>
    );
  }

  let parsed: QrData;
  try {
    parsed = JSON.parse(decodeURIComponent(dataParam)) as QrData;
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center text-gray-600">
          <p className="font-medium">Invalid QR code</p>
          <p className="text-sm mt-1">The link could not be read.</p>
        </div>
      </div>
    );
  }

  if (parsed.type === 'individual' && parsed.productId && parsed.individualProductId) {
    return (
      <Navigate
        to={`/products/${parsed.productId}/stock/${parsed.individualProductId}`}
        replace
      />
    );
  }

  if (parsed.type === 'main' && parsed.productId) {
    return <Navigate to={`/products/${parsed.productId}`} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center text-gray-600">
        <p className="font-medium">Unknown QR code type</p>
        <p className="text-sm mt-1">This QR code is not supported.</p>
      </div>
    </div>
  );
}
