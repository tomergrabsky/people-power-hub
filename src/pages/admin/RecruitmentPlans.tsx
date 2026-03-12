import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RecruitmentPlan {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function AdminRecruitmentPlans() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const [recruitment_plans, setRecruitmentPlans] = useState<RecruitmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRecruitmentPlan, setSelectedRecruitmentPlan] = useState<RecruitmentPlan | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && !isSuperAdmin) {
      navigate('/');
      toast.error('אין לך הרשאה לגשת לדף זה');
    }
  }, [user, authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (user && isSuperAdmin) {
      fetchRecruitmentPlans();
    }
  }, [user, isSuperAdmin]);

  const seedRecruitmentPlansIfEmpty = async (fetchedRecruitmentPlans: RecruitmentPlan[]) => {
    if (fetchedRecruitmentPlans.length === 0) {
      const initialValues = ["Product Go", "אינפיניטי", "SQLink", "עצמאי", "לא רלוונטי"];
      let hasAdded = false;
      for (const val of initialValues) {
        try {
          await addDoc(collection(db, 'recruitment_plans'), {
            name: val,
            description: "נוסף אוטומטית כערך התחלתי",
            created_at: new Date().toISOString()
          });
          hasAdded = true;
        } catch (e) {
          console.error("Failed to seed:", val, e);
        }
      }
      if (hasAdded) {
        fetchRecruitmentPlans();
      }
    }
  };

  const fetchRecruitmentPlans = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'recruitment_plans'));
      const fetched = snap.docs.map(doc => ({
        id: doc.id,
        created_at: new Date().toISOString(),
        ...doc.data()
      })) as RecruitmentPlan[];
      setRecruitmentPlans(fetched.sort((a, b) => a.name.localeCompare(b.name)));
      
      // Auto-seed if the list is completely empty
      if (fetched.length === 0) {
        seedRecruitmentPlansIfEmpty(fetched);
      }
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בטעינת התכניות');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('נא להזין שם תכנית');
      return;
    }

    try {
      await addDoc(collection(db, 'recruitment_plans'), {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        created_at: new Date().toISOString()
      });
      setFormLoading(false);
      toast.success('התכנית נוספה בהצלחה');
      setIsAddDialogOpen(false);
      resetForm();
      fetchRecruitmentPlans();
    } catch (e) {
      setFormLoading(false);
      toast.error('שגיאה בהוספת התכנית');
    }
  };

  const handleEdit = async () => {
    if (!selectedRecruitmentPlan) return;
    if (!formData.name.trim()) {
      toast.error('נא להזין שם תכנית');
      return;
    }

    try {
      await updateDoc(doc(db, 'recruitment_plans', selectedRecruitmentPlan.id), {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      });
      setFormLoading(false);
      toast.success('התכנית עודכנה בהצלחה');
      setIsEditDialogOpen(false);
      setSelectedRecruitmentPlan(null);
      resetForm();
      fetchRecruitmentPlans();
    } catch (e) {
      setFormLoading(false);
      toast.error('שגיאה בעדכון התכנית');
    }
  };

  const handleDelete = async (project: RecruitmentPlan) => {
    if (!confirm(`האם למחוק את התכנית "${project.name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'recruitment_plans', project.id));
      toast.success('התכנית נמחקה בהצלחה');
      fetchRecruitmentPlans();
    } catch (e) {
      toast.error('שגיאה במחיקת התכנית. ייתכן שיש עובדים משויכים אליה.');
    }
  };

  const openEditDialog = (project: RecruitmentPlan) => {
    setSelectedRecruitmentPlan(project);
    setFormData({
      name: project.name,
      description: project.description || '',
    });
    setIsEditDialogOpen(true);
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">קבלן משנה/תכנית גיוס</h1>
            <p className="text-muted-foreground mt-1">הוספה ועריכה של תכניות במערכת</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף קבלן משנה/תכנית גיוס
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>הוספת קבלן משנה/תכנית גיוס חדשה</DialogTitle>
                <DialogDescription>הזן את פרטי הקבלן משנה/תכנית גיוס החדשה</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם הקבלן משנה/תכנית גיוס *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="לדוגמה: SQLink"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="תיאור קצר של התכנית"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAdd} disabled={formLoading}>
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  הוסף
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              רשימת תכניות
            </CardTitle>
            <CardDescription>סה״כ {recruitment_plans.length} פריטים במערכת</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם הקבלן משנה/תכנית גיוס</TableHead>
                  <TableHead>תיאור</TableHead>
                  <TableHead>תאריך יצירה</TableHead>
                  <TableHead className="w-24">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recruitment_plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      לא נמצאו פריטים
                    </TableCell>
                  </TableRow>
                ) : (
                  recruitment_plans.map((project) => (
                    <TableRow key={project.id} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.description || '-'}
                      </TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {new Date(project.created_at).toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(project)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(project)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>עריכת קבלן משנה/תכנית גיוס</DialogTitle>
              <DialogDescription>עדכן את פרטי הקבלן משנה/תכנית גיוס</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">שם הקבלן משנה/תכנית גיוס *</Label>
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
            </div>
            <DialogFooter>
              <Button onClick={handleEdit} disabled={formLoading}>
                {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                עדכן
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
