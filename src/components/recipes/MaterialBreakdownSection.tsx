import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package, CheckCircle2, AlertTriangle } from 'lucide-react';

interface FinalMaterialBreakdown {
  material_id: string;
  material_name: string;
  total_quantity: number;
  unit: string;
  available_stock: number;
  shortage: number;
  is_available: boolean;
  sources: {
    product_name: string;
    quantity_needed: number;
    contribution: number;
  }[];
}

interface MaterialBreakdownSectionProps {
  finalBreakdown: FinalMaterialBreakdown[];
  totalMaterials: number;
  availableMaterials: number;
}

export default function MaterialBreakdownSection({
  finalBreakdown,
  totalMaterials,
  availableMaterials,
}: MaterialBreakdownSectionProps) {
  const procurementCount = totalMaterials - availableMaterials;

  return (
    <Card className="border-0 shadow-none bg-transparent md:border md:shadow md:bg-card">
      <CardHeader className="px-0 pb-3 md:px-6 md:pt-6">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-black text-slate-900">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Final Raw Material Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 md:px-6 md:pb-6">
        {/* Summary - Unified Mobile Strip, Desktop Grid */}
        <div className="md:hidden mb-5 flex border border-slate-200 rounded-xl overflow-hidden bg-white text-center divide-x divide-slate-100">
          <div className="flex-1 py-3 flex flex-col items-center">
            <span className="text-base font-extrabold text-blue-600 leading-tight">
              {totalMaterials}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              Total Materials
            </span>
          </div>
          <div className="flex-1 py-3 flex flex-col items-center">
            <span className="text-base font-extrabold text-emerald-600 leading-tight">
              {availableMaterials}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              Available
            </span>
          </div>
          <div className="flex-1 py-3 flex flex-col items-center">
            <span className="text-base font-extrabold text-rose-600 leading-tight">
              {procurementCount}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              To Procure
            </span>
          </div>
        </div>

        {/* Desktop View Summary Cards */}
        <div className="hidden md:grid md:grid-cols-3 md:gap-4 mb-6">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50/60 to-blue-100/30 rounded-2xl border border-blue-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-blue-900 leading-tight">
                {totalMaterials}
              </div>
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mt-0.5">
                Total Materials
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50/60 to-emerald-100/30 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-900 leading-tight">
                {availableMaterials}
              </div>
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-0.5">
                Available Stock
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-rose-50/60 to-rose-100/30 rounded-2xl border border-rose-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-rose-900 leading-tight">
                {procurementCount}
              </div>
              <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mt-0.5">
                To Procure
              </div>
            </div>
          </div>
        </div>

        {/* Material Details - Mobile-first card layout */}
        <div className="space-y-4">
          {finalBreakdown.map((material) => {
            const required = material.total_quantity;
            const available = material.available_stock;
            const shortage = material.shortage;
            const stockPercentage = required > 0 ? Math.min(100, (available / required) * 100) : 100;

            return (
              <div
                key={material.material_id}
                className={`border rounded-2xl p-4 sm:p-5 shadow-sm transition-all bg-white hover:shadow-md ${
                  material.is_available ? 'border-emerald-100' : 'border-rose-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-800 truncate" title={material.material_name}>
                      {material.material_name}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                      ID: {material.material_id}
                    </p>
                  </div>
                  <Badge
                    className={`text-[10px] font-bold rounded-xl border-0 px-2.5 py-0.5 ${
                      material.is_available 
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' 
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    {material.is_available ? 'Sufficient' : 'Shortage'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Required Qty</div>
                    <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{Number(required).toFixed(2)} {material.unit}</div>
                  </div>
                  <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Available Stock</div>
                    <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{Number(available).toFixed(1)} {material.unit}</div>
                  </div>
                  <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Stock Unit</div>
                    <div className="font-extrabold text-slate-800 text-xs sm:text-sm">{material.unit}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    shortage > 0 
                      ? 'bg-rose-50/40 border-rose-100 text-rose-800' 
                      : 'bg-emerald-50/40 border-emerald-100 text-emerald-800'
                  }`}>
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-1 opacity-70">Shortage</div>
                    <div className="font-extrabold text-xs sm:text-sm">{Number(shortage).toFixed(2)} {material.unit}</div>
                  </div>
                </div>

                {/* Progress Bar Coverage */}
                <div className="space-y-1.5 mt-4 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Stock Coverage</span>
                    <span className={material.is_available ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'}>
                      {stockPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        material.is_available 
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                          : 'bg-gradient-to-r from-rose-400 to-rose-500'
                      }`}
                      style={{ width: `${stockPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold flex items-center gap-1 mt-1">
                    {material.is_available ? (
                      <span className="text-emerald-700">✓ Sufficient stock available for production.</span>
                    ) : (
                      <span className="text-rose-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 inline shrink-0" />
                        Procurement of {shortage.toFixed(2)} {material.unit} required.
                      </span>
                    )}
                  </p>
                </div>

                {/* Sources - Used in Products */}
                {material.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-150">
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Used in Recipes:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {material.sources.map((source, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                        >
                          {source.product_name}: {source.contribution.toFixed(2)} {material.unit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}




