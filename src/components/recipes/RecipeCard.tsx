import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, ChevronRight } from 'lucide-react';
import type { Recipe } from '@/types/recipe';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
}

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const materialsCount = recipe.materials?.length || recipe.materials_count || 0;

  return (
    <Card
      className={`transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      } ${!recipe.is_active ? 'opacity-75' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1 flex-wrap">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                <TruncatedText text={recipe.product_name} maxLength={40} as="span" />
              </h3>
              {!recipe.is_active && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  Inactive
                </Badge>
              )}
            </div>
            {recipe.description && (
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">
                {recipe.description}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs" title="Recipe Version">
                Version {recipe.version}
              </Badge>
              <Badge variant="outline" className="text-xs" title="Base Unit">
                {recipe.base_unit.toUpperCase()}
              </Badge>
            </div>
          </div>
          {onClick && (
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
        </div>

        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-600">Materials</p>
              <p className="text-sm font-semibold text-gray-900">{materialsCount}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

