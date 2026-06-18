import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { ProductService } from '@/services/productService';
import { IndividualProductService } from '@/services/individualProductService';
import EditIndividualProductDialog from '@/components/products/stock/EditIndividualProductDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertTriangle, Package, ArrowLeft, QrCode, Edit2, CheckCircle, XCircle, Clock, Calendar, MapPin, User, FileText, Ruler, Weight, Download } from 'lucide-react';
import type { Product, IndividualProduct, IndividualProductFormData } from '@/types/product';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';
import { formatIndianDate, formatIndianDateTime } from '@/utils/formatHelpers';
import { getAppBaseUrl } from '@/lib/utils';

function weightKg(item: IndividualProduct): number | null {
  const gsm = parseFloat((item.final_weight || '').toString().replace(/[^\d.]/g, ''));
  const lenStr = (item.final_length || '').toString();
  const widStr = (item.final_width || '').toString();
  let l = parseFloat(lenStr.replace(/[^\d.]/g, ''));
  let w = parseFloat(widStr.replace(/[^\d.]/g, ''));
  if (lenStr.toLowerCase().includes('feet')) l *= 0.3048;
  if (widStr.toLowerCase().includes('feet')) w *= 0.3048;
  if (!isNaN(gsm) && !isNaN(l) && !isNaN(w) && gsm > 0 && l > 0 && w > 0) return (gsm * l * w) / 1000;
  return null;
}

function fmtDate(s?: string | null) {
  if (!s || s === 'null') return 'N/A';
  try { return formatIndianDate(s); } catch { return 'N/A'; }
}

