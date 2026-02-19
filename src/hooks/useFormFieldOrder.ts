import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useFormFieldOrder(formName: string, defaultOrder: string[]) {
  const { user } = useAuth();
  const [fieldOrder, setFieldOrder] = useState<string[]>(defaultOrder);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved order from database
  useEffect(() => {
    const loadOrder = async () => {
      if (!user?.id) {
        setFieldOrder(defaultOrder);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_form_preferences')
          .select('field_order')
          .eq('user_id', user.id)
          .eq('form_name', formName)
          .maybeSingle();

        if (error) {
          console.error('Error loading field order:', error);
          setFieldOrder(defaultOrder);
        } else if (data?.field_order) {
          // Merge with default order to handle new fields
          const savedOrder = data.field_order;
          const mergedOrder = [...savedOrder];
          
          // Add any new fields that weren't in saved order
          defaultOrder.forEach(field => {
            if (!mergedOrder.includes(field)) {
              mergedOrder.push(field);
            }
          });
          
          // Remove any fields that no longer exist
          const filteredOrder = mergedOrder.filter(field => defaultOrder.includes(field));
          
          setFieldOrder(filteredOrder);
        } else {
          setFieldOrder(defaultOrder);
        }
      } catch (err) {
        console.error('Error loading field order:', err);
        setFieldOrder(defaultOrder);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [user?.id, formName, defaultOrder]);

  // Save order to database
  const saveOrder = useCallback(async (newOrder: string[]) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_form_preferences')
        .upsert({
          user_id: user.id,
          form_name: formName,
          field_order: newOrder,
        }, {
          onConflict: 'user_id,form_name'
        });

      if (error) {
        console.error('Error saving field order:', error);
      }
    } catch (err) {
      console.error('Error saving field order:', err);
    }
  }, [user?.id, formName]);

  const updateOrder = useCallback((newOrder: string[]) => {
    setFieldOrder(newOrder);
    saveOrder(newOrder);
  }, [saveOrder]);

  const resetOrder = useCallback(() => {
    setFieldOrder(defaultOrder);
    saveOrder(defaultOrder);
  }, [defaultOrder, saveOrder]);

  return {
    fieldOrder,
    updateOrder,
    resetOrder,
    isLoading,
  };
}
