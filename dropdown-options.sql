-- Dropdown Options SQL Script
-- This script populates the dropdown_options table with all necessary values
-- for the Rajdhani Trace Flow application

-- First, clear existing data (optional - remove if you want to keep existing data)
-- DELETE FROM "public"."dropdown_options";

-- Insert all dropdown options
INSERT INTO "public"."dropdown_options" ("id", "category", "value", "display_order", "is_active", "created_at", "updated_at") VALUES

-- Color Options
('09dbdaf7-e4ad-4d33-af55-84e0f234676a', 'color', 'White', '6', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('244f0744-d6b9-44f0-a6f5-63d6c7ba4d3d', 'color', 'Gray', '8', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('3ddab84d-9478-409d-bdb7-079074d1d826', 'color', 'Blue', '2', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('5fbac573-40d7-431c-b60d-458e0df81df2', 'color', 'Brown', '7', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('6a2b8a61-cac2-4f66-8d0f-ecb3058f103f', 'color', 'NA', '10', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('b64f4d4d-dcb4-4cce-87a1-3da02605c565', 'color', 'Black', '5', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('d1b29b10-e37c-4749-aa29-6779a9f747df', 'color', 'Green', '3', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('e7ceed29-2fc1-43b7-a4ca-7877ce7e17e5', 'color', 'Multi-color', '9', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('eb8c9dee-417e-472c-8ded-eb34058b8112', 'color', 'Yellow', '4', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('f207fba3-9875-405e-a443-c90c06e73b1a', 'color', 'Red', '1', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),

-- Pattern Options
('3b82d127-8136-4e78-bfb6-72ae3a33af62', 'pattern', 'Abstract', '4', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('41131be9-67cd-4849-ae24-5ecd01c6e9be', 'pattern', 'Modern', '6', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('4983ffec-1090-4277-8893-34d2cefcd5c9', 'pattern', 'Traditional', '5', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('5340f3ed-1dfc-4226-9b5f-6feb623bbebc', 'pattern', 'Geometric', '2', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('94ab6531-2fe0-4488-bf3e-f0fbfc9b1cf7', 'pattern', 'RD-1009', '999', 'true', '2025-09-25 06:49:50.20941+00', '2025-09-25 06:49:50.20941+00'),
('9cab8ba6-0460-4b61-bd92-937436fa05da', 'pattern', 'Persian Medallion', '1', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('bf57928c-89be-4f9e-84e7-526a769216c1', 'pattern', 'Standard', '8', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('db6b240c-adc8-4cd7-aace-c93aa36b2054', 'pattern', 'Floral', '3', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('f634529a-0cb3-47c2-aa54-699ab82fdc2d', 'pattern', 'Digital Art', '7', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),

-- Category Options
('b25fb799-6184-488d-b876-271ae93d3872', 'category', 'raw material', '5', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('c746264c-b27d-4e98-85c6-129b4fd877ba', 'category', 'degital print', '2', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('c75b7139-2c42-414b-94ec-6862daff5a68', 'category', 'felt', '4', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('cb358c3d-6b0f-435c-a028-a762a8b65a4b', 'category', 'backing', '3', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('fa15fb77-113a-433b-b007-f85216d87442', 'category', 'plain paper print', '1', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),

-- Unit Options
('33fb47ad-6aee-4f83-a918-c154d457aa81', 'unit', 'roll', '1', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('87a557c8-e97a-4053-b2cc-088c229236c5', 'unit', 'GSM', '2', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('edfebc18-2675-4303-9b85-a2e315206e00', 'unit', 'liter', '4', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('ff9695c2-9f57-4ba8-84c0-ff0f19e7480f', 'unit', 'kg', '3', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),

-- Width Options
('2633f78a-ee98-4e1e-8184-611e8d815208', 'width', '6 feet', '2', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('3f27eeb2-8cd3-4d2d-8bb0-c2579448a78e', 'width', '10 feet', '3', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('4be8f612-4e66-4f7c-9e24-d04d9b4344ab', 'width', '1.83 meter', '5', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('5d544899-dece-47be-a3b9-9bcba6e684b0', 'width', '3.05 meter', '6', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('95dc70e6-a625-4163-8300-df97f7829b5a', 'width', '5 feet', '1', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('b5ef0520-6563-4ff3-8206-654a658216a7', 'width', '1.25 meter', '4', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),

-- Height Options
('35e88d3d-2419-43dd-9c49-fafe7cfc04b1', 'height', '45 meter', '2', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('dc7dc1c4-3314-4556-b283-e990ad340339', 'height', '148 feet', '1', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),

-- Weight Options
('43bdc67c-aa9e-4083-98c9-08d27277e792', 'weight', '700 GSM', '3', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('8d300a48-fafe-4e03-90ed-bf0bbd854b6c', 'weight', '400 GSM', '1', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('b9f8c968-8b5d-487d-948f-d4932942de9c', 'weight', '600 GSM', '2', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('cb04b071-a300-4113-b20c-bd3125207ad2', 'weight', '800 GSM', '4', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),

-- Thickness Options
('7d930af7-cb4c-45be-9726-9eebb7624379', 'thickness', '12mm', '5', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('865b4c1d-46ef-45f5-9105-06220e8f22cb', 'thickness', '10mm', '3', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('8e00b15f-db5a-4a35-bec3-a8e011e93cee', 'thickness', '8mm', '2', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('8e108892-1303-444f-ad45-4ca208f222b1', 'thickness', '15mm', '6', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('b1504bbe-4815-412c-b0b4-8dedbf5b176e', 'thickness', '3 mm', '999', 'true', '2025-09-25 06:50:32.880724+00', '2025-09-25 06:50:32.880724+00'),
('bb946125-33f2-4012-b7ec-8e11b0218c0d', 'thickness', '5mm', '1', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00'),
('e08dd066-97f9-4d69-bf69-bba22c2f56dc', 'thickness', '11mm', '4', 'true', '2025-09-18 04:08:54.196071+00', '2025-09-18 04:08:54.196071+00');

-- Additional dropdown options that might be useful for the application
-- You can uncomment and modify these as needed

-- Quality Grade Options
-- INSERT INTO "public"."dropdown_options" ("id", "category", "value", "display_order", "is_active", "created_at", "updated_at") VALUES
-- ('quality-a-plus', 'quality_grade', 'A+', '1', 'true', NOW(), NOW()),
-- ('quality-a', 'quality_grade', 'A', '2', 'true', NOW(), NOW()),
-- ('quality-b', 'quality_grade', 'B', '3', 'true', NOW(), NOW()),
-- ('quality-c', 'quality_grade', 'C', '4', 'true', NOW(), NOW()),
-- ('quality-d', 'quality_grade', 'D', '5', 'true', NOW(), NOW());

-- Priority Options
-- INSERT INTO "public"."dropdown_options" ("id", "category", "value", "display_order", "is_active", "created_at", "updated_at") VALUES
-- ('priority-normal', 'priority', 'normal', '1', 'true', NOW(), NOW()),
-- ('priority-high', 'priority', 'high', '2', 'true', NOW(), NOW()),
-- ('priority-urgent', 'priority', 'urgent', '3', 'true', NOW(), NOW());

-- Status Options
-- INSERT INTO "public"."dropdown_options" ("id", "category", "value", "display_order", "is_active", "created_at", "updated_at") VALUES
-- ('status-planning', 'status', 'planning', '1', 'true', NOW(), NOW()),
-- ('status-active', 'status', 'active', '2', 'true', NOW(), NOW()),
-- ('status-completed', 'status', 'completed', '3', 'true', NOW(), NOW());

-- Waste Type Options
-- INSERT INTO "public"."dropdown_options" ("id", "category", "value", "display_order", "is_active", "created_at", "updated_at") VALUES
-- ('waste-scrap', 'waste_type', 'scrap', '1', 'true', NOW(), NOW()),
-- ('waste-defective', 'waste_type', 'defective', '2', 'true', NOW(), NOW()),
-- ('waste-excess', 'waste_type', 'excess', '3', 'true', NOW(), NOW());

-- Machine Type Options
-- INSERT INTO "public"."dropdown_options" ("id", "category", "value", "display_order", "is_active", "created_at", "updated_at") VALUES
-- ('machine-tufting', 'machine_type', 'Tufting Machine', '1', 'true', NOW(), NOW()),
-- ('machine-cutting', 'machine_type', 'Cutting Machine', '2', 'true', NOW(), NOW()),
-- ('machine-finishing', 'machine_type', 'Finishing Machine', '3', 'true', NOW(), NOW()),
-- ('machine-quality', 'machine_type', 'Quality Control Machine', '4', 'true', NOW(), NOW()),
-- ('machine-needle', 'machine_type', 'Needle Punching Machine', '5', 'true', NOW(), NOW());

-- Supplier Options (you can add your actual suppliers)
-- INSERT INTO "public"."dropdown_options" ("id", "category", "value", "display_order", "is_active", "created_at", "updated_at") VALUES
-- ('supplier-1', 'supplier', 'ABC Textiles', '1', 'true', NOW(), NOW()),
-- ('supplier-2', 'supplier', 'XYZ Materials', '2', 'true', NOW(), NOW()),
-- ('supplier-3', 'supplier', 'DEF Industries', '3', 'true', NOW(), NOW());

-- Location Options
-- INSERT INTO "public"."dropdown_options" ("id", "category", "value", "display_order", "is_active", "created_at", "updated_at") VALUES
-- ('location-warehouse-a', 'location', 'Warehouse A', '1', 'true', NOW(), NOW()),
-- ('location-warehouse-b', 'location', 'Warehouse B', '2', 'true', NOW(), NOW()),
-- ('location-production', 'location', 'Production Floor', '3', 'true', NOW(), NOW()),
-- ('location-storage', 'location', 'Storage Room', '4', 'true', NOW(), NOW());

-- Verify the data was inserted correctly
SELECT 
    category,
    COUNT(*) as option_count,
    STRING_AGG(value, ', ' ORDER BY display_order) as values
FROM "public"."dropdown_options" 
WHERE is_active = 'true'
GROUP BY category
ORDER BY category;
