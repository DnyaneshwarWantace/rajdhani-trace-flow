import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { ProductionService, type ProductionBatch } from '@/services/productionService';

export default function ProductionIndividualProducts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<ProductionBatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadBatch();
    }
  }, [id]);

  const loadBatch = async () => {
    try {
      setLoading(true);
      const { data } = await ProductionService.getBatchById(id!);
      if (data) setBatch(data);
    } catch (error) {
      console.error('Error loading batch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    // Mark batch as complete
    navigate('/production');
  };

  if (loading) return <Layout><div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div></Layout>;
  if (!batch) return <Layout><div className="text-center py-12"><p>Batch not found</p></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/production/${id}/wastage`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Individual Products & Complete</h1>
              <p className="text-sm text-gray-600 mt-1">Batch: {batch.batch_number}</p>
            </div>
          </div>
          <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Batch
          </Button>
        </div>
        <Card>
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-purple-900">Individual Products</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600">Individual products generation from old code...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
