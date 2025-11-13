# 📊 **Complete Import Template Structure**

## 🎯 **Excel File Structure (Recommended)**

Create an Excel file with **5 sheets** in this exact order:

### **Sheet 1: SUPPLIERS**
```csv
name,contact_person,email,phone,address,city,state,pincode,gst_number,status
"Textile Suppliers Ltd","John Doe","john@textilesuppliers.com","+91 9876543210","123 Textile Street","Mumbai","Maharashtra","400001","27ABCDE1234F1Z5","active"
"Fabric World Industries","Jane Smith","jane@fabricworld.com","+91 9876543211","456 Fabric Avenue","Delhi","Delhi","110001","07FGHIJ5678K2L6","active"
```

### **Sheet 2: RAW_MATERIALS**
```csv
name,brand,category,current_stock,unit,min_threshold,max_capacity,reorder_point,supplier_name,cost_per_unit,batch_number,quality_grade,image_url
"Premium Cotton Yarn","Premium Cotton","Yarn",500,"kg",50,1000,100,"Textile Suppliers Ltd",450,"BATCH-001","A+",""
"Pure Silk Fabric","Luxury Silk","Fabric",200,"meters",20,500,40,"Fabric World Industries",1200,"BATCH-002","A",""
```

### **Sheet 3: PRODUCTS**
```csv
name,category,color,size,pattern,base_quantity,individual_stock_tracking,min_stock_level,max_stock_level,weight,thickness,width,height,image_url,notes
"Premium Carpet 6x9","plain paper print","Red","6x9","Persian Medallion",10,true,5,50,"400 GSM","8mm","6 feet","9 feet","","High quality Persian design carpet"
"Luxury Rug 8x10","degital print","Blue","8x10","Geometric",5,true,2,25,"500 GSM","10mm","8 feet","10 feet","","Modern geometric pattern rug"
```

### **Sheet 4: PRODUCT_RECIPES**
```csv
product_name,material_name,material_type,quantity,unit,cost_per_unit,total_cost,production_time,difficulty_level
"Premium Carpet 6x9","Premium Cotton Yarn","raw_material",2.5,"kg",450,1125,120,"Medium"
"Premium Carpet 6x9","Reactive Dye Blue","raw_material",0.5,"liters",350,175,30,"Easy"
"Luxury Rug 8x10","Pure Silk Fabric","raw_material",3.0,"meters",1200,3600,180,"Hard"
```

### **Sheet 5: INDIVIDUAL_PRODUCTS**
```csv
product_name,quantity,production_date,quality_grade,location,notes
"Premium Carpet 6x9",10,"2024-01-15","A","Warehouse A","High quality batch"
"Luxury Rug 8x10",5,"2024-01-16","A+","Warehouse B","Premium silk batch"
```

---

## 🔗 **Relationship Mapping**

### **Supplier → Raw Material**
- `RAW_MATERIALS.supplier_name` must match `SUPPLIERS.name`

### **Product → Recipe**
- `PRODUCT_RECIPES.product_name` must match `PRODUCTS.name`
- `PRODUCT_RECIPES.material_name` must match `RAW_MATERIALS.name`

### **Product → Individual Products**
- `INDIVIDUAL_PRODUCTS.product_name` must match `PRODUCTS.name`
- System will auto-create QR codes for each individual product

---

## 📋 **Data Validation Rules**

### **Required Fields**:
- **SUPPLIERS**: name, status
- **RAW_MATERIALS**: name, category, unit, supplier_name
- **PRODUCTS**: name, category
- **PRODUCT_RECIPES**: product_name, material_name, quantity, unit
- **INDIVIDUAL_PRODUCTS**: product_name, quantity

### **Dropdown Validation**:
- Use only values from the dropdown lists provided
- Case-sensitive matching required

### **Numeric Fields**:
- All quantities, costs, and dimensions must be numeric
- Use decimal format (e.g., 2.5, 10.0)

---

## 🎯 **Import Benefits**

1. **Bulk Creation**: Import hundreds of products at once
2. **Auto-Relationships**: All connections created automatically
3. **QR Code Generation**: Individual products get unique QR codes
4. **Inventory Setup**: Complete inventory system ready
5. **Recipe Management**: Full production recipes configured
6. **Supplier Tracking**: Complete supplier relationship mapping

---

## 📊 **Sample Data Volume**

### **Small Business** (50-100 items):
- 5-10 Suppliers
- 20-30 Raw Materials
- 15-25 Products
- 50-75 Recipe Entries
- 100-200 Individual Products

### **Medium Business** (200-500 items):
- 10-20 Suppliers
- 50-100 Raw Materials
- 50-100 Products
- 200-400 Recipe Entries
- 500-1000 Individual Products

### **Large Business** (500+ items):
- 20+ Suppliers
- 100+ Raw Materials
- 100+ Products
- 500+ Recipe Entries
- 1000+ Individual Products

---

## 🚀 **Quick Start Checklist**

- [ ] Download all CSV templates
- [ ] Fill SUPPLIERS sheet first
- [ ] Fill RAW_MATERIALS sheet (match supplier names)
- [ ] Fill PRODUCTS sheet
- [ ] Fill PRODUCT_RECIPES sheet (match product/material names)
- [ ] Fill INDIVIDUAL_PRODUCTS sheet (match product names)
- [ ] Validate all relationships
- [ ] Import in order: Suppliers → Materials → Products → Recipes → Individual Products
- [ ] Test with a sample order

**Ready to import! 🎉**
