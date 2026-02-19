-- Create branches table
CREATE TABLE public.branches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- All authenticated can view branches
CREATE POLICY "All authenticated can view branches"
ON public.branches
FOR SELECT
USING (true);

-- Super admins can manage branches
CREATE POLICY "Super admins can manage branches"
ON public.branches
FOR ALL
USING (is_super_admin(auth.uid()));

-- Add branch_id column to employees table
ALTER TABLE public.employees
ADD COLUMN branch_id UUID REFERENCES public.branches(id);