-- Create seniority_levels table
CREATE TABLE public.seniority_levels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on seniority_levels
ALTER TABLE public.seniority_levels ENABLE ROW LEVEL SECURITY;

-- All authenticated can view seniority levels
CREATE POLICY "All authenticated can view seniority levels"
ON public.seniority_levels
FOR SELECT
TO authenticated
USING (true);

-- Super admins can manage seniority levels
CREATE POLICY "Super admins can manage seniority levels"
ON public.seniority_levels
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- Add new columns to employees table
ALTER TABLE public.employees
ADD COLUMN seniority_level_id uuid REFERENCES public.seniority_levels(id),
ADD COLUMN attrition_risk integer CHECK (attrition_risk >= 0 AND attrition_risk <= 5),
ADD COLUMN attrition_risk_reason text,
ADD COLUMN unit_criticality integer CHECK (unit_criticality >= 0 AND unit_criticality <= 5),
ADD COLUMN salary_raise_date date,
ADD COLUMN salary_raise_percentage numeric;