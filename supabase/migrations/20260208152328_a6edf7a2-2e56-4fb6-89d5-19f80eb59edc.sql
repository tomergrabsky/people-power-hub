-- Add real market salary field for super admins
ALTER TABLE public.employees ADD COLUMN real_market_salary numeric NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.employees.real_market_salary IS 'Real market monthly salary - super admin only field';