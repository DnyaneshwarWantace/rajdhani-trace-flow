# Connected Excel Templates Setup Guide

## Overview
This guide explains how to use the connected Excel templates for first-time inventory setup. The templates are designed to work together with proper relationships.

## Import Order (CRITICAL!)
**You MUST import in this exact order:**

1. **Suppliers** → 2. **Raw Materials** → 3. **Products** → 4. **Product Recipes**

### ⚠️ CRITICAL REQUIREMENT:
**You MUST create suppliers FIRST before creating raw materials!**

**Why?**
- When creating raw materials, you select from a dropdown of existing suppliers
- The system loads suppliers from the database and shows them in a dropdown
- If no suppliers exist, you cannot create raw materials
- Supplier names in raw materials template must exactly match supplier names from suppliers template

## Template Details

### 1. CORRECT_SUPPLIERS_TEMPLATE.xlsx
**Purpose**: Import supplier information
**Fields**:
- Supplier Name (Required) - Company name
- Contact Person (Required) - Main contact person
- Email (Required) - Contact email
- Phone (Required) - Contact phone
- GST Number (Required) - GST registration number
- Address (Required) - Full address
- City (Required) - City name
- State (Required) - State name
- Pincode (Required) - Postal code

**Note**: Supplier names from this template are referenced in raw materials.

### 2. CORRECT_RAW_MATERIALS_TEMPLATE.xlsx
**Purpose**: Import raw material inventory
**Fields**:
- Material Name (Required) - Name of the material
- Type (Required) - Material type (Cotton, Silk, Chemical, etc.)
- Category (Required) - Material category (Yarn, Fabric, Dye, etc.)
- Current Stock (Required) - Current stock quantity
- Unit (Required) - Unit of measurement (kg, meters, liters, etc.)
- Min Stock Level (Required) - Minimum stock threshold
- Max Storage Capacity (Required) - Maximum storage capacity
- Reorder Point (Auto-generated) - System sets this = Min Stock Level
- **Supplier Name (Required)** - Must match supplier from suppliers template
- Cost Per Unit (Required) - Cost per unit
- Batch Number (Auto-generated) - System generates unique batch number
- Quality Grade (Auto-generated) - System sets to "A"
- Image URL (Optional) - Material image URL

**Important**: 
- The "Supplier Name" must exactly match a supplier from the suppliers template
- When creating raw materials in the system, you select from a dropdown of existing suppliers
- Only suppliers that exist in the database will appear in the dropdown

### 3. CORRECT_PRODUCTS_TEMPLATE.xlsx
**Purpose**: Import product catalog
**Fields**:
- Product Name (Required) - Name of the product
- Category (Required) - Product category (Carpet, Wall Hanging, etc.)
- Color (Required) - Product color/design
- Pattern (Required) - Design pattern (Traditional, Geometric, etc.)
- Base Quantity (Required) - Base quantity for recipe calculation
- Unit (Required) - Unit of measurement (piece, set, etc.)
- Weight (Required) - Weight with unit (e.g., "8.5 GSM")
- Thickness (Required) - Thickness with unit (e.g., "15 mm")
- Width (Required) - Width with unit (e.g., "300 feet")
- Height (Required) - Height with unit (e.g., "200 feet")
- Manufacturing Date (Required) - Date in YYYY-MM-DD format
- Notes (Optional) - Product description/notes

### 4. CORRECT_PRODUCT_RECIPES_TEMPLATE.xlsx
**Purpose**: Import product recipes (materials needed for each product)
**Fields**:
- Product Name (Required) - Must match product from products template
- Material Name (Required) - Must match material from raw materials template
- Material Type (Required) - "raw_material" or "product"
- Quantity (Required) - Amount needed for 1 base unit of product
- Unit (Required) - Unit of measurement

**Important**: 
- "Product Name" must exactly match a product from the products template
- "Material Name" must exactly match a material from the raw materials template

## How the Templates Connect

