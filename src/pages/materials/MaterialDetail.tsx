import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { MaterialService } from '@/services/materialService';
import type { RawMaterial } from '@/types/material';
import MaterialDetailHeader from '@/components/materials/detail/MaterialDetailHeader';
import MaterialDetailStats from '@/components/materials/detail/MaterialDetailStats';
import MaterialDetailInfo from '@/components/materials/detail/MaterialDetailInfo';
import MaterialDetailStock from '@/components/materials/detail/MaterialDetailStock';
import MaterialDetailReorderHistory from '@/components/materials/detail/MaterialDetailReorderHistory';
import MaterialDetailTransactionHistory from '@/components/materials/detail/MaterialDetailTransactionHistory';
import AddMaterialDialog from '@/components/materials/AddMaterialDialog';
import { Loader2, AlertCircle, ArrowLeft, Edit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatIndianNumberWithDecimals, formatCurrency, formatIndianDate } from '@/utils/formatHelpers';

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
      <p className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-1.5">{label}</p>
      <p className="text-sm font-bold text-gray-900 leading-tight break-words">{value || '—'}</p>
    </div>
  );
}

export default function MaterialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadMaterial();
    }
  }, [id]);

  const loadMaterial = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!id) {
        throw new Error('Material ID is required');
      }
      const data = await MaterialService.getMaterialById(id);
      setMaterial(data);
    } catch (err) {
      console.error('Error loading material:', err);
      setError(err instanceof Error ? err.message : 'Failed to load material');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditOpen(true);
  };

  const handleBack = () => {
    const fromPath = location.state?.fromPath;
    const isInkMaterial = String(material?.category || '').trim().toLowerCase() === 'ink';
    if (fromPath === '/ink' || (!fromPath && isInkMaterial)) {
      navigate('/ink');
      return;
    }
    navigate('/materials');
  };

  const handleEditSuccess = () => {
    loadMaterial();
    setIsEditOpen(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading material details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !material) {
    return (
      <Layout>
        <div>
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Material Not Found</h2>
              <p className="text-gray-600 mb-6">{error || 'The material you are looking for does not exist.'}</p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Back to Materials
              </button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const isInk = (material.category || '').toString().toLowerCase().trim() === 'ink';
  const availableStock = material.available_stock ?? material.current_stock;
  const hasStockBreakdown = (material.in_production ?? 0) > 0 || (material.reserved ?? 0) > 0 || (material.used ?? 0) > 0 || (material.sold ?? 0) > 0;

  const getStatusStyle = () => {
    switch (material.status) {
      case 'in-stock': return { bg: 'bg-green-100', text: 'text-green-700', label: 'In Stock' };
      case 'low-stock': return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Low Stock' };
      case 'out-of-stock': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Out of Stock' };
      case 'overstock': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Overstock' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: material.status };
    }
  };
  const statusStyle = getStatusStyle();

  return (
    <Layout>
      <div>
        {/* ── DESKTOP ─────────────────────────────────────────── */}
        <div className="hidden lg:block">
          <MaterialDetailHeader material={material} onBack={handleBack} onEdit={handleEdit} />
          <MaterialDetailStats material={material} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <MaterialDetailStock material={material} />
            <MaterialDetailInfo material={material} />
          </div>
          <MaterialDetailReorderHistory material={material} />
          <MaterialDetailTransactionHistory material={material} />
          {material.image_url && (
            <Card className="mb-6">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Image</h3>
                <div className="relative w-full max-w-md mx-auto">
                  <img src={material.image_url} alt={material.name} className="w-full h-auto rounded-lg border border-gray-200 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── MOBILE ──────────────────────────────────────────── */}
        <div className="lg:hidden -mx-3 sm:-mx-4 -mt-4 bg-[#F3F4F6] min-h-screen pb-24">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-4 sm:px-6 pt-4 pb-3">
            <div className="flex items-center justify-between gap-2">
              <button onClick={handleBack} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white shrink-0">
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button onClick={handleEdit} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white shrink-0">
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="mt-3">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{material.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                  {statusStyle.label}
                </span>
                {material.category && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{material.category}</span>
                )}
                {material.type && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{material.type}</span>
                )}
              </div>
            </div>
          </div>

          <div className="px-3 sm:px-4 py-3 space-y-3">
            {/* Stock breakdown strip */}
            {hasStockBreakdown && (() => {
              const stripStats = [
                { label: 'Total', value: formatIndianNumberWithDecimals(material.current_stock, 2), color: 'text-gray-900' },
                { label: 'Available', value: formatIndianNumberWithDecimals(availableStock, 2), color: 'text-green-600' },
                ...(!isInk && (material.in_production ?? 0) > 0 ? [{ label: 'In Prod', value: formatIndianNumberWithDecimals(material.in_production!, 2), color: 'text-orange-500' }] : []),
                ...((material.reserved ?? 0) > 0 ? [{ label: 'Reserved', value: formatIndianNumberWithDecimals(material.reserved!, 2), color: 'text-yellow-600' }] : []),
                ...((material.sold ?? 0) > 0 ? [{ label: 'Sold', value: formatIndianNumberWithDecimals(material.sold!, 2), color: 'text-blue-600' }] : []),
                ...((material.used ?? 0) > 0 ? [{ label: 'Used', value: formatIndianNumberWithDecimals(material.used!, 2), color: 'text-purple-600' }] : []),
              ];
              return (
                <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white text-center">
                  {stripStats.map((s, i) => (
                    <div key={s.label} className={`flex-1 flex flex-col items-center py-2.5 ${i > 0 ? 'border-l border-gray-200' : ''}`}>
                      <span className={`text-xs font-extrabold tracking-tight ${s.color}`}>{s.value}</span>
                      <span className="text-[8px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide leading-none">{s.label}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Stock level tile */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Stock Level</p>
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-xl font-extrabold text-gray-900">{formatIndianNumberWithDecimals(availableStock, 2)}</span>
                <span className="text-xs text-gray-500 mb-0.5">{material.unit}</span>
              </div>
              {material.max_capacity > 0 && (
                <>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                    <div className={`h-2 rounded-full ${material.status === 'out-of-stock' ? 'bg-red-500' : material.status === 'low-stock' ? 'bg-orange-500' : material.status === 'overstock' ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${Math.min((availableStock / material.max_capacity) * 100, 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400">of {formatIndianNumberWithDecimals(material.max_capacity, 2)} {material.unit} max</p>
                </>
              )}
            </div>

            {/* Material Info tiles */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">Material Info</p>
              <div className="grid grid-cols-2 gap-2">
                <InfoTile label="Material ID" value={material.id || 'N/A'} />
                <InfoTile label="Category" value={material.category || 'N/A'} />
                <InfoTile label="Type" value={material.type || 'N/A'} />
                <InfoTile label="Color" value={material.color && material.color !== 'NA' ? material.color : 'N/A'} />
                <InfoTile label="Supplier" value={material.supplier_name || 'N/A'} />
                <InfoTile label="Unit" value={material.unit || 'N/A'} />
              </div>
            </div>

            {/* Stock thresholds */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">Thresholds</p>
              <div className="grid grid-cols-2 gap-2">
                <InfoTile label="Min Threshold" value={`${formatIndianNumberWithDecimals(material.min_threshold, 2)} ${material.unit}`} />
                <InfoTile label="Reorder Point" value={`${formatIndianNumberWithDecimals(material.reorder_point, 2)} ${material.unit}`} />
                <InfoTile label="Max Capacity" value={`${formatIndianNumberWithDecimals(material.max_capacity, 2)} ${material.unit}`} />
                <InfoTile label="Daily Usage" value={`${formatIndianNumberWithDecimals(material.daily_usage || 0, 2)} ${material.unit}/day`} />
              </div>
            </div>

            {/* Pricing */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">Pricing</p>
              <div className="grid grid-cols-2 gap-2">
                <InfoTile label="Cost per Unit" value={material.cost_per_unit > 0 ? `₹${material.cost_per_unit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / ${material.unit}` : 'N/A'} />
                <InfoTile label="Total Value" value={formatCurrency(material.total_value)} />
                <InfoTile label="Last Restocked" value={material.last_restocked ? formatIndianDate(material.last_restocked) : 'Never'} />
                <InfoTile label="Created By" value={material.created_by || 'System'} />
              </div>
            </div>

            {/* Image */}
            {material.image_url && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
                <p className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Image</p>
                <img src={material.image_url} alt={material.name} className="w-full h-auto rounded-xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}

            {/* Transaction history (mobile) */}
            <MaterialDetailTransactionHistory material={material} />
          </div>
        </div>

        {/* Edit Dialog */}
        {isEditOpen && (
          <AddMaterialDialog
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSuccess={handleEditSuccess}
            material={material}
            mode="edit"
          />
        )}
      </div>
    </Layout>
  );
}