function fmtDateTime(s?: string | null) {
  if (!s || s === 'null') return 'N/A';
  try { return formatIndianDateTime(s); } catch { return 'N/A'; }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; textColor: string }> = {
  available:     { label: 'Available',     color: '#2563EB', bg: '#EFF4FF', dot: '#2563EB', textColor: '#1D4ED8' },
  in_production: { label: 'In Production', color: '#EA580C', bg: '#FFF4ED', dot: '#F97316', textColor: '#C2410C' },
  reserved:      { label: 'Reserved',      color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6', textColor: '#6D28D9' },
  sold:          { label: 'Sold',          color: '#16A34A', bg: '#F0FDF4', dot: '#22C55E', textColor: '#15803D' },
  damaged:       { label: 'Damaged',       color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444', textColor: '#B91C1C' },
};
const getStatusCfg = (s: string) => STATUS_CONFIG[s] || { label: s, color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF', textColor: '#374151' };

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <span className="text-xs text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-gray-900 flex-1 text-right break-all">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-3">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-50">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-sm font-bold text-gray-900">{title}</span>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

export default function IndividualProductDetail() {
  const { productId, individualProductId } = useParams<{ productId: string; individualProductId: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [ip, setIp] = useState<IndividualProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const loadData = async () => {
    if (!productId || !individualProductId) { setError('Missing IDs'); setLoading(false); return; }
    try {
      setLoading(true); setError(null);
      const [pd, ipd] = await Promise.all([
        ProductService.getProductById(productId),
        IndividualProductService.getIndividualProductById(individualProductId),
      ]);
      setProduct(pd); setIp(ipd);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [productId, individualProductId]);

  useLiveSyncRefresh({ modules: ['individual_products', 'products', 'production'], onRefresh: loadData, pollingMs: 8000 });

  const handleSave = async (id: string, data: Partial<IndividualProductFormData>) => {
    await IndividualProductService.updateIndividualProduct(id, data);
    await loadData();
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    </Layout>
  );

  if (error || !product || !ip) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Not Found</h2>
        <p className="text-sm text-gray-500 mb-5">{error || 'Product not found'}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl">Go Back</button>
      </div>
    </Layout>
  );

  const sc = getStatusCfg(ip.status);
  const wKg = weightKg(ip);

  const lenLabel = ip.final_length
    ? (ip.final_length.includes(' ') ? ip.final_length : `${ip.final_length} ${product.length_unit || 'feet'}`)
    : null;
  const widLabel = ip.final_width
    ? (ip.final_width.includes(' ') ? ip.final_width : `${ip.final_width} ${product.width_unit || 'feet'}`)
    : null;

  const qrCodeData = JSON.stringify({ type: 'individual', individualProductId: ip.id, productId: productId || ip.product_id });
  const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${getAppBaseUrl()}/qr-result?data=${encodeURIComponent(qrCodeData)}`)}`;

  const handleDownloadQR = async () => {
    try {
      const res = await fetch(qrCodeURL);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `product_${ip.qr_code || ip.id}_qr.png`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download QR code.'); }
  };

  const historyItems = [
    { icon: CheckCircle, color: '#16A34A', bg: '#F0FDF4', title: 'Created', date: ip.created_at },
    ...(ip.production_date ? [{ icon: Package, color: '#2563EB', bg: '#EFF4FF', title: 'Production Started', date: ip.production_date }] : []),
    ...(ip.completion_date ? [{ icon: CheckCircle, color: '#7C3AED', bg: '#F5F3FF', title: 'Production Completed', date: ip.completion_date }] : []),
    { icon: Clock, color: '#6B7280', bg: '#F3F4F6', title: 'Last Updated', date: ip.updated_at },
  ];

  return (
    <Layout>
      {/* ── MOBILE LAYOUT ───────────────────────────────────── */}
      <div className="lg:hidden -mx-3 sm:-mx-4 -mt-4">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
              <ArrowLeft className="w-4.5 h-4.5 text-gray-700" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Individual Product</p>
              <p className="text-base font-bold text-gray-900 leading-tight truncate">{product.name}</p>
            </div>
            <button onClick={() => setIsEditOpen(true)}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
              <Edit2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Roll + Status row */}
          <div className="flex items-center gap-2 flex-wrap">
            {ip.roll_number && (
              <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                #{ip.roll_number}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: sc.bg, color: sc.textColor }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
              {sc.label}
            </span>
            {ip.batch_number && (
              <span className="text-xs text-gray-400 font-medium">Batch: {ip.batch_number}</span>
            )}
          </div>
        </div>

        {/* Stat tiles — 2-column horizontal grid */}
        <div className="px-4 pt-3 pb-1 grid grid-cols-2 gap-2.5">
          {[
            {
              label: 'Status',
              value: sc.label,
              icon: ip.status === 'available' ? CheckCircle : ip.status === 'damaged' ? XCircle : Package,
              color: sc.color, bg: sc.bg,
            },
            {
              label: 'Roll No',
              value: ip.roll_number || '—',
              icon: Package,
              color: '#7C3AED', bg: '#F5F3FF',
            },
            {
              label: 'GSM / Weight',
              value: ip.final_weight ? (wKg ? `${ip.final_weight} (${wKg.toFixed(1)}kg)` : ip.final_weight) : '—',
              icon: Weight,
              color: '#EA580C', bg: '#FFF4ED',
            },
            {
              label: 'Location',
              value: ip.location || '—',
              icon: MapPin,
              color: '#0891B2', bg: '#E0F2FE',
            },
          ].map((tile, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: tile.bg }}>
                <tile.icon className="w-4 h-4" style={{ color: tile.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-0.5">{tile.label}</p>
                <p className="text-sm font-bold text-gray-900 leading-tight truncate">{tile.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dimensions strip */}
        {(lenLabel || widLabel || ip.final_weight) && (
          <div className="mx-4 mb-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wide mb-2">Dimensions</p>
            <div className="flex items-center gap-4 flex-wrap">
              {lenLabel && (
                <div className="flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-blue-900 font-semibold">L: {lenLabel}</span>
                </div>
              )}
              {widLabel && (
                <div className="flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-blue-400 rotate-90" />
                  <span className="text-xs text-blue-900 font-semibold">W: {widLabel}</span>
                </div>
              )}
              {ip.final_weight && (
                <div className="flex items-center gap-1.5">
                  <Weight className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-blue-900 font-semibold">{ip.final_weight} GSM</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product context strip */}
        <div className="mx-4 mb-3 bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-gray-300" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight truncate">{product.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {[product.category, product.color, product.pattern].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4">
          <div className="flex gap-2 mb-3">
            {(['details', 'qrcode', 'history'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  activeTab === t
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}>
                {t === 'details' ? 'Details' : t === 'qrcode' ? 'QR Code' : 'History'}
              </button>
            ))}
          </div>

          {/* Details tab */}
          {activeTab === 'details' && (
            <div className="pb-28">
              <SectionCard title="Basic Information" icon={FileText} color="#2563EB">
                {ip.qr_code && <InfoRow icon={Package} label="QR Code" value={ip.qr_code} />}
                {ip.roll_number && <InfoRow icon={Package} label="Roll Number" value={ip.roll_number} />}
                {ip.batch_number && <InfoRow icon={Package} label="Batch Number" value={ip.batch_number} />}
                <InfoRow icon={User} label="Inspector" value={ip.inspector || 'Not assigned'} />
                <InfoRow icon={MapPin} label="Location" value={ip.location || '—'} />
                {ip.production_date && <InfoRow icon={Calendar} label="Production Date" value={fmtDate(ip.production_date)} />}
                {ip.completion_date && <InfoRow icon={Calendar} label="Completion Date" value={fmtDate(ip.completion_date)} />}
              </SectionCard>

              {(lenLabel || widLabel || ip.final_weight) && (
                <SectionCard title="Dimensions" icon={Ruler} color="#0891B2">
                  {lenLabel && <InfoRow icon={Ruler} label="Final Length" value={lenLabel} />}
                  {widLabel && <InfoRow icon={Ruler} label="Final Width" value={widLabel} />}
                  {ip.final_weight && (
                    <InfoRow icon={Weight} label="Final Weight"
                      value={wKg ? `${ip.final_weight} (${wKg.toFixed(2)} kg)` : ip.final_weight} />
                  )}
                </SectionCard>
              )}

              {ip.notes && (
                <SectionCard title="Notes" icon={FileText} color="#6B7280">
                  <p className="text-sm text-gray-700 py-2 leading-relaxed whitespace-pre-wrap">{ip.notes}</p>
                </SectionCard>
              )}
            </div>
          )}

          {/* QR Code tab */}
          {activeTab === 'qrcode' && (
            <div className="pb-28">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center">
                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <img src={qrCodeURL} alt="QR Code" className="w-56 h-56" />
                  </div>
                </div>
                <p className="font-mono text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 mb-4 text-center break-all">
                  {ip.qr_code || ip.id}
                </p>
                <p className="text-xs text-gray-400 text-center mb-4">Scan to access individual product details</p>
                <button onClick={handleDownloadQR}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl w-full justify-center">
                  <Download className="w-4 h-4" />
                  Download QR Code
                </button>
              </div>
            </div>
          )}

          {/* History tab */}
          {activeTab === 'history' && (
            <div className="pb-28">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="space-y-0">
                  {historyItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.bg }}>
                        <item.icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(item.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ──────────────────────────────────── */}
      <div className="hidden lg:block min-h-screen bg-gray-50 w-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 w-full px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900">Individual Product</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500 font-mono">{ip.qr_code || ip.id}</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.textColor }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                    {sc.label}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {ip.qr_code && (
                <button onClick={() => setActiveTab('qrcode')} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  <QrCode className="w-4 h-4" />
                  QR Code
                </button>
              )}
              <button onClick={() => setIsEditOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Status', value: sc.label, icon: ip.status === 'available' ? CheckCircle : Package, color: sc.color, bg: sc.bg },
              { label: 'QR Code', value: ip.qr_code || 'N/A', icon: QrCode, color: '#2563EB', bg: '#EFF4FF' },
              { label: 'Roll Number', value: ip.roll_number || 'N/A', icon: Package, color: '#7C3AED', bg: '#F5F3FF' },
              { label: 'Location', value: ip.location || '—', icon: MapPin, color: '#0891B2', bg: '#E0F2FE' },
            ].map((tile, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: tile.bg }}>
                  <tile.icon className="w-5 h-5" style={{ color: tile.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{tile.label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{tile.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Product context */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 mb-6 shadow-sm">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-xl object-cover border border-gray-100" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-300" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-gray-900">{product.name}</h3>
              <p className="text-sm text-gray-400 mt-0.5">{[product.category, product.color, product.pattern].filter(Boolean).join(' · ')}</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="qrcode">QR Code</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" /> Basic Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    {[
                      { label: 'Inspector', value: ip.inspector || 'Not assigned' },
                      { label: 'Location', value: ip.location || '—' },
                      { label: 'Production Date', value: fmtDate(ip.production_date) },
                      { label: 'Completion Date', value: fmtDate(ip.completion_date) },
                    ].map((r, i) => (
                      <div key={i} className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                        <span className="text-gray-500">{r.label}</span>
                        <span className="font-semibold text-gray-900 text-right">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-cyan-500" /> Dimensions
                  </h4>
                  <div className="space-y-3 text-sm">
                    {[
                      { label: 'Roll Number', value: ip.roll_number || 'N/A' },
                      { label: 'Final Length', value: lenLabel || 'N/A' },
                      { label: 'Final Width', value: widLabel || 'N/A' },
                      { label: 'Final Weight', value: ip.final_weight ? (wKg ? `${ip.final_weight} (${wKg.toFixed(2)} kg)` : ip.final_weight) : 'N/A' },
                    ].map((r, i) => (
                      <div key={i} className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                        <span className="text-gray-500">{r.label}</span>
                        <span className="font-semibold text-gray-900 text-right">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {ip.notes && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" /> Notes
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ip.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="qrcode">
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center">
                <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                  <div className="bg-white p-6 rounded-xl shadow border-2 border-gray-200">
                    <img src={qrCodeURL} alt="QR Code" className="w-64 h-64" />
                  </div>
                </div>
                <p className="font-mono text-sm bg-gray-50 p-3 rounded-xl border mb-4 break-all text-center">{ip.qr_code || ip.id}</p>
                <p className="text-sm text-gray-500 mb-5">Scan to access individual product details</p>
                <button onClick={handleDownloadQR} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                  <Download className="w-4 h-4" />
                  Download QR Code
                </button>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                {historyItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: item.bg }}>
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(item.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <EditIndividualProductDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        individualProduct={ip}
        onSave={handleSave}
      />
    </Layout>
  );
}
