# 📁 **Import Templates for Rajdhani Trace Flow**

## 🎯 **What's Included**

This folder contains all the templates and guides needed to bulk import your products, raw materials, suppliers, and recipes into the Rajdhani Trace Flow system.

---

## 📋 **Files Overview**

### **📊 CSV Templates**
1. **`SUPPLIERS_TEMPLATE.csv`** - Import supplier information
2. **`RAW_MATERIALS_TEMPLATE.csv`** - Import raw materials with supplier relationships
3. **`PRODUCTS_TEMPLATE.csv`** - Import products (individual products auto-created)
4. **`PRODUCT_RECIPES_TEMPLATE.csv`** - Define what materials make each product
5. **`INDIVIDUAL_PRODUCTS_TEMPLATE.csv`** - Create individual product instances
6. **`DROPDOWN_OPTIONS_REFERENCE.csv`** - All available dropdown values

### **📖 Documentation**
1. **`IMPORT_GUIDE.md`** - Complete step-by-step import guide
2. **`COMPLETE_IMPORT_TEMPLATE.md`** - Excel structure and relationship mapping
3. **`README.md`** - This overview file

---

## 🚀 **Quick Start**

### **Step 1: Download Templates**
- Download all CSV files from this folder
- Use them as templates for your data

### **Step 2: Fill Your Data**
- Start with `SUPPLIERS_TEMPLATE.csv`
- Then `RAW_MATERIALS_TEMPLATE.csv` (match supplier names)
- Then `PRODUCTS_TEMPLATE.csv`
- Then `PRODUCT_RECIPES_TEMPLATE.csv` (match product/material names)
- Finally `INDIVIDUAL_PRODUCTS_TEMPLATE.csv` (match product names)

### **Step 3: Import Order**
**CRITICAL**: Import in this exact order:
1. Suppliers
2. Raw Materials
3. Products
4. Product Recipes
5. Individual Products

### **Step 4: Validate**
- Check that all names match between files
- Verify dropdown values are correct
- Test with a sample order

---

## 🔗 **Key Relationships**

### **Supplier → Raw Material**
- Raw material supplier names must exactly match supplier names

### **Product → Recipe**
- Recipe product names must exactly match product names
- Recipe material names must exactly match raw material names

### **Product → Individual Products**
- Individual product names must exactly match product names
- System auto-creates QR codes for each individual product

---

## 📊 **Current System Data**

### **Available Suppliers**:
- Textile Suppliers Ltd
- Fabric World Industries

### **Available Dropdown Options**:
- **Categories**: plain paper print, degital print, backing, felt, raw material
- **Colors**: Red, Blue, Green, Yellow, Black, White, Brown, Gray, Multi-color, NA
- **Patterns**: Persian Medallion, Geometric, Floral, Abstract, Traditional, Modern, Digital Art, Standard, RD-1009
- **Material Categories**: Yarn, Dye, Chemical, Fabric, Thread, Fiber, Coating, Adhesive, Other
- **Units**: rolls, liters, kg, sqm, pieces, meters, tons, gallons, pounds, yards
- **Quality Grades**: A+, A, B, C, D

---

## ⚠️ **Important Notes**

1. **Exact Matching**: All names must match exactly between files
2. **Required Fields**: Cannot be empty (marked in templates)
3. **Dropdown Values**: Use only values from `DROPDOWN_OPTIONS_REFERENCE.csv`
4. **Import Order**: Must follow the specified order
5. **Individual Products**: Will be auto-created with unique QR codes

---

## 🎯 **Benefits**

✅ **Bulk Import**: Import hundreds of items at once  
✅ **Auto-Relationships**: All connections created automatically  
✅ **QR Code Generation**: Individual products get unique QR codes  
✅ **Complete Inventory**: Full inventory system ready  
✅ **Recipe Management**: Production recipes configured  
✅ **Supplier Tracking**: Complete supplier relationships  

---

## 📞 **Need Help?**

1. **Read the guides**: Start with `IMPORT_GUIDE.md`
2. **Check relationships**: Use `COMPLETE_IMPORT_TEMPLATE.md`
3. **Validate dropdowns**: Use `DROPDOWN_OPTIONS_REFERENCE.csv`
4. **Follow the order**: Import in the specified sequence

**Happy Importing! 🎉**
