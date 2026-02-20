import { useState, useEffect, useCallback } from 'react';
import { db } from '@/integrations/firebase/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export function useColumnOrder(tableName: string, defaultOrder: string[]) {
  const { user } = useAuth();
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultOrder);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved order from database
  useEffect(() => {
    const loadOrder = async () => {
      if (!user?.uid) {
        setColumnOrder(defaultOrder);
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'user_form_preferences', `${user.uid}_table_columns_${tableName}`);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setColumnOrder(defaultOrder);
        } else if (docSnap.data()?.field_order) {
          // Merge with default order to handle new columns
          const savedOrder = docSnap.data().field_order;
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
  }, [user?.uid, tableName, defaultOrder]);

  // Save order to database
  const saveOrder = useCallback(async (newOrder: string[]) => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, 'user_form_preferences', `${user.uid}_table_columns_${tableName}`);
      await setDoc(docRef, {
        user_id: user.uid,
        form_name: `table_columns_${tableName}`,
        field_order: newOrder,
      }, { merge: true });
    } catch (err) {
      console.error('Error saving column order:', err);
    }
  }, [user?.uid, tableName]);

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
