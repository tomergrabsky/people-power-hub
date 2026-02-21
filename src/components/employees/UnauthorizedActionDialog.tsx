import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UnauthorizedActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UnauthorizedActionDialog({ isOpen, onClose }: UnauthorizedActionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-right flex flex-col items-end">
        <DialogHeader className="w-full">
          <DialogTitle className="text-right text-destructive">פעולה חסומה</DialogTitle>
          <DialogDescription className="text-right">
            פעולה זו דורשת הרשאת מנהל-על (Super Admin).
            אנא פנה למנהל המערכת לביצוע הפעולה.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="w-full mt-4 flex justify-between space-x-2 space-x-reverse">
          <Button onClick={onClose} variant="outline" className="w-full">הבנתי, סגור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
