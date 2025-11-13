# Correct Excel Templates for First-Time Setup

## 📋 Overview
This guide provides the correct Excel templates for setting up your inventory system. These templates are designed to work with the current database schema and include all necessary fields.

## 📁 Available Templates

### 1. **CORRECT_SUPPLIERS_TEMPLATE.xlsx**
**Purpose**: Import supplier information
**Fields**:
- Supplier Name (Required)
- Contact Person (Required)
- Email (Required)
- Phone (Required)
- Address (Required)
- City (Required)
- State (Required)
- Pincode (Required)
- Payment Terms (Optional)
- Rating (Optional)

### 2. **CORRECT_RAW_MATERIALS_TEMPLATE.xlsx**
**Purpose**: Import raw materials inventory
**Fields**:
- Material Name (Required)
- Type (Required) - Material type (Cotton, Silk, Chemical, etc.)
- Category (Required) - Yarn, Fabric, Dye, Thread, etc.
- Current Stock (Required) - Current quantity in stock
- Unit (Required) - kg, meters, liters, sqm, etc.
- Min Stock Level (Required) - Minimum stock threshold
- Max Storage Capacity (Required) - Maximum storage limit
- Reorder Point (Required) - When to reorder
- Supplier Name (Required) - Must match supplier from suppliers template
- Cost Per Unit (Required) - Cost per unit
- Batch Number (Required) - Purchase order number from supplier
- Quality Grade (Optional) - A+, A, B, etc.
- Image URL (Optional) - Product image URL

### 3. **CORRECT_PRODUCTS_TEMPLATE.xlsx**
**Purpose**: Import product catalog
**Fields**:
- Product Name (Required) - Name of the product
- Category (Required) - Carpet, Wall Hanging, Floor Mat, etc.
- Color (Required) - Product color/design
- Pattern (Required) - Traditional, Geometric, Solid, etc.
- Base Quantity (Required) - Base quantity for recipe calculation
- Unit (Required) - piece, set, etc.
- Weight (Required) - Weight with unit (e.g., "8.5 GSM")
- Thickness (Required) - Thickness with unit (e.g., "15 mm")
- Width (Required) - Width with unit (e.g., "300 feet")
- Height (Required) - Height with unit (e.g., "200 feet")
- Manufacturing Date (Required) - Date in YYYY-MM-DD format
- Notes (Optional) - Product description/notes

### 4. **CORRECT_PRODUCT_RECIPES_TEMPLATE.xlsx**
**Purpose**: Import product recipes (materials needed for each product)
**Fields**:
- Product Name (Required) - Must match product from products template
- Material Name (Required) - Material or product name
- Material Type (Required) - raw_material or product
- Base Quantity (Required) - Quantity needed for 1 base unit
- Total Quantity (Required) - Total quantity needed
- Unit (Required) - Unit of measurement
- Material Type Category (Required) - Category of the material

## 🚀 Setup Instructions

### Step 1: Import Suppliers
1. Open `CORRECT_SUPPLIERS_TEMPLATE.xlsx`
2. Fill in supplier information
3. Import via Materials page → Import Suppliers

### Step 2: Import Raw Materials
1. Open `CORRECT_RAW_MATERIALS_TEMPLATE.xlsx`
2. Fill in material details
3. Ensure supplier names match those from Step 1
4. Import via Materials page → Import Inventory

### Step 3: Import Products
1. Open `CORRECT_PRODUCTS_TEMPLATE.xlsx`
2. Fill in product information including:
   - Physical specifications (Height, Width, Thickness, Weight)
   - Visual details (Color, Material)
   - Care instructions and origin
3. Import via Products page → Import Products

### Step 4: Import Product Recipes
1. Open `CORRECT_PRODUCT_RECIPES_TEMPLATE.xlsx`
2. Fill in recipe information
3. Ensure product names match those from Step 3
4. Ensure material names match those from Step 2
5. Import via Products page → Import Recipes

## ⚠️ Important Notes

### Data Relationships
- **Suppliers** → **Raw Materials**: Supplier names must match exactly
- **Products** → **Recipes**: Product names must match exactly
- **Materials** → **Recipes**: Material names must match exactly

### Material Types in Recipes
- Use `raw_material` for actual raw materials
- Use `product` for products that use other products as ingredients
- Products used as ingredients have `cost_per_unit: 0.00` in the system

### Batch Numbers
- Should be the purchase order number from the supplier
- Format: `PO-2024-001`, `PO-2024-002`, etc.
- Used for traceability

### Quality Grades
- A+ (Premium quality)
- A (Good quality)
- B (Standard quality)

## 🔧 Troubleshooting

### Common Issues
1. **Supplier not found**: Check supplier name spelling in raw materials
2. **Product not found**: Check product name spelling in recipes
3. **Material not found**: Check material name spelling in recipes
4. **Import errors**: Verify all required fields are filled

### Validation Rules
- All required fields must be filled
- Numeric fields must contain valid numbers
- Email addresses must be valid format
- Phone numbers should include country code

## 📊 Sample Data
Each template includes sample data to help you understand the format and requirements. You can use this as a reference or replace it with your actual data.

## 🎯 Next Steps
After importing all templates:
1. Verify data in the respective pages
2. Test recipe calculations
3. Create your first production batch
4. Set up individual products with QR codes

## 📞 Support
If you encounter any issues:
1. Check the validation messages
2. Verify data relationships
3. Ensure all required fields are filled
4. Contact support if problems persist
