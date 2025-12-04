import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { RecipeService } from '@/services/recipeService';
import RecipeList from '@/components/recipes/RecipeList';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Recipe } from '@/types/recipe';

export default function RecipeListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecipes, setTotalRecipes] = useState(0);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const { recipes: data, total } = await RecipeService.getRecipes({
        limit: 100,
        offset: 0,
      });
      setRecipes(data);
      setTotalRecipes(total);
    } catch (err) {
      console.error('Error loading recipes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
      toast({
        title: 'Error',
        description: 'Failed to load recipes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeClick = (recipe: Recipe) => {
    // Navigate to recipe detail page (to be created)
    navigate(`/recipes/${recipe.id}`);
  };

  if (error && !loading) {
    return (
      <Layout>
        <div>
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Recipes</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={loadRecipes}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        {/* Header - Mobile First */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Recipes</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Manage product recipes and material requirements
              </p>
            </div>
            <Button
              onClick={() => navigate('/recipes/new')}
              className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Recipe
            </Button>
          </div>
        </div>

        {/* Stats - Mobile First */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Total Recipes</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalRecipes}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Active Recipes</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {recipes.filter(r => r.is_active).length}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Inactive Recipes</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-600">
                    {recipes.filter(r => !r.is_active).length}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-gray-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recipe List */}
        <RecipeList
          recipes={recipes}
          loading={loading}
          onRecipeClick={handleRecipeClick}
        />
      </div>
    </Layout>
  );
}

