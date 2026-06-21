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
import { Plus, Pencil, Trash2, Loader2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

interface Section {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function Sections() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchSections();
    }
  }, [authLoading, isSuperAdmin]);

  const fetchSections = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'sections'));
      const fetched = snap.docs.map(doc => ({
        id: doc.id,
        created_at: new Date().toISOString(),
        ...doc.data()
      })) as Section[];
      setSections(fetched.sort((a, b) => a.name.localeCompare(b.name, 'he', { numeric: true })));
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בטעינת המדורים');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('נא להזין שם מדור');
      return;
    }

    setFormLoading(true);
    try {
      await addDoc(collection(db, 'sections'), {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        created_at: new Date().toISOString()
      });
      setFormLoading(false);
      toast.success('המדור נוסף בהצלחה');
      setIsAddDialogOpen(false);
      resetForm();
      fetchSections();
    } catch (e) {
      setFormLoading(false);
      toast.error('שגיאה בהוספת המדור');
    }
  };

  const handleEdit = async () => {
    if (!selectedSection) return;
    if (!formData.name.trim()) {
      toast.error('נא להזין שם מדור');
      return;
    }

    setFormLoading(true);
    try {
      await updateDoc(doc(db, 'sections', selectedSection.id), {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      });
      setFormLoading(false);
      toast.success('המדור עודכן בהצלחה');
      setIsEditDialogOpen(false);
      setSelectedSection(null);
      resetForm();
      fetchSections();
    } catch (e) {
      setFormLoading(false);
      toast.error('שגיאה בעדכון המדור');
    }
  };

  const handleDelete = async (section: Section) => {
    if (!confirm(`האם למחוק את המדור "${section.name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'sections', section.id));
      toast.success('המדור נמחק בהצלחה');
      fetchSections();
    } catch (e) {
      toast.error('שגיאה במחיקת המדור. ייתכן שיש עובדים המשויכים למדור זה.');
    }
  };

  const openEditDialog = (section: Section) => {
    setSelectedSection(section);
    setFormData({
      name: section.name,
      description: section.description || '',
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
      <div className="space-y-6 animate-fade-in text-right" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">ניהול מדורים</h1>
            <p className="text-muted-foreground mt-1">ניהול רשימת המדורים בארגון</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף מדור
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader className="text-right">
                <DialogTitle className="text-right">הוספת מדור חדש</DialogTitle>
                <DialogDescription className="text-right">הזן את פרטי המדור</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2 text-right">
                  <Label htmlFor="name">שם המדור *</Label>
                  <Input
                    id="name"
                    className="text-right"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2 text-right">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    className="text-right"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <DialogFooter className="mt-4 flex justify-end gap-2">
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
        ) : sections.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">אין מדורים</h3>
            <p className="text-muted-foreground">הוסף מדור ראשון כדי להתחיל</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם המדור</TableHead>
                  <TableHead className="text-right">תיאור</TableHead>
                  <TableHead className="text-right w-[100px]">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium text-right">{section.name}</TableCell>
                    <TableCell className="text-muted-foreground text-right">
                      {section.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(section)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(section)}
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
              <DialogTitle className="text-right">עריכת מדור</DialogTitle>
              <DialogDescription className="text-right">עדכן את פרטי המדור</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2 text-right">
                <Label htmlFor="edit-name">שם המדור *</Label>
                <Input
                  id="edit-name"
                  className="text-right"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2 text-right">
                <Label htmlFor="edit-description">תיאור</Label>
                <Textarea
                  id="edit-description"
                  className="text-right"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <DialogFooter className="mt-4 flex justify-end gap-2">
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
