-- Create employing_companies table
CREATE TABLE public.employing_companies (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employing_companies ENABLE ROW LEVEL SECURITY;

-- All authenticated can view companies
CREATE POLICY "All authenticated can view companies"
ON public.employing_companies
FOR SELECT
USING (true);

-- Super admins can manage companies
CREATE POLICY "Super admins can manage companies"
ON public.employing_companies
FOR ALL
USING (is_super_admin(auth.uid()));

-- Update employees table: change employing_company from text to uuid foreign key
ALTER TABLE public.employees DROP COLUMN IF EXISTS employing_company;
ALTER TABLE public.employees ADD COLUMN employing_company_id uuid REFERENCES public.employing_companies(id);