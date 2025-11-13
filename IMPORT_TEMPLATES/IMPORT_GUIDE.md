# 📋 **Bulk Import Guide for Rajdhani Trace Flow**

## 🎯 **Overview**
This guide helps you import products, raw materials, suppliers, and recipes in bulk using CSV/Excel files. The system will automatically create all relationships and individual products.

---

## 📁 **Import Order (IMPORTANT!)**
**Follow this exact order to avoid errors:**

1. **SUPPLIERS** → 2. **RAW_MATERIALS** → 3. **PRODUCTS** → 4. **PRODUCT_RECIPES** → 5. **INDIVIDUAL_PRODUCTS**

---

## 🏭 **1. SUPPLIERS_TEMPLATE.csv**

### **Purpose**: Import supplier information
### **Fields**:
- `name` (Required): Supplier company name
- `contact_person`: Contact person name
- `email`: Email address
- `phone`: Phone number
- `address`: Full address
- `city`: City name
- `state`: State name
- `pincode`: Postal code
- `gst_number`: GST registration number
- `status`: "active" or "inactive"

### **Example**:
```csv
name,contact_person,email,phone,address,city,state,pincode,gst_number,status
"Textile Suppliers Ltd","John Doe","john@textilesuppliers.com","+91 9876543210","123 Textile Street","Mumbai","Maharashtra","400001","27ABCDE1234F1Z5","active"
```

---

## 🧱 **2. RAW_MATERIALS_TEMPLATE.csv**

### **Purpose**: Import raw materials with supplier relationships
### **Fields**:
- `name` (Required): Material name
- `brand`: Brand name
- `category` (Required): Use dropdown values (Yarn, Dye, Chemical, Fabric, Thread, Fiber, Coating, Adhesive, Other)
- `current_stock`: Initial stock quantity
- `unit` (Required): Use dropdown values (rolls, liters, kg, sqm, pieces, meters, tons, gallons, pounds, yards)
- `min_threshold`: Minimum stock level
- `max_capacity`: Maximum storage capacity
- `reorder_point`: Reorder trigger point
- `supplier_name` (Required): Must match supplier name from SUPPLIERS_TEMPLATE.csv
- `cost_per_unit`: Cost per unit
- `batch_number`: Batch identifier
- `quality_grade`: Use dropdown values (A+, A, B, C, D)
- `image_url`: Image URL (optional)

### **Example**:
```csv
name,brand,category,current_stock,unit,min_threshold,max_capacity,reorder_point,supplier_name,cost_per_unit,batch_number,quality_grade,image_url
"Premium Cotton Yarn","Premium Cotton","Yarn",500,"kg",50,1000,100,"Textile Suppliers Ltd",450,"BATCH-001","A+",""
```

---

## 📦 **3. PRODUCTS_TEMPLATE.csv**

### **Purpose**: Import products (individual products will be auto-created)
### **Fields**:
- `name` (Required): Product name
- `category` (Required): Use dropdown values (plain paper print, degital print, backing, felt, raw material)
- `color`: Use dropdown values (Red, Blue, Green, Yellow, Black, White, Brown, Gray, Multi-color, NA)
- `size`: Product size
- `pattern`: Use dropdown values (Persian Medallion, Geometric, Floral, Abstract, Traditional, Modern, Digital Art, Standard, RD-1009)
- `base_quantity`: Initial quantity (individual products will be auto-created)
- `individual_stock_tracking`: true/false
- `min_stock_level`: Minimum stock level
- `max_stock_level`: Maximum stock level
- `weight`: Use dropdown values (400 GSM, 300 GSM, 500 GSM, 700 GSM, 800 GSM, 600 GSM, 2 kg, 5 kg)
- `thickness`: Use dropdown values (5mm, 15 mm, 8mm, 20 mm, 25 mm, 10mm, 11mm, 1.5 cm, 12mm, 2 cm, 15mm, 3 mm)
- `width`: Use dropdown values (5 feet, 6 feet, 10 feet, 15 feet, 1.25 meter, 1.5 m, 1.83 meter, 2 m, 3.05 meter)
- `height`: Use dropdown values (148 feet, 5 feet, 45 meter, 10 feet, 15 feet, 2.5 m, 3 m)
- `image_url`: Image URL (optional)
- `notes`: Additional notes

