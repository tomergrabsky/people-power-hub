import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface UnauthorizedActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UnauthorizedActionDialog({ isOpen, onClose }: UnauthorizedActionDialogProps) {
  const [superAdmins, setSuperAdmins] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && superAdmins.length === 0) {
      const fetchAdmins = async () => {
        setLoading(true);
        try {
          const q = query(collection(db, 'user_roles'), where('role', '==', 'super_admin'));
          const snapshot = await getDocs(q);
          const names = snapshot.docs.map(doc => doc.data().full_name).filter(Boolean);
          setSuperAdmins(names);
        } catch (error) {
          console.error("Error fetching super admins", error);
        } finally {
          setLoading(false);
        }
      };
      fetchAdmins();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-right flex flex-col items-end">
        <DialogHeader className="w-full">
          <DialogTitle className="text-right text-destructive">פעולה חסומה</DialogTitle>
          <DialogDescription className="text-right">
            פעולה זו דורשת הרשאת מנהל-על.
            ניתן לפנות לאחד ממנהלי העל הבאים כדי לבצע אותה:
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 text-right w-full">
          {loading ? (
            <p className="text-muted-foreground text-sm">טוען נתונים...</p>
          ) : (
            <ul className="list-inside text-sm mt-2 space-y-1 bg-muted p-4 rounded-md">
              {superAdmins.map((name, index) => (
                <li key={index} className="font-semibold text-foreground">• {name}</li>
              ))}
              {superAdmins.length === 0 && <li>לא נמצאו מנהלי על</li>}
            </ul>
          )}
        </div>
        <DialogFooter className="w-full mt-4 flex justify-between space-x-2 space-x-reverse">
          <Button onClick={onClose} variant="outline" className="w-full">סגור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
