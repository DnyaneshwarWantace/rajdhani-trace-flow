import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { useToast } from '@/hooks/use-toast';

export default function ProductionMachine() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
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

  if (loading) return <Layout><div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div></Layout>;
  if (!batch) return <Layout><div className="text-center py-12"><p>Batch not found</p></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/production/${id}/planning`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Machine Operations</h1>
              <p className="text-sm text-gray-600 mt-1">Batch: {batch.batch_number}</p>
            </div>
          </div>
          <Button onClick={() => navigate(`/production/${id}/wastage`)} className="bg-orange-600 hover:bg-orange-700">
            <Trash2 className="w-4 h-4 mr-2" />
            Wastage Stage
          </Button>
        </div>
        <Card>
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-900">Machine Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600">Machine stage content from old code...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
