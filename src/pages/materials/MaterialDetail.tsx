import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { MaterialService } from '@/services/materialService';
import type { RawMaterial } from '@/types/material';
import MaterialDetailHeader from '@/components/materials/detail/MaterialDetailHeader';
import MaterialDetailStats from '@/components/materials/detail/MaterialDetailStats';
import MaterialDetailInfo from '@/components/materials/detail/MaterialDetailInfo';
import MaterialDetailStock from '@/components/materials/detail/MaterialDetailStock';
import MaterialDetailReorderHistory from '@/components/materials/detail/MaterialDetailReorderHistory';
import AddMaterialDialog from '@/components/materials/AddMaterialDialog';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function MaterialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  return (
    <Layout>
      <div>
        <MaterialDetailHeader
          material={material}
          onBack={handleBack}
          onEdit={handleEdit}
        />

        <MaterialDetailStats material={material} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <MaterialDetailStock material={material} />
          <MaterialDetailInfo material={material} />
        </div>

        {/* Reorder History */}
        <MaterialDetailReorderHistory material={material} />

        {/* Material Image */}
        {material.image_url && (
          <Card className="mb-6">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Image</h3>
              <div className="relative w-full max-w-md mx-auto">
                <img
                  src={material.image_url}
                  alt={material.name}
                  className="w-full h-auto rounded-lg border border-gray-200 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

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

