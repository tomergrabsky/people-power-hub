import { useState, useEffect, useCallback } from 'react';
import { db } from '@/integrations/firebase/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export function useFormFieldOrder(formName: string, defaultOrder: string[]) {
  const { user } = useAuth();
  const [fieldOrder, setFieldOrder] = useState<string[]>(defaultOrder);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved order from database
  useEffect(() => {
    const loadOrder = async () => {
      if (!user?.uid) {
        setFieldOrder(defaultOrder);
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'user_form_preferences', `${user.uid}_${formName}`);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setFieldOrder(defaultOrder);
        } else if (docSnap.data()?.field_order) {
          // Merge with default order to handle new fields
          const savedOrder = docSnap.data().field_order;
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
  }, [user?.uid, formName, defaultOrder]);

  // Save order to database
  const saveOrder = useCallback(async (newOrder: string[]) => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, 'user_form_preferences', `${user.uid}_${formName}`);
      await setDoc(docRef, {
        user_id: user.uid,
        form_name: formName,
        field_order: newOrder,
      }, { merge: true });
    } catch (err) {
      console.error('Error saving field order:', err);
    }
  }, [user?.uid, formName]);

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
