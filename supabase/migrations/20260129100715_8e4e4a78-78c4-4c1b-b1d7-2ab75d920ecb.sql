-- Add phone number columns to employees table
ALTER TABLE public.employees 
ADD COLUMN phone text,
ADD COLUMN emergency_phone text;