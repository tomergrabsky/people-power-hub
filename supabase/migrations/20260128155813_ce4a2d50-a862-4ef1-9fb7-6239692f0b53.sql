-- Update employees RLS policies to restrict managers to their assigned projects only
-- Super admins can see all, managers and users need project assignment

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view employees in their projects" ON public.employees;
DROP POLICY IF EXISTS "Users can insert employees in their projects" ON public.employees;
DROP POLICY IF EXISTS "Users can update employees in their projects" ON public.employees;
DROP POLICY IF EXISTS "Users can delete employees in their projects" ON public.employees;

-- Recreate policies - only super_admin bypasses project check
-- Managers and users must have project assignment
CREATE POLICY "Users can view employees in their projects" 
ON public.employees 
FOR SELECT 
USING (is_super_admin(auth.uid()) OR has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert employees in their projects" 
ON public.employees 
FOR INSERT 
WITH CHECK (is_super_admin(auth.uid()) OR has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update employees in their projects" 
ON public.employees 
FOR UPDATE 
USING (is_super_admin(auth.uid()) OR has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can delete employees in their projects" 
ON public.employees 
FOR DELETE 
USING (is_super_admin(auth.uid()) OR has_project_access(auth.uid(), project_id));