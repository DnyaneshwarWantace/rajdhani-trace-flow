# Add Item on Order Details – Implementation Summary

The backend already supports adding an item to an existing order:

- **Endpoint:** `POST /api/orders/:order_id/items`
- **Body:** `product_type`, `product_id` (or `raw_material_id` for materials), `product_name`, `quantity`, `unit`, `unit_price`, `gst_rate`, `gst_included`, `subtotal`, `gst_amount`, `total_price`

## What to add in `OrderDetails.tsx`

1. **State** (after `invoiceRef`):
   - `showAddItemDialog`, `addItemCurrentItem` (ExtendedOrderItem | null), `addItemProducts`, `addItemMaterials`, `addItemProductSearch`, `addItemProductPage`, `addItemMaterialPage`, `addItemSubmitting`
   - `pricingCalculator = usePricingCalculator()`
   - `canEditOrder = order && !['dispatched','delivered','cancelled'].includes(order.status)`

2. **Handlers** (e.g. after `performOrderCancellation`):
   - `getAddItemSyntheticItem()` – returns a minimal ExtendedOrderItem with `id: 'add-new'`, `product_type: 'product'`, etc.
   - `loadAddItemProductsAndMaterials()` – `ProductService.getProducts()` and `MaterialService.getMaterials()`, then set state (materials: `materialsRes.materials`).
   - `handleOpenAddItem()` – set synthetic item, set showAddItemDialog true, call loadAddItemProductsAndMaterials.
   - `handleAddItemProductSelected(productId)` – resolve product/material from lists, build payload (quantity 1, unit_price from entity, calc subtotal/gst/total), POST to `/orders/${id}/items`, then loadOrderDetails and close dialog.

3. **UI**
   - In the Order Items card header: when `canEditOrder`, show a button “Add Item” with Plus icon that calls `handleOpenAddItem`.
   - Render `ProductMaterialSelectionDialog` with isOpen=showAddItemDialog, currentItem=addItemCurrentItem, products=addItemProducts, materials=addItemMaterials, productSearchTerm, onSearchChange, onSelectProduct=handleAddItemProductSelected, and pagination props.

Imports are already present: ProductMaterialSelectionDialog, ProductService, MaterialService, usePricingCalculator, ExtendedOrderItem, Plus.
