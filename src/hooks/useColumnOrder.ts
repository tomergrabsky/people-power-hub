import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useColumnOrder(tableName: string, defaultOrder: string[]) {
  const { user } = useAuth();
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultOrder);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved order from database
  useEffect(() => {
    const loadOrder = async () => {
      if (!user?.id) {
        setColumnOrder(defaultOrder);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_form_preferences')
          .select('field_order')
          .eq('user_id', user.id)
          .eq('form_name', `table_columns_${tableName}`)
          .maybeSingle();

        if (error) {
          console.error('Error loading column order:', error);
          setColumnOrder(defaultOrder);
        } else if (data?.field_order) {
          // Merge with default order to handle new columns
          const savedOrder = data.field_order;
          const mergedOrder = [...savedOrder];
          
          // Add any new columns that weren't in saved order
          defaultOrder.forEach(col => {
            if (!mergedOrder.includes(col)) {
              mergedOrder.push(col);
            }
          });
          
          // Remove any columns that no longer exist
          const filteredOrder = mergedOrder.filter(col => defaultOrder.includes(col));
          
          setColumnOrder(filteredOrder);
        } else {
          setColumnOrder(defaultOrder);
        }
      } catch (err) {
        console.error('Error loading column order:', err);
        setColumnOrder(defaultOrder);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [user?.id, tableName, defaultOrder]);

  // Save order to database
  const saveOrder = useCallback(async (newOrder: string[]) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_form_preferences')
        .upsert({
          user_id: user.id,
          form_name: `table_columns_${tableName}`,
          field_order: newOrder,
        }, {
          onConflict: 'user_id,form_name'
        });

      if (error) {
        console.error('Error saving column order:', error);
      }
    } catch (err) {
      console.error('Error saving column order:', err);
    }
  }, [user?.id, tableName]);

  const updateOrder = useCallback((newOrder: string[]) => {
    setColumnOrder(newOrder);
    saveOrder(newOrder);
  }, [saveOrder]);

  const resetOrder = useCallback(() => {
    setColumnOrder(defaultOrder);
    saveOrder(defaultOrder);
  }, [defaultOrder, saveOrder]);

  return {
    columnOrder,
    updateOrder,
    resetOrder,
    isLoading,
  };
}
