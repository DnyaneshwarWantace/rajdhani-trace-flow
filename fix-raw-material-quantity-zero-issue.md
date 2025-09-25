# Fix Raw Material Quantity Zero Issue

## Problem Description
When creating orders for raw materials, the quantity shows as 0 kg in the Stock Management page, and when trying to deliver the order, it fails because you can't add 0 quantity to stock.

## Root Causes
1. **Database Schema Issue**: The `purchase_orders` table doesn't have a `material_details` column, so material details are stored in the `notes` field as JSON
2. **Data Parsing Issue**: The `ManageStock.tsx` component wasn't properly parsing the material details from the `notes` field
3. **Missing Validation**: No validation to ensure quantity is greater than 0 when creating orders
4. **Default Values**: When parsing fails, quantity defaults to 0

## Solution

### Step 1: Execute Database Fix
Run the SQL script to fix the database schema:

```sql
-- Execute the contents of fix-purchase-orders-quantity-issue.sql
```

This script will:
- Add `material_details` JSONB column to `purchase_orders` table
- Add `actual_delivery` column
- Convert existing data from `notes` field to `material_details`
- Insert sample test data
- Create indexes for better performance

### Step 2: Code Changes Made

#### 1. Fixed ManageStock.tsx
- Updated order loading logic to use `material_details` column first, then fallback to `notes`
- Added proper field mapping for both old and new data formats
- Added quantity validation before processing deliveries
- Ensured quantity defaults to 1 instead of 0 when parsing fails

#### 2. Fixed Materials.tsx
- Added quantity validation before creating orders
- Ensured orders can't be created with 0 or negative quantities
- Improved error handling and user feedback

### Step 3: Test the Fix

1. **Create a new raw material order**:
   - Go to Materials page
   - Create a new material
   - Try to create an order with quantity 0 - should show error
   - Create an order with valid quantity (e.g., 100 kg)

2. **Check Stock Management**:
   - Go to Stock Management page
   - Verify the order shows with correct quantity (not 0)
   - Try to deliver the order - should work now

3. **Verify Delivery**:
   - Mark the order as delivered
   - Check that the raw material stock is updated correctly
   - Verify the material appears in the Materials list with correct stock

## Files Modified
- `src/pages/ManageStock.tsx` - Fixed order loading and delivery logic
- `src/pages/Materials.tsx` - Added quantity validation
- `fix-purchase-orders-quantity-issue.sql` - Database schema fix

## Database Changes
- Added `material_details` JSONB column to `purchase_orders` table
- Added `actual_delivery` TIMESTAMP column
- Created GIN index on `material_details` for better performance
- Migrated existing data from `notes` to `material_details`

## Testing Checklist
- [ ] Create new raw material order with valid quantity
- [ ] Verify order appears in Stock Management with correct quantity
- [ ] Test delivery of the order
- [ ] Verify stock is updated correctly after delivery
- [ ] Test error handling for 0 quantity orders
- [ ] Test with existing orders (should still work)

## Prevention
- All new orders will have proper quantity validation
- Database schema now supports structured material details
- Better error handling and user feedback
- Proper data migration for existing orders
