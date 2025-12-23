import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface TopProductsTableProps {
  demandData: {
    _id: {
      product_id: string;
      product_name: string;
      year: number;
      month: number;
    };
    count: number;
  }[];
  producedData: {
    _id: {
      product_id: string;
      product_name: string;
    };
    total_quantity: number;
    batch_count: number;
  }[];
}

export default function TopProductsTable({ demandData, producedData }: TopProductsTableProps) {
  // Group demand by product
  const productDemandMap = new Map<string, { name: string; sold: number }>();
  demandData.forEach((item) => {
    const existing = productDemandMap.get(item._id.product_id);
    if (existing) {
      existing.sold += item.count;
    } else {
      productDemandMap.set(item._id.product_id, {
        name: item._id.product_name,
        sold: item.count,
      });
    }
  });

  // Combine with production data
  const combinedData = producedData.map((prod) => {
    const demand = productDemandMap.get(prod._id.product_id);
    const details = prod.product_details;

    return {
      product_id: prod._id.product_id,
      product_name: prod._id.product_name,
      produced_quantity: prod.total_quantity,
      batch_count: prod.batch_count,
      sold_quantity: demand?.sold || 0,
      available: prod.available || 0,
      category: details?.category || '-',
      subcategory: details?.subcategory || '',
      length: details?.length || '',
      length_unit: details?.length_unit || '',
      width: details?.width || '',
      width_unit: details?.width_unit || '',
      weight: details?.weight || '',
      weight_unit: details?.weight_unit || '',
      color: details?.color || '',
      pattern: details?.pattern || '',
    };
  });

  // Sort by produced quantity
  combinedData.sort((a, b) => b.produced_quantity - a.produced_quantity);

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
          Top Products Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Name & Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dimensions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produced
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batches
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sold
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {combinedData.slice(0, 10).map((product, index) => {
                  // Build dimensions string
                  const dimensions = [];
                  if (product.length && product.width) {
                    dimensions.push(`${product.length}${product.length_unit} × ${product.width}${product.width_unit}`);
                  } else if (product.length) {
                    dimensions.push(`${product.length}${product.length_unit}`);
                  }
                  if (product.weight && product.weight !== 'N/A') {
                    dimensions.push(`${product.weight}${product.weight_unit}`);
                  }
                  const dimensionsText = dimensions.length > 0 ? dimensions.join(' | ') : '-';

                  // Build color/pattern string
                  const details = [];
                  if (product.color && product.color !== 'NA' && product.color !== 'N/A') {
                    details.push(product.color);
                  }
                  if (product.pattern && product.pattern !== 'NA' && product.pattern !== 'N/A') {
                    details.push(product.pattern);
                  }

                  return (
                    <tr key={product.product_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <TruncatedText
                            text={product.product_name}
                            maxLength={40}
                            className="text-sm font-medium text-gray-900"
                          />
                          {details.length > 0 && (
                            <div className="text-xs text-gray-500">
                              <TruncatedText text={details.join(' • ')} maxLength={30} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          <TruncatedText text={product.category} maxLength={15} />
                          {product.subcategory && (
                            <>
                              <span className="text-gray-500"> / </span>
                              <TruncatedText text={product.subcategory} maxLength={15} className="text-gray-500" />
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600">{dimensionsText}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 font-medium">
                          {product.produced_quantity}
                        </div>
                        <div className="text-xs text-gray-500">
                          {product.available} available
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.batch_count}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {product.sold_quantity}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
