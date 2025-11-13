# 📊 **Excel Template Structure - Visual Guide**

## 🎯 **Create One Excel File with 5 Sheets**

### **Sheet 1: SUPPLIERS**
```
| Company Name        | Contact Person | Email                    | Phone           | Status  |
|---------------------|----------------|--------------------------|-----------------|---------|
| Textile Suppliers   | John Doe       | john@textiles.com        | +91 9876543210  | active  |
| Fabric World        | Jane Smith     | jane@fabricworld.com     | +91 9876543211  | active  |
```

### **Sheet 2: RAW_MATERIALS**
```
| Material Name       | Category | Unit | Supplier Name      | Cost Per Unit | Current Stock |
|---------------------|----------|------|--------------------|---------------|---------------|
| Premium Cotton Yarn | Yarn     | kg   | Textile Suppliers  | 450           | 500           |
| Pure Silk Fabric    | Fabric   | meters| Fabric World      | 1200          | 200           |
```

### **Sheet 3: PRODUCTS**
```
| Product Name        | Category        | Color | Pattern          | Base Quantity |
|---------------------|-----------------|-------|------------------|---------------|
| Premium Carpet 6x9  | plain paper print| Red  | Persian Medallion| 10            |
| Luxury Rug 8x10     | degital print   | Blue  | Geometric        | 5             |
```

### **Sheet 4: PRODUCT_RECIPES**
```
| Product Name        | Material Name       | Quantity | Unit | Cost Per Unit |
|---------------------|---------------------|----------|------|---------------|
| Premium Carpet 6x9  | Premium Cotton Yarn | 2.5      | kg   | 450           |
| Premium Carpet 6x9  | Reactive Dye Blue   | 0.5      | liters| 350         |
| Luxury Rug 8x10     | Pure Silk Fabric    | 3.0      | meters| 1200        |
```

### **Sheet 5: INDIVIDUAL_PRODUCTS**
```
| Product Name        | Quantity to Create | Production Date | Quality Grade | Storage Location |
|---------------------|--------------------|-----------------|---------------|------------------|
| Premium Carpet 6x9  | 10                 | 2024-01-15      | A             | Warehouse A      |
| Luxury Rug 8x10     | 5                  | 2024-01-16      | A+            | Warehouse B      |
```

---

## 🔗 **How Names Connect**

### **Step 1 → Step 2 Connection**
```
SUPPLIERS Sheet: "Textile Suppliers Ltd"
RAW_MATERIALS Sheet: "Textile Suppliers Ltd" ← Must match exactly
```

### **Step 2 → Step 4 Connection**
```
RAW_MATERIALS Sheet: "Premium Cotton Yarn"
PRODUCT_RECIPES Sheet: "Premium Cotton Yarn" ← Must match exactly
```

### **Step 3 → Step 4 & 5 Connection**
```
PRODUCTS Sheet: "Premium Carpet 6x9"
PRODUCT_RECIPES Sheet: "Premium Carpet 6x9" ← Must match exactly
INDIVIDUAL_PRODUCTS Sheet: "Premium Carpet 6x9" ← Must match exactly
```

---

## 📋 **Dropdown Options Reference**

### **Product Categories**
- plain paper print
- degital print
- backing
- felt
- raw material

### **Material Categories**
- Yarn
- Dye
- Chemical
- Fabric
- Thread
- Fiber
- Coating
- Adhesive
- Other

### **Colors**
- Red, Blue, Green, Yellow, Black, White, Brown, Gray, Multi-color, NA

### **Patterns**
- Persian Medallion, Geometric, Floral, Abstract, Traditional, Modern, Digital Art, Standard, RD-1009

### **Units**
- kg, meters, liters, sqm, pieces, tons, gallons, pounds, yards

### **Quality Grades**
- A+, A, B, C, D

---

## ⚠️ **Common Mistakes to Avoid**

1. **Name Mismatch**: "Textile Suppliers" vs "Textile Suppliers Ltd" ❌
2. **Wrong Category**: Using "Cotton" instead of "Yarn" ❌
3. **Missing Required Fields**: Leaving Company Name empty ❌
4. **Wrong Order**: Filling sheets in wrong sequence ❌

---

## ✅ **Success Checklist**

- [ ] All supplier names match between Sheets 1 and 2
- [ ] All product names match between Sheets 3, 4, and 5
- [ ] All material names match between Sheets 2 and 4
- [ ] All required fields are filled
- [ ] Only dropdown values are used
- [ ] Numbers are in correct format (no text in quantity fields)

**Follow this structure and you'll be ready to import! 🎉**
