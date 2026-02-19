-- Add revolving_door boolean field to employees
ALTER TABLE public.employees
ADD COLUMN revolving_door boolean DEFAULT false;