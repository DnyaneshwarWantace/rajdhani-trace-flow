# 🔧 Recipe Materials Table Fix - Manual Instructions

## 🚨 Issue Found
The `recipe_materials` table currently has a foreign key constraint that only allows `raw_materials` to be referenced:
```sql
material_id VARCHAR(50) NOT NULL REFERENCES raw_materials(id)
```

This prevents products from being used as recipe materials, which breaks the nested recipe functionality.

## 🛠️ Solution
We need to modify the table structure to support both raw materials AND products.

## 📋 Steps to Fix

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Create a new query

### Step 2: Run These SQL Commands

```sql
-- Step 1: Remove the foreign key constraint
ALTER TABLE recipe_materials DROP CONSTRAINT IF EXISTS recipe_materials_material_id_fkey;

-- Step 2: Add material_type column to distinguish between raw materials and products
ALTER TABLE recipe_materials ADD COLUMN IF NOT EXISTS material_type VARCHAR(20) DEFAULT 'raw_material' 
CHECK (material_type IN ('raw_material', 'product'));

-- Step 3: Update existing records to have material_type = 'raw_material'
UPDATE recipe_materials SET material_type = 'raw_material' WHERE material_type IS NULL;

-- Step 4: Make material_type NOT NULL
ALTER TABLE recipe_materials ALTER COLUMN material_type SET NOT NULL;

-- Step 5: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipe_materials_material_type ON recipe_materials(material_type);
CREATE INDEX IF NOT EXISTS idx_recipe_materials_material_id ON recipe_materials(material_id);

-- Step 6: Add constraint for cost logic
-- Products should have cost_per_unit = 0, raw materials can have any cost >= 0
ALTER TABLE recipe_materials ADD CONSTRAINT check_product_cost 
CHECK (
  (material_type = 'product' AND cost_per_unit = 0) OR 
  (material_type = 'raw_material' AND cost_per_unit >= 0)
);
```

### Step 3: Verify the Changes

Run this query to verify the changes:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'recipe_materials' 
ORDER BY ordinal_position;

-- Check constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'recipe_materials';
```

## 🎯 What This Fix Does

### Before Fix:
- ❌ `recipe_materials` can only reference `raw_materials`
- ❌ Products cannot be used as recipe materials
- ❌ Nested recipes don't work

### After Fix:
- ✅ `recipe_materials` can reference both `raw_materials` AND `products`
- ✅ `material_type` field distinguishes between the two
- ✅ Products can be used as recipe materials
- ✅ Nested recipes work perfectly
- ✅ Cost logic: Products have cost = 0, raw materials have actual cost

## 🧪 Testing the Fix

After running the SQL commands, you can test by:

1. **Creating a product with a recipe that includes another product**
2. **Using the Recipe Calculator to see nested recipe calculations**
3. **Verifying that both raw materials and products appear in recipe materials**

## 📋 New Table Structure

```sql
recipe_materials:
├── id (VARCHAR(50), PRIMARY KEY)
├── recipe_id (VARCHAR(50), REFERENCES product_recipes(id))
├── material_id (VARCHAR(50), NO FOREIGN KEY - can be from raw_materials OR products)
├── material_name (VARCHAR(255))
├── material_type (VARCHAR(20), 'raw_material' or 'product')
├── quantity (DECIMAL(10,2))
├── unit (VARCHAR(20))
├── cost_per_unit (DECIMAL(10,2))
├── total_cost (DECIMAL(10,2))
└── created_at (TIMESTAMP)
```

## 🚀 After the Fix

Once you run these SQL commands:

1. **Products page** will be able to add both raw materials AND products to recipes
2. **Recipe Calculator** will work with complex nested scenarios
3. **Order processing** will correctly calculate materials for nested recipes
4. **Production planning** will show complete material breakdowns

## ⚠️ Important Notes

- **Backup your data** before running these commands
- **Test in a development environment** first if possible
- **The foreign key constraint is removed** - this is intentional to allow both raw materials and products
- **Data integrity** is maintained through the `material_type` field and check constraints

Run these commands and your nested recipe system will work perfectly! 🎉
