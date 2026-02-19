import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Loader2, DoorOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

interface LeavingReason {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function LeavingReasons() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [reasons, setReasons] = useState<LeavingReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<LeavingReason | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchReasons();
    }
  }, [authLoading, isSuperAdmin]);

  const fetchReasons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leaving_reasons')
      .select('*')
      .order('name');

    if (error) {
      toast.error('שגיאה בטעינת סיבות העזיבה');
    } else {
      setReasons(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('נא להזין שם סיבת עזיבה');
      return;
    }

    setFormLoading(true);
    const { error } = await supabase.from('leaving_reasons').insert({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
    });

    setFormLoading(false);
    if (error) {
      if (error.message.includes('duplicate')) {
        toast.error('סיבת עזיבה בשם זה כבר קיימת');
      } else {
        toast.error('שגיאה בהוספת סיבת העזיבה');
      }
    } else {
      toast.success('סיבת העזיבה נוספה בהצלחה');
      setIsAddDialogOpen(false);
      resetForm();
      fetchReasons();
    }
  };

  const handleEdit = async () => {
    if (!selectedReason) return;
    if (!formData.name.trim()) {
      toast.error('נא להזין שם סיבת עזיבה');
      return;
    }

    setFormLoading(true);
    const { error } = await supabase
      .from('leaving_reasons')
      .update({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      })
      .eq('id', selectedReason.id);

    setFormLoading(false);
    if (error) {
      toast.error('שגיאה בעדכון סיבת העזיבה');
    } else {
      toast.success('סיבת העזיבה עודכנה בהצלחה');
      setIsEditDialogOpen(false);
      setSelectedReason(null);
      resetForm();
      fetchReasons();
    }
  };

  const handleDelete = async (reason: LeavingReason) => {
    if (!confirm(`האם למחוק את סיבת העזיבה "${reason.name}"?`)) return;

    const { error } = await supabase
      .from('leaving_reasons')
      .delete()
      .eq('id', reason.id);

    if (error) {
      if (error.message.includes('foreign key')) {
        toast.error('לא ניתן למחוק סיבת עזיבה שמשויכת לעובדים');
      } else {
        toast.error('שגיאה במחיקת סיבת העזיבה');
      }
    } else {
      toast.success('סיבת העזיבה נמחקה בהצלחה');
      fetchReasons();
    }
  };

  const openEditDialog = (reason: LeavingReason) => {
    setSelectedReason(reason);
    setFormData({
      name: reason.name,
      description: reason.description || '',
    });
    setIsEditDialogOpen(true);
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ניהול סיבות רצון לעזוב</h1>
            <p className="text-muted-foreground mt-1">ניהול רשימת סיבות הרצון לעזוב בארגון</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף סיבה
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader className="text-right">
                <DialogTitle className="text-right">הוספת סיבת עזיבה חדשה</DialogTitle>
                <DialogDescription className="text-right">הזן את פרטי סיבת העזיבה</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם הסיבה *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <DialogFooter className="mt-4">
                  <Button type="button" onClick={handleAdd} disabled={formLoading}>
                    {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    הוסף
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : reasons.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <DoorOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">אין סיבות עזיבה</h3>
            <p className="text-muted-foreground">הוסף סיבה ראשונה כדי להתחיל</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם הסיבה</TableHead>
                  <TableHead className="text-right">תיאור</TableHead>
                  <TableHead className="text-right w-[100px]">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reasons.map((reason) => (
                  <TableRow key={reason.id}>
                    <TableCell className="font-medium">{reason.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {reason.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(reason)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(reason)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader className="text-right">
              <DialogTitle className="text-right">עריכת סיבת עזיבה</DialogTitle>
              <DialogDescription className="text-right">עדכן את פרטי סיבת העזיבה</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">שם הסיבה *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">תיאור</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" onClick={handleEdit} disabled={formLoading}>
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  עדכן
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
