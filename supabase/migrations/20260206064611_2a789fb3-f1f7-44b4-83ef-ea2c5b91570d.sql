-- Add LinkedIn URL field to employees table
ALTER TABLE public.employees 
ADD COLUMN linkedin_url text;