```
Suppliers Template
       ↓ (Supplier Name)
Raw Materials Template
       ↓ (Material Name)
Product Recipes Template
       ↑ (Product Name)
Products Template
```

## Step-by-Step Import Process

### Step 1: Import Suppliers
1. Open `CORRECT_SUPPLIERS_TEMPLATE.xlsx`
2. Review the supplier data
3. Add/modify suppliers as needed
4. Import into the system

### Step 2: Import Raw Materials
1. Open `CORRECT_RAW_MATERIALS_TEMPLATE.xlsx`
2. **CRITICAL**: Verify all "Supplier Name" entries match suppliers from Step 1
3. **IMPORTANT**: Only use supplier names that exist in your suppliers database
4. Add/modify materials as needed
5. Import into the system

**Note**: When creating raw materials in the system, you'll see a dropdown with only the suppliers you imported in Step 1.

### Step 3: Import Products
1. Open `CORRECT_PRODUCTS_TEMPLATE.xlsx`
2. Review the product data
3. Add/modify products as needed
4. Import into the system

### Step 4: Import Product Recipes
1. Open `CORRECT_PRODUCT_RECIPES_TEMPLATE.xlsx`
2. Verify all "Product Name" entries match products from Step 3
3. Verify all "Material Name" entries match materials from Step 2
4. Add/modify recipes as needed
5. Import into the system

## Important Notes

### For Raw Materials:
- **Supplier Name**: Must exactly match a supplier from the suppliers template
- **Batch Number**: Should be the purchase order number from the supplier
- **Units**: Use consistent units (kg, meters, liters, sqm, etc.)

### For Product Recipes:
- **Product Name**: Must exactly match a product from the products template
- **Material Name**: Must exactly match a material from the raw materials template
- **Quantity**: This is the amount needed for 1 base unit of the product
- **Material Type**: Use "raw_material" for materials from the raw materials template

### Common Issues:
1. **Supplier Name Mismatch**: Raw material supplier name doesn't match any supplier
2. **Product Name Mismatch**: Recipe product name doesn't match any product
3. **Material Name Mismatch**: Recipe material name doesn't match any raw material
4. **Case Sensitivity**: Names must match exactly (case-sensitive)

## Example Workflow

### Step 1: Import Suppliers
```
Supplier Name: "Rajdhani Textiles Ltd"
Contact Person: "Rajesh Kumar"
Email: "rajesh@rajdhanitextiles.com"
... (other fields)
```

### Step 2: Import Raw Materials
```
Material Name: "Premium Cotton Yarn"
Supplier Name: "Rajdhani Textiles Ltd"  ← Must match exactly!
Type: "Cotton"
Category: "Yarn"
... (other fields)
```

### Step 3: Import Products
```
Product Name: "Premium Handwoven Carpet"
Category: "Carpet"
Color: "Red & Gold"
... (other fields)
```

### Step 4: Import Product Recipes
```
Product Name: "Premium Handwoven Carpet"  ← Must match product from Step 3
Material Name: "Premium Cotton Yarn"      ← Must match material from Step 2
Material Type: "raw_material"
Quantity: 2.5
Unit: "kg"
```

## How Supplier Selection Works in the System

When you create raw materials in the system:
1. System loads all suppliers from database
2. Shows them in a dropdown: "Select supplier"
3. You can only select from existing suppliers
4. If no suppliers exist, dropdown will be empty
5. This is why you MUST import suppliers first!

## Validation Checklist

Before importing each template:
- [ ] All required fields are filled
- [ ] Supplier names match between suppliers and raw materials
- [ ] Product names match between products and recipes
- [ ] Material names match between raw materials and recipes
- [ ] Units are consistent
- [ ] Dates are in correct format (YYYY-MM-DD)
- [ ] Numbers are valid (no negative quantities)

## Support

If you encounter issues:
1. Check that names match exactly between templates
2. Verify all required fields are filled
3. Ensure import order is correct (Suppliers → Raw Materials → Products → Recipes)
4. Check for typos in names and units
