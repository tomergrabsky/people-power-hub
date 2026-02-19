-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('user', 'manager', 'super_admin');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_roles table (PM, TL, CSM, etc.)
CREATE TABLE public.job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    id_number TEXT NOT NULL UNIQUE,
    job_role_id UUID REFERENCES public.job_roles(id),
    professional_experience_years INTEGER DEFAULT 0,
    organization_experience_years INTEGER DEFAULT 0,
    project_id UUID REFERENCES public.projects(id),
    city TEXT,
    start_date DATE NOT NULL,
    cost DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create user_projects table (which projects a user can access)
CREATE TABLE public.user_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, project_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to check if user is manager or higher
CREATE OR REPLACE FUNCTION public.is_manager_or_above(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('manager', 'super_admin')
  )
$$;

-- Helper function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Helper function to check if user has access to project
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_manager_or_above(_user_id) 
    OR EXISTS (
      SELECT 1 FROM public.user_projects
      WHERE user_id = _user_id AND project_id = _project_id
    )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Super admins can manage all roles" ON public.user_roles
FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view all profiles" ON public.profiles
FOR SELECT USING (public.is_manager_or_above(auth.uid()));

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS Policies for projects
CREATE POLICY "All authenticated can view projects" ON public.projects
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage projects" ON public.projects
FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS Policies for job_roles
CREATE POLICY "All authenticated can view job roles" ON public.job_roles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage job roles" ON public.job_roles
FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS Policies for employees
CREATE POLICY "Users can view employees in their projects" ON public.employees
FOR SELECT USING (
  public.is_manager_or_above(auth.uid()) 
  OR public.has_project_access(auth.uid(), project_id)
);

CREATE POLICY "Users can insert employees in their projects" ON public.employees
FOR INSERT WITH CHECK (
  public.is_manager_or_above(auth.uid()) 
  OR public.has_project_access(auth.uid(), project_id)
);

CREATE POLICY "Users can update employees in their projects" ON public.employees
FOR UPDATE USING (
  public.is_manager_or_above(auth.uid()) 
  OR public.has_project_access(auth.uid(), project_id)
);

CREATE POLICY "Users can delete employees in their projects" ON public.employees
FOR DELETE USING (
  public.is_manager_or_above(auth.uid()) 
  OR public.has_project_access(auth.uid(), project_id)
);

-- RLS Policies for user_projects
CREATE POLICY "Users can view their project assignments" ON public.user_projects
FOR SELECT USING (auth.uid() = user_id OR public.is_manager_or_above(auth.uid()));

CREATE POLICY "Super admins can manage project assignments" ON public.user_projects
FOR ALL USING (public.is_super_admin(auth.uid()));

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    
    -- First user becomes super_admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default job roles
INSERT INTO public.job_roles (name, description) VALUES
('PM', 'Project Manager'),
('TL', 'Team Lead'),
('CSM', 'Customer Success Manager'),
('Developer', 'Software Developer'),
('Designer', 'UI/UX Designer');

-- Insert default projects
INSERT INTO public.projects (name, description) VALUES
('כללי', 'פרויקט ברירת מחדל');