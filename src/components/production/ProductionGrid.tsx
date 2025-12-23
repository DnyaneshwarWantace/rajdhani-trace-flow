import Masonry from 'react-masonry-css';
import ProductionCard from './ProductionCard';
import type { ProductionBatch } from '@/services/productionService';

interface ProductionGridProps {
  batches: ProductionBatch[];
  onDelete: (batch: ProductionBatch) => void;
  canDelete: boolean;
}

export default function ProductionGrid({
  batches,
  onDelete,
  canDelete,
}: ProductionGridProps) {
  const breakpointColumnsObj = {
    default: 3,
    1024: 2,
    640: 1,
  };

  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="flex w-auto -ml-4"
      columnClassName="pl-4 bg-clip-padding"
    >
      {batches.map((batch) => (
        <div key={batch.id} className="mb-4">
          <ProductionCard
            batch={batch}
            onDelete={onDelete}
            canDelete={canDelete}
          />
        </div>
      ))}
    </Masonry>
  );
}


