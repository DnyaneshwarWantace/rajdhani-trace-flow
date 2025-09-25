-- Create dropdown_options table
CREATE TABLE IF NOT EXISTS "public"."dropdown_options" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "category" text NOT NULL,
    "value" text NOT NULL,
    "display_order" integer NOT NULL DEFAULT 1,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_dropdown_options_category" ON "public"."dropdown_options" ("category");
CREATE INDEX IF NOT EXISTS "idx_dropdown_options_active" ON "public"."dropdown_options" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_dropdown_options_display_order" ON "public"."dropdown_options" ("display_order");

-- Enable Row Level Security (RLS)
ALTER TABLE "public"."dropdown_options" ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Allow all operations for authenticated users" ON "public"."dropdown_options"
    FOR ALL USING (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_dropdown_options_updated_at 
    BEFORE UPDATE ON "public"."dropdown_options" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
