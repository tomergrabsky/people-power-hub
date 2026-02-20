import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Award } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';

interface SeniorityLevel {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function SeniorityLevels() {
  const { isSuperAdmin } = useAuth();
  const [seniorityLevels, setSeniorityLevels] = useState<SeniorityLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<SeniorityLevel | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchSeniorityLevels();
  }, []);

  const fetchSeniorityLevels = async () => {
    try {
      const snap = await getDocs(collection(db, 'seniority_levels'));
      const fetched = snap.docs.map(doc => ({
        id: doc.id,
        created_at: new Date().toISOString(),
        ...doc.data()
      })) as SeniorityLevel[];
      setSeniorityLevels(fetched.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בטעינת רמות ותק');
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('נא להזין שם רמת ותק');
      return;
    }

    if (editingLevel) {
      try {
        await updateDoc(doc(db, 'seniority_levels', editingLevel.id), {
          name: formData.name.trim(),
          description: formData.description.trim() || null
        });
        toast.success('רמת ותק עודכנה בהצלחה');
        fetchSeniorityLevels();
        resetForm();
      } catch (e) {
        toast.error('שגיאה בעדכון רמת ותק');
      }
    } else {
      try {
        await addDoc(collection(db, 'seniority_levels'), {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          created_at: new Date().toISOString()
        });
        toast.success('רמת ותק נוצרה בהצלחה');
        fetchSeniorityLevels();
        resetForm();
      } catch (e) {
        toast.error('שגיאה ביצירת רמת ותק');
      }
    }
  };

  const handleEdit = (level: SeniorityLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      description: level.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק רמת ותק זו?')) return;

    try {
      await deleteDoc(doc(db, 'seniority_levels', id));
      toast.success('רמת ותק נמחקה בהצלחה');
      fetchSeniorityLevels();
    } catch (e) {
      toast.error('שגיאה במחיקת רמת ותק. ייתכן שבשימוש.');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingLevel(null);
    setIsDialogOpen(false);
  };

  if (!isSuperAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">אין לך הרשאה לצפות בעמוד זה</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ניהול רמות ותק</h1>
            <p className="text-muted-foreground">הגדרת רמות ותק עבור עובדים</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף רמת ותק
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLevel ? 'עריכת רמת ותק' : 'הוספת רמת ותק חדשה'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">שם רמת ותק *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="לדוגמה: Junior, Senior..."
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">תיאור</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="תיאור רמת הוותק..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    ביטול
                  </Button>
                  <Button type="submit">
                    {editingLevel ? 'עדכן' : 'הוסף'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              רמות ותק
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-4">טוען...</p>
            ) : seniorityLevels.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                אין רמות ותק מוגדרות
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם</TableHead>
                    <TableHead>תיאור</TableHead>
                    <TableHead className="w-[100px]">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seniorityLevels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">{level.name}</TableCell>
                      <TableCell>{level.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(level)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(level.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
