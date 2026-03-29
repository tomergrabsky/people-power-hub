import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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
import { Plus, Pencil, Trash2, Loader2, Gavel } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

interface RaanDecision {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function RaanDecisionsMovingSouth() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [decisions, setDecisions] = useState<RaanDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<RaanDecision | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchDecisions();
    }
  }, [authLoading, isSuperAdmin]);

  const fetchDecisions = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'raan_decisions_moving_south'));
      const fetched = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RaanDecision[];
      setDecisions(fetched.sort((a, b) => a.name.localeCompare(b.name, 'he')));
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בטעינת החלטות רע״ן');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('נא להזין שם החלטה');
      return;
    }

    setFormLoading(true);
    try {
      await addDoc(collection(db, 'raan_decisions_moving_south'), {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        created_at: new Date().toISOString()
      });
      setFormLoading(false);
      toast.success('ההחלטה נוספה בהצלחה');
      setIsAddDialogOpen(false);
      resetForm();
      fetchDecisions();
    } catch (e) {
      setFormLoading(false);
      toast.error('שגיאה בהוספת ההחלטה');
    }
  };

  const handleEdit = async () => {
    if (!selectedDecision) return;
    if (!formData.name.trim()) {
      toast.error('נא להזין שם החלטה');
      return;
    }

    setFormLoading(true);
    try {
      await updateDoc(doc(db, 'raan_decisions_moving_south', selectedDecision.id), {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      });
      setFormLoading(false);
      toast.success('ההחלטה עודכנה בהצלחה');
      setIsEditDialogOpen(false);
      setSelectedDecision(null);
      resetForm();
      fetchDecisions();
    } catch (e) {
      setFormLoading(false);
      toast.error('שגיאה בעדכון ההחלטה');
    }
  };

  const handleDelete = async (decision: RaanDecision) => {
    if (!confirm(`האם למחוק את ההחלטה "${decision.name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'raan_decisions_moving_south', decision.id));
      toast.success('ההחלטה נמחקה בהצלחה');
      fetchDecisions();
    } catch (e) {
      toast.error('שגיאה במחיקת ההחלטה');
    }
  };

  const openEditDialog = (decision: RaanDecision) => {
    setSelectedDecision(decision);
    setFormData({
      name: decision.name,
      description: decision.description || '',
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
      <div className="space-y-6 animate-fade-in relative z-20" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ניהול החלטות רע״ן - מעבר דרומה</h1>
            <p className="text-muted-foreground mt-1">ניהול רשימת הערכים האפשריים להחלטת רע״ן בהקשר מעבר דרומה</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף החלטה
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader className="text-right">
                <DialogTitle className="text-right">הוספת החלטה חדשה</DialogTitle>
                <DialogDescription className="text-right">הזן את פרטי ההחלטה</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם ההחלטה *</Label>
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
        ) : decisions.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <Gavel className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">אין החלטות</h3>
            <p className="text-muted-foreground">הוסף החלטה ראשונה כדי להתחיל</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם ההחלטה</TableHead>
                  <TableHead className="text-right">תיאור</TableHead>
                  <TableHead className="text-right w-[100px]">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decisions.map((decision) => (
                  <TableRow key={decision.id}>
                    <TableCell className="font-medium">{decision.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {decision.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(decision)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(decision)}
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
              <DialogTitle className="text-right">עריכת החלטה</DialogTitle>
              <DialogDescription className="text-right">עדכן את פרטי ההחלטה</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">שם ההחלטה *</Label>
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
