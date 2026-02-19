import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, Pencil, Trash2, Briefcase, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface JobRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function AdminRoles() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null);
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
      fetchRoles();
    }
  }, [user, isSuperAdmin]);

  const fetchRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('job_roles')
      .select('*')
      .order('name');

    if (data && !error) {
      setRoles(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('נא להזין שם תפקיד');
      return;
    }

    setFormLoading(true);
    const { error } = await supabase.from('job_roles').insert({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
    });

    setFormLoading(false);
    if (error) {
      if (error.message.includes('duplicate')) {
        toast.error('תפקיד עם שם זה כבר קיים');
      } else {
        toast.error('שגיאה בהוספת התפקיד');
      }
    } else {
      toast.success('התפקיד נוסף בהצלחה');
      setIsAddDialogOpen(false);
      resetForm();
      fetchRoles();
    }
  };

  const handleEdit = async () => {
    if (!selectedRole) return;
    if (!formData.name.trim()) {
      toast.error('נא להזין שם תפקיד');
      return;
    }

    setFormLoading(true);
    const { error } = await supabase
      .from('job_roles')
      .update({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      })
      .eq('id', selectedRole.id);

    setFormLoading(false);
    if (error) {
      toast.error('שגיאה בעדכון התפקיד');
    } else {
      toast.success('התפקיד עודכן בהצלחה');
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      resetForm();
      fetchRoles();
    }
  };

  const handleDelete = async (role: JobRole) => {
    if (!confirm(`האם למחוק את התפקיד "${role.name}"?`)) return;

    const { error } = await supabase.from('job_roles').delete().eq('id', role.id);
    if (error) {
      toast.error('שגיאה במחיקת התפקיד. ייתכן שיש עובדים עם תפקיד זה.');
    } else {
      toast.success('התפקיד נמחק בהצלחה');
      fetchRoles();
    }
  };

  const openEditDialog = (role: JobRole) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
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
            <h1 className="text-3xl font-bold text-foreground">ניהול תפקידים</h1>
            <p className="text-muted-foreground mt-1">הוספה ועריכה של סוגי תפקידים במערכת</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף תפקיד
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>הוספת תפקיד חדש</DialogTitle>
                <DialogDescription>הזן את פרטי התפקיד החדש</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם התפקיד *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="לדוגמה: PM, TL, CSM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="תיאור קצר של התפקיד"
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
              <Briefcase className="w-5 h-5 text-primary" />
              רשימת תפקידים
            </CardTitle>
            <CardDescription>סה״כ {roles.length} תפקידים במערכת</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם התפקיד</TableHead>
                  <TableHead>תיאור</TableHead>
                  <TableHead>תאריך יצירה</TableHead>
                  <TableHead className="w-24">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      לא נמצאו תפקידים
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description || '-'}
                      </TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {new Date(role.created_at).toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(role)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(role)}
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
              <DialogTitle>עריכת תפקיד</DialogTitle>
              <DialogDescription>עדכן את פרטי התפקיד</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">שם התפקיד *</Label>
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
