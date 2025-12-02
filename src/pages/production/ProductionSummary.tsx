import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductionService } from "@/services/api/productionService";
import MaterialConsumptionService from "@/services/api/materialConsumptionService";
import WasteService from "@/services/api/wasteService";
import IndividualProductService from "@/services/api/individualProductService";

export default function ProductionSummary() {
  const { productId } = useParams();
  const [productionFlow, setProductionFlow] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [wasteGenerated, setWasteGenerated] = useState<any[]>([]);
  const [consumption, setConsumption] = useState<any[]>([]);
  const [individuals, setIndividuals] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!productId) return;
      // Load batch to get product_id
      const { data: batchData } = await ProductionService.getProductionBatchById(productId);
      setBatch(batchData); // Store batch data for dates

      // Load production flow by batchId; tolerate 404/406
      const { data: flow } = await ProductionService.getProductionFlowByBatchId(productId);
      setProductionFlow(flow || { id: productId, flow_name: `Production Flow - Batch ${productId}`, production_flow_steps: [] });

      // Load material consumption by batchId
      const { data: consumptionResp } = await MaterialConsumptionService.getMaterialConsumption({ production_batch_id: productId });
      const raw = (consumptionResp as any)?.data || [];
      // De-duplicate by material_id to avoid planned+actual double counting
      const seen = new Set<string>();
      const dedup = raw.filter((r: any) => {
        const key = r.material_id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setConsumption(dedup);

      // Load waste by batchId
      const { data: waste } = await WasteService.getWasteByBatch(productId);
      setWasteGenerated(waste || []);

      // Prefer filtering by created IDs captured at completion
      let createdIds: string[] = [];
      try {
        const stored = sessionStorage.getItem(`batch-created-individuals-${productId}`);
        if (stored) createdIds = JSON.parse(stored);
        console.log(`📦 Found ${createdIds.length} created IDs in sessionStorage for batch ${productId}:`, createdIds);
      } catch (e) {
        console.log(`⚠️ No sessionStorage data for batch ${productId}`);
      }

      if (createdIds.length > 0) {
        // Fetch by product and filter by created IDs
        if (batchData?.product_id) {
          const { data: allByProduct } = await IndividualProductService.getIndividualProductsByProductId(batchData.product_id);
          console.log(`📦 Fetched ${allByProduct?.length || 0} total individual products for product ${batchData.product_id}`);
          const filtered = (allByProduct || []).filter((it: any) => createdIds.includes(it.id));
          console.log(`✅ Filtered to ${filtered.length} individual products for this batch`);
          filtered.forEach((item: any) => {
            console.log(`   - ${item.id}: final_weight=${item.final_weight}, final_width=${item.final_width}, final_length=${item.final_length}`);
          });
          setIndividuals(filtered);
        } else {
          console.log(`⚠️ No product_id found in batch`);
          setIndividuals([]);
        }
      } else {
        console.log(`ℹ️ No createdIds in sessionStorage, using backend batch filter`);
        // Use backend filter by batch_number AND product_id for accurate results
        if (batchData?.product_id) {
          // First, get all individual products for this product
          const { data: allByProduct, error: productError } = await IndividualProductService.getIndividualProductsByProductId(batchData.product_id);
          if (productError) {
            console.error(`❌ Error loading individual products by product:`, productError);
            setIndividuals([]);
            return;
          }

          // Determine the batch identifier to filter by
          // Individual products are created with batch_number = batch ID (productId from URL)
          // But also check batchData.batch_number as a fallback
          const batchIdentifier = productId; // This is the batch ID from URL
          console.log(`🔍 Filtering individual products by batch_number=${batchIdentifier} (batch.id=${batchData.id}, batch.batch_number=${batchData.batch_number || 'N/A'})`);

          // Then filter by batch_number matching the batch ID (productId from URL)
          const individualProducts = (allByProduct || []).filter((item: any) => {
            // Match by batch ID (productId) OR batchData.batch_number if it exists
            const matchesBatchId = item.batch_number === batchIdentifier;
            const matchesBatchNumber = batchData.batch_number && item.batch_number === batchData.batch_number;
            const matches = matchesBatchId || matchesBatchNumber;
            if (!matches) {
              console.log(`   ❌ Excluded ${item.id}: batch_number=${item.batch_number} (expected ${batchIdentifier} or ${batchData.batch_number || 'N/A'})`);
            }
            return matches;
          });

          console.log(`✅ Loaded ${allByProduct?.length || 0} total individual products for product ${batchData.product_id}`);
          console.log(`✅ Filtered to ${individualProducts.length} individual products for batch ${batchIdentifier}`);
          individualProducts.forEach((item: any) => {
            console.log(`   ✅ ${item.id}: batch_number=${item.batch_number}, final_weight=${item.final_weight}`);
          });
          setIndividuals(individualProducts);
        } else {
          console.log(`⚠️ No batch or product data available`);
          setIndividuals([]);
        }
      }
    };
    loadData();
  }, [productId]);

  if (!productionFlow) {
    return null;
  }

  return (
    <div className="flex-1 space-y-6 p-6">

      {/* Production Dates Card */}
      {batch && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Start Date</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {batch.start_date ? new Date(batch.start_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Not Started'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  batch.completion_date ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <svg className={`w-6 h-6 ${batch.completion_date ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Completion Date</div>
                  <div className={`text-lg font-semibold ${batch.completion_date ? 'text-green-600' : 'text-gray-400'}`}>
                    {batch.completion_date ? new Date(batch.completion_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'In Progress'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Materials Consumed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{consumption.length}</div>
            <div className="text-sm text-gray-600">Unique Materials</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waste Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{wasteGenerated.length}</div>
            <div className="text-sm text-gray-600">Waste Items</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flow Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{productionFlow.production_flow_steps?.length || 0}</div>
            <div className="text-sm text-gray-600">Recorded Steps</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Individual Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{individuals.length}</div>
            <div className="text-sm text-gray-600">Created</div>
          </CardContent>
        </Card>
      </div>

      {/* Waste Generated */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Waste Generated</CardTitle>
        </CardHeader>
        <CardContent>
          {wasteGenerated.length > 0 ? (
            wasteGenerated.map((waste, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded border mb-2">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{waste.material_name}</div>
                    <div className="text-sm text-gray-500">
                      {waste.quantity} {waste.unit} • {waste.waste_type}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-orange-600">Waste</Badge>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No waste generated yet</div>
          )}
        </CardContent>
      </Card>

      {/* Flow Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Flow Steps</CardTitle>
        </CardHeader>
        <CardContent>
          {productionFlow.production_flow_steps && productionFlow.production_flow_steps.length > 0 ? (
            productionFlow.production_flow_steps.map((step: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 rounded border mb-2">
                <div>
                  <div className="font-medium">{step.step_name}</div>
                  <div className="text-sm text-gray-500">{step.status}</div>
                </div>
                <Badge variant={step.status === 'completed' ? 'default' : 'secondary'}>
                  {step.status}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No steps recorded</div>
          )}
        </CardContent>
      </Card>

      {/* Individual products list */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Products</CardTitle>
        </CardHeader>
        <CardContent>
          {individuals.length > 0 ? (
            individuals.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded border mb-2">
                <div>
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-sm text-gray-500">
                    {item.final_weight || item.weight || '—'} • {item.final_width || item.width || '—'} × {item.final_length || item.length || '—'}
                  </div>
                </div>
                <Badge>{item.status}</Badge>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No individual products created</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
