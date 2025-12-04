import {
  Package,
  Palette,
  Shapes,
  Ruler,
  Weight,
  Layers,
  Factory,
  Hash,
  Settings,
} from 'lucide-react';

export type TabType = 'product' | 'material' | 'production';

export interface SectionConfig {
  title: string;
  icon: typeof Weight;
  valueCategory: string;
  unitCategory: string;
  valueDescription: string;
  unitDescription: string;
  valuePlaceholder: string;
  unitPlaceholder: string;
  combinedButtonText: string;
  unitButtonText: string;
  tab: TabType;
}

export interface SimpleCategoryConfig {
  title: string;
  icon: typeof Package;
  category: string;
  description: string;
  placeholder: string;
  buttonText: string;
  tab: TabType;
}

export interface ProductionCategoryConfig {
  title: string;
  icon: typeof Settings;
  category: string;
  description: string;
  placeholder: string;
  buttonText: string;
  color: 'orange' | 'yellow' | 'red';
}

export const productSections: SectionConfig[] = [
  {
    title: 'Weight Options',
    icon: Weight,
    valueCategory: 'weight',
    unitCategory: 'weight_units',
    valueDescription: 'Weight Options (e.g., 400 GSM, 500 GSM, 2 kg, 5 kg)',
    unitDescription: 'Available Weight Units',
    valuePlaceholder: '800',
    unitPlaceholder: 'ton, mg, etc.',
    combinedButtonText: 'Add Weight',
    unitButtonText: 'Add Weight Unit',
    tab: 'product',
  },
  {
    title: 'Length Options',
    icon: Ruler,
    valueCategory: 'length',
    unitCategory: 'length_unit',
    valueDescription: 'Length Options (e.g., 5 feet, 10 feet, 15 feet, 2.5 m, 3 m)',
    unitDescription: 'Available Length Units',
    valuePlaceholder: '20',
    unitPlaceholder: 'yard, ft, m, etc.',
    combinedButtonText: 'Add Length',
    unitButtonText: 'Add Length Unit',
    tab: 'product',
  },
  {
    title: 'Width Options',
    icon: Ruler,
    valueCategory: 'width',
    unitCategory: 'width_unit',
    valueDescription: 'Width Options (e.g., 5 feet, 10 feet, 15 feet, 1.5 m, 2 m)',
    unitDescription: 'Available Width Units',
    valuePlaceholder: '15',
    unitPlaceholder: 'yard, ft, m, etc.',
    combinedButtonText: 'Add Width',
    unitButtonText: 'Add Width Unit',
    tab: 'product',
  },
];

export const simpleCategories: SimpleCategoryConfig[] = [
  {
    title: 'Product Category',
    icon: Package,
    category: 'category',
    description: 'Product Categories',
    placeholder: 'e.g., Carpet, Rug, Mat',
    buttonText: 'Add Category',
    tab: 'product',
  },
  {
    title: 'Subcategory',
    icon: Layers,
    category: 'subcategory',
    description: 'Product Subcategories',
    placeholder: 'e.g., Wall-to-Wall, Area Rug',
    buttonText: 'Add Subcategory',
    tab: 'product',
  },
  {
    title: 'Color',
    icon: Palette,
    category: 'color',
    description: 'Color Options',
    placeholder: 'e.g., Red, Blue, Green',
    buttonText: 'Add Color',
    tab: 'product',
  },
  {
    title: 'Pattern',
    icon: Shapes,
    category: 'pattern',
    description: 'Pattern Options',
    placeholder: 'e.g., Solid, Striped, Floral',
    buttonText: 'Add Pattern',
    tab: 'product',
  },
  {
    title: 'Unit',
    icon: Hash,
    category: 'unit',
    description: 'Unit Options',
    placeholder: 'e.g., SQM, Roll, Piece',
    buttonText: 'Add Unit',
    tab: 'product',
  },
  {
    title: 'Material Category',
    icon: Factory,
    category: 'material_category',
    description: 'Material Categories',
    placeholder: 'e.g., Yarn, Fiber, Thread',
    buttonText: 'Add Material Category',
    tab: 'material',
  },
  {
    title: 'Material Type',
    icon: Factory,
    category: 'material_type',
    description: 'Material Types',
    placeholder: 'e.g., Cotton, Wool, Synthetic',
    buttonText: 'Add Material Type',
    tab: 'material',
  },
  {
    title: 'Material Unit',
    icon: Hash,
    category: 'material_unit',
    description: 'Material Units',
    placeholder: 'e.g., kg, g, lb',
    buttonText: 'Add Material Unit',
    tab: 'material',
  },
  {
    title: 'Material Color',
    icon: Palette,
    category: 'material_color',
    description: 'Material Colors',
    placeholder: 'e.g., Natural, Dyed, White',
    buttonText: 'Add Material Color',
    tab: 'material',
  },
];

export const productionCategories: ProductionCategoryConfig[] = [
  {
    title: 'Priority Options',
    icon: Settings,
    category: 'priority',
    description: 'Priority Options',
    placeholder: 'e.g., low, critical, high',
    buttonText: 'Add Priority',
    color: 'orange',
  },
  {
    title: 'Quality Ratings',
    icon: Settings,
    category: 'quality_rating',
    description: 'Quality Ratings',
    placeholder: 'e.g., A++, S, Premium',
    buttonText: 'Add Rating',
    color: 'yellow',
  },
  {
    title: 'Waste Types',
    icon: Settings,
    category: 'waste_type',
    description: 'Waste Types',
    placeholder: 'e.g., cutting waste, production waste',
    buttonText: 'Add Waste Type',
    color: 'red',
  },
];