### **Example**:
```csv
name,category,color,size,pattern,base_quantity,individual_stock_tracking,min_stock_level,max_stock_level,weight,thickness,width,height,image_url,notes
"Premium Carpet 6x9","plain paper print","Red","6x9","Persian Medallion",10,true,5,50,"400 GSM","8mm","6 feet","9 feet","","High quality Persian design carpet"
```

---

## 🍳 **4. PRODUCT_RECIPES_TEMPLATE.csv**

### **Purpose**: Define what materials are needed to make each product
### **Fields**:
- `product_name` (Required): Must match product name from PRODUCTS_TEMPLATE.csv
- `material_name` (Required): Must match material name from RAW_MATERIALS_TEMPLATE.csv
- `material_type`: "raw_material" or "product"
- `quantity` (Required): Amount needed
- `unit` (Required): Unit of measurement
- `cost_per_unit`: Cost per unit
- `total_cost`: Total cost for this material
- `production_time`: Time in minutes
- `difficulty_level`: Use dropdown values (Easy, Medium, Hard)

### **Example**:
```csv
product_name,material_name,material_type,quantity,unit,cost_per_unit,total_cost,production_time,difficulty_level
"Premium Carpet 6x9","Premium Cotton Yarn","raw_material",2.5,"kg",450,1125,120,"Medium"
```

---

## 🏷️ **5. INDIVIDUAL_PRODUCTS_TEMPLATE.csv**

### **Purpose**: Create individual product instances (auto-generated QR codes)
### **Fields**:
- `product_name` (Required): Must match product name from PRODUCTS_TEMPLATE.csv
- `quantity` (Required): Number of individual products to create
- `production_date`: Production date (YYYY-MM-DD)
- `quality_grade`: Use dropdown values (A+, A, B, C, D)
- `location`: Storage location
- `notes`: Additional notes

### **Example**:
```csv
product_name,quantity,production_date,quality_grade,location,notes
"Premium Carpet 6x9",10,"2024-01-15","A","Warehouse A","High quality batch"
```

---

## 📋 **Available Dropdown Options**

### **Categories**:
- plain paper print, degital print, backing, felt, raw material

### **Colors**:
- Red, Blue, Green, Yellow, Black, White, Brown, Gray, Multi-color, NA

### **Patterns**:
- Persian Medallion, Geometric, Floral, Abstract, Traditional, Modern, Digital Art, Standard, RD-1009

### **Material Categories**:
- Yarn, Dye, Chemical, Fabric, Thread, Fiber, Coating, Adhesive, Other

### **Units**:
- rolls, liters, kg, sqm, pieces, meters, tons, gallons, pounds, yards

### **Quality Grades**:
- A+, A, B, C, D

### **Difficulty Levels**:
- Easy, Medium, Hard

### **Dimensions** (Width):
- 5 feet, 6 feet, 10 feet, 15 feet, 1.25 meter, 1.5 m, 1.83 meter, 2 m, 3.05 meter

### **Dimensions** (Height):
- 148 feet, 5 feet, 45 meter, 10 feet, 15 feet, 2.5 m, 3 m

### **Thickness**:
- 5mm, 15 mm, 8mm, 20 mm, 25 mm, 10mm, 11mm, 1.5 cm, 12mm, 2 cm, 15mm, 3 mm

### **Weight**:
- 400 GSM, 300 GSM, 500 GSM, 700 GSM, 800 GSM, 600 GSM, 2 kg, 5 kg

---

## ⚠️ **Important Notes**

1. **Exact Matching**: Product names and material names must match exactly between files
2. **Supplier Names**: Must match exactly between SUPPLIERS and RAW_MATERIALS files
3. **Dropdown Values**: Use only the values listed in the dropdown options
4. **Required Fields**: Fields marked as "Required" cannot be empty
5. **Individual Products**: Will be automatically created with unique QR codes
6. **Relationships**: All relationships (product-recipe, material-supplier) will be auto-created

---

## 🚀 **Import Process**

1. **Prepare Data**: Fill all CSV templates with your data
2. **Validate**: Check that all names match between files
3. **Import Order**: Import in the exact order specified above
4. **Verify**: Check that all relationships are created correctly
5. **Test**: Create a test order to verify everything works

---

## 📞 **Support**

If you encounter any issues during import, check:
- All required fields are filled
- Names match exactly between files
- Dropdown values are correct
- Import order is followed

**Happy Importing! 🎉**
