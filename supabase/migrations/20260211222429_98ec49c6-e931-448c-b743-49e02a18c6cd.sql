
-- Create leaving_reasons table
CREATE TABLE public.leaving_reasons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  description text
);

ALTER TABLE public.leaving_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view leaving reasons"
ON public.leaving_reasons FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins can manage leaving reasons"
ON public.leaving_reasons FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- Add foreign key to employees
ALTER TABLE public.employees ADD COLUMN leaving_reason_id uuid REFERENCES public.leaving_reasons(id);
