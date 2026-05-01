import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Loader2, FileDown, Download } from 'lucide-react';
import { IndividualProductService } from '@/services/individualProductService';
import { downloadQRsAsPdf, type ProductInfo } from '@/utils/qrPdfExport';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';
import { useToast } from '@/hooks/use-toast';
import type { IndividualProduct } from '@/types/product';
import type { ProductionBatch } from '@/services/productionService';

function weightKgFromRow(item: IndividualProduct): number | null {
  const gsm = parseFloat((item.final_weight || '').toString().replace(/[^\d.]/g, ''));
  const lengthStr = (item.final_length || '').toString();
  const widthStr = (item.final_width || '').toString();
  let lengthM = parseFloat(lengthStr.replace(/[^\d.]/g, ''));
  let widthM = parseFloat(widthStr.replace(/[^\d.]/g, ''));
  if (lengthStr.toLowerCase().includes('feet')) lengthM *= 0.3048;
  if (widthStr.toLowerCase().includes('feet')) widthM *= 0.3048;
  if (!isNaN(gsm) && !isNaN(lengthM) && !isNaN(widthM) && gsm > 0 && lengthM > 0 && widthM > 0) {
    return (gsm * lengthM * widthM) / 1000;
  }
  return null;
}

interface ProductionIndividualProductsProps {
  batch: ProductionBatch;
}

export default function ProductionIndividualProducts({ batch }: ProductionIndividualProductsProps) {
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingRowId, setDownloadingRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { patternImageMap } = useDropdownVisualMaps();

  const buildProductInfo = (): ProductInfo => ({
    name: batch.product_name || batch.product_id || 'batch',
    color: batch.color,
    pattern: batch.pattern,
    patternImageUrl: batch.pattern ? patternImageMap[batch.pattern] : undefined,
    length: batch.length,
    length_unit: batch.length_unit,
    width: batch.width,
    width_unit: batch.width_unit,
    weight: batch.weight,
    weight_unit: batch.weight_unit,
  });

  const handleDownloadQrPdf = async (items?: IndividualProduct[]) => {
    const list = items ?? individualProducts;
    const withQr = list.filter((p) => p.qr_code);
    if (withQr.length === 0) {
      toast({ title: 'No QR codes', description: 'No QR codes available to download.', variant: 'destructive' });
      return;
    }
    setDownloadingPdf(true);
    toast({ title: 'Generating PDF…', description: `Preparing ${withQr.length} QR codes, please wait.` });
    try {
      const productName = batch.product_name || batch.product_id || 'batch';
      const title = `${productName} (Batch ${batch.batch_number || ''})`;
      await downloadQRsAsPdf(
        withQr,
        title,
        `${productName}-${batch.batch_number || 'batch'}-qr-codes.pdf`,
        undefined,
        buildProductInfo()
      );
      toast({ title: 'PDF Downloaded', description: `${withQr.length} QR codes saved as PDF.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadSingle = async (item: IndividualProduct) => {
    if (!item.qr_code) return;
    setDownloadingRowId(item.id);
    try {
      const productName = batch.product_name || batch.product_id || 'batch';
      const roll = item.roll_number || item.id;
      await downloadQRsAsPdf(
        [item],
        `${productName} — Roll ${roll}`,
        `${productName}-roll-${roll}-qr.pdf`,
        undefined,
        buildProductInfo()
      );
    } catch {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    } finally {
      setDownloadingRowId(null);
    }
  };

  const handleDownloadSelected = () => {
    const selected = individualProducts.filter((p) => selectedIds.has(p.id));
    handleDownloadQrPdf(selected);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const withQr = individualProducts.filter((p) => p.qr_code);
    if (selectedIds.size === withQr.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(withQr.map((p) => p.id)));
    }
  };

  useEffect(() => {
    if (batch?.product_id && batch?.batch_number) {
      loadIndividualProducts();
    }
  }, [batch?.product_id, batch?.batch_number]);

  const loadIndividualProducts = async () => {
    try {
      setLoading(true);
      const { products } = await IndividualProductService.getIndividualProducts({
        product_id: batch.product_id,
        batch_number: batch.batch_number,
        limit: 500,
      });
      setIndividualProducts(products || []);
    } catch (error) {
      console.error('Error loading individual products:', error);
      setIndividualProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (individualProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            Individual Products Created
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-8">
            No individual products have been created for this production batch yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const withQr = individualProducts.filter((p) => p.qr_code);
  const allSelected = withQr.length > 0 && selectedIds.size === withQr.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            Individual Products Created ({individualProducts.length})
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSelected}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                PDF ({selectedIds.size} selected)
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadQrPdf()}
              disabled={downloadingPdf || withQr.length === 0}
            >
              {downloadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
              PDF (All)
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          These are the individual products created in this production batch
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-2 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">#</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Product ID</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">QR Code</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Serial Number</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Dimensions</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Weight</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Status</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Location</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Inspector</th>
                <th className="border border-gray-200 p-2 text-left text-sm font-medium">Created Date</th>
                <th className="border border-gray-200 p-2 text-center text-sm font-medium">QR PDF</th>
              </tr>
            </thead>
            <tbody>
              {individualProducts.map((product, index) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-2 text-center">
                    {product.qr_code ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="cursor-pointer"
                      />
                    ) : null}
                  </td>
                  <td className="border border-gray-200 p-2 text-gray-600">{index + 1}</td>
                  <td className="border border-gray-200 p-2 font-mono text-sm text-gray-900">{product.id}</td>
                  <td className="border border-gray-200 p-2 font-mono text-sm text-gray-900">{product.qr_code || '—'}</td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900">{product.serial_number || '—'}</td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900">
                    {product.final_length && product.final_width
                      ? `${product.final_length} × ${product.final_width}`
                      : '—'}
                  </td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900">
                    {(() => {
                      const wKg = weightKgFromRow(product);
                      return product.final_weight ? (
                        <>
                          {product.final_weight}
                          {wKg !== null && (
                            <span className="text-gray-500 ml-1">({wKg.toFixed(4)} kg)</span>
                          )}
                        </>
                      ) : '—';
                    })()}
                  </td>
                  <td className="border border-gray-200 p-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        product.status === 'available' ? 'bg-green-50 text-green-700 border-green-300' :
                        product.status === 'sold' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                        product.status === 'damaged' ? 'bg-red-50 text-red-700 border-red-300' :
                        'bg-gray-50 text-gray-700 border-gray-300'
                      }`}
                    >
                      {product.status || 'N/A'}
                    </Badge>
                  </td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900 truncate max-w-[150px]" title={product.location || ''}>
                    {product.location || '—'}
                  </td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900">{product.inspector || '—'}</td>
                  <td className="border border-gray-200 p-2 text-sm text-gray-900">
                    {product.created_at ? new Date(product.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="border border-gray-200 p-2 text-center">
                    {product.qr_code ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleDownloadSingle(product)}
                        disabled={downloadingRowId === product.id}
                        title="Download QR PDF"
                      >
                        {downloadingRowId === product.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                      </Button>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
