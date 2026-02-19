-- Create a table for storing user form field order preferences
CREATE TABLE public.user_form_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    form_name TEXT NOT NULL,
    field_order TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, form_name)
);

-- Enable Row Level Security
ALTER TABLE public.user_form_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own form preferences" 
ON public.user_form_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own form preferences" 
ON public.user_form_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own form preferences" 
ON public.user_form_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own form preferences" 
ON public.user_form_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_form_preferences_updated_at
BEFORE UPDATE ON public.user_form_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();