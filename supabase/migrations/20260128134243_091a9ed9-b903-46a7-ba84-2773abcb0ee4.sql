-- Update has_project_access function to require project assignment for managers too
-- Only super_admin bypasses project access checks

CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Super admins have access to all projects
    public.is_super_admin(_user_id) 
    OR EXISTS (
      -- Both regular users AND managers need project assignments
      SELECT 1 FROM public.user_projects
      WHERE user_id = _user_id AND project_id = _project_id
    )
$$